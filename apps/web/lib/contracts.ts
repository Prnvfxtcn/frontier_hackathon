import { aegisChain, aegisPublicClient, AEGIS_RPC, isLocalRpc } from "./aegis-client";

export const chain = aegisChain;
export const publicClient = aegisPublicClient;
export { AEGIS_RPC, isLocalRpc };

export const contractAddresses = {
  consentRegistry: (process.env.NEXT_PUBLIC_CONSENT_REGISTRY ?? "0x") as `0x${string}`,
  inferenceRegistry: (process.env.NEXT_PUBLIC_INFERENCE_REGISTRY ?? "0x") as `0x${string}`,
  settlement: (process.env.NEXT_PUBLIC_SETTLEMENT ?? "0x") as `0x${string}`,
  mockUsdc: (process.env.NEXT_PUBLIC_MOCK_USDC ?? "0x") as `0x${string}`,
};

export const inferenceRegistryAbi = [
  {
    type: "function",
    name: "recordInference",
    stateMutability: "nonpayable",
    inputs: [
      {
        name: "r",
        type: "tuple",
        components: [
          { name: "consentId", type: "bytes32" },
          { name: "provider", type: "address" },
          { name: "patientRef", type: "bytes32" },
          { name: "inputHash", type: "bytes32" },
          { name: "outputHash", type: "bytes32" },
          { name: "promptHash", type: "bytes32" },
          { name: "merkleRoot", type: "bytes32" },
          { name: "modelId", type: "string" },
          { name: "modelVersion", type: "bytes32" },
          { name: "coherenceScore", type: "uint16" },
          { name: "timestamp", type: "uint64" },
          { name: "paid", type: "bool" },
          { name: "secondModelId", type: "string" },
          { name: "secondModelVersion", type: "bytes32" },
          { name: "secondOutputHash", type: "bytes32" },
          { name: "agreementScore", type: "uint16" },
        ],
      },
    ],
    outputs: [{ name: "receiptId", type: "bytes32" }],
  },
  {
    type: "function",
    name: "verifyEnsembleReceipt",
    stateMutability: "view",
    inputs: [
      { name: "id", type: "bytes32" },
      { name: "inputHash", type: "bytes32" },
      { name: "outputHash", type: "bytes32" },
      { name: "secondOutputHash", type: "bytes32" },
    ],
    outputs: [{ name: "", type: "bool" }],
  },
  {
    type: "function",
    name: "getReceipt",
    stateMutability: "view",
    inputs: [{ name: "id", type: "bytes32" }],
    outputs: [
      {
        name: "",
        type: "tuple",
        components: [
          { name: "consentId", type: "bytes32" },
          { name: "provider", type: "address" },
          { name: "patientRef", type: "bytes32" },
          { name: "inputHash", type: "bytes32" },
          { name: "outputHash", type: "bytes32" },
          { name: "promptHash", type: "bytes32" },
          { name: "merkleRoot", type: "bytes32" },
          { name: "modelId", type: "string" },
          { name: "modelVersion", type: "bytes32" },
          { name: "coherenceScore", type: "uint16" },
          { name: "timestamp", type: "uint64" },
          { name: "paid", type: "bool" },
          { name: "secondModelId", type: "string" },
          { name: "secondModelVersion", type: "bytes32" },
          { name: "secondOutputHash", type: "bytes32" },
          { name: "agreementScore", type: "uint16" },
        ],
      },
    ],
  },
  {
    type: "function",
    name: "verifyReceipt",
    stateMutability: "view",
    inputs: [
      { name: "id", type: "bytes32" },
      { name: "inputHash", type: "bytes32" },
      { name: "outputHash", type: "bytes32" },
    ],
    outputs: [{ name: "", type: "bool" }],
  },
  {
    type: "event",
    name: "InferenceRecorded",
    inputs: [
      { name: "receiptId", type: "bytes32", indexed: true },
      { name: "consentId", type: "bytes32", indexed: true },
      { name: "provider", type: "address", indexed: true },
      { name: "patientRef", type: "bytes32", indexed: false },
      { name: "coherenceScore", type: "uint16", indexed: false },
      { name: "timestamp", type: "uint64", indexed: false },
      { name: "agreementScore", type: "uint16", indexed: false },
      { name: "secondModelId", type: "string", indexed: false },
    ],
  },
] as const;

export const consentRegistryAbi = [
  {
    type: "function",
    name: "grantConsent",
    stateMutability: "nonpayable",
    inputs: [
      { name: "provider", type: "address" },
      { name: "scopeHash", type: "bytes32" },
      { name: "purpose", type: "uint8" },
      { name: "expiresAt", type: "uint64" },
    ],
    outputs: [{ name: "consentId", type: "bytes32" }],
  },
  {
    type: "function",
    name: "revokeConsent",
    stateMutability: "nonpayable",
    inputs: [{ name: "consentId", type: "bytes32" }],
  },
  {
    type: "function",
    name: "isConsentValid",
    stateMutability: "view",
    inputs: [
      { name: "consentId", type: "bytes32" },
      { name: "provider", type: "address" },
      { name: "scopeHash", type: "bytes32" },
    ],
    outputs: [{ name: "", type: "bool" }],
  },
  {
    type: "function",
    name: "getConsent",
    stateMutability: "view",
    inputs: [{ name: "consentId", type: "bytes32" }],
    outputs: [
      {
        name: "",
        type: "tuple",
        components: [
          { name: "patient", type: "address" },
          { name: "provider", type: "address" },
          { name: "scopeHash", type: "bytes32" },
          { name: "purpose", type: "uint8" },
          { name: "issuedAt", type: "uint64" },
          { name: "expiresAt", type: "uint64" },
          { name: "revoked", type: "bool" },
        ],
      },
    ],
  },
  {
    type: "event",
    name: "ConsentGranted",
    inputs: [
      { name: "consentId", type: "bytes32", indexed: true },
      { name: "patient", type: "address", indexed: true },
      { name: "provider", type: "address", indexed: true },
      { name: "scopeHash", type: "bytes32", indexed: false },
      { name: "expiresAt", type: "uint64", indexed: false },
    ],
  },
  {
    type: "event",
    name: "ConsentRevoked",
    inputs: [{ name: "consentId", type: "bytes32", indexed: true }],
  },
] as const;

export const settlementAbi = [
  {
    type: "function",
    name: "price",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "event",
    name: "PaymentSettled",
    inputs: [
      { name: "receiptId", type: "bytes32", indexed: true },
      { name: "provider", type: "address", indexed: true },
      { name: "amount", type: "uint256", indexed: false },
      { name: "timestamp", type: "uint256", indexed: false },
    ],
  },
] as const;

export const mockUsdcAbi = [
  {
    type: "function",
    name: "mint",
    stateMutability: "nonpayable",
    inputs: [
      { name: "to", type: "address" },
      { name: "amount", type: "uint256" },
    ],
  },
  {
    type: "function",
    name: "allowance",
    stateMutability: "view",
    inputs: [
      { name: "owner", type: "address" },
      { name: "spender", type: "address" },
    ],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "approve",
    stateMutability: "nonpayable",
    inputs: [
      { name: "spender", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ name: "", type: "bool" }],
  },
  {
    type: "function",
    name: "balanceOf",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "decimals",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint8" }],
  },
] as const;

export function explorerTx(hash: string) {
  return `https://sepolia.basescan.org/tx/${hash}`;
}

export function explorerAddress(address: string) {
  return `https://sepolia.basescan.org/address/${address}`;
}
