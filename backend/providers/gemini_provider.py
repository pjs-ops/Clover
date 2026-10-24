from __future__ import annotations

import asyncio
import logging
from typing import AsyncIterator, List, Optional, Tuple

import os
from providers.base import AIProvider, SYSTEM_INSTRUCTION, redact_secrets

logger = logging.getLogger("lumi.provider.gemini")


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


def is_transient_gemini_error(exc: Exception) -> Tuple[bool, Optional[float]]:
    """Determine if a Gemini error is transient and can be retried.
    Authentication (401, 403) and quota (429) errors are NEVER retried.
    """
    from google.genai import errors
    import httpx

    retry_after = _extract_retry_after(exc)

    if isinstance(exc, errors.APIError):
        code = getattr(exc, "code", None)
        # Authentication and bad request errors: NEVER retry
        if code in (400, 401, 403, 404):
            return False, None
        # Quota errors: NEVER retry automatically
        if code == 429:
            return False, None
        # Transient server errors: 500, 502, 503, 504
        if code in (500, 502, 503, 504):
            return True, retry_after
        if isinstance(exc, errors.ServerError):
            return True, retry_after

    if isinstance(exc, (httpx.TimeoutException, httpx.NetworkError, httpx.ConnectError, asyncio.TimeoutError, TimeoutError)):
        return True, retry_after

    err_str = str(exc).lower()
    if any(k in err_str for k in ("overloaded", "503", "unavailable", "timeout", "deadline", "504")):
        return True, retry_after

    return False, None


