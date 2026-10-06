from __future__ import annotations

from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session, joinedload

from app.api import case_to_out
from app.database import get_db
from app.deps import get_current_user
from app.models import Case, CaseNote, Patient, User, new_id, utcnow
from app.schemas import CaseCreate, CaseOut, CaseUpdate, NoteCreate, NoteOut
from app.services.audit import write_audit

router = APIRouter(prefix="/cases", tags=["cases"])


def _load_case(db: Session, case_id: str, org_id: str) -> Case:
    case = (
        db.query(Case)
        .options(
            joinedload(Case.patient),
            joinedload(Case.notes),
            joinedload(Case.documents),
            joinedload(Case.extractions),
            joinedload(Case.analyses),
            joinedload(Case.reports),
        )
        .filter(Case.id == case_id, Case.organization_id == org_id)
        .first()
    )
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")
    return case


@router.get("", response_model=list[CaseOut])
def list_cases(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    status: Optional[str] = Query(default=None),
    search: Optional[str] = Query(default=None, description="Search by patient name, title or claim number"),
    claim_number: Optional[str] = Query(default=None),
):
    q = (
        db.query(Case)
        .options(
            joinedload(Case.patient),
            joinedload(Case.notes),
            joinedload(Case.documents),
            joinedload(Case.extractions),
            joinedload(Case.analyses),
            joinedload(Case.reports),
        )
        .filter(Case.organization_id == user.organization_id)
    )
    if status:
        q = q.filter(Case.status == status)
    if claim_number:
        q = q.filter(Case.claim_number.ilike(f"%{claim_number}%"))
    if search:
        term = f"%{search}%"
        q = q.join(Case.patient).filter(
            Case.title.ilike(term)
            | Case.claim_number.ilike(term)
            | Patient.first_name.ilike(term)
            | Patient.last_name.ilike(term)
        )
    cases = q.order_by(Case.updated_at.desc()).all()
    return [case_to_out(item) for item in cases]


import random

def generate_claim_number() -> str:
    from datetime import datetime, timezone
    year = datetime.now(timezone.utc).year
    rand_digits = random.randint(10000, 99999)
    return f"CLM-{year}-{rand_digits}"


@router.post("", response_model=CaseOut)
def create_case(payload: CaseCreate, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    patient = Patient(
        id=new_id(),
        organization_id=user.organization_id,
        **payload.patient.model_dump(),
    )
    db.add(patient)
    claim_num = payload.claim_number or generate_claim_number()
    case = Case(
        id=new_id(),
        organization_id=user.organization_id,
        patient_id=patient.id,
        claim_number=claim_num,
        title=payload.title,
        case_type=payload.case_type,
        status="draft",
        symptoms=payload.symptoms,
        diagnoses=payload.diagnoses,
        treatments=payload.treatments,
        created_by_id=user.id,
        assigned_to_id=payload.assigned_to_id,
    )
    db.add(case)
    write_audit(
        db,
        organization_id=user.organization_id,
        user_id=user.id,
        action="create_case",
        resource_type="case",
        resource_id=case.id,
        details={"title": case.title, "claim_number": case.claim_number},
    )
    db.commit()
    return case_to_out(_load_case(db, case.id, user.organization_id))


@router.get("/{case_id}", response_model=CaseOut)
def get_case(case_id: str, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    write_audit(
        db,
        organization_id=user.organization_id,
        user_id=user.id,
        action="view_case",
        resource_type="case",
        resource_id=case_id,
    )
    db.commit()
    return case_to_out(_load_case(db, case_id, user.organization_id))


@router.patch("/{case_id}", response_model=CaseOut)
def update_case(
    case_id: str,
    payload: CaseUpdate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    case = _load_case(db, case_id, user.organization_id)
    data = payload.model_dump(exclude_unset=True)
    patient_data = data.pop("patient", None)
    for key, value in data.items():
        setattr(case, key, value)
    if patient_data:
        for key, value in patient_data.items():
            setattr(case.patient, key, value)
    case.updated_at = utcnow()
    write_audit(
        db,
        organization_id=user.organization_id,
        user_id=user.id,
        action="update_case",
        resource_type="case",
        resource_id=case.id,
        details=payload.model_dump(exclude_unset=True),
    )
    db.commit()
    return case_to_out(_load_case(db, case.id, user.organization_id))


@router.delete("/{case_id}", status_code=204)
def delete_case(
    case_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if user.role != "admin":
        raise HTTPException(status_code=403, detail="Only admins can delete cases")
    case = _load_case(db, case_id, user.organization_id)
    write_audit(
        db,
        organization_id=user.organization_id,
        user_id=user.id,
        action="delete_case",
        resource_type="case",
        resource_id=case.id,
        details={"title": case.title},
    )
    db.delete(case)
    db.commit()


@router.post("/{case_id}/notes", response_model=NoteOut)
def add_note(
    case_id: str,
    payload: NoteCreate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    case = _load_case(db, case_id, user.organization_id)
    note = CaseNote(id=new_id(), case_id=case.id, user_id=user.id, body=payload.body)
    db.add(note)
    case.updated_at = utcnow()
    write_audit(
        db,
        organization_id=user.organization_id,
        user_id=user.id,
        action="add_note",
        resource_type="case",
        resource_id=case.id,
    )
    db.commit()
    db.refresh(note)
    return note
