"use client";

import { relativeUpdated } from "@/lib/format";

export function LiveBadge({
  cachedAt,
  stale,
}: {
  cachedAt?: string | null;
  stale?: boolean;
}) {
  const freshness = relativeUpdated(cachedAt);
  return (
    <p className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.14em] text-[var(--muted)]">
      <span
        className={`inline-block h-1.5 w-1.5 rounded-full ${
          stale ? "bg-[var(--warn)]" : "bg-[var(--accent)]"
        }`}
      />
      {stale ? "Delayed" : "Live"}
      {freshness ? <span className="normal-case tracking-normal">Updated {freshness}</span> : null}
    </p>
  );
}
