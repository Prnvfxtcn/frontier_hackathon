import { createPublicClient, http } from "viem";
import { baseSepolia } from "viem/chains";

export const AEGIS_RPC =
  process.env.NEXT_PUBLIC_RPC_URL ?? "https://sepolia.base.org";

export const NETWORK_LABEL =
  process.env.NEXT_PUBLIC_NETWORK_LABEL ?? "Base Sepolia";

export const isLocalRpc =
  AEGIS_RPC.includes("127.0.0.1") || AEGIS_RPC.includes("localhost");

export const aegisChain = {
  ...baseSepolia,
  name: isLocalRpc ? "Base Sepolia (Local Anvil)" : NETWORK_LABEL,
  rpcUrls: {
    default: { http: [AEGIS_RPC] },
    public: { http: [AEGIS_RPC] },
  },
} as const;

/** Always use this for readContract/getLogs — NOT usePublicClient (MetaMask may proxy elsewhere). */
export const aegisPublicClient = createPublicClient({
  chain: aegisChain,
  transport: http(AEGIS_RPC),
});

export const networkDetails = {
  chainId: `0x${(84532).toString(16)}`,
  chainName: isLocalRpc ? "Base Sepolia (Local Anvil)" : NETWORK_LABEL,
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: [AEGIS_RPC],
  blockExplorerUrls: ["https://sepolia.basescan.org"],
} as const;

/** @deprecated use networkDetails */
export const localNetworkDetails = networkDetails;
