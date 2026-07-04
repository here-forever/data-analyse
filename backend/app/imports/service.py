from dataclasses import dataclass

from app.audit.service import AuditService
from app.core.config import get_settings
from app.core.ids import new_id
from app.imports.parser import parse_tabular_file
from app.imports.repository import ImportRepository
from app.imports.schemas import ImportFieldPreview
from app.imports.storage import LocalFileStorage
from app.models.imports import FileImportPreview as FileImportPreviewModel
from app.models.imports import UploadedFile as UploadedFileModel

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
    uploaded_file_id: str | None = None
    storage_path: str | None = None


class ImportService:
    def __init__(
        self,
        repository: ImportRepository | None = None,
        uploader_id: str | None = None,
        storage: LocalFileStorage | None = None,
        audit: AuditService | None = None,
    ) -> None:
        self.repository = repository
        self.uploader_id = uploader_id
        self.storage = storage
        self.audit = audit
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
        preview_id = (
            new_id("preview")
            if self.repository is not None
            else f"preview_{len(self._previews) + 1}"
        )
        uploaded_file_id = new_id("file") if self.repository is not None else None
        storage_path = (
            self._save_uploaded_file(
                project_id=project_id,
                uploaded_file_id=uploaded_file_id,
                file_name=file_name,
                content=content,
            )
            if uploaded_file_id is not None
            else None
        )
        preview = FilePreview(
            id=preview_id,
            project_id=project_id,
            file_name=file_name,
            file_type=parsed_file.file_type,
            row_count=len(parsed_file.rows),
            fields=parsed_file.fields,
            sample_rows=parsed_file.rows[:SAMPLE_ROW_LIMIT],
            uploaded_file_id=uploaded_file_id,
            storage_path=storage_path,
        )

        if self.repository is not None:
            saved_preview = self.repository.save_preview(
                uploaded_file=UploadedFileModel(
                    id=uploaded_file_id,
                    project_id=project_id,
                    uploader_id=self.uploader_id or "usr_unknown",
                    file_name=file_name,
                    file_type=parsed_file.file_type,
                    storage_path=storage_path or "",
                    size_bytes=len(content),
                ),
                preview=FileImportPreviewModel(
                    id=preview.id,
                    project_id=project_id,
                    uploaded_file_id=uploaded_file_id,
                    file_name=file_name,
                    file_type=parsed_file.file_type,
                    row_count=preview.row_count,
                    fields=[field.model_dump() for field in preview.fields],
                    sample_rows=preview.sample_rows,
                ),
            )
            self._record_preview_audit(
                preview=preview,
                uploaded_file_id=uploaded_file_id,
            )
            return model_to_preview(saved_preview)

        self._previews[preview.id] = preview
        return preview

    def get_preview(self, preview_id: str) -> FilePreview | None:
        if self.repository is not None:
            preview = self.repository.get_preview(preview_id)
            return model_to_preview(preview) if preview is not None else None

        return self._previews.get(preview_id)

    def _save_uploaded_file(
        self,
        *,
        project_id: str,
        uploaded_file_id: str | None,
        file_name: str,
        content: bytes,
    ) -> str:
        if uploaded_file_id is None:
            raise ValueError("uploaded_file_id is required for persisted uploads")
        storage = self.storage or LocalFileStorage(get_settings().upload_storage_root)
        return storage.save_upload(
            project_id=project_id,
            uploaded_file_id=uploaded_file_id,
            file_name=file_name,
            content=content,
        )

    def _record_preview_audit(self, *, preview: FilePreview, uploaded_file_id: str) -> None:
        if self.audit is None:
            return

        self.audit.record_operation(
            action="import.file_preview_created",
            project_id=preview.project_id,
            resource_type="file_import_preview",
            resource_id=preview.id,
            detail={
                "uploaded_file_id": uploaded_file_id,
                "file_name": preview.file_name,
                "file_type": preview.file_type,
                "row_count": preview.row_count,
                "field_count": len(preview.fields),
                "storage_path": preview.storage_path,
            },
        )
        self.audit.record_lineage(
            project_id=preview.project_id,
            source_type="uploaded_file",
            source_id=uploaded_file_id,
            target_type="file_import_preview",
            target_id=preview.id,
            transform_type="file_parse_preview",
            transform_id=preview.id,
        )


def model_to_preview(preview: FileImportPreviewModel) -> FilePreview:
    return FilePreview(
        id=preview.id,
        project_id=preview.project_id,
        file_name=preview.file_name,
        file_type=preview.file_type,
        row_count=preview.row_count,
        fields=[ImportFieldPreview.model_validate(field) for field in preview.fields],
        sample_rows=preview.sample_rows,
        uploaded_file_id=preview.uploaded_file_id,
        storage_path=None,
    )


import_service = ImportService()
