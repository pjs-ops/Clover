from __future__ import annotations

import os
from typing import Optional

from providers.base import AIProvider, redact_secrets
from providers.gemini_provider import GeminiProvider
from providers.openai_provider import OpenAIProvider

DEFAULT_GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-3.5-flash")
DEFAULT_OPENAI_MODEL = os.getenv("OPENAI_MODEL", "gpt-4o-mini")
DEFAULT_TIMEOUT = float(os.getenv("GEMINI_TIMEOUT_SECONDS", "30.0"))
DEFAULT_TEST_TIMEOUT = float(os.getenv("GEMINI_TEST_TIMEOUT_SECONDS", "15.0"))


def get_provider(
    provider_name: str,
    api_key: str,
    model: Optional[str] = None,
    timeout_seconds: Optional[float] = None,
) -> AIProvider:
    """Instantiate and return the appropriate AIProvider."""
    norm = (provider_name or "gemini").lower().strip()
    timeout = timeout_seconds if timeout_seconds is not None else DEFAULT_TIMEOUT

    if norm == "gemini":
        effective_model = model or DEFAULT_GEMINI_MODEL
        return GeminiProvider(api_key=api_key, model=effective_model, timeout_seconds=timeout)
    elif norm == "openai":
        effective_model = model or DEFAULT_OPENAI_MODEL
        return OpenAIProvider(api_key=api_key, model=effective_model, timeout_seconds=timeout)
    else:
        raise ValueError(f"Unsupported AI provider: '{provider_name}'. Supported: 'gemini', 'openai'.")


__all__ = [
    "AIProvider",
    "GeminiProvider",
    "OpenAIProvider",
    "get_provider",
    "redact_secrets",
    "DEFAULT_GEMINI_MODEL",
    "DEFAULT_OPENAI_MODEL",
    "DEFAULT_TIMEOUT",
    "DEFAULT_TEST_TIMEOUT",
]
