"use client";

import Link from "next/link";
import { useCallback, useState } from "react";
import { Card, Button, SectionTitle } from "@/components/ui";

export function ReceiptIdCard({
  receiptId,
  txHash,
  compact,
}: {
  receiptId: string;
  txHash?: string | null;
  compact?: boolean;
}) {
  const [copied, setCopied] = useState(false);

  const copy = useCallback(async () => {
    await navigator.clipboard.writeText(receiptId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [receiptId]);

  return (
    <Card glow className={compact ? "p-4" : undefined}>
      <SectionTitle
        title="Receipt ID"
        description="Paste this on Verify — not your MetaMask transaction hash"
      />
      <p className="mono-block mt-2">{receiptId}</p>
      <div className="mt-4 flex flex-wrap gap-2">
        <Button variant="secondary" size="sm" onClick={copy}>
          {copied ? "Copied!" : "Copy Receipt ID"}
        </Button>
        <Link href={`/verify?id=${receiptId}`}>
          <Button size="sm">Verify this receipt</Button>
        </Link>
        <Link href={`/inference/${receiptId}`}>
          <Button variant="secondary" size="sm">View full receipt</Button>
        </Link>
      </div>
      {txHash && (
        <p className="mt-3 text-xs text-slate-500">
          Tx hash (not receipt ID): <span className="font-mono break-all">{txHash}</span>
        </p>
      )}
    </Card>
  );
}
