from __future__ import annotations

import json
from io import BytesIO

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from fpdf import FPDF
from sqlalchemy.orm import Session

from app.api import case_to_out
from app.api.cases import _load_case
from app.database import get_db
from app.deps import DECISION_ROLES, get_current_user
from app.models import Analysis, CaseNote, Report, User, new_id, utcnow
from app.schemas import CaseOut, DecisionIn, ReviewIn
from app.services.ai import analyze_case
from app.services.audit import write_audit

router = APIRouter(prefix="/cases", tags=["analysis"])


@router.post("/{case_id}/analyze", response_model=CaseOut)
def run_analysis(case_id: str, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if user.role not in DECISION_ROLES:
        raise HTTPException(status_code=403, detail="Only doctors, reviewers, and admins can run analysis")

    case = _load_case(db, case_id, user.organization_id)

    # Build document context with filenames for source references
    doc_texts = []
    for doc in case.documents:
        if doc.extracted_text:
            doc_texts.append({"filename": doc.filename, "text": doc.extracted_text[:3000]})

    payload = {
        "title": case.title,
        "claim_number": case.claim_number,
        "case_type": case.case_type,
        "patient": {
            "name": f"{case.patient.first_name} {case.patient.last_name}",
            "date_of_birth": case.patient.date_of_birth,
            "sex": case.patient.sex,
            "medical_history": case.patient.medical_history,
        },
        "symptoms": case.symptoms,
        "diagnoses": case.diagnoses,
        "treatments": case.treatments,
        "documents": doc_texts,
        "notes": [note.body for note in case.notes],
    }

    try:
        result = analyze_case(payload)
    except RuntimeError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Analysis failed: {exc}") from exc

    analysis = Analysis(
        id=new_id(),
        case_id=case.id,
        summary=result["summary"],
        diagnoses=result["diagnoses"],
        procedures=result["procedures"],
        medications=result["medications"],
        symptoms=result["symptoms"],
        conditions=result["conditions"],
        key_findings=result["key_findings"],
        missing_information=result["missing_information"],
        risk_flags=result["risk_flags"],
        recommendations=result["recommendations"],
        overall_confidence=result["overall_confidence"],
        findings=result["key_findings"],  # backward compat
    )
    db.add(analysis)
    case.status = "analyzed"
    case.updated_at = utcnow()
    write_audit(
        db,
        organization_id=user.organization_id,
        user_id=user.id,
        action="run_analysis",
        resource_type="case",
        resource_id=case.id,
    )
    db.commit()
    return case_to_out(_load_case(db, case.id, user.organization_id))


@router.post("/{case_id}/review", response_model=CaseOut)
def submit_review(
    case_id: str,
    payload: ReviewIn,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    case = _load_case(db, case_id, user.organization_id)
    db.add(CaseNote(id=new_id(), case_id=case.id, user_id=user.id, body=payload.body))
    case.status = "in_review"
    case.updated_at = utcnow()
    write_audit(
        db,
        organization_id=user.organization_id,
        user_id=user.id,
        action="submit_review",
        resource_type="case",
        resource_id=case.id,
    )
    db.commit()
    return case_to_out(_load_case(db, case.id, user.organization_id))


@router.post("/{case_id}/decide", response_model=CaseOut)
def decide_case(
    case_id: str,
    payload: DecisionIn,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if user.role not in DECISION_ROLES:
        raise HTTPException(status_code=403, detail="Staff cannot finalize decisions")
    allowed = {"approve", "deny", "request_info", "refer"}
    if payload.decision not in allowed:
        raise HTTPException(status_code=400, detail="Invalid decision")

    case = _load_case(db, case_id, user.organization_id)
    analysis = max(case.analyses, key=lambda item: item.created_at) if case.analyses else None

    snapshot = {
        "title": case.title,
        "claim_number": case.claim_number,
        "patient": f"{case.patient.first_name} {case.patient.last_name}",
        "status_before": case.status,
        "symptoms": case.symptoms,
        "diagnoses": case.diagnoses,
        "treatments": case.treatments,
        "analysis": {
            "summary": analysis.summary if analysis else "",
            "diagnoses": analysis.diagnoses if analysis else [],
            "procedures": analysis.procedures if analysis else [],
            "medications": analysis.medications if analysis else [],
            "key_findings": analysis.key_findings if analysis else [],
            "risk_flags": analysis.risk_flags if analysis else [],
            "missing_information": analysis.missing_information if analysis else [],
            "recommendations": analysis.recommendations if analysis else [],
            "overall_confidence": analysis.overall_confidence if analysis else 0.0,
        }
        if analysis
        else {},
        "reviewer_decision": payload.decision,
        "reviewer_comments": payload.comments,
    }
    report = Report(
        id=new_id(),
        case_id=case.id,
        decision=payload.decision,
        comments=payload.comments,
        snapshot=snapshot,
        created_by_id=user.id,
    )
    db.add(report)
    case.status = "decided"
    case.updated_at = utcnow()
    write_audit(
        db,
        organization_id=user.organization_id,
        user_id=user.id,
        action="decide_case",
        resource_type="report",
        resource_id=report.id,
        details={"decision": payload.decision, "case_id": case.id},
    )
    db.commit()
    return case_to_out(_load_case(db, case.id, user.organization_id))


# ── PDF Report Download ───────────────────────────────────────────────────────

def _build_report_pdf(case_data: dict, report_data: dict, reviewer_name: str) -> bytes:
    pdf = FPDF()
    pdf.set_auto_page_break(auto=True, margin=15)
    pdf.add_page()

    def clean_text(s: Any) -> str:
        if s is None:
            return ""
        text = str(s)
        replacements = {
            "—": "-",
            "–": "-",
            "•": "*",
            "“": '"',
            "”": '"',
            "‘": "'",
            "’": "'",
            "…": "...",
            "°": " deg",
        }
        for orig, repl in replacements.items():
            text = text.replace(orig, repl)
        return text.encode("latin-1", "replace").decode("latin-1")

    # Header
    pdf.set_font("Helvetica", "B", 16)
    pdf.cell(0, 10, clean_text("MedAI - Clinical Decision Report"), ln=True)
    pdf.set_font("Helvetica", "", 9)
    pdf.set_text_color(120, 120, 120)
    pdf.cell(0, 6, clean_text("AI-ASSISTED DECISION SUPPORT - REQUIRES HUMAN REVIEW AND CLINICAL JUDGMENT"), ln=True)
    pdf.ln(4)
    pdf.set_draw_color(20, 150, 130)
    pdf.set_line_width(0.5)
    pdf.line(10, pdf.get_y(), 200, pdf.get_y())
    pdf.ln(6)
    pdf.set_text_color(0, 0, 0)

    def section(title: str) -> None:
        pdf.set_font("Helvetica", "B", 12)
        pdf.set_fill_color(240, 248, 248)
        pdf.cell(0, 8, clean_text(title), ln=True, fill=True)
        pdf.set_font("Helvetica", "", 10)
        pdf.ln(2)

    def kv(label: str, value: Any) -> None:
        pdf.set_font("Helvetica", "B", 10)
        pdf.cell(45, 6, clean_text(f"{label}:"), new_x="RIGHT", new_y="TOP")
        pdf.set_font("Helvetica", "", 10)
        pdf.multi_cell(145, 6, clean_text(str(value) if value else "-"), new_x="LMARGIN", new_y="NEXT")

    def bullet_list(items: list) -> None:
        for item in items:
            if isinstance(item, dict):
                name = item.get("name") or str(item)
                extras = []
                if item.get("icd10"):
                    extras.append(f"ICD-10: {item['icd10']}")
                if item.get("dose"):
                    extras.append(f"Dose: {item['dose']}")
                if item.get("frequency"):
                    extras.append(f"Freq: {item['frequency']}")
                conf = item.get("confidence")
                if conf is not None:
                    try:
                        extras.append(f"Confidence: {float(conf):.0%}")
                    except (ValueError, TypeError):
                        extras.append(f"Confidence: {conf}")
                src = item.get("source")
                if src:
                    if isinstance(src, dict):
                        doc_name = src.get("document", "")
                        exc = src.get("excerpt", "")
                        extras.append(f"Source: {doc_name} - \"{exc}\"")
                    else:
                        extras.append(f"Source: {src}")
                line = f"  * {name}"
                if extras:
                    line += f" ({'; '.join(extras)})"
                pdf.set_font("Helvetica", "", 9)
                pdf.multi_cell(180, 6, clean_text(line), new_x="LMARGIN", new_y="NEXT")
            else:
                pdf.set_font("Helvetica", "", 9)
                pdf.multi_cell(180, 6, clean_text(f"  * {item}"), new_x="LMARGIN", new_y="NEXT")

    # Case details
    section("Case Information")
    kv("Case Title", case_data.get("title", ""))
    kv("Claim Number", case_data.get("claim_number") or "N/A")
    kv("Case Type", case_data.get("case_type", ""))
    kv("Patient", case_data.get("patient", ""))
    pdf.ln(4)

    # Decision
    section("Reviewer Decision")
    decision = report_data.get("decision", "").replace("_", " ").upper()
    kv("Decision", decision)
    kv("Reviewer", reviewer_name)
    kv("Comments", report_data.get("comments") or "None provided")
    kv("Report Date", report_data.get("created_at", ""))
    pdf.ln(4)

    # Analysis
    snap = report_data.get("snapshot", {})
    analysis = snap.get("analysis", {})
    if analysis:
        section("AI Analysis Summary")
        pdf.set_font("Helvetica", "", 10)
        pdf.multi_cell(0, 6, clean_text(analysis.get("summary") or ""))
        pdf.ln(2)

        conf = analysis.get("overall_confidence")
        if conf is not None:
            try:
                kv("Overall Confidence", f"{float(conf):.0%}")
            except (ValueError, TypeError):
                kv("Overall Confidence", str(conf))
        pdf.ln(4)

        if analysis.get("diagnoses"):
            section("Diagnoses")
            bullet_list(analysis["diagnoses"])
            pdf.ln(2)

        if analysis.get("medications"):
            section("Medications")
            bullet_list(analysis["medications"])
            pdf.ln(2)

        if analysis.get("key_findings"):
            section("Key Findings")
            bullet_list(analysis["key_findings"])
            pdf.ln(2)

        if analysis.get("risk_flags"):
            section("Risk Flags")
            bullet_list(analysis["risk_flags"])
            pdf.ln(2)

        if analysis.get("recommendations"):
            section("Recommendations")
            bullet_list(analysis["recommendations"])
            pdf.ln(2)

        if analysis.get("missing_information"):
            section("Missing / Unclear Information")
            bullet_list(analysis["missing_information"])
            pdf.ln(2)

    # Disclaimer
    pdf.ln(8)
    pdf.set_draw_color(200, 200, 200)
    pdf.line(10, pdf.get_y(), 200, pdf.get_y())
    pdf.ln(4)
    pdf.set_font("Helvetica", "I", 8)
    pdf.set_text_color(100, 100, 100)
    pdf.multi_cell(
        0,
        5,
        clean_text(
            "DISCLAIMER: This report was generated with AI assistance and is intended solely as decision support. "
            "It does not constitute medical advice or a clinical diagnosis. All findings must be independently "
            "verified by qualified healthcare professionals. The AI model may produce errors or omissions. "
            "This system is not HIPAA-certified for production use; consult your compliance team before handling "
            "real patient data."
        ),
    )
    return bytes(pdf.output())


@router.get("/{case_id}/report/pdf")
def download_report_pdf(
    case_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    case = _load_case(db, case_id, user.organization_id)
    if not case.reports:
        raise HTTPException(status_code=404, detail="No report found for this case")
    report = max(case.reports, key=lambda r: r.created_at)

    # Look up reviewer name
    reviewer = db.get(User, report.created_by_id) if report.created_by_id else None
    reviewer_name = reviewer.full_name if reviewer else "Unknown"

    case_data = {
        "title": case.title,
        "claim_number": case.claim_number,
        "case_type": case.case_type,
        "patient": f"{case.patient.first_name} {case.patient.last_name}",
    }
    report_data = {
        "decision": report.decision,
        "comments": report.comments,
        "snapshot": report.snapshot,
        "created_at": report.created_at.strftime("%Y-%m-%d %H:%M UTC"),
    }

    pdf_bytes = _build_report_pdf(case_data, report_data, reviewer_name)
    write_audit(
        db,
        organization_id=user.organization_id,
        user_id=user.id,
        action="download_report",
        resource_type="report",
        resource_id=report.id,
        details={"case_id": case.id},
    )
    db.commit()

    safe_title = "".join(c if c.isalnum() or c in "-_ " else "_" for c in case.title)[:40]
    filename = f"report_{safe_title}.pdf"
    return StreamingResponse(
        BytesIO(pdf_bytes),
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
