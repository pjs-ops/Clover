"""
Tests for Lumi backend.
Run with: pytest backend/tests/ -v
"""
from __future__ import annotations

import os
import sys
import pytest
import sqlite3
from pathlib import Path
from unittest.mock import patch, MagicMock, AsyncMock

# Add backend to path
sys.path.insert(0, str(Path(__file__).parent.parent))

# Use in-memory DB for tests
os.environ["LUMI_TEST"] = "1"

import database as db_module
from database import init_db, create_conversation, add_message, get_messages, get_conversations, delete_conversation

# ── Fixtures ───────────────────────────────────────────────────────────────────

@pytest.fixture(autouse=True)
def temp_db(tmp_path, monkeypatch):
    """Use a temporary DB for each test."""
    test_db = tmp_path / "test.db"
    monkeypatch.setattr(db_module, "DB_PATH", test_db)
    init_db()
    yield test_db


@pytest.fixture
def client(temp_db):
    from fastapi.testclient import TestClient
    from main import app
    return TestClient(app)


# ── Database Tests ─────────────────────────────────────────────────────────────

def test_create_conversation():
    conv_id = create_conversation("Test Chat")
    convs = get_conversations()
    assert any(c["id"] == conv_id for c in convs)


def test_add_and_get_messages():
    conv_id = create_conversation()
    msg = add_message(conv_id, "user", "Hello!")
    assert msg["role"] == "user"
    assert msg["content"] == "Hello!"

    msgs = get_messages(conv_id)
    assert len(msgs) == 1
    assert msgs[0]["content"] == "Hello!"


def test_multi_turn_messages():
    conv_id = create_conversation()
    add_message(conv_id, "user", "Hi")
    add_message(conv_id, "assistant", "Hello! How can I help?")
    add_message(conv_id, "user", "What is 2+2?")
    add_message(conv_id, "assistant", "4")

    msgs = get_messages(conv_id)
    assert len(msgs) == 4
    assert msgs[0]["role"] == "user"
    assert msgs[1]["role"] == "assistant"
    assert msgs[3]["content"] == "4"


def test_delete_conversation():
    conv_id = create_conversation("To Delete")
    delete_conversation(conv_id)
    convs = get_conversations()
    assert not any(c["id"] == conv_id for c in convs)


def test_messages_deleted_with_conversation():
    conv_id = create_conversation()
    add_message(conv_id, "user", "test")
    delete_conversation(conv_id)
    msgs = get_messages(conv_id)
    assert len(msgs) == 0


# ── API Tests ──────────────────────────────────────────────────────────────────

def test_health_endpoint(client):
    res = client.get("/api/health")
    assert res.status_code == 200
    assert res.json()["status"] == "ok"


def test_list_conversations_empty(client):
    res = client.get("/api/conversations")
    assert res.status_code == 200
    assert res.json() == []


def test_chat_no_api_key(client, monkeypatch):
    import gemini_service
    monkeypatch.setattr(gemini_service, "GEMINI_API_KEY", "")
    res = client.post("/api/chat", json={"message": "Hello"})
    assert res.status_code == 401


def test_chat_empty_message(client):
    res = client.post("/api/chat", json={"message": ""})
    assert res.status_code == 422


def test_chat_invalid_shortcut(client):
    res = client.post("/api/chat", json={"message": "Hi", "shortcut": "invalid"})
    assert res.status_code == 422


@patch("gemini_service.chat_with_gemini", new_callable=AsyncMock)
@patch("gemini_service.generate_title", return_value="Test Title")
def test_chat_creates_conversation(mock_title, mock_chat, client, monkeypatch):
    import gemini_service
    monkeypatch.setattr(gemini_service, "GEMINI_API_KEY", "fake-key")
    mock_chat.return_value = "Hello! I'm Lumi."

    res = client.post("/api/chat", json={"message": "Hello!"})
    assert res.status_code == 200
    data = res.json()
    assert "conversation_id" in data
    assert data["message"]["role"] == "assistant"
    assert data["message"]["content"] == "Hello! I'm Lumi."


