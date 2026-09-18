"use client";

import { useEffect, useState } from "react";
import { Radio } from "lucide-react";
import { relativeUpdated } from "@/lib/format";

export function LiveBadge({
  cachedAt,
  stale,
}: {
  cachedAt?: string | null;
  stale?: boolean;
}) {
  const [freshness, setFreshness] = useState<string | null>(null);

  useEffect(() => {
    setFreshness(relativeUpdated(cachedAt));
    const timer = window.setInterval(() => {
      setFreshness(relativeUpdated(cachedAt));
    }, 15000);
    return () => window.clearInterval(timer);
  }, [cachedAt]);

  return (
    <p className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.14em] text-[var(--muted)]">
      <Radio
        size={12}
        strokeWidth={2.4}
        className={stale ? "text-[var(--warn)]" : "text-[var(--live)]"}
      />
      {stale ? "Delayed" : "Live"}
      {freshness ? <span className="normal-case tracking-normal">Updated {freshness}</span> : null}
    </p>
  );
}
