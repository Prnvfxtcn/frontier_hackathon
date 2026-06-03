/** Format Ollama model digest for UI badges: sha256:abcd…ef01 */
export function formatDigestBadge(digest: string | undefined | null): string | null {
  if (!digest) return null;
  const normalized = digest.startsWith("sha256:") ? digest.slice(7) : digest.replace(/^0x/, "");
  if (normalized.length <= 12) return `sha256:${normalized}`;
  return `sha256:${normalized.slice(0, 4)}…${normalized.slice(-4)}`;
}

export function modelLabelWithDigest(modelId: string, digest?: string | null): string {
  const badge = formatDigestBadge(digest);
  return badge ? `${modelId}  ·  ${badge}` : modelId;
}
