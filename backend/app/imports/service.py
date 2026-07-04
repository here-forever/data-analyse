from dataclasses import dataclass

from app.core.ids import new_id
from app.imports.parser import parse_tabular_file
from app.imports.repository import ImportRepository
from app.imports.schemas import ImportFieldPreview
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


class ImportService:
    def __init__(
        self,
        repository: ImportRepository | None = None,
        uploader_id: str | None = None,
    ) -> None:
        self.repository = repository
        self.uploader_id = uploader_id
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
        preview = FilePreview(
            id=preview_id,
            project_id=project_id,
            file_name=file_name,
            file_type=parsed_file.file_type,
            row_count=len(parsed_file.rows),
            fields=parsed_file.fields,
            sample_rows=parsed_file.rows[:SAMPLE_ROW_LIMIT],
        )

        if self.repository is not None:
            uploaded_file_id = new_id("file")
            saved_preview = self.repository.save_preview(
                uploaded_file=UploadedFileModel(
                    id=uploaded_file_id,
                    project_id=project_id,
                    uploader_id=self.uploader_id or "usr_unknown",
                    file_name=file_name,
                    file_type=parsed_file.file_type,
                    storage_path=f"memory://{preview.id}/{file_name}",
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
            return model_to_preview(saved_preview)

        self._previews[preview.id] = preview
        return preview

    def get_preview(self, preview_id: str) -> FilePreview | None:
        if self.repository is not None:
            preview = self.repository.get_preview(preview_id)
            return model_to_preview(preview) if preview is not None else None

        return self._previews.get(preview_id)


def model_to_preview(preview: FileImportPreviewModel) -> FilePreview:
    return FilePreview(
        id=preview.id,
        project_id=preview.project_id,
        file_name=preview.file_name,
        file_type=preview.file_type,
        row_count=preview.row_count,
        fields=[ImportFieldPreview.model_validate(field) for field in preview.fields],
        sample_rows=preview.sample_rows,
    )


import_service = ImportService()
