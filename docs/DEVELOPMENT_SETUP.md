# Development Setup

Last updated: 2026-07-19

## Current Environment Status

This project can run both local-first development commands and Docker Compose integration services.

Verified on the current machine:

- Git is available.
- Python 3.13.9 is available.
- Node.js v24.14.0 is available.
- `npm.cmd` works.
- Docker is available.
- Docker Compose is available.
- WSL2 is available.
- PowerShell 7.6.3 is available.

Known local notes:

- PowerShell blocks `npm.ps1`; use `npm.cmd` on Windows until execution policy is adjusted.
- PostgreSQL command-line tools such as `psql` may not be on Windows PATH. Docker Compose provides PostgreSQL for development.

## Local Development Strategy

Use local commands for fast backend/frontend checks, and Docker Compose for integrated service development:

1. Backend FastAPI tests using the local Python virtual environment.
2. Frontend React tests/build using `npm.cmd`.
3. Docker Compose for PostgreSQL, Redis, backend, and frontend integration.

## PowerShell 7 Command Rule

Use PowerShell 7 for Windows development commands and start it without loading a user profile:

```powershell
pwsh -NoLogo -NoProfile
```

Run Git, Docker, Python, Node.js, and `npm.cmd` as native commands. Prefer one clearly scoped command per line, quote paths containing spaces, and use `Push-Location` / `Pop-Location` when several commands must run from a subdirectory. PowerShell 7 supports `&&`, but project instructions and automation should not depend on dense shell command chains.

Use `docker compose up -d` for the normal fast path with existing images. Add `--build` only when Dockerfiles or dependencies changed and the stack must be rebuilt.

Do not add Python scripts solely to work around legacy PowerShell parsing or quoting behavior. Python remains the backend and data-processing runtime.

## Required Commands To Check Later

```powershell
git --version
python --version
node --version
npm.cmd --version
docker --version
docker compose version
wsl --version
```

## Git Rule

All meaningful milestones should be committed. Do not mix unrelated refactors with feature work.

## Backend Commands

Create and install the backend environment:

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\python -m pip install --upgrade pip
.\.venv\Scripts\python -m pip install -e ".[dev]"
cd ..
```

Run backend tests:

```powershell
backend\.venv\Scripts\python.exe -m pytest backend\tests -q
```

Run backend dev server:

```powershell
backend\.venv\Scripts\python.exe -m uvicorn app.main:app --app-dir backend --reload
```

## Frontend Commands

Install frontend dependencies:

```powershell
cd frontend
npm.cmd install
cd ..
```

Run frontend tests:

```powershell
cd frontend
npm.cmd test
cd ..
```

Run frontend dev server:

```powershell
cd frontend
npm.cmd run dev
cd ..
```

Build frontend:

```powershell
cd frontend
npm.cmd run build
cd ..
```

## Docker Compose Commands

Before creating real external database connections, set a stable local encryption key in `.env`:

```text
EXTERNAL_CONNECTION_ENCRYPTION_KEY=replace-with-a-long-random-local-key
```

Keep this value private and stable. Existing external database passwords cannot be decrypted after the key changes.

Start the integrated development stack:

```powershell
docker compose up --build
```

Start in the background:

```powershell
docker compose up -d --build
```

Check service status:

```powershell
docker compose ps
```

Stop services:

```powershell
docker compose down
```

Reset Docker-managed database/cache volumes:

```powershell
docker compose down -v
```

Run backend database migrations:

```powershell
docker compose exec backend python -m alembic upgrade head
```

Local URLs:

```text
Frontend: http://127.0.0.1:5173
Backend:  http://127.0.0.1:8000/api/health
Postgres: 127.0.0.1:5432
Redis:    127.0.0.1:6379
```

## Docker Image Pull Troubleshooting

If Docker is installed but service startup fails while pulling images from Docker Hub, check Docker Desktop proxy or registry mirror settings. The project Compose file is valid when `docker compose config` succeeds; startup can be retried with:

```powershell
docker compose up -d --build
```
