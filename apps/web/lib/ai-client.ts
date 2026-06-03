import type { ExtractResponse } from "./types";

const AI_SERVICE_URL = process.env.NEXT_PUBLIC_AI_SERVICE_URL ?? "http://localhost:8000";
const EXTRACT_TIMEOUT_MS = 60_000;

export async function extractDocument(params: {
  documentText: string;
  schema: string[];
  consentId?: string;
  modelId?: string;
  ensemble?: boolean;
  forceDisagree?: boolean;
  format?: "json" | "fhir";
  timeoutMs?: number;
}): Promise<ExtractResponse> {
  const url = new URL(`${AI_SERVICE_URL}/extract`);
  if (params.ensemble) url.searchParams.set("mode", "ensemble");
  if (params.format) url.searchParams.set("format", params.format);
  if (params.forceDisagree) url.searchParams.set("force_disagree", "true");

  const controller = new AbortController();
  const timeoutMs = params.timeoutMs ?? EXTRACT_TIMEOUT_MS;
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url.toString(), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        documentText: params.documentText,
        schema: params.schema,
        consentId: params.consentId,
        modelId: params.modelId,
      }),
      signal: controller.signal,
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(text || "Extraction failed");
    }
    return res.json();
  } catch (e) {
    if (e instanceof Error && e.name === "AbortError") {
      throw new Error(
        `Extraction timed out after ${Math.round(timeoutMs / 1000)}s. Ollama may still be loading models — try again in a moment.`
      );
    }
    throw e;
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function checkAiHealth(): Promise<{
  status: string;
  model: string;
  modelA?: string;
  modelB?: string;
  modelAReady?: boolean;
  modelBReady?: boolean;
  modelADigest?: string;
  modelBDigest?: string;
  ollamaReachable?: boolean;
  mock?: boolean;
  embedModel?: string;
  ensembleSupported?: boolean;
}> {
  const res = await fetch(`${AI_SERVICE_URL}/health`);
  return res.json();
}
