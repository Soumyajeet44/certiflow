def payload():
    return {
        "course_name": "Python Backend Course",
        "recipients": [
            {"name": "Alice Johnson", "email": "alice@example.com"},
            {"name": "Bob Smith", "email": "bob@example.com"},
        ],
    }

def test_create_generation_job(client):
    response = client.post("/jobs", json=payload())
    assert response.status_code == 202
    data = response.json()
    assert data["total"] == 2
    assert data["job_id"]

def test_input_validation(client):
    response = client.post(
        "/jobs",
        json={
            "course_name": "Python",
            "recipients": [{"name": "A", "email": "not-an-email"}],
        },
    )
    assert response.status_code == 422

def test_job_status_and_certificate_generation(client):
    response = client.post("/jobs", json=payload())
    assert response.status_code == 202
    job_id = response.json()["job_id"]

    # TestClient waits for FastAPI background tasks to finish.
    status = client.get(f"/jobs/{job_id}")
    assert status.status_code == 200

    data = status.json()
    assert data["total"] == 2
    assert data["completed"] == 2
    assert data["failed"] == 0
    assert data["status"] == "completed"

    cert_id = data["certificates"][0]["id"]
    download = client.get(f"/jobs/certificates/{cert_id}")
    assert download.status_code == 200
    assert download.headers["content-type"] == "application/pdf"

def test_individual_failure_does_not_stop_other_certificates(client, monkeypatch):
    from app.services import job

    original = job.generate_certificate
    calls = {"count": 0}

    def flaky_generate(*args, **kwargs):
        calls["count"] += 1
        if calls["count"] == 1:
            raise RuntimeError("simulated generation failure")
        return original(*args, **kwargs)

    monkeypatch.setattr(job, "generate_certificate", flaky_generate)

    response = client.post("/jobs", json=payload())
    job_id = response.json()["job_id"]

    data = client.get(f"/jobs/{job_id}").json()
    assert data["failed"] == 1
    assert data["completed"] == 1
    assert data["status"] == "completed_with_errors"
