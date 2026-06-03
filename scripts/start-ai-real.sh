#!/usr/bin/env bash
# Start AI service with real Ollama models (for demo video — no mock).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT/services/ai"
pkill -f "uvicorn main:app" 2>/dev/null || true
source .venv/bin/activate
if [[ -f "$ROOT/.env" ]]; then
  set -a
  # shellcheck disable=SC1091
  source "$ROOT/.env"
  set +a
fi
export USE_MOCK_EXTRACTOR=false
export OLLAMA_MODEL_A="${OLLAMA_MODEL_A:-llama3.1:8b}"
export OLLAMA_MODEL_B="${OLLAMA_MODEL_B:-qwen2.5:7b}"
export OLLAMA_EMBED_MODEL="${OLLAMA_EMBED_MODEL:-nomic-embed-text}"
echo "Starting Aegis AI with Ollama (mock disabled)…"
echo "  Model A: $OLLAMA_MODEL_A"
echo "  Model B: $OLLAMA_MODEL_B"
echo "  Agreement threshold: ${AGREEMENT_THRESHOLD:-80}%"
exec uvicorn main:app --host 127.0.0.1 --port 8000 --reload
