import os
import tempfile
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.database import Base, get_db
from app.main import app
import app.services.job as job_service

@pytest.fixture()
def client():
    db_file = tempfile.NamedTemporaryFile(delete=False)
    db_file.close()

    engine = create_engine(
        f"sqlite:///{db_file.name}",
        connect_args={"check_same_thread": False},
    )
    TestingSession = sessionmaker(bind=engine)
    Base.metadata.create_all(engine)

    def override_db():
        db = TestingSession()
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_db] = override_db
    original_factory = job_service.SessionLocal if hasattr(job_service, "SessionLocal") else None
    job_service.SessionLocal = TestingSession
    with TestClient(app) as test_client:
        yield test_client

    app.dependency_overrides.clear()
    if original_factory is not None:
        job_service.SessionLocal = original_factory
    else:
        del job_service.SessionLocal
    engine.dispose()
    os.unlink(db_file.name)
