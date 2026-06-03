"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RainbowKitProvider } from "@rainbow-me/rainbowkit";
import { WagmiProvider } from "wagmi";
import "@rainbow-me/rainbowkit/styles.css";
import { aegisChain, AEGIS_RPC } from "@/lib/aegis-client";
import { createConfig, http } from "wagmi";
import { injected } from "wagmi/connectors";

const wagmiConfig = createConfig({
  chains: [aegisChain],
  connectors: [injected({ target: "metaMask" })],
  transports: {
    [aegisChain.id]: http(AEGIS_RPC),
  },
  ssr: false,
});

const queryClient = new QueryClient();

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider initialChain={aegisChain}>{children}</RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
