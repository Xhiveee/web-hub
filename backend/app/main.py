from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.db import Base, engine
from app.routers import auth, chat, content, files

Base.metadata.create_all(bind=engine)

app = FastAPI(title="Web Hub")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.r)
app.include_router(files.r)
app.include_router(files.PUBLIC)
app.include_router(chat.r)
app.include_router(content.r)


@app.get("/api/health")
def health():
    return {"ok": True}
