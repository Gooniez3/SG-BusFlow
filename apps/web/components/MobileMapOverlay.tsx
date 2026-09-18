"use client";

import { useEffect, useMemo, useRef, useState, type PointerEvent } from "react";
import Link from "next/link";
import { Footprints, LocateFixed, Search, X } from "lucide-react";
import { ErrorState } from "@/components/ErrorState";
import { FavoriteButton } from "@/components/FavoriteButton";
import { LiveBadge } from "@/components/LiveBadge";
import { ServiceTimes } from "@/components/ServiceTimes";
import { fetchArrivals } from "@/lib/api";
import { arrivalShort, clockTime, nextService, walkParts } from "@/lib/format";
import type { Stop, StopArrivalsResponse } from "@/lib/types";
import { useWorkspace } from "@/lib/workspace";

export function MobileMapOverlay() {
  const {
    location,
    stops,
    stopsLoading,
    selectedCode,
    setSelectedCode,
    preview,
    previewLoading,
    previewError,
    reload,
  } = useWorkspace();
  const [open, setOpen] = useState(false);
  const [nearbyArrivals, setNearbyArrivals] = useState<Record<string, StopArrivalsResponse>>({});
  const dragStart = useRef<number | null>(null);
  const selectedStop = stops.find((stop) => stop.code === selectedCode) ?? null;
  const nearby = stops.slice(0, 10);
  const visibleNearby = open ? nearby : nearby.slice(0, 3);
  const walk = walkParts(selectedStop?.distance_m);

  useEffect(() => {
    const codes = stops.slice(0, 6).map((stop) => stop.code);
    if (codes.length === 0) return;
    let cancelled = false;
    Promise.all(
      codes.map((code) =>
        fetchArrivals(code)
          .then((data) => [code, data] as const)
          .catch(() => null),
      ),
    ).then((results) => {
      if (cancelled) return;
      const next: Record<string, StopArrivalsResponse> = {};
      for (const item of results) {
        if (item) next[item[0]] = item[1];
      }
      setNearbyArrivals(next);
    });
    return () => {
      cancelled = true;
    };
  }, [stops]);

  useEffect(() => {
    setOpen(false);
  }, [selectedCode]);

  const sheetMax = useMemo(() => {
    if (selectedStop) return open ? "30rem" : "22rem";
    return open ? "28rem" : "18.25rem";
  }, [open, selectedStop]);

  function onHandlePointerDown(event: PointerEvent<HTMLDivElement>) {
    dragStart.current = event.clientY;
  }

  function onHandlePointerUp(event: PointerEvent<HTMLDivElement>) {
    if (dragStart.current == null) return;
    const delta = event.clientY - dragStart.current;
    dragStart.current = null;
    if (delta < -28) setOpen(true);
    if (delta > 28) setOpen(false);
  }

  return (
    <div className="pointer-events-none absolute inset-0 z-[1200] md:hidden">
      <Link
        href="/search"
        className="pointer-events-auto absolute left-3 right-[4.75rem] top-3 flex h-12 items-center gap-3 rounded-full border border-white/80 bg-white/92 px-4 text-sm text-[var(--muted)] shadow-[0_10px_30px_rgb(15_23_42_/_0.14)] backdrop-blur-md"
      >
        <Search size={16} strokeWidth={2} />
        Search stops and buses
      </Link>

      <div className="pointer-events-auto absolute inset-x-0 bottom-0 flex flex-col items-end">
        <button
          type="button"
          onClick={reload}
          className="mb-3 mr-3 flex h-11 w-11 items-center justify-center rounded-full bg-white text-[#0f172a] shadow-[0_8px_24px_rgb(15_23_42_/_0.16)]"
          aria-label="Use current location"
        >
          <LocateFixed size={18} strokeWidth={2} />
        </button>

        <section
          className="flex w-full flex-col overflow-hidden rounded-t-[1.6rem] border-t border-white/80 bg-[var(--card)]/96 shadow-[0_-12px_40px_rgb(15_23_42_/_0.16)] backdrop-blur-xl transition-[height] duration-200 ease-out"
          style={{ height: sheetMax }}
        >
          <div
            className="flex shrink-0 cursor-grab touch-none flex-col items-center pt-2.5 pb-1 active:cursor-grabbing"
            onPointerDown={onHandlePointerDown}
            onPointerUp={onHandlePointerUp}
            onClick={() => setOpen((value) => !value)}
          >
            <span className="h-1 w-10 rounded-full bg-[#cbd5e1]" />
          </div>

          {selectedStop ? (
            <>
              <div className="shrink-0 px-4">
                <SelectedHeader
                  stop={selectedStop}
                  walkMetres={walk?.metres}
                  onClose={() => setSelectedCode(null)}
                />
                <div className="mt-3 mb-1 flex items-center justify-between">
                  <p className="text-xs font-medium uppercase tracking-[0.16em] text-[var(--muted)]">
                    Live arrivals
                  </p>
                  {preview ? <LiveBadge cachedAt={preview.cached_at} stale={preview.stale} /> : null}
                </div>
              </div>
              <div className="min-h-0 flex-1 overflow-y-auto px-4">
                <SelectedArrivals
                  stopCode={selectedStop.code}
                  preview={preview}
                  previewLoading={previewLoading}
                  previewError={previewError}
                  onRetry={() => setSelectedCode(selectedStop.code)}
                />
              </div>
              <div className="shrink-0 px-4 pb-3 pt-2">
                <Link
                  href={`/stops/${selectedStop.code}`}
                  className="flex h-11 items-center justify-center rounded-full bg-[var(--accent)] text-sm font-medium text-white"
                >
                  View stop
                </Link>
              </div>
            </>
          ) : (
            <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-3">
              <NearbySheet
                stops={visibleNearby}
                total={nearby.length}
                arrivals={nearbyArrivals}
                loading={stopsLoading}
                denied={Boolean(location?.denied)}
                demo={Boolean(location?.isDemo)}
                expanded={open}
                onSelect={(code) => setSelectedCode(code)}
                onExpand={() => setOpen(true)}
                onLocate={reload}
              />
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function NearbySheet({
  stops,
  total,
  arrivals,
  loading,
  denied,
  demo,
  expanded,
  onSelect,
  onExpand,
  onLocate,
}: {
  stops: Stop[];
  total: number;
  arrivals: Record<string, StopArrivalsResponse>;
  loading: boolean;
  denied: boolean;
  demo: boolean;
  expanded: boolean;
  onSelect: (code: string) => void;
  onExpand: () => void;
  onLocate: () => void;
}) {
  return (
    <>
      <div className="mb-2 flex items-end justify-between gap-3">
        <div>
          <p className="text-[17px] font-semibold tracking-tight">Nearby</p>
          <p className="mt-0.5 text-xs text-[var(--muted)]">
            {denied
              ? "Location is off · showing a demo area"
              : demo
                ? "Demo pin until location is allowed"
                : `${total} stops around you`}
          </p>
        </div>
        {denied ? (
          <button
            type="button"
            onClick={onLocate}
            className="h-8 rounded-full bg-[var(--accent)] px-3 text-xs font-medium text-white"
          >
            Enable
          </button>
        ) : null}
      </div>
      {loading && stops.length === 0 ? (
        <div className="space-y-2 py-2">
          <div className="h-14 animate-pulse rounded-2xl bg-[var(--line)]" />
          <div className="h-14 animate-pulse rounded-2xl bg-[var(--line)]" />
        </div>
      ) : null}
      <div className="divide-y divide-[var(--line)]">
        {stops.map((stop, index) => {
          const metres = walkParts(stop.distance_m)?.metres;
          const next = nextService(arrivals[stop.code]?.services ?? []);
          const label = next ? arrivalShort(next.minutes) : null;
          return (
            <button
              key={stop.code}
              type="button"
              onClick={() => onSelect(stop.code)}
              className="flex w-full items-center gap-3 py-2.5 text-left"
            >
              <span
                className={`mt-0.5 h-2.5 w-2.5 shrink-0 rounded-full ${
                  index === 0 ? "bg-[var(--accent)]" : "bg-[#cbd5e1]"
                }`}
              />
              <span className="min-w-0 flex-1">
                <span className="flex items-baseline justify-between gap-3">
                  <span className="truncate font-medium">{stop.name}</span>
                  {metres != null ? (
                    <span className="shrink-0 text-sm tabular-nums text-[var(--muted)]">{metres} m</span>
                  ) : null}
                </span>
                <span className="mt-0.5 flex items-center justify-between gap-3 text-xs text-[var(--muted)]">
                  <span className="truncate">
                    {stop.code}
                    {stop.road_name ? ` · ${stop.road_name}` : ""}
                  </span>
                  {next && label ? (
                    <span className="shrink-0 font-medium text-[var(--ink)]">
                      <span className="font-mono">{next.serviceNo}</span>
                      <span className={label === "Here" ? "text-[var(--warn)]" : ""}>
                        {" · "}
                        {label}
                        {label !== "Here" ? " min" : ""}
                      </span>
                    </span>
                  ) : null}
                </span>
              </span>
            </button>
          );
        })}
      </div>
      {!expanded && total > 3 ? (
        <button
          type="button"
          onClick={onExpand}
          className="mt-1 mb-1 w-full py-2 text-sm font-medium text-[var(--accent)]"
        >
          See all nearby stops
        </button>
      ) : (
        <p className="pt-2 text-[10px] text-[var(--muted)]">Map data © OpenStreetMap</p>
      )}
    </>
  );
}

function SelectedHeader({
  stop,
  walkMetres,
  onClose,
}: {
  stop: Stop;
  walkMetres?: number;
  onClose: () => void;
}) {
  return (
    <div className="flex items-start gap-2">
      <div className="min-w-0 flex-1">
        <p className="text-[17px] font-semibold tracking-tight">{stop.name}</p>
        <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-[var(--muted)]">
          <span>{stop.code}</span>
          {walkMetres != null ? (
            <span className="inline-flex items-center gap-1">
              <Footprints size={12} strokeWidth={2} />
              {walkMetres} m
            </span>
          ) : null}
          {stop.road_name ? <span>{stop.road_name}</span> : null}
        </p>
      </div>
      <FavoriteButton
        iconOnly
        stop={{ code: stop.code, name: stop.name, road_name: stop.road_name }}
      />
      <button
        type="button"
        onClick={onClose}
        className="flex h-10 w-10 items-center justify-center rounded-full border border-[var(--line)] text-[var(--muted)]"
        aria-label="Back to nearby stops"
      >
        <X size={14} strokeWidth={2} />
      </button>
    </div>
  );
}

function SelectedArrivals({
  stopCode,
  preview,
  previewLoading,
  previewError,
  onRetry,
}: {
  stopCode: string;
  preview: StopArrivalsResponse | null;
  previewLoading: boolean;
  previewError: string | null;
  onRetry: () => void;
}) {
  return (
    <>
      {previewLoading && !preview ? (
        <div className="space-y-2 py-2">
          <div className="h-10 animate-pulse rounded-lg bg-[var(--line)]" />
          <div className="h-10 animate-pulse rounded-lg bg-[var(--line)]" />
        </div>
      ) : null}
      {previewError ? (
        <ErrorState
          title="Live arrivals unavailable"
          detail="We couldn't retrieve the latest arrival information."
          lastUpdated={clockTime(preview?.cached_at)}
          onRetry={onRetry}
        />
      ) : null}
      {preview?.services.map((service) => (
        <ServiceTimes key={service.service_no} service={service} stopCode={stopCode} />
      ))}
      {preview && preview.services.length === 0 ? (
        <p className="py-3 text-sm text-[var(--muted)]">No services reported right now.</p>
      ) : null}
    </>
  );
}
