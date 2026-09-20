"use client";

import { useEffect, useState } from "react";
import { Radio } from "lucide-react";
import { relativeUpdated } from "@/lib/format";
import type { LiveStatus } from "@/lib/live";

function badgeCopy(status?: LiveStatus, stale?: boolean) {
  if (status === "connecting") return "Connecting";
  if (status === "reconnecting") return "Reconnecting";
  if (status === "offline") return "Offline";
  if (stale || status === "offline") return "Delayed";
  return "Live";
}

export function LiveBadge({
  cachedAt,
  stale,
  status,
}: {
  cachedAt?: string | null;
  stale?: boolean;
  status?: LiveStatus;
}) {
  const [freshness, setFreshness] = useState<string | null>(null);
  const delayed = Boolean(stale) || status === "offline" || status === "reconnecting";
  const label = badgeCopy(status, stale);

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
        className={delayed ? "text-[var(--warn)]" : "text-[var(--live)]"}
      />
      {label}
      {freshness ? <span className="normal-case tracking-normal">Updated {freshness}</span> : null}
    </p>
  );
}
