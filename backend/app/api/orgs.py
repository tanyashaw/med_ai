from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import ROLES, get_current_user, hash_password, require_roles
from app.models import Organization, User, new_id
from app.schemas import OrganizationOut, OrganizationUpdate, UserCreate, UserOut, UserUpdate
from app.services.audit import write_audit

org_router = APIRouter(prefix="/orgs", tags=["organizations"])
users_router = APIRouter(prefix="/users", tags=["users"])


@org_router.get("/me", response_model=OrganizationOut)
def get_org(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    org = db.get(Organization, user.organization_id)
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")
    return org


@org_router.patch("/me", response_model=OrganizationOut)
def update_org(
    payload: OrganizationUpdate,
    user: User = Depends(require_roles("admin")),
    db: Session = Depends(get_db),
):
    org = db.get(Organization, user.organization_id)
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")
    org.name = payload.name
    write_audit(
        db,
        organization_id=user.organization_id,
        user_id=user.id,
        action="update_organization",
        resource_type="organization",
        resource_id=org.id,
        details={"name": payload.name},
    )
    db.commit()
    db.refresh(org)
    return org


@users_router.get("", response_model=list[UserOut])
def list_users(user: User = Depends(require_roles("admin")), db: Session = Depends(get_db)):
    return (
        db.query(User)
        .filter(User.organization_id == user.organization_id)
        .order_by(User.created_at.desc())
        .all()
    )


@users_router.post("", response_model=UserOut)
def create_user(
    payload: UserCreate,
    user: User = Depends(require_roles("admin")),
    db: Session = Depends(get_db),
):
    if payload.role not in ROLES:
        raise HTTPException(status_code=400, detail="Invalid role")
    if db.query(User).filter(User.email == payload.email).first():
        raise HTTPException(status_code=400, detail="Email already exists")
    created = User(
        id=new_id(),
        organization_id=user.organization_id,
        email=payload.email,
        full_name=payload.full_name,
        role=payload.role,
        hashed_password=hash_password(payload.password),
    )
    db.add(created)
    write_audit(
        db,
        organization_id=user.organization_id,
        user_id=user.id,
        action="create_user",
        resource_type="user",
        resource_id=created.id,
        details={"email": payload.email, "role": payload.role},
    )
    db.commit()
    db.refresh(created)
    return created


@users_router.patch("/{user_id}", response_model=UserOut)
def update_user(
    user_id: str,
    payload: UserUpdate,
    user: User = Depends(require_roles("admin")),
    db: Session = Depends(get_db),
):
    target = db.get(User, user_id)
    if not target or target.organization_id != user.organization_id:
        raise HTTPException(status_code=404, detail="User not found")
    if payload.role and payload.role not in ROLES:
        raise HTTPException(status_code=400, detail="Invalid role")
    if payload.full_name is not None:
        target.full_name = payload.full_name
    if payload.role is not None:
        target.role = payload.role
    if payload.is_active is not None:
        target.is_active = payload.is_active
    if payload.password:
        target.hashed_password = hash_password(payload.password)
    write_audit(
        db,
        organization_id=user.organization_id,
        user_id=user.id,
        action="update_user",
        resource_type="user",
        resource_id=target.id,
        details=payload.model_dump(exclude_unset=True, exclude={"password"}),
    )
    db.commit()
    db.refresh(target)
    return target
