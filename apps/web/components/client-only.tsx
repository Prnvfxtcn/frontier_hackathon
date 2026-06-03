"use client";

import { useMounted } from "@/hooks/use-mounted";

type Props = {
  children: React.ReactNode;
  fallback?: React.ReactNode;
};

/** Renders children only after mount — prevents wallet/ browser API hydration mismatches. */
export function ClientOnly({ children, fallback = null }: Props) {
  const mounted = useMounted();
  if (!mounted) return <>{fallback}</>;
  return <>{children}</>;
}
