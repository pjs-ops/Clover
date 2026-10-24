import asyncio
import json
import logging
import uuid
from contextlib import asynccontextmanager
from typing import List, Optional
from fastapi import FastAPI, HTTPException, UploadFile, File, Request, Response, Header
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, field_validator

import database as db
import gemini_service as gemini
from document_parser import extract_text_from_file, truncate_document
from session_manager import session_store, SessionConfig
from providers import (
    get_provider,
    DEFAULT_GEMINI_MODEL,
    DEFAULT_OPENAI_MODEL,
    DEFAULT_TEST_TIMEOUT,
    AIProvider,
    redact_secrets,
)

# ── Logging Setup ──────────────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("lumi.api")

# ── App Setup ──────────────────────────────────────────────────────────────────

@asynccontextmanager
async def lifespan(app: FastAPI):
    db.init_db()
    yield

app = FastAPI(title="Lumi API", version="1.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
)


# ── Session & Provider Helpers ─────────────────────────────────────────────────

def resolve_session_id(request: Request, x_session_id: Optional[str] = None) -> str:
    """Resolve session ID from X-Session-ID header, cookie, or generate a new UUID."""
    if x_session_id and x_session_id.strip():
        return x_session_id.strip()
    cookie_sid = request.cookies.get("lumi_session_id")
    if cookie_sid and cookie_sid.strip():
        return cookie_sid.strip()
    return str(uuid.uuid4())


def get_session_provider(session_id: str) -> tuple[Optional[AIProvider], bool]:
    """Return (AIProvider, is_custom_key). If nothing configured, returns (None, False)."""
    sess = session_store.get(session_id)
    if sess and sess.api_key:
        try:
            prov = get_provider(
                provider_name=sess.provider,
                api_key=sess.api_key,
                model=sess.model,
            )
            return prov, True
        except Exception as e:
            logger.warning("Failed to initialize session provider: %s", e)

    # Fallback to backend .env if configured
    if gemini.GEMINI_API_KEY:
        try:
            prov = get_provider(
                provider_name="gemini",
                api_key=gemini.GEMINI_API_KEY,
                model=gemini.GEMINI_MODEL,
                timeout_seconds=gemini.GEMINI_TIMEOUT_SECONDS,
            )
            return prov, False
        except Exception as e:
            logger.warning("Failed to initialize default provider from .env: %s", e)

    return None, False


# ── Models ─────────────────────────────────────────────────────────────────────

class SettingsOut(BaseModel):
    configured: bool
    is_custom_key: bool
    provider: str
    model: str
    masked_key: str


class SettingsUpdate(BaseModel):
    provider: str = "gemini"
    api_key: Optional[str] = None
    model: Optional[str] = None


class SettingsTestRequest(BaseModel):
    provider: str
    api_key: Optional[str] = None
    model: Optional[str] = None
    timeout_seconds: Optional[float] = None


class ChatRequest(BaseModel):
    conversation_id: Optional[str] = None
    message: str
    shortcut: Optional[str] = None
    document_content: Optional[str] = None

    @field_validator("message")
    @classmethod
    def message_not_empty(cls, v: str) -> str:
        if not v or not v.strip():
            raise ValueError("Message cannot be empty")
        return v.strip()

    @field_validator("shortcut")
    @classmethod
    def valid_shortcut(cls, v: Optional[str]) -> Optional[str]:
        if v and v not in ("explain", "summarize", "quiz"):
            raise ValueError(f"Invalid shortcut: {v}")
        return v


class MessageOut(BaseModel):
    id: str
    role: str
    content: str
    timestamp: float
    isError: bool = False


class ConversationOut(BaseModel):
    id: str
    title: str
    created_at: float
    updated_at: float
    messages: List[MessageOut] = []


class ChatResponse(BaseModel):
    conversation_id: str
    message: MessageOut
    title: str


# ── Settings Routes ────────────────────────────────────────────────────────────

@app.get("/api/settings", response_model=SettingsOut)
def get_settings(
    request: Request,
    response: Response,
    x_session_id: Optional[str] = Header(None),
):
    sid = resolve_session_id(request, x_session_id)
    response.set_cookie("lumi_session_id", sid, httponly=True, samesite="lax")
    sess = session_store.get(sid)

    if sess and sess.api_key:
        return SettingsOut(
            configured=True,
            is_custom_key=True,
            provider=sess.provider,
            model=sess.model or (DEFAULT_GEMINI_MODEL if sess.provider == "gemini" else DEFAULT_OPENAI_MODEL),
            masked_key=sess.mask_key(),
        )

    if gemini.GEMINI_API_KEY:
        masked = f"••••••••{gemini.GEMINI_API_KEY[-4:]}" if len(gemini.GEMINI_API_KEY) > 8 else "••••••••"
        return SettingsOut(
            configured=True,
            is_custom_key=False,
            provider="gemini",
            model=gemini.GEMINI_MODEL,
            masked_key=masked,
        )

    return SettingsOut(
        configured=False,
        is_custom_key=False,
        provider="gemini",
        model=DEFAULT_GEMINI_MODEL,
        masked_key="",
    )


