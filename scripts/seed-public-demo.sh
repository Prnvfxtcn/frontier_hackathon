#!/usr/bin/env bash
# Record one demo inference on the configured chain and save NEXT_PUBLIC_DEMO_RECEIPT_ID.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"

if [[ -f "$ROOT/.env" ]]; then
  set -a
  # shellcheck disable=SC1091
  source "$ROOT/.env"
  set +a
fi

RPC="${RPC_URL:-${NEXT_PUBLIC_RPC_URL:-https://sepolia.base.org}}"
AI_URL="${AI_SERVICE_URL:-http://localhost:8000}"
if [[ "$RPC" =~ (127\.0\.0\.1|localhost) ]]; then
  KEY="0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80"
else
  KEY="${DEPLOYER_PRIVATE_KEY:?Set DEPLOYER_PRIVATE_KEY for public deploy}"
fi

CONSENT_REGISTRY="${NEXT_PUBLIC_CONSENT_REGISTRY:?Set NEXT_PUBLIC_CONSENT_REGISTRY}"
INFERENCE_REGISTRY="${NEXT_PUBLIC_INFERENCE_REGISTRY:?Set NEXT_PUBLIC_INFERENCE_REGISTRY}"
SETTLEMENT="${NEXT_PUBLIC_SETTLEMENT:?Set NEXT_PUBLIC_SETTLEMENT}"
MOCK_USDC="${NEXT_PUBLIC_MOCK_USDC:?Set NEXT_PUBLIC_MOCK_USDC}"

ACTOR="$(cast wallet address --private-key "$KEY")"
PROVIDER="$ACTOR"
PATIENT="$ACTOR"
SCOPE_HASH=$(cast keccak "allergies,diagnosis,dob,followUp,medications,patientName")
EXPIRES=$(($(date +%s) + 86400))

echo "Seeding demo on $RPC as $ACTOR"

echo "==> Grant consent"
GRANT_TX=$(cast send "$CONSENT_REGISTRY" \
  "grantConsent(address,bytes32,uint8,uint64)" \
  "$PROVIDER" "$SCOPE_HASH" 0 "$EXPIRES" \
  --rpc-url "$RPC" --private-key "$KEY" --json)
CONSENT_ID=$(echo "$GRANT_TX" | python3 -c "import sys,json; print(json.load(sys.stdin)['logs'][0]['topics'][1])")

echo "==> Extract (AI service)"
EXTRACT=$(python3 <<PY | curl -sf -X POST "$AI_URL/extract?mode=ensemble" -H "Content-Type: application/json" -d @-
import json
from pathlib import Path
doc = Path("${ROOT}/apps/web/public/samples/discharge-summary-1.txt").read_text()
print(json.dumps({
    "documentText": doc,
    "schema": ["patientName", "dob", "diagnosis", "medications", "allergies", "followUp"],
}))
PY
)

INPUT_HASH=$(echo "$EXTRACT" | python3 -c "import sys,json; print(json.load(sys.stdin)['inputHash'])")
OUTPUT_HASH=$(echo "$EXTRACT" | python3 -c "import sys,json; print(json.load(sys.stdin)['outputHash'])")
PROMPT_HASH=$(echo "$EXTRACT" | python3 -c "import sys,json; print(json.load(sys.stdin)['promptHash'])")
DIGEST_A=$(echo "$EXTRACT" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('digestA',''))")
DIGEST_B=$(echo "$EXTRACT" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('digestB',''))")
if [[ -n "$DIGEST_A" ]]; then
  MODEL_VERSION=$(cast keccak "$DIGEST_A")
else
  MODEL_VERSION=$(echo "$EXTRACT" | python3 -c "import sys,json; print(json.load(sys.stdin)['modelVersion'])")
