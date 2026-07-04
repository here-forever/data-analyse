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

Current implementation has moved beyond pure planning. The repository now has backend, frontend, Docker, database model, collaboration, import preview, formal dataset materialization, cleaning, SQL data views, chart/dashboard, audit/lineage hooks, and task center foundations.

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
- Formal dataset materialization into physical database tables.
- Dataset list, detail, and paged preview APIs.
- Visual cleaning recipe creation, preview, and execution into derived datasets.
- SQL workspace metadata, read-only query execution, and saved SQL results as reusable data views.
- Data view creation, list, and paged preview APIs.
- Chart definition creation/list APIs backed by data views.
- Dashboard/report layout creation/list APIs backed by chart resources.
- Task center API for project-scoped workflow task status visibility.
- Task failure records for import parsing, dataset materialization, cleaning execution, SQL execution/materialization, and chart/dashboard save actions.
- Task retry request API that creates a pending retry task as a lightweight queue placeholder.
- Basic operation log and lineage records for implemented workflow actions.
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
- Dataset workspace page with project dataset list, schema, and paged preview.
- Import wizard page for CSV/Excel preview and dataset creation.
- Cleaning workbench page for visual recipe preview, save, and execution.
- SQL workspace page for project-scoped query execution and data view saving.
- Chart configuration page with real Data View fields and ECharts rendering.
- Dashboard/report source page with basic free-layout report mode.
- Task center page with project filtering, status summary, workflow coverage, and recent task table.
- Task center retry entry for failed or retryable tasks, with immediate list refresh and retry request feedback.
- Task center related-resource links for datasets, data views, charts, and dashboards, with target pages reading route query parameters for selection/highlighting.
- Placeholder pages remain only for features not yet implemented.
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
- Login, project creation, member/permission creation, CSV/Excel preview upload, formal dataset creation, cleaning execution, SQL data view saving, chart/dashboard saving, task center listing, failure task recording, retry request flow, and related-resource navigation were verified through tests or API flows.
- Backend test suite passed in Docker: 42 tests.
- Frontend test suite passed: 23 tests.
- Frontend lint passed.
- Frontend build previously passed and should be rerun after each UI milestone.

## Current Limitations

- Uploaded file bytes are saved in durable local storage, with metadata in PostgreSQL.
- Import preview stores sample rows for confirmation before formal dataset creation.
- Formal dataset creation creates and populates a physical table.
- Operation logs and lineage records exist for the implemented workflow actions, but the lineage graph UI is not implemented yet.
- Task center records synchronous workflow actions as completed or failed/retryable tasks.
- Retry requests create pending retry tasks as a lightweight placeholder; they do not yet replay the original business operation without a worker/queue.
- Authentication is still development-oriented and not production JWT/auth hardening.
- External database import/connectors and API data sources are still reserved for later milestones.
- Scheduled sync and distributed worker execution are not implemented yet.

## Updated Engineering Constraints

Future work must preserve these boundaries:

- Keep project structure layered and readable.
- Keep important data paths traceable from source to final report/dashboard.
- Keep original source data durable so imports can be inspected or reprocessed.
- Avoid silent overwrites and accidental hard deletion of user assets.
- Prefer small, meaningful Git commits after each milestone.
- Keep the first stage as a modular monolith with clear future extraction boundaries.

## Recommended Next Build Step

The next implementation step should connect task retry placeholders to resource-aware recovery flows:

1. Define replay payload metadata for each retryable task type.
2. Add a lightweight in-process retry executor for selected safe operations, or defer execution to the future queue worker.
3. Then implement the external database read-only connector MVP.

This order keeps the main data workflow traceable while avoiding premature Celery/RQ complexity.
