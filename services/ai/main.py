import os
from typing import Any, Optional

import httpx
from dotenv import load_dotenv
from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from agreement import compute_agreement
from extract import OLLAMA_MODEL_A, OLLAMA_MODEL_B, USE_MOCK_EXTRACTOR, extract_fields, ollama_reachable
from force_disagree import mutate_one_field
from fhir import build_fhir_bundle
from model_digest import resolve_model_digest
from grounding import (
    AGREEMENT_THRESHOLD,
    COHERENCE_THRESHOLD,
    OLLAMA_EMBED_MODEL,
    OLLAMA_HOST,
    OLLAMA_MODEL,
    canonical_json,
    check_rigors,
    compute_coherence,
    keccak_hex,
    score_fields,
)

load_dotenv()

app = FastAPI(title="Aegis AI Service", version="0.2.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


class ExtractRequest(BaseModel):
    documentText: str
    schema: list[str] = Field(default_factory=lambda: [
        "patientName", "dob", "diagnosis", "medications", "allergies", "followUp"
    ])
    consentId: Optional[str] = None
    modelId: Optional[str] = None


async def _score_model(
    document: str,
    schema: list[str],
    model_id: Optional[str],
    mock_variant: str,
    client: httpx.AsyncClient,
    model_digest: str,
) -> dict[str, Any]:
    raw, mid, _legacy_version, prompt_hash, used_mock = await extract_fields(
        document, schema, model_id, mock_variant=mock_variant
    )
    if used_mock and not model_digest.startswith("sha256:mock-"):
        model_digest = await resolve_model_digest(mid, client, used_mock=True)
    fields = await score_fields(document, raw, schema, client)
    rigors = check_rigors(fields, schema, document)
    coherence_score = compute_coherence(fields)
    output_hash = keccak_hex(canonical_json(fields))
    return {
        "fields": fields,
        "coherenceScore": coherence_score,
        "rigors": rigors,
        "modelId": mid,
        "modelDigest": model_digest,
        "modelVersion": keccak_hex(model_digest),
        "promptHash": prompt_hash,
        "outputHash": output_hash,
        "mock": used_mock,
    }


def _build_single_response(document: str, model: dict[str, Any], digest_a: str) -> dict[str, Any]:
    admissible = all(model["rigors"].values()) and model["coherenceScore"] >= COHERENCE_THRESHOLD
    return {
        "fields": model["fields"],
        "coherenceScore": model["coherenceScore"],
        "rigors": model["rigors"],
        "admissible": admissible,
        "modelId": model["modelId"],
        "modelVersion": model["modelVersion"],
        "modelDigest": model["modelDigest"],
        "digestA": digest_a,
        "promptHash": model["promptHash"],
        "inputHash": keccak_hex(document),
        "outputHash": model["outputHash"],
        "mock": model["mock"],
        "ensemble": False,
    }


@app.get("/health")
async def health() -> dict[str, Any]:
    reachable = False
    installed: list[str] = []
    try:
        async with httpx.AsyncClient() as client:
            reachable = await ollama_reachable(client)
            if reachable:
                resp = await client.get(f"{OLLAMA_HOST}/api/tags", timeout=5)
                resp.raise_for_status()
                installed = [m["name"] for m in resp.json().get("models", [])]
    except Exception:
        reachable = False

    def _has_model(name: str) -> bool:
        return any(name == n or n.startswith(f"{name}:") for n in installed)

    model_a_ready = _has_model(OLLAMA_MODEL_A)
    model_b_ready = _has_model(OLLAMA_MODEL_B)
    using_mock = USE_MOCK_EXTRACTOR or not reachable or not model_a_ready
    model = "mock-extractor" if using_mock else OLLAMA_MODEL

    model_a_digest: str | None = None
    model_b_digest: str | None = None
    if reachable:
        try:
            async with httpx.AsyncClient() as client:
                model_a_digest = await resolve_model_digest(
                    OLLAMA_MODEL_A, client, used_mock=using_mock
                )
                if model_b_ready:
                    model_b_digest = await resolve_model_digest(
                        OLLAMA_MODEL_B, client, used_mock=using_mock
                    )
        except Exception:
            pass

    return {
        "status": "ok",
        "model": model,
        "modelA": OLLAMA_MODEL_A,
        "modelB": OLLAMA_MODEL_B,
        "modelAReady": model_a_ready,
        "modelBReady": model_b_ready,
        "modelADigest": model_a_digest,
        "modelBDigest": model_b_digest,
        "ollamaReachable": reachable,
        "mock": using_mock,
        "embedModel": OLLAMA_EMBED_MODEL,
        "ensembleSupported": True,
    }


@app.get("/models")
async def models() -> dict[str, list[str]]:
    try:
        async with httpx.AsyncClient() as client:
            resp = await client.get(f"{OLLAMA_HOST}/api/tags", timeout=5)
            resp.raise_for_status()
            names = [m["name"] for m in resp.json().get("models", [])]
            return {"models": names}
    except Exception:
        return {"models": ["mock-extractor", "mock-extractor-b"]}


@app.post("/extract")
async def extract(
    req: ExtractRequest,
    mode: str = Query("single", description="single | ensemble"),
    format: str = Query("json", description="json | fhir"),
    force_disagree: bool = Query(False, description="Demo: mutate Model B to force disagreement"),
) -> dict[str, Any]:
    async with httpx.AsyncClient() as client:
        model_a_name = req.modelId or OLLAMA_MODEL_A
        digest_a = await resolve_model_digest(model_a_name, client, used_mock=USE_MOCK_EXTRACTOR)
        digest_b = await resolve_model_digest(OLLAMA_MODEL_B, client, used_mock=USE_MOCK_EXTRACTOR)

        if mode == "ensemble":
            model_a = await _score_model(
                req.documentText, req.schema, model_a_name, "a", client, digest_a
            )
            try:
                model_b = await _score_model(
                    req.documentText, req.schema, OLLAMA_MODEL_B, "b", client, digest_b
                )
            except Exception:
                model_b = await _score_model(
                    req.documentText, req.schema, None, "b", client, digest_b
                )

            mutated_field: str | None = None
            if force_disagree:
                model_b["fields"], mutated_field = mutate_one_field(model_b["fields"])
                model_b["outputHash"] = keccak_hex(canonical_json(model_b["fields"]))

            agreement = await compute_agreement(
                req.documentText, model_a["fields"], model_b["fields"], req.schema, client
            )

            a_ok = all(model_a["rigors"].values()) and model_a["coherenceScore"] >= COHERENCE_THRESHOLD
            b_ok = all(model_b["rigors"].values()) and model_b["coherenceScore"] >= COHERENCE_THRESHOLD
            agree_ok = agreement["overall"] >= AGREEMENT_THRESHOLD
            if force_disagree and agree_ok:
                agree_ok = False
                agreement["overall"] = min(agreement["overall"], AGREEMENT_THRESHOLD - 1)
            admissible = a_ok and b_ok and agree_ok

            coherence = min(model_a["coherenceScore"], model_b["coherenceScore"])

            body: dict[str, Any] = {
                "ensemble": True,
                "models": [model_a, model_b],
                "agreement": agreement,
                "fields": model_a["fields"],
                "coherenceScore": coherence,
                "rigors": model_a["rigors"],
                "admissible": admissible,
                "modelId": model_a["modelId"],
                "modelVersion": model_a["modelVersion"],
                "modelDigest": model_a["modelDigest"],
                "digestA": digest_a,
                "digestB": digest_b,
                "secondModelId": model_b["modelId"],
                "secondModelVersion": model_b["modelVersion"],
                "secondModelDigest": model_b["modelDigest"],
                "secondOutputHash": model_b["outputHash"],
                "agreementScore": agreement["overall"],
                "promptHash": model_a["promptHash"],
                "inputHash": keccak_hex(req.documentText),
                "outputHash": model_a["outputHash"],
                "mock": model_a["mock"] or model_b["mock"],
            }
            if force_disagree:
                body["forceDisagree"] = True
                body["mutatedField"] = mutated_field
            if not admissible:
                reasons = []
                if not a_ok:
                    reasons.append(f"Model A below threshold ({model_a['coherenceScore']})")
                if not b_ok:
                    reasons.append(f"Model B below threshold ({model_b['coherenceScore']})")
                if not agree_ok:
                    if force_disagree:
                        reasons.append(
                            f"Forced disagreement demo — agreement {agreement['overall']}% < {AGREEMENT_THRESHOLD}"
                        )
                    else:
                        reasons.append(f"Agreement {agreement['overall']} < {AGREEMENT_THRESHOLD}")
                body["rejectReason"] = "; ".join(reasons)
        else:
            model = await _score_model(req.documentText, req.schema, req.modelId, "a", client, digest_a)
            body = _build_single_response(req.documentText, model, digest_a)

    if format == "fhir":
        body["fhirBundle"] = build_fhir_bundle(body["fields"])

    return body
