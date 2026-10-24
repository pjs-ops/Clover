from __future__ import annotations

import asyncio
import logging
import os
from typing import List, Optional, Tuple
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger("lumi.gemini")

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-3.5-flash")
GEMINI_TIMEOUT_SECONDS = float(os.getenv("GEMINI_TIMEOUT_SECONDS", "30.0"))
GEMINI_TEST_TIMEOUT_SECONDS = float(os.getenv("GEMINI_TEST_TIMEOUT_SECONDS", "15.0"))

SHORTCUT_PROMPTS = {
    "explain": (
        "Please explain the following topic in simple, easy-to-understand terms. "
        "Use analogies, avoid jargon, and structure the explanation clearly:\n\n"
    ),
    "summarize": (
        "Please provide a concise, well-structured summary of the following. "
        "Use bullet points for key points and keep it clear:\n\n"
    ),
    "quiz": (
        "Create an engaging quiz with 5 multiple-choice questions about the following topic. "
        "Format each question clearly with options A, B, C, D and provide the correct answer at the end:\n\n"
    ),
}


def get_client(timeout_seconds: Optional[float] = None):
    """Return a configured Gemini client."""
    if not GEMINI_API_KEY:
        raise ValueError("GEMINI_API_KEY is not set in backend/.env")
    from google import genai
    from google.genai import types as genai_types

    timeout_val = timeout_seconds if timeout_seconds is not None else GEMINI_TIMEOUT_SECONDS
    timeout_ms = int(timeout_val * 1000)

    return genai.Client(
        api_key=GEMINI_API_KEY,
        http_options=genai_types.HttpOptions(timeout=timeout_ms),
    )


def build_message_content(
    user_text: str,
    shortcut: Optional[str] = None,
    document_content: Optional[str] = None,
) -> str:
    """Compose the actual user message to send to Gemini."""
    prefix = SHORTCUT_PROMPTS.get(shortcut, "") if shortcut else ""
    doc_context = ""
    if document_content:
        doc_context = f"[Document content provided by user]\n{document_content}\n\n"
    return f"{doc_context}{prefix}{user_text}"


def history_to_contents(messages: List[dict]) -> List[dict]:
    """Convert DB messages to Gemini API contents format."""
    contents = []
    for m in messages:
        role = "user" if m["role"] == "user" else "model"
        contents.append({"role": role, "parts": [{"text": m["content"]}]})
    return contents


def _extract_retry_after(exc: Exception) -> Optional[float]:
    """Extract Retry-After header value in seconds if present."""
    if hasattr(exc, "response") and exc.response is not None:
        headers = getattr(exc.response, "headers", None)
        if headers:
            raw = headers.get("retry-after") or headers.get("Retry-After")
            if raw:
                try:
                    return min(float(raw), 10.0)
                except (ValueError, TypeError):
                    return None
    return None


def is_transient_error(exc: Exception) -> Tuple[bool, Optional[float]]:
    """Determine if an error is transient and can be retried."""
    from google.genai import errors
    import httpx

    retry_after = _extract_retry_after(exc)

    if isinstance(exc, errors.APIError):
        code = getattr(exc, "code", None)
        if code in (429, 500, 502, 503, 504):
            return True, retry_after
        if isinstance(exc, errors.ServerError):
            return True, retry_after

    if isinstance(exc, (httpx.TimeoutException, httpx.NetworkError, httpx.ConnectError, asyncio.TimeoutError, TimeoutError)):
        return True, retry_after

    err_str = str(exc).lower()
    if any(k in err_str for k in ("overloaded", "503", "unavailable", "rate limit", "429", "timeout", "deadline")):
        return True, retry_after

    return False, None


