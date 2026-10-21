from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.db import get_db
from app.deps import current_user
from app.models import Note, Snippet, User, VaultItem
from app.services.misc import decrypt_json, encrypt_json

r = APIRouter(prefix="/api", tags=["vault"])


class VaultIn(BaseModel):
    kind: str
    title: str
    data: dict


@r.get("/vault")
def vault_list(user: User = Depends(current_user), db: Session = Depends(get_db)):
    items = db.query(VaultItem).filter_by(user_id=user.id).order_by(VaultItem.created_at.desc()).all()
    return [
        {"id": i.id, "kind": i.kind, "title": i.title, "data": decrypt_json(i.data_encrypted)}
        for i in items
    ]


@r.post("/vault")
def vault_add(body: VaultIn, user: User = Depends(current_user), db: Session = Depends(get_db)):
    if body.kind not in ("password", "link", "text"):
        raise HTTPException(400, "bad kind")
    i = VaultItem(user_id=user.id, kind=body.kind, title=body.title, data_encrypted=encrypt_json(body.data))
    db.add(i)
    db.commit()
    return {"id": i.id}


@r.patch("/vault/{item_id}")
def vault_edit(item_id: int, body: VaultIn, user: User = Depends(current_user), db: Session = Depends(get_db)):
    i = db.query(VaultItem).filter_by(id=item_id, user_id=user.id).first()
    if not i:
        raise HTTPException(404, "not found")
    i.kind = body.kind
    i.title = body.title
    i.data_encrypted = encrypt_json(body.data)
    db.commit()
    return {"ok": True}


@r.delete("/vault/{item_id}")
def vault_del(item_id: int, user: User = Depends(current_user), db: Session = Depends(get_db)):
    i = db.query(VaultItem).filter_by(id=item_id, user_id=user.id).first()
    if not i:
        raise HTTPException(404, "not found")
    db.delete(i)
    db.commit()
    return {"ok": True}


class NoteIn(BaseModel):
    title: str = ""
    body: str = ""


@r.get("/notes")
def notes_list(user: User = Depends(current_user), db: Session = Depends(get_db)):
    items = db.query(Note).filter_by(user_id=user.id).order_by(Note.updated_at.desc()).all()
    return [{"id": i.id, "title": i.title, "body": i.body, "updated_at": i.updated_at.isoformat()} for i in items]


@r.post("/notes")
def notes_add(body: NoteIn, user: User = Depends(current_user), db: Session = Depends(get_db)):
    n = Note(user_id=user.id, title=body.title, body=body.body)
    db.add(n)
    db.commit()
    return {"id": n.id}


class NoteIn(BaseModel):
    title: str = ""
    body: str = ""


@r.patch("/notes/{note_id}")
def notes_edit(note_id: int, body: NoteIn, user: User = Depends(current_user), db: Session = Depends(get_db)):
    n = db.query(Note).filter_by(id=note_id, user_id=user.id).first()
    if not n:
        raise HTTPException(404, "not found")
    n.title = body.title
    n.body = body.body
    db.commit()
    return {"ok": True}


@r.delete("/notes/{note_id}")
def notes_del(note_id: int, user: User = Depends(current_user), db: Session = Depends(get_db)):
    n = db.query(Note).filter_by(id=note_id, user_id=user.id).first()
    if not n:
        raise HTTPException(404, "not found")
    db.delete(n)
    db.commit()
    return {"ok": True}


class SnippetIn(BaseModel):
    title: str = ""
    lang: str = ""
    code: str = ""


@r.get("/snippets")
def snippets_list(user: User = Depends(current_user), db: Session = Depends(get_db)):
    items = db.query(Snippet).filter_by(user_id=user.id).order_by(Snippet.updated_at.desc()).all()
    return [{"id": i.id, "title": i.title, "lang": i.lang, "code": i.code} for i in items]


@r.post("/snippets")
def snippets_add(body: SnippetIn, user: User = Depends(current_user), db: Session = Depends(get_db)):
    s = Snippet(user_id=user.id, title=body.title, lang=body.lang, code=body.code)
    db.add(s)
    db.commit()
    return {"id": s.id}


@r.patch("/snippets/{sid}")
def snippets_edit(sid: int, body: SnippetIn, user: User = Depends(current_user), db: Session = Depends(get_db)):
    s = db.query(Snippet).filter_by(id=sid, user_id=user.id).first()
    if not s:
        raise HTTPException(404, "not found")
    s.title, s.lang, s.code = body.title, body.lang, body.code
    db.commit()
    return {"ok": True}


@r.delete("/snippets/{sid}")
def snippets_del(sid: int, user: User = Depends(current_user), db: Session = Depends(get_db)):
    s = db.query(Snippet).filter_by(id=sid, user_id=user.id).first()
    if not s:
        raise HTTPException(404, "not found")
    db.delete(s)
    db.commit()
    return {"ok": True}


class ReadIn(BaseModel):
    url: str


@r.post("/read")
def read(body: ReadIn, user: User = Depends(current_user)):
    from app.services import tools

    if not body.url.startswith("http"):
        raise HTTPException(400, "url must start with http")
    try:
        text = tools.read_link(body.url)
    except Exception as e:
        raise HTTPException(502, str(e)[:200])
    return {"text": text}
