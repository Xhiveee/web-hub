import json
import os

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.config import settings
from app.db import get_db
from app.deps import current_user
from app.models import Conversation, FileItem, Message, User
from app.services import misc, tools

r = APIRouter(prefix="/api/chat", tags=["chat"])


class ConvIn(BaseModel):
    title: str = "Chat"


class MsgIn(BaseModel):
    content: str


@r.get("/conversations")
def conversations(user: User = Depends(current_user), db: Session = Depends(get_db)):
    convs = (
        db.query(Conversation)
        .filter_by(user_id=user.id)
        .order_by(Conversation.created_at.desc())
        .all()
    )
    return [{"id": c.id, "title": c.title, "created_at": c.created_at.isoformat()} for c in convs]


@r.post("/conversations")
def new_conversation(body: ConvIn, user: User = Depends(current_user), db: Session = Depends(get_db)):
    c = Conversation(user_id=user.id, title=body.title or "Chat")
    db.add(c)
    db.commit()
    db.refresh(c)
    return {"id": c.id, "title": c.title}


@r.delete("/conversations/{conv_id}")
def delete_conversation(conv_id: int, user: User = Depends(current_user), db: Session = Depends(get_db)):
    c = _own_conv(db, user, conv_id)
    db.query(Message).filter_by(conv_id=c.id).delete()
    db.delete(c)
    db.commit()
    return {"ok": True}


@r.get("/conversations/{conv_id}/messages")
def messages(conv_id: int, user: User = Depends(current_user), db: Session = Depends(get_db)):
    c = _own_conv(db, user, conv_id)
    msgs = db.query(Message).filter_by(conv_id=c.id).order_by(Message.created_at).all()
    return [{"id": m.id, "role": m.role, "content": m.content, "tool_name": m.tool_name} for m in msgs]


@r.post("/{conv_id}/messages")
def send(conv_id: int, body: MsgIn, user: User = Depends(current_user), db: Session = Depends(get_db)):
    if not settings.ai_api_key:
        raise HTTPException(400, "AI key not configured on server")
    c = _own_conv(db, user, conv_id)
    db.add(Message(conv_id=c.id, role="user", content=body.content))
    db.commit()

    rows = db.query(Message).filter_by(conv_id=c.id).order_by(Message.created_at).all()
    api_messages = [{"role": "system", "content": misc.SYSTEM_PROMPT}]
    for m in rows:
        api_messages.append({"role": m.role, "content": m.content})

    final = ""
    for _ in range(5):
        choice = _completion_body(api_messages)
        calls = choice.get("tool_calls") or []
        if not calls:
            final = choice.get("content") or ""
            db.add(Message(conv_id=c.id, role="assistant", content=final))
            db.commit()
            break
        api_messages.append(
            {"role": "assistant", "content": choice.get("content") or "", "tool_calls": calls}
        )
        for call in calls:
            fn_name = call["function"]["name"]
            try:
                args = json.loads(call["function"].get("arguments") or "{}")
            except json.JSONDecodeError:
                args = {}
            result = _run_tool(fn_name, args, user.id)
            api_messages.append(
                {"role": "tool", "tool_call_id": call["id"], "content": json.dumps(result, ensure_ascii=False)}
            )
            db.add(Message(conv_id=c.id, role="tool", tool_name=fn_name, content=str(result)[:8000]))
            db.commit()
    if not final:
        final = "(no response)"
        db.add(Message(conv_id=c.id, role="assistant", content=final))
        db.commit()

    files = (
        db.query(FileItem)
        .filter(
            FileItem.user_id == user.id,
            FileItem.mime.in_(
                [
                    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
                ]
            ),
        )
        .order_by(FileItem.created_at.desc())
        .limit(5)
        .all()
    )
    return {"content": final, "files": [{"id": f.id, "name": f.name} for f in files]}


def _own_conv(db: Session, user: User, conv_id: int) -> Conversation:
    c = db.query(Conversation).filter_by(id=conv_id, user_id=user.id).first()
    if not c:
        raise HTTPException(404, "conversation not found")
    return c


def _completion_body(messages: list) -> dict:
    resp = misc.get_client().post(
        "/chat/completions",
        headers={"Authorization": f"Bearer {settings.ai_api_key}"},
        json={"model": settings.ai_model, "messages": messages, "tools": misc.TOOLS, "stream": False},
    )
    if resp.status_code >= 400:
        raise HTTPException(resp.status_code, resp.text[:300])
    return resp.json()["choices"][0]["message"]


def _run_tool(name: str, args: dict, user_id: int) -> dict:
    try:
        if name == "create_document":
            name_out, path = tools.save_generated_document(user_id, args["title"], args.get("sections", []))
        elif name == "create_presentation":
            name_out, path = tools.save_generated_presentation(user_id, args["title"], args.get("slides", []))
        elif name == "read_link":
            return {"text": tools.read_link(args["url"])}
        else:
            return {"error": f"unknown tool {name}"}
        _register_file(user_id, name_out, path)
        return {"ok": True, "file_name": name_out}
    except Exception as e:
        return {"error": str(e)[:300]}


def _register_file(user_id: int, name: str, path: str):
    db = get_db_session()
    try:
        db.add(
            FileItem(
                user_id=user_id,
                name=name,
                size=os.path.getsize(path),
                mime="application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                if name.endswith(".docx")
                else "application/vnd.openxmlformats-officedocument.presentationml.presentation",
                path=path,
            )
        )
        db.commit()
    finally:
        db.close()


def get_db_session():
    from app.db import SessionLocal

    return SessionLocal()
