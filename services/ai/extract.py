import json
import logging
import os
import re
from typing import Any, Optional, Tuple

import httpx

from grounding import OLLAMA_HOST, OLLAMA_MODEL, keccak_hex

OLLAMA_MODEL_A = os.getenv("OLLAMA_MODEL_A", OLLAMA_MODEL)
OLLAMA_MODEL_B = os.getenv("OLLAMA_MODEL_B", "qwen2.5:7b")

logger = logging.getLogger("aegis.extract")

PROMPT_TEMPLATE = """Extract the following fields from the clinical document as JSON only.
Return a JSON object with exactly these keys: {schema}.
Use null for missing values. No commentary.

Document:
{document}
"""

USE_MOCK_EXTRACTOR = os.getenv("USE_MOCK_EXTRACTOR", "false").lower() in ("1", "true", "yes")


async def ollama_reachable(client: httpx.AsyncClient) -> bool:
    try:
        resp = await client.get(f"{OLLAMA_HOST}/api/tags", timeout=3)
        resp.raise_for_status()
        return True
    except Exception:
        return False


async def call_ollama(document: str, schema: list[str], model_id: str, client: httpx.AsyncClient) -> dict[str, Any]:
    prompt = PROMPT_TEMPLATE.format(schema=", ".join(schema), document=document)
    resp = await client.post(
        f"{OLLAMA_HOST}/api/generate",
        json={
            "model": model_id,
            "prompt": prompt,
            "stream": False,
            "format": "json",
        },
        timeout=120,
    )
    resp.raise_for_status()
    text = resp.json().get("response", "{}")

    try:
        return json.loads(text)
    except json.JSONDecodeError:
        match = re.search(r"\{.*\}", text, re.DOTALL)
        if match:
            try:
                return json.loads(match.group(0))
            except json.JSONDecodeError:
                pass
    return {}


def mock_extract(document: str, schema: list[str]) -> dict[str, Any]:
    """Deterministic fallback when Ollama is unavailable."""
    result: dict[str, Any] = {k: None for k in schema}

    patterns = {
        "patientName": r"Patient:\s*([^\n]+)",
        "dob": r"DOB:\s*([0-9]{4}-[0-9]{2}-[0-9]{2})",
        "diagnosis": r"Diagnosis:\s*([^\n]+)",
        "medications": r"Medications:\s*([^\n]+)",
        "allergies": r"Allergies:\s*([^\n]+)",
        "followUp": r"Follow[- ]?up:\s*([^\n]+)",
    }

    for key in schema:
        pat = patterns.get(key)
        if not pat:
            continue
        m = re.search(pat, document, re.IGNORECASE)
        if m:
            result[key] = m.group(1).strip()

    return result


async def extract_fields(
    document: str,
    schema: list[str],
    model_id: Optional[str] = None,
    *,
    mock_variant: str = "a",
) -> Tuple[dict[str, Any], str, str, str, bool]:
    model = model_id or OLLAMA_MODEL_A
    prompt = PROMPT_TEMPLATE.format(schema=", ".join(schema), document=document)
    prompt_hash = keccak_hex(prompt)
    used_mock = False

    if USE_MOCK_EXTRACTOR:
        logger.warning("USE_MOCK_EXTRACTOR=true — using mock extractor")
        raw = mock_extract(document, schema)
        mid = "mock-extractor-b" if mock_variant == "b" else "mock-extractor"
        return raw, mid, keccak_hex(f"{mid}-v1"), prompt_hash, True

    async with httpx.AsyncClient() as client:
        if not await ollama_reachable(client):
            logger.warning("Ollama unreachable at %s — falling back to mock extractor", OLLAMA_HOST)
            raw = mock_extract(document, schema)
            mid = "mock-extractor-b" if mock_variant == "b" else "mock-extractor"
            return raw, mid, keccak_hex(f"{mid}-v1"), prompt_hash, True

        try:
            raw = await call_ollama(document, schema, model, client)
            if not any(raw.get(k) for k in schema):
                logger.warning("Ollama returned empty fields for model %s", model)
            model_version = keccak_hex(model)
            return raw, model, model_version, prompt_hash, False
        except Exception as exc:
            logger.warning("Ollama extraction failed (%s) — falling back to mock extractor", exc)
            raw = mock_extract(document, schema)
            mid = "mock-extractor-b" if mock_variant == "b" else "mock-extractor"
            return raw, mid, keccak_hex(f"{mid}-v1"), prompt_hash, True
