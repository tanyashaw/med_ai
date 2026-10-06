from sqlalchemy.orm import Session
from datetime import datetime, timezone, timedelta

from app.deps import hash_password
from app.models import (
    Organization, User, Patient, Case, CaseNote, Document, Analysis, Report, AuditLog, new_id
)


def seed_if_empty(db: Session, admin_password: str) -> None:
    # Always check users first
    org = db.query(Organization).first()
    if not org:
        org = Organization(id=new_id(), name="MedAI Health Systems")
        db.add(org)
        db.flush()

    users_map = {}
    if not db.query(User).first():
        users_def = [
            ("admin@medai.local", "Admin User", "admin", admin_password),
            ("doctor@medai.local", "Dr. Avery Chen", "doctor", "Doctor123!"),
            ("reviewer@medai.local", "Jordan Hale", "insurance_reviewer", "Review123!"),
            ("staff@medai.local", "Sam Ortiz", "staff", "Staff123!"),
        ]
        for email, name, role, password in users_def:
            u = User(
                id=new_id(),
                organization_id=org.id,
                email=email,
                full_name=name,
                role=role,
                hashed_password=hash_password(password),
            )
            db.add(u)
            users_map[role] = u
        db.flush()
    else:
        for u in db.query(User).all():
            users_map[u.role] = u

    # Check if cases exist
    if db.query(Case).first():
        db.commit()
        return

    admin_user = users_map.get("admin")
    doctor_user = users_map.get("doctor")
    reviewer_user = users_map.get("insurance_reviewer")
    staff_user = users_map.get("staff")

    now = datetime.now(timezone.utc)

    # ──────────────────────────────────────────────────────────────────────────
    # Dummy Patients
    # ──────────────────────────────────────────────────────────────────────────
    p1 = Patient(
        id=new_id(),
        organization_id=org.id,
        first_name="Sarah",
        last_name="Jenkins",
        date_of_birth="1984-05-12",
        sex="Female",
        phone="(555) 234-5678",
        email="sjenkins@example.com",
        address="742 Evergreen Terrace, Springfield",
        medical_history="Right knee arthralgia, prior PT 6 weeks, no prior surgeries."
    )
    p2 = Patient(
        id=new_id(),
        organization_id=org.id,
        first_name="Marcus",
        last_name="Vance",
        date_of_birth="1976-11-03",
        sex="Male",
        phone="(555) 876-5432",
        email="mvance@example.com",
        address="1042 Elm Street, Metropolis",
        medical_history="Chronic lower back pain, L4-L5 sciatica, NSAID intolerance."
    )
    p3 = Patient(
        id=new_id(),
        organization_id=org.id,
        first_name="Elena",
        last_name="Rostova",
        date_of_birth="1991-08-22",
        sex="Female",
        phone="(555) 345-6789",
        email="erostova@example.com",
        address="350 Fifth Avenue, New York",
        medical_history="Exertional dyspnea, family history of mitral valve prolapse."
    )
    p4 = Patient(
        id=new_id(),
        organization_id=org.id,
        first_name="David",
        last_name="Miller",
        date_of_birth="1968-02-14",
        sex="Male",
        phone="(555) 987-6543",
        email="dmiller@example.com",
        address="88 Pacific Coast Hwy, Malibu",
        medical_history="Right shoulder pain following sports injury 3 months ago."
    )
    db.add_all([p1, p2, p3, p4])
    db.flush()

    # ──────────────────────────────────────────────────────────────────────────
    # Case 1: Decided / Approved Pre-Authorization Workflow
    # ──────────────────────────────────────────────────────────────────────────
    c1 = Case(
        id=new_id(),
        organization_id=org.id,
        patient_id=p1.id,
        claim_number="CLM-2026-88192",
        title="Right Knee Arthroscopy & Meniscectomy Pre-Auth",
        case_type="insurance_claim",
        status="decided",
        symptoms=["Right knee pain", "Joint locking", "Swelling post-exertion"],
        diagnoses=["Tear of medial meniscus of right knee (ICD-10: M23.22)"],
        treatments=["Outpatient Arthroscopy", "Partial Meniscectomy (CPT: 29881)"],
        created_by_id=staff_user.id if staff_user else None,
        assigned_to_id=doctor_user.id if doctor_user else None,
        created_at=now - timedelta(days=5),
        updated_at=now - timedelta(hours=2)
    )
    db.add(c1)
    db.flush()

    d1 = Document(
        id=new_id(),
        organization_id=org.id,
        case_id=c1.id,
        filename="MRI_Right_Knee_Report.pdf",
        content_type="application/pdf",
        storage_path="uploads/MRI_Right_Knee_Report.pdf",
        doc_type="radiology_report",
        extracted_text=(
            "CLINICAL HISTORY: 41-year-old female with persistent right knee pain and mechanical catching for 8 weeks.\n"
            "FINDINGS: High-field 3.0T MRI of the right knee demonstrates a complex posterior horn bucket-handle tear "
            "of the medial meniscus with displacement into the intercondylar notch. Grade II joint space narrowing. "
            "Collateral ligaments intact. Moderate joint effusion.\n"
            "IMPRESSION: Complex medial meniscal tear requiring surgical repair/debridement. Failed 6 weeks conservative therapy."
        ),
        entities={"diagnoses": ["Medial Meniscus Tear"], "cpt": ["29881"], "urgency": "High"},
        created_at=now - timedelta(days=4)
    )
    db.add(d1)

    a1 = Analysis(
        id=new_id(),
        case_id=c1.id,
        summary="High-confidence approval recommended for right knee arthroscopy and partial meniscectomy.",
        diagnoses=[{"name": "Complex Medial Meniscus Tear", "code": "M23.22", "confidence": 0.96}],
        procedures=[{"name": "Arthroscopic Meniscectomy", "code": "29881", "confidence": 0.94}],
        medications=[{"name": "Ibuprofen 600mg", "dosage": "TID", "confidence": 0.90}],
        symptoms=[{"name": "Joint locking", "confidence": 0.95}, {"name": "Persistent pain", "confidence": 0.92}],
        conditions=[{"name": "Grade II joint space narrowing", "confidence": 0.88}],
        key_findings=[
            {"text": "MRI confirms bucket-handle tear of right medial meniscus.", "source": "MRI_Right_Knee_Report.pdf"},
            {"text": "Patient completed 6 weeks of conservative physical therapy without resolution.", "source": "Clinical Notes"}
        ],
        risk_flags=[],
        recommendations=["Approve CPT 29881 - Outpatient Arthroscopic Repair", "Post-op Physical Therapy 4-6 weeks"],
        overall_confidence=0.95,
        created_at=now - timedelta(days=3)
    )
    db.add(a1)

    rep1 = Report(
        id=new_id(),
        case_id=c1.id,
        decision="approved",
        comments="Pre-authorization granted. Clinical indications met for CPT 29881 based on MRI confirmed bucket-handle tear and conservative therapy trial.",
        snapshot={"decision": "approved", "confidence": 0.95, "reviewer": "Dr. Avery Chen"},
        created_by_id=doctor_user.id if doctor_user else None,
        created_at=now - timedelta(hours=2)
    )
    db.add(rep1)

    cn1 = CaseNote(
        id=new_id(),
        case_id=c1.id,
        user_id=doctor_user.id if doctor_user else None,
        body="Reviewed MRI imaging and progress notes. Pre-authorization approved and sent to billing.",
        created_at=now - timedelta(hours=2)
    )
    db.add(cn1)

    # ──────────────────────────────────────────────────────────────────────────
    # Case 2: In Review Workflow
    # ──────────────────────────────────────────────────────────────────────────
    c2 = Case(
        id=new_id(),
        organization_id=org.id,
        patient_id=p2.id,
        claim_number="CLM-2026-74102",
        title="Lumbar Epidural Steroid Infiltration Pre-Auth",
        case_type="insurance_claim",
        status="in_review",
        symptoms=["Low back pain", "L5 dermatomal radiculopathy", "Numbness left foot"],
        diagnoses=["Lumbar radiculopathy (ICD-10: M54.16)", "L4-L5 Intervertebral disc degeneration"],
        treatments=["Fluoroscopic Lumbar Epidural Steroid Injection (CPT: 62323)"],
        created_by_id=staff_user.id if staff_user else None,
        assigned_to_id=reviewer_user.id if reviewer_user else None,
        created_at=now - timedelta(days=3),
        updated_at=now - timedelta(hours=5)
    )
    db.add(c2)
    db.flush()

    d2 = Document(
        id=new_id(),
        organization_id=org.id,
        case_id=c2.id,
        filename="L-Spine_Progress_Notes.pdf",
        content_type="application/pdf",
        storage_path="uploads/L-Spine_Progress_Notes.pdf",
        doc_type="clinical_note",
        extracted_text=(
            "PROGRESS NOTE: 49-year-old male presenting with chronic lower back pain radiating down the left leg.\n"
            "Pain severity: 7/10 VAS. Positive straight leg raise at 45 degrees left. Lumbar spine MRI demonstrates "
            "L4-L5 posterior disc herniation with mild subarticular zone stenosis compressing exiting L5 nerve root.\n"
            "Oral NSAIDs and physical therapy provided minor temporary relief over 8 weeks. Physician recommends ESI."
        ),
        entities={"diagnoses": ["Lumbar Radiculopathy", "L4-L5 Herniation"], "cpt": ["62323"]},
        created_at=now - timedelta(days=2)
    )
    db.add(d2)

    a2 = Analysis(
        id=new_id(),
        case_id=c2.id,
        summary="Clinical criteria met for fluoroscopic lumbar epidural injection. Conservative therapy satisfied.",
        diagnoses=[{"name": "Lumbar Radiculopathy", "code": "M54.16", "confidence": 0.93}],
        procedures=[{"name": "Lumbar Epidural Steroid Injection", "code": "62323", "confidence": 0.91}],
        medications=[{"name": "Gabapentin 300mg", "dosage": "TID", "confidence": 0.88}],
        symptoms=[{"name": "Radicular leg pain", "confidence": 0.94}],
        conditions=[{"name": "L4-L5 disc protrusion", "confidence": 0.90}],
        key_findings=[
            {"text": "MRI demonstrates left L4-L5 nerve root compression.", "source": "L-Spine_Progress_Notes.pdf"},
            {"text": "Patient completed 8 weeks of physical therapy and oral medications.", "source": "L-Spine_Progress_Notes.pdf"}
        ],
        risk_flags=[],
        recommendations=["Approve single-level fluoroscopic lumbar ESI"],
        overall_confidence=0.92,
        created_at=now - timedelta(days=1)
    )
    db.add(a2)

    # ──────────────────────────────────────────────────────────────────────────
    # Case 3: Analyzed Workflow (Ready for Review)
    # ──────────────────────────────────────────────────────────────────────────
    c3 = Case(
        id=new_id(),
        organization_id=org.id,
        patient_id=p3.id,
        claim_number="CLM-2026-55910",
        title="Cardiology Consult & Echocardiogram Assessment",
        case_type="patient",
        status="analyzed",
        symptoms=["Exertional dyspnea", "Episodic palpitations", "Fatigue"],
        diagnoses=["Rheumatic mitral stenosis (ICD-10: I05.0)"],
        treatments=["Diagnostic Echocardiogram (CPT: 93306)", "Beta-blocker therapy"],
        created_by_id=staff_user.id if staff_user else None,
        assigned_to_id=doctor_user.id if doctor_user else None,
        created_at=now - timedelta(days=2),
        updated_at=now - timedelta(hours=12)
    )
    db.add(c3)
    db.flush()

    d3 = Document(
        id=new_id(),
        organization_id=org.id,
        case_id=c3.id,
        filename="Cardiology_Intake_Consult.pdf",
        content_type="application/pdf",
        storage_path="uploads/Cardiology_Intake_Consult.pdf",
        doc_type="consultation_note",
        extracted_text=(
            "CARDIOLOGY CONSULTATION: 34-year-old female evaluated for dyspnea on exertion and chest tightness.\n"
            "Auscultation reveals mid-diastolic rumble at apex. 2D Transthoracic Echocardiogram performed:\n"
            "Mitral valve leaflet thickening with mild diastolic gradient (mean 4 mmHg). Left atrial diameter 4.1 cm.\n"
            "Ejection fraction 62%. No significant mitral regurgitation. Plan: Initiate Metoprolol 25mg daily."
        ),
        entities={"diagnoses": ["Mitral Valve Stenosis"], "cpt": ["93306"], "ef": "62%"},
        created_at=now - timedelta(days=1)
    )
    db.add(d3)

    a3 = Analysis(
        id=new_id(),
        case_id=c3.id,
        summary="AI analysis extracted mitral leaflet thickening and normal LVEF (62%). Low clinical risk.",
        diagnoses=[{"name": "Rheumatic Mitral Stenosis", "code": "I05.0", "confidence": 0.89}],
        procedures=[{"name": "Transthoracic Echocardiography", "code": "93306", "confidence": 0.95}],
        medications=[{"name": "Metoprolol Succinate 25mg", "dosage": "QD", "confidence": 0.91}],
        symptoms=[{"name": "Exertional dyspnea", "confidence": 0.92}],
        conditions=[{"name": "Preserved ejection fraction (62%)", "confidence": 0.94}],
        key_findings=[
            {"text": "Echocardiogram demonstrates LA diameter 4.1 cm and LVEF 62%.", "source": "Cardiology_Intake_Consult.pdf"}
        ],
        risk_flags=[],
        recommendations=["Routine 12-month follow-up echocardiogram", "Continue medical management"],
        overall_confidence=0.91,
        created_at=now - timedelta(hours=14)
    )
    db.add(a3)

    # ──────────────────────────────────────────────────────────────────────────
    # Case 4: Document Intake Workflow
    # ──────────────────────────────────────────────────────────────────────────
    c4 = Case(
        id=new_id(),
        organization_id=org.id,
        patient_id=p4.id,
        claim_number="CLM-2026-33918",
        title="Rotator Cuff Repair Initial Intake",
        case_type="patient",
        status="documents",
        symptoms=["Right shoulder pain", "Weakness on abduction"],
        diagnoses=["Rotator cuff syndrome (ICD-10: M75.1)"],
        treatments=["Orthopedic consultation"],
        created_by_id=staff_user.id if staff_user else None,
        assigned_to_id=staff_user.id if staff_user else None,
        created_at=now - timedelta(hours=8),
        updated_at=now - timedelta(hours=2)
    )
    db.add(c4)
    db.flush()

    d4 = Document(
        id=new_id(),
        organization_id=org.id,
        case_id=c4.id,
        filename="Shoulder_US_Report.pdf",
        content_type="application/pdf",
        storage_path="uploads/Shoulder_US_Report.pdf",
        doc_type="radiology_report",
        extracted_text=(
            "ULTRASOUND RIGHT SHOULDER: 58-year-old male with overhead shoulder pain after lifting.\n"
            "Full-thickness tear of the supraspinatus tendon measuring 1.4 cm with retraction. "
            "Biceps tendon in normal position. Subacromial-subdeltoid bursitis present."
        ),
        entities={"diagnoses": ["Supraspinatus Tendon Tear"], "severity": "Full-thickness"},
        created_at=now - timedelta(hours=3)
    )
    db.add(d4)

    # Rich Audit Logs
    audit1 = AuditLog(
        id=new_id(),
        organization_id=org.id,
        user_id=doctor_user.id if doctor_user else None,
        action="decide_case",
        resource_type="report",
        resource_id=rep1.id,
        details={"decision": "approved", "title": c1.title, "comments": rep1.comments},
        created_at=now - timedelta(hours=2)
    )
    audit2 = AuditLog(
        id=new_id(),
        organization_id=org.id,
        user_id=staff_user.id if staff_user else None,
        action="upload_document",
        resource_type="document",
        resource_id=d4.id,
        details={"filename": "Shoulder_US_Report.pdf", "title": c4.title},
        created_at=now - timedelta(hours=3)
    )
    audit3 = AuditLog(
        id=new_id(),
        organization_id=org.id,
        user_id=reviewer_user.id if reviewer_user else None,
        action="run_analysis",
        resource_type="case",
        resource_id=c2.id,
        details={"title": c2.title, "confidence": 0.92},
        created_at=now - timedelta(hours=6)
    )
    audit4 = AuditLog(
        id=new_id(),
        organization_id=org.id,
        user_id=staff_user.id if staff_user else None,
        action="create_case",
        resource_type="case",
        resource_id=c1.id,
        details={"title": c1.title},
        created_at=now - timedelta(days=5)
    )
    audit5 = AuditLog(
        id=new_id(),
        organization_id=org.id,
        user_id=doctor_user.id if doctor_user else None,
        action="download_report",
        resource_type="report",
        resource_id=rep1.id,
        details={"filename": "report_Right_Knee_Arthroscopy.pdf"},
        created_at=now - timedelta(hours=1)
    )
    db.add_all([audit1, audit2, audit3, audit4, audit5])

    db.commit()

