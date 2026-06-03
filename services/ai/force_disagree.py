"""Demo-only: mutate one Model B field to force ensemble disagreement."""
from __future__ import annotations

import copy
import random
from typing import Any


def mutate_one_field(fields: list[dict[str, Any]]) -> tuple[list[dict[str, Any]], str]:
    """Return a copy of fields with one random non-null value deliberately wrong."""
    candidates = [f for f in fields if f.get("value")]
    if not candidates:
        raise ValueError("No non-null fields available to mutate for force_disagree demo")

    target = random.choice(candidates)
    key = str(target["key"])
    original = str(target["value"])
    mutated = copy.deepcopy(fields)
    field = next(f for f in mutated if f["key"] == key)

    if key == "dob":
        chars = list(original)
        for i in range(len(chars) - 1, -1, -1):
            if chars[i].isdigit():
                chars[i] = str((int(chars[i]) + 1) % 10)
                break
        field["value"] = "".join(chars)
    else:
        field["value"] = f"{original} (forced)"

    return mutated, key
