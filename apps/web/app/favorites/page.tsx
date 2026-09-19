"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { BusFront, Heart, RefreshCw } from "lucide-react";
import { EmptyState } from "@/components/EmptyState";
import { StopPreview } from "@/components/StopPreview";
import { fetchStop } from "@/lib/api";
import {
  readFavoriteServices,
  readFavorites,
  toggleFavoriteService,
  type FavoriteService,
} from "@/lib/favorites";
import { useWorkspace } from "@/lib/workspace";
import type { Stop } from "@/lib/types";

export default function FavoritesPage() {
  const { location, selectedCode, setSelectedCode, preview, previewLoading } = useWorkspace();
  const [stops, setStops] = useState<Stop[]>([]);
  const [services, setServices] = useState<FavoriteService[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const savedStops = readFavorites();
    const savedServices = readFavoriteServices();
    setServices(savedServices);
    setLoading(true);
    try {
      const details = await Promise.all(
        savedStops.map((item) =>
          fetchStop(item.code, location?.lat, location?.lng).catch(
            (): Stop => ({
              code: item.code,
              name: item.name,
              road_name: item.road_name,
              latitude: 0,
              longitude: 0,
            }),
          ),
        ),
      );
      setStops(details);
    } finally {
      setLoading(false);
    }
  }, [location?.lat, location?.lng]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight md:text-2xl">Saved</h1>
          <p className="mt-1 flex items-center gap-1.5 text-sm text-[var(--muted)]">
            <Heart size={14} strokeWidth={2} />
            Stops and services you keep on this device
          </p>
        </div>
        <button
          type="button"
          onClick={() => void load()}
          className="flex h-9 items-center gap-1.5 rounded-full border border-[var(--line)] px-3 text-xs text-[var(--muted)]"
          aria-label="Refresh saved"
        >
          <RefreshCw size={14} strokeWidth={2} />
          Refresh
        </button>
      </div>

      <div>
        <h2 className="text-xs font-medium uppercase tracking-[0.16em] text-[var(--muted)]">Saved stops</h2>
        {loading && stops.length === 0 ? (
          <div className="mt-3 space-y-2">
            <div className="h-[72px] animate-pulse rounded-xl bg-[var(--line)]" />
            <div className="h-[72px] animate-pulse rounded-xl bg-[var(--line)]" />
          </div>
        ) : null}
        {!loading && stops.length === 0 ? (
          <div className="mt-3">
            <EmptyState
              title="No saved stops yet"
              detail="Tap the heart on a stop from Nearby, Map, or the stop page."
            />
          </div>
        ) : null}
        {stops.length > 0 ? (
          <div className="mt-3 space-y-2">
            {stops.map((stop) => (
              <StopPreview
                key={stop.code}
                stop={stop}
                arrivals={preview?.bus_stop_code === stop.code ? preview : undefined}
                selected={selectedCode === stop.code}
                loading={previewLoading && selectedCode === stop.code}
                fromLat={location?.lat}
                fromLng={location?.lng}
                onSelect={() => setSelectedCode(selectedCode === stop.code ? null : stop.code)}
                onFavoriteChange={(saved) => {
                  if (saved) return;
                  setStops((current) => current.filter((item) => item.code !== stop.code));
                  if (selectedCode === stop.code) setSelectedCode(null);
                }}
              />
            ))}
          </div>
        ) : null}
      </div>

      <div>
        <h2 className="text-xs font-medium uppercase tracking-[0.16em] text-[var(--muted)]">Saved services</h2>
        {services.length === 0 ? (
          <div className="mt-3">
            <EmptyState
              title="No saved services yet"
              detail="Save a bus from a live arrival or the service page."
            />
          </div>
        ) : (
          <div className="mt-3 overflow-hidden rounded-xl border border-[var(--line)] bg-[var(--card)]">
            {services.map((service) => (
              <div
                key={service.service_no}
                className="flex items-center gap-3 border-b border-[var(--line)] px-3 py-2.5 last:border-b-0"
              >
                <BusFront size={18} strokeWidth={2} className="shrink-0 text-[var(--muted)]" />
                <Link href={`/services/${service.service_no}`} className="min-w-0 flex-1">
                  <p className="font-mono text-lg font-semibold leading-tight">{service.service_no}</p>
                  <p className="mt-0.5 text-sm text-[var(--muted)]">{service.operator ?? "Bus service"}</p>
                </Link>
                <button
                  type="button"
                  onClick={() => {
                    setServices(toggleFavoriteService(service));
                  }}
                  className="flex h-9 w-9 items-center justify-center text-[var(--accent)]"
                  aria-label={`Remove ${service.service_no}`}
                >
                  <Heart size={16} strokeWidth={2} fill="currentColor" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
