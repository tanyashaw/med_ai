"""Tests for document upload and AI analysis (Groq client mocked)."""
from __future__ import annotations

import io
import json
from unittest.mock import MagicMock, patch

import pytest


_PATIENT = {"first_name": "John", "last_name": "Smith", "date_of_birth": "1970-01-01"}
_CASE_BODY = {
    "title": "Knee MRI Review",
    "case_type": "patient",
    "patient": _PATIENT,
    "symptoms": ["knee pain"],
}


def _auth(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


def _make_case(client, token):
    r = client.post("/api/cases", json=_CASE_BODY, headers=_auth(token))
    assert r.status_code == 200
    return r.json()["id"]


# ── Upload ────────────────────────────────────────────────────────────────────

def test_upload_txt_document(client, staff_token):
    case_id = _make_case(client, staff_token)
    content = b"Patient: John Smith\nDiagnosis: Osteoarthritis\nPrescription: Ibuprofen 400mg"
    with patch("app.services.ai.get_groq") as mock_groq:
        mock_resp = MagicMock()
        mock_resp.choices[0].message.content = json.dumps({
            "doc_type": "prescription",
            "entities": {
                "diagnoses": ["Osteoarthritis"],
                "procedures": [],
                "medications": [{"name": "Ibuprofen", "dose": "400mg", "frequency": None}],
                "dates": [],
                "symptoms": [],
                "key_findings": [],
            }
        })
        mock_groq.return_value.chat.completions.create.return_value = mock_resp
        r = client.post(
            f"/api/cases/{case_id}/documents",
            files={"file": ("report.txt", io.BytesIO(content), "text/plain")},
            headers=_auth(staff_token),
        )
    assert r.status_code == 200
    data = r.json()
    assert data["filename"] == "report.txt"
    assert data["doc_type"] == "prescription"


def test_upload_unsupported_type(client, staff_token):
    case_id = _make_case(client, staff_token)
    r = client.post(
        f"/api/cases/{case_id}/documents",
        files={"file": ("file.csv", io.BytesIO(b"a,b"), "text/csv")},
        headers=_auth(staff_token),
    )
    assert r.status_code == 400


def test_upload_too_large(client, staff_token):
    case_id = _make_case(client, staff_token)
    big = b"x" * (16 * 1024 * 1024)  # 16 MB > 15 MB limit
    r = client.post(
        f"/api/cases/{case_id}/documents",
        files={"file": ("big.txt", io.BytesIO(big), "text/plain")},
        headers=_auth(staff_token),
    )
    assert r.status_code == 413


# ── Analysis (mocked Groq) ────────────────────────────────────────────────────

_MOCK_ANALYSIS = {
    "summary": "Patient has osteoarthritis in the right knee.",
    "diagnoses": [{"name": "Osteoarthritis", "icd10": "M17.11", "confidence": 0.9, "source": None}],
    "procedures": [],
    "medications": [{"name": "Ibuprofen", "dose": "400mg", "frequency": "TID", "source": None}],
    "symptoms": ["knee pain"],
    "conditions": [],
    "key_findings": ["Moderate joint space narrowing"],
    "missing_information": ["MRI report not yet reviewed"],
    "risk_flags": [],
    "recommendations": ["Physical therapy referral"],
    "overall_confidence": 0.85,
}


def test_run_analysis_staff_forbidden(client, staff_token):
    case_id = _make_case(client, staff_token)
    r = client.post(f"/api/cases/{case_id}/analyze", headers=_auth(staff_token))
    assert r.status_code == 403


def test_run_analysis_doctor_ok(client, doctor_token, staff_token):
    case_id = _make_case(client, staff_token)
    with patch("app.services.ai.get_groq") as mock_groq:
        mock_resp = MagicMock()
        mock_resp.choices[0].message.content = json.dumps(_MOCK_ANALYSIS)
        mock_groq.return_value.chat.completions.create.return_value = mock_resp
        r = client.post(f"/api/cases/{case_id}/analyze", headers=_auth(doctor_token))
    assert r.status_code == 200
    data = r.json()
    assert data["status"] == "analyzed"
    analysis = data["latest_analysis"]
    assert analysis["summary"] == _MOCK_ANALYSIS["summary"]
    assert len(analysis["diagnoses"]) == 1
    assert analysis["diagnoses"][0]["icd10"] == "M17.11"
    assert abs(analysis["overall_confidence"] - 0.85) < 0.01


def test_decide_case(client, doctor_token, reviewer_token, staff_token):
    case_id = _make_case(client, staff_token)
    # Run analysis first
    with patch("app.services.ai.get_groq") as mock_groq:
        mock_resp = MagicMock()
        mock_resp.choices[0].message.content = json.dumps(_MOCK_ANALYSIS)
        mock_groq.return_value.chat.completions.create.return_value = mock_resp
        client.post(f"/api/cases/{case_id}/analyze", headers=_auth(doctor_token))

    # Decide
    r = client.post(
        f"/api/cases/{case_id}/decide",
        json={"decision": "approve", "comments": "All clear"},
        headers=_auth(reviewer_token),
    )
    assert r.status_code == 200
    data = r.json()
    assert data["status"] == "decided"
    assert data["latest_report"]["decision"] == "approve"


def test_decide_invalid_decision(client, doctor_token, staff_token):
    case_id = _make_case(client, staff_token)
    r = client.post(
        f"/api/cases/{case_id}/decide",
        json={"decision": "maybe"},
        headers=_auth(doctor_token),
    )
    assert r.status_code == 400
