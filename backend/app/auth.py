import datetime as dt
import hashlib
import os

import jwt

from app.config import settings
from app.models import User
from app.db import SessionLocal


def hash_password(password: str) -> str:
    salt = os.urandom(16)
    dk = hashlib.pbkdf2_hmac("sha256", password.encode(), salt, 200_000)
    return salt.hex() + "$" + dk.hex()


def verify_password(password: str, stored: str) -> bool:
    try:
        salt_hex, dk_hex = stored.split("$")
        dk = hashlib.pbkdf2_hmac("sha256", password.encode(), bytes.fromhex(salt_hex), 200_000)
        return dk.hex() == dk_hex
    except ValueError:
        return False


def create_token(user_id: int) -> str:
    payload = {"sub": str(user_id), "exp": dt.datetime.now(dt.timezone.utc) + dt.timedelta(days=settings.jwt_exp_days)}
    return jwt.encode(payload, settings.secret, algorithm="HS256")


def decode_token(token: str) -> int | None:
    try:
        payload = jwt.decode(token, settings.secret, algorithms=["HS256"])
        return int(payload["sub"])
    except (jwt.PyJWTError, ValueError):
        return None


def user_from_token(token: str):
    uid = decode_token(token)
    if uid is None:
        return None
    db = SessionLocal()
    try:
        return db.get(User, uid)
    finally:
        db.close()
