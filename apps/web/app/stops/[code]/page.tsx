"use client";

import { Suspense, useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { Footprints, Navigation } from "lucide-react";
import { DynamicStopMap } from "@/components/DynamicStopMap";
import { ErrorState } from "@/components/ErrorState";
import { FavoriteButton } from "@/components/FavoriteButton";
import { LiveBadge } from "@/components/LiveBadge";
import { PageHeader } from "@/components/PageHeader";
import { ServiceTimes } from "@/components/ServiceTimes";
import { ArrivalSkeleton } from "@/components/Skeleton";
import { fetchArrivals, fetchStop } from "@/lib/api";
import { clockTime, walkLabel } from "@/lib/format";
import type { Stop, StopArrivalsResponse } from "@/lib/types";
import { useWorkspace } from "@/lib/workspace";

function StopPageInner() {
  const params = useParams<{ code: string }>();
  const searchParams = useSearchParams();
  const { location, setSelectedCode, stops } = useWorkspace();
  const code = params.code;
  const lat = searchParams.get("lat") ?? (location ? String(location.lat) : null);
  const lng = searchParams.get("lng") ?? (location ? String(location.lng) : null);
  const [stop, setStop] = useState<Stop | null>(null);
  const [arrivals, setArrivals] = useState<StopArrivalsResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [arrivalError, setArrivalError] = useState<string | null>(null);
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
    function refreshArrivals() {
      fetchArrivals(code)
        .then((data) => {
          if (!cancelled) {
            setArrivals(data);
            setArrivalError(null);
          }
        })
        .catch((err: unknown) => {
          if (!cancelled) {
            setArrivalError(err instanceof Error ? err.message : "Live arrivals unavailable");
          }
        });
    }
    void load();
    refreshArrivals();
    const timer = window.setInterval(refreshArrivals, 20000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [code, lat, lng, setSelectedCode, retryTick]);

  if (error) {
    return <ErrorState title="Could not load this stop" detail={error} />;
  }
  if (!stop) {
    return <ArrivalSkeleton />;
  }

  const mapStops = stops.some((item) => item.code === stop.code) ? stops : [stop, ...stops];

  return (
    <section className="flex min-h-0 flex-1 flex-col gap-3 md:block md:space-y-4">
      <PageHeader
        href="/"
        label="Back to nearby"
        title={
          <div>
            <h1 className="text-xl font-semibold tracking-tight">{stop.name}</h1>
            <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-[var(--muted)]">
              <span>{stop.code}</span>
              {stop.road_name ? <span>{stop.road_name}</span> : null}
              {walkLabel(stop.distance_m) ? (
                <span className="inline-flex items-center gap-1">
                  <Footprints size={14} strokeWidth={2} />
                  {walkLabel(stop.distance_m)}
                </span>
              ) : null}
            </p>
          </div>
        }
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
      <div className="rounded-xl border border-[var(--line)] bg-[var(--card)] px-3 py-2">
        <div className="mb-1 flex items-center justify-between gap-3 px-1 pt-1">
          <h2 className="text-xs font-medium uppercase tracking-[0.16em] text-[var(--muted)]">
            Live arrivals
          </h2>
          {arrivals ? <LiveBadge cachedAt={arrivals.cached_at} stale={arrivals.stale} /> : null}
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
        {arrivals?.services.map((service) => (
          <ServiceTimes key={service.service_no} service={service} stopCode={stop.code} />
        ))}
      </div>
      <div className="relative min-h-[220px] flex-1 overflow-hidden rounded-xl border border-[var(--line)] md:hidden">
        <DynamicStopMap
          lat={stop.latitude || location?.lat || 1.35}
          lng={stop.longitude || location?.lng || 103.85}
          stops={mapStops}
          selectedCode={stop.code}
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
