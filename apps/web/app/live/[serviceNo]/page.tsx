"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { ErrorState } from "@/components/ErrorState";
import { LiveBadge } from "@/components/LiveBadge";
import { PageHeader } from "@/components/PageHeader";
import { ServiceFavoriteButton } from "@/components/ServiceFavoriteButton";
import { ServiceTimes } from "@/components/ServiceTimes";
import { arrivalShort, loadCopy } from "@/lib/format";
import { fetchArrivals, fetchStop } from "@/lib/transport";
import type { Arrival, Stop, StopArrivalsResponse } from "@/lib/types";
import { useWorkspace } from "@/lib/workspace";

function LiveBusInner() {
  const params = useParams<{ serviceNo: string }>();
  const searchParams = useSearchParams();
  const { setSelectedCode } = useWorkspace();
  const serviceNo = params.serviceNo.toUpperCase();
  const stopCode = searchParams.get("stop");
  const [stop, setStop] = useState<Stop | null>(null);
  const [arrivals, setArrivals] = useState<StopArrivalsResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (stopCode) setSelectedCode(stopCode);
    if (!stopCode) return;
    let cancelled = false;
    Promise.all([fetchStop(stopCode), fetchArrivals(stopCode)])
      .then(([stopData, arrivalData]) => {
        if (!cancelled) {
          setStop(stopData);
          setArrivals(arrivalData);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Could not load live bus");
      });
    return () => {
      cancelled = true;
    };
  }, [stopCode, setSelectedCode]);

  const service = arrivals?.services.find((item) => item.service_no === serviceNo);
  const next: Arrival | undefined = service?.arrivals[0];
  const load = loadCopy(next?.load);
  const bus = useMemo(() => {
    const withGps = service?.arrivals.find(
      (arrival) => arrival.latitude && arrival.longitude && Math.abs(arrival.latitude) > 0.1,
    );
    return withGps ?? next;
  }, [next, service]);

  if (!stopCode) {
    return <ErrorState title="Choose a stop first" detail="Open a stop, then track a bus from live arrivals." />;
  }
  if (error) {
    return <ErrorState title="Live bus unavailable" detail="We couldn't retrieve the latest arrival information." />;
  }
  if (!stop || !arrivals) {
    return <div className="h-24 animate-pulse rounded-xl bg-[var(--line)]" />;
  }

  const onMap = bus?.latitude && Math.abs(bus.latitude) > 0.1;

  return (
    <section className="space-y-4">
      <PageHeader
        href={`/stops/${stopCode}`}
        label={`Back to ${stop.name}`}
        title={
          <div>
            <p className="text-xs uppercase tracking-[0.16em] text-[var(--muted)]">Live bus</p>
            <h1 className="font-mono text-3xl font-semibold">{serviceNo}</h1>
          </div>
        }
        extra={<ServiceFavoriteButton serviceNo={serviceNo} operator={service?.operator} />}
      />
      {next?.destination_name ? (
        <p className="text-sm text-[var(--muted)]">To {next.destination_name}</p>
      ) : null}
      {arrivals ? <LiveBadge cachedAt={arrivals.cached_at} stale={arrivals.stale} /> : null}
      <div className="rounded-xl bg-[var(--card)] px-3 py-3">
        {service ? <ServiceTimes service={service} stopCode={stopCode} /> : (
          <p className="px-1 py-2 text-sm text-[var(--muted)]">No live arrival for this service right now.</p>
        )}
        <div className="mt-2 border-t border-[var(--line)] px-1 pt-3">
          <p className="text-xs uppercase tracking-[0.16em] text-[var(--muted)]">Next stop</p>
          <p className="mt-1 font-medium">{stop.name}</p>
          <p className="mt-3 text-xs uppercase tracking-[0.16em] text-[var(--muted)]">Estimated arrival</p>
          <p className="mt-1 font-mono text-2xl font-semibold tabular-nums text-[var(--accent)]">
            {next ? (arrivalShort(next.minutes) === "Here" ? "Here" : `${next.minutes} min`) : "— —"}
          </p>
          {load ? (
            <div className="mt-3">
              <div className="h-1.5 overflow-hidden rounded-full bg-[var(--line)]">
                <div
                  className="h-full rounded-full bg-[var(--accent)]"
                  style={{ width: `${Math.round(load.fill * 100)}%` }}
                />
              </div>
              <p className="mt-1 text-sm text-[var(--muted)]">{load.label}</p>
            </div>
          ) : null}
        </div>
      </div>
      <Link
        href="/map"
        className="flex h-11 items-center justify-center rounded-full bg-[var(--card)] text-sm font-medium text-[var(--accent)]"
      >
        {onMap ? "Show bus on map" : "Open map"}
      </Link>
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