fi
COHERENCE=$(echo "$EXTRACT" | python3 -c "import sys,json; print(json.load(sys.stdin)['coherenceScore'])")
MODEL_ID=$(echo "$EXTRACT" | python3 -c "import sys,json; print(json.load(sys.stdin)['modelId'])")
SECOND_MODEL=$(echo "$EXTRACT" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('secondModelId',''))")
if [[ -n "$DIGEST_B" ]]; then
  SECOND_VERSION=$(cast keccak "$DIGEST_B")
else
  SECOND_VERSION=$(echo "$EXTRACT" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('secondModelVersion','0x0000000000000000000000000000000000000000000000000000000000000000'))")
fi
SECOND_OUTPUT=$(echo "$EXTRACT" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('secondOutputHash','0x0000000000000000000000000000000000000000000000000000000000000000'))")
AGREEMENT=$(echo "$EXTRACT" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('agreementScore',0))")
MERKLE_ROOT=$(echo "$EXTRACT" | python3 -c "
import json, sys, hashlib
fields = json.load(sys.stdin)['fields']
payload = json.dumps({f['key']: f['value'] for f in fields}, sort_keys=True, separators=(',', ':'))
print('0x' + hashlib.sha3_256(payload.encode()).hexdigest())
" <<< "$EXTRACT")
PATIENT_REF=$(cast keccak "$PATIENT")

echo "==> Mint mUSDC + record inference"
cast send "$MOCK_USDC" "mint(address,uint256)" "$PROVIDER" 10000000 --rpc-url "$RPC" --private-key "$KEY" >/dev/null
PRICE=$(cast call "$SETTLEMENT" "price()(uint256)" --rpc-url "$RPC" | awk '{print $1}')
cast send "$MOCK_USDC" "approve(address,uint256)" "$SETTLEMENT" "$PRICE" --rpc-url "$RPC" --private-key "$KEY" >/dev/null

REC_TX=$(cast send "$INFERENCE_REGISTRY" \
  "recordInference((bytes32,address,bytes32,bytes32,bytes32,bytes32,bytes32,string,bytes32,uint16,uint64,bool,string,bytes32,bytes32,uint16))(bytes32)" \
  "($CONSENT_ID,$PROVIDER,$PATIENT_REF,$INPUT_HASH,$OUTPUT_HASH,$PROMPT_HASH,$MERKLE_ROOT,$MODEL_ID,$MODEL_VERSION,$COHERENCE,0,false,$SECOND_MODEL,$SECOND_VERSION,$SECOND_OUTPUT,$AGREEMENT)" \
  --rpc-url "$RPC" --private-key "$KEY" --json)

RECEIPT_ID=$(echo "$REC_TX" | python3 -c "
import sys,json
d=json.load(sys.stdin)
for log in d.get('logs',[]):
  if log.get('topics') and log['topics'][0].startswith('0x54657776'):
    print(log['topics'][1]); break
")
TX_HASH=$(echo "$REC_TX" | python3 -c "import sys,json; print(json.load(sys.stdin)['transactionHash'])")

ENV="$ROOT/.env"
if grep -q "^NEXT_PUBLIC_DEMO_RECEIPT_ID=" "$ENV" 2>/dev/null; then
  sed -i.bak "s|^NEXT_PUBLIC_DEMO_RECEIPT_ID=.*|NEXT_PUBLIC_DEMO_RECEIPT_ID=$RECEIPT_ID|" "$ENV"
else
  echo "NEXT_PUBLIC_DEMO_RECEIPT_ID=$RECEIPT_ID" >> "$ENV"
fi
rm -f "$ENV.bak"

"$ROOT/scripts/sync-env.sh"

echo ""
echo "Demo receipt seeded."
echo "  Receipt ID: $RECEIPT_ID"
echo "  Tx:         https://sepolia.basescan.org/tx/$TX_HASH"
echo "  Verify:     http://localhost:3000/verify?id=$RECEIPT_ID"
echo ""
echo "Judges can verify with only the receipt ID — no wallet, no local AI required for on-chain checks."
