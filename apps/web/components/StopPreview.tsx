"use client";

import { Footprints, RefreshCw } from "lucide-react";
import { FavoriteButton } from "@/components/FavoriteButton";
import { ServiceTimes } from "@/components/ServiceTimes";
import { bearingTo, walkParts } from "@/lib/format";
import type { Stop, StopArrivalsResponse } from "@/lib/types";

function DirectionArrow({ bearing }: { bearing: number | null }) {
  if (bearing == null) {
    return (
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--accent)] text-[var(--on-accent)]" aria-hidden>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 21s7-5.33 7-11a7 7 0 1 0-14 0c0 5.67 7 11 7 11Z" />
          <circle cx="12" cy="10" r="1.6" fill="var(--accent)" />
        </svg>
      </span>
    );
  }
  return (
    <span
      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--accent)] text-[var(--on-accent)]"
      aria-hidden
    >
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="currentColor"
        style={{ transform: `rotate(${bearing}deg)` }}
      >
        <path d="M12 2.2 20.6 21.2 12 16.6 3.4 21.2 12 2.2Z" />
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
  onFavoriteChange,
}: {
  stop: Stop;
  arrivals?: StopArrivalsResponse | null;
  selected?: boolean;
  loading?: boolean;
  fromLat?: number;
  fromLng?: number;
  onSelect?: () => void;
  onRefresh?: () => void;
  onFavoriteChange?: (saved: boolean) => void;
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
    <article className={`rounded-xl border border-[var(--line)] bg-[var(--card)] ${selected ? "border-[var(--accent)]" : ""}`}>
      <button type="button" onClick={onSelect} className="flex w-full items-center gap-2.5 px-3 py-2.5 text-left">
        <DirectionArrow bearing={bearing} />
        <span className="min-w-0 flex-1">
          <span className="block font-medium leading-tight">{stop.name}</span>
          <span className="mt-1 block text-xs text-[var(--muted)]">
            <span className="font-mono">{stop.code}</span>
            {stop.road_name ? <span>{"  "}{stop.road_name}</span> : null}
          </span>
        </span>
        {walk ? (
          <span className="flex shrink-0 items-center gap-1 pt-0.5 text-sm tabular-nums text-[var(--muted)]">
            <Footprints size={14} strokeWidth={2} />
            {walk.metres}m
          </span>
        ) : null}
      </button>
      {selected ? (
        <div className="border-t border-[var(--line)] px-2 pb-2 pt-1.5">
          <div className="mb-1 flex justify-end">
            <FavoriteButton
              iconOnly
              stop={{
                code: stop.code,
                name: stop.name,
                road_name: stop.road_name,
              }}
              onChange={onFavoriteChange}
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
                <RefreshCw size={16} strokeWidth={2} />
              </button>
            ) : null}
          </div>
          {loading && !arrivals ? (
            <div className="space-y-2 py-2">
              <div className="h-8 animate-pulse rounded bg-[var(--line)]" />
              <div className="h-8 animate-pulse rounded bg-[var(--line)]" />
            </div>
          ) : null}
          {arrivals && arrivals.services.length > 0 ? (
            <div className="overflow-hidden rounded-lg border border-[var(--line)] bg-[var(--bg)]">
              {arrivals.services.map((service) => (
                <ServiceTimes key={service.service_no} service={service} stopCode={stop.code} />
              ))}
            </div>
          ) : null}
          {arrivals && arrivals.services.length === 0 ? (
            <p className="py-3 text-sm text-[var(--muted)]">No services reported right now.</p>
          ) : null}
        </div>
      ) : null}
    </article>
  );
}
