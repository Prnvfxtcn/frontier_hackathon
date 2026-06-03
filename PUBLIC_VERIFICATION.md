# Public verification (for judges)

Aegis receipts are **publicly verifiable** when contracts live on **Base Sepolia** (chain ID `84532`) and the web app points at the public RPC — not local Anvil.

## What “publicly verifiable” means

| Check | Who can run it | Needs wallet? | Needs local AI? |
|-------|----------------|---------------|-----------------|
| Receipt exists on-chain | Anyone | No | No |
| Consent valid at verification | Anyone | No | No |
| Coherence ≥ 80, payment settled | Anyone | No | No |
| Input hash match (document) | Anyone | No | No (client-side keccak256) |
| Output hash + coherence (full) | Anyone | No | Yes (or cached extract) |
| Basescan tx + contract reads | Anyone | No | No |

**No PHI on chain** — only hashes, scores, and settlement flags.

## One-time setup (maintainer)

### 1. Fund deployer

```bash
source .env
cast wallet address --private-key "$DEPLOYER_PRIVATE_KEY"
```

Send **≥ 0.001 ETH** on Base Sepolia from a faucet:

- [Alchemy Base Sepolia Faucet](https://www.alchemy.com/faucets/base-sepolia)
- [Coinbase Base Sepolia Faucet](https://www.coinbase.com/faucets/base-ethereum-sepolia-faucet)

### 2. Deploy contracts

```bash
./scripts/deploy-base-sepolia.sh
# or wait after funding:
WAIT_FOR_FUNDS=1 ./scripts/deploy-base-sepolia.sh
```

This updates `.env` and `apps/web/.env.local` with contract addresses and `NEXT_PUBLIC_RPC_URL=https://sepolia.base.org`.

### 3. Seed a demo receipt (optional but recommended)

```bash
# AI service must be running on :8000
cd services/ai && source .venv/bin/activate && uvicorn main:app --port 8000

./scripts/seed-public-demo.sh
```

Sets `NEXT_PUBLIC_DEMO_RECEIPT_ID` — the verify page shows a one-click **Judge demo** link.

### 4. Restart web app

```bash
cd apps/web && npm run dev
```

## How judges verify (30 seconds)

1. Open **Showcase** or use the demo link on **Verify**.
2. Copy the **Receipt ID** (bytes32 — not the transaction hash).
3. Visit `/verify?id=0x…` and click **Verify on-chain only**.
4. Optional: paste the discharge summary to see input-hash match; use **Demo: tamper a word** to see failure.
5. Cross-check on [sepolia.basescan.org](https://sepolia.basescan.org):
   - InferenceRegistry contract → Read → `getReceipt(id)`
   - Mint tx from the **Public verification** panel

## CLI (same checks)

```bash
source .env
npx tsx scripts/verify.ts 0x<receiptId>
npx tsx scripts/verify.ts 0x<receiptId> --doc "$(cat apps/web/public/samples/discharge-summary-1.txt)"
```

## Shareable links

After deploy, share:

```
https://<your-hosted-app>/verify?id=<receiptId>
```

The **Public verification** panel includes Basescan links and a copyable URL. Hosted app env must use public RPC + deployed addresses (Vercel: copy from `.env`).

## Local dev vs public

| Mode | RPC | Publicly verifiable? |
|------|-----|----------------------|
| Local Anvil | `http://127.0.0.1:8545` | No — only your machine |
| Base Sepolia | `https://sepolia.base.org` | **Yes** |

The amber network banner = local only. Teal banner = public chain.

## Optional: Basescan contract verification

```bash
export BASESCAN_API_KEY=...
./scripts/deploy-base-sepolia.sh   # verifies MockUSDC + ConsentRegistry if key is set
```

Judges can then read verified source on Basescan.
