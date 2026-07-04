import re

from sqlalchemy import text
from sqlalchemy.orm import Session

from app.audit.service import AuditService
from app.core.errors import AppError
from app.datasets.service import DatasetService
from app.sql_workspace.schemas import (
    SqlDatasetReference,
    SqlRunRequest,
    SqlRunResponse,
    SqlWorkspaceMetadataResponse,
)

READ_ONLY_STARTERS = ("select", "with")
DANGEROUS_SQL_PATTERN = re.compile(
    r"\b(insert|update|delete|drop|alter|create|truncate|merge|grant|revoke|copy|call|execute)\b",
    re.IGNORECASE,
)
SYSTEM_ROW_ID = "_das_row_id"


class SqlWorkspaceService:
    def __init__(
        self,
        *,
        session: Session,
        datasets: DatasetService,
        audit: AuditService | None = None,
    ) -> None:
        self.session = session
        self.datasets = datasets
        self.audit = audit

    def metadata(self, project_id: str) -> SqlWorkspaceMetadataResponse:
        datasets = self.datasets.list_datasets(project_id)
        return SqlWorkspaceMetadataResponse(
            project_id=project_id,
            datasets=[
                SqlDatasetReference(
                    id=dataset.id,
                    name=dataset.name,
                    table_alias=dataset.id,
                    row_count=dataset.row_count,
                    fields=dataset.fields,
                )
                for dataset in datasets
            ],
        )

    def run(self, payload: SqlRunRequest) -> SqlRunResponse:
        validate_read_only_sql(payload.sql)
        dataset_map = {
            dataset.id: dataset for dataset in self.datasets.list_datasets(payload.project_id)
        }
        if not dataset_map:
            raise AppError("Project has no datasets to query", "sql_no_project_datasets", 400)

        rewritten_sql = rewrite_dataset_aliases(
            sql=payload.sql,
            dataset_table_names={
                dataset_id: dataset.physical_table_name
                for dataset_id, dataset in dataset_map.items()
            },
        )
        limited_sql = f"SELECT * FROM ({rewritten_sql}) AS das_query_result LIMIT :das_limit"
        result = self.session.execute(text(limited_sql), {"das_limit": payload.limit})
        rows = [dict(row._mapping) for row in result.all()]
        columns = list(rows[0].keys()) if rows else list(result.keys())
        self._record_sql_audit(
            project_id=payload.project_id,
            sql=payload.sql,
            row_count=len(rows),
        )

        return SqlRunResponse(
            project_id=payload.project_id,
            executed_sql=rewritten_sql,
            columns=columns,
            rows=rows,
            row_count=len(rows),
            limit=payload.limit,
        )

    def _record_sql_audit(self, *, project_id: str, sql: str, row_count: int) -> None:
        if self.audit is None:
            return

        self.audit.record_operation(
            action="sql.query_executed",
            project_id=project_id,
            resource_type="sql_query",
            resource_id=None,
            detail={
                "sql": sql,
                "row_count": row_count,
            },
        )


def validate_read_only_sql(sql: str) -> None:
    normalized = strip_sql_comments(sql).strip()
    if not normalized:
        raise AppError("SQL cannot be empty", "sql_empty", 400)
    if ";" in normalized.rstrip(";"):
        raise AppError("Only one SQL statement is allowed", "sql_multiple_statements", 400)
    normalized = normalized.rstrip(";").strip()
    lowered = normalized.lower()
    if not lowered.startswith(READ_ONLY_STARTERS):
        raise AppError("Only read-only SELECT queries are allowed", "sql_not_read_only", 400)
    if DANGEROUS_SQL_PATTERN.search(normalized):
        raise AppError("SQL contains a forbidden operation", "sql_forbidden_operation", 400)


def strip_sql_comments(sql: str) -> str:
    without_line_comments = re.sub(r"--.*?$", "", sql, flags=re.MULTILINE)
    return re.sub(r"/\*.*?\*/", "", without_line_comments, flags=re.DOTALL)


def rewrite_dataset_aliases(*, sql: str, dataset_table_names: dict[str, str]) -> str:
    rewritten = sql.rstrip().rstrip(";")
    referenced_aliases = set(re.findall(r"\b(dataset_[A-Za-z0-9_]+)\b", rewritten))
    unknown_aliases = referenced_aliases.difference(dataset_table_names.keys())
    if unknown_aliases:
        raise AppError(
            "SQL references datasets outside the project",
            "sql_unknown_dataset",
            400,
        )

    for alias in sorted(dataset_table_names.keys(), key=len, reverse=True):
        physical_table = dataset_table_names[alias]
        rewritten = re.sub(
            rf"\b{re.escape(alias)}\b",
            f'"{physical_table}"',
            rewritten,
        )
    return rewritten
