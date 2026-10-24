import logging
import time
from typing import Dict, List, Optional, Tuple
import torch
from transformers import MarianMTModel, MarianTokenizer

logger = logging.getLogger("clover.translation")

# Mapping of supported language pairs to their pre-trained transformer model identifiers
SUPPORTED_PAIRS: Dict[Tuple[str, str], str] = {
    ("en", "hi"): "Helsinki-NLP/opus-mt-en-hi",
    ("hi", "en"): "Helsinki-NLP/opus-mt-hi-en",
}

LANGUAGE_NAMES: Dict[str, str] = {
    "en": "English",
    "hi": "Hindi (हिंदी)",
}


class TranslationError(Exception):
    """Custom exception for translation pipeline failures."""
    pass


class UnsupportedLanguagePairError(TranslationError):
    """Raised when an unsupported language pair is requested."""
    pass


class EmptyInputError(TranslationError):
    """Raised when empty or whitespace-only text is submitted."""
    pass


class TranslationService:
    """Singleton service for neural machine translation using pre-trained MarianMT transformers.
    
    Features:
    - Lazy model loading (models are loaded into memory on first request, avoiding slow startups)
    - Bidirectional English <-> Hindi translation using dedicated Hugging Face transformer models
    - CPU/CUDA inference optimization with torch.no_grad()
    - Detailed inference latency and token metrics reporting
    """

    _instance: Optional["TranslationService"] = None

    def __new__(cls) -> "TranslationService":
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._instance._models: Dict[str, MarianMTModel] = {}
            cls._instance._tokenizers: Dict[str, MarianTokenizer] = {}
            cls._instance._device = "cuda" if torch.cuda.is_available() else "cpu"
            logger.info("Initialized TranslationService using device: %s", cls._instance._device)
        return cls._instance

    @property
    def device(self) -> str:
        return self._device

    def is_pair_supported(self, source_lang: str, target_lang: str) -> bool:
        src = source_lang.strip().lower()
        tgt = target_lang.strip().lower()
        return (src, tgt) in SUPPORTED_PAIRS

    def get_supported_pairs(self) -> List[dict]:
        return [
            {
                "source": src,
                "source_name": LANGUAGE_NAMES.get(src, src),
                "target": tgt,
                "target_name": LANGUAGE_NAMES.get(tgt, tgt),
                "model": model_name,
                "loaded": model_name in self._models,
            }
            for (src, tgt), model_name in SUPPORTED_PAIRS.items()
        ]

    def _get_model_and_tokenizer(self, model_name: str) -> Tuple[MarianMTModel, MarianTokenizer]:
        """Load or retrieve cached model and tokenizer."""
        if model_name not in self._models:
            logger.info("Loading pre-trained transformer model: %s on %s...", model_name, self._device)
            try:
                tokenizer = MarianTokenizer.from_pretrained(model_name)
                model = MarianMTModel.from_pretrained(model_name).to(self._device)
                model.eval()
                self._tokenizers[model_name] = tokenizer
                self._models[model_name] = model
                logger.info("Successfully loaded and cached model: %s", model_name)
            except Exception as e:
                logger.error("Failed to load pre-trained transformer '%s': %s", model_name, e, exc_info=True)
                raise TranslationError(
                    f"Unable to load transformer model '{model_name}'. "
                    f"Verify internet connectivity or model checkpoint: {str(e)}"
                ) from e

        return self._models[model_name], self._tokenizers[model_name]

    def translate(
        self,
        text: str,
        source_lang: str,
        target_lang: str,
        max_length: int = 512,
        num_beams: int = 4,
    ) -> dict:
        """Translate text from source_lang to target_lang using a dedicated pre-trained transformer."""
        if not text or not text.strip():
            raise EmptyInputError("Text to translate cannot be empty.")

        src = source_lang.strip().lower()
        tgt = target_lang.strip().lower()
        pair = (src, tgt)

        if pair not in SUPPORTED_PAIRS:
            supported = [f"{s} -> {t}" for s, t in SUPPORTED_PAIRS.keys()]
            raise UnsupportedLanguagePairError(
                f"Language pair '{source_lang} -> {target_lang}' is not supported. "
                f"Supported pairs: {', '.join(supported)}"
            )

        model_name = SUPPORTED_PAIRS[pair]
        model, tokenizer = self._get_model_and_tokenizer(model_name)

        clean_text = text.strip()
        start_time = time.perf_counter()

        try:
            # Tokenize input text
            inputs = tokenizer(
                [clean_text],
                return_tensors="pt",
                padding=True,
                truncation=True,
                max_length=max_length,
            ).to(self._device)

            input_tokens_count = int(inputs["input_ids"].shape[1])

            # Generate translation using beam search
            with torch.no_grad():
                generated_tokens = model.generate(
                    **inputs,
                    num_beams=num_beams,
                    max_length=max_length,
                    early_stopping=True,
                )

            output_tokens_count = int(generated_tokens.shape[1])
            translated_text = tokenizer.decode(generated_tokens[0], skip_special_tokens=True)
            latency_ms = round((time.perf_counter() - start_time) * 1000, 2)

            return {
                "source_text": clean_text,
                "translated_text": translated_text,
                "source_lang": src,
                "source_lang_name": LANGUAGE_NAMES.get(src, src),
                "target_lang": tgt,
                "target_lang_name": LANGUAGE_NAMES.get(tgt, tgt),
                "model_name": model_name,
                "device": self._device,
                "latency_ms": latency_ms,
                "input_token_count": input_tokens_count,
                "output_token_count": output_tokens_count,
            }
        except Exception as e:
            logger.error("Error during transformer translation: %s", e, exc_info=True)
            raise TranslationError(f"Transformer inference failed: {str(e)}") from e


# Global singleton instance
translation_service = TranslationService()