@app.post("/api/settings", response_model=SettingsOut)
def update_settings(
    req: SettingsUpdate,
    request: Request,
    response: Response,
    x_session_id: Optional[str] = Header(None),
):
    sid = resolve_session_id(request, x_session_id)
    response.set_cookie("lumi_session_id", sid, httponly=True, samesite="lax")

    cleaned_key = req.api_key.strip() if req.api_key else None
    sess = session_store.set(sid, req.provider, cleaned_key, req.model)

    return SettingsOut(
        configured=bool(sess.api_key or gemini.GEMINI_API_KEY),
        is_custom_key=bool(sess.api_key),
        provider=sess.provider,
        model=sess.model or (DEFAULT_GEMINI_MODEL if sess.provider == "gemini" else DEFAULT_OPENAI_MODEL),
        masked_key=sess.mask_key() if sess.api_key else (
            f"••••••••{gemini.GEMINI_API_KEY[-4:]}" if gemini.GEMINI_API_KEY else ""
        ),
    )


@app.delete("/api/settings")
def disconnect_settings(
    request: Request,
    x_session_id: Optional[str] = Header(None),
):
    sid = resolve_session_id(request, x_session_id)
    session_store.delete(sid)
    logger.info("Session settings disconnected for sid=%s", sid[:8])
    return {"status": "disconnected"}


@app.post("/api/settings/test")
async def test_settings_connection(
    req: SettingsTestRequest,
    request: Request,
    x_session_id: Optional[str] = Header(None),
):
    sid = resolve_session_id(request, x_session_id)
    sess = session_store.get(sid)

    # Priority: explicitly provided in test request -> session key -> default env key
    key_to_test = (
        req.api_key.strip() if req.api_key
        else (sess.api_key if sess and sess.api_key
        else (gemini.GEMINI_API_KEY if req.provider == "gemini" else None))
    )

    if not key_to_test:
        raise HTTPException(status_code=400, detail="No API key provided to test. Please enter a key.")

    test_timeout = req.timeout_seconds or DEFAULT_TEST_TIMEOUT

    try:
        prov = get_provider(
            provider_name=req.provider,
            api_key=key_to_test,
            model=req.model,
            timeout_seconds=test_timeout,
        )
        is_valid, err = await prov.validate_credentials(timeout_seconds=test_timeout)
        if not is_valid:
            safe_detail = redact_secrets(err or "Connection test failed.", key_to_test)
            raise HTTPException(status_code=400, detail=safe_detail)
        return {
            "status": "ok",
            "message": f"Successfully connected to {req.provider.capitalize()}! Model '{prov.model}' is ready.",
            "model": prov.model,
        }
    except HTTPException:
        raise
    except Exception as e:
        safe_msg = redact_secrets(str(e), key_to_test)
        logger.warning("Connection test failed: %s", safe_msg)
        raise HTTPException(status_code=400, detail=f"Connection failed: {safe_msg[:140]}")


# ── Chat Routes ────────────────────────────────────────────────────────────────

@app.get("/api/health")
def health():
    return {
        "status": "ok",
        "model": gemini.GEMINI_MODEL,
        "timeout": gemini.GEMINI_TIMEOUT_SECONDS,
    }


