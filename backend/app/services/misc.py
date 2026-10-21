import base64
import hashlib
import json

import httpx
from cryptography.fernet import Fernet

from app.config import settings
from app.models import FileItem, Share, User

_client = httpx.Client(base_url=settings.ai_base_url, timeout=300)


def _fernet() -> Fernet:
    key = base64.urlsafe_b64encode(hashlib.sha256(settings.secret.encode()).digest())
    return Fernet(key)


def encrypt_json(data: dict) -> str:
    return _fernet().encrypt(json.dumps(data).encode()).decode()


def decrypt_json(blob: str) -> dict:
    return json.loads(_fernet().decrypt(blob.encode()))


def get_client() -> httpx.Client:
    return _client


TOOLS = [
    {
        "type": "function",
        "function": {
            "name": "create_document",
            "description": "Create a Word document (.docx) and save it to the user's storage.",
            "parameters": {
                "type": "object",
                "properties": {
                    "title": {"type": "string"},
                    "sections": {
                        "type": "array",
                        "items": {
                            "type": "object",
                            "properties": {
                                "heading": {"type": "string"},
                                "text": {"type": "string"},
                            },
                            "required": ["heading", "text"],
                        },
                    },
                },
                "required": ["title", "sections"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "create_presentation",
            "description": "Create a PowerPoint (.pptx) and save it to the user's storage.",
            "parameters": {
                "type": "object",
                "properties": {
                    "title": {"type": "string"},
                    "slides": {
                        "type": "array",
                        "items": {
                            "type": "object",
                            "properties": {
                                "title": {"type": "string"},
                                "bullets": {"type": "array", "items": {"type": "string"}},
                            },
                            "required": ["title", "bullets"],
                        },
                    },
                },
                "required": ["title", "slides"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "read_link",
            "description": "Fetch a webpage by URL and return extracted text.",
            "parameters": {
                "type": "object",
                "properties": {"url": {"type": "string"}},
                "required": ["url"],
            },
        },
    },
]

SYSTEM_PROMPT = """You are a personal assistant inside Web Hub. You can chat normally, but you also have tools:
- create_document(title, sections): create a .docx file. sections is a list of {heading, text}.
- create_presentation(title, slides): create a .pptx file. slides is a list of {title, bullets}.
- read_link(url): fetch a webpage and return its text content. Use it before answering questions about a URL.
When the user asks for a document or presentation, ALWAYS use the matching tool. After creating a file, briefly say it is ready and mention the file name.
Answer in the user's language. Be helpful and concise."""


def notify_share(user: User, share: Share, file: FileItem):
    if not settings.telegram_bot_token or not user.tg_chat_id:
        return
    try:
        httpx.post(
            f"https://api.telegram.org/bot{settings.telegram_bot_token}/sendMessage",
            json={"chat_id": user.tg_chat_id, "text": f"New share link for {file.name}"},
            timeout=10,
        )
    except httpx.HTTPError:
        pass
