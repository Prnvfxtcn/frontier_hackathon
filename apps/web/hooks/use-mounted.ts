"use client";

import { useEffect, useState } from "react";

/** True after client mount — use to avoid SSR/client hydration mismatches for wallet state. */
export function useMounted() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted;
}
