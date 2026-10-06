"""Tests for case and patient CRUD."""
from __future__ import annotations

import pytest

_PATIENT = {
    "first_name": "Jane",
    "last_name": "Doe",
    "date_of_birth": "1985-06-15",
    "sex": "female",
}

_CASE_BODY = {
    "title": "Back pain evaluation",
    "claim_number": "CLM-001",
    "case_type": "patient",
    "patient": _PATIENT,
    "symptoms": ["lower back pain", "stiffness"],
    "diagnoses": [],
    "treatments": [],
}


def _auth(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


def test_create_case_staff(client, staff_token):
    r = client.post("/api/cases", json=_CASE_BODY, headers=_auth(staff_token))
    assert r.status_code == 200
    data = r.json()
    assert data["title"] == "Back pain evaluation"
    assert data["claim_number"] == "CLM-001"
    assert data["status"] == "draft"
    assert data["patient"]["first_name"] == "Jane"
    return data["id"]


def test_create_and_get_case(client, staff_token):
    r = client.post("/api/cases", json=_CASE_BODY, headers=_auth(staff_token))
    assert r.status_code == 200
    case_id = r.json()["id"]

    r2 = client.get(f"/api/cases/{case_id}", headers=_auth(staff_token))
    assert r2.status_code == 200
    assert r2.json()["id"] == case_id


def test_list_cases_with_filters(client, staff_token):
    # Create a case first
    client.post("/api/cases", json=_CASE_BODY, headers=_auth(staff_token))

    # Filter by status
    r = client.get("/api/cases?status=draft", headers=_auth(staff_token))
    assert r.status_code == 200
    for item in r.json():
        assert item["status"] == "draft"


def test_update_case(client, staff_token):
    r = client.post("/api/cases", json=_CASE_BODY, headers=_auth(staff_token))
    case_id = r.json()["id"]

    r2 = client.patch(
        f"/api/cases/{case_id}",
        json={"symptoms": ["back pain", "fatigue"]},
        headers=_auth(staff_token),
    )
    assert r2.status_code == 200
    assert "fatigue" in r2.json()["symptoms"]


def test_add_note(client, staff_token):
    r = client.post("/api/cases", json=_CASE_BODY, headers=_auth(staff_token))
    case_id = r.json()["id"]

    r2 = client.post(
        f"/api/cases/{case_id}/notes",
        json={"body": "Patient reports improvement"},
        headers=_auth(staff_token),
    )
    assert r2.status_code == 200
    assert r2.json()["body"] == "Patient reports improvement"


def test_delete_case_staff_forbidden(client, staff_token):
    r = client.post("/api/cases", json=_CASE_BODY, headers=_auth(staff_token))
    case_id = r.json()["id"]

    r2 = client.delete(f"/api/cases/{case_id}", headers=_auth(staff_token))
    assert r2.status_code == 403


def test_delete_case_admin(client, admin_token, staff_token):
    r = client.post("/api/cases", json=_CASE_BODY, headers=_auth(staff_token))
    case_id = r.json()["id"]

    r2 = client.delete(f"/api/cases/{case_id}", headers=_auth(admin_token))
    assert r2.status_code == 204

    r3 = client.get(f"/api/cases/{case_id}", headers=_auth(admin_token))
    assert r3.status_code == 404


def test_case_not_found(client, staff_token):
    r = client.get("/api/cases/nonexistent-id", headers=_auth(staff_token))
    assert r.status_code == 404
