# Implementation Status

Last updated: 2026-07-04

This document records what has already been implemented so the project can continue without losing context.

## Current Position

The project is in the first-stage foundation period. The target is still:

```text
professional data analysis workspace
  -> usable MVP
  -> extensible modular monolith
  -> later enterprise-grade data platform
```

Current implementation has moved beyond pure planning. The repository now has backend, frontend, Docker, database model, collaboration, import preview, and dataset metadata foundations.

## Implemented Documentation

- Project memory and technical constraints: `docs/PROJECT_MEMORY.md`.
- MVP development roadmap: `docs/MVP_ROADMAP.md`.
- Local and Docker development setup: `docs/DEVELOPMENT_SETUP.md`.
- Agent/development instructions: `AGENTS.md`.
- Docker service notes: `docker/README.md`.

## Implemented Backend Foundation

- FastAPI application factory and API router.
- Health check endpoint: `/api/health`.
- Environment configuration with Pydantic settings.
- CORS configuration.
- Structured application errors.
- Logging setup.
- SQLAlchemy base/session setup.
- Alembic migration foundation.
- Auth, project, permission, import, and dataset route modules.

## Implemented Backend Product Modules

- Development login flow with a default admin account.
- Project creation API.
- Project member API foundation.
- Resource permission API foundation.
- CSV and Excel parsing.
- File import preview API.
- Persisted uploaded-file metadata.
- Persisted import-preview metadata and sample rows.
- Dataset metadata creation API.
- Persisted dataset fields and physical table name mapping.

## Implemented Database Foundation

Initial core tables have been modeled and migrated:

- `users`
- `projects`
- `project_members`
- `resource_permissions`
- `uploaded_files`
- `file_import_previews`
- `datasets`
- `dataset_fields`
- `dataset_table_maps`
- `tasks`
- `operation_logs`
- `lineage_edges`

## Implemented Frontend Foundation

- React + TypeScript + Vite skeleton.
- React Router route structure.
- TanStack Query provider.
- Zustand workspace store.
- Tailwind CSS tokens and base styling.
- Basic app shell and navigation.
- Placeholder workspace pages.
- Frontend API client tests.

## Implemented Docker Foundation

- Docker Compose development stack.
- PostgreSQL service.
- Redis service.
- Backend service.
- Frontend service.
- Backend and frontend Dockerfiles.
- `.env.example` for local configuration.

## Verified So Far

- Docker services can build and start successfully.
- Frontend is reachable at `http://127.0.0.1:5173`.
- Backend health check is reachable at `http://127.0.0.1:8000/api/health`.
- Alembic migration has been applied to Docker PostgreSQL.
- Login, project creation, member/permission creation, CSV preview upload, and dataset metadata creation were verified through the API.
- Backend test suite previously passed.
- Frontend test, lint, and build previously passed.

## Current Limitations

- Uploaded file metadata is persisted, but original file bytes are not yet saved to durable storage.
- Import preview stores sample rows, not the complete parsed dataset.
- Dataset creation persists metadata and a table mapping, but does not yet create/populate the physical dataset table.
- Operation log and lineage tables exist, but product workflows do not yet write records into them.
- Task center tables exist, but task execution and status flow are not yet implemented.
- Authentication is still development-oriented and not production JWT/auth hardening.
- Frontend pages are still mostly shell/placeholder pages.

## Updated Engineering Constraints

Future work must preserve these boundaries:

- Keep project structure layered and readable.
- Keep important data paths traceable from source to final report/dashboard.
- Keep original source data durable so imports can be inspected or reprocessed.
- Avoid silent overwrites and accidental hard deletion of user assets.
- Prefer small, meaningful Git commits after each milestone.
- Keep the first stage as a modular monolith with clear future extraction boundaries.

## Recommended Next Build Step

The next implementation step should strengthen the import-to-dataset foundation:

1. Save original uploaded files to durable local storage using `upload_storage_root`.
2. Store real storage paths in `uploaded_files.storage_path`.
3. Add operation logs for file preview creation and dataset creation.
4. Add a lineage edge from uploaded file/import preview to dataset.
5. Then implement formal dataset physical table creation and row insertion.

This order supports the user's new requirements: clear structure, traceability, and lower risk of data loss.
