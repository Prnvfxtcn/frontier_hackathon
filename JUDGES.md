# Aegis — Judge Quick Start

## Try in 30 seconds (local, no Docker)

```bash
chmod +x scripts/demo-up.sh
./scripts/demo-up.sh
cd apps/web && npm run dev
```

Open [http://localhost:3000](http://localhost:3000) → **Verify** → click **Judge demo**.

## What to look for

| Feature | Where |
|---------|--------|
| **Ensemble (2 models agree)** | Provider → toggle "Ensemble verification" → Run inference |
| **Certificate PDF + QR** | Inference page → Download Certificate |
| **FHIR R4 Bundle** | Inference page → FHIR Bundle tab |
| **Public verify (no wallet)** | `/verify?id=<receiptId>` |
| **Tamper demo** | Verify → edit one word → input hash turns red |

## Automated golden path

```bash
./scripts/golden-path.sh
cd apps/web && npm run verify:receipt -- 0x<receiptId>
```

## Docker (optional)

```bash
docker compose -f docker-compose.demo.yml up --build
```

## Pitch line

> Two independent models must agree and both be grounded before a tamper-proof receipt is minted on-chain — without putting patient data on the blockchain. Anyone can verify with the receipt ID or download a Certificate of Inference.