@patch("gemini_service.chat_with_gemini", new_callable=AsyncMock)
@patch("gemini_service.generate_title", return_value="Multi Turn Test")
def test_multi_turn_chat(mock_title, mock_chat, client, monkeypatch):
    import gemini_service
    monkeypatch.setattr(gemini_service, "GEMINI_API_KEY", "fake-key")
    mock_chat.return_value = "Response 1"

    # First message
    res1 = client.post("/api/chat", json={"message": "First message"})
    assert res1.status_code == 200
    conv_id = res1.json()["conversation_id"]

    mock_chat.return_value = "Response 2"
    # Second message in same conversation
    res2 = client.post("/api/chat", json={
        "conversation_id": conv_id,
        "message": "Second message"
    })
    assert res2.status_code == 200
    assert res2.json()["conversation_id"] == conv_id

    # Verify both messages are stored
    conv_res = client.get(f"/api/conversations/{conv_id}")
    msgs = conv_res.json()["messages"]
    user_msgs = [m for m in msgs if m["role"] == "user"]
    assert len(user_msgs) == 2


@patch("gemini_service.chat_with_gemini", new_callable=AsyncMock)
@patch("gemini_service.generate_title", return_value="Persistence Test")
def test_chat_persistence(mock_title, mock_chat, client, monkeypatch):
    import gemini_service
    monkeypatch.setattr(gemini_service, "GEMINI_API_KEY", "fake-key")
    mock_chat.return_value = "I remember!"

    res = client.post("/api/chat", json={"message": "Remember this"})
    conv_id = res.json()["conversation_id"]

    # Fetch conversation
    conv_res = client.get(f"/api/conversations/{conv_id}")
    assert conv_res.status_code == 200
    assert conv_res.json()["id"] == conv_id


@patch("gemini_service.chat_with_gemini", new_callable=AsyncMock)
def test_api_failure_does_not_erase_messages(mock_chat, client, monkeypatch):
    import gemini_service
    monkeypatch.setattr(gemini_service, "GEMINI_API_KEY", "fake-key")

    # Successful first message
    mock_chat.return_value = "OK"
    with patch("gemini_service.generate_title", return_value="Err Test"):
        res = client.post("/api/chat", json={"message": "First"})
    conv_id = res.json()["conversation_id"]

    # Simulate API error on second message
    mock_chat.side_effect = Exception("Network error")
    res2 = client.post("/api/chat", json={
        "conversation_id": conv_id,
        "message": "Second"
    })
    assert res2.status_code in (502, 504)

    # First message still there
    conv_res = client.get(f"/api/conversations/{conv_id}")
    assert conv_res.status_code == 200


def test_get_nonexistent_conversation(client):
    res = client.get("/api/conversations/nonexistent-id")
    assert res.status_code == 404


def test_delete_conversation_api(client):
    conv_id = create_conversation("Delete Me")
    res = client.delete(f"/api/conversations/{conv_id}")
    assert res.status_code == 200
    assert client.get(f"/api/conversations/{conv_id}").status_code == 404


def test_upload_txt(client):
    txt_content = b"This is a test document."
    res = client.post(
        "/api/upload",
        files={"file": ("test.txt", txt_content, "text/plain")}
    )
    assert res.status_code == 200
    assert "content" in res.json()
    assert res.json()["filename"] == "test.txt"


def test_upload_invalid_type(client):
    res = client.post(
        "/api/upload",
        files={"file": ("test.docx", b"content", "application/octet-stream")}
    )
    assert res.status_code == 400


# ── Input Validation Tests ─────────────────────────────────────────────────────

def test_message_whitespace_only(client):
    res = client.post("/api/chat", json={"message": "   "})
    assert res.status_code == 422


def test_missing_message_field(client):
    res = client.post("/api/chat", json={})
    assert res.status_code == 422


