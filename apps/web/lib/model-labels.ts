/** Human-readable model label for UI badges (video-friendly). */
export function formatModelLabel(modelId: string, mock?: boolean): string {
  if (mock || modelId.startsWith("mock-")) return "Mock (dev fallback)";
  const name = modelId.replace(/:latest$/, "");
  return `${name} (local)`;
}
