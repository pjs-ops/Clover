from __future__ import annotations

import io
import re
from pathlib import Path
from typing import Optional


def extract_text_from_file(filename: str, content: bytes) -> str:
    """Extract text from uploaded PDF or TXT file."""
    suffix = Path(filename).suffix.lower()

    if suffix == ".txt" or suffix == ".md":
        return content.decode("utf-8", errors="replace")

    if suffix == ".pdf":
        try:
            import pypdf
            reader = pypdf.PdfReader(io.BytesIO(content))
            texts = []
            for page in reader.pages:
                t = page.extract_text()
                if t:
                    texts.append(t)
            return "\n\n".join(texts)
        except ImportError:
            # Fallback: try to extract raw text
            text = content.decode("latin-1", errors="replace")
            # Basic cleanup
            text = re.sub(r'[\x00-\x08\x0b\x0c\x0e-\x1f]', ' ', text)
            return text[:50000]
        except Exception as e:
            raise ValueError(f"Failed to parse PDF: {e}")

    raise ValueError(f"Unsupported file type: {suffix}. Use PDF, TXT, or MD.")


def truncate_document(text: str, max_chars: int = 12000) -> str:
    """Truncate document content to a safe length for context."""
    if len(text) <= max_chars:
        return text
    return text[:max_chars] + f"\n\n[Document truncated at {max_chars} characters]"