class GeminiProvider(AIProvider):
    """Google Gemini provider implementation using google-genai SDK."""

    def _get_client(self, timeout_ms: int):
        from google import genai
        from google.genai import types as genai_types

        return genai.Client(
            api_key=self.api_key,
            http_options=genai_types.HttpOptions(timeout=timeout_ms),
        )

    def _history_to_contents(self, history: List[dict]) -> List[dict]:
        contents = []
        for m in history:
            role = "user" if m["role"] == "user" else "model"
            contents.append({"role": role, "parts": [{"text": m["content"]}]})
        return contents

    async def validate_credentials(self, timeout_seconds: Optional[float] = None) -> Tuple[bool, Optional[str]]:
        """Validate Gemini API key and model availability using a minimal generation probe.
        Does not retry indefinitely and handles timeouts, invalid keys, quotas, and unsupported models distinctly.
        """
        if not self.api_key or not self.api_key.strip():
            return False, "API key is required"

        effective_timeout = timeout_seconds or float(os.getenv("GEMINI_TEST_TIMEOUT_SECONDS", "15.0"))
        timeout_ms = max(1000, int(effective_timeout * 1000))

        try:
            client = self._get_client(timeout_ms=timeout_ms)
            from google.genai import types as genai_types

            # Smallest supported generation request
            probe_coro = client.aio.models.generate_content(
                model=self.model,
                contents=[{"role": "user", "parts": [{"text": "ping"}]}],
                config=genai_types.GenerateContentConfig(max_output_tokens=1),
            )
            await asyncio.wait_for(probe_coro, timeout=effective_timeout)
            return True, None
        except (asyncio.TimeoutError, TimeoutError):
            logger.warning("Gemini credential validation timed out after %.1fs for model=%s", effective_timeout, self.model)
            return False, (
                f"Connection test timed out after {int(effective_timeout)}s waiting for Gemini ({self.model}). "
                "The server took too long to respond. The API key may still be valid — please check your network connection or try a different model."
            )
        except Exception as e:
            import httpx
            code = getattr(e, "code", None)
            err_str = str(e).lower()
            safe_err = redact_secrets(str(e), self.api_key)
            logger.warning("Gemini credential validation failed: %s (code=%s)", type(e).__name__, code)

            # 1. Provider timeout / Deadline exceeded (504, DEADLINE_EXCEEDED, Gateway Timeout)
            if (
                code == 504
                or isinstance(e, httpx.TimeoutException)
                or any(k in err_str for k in ("504", "deadline_exceeded", "deadline exceeded", "gateway timeout", "timed out"))
            ):
                return False, (
                    f"Connection test timed out after {int(effective_timeout)}s waiting for Gemini ({self.model}). "
                    "Google reported a deadline exceeded error. Your API key may still be valid — please check your network connection or try a faster model."
                )

            # 2. Authentication / Invalid key (401, 403, API_KEY_INVALID)
            if code in (401, 403) or any(k in err_str for k in ("api_key_invalid", "unauthenticated", "permission_denied", "api key not valid")):
                return False, "Invalid API key. Please verify your Gemini API key in Google AI Studio."

            # 3. Quota / Rate limit (429, RESOURCE_EXHAUSTED)
            if code == 429 or any(k in err_str for k in ("429", "resource_exhausted", "quota", "rate limit", "requests per day")):
                return False, f"API key is valid, but rate limit or quota was exceeded for model '{self.model}'. Please check your plan in Google AI Studio or select another model."

            # 4. Model not found / unavailable / deprecated (404, NOT_FOUND)
            if code == 404 or any(k in err_str for k in ("not found", "is no longer available", "not supported for generatecontent")):
                return False, f"Model '{self.model}' is unavailable or unsupported by Gemini. Please select an active model (such as gemini-3.5-flash or gemini-flash-lite-latest)."

            # 5. Fallback for other errors with secrets redacted
            return False, f"Connection failed: {safe_err[:150]}"

    async def stream_chat(
        self,
        history: List[dict],
        new_message: str,
        shortcut: Optional[str] = None,
        document_content: Optional[str] = None,
        timeout_seconds: Optional[float] = None,
        max_retries: int = 2,
    ) -> AsyncIterator[str]:
        effective_timeout = timeout_seconds or self.timeout_seconds
        timeout_ms = int(effective_timeout * 1000)
        client = self._get_client(timeout_ms)

        composed = self.build_message_content(new_message, shortcut, document_content)
        contents = self._history_to_contents(history)
        contents.append({"role": "user", "parts": [{"text": composed}]})

        from google.genai import types as genai_types

        config = genai_types.GenerateContentConfig(
            system_instruction=SYSTEM_INSTRUCTION,
            temperature=0.7,
            max_output_tokens=2048,
        )

        attempt = 0
        start_time = asyncio.get_event_loop().time()

        logger.info(
            "Starting Gemini chat stream (model=%s, history_len=%d, msg_len=%d, timeout=%.1fs)",
            self.model,
            len(history),
            len(new_message),
            effective_timeout,
        )

        while True:
            try:
                stream_coro = client.aio.models.generate_content_stream(
                    model=self.model,
                    contents=contents,
                    config=config,
                )
                stream_iter = await asyncio.wait_for(stream_coro, timeout=effective_timeout)

                async for chunk in stream_iter:
                    if chunk.text:
                        yield chunk.text

                elapsed = asyncio.get_event_loop().time() - start_time
                logger.info("Gemini chat stream finished in %.2fs (attempt %d)", elapsed, attempt + 1)
                return

            except (asyncio.TimeoutError, TimeoutError) as e:
                elapsed = asyncio.get_event_loop().time() - start_time
                logger.warning(
                    "Gemini stream timed out after %.2fs on attempt %d/%d",
                    elapsed,
                    attempt + 1,
                    max_retries + 1,
                )
                if attempt < max_retries:
                    attempt += 1
                    backoff = float(2 ** (attempt - 1))
                    logger.info("Retrying stream after timeout in %.1fs...", backoff)
                    await asyncio.sleep(backoff)
                    continue
                raise TimeoutError(f"Gemini request timed out after {effective_timeout:.1f}s") from e

            except Exception as e:
                transient, retry_after = is_transient_gemini_error(e)
                elapsed = asyncio.get_event_loop().time() - start_time

                if transient and attempt < max_retries:
                    attempt += 1
                    base_delay = float(2 ** (attempt - 1))
                    delay = max(base_delay, retry_after or 0.0)
                    logger.warning(
                        "Gemini transient stream error on attempt %d/%d (%s). Retrying in %.1fs...",
                        attempt,
                        max_retries + 1,
                        type(e).__name__,
                        delay,
                    )
                    await asyncio.sleep(delay)
                    continue

                logger.error(
                    "Gemini chat stream failed after %.2fs on attempt %d: %s",
                    elapsed,
                    attempt + 1,
                    type(e).__name__,
                )
                raise

    async def generate_title(self, first_user_message: str) -> str:
        try:
            client = self._get_client(timeout_ms=5000)
            from google.genai import types as genai_types

            prompt = (
                f"Generate a very short, descriptive title (max 6 words) for a chat that starts with: "
                f'"{first_user_message[:200]}". Reply with only the title, no quotes.'
            )
            response = await asyncio.wait_for(
                client.aio.models.generate_content(
                    model=self.model,
                    contents=[{"role": "user", "parts": [{"text": prompt}]}],
                    config=genai_types.GenerateContentConfig(max_output_tokens=20, temperature=0.3),
                ),
                timeout=5.0,
            )
            title = (response.text or "").strip().strip('"')
            return title[:60] if title else first_user_message[:40]
        except Exception as e:
            logger.warning("Gemini title generation failed (%s), using fallback", type(e).__name__)
            return first_user_message[:40]
