from sqlalchemy.orm import Session

from ..models import Certificate, GenerationJob
from ..database import SessionLocal
from .certificate import generate_certificate

def process_job(job_id: str, session_factory=None):
    # A separate DB session is used because this runs in a FastAPI background task.
    if session_factory is None:
        session_factory = SessionLocal
    db: Session = session_factory()

    try:
        job = db.get(GenerationJob, job_id)
        if not job:
            return

        job.status = "processing"
        db.commit()

        certificates = db.query(Certificate).filter(Certificate.job_id == job_id).all()

        for cert in certificates:
            try:
                # This keeps failures isolated to the individual recipient.
                if not cert.recipient_name.strip():
                    raise ValueError("Recipient name cannot be empty")

                cert.file_path = generate_certificate(
                    job.id,
                    cert.id,
                    cert.recipient_name,
                    cert.course_name,
                )
                cert.status = "completed"
                job.completed += 1

            except Exception as exc:
                cert.status = "failed"
                cert.error_message = str(exc)
                job.failed += 1

            db.commit()

        job.status = "completed" if job.failed == 0 else "completed_with_errors"
        db.commit()

    except Exception:
        job.status = "failed"
        db.commit()
    finally:
        db.close()
