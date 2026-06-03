# Aegis — Product & Technical Specification

> **For the builder (Cursor):** This is the single source of truth for the Aegis MVP. Build in the order given in **§16 Build Sequence**. Get the end-to-end "walking skeleton" (§16, Milestone D) working before adding polish. Treat every **Acceptance Criteria** block as a testable definition of done. Do not introduce paid/cloud services — everything here runs on free tiers, a local model, and a free testnet (see §11 Tech Stack and §17 Non-Goals). When a decision is ambiguous, prefer the simplest option that keeps the **golden path** (§15) flawless.

---

## 1. One-paragraph summary

**Aegis** is a privacy-preserving clinical-AI primitive. A **patient** grants scoped, revocable **consent** with a wallet signature. A **provider** runs a **locally-hosted AI model** that extracts structured data from a medical document — but *only* when valid on-chain consent exists. Every inference produces a **Proof-of-Inference receipt** anchored on-chain: hashes of the input and output, the model version, a **coherence/grounding score**, and a reference to the consent — so **anyone can independently verify** that a specific output was produced from a specific input, by a specific model, under valid consent, with measured fidelity. Each inference is **settled per-use in a stablecoin**. No raw patient data ever touches the chain.

## 2. Why it exists (problem → solution)

Centralized AI extracts value from health data: patients lose control, and there is no verifiable record of what model touched what data, under what authorization, or whether the output was faithful to the source. Aegis introduces a **trust layer**: the AI runs locally (data never leaves the owner's environment), consent is cryptographic and revocable, and each inference leaves a tamper-proof, publicly verifiable provenance receipt with a quantified anti-hallucination score — plus programmable settlement.

**The both-halves invariant (must hold true):**
- Remove the **AI** → nothing processes the record; the system is a dead consent registry with no utility.
- Remove the **blockchain** → consent is unprovable, outputs are forgeable, there is no audit trail and no settlement; the entire "verifiable" value proposition collapses.

## 3. Hackathon alignment (keep these priorities)

- **Track:** Healthcare Assets (secure patient identity, records management, privacy-preserving health data).
- **Multiplier — Coherence (SC-AS):** the grounding verifier enforces *structural admissibility*; map checks to the Five Rigors (§9.3) and cite SC-AS (DOI: 10.5281/zenodo.18039635).
- **Multiplier — HB 2080 Payment Readiness:** per-inference stablecoin settlement + reconciliation (§8).
- **Multiplier — Privacy-Preserving:** no PHI on chain; hashes + Merkle commitments only (§10).
- **Chain choice:** Base Sepolia testnet (aligned with co-sponsor Stand With Crypto / Coinbase ecosystem; free).

---

## 4. Personas & roles

1. **Patient (data owner).** Connects wallet; grants/revokes consent; sees an access log of every inference run against their data.
2. **Provider / Clinician (data consumer).** Connects wallet; selects a document; runs inference under a consent; pays per inference; receives receipts.
3. **Verifier / Auditor (anyone — judge, regulator, public).** No wallet required to read; independently verifies any receipt via the web UI or a CLI script.

The UI exposes three role views selectable from a landing page. A single wallet may act as patient and provider in the demo.

## 5. Core concepts (glossary)

- **Consent Grant** — an on-chain, EIP-712-signed authorization from patient → provider, with scope, purpose, and expiry; revocable.
- **Inference Request** — a provider's request to run the local model on a document under a referenced consent.
- **Proof-of-Inference (PoI) Receipt** — the on-chain provenance record minted after a successful, paid, admissible inference.
- **Coherence Score** — 0–100 grounding metric: how well every extracted value traces to a source span. Below threshold ⇒ "not structurally admissible" ⇒ no receipt.
- **Merkle Commitment** — a Merkle root over the record's fields, enabling proof that a field exists without revealing the record.
- **Settlement** — per-inference payment in mock USDC, with reconciliation events.

---

## 6. End-to-end functional flows

### 6.1 Patient grants consent
1. Patient opens **/patient**, connects wallet, ensures network = Base Sepolia.
2. Clicks **Grant Consent**; fills the form: provider address, data scope (checkbox set of allowed field categories), purpose (enum), expiry (datetime).
3. App builds an EIP-712 typed message and prompts a wallet signature.
4. Tx writes the grant to `ConsentRegistry`; UI shows the new grant as **Active** with its `consentId`.

**Acceptance:** a grant appears on-chain; `isConsentValid(consentId, provider, scope)` returns `true`; the grant is listed under the patient's active consents.

### 6.2 Provider runs an inference (the core loop)
1. Provider opens **/provider**, connects wallet.
2. Selects a sample medical document (3–5 synthetic docs ship with the app) or pastes text.
3. App computes `inputHash`, AES-GCM-encrypts the raw doc, stores the ciphertext off-chain, and builds the field Merkle tree (root computed after extraction).
4. Provider picks the `consentId` to run under; the app pre-checks consent validity (blocks if invalid/expired/revoked or scope mismatch).
5. Provider approves the per-inference price in mock USDC, then submits.
6. The AI service `/extract` returns structured fields + per-field source spans + coherence score + Five-Rigors result.
7. If **admissible**, the app computes `outputHash` + `merkleRoot` and calls `InferenceRegistry.recordInference(...)`, which pulls payment via `Settlement` and mints the receipt in one transaction.
8. UI navigates to **/inference/[id]** showing the document with **live source-span highlights**, the animated coherence meter, the Rigors badges, and the on-chain receipt with an explorer link.

**Acceptance:** with valid consent + payment + admissible output, a receipt is minted and viewable; with invalid consent OR sub-threshold coherence OR missing payment, **no receipt is minted** and the UI explains why.

### 6.3 Anyone verifies a receipt
1. Verifier opens **/verify** (no wallet needed).
2. Enters a `receiptId` (or selects one from the public showcase) and optionally re-supplies the source document.
3. App fetches the on-chain receipt and runs an itemized check: input hash match, output hash match, consent validity at time of inference, coherence ≥ threshold, model id/version. Each check renders pass/fail; overall verdict is a single green/red banner.
4. A CLI equivalent (`pnpm verify <receiptId>`) prints the same checks for judges.

**Acceptance:** a genuine receipt verifies green end-to-end; tampering with the input doc flips the input-hash check to red.

### 6.4 Patient audits access
- **/patient** shows an **Access Log** derived from `InferenceRecorded` events filtered by patient: which provider, which document hash, when, coherence score, amount paid. Patient can revoke any active consent from here.

### 6.5 Provider reconciles payments
- **/reconciliation** lists every paid inference (receiptId, provider, amount, timestamp, status), totals, and a CSV export — fed by `PaymentSettled` events.

---

## 7. Feature catalogue (every functionality)

### 7.1 Wallet & identity
- Connect/disconnect wallet (RainbowKit).
- Network guard: detect wrong network, offer one-click switch to Base Sepolia.
- Display address (+ ENS if present) and mock-USDC balance.
- Role view switcher (Patient / Provider / Verifier).

### 7.2 Consent management
- Create consent grant (form + EIP-712 signature + tx).
- Scope selector (field categories the provider may extract).
- Purpose enum (e.g., `TREATMENT`, `BILLING`, `RESEARCH`).
- Expiry datetime.
- List consents with status: Active / Expired / Revoked.
- Revoke consent (tx).
- Programmatic validity check used as the inference gate.

### 7.3 Document intake & encryption
- Upload `.txt`/`.md`/paste, or pick a bundled sample doc.
- Client-side `inputHash = keccak256(text)`.
- Client-side AES-GCM encryption of raw text; ciphertext stored off-chain (local store or local IPFS).
- Field-level Merkle tree built from extracted fields; `merkleRoot` referenced on-chain.

### 7.4 Local AI inference
- Trigger extraction under a consent.
- Schema-constrained structured output from Ollama.
- Per-field source spans (character offsets) for grounding.
- Coherence score + Five Rigors result (§9).
- Admissibility gate (reject below threshold or on rigor failure).

### 7.5 Proof-of-Inference receipt
- Mint receipt on-chain on success (atomic with payment).
- Receipt detail page with document highlight overlay, coherence breakdown, rigor badges, model metadata, explorer link.
- Copyable `receiptId` and a shareable public link for the showcase.

### 7.6 Verification
- Public **/verify** page with itemized checks + overall verdict.
- CLI verify script.
- Tamper demonstration (changing the doc breaks the input-hash check).

### 7.7 Settlement (HB 2080)
- Mock USDC ERC-20 with a faucet/mint for the demo.
- Configurable per-inference price.
- Pay-on-record: payment pulled in the same tx that mints the receipt.
- Reconciliation dashboard + CSV export.

### 7.8 Dashboards & UX
- Patient dashboard (consents + access log).
- Provider dashboard (run inference + receipts + payments).
- Verifier/public showcase view.
- The signature visual: document viewer with animated source-span highlighting + animated coherence meter.
- Toasts, loading/empty/error states, and a **Reset Demo** button (clears local state/seed for clean runs).

---

## 8. Settlement design (HB 2080)

- `MockUSDC` — standard ERC-20 (6 decimals) with `mint(address,uint256)` open for the demo (a faucet button calls it).
- `Settlement` holds the per-inference `price` and a treasury address; exposes `quote()` and is called by `InferenceRegistry` during `recordInference` to `transferFrom(provider, treasury, price)`.
- Event `PaymentSettled(receiptId, provider, amount, timestamp)` powers reconciliation.
- Reconciliation view aggregates settled payments, shows running totals, and exports CSV.

> Atomicity: provider calls `MockUSDC.approve(settlement, price)` once, then `InferenceRegistry.recordInference(...)` performs payment + receipt mint in one transaction so a receipt can never exist without a settled payment.

---

## 9. AI service specification

### 9.1 Runtime
- Python 3.11 + FastAPI + Uvicorn.
- Ollama running locally; default model `llama3.1:8b` (fallback `qwen2.5:7b`); embeddings via `nomic-embed-text`.
- Stateless service; no external API calls; configured via env (§13).

### 9.2 Endpoints

`GET /health` → `{ "status": "ok", "model": "llama3.1:8b" }`

`GET /models` → list available local models.

`POST /extract`
```jsonc
// request
{
  "documentText": "…full clinical document text…",
  "schema": ["patientName","dob","diagnosis","medications","allergies","followUp"],
  "consentId": "0x…",            // for logging/echo only; gate is enforced on-chain/client
  "modelId": "llama3.1:8b"
}
// response
{
  "fields": [
    { "key": "diagnosis", "value": "Type 2 Diabetes Mellitus",
      "sourceSpan": { "start": 412, "end": 437 }, "grounding": 0.98 }
    // …one per schema key; missing fields returned with value:null, grounding:0
  ],
  "coherenceScore": 94,           // 0–100, aggregate grounding
  "rigors": { "fidelity": true, "conservation": true, "austerity": true, "coherence": true },
  "admissible": true,             // all rigors pass AND coherenceScore >= threshold
  "modelId": "llama3.1:8b",
  "modelVersion": "sha256:…",     // ollama model digest
  "promptHash": "0x…",            // keccak256 of the exact prompt template+inputs
  "inputHash": "0x…",             // keccak256(documentText)
  "outputHash": "0x…"             // keccak256(canonical-json(fields))
}
```

### 9.3 Coherence scoring & Five Rigors (the Coherence multiplier)

For each extracted field, locate `value` in `documentText`:
1. exact/normalized substring match → grounding 1.0;
2. else fuzzy match (token overlap) → partial;
3. else embedding cosine similarity of `value` vs. best-matching window via `nomic-embed-text` → grounding ∈ [0,1].

`coherenceScore = round(mean(grounding over non-null fields) * 100)`.

Map to **SC-AS Five Rigors** and gate admissibility:
- **Fidelity** — every non-null field has grounding ≥ τ (default 0.6) and a valid source span.
- **Conservation** — no field outside `schema` is emitted; required fields not found are returned `null` (never invented).
- **Austerity** — output strictly matches the schema shape; no extra keys, no commentary.
- **Coherence** — internal consistency checks pass (e.g., dates parseable & not in the future; medication strings non-empty when present).

`admissible = Fidelity ∧ Conservation ∧ Austerity ∧ Coherence ∧ (coherenceScore ≥ COHERENCE_THRESHOLD)` (default threshold 80). If not admissible, the client must NOT call `recordInference`.

---

## 10. Privacy model

- **No PHI on chain.** Only `inputHash`, `outputHash`, `merkleRoot`, and metadata are stored on-chain.
- **Encryption.** Raw document encrypted client-side with AES-GCM; ciphertext stored off-chain (local store or local IPFS node). Demo key handling: a per-session key held in app state (documented as a demo simplification; production would use patient-held keys / KMS).
- **Merkle commitments.** Build a Merkle tree over canonicalized field key/value pairs; store the root on-chain. Provide an inclusion-proof helper so a single field can be proven against the root without revealing siblings.
- **Stretch (optional, cut first):** a zero-knowledge field-inclusion proof (Noir/Circom). Merkle proofs satisfy the privacy story without it.

---

## 11. Tech stack (all free, $0 recurring)

| Layer | Choice |
|---|---|
| Smart contracts | Solidity ^0.8.24, Foundry, OpenZeppelin |
| Chain | Base Sepolia testnet (free faucet); public RPC or Alchemy free tier |
| AI service | Python 3.11, FastAPI, Uvicorn, Ollama (`llama3.1:8b` / `qwen2.5:7b`, `nomic-embed-text`) |
| Frontend | Next.js 14 (App Router), TypeScript, Tailwind, shadcn/ui, framer-motion |
| Web3 | wagmi + viem + RainbowKit |
| Charts | Recharts |
| Crypto/util | viem (keccak256, encoding), merkletreejs, Web Crypto API (AES-GCM) |
| Storage | local encrypted store (demo) or local IPFS / Helia node |
| Tooling | pnpm workspaces, ESLint/Prettier, Foundry tests, GitHub Actions (optional) |

> Cost note: no AWS, no paid LLM keys, no paid pinning service. The only optional spend is a ~$10 domain or a one-time cheap cloud GPU if local hardware can't run the 7–8B model.

---

## 12. Repository structure (monorepo)

```
aegis/
├─ apps/
│  └─ web/                     # Next.js 14 app (App Router)
│     ├─ app/                  # routes: /, /patient, /provider, /inference/[id], /verify, /reconciliation, /showcase
│     ├─ components/           # UI components (see §14)
│     ├─ lib/                  # viem clients, contract ABIs, hashing, merkle, crypto, ai-client
│     └─ public/samples/       # synthetic medical documents
├─ services/
│  └─ ai/                      # FastAPI app
│     ├─ main.py               # endpoints
│     ├─ extract.py            # ollama structured extraction
│     ├─ grounding.py          # coherence score + Five Rigors
│     └─ requirements.txt
├─ packages/
│  └─ contracts/               # Foundry project
│     ├─ src/ConsentRegistry.sol
│     ├─ src/InferenceRegistry.sol
│     ├─ src/Settlement.sol
│     ├─ src/MockUSDC.sol
│     ├─ test/                 # Foundry tests
│     └─ script/Deploy.s.sol
├─ scripts/verify.ts           # CLI receipt verifier
├─ .env.example
├─ pnpm-workspace.yaml
└─ SPEC.md                     # this document
```

---

## 13. Data models

### 13.1 Solidity structs

```solidity
struct ConsentGrant {
    address patient;
    address provider;
    bytes32 scopeHash;     // keccak256 of allowed field-category set
    uint8   purpose;       // enum: 0 TREATMENT, 1 BILLING, 2 RESEARCH
    uint64  issuedAt;
    uint64  expiresAt;
    bool    revoked;
}

struct Receipt {
    bytes32 consentId;
    address provider;
    bytes32 patientRef;    // hash of patient identity, not raw PII
    bytes32 inputHash;
    bytes32 outputHash;
    bytes32 promptHash;
    bytes32 merkleRoot;
    string  modelId;       // e.g. "llama3.1:8b"
    bytes32 modelVersion;  // model digest
    uint16  coherenceScore;// 0–100
    uint64  timestamp;
    bool    paid;
}
```

### 13.2 TypeScript types (frontend mirror)
Mirror the above as TS interfaces in `apps/web/lib/types.ts`, plus `ExtractField`, `ExtractResponse`, and `VerifyResult { checks: {label, ok}[]; verdict: 'pass'|'fail' }`.

---

## 14. Smart contract specification

### 14.1 ConsentRegistry.sol
- State: `mapping(bytes32 => ConsentGrant) public consents;`
- `grantConsent(address provider, bytes32 scopeHash, uint8 purpose, uint64 expiresAt) returns (bytes32 consentId)` — `consentId = keccak256(patient, provider, scopeHash, issuedAt)`.
- `grantConsentWithSig(...)` — EIP-712 variant so the patient can sign and a relayer can submit (optional; basic `grantConsent` is sufficient for MVP).
- `revokeConsent(bytes32 consentId)` — only patient.
- `isConsentValid(bytes32 consentId, address provider, bytes32 scopeHash) view returns (bool)` — checks not revoked, not expired, provider + scope match.
- Events: `ConsentGranted(consentId, patient, provider, scopeHash, expiresAt)`, `ConsentRevoked(consentId)`.

### 14.2 InferenceRegistry.sol
- State: `mapping(bytes32 => Receipt) public receipts;` references to `ConsentRegistry` and `Settlement`.
- `recordInference(Receipt calldata r) returns (bytes32 receiptId)`:
  1. require `ConsentRegistry.isConsentValid(r.consentId, msg.sender, scope)`;
  2. require `r.coherenceScore >= MIN_SCORE`;
  3. call `Settlement.collect(msg.sender, receiptId)` (pulls mock-USDC, sets `paid=true`);
  4. store receipt; emit `InferenceRecorded`.
  - `receiptId = keccak256(consentId, inputHash, outputHash, timestamp)`.
- `getReceipt(bytes32 id) view returns (Receipt)`.
- `verifyReceipt(bytes32 id, bytes32 inputHash, bytes32 outputHash) view returns (bool)`.
- Events: `InferenceRecorded(receiptId, consentId, provider, patientRef, coherenceScore, timestamp)`.

### 14.3 Settlement.sol + MockUSDC.sol
- `MockUSDC` — ERC-20 (6 decimals), open `mint(address,uint256)` for the demo faucet.
- `Settlement` — `uint256 public price; address public treasury;` `collect(address payer, bytes32 receiptId)` does `usdc.transferFrom(payer, treasury, price)` and emits `PaymentSettled(receiptId, payer, price, block.timestamp)`. Only callable by `InferenceRegistry`.

### 14.4 Contract tests (Foundry)
- consent grant → valid; revoke → invalid; expiry → invalid; scope mismatch → invalid.
- recordInference happy path mints receipt + pulls payment.
- recordInference reverts on invalid consent, on score below MIN_SCORE, on missing approval.
- verifyReceipt returns true for stored hashes, false for tampered hashes.

---

## 15. The golden path (scripted demo)

1. Patient connects wallet → grants consent to the provider (scope: diagnosis + medications; expiry: +1 day).
2. Provider connects → selects "Discharge Summary #1" → picks the consent → approves price → runs inference.
3. Fields extract with **live source-span highlighting**; coherence meter animates to ~94; rigor badges go green; receipt mints (toast + explorer link).
4. Switch to **/verify** → paste the receiptId → all checks green.
5. Tamper demo: edit one word in the doc → re-verify → input-hash check turns red.
6. **/reconciliation** → show the inference paid + reconciled, totals update.
7. (Optional) patient **/patient** access log shows the inference; patient revokes consent → a second inference attempt is blocked.

Keep total runtime under the 90–120s video budget; script narration to the both-halves invariant.

---

## 16. Build sequence (do in this order)

- **A. Setup** — monorepo, Foundry, Next.js, FastAPI, Ollama models, Base Sepolia wallet + faucet, `.env`.
- **B. Contracts skeleton** — `InferenceRegistry` (store + read), deploy, tests; web connects wallet.
- **C. AI extraction** — `/extract` returns fields + spans on a sample doc.
- **D. Walking skeleton (critical)** — web → `/extract` → hash → `recordInference` → read back → `/verify` green. End-to-end, ugly OK.
- **E. Consent** — `ConsentRegistry` + EIP-712 grant + gating + revoke.
- **F. Coherence** — grounding score + Five Rigors + admissibility gate; persist score in receipt.
- **G. Privacy** — AES-GCM encryption off-chain, Merkle root on-chain, inclusion proof helper.
- **H. Settlement** — MockUSDC + Settlement + atomic pay-on-record + reconciliation view.
- **I. Frontend polish** — highlight overlay, animated coherence meter, dashboards, explorer links, reset-demo.
- **J. Hardening** — error/empty/loading states, seed data, run the golden path cold twice; feature freeze.

## 17. Non-goals (out of scope for the MVP)

- No real PHI and no production HIPAA compliance (synthetic documents only).
- No mainnet deployment and no real money (testnet + mock USDC only).
- No multi-tenant auth / org management beyond wallet-based roles.
- No model training/fine-tuning; single local model with a fallback.
- ZK proofs are a stretch goal; Merkle commitments are the baseline privacy mechanism.

## 18. Acceptance criteria (overall MVP "done")

- The golden path (§15) runs end-to-end on Base Sepolia with a local model and zero paid services.
- Removing either the AI step or the on-chain step demonstrably breaks core utility (the both-halves invariant).
- A receipt can be independently verified by a third party via UI and CLI; tampering is detected.
- Coherence score is computed, gates admissibility, and is stored on-chain; Five Rigors mapped in README.
- No PHI is present in any on-chain data; payment + reconciliation work in mock USDC.
- Foundry tests (§14.4) pass.

## 19. Environment configuration (`.env.example`)

```
# Chain
NEXT_PUBLIC_CHAIN_ID=84532
NEXT_PUBLIC_RPC_URL=https://sepolia.base.org
DEPLOYER_PRIVATE_KEY=0x...            # dev wallet only, testnet
# Contracts (filled after deploy)
NEXT_PUBLIC_CONSENT_REGISTRY=0x...
NEXT_PUBLIC_INFERENCE_REGISTRY=0x...
NEXT_PUBLIC_SETTLEMENT=0x...
NEXT_PUBLIC_MOCK_USDC=0x...
# AI service
AI_SERVICE_URL=http://localhost:8000
OLLAMA_HOST=http://localhost:11434
OLLAMA_MODEL=llama3.1:8b
OLLAMA_EMBED_MODEL=nomic-embed-text
COHERENCE_THRESHOLD=80
GROUNDING_TAU=0.6
# WalletConnect (RainbowKit) — free project id
NEXT_PUBLIC_WALLETCONNECT_ID=...
```

## 20. References
- SC-AS (Coherence Research) — open standard; DOI 10.5281/zenodo.18039635; cite in README.
- Base Sepolia docs & faucet; Ollama; wagmi/viem/RainbowKit; OpenZeppelin; Foundry.
