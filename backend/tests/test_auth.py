"""Tests for auth endpoints and JWT token behaviour."""
from __future__ import annotations


def test_login_success(client):
    r = client.post("/api/auth/login", data={"username": "admin@medai.local", "password": "Admin123!"})
    assert r.status_code == 200
    data = r.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"


def test_login_wrong_password(client):
    r = client.post("/api/auth/login", data={"username": "admin@medai.local", "password": "wrong"})
    assert r.status_code == 401


def test_login_unknown_user(client):
    r = client.post("/api/auth/login", data={"username": "nobody@x.com", "password": "x"})
    assert r.status_code == 401


def test_me_requires_auth(client):
    r = client.get("/api/auth/me")
    assert r.status_code == 401


def test_me_with_token(client, admin_token):
    r = client.get("/api/auth/me", headers={"Authorization": f"Bearer {admin_token}"})
    assert r.status_code == 200
    me = r.json()
    assert me["email"] == "admin@medai.local"
    assert me["role"] == "admin"


def test_me_with_bad_token(client):
    r = client.get("/api/auth/me", headers={"Authorization": "Bearer bad.token.here"})
    assert r.status_code == 401
