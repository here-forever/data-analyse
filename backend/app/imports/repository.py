from sqlalchemy.orm import Session

from app.models.imports import FileImportPreview as FileImportPreviewModel
from app.models.imports import UploadedFile as UploadedFileModel


class ImportRepository:
    def __init__(self, session: Session) -> None:
        self.session = session

    def save_preview(
        self,
        *,
        uploaded_file: UploadedFileModel,
        preview: FileImportPreviewModel,
    ) -> FileImportPreviewModel:
        self.session.add(uploaded_file)
        self.session.flush()
        self.session.add(preview)
        self.session.commit()
        self.session.refresh(preview)
        return preview

    def save_uploaded_file(self, uploaded_file: UploadedFileModel) -> UploadedFileModel:
        self.session.add(uploaded_file)
        self.session.commit()
        self.session.refresh(uploaded_file)
        return uploaded_file

    def save_parsed_preview(
        self,
        *,
        uploaded_file: UploadedFileModel,
        preview: FileImportPreviewModel,
    ) -> FileImportPreviewModel:
        try:
            self.session.add(preview)
            self.session.add(uploaded_file)
            self.session.commit()
            self.session.refresh(preview)
            return preview
        except Exception:
            self.session.rollback()
            raise

    def update_uploaded_file(self, uploaded_file: UploadedFileModel) -> UploadedFileModel:
        self.session.add(uploaded_file)
        self.session.commit()
        self.session.refresh(uploaded_file)
        return uploaded_file

    def get_preview(self, preview_id: str) -> FileImportPreviewModel | None:
        return self.session.get(FileImportPreviewModel, preview_id)

    def get_uploaded_file(self, uploaded_file_id: str) -> UploadedFileModel | None:
        return self.session.get(UploadedFileModel, uploaded_file_id)
