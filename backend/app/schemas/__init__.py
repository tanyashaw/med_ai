from __future__ import annotations

from datetime import datetime
from typing import Any, Optional

from pydantic import BaseModel, EmailStr, Field


# ── Auth ─────────────────────────────────────────────────────────────────────

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


# ── Users & Org ──────────────────────────────────────────────────────────────

class UserOut(BaseModel):
    id: str
    organization_id: str
    email: str  # plain str - EmailStr rejects .local domains in Pydantic v2
    full_name: str
    role: str
    is_active: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class UserCreate(BaseModel):
    email: str
    password: str = Field(min_length=8)
    full_name: str
    role: str = "staff"


class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    role: Optional[str] = None
    is_active: Optional[bool] = None
    password: Optional[str] = None


class OrganizationOut(BaseModel):
    id: str
    name: str
    created_at: datetime

    model_config = {"from_attributes": True}


class OrganizationUpdate(BaseModel):
    name: str


# ── Patient ──────────────────────────────────────────────────────────────────

class PatientIn(BaseModel):
    first_name: str
    last_name: str
    date_of_birth: Optional[str] = None
    sex: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    address: Optional[str] = None
    medical_history: Optional[str] = None


class PatientOut(PatientIn):
    id: str
    organization_id: str
    created_at: datetime

    model_config = {"from_attributes": True}


# ── Case ──────────────────────────────────────────────────────────────────────

class CaseCreate(BaseModel):
    title: str
    claim_number: Optional[str] = None
    case_type: str = "patient"
    patient: PatientIn
    symptoms: list[str] = Field(default_factory=list)
    diagnoses: list[str] = Field(default_factory=list)
    treatments: list[str] = Field(default_factory=list)
    assigned_to_id: Optional[str] = None


class CaseUpdate(BaseModel):
    title: Optional[str] = None
    claim_number: Optional[str] = None
    status: Optional[str] = None
    symptoms: Optional[list[str]] = None
    diagnoses: Optional[list[str]] = None
    treatments: Optional[list[str]] = None
    assigned_to_id: Optional[str] = None
    patient: Optional[PatientIn] = None


class NoteCreate(BaseModel):
    body: str


class NoteOut(BaseModel):
    id: str
    case_id: str
    user_id: Optional[str]
    body: str
    created_at: datetime

    model_config = {"from_attributes": True}


# ── Documents ────────────────────────────────────────────────────────────────

class DocumentOut(BaseModel):
    id: str
    case_id: str
    filename: str
    content_type: str
    extracted_text: Optional[str] = None
    doc_type: Optional[str] = None
    entities: Optional[dict[str, Any]] = None
    created_at: datetime

    model_config = {"from_attributes": True}


# ── Extraction ───────────────────────────────────────────────────────────────

class ExtractionOut(BaseModel):
    id: str
    case_id: str
    payload: dict[str, Any]
    created_at: datetime

    model_config = {"from_attributes": True}


class ExtractionUpdate(BaseModel):
    payload: dict[str, Any]


# ── Analysis (rich schema) ────────────────────────────────────────────────────

class SourceRef(BaseModel):
    document: str
    excerpt: str


class DiagnosisItem(BaseModel):
    name: str
    icd10: Optional[str] = None
    confidence: float = 0.7
    source: Optional[SourceRef] = None


class ProcedureItem(BaseModel):
    name: str
    source: Optional[SourceRef] = None


class MedicationItem(BaseModel):
    name: str
    dose: Optional[str] = None
    frequency: Optional[str] = None
    source: Optional[SourceRef] = None


class AnalysisOut(BaseModel):
    id: str
    case_id: str
    summary: str
    diagnoses: list[Any] = []
    procedures: list[Any] = []
    medications: list[Any] = []
    symptoms: list[Any] = []
    conditions: list[Any] = []
    key_findings: list[Any] = []
    missing_information: list[Any] = []
    risk_flags: list[Any] = []
    recommendations: list[Any] = []
    overall_confidence: float = 0.0
    # Legacy flat findings list
    findings: list[Any] = []
    created_at: datetime

    model_config = {"from_attributes": True}


# ── Review & Report ───────────────────────────────────────────────────────────

class ReviewIn(BaseModel):
    body: str


class DecisionIn(BaseModel):
    decision: str
    comments: Optional[str] = None


class ReportOut(BaseModel):
    id: str
    case_id: str
    decision: str
    comments: Optional[str]
    snapshot: dict[str, Any]
    created_by_id: Optional[str]
    created_at: datetime

    model_config = {"from_attributes": True}


# ── Case (full) ───────────────────────────────────────────────────────────────

class CaseOut(BaseModel):
    id: str
    organization_id: str
    claim_number: Optional[str] = None
    title: str
    case_type: str
    status: str
    symptoms: list[Any]
    diagnoses: list[Any]
    treatments: list[Any]
    created_by_id: Optional[str]
    assigned_to_id: Optional[str]
    created_at: datetime
    updated_at: datetime
    patient: PatientOut
    notes: list[NoteOut] = []
    documents: list[DocumentOut] = []
    latest_extraction: Optional[ExtractionOut] = None
    latest_analysis: Optional[AnalysisOut] = None
    latest_report: Optional[ReportOut] = None

    model_config = {"from_attributes": True}


# ── Audit & Analytics ─────────────────────────────────────────────────────────

class AuditOut(BaseModel):
    id: str
    organization_id: str
    user_id: Optional[str]
    action: str
    resource_type: str
    resource_id: Optional[str]
    details: dict[str, Any]
    created_at: datetime

    model_config = {"from_attributes": True}


class AnalyticsOut(BaseModel):
    cases_by_status: dict[str, int]
    document_count: int
    analysis_count: int
    report_count: int
    user_count: int
