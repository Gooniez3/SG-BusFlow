"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ErrorState } from "@/components/ErrorState";
import { LiveBadge } from "@/components/LiveBadge";
import { PageHeader } from "@/components/PageHeader";
import { ServiceFavoriteButton } from "@/components/ServiceFavoriteButton";
import { ServiceTimes } from "@/components/ServiceTimes";
import { fetchArrivals, fetchService, fetchStop } from "@/lib/transport";
import type { ServiceArrivals, ServiceDetailResponse } from "@/lib/types";
import { useWorkspace } from "@/lib/workspace";

export default function ServicePage() {
  const params = useParams<{ serviceNo: string }>();
  const serviceNo = params.serviceNo;
  const { selectedCode, location } = useWorkspace();
  const [service, setService] = useState<ServiceDetailResponse | null>(null);
  const [names, setNames] = useState<Record<string, string>>({});
  const [live, setLive] = useState<ServiceArrivals | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cachedAt, setCachedAt] = useState<string | null>(null);

  useEffect(() => {
    fetchService(serviceNo)
      .then(async (data) => {
        setService(data);
        const codes = data.directions.flatMap((item) => [item.origin_code, item.destination_code]).filter(Boolean) as string[];
        const unique = [...new Set(codes)];
        const resolved = await Promise.all(
          unique.map(async (code) => {
            try {
              const stop = await fetchStop(code);
              return [code, stop.name] as const;
            } catch {
              return [code, code] as const;
            }
          }),
        );
        setNames(Object.fromEntries(resolved));
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : "Could not load service");
      });
  }, [serviceNo]);

  useEffect(() => {
    const stopCode = selectedCode;
    if (!stopCode) return;
    fetchArrivals(stopCode)
      .then((payload) => {
        setCachedAt(payload.cached_at);
        setLive(payload.services.find((item) => item.service_no === serviceNo.toUpperCase()) ?? null);
      })
      .catch(() => undefined);
  }, [selectedCode, serviceNo]);

  if (error) {
    return <ErrorState title="Could not load this service" detail={error} />;
  }
  if (!service) {
    return <div className="h-24 animate-pulse rounded-xl bg-[var(--line)]" />;
  }

  const primary = service.directions[0];
  const originName = primary?.origin_code ? names[primary.origin_code] : null;
  const destName = primary?.destination_code ? names[primary.destination_code] : null;
  const liveBuses = live?.arrivals.filter(
    (arrival) => arrival.latitude && arrival.longitude && Math.abs(arrival.latitude) > 0.1,
  ).length ?? 0;

  return (
    <section className="space-y-4">
      <PageHeader
        href="/"
        label="Back to nearby"
        title={
          <div>
            <p className="text-xs uppercase tracking-[0.16em] text-[var(--muted)]">Bus service</p>
            <h1 className="font-mono text-3xl font-semibold">{service.service_no}</h1>
          </div>
        }
        extra={<ServiceFavoriteButton serviceNo={service.service_no} operator={primary?.operator} />}
      />
      {originName && destName ? (
        <p className="text-sm text-[var(--muted)]">
          {originName} → {destName}
        </p>
      ) : null}
      {cachedAt ? <LiveBadge cachedAt={cachedAt} /> : null}
      {live && selectedCode ? (
        <div className="rounded-xl bg-[var(--card)] px-3 py-3">
          <ServiceTimes service={live} stopCode={selectedCode} />
          <Link
            href={`/live/${service.service_no}?stop=${selectedCode}`}
            className="mt-2 flex h-10 items-center justify-center text-sm font-medium text-[var(--accent)]"
          >
            Track live bus
          </Link>
        </div>
      ) : (
        <p className="text-sm text-[var(--muted)]">
          Select a nearby stop on the map to see live arrivals for this service.
        </p>
      )}
      <div>
        <h2 className="mb-3 text-xs font-medium uppercase tracking-[0.16em] text-[var(--muted)]">Route</h2>
        {service.directions.map((direction) => (
          <ol key={direction.direction} className="mb-4 space-y-0">
            <TimelineStop
              name={direction.origin_code ? names[direction.origin_code] : direction.origin_code}
              code={direction.origin_code}
              first
            />
            <TimelineStop
              name={direction.destination_code ? names[direction.destination_code] : direction.destination_code}
              code={direction.destination_code}
              last
            />
          </ol>
        ))}
        <p className="text-sm text-[var(--muted)]">Intermediate stops join this timeline when the route list is connected.</p>
      </div>
      <p className="text-sm text-[var(--muted)]">
        {liveBuses > 0
          ? `${liveBuses} ${liveBuses === 1 ? "bus" : "buses"} currently nearby.`
          : location
            ? "No live bus positions reported at the selected stop."
            : "Live positions appear when a bus reports GPS."}
      </p>
    </section>
  );
}

function TimelineStop({
  name,
  code,
  first,
  last,
}: {
  name?: string | null;
  code?: string | null;
  first?: boolean;
  last?: boolean;
}) {
  if (!code) return null;
  return (
    <li className="flex gap-3">
      <div className="flex w-4 flex-col items-center">
        <span className={`mt-1 h-2.5 w-2.5 rounded-full ${first || last ? "bg-[var(--accent)]" : "bg-[var(--ink)]"}`} />
        {!last ? <span className="w-px flex-1 bg-[var(--line)]" /> : null}
      </div>
      <Link href={`/stops/${code}`} className={`pb-4 ${last ? "pb-0" : ""}`}>
        {name || code}
      </Link>
    </li>
  );
}
