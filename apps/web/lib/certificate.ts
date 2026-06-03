import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import QRCode from "qrcode";
import type { ExtractResponse } from "./types";
import { publicVerifyUrl } from "./public-provenance";
import { formatModelLabel } from "./model-labels";

const NAVY = rgb(0.086, 0.2, 0.357);
const TEAL = rgb(0.055, 0.604, 0.655);

function trunc(s: string, n = 12) {
  if (!s || s.length <= n + 4) return s;
  return `${s.slice(0, n)}…${s.slice(-4)}`;
}

export async function downloadInferenceCertificate(params: {
  receiptId: string;
  extract?: ExtractResponse | null;
  txHash?: string | null;
}) {
  const verifyUrl =
    typeof window !== "undefined"
      ? publicVerifyUrl(params.receiptId)
      : `https://aegis.local/verify?id=${params.receiptId}`;

  const pdf = await PDFDocument.create();
  const page = pdf.addPage([595, 842]);
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const { height, width } = page.getSize();

  page.drawRectangle({ x: 0, y: height - 72, width, height: 72, color: NAVY });
  page.drawText("AEGIS", { x: 40, y: height - 42, size: 22, font: bold, color: rgb(1, 1, 1) });
  page.drawText("CERTIFICATE OF INFERENCE", {
    x: 40,
    y: height - 58,
    size: 11,
    font,
    color: rgb(0.85, 0.95, 0.95),
  });

  let y = height - 110;
  const draw = (label: string, value: string, mono = false) => {
    page.drawText(label, { x: 40, y, size: 9, font: bold, color: rgb(0.4, 0.45, 0.5) });
    page.drawText(value, {
      x: 40,
      y: y - 14,
      size: mono ? 8 : 11,
      font: mono ? font : bold,
      color: NAVY,
      maxWidth: width - 180,
    });
    y -= 36;
  };

  draw("Receipt ID", params.receiptId, true);

  const score = params.extract?.coherenceScore ?? "—";
  page.drawCircle({ x: width - 100, y: height - 130, size: 42, borderColor: TEAL, borderWidth: 3 });
  page.drawText(String(score), {
    x: width - (String(score).length > 2 ? 118 : 112),
    y: height - 138,
    size: 18,
    font: bold,
    color: TEAL,
  });
  page.drawText("Coherence", { x: width - 118, y: height - 156, size: 8, font, color: rgb(0.4, 0.45, 0.5) });

  if (params.extract?.ensemble && params.extract.agreementScore != null) {
    draw("Ensemble agreement", `${params.extract.agreementScore}%`);
    draw("Model A", formatModelLabel(params.extract.modelId, params.extract.mock));
    draw("Model B", formatModelLabel(params.extract.secondModelId ?? "—", params.extract.mock));
  } else {
    draw("Model", formatModelLabel(params.extract?.modelId ?? "—", params.extract?.mock));
  }

  draw("Input hash", trunc(params.extract?.inputHash ?? "—", 20), true);
  draw("Output hash", trunc(params.extract?.outputHash ?? "—", 20), true);

  if (params.txHash) draw("Transaction", trunc(params.txHash, 20), true);

  page.drawText("Five Rigors: Fidelity · Conservation · Austerity · Coherence", {
    x: 40,
    y: 120,
    size: 9,
    font,
    color: TEAL,
  });
  page.drawText(`Verify this certificate: ${verifyUrl}`, {
    x: 40,
    y: 90,
    size: 8,
    font,
    color: rgb(0.35, 0.4, 0.45),
  });

  const qrData = await QRCode.toDataURL(verifyUrl, { margin: 1, width: 120 });
  const qrBytes = Uint8Array.from(atob(qrData.split(",")[1]!), (c) => c.charCodeAt(0));
  const qrImg = await pdf.embedPng(qrBytes);
  page.drawImage(qrImg, { x: width - 140, y: 60, width: 100, height: 100 });

  const bytes = await pdf.save();
  const blob = new Blob([bytes.buffer as ArrayBuffer], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `aegis-certificate-${params.receiptId.slice(0, 10)}.pdf`;
  a.click();
  URL.revokeObjectURL(url);
}
