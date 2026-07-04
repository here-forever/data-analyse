# Backend

FastAPI backend for the Data Analysis System.

## Local Setup

From the repository root:

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\python -m pip install --upgrade pip
.\.venv\Scripts\python -m pip install -e ".[dev]"
```

## Run Tests

From the repository root:

```powershell
backend\.venv\Scripts\python -m pytest backend\tests -q
```

## Run Development Server

From the repository root:

```powershell
backend\.venv\Scripts\python -m uvicorn app.main:app --app-dir backend --reload
```

Health check:

```text
http://127.0.0.1:8000/api/health
```

## Notes

PostgreSQL is configured in `.env.example`, but a running database is not required for the current backend skeleton tests.
