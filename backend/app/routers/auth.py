from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.auth import create_token, hash_password, verify_password
from app.db import get_db
from app.deps import current_user
from app.models import User
from app.config import settings

r = APIRouter(prefix="/api/auth")


class RegisterIn(BaseModel):
    email: str
    password: str
    invite_code: str = ""


class LoginIn(BaseModel):
    email: str
    password: str


class ProfileIn(BaseModel):
    tg_chat_id: str | None = None


@r.post("/register")
def register(body: RegisterIn, db: Session = Depends(get_db)):
    if settings.invite_code and body.invite_code != settings.invite_code:
        raise HTTPException(403, "bad invite code")
    if len(body.password) < 6 or "@" not in body.email:
        raise HTTPException(400, "bad email or password too short")
    if db.query(User).filter_by(email=body.email).first():
        raise HTTPException(409, "email taken")
    user = User(email=body.email, password_hash=hash_password(body.password))
    if not db.query(User).first():
        user.is_admin = True
    db.add(user)
    db.commit()
    db.refresh(user)
    return {"token": create_token(user.id), "email": user.email}


@r.post("/login")
def login(body: LoginIn, db: Session = Depends(get_db)):
    user = db.query(User).filter_by(email=body.email).first()
    if not user or not verify_password(body.password, user.password_hash):
        raise HTTPException(401, "wrong email or password")
    return {"token": create_token(user.id), "email": user.email}


@r.get("/me")
def me(user: User = Depends(current_user)):
    return {
        "id": user.id,
        "email": user.email,
        "tg_chat_id": user.tg_chat_id,
        "ai_enabled": bool(settings.ai_api_key),
    }


@r.patch("/me")
def update_me(body: ProfileIn, user: User = Depends(current_user), db: Session = Depends(get_db)):
    if body.tg_chat_id is not None:
        user.tg_chat_id = body.tg_chat_id or None
    db.commit()
    return {"ok": True}