# ── Timeout & Error Handling Tests ─────────────────────────────────────────────

@patch("gemini_service.chat_with_gemini", new_callable=AsyncMock)
def test_chat_timeout_returns_504(mock_chat, client, monkeypatch):
    import gemini_service
    monkeypatch.setattr(gemini_service, "GEMINI_API_KEY", "fake-key")
    mock_chat.side_effect = TimeoutError("Gemini request timed out after 30.0s")

    res = client.post("/api/chat", json={"message": "Will it time out?"})
    assert res.status_code == 504
    assert "timed out" in res.json()["detail"].lower()


@patch("gemini_service.chat_with_gemini", new_callable=AsyncMock)
def test_chat_503_returns_user_friendly_error(mock_chat, client, monkeypatch):
    from google.genai import errors
    import gemini_service
    monkeypatch.setattr(gemini_service, "GEMINI_API_KEY", "fake-key")
    mock_chat.side_effect = errors.ServerError(503, {"error": {"code": 503, "message": "Model is overloaded", "status": "UNAVAILABLE"}})

    res = client.post("/api/chat", json={"message": "Hello"})
    assert res.status_code == 503
    assert "temporarily unavailable" in res.json()["detail"].lower()


@patch("gemini_service.chat_with_gemini", new_callable=AsyncMock)
def test_chat_429_returns_user_friendly_error(mock_chat, client, monkeypatch):
    from google.genai import errors
    import gemini_service
    monkeypatch.setattr(gemini_service, "GEMINI_API_KEY", "fake-key")
    mock_chat.side_effect = errors.ClientError(429, {"error": {"code": 429, "message": "Resource exhausted", "status": "RESOURCE_EXHAUSTED"}})

    res = client.post("/api/chat", json={"message": "Hello"})
    assert res.status_code == 429
    assert "too many requests" in res.json()["detail"].lower()


@patch("gemini_service.chat_with_gemini", new_callable=AsyncMock)
def test_chat_retry_preserves_user_history_without_duplicates(mock_chat, client, monkeypatch):
    import gemini_service
    monkeypatch.setattr(gemini_service, "GEMINI_API_KEY", "fake-key")

    # First attempt: Gemini fails
    mock_chat.side_effect = TimeoutError("Stalled")
    res1 = client.post("/api/chat", json={"message": "My query"})
    assert res1.status_code == 504

    # The user's message is saved in DB
    convs = get_conversations()
    assert len(convs) == 1
    conv_id = convs[0]["id"]
    msgs_after_fail = get_messages(conv_id)
    assert len(msgs_after_fail) == 1
    assert msgs_after_fail[0]["content"] == "My query"

    # Second attempt (user clicks Retry): Gemini succeeds
    mock_chat.side_effect = None
    mock_chat.return_value = "Here is your answer!"
    res2 = client.post("/api/chat", json={"conversation_id": conv_id, "message": "My query"})
    assert res2.status_code == 200

    # User message must NOT be duplicated in DB
    msgs_after_retry = get_messages(conv_id)
    assert len(msgs_after_retry) == 2
    assert msgs_after_retry[0]["role"] == "user"
    assert msgs_after_retry[0]["content"] == "My query"
    assert msgs_after_retry[1]["role"] == "assistant"
    assert msgs_after_retry[1]["content"] == "Here is your answer!"


# ── gemini_service Retry & Backoff Unit Tests ──────────────────────────────────

