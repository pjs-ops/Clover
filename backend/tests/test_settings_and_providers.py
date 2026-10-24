"""
Tests for Lumi session management, providers (Gemini & OpenAI), and settings endpoints.
"""
from __future__ import annotations

import asyncio
import json
import os
import sys
from pathlib import Path
from unittest.mock import patch, MagicMock, AsyncMock

import pytest

# Add backend to path
sys.path.insert(0, str(Path(__file__).parent.parent))

os.environ["LUMI_TEST"] = "1"

import database as db_module
from database import init_db
from session_manager import SessionManager, SessionConfig
from providers.gemini_provider import GeminiProvider, is_transient_gemini_error
from providers.openai_provider import OpenAIProvider, is_transient_openai_status
from providers import get_provider


@pytest.fixture(autouse=True)
def temp_db(tmp_path, monkeypatch):
    test_db = tmp_path / "test.db"
    monkeypatch.setattr(db_module, "DB_PATH", test_db)
    init_db()
    yield test_db


@pytest.fixture
def client(temp_db):
    from fastapi.testclient import TestClient
    from main import app
    return TestClient(app)


# ── Session Manager Tests ──────────────────────────────────────────────────────

def test_session_manager_set_get_mask():
    sm = SessionManager(ttl_seconds=3600)
    sess = sm.set("sess-1", provider="gemini", api_key="AIzaSyTestKey123456", model="gemini-2.0-flash")
    assert sess.provider == "gemini"
    assert sess.model == "gemini-2.0-flash"
    assert sess.mask_key() == "••••••••3456"

    retrieved = sm.get("sess-1")
    assert retrieved is not None
    assert retrieved.api_key == "AIzaSyTestKey123456"


def test_session_manager_delete():
    sm = SessionManager(ttl_seconds=3600)
    sm.set("sess-2", provider="openai", api_key="sk-test-key", model="gpt-4o")
    assert sm.get("sess-2") is not None

    deleted = sm.delete("sess-2")
    assert deleted is True
    assert sm.get("sess-2") is None


def test_session_manager_ttl_cleanup():
    sm = SessionManager(ttl_seconds=1)
    sm.set("sess-3", provider="gemini", api_key="key", model="model")
    # artificially age session
    sm._sessions["sess-3"].last_active -= 10
    sm.cleanup()
    assert sm.get("sess-3") is None


# ── Gemini Provider Unit Tests ────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_gemini_provider_validate_success():
    provider = GeminiProvider(api_key="valid-key", model="gemini-2.0-flash")
    mock_client = MagicMock()
    mock_client.aio.models.generate_content = AsyncMock(return_value=MagicMock())

    with patch.object(provider, "_get_client", return_value=mock_client):
        valid, err = await provider.validate_credentials()
        assert valid is True
        assert err is None


@pytest.mark.asyncio
async def test_gemini_provider_validate_invalid_key():
    from google.genai import errors
    provider = GeminiProvider(api_key="bad-key", model="gemini-3.5-flash")
    mock_client = MagicMock()
    mock_client.aio.models.generate_content = AsyncMock(
        side_effect=errors.ClientError(401, {"error": {"code": 401, "message": "API_KEY_INVALID"}})
    )

    with patch.object(provider, "_get_client", return_value=mock_client):
        valid, err = await provider.validate_credentials()
        assert valid is False
        assert "Invalid API key" in err


@pytest.mark.asyncio
async def test_gemini_provider_validate_504_timeout():
    from google.genai import errors
    provider = GeminiProvider(api_key="valid-key", model="gemini-3.8-flash")
    mock_client = MagicMock()
    mock_client.aio.models.generate_content = AsyncMock(
        side_effect=errors.ServerError(504, {"error": {"code": 504, "message": "504 DEADLINE_EXCEEDED"}})
    )

    with patch.object(provider, "_get_client", return_value=mock_client):
        valid, err = await provider.validate_credentials(timeout_seconds=5.0)
        assert valid is False
        assert "timed out" in err.lower()
        # Verify it does NOT treat timeout as proof key is invalid
        assert "invalid api key" not in err.lower()
        assert "gemini-3.8-flash" in err


@pytest.mark.asyncio
async def test_gemini_provider_validate_asyncio_timeout():
    provider = GeminiProvider(api_key="valid-key", model="gemini-3.5-flash")
    mock_client = MagicMock()
    mock_client.aio.models.generate_content = AsyncMock(
        side_effect=asyncio.TimeoutError()
    )

    with patch.object(provider, "_get_client", return_value=mock_client):
        valid, err = await provider.validate_credentials(timeout_seconds=2.0)
        assert valid is False
        assert "timed out after 2s" in err
        assert "invalid api key" not in err.lower()