@app.post("/api/chat/stream")
async def chat_stream(
    req: ChatRequest,
    request: Request,
    x_session_id: Optional[str] = Header(None),
):
    sid = resolve_session_id(request, x_session_id)
    provider, _ = get_session_provider(sid)

    if not provider:
        raise HTTPException(
            status_code=401,
            detail="No API key configured. Please connect your Gemini or OpenAI API key in Settings.",
        )

    # Get or create conversation
    is_new = not req.conversation_id
    conv_id = req.conversation_id or db.create_conversation()

    if not is_new:
        conv = db.get_conversation(conv_id)
        if not conv:
            raise HTTPException(status_code=404, detail="Conversation not found")

    history = db.get_messages(conv_id)

    # Prevent duplicate user messages if retrying a failed attempt
    if history and history[-1]["role"] == "user" and history[-1]["content"] == req.message:
        chat_history = history[:-1]
    else:
        db.add_message(conv_id, "user", req.message)
        chat_history = history

    doc_content = truncate_document(req.document_content) if req.document_content else None

    logger.info(
        "Chat stream request received: conv_id=%s, msg_len=%d, shortcut=%s, provider=%s, model=%s",
        conv_id,
        len(req.message),
        req.shortcut,
        type(provider).__name__,
        provider.model,
    )

    async def event_generator():
        conv_title = "Chat" if not is_new else "New Chat"

        # Emit start event
        start_payload = json.dumps({"conversation_id": conv_id, "title": conv_title})
        yield f"event: start\ndata: {start_payload}\n\n"

        accumulated = []
        try:
            async for chunk in provider.stream_chat(
                history=chat_history,
                new_message=req.message,
                shortcut=req.shortcut,
                document_content=doc_content,
            ):
                accumulated.append(chunk)
                yield f"event: chunk\ndata: {json.dumps({'text': chunk})}\n\n"

            full_reply = "".join(accumulated)
            assistant_msg = db.add_message(conv_id, "assistant", full_reply)

            # Generate title if new conversation
            final_title = conv_title
            if is_new:
                try:
                    final_title = await provider.generate_title(req.message)
                    db.update_conversation_title(conv_id, final_title)
                except Exception:
                    final_title = req.message[:40]
            else:
                conv_data = db.get_conversation(conv_id)
                final_title = conv_data["title"] if conv_data else "Chat"

            done_payload = json.dumps({
                "conversation_id": conv_id,
                "message": assistant_msg,
                "title": final_title,
            })
            yield f"event: done\ndata: {done_payload}\n\n"

        except (TimeoutError, asyncio.TimeoutError):
            logger.warning("Chat stream timed out for conv_id=%s", conv_id)
            err_msg = "Lumi timed out waiting for a response. Please try again."
            yield f"event: error\ndata: {json.dumps({'detail': err_msg, 'retryable': True})}\n\n"
        except Exception as e:
            code = getattr(e, "code", None)
            err_str = str(e).lower()
            logger.error("Chat stream failed for conv_id=%s: %s (code=%s)", conv_id, type(e).__name__, code)

            if code == 401 or "api_key" in err_str or "unauthenticated" in err_str:
                err_msg = "Invalid API key. Check your API key in Settings."
            elif code == 429 or "quota" in err_str or "rate" in err_str or "resource_exhausted" in err_str:
                err_msg = "Lumi is receiving too many requests right now or quota was exceeded. Please wait a moment."
            elif code == 503 or "overloaded" in err_str or "unavailable" in err_str:
                err_msg = "The model is temporarily unavailable or overloaded. Please try again."
            elif code == 504 or "timeout" in err_str or "deadline" in err_str:
                err_msg = "Lumi timed out waiting for a response. Please try again."
            else:
                err_msg = "Lumi encountered an issue while generating a response. Please try again."

            yield f"event: error\ndata: {json.dumps({'detail': err_msg, 'retryable': True})}\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


