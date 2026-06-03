import os
import re
import json
import hashlib
from datetime import datetime
from typing import Any, Optional, Tuple, List

import httpx

COHERENCE_THRESHOLD = int(os.getenv("COHERENCE_THRESHOLD", "80"))
AGREEMENT_THRESHOLD = int(os.getenv("AGREEMENT_THRESHOLD", "80"))
GROUNDING_TAU = float(os.getenv("GROUNDING_TAU", "0.6"))
OLLAMA_HOST = os.getenv("OLLAMA_HOST", "http://localhost:11434")
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "llama3.1:8b")
OLLAMA_EMBED_MODEL = os.getenv("OLLAMA_EMBED_MODEL", "nomic-embed-text")


def normalize(text: str) -> str:
    return re.sub(r"\s+", " ", text.strip().lower())


def token_overlap(a: str, b: str) -> float:
    ta = set(normalize(a).split())
    tb = set(normalize(b).split())
    if not ta or not tb:
        return 0.0
    return len(ta & tb) / max(len(ta), len(tb))


def find_span(document: str, value: str) -> tuple[int, int, float]:
    if not value:
        return 0, 0, 0.0

    idx = document.find(value)
    if idx >= 0:
        return idx, idx + len(value), 1.0

    norm_doc = normalize(document)
    norm_val = normalize(value)
    idx = norm_doc.find(norm_val)
    if idx >= 0:
        # approximate span in original doc
        return idx, idx + len(value), 0.95

    # fuzzy: scan windows
    best = (0, 0, 0.0)
    words = value.split()
    window = max(len(value), 20)
    for i in range(0, max(1, len(document) - window + 1), max(1, window // 4)):
        chunk = document[i : i + window]
        score = token_overlap(chunk, value)
        if score > best[2]:
            best = (i, min(i + len(value), len(document)), score)

    return best


async def embed(text: str, client: httpx.AsyncClient) -> Optional[List[float]]:
    try:
        resp = await client.post(
            f"{OLLAMA_HOST}/api/embeddings",
            json={"model": OLLAMA_EMBED_MODEL, "prompt": text},
            timeout=30,
        )
        resp.raise_for_status()
        return resp.json().get("embedding")
    except Exception:
        return None


def cosine(a: list[float], b: list[float]) -> float:
    dot = sum(x * y for x, y in zip(a, b))
    na = sum(x * x for x in a) ** 0.5
    nb = sum(y * y for y in b) ** 0.5
    if na == 0 or nb == 0:
        return 0.0
    return dot / (na * nb)


async def embedding_grounding(document: str, value: str, client: httpx.AsyncClient) -> tuple[int, int, float]:
    val_emb = await embed(value, client)
    if not val_emb:
        return 0, 0, 0.0

    window = max(len(value) * 2, 40)
    best = (0, 0, 0.0)
    step = max(10, window // 4)
    for i in range(0, max(1, len(document) - window + 1), step):
        chunk = document[i : i + window]
        chunk_emb = await embed(chunk, client)
        if not chunk_emb:
            continue
        score = max(0.0, cosine(val_emb, chunk_emb))
        if score > best[2]:
            best = (i, min(i + len(value), len(document)), score)
    return best


def check_rigors(fields: list[dict], schema: list[str], document: str) -> dict[str, bool]:
    keys = {f["key"] for f in fields}
    fidelity = all(
        (f["value"] is None or (f.get("grounding", 0) >= GROUNDING_TAU and f.get("sourceSpan", {}).get("end", 0) > 0))
        for f in fields
    )
    conservation = keys == set(schema) and all(f["key"] in schema for f in fields)
    austerity = all(set(f.keys()) <= {"key", "value", "sourceSpan", "grounding"} for f in fields)

    coherence = True
    for f in fields:
        if f["key"] == "dob" and f["value"]:
            try:
                parsed = datetime.strptime(f["value"], "%Y-%m-%d")
                if parsed > datetime.now():
                    coherence = False
            except ValueError:
                coherence = False
        if f["key"] == "medications" and f["value"] is not None and not str(f["value"]).strip():
            coherence = False

    return {
        "fidelity": fidelity,
        "conservation": conservation,
        "austerity": austerity,
        "coherence": coherence,
    }


async def score_fields(document: str, raw_fields: dict[str, Any], schema: list[str], client: httpx.AsyncClient) -> list[dict]:
    scored = []
    for key in schema:
        value = raw_fields.get(key)
        if value is None or value == "":
            scored.append({"key": key, "value": None, "sourceSpan": {"start": 0, "end": 0}, "grounding": 0.0})
            continue

        value_str = str(value)
        start, end, grounding = find_span(document, value_str)
        if grounding < 0.6:
            estart, eend, escore = await embedding_grounding(document, value_str, client)
            if escore > grounding:
                start, end, grounding = estart, eend, escore

        scored.append({
            "key": key,
            "value": value_str,
            "sourceSpan": {"start": start, "end": end},
            "grounding": round(grounding, 4),
        })
    return scored


def compute_coherence(fields: list[dict]) -> int:
    non_null = [f for f in fields if f["value"] is not None]
    if not non_null:
        return 0
    mean = sum(f["grounding"] for f in non_null) / len(non_null)
    return round(mean * 100)


def keccak_hex(text: str) -> str:
    h = hashlib.sha3_256(text.encode()).hexdigest()
    return f"0x{h}"


def canonical_json(fields: list[dict]) -> str:
    payload = {f["key"]: f["value"] for f in fields}
    return json.dumps(payload, sort_keys=True, separators=(",", ":"))
