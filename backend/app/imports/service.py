from dataclasses import dataclass

from app.imports.parser import parse_tabular_file
from app.imports.schemas import ImportFieldPreview

SAMPLE_ROW_LIMIT = 20


@dataclass(frozen=True)
class FilePreview:
    id: str
    project_id: str
    file_name: str
    file_type: str
    row_count: int
    fields: list[ImportFieldPreview]
    sample_rows: list[dict[str, object | None]]


class ImportService:
    def __init__(self) -> None:
        self._previews: dict[str, FilePreview] = {}

    def reset(self) -> None:
        self._previews = {}

    def create_file_preview(
        self,
        *,
        project_id: str,
        file_name: str,
        content: bytes,
    ) -> FilePreview:
        parsed_file = parse_tabular_file(file_name, content)
        preview = FilePreview(
            id=f"preview_{len(self._previews) + 1}",
            project_id=project_id,
            file_name=file_name,
            file_type=parsed_file.file_type,
            row_count=len(parsed_file.rows),
            fields=parsed_file.fields,
            sample_rows=parsed_file.rows[:SAMPLE_ROW_LIMIT],
        )
        self._previews[preview.id] = preview
        return preview

    def get_preview(self, preview_id: str) -> FilePreview | None:
        return self._previews.get(preview_id)


import_service = ImportService()
