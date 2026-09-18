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
}: {
  service: ServiceArrivals;
  stopCode: string;
}) {
  const next = service.arrivals[0];
  const slots = [0, 1, 2].map((index) => service.arrivals[index] ?? null);
  const live = hasBusPosition(service) && stopCode;
  const href = live
    ? `/live/${encodeURIComponent(service.service_no)}?stop=${stopCode}`
    : `/services/${encodeURIComponent(service.service_no)}`;
  const destination = next?.destination_name;

  return (
    <Link href={href} className="flex min-h-12 items-center gap-3 py-1.5">
      <span className="min-w-0 flex-1">
        <span className="block font-mono text-[17px] font-semibold leading-tight">
          {service.service_no}
        </span>
        <span className="block truncate text-xs text-[var(--muted)]">
          {destination ?? service.operator}
        </span>
      </span>
      <span className="grid w-[9.5rem] shrink-0 grid-cols-3 text-center">
        {slots.map((arrival, index) => {
          const label = arrival ? arrivalShort(arrival.minutes) : null;
          const here = label === "Here";
          return (
            <span key={`${service.service_no}-${index}`} className="flex flex-col items-center">
              <span
                className={`h-6 font-medium tabular-nums ${
                  here ? "text-[var(--accent)]" : "text-[var(--ink)]"
                }`}
              >
                {label ?? ""}
              </span>
              {arrival ? (
                <span
                  className="mt-1 h-1 w-8 rounded-full"
                  style={{ background: loadBarColor(arrival.load) }}
                  aria-hidden
                />
              ) : (
                <span className="mt-1 h-1 w-8" />
              )}
            </span>
          );
        })}
      </span>
    </Link>
  );
}