@pytest.mark.asyncio
async def test_gemini_provider_validate_429_quota():
    from google.genai import errors
    provider = GeminiProvider(api_key="valid-key", model="gemini-3.8-flash")
    mock_client = MagicMock()
    mock_client.aio.models.generate_content = AsyncMock(
        side_effect=errors.ClientError(429, {"error": {"code": 429, "message": "RESOURCE_EXHAUSTED"}})
    )

    with patch.object(provider, "_get_client", return_value=mock_client):
        valid, err = await provider.validate_credentials()
        assert valid is False
        assert "quota was exceeded" in err.lower() or "rate limit" in err.lower()
        assert "valid" in err.lower()  # acknowledges key is valid


@pytest.mark.asyncio
async def test_gemini_provider_validate_404_model_not_found():
    from google.genai import errors
    provider = GeminiProvider(api_key="valid-key", model="gemini-2.0-flash")
    mock_client = MagicMock()
    mock_client.aio.models.generate_content = AsyncMock(
        side_effect=errors.ClientError(404, {"error": {"code": 404, "message": "This model is no longer available"}})
    )

    with patch.object(provider, "_get_client", return_value=mock_client):
        valid, err = await provider.validate_credentials()
        assert valid is False
        assert "unavailable or unsupported" in err.lower() or "not found" in err.lower()


@pytest.mark.asyncio
async def test_gemini_provider_stream_chat_success():
    provider = GeminiProvider(api_key="valid-key", model="gemini-2.0-flash")
    mock_client = MagicMock()

    class MockChunk:
        def __init__(self, text):
            self.text = text

    async def mock_stream_iter():
        yield MockChunk("Hello ")
        yield MockChunk("world!")

    mock_client.aio.models.generate_content_stream = AsyncMock(return_value=mock_stream_iter())

    with patch.object(provider, "_get_client", return_value=mock_client):
        chunks = []
        async for chunk in provider.stream_chat(history=[], new_message="Hi"):
            chunks.append(chunk)

        assert "".join(chunks) == "Hello world!"


@pytest.mark.asyncio
async def test_gemini_provider_stream_chat_transient_503_retry():
    from google.genai import errors
    provider = GeminiProvider(api_key="valid-key", model="gemini-2.0-flash")
    mock_client = MagicMock()

    class MockChunk:
        def __init__(self, text):
            self.text = text

    async def mock_stream_iter():
        yield MockChunk("Recovered reply")

    attempts = 0

    async def mock_generate_stream(*args, **kwargs):
        nonlocal attempts
        attempts += 1
        if attempts == 1:
            raise errors.ServerError(503, {"error": {"code": 503, "message": "Unavailable"}})
        return mock_stream_iter()

    mock_client.aio.models.generate_content_stream = mock_generate_stream

    with patch.object(provider, "_get_client", return_value=mock_client):
        with patch("asyncio.sleep", new_callable=AsyncMock) as mock_sleep:
            chunks = []
            async for chunk in provider.stream_chat(history=[], new_message="Hi", max_retries=2):
                chunks.append(chunk)

            assert "".join(chunks) == "Recovered reply"
            assert attempts == 2
            mock_sleep.assert_awaited_once_with(1.0)


# ── OpenAI Provider Unit Tests ────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_openai_provider_validate_success():
    provider = OpenAIProvider(api_key="sk-test", model="gpt-4o-mini")

    mock_response = MagicMock(status_code=200)
    mock_client = AsyncMock()
    mock_client.get = AsyncMock(return_value=mock_response)
    mock_client.__aenter__.return_value = mock_client
    mock_client.__aexit__.return_value = None

    with patch("httpx.AsyncClient", return_value=mock_client):
        valid, err = await provider.validate_credentials()
        assert valid is True
        assert err is None


@pytest.mark.asyncio
async def test_openai_provider_validate_invalid_key():
    provider = OpenAIProvider(api_key="sk-bad", model="gpt-4o-mini")

    mock_response = MagicMock(status_code=401)
    mock_client = AsyncMock()
    mock_client.get = AsyncMock(return_value=mock_response)
    mock_client.__aenter__.return_value = mock_client
    mock_client.__aexit__.return_value = None

    with patch("httpx.AsyncClient", return_value=mock_client):
        valid, err = await provider.validate_credentials()
        assert valid is False
        assert "Invalid OpenAI API key" in err


# ── Settings API Endpoint Tests ────────────────────────────────────────────────

def test_settings_get_default(client, monkeypatch):
    import gemini_service
    monkeypatch.setattr(gemini_service, "GEMINI_API_KEY", "AQ.fake1234")
    res = client.get("/api/settings")
    assert res.status_code == 200
    data = res.json()
    assert data["configured"] is True
    assert data["is_custom_key"] is False
    assert data["provider"] == "gemini"


