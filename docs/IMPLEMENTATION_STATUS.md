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
- Staged uploaded-file storage before parsing, with upload status and parse error metadata.
- Project-scoped upload/import history API showing successful and failed file access attempts.
- Persisted import-preview metadata and sample rows.
- Saved import-preview retrieval API for reopening parsed upload records.
- Dataset metadata creation API.
- Project-scoped duplicate dataset name protection.
- Formal dataset materialization into physical database tables.
- Dataset list, detail, and paged preview APIs.
- Dataset quality profile API with null, distinct, duplicate, sample, and warning summaries.
- Visual cleaning recipe creation, preview, and execution into derived datasets.
- SQL workspace metadata, read-only query execution, and saved SQL results as reusable data views.
- Data view creation, list, and paged preview APIs.
- Chart definition creation/list APIs backed by data views.
- Dashboard/report layout creation/list APIs backed by chart resources.
- Task center API for project-scoped workflow task status visibility.
- Task failure records for import parsing, dataset materialization, cleaning execution, SQL execution/materialization, and chart/dashboard save actions.
- Task retry API with persisted retry metadata and in-process synchronous replay for selected safe operations.
- Retryable task execution currently covers dataset materialization, cleaning recipe execution, SQL data view materialization, chart save, and dashboard/report save.
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
- Data source center page for local file intake, upload outcomes, dataset bridge links, and reserved connector states.
- Import wizard page for CSV/Excel preview and dataset creation.
- Import wizard upload status and failure recovery hints.
- Import wizard upload history panel with parsed/failed file records and task trace links.
- Import wizard can reopen saved parsed previews from upload history and continue dataset creation.
- Dataset workspace quality overview for materialized datasets.
- Cleaning workbench page for visual recipe preview, save, and execution.
- SQL workspace page for project-scoped query execution and data view saving.
- Chart configuration page with real Data View fields and ECharts rendering.
- Dashboard/report source page with basic free-layout report mode.
- Task center page with project filtering, status summary, workflow coverage, and recent task table.
- Task center retry entry controlled by backend retry eligibility, with immediate list refresh and completion feedback.
- Task center related-resource links for datasets, data views, charts, and dashboards, with target pages reading route query parameters for selection/highlighting.
- Placeholder pages remain only for features not yet implemented beyond the current data intake, dataset, cleaning, SQL, chart, dashboard, and task surfaces.
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
- Backend test suite passed locally: 45 tests.
- Frontend test suite passed: 25 tests.
- Frontend lint passed.
- Frontend build previously passed and should be rerun after each UI milestone.

## Current Limitations

- Uploaded file bytes are saved in durable local storage, with metadata in PostgreSQL.
- Uploads are staged before parsing, so failed parse attempts can be traced to an uploaded file record.
- Upload/import history is queryable by project and shows uploaded-file status, parse errors, and linked preview metadata when parsing succeeds.
- Import preview stores sample rows for confirmation before formal dataset creation.
- Parsed upload history records can restore their saved preview metadata without re-uploading the source file.
- Data Sources now acts as the main local file intake overview and links into import previews, task traces, and formal datasets.
- Formal dataset creation creates and populates a physical table.
- Dataset names are unique within a project to avoid accidental overwrite-like workflows.
- Dataset quality profiling is computed on demand from materialized rows and is not yet cached or task-backed.
- Operation logs and lineage records exist for the implemented workflow actions, but the lineage graph UI is not implemented yet.
- Task center records synchronous workflow actions as completed or failed/retryable tasks.
- Retry execution is synchronous inside the API request for selected safe operations; it is not yet backed by Redis/Celery/RQ or a distributed worker.
- File preview parse failures are recorded against staged uploaded files; user-correctable validation failures remain non-retryable, while unexpected parse failures can keep retry metadata.
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

The next implementation step should continue strengthening the first-priority local file data access path:

1. Add import history/list APIs so users can inspect successful and failed upload attempts directly.
2. Add richer data quality drilldowns and optional quality profile caching for larger datasets.
3. Then implement the external database read-only connector MVP.

This order keeps the main data workflow traceable while avoiding premature Celery/RQ complexity.
