"""CLI Evaluation Runner for Pre-trained Machine Translation System (Clover Academic NLP Project).

Usage:
    python evaluate.py [--source en] [--target hi] [--samples 20]
"""

import argparse
import json
import sys
import os

# Ensure UTF-8 stdout encoding on Windows
if sys.stdout.encoding.lower() != "utf-8":
    sys.stdout.reconfigure(encoding="utf-8")

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from evaluation_service import evaluation_service


def main():
    parser = argparse.ArgumentParser(description="Evaluate MarianMT Translation System on Held-Out Test Set")
    parser.add_argument("--source", type=str, default="en", help="Source language code (e.g., en, hi)")
    parser.add_argument("--target", type=str, default="hi", help="Target language code (e.g., hi, en)")
    parser.add_argument("--samples", type=int, default=None, help="Number of samples to evaluate (default: all)")
    parser.add_argument("--json", action="store_true", help="Output raw JSON report")
    args = parser.parse_args()

    print("=" * 70)
    print("CLOVER ACADEMIC NLP PROJECT — NEURAL MACHINE TRANSLATION EVALUATION")
    print("=" * 70)
    print(f"Direction       : {args.source.upper()} -> {args.target.upper()}")
    print("Pre-trained MT  : Hugging Face MarianMT Transformer Architecture")
    print(f"Metrics         : Corpus BLEU (SacreBLEU) & Corpus chrF (Character n-gram F-score)")
    print("-" * 70)
    print("Executing transformer inference across held-out test dataset...")

    report = evaluation_service.run_evaluation(
        source_lang=args.source,
        target_lang=args.target,
        sample_limit=args.samples,
    )

    if args.json:
        print(json.dumps(report, indent=2, ensure_ascii=False))
        return

    bleu = report["metrics"]["corpus_bleu"]["score"]
    chrf = report["metrics"]["corpus_chrf"]["score"]
    bp = report["metrics"]["corpus_bleu"]["details"]["brevity_penalty"]

    print("\nBENCHMARK RESULTS:")
    print(f"  • Model Identifier       : {report['model_identifier']}")
    print(f"  • Test Dataset           : {report['dataset_name']}")
    print(f"  • Test Sample Count      : {report['sample_count']} parallel sentence pairs")
    print(f"  • Total Inference Time   : {report['total_evaluation_time_seconds']} s")
    print(f"  • Average Latency        : {report['average_latency_ms']} ms / sentence")
    print(f"  • Corpus BLEU Score      : {bleu} / 100.0 (Brevity Penalty: {bp})")
    print(f"  • Corpus chrF Score      : {chrf} / 100.0 (Char order 6, beta 2.0)")

    print("\nSAMPLE TRANSLATIONS & ERROR REVIEW:")
    print("-" * 70)
    for sample in report["sample_results"][:5]:
        print(f"[{sample['id']}] Domain: {sample['domain']}")
        print(f"  Source     : {sample['source']}")
        print(f"  Reference  : {sample['reference']}")
        print(f"  Hypothesis : {sample['hypothesis']}")
        print(f"  Sent BLEU  : {sample['sentence_bleu']} | Sent chrF: {sample['sentence_chrf']}")
        print()

    print("=" * 70)
    print("ACADEMIC DISCUSSION & LIMITATIONS:")
    print("Strengths:")
    for s in report["academic_discussion"]["strengths"]:
        print(f"  + {s}")
    print("\nLimitations & Error Analysis:")
    for lim in report["academic_discussion"]["limitations"]:
        print(f"  - {lim}")
    print("=" * 70)


if __name__ == "__main__":
    main()
