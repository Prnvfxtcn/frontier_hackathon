import asyncio
import unittest
from pathlib import Path
from unittest.mock import patch

from force_disagree import mutate_one_field


def _fields(**values: str) -> list[dict]:
    return [
        {"key": k, "value": v, "sourceSpan": {"start": 0, "end": len(v)}, "grounding": 1.0}
        for k, v in values.items()
    ]


class ForceDisagreeTests(unittest.TestCase):
    def test_mutate_one_field_changes_value(self):
        fields = _fields(patientName="Jane Martinez", dob="1985-03-14", diagnosis="Type 2 Diabetes")
        mutated, key = mutate_one_field(fields)
        original = next(f for f in fields if f["key"] == key)["value"]
        updated = next(f for f in mutated if f["key"] == key)["value"]
        self.assertNotEqual(original, updated)

    def test_mutate_dob_flips_digit(self):
        fields = _fields(dob="1985-03-14")
        with patch("force_disagree.random.choice", return_value=fields[0]):
            mutated, key = mutate_one_field(fields)
        self.assertEqual(key, "dob")
        self.assertNotEqual("1985-03-14", mutated[0]["value"])

    def test_force_disagree_makes_ensemble_inadmissible(self):
        from main import ExtractRequest, extract

        doc = Path(__file__).resolve().parents[2] / "apps/web/public/samples/discharge-summary-1.txt"
        schema = ["patientName", "dob", "diagnosis", "medications", "allergies", "followUp"]
        req = ExtractRequest(documentText=doc.read_text(), schema=schema)

        async def run():
            with patch("main.USE_MOCK_EXTRACTOR", True):
                normal = await extract(req, mode="ensemble", format="json", force_disagree=False)
                forced = await extract(req, mode="ensemble", format="json", force_disagree=True)
            return normal, forced

        normal, forced = asyncio.run(run())
        self.assertTrue(normal["admissible"])
        self.assertGreaterEqual(normal["agreementScore"], 80)
        self.assertFalse(forced["admissible"])
        self.assertTrue(forced.get("forceDisagree"))
        self.assertLess(forced["agreementScore"], 80)


if __name__ == "__main__":
    unittest.main()
