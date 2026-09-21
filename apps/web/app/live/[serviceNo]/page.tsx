"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { DynamicStopMap } from "@/components/DynamicStopMap";
import { ErrorState } from "@/components/ErrorState";
import { LiveBadge } from "@/components/LiveBadge";
import { PageHeader } from "@/components/PageHeader";
import { ServiceFavoriteButton } from "@/components/ServiceFavoriteButton";
import { ServiceTimes } from "@/components/ServiceTimes";
import { busesForService } from "@/lib/buses";
import { loadBarColor, loadCopy } from "@/lib/format";
import { useServiceLive } from "@/lib/live";
import { fetchStop } from "@/lib/transport";
import type { Arrival, Stop } from "@/lib/types";
import { useWorkspace } from "@/lib/workspace";

function LiveBusInner() {
  const params = useParams<{ serviceNo: string }>();
  const searchParams = useSearchParams();
  const { setSelectedCode, location, preview, previewError, liveStatus } = useWorkspace();
  const serviceNo = params.serviceNo.toUpperCase();
  const stopCode = searchParams.get("stop");
  const [stop, setStop] = useState<Stop | null>(null);
  const [error, setError] = useState<string | null>(null);
  const previewMatch = preview?.bus_stop_code === stopCode ? preview : null;
  const previewService = previewMatch?.services.find((item) => item.service_no === serviceNo) ?? null;
  const liveFeed = useServiceLive(previewService ? null : serviceNo, previewService ? null : stopCode);
  const liveData = previewMatch;
  const service = previewService
    ? previewService
    : liveFeed.data
      ? {
          service_no: liveFeed.data.service_no,
          operator: liveFeed.data.operator ?? "",
          arrivals: liveFeed.data.arrivals,
        }
      : null;
  const cachedAt = liveData?.cached_at ?? liveFeed.data?.cached_at;
  const stale = liveData?.stale ?? liveFeed.data?.stale;
  const badgeStatus = previewService ? liveStatus : liveFeed.status;

  useEffect(() => {
    if (stopCode) setSelectedCode(stopCode);
    if (!stopCode) return;
    let cancelled = false;
    Promise.all([fetchStop(stopCode)])
      .then(([stopData]) => {
        if (!cancelled) {
          setStop(stopData);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Could not load live bus");
      });
    return () => {
      cancelled = true;
    };
  }, [stopCode, setSelectedCode]);

  const next: Arrival | undefined = service?.arrivals[0];
  const load = loadCopy(next?.load);
  const buses = useMemo(() => {
    if (!service) return [];
    return busesForService(service, serviceNo);
  }, [service, serviceNo]);
  const mapCenter = stop
    ? { lat: stop.latitude, lng: stop.longitude }
    : location
      ? { lat: location.lat, lng: location.lng }
      : null;

  if (!stopCode) {
    return <ErrorState title="Choose a stop first" detail="Open a stop, then track a bus from live arrivals." />;
  }
  if (error) {
    return <ErrorState title="Live bus unavailable" detail={error} />;
  }
  if (!stop) {
    return <div className="h-24 animate-pulse rounded-xl bg-[var(--line)]" />;
  }

  return (
    <section className="flex min-h-0 flex-1 flex-col gap-3 md:block md:space-y-4">
      <PageHeader
        href={`/stops/${stopCode}`}
        label={`Back to ${stop.name}`}
        title={
          <div>
            <p className="text-xs uppercase tracking-[0.16em] text-[var(--muted)]">Live bus</p>
            <h1 className="font-mono text-3xl font-semibold">{serviceNo}</h1>
          </div>
        }
        extra={<ServiceFavoriteButton iconOnly serviceNo={serviceNo} operator={service?.operator} />}
      />
      <LiveBadge cachedAt={cachedAt} stale={stale} status={badgeStatus} />
      {previewError ? (
        <ErrorState
          title="Live arrivals delayed"
          detail="LTA data is temporarily unavailable. Last known arrivals stay on screen when we have them."
        />
      ) : null}
      <div className="rounded-xl border border-[var(--line)] bg-[var(--card)] px-3 py-2">
        {service ? (
          <ServiceTimes service={service} stopCode={stopCode} linked={false} />
        ) : (
          <p className="px-1 py-2 text-sm text-[var(--muted)]">No live arrival for this service right now.</p>
        )}
        <div className="flex items-center justify-between gap-3 border-t border-[var(--line)] px-1 py-2">
          <p className="min-w-0 truncate text-sm text-[var(--muted)]">
            Next stop <span className="font-medium text-[var(--ink)]">{stop.name}</span>
          </p>
          {load ? (
            <p className="shrink-0 text-xs text-[var(--muted)]">{load.label}</p>
          ) : null}
        </div>
        {load ? (
          <div className="mb-2 h-1 overflow-hidden rounded-full bg-[var(--line)]">
            <div
              className="h-full rounded-full"
              style={{
                width: `${Math.round(load.fill * 100)}%`,
                background: loadBarColor(next?.load),
              }}
            />
          </div>
        ) : null}
      </div>
      <div className="relative min-h-[240px] flex-1 overflow-hidden rounded-xl border border-[var(--line)] md:hidden">
        {mapCenter ? (
          <DynamicStopMap
            lat={mapCenter.lat}
            lng={mapCenter.lng}
            stops={[stop]}
            buses={buses}
            selectedCode={stopCode}
            showUser={false}
            fitToBus={buses.length > 0}
          />
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-[var(--muted)]">
            Finding the bus on the map…
          </div>
        )}
        {buses.length === 0 ? (
          <p className="pointer-events-none absolute bottom-3 left-3 right-3 rounded-lg bg-[var(--glass)] px-3 py-2 text-xs text-[var(--muted)]">
            LTA has not published this bus GPS yet. The stop is on the map; the numbered badge appears when a location is reported.
          </p>
        ) : null}
      </div>
    </section>
  );
}

export default function LiveBusPage() {
  return (
    <Suspense fallback={<div className="h-24 animate-pulse rounded-xl bg-[var(--line)]" />}>
      <LiveBusInner />
    </Suspense>
  );
}
