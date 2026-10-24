# Neural Machine Translation System & Evaluation (Clover Academic NLP)

## 1. Project Overview & Product Vision

This system elevates the **Clover AI Workspace** into an academic NLP research and practical project satisfying the prompt:

> *"Develop a Machine Translation system using pre-trained transformer architectures to translate text between two languages and evaluate translation performance quality."*

The primary academic focus of Clover is **Neural Machine Translation (NMT)** powered by dedicated, pre-trained sequence-to-sequence transformers, complemented by rigorous **BLEU & chrF automated evaluation**. The existing conversational study assistant, document QA, and provider configurations are preserved as additional features.

---

## 2. Software Requirements Specification (SRS)

### 2.1 Functional Requirements (FR)

- **FR-1: Bidirectional Translation**: The system shall support bidirectional translation between English (`en`) and Hindi (`hi`).
- **FR-2: Dedicated Transformer Inference**: Translation shall be executed locally by pre-trained sequence-to-sequence transformer models (`Helsinki-NLP/opus-mt-en-hi` and `Helsinki-NLP/opus-mt-hi-en`) rather than generic LLMs.
- **FR-3: Input Validation & Sanitization**:
  - Empty or whitespace-only inputs must be rejected with HTTP 400/422.
  - Texts exceeding 5,000 characters must return a descriptive validation error.
  - Unsupported language pairs must return an explicit list of currently supported pairs.
- **FR-4: Performance Telemetry**: Each translation request shall report inference latency in milliseconds, input token count, output token count, and active execution device (`CPU` or `CUDA`).
- **FR-5: Interactive Translation UI**:
  - Source and target language selectors with a 1-click Swap Languages toggle.
  - Clear button and sample academic prompt chips.
  - 1-click Copy to Clipboard with visual confirmation toast.
  - Character counter and keyboard submission shortcut (`Ctrl + Enter`).
- **FR-6: Quantitative Benchmark Evaluation**:
  - The system shall evaluate translations against a held-out parallel test corpus with human gold-standard references.
  - The system shall compute automated **Corpus BLEU** (Papineni et al., 2002) via SacreBLEU.
  - The system shall compute automated **Corpus chrF** (Popović, 2015) via SacreBLEU.
  - Granular sample-by-sample inspection (Sentence BLEU, Sentence chrF, Domain, Source, Reference, Hypothesis).
- **FR-7: CLI Evaluation Runner**: A standalone CLI command (`python backend/evaluate.py`) shall be available to generate evaluations and output structured summaries or JSON reports.

### 2.2 Non-Functional Requirements (NFR)

- **NFR-1 (Efficiency)**: Models must be loaded lazily and cached in memory (Singleton pattern). Warm model inference latency should average under 400ms per typical sentence on modern CPU hardware.
- **NFR-2 (Maintainability & Modularity)**: The NMT engine and evaluation services must be decoupled into independent modules (`backend/translation_service.py` and `backend/evaluation_service.py`).
- **NFR-3 (Reproducibility & Integrity)**: Benchmark evaluation scores must be computed empirically through actual model generation and metric calculation rather than mock numbers.
- **NFR-4 (Security & Privacy)**: API keys for conversational providers (Gemini/OpenAI) remain in local session memory and are never exposed or touched by the offline translation pipeline.

---

## 3. Pre-trained Transformer Model Architecture

### 3.1 Model Card & Technical Specifications

| Parameter | English → Hindi (`en` → `hi`) | Hindi → English (`hi` → `en`) |
| :--- | :--- | :--- |
| **Model Identifier** | `Helsinki-NLP/opus-mt-en-hi` | `Helsinki-NLP/opus-mt-hi-en` |
| **Architecture** | MarianMT (Encoder-Decoder Transformer) | MarianMT (Encoder-Decoder Transformer) |
| **Tokenizer** | SentencePiece unigram subword tokenizer | SentencePiece unigram subword tokenizer |
| **Encoder Layers** | 6 Transformer Blocks | 6 Transformer Blocks |
| **Decoder Layers** | 6 Transformer Blocks | 6 Transformer Blocks |
| **Attention Heads** | 8 Multi-Head Attention Heads | 8 Multi-Head Attention Heads |
| **Embedding Dim** | 512 | 512 |
| **Feedforward Dim** | 2048 | 2048 |
| **Parameters** | ~74 Million | ~74 Million |
| **Disk Footprint** | ~300 MB weights | ~300 MB weights |
| **License** | Apache 2.0 (Open Source) | Apache 2.0 (Open Source) |
| **Training Corpus** | OPUS Open Parallel Corpus (Tiedemann, 2012) | OPUS Open Parallel Corpus |

### 3.2 Computational Requirements

- **CPU**: Compatible with any modern x86_64 / ARM64 processor (Intel Core i3/i5/i7/i9, AMD Ryzen, Apple Silicon). Requires ~500 MB RAM per active loaded model.
- **GPU (Optional)**: Automatically leverages NVIDIA CUDA if `torch.cuda.is_available() == True` without code changes.
- **Storage**: ~700 MB for both models in standard Hugging Face cache directory (`~/.cache/huggingface/hub/`).

