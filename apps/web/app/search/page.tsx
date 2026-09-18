"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { EmptyState } from "@/components/EmptyState";
import { SearchBar } from "@/components/SearchBar";
import { searchServices, searchStops } from "@/lib/transport";
import { clearRecents, pushRecent, readRecents, type RecentSearch } from "@/lib/recents";
import type { ServiceSearchItem, Stop } from "@/lib/types";

function isPlaceStop(stop: Stop) {
  const haystack = `${stop.name} ${stop.road_name ?? ""}`.toLowerCase();
  return /mrt|int|interchange|terminal/.test(haystack);
}

function SearchInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initial = searchParams.get("q") ?? "";
  const [query, setQuery] = useState(initial);
  const [stops, setStops] = useState<Stop[]>([]);
  const [services, setServices] = useState<ServiceSearchItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [recents, setRecents] = useState<RecentSearch[]>([]);

  useEffect(() => {
    setRecents(readRecents());
  }, []);

  useEffect(() => {
    setQuery(initial);
    const trimmed = initial.trim();
    if (!trimmed) {
      setStops([]);
      setServices([]);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    Promise.allSettled([searchStops(trimmed), searchServices(trimmed)]).then((results) => {
      if (cancelled) return;
      const [stopResult, serviceResult] = results;
      if (stopResult.status === "fulfilled") setStops(stopResult.value.stops);
      else setStops([]);
      if (serviceResult.status === "fulfilled") setServices(serviceResult.value.services);
      else setServices([]);
      if (stopResult.status === "rejected" && serviceResult.status === "rejected") {
        setError("Search failed. Try again.");
      }
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [initial]);

  const places = useMemo(() => stops.filter(isPlaceStop), [stops]);

  function go(value: string) {
    const trimmed = value.trim();
    if (!trimmed) return;
    pushRecent(trimmed);
    setRecents(readRecents());
    router.replace(`/search?q=${encodeURIComponent(trimmed)}`);
  }

  return (
    <section className="space-y-5">
      <h1 className="text-2xl font-semibold tracking-tight">Search</h1>
      <SearchBar
          value={query}
          placeholder="Jurong, 174, Boon Lay"
          autoFocus
          onChange={setQuery}
          onClear={() => {
            setQuery("");
            router.replace("/search");
          }}
          onSubmit={go}
        />
      {!initial && recents.length > 0 ? (
        <div>
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-xs font-medium uppercase tracking-[0.16em] text-[var(--muted)]">Recent</h2>
            <button
              type="button"
              onClick={() => {
                clearRecents();
                setRecents([]);
              }}
              className="text-xs text-[var(--muted)]"
            >
              Clear
            </button>
          </div>
          <div className="space-y-1">
            {recents.map((item) => (
              <button
                key={item.query}
                type="button"
                onClick={() => go(item.query)}
                className="block w-full rounded-lg px-1 py-3 text-left text-sm"
              >
                {item.query}
              </button>
            ))}
          </div>
        </div>
      ) : null}
      {loading ? (
        <div className="space-y-2">
          <div className="h-12 animate-pulse rounded-xl bg-[var(--line)]" />
          <div className="h-12 animate-pulse rounded-xl bg-[var(--line)]" />
        </div>
      ) : null}
      {error ? <p className="text-sm text-[var(--muted)]">{error}</p> : null}
      {!loading && initial && stops.length === 0 && services.length === 0 && !error ? (
        <EmptyState title="No results" detail="Try a stop name, code, or bus service number." />
      ) : null}
      {stops.length > 0 ? (
        <ResultGroup title="Bus stops">
          {stops.map((stop) => (
            <Link key={stop.code} href={`/stops/${stop.code}`} className="block rounded-lg px-1 py-3">
              <p className="font-medium">{stop.name}</p>
              <p className="text-sm text-[var(--muted)]">
                {stop.code}
                {stop.road_name ? ` · ${stop.road_name}` : ""}
              </p>
            </Link>
          ))}
        </ResultGroup>
      ) : null}
      {services.length > 0 ? (
        <ResultGroup title="Bus services">
          {services.map((service) => (
            <Link
              key={service.service_no}
              href={`/services/${service.service_no}`}
              className="block rounded-lg px-1 py-3 font-mono text-lg font-semibold"
            >
              {service.service_no}
              {service.operator ? (
                <span className="ml-2 font-sans text-sm font-normal text-[var(--muted)]">
                  {service.operator}
                </span>
              ) : null}
            </Link>
          ))}
        </ResultGroup>
      ) : null}
      {places.length > 0 ? (
        <ResultGroup title="Places">
          {places.map((stop) => (
            <Link key={`place-${stop.code}`} href={`/stops/${stop.code}`} className="block rounded-lg px-1 py-3">
              <p className="font-medium">{stop.name}</p>
              <p className="text-sm text-[var(--muted)]">{stop.road_name ?? stop.code}</p>
            </Link>
          ))}
        </ResultGroup>
      ) : null}
    </section>
  );
}

function ResultGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="mb-1 text-xs font-medium uppercase tracking-[0.16em] text-[var(--muted)]">{title}</h2>
      <div className="divide-y divide-[var(--line)]">{children}</div>
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={<p className="text-sm text-[var(--muted)]">Search</p>}>
      <SearchInner />
    </Suspense>
  );
}
