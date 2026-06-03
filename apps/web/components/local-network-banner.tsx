"use client";

import { useState } from "react";
import { isLocalRpc, networkDetails, NETWORK_LABEL } from "@/lib/aegis-client";

export function NetworkBanner() {
  const [message, setMessage] = useState<string | null>(null);

  async function switchNetwork() {
    const ethereum = (window as Window & { ethereum?: { request: (args: unknown) => Promise<unknown> } }).ethereum;
    if (!ethereum) {
      setMessage("Install MetaMask, then click this button again.");
      return;
    }
    try {
      await ethereum.request({
        method: "wallet_addEthereumChain",
        params: [networkDetails],
      });
      await ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: networkDetails.chainId }],
      });
      setMessage(`Switched to ${networkDetails.chainName}. Connect wallet to continue.`);
    } catch (e) {
      try {
        await ethereum.request({
          method: "wallet_switchEthereumChain",
          params: [{ chainId: networkDetails.chainId }],
        });
        setMessage(
          isLocalRpc
            ? "Switched. If txs fail, set RPC to http://127.0.0.1:8545 in MetaMask → Networks."
            : `Switched to ${NETWORK_LABEL}.`
        );
      } catch {
        setMessage(
          e instanceof Error
            ? e.message
            : isLocalRpc
              ? "Open MetaMask → Networks → set RPC to http://127.0.0.1:8545"
              : `Add ${NETWORK_LABEL} in MetaMask (chain ID 84532).`
        );
      }
    }
  }

  return (
    <div
      className={`border-b px-4 py-2.5 text-sm ${
        isLocalRpc
          ? "border-amber-300/40 bg-gradient-to-r from-amber-50 to-orange-50 text-amber-950"
          : "border-teal-300/40 bg-gradient-to-r from-teal-50 to-cyan-50 text-teal-950"
      }`}
    >
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2">
        <span className="flex items-center gap-2">
          <span
            className={`inline-flex h-2 w-2 rounded-full ${isLocalRpc ? "bg-amber-500 animate-pulse" : "bg-teal-500"}`}
          />
          {isLocalRpc ? (
            <>
              <strong>Local dev:</strong> Anvil on{" "}
              <code className="rounded-md bg-amber-100/80 px-1.5 py-0.5 font-mono text-xs">127.0.0.1:8545</code>
              <span className="text-amber-800"> — not publicly verifiable</span>
            </>
          ) : (
            <>
              <strong>{NETWORK_LABEL}</strong> · chain ID 84532 ·{" "}
              <a href="https://sepolia.basescan.org" target="_blank" rel="noreferrer" className="underline">
                Basescan
              </a>
            </>
          )}
        </span>
        <button
          type="button"
          onClick={switchNetwork}
          className={`rounded-lg px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:brightness-110 ${
            isLocalRpc ? "bg-amber-600" : "bg-teal-600"
          }`}
        >
          Add / switch network
        </button>
      </div>
      {message && <p className="mx-auto mt-1.5 max-w-6xl text-xs opacity-80">{message}</p>}
    </div>
  );
}

/** @deprecated use NetworkBanner */
export const LocalNetworkBanner = NetworkBanner;
