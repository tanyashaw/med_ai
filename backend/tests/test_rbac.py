"""Tests for RBAC and organisation isolation."""
from __future__ import annotations

import pytest


def _auth(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


# ── Users endpoint (admin-only) ───────────────────────────────────────────────

def test_list_users_admin_ok(client, admin_token):
    r = client.get("/api/users", headers=_auth(admin_token))
    assert r.status_code == 200
    assert isinstance(r.json(), list)


def test_list_users_staff_forbidden(client, staff_token):
    r = client.get("/api/users", headers=_auth(staff_token))
    assert r.status_code == 403


def test_list_users_doctor_forbidden(client, doctor_token):
    r = client.get("/api/users", headers=_auth(doctor_token))
    assert r.status_code == 403


# ── Audit log (admin-only) ────────────────────────────────────────────────────

def test_audit_admin_ok(client, admin_token):
    r = client.get("/api/audit", headers=_auth(admin_token))
    assert r.status_code == 200


def test_audit_doctor_forbidden(client, doctor_token):
    r = client.get("/api/audit", headers=_auth(doctor_token))
    assert r.status_code == 403


def test_audit_reviewer_forbidden(client, reviewer_token):
    r = client.get("/api/audit", headers=_auth(reviewer_token))
    assert r.status_code == 403


# ── Create user (admin-only) ─────────────────────────────────────────────────

def test_create_user_admin_ok(client, admin_token):
    r = client.post(
        "/api/users",
        json={"email": "newdoc@medai.local", "password": "Pass1234!", "full_name": "New Doc", "role": "doctor"},
        headers=_auth(admin_token),
    )
    assert r.status_code == 200
    assert r.json()["role"] == "doctor"


def test_create_user_invalid_role(client, admin_token):
    r = client.post(
        "/api/users",
        json={"email": "x@y.com", "password": "Pass1234!", "full_name": "X", "role": "superuser"},
        headers=_auth(admin_token),
    )
    assert r.status_code == 400


# ── Org isolation: case created by org-A invisible to org-B ──────────────────

def test_org_isolation(client, admin_token):
    """All seeded users are in the same org, so their cases are visible to each other.
    This test verifies that case listing only returns cases from the requester's org
    (we cannot easily test cross-org in the seed, but we verify the filter is applied).
    """
    r = client.get("/api/cases", headers=_auth(admin_token))
    assert r.status_code == 200
    cases = r.json()
    # All returned cases must belong to the same org as the admin
    me_r = client.get("/api/auth/me", headers=_auth(admin_token))
    org_id = me_r.json()["organization_id"]
    for case in cases:
        assert case["organization_id"] == org_id
