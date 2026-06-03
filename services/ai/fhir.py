"""Minimal FHIR R4 Bundle from extracted clinical fields."""
from __future__ import annotations

from typing import Any


def _split_list(value: str | None) -> list[str]:
    if not value:
        return []
    return [part.strip() for part in value.replace(";", ",").split(",") if part.strip()]


def build_fhir_bundle(fields: list[dict[str, Any]]) -> dict[str, Any]:
    by_key = {f["key"]: f.get("value") for f in fields}
    patient_name = by_key.get("patientName") or "Unknown Patient"
    dob = by_key.get("dob")

    resources: list[dict[str, Any]] = []

    patient: dict[str, Any] = {
        "resourceType": "Patient",
        "id": "patient-1",
        "name": [{"text": patient_name}],
    }
    if dob:
        patient["birthDate"] = dob
    resources.append(patient)

    diagnosis = by_key.get("diagnosis")
    if diagnosis:
        for i, dx in enumerate(_split_list(str(diagnosis))):
            resources.append(
                {
                    "resourceType": "Condition",
                    "id": f"condition-{i + 1}",
                    "subject": {"reference": "Patient/patient-1"},
                    "code": {"text": dx},
                }
            )

    meds = by_key.get("medications")
    if meds:
        for i, med in enumerate(_split_list(str(meds))):
            resources.append(
                {
                    "resourceType": "MedicationStatement",
                    "id": f"med-{i + 1}",
                    "subject": {"reference": "Patient/patient-1"},
                    "medicationCodeableConcept": {"text": med},
                    "status": "active",
                }
            )

    allergies = by_key.get("allergies")
    if allergies:
        for i, alg in enumerate(_split_list(str(allergies))):
            resources.append(
                {
                    "resourceType": "AllergyIntolerance",
                    "id": f"allergy-{i + 1}",
                    "patient": {"reference": "Patient/patient-1"},
                    "code": {"text": alg},
                }
            )

    follow_up = by_key.get("followUp")
    if follow_up:
        resources.append(
            {
                "resourceType": "Observation",
                "id": "followup-1",
                "status": "final",
                "subject": {"reference": "Patient/patient-1"},
                "code": {"text": "Follow-up plan"},
                "valueString": str(follow_up),
            }
        )

    return {
        "resourceType": "Bundle",
        "type": "collection",
        "entry": [{"resource": r} for r in resources],
    }
