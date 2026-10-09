from pathlib import Path
from reportlab.lib.pagesizes import landscape, A4
from reportlab.pdfgen import canvas

OUTPUT_DIR = Path("certificates")
OUTPUT_DIR.mkdir(exist_ok=True)

def generate_certificate(job_id: str, certificate_id: int, recipient_name: str, course_name: str) -> str:
    # The template is intentionally simple and predefined, as required by the assignment.
    path = OUTPUT_DIR / f"{job_id}_{certificate_id}.pdf"

    c = canvas.Canvas(str(path), pagesize=landscape(A4))
    width, height = landscape(A4)

    c.setLineWidth(3)
    c.rect(30, 30, width - 60, height - 60)

    c.setFont("Helvetica-Bold", 30)
    c.drawCentredString(width / 2, height - 120, "CERTIFICATE OF COMPLETION")

    c.setFont("Helvetica", 16)
    c.drawCentredString(width / 2, height - 180, "This certificate is proudly presented to")

    c.setFont("Helvetica-Bold", 25)
    c.drawCentredString(width / 2, height - 230, recipient_name)

    c.setFont("Helvetica", 16)
    c.drawCentredString(width / 2, height - 280, f"for successfully completing: {course_name}")

    c.setFont("Helvetica", 11)
    c.drawCentredString(width / 2, 70, f"Certificate ID: {certificate_id}")

    c.save()
    return str(path)