def test_settings_update_and_disconnect(client):
    headers = {"X-Session-ID": "test-session-abc"}

    # Save custom key
    res = client.post(
        "/api/settings",
        json={"provider": "gemini", "api_key": "custom-key-123456", "model": "gemini-2.0-flash"},
        headers=headers,
    )
    assert res.status_code == 200
    data = res.json()
    assert data["configured"] is True
    assert data["is_custom_key"] is True
    assert data["model"] == "gemini-2.0-flash"
    assert data["masked_key"] == "••••••••3456"

    # Get settings for this session
    res_get = client.get("/api/settings", headers=headers)
    assert res_get.json()["is_custom_key"] is True

    # Disconnect
    res_del = client.delete("/api/settings", headers=headers)
    assert res_del.status_code == 200
    assert res_del.json()["status"] == "disconnected"


def test_settings_test_connection_invalid_key(client):
    with patch("providers.gemini_provider.GeminiProvider.validate_credentials", new_callable=AsyncMock) as mock_val:
        mock_val.return_value = (False, "Invalid API key from test probe")

        res = client.post(
            "/api/settings/test",
            json={"provider": "gemini", "api_key": "invalid-key"},
        )
        assert res.status_code == 400
        assert "Invalid API key" in res.json()["detail"]


def test_settings_test_connection_valid_key(client):
    with patch("providers.gemini_provider.GeminiProvider.validate_credentials", new_callable=AsyncMock) as mock_val:
        mock_val.return_value = (True, None)

        res = client.post(
            "/api/settings/test",
            json={"provider": "gemini", "api_key": "valid-key", "model": "gemini-3.5-flash"},
        )
        assert res.status_code == 200
        assert res.json()["status"] == "ok"
        assert res.json()["model"] == "gemini-3.5-flash"


def test_settings_test_connection_timeout_handling(client):
    with patch("providers.gemini_provider.GeminiProvider.validate_credentials", new_callable=AsyncMock) as mock_val:
        mock_val.return_value = (
            False,
            "Connection test timed out after 10s waiting for Gemini (gemini-3.8-flash). The server took too long to respond. The API key may still be valid; please check your network connection or try a different model."
        )

        res = client.post(
            "/api/settings/test",
            json={"provider": "gemini", "api_key": "valid-key", "model": "gemini-3.8-flash", "timeout_seconds": 10},
        )
        assert res.status_code == 400
        detail = res.json()["detail"]
        assert "timed out after 10s" in detail
        assert "API key may still be valid" in detail


def test_settings_test_connection_redacts_api_key_in_error(client):
    secret_key = "AIzaSySecretKey998877665544332211"
    with patch("providers.gemini_provider.GeminiProvider.validate_credentials", new_callable=AsyncMock) as mock_val:
        # Simulate a provider exception that leaked the raw key
        mock_val.side_effect = Exception(f"Failed with key {secret_key}: connection error")

        res = client.post(
            "/api/settings/test",
            json={"provider": "gemini", "api_key": secret_key, "model": "gemini-3.5-flash"},
        )
        assert res.status_code == 400
        detail = res.json()["detail"]
        assert secret_key not in detail
        assert "[REDACTED" in detail


def test_redact_secrets_utility():
    from providers.base import redact_secrets
    raw_key = "AIzaSyD987654321012345678901234567"
    openai_key = "sk-proj-1234567890abcdef1234567890abcdef"
    text = f"Error with {raw_key} and Authorization: Bearer mysecrettoken and {openai_key}"
    cleaned = redact_secrets(text, raw_key)
    assert raw_key not in cleaned
    assert openai_key not in cleaned
    assert "mysecrettoken" not in cleaned
    assert "[REDACTED" in cleaned


# ── Streaming Endpoint Tests ───────────────────────────────────────────────────

def test_chat_stream_endpoint(client, monkeypatch):
    import gemini_service
    monkeypatch.setattr(gemini_service, "GEMINI_API_KEY", "valid-key")

    headers = {"X-Session-ID": "stream-session-1"}
    client.post(
        "/api/settings",
        json={"provider": "gemini", "api_key": "valid-key", "model": "gemini-2.0-flash"},
        headers=headers,
    )

    async def mock_stream_chunks(*args, **kwargs):
        yield "Hello "
        yield "there, "
        yield "student!"

    with patch("providers.gemini_provider.GeminiProvider.stream_chat", side_effect=mock_stream_chunks):
        with patch("providers.gemini_provider.GeminiProvider.generate_title", new_callable=AsyncMock) as mock_title:
            mock_title.return_value = "Stream Test Chat"

            res = client.post(
                "/api/chat/stream",
                json={"message": "Teach me math"},
                headers=headers,
            )
            assert res.status_code == 200
            assert "text/event-stream" in res.headers["content-type"]

            body = res.text
            assert "event: start" in body
            assert "event: chunk" in body
            assert "Hello " in body
            assert "student!" in body
            assert "event: done" in body
