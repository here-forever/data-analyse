# Development Setup

Last updated: 2026-07-04

## Current Environment Status

This project can begin local-first development before Docker and WSL are installed.

Verified on the current machine:

- Git is available.
- Python 3.13.9 is available.
- Node.js v24.14.0 is available.
- `npm.cmd` works.

Known missing or limited tools:

- Docker is not currently available on PATH.
- WSL is not currently available.
- PowerShell blocks `npm.ps1`; use `npm.cmd` on Windows until execution policy is adjusted.

## Local Development Strategy Before Docker

Until Docker/WSL are installed, develop in this order:

1. Repository structure.
2. Backend FastAPI skeleton using a local Python virtual environment.
3. Frontend React skeleton using `npm.cmd`.
4. SQLite or local PostgreSQL can be considered only if needed for early backend checks.
5. Docker Compose is added later when Docker Desktop and WSL2 are available.

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
backend\.venv\Scripts\python -m pytest backend\tests -q
```

Run backend dev server:

```powershell
backend\.venv\Scripts\python -m uvicorn app.main:app --app-dir backend --reload
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