@pytest.mark.asyncio
async def test_gemini_service_retry_transient_503_success(monkeypatch):
    import gemini_service
    from google.genai import errors
    monkeypatch.setattr(gemini_service, "GEMINI_API_KEY", "fake-key")

    mock_client = MagicMock()
    attempts = 0

    async def mock_generate_content(*args, **kwargs):
        nonlocal attempts
        attempts += 1
        if attempts == 1:
            raise errors.ServerError(503, {"error": {"code": 503, "message": "Overloaded"}})
        resp = MagicMock()
        resp.text = "Success on attempt 2"
        return resp

    mock_client.aio.models.generate_content = mock_generate_content
    monkeypatch.setattr(gemini_service, "get_client", lambda *a, **k: mock_client)

    # Patch asyncio.sleep so test runs fast
    with patch("asyncio.sleep", new_callable=AsyncMock) as mock_sleep:
        res = await gemini_service.chat_with_gemini(
            history=[],
            new_message="Hello",
            timeout_seconds=5.0,
            max_retries=2,
        )
        assert res == "Success on attempt 2"
        assert attempts == 2
        mock_sleep.assert_awaited_once_with(1.0)


@pytest.mark.asyncio
async def test_gemini_service_retry_exhaustion_503(monkeypatch):
    import gemini_service
    from google.genai import errors
    monkeypatch.setattr(gemini_service, "GEMINI_API_KEY", "fake-key")

    mock_client = MagicMock()
    attempts = 0

    async def mock_generate_content(*args, **kwargs):
        nonlocal attempts
        attempts += 1
        raise errors.ServerError(503, {"error": {"code": 503, "message": "Overloaded"}})

    mock_client.aio.models.generate_content = mock_generate_content
    monkeypatch.setattr(gemini_service, "get_client", lambda *a, **k: mock_client)

    with patch("asyncio.sleep", new_callable=AsyncMock) as mock_sleep:
        with pytest.raises(errors.ServerError):
            await gemini_service.chat_with_gemini(
                history=[],
                new_message="Hello",
                timeout_seconds=5.0,
                max_retries=2,
            )
        assert attempts == 3  # Initial + 2 retries
        assert mock_sleep.await_count == 2


@pytest.mark.asyncio
async def test_gemini_service_respects_retry_after(monkeypatch):
    import gemini_service
    from google.genai import errors
    monkeypatch.setattr(gemini_service, "GEMINI_API_KEY", "fake-key")

    mock_client = MagicMock()
    attempts = 0

    mock_response = MagicMock()
    mock_response.headers = {"retry-after": "4"}

    err = errors.ClientError(429, {"error": {"code": 429, "message": "Rate limited"}}, response=mock_response)

    async def mock_generate_content(*args, **kwargs):
        nonlocal attempts
        attempts += 1
        if attempts == 1:
            raise err
        resp = MagicMock()
        resp.text = "Recovered after rate limit"
        return resp

    mock_client.aio.models.generate_content = mock_generate_content
    monkeypatch.setattr(gemini_service, "get_client", lambda *a, **k: mock_client)

    with patch("asyncio.sleep", new_callable=AsyncMock) as mock_sleep:
        res = await gemini_service.chat_with_gemini(
            history=[],
            new_message="Hello",
            timeout_seconds=5.0,
            max_retries=2,
        )
        assert res == "Recovered after rate limit"
        assert attempts == 2
        mock_sleep.assert_awaited_once_with(4.0)


@pytest.mark.asyncio
async def test_gemini_service_no_retry_on_400(monkeypatch):
    import gemini_service
    from google.genai import errors
    monkeypatch.setattr(gemini_service, "GEMINI_API_KEY", "fake-key")

    mock_client = MagicMock()
    attempts = 0

    async def mock_generate_content(*args, **kwargs):
        nonlocal attempts
        attempts += 1
        raise errors.ClientError(400, {"error": {"code": 400, "message": "Bad request"}})

    mock_client.aio.models.generate_content = mock_generate_content
    monkeypatch.setattr(gemini_service, "get_client", lambda *a, **k: mock_client)

    with patch("asyncio.sleep", new_callable=AsyncMock) as mock_sleep:
        with pytest.raises(errors.ClientError):
            await gemini_service.chat_with_gemini(
                history=[],
                new_message="Hello",
                timeout_seconds=5.0,
                max_retries=2,
            )
        assert attempts == 1  # 400 is not transient, must NOT retry
        mock_sleep.assert_not_called()

