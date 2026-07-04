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
- Docker Compose after Docker/WSL are installed.

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