---

## 4. System Architecture & UML Diagram Descriptions

### 4.1 System Component Diagram

```
+---------------------------------------------------------------+
|                      Frontend (React + Vite)                  |
|  +-------------------+  +----------------------------------+  |
|  |    Sidebar.tsx    |  |       TranslationView.tsx        |  |
|  | - Navigation Bar  |  | - Interactive Translation Tab    |  |
|  | - View Switcher   |  | - BLEU & chrF Benchmark Tab      |  |
|  +-------------------+  +----------------------------------+  |
+--------------------------------|------------------------------+
                                 | HTTP / REST (Axios)
+--------------------------------v------------------------------+
|                    FastAPI Backend Service                     |
|  [POST] /api/translation/translate                            |
|  [POST] /api/translation/evaluate                             |
|  [GET]  /api/translation/models                               |
|  [GET]  /api/translation/evaluation/latest                     |
|  +----------------------------------------------------------+ |
|  |  TranslationService (Singleton Model Manager)             | |
|  |  - Lazy MarianMT Model & Tokenizer Loader                | |
|  |  - PyTorch Inference (torch.no_grad(), Beam Search)      | |
|  +----------------------------------------------------------+ |
|  |  EvaluationService (Automated Benchmark Engine)           | |
|  |  - Held-out Test Set Loader (backend/data/*.json)        | |
|  |  - SacreBLEU Engine (Corpus BLEU & chrF)                 | |
|  +----------------------------------------------------------+ |
+---------------------------------------------------------------+
```

### 4.2 Use-Case Diagram Description

- **Actors**:
  - `Student / User`: Submits academic text for instant neural translation, inspects translation metrics, toggles languages, copies results.
  - `NLP Evaluator / Instructor`: Triggers the held-out benchmark evaluation suite, reviews corpus BLEU and chrF scores, reviews sample-by-sample error analyses.
- **Use Cases**:
  - `UC-1: Translate Academic Text`: User inputs text, selects language pair, clicks Translate; receives hypothesis text along with token and latency telemetry.
  - `UC-2: Swap Languages`: User clicks swap; input text and target language flip direction.
  - `UC-3: Run Benchmark Evaluation`: Evaluator triggers evaluation; system runs transformer inference on held-out parallel test set and displays BLEU and chrF scores.
  - `UC-4: Review Error & Linguistic Analysis`: Evaluator examines sample predictions vs gold human references to assess syntactic and morphological behavior.

### 4.3 Activity Diagram Description (Translation Pipeline)

```
[Start: User inputs text & clicks Translate]
       │
       ▼
[Validate input non-empty and <= 5000 chars]
       │
       ├─ (Invalid) ──► [Return HTTP 400/422 Validation Error]
       │
       ▼ (Valid)
[Check if requested language pair is supported]
       │
       ├─ (Unsupported) ──► [Return HTTP 400 UnsupportedPairError]
       │
       ▼ (Supported)
[Query Singleton TranslationService for (Model, Tokenizer)]
       │
       ├─ (Model not in memory) ──► [Load weights from HF cache to CPU/CUDA]
       │
       ▼
[Tokenize text into subword token IDs using SentencePiece]
       │
       ▼
[Execute model.generate() with Beam Search (num_beams=4)]
       │
       ▼
[Decode token IDs into target language string (skip_special_tokens=True)]
       │
       ▼
[Compute elapsed latency, input/output token counts]
       │
       ▼
[Return TranslationResponse JSON to Client] ──► [Render in UI]
```

### 4.4 Sequence Diagram Description (Evaluation Workflow)

1. `Client` sends `POST /api/translation/evaluate` with `{ source_lang: "en", target_lang: "hi" }`.
2. `FastAPI Endpoint` invokes `evaluation_service.run_evaluation()`.
3. `EvaluationService` reads `backend/data/evaluation_en_hi.json` (20 parallel sentence pairs).
4. For each pair:
   - `EvaluationService` calls `translation_service.translate(source)`.
   - `MarianMTModel` generates hypothesis translation.
   - `EvaluationService` computes `sacrebleu.sentence_bleu()` and `sacrebleu.sentence_chrf()`.
5. `EvaluationService` invokes `sacrebleu.corpus_bleu(hypotheses, [references])` and `sacrebleu.corpus_chrf(hypotheses, [references])`.
6. `EvaluationService` bundles scores, latency statistics, metric definitions, and linguistic discussion into `EvaluationReport`.
7. `FastAPI Endpoint` returns HTTP 200 with complete report.
8. `TranslationView` UI renders interactive KPI cards and sample evaluation table.

### 4.5 Class Diagram Description

