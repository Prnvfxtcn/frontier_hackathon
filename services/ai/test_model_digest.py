import asyncio
import unittest
from unittest.mock import AsyncMock, MagicMock

from model_digest import fetch_model_digest, mock_model_digest, normalize_digest, resolve_model_digest


class TestModelDigest(unittest.TestCase):
    def test_normalize_digest_adds_prefix(self):
        self.assertEqual(normalize_digest("deadbeef"), "sha256:deadbeef")
        self.assertEqual(normalize_digest("sha256:deadbeef"), "sha256:deadbeef")
        self.assertEqual(normalize_digest("0xdeadbeef"), "sha256:deadbeef")

    def test_mock_model_digest_is_stable(self):
        a = mock_model_digest("llama3.1:8b")
        b = mock_model_digest("llama3.1:8b")
        self.assertEqual(a, b)
        self.assertTrue(a.startswith("sha256:"))

    def test_fetch_model_digest_from_show(self):
        client = AsyncMock()
        show_resp = MagicMock()
        show_resp.status_code = 200
        show_resp.json.return_value = {"digest": "sha256:abc123"}
        client.post = AsyncMock(return_value=show_resp)

        digest = asyncio.run(fetch_model_digest("llama3.1:8b", client))
        self.assertEqual(digest, "sha256:abc123")

    def test_fetch_model_digest_falls_back_to_tags(self):
        client = AsyncMock()
        show_resp = MagicMock()
        show_resp.status_code = 404
        tags_resp = MagicMock()
        tags_resp.json.return_value = {
            "models": [{"name": "llama3.1:8b", "digest": "deadbeefcafebabe"}]
        }
        tags_resp.raise_for_status = MagicMock()
        client.post = AsyncMock(return_value=show_resp)
        client.get = AsyncMock(return_value=tags_resp)

        digest = asyncio.run(fetch_model_digest("llama3.1:8b", client))
        self.assertEqual(digest, "sha256:deadbeefcafebabe")

    def test_resolve_model_digest_uses_mock_when_requested(self):
        client = AsyncMock()
        digest = asyncio.run(resolve_model_digest("llama3.1:8b", client, used_mock=True))
        self.assertEqual(digest, mock_model_digest("llama3.1:8b"))


if __name__ == "__main__":
    unittest.main()
