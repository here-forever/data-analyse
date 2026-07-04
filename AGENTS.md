# Project Agent Instructions

This project is a personal-developed, GitHub-ready integrated data analysis system.

Before making future implementation decisions, read `docs/PROJECT_MEMORY.md`.

## Core Direction

Build a professional, usable, and extensible data analysis workspace first, then evolve it step by step into an enterprise-grade data platform.

The first stage should not become an overbuilt SaaS platform, and it should not be a simple demo-only file analysis tool.

## Development Constraints

- Use Git version control for future project development.
- Keep changes scoped and commit intentionally after meaningful milestones.
- Prefer a modular monolith in the first stage, with clear boundaries for future service extraction.
- Preserve the main data flow: data source -> dataset -> cleaning recipe or SQL -> data view -> chart -> dashboard/report.
- Prioritize local development experience and Docker Compose deployment.
- Avoid implementing enterprise-only features too early unless the architecture needs a placeholder for them.
- Keep backend and frontend structure clearly layered as the system grows.
- Preserve traceability for important data and user actions through durable source retention, operation logs, and lineage records.
- Avoid data-loss-prone behavior: do not silently overwrite or hard-delete important user resources; prefer recoverable states and explicit logged operations.
- Treat durable original file storage and formal dataset materialization as foundation capabilities for the first-stage product.

## Layering Rules

- Backend routes should stay thin and delegate workflow decisions to services.
- Backend services should coordinate validation, domain workflow, task/log/lineage hooks, and repositories.
- Backend repositories should isolate persistence details from service logic.
- SQLAlchemy models should represent database structure and avoid workflow behavior.
- Frontend app shell, API access, state stores, shared UI, and feature pages should remain separated.
- New features should connect to the main data flow instead of becoming isolated demos.

## Confirmed Technical Direction

- Backend: Python, FastAPI, PostgreSQL, SQLAlchemy, Alembic, Pydantic.
- Data processing: Pandas and Polars.
- Frontend: React, TypeScript, Vite.
- Frontend state/data: TanStack Query, Zustand.
- Tables/charts/editors: TanStack Table or AG Grid, ECharts, Monaco Editor.
- Styling: Tailwind CSS plus a custom design system.
- Deployment: local development mode plus Docker Compose.

## First-Stage Product Scope

Must support:

- Project collaboration route with resource-level permissions.
- CSV and Excel import.
- External PostgreSQL/MySQL read-only connection.
- Table import and custom read-only SQL import from external databases.
- Original file retention plus parsed data stored in PostgreSQL.
- Temporary preview data before formal dataset creation.
- Formal datasets as real database tables.
- Visual data cleaning with saveable cleaning recipes.
- SQL workspace supporting project-scoped multi-dataset queries.
- Saved SQL results as reusable data views.
- Configurable dashboards plus basic low-code free-layout report capability.
- Task center with status, progress, errors, and retry entry.
- Basic operation logs and basic data lineage.

Reserved for later:

- API data sources.
- Scheduled sync.
- Distributed task queue such as Celery or RQ.
- Field-level and row-level permissions.
- Full visual data lineage graph.
- Full flowchart-style data cleaning orchestration.
- Multi-tenant SaaS architecture.
- Kubernetes/cloud-native deployment.
