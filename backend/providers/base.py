from __future__ import annotations

import abc
import asyncio
from typing import AsyncIterator, List, Optional, Tuple

SYSTEM_INSTRUCTION = (
    "You are Lumi, a friendly, patient, and encouraging AI study buddy. "
    "You help students understand complex topics, summarize material, create quizzes, "
    "and answer questions clearly. Use markdown formatting with headers, bullet points, "
    "and code blocks where appropriate. Be warm, supportive, and engaging."
)

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


import re

_SECRET_PATTERNS = [
    re.compile(r"AIza[0-9A-Za-z-_]{35}"),
    re.compile(r"AQ\.[0-9A-Za-z-_]{30,}"),
    re.compile(r"sk-[a-zA-Z0-9_-]{20,}"),
    re.compile(r"Bearer\s+[A-Za-z0-9._~+/-]+=*", re.IGNORECASE),
]


def redact_secrets(text: Optional[str], *known_keys: Optional[str]) -> str:
    """Mask known API keys and common secret patterns from logs and user messages."""
    if not text:
        return ""
    result = str(text)
    for k in known_keys:
        if k and len(k.strip()) >= 6:
            result = result.replace(k.strip(), "[REDACTED_API_KEY]")
    for pattern in _SECRET_PATTERNS:
        result = pattern.sub("[REDACTED_SECRET]", result)
    return result


class AIProvider(abc.ABC):
    """Abstract base class for all LLM providers in Lumi."""

    def __init__(
        self,
        api_key: str,
        model: str,
        timeout_seconds: float = 30.0,
    ):
        self.api_key = api_key
        self.model = model
        self.timeout_seconds = timeout_seconds

    def build_message_content(
        self,
        user_text: str,
        shortcut: Optional[str] = None,
        document_content: Optional[str] = None,
    ) -> str:
        """Compose the user prompt with shortcut prefix and document context."""
        prefix = SHORTCUT_PROMPTS.get(shortcut, "") if shortcut else ""
        doc_context = ""
        if document_content:
            doc_context = f"[Document content provided by user]\n{document_content}\n\n"
        return f"{doc_context}{prefix}{user_text}"

    @abc.abstractmethod
    async def validate_credentials(self, timeout_seconds: Optional[float] = None) -> Tuple[bool, Optional[str]]:
        """Probe the API with a lightweight check to verify the key and model.
        Returns (is_valid, error_message).
        """
        pass

    @abc.abstractmethod
    async def stream_chat(
        self,
        history: List[dict],
        new_message: str,
        shortcut: Optional[str] = None,
        document_content: Optional[str] = None,
        timeout_seconds: Optional[float] = None,
        max_retries: int = 2,
    ) -> AsyncIterator[str]:
        """Stream chunks of assistant response tokens."""
        pass

    async def chat(
        self,
        history: List[dict],
        new_message: str,
        shortcut: Optional[str] = None,
        document_content: Optional[str] = None,
        timeout_seconds: Optional[float] = None,
        max_retries: int = 2,
    ) -> str:
        """Accumulate full response text by consuming stream_chat."""
        parts = []
        async for chunk in self.stream_chat(
            history=history,
            new_message=new_message,
            shortcut=shortcut,
            document_content=document_content,
            timeout_seconds=timeout_seconds,
            max_retries=max_retries,
        ):
            parts.append(chunk)
        return "".join(parts)

    @abc.abstractmethod
    async def generate_title(self, first_user_message: str) -> str:
        """Generate a short conversation title from the first message."""
        pass
