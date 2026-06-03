import { keccak256, toBytes, encodePacked } from "viem";
import { hashDocument } from "./hashing";
import { FIELD_CATEGORIES } from "./types";

export function hashText(text: string): `0x${string}` {
  return hashDocument(text);
}

export function hashScope(fields: string[]): `0x${string}` {
  const sorted = [...fields].sort().join(",");
  return keccak256(toBytes(sorted));
}

export const DEFAULT_SCOPE_HASH = hashScope([...FIELD_CATEGORIES]);

export function patientRef(address: `0x${string}`): `0x${string}` {
  return keccak256(encodePacked(["address"], [address]));
}

export async function encryptDocument(text: string, key?: CryptoKey): Promise<{ ciphertext: string; key: CryptoKey }> {
  const cryptoKey =
    key ??
    (await crypto.subtle.generateKey({ name: "AES-GCM", length: 256 }, true, ["encrypt", "decrypt"]));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encoded = new TextEncoder().encode(text);
  const encrypted = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, cryptoKey, encoded);
  const combined = new Uint8Array(iv.length + encrypted.byteLength);
  combined.set(iv, 0);
  combined.set(new Uint8Array(encrypted), iv.length);
  const b64 = btoa(String.fromCharCode(...combined));
  return { ciphertext: b64, key: cryptoKey };
}

export function storeCiphertext(id: string, ciphertext: string) {
  if (typeof window === "undefined") return;
  const store = JSON.parse(localStorage.getItem("aegis-ciphertext") ?? "{}");
  store[id] = ciphertext;
  localStorage.setItem("aegis-ciphertext", JSON.stringify(store));
}

export function clearDemoStorage() {
  if (typeof window === "undefined") return;
  localStorage.removeItem("aegis-ciphertext");
  localStorage.removeItem("aegis-receipts");
}
