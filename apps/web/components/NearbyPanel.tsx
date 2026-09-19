"use client";

import Link from "next/link";
import { MapPin, Navigation, RefreshCw } from "lucide-react";
import { ErrorState } from "@/components/ErrorState";
import { EmptyState } from "@/components/EmptyState";
import { StopCardSkeleton } from "@/components/Skeleton";
import { StopPreview } from "@/components/StopPreview";
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
    preview,
    previewLoading,
    reload,
  } = useWorkspace();

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight md:text-2xl">Nearby</h1>
          <p className="mt-1 flex items-center gap-1.5 text-sm text-[var(--muted)]">
            <Navigation size={14} strokeWidth={2} />
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
            className="flex h-9 items-center gap-1.5 rounded-full border border-[var(--line)] px-3 text-xs text-[var(--muted)]"
            aria-label="Refresh location"
          >
            <RefreshCw size={14} strokeWidth={2} />
            Refresh
          </button>
          <Link
            href="/map"
            className="flex h-9 w-9 items-center justify-center rounded-full border border-[var(--line)] text-[var(--muted)] md:hidden"
            aria-label="Open map"
          >
            <MapPin size={16} strokeWidth={2} />
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
              arrivals={preview?.bus_stop_code === stop.code ? preview : undefined}
              selected={selectedCode === stop.code}
              loading={previewLoading && selectedCode === stop.code}
              fromLat={location?.lat}
              fromLng={location?.lng}
              onSelect={() =>
                setSelectedCode(selectedCode === stop.code ? null : stop.code)
              }
            />
          ))
        )}
      </div>
    </div>
  );
}
