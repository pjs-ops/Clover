from __future__ import annotations

import time
from typing import Dict, Optional
from pydantic import BaseModel


class SessionConfig(BaseModel):
    provider: str = "gemini"
    api_key: Optional[str] = None
    model: Optional[str] = None
    last_active: float = 0.0

    def mask_key(self) -> str:
        if not self.api_key:
            return ""
        if len(self.api_key) <= 8:
            return "••••••••"
        return f"••••••••{self.api_key[-4:]}"


class SessionManager:
    """In-memory session manager for local/prototype environments.
    
    Security note:
    API keys are held in volatile process memory only. They are never written to disk,
    logged, or shared across sessions. In a multi-replica production environment,
    use a secure KMS or encrypted Redis session store with HTTPS and CSRF protection.
    """

    def __init__(self, ttl_seconds: int = 86400):
        self._sessions: Dict[str, SessionConfig] = {}
        self.ttl_seconds = ttl_seconds

    def get(self, session_id: Optional[str]) -> Optional[SessionConfig]:
        if not session_id or session_id not in self._sessions:
            return None
        sess = self._sessions[session_id]
        if time.time() - sess.last_active > self.ttl_seconds:
            del self._sessions[session_id]
            return None
        sess.last_active = time.time()
        return sess

    def set(
        self,
        session_id: str,
        provider: str,
        api_key: Optional[str] = None,
        model: Optional[str] = None,
    ) -> SessionConfig:
        existing = self.get(session_id)
        # If no key passed but one already exists, keep existing key
        effective_key = api_key if api_key is not None else (existing.api_key if existing else None)
        effective_model = model if model is not None else (existing.model if existing else None)

        sess = SessionConfig(
            provider=provider,
            api_key=effective_key,
            model=effective_model,
            last_active=time.time(),
        )
        self._sessions[session_id] = sess
        return sess

    def delete(self, session_id: Optional[str]) -> bool:
        if session_id and session_id in self._sessions:
            del self._sessions[session_id]
            return True
        return False

    def cleanup(self) -> None:
        now = time.time()
        expired = [sid for sid, s in self._sessions.items() if now - s.last_active > self.ttl_seconds]
        for sid in expired:
            del self._sessions[sid]


# Global instance
session_store = SessionManager()
