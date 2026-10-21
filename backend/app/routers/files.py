import os
import uuid

from fastapi import APIRouter, Depends, HTTPException, UploadFile
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.config import settings
from app.db import get_db
from app.deps import current_user, parse_expires
from app.models import FileItem, Share, User
from app.services.misc import notify_share
import secrets
from datetime import datetime, timezone

r = APIRouter(prefix="/api/files", tags=["files"])

PUBLIC = APIRouter(prefix="/api/share", tags=["share"])


def owned_file(db: Session, user: User, file_id: int) -> FileItem:
    f = db.query(FileItem).filter_by(id=file_id, user_id=user.id).first()
    if not f:
        raise HTTPException(404, "file not found")
    return f


@r.get("")
def list_files(user: User = Depends(current_user), db: Session = Depends(get_db)):
    files = db.query(FileItem).filter_by(user_id=user.id).order_by(FileItem.created_at.desc()).all()
    return [
        {
            "id": f.id,
            "name": f.name,
            "size": f.size,
            "mime": f.mime,
            "created_at": f.created_at.isoformat(),
        }
        for f in files
    ]


@r.post("/upload")
def upload(file: UploadFile, user: User = Depends(current_user), db: Session = Depends(get_db)):
    ext = ""
    safe = "".join(c for c in file.filename if c.isalnum() or c in " ._-").strip() or "file"
    d = os.path.join(settings.data_dir, "uploads", str(user.id))
    os.makedirs(d, exist_ok=True)
    stored = uuid.uuid4().hex[:12] + "_" + safe
    path = os.path.join(d, stored)
    size = 0
    with open(path, "wb") as out:
        while chunk := file.file.read(1024 * 512):
            size += len(chunk)
            out.write(chunk)
    ai_file = FileItem(
        user_id=user.id,
        name=safe,
        size=size,
        mime=file.content_type or "application/octet-stream",
        path=path,
    )
    db.add(ai_file)
    db.commit()
    db.refresh(ai_file)
    return {"id": ai_file.id, "name": ai_file.name, "size": ai_file.size}


@r.get("/{file_id}/download")
def download(file_id: int, user: User = Depends(current_user), db: Session = Depends(get_db)):
    f = owned_file(db, user, file_id)
    from fastapi.responses import FileResponse

    return FileResponse(f.path, filename=f.name)


@r.get("/{file_id}/raw")
def raw(file_id: int, user: User = Depends(current_user), db: Session = Depends(get_db)):
    f = owned_file(db, user, file_id)
    from fastapi.responses import FileResponse

    return FileResponse(f.path, media_type=f.mime)


@r.delete("/{file_id}")
def delete(file_id: int, user: User = Depends(current_user), db: Session = Depends(get_db)):
    f = owned_file(db, user, file_id)
    db.query(Share).filter_by(file_id=f.id).delete()
    db.delete(f)
    db.commit()
    try:
        os.remove(f.path)
    except OSError:
        pass
    return {"ok": True}


class ShareIn(BaseModel):
    expires: str | None = None
    max_downloads: int | None = None


@r.post("/{file_id}/share")
def create_share(file_id: int, body: ShareIn, user: User = Depends(current_user), db: Session = Depends(get_db)):
    f = owned_file(db, user, file_id)
    expires = parse_expires(body.expires)
    s = Share(
        token=secrets.token_urlsafe(16),
        file_id=f.id,
        user_id=user.id,
        expires_at=expires,
        max_downloads=body.max_downloads,
    )
    db.add(s)
    db.commit()
    db.refresh(s)
    notify_share(user, s, f)
    return {"token": s.token, "expires_at": expires.isoformat() if expires else None}


@r.get("/{file_id}/shares")
def list_shares(file_id: int, user: User = Depends(current_user), db: Session = Depends(get_db)):
    owned_file(db, user, file_id)
    shares = (
        db.query(Share)
        .filter_by(file_id=file_id, user_id=user.id)
        .order_by(Share.created_at.desc())
        .all()
    )
    return [
        {
            "id": s.id,
            "token": s.token,
            "downloads": s.downloads,
            "max_downloads": s.max_downloads,
            "expires_at": s.expires_at.isoformat() if s.expires_at else None,
        }
        for s in shares
    ]


@PUBLIC.get("/{token}")
def share_info(token: str, db: Session = Depends(get_db)):
    s = db.query(Share).filter_by(token=token).first()
    if not s:
        raise HTTPException(404, "link not found")
    f = db.get(FileItem, s.file_id)
    ready = share_ready(s)
    if not ready:
        raise HTTPException(403, "link expired")
    return {"name": f.name, "size": f.size, "downloads": s.downloads}


def share_ready(s: Share) -> bool:
    if s.expires_at is not None and s.expires_at.replace(tzinfo=timezone.utc) <= datetime.now(timezone.utc):
        return False
    if s.max_downloads is not None and s.downloads >= s.max_downloads:
        return False
    return True


@PUBLIC.get("/{token}/download")
def share_download(token: str, db: Session = Depends(get_db)):
    s = db.query(Share).filter_by(token=token).first()
    if not s:
        raise HTTPException(404, "link not found")
    if not share_ready(s):
        raise HTTPException(403, "link expired")
    f = db.get(FileItem, s.file_id)
    s.downloads += 1
    db.commit()
    from fastapi.responses import FileResponse

    return FileResponse(f.path, filename=f.name)


@PUBLIC.delete("/{token}")
def revoke(token: str, user: User = Depends(current_user), db: Session = Depends(get_db)):
    s = db.query(Share).filter_by(token=token, user_id=user.id).first()
    if not s:
        raise HTTPException(404, "not found")
    db.delete(s)
    db.commit()
    return {"ok": True}
