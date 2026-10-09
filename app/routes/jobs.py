from pathlib import Path

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import Certificate, GenerationJob
from ..schemas import CertificateResult, GenerationRequest, GenerationResponse
from ..services.job import process_job

router = APIRouter(prefix="/jobs", tags=["Generation Jobs"])

@router.post("", response_model=GenerationResponse, status_code=202)
def create_job(
    request: GenerationRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
):
    job = GenerationJob(total=len(request.recipients), status="pending")
    db.add(job)
    db.flush()

    for recipient in request.recipients:
        db.add(
            Certificate(
                job_id=job.id,
                recipient_name=recipient.name.strip(),
                recipient_email=str(recipient.email),
                course_name=request.course_name.strip(),
                status="pending",
            )
        )

    db.commit()
    background_tasks.add_task(process_job, job.id)

    return GenerationResponse(job_id=job.id, status=job.status, total=job.total)

@router.get("/{job_id}")
def get_job(job_id: str, db: Session = Depends(get_db)):
    job = db.get(GenerationJob, job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    certificates = db.query(Certificate).filter(Certificate.job_id == job_id).all()

    return {
        "job_id": job.id,
        "status": job.status,
        "total": job.total,
        "completed": job.completed,
        "failed": job.failed,
        "progress_percent": round(((job.completed + job.failed) / job.total) * 100, 2) if job.total else 100,
        "certificates": [
            CertificateResult(
                id=c.id,
                recipient_name=c.recipient_name,
                recipient_email=c.recipient_email,
                status=c.status,
                download_url=f"/certificates/{c.id}" if c.status == "completed" else None,
                error_message=c.error_message,
            ).model_dump()
            for c in certificates
        ],
    }

@router.get("/certificates/{certificate_id}")
def download_certificate(certificate_id: int, db: Session = Depends(get_db)):
    cert = db.get(Certificate, certificate_id)
    if not cert:
        raise HTTPException(status_code=404, detail="Certificate not found")
    if cert.status != "completed" or not cert.file_path:
        raise HTTPException(status_code=409, detail="Certificate is not available")

    path = Path(cert.file_path)
    if not path.exists():
        raise HTTPException(status_code=404, detail="Generated file not found")

    return FileResponse(path, media_type="application/pdf", filename=path.name)
