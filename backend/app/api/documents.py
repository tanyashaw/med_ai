from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.api import case_to_out
from app.api.cases import _load_case
from app.database import get_db
from app.deps import get_current_user
from app.models import Document, User, new_id, utcnow
from app.schemas import CaseOut, DocumentOut
from app.services.audit import write_audit
from app.services.ocr import extract_document_text
from app.storage import save_upload

router = APIRouter(tags=["documents"])

ALLOWED = {
    "application/pdf",
    "image/png",
    "image/jpeg",
    "image/jpg",
    "image/webp",
    "text/plain",
}

MAX_BYTES = 15 * 1024 * 1024  # 15 MB


@router.post("/cases/{case_id}/documents", response_model=DocumentOut)
def upload_document(
    case_id: str,
    file: UploadFile = File(...),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    case = _load_case(db, case_id, user.organization_id)
    content_type = file.content_type or "application/octet-stream"
    if content_type not in ALLOWED:
        raise HTTPException(status_code=400, detail="Unsupported file type. Allowed: PDF, PNG, JPG, TXT")

    data = file.file.read()
    if len(data) > MAX_BYTES:
        raise HTTPException(status_code=413, detail="File exceeds maximum allowed size of 15 MB")

    path = save_upload(user.organization_id, case.id, file, data)

    # Extract text from the document
    text = ""
    try:
        text = extract_document_text(path, content_type)
    except Exception:
        text = ""

    # AI classification pass (lightweight — run only if text available, errors are non-fatal)
    doc_type: str | None = None
    entities: dict | None = None
    try:
        from app.services.ai import classify_document

        result = classify_document(text or "", filename=file.filename or "")
        doc_type = result.get("doc_type")
        entities = result.get("entities")
    except Exception:
        pass  # Classification failure is non-fatal

    doc = Document(
        id=new_id(),
        organization_id=user.organization_id,
        case_id=case.id,
        filename=file.filename or "document",
        content_type=content_type,
        storage_path=path,
        extracted_text=text or None,
        doc_type=doc_type,
        entities=entities,
    )
    db.add(doc)
    if case.status == "draft":
        case.status = "documents"
    case.updated_at = utcnow()
    write_audit(
        db,
        organization_id=user.organization_id,
        user_id=user.id,
        action="upload_document",
        resource_type="document",
        resource_id=doc.id,
        details={"filename": doc.filename, "case_id": case.id, "doc_type": doc_type},
    )
    db.commit()
    db.refresh(doc)
    return doc


@router.get("/documents/{document_id}/file")
def download_document(
    document_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    doc = db.get(Document, document_id)
    if not doc or doc.organization_id != user.organization_id:
        raise HTTPException(status_code=404, detail="Document not found")
    write_audit(
        db,
        organization_id=user.organization_id,
        user_id=user.id,
        action="download_document",
        resource_type="document",
        resource_id=doc.id,
    )
    db.commit()
    return FileResponse(doc.storage_path, filename=doc.filename, media_type=doc.content_type)


@router.post("/cases/{case_id}/extract", response_model=CaseOut)
def run_extraction(case_id: str, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    from app.models import Extraction
    from app.services.ai import classify_document

    case = _load_case(db, case_id, user.organization_id)
    texts = [doc.extracted_text or "" for doc in case.documents]
    combined = "\n\n".join(part for part in texts if part).strip()
    source = "\n".join(
        [
            f"Title: {case.title}",
            f"History: {case.patient.medical_history or ''}",
            f"Symptoms: {', '.join(case.symptoms or [])}",
            f"Diagnoses: {', '.join(case.diagnoses or [])}",
            f"Treatments: {', '.join(case.treatments or [])}",
            combined,
        ]
    )
    try:
        payload = classify_document(source, filename=case.title)
    except RuntimeError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    extraction = Extraction(id=new_id(), case_id=case.id, payload=payload)
    db.add(extraction)
    entities = payload.get("entities") or {}
    if entities.get("diagnoses") and not case.diagnoses:
        case.diagnoses = entities["diagnoses"]
    if entities.get("symptoms") and not case.symptoms:
        case.symptoms = entities["symptoms"]
    case.status = "extracted"
    case.updated_at = utcnow()
    write_audit(
        db,
        organization_id=user.organization_id,
        user_id=user.id,
        action="run_extraction",
        resource_type="case",
        resource_id=case.id,
    )
    db.commit()
    return case_to_out(_load_case(db, case.id, user.organization_id))


@router.patch("/cases/{case_id}/extraction", response_model=CaseOut)
def edit_extraction(
    case_id: str,
    payload: dict,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    from app.models import Extraction
    from app.schemas import ExtractionUpdate

    body = ExtractionUpdate(**payload)
    case = _load_case(db, case_id, user.organization_id)
    extraction = Extraction(id=new_id(), case_id=case.id, payload=body.payload)
    db.add(extraction)
    case.updated_at = utcnow()
    write_audit(
        db,
        organization_id=user.organization_id,
        user_id=user.id,
        action="edit_extraction",
        resource_type="case",
        resource_id=case.id,
    )
    db.commit()
    return case_to_out(_load_case(db, case.id, user.organization_id))
