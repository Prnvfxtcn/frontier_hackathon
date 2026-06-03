#!/usr/bin/env bash
# One-command local demo: Anvil + deploy + AI (mock) + optional golden path seed.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
RPC="http://127.0.0.1:8545"
KEY="0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80"

echo "==> Starting Anvil (if not running)…"
if ! curl -sf "$RPC" -X POST -H "Content-Type: application/json" -d '{"jsonrpc":"2.0","method":"eth_chainId","params":[],"id":1}' >/dev/null; then
  anvil --chain-id 84532 --port 8545 --block-time 1 &
  sleep 2
fi

echo "==> Deploying contracts…"
export DEPLOYER_PRIVATE_KEY="$KEY"
"$ROOT/scripts/deploy-local.sh"
"$ROOT/scripts/sync-env.sh"

echo "==> Starting AI service (mock mode)…"
pkill -f "uvicorn main:app" 2>/dev/null || true
cd "$ROOT/services/ai"
source .venv/bin/activate
USE_MOCK_EXTRACTOR=true uvicorn main:app --host 0.0.0.0 --port 8000 &
sleep 2

echo "==> Seeding ensemble demo receipt…"
RPC_URL="$RPC" USE_MOCK_EXTRACTOR=true "$ROOT/scripts/seed-public-demo.sh" || true

echo ""
echo "Aegis demo stack ready."
echo "  Web:  cd apps/web && npm run dev  → http://localhost:3000"
echo "  AI:   http://localhost:8000/health"
echo "  Chain: $RPC"
echo ""
echo "Try: http://localhost:3000/verify (Judge demo button)"
