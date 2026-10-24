from __future__ import annotations

import asyncio
import json
import logging
from typing import AsyncIterator, List, Optional, Tuple

import httpx
from providers.base import AIProvider, SYSTEM_INSTRUCTION

logger = logging.getLogger("lumi.provider.openai")


def is_transient_openai_status(status_code: int) -> bool:
    # 401: Unauthorized, 403: Forbidden, 404: Not found -> non-transient
    # 429: Rate limit/Quota -> non-transient (do not auto-retry quota)
    # 500, 502, 503, 504 -> transient
    return status_code in (500, 502, 503, 504)


class OpenAIProvider(AIProvider):
    """OpenAI provider implementation using async httpx for direct SSE streaming.
    Works out of the box without requiring extra heavy SDK dependencies.
    """

    BASE_URL = "https://api.openai.com/v1"

    def _history_to_messages(
        self,
        history: List[dict],
        composed_new_message: str,
    ) -> List[dict]:
        messages = [{"role": "system", "content": SYSTEM_INSTRUCTION}]
        for m in history:
            role = "user" if m["role"] == "user" else "assistant"
            messages.append({"role": role, "content": m["content"]})
        messages.append({"role": "user", "content": composed_new_message})
        return messages

    async def validate_credentials(self, timeout_seconds: Optional[float] = None) -> Tuple[bool, Optional[str]]:
        """Probe OpenAI API with a lightweight model list check."""
        if not self.api_key or not self.api_key.strip():
            return False, "API key is required"
        timeout_val = timeout_seconds or 10.0
        try:
            async with httpx.AsyncClient(timeout=timeout_val) as client:
                res = await client.get(
                    f"{self.BASE_URL}/models",
                    headers={"Authorization": f"Bearer {self.api_key}"},
                )
                if res.status_code == 200:
                    return True, None
                if res.status_code == 401:
                    return False, "Invalid OpenAI API key. Please check your credentials."
                if res.status_code == 429:
                    return False, "OpenAI quota exceeded. Check your plan and billing details."
                if res.status_code in (504, 408):
                    return False, f"Connection test timed out after {int(timeout_val)}s waiting for OpenAI. Your key may still be valid."
                return False, f"OpenAI error (HTTP {res.status_code})"
        except httpx.TimeoutException:
            return False, f"Connection test timed out after {int(timeout_val)}s waiting for OpenAI. Your key may still be valid."
        except Exception as e:
            return False, f"Failed to connect to OpenAI: {str(e)[:100]}"

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
        composed = self.build_message_content(new_message, shortcut, document_content)
        messages = self._history_to_messages(history, composed)

        attempt = 0
        start_time = asyncio.get_event_loop().time()

        logger.info(
            "Starting OpenAI chat stream (model=%s, history_len=%d, msg_len=%d, timeout=%.1fs)",
            self.model,
            len(history),
            len(new_message),
            effective_timeout,
        )

        while True:
            try:
                async with httpx.AsyncClient(timeout=effective_timeout) as client:
                    async with client.stream(
                        "POST",
                        f"{self.BASE_URL}/chat/completions",
                        headers={
                            "Authorization": f"Bearer {self.api_key}",
                            "Content-Type": "application/json",
                        },
                        json={
                            "model": self.model,
                            "messages": messages,
                            "stream": True,
                            "temperature": 0.7,
                            "max_tokens": 2048,
                        },
                    ) as response:
                        if response.status_code != 200:
                            # Read error body
                            err_content = await response.aread()
                            err_text = err_content.decode(errors="replace")
                            try:
                                err_json = json.loads(err_text)
                                err_msg = err_json.get("error", {}).get("message", err_text)
                            except Exception:
                                err_msg = err_text

                            if is_transient_openai_status(response.status_code) and attempt < max_retries:
                                attempt += 1
                                backoff = float(2 ** (attempt - 1))
                                logger.warning(
                                    "OpenAI transient HTTP %d error on attempt %d/%d. Retrying in %.1fs...",
                                    response.status_code,
                                    attempt,
                                    max_retries + 1,
                                    backoff,
                                )
                                await asyncio.sleep(backoff)
                                continue

                            if response.status_code == 401:
                                raise ValueError("Invalid OpenAI API key. Please check your settings.")
                            if response.status_code == 429:
                                raise RuntimeError("OpenAI rate limit or quota exceeded. Please try again later.")
                            raise RuntimeError(f"OpenAI API error ({response.status_code}): {err_msg[:120]}")

                        async for line in response.aiter_lines():
                            line = line.strip()
                            if not line or not line.startswith("data:"):
                                continue
                            data_str = line[5:].strip()
                            if data_str == "[DONE]":
                                break
                            try:
                                data = json.loads(data_str)
                                choices = data.get("choices", [])
                                if choices:
                                    delta = choices[0].get("delta", {})
                                    content = delta.get("content")
                                    if content:
                                        yield content
                            except json.JSONDecodeError:
                                continue

                elapsed = asyncio.get_event_loop().time() - start_time
                logger.info("OpenAI chat stream completed in %.2fs (attempt %d)", elapsed, attempt + 1)
                return

            except (httpx.TimeoutException, asyncio.TimeoutError) as e:
                elapsed = asyncio.get_event_loop().time() - start_time
                logger.warning("OpenAI stream timed out after %.2fs on attempt %d/%d", elapsed, attempt + 1, max_retries + 1)
                if attempt < max_retries:
                    attempt += 1
                    backoff = float(2 ** (attempt - 1))
                    await asyncio.sleep(backoff)
                    continue
                raise TimeoutError(f"OpenAI request timed out after {effective_timeout:.1f}s") from e

            except (httpx.NetworkError, httpx.ConnectError) as e:
                elapsed = asyncio.get_event_loop().time() - start_time
                logger.warning("OpenAI network error on attempt %d/%d: %s", attempt + 1, max_retries + 1, e)
                if attempt < max_retries:
                    attempt += 1
                    backoff = float(2 ** (attempt - 1))
                    await asyncio.sleep(backoff)
                    continue
                raise

            except Exception as e:
                logger.error("OpenAI chat stream failed: %s", e)
                raise

    async def generate_title(self, first_user_message: str) -> str:
        prompt = (
            f"Generate a very short, descriptive title (max 6 words) for a chat that starts with: "
            f'"{first_user_message[:200]}". Reply with only the title, no quotes.'
        )
        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                res = await client.post(
                    f"{self.BASE_URL}/chat/completions",
                    headers={
                        "Authorization": f"Bearer {self.api_key}",
                        "Content-Type": "application/json",
                    },
                    json={
                        "model": self.model,
                        "messages": [{"role": "user", "content": prompt}],
                        "max_tokens": 20,
                        "temperature": 0.3,
                    },
                )
                if res.status_code == 200:
                    data = res.json()
                    title = data["choices"][0]["message"]["content"].strip().strip('"')
                    return title[:60] if title else first_user_message[:40]
        except Exception as e:
            logger.warning("OpenAI title generation failed (%s), using fallback", type(e).__name__)
        return first_user_message[:40]
