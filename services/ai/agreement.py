"""Per-field agreement between two model extractions."""
from __future__ import annotations

from typing import Any

from grounding import cosine, embed, normalize, token_overlap
import httpx


async def field_agreement(
    document: str,
    value_a: str | None,
    value_b: str | None,
    client: httpx.AsyncClient,
) -> float:
    if value_a is None and value_b is None:
        return 1.0
    if value_a is None or value_b is None:
        return 0.0

    a = normalize(str(value_a))
    b = normalize(str(value_b))
    if not a and not b:
        return 1.0
    if a == b:
        return 1.0

    overlap = token_overlap(a, b)
    if overlap >= 0.85:
        return 0.7

    emb_a = await embed(str(value_a), client)
    emb_b = await embed(str(value_b), client)
    if emb_a and emb_b:
        return max(0.0, min(1.0, cosine(emb_a, emb_b)))

    return overlap


async def compute_agreement(
    document: str,
    fields_a: list[dict[str, Any]],
    fields_b: list[dict[str, Any]],
    schema: list[str],
    client: httpx.AsyncClient,
) -> dict[str, Any]:
    by_a = {f["key"]: f.get("value") for f in fields_a}
    by_b = {f["key"]: f.get("value") for f in fields_b}
    per_field: dict[str, float] = {}

    for key in schema:
        per_field[key] = await field_agreement(document, by_a.get(key), by_b.get(key), client)

    overall = round(sum(per_field.values()) / max(len(schema), 1) * 100)
    return {"perField": per_field, "overall": overall}
