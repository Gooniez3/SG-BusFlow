"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { DynamicStopMap } from "@/components/DynamicStopMap";
import { ErrorState } from "@/components/ErrorState";
import { LiveBadge } from "@/components/LiveBadge";
import { PageHeader } from "@/components/PageHeader";
import { ServiceFavoriteButton } from "@/components/ServiceFavoriteButton";
import { ServiceTimes } from "@/components/ServiceTimes";
import { fetchService, fetchStop } from "@/lib/transport";
import { useServiceLive } from "@/lib/live";
import type { ServiceDetailResponse, Stop } from "@/lib/types";
import { useWorkspace } from "@/lib/workspace";

function routeCopy(
  originName: string | null,
  destName: string | null,
  loopDesc: string | null,
) {
  if (loopDesc) return loopDesc;
  if (originName && destName && originName === destName) return `Loop from ${originName}`;
  if (originName && destName) return `${originName} → ${destName}`;
  return null;
}

export default function ServicePage() {
  const params = useParams<{ serviceNo: string }>();
  const serviceNo = params.serviceNo.toUpperCase();
  const { selectedCode, stops, location, preview } = useWorkspace();
  const [service, setService] = useState<ServiceDetailResponse | null>(null);
  const [names, setNames] = useState<Record<string, string>>({});
  const [liveStop, setLiveStop] = useState<Stop | null>(null);
  const [error, setError] = useState<string | null>(null);
  const trackStop = selectedCode ?? stops[0]?.code ?? null;
  const previewMatch =
    preview && trackStop && preview.bus_stop_code === trackStop
      ? preview.services.find((item) => item.service_no === serviceNo) ?? null
      : null;
  const liveFeed = useServiceLive(previewMatch ? null : serviceNo, previewMatch ? null : trackStop);

  useEffect(() => {
    fetchService(serviceNo)
      .then(async (data) => {
        setService(data);
        const codes = data.directions
          .flatMap((item) => [item.origin_code, item.destination_code])
          .filter(Boolean) as string[];
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
    if (!trackStop) {
      setLiveStop(null);
      return;
    }
    const found = stops.find((stop) => stop.code === trackStop) ?? null;
    if (found) {
      setLiveStop(found);
      return;
    }
    let cancelled = false;
    fetchStop(trackStop)
      .then((stop) => {
        if (!cancelled) setLiveStop(stop);
      })
      .catch(() => {
        if (!cancelled) setLiveStop(null);
      });
    return () => {
      cancelled = true;
    };
  }, [trackStop, stops]);

  const live = previewMatch
    ? previewMatch
    : liveFeed.data
      ? {
          service_no: liveFeed.data.service_no,
          operator: liveFeed.data.operator ?? "",
          arrivals: liveFeed.data.arrivals,
        }
      : null;
  const cachedAt = previewMatch && preview ? preview.cached_at : liveFeed.data?.cached_at ?? null;

  const buses = useMemo(() => {
    const arrival = (live?.arrivals ?? []).find(
      (item) =>
        item.latitude &&
        item.longitude &&
        Math.abs(item.latitude) > 0.1 &&
        Math.abs(item.longitude) > 0.1,
    );
    return arrival
      ? [
          {
            serviceNo,
            lat: arrival.latitude as number,
            lng: arrival.longitude as number,
            minutes: arrival.minutes,
          },
        ]
      : [];
  }, [live, serviceNo]);

  if (error) {
    return <ErrorState title="Could not load this service" detail={error} />;
  }
  if (!service) {
    return <div className="h-24 animate-pulse rounded-xl bg-[var(--line)]" />;
  }

  const primary = service.directions[0];
  const originName = primary?.origin_code ? names[primary.origin_code] : null;
  const destName = primary?.destination_code ? names[primary.destination_code] : null;
  const subtitle = routeCopy(originName, destName, primary?.loop_desc ?? null);
  const mapCenter = buses[0] ?? (location ? { lat: location.lat, lng: location.lng } : null);

  return (
    <section className="flex min-h-0 flex-1 flex-col gap-3 md:block md:space-y-4">
      <PageHeader
        href="/"
        label="Back to nearby"
        title={
          <div>
            <p className="text-xs uppercase tracking-[0.16em] text-[var(--muted)]">Bus service</p>
            <h1 className="font-mono text-3xl font-semibold">{service.service_no}</h1>
          </div>
        }
        extra={
          <ServiceFavoriteButton iconOnly serviceNo={service.service_no} operator={primary?.operator} />
        }
      />
      {subtitle ? <p className="text-sm text-[var(--muted)]">{subtitle}</p> : null}
      <div className="rounded-xl border border-[var(--line)] bg-[var(--card)] px-3 py-2">
        {cachedAt ? (
          <div className="px-1 pt-1">
            <LiveBadge cachedAt={cachedAt} />
          </div>
        ) : null}
        {live && liveStop ? (
          <>
            <ServiceTimes service={live} stopCode={liveStop.code} />
            <Link
              href={`/stops/${liveStop.code}`}
              className="block px-1 pb-2 text-sm text-[var(--muted)]"
            >
              At {liveStop.name}
              {liveStop.distance_m != null ? ` · ${Math.round(liveStop.distance_m)}m` : ""}
            </Link>
          </>
        ) : (
          <p className="px-1 py-3 text-sm text-[var(--muted)]">
            No live arrival for {service.service_no} at nearby stops right now.
          </p>
        )}
      </div>
      <div className="relative min-h-[240px] flex-1 overflow-hidden rounded-xl border border-[var(--line)] md:hidden">
        {mapCenter ? (
          <DynamicStopMap
            lat={mapCenter.lat}
            lng={mapCenter.lng}
            stops={liveStop ? [liveStop] : []}
            buses={buses}
            selectedCode={liveStop?.code}
          />
        ) : (
          <div className="flex h-full items-center justify-center px-6 text-center text-sm text-[var(--muted)]">
            Live bus position appears when GPS is reported.
          </div>
        )}
      </div>
    </section>
  );
}
