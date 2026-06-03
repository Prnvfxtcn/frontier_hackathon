#!/usr/bin/env bash
# Deploy Aegis contracts to public Base Sepolia and update .env files.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
RPC="${RPC_URL:-https://sepolia.base.org}"
WAIT_FOR_FUNDS="${WAIT_FOR_FUNDS:-0}"
MIN_BALANCE_WEI="${MIN_BALANCE_WEI:-1000000000000000}" # 0.001 ETH

if [[ -f "$ROOT/.env" ]]; then
  set -a
  # shellcheck disable=SC1091
  source "$ROOT/.env"
  set +a
fi

KEY="${DEPLOYER_PRIVATE_KEY:-}"
if [[ -z "$KEY" ]]; then
  echo "Set DEPLOYER_PRIVATE_KEY in .env (never commit real mainnet keys)." >&2
  exit 1
fi

DEPLOYER="$(cast wallet address --private-key "$KEY")"
echo "Deployer: $DEPLOYER"
echo "RPC:      $RPC"

balance_wei() {
  cast balance "$DEPLOYER" --rpc-url "$RPC" | awk '{print $1}'
}

BAL="$(balance_wei)"
if [[ "$BAL" -lt "$MIN_BALANCE_WEI" ]]; then
  echo ""
  echo "Deployer has insufficient Base Sepolia ETH ($BAL wei)."
  echo "Fund this address, then re-run:"
  echo "  $DEPLOYER"
  echo ""
  echo "Faucets:"
  echo "  https://www.alchemy.com/faucets/base-sepolia"
  echo "  https://www.coinbase.com/faucets/base-ethereum-sepolia-faucet"
  echo "  https://base-sepolia-faucet.vercel.app/"
  echo ""

  if [[ "$WAIT_FOR_FUNDS" == "1" ]]; then
    echo "Waiting for funds (Ctrl+C to stop)…"
    while [[ "$(balance_wei)" -lt "$MIN_BALANCE_WEI" ]]; do
      sleep 15
      echo "  … balance $(balance_wei) wei"
    done
    echo "Funded."
  else
    echo "Re-run with WAIT_FOR_FUNDS=1 after funding, or fund and run again."
    exit 1
  fi
fi

echo "Deploying contracts…"
cd "$ROOT/packages/contracts"
forge script script/Deploy.s.sol --rpc-url "$RPC" --broadcast --private-key "$KEY" -vv

BROADCAST="$ROOT/packages/contracts/broadcast/Deploy.s.sol/84532/run-latest.json"
if [[ ! -f "$BROADCAST" ]]; then
  echo "Deploy broadcast file not found at $BROADCAST" >&2
  exit 1
fi

read -r MOCK_USDC SETTLEMENT CONSENT REGISTRY <<< "$(
  python3 - <<'PY' "$BROADCAST"
import json, sys
data = json.load(open(sys.argv[1]))
created = [t for t in data["transactions"] if t.get("transactionType") == "CREATE"]
addrs = [t["contractAddress"] for t in created if t.get("contractAddress")]
# Deploy order: MockUSDC, Settlement, ConsentRegistry, InferenceRegistry
for a in addrs:
    print(a, end=" ")
PY
)"

echo ""
echo "Deployed:"
echo "  MockUSDC:           $MOCK_USDC"
echo "  Settlement:         $SETTLEMENT"
echo "  ConsentRegistry:    $CONSENT"
echo "  InferenceRegistry:  $REGISTRY"

ENV="$ROOT/.env"
touch "$ENV"

upsert() {
  local key="$1" val="$2"
  if grep -q "^${key}=" "$ENV"; then
    sed -i.bak "s|^${key}=.*|${key}=\"${val}\"|" "$ENV"
  else
    echo "${key}=\"${val}\"" >> "$ENV"
  fi
}

upsert NEXT_PUBLIC_CHAIN_ID "84532"
upsert NEXT_PUBLIC_RPC_URL "$RPC"
upsert NEXT_PUBLIC_NETWORK_LABEL "Base Sepolia"
upsert NEXT_PUBLIC_CONSENT_REGISTRY "$CONSENT"
upsert NEXT_PUBLIC_INFERENCE_REGISTRY "$REGISTRY"
upsert NEXT_PUBLIC_SETTLEMENT "$SETTLEMENT"
upsert NEXT_PUBLIC_MOCK_USDC "$MOCK_USDC"
rm -f "$ENV.bak"

"$ROOT/scripts/sync-env.sh"

if [[ -n "${BASESCAN_API_KEY:-}" ]]; then
  echo "Verifying on Basescan…"
  forge verify-contract "$MOCK_USDC" src/MockUSDC.sol:MockUSDC \
    --chain-id 84532 --etherscan-api-key "$BASESCAN_API_KEY" --watch || true
  forge verify-contract "$CONSENT" src/ConsentRegistry.sol:ConsentRegistry \
    --chain-id 84532 --etherscan-api-key "$BASESCAN_API_KEY" --watch || true
fi

echo ""
echo "Public deploy complete. Next:"
echo "  1. Restart web app (npm run dev in apps/web)"
echo "  2. ./scripts/seed-public-demo.sh   # mint demo receipt on public chain"
echo "  3. Share /verify?id=<receiptId> — anyone can verify on Basescan + public RPC"
