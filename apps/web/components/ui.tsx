import { clsx } from "clsx";
import type { ReactNode, ButtonHTMLAttributes, InputHTMLAttributes, TextareaHTMLAttributes } from "react";

export function Card({
  className,
  children,
  glow,
}: {
  className?: string;
  children: React.ReactNode;
  glow?: boolean;
}) {
  return (
    <div
      className={clsx(
        "rounded-2xl border border-slate-200 bg-white p-6 shadow-card",
        glow && "animate-pulse-glow border-teal-300",
        className
      )}
    >
      {children}
    </div>
  );
}

export function Badge({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span
      className={clsx(
        "inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold tracking-wide uppercase",
        ok
          ? "bg-emerald-500/10 text-emerald-700 ring-1 ring-emerald-500/20"
          : "bg-rose-500/10 text-rose-700 ring-1 ring-rose-500/20"
      )}
    >
      {label}
    </span>
  );
}

export function Pill({
  children,
  variant = "default",
  title,
}: {
  children: React.ReactNode;
  variant?: "default" | "success" | "warning" | "info";
  title?: string;
}) {
  const styles = {
    default: "bg-slate-100 text-slate-800 ring-slate-300",
    success: "bg-emerald-100 text-emerald-900 ring-emerald-300",
    warning: "bg-amber-100 text-amber-950 ring-amber-300",
    info: "bg-cyan-100 text-cyan-950 ring-cyan-300",
  };
  return (
    <span
      title={title}
      className={clsx("inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium ring-1", styles[variant])}
    >
      {children}
    </span>
  );
}

export function Button({
  children,
  className,
  variant = "primary",
  size = "md",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
}) {
  const sizes = {
    sm: "px-3 py-1.5 text-xs",
    md: "px-4 py-2.5 text-sm",
    lg: "px-6 py-3 text-base",
  };
  const variants = {
    primary:
      "bg-gradient-to-r from-teal-600 to-cyan-600 text-white shadow-md shadow-teal-500/25 hover:from-teal-500 hover:to-cyan-500 hover:shadow-lg hover:shadow-teal-500/30 active:scale-[0.98]",
    secondary:
      "border border-slate-300 bg-white text-slate-800 shadow-sm hover:border-teal-400 hover:bg-teal-50 active:scale-[0.98]",
    ghost: "text-slate-700 hover:bg-slate-100 hover:text-slate-900",
    danger:
      "bg-gradient-to-r from-rose-600 to-red-600 text-white shadow-md shadow-rose-500/25 hover:from-rose-500 hover:to-red-500",
  };
  return (
    <button
      className={clsx(
        "inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none",
        sizes[size],
        variants[variant],
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={clsx("input-field", className)} {...props} />;
}

export function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={clsx("input-field min-h-[120px] resize-y font-mono leading-relaxed", className)}
      {...props}
    />
  );
}

export function Select({ className, children, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select className={clsx("input-field cursor-pointer", className)} {...props}>
      {children}
    </select>
  );
}

export function PageHeader({
  eyebrow,
  title,
  description,
  badge,
  actions,
  icon,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  badge?: ReactNode;
  actions?: ReactNode;
  icon?: ReactNode;
}) {
  return (
    <div className="relative overflow-hidden rounded-3xl border border-teal-900/30 hero-glow px-8 py-10 text-white shadow-glow animate-fade-in">
      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggIGQ9Ik0gNjAgMCBMIDAgMCAwIDYwIiBmaWxsPSJub25lIiBzdHJva2U9IndoaXRlIiBzdHJva2Utb3BhY2l0eT0iMC4wNSIgc3Ryb2tlLXdpZHRoPSIxIi8+PC9wYXR0ZXJuPjwvZGVmcz48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSJ1cmwoI2dyaWQpIi8+PC9zdmc+')] opacity-40" />
      <div className="relative flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-4">
          {icon && (
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white/15 text-white ring-1 ring-white/30 backdrop-blur">
              {icon}
            </div>
          )}
          <div>
            {eyebrow && (
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-teal-100">{eyebrow}</p>
            )}
            <h1 className="mt-1 font-display text-3xl font-bold tracking-tight text-white md:text-4xl">{title}</h1>
            {description && (
              <p className="mt-2 max-w-2xl text-base leading-relaxed text-white/95">{description}</p>
            )}
            {badge && (
              <div className="hero-badge-panel mt-4">
                <div className="flex flex-wrap gap-2">{badge}</div>
              </div>
            )}
          </div>
        </div>
        {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
      </div>
    </div>
  );
}

export function StatCard({
  label,
  value,
  sub,
  accent = "teal",
}: {
  label: string;
  value: string;
  sub?: string;
  accent?: "teal" | "cyan" | "emerald" | "amber";
}) {
  const accents = {
    teal: "from-teal-50 to-white text-teal-800",
    cyan: "from-cyan-50 to-white text-cyan-800",
    emerald: "from-emerald-50 to-white text-emerald-800",
    amber: "from-amber-50 to-white text-amber-800",
  };
  return (
    <div className={clsx("rounded-2xl border border-slate-200 bg-gradient-to-br p-5 shadow-card", accents[accent])}>
      <p className="text-xs font-semibold uppercase tracking-wider text-slate-600">{label}</p>
      <p className="mt-2 font-display text-3xl font-bold text-slate-900">{value}</p>
      {sub && <p className="mt-1 text-sm text-slate-700">{sub}</p>}
    </div>
  );
}

export function SectionTitle({ title, description }: { title: string; description?: string }) {
  return (
    <div className="mb-4">
      <h2 className="font-display text-lg font-bold text-slate-900">{title}</h2>
      {description && <p className="mt-1 text-sm text-slate-600">{description}</p>}
    </div>
  );
}

export function Alert({
  children,
  variant = "info",
}: {
  children: React.ReactNode;
  variant?: "info" | "success" | "warning" | "error";
}) {
  const styles = {
    info: "border-cyan-300 bg-cyan-50 text-cyan-950",
    success: "border-emerald-300 bg-emerald-50 text-emerald-950",
    warning: "border-amber-300 bg-amber-50 text-amber-950",
    error: "border-rose-300 bg-rose-50 text-rose-950",
  };
  return (
    <div className={clsx("rounded-xl border px-4 py-3 text-sm font-medium leading-relaxed", styles[variant])}>{children}</div>
  );
}

export function VerdictBanner({ verdict }: { verdict: "pass" | "fail" }) {
  const pass = verdict === "pass";
  return (
    <div
      className={clsx(
        "relative overflow-hidden rounded-2xl px-6 py-5 text-center",
        pass
          ? "bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-lg shadow-emerald-500/30"
          : "bg-gradient-to-r from-rose-500 to-red-600 text-white shadow-lg shadow-rose-500/30"
      )}
    >
      <p className="text-2xl font-bold tracking-tight">{pass ? "✓ VERIFIED" : "✗ VERIFICATION FAILED"}</p>
      <p className="mt-1 text-sm opacity-90">
        {pass ? "All checks passed — receipt is cryptographically valid" : "One or more checks failed"}
      </p>
    </div>
  );
}

export function EmptyState({ title, description, action }: { title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-8 py-12 text-center">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-slate-200 text-slate-600">
        <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
        </svg>
      </div>
      <h3 className="font-display text-lg font-semibold text-slate-900">{title}</h3>
      {description && <p className="mt-2 max-w-sm text-sm text-slate-600">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function DataTable({ children }: { children: React.ReactNode }) {
  return (
    <div className="overflow-hidden rounded-xl border border-slate-200/70">
      <div className="overflow-x-auto">{children}</div>
    </div>
  );
}
