from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import create_access_token, get_current_user, verify_password
from app.models import User
from app.schemas import TokenResponse, UserOut
from app.services.audit import write_audit

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/login", response_model=TokenResponse)
def login(form: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == form.username).first()
    if not user or not verify_password(form.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Incorrect email or password")
    write_audit(
        db,
        organization_id=user.organization_id,
        user_id=user.id,
        action="login",
        resource_type="user",
        resource_id=user.id,
    )
    db.commit()
    token = create_access_token(user.id, {"role": user.role, "org": user.organization_id})
    return TokenResponse(access_token=token)


@router.get("/me", response_model=UserOut)
def me(user: User = Depends(get_current_user)):
    return user
