"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { clearDemoStorage } from "@/lib/crypto";
import { ShieldIcon } from "@/components/icons";

const ConnectButton = dynamic(
  () => import("@rainbow-me/rainbowkit").then((m) => m.ConnectButton),
  { ssr: false }
);

const links = [
  { href: "/", label: "Home" },
  { href: "/patient", label: "Patient" },
  { href: "/provider", label: "Provider" },
  { href: "/verify", label: "Verify" },
  { href: "/reconciliation", label: "Reconciliation" },
  { href: "/showcase", label: "Showcase" },
];

export function Nav() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-slate-200/60 bg-white/70 backdrop-blur-xl backdrop-saturate-150">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
        <div className="flex items-center gap-8">
          <Link href="/" className="group flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-teal-600 to-cyan-600 text-white shadow-md shadow-teal-500/30 transition group-hover:scale-105">
              <ShieldIcon className="h-5 w-5" />
            </div>
            <span className="font-display text-xl font-bold tracking-tight text-slate-900">
              Aegis
            </span>
          </Link>
          <nav className="hidden lg:flex items-center gap-1">
            {links.map((l) => {
              const active = pathname === l.href;
              return (
                <Link
                  key={l.href}
                  href={l.href}
                  className={`rounded-lg px-3 py-2 text-sm font-medium transition ${
                    active
                      ? "bg-teal-50 text-teal-700 ring-1 ring-teal-200/60"
                      : "text-slate-600 hover:bg-slate-100/80 hover:text-slate-900"
                  }`}
                >
                  {l.label}
                </Link>
              );
            })}
          </nav>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              clearDemoStorage();
              alert("Demo local state cleared.");
            }}
            className="hidden sm:inline-flex rounded-lg border border-slate-200/80 bg-white/80 px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:border-teal-200 hover:bg-teal-50/50"
          >
            Reset Demo
          </button>
          <ConnectButton chainStatus="icon" showBalance={false} />
          <button
            type="button"
            className="inline-flex lg:hidden rounded-lg p-2 text-slate-600 hover:bg-slate-100"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Toggle menu"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              {mobileOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>
      </div>
      {mobileOpen && (
        <nav className="border-t border-slate-200/60 bg-white/95 px-4 py-3 lg:hidden">
          <div className="flex flex-col gap-1">
            {links.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                onClick={() => setMobileOpen(false)}
                className={`rounded-lg px-3 py-2.5 text-sm font-medium ${
                  pathname === l.href ? "bg-teal-50 text-teal-700" : "text-slate-600"
                }`}
              >
                {l.label}
              </Link>
            ))}
          </div>
        </nav>
      )}
    </header>
  );
}
