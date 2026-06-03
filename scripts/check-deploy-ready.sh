#!/usr/bin/env bash
# Print deployer address and readiness for Base Sepolia deploy.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
if [[ -f "$ROOT/.env" ]]; then
  set -a
  # shellcheck disable=SC1091
  source "$ROOT/.env"
  set +a
fi

RPC="${NEXT_PUBLIC_RPC_URL:-https://sepolia.base.org}"
KEY="${DEPLOYER_PRIVATE_KEY:-}"

if [[ -z "$KEY" ]]; then
  echo "DEPLOYER_PRIVATE_KEY not set in .env" >&2
  exit 1
fi

ADDR="$(cast wallet address --private-key "$KEY")"
BAL="$(cast balance "$ADDR" --rpc-url "$RPC" --ether)"

echo "Deployer address: $ADDR"
echo "RPC:              $RPC"
echo "Balance:          $BAL ETH"
echo ""
if awk -v b="$BAL" 'BEGIN { exit (b+0 >= 0.001) ? 0 : 1 }'; then
  echo "Ready to deploy: ./scripts/deploy-base-sepolia.sh"
else
  echo "Fund this exact address on the faucet (must match DEPLOYER_PRIVATE_KEY in .env):"
  echo "  $ADDR"
  echo ""
  echo "If you funded a different MetaMask address, export that account's private key"
  echo "into .env as DEPLOYER_PRIVATE_KEY=0x... then re-run this script."
fi
