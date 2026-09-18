"use client";

import { FavoriteButton } from "@/components/FavoriteButton";
import { ServiceTimes } from "@/components/ServiceTimes";
import { bearingTo, walkParts } from "@/lib/format";
import type { Stop, StopArrivalsResponse } from "@/lib/types";

function DirectionArrow({ bearing }: { bearing: number | null }) {
  if (bearing == null) return <span className="w-4 shrink-0" />;
  return (
    <span
      className="flex w-4 shrink-0 justify-center text-[var(--accent)]"
      style={{ transform: `rotate(${bearing}deg)` }}
      aria-hidden
    >
      <svg width="12" height="14" viewBox="0 0 12 14" fill="currentColor">
        <path d="M6 0l6 14H0L6 0z" />
      </svg>
    </span>
  );
}

export function StopPreview({
  stop,
  arrivals,
  selected,
  loading,
  fromLat,
  fromLng,
  onSelect,
  onRefresh,
}: {
  stop: Stop;
  arrivals?: StopArrivalsResponse | null;
  selected?: boolean;
  loading?: boolean;
  fromLat?: number;
  fromLng?: number;
  onSelect?: () => void;
  onRefresh?: () => void;
}) {
  const walk = walkParts(stop.distance_m);
  const bearing =
    fromLat != null &&
    fromLng != null &&
    stop.latitude &&
    stop.longitude &&
    Math.abs(stop.latitude) > 0.1
      ? bearingTo(fromLat, fromLng, stop.latitude, stop.longitude)
      : null;

  return (
    <article className={`rounded-xl bg-[var(--card)] ${selected ? "ring-1 ring-[var(--accent)]" : ""}`}>
      <button type="button" onClick={onSelect} className="flex w-full items-start gap-3 px-3 py-3 text-left">
        <DirectionArrow bearing={bearing} />
        <span className="min-w-0 flex-1">
          <span className="block font-medium leading-tight">{stop.name}</span>
          <span className="mt-1 block text-xs text-[var(--muted)]">
            <span className="font-mono">{stop.code}</span>
            {stop.road_name ? <span>{"  "}{stop.road_name}</span> : null}
          </span>
        </span>
        {walk ? (
          <span className="shrink-0 pt-0.5 text-sm tabular-nums text-[var(--muted)]">{walk.metres}m</span>
        ) : null}
      </button>
      {selected ? (
        <div className="relative border-t border-[var(--line)] px-3 pb-3 pt-1">
          <div className="absolute right-2 top-2 z-10 flex overflow-hidden rounded-full bg-[var(--bg)]">
            <FavoriteButton
              iconOnly
              stop={{
                code: stop.code,
                name: stop.name,
                road_name: stop.road_name,
              }}
            />
            {onRefresh ? (
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  onRefresh();
                }}
                className="flex h-9 w-9 items-center justify-center text-[var(--muted)]"
                aria-label="Refresh arrivals"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
                  <path
                    d="M20 12a8 8 0 10-2.3 5.6"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                  />
                  <path d="M20 8v4h-4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                </svg>
              </button>
            ) : null}
          </div>
          <div className="pr-16">
            {loading && !arrivals ? (
              <div className="space-y-2 py-2">
                <div className="h-8 animate-pulse rounded bg-[var(--line)]" />
                <div className="h-8 animate-pulse rounded bg-[var(--line)]" />
              </div>
            ) : null}
            {arrivals?.services.map((service) => (
              <ServiceTimes key={service.service_no} service={service} stopCode={stop.code} />
            ))}
            {arrivals && arrivals.services.length === 0 ? (
              <p className="py-3 text-sm text-[var(--muted)]">No services reported right now.</p>
            ) : null}
          </div>
        </div>
      ) : null}
    </article>
  );
}
