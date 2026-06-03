#!/usr/bin/env bash
# Capture demo state (receipt ID + env) after golden path for reproducible judge demos.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
OUT="$ROOT/scripts/demo-state"
mkdir -p "$OUT"

if [[ -f "$ROOT/.env" ]]; then
  grep -E '^(NEXT_PUBLIC_|RPC_URL|AI_SERVICE)' "$ROOT/.env" > "$OUT/env.snapshot" || true
fi

if grep -q "^NEXT_PUBLIC_DEMO_RECEIPT_ID=" "$ROOT/.env" 2>/dev/null; then
  grep "^NEXT_PUBLIC_DEMO_RECEIPT_ID=" "$ROOT/.env" > "$OUT/receipt-id.txt"
fi

echo "Demo snapshot written to $OUT"
ls -la "$OUT"
