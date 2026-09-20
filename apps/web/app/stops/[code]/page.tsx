"use client";

import { Suspense, useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { Navigation } from "lucide-react";
import { DynamicStopMap } from "@/components/DynamicStopMap";
import { ErrorState } from "@/components/ErrorState";
import { FavoriteButton } from "@/components/FavoriteButton";
import { LiveBadge } from "@/components/LiveBadge";
import { PageHeader } from "@/components/PageHeader";
import { ServiceTimes } from "@/components/ServiceTimes";
import { ArrivalSkeleton } from "@/components/Skeleton";
import { fetchStop } from "@/lib/api";
import { busesFromServices, uniqueBuses } from "@/lib/buses";
import { clockTime, walkParts } from "@/lib/format";
import type { Stop } from "@/lib/types";
import { useWorkspace } from "@/lib/workspace";

function StopPageInner() {
  const params = useParams<{ code: string }>();
  const searchParams = useSearchParams();
  const { location, setSelectedCode, stops, preview, previewError, liveStatus } = useWorkspace();
  const code = params.code;
  const lat = searchParams.get("lat") ?? (location ? String(location.lat) : null);
  const lng = searchParams.get("lng") ?? (location ? String(location.lng) : null);
  const [stop, setStop] = useState<Stop | null>(null);
  const [error, setError] = useState<string | null>(null);
  const arrivals = preview?.bus_stop_code === code ? preview : null;
  const arrivalError = previewError;
  const [retryTick, setRetryTick] = useState(0);

  useEffect(() => {
    setSelectedCode(code);
    let cancelled = false;
    async function load() {
      try {
        const stopData = await fetchStop(
          code,
          lat ? Number(lat) : undefined,
          lng ? Number(lng) : undefined,
        );
        if (!cancelled) setStop(stopData);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Could not load stop");
        }
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [code, lat, lng, setSelectedCode, retryTick]);

  if (error) {
    return <ErrorState title="Could not load this stop" detail={error} />;
  }
  if (!stop) {
    return <ArrivalSkeleton />;
  }

  const mapStops = stops.some((item) => item.code === stop.code) ? stops : [stop, ...stops];
  const buses = uniqueBuses(busesFromServices(arrivals?.services ?? []));
  const walk = walkParts(stop.distance_m);

  return (
    <section className="flex min-h-0 flex-1 flex-col gap-3 md:block md:space-y-4">
      <PageHeader
        href="/"
        label="Back to nearby"
        title={<h1 className="text-xl font-semibold tracking-tight">{stop.name}</h1>}
        extra={
          <div className="flex items-center gap-1">
            {stop.latitude && stop.longitude ? (
              <a
                href={`https://www.google.com/maps/dir/?api=1&destination=${stop.latitude},${stop.longitude}`}
                target="_blank"
                rel="noreferrer"
                className="flex h-10 w-10 items-center justify-center rounded-full border border-[var(--line)] bg-[var(--card)] text-[var(--muted)]"
                aria-label="Directions"
              >
                <Navigation size={16} strokeWidth={2} />
              </a>
            ) : null}
            <FavoriteButton
              iconOnly
              stop={{ code: stop.code, name: stop.name, road_name: stop.road_name }}
            />
          </div>
        }
      />
      <div className="rounded-2xl border border-[var(--line)] bg-[var(--card)] px-3 py-2.5">
        {stop.road_name ? (
          <p className="truncate text-sm text-[var(--muted)]">{stop.road_name}</p>
        ) : null}
        <div className={`grid min-w-0 ${walk ? "grid-cols-3" : "grid-cols-1"} ${stop.road_name ? "mt-2" : ""}`}>
          <div className="min-w-0">
            <p className="text-[10px] font-medium uppercase tracking-[0.16em] text-[var(--muted)]">Stop</p>
            <p className="mt-0.5 font-mono text-[15px] font-medium tabular-nums tracking-[0.04em]">{stop.code}</p>
          </div>
          {walk ? (
            <>
              <div className="min-w-0 border-l border-[var(--line)] pl-3">
                <p className="text-[10px] font-medium uppercase tracking-[0.16em] text-[var(--muted)]">Distance</p>
                <p className="mt-0.5 text-[15px] font-semibold tabular-nums tracking-tight">
                  {walk.metres}
                  <span className="ml-1 text-sm font-medium text-[var(--muted)]">m</span>
                </p>
              </div>
              <div className="min-w-0 border-l border-[var(--line)] pl-3">
                <p className="text-[10px] font-medium uppercase tracking-[0.16em] text-[var(--muted)]">Walk</p>
                <p className="mt-0.5 text-[15px] font-semibold tracking-tight">
                  ~{walk.minutes}
                  <span className="ml-1 text-sm font-medium text-[var(--muted)]">min</span>
                </p>
              </div>
            </>
          ) : null}
        </div>
      </div>
      <div className="rounded-xl border border-[var(--line)] bg-[var(--card)] px-3 py-2">
        <div className="mb-1 flex items-center justify-between gap-3 px-1 pt-1">
          <h2 className="text-xs font-medium uppercase tracking-[0.16em] text-[var(--muted)]">
            Live arrivals
          </h2>
          {arrivals ? (
            <LiveBadge cachedAt={arrivals.cached_at} stale={arrivals.stale} status={liveStatus} />
          ) : (
            <LiveBadge status={liveStatus} />
          )}
        </div>
        {arrivalError ? (
          <ErrorState
            title="Live arrivals unavailable"
            detail="We couldn't retrieve the latest arrival information."
            lastUpdated={clockTime(arrivals?.cached_at)}
            onRetry={() => setRetryTick((value) => value + 1)}
          />
        ) : null}
        {!arrivals && !arrivalError ? (
          <div className="space-y-2 py-2">
            <ArrivalSkeleton />
            <ArrivalSkeleton />
          </div>
        ) : null}
        {arrivals && arrivals.services.length === 0 ? (
          <p className="px-1 py-3 text-sm text-[var(--muted)]">No services reported right now.</p>
        ) : null}
        {arrivals && arrivals.services.length > 0 ? (
          <div className="overflow-hidden rounded-lg border border-[var(--line)] bg-[var(--bg)]">
            {arrivals.services.map((service) => (
              <ServiceTimes key={service.service_no} service={service} stopCode={stop.code} />
            ))}
          </div>
        ) : null}
      </div>
      <div className="relative min-h-[220px] flex-1 overflow-hidden rounded-xl border border-[var(--line)] md:hidden">
        <DynamicStopMap
          lat={stop.latitude || location?.lat || 1.35}
          lng={stop.longitude || location?.lng || 103.85}
          stops={mapStops}
          buses={buses}
          selectedCode={stop.code}
          fitToBus={buses.length > 0}
        />
      </div>
    </section>
  );
}

export default function StopPage() {
  return (
    <Suspense fallback={<ArrivalSkeleton />}>
      <StopPageInner />
    </Suspense>
  );
}