async def chat_with_gemini(
    history: List[dict],
    new_message: str,
    shortcut: Optional[str] = None,
    document_content: Optional[str] = None,
    timeout_seconds: Optional[float] = None,
    max_retries: int = 2,
) -> str:
    """Send a message to Gemini with conversation history and return the response text."""
    effective_timeout = timeout_seconds if timeout_seconds is not None else GEMINI_TIMEOUT_SECONDS
    client = get_client(effective_timeout)

    composed = build_message_content(new_message, shortcut, document_content)
    contents = history_to_contents(history)
    contents.append({"role": "user", "parts": [{"text": composed}]})

    system_instruction = (
        "You are Lumi, a friendly, patient, and encouraging AI study buddy. "
        "You help students understand complex topics, summarize material, create quizzes, "
        "and answer questions clearly. Use markdown formatting with headers, bullet points, "
        "and code blocks where appropriate. Be warm, supportive, and engaging."
    )

    from google.genai import types as genai_types

    config = genai_types.GenerateContentConfig(
        system_instruction=system_instruction,
        temperature=0.7,
        max_output_tokens=2048,
    )

    attempt = 0
    start_time = asyncio.get_event_loop().time()

    logger.info(
        "Starting Gemini chat request (model=%s, history_len=%d, msg_len=%d, timeout=%.1fs)",
        GEMINI_MODEL,
        len(history),
        len(new_message),
        effective_timeout,
    )

    while True:
        try:
            # Execute async call with asyncio.wait_for for strict timeout enforcement
            call_coro = client.aio.models.generate_content(
                model=GEMINI_MODEL,
                contents=contents,
                config=config,
            )
            response = await asyncio.wait_for(call_coro, timeout=effective_timeout)

            elapsed = asyncio.get_event_loop().time() - start_time
            logger.info("Gemini chat response completed in %.2fs (attempt %d)", elapsed, attempt + 1)
            return response.text or ""

        except (asyncio.TimeoutError, TimeoutError) as e:
            elapsed = asyncio.get_event_loop().time() - start_time
            logger.warning(
                "Gemini request timed out after %.2fs on attempt %d/%d",
                elapsed,
                attempt + 1,
                max_retries + 1,
            )
            if attempt < max_retries:
                attempt += 1
                backoff = float(2 ** (attempt - 1))
                logger.info("Retrying after timeout in %.1fs (attempt %d/%d)...", backoff, attempt + 1, max_retries + 1)
                await asyncio.sleep(backoff)
                continue
            raise TimeoutError(f"Gemini request timed out after {effective_timeout:.1f}s") from e

        except Exception as e:
            transient, retry_after = is_transient_error(e)
            elapsed = asyncio.get_event_loop().time() - start_time

            if transient and attempt < max_retries:
                attempt += 1
                base_delay = float(2 ** (attempt - 1))  # 1.0s, 2.0s
                delay = max(base_delay, retry_after or 0.0)
                logger.warning(
                    "Gemini transient error on attempt %d/%d (%s). Retrying in %.1fs (retry_after=%s)...",
                    attempt,
                    max_retries + 1,
                    type(e).__name__,
                    delay,
                    retry_after,
                )
                await asyncio.sleep(delay)
                continue

            logger.error(
                "Gemini chat request failed after %.2fs on attempt %d: %s",
                elapsed,
                attempt + 1,
                type(e).__name__,
            )
            raise


def generate_title(first_user_message: str) -> str:
    """Generate a short conversation title from the first message."""
    try:
        client = get_client(timeout_seconds=5.0)
        from google.genai import types as genai_types
        response = client.models.generate_content(
            model=GEMINI_MODEL,
            contents=[{
                "role": "user",
                "parts": [{"text": (
                    f"Generate a very short, descriptive title (max 6 words) for a chat that starts with: "
                    f'"{first_user_message[:200]}". Reply with only the title, no quotes.'
                )}]
            }],
            config=genai_types.GenerateContentConfig(max_output_tokens=20, temperature=0.3),
        )
        title = (response.text or "").strip().strip('"')
        return title[:60] if title else first_user_message[:40]
    except Exception as e:
        logger.warning("Title generation failed (%s), falling back to prompt snippet", type(e).__name__)
        return first_user_message[:40]