@app.post("/api/chat", response_model=ChatResponse)
async def chat(
    req: ChatRequest,
    request: Request,
    x_session_id: Optional[str] = Header(None),
):
    sid = resolve_session_id(request, x_session_id)
    provider, is_custom = get_session_provider(sid)

    # Validate API key early
    if not provider and not gemini.GEMINI_API_KEY:

        logger.warning("Chat request rejected: no API key configured")
        raise HTTPException(
            status_code=401,
            detail="GEMINI_API_KEY is not configured. Add it in Settings or backend/.env",
        )

    # Get or create conversation
    is_new = not req.conversation_id
    conv_id = req.conversation_id or db.create_conversation()

    if not is_new:
        conv = db.get_conversation(conv_id)
        if not conv:
            logger.warning("Conversation not found: %s", conv_id)
            raise HTTPException(status_code=404, detail="Conversation not found")

    # Load history
    history = db.get_messages(conv_id)

    # Prevent duplicate user messages if retrying a failed attempt
    if history and history[-1]["role"] == "user" and history[-1]["content"] == req.message:
        chat_history = history[:-1]
    else:
        db.add_message(conv_id, "user", req.message)
        chat_history = history

    # Prepare document content
    doc_content = truncate_document(req.document_content) if req.document_content else None

    logger.info(
        "Chat request received: conv_id=%s, msg_len=%d, shortcut=%s, has_doc=%s, history_count=%d",
        conv_id,
        len(req.message),
        req.shortcut,
        bool(doc_content),
        len(chat_history),
    )

    # Call provider or gemini_service
    try:
        if is_custom and provider:
            reply = await provider.chat(
                history=chat_history,
                new_message=req.message,
                shortcut=req.shortcut,
                document_content=doc_content,
            )
        else:
            reply = await gemini.chat_with_gemini(
                history=chat_history,
                new_message=req.message,
                shortcut=req.shortcut,
                document_content=doc_content,
            )
    except (TimeoutError, asyncio.TimeoutError) as e:
        logger.warning("Chat request timed out for conv_id=%s: %s", conv_id, e)
        raise HTTPException(
            status_code=504,
            detail="Lumi timed out waiting for a response. Please try again.",
        )
    except ValueError as e:
        logger.warning("Validation/config error for conv_id=%s: %s", conv_id, e)
        raise HTTPException(status_code=401, detail=str(e))
    except Exception as e:
        code = getattr(e, "code", None)
        err_str = str(e).lower()
        logger.error("Chat request failed for conv_id=%s: %s (code=%s)", conv_id, type(e).__name__, code)

        if code == 401 or "api_key" in err_str or "unauthenticated" in err_str:
            raise HTTPException(status_code=401, detail="Invalid GEMINI_API_KEY. Check backend/.env.")
        if code == 429 or "quota" in err_str or "rate" in err_str or "resource_exhausted" in err_str:
            raise HTTPException(status_code=429, detail="Lumi is receiving too many requests right now. Please wait a moment and try again.")
        if code == 503 or "overloaded" in err_str or "unavailable" in err_str:
            raise HTTPException(status_code=503, detail="Gemini service is temporarily unavailable. Please try again.")
        if code == 504 or "timeout" in err_str or "deadline" in err_str:
            raise HTTPException(status_code=504, detail="Lumi timed out waiting for a response. Please try again.")
        raise HTTPException(status_code=502, detail="Lumi encountered a temporary issue connecting to Gemini. Please try again.")

    # Save assistant message
    assistant_msg = db.add_message(conv_id, "assistant", reply)
    logger.info("Chat response delivered successfully for conv_id=%s", conv_id)

    # Generate title for new conversations
    title = "New Chat"
    if is_new:
        if is_custom and provider:
            title = await provider.generate_title(req.message)
        else:
            title = await asyncio.get_event_loop().run_in_executor(
                None, gemini.generate_title, req.message
            )
        db.update_conversation_title(conv_id, title)
    else:
        conv_data = db.get_conversation(conv_id)
        title = conv_data["title"] if conv_data else "Chat"


    return ChatResponse(
        conversation_id=conv_id,
        message=MessageOut(**assistant_msg),
        title=title,
    )



@app.get("/api/conversations", response_model=List[ConversationOut])
def list_conversations():
    convs = db.get_conversations()
    return [
        ConversationOut(
            id=c["id"],
            title=c["title"],
            created_at=c["created_at"],
            updated_at=c["updated_at"],
        )
        for c in convs
    ]


@app.get("/api/conversations/{conv_id}", response_model=ConversationOut)
def get_conversation(conv_id: str):
    conv = db.get_conversation(conv_id)
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")
    messages = db.get_messages(conv_id)
    return ConversationOut(
        id=conv["id"],
        title=conv["title"],
        created_at=conv["created_at"],
        updated_at=conv["updated_at"],
        messages=[MessageOut(**m) for m in messages],
    )


@app.delete("/api/conversations/{conv_id}")
def delete_conversation(conv_id: str):
    conv = db.get_conversation(conv_id)
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")
    db.delete_conversation(conv_id)
    return {"deleted": conv_id}


@app.post("/api/upload")
async def upload_document(file: UploadFile = File(...)):
    if not file.filename:
        raise HTTPException(status_code=400, detail="No filename provided")

    allowed = {".pdf", ".txt", ".md"}
    from pathlib import Path
    suffix = Path(file.filename).suffix.lower()
    if suffix not in allowed:
        raise HTTPException(status_code=400, detail=f"Unsupported file type '{suffix}'. Use PDF, TXT, or MD.")

    content = await file.read()
    if len(content) > 10 * 1024 * 1024:  # 10MB limit
        raise HTTPException(status_code=413, detail="File too large. Max 10MB.")

    try:
        text = extract_text_from_file(file.filename, content)
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))

    return {
        "content": truncate_document(text),
        "filename": file.filename,
        "char_count": len(text),
    }
