# CertiFlow — Bulk Certificate Generator

Generate personalized PDF certificates for multiple recipients through a clean web interface, backed by a FastAPI REST API.

CertiFlow simplifies bulk certificate creation by accepting recipient details, processing certificates in the background, tracking job progress, and providing individual PDF downloads.

**Built with Python, FastAPI, SQLAlchemy, SQLite, ReportLab, HTML, CSS, and JavaScript.**

**Repository:** [Soumyajeet44/certiflow](https://github.com/Soumyajeet44/certiflow)

---

## Overview

Creating certificates individually can be time-consuming. CertiFlow streamlines this process by allowing users to submit multiple recipients in one batch and generate personalized certificates automatically.

The application consists of a FastAPI backend for job management and PDF generation, and a lightweight web frontend for uploading recipient data and tracking progress.

## Features

- **Bulk certificate generation:** Submit multiple recipients in one request.
- **CSV import:** Upload recipient lists using `name,email` columns.
- **Recipient management:** Add, edit, or remove recipients through the interface.
- **PDF generation:** Create personalized certificates using ReportLab.
- **Background processing:** Process certificate-generation jobs without keeping the initial request open.
- **Progress tracking:** Monitor job status, completed certificates, failed certificates, and progress percentage.
- **Individual downloads:** Download generated certificates as PDF files.
- **Failure isolation:** Handle certificate-generation errors individually so one failed certificate does not unnecessarily stop the remaining recipients.
- **REST API:** Interact with the backend through documented API endpoints.
- **SQLite persistence:** Store job and certificate records using SQLAlchemy.

## Tech Stack

| Component | Technology |
|---|---|
| Backend | Python, FastAPI |
| API validation | Pydantic |
| Database | SQLite |
| ORM | SQLAlchemy |
| PDF generation | ReportLab |
| Frontend | HTML, CSS, JavaScript |
| Testing | Pytest |
| API documentation | Swagger UI / OpenAPI |

## Architecture

```text
              User
               |
               v
      CertiFlow Web Frontend
        HTML, CSS, JavaScript
               |
               | REST API / JSON
               v
          FastAPI Backend
               |
         Pydantic Validation
               |
               v
       SQLite + SQLAlchemy
       Job and Certificate Data
               |
               v
       Background Processing
               |
               v
        ReportLab PDF Engine
               |
               v
       Generated PDF Certificates
               |
               v
        Individual PDF Downloads
```

## Project Structure

```text
certiflow/
├── app/
│   ├── main.py
│   ├── routes/
│   └── ...
├── certiflow-frontend/
│   ├── index.html
│   ├── styles.css
│   ├── app.js
│   └── README.txt
├── tests/
├── .gitignore
├── pytest.ini
├── requirements.txt
└── README.md
```

*The `...` represents other application modules and files.*

## Getting Started

### Prerequisites

Install the following before running the application:

- Python 3.11 or a compatible Python version
- pip
- Git
- A modern web browser

### 1. Clone the repository

```bash
git clone https://github.com/Soumyajeet44/certiflow.git
cd certiflow
```

### 2. Create a virtual environment

**Windows — PowerShell**

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
```

If PowerShell blocks activation, you can use Command Prompt instead:

```bat
.venv\Scripts\activate.bat
```

**macOS / Linux**

```bash
python3 -m venv .venv
source .venv/bin/activate
```

### 3. Install dependencies

```bash
python -m pip install -r requirements.txt
```

### 4. Start the backend

From the project root, run:

```bash
python -m uvicorn app.main:app --reload
```

The API will be available at:

- **API base URL:** http://127.0.0.1:8000
- **Interactive API documentation:** http://127.0.0.1:8000/docs
- **Health check:** http://127.0.0.1:8000/health

Keep this terminal running.

### 5. Start the frontend

Open a **second terminal** in the project root:

```bash
cd certiflow-frontend
python -m http.server 5500
```

Open the application in your browser:

http://127.0.0.1:5500

The frontend is configured to communicate with the backend at `http://127.0.0.1:8000`.

> **Note:** This is a local development setup. The backend and frontend must both be running for the application to work.

### 6. Configure CORS if necessary

If the browser reports a CORS error, enable FastAPI's CORS middleware.

In `app/main.py`, add the following import:

```python
from fastapi.middleware.cors import CORSMiddleware
```

After creating the FastAPI application instance, add:

```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://127.0.0.1:5500",
        "http://localhost:5500",
    ],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

If you serve the frontend from a different origin, add that exact origin to `allow_origins`. Avoid using unrestricted origins in a deployed application.

## How to Use CertiFlow

1. Start the FastAPI backend and the frontend server.
2. Open the CertiFlow web interface.
3. Enter the course or achievement name.
4. Add recipients manually or import a CSV file.
5. Make sure each recipient has a name and correctly formatted email address.
6. Click **Generate Certificates**.
7. Monitor the job status and generation progress.
8. Download each completed certificate as a PDF.

### CSV Format

Prepare a CSV file with the headers `name,email`.

```csv
name,email
Alice Johnson,alice@example.com
Bob Smith,bob@example.com
Charlie Brown,charlie@example.com
```

The addresses above are illustrative examples, not real recipient inboxes. Use appropriate recipient addresses when generating certificates for actual people.

## API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/health` | Check API health |
| `POST` | `/jobs` | Create a bulk certificate-generation job |
| `GET` | `/jobs/{job_id}` | Retrieve job status, progress, and certificate results |
| `GET` | `/jobs/certificates/{certificate_id}` | Download a generated PDF certificate |

### Example: Create a Generation Job

**Request**

```http
POST /jobs
Content-Type: application/json
```

```json
{
  "course_name": "Python Backend Course",
  "recipients": [
    {
      "name": "Alice Johnson",
      "email": "alice@example.com"
    },
    {
      "name": "Bob Smith",
      "email": "bob@example.com"
    }
  ]
}
```

**Example response**

```json
{
  "job_id": "generated-uuid",
  "status": "pending",
  "total": 2
}
```

The job ID can then be used to check processing status and retrieve certificate information.

*The response above is illustrative; actual job IDs and status values depend on execution.*

## Design Decisions

### Background processing

The API creates a generation job and its certificate records before scheduling the processing task. The client receives a job ID and can poll the status endpoint instead of waiting for every PDF to be generated in the original request.

The current implementation uses FastAPI `BackgroundTasks`, which is suitable for a straightforward local project. A production deployment with large workloads would benefit from a durable task queue.

### Database persistence

SQLite provides a simple setup without requiring a separate database server. SQLAlchemy manages database interactions and makes a future database migration easier.

### Error handling

Certificate processing is handled independently for each recipient. When a certificate fails, the application records the failure and continues processing other recipients.

### PDF generation

ReportLab generates certificates using a predefined layout. The current project uses a single certificate template rather than a template editor or multi-template system.

## Running Tests

From the project root, with your virtual environment activated, run:

```bash
pytest
```

Review the test output to confirm which tests pass or fail.

## Security and Deployment Notes

- Do not commit secrets, `.env` files, private recipient data, database files, or generated certificate PDFs.
- The default API URL points to localhost and is intended for development.
- Before deployment, configure the frontend to use the deployed backend URL and configure CORS for the appropriate frontend origin.
- Use a suitable production server configuration instead of relying on the development reload option.
- For production workloads, consider authentication, authorization, rate limiting, durable background jobs, and appropriate data-retention policies.

## Future Improvements

- Support multiple certificate templates.
- Add downloadable batch archives.
- Introduce persistent background queues for larger jobs.
- Add authentication and user-specific job history.
- Provide deployment configuration and automated CI testing.

## What I Learned

This project provides practical experience with:

- Designing REST APIs using FastAPI.
- Validating structured input with Pydantic.
- Working with SQLAlchemy and SQLite.
- Generating PDF documents programmatically.
- Implementing background job processing and progress tracking.
- Connecting a JavaScript frontend to a Python backend.
- Handling individual processing failures and testing backend functionality.

## Author

**Soumyajeet Mahanta**

- GitHub: [@Soumyajeet44](https://github.com/Soumyajeet44)
- LinkedIn: [soumya06](https://www.linkedin.com/in/soumya06)

---

If you find this project useful, consider giving the repository a star.

