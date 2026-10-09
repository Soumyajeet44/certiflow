# Bulk Certificate Generator Backend

A FastAPI backend that accepts one request containing multiple recipients and generates PDF certificates from one predefined template.

## Technology

- Python
- FastAPI
- SQLAlchemy
- SQLite (easy local setup; can be changed to PostgreSQL)
- ReportLab
- Pytest

## Design

The API creates a generation job and certificate records in the database, then uses FastAPI BackgroundTasks to process the job after returning a `202 Accepted` response.

Processing is intentionally per certificate. If one certificate fails, the exception is captured on that certificate and the remaining recipients continue processing.

This satisfies the assignment requirement that one failure should not unnecessarily stop other valid certificates.

## Setup

```bash
python -m venv .venv
```

Windows:

```bash
.venv\Scripts\activate
```

macOS/Linux:

```bash
source .venv/bin/activate
```

Install dependencies:

```bash
pip install -r requirements.txt
```

## Run

```bash
uvicorn app.main:app --reload
```

Open:

```text
http://127.0.0.1:8000/docs
```

## Create a generation job

```bash
curl -X POST "http://127.0.0.1:8000/jobs" \
  -H "Content-Type: application/json" \
  -d '{
    "course_name": "Python Backend Course",
    "recipients": [
      {"name": "Alice Johnson", "email": "alice@example.com"},
      {"name": "Bob Smith", "email": "bob@example.com"}
    ]
  }'
```

Example response:

```json
{
  "job_id": "generated-uuid",
  "status": "pending",
  "total": 2
}
```

## Check job status

```text
GET /jobs/{job_id}
```

The response includes total, completed, failed, percentage progress, and per-recipient results.

## Retrieve a certificate

```text
GET /jobs/certificates/{certificate_id}
```

The endpoint returns the generated PDF.

## Test

```bash
pytest
```

## API endpoints

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/health` | Health check |
| POST | `/jobs` | Create bulk generation job |
| GET | `/jobs/{job_id}` | Check job status and results |
| GET | `/jobs/certificates/{certificate_id}` | Download certificate |

## Important implementation decisions

### Why background processing?

Bulk generation can take longer as the number of recipients increases. Returning a job ID immediately lets the client poll for progress rather than keeping the original HTTP request open.

For this assignment, FastAPI `BackgroundTasks` keeps the implementation simple and easy to explain. For a production system with very large workloads, a durable queue such as Celery/RQ with Redis would be a stronger choice.

### Why SQLite?

SQLite makes the assignment easy to run without installing a separate database server. The SQLAlchemy layer keeps the database code portable to PostgreSQL.

### Failure handling

Each certificate is processed independently inside its own `try/except`. A failure is saved against that certificate, the job's failed count is incremented, and processing continues.

### Certificate template

The assignment requires a single predefined template, so the project uses one fixed ReportLab layout. There is intentionally no template editor or multiple-template system.

## Interview explanation

The main flow is:

1. Client sends recipients to `POST /jobs`.
2. Pydantic validates the request.
3. A `GenerationJob` and its `Certificate` records are saved.
4. The API returns a job ID.
5. A background task processes each certificate.
6. ReportLab creates the PDF.
7. Database status is updated after each recipient.
8. `GET /jobs/{job_id}` exposes progress and failures.
9. Completed PDFs are retrieved through the certificate endpoint.
