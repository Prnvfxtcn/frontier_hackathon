import type { Metadata } from "next";
import { Outfit, JetBrains_Mono } from "next/font/google";
import { Providers } from "@/components/providers";
import { Nav } from "@/components/nav";
import { ContractsBanner } from "@/components/contracts-banner";
import "./globals.css";

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-outfit",
  display: "swap",
});

const jetbrains = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Aegis — Privacy-Preserving Clinical AI",
  description: "Verifiable proof-of-inference with on-chain consent and settlement",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${outfit.variable} ${jetbrains.variable}`}>
      <body className="font-sans antialiased">
        <Providers>
          <div className="relative min-h-screen">
            <ContractsBanner />
            <Nav />
            <main className="mx-auto max-w-6xl px-4 py-8 pb-16">{children}</main>
            <footer className="border-t border-slate-200 bg-white py-6">
              <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 text-xs text-slate-600">
                <span>Aegis · Privacy-preserving clinical AI on Base Sepolia</span>
                <span>SC-AS Coherence · HB 2080 Settlement · Zero PHI on-chain</span>
              </div>
            </footer>
          </div>
        </Providers>
      </body>
    </html>
  );
}
