"use client";

import Link from "next/link";
import { arrivalShort, loadBarColor } from "@/lib/format";
import type { ServiceArrivals } from "@/lib/types";

function hasBusPosition(service: ServiceArrivals) {
  return service.arrivals.some(
    (arrival) => arrival.latitude && arrival.longitude && Math.abs(arrival.latitude) > 0.1,
  );
}

export function ServiceTimes({
  service,
  stopCode,
  linked = true,
}: {
  service: ServiceArrivals;
  stopCode: string;
  linked?: boolean;
}) {
  const next = service.arrivals[0];
  const slots = [0, 1, 2].map((index) => service.arrivals[index] ?? null);
  const live = hasBusPosition(service) && stopCode;
  const href = live
    ? `/live/${encodeURIComponent(service.service_no)}?stop=${stopCode}`
    : `/services/${encodeURIComponent(service.service_no)}`;
  const destination = next?.destination_name;
  const rowClass =
    "flex min-h-10 items-center gap-2 border-b border-[var(--line)] px-2 py-1 last:border-b-0";
  const body = (
    <>
      <span className="min-w-0 flex-1">
        <span className="block font-mono text-[15px] font-semibold leading-tight">
          {service.service_no}
        </span>
        <span className="block truncate text-[11px] leading-tight text-[var(--muted)]">
          {destination ?? service.operator}
        </span>
      </span>
      <span className="grid w-[8.75rem] shrink-0 grid-cols-3 overflow-hidden rounded-md border border-[var(--line)] bg-[var(--card)]">
        {slots.map((arrival, index) => {
          const label = arrival ? arrivalShort(arrival.minutes) : null;
          const here = label === "Here";
          return (
            <span
              key={`${service.service_no}-${index}`}
              className="flex flex-col items-center justify-center border-l border-[var(--line)] px-0.5 py-1 first:border-l-0"
            >
              <span
                className={`h-4 text-[13px] font-medium tabular-nums leading-none ${
                  here ? "text-[var(--warn)]" : "text-[var(--ink)]"
                }`}
              >
                {label ?? "—"}
              </span>
              {arrival ? (
                <span
                  className="mt-1 h-0.5 w-6 rounded-full"
                  style={{ background: loadBarColor(arrival.load) }}
                  aria-hidden
                />
              ) : (
                <span className="mt-1 h-0.5 w-6" />
              )}
            </span>
          );
        })}
      </span>
    </>
  );

  if (!linked) {
    return <div className={rowClass}>{body}</div>;
  }

  return (
    <Link href={href} className={rowClass}>
      {body}
    </Link>
  );
}
