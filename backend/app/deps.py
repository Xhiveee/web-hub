from datetime import datetime, timedelta, timezone

from fastapi import Depends, HTTPException, Request
from sqlalchemy.orm import Session

from app.auth import user_from_token
from app.db import get_db
from app.models import User


def current_user(request: Request, db: Session = Depends(get_db)) -> User:
    token = request.headers.get("Authorization", "").removeprefix("Bearer ")
    if not token:
        token = request.query_params.get("token", "")
    user = user_from_token(token) if token else None
    if not user:
        raise HTTPException(401, "unauthorized")
    return user


def parse_expires(value: str | None) -> datetime | None:
    if not value:
        return None
    value = value.strip()
    try:
        if value.endswith("d"):
            return datetime.now(timezone.utc) + timedelta(days=float(value[:-1]))
        if value.endswith("h"):
            return datetime.now(timezone.utc) + timedelta(hours=float(value[:-1]))
        if value.endswith("m"):
            return datetime.now(timezone.utc) + timedelta(minutes=float(value[:-1]))
        return datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError:
        raise HTTPException(400, "bad expires value, use like 7d, 12h or 30m")
