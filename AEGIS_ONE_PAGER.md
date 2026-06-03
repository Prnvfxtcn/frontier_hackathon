# Aegis — One-Pager

**Privacy-Preserving Clinical AI with Cryptographic Consent & Verifiable Proof-of-Inference**

*Frontier Technology Hackathon 2026 · Healthcare Assets Track · Missouri / Base Sepolia*

---

## The Problem

Healthcare organizations increasingly use AI to extract structured data from clinical documents—but today’s systems are **extractive by default**:

- Patients lose visibility into **who** accessed their data, **under what authorization**, and **with what model**
- AI outputs can be **wrong or hallucinated**, with no independent way to verify fidelity to the source document
- There is **no tamper-proof audit trail** tying a specific output to a specific input, consent, and model version
- **Payment and accountability** for each use of AI on sensitive data are opaque

Centralized AI learns from people and profits from people. What’s missing is a **trust layer** that returns control and verifiability to data owners.

---

## Our Solution: Aegis

**Aegis** is an end-to-end system that combines **local AI inference** with **on-chain consent, provenance, and settlement**—so clinical AI can run under explicit patient authorization and leave a record anyone can independently verify.

> **Core idea:** Run AI locally on the document, anchor only **hashes and metadata** on-chain (never raw PHI), and mint a **Proof-of-Inference receipt** for every admissible extraction—settled per use in stablecoin.

---

## How It Works (Golden Path)

```
Patient grants scoped consent on-chain
        ↓
Provider runs local AI extraction (only if consent is valid)
        ↓
System checks grounding/coherence score (anti-hallucination gate)
        ↓
If admissible → receipt minted on-chain + payment settled
        ↓
Anyone verifies the receipt (no wallet required)
        ↓
Patient audits who accessed their data and when
```

| Role | What they do |
|------|----------------|
| **Patient** | Grant/revoke scoped consent; view access log |
| **Provider / Clinician** | Run AI extraction under consent; pay per inference; receive receipt |
| **Verifier / Auditor** | Independently verify any receipt (judges, regulators, public) |

---

## End Product (What We Deliver)

A **working MVP** with four integrated layers:

### 1. Web Application (Next.js)
- **Patient dashboard** — consent management + access audit log  
- **Provider dashboard** — document intake, local AI extraction, payment, receipts  
- **Public verify page** — itemized cryptographic checks (pass/fail)  
- **Reconciliation dashboard** — per-inference settlement history + CSV export  
- **Public showcase** — browse on-chain receipts  

### 2. Local AI Service (FastAPI + Ollama)
- Structured clinical field extraction from synthetic discharge summaries  
- **Coherence / grounding score** (0–100) with **Five Rigors** anti-hallucination checks  
- Source-span highlighting (shows which text supported each extracted field)  
- Runs locally — **clinical text never written to the blockchain**

### 3. Smart Contracts (Solidity / Foundry on Base Sepolia)
- **ConsentRegistry** — scoped, revocable patient → provider authorization  
- **InferenceRegistry** — Proof-of-Inference receipts (input/output hashes, model ID, coherence score)  
- **Settlement + MockUSDC** — per-inference payment pulled atomically when a receipt is minted  

### 4. CLI Verifier
- Command-line tool that runs the same checks as the web verify page (for auditors and demos)

---

## What Makes It “Both Halves” (AI + Blockchain)

Judges require **meaningful integration**—removing either half must break the system:

| Remove AI | Remove Blockchain |
|-----------|-------------------|
| Consent exists but **nothing processes** the record | Outputs are **unprovable**; no audit trail; no settlement |
| System is a dead registry | Entire “verifiable clinical AI” value proposition collapses |

Aegis is designed so **both components are essential**, not decorative.

---

## Privacy & Security Design

- **No PHI on-chain** — only hashes, Merkle roots, metadata, and consent references  
- **Client-side encryption** of documents (off-chain storage)  
- **Scoped consent** — provider only runs under explicit field-level authorization  
- **Coherence gate** — sub-threshold or ungrounded extractions **do not mint a receipt**  
- **Tamper demo** — changing one word in the source document breaks the input-hash verification  

---

## Hackathon Alignment

| Category | Alignment |
|----------|-----------|
| **Track** | **Healthcare Assets** — secure patient identity, privacy-preserving health data, records management |
| **HB 2080 Payment Readiness** | Per-inference stablecoin settlement + reconciliation (Missouri digital-asset policy readiness) |
| **Coherence Research (SC-AS)** | Five Rigors grounding framework; verifiable low-hallucination behavior |
| **Co-sponsors** | Stand With Crypto Missouri ecosystem (Base Sepolia); MOMENT frontier-tech mission |

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | Next.js 14, TypeScript, wagmi, MetaMask |
| AI | FastAPI, Ollama (`llama3.1:8b`), embedding-based grounding |
| Contracts | Solidity, Foundry, Base Sepolia testnet |
| Verification | viem (keccak256 canonical hashing), public RPC reads |

---

## Demo Scenario (2–3 minutes)

1. Patient grants consent to a provider wallet (scoped fields + expiry)  
2. Provider loads a synthetic discharge summary, faucets test USDC, runs inference  
3. UI shows extracted fields, coherence score, and source highlights  
4. On-chain receipt is minted; **Receipt ID** is copied from Showcase or inference page  
5. Verifier pastes receipt ID → all checks **green**  
6. Verifier edits one word in the document → input-hash check turns **red**  
7. Reconciliation shows **1 mUSDC settled** per inference  

---

## Public verification (judges)

Receipts are **publicly verifiable** on **Base Sepolia** — not on local Anvil.

1. Deploy: `./scripts/deploy-base-sepolia.sh` (fund deployer from a faucet first)
2. Seed demo: `./scripts/seed-public-demo.sh`
3. Share: `/verify?id=<receiptId>` — **Verify on-chain only** needs no wallet or AI service

See `PUBLIC_VERIFICATION.md` for the full checklist and Basescan cross-checks.

---

## Team & Contact

**Project:** Aegis  
**Event:** Frontier Technology Hackathon 2026 (Keystone Innovation District)  
**Repository:** *[Add your public GitHub URL]*  
**Live demo:** *[Add deployed URL or video link when ready]*  

---

## Summary in One Sentence

**Aegis gives patients cryptographic control over clinical AI access, runs extraction locally with measurable anti-hallucination grounding, and leaves a publicly verifiable on-chain receipt and payment record for every authorized inference—without putting patient data on the blockchain.**

---

*Document generated for internal / academic sharing. For technical detail, see `SPEC.md` and `README.md` in the project repository.*
