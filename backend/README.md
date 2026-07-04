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

## Local Auth and Project API

Current local development endpoints include:

- `POST /api/auth/login`
- `GET /api/auth/me`
- `POST /api/projects`
- `GET /api/projects`
- `POST /api/projects/{project_id}/members`
- `GET /api/projects/{project_id}/members`
- `POST /api/permissions/resources`
- `GET /api/permissions/resources?project_id=...`

The initial development account is:

```text
email: admin@example.com
password: admin123
```

These endpoints currently use an in-memory development service so they can run before Docker/PostgreSQL is installed. Persistent SQLAlchemy-backed storage will replace this service in a later database milestone.

## File Import Preview API

Current local development import endpoints include:

- `POST /api/imports/file-previews`
- `POST /api/datasets`

The import preview endpoint supports CSV and Excel files, returns inferred fields, row count, and sample rows. Dataset creation currently records development metadata from a confirmed preview. Physical PostgreSQL dataset tables will be added when the database milestone is implemented.
