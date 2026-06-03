# Aegis

> **Other systems prove a model ran. Aegis proves two models agreed.**

Privacy-preserving clinical AI with cryptographic consent and verifiable
proof-of-inference receipts — built for the **Frontier Technology
Hackathon 2026 · Healthcare Assets track**.

## What Aegis does

A patient grants scoped, revocable consent with a wallet signature. **Two
independent local AI models — Llama 3.1 (8B) and Qwen 2.5 (7B) — extract
structured data from a clinical document side by side.** A tamper-proof
Proof-of-Inference receipt is minted on-chain only when both models are
grounded in the source AND they agree above 80%. Each inference settles
per-use in stablecoin. **No raw patient data ever touches the
blockchain** — only hashes, Merkle commitments, model digests, and
consent references.

## The "both halves" invariant

| Remove the AI | Remove the blockchain |
|---|---|
| Nothing processes the record — a dead registry, no extraction, no grounding score. | Outputs become unprovable, no audit trail, no settlement; the entire "verifiable clinical AI" value proposition collapses. |

Both halves are load-bearing by construction.

## Try Aegis in 30 seconds

```bash
docker compose -f docker-compose.demo.yml up
```

Then open http://localhost:3000. The bundled verifier replays the seeded
receipts and prints an all-green summary in the terminal.

## What's been built

- **Web app (Next.js 14)** — patient + provider dashboards, side-by-side
  ensemble view, public verify page, reconciliation ledger + CSV export,
  FHIR R4 Bundle tab, downloadable Certificate of Inference (PDF + QR),
  public showcase of on-chain receipts.
- **Local AI ensemble (FastAPI + Ollama)** — Llama 3.1 8B and Qwen 2.5 7B
  with `nomic-embed-text` source-span grounding; coherence score with the
  SC-AS Five Rigors; receipt minted only when both models are grounded
  AND agree ≥ 80%. Real Ollama model sha256 digests anchored on-chain.
- **Smart contracts (Solidity / Foundry)** — ConsentRegistry ·
  InferenceRegistry · Settlement · MockUSDC. Atomic pay-on-mint inside
  `recordInference`. 9 / 9 Foundry tests passing. EVM and Base-compatible
  (chain-id 84532).
- **One-command reproducibility** — Docker bundle spins up the entire
  stack (chain + AI + web + verifier) with a single command. Any auditor
  can independently reproduce and verify any receipt in under 30 seconds.
- **CLI verifier** — `pnpm tsx scripts/verify.ts <receiptId>` runs the
  same cryptographic checks as the web verify page.

## Architecture

Aegis runs **entirely on-premise** — model and chain both local to the
institution. PHI never leaves the workstation; only hashes and Merkle
commitments are anchored on-chain. Contracts use chain-id 84532 (Base
Sepolia's real chain ID), so the same bytecode redeploys unchanged to
public Base, a private Besu, or any EVM L2 when regulatory clarity
permits. This is the deployment topology a real healthcare customer
would actually accept.

## Hackathon alignment

- **Track:** Healthcare Assets — secure patient identity,
  privacy-preserving health data, FHIR R4 interop, on-premise
  architecture.
- **HB 2080 Payment Readiness:** per-inference stablecoin settlement +
  reconciliation dashboard.
- **Coherence (SC-AS):** Five Rigors grounding + ensemble agreement gate
  + on-chain model-digest provenance — implementing the
  [SC-AS standard](https://coherenceresearch.com) by Coherence Research
  (DOI: [10.5281/zenodo.18039635](https://doi.org/10.5281/zenodo.18039635)).

## Tech stack

- **Frontend:** Next.js 14 · TypeScript · wagmi · viem · MetaMask
- **AI:** FastAPI · Ollama · Llama 3.1 8B + Qwen 2.5 7B · `nomic-embed-text`
- **Contracts:** Solidity ^0.8.24 · Foundry · OpenZeppelin · Base-compatible (chain-id 84532)
- **Verification:** viem keccak256 canonical hashing · independent CLI + web verifier · Docker reproducibility

## Running locally (without Docker)

```bash
# Terminal 1 — chain
anvil --chain-id 84532 --port 8545

# Terminal 2 — contracts
cd packages/contracts && forge build
../../scripts/deploy-local.sh && ../../scripts/sync-env.sh

# Terminal 3 — AI service (real Ollama models)
ollama pull llama3.1:8b
ollama pull qwen2.5:7b
ollama pull nomic-embed-text
./scripts/start-ai-real.sh

# Terminal 4 — web (production mode)
cd apps/web && npm install && npm run build && npm run start
```

## Submission

This repo is the **code repository** deliverable for the Frontier
Technology Hackathon 2026. The accompanying video pitch and 6-slide deck
are linked from the Nvlope submission.

## License & IP

Per the hackathon's developer-friendly IP policy, 100% of the
intellectual property created in this repo is retained by its authors.
See `LICENSE` for terms.

## Built by

**Pranav Barot** — pranav@foxtcon.com · Foxtcon · Frontier Technology
Hackathon 2026 · Keystone Innovation District

---

> *Healthcare cannot and should not put PHI on public chains. Aegis is
> the trust layer institutions actually need — privacy-preserving,
> locally-run, cryptographically auditable, and ready to port to any EVM
> chain when regulators clear the path.*
