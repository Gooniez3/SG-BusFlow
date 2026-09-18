"use client";

import { useMemo } from "react";
import { usePathname, useRouter } from "next/navigation";
import { DynamicStopMap } from "@/components/DynamicStopMap";
import { ErrorState } from "@/components/ErrorState";
import { FavoriteButton } from "@/components/FavoriteButton";
import { ServiceTimes } from "@/components/ServiceTimes";
import { clockTime, walkParts } from "@/lib/format";
import { useWorkspace } from "@/lib/workspace";

export function WorkspaceMap() {
  const router = useRouter();
  const pathname = usePathname();
  const mapKey = pathname === "/map" ? "mobile-map" : "workspace-map";
  const {
    location,
    stops,
    selectedCode,
    setSelectedCode,
    preview,
    previewLoading,
    previewError,
    reload,
  } = useWorkspace();
  const selectedStop = stops.find((stop) => stop.code === selectedCode) ?? null;
  const walk = walkParts(selectedStop?.distance_m);
  const buses = useMemo(
    () =>
      (preview?.services ?? []).flatMap((service) =>
        service.arrivals
          .filter(
            (arrival) =>
              arrival.latitude &&
              arrival.longitude &&
              Math.abs(arrival.latitude) > 0.1 &&
              Math.abs(arrival.longitude) > 0.1,
          )
          .map((arrival) => ({
            serviceNo: service.service_no,
            lat: arrival.latitude as number,
            lng: arrival.longitude as number,
            minutes: arrival.minutes,
          })),
      ),
    [preview],
  );

  if (!location) {
    return <div className="h-full w-full bg-[#1a1d21]" />;
  }

  return (
    <div className="relative h-full min-h-0 w-full">
      <DynamicStopMap
        key={mapKey}
        lat={location.lat}
        lng={location.lng}
        stops={stops}
        buses={buses}
        selectedCode={selectedCode}
        onSelectStop={setSelectedCode}
        onSelectBus={(serviceNo) => {
          if (selectedCode) {
            router.push(`/live/${serviceNo}?stop=${selectedCode}`);
          }
        }}
      />
      <button
        type="button"
        onClick={reload}
        className="absolute bottom-[calc(5.75rem+env(safe-area-inset-bottom))] right-3 z-[1200] flex h-11 w-11 items-center justify-center rounded-full bg-white text-[#111827] shadow-[0_2px_10px_rgb(0_0_0_/_0.35)] md:bottom-8 md:right-5"
        aria-label="Use current location"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
          <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.8" />
          <path d="M12 3v3M12 18v3M3 12h3M18 12h3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      </button>
      {selectedStop ? (
        <div className="bf-sheet absolute inset-x-3 bottom-[calc(4.75rem+env(safe-area-inset-bottom))] z-[1200] max-h-[48%] overflow-y-auto rounded-2xl border border-[var(--line)] bg-[var(--card)] px-3 pb-3 pt-2 shadow-[0_8px_30px_rgb(0_0_0_/_0.35)] md:hidden">
          <div className="mb-2 flex items-start gap-2">
            <div className="min-w-0 flex-1 px-1 pt-1">
              <p className="font-medium leading-tight">{selectedStop.name}</p>
              <p className="mt-1 text-xs text-[var(--muted)]">
                {walk ? `${walk.metres}m` : selectedStop.code}
                {selectedStop.road_name ? ` · ${selectedStop.road_name}` : ` · ${selectedStop.code}`}
              </p>
            </div>
            <FavoriteButton
              iconOnly
              stop={{
                code: selectedStop.code,
                name: selectedStop.name,
                road_name: selectedStop.road_name,
              }}
            />
            <button
              type="button"
              onClick={() => setSelectedCode(null)}
              className="flex h-9 w-9 items-center justify-center rounded-full text-[var(--muted)]"
              aria-label="Close stop"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
                <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              </svg>
            </button>
          </div>
          {previewLoading && !preview ? (
            <div className="space-y-2 px-1 py-2">
              <div className="h-8 animate-pulse rounded bg-[var(--line)]" />
              <div className="h-8 animate-pulse rounded bg-[var(--line)]" />
            </div>
          ) : null}
          {previewError ? (
            <ErrorState
              title="Live arrivals unavailable"
              detail="We couldn't retrieve the latest arrival information."
              lastUpdated={clockTime(preview?.cached_at)}
              onRetry={() => setSelectedCode(selectedStop.code)}
            />
          ) : null}
          <div className="px-1">
            {preview?.services.map((service) => (
              <ServiceTimes key={service.service_no} service={service} stopCode={selectedStop.code} />
            ))}
            {preview && preview.services.length === 0 ? (
              <p className="py-3 text-sm text-[var(--muted)]">No services reported right now.</p>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
