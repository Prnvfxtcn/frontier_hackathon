#!/usr/bin/env bash
# Copy root .env contract + chain vars into apps/web/.env.local
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SRC="${1:-$ROOT/.env}"
DEST="$ROOT/apps/web/.env.local"

if [[ ! -f "$SRC" ]]; then
  echo "Missing $SRC — copy .env.example first." >&2
  exit 1
fi

pick() {
  grep -E "^${1}=" "$SRC" 2>/dev/null | head -1 || true
}

{
  pick NEXT_PUBLIC_CHAIN_ID
  pick NEXT_PUBLIC_RPC_URL
  pick NEXT_PUBLIC_NETWORK_LABEL
  pick NEXT_PUBLIC_CONSENT_REGISTRY
  pick NEXT_PUBLIC_INFERENCE_REGISTRY
  pick NEXT_PUBLIC_SETTLEMENT
  pick NEXT_PUBLIC_MOCK_USDC
  pick NEXT_PUBLIC_AI_SERVICE_URL
  pick NEXT_PUBLIC_WALLETCONNECT_ID
  pick NEXT_PUBLIC_DEMO_RECEIPT_ID
  pick NEXT_PUBLIC_AGREEMENT_THRESHOLD
} | sed '/^$/d' > "$DEST"

echo "Synced → $DEST"
