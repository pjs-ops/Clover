import pytest
from fastapi.testclient import TestClient
import main
from translation_service import (
    translation_service,
    EmptyInputError,
    UnsupportedLanguagePairError,
)
from evaluation_service import evaluation_service

client = TestClient(main.app)


def test_translation_models_endpoint():
    """Verify /api/translation/models returns supported language pairs and runtime device."""
    resp = client.get("/api/translation/models")
    assert resp.status_code == 200
    data = resp.json()
    assert "supported_pairs" in data
    assert "device" in data
    pairs = data["supported_pairs"]
    assert len(pairs) >= 2
    # Verify EN->HI and HI->EN pairs exist
    en_hi = next((p for p in pairs if p["source"] == "en" and p["target"] == "hi"), None)
    assert en_hi is not None
    assert en_hi["model"] == "Helsinki-NLP/opus-mt-en-hi"
    hi_en = next((p for p in pairs if p["source"] == "hi" and p["target"] == "en"), None)
    assert hi_en is not None
    assert hi_en["model"] == "Helsinki-NLP/opus-mt-hi-en"


def test_translate_english_to_hindi():
    """Verify neural translation from English to Hindi using MarianMT transformer."""
    payload = {
        "text": "Artificial intelligence is helpful for students.",
        "source_lang": "en",
        "target_lang": "hi",
    }
    resp = client.post("/api/translation/translate", json=payload)
    assert resp.status_code == 200
    data = resp.json()
    assert data["source_lang"] == "en"
    assert data["target_lang"] == "hi"
    assert len(data["translated_text"].strip()) > 0
    assert data["model_name"] == "Helsinki-NLP/opus-mt-en-hi"
    assert data["latency_ms"] > 0
    assert data["input_token_count"] > 0
    assert data["output_token_count"] > 0


def test_translate_hindi_to_english():
    """Verify neural translation from Hindi to English."""
    payload = {
        "text": "विश्वविद्यालय का पुस्तकालय बहुत बड़ा है।",
        "source_lang": "hi",
        "target_lang": "en",
    }
    resp = client.post("/api/translation/translate", json=payload)
    assert resp.status_code == 200
    data = resp.json()
    assert data["source_lang"] == "hi"
    assert data["target_lang"] == "en"
    assert len(data["translated_text"].strip()) > 0
    assert data["model_name"] == "Helsinki-NLP/opus-mt-hi-en"
    assert "library" in data["translated_text"].lower() or "university" in data["translated_text"].lower()


def test_translate_empty_input_validation():
    """Verify empty or whitespace-only inputs are rejected with 422/400 validation error."""
    resp1 = client.post("/api/translation/translate", json={"text": "", "source_lang": "en", "target_lang": "hi"})
    assert resp1.status_code == 422 or resp1.status_code == 400

    resp2 = client.post("/api/translation/translate", json={"text": "   ", "source_lang": "en", "target_lang": "hi"})
    assert resp2.status_code == 422 or resp2.status_code == 400


def test_translate_unsupported_language_pair():
    """Verify unsupported language pair returns a clear error."""
    payload = {
        "text": "Hello world",
        "source_lang": "en",
        "target_lang": "fr",  # French not in initial en<->hi scope
    }
    resp = client.post("/api/translation/translate", json=payload)
    assert resp.status_code == 400
    assert "not supported" in resp.json()["detail"].lower()


def test_evaluation_service_metrics():
    """Verify evaluation runs on held-out dataset and computes valid BLEU & chrF scores."""
    report = evaluation_service.run_evaluation("en", "hi", sample_limit=5)
    assert report["sample_count"] == 5
    assert report["model_identifier"] == "Helsinki-NLP/opus-mt-en-hi"
    bleu = report["metrics"]["corpus_bleu"]["score"]
    chrf = report["metrics"]["corpus_chrf"]["score"]
    assert isinstance(bleu, (int, float))
    assert bleu >= 0
    assert isinstance(chrf, (int, float))
    assert chrf >= 0
    assert len(report["sample_results"]) == 5
    assert "academic_discussion" in report


def test_evaluation_endpoint():
    """Verify /api/translation/evaluate endpoint executes and returns structured benchmark metrics."""
    resp = client.post("/api/translation/evaluate", json={"source_lang": "en", "target_lang": "hi", "sample_limit": 3})
    assert resp.status_code == 200
    data = resp.json()
    assert data["sample_count"] == 3
    assert "metrics" in data
    assert "corpus_bleu" in data["metrics"]
    assert "corpus_chrf" in data["metrics"]
    assert "sample_results" in data
