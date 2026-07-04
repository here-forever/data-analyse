from typing import Annotated

from fastapi import APIRouter, Depends, File, Form, UploadFile, status

from app.auth.dependencies import get_current_user
from app.auth.service import User
from app.imports.schemas import FilePreviewResponse
from app.imports.service import FilePreview, import_service

router = APIRouter(prefix="/imports", tags=["imports"])


def to_file_preview_response(preview: FilePreview) -> FilePreviewResponse:
    return FilePreviewResponse(
        id=preview.id,
        project_id=preview.project_id,
        file_name=preview.file_name,
        file_type=preview.file_type,
        row_count=preview.row_count,
        fields=preview.fields,
        sample_rows=preview.sample_rows,
    )


@router.post(
    "/file-previews",
    response_model=FilePreviewResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_file_preview(
    _current_user: Annotated[User, Depends(get_current_user)],
    project_id: Annotated[str, Form()],
    file: Annotated[UploadFile, File()],
) -> FilePreviewResponse:
    content = await file.read()
    preview = import_service.create_file_preview(
        project_id=project_id,
        file_name=file.filename or "uploaded_file",
        content=content,
    )
    return to_file_preview_response(preview)
