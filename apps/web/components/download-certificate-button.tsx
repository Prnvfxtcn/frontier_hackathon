"use client";

import { useState } from "react";
import { Button } from "@/components/ui";
import type { ExtractResponse } from "@/lib/types";
import { downloadInferenceCertificate } from "@/lib/certificate";

type Props = {
  receiptId: string;
  extract?: ExtractResponse | null;
  txHash?: string | null;
  size?: "sm" | "md";
};

export function DownloadCertificateButton({ receiptId, extract, txHash, size = "md" }: Props) {
  const [busy, setBusy] = useState(false);

  async function handleDownload() {
    setBusy(true);
    try {
      await downloadInferenceCertificate({ receiptId, extract, txHash });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Button size={size} variant="secondary" disabled={busy} onClick={() => void handleDownload()}>
      {busy ? "Generating…" : "Download Certificate"}
    </Button>
  );
}
