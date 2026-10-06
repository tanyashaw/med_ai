from __future__ import annotations

import base64
from io import BytesIO
from pathlib import Path

import pypdfium2 as pdfium
from pypdf import PdfReader

from app.config import settings
from app.services.groq_client import get_groq

IMAGE_TYPES = {"image/png", "image/jpeg", "image/jpg", "image/webp"}


def extract_pdf_text(path: str) -> str:
    """Extract text layer from a PDF using pypdf."""
    reader = PdfReader(path)
    pages: list[str] = []
    for page in reader.pages:
        pages.append(page.extract_text() or "")
    return "\n\n".join(pages).strip()


def _vision_transcribe(image_bytes: bytes, mime: str) -> str:
    """Send an image to the Groq vision model for transcription."""
    client = get_groq()
    b64 = base64.b64encode(image_bytes).decode("ascii")
    response = client.chat.completions.create(
        model=settings.groq_vision_model,
        messages=[
            {
                "role": "user",
                "content": [
                    {
                        "type": "text",
                        "text": (
                            "Transcribe all visible medical text from this document image. "
                            "Preserve labels, values, dates, units, and lists exactly. "
                            "Return plain text only."
                        ),
                    },
                    {
                        "type": "image_url",
                        "image_url": {"url": f"data:{mime};base64,{b64}"},
                    },
                ],
            }
        ],
        temperature=0,
    )
    return (response.choices[0].message.content or "").strip()


def extract_scanned_pdf(path: str, max_pages: int = 4) -> str:
    """Render a scanned PDF to images and transcribe via vision model."""
    pdf = pdfium.PdfDocument(path)
    chunks: list[str] = []
    try:
        for index in range(min(len(pdf), max_pages)):
            page = pdf[index]
            bitmap = page.render(scale=1.5)
            pil = bitmap.to_pil()
            buf = BytesIO()
            pil.save(buf, format="PNG")
            chunks.append(_vision_transcribe(buf.getvalue(), "image/png"))
    finally:
        pdf.close()
    return "\n\n".join(chunks).strip()


def extract_document_text(path: str, content_type: str) -> str:
    """Extract text from a document by content type."""
    suffix = Path(path).suffix.lower()
    if content_type in IMAGE_TYPES or suffix in {".png", ".jpg", ".jpeg", ".webp"}:
        mime = content_type if content_type in IMAGE_TYPES else "image/png"
        return _vision_transcribe(Path(path).read_bytes(), mime)
    if content_type == "application/pdf" or suffix == ".pdf":
        text = extract_pdf_text(path)
        if len(text) >= 80:
            return text
        # Fallback: render pages with pypdfium2 and transcribe
        return extract_scanned_pdf(path)
    try:
        return Path(path).read_text(encoding="utf-8", errors="ignore")
    except OSError:
        return ""
