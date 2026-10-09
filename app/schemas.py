from pydantic import BaseModel, EmailStr, Field

class Recipient(BaseModel):
    name: str = Field(min_length=2, max_length=150)
    email: EmailStr

class GenerationRequest(BaseModel):
    course_name: str = Field(min_length=2, max_length=255)
    recipients: list[Recipient] = Field(min_length=1, max_length=500)

class GenerationResponse(BaseModel):
    job_id: str
    status: str
    total: int

class CertificateResult(BaseModel):
    id: int
    recipient_name: str
    recipient_email: str
    status: str
    download_url: str | None = None
    error_message: str | None = None
