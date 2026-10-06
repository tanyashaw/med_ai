from __future__ import annotations

from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import require_roles
from app.models import Analysis, AuditLog, Case, Document, Report, User
from app.schemas import AnalyticsOut, AuditOut

router = APIRouter(tags=["audit"])


@router.get("/audit", response_model=list[AuditOut])
def list_audit(
    user: User = Depends(require_roles("admin")),
    db: Session = Depends(get_db),
    limit: int = Query(default=200, le=500),
    user_id: Optional[str] = Query(default=None),
    action: Optional[str] = Query(default=None),
    date_from: Optional[str] = Query(default=None, description="ISO date string e.g. 2024-01-01"),
    date_to: Optional[str] = Query(default=None, description="ISO date string e.g. 2024-12-31"),
):
    q = (
        db.query(AuditLog)
        .filter(AuditLog.organization_id == user.organization_id)
    )
    if user_id:
        q = q.filter(AuditLog.user_id == user_id)
    if action:
        q = q.filter(AuditLog.action.ilike(f"%{action}%"))
    if date_from:
        try:
            dt = datetime.fromisoformat(date_from).replace(tzinfo=timezone.utc)
            q = q.filter(AuditLog.created_at >= dt)
        except ValueError:
            pass
    if date_to:
        try:
            dt = datetime.fromisoformat(date_to).replace(tzinfo=timezone.utc)
            q = q.filter(AuditLog.created_at <= dt)
        except ValueError:
            pass
    return q.order_by(AuditLog.created_at.desc()).limit(limit).all()


@router.get("/analytics", response_model=AnalyticsOut)
def analytics(
    user: User = Depends(require_roles("admin", "doctor", "insurance_reviewer")),
    db: Session = Depends(get_db),
):
    org = user.organization_id
    rows = (
        db.query(Case.status, func.count(Case.id))
        .filter(Case.organization_id == org)
        .group_by(Case.status)
        .all()
    )
    return AnalyticsOut(
        cases_by_status={status: count for status, count in rows},
        document_count=db.query(func.count(Document.id)).filter(Document.organization_id == org).scalar() or 0,
        analysis_count=db.query(func.count(Analysis.id)).join(Case).filter(Case.organization_id == org).scalar() or 0,
        report_count=db.query(func.count(Report.id)).join(Case).filter(Case.organization_id == org).scalar() or 0,
        user_count=db.query(func.count(User.id)).filter(User.organization_id == org).scalar() or 0,
    )
