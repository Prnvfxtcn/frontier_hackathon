"""Fetch Ollama model sha256 digests via /api/show and /api/tags."""
from __future__ import annotations

import logging
from typing import Optional

import httpx

from grounding import OLLAMA_HOST, keccak_hex

logger = logging.getLogger("aegis.model_digest")


def normalize_digest(raw: str) -> str:
    """Normalize to sha256:<hex> form."""
    value = raw.strip()
    if value.startswith("sha256:"):
        return value
    if value.startswith("0x"):
        return f"sha256:{value[2:]}"
    return f"sha256:{value}"


def mock_model_digest(model_id: str) -> str:
    return normalize_digest(keccak_hex(f"mock-model:{model_id}")[2:])


def _match_model_name(installed: str, target: str) -> bool:
    return installed == target or installed.startswith(f"{target}:") or target.startswith(f"{installed}:")


async def fetch_model_digest(model_name: str, client: httpx.AsyncClient) -> Optional[str]:
    """Return sha256 digest for an Ollama model, or None if unavailable."""
    try:
        resp = await client.post(
            f"{OLLAMA_HOST}/api/show",
            json={"name": model_name},
            timeout=10,
        )
        if resp.status_code == 200:
            data = resp.json()
            if isinstance(data.get("digest"), str) and data["digest"]:
                return normalize_digest(data["digest"])
    except Exception as exc:
        logger.debug("api/show failed for %s: %s", model_name, exc)

    try:
        resp = await client.get(f"{OLLAMA_HOST}/api/tags", timeout=5)
        resp.raise_for_status()
        for model in resp.json().get("models", []):
            name = model.get("name", "")
            if _match_model_name(name, model_name) and model.get("digest"):
                return normalize_digest(str(model["digest"]))
    except Exception as exc:
        logger.debug("api/tags digest lookup failed for %s: %s", model_name, exc)

    return None


async def resolve_model_digest(
    model_name: str,
    client: httpx.AsyncClient,
    *,
    used_mock: bool = False,
) -> str:
    if used_mock:
        return mock_model_digest(model_name)
    digest = await fetch_model_digest(model_name, client)
    if digest:
        return digest
    logger.warning("Could not resolve digest for %s — using mock placeholder", model_name)
    return mock_model_digest(model_name)
