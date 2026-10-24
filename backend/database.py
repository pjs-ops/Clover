from __future__ import annotations

import os
import uuid
import time
import json
import sqlite3
from pathlib import Path
from contextlib import contextmanager
from typing import Optional, List

DB_PATH = Path(__file__).parent / "lumi.db"


def get_conn():
    conn = sqlite3.connect(str(DB_PATH), check_same_thread=False)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA foreign_keys=ON")
    return conn


@contextmanager
def db():
    conn = get_conn()
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


def init_db():
    with db() as conn:
        conn.executescript("""
        CREATE TABLE IF NOT EXISTS conversations (
            id TEXT PRIMARY KEY,
            title TEXT NOT NULL DEFAULT 'New Chat',
            created_at REAL NOT NULL,
            updated_at REAL NOT NULL
        );

        CREATE TABLE IF NOT EXISTS messages (
            id TEXT PRIMARY KEY,
            conversation_id TEXT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
            role TEXT NOT NULL CHECK(role IN ('user', 'assistant')),
            content TEXT NOT NULL,
            timestamp REAL NOT NULL,
            is_error INTEGER NOT NULL DEFAULT 0
        );
        """)


# ── Conversations ──────────────────────────────────────────────────────────────

def create_conversation(title: str = "New Chat") -> str:
    conv_id = str(uuid.uuid4())
    now = time.time() * 1000
    with db() as conn:
        conn.execute(
            "INSERT INTO conversations (id, title, created_at, updated_at) VALUES (?,?,?,?)",
            (conv_id, title, now, now),
        )
    return conv_id


def update_conversation_title(conv_id: str, title: str):
    now = time.time() * 1000
    with db() as conn:
        conn.execute(
            "UPDATE conversations SET title=?, updated_at=? WHERE id=?",
            (title, now, conv_id),
        )


def touch_conversation(conv_id: str):
    now = time.time() * 1000
    with db() as conn:
        conn.execute("UPDATE conversations SET updated_at=? WHERE id=?", (now, conv_id))


def get_conversations() -> List[dict]:
    with db() as conn:
        rows = conn.execute(
            "SELECT * FROM conversations ORDER BY updated_at DESC"
        ).fetchall()
    return [dict(r) for r in rows]


def get_conversation(conv_id: str) -> Optional[dict]:
    with db() as conn:
        row = conn.execute("SELECT * FROM conversations WHERE id=?", (conv_id,)).fetchone()
    return dict(row) if row else None


def delete_conversation(conv_id: str):
    with db() as conn:
        conn.execute("DELETE FROM conversations WHERE id=?", (conv_id,))


# ── Messages ───────────────────────────────────────────────────────────────────

def add_message(conv_id: str, role: str, content: str, is_error: bool = False) -> dict:
    msg_id = str(uuid.uuid4())
    now = time.time() * 1000
    with db() as conn:
        conn.execute(
            "INSERT INTO messages (id, conversation_id, role, content, timestamp, is_error) VALUES (?,?,?,?,?,?)",
            (msg_id, conv_id, role, content, now, int(is_error)),
        )
    touch_conversation(conv_id)
    return {"id": msg_id, "role": role, "content": content, "timestamp": now, "isError": is_error}


def get_messages(conv_id: str) -> List[dict]:
    with db() as conn:
        rows = conn.execute(
            "SELECT * FROM messages WHERE conversation_id=? ORDER BY timestamp ASC",
            (conv_id,),
        ).fetchall()
    return [
        {
            "id": r["id"],
            "role": r["role"],
            "content": r["content"],
            "timestamp": r["timestamp"],
            "isError": bool(r["is_error"]),
        }
        for r in rows
    ]
