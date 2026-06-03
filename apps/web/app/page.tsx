import Link from "next/link";
import { Card, Pill } from "@/components/ui";
import { ShieldIcon, PatientIcon, ProviderIcon, VerifyIcon, ChainIcon, SparkIcon } from "@/components/icons";

const roles = [
  {
    href: "/patient",
    title: "Patient",
    desc: "Grant scoped consent, audit every inference against your data, revoke access anytime.",
    icon: PatientIcon,
    gradient: "from-violet-500/10 to-purple-600/5",
    iconBg: "bg-violet-500/10 text-violet-600",
  },
  {
    href: "/provider",
    title: "Provider",
    desc: "Run local AI extraction under valid consent. Pay per inference. Receive on-chain receipts.",
    icon: ProviderIcon,
    gradient: "from-teal-500/10 to-cyan-600/5",
    iconBg: "bg-teal-500/10 text-teal-600",
  },
  {
    href: "/verify",
    title: "Verifier",
    desc: "Independently verify any proof-of-inference receipt — no wallet required.",
    icon: VerifyIcon,
    gradient: "from-cyan-500/10 to-blue-600/5",
    iconBg: "bg-cyan-500/10 text-cyan-600",
  },
];

const features = [
  { label: "Cryptographic Consent", desc: "EIP-712 scoped grants" },
  { label: "Five Rigors Grounding", desc: "SC-AS coherence scoring" },
  { label: "Per-Inference Settlement", desc: "HB 2080 mUSDC payments" },
  { label: "Zero PHI On-Chain", desc: "Hashes & Merkle roots only" },
];

const flow = [
  { step: "01", title: "Grant", body: "Patient signs scoped consent on-chain" },
  { step: "02", title: "Extract", body: "Local AI runs under valid authorization" },
  { step: "03", title: "Receipt", body: "Proof-of-inference minted with coherence score" },
  { step: "04", title: "Verify", body: "Anyone independently validates the receipt" },
];

export default function HomePage() {
  return (
    <div className="space-y-12 animate-fade-in">
      {/* Hero */}
      <section className="relative overflow-hidden rounded-[2rem] hero-glow px-8 py-16 text-white shadow-glow md:px-14 md:py-20">
        <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-teal-400/20 blur-3xl" />
        <div className="absolute -bottom-16 -left-16 h-48 w-48 rounded-full bg-cyan-400/15 blur-3xl" />
        <div className="relative mx-auto max-w-3xl text-center">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-teal-100 backdrop-blur">
            <SparkIcon className="h-4 w-4 text-teal-300" />
            Healthcare Assets · Base Sepolia
          </div>
          <div className="mx-auto mb-6 flex h-20 w-20 animate-float items-center justify-center rounded-3xl bg-white/10 ring-1 ring-white/20 backdrop-blur">
            <ShieldIcon className="h-10 w-10 text-teal-200" />
          </div>
          <h1 className="font-display text-5xl font-bold tracking-tight md:text-6xl">
            Aegis
          </h1>
          <p className="mt-6 text-lg leading-relaxed text-white md:text-xl">
            Privacy-preserving clinical AI with cryptographic consent, local inference, and
            tamper-proof proof-of-inference receipts — settled per use in mock USDC.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link
              href="/provider"
              className="inline-flex items-center rounded-xl bg-white px-6 py-3 text-sm font-bold text-teal-800 shadow-lg transition hover:scale-105 hover:shadow-xl"
            >
              Start Demo →
            </Link>
            <Link
              href="/verify"
              className="inline-flex items-center rounded-xl border border-white/30 bg-white/10 px-6 py-3 text-sm font-semibold text-white backdrop-blur transition hover:bg-white/20"
            >
              Verify a Receipt
            </Link>
          </div>
        </div>
      </section>

      {/* Stats strip */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {features.map((f) => (
          <div
            key={f.label}
            className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card transition hover:-translate-y-0.5 hover:shadow-card-hover"
          >
            <p className="font-display text-sm font-bold text-slate-900">{f.label}</p>
            <p className="mt-1 text-xs text-slate-600">{f.desc}</p>
          </div>
        ))}
      </div>

      {/* Role cards */}
      <div>
        <div className="mb-6 text-center">
          <h2 className="font-display text-2xl font-bold text-slate-900">Choose your role</h2>
          <p className="mt-2 text-slate-600">Three perspectives on the same trust layer</p>
        </div>
        <div className="grid gap-5 md:grid-cols-3">
          {roles.map((r) => (
            <Link key={r.href} href={r.href} className="group">
              <Card className={`h-full bg-gradient-to-br ${r.gradient} transition-all duration-300 group-hover:-translate-y-1 group-hover:border-teal-300/60 group-hover:shadow-card-hover`}>
                <div className={`mb-4 inline-flex rounded-xl p-3 ${r.iconBg}`}>
                  <r.icon className="h-6 w-6" />
                </div>
                <h3 className="font-display text-xl font-bold text-slate-900">{r.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">{r.desc}</p>
                <span className="mt-4 inline-flex items-center text-sm font-semibold text-teal-600 group-hover:gap-2 transition-all">
                  Open dashboard
                  <span className="ml-1 opacity-0 transition group-hover:opacity-100">→</span>
                </span>
              </Card>
            </Link>
          ))}
        </div>
      </div>

      {/* Flow */}
      <section className="rounded-3xl border border-slate-200 bg-white p-8 shadow-card md:p-10">
        <div className="mb-8 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-500/10 text-teal-600">
            <ChainIcon />
          </div>
          <div>
            <h2 className="font-display text-xl font-bold text-slate-900">Golden path</h2>
            <p className="text-sm text-slate-600">End-to-end demo flow in four steps</p>
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-4">
          {flow.map((f, i) => (
            <div key={f.step} className="relative rounded-2xl border border-slate-200 bg-slate-50 p-5">
              {i < flow.length - 1 && (
                <div className="absolute right-0 top-1/2 hidden h-px w-4 translate-x-full bg-gradient-to-r from-teal-300 to-transparent md:block" />
              )}
              <span className="font-mono text-xs font-bold text-teal-600">{f.step}</span>
              <h3 className="mt-2 font-display font-bold text-slate-900">{f.title}</h3>
              <p className="mt-1 text-sm text-slate-700">{f.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Invariant */}
      <div className="rounded-2xl border border-teal-200/60 bg-gradient-to-r from-teal-50/80 to-cyan-50/80 p-6 text-center">
        <Pill variant="info">Both-halves invariant</Pill>
        <p className="mt-3 text-sm leading-relaxed text-slate-700">
          Remove the <strong>AI</strong> → dead consent registry. Remove the <strong>blockchain</strong> →
          unprovable outputs, no audit trail, no settlement.
        </p>
      </div>
    </div>
  );
}
