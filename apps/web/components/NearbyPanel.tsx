"use client";

import Link from "next/link";
import { ErrorState } from "@/components/ErrorState";
import { EmptyState } from "@/components/EmptyState";
import { StopCardSkeleton } from "@/components/Skeleton";
import { StopPreview } from "@/components/StopPreview";
import { useStopArrivals } from "@/lib/useStopArrivals";
import { useWorkspace } from "@/lib/workspace";

export function NearbyPanel() {
  const {
    location,
    locationLoading,
    stops,
    stopsLoading,
    error,
    selectedCode,
    setSelectedCode,
    reload,
  } = useWorkspace();
  const { data: arrivals, loading: arrivalsLoading, reload: reloadArrivals } = useStopArrivals(
    selectedCode ? [selectedCode] : [],
  );

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight md:text-2xl">Nearby</h1>
          <p className="mt-1 text-sm text-[var(--muted)]">
            {locationLoading
              ? "Finding your location"
              : location?.isDemo
                ? `Demo pin · ${location.label}`
                : "Using your current location"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={reload}
            className="rounded-full border border-[var(--line)] px-3 py-1.5 text-xs text-[var(--muted)]"
            aria-label="Refresh location"
          >
            Refresh
          </button>
          <Link
            href="/map"
            className="flex h-9 w-9 items-center justify-center rounded-full border border-[var(--line)] text-[var(--muted)] md:hidden"
            aria-label="Open map"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path
                d="M4 7.5l5.5-2v13L4 20.5v-13zM9.5 5.5l5 2.5v13l-5-2.5v-13zM14.5 8l5.5-2.5v13L14.5 21V8z"
                stroke="currentColor"
                strokeWidth="1.5"
              />
            </svg>
          </Link>
        </div>
      </div>
      {error ? (
        <ErrorState title="Could not load nearby stops" detail="Try again in a moment." onRetry={reload} />
      ) : null}
      <div className="space-y-2">
        {stopsLoading || locationLoading ? (
          <>
            <StopCardSkeleton />
            <StopCardSkeleton />
            <StopCardSkeleton />
          </>
        ) : stops.length === 0 ? (
          <EmptyState title="No stops nearby" detail="Try a wider search or another location." />
        ) : (
          stops.map((stop) => (
            <StopPreview
              key={stop.code}
              stop={stop}
              arrivals={arrivals[stop.code]}
              selected={selectedCode === stop.code}
              loading={arrivalsLoading && selectedCode === stop.code}
              fromLat={location?.lat}
              fromLng={location?.lng}
              onSelect={() =>
                setSelectedCode(selectedCode === stop.code ? null : stop.code)
              }
              onRefresh={reloadArrivals}
            />
          ))
        )}
      </div>
    </div>
  );
}
