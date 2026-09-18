"use client";

import Link from "next/link";
import type { ServiceArrivals } from "@/lib/types";
import { arrivalLabel, loadCopy } from "@/lib/format";

function ArrivalTime({ minutes }: { minutes: number | null }) {
  const label = arrivalLabel(minutes);
  if (!label) {
    return <span className="text-sm text-[var(--muted)]">— —</span>;
  }
  const arriving = label === "ARRIVING";
  const close = minutes != null && minutes === 1;
  return (
    <span
      className={`font-mono font-semibold tabular-nums ${
        arriving || close ? "text-[var(--accent)] text-2xl" : "text-[var(--ink)] text-2xl"
      }`}
    >
      {label}
    </span>
  );
}

function hasBusPosition(service: ServiceArrivals) {
  return service.arrivals.some(
    (arrival) => arrival.latitude && arrival.longitude && Math.abs(arrival.latitude) > 0.1,
  );
}

export function ArrivalRow({
  service,
  compact = false,
  stopCode,
}: {
  service: ServiceArrivals;
  compact?: boolean;
  stopCode?: string;
}) {
  const next = service.arrivals[0];
  const following = service.arrivals.slice(1, 3);
  const destination = next?.destination_name;
  const load = loadCopy(next?.load);
  const live = hasBusPosition(service) && stopCode;
  const href = live
    ? `/live/${encodeURIComponent(service.service_no)}?stop=${stopCode}`
    : `/services/${encodeURIComponent(service.service_no)}`;

  if (compact) {
    return (
      <Link href={href} className="flex min-h-11 items-baseline justify-between gap-3 py-1">
        <span className="min-w-0">
          <span className="font-mono text-[17px] font-semibold">{service.service_no}</span>
          {destination ? (
            <span className="ml-2 truncate text-sm text-[var(--muted)]">→ {destination}</span>
          ) : null}
        </span>
        {next ? (
          <span
            className={`shrink-0 font-mono text-base font-semibold tabular-nums ${
              (next.minutes ?? 1) <= 1 ? "text-[var(--accent)]" : "text-[var(--ink)]"
            }`}
          >
            {arrivalLabel(next.minutes)}
          </span>
        ) : (
          <span className="text-sm text-[var(--muted)]">— —</span>
        )}
      </Link>
    );
  }

  return (
    <Link href={href} className="block rounded-xl border border-[var(--line)] bg-[var(--card)] px-4 py-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="font-mono text-2xl font-semibold tracking-tight">{service.service_no}</p>
          <p className="mt-1 text-sm text-[var(--muted)]">
            {destination ? `To ${destination}` : service.operator}
          </p>
        </div>
        {next ? (
          <ArrivalTime minutes={next.minutes} />
        ) : (
          <p className="max-w-[9rem] text-right text-sm text-[var(--muted)]">Live arrival unavailable</p>
        )}
      </div>
      {load ? (
        <div className="mt-3">
          <div className="h-1.5 overflow-hidden rounded-full bg-[var(--line)]" aria-hidden>
            <div
              className="h-full rounded-full bg-[var(--accent)]"
              style={{ width: `${Math.round(load.fill * 100)}%` }}
            />
          </div>
          <p className="mt-1 text-xs text-[var(--muted)]">{load.label}</p>
        </div>
      ) : null}
      {following.length > 0 ? (
        <div className="mt-3 flex gap-5 text-xs text-[var(--muted)]">
          {following.map((arrival, index) => (
            <span key={`${service.service_no}-${index}`}>
              Following{" "}
              <span className="font-mono text-[var(--ink)]">{arrivalLabel(arrival.minutes)}</span>
            </span>
          ))}
        </div>
      ) : null}
    </Link>
  );
}
