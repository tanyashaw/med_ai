from app.models import Case
from app.schemas import AnalysisOut, CaseOut, ExtractionOut, ReportOut


def latest(items):
    return max(items, key=lambda item: item.created_at) if items else None


def case_to_out(case: Case) -> CaseOut:
    extraction = latest(case.extractions)
    analysis = latest(case.analyses)
    report = latest(case.reports)
    return CaseOut(
        id=case.id,
        organization_id=case.organization_id,
        claim_number=case.claim_number,
        title=case.title,
        case_type=case.case_type,
        status=case.status,
        symptoms=case.symptoms or [],
        diagnoses=case.diagnoses or [],
        treatments=case.treatments or [],
        created_by_id=case.created_by_id,
        assigned_to_id=case.assigned_to_id,
        created_at=case.created_at,
        updated_at=case.updated_at,
        patient=case.patient,
        notes=sorted(case.notes, key=lambda n: n.created_at),
        documents=sorted(case.documents, key=lambda d: d.created_at),
        latest_extraction=ExtractionOut.model_validate(extraction) if extraction else None,
        latest_analysis=AnalysisOut.model_validate(analysis) if analysis else None,
        latest_report=ReportOut.model_validate(report) if report else None,
    )
