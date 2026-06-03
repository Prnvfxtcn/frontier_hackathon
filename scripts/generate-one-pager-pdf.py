#!/usr/bin/env python3
"""Generate AEGIS_ONE_PAGER.pdf."""

from pathlib import Path
from fpdf import FPDF

OUT = Path(__file__).resolve().parent.parent / "AEGIS_ONE_PAGER.pdf"


def build_pdf() -> None:
    pdf = FPDF()
    pdf.set_auto_page_break(auto=True, margin=12)
    pdf.add_page()
    pdf.set_margins(14, 14, 14)

    w = pdf.w - pdf.l_margin - pdf.r_margin

    pdf.set_font("Helvetica", "B", 22)
    pdf.set_text_color(15, 118, 110)
    pdf.cell(w, 10, "Aegis", new_x="LMARGIN", new_y="NEXT")

    pdf.set_font("Helvetica", "", 11)
    pdf.set_text_color(30, 41, 59)
    pdf.multi_cell(
        w,
        6,
        "Privacy-Preserving Clinical AI with Cryptographic Consent\n"
        "and Verifiable Proof-of-Inference",
    )
    pdf.set_font("Helvetica", "I", 9)
    pdf.set_text_color(100, 116, 139)
    pdf.multi_cell(
        w,
        5,
        "Frontier Technology Hackathon 2026  |  Healthcare Assets Track  |  Base Sepolia",
    )
    pdf.ln(4)

    sections = [
        (
            "The Problem",
            "Healthcare AI is extractive by default: patients cannot see who accessed their data, "
            "under what authorization, or with what model. Outputs may hallucinate with no way to "
            "verify fidelity. There is no tamper-proof audit trail or per-use accountability.",
        ),
        (
            "Our Solution",
            "Aegis combines local AI inference with on-chain consent, provenance, and settlement. "
            "AI runs on the document locally; only hashes and metadata go on-chain (never raw PHI). "
            "Each admissible extraction mints a Proof-of-Inference receipt, settled per use in stablecoin.",
        ),
        (
            "How It Works",
            None,
        ),
        (
            "End Product",
            None,
        ),
        (
            "Why AI + Blockchain Together",
            "Removing AI leaves a dead consent registry with no extraction utility. Removing blockchain "
            "makes outputs unprovable with no audit trail or settlement. Both halves are essential.",
        ),
        (
            "Privacy and Hackathon Fit",
            None,
        ),
        (
            "One-Sentence Summary",
            "Aegis gives patients cryptographic control over clinical AI access, runs extraction locally "
            "with measurable anti-hallucination grounding, and leaves a publicly verifiable on-chain "
            "receipt and payment record for every authorized inference - without putting patient data on the blockchain.",
        ),
    ]

    bullets = {
        "How It Works": [
            "Patient grants scoped consent on-chain",
            "Provider runs local AI extraction (consent required)",
            "Coherence / grounding gate blocks low-quality outputs",
            "Receipt minted on-chain + payment settled",
            "Anyone verifies the receipt (no wallet required)",
            "Patient audits all access in a transparent log",
        ],
        "End Product": [
            "Web App (Next.js): Patient, Provider, Verify, Reconciliation, Showcase",
            "AI Service (FastAPI + Ollama): extraction, Five Rigors grounding, coherence score",
            "Smart Contracts (Foundry / Base Sepolia): consent, receipts, settlement, MockUSDC",
            "CLI Verifier: same cryptographic checks as the public verify page",
        ],
        "Privacy and Hackathon Fit": [
            "No PHI on-chain - hashes, Merkle roots, and metadata only",
            "Track: Healthcare Assets (privacy-preserving health data infrastructure)",
            "Multiplier: HB 2080 payment readiness (per-inference settlement + reconciliation)",
            "Multiplier: Coherence Research / SC-AS (Five Rigors anti-hallucination framework)",
            "Co-sponsors: Stand With Crypto Missouri + MOMENT frontier technology mission",
        ],
    }

    for title, body in sections:
        pdf.set_font("Helvetica", "B", 11)
        pdf.set_text_color(15, 118, 110)
        pdf.cell(w, 7, title, new_x="LMARGIN", new_y="NEXT")
        pdf.set_font("Helvetica", "", 9)
        pdf.set_text_color(15, 23, 42)
        if body:
            pdf.multi_cell(w, 4.8, body)
        else:
            for item in bullets[title]:
                pdf.multi_cell(w, 4.8, f"- {item}")
        pdf.ln(2)

    pdf.set_font("Helvetica", "I", 8)
    pdf.set_text_color(100, 116, 139)
    pdf.multi_cell(
        w,
        4,
        "Tech stack: Next.js, FastAPI, Ollama, Solidity, Base Sepolia. "
        "See SPEC.md and README.md in the project repository for full technical detail.",
    )

    pdf.output(str(OUT))
    print(f"Wrote {OUT}")


if __name__ == "__main__":
    build_pdf()
