# Data Analysis System

A professional, usable, and extensible data analysis workspace that will gradually evolve into an enterprise-grade data platform.

## Current Status

The project is in early implementation planning and infrastructure setup.

Completed documentation milestones:

- `docs/PROJECT_MEMORY.md` - project memory and long-term constraints.
- `docs/MVP_ROADMAP.md` - MVP module, page, database, and milestone roadmap.
- `docs/DEVELOPMENT_SETUP.md` - local setup notes.

## Product Direction

The core workflow is:

```text
data source -> dataset -> cleaning recipe or SQL -> data view -> chart -> dashboard/report
```

The first stage focuses on a lightweight project-collaboration data analysis workspace, not a full enterprise SaaS platform.

## Planned Tech Stack

Backend:

- Python
- FastAPI
- PostgreSQL
- SQLAlchemy
- Alembic
- Pydantic
- Pandas / Polars

Frontend:

- React
- TypeScript
- Vite
- TanStack Query
- Zustand
- ECharts
- Monaco Editor
- Tailwind CSS

Deployment direction:

- Local development first.
- Docker Compose for PostgreSQL, Redis, backend, and frontend.

## MVP Scope

See `docs/MVP_ROADMAP.md` for the full MVP roadmap.

## Development Notes

See `docs/DEVELOPMENT_SETUP.md` for local setup notes.

## Git Workflow

Use focused commits for meaningful milestones. Keep documentation updated when architecture decisions change.

## Backend Skeleton

The backend skeleton provides:

- FastAPI app factory.
- `/api/health` endpoint.
- Pydantic settings.
- Standard application error response.
- SQLAlchemy base, engine, and session factory.
- Alembic environment.
- Pytest test suite.

Backend commands are documented in `backend/README.md`.

## Frontend Skeleton

The frontend skeleton provides:

- Vite + React + TypeScript setup.
- React Router app shell.
- TanStack Query provider.
- Zustand workspace state store.
- Typed API client helper.
- Tailwind CSS design tokens.
- Vitest and Testing Library tests.

Frontend commands are documented in `frontend/README.md`.

## Auth, Projects, and Permissions API Foundation

The backend now includes a local-runnable API foundation for:

- Login and current user.
- Project creation and project listing.
- Project member roles.
- Basic resource-level permission records.

This stage uses an in-memory development service so implementation can continue before Docker/PostgreSQL are available. The API boundary is covered by tests and will later be connected to SQLAlchemy models and migrations.

## File Import Preview Foundation

The backend now includes local-runnable endpoints for:

- CSV upload preview.
- Excel upload preview.
- Field type inference.
- Sample row preview.
- Dataset metadata creation from a confirmed preview.

This validates the first half of the import flow before formal PostgreSQL physical dataset table creation is added.

## Docker Compose Development

After Docker Desktop and WSL2 are available, the project can start its development stack with:

```powershell
docker compose up --build
```

Local service URLs:

- Frontend: `http://127.0.0.1:5173`
- Backend health: `http://127.0.0.1:8000/api/health`
- PostgreSQL: `127.0.0.1:5432`
- Redis: `127.0.0.1:6379`

Docker details are documented in `docker/README.md`.
