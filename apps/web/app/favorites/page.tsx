"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { EmptyState } from "@/components/EmptyState";
import { StopPreview } from "@/components/StopPreview";
import {
  moveFavorite,
  readFavoriteServices,
  readFavorites,
  readPlaceLabels,
  setPlaceLabel,
  toggleFavorite,
  toggleFavoriteService,
  type FavoriteService,
  type FavoriteStop,
  type PlaceLabels,
} from "@/lib/favorites";
import { useStopArrivals } from "@/lib/useStopArrivals";
import { useWorkspace } from "@/lib/workspace";

export default function FavoritesPage() {
  const { setSelectedCode, selectedCode } = useWorkspace();
  const [stops, setStops] = useState<FavoriteStop[]>([]);
  const [services, setServices] = useState<FavoriteService[]>([]);
  const [labels, setLabels] = useState<PlaceLabels>({});
  const { data: arrivals, loading, reload } = useStopArrivals(stops.map((stop) => stop.code));

  function refresh() {
    setStops(readFavorites());
    setServices(readFavoriteServices());
    setLabels(readPlaceLabels());
  }

  useEffect(() => {
    refresh();
  }, []);

  return (
    <section className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">Favorites</h1>
      <div>
        <h2 className="mb-3 text-xs font-medium uppercase tracking-[0.16em] text-[var(--muted)]">
          Saved stops
        </h2>
        {stops.length === 0 ? (
          <EmptyState
            title="Your favorite stops and services will appear here."
            detail="Save a stop from the stop page or map sheet."
          />
        ) : (
          <div className="space-y-3">
            {stops.map((stop, index) => (
              <div key={stop.code} className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm text-[var(--muted)]">
                    {labels.home === stop.code ? "Home" : labels.work === stop.code ? "Work" : "Saved"}
                  </p>
                  <div className="flex gap-1">
                    <button
                      type="button"
                      onClick={() => {
                        setStops(moveFavorite(stop.code, -1));
                      }}
                      disabled={index === 0}
                      className="rounded-lg border border-[var(--line)] px-2 py-1 text-xs text-[var(--muted)] disabled:opacity-40"
                      aria-label="Move up"
                    >
                      Up
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setStops(moveFavorite(stop.code, 1));
                      }}
                      disabled={index === stops.length - 1}
                      className="rounded-lg border border-[var(--line)] px-2 py-1 text-xs text-[var(--muted)] disabled:opacity-40"
                      aria-label="Move down"
                    >
                      Down
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setLabels(setPlaceLabel("home", stop.code));
                      }}
                      className="rounded-lg border border-[var(--line)] px-2 py-1 text-xs"
                    >
                      Home
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setLabels(setPlaceLabel("work", stop.code));
                      }}
                      className="rounded-lg border border-[var(--line)] px-2 py-1 text-xs"
                    >
                      Work
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        toggleFavorite(stop);
                        refresh();
                      }}
                      className="rounded-lg border border-[var(--line)] px-2 py-1 text-xs text-[var(--muted)]"
                    >
                      Remove
                    </button>
                  </div>
                </div>
                <StopPreview
                  stop={{ ...stop, latitude: 0, longitude: 0 }}
                  arrivals={arrivals[stop.code]}
                  selected={selectedCode === stop.code}
                  loading={loading && selectedCode === stop.code}
                  onSelect={() => setSelectedCode(selectedCode === stop.code ? null : stop.code)}
                  onRefresh={reload}
                />
              </div>
            ))}
          </div>
        )}
      </div>
      <div>
        <h2 className="mb-3 text-xs font-medium uppercase tracking-[0.16em] text-[var(--muted)]">
          Saved services
        </h2>
        {services.length === 0 ? (
          <p className="text-sm text-[var(--muted)]">No saved services yet.</p>
        ) : (
          <div className="space-y-1">
            {services.map((service) => (
              <div key={service.service_no} className="flex items-center justify-between">
                <Link href={`/services/${service.service_no}`} className="py-2 font-mono text-xl font-semibold">
                  {service.service_no}
                </Link>
                <button
                  type="button"
                  onClick={() => {
                    toggleFavoriteService(service);
                    refresh();
                  }}
                  className="text-xs text-[var(--muted)]"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
