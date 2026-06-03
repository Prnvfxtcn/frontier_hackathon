#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
RPC="${RPC_URL:-http://127.0.0.1:8545}"
AI_URL="${AI_SERVICE_URL:-http://localhost:8000}"

CONSENT_REGISTRY="${NEXT_PUBLIC_CONSENT_REGISTRY:-0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0}"
INFERENCE_REGISTRY="${NEXT_PUBLIC_INFERENCE_REGISTRY:-0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9}"
SETTLEMENT="${NEXT_PUBLIC_SETTLEMENT:-0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512}"
MOCK_USDC="${NEXT_PUBLIC_MOCK_USDC:-0x5FbDB2315678afecb367f032d93F642f64180aa3}"

PATIENT_KEY=0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
PROVIDER_KEY=0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d
PATIENT=0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266
PROVIDER=0x70997970C51812dc3A010C7d01b50e0d17dc79C8
SCOPE_HASH=$(cast keccak "allergies,diagnosis,dob,followUp,medications,patientName")
EXPIRES=$(($(date +%s) + 86400))

source "$ROOT/.env" 2>/dev/null || true

echo "==> 1. Patient grants consent"
GRANT_TX=$(cast send "$CONSENT_REGISTRY" \
  "grantConsent(address,bytes32,uint8,uint64)" \
  "$PROVIDER" "$SCOPE_HASH" 0 "$EXPIRES" \
  --rpc-url "$RPC" --private-key "$PATIENT_KEY" --json)
CONSENT_ID=$(echo "$GRANT_TX" | python3 -c "import sys,json; print(json.load(sys.stdin)['logs'][0]['topics'][1])")
echo "Consent ID: $CONSENT_ID"

echo "==> 2. AI extraction on Discharge Summary #1"
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
echo "$EXTRACT" | python3 -m json.tool | head -20

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
SECOND_MODEL=$(echo "$EXTRACT" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('secondModelId',''))")
if [[ -n "$DIGEST_B" ]]; then
  SECOND_VERSION=$(cast keccak "$DIGEST_B")
else
  SECOND_VERSION=$(echo "$EXTRACT" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('secondModelVersion','0x0000000000000000000000000000000000000000000000000000000000000000'))")
fi
SECOND_OUTPUT=$(echo "$EXTRACT" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('secondOutputHash','0x0000000000000000000000000000000000000000000000000000000000000000'))")
AGREEMENT=$(echo "$EXTRACT" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('agreementScore',0))")
MODEL_ID=$(echo "$EXTRACT" | python3 -c "import sys,json; print(json.load(sys.stdin)['modelId'])")
MERKLE_ROOT=$(echo "$EXTRACT" | python3 -c "
import json, sys, hashlib
fields = json.load(sys.stdin)['fields']
payload = json.dumps({f['key']: f['value'] for f in fields}, sort_keys=True, separators=(',', ':'))
print('0x' + hashlib.sha3_256(payload.encode()).hexdigest())
" <<< "$EXTRACT")
PATIENT_REF=$(cast keccak "$PATIENT")

echo "==> 3. Provider pays and records inference"
cast send "$MOCK_USDC" "mint(address,uint256)" "$PROVIDER" 10000000 --rpc-url "$RPC" --private-key "$PROVIDER_KEY" >/dev/null
PRICE=$(cast call "$SETTLEMENT" "price()(uint256)" --rpc-url "$RPC" | awk '{print $1}')
cast send "$MOCK_USDC" "approve(address,uint256)" "$SETTLEMENT" "$PRICE" --rpc-url "$RPC" --private-key "$PROVIDER_KEY" >/dev/null

REC_TX=$(cast send "$INFERENCE_REGISTRY" \
  "recordInference((bytes32,address,bytes32,bytes32,bytes32,bytes32,bytes32,string,bytes32,uint16,uint64,bool,string,bytes32,bytes32,uint16))(bytes32)" \
  "($CONSENT_ID,$PROVIDER,$PATIENT_REF,$INPUT_HASH,$OUTPUT_HASH,$PROMPT_HASH,$MERKLE_ROOT,$MODEL_ID,$MODEL_VERSION,$COHERENCE,0,false,$SECOND_MODEL,$SECOND_VERSION,$SECOND_OUTPUT,$AGREEMENT)" \
  --rpc-url "$RPC" --private-key "$PROVIDER_KEY" --json)
RECEIPT_ID=$(echo "$REC_TX" | python3 -c "
import sys,json
d=json.load(sys.stdin)
for log in d.get('logs',[]):
  if log.get('topics') and log['topics'][0].startswith('0x54657776'):
    print(log['topics'][1]); break
")
echo "Receipt ID: $RECEIPT_ID"

echo "==> 4. Verify receipt (genuine)"
if [[ "$AGREEMENT" -gt 0 ]]; then
  cast call "$INFERENCE_REGISTRY" "verifyEnsembleReceipt(bytes32,bytes32,bytes32,bytes32)(bool)" \
    "$RECEIPT_ID" "$INPUT_HASH" "$OUTPUT_HASH" "$SECOND_OUTPUT" --rpc-url "$RPC"
else
  cast call "$INFERENCE_REGISTRY" "verifyReceipt(bytes32,bytes32,bytes32)(bool)" \
    "$RECEIPT_ID" "$INPUT_HASH" "$OUTPUT_HASH" --rpc-url "$RPC"
fi

echo "==> 5. Tamper demo"
cast call "$INFERENCE_REGISTRY" "verifyReceipt(bytes32,bytes32,bytes32)(bool)" \
  "$RECEIPT_ID" "$(cast keccak TAMPERED)" "$OUTPUT_HASH" --rpc-url "$RPC"

echo "==> 6. Reconciliation event"
cast logs --from-block 0 --address "$SETTLEMENT" --rpc-url "$RPC" | tail -3

echo ""
echo "Golden path complete."
echo "  Verify UI: http://localhost:3000/verify (paste $RECEIPT_ID)"
echo "  Reconciliation: http://localhost:3000/reconciliation"