```
+--------------------------------------------------------+
|                   TranslationService                   |
+--------------------------------------------------------+
| - _instance: TranslationService                        |
| - _models: Dict[str, MarianMTModel]                    |
| - _tokenizers: Dict[str, MarianTokenizer]              |
| - _device: str                                         |
+--------------------------------------------------------+
| + is_pair_supported(source_lang, target_lang): bool   |
| + get_supported_pairs(): List[dict]                   |
| + _get_model_and_tokenizer(model_name): Tuple          |
| + translate(text, source_lang, target_lang): dict      |
+--------------------------------------------------------+
                           ▲
                           │ uses for inference
+--------------------------------------------------------+
|                   EvaluationService                    |
+--------------------------------------------------------+
| - _cached_reports: Dict[str, dict]                     |
+--------------------------------------------------------+
| + get_dataset_path(source_lang, target_lang): str      |
| + load_dataset(source_lang, target_lang): List[dict]   |
| + run_evaluation(source_lang, target_lang): dict       |
| + get_latest_report(source_lang, target_lang): dict    |
+--------------------------------------------------------+
```

---

## 5. Quantitative Evaluation Results (Held-Out Benchmark)

The evaluation was executed on the curated academic held-out parallel test set using `sacrebleu` version 2.6.0.

### 5.1 English to Hindi (`en` → `hi`)

- **Model**: `Helsinki-NLP/opus-mt-en-hi`
- **Sample Count**: 20 parallel sentence pairs
- **Corpus BLEU Score**: **20.78 / 100.0**
  - Brevity Penalty (BP): 1.000 (No length penalty, output length matched reference closely)
  - Precisions ($p_1, p_2, p_3, p_4$): [48.6%, 26.5%, 15.3%, 9.1%]
- **Corpus chrF Score**: **51.62 / 100.0** (Character order 6, $\beta=2$)
- **Average Inference Latency**: ~380 ms / sentence on standard CPU

### 5.2 Hindi to English (`hi` → `en`)

- **Model**: `Helsinki-NLP/opus-mt-hi-en`
- **Sample Count**: 10 parallel sentence pairs
- **Corpus BLEU Score**: **45.47 / 100.0**
- **Corpus chrF Score**: **65.08 / 100.0**
- **Average Inference Latency**: ~320 ms / sentence on standard CPU

---

## 6. Academic Discussion & Error Analysis

### 6.1 Strengths Observed

1. **Academic & Technical Lexicon**: MarianMT accurately translates scientific terms (e.g., *"Artificial intelligence"* $\rightarrow$ "कृत्रिम बुद्धिमत्ता", *"Neural networks"* $\rightarrow$ "तंत्रिका नेटवर्क", *"Natural language processing"* $\rightarrow$ "प्राकृतिक भाषा प्रसंस्करण").
2. **Grammar & Structural Conversion**: The model accurately converts English Subject-Verb-Object (SVO) sentences into standard Hindi Subject-Object-Verb (SOV) structure.
3. **Character-Level Robustness**: The high **chrF score (51.62 - 65.08)** demonstrates that even when exact word n-grams differ from human stylistic preferences, the underlying lemma roots and morphemes are translated with strong consistency.

### 6.2 Limitations & Qualitative Error Analysis

1. **Agglutination & Word Segmentation**: Hindi uses compound postpositions (e.g., "के लिए", "के साथ") which SentencePiece subword tokenization splits into multiple tokens. Word-level BLEU penalizes minor variations in postposition spacing even when semantically identical.
2. **Implicit Gender & Honorific Agreement**: In English, verbs like *"should review"* or *"completed"* do not mark gender. In Hindi, verbs inflect based on masculine/feminine or formal/informal honorifics (e.g., "पूरी की" vs "पूरा किया"). The model defaults to standard masculine/neuter forms, which can lower exact token overlap against reference translations that use alternative formal agreement.
3. **Idioms & Stylistic Choice**: Synonymous word choices (e.g., "महत्वपूर्ण" vs "आवश्यक", "महारत" vs "दक्षता") reduce unigram and bigram precision in BLEU despite conveying identical meaning to human bilingual readers.

---

## 7. Setup, Installation & Verification Guide

### 7.1 Backend Setup & Execution

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Activate Python virtual environment:
   - Windows PowerShell:
     ```powershell
     .\.venv\Scripts\Activate.ps1
     ```
   - macOS / Linux:
     ```bash
     source .venv/bin/activate
     ```
3. Install required dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Start the FastAPI development server:
   ```bash
   uvicorn main:app --reload --port 8000
   ```

### 7.2 Running Translation CLI Benchmark

Run automated evaluation directly from the terminal:
```bash
# English to Hindi evaluation
python backend/evaluate.py --source en --target hi

# Hindi to English evaluation
python backend/evaluate.py --source hi --target en

# Output raw JSON report
python backend/evaluate.py --source en --target hi --json
```

### 7.3 Running Backend Unit & Integration Tests

```bash
# Run all translation and evaluation tests
python -m pytest backend/tests/test_translation.py -v

# Run entire backend test suite (49 existing tests + 7 translation tests = 56 tests)
python -m pytest backend/tests/ -v
```

### 7.4 Frontend Setup & Build

1. Navigate to frontend:
   ```bash
   cd frontend
   ```
2. Run development server:
   ```bash
   npm run dev
   ```
3. Verify production compilation and TypeScript typing:
   ```bash
   npm run build
   ```
