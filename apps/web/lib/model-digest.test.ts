import { describe, expect, it } from "vitest";
import { formatDigestBadge, modelLabelWithDigest } from "./model-digest";

describe("model-digest", () => {
  it("truncates long sha256 digests for badges", () => {
    const digest = "sha256:" + "a".repeat(64);
    expect(formatDigestBadge(digest)).toBe("sha256:aaaa…aaaa");
  });

  it("normalizes raw hex digests", () => {
    expect(formatDigestBadge("abcd1234ef567890")).toBe("sha256:abcd…7890");
  });

  it("combines model id and digest badge", () => {
    expect(modelLabelWithDigest("llama3.1:8b", "sha256:abcd1234ef567890")).toBe(
      "llama3.1:8b  ·  sha256:abcd…7890"
    );
    expect(modelLabelWithDigest("llama3.1:8b")).toBe("llama3.1:8b");
  });
});
