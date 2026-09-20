"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { BusFront, Clock, Footprints, MapPin } from "lucide-react";
import { EmptyState } from "@/components/EmptyState";
import { JourneyForm } from "@/components/JourneyForm";
import { SearchBar } from "@/components/SearchBar";
import { walkParts } from "@/lib/format";
import { searchServices, searchStops } from "@/lib/transport";
import { clearRecents, pushRecent, readRecents, type RecentSearch } from "@/lib/recents";
import type { ServiceSearchItem, Stop } from "@/lib/types";
import { useWorkspace } from "@/lib/workspace";

function SearchInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { location } = useWorkspace();
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
  }, [initial]);

  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed === initial.trim()) return;
    const timer = window.setTimeout(() => {
      if (!trimmed) {
        router.replace("/search");
        return;
      }
      if (trimmed.length < 2) return;
      router.replace(`/search?q=${encodeURIComponent(trimmed)}`);
    }, 280);
    return () => window.clearTimeout(timer);
  }, [query, initial, router]);

  useEffect(() => {
    const trimmed = initial.trim();
    if (!trimmed) {
      setStops([]);
      setServices([]);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    Promise.allSettled([
      searchStops(trimmed, location?.lat, location?.lng),
      searchServices(trimmed),
    ]).then((results) => {
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
  }, [initial, location?.lat, location?.lng]);

  const nearbyStops = useMemo(
    () => stops.filter((stop) => stop.distance_m != null && stop.distance_m <= 1500),
    [stops],
  );
  const otherStops = useMemo(
    () => stops.filter((stop) => !nearbyStops.some((item) => item.code === stop.code)),
    [stops, nearbyStops],
  );
  const looksLikeService = /^[0-9][0-9A-Za-z]{0,4}$/.test(initial.trim());

  function go(value: string) {
    const trimmed = value.trim();
    if (!trimmed) {
      router.replace("/search");
      return;
    }
    pushRecent(trimmed);
    setRecents(readRecents());
    router.replace(`/search?q=${encodeURIComponent(trimmed)}`);
  }

  const serviceBlock =
    services.length > 0 ? (
      <ResultGroup title="Services">
        {services.map((service) => (
          <Link
            key={service.service_no}
            href={`/services/${service.service_no}`}
            className="flex items-center gap-3 py-3"
          >
            <BusFront size={18} strokeWidth={2} className="shrink-0 text-[var(--muted)]" />
            <span className="min-w-0">
              <span className="block font-mono text-lg font-semibold leading-tight">
                {service.service_no}
              </span>
              {service.operator ? (
                <span className="text-sm text-[var(--muted)]">{service.operator}</span>
              ) : null}
            </span>
          </Link>
        ))}
      </ResultGroup>
    ) : null;

  return (
    <section className="space-y-5">
      <h1 className="text-2xl font-semibold tracking-tight">Search</h1>
      <JourneyForm />
      <div className="flex items-center gap-3" role="separator" aria-label="or">
        <span className="h-px flex-1 bg-[var(--line)]" />
        <span className="text-[11px] font-medium uppercase tracking-[0.16em] text-[var(--muted)]">or</span>
        <span className="h-px flex-1 bg-[var(--line)]" />
      </div>
      <SearchBar
        value={query}
        placeholder="Search buses, stops or places"
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
          <div className="divide-y divide-[var(--line)]">
            {recents.map((item) => (
              <button
                key={item.query}
                type="button"
                onClick={() => go(item.query)}
                className="flex w-full items-center gap-3 py-3 text-left text-sm"
              >
                <Clock size={16} strokeWidth={2} className="shrink-0 text-[var(--muted)]" />
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
      {looksLikeService ? serviceBlock : null}
      {nearbyStops.length > 0 ? (
        <ResultGroup title="Nearby">
          {nearbyStops.map((stop) => (
            <StopResult key={stop.code} stop={stop} />
          ))}
        </ResultGroup>
      ) : null}
      {otherStops.length > 0 ? (
        <ResultGroup title={nearbyStops.length > 0 ? "Other stops" : "Bus stops"}>
          {otherStops.map((stop) => (
            <StopResult key={stop.code} stop={stop} />
          ))}
        </ResultGroup>
      ) : null}
      {!looksLikeService ? serviceBlock : null}
    </section>
  );
}

function StopResult({ stop }: { stop: Stop }) {
  const walk = walkParts(stop.distance_m);
  return (
    <Link href={`/stops/${stop.code}`} className="flex items-start gap-3 py-3">
      <MapPin size={18} strokeWidth={2} className="mt-0.5 shrink-0 text-[var(--muted)]" />
      <span className="min-w-0 flex-1">
        <span className="block font-medium leading-tight">{stop.name}</span>
        <span className="mt-0.5 block text-sm text-[var(--muted)]">
          {stop.code}
          {stop.road_name ? ` · ${stop.road_name}` : ""}
        </span>
      </span>
      {walk ? (
        <span className="flex shrink-0 items-center gap-1 pt-0.5 text-sm tabular-nums text-[var(--muted)]">
          <Footprints size={14} strokeWidth={2} />
          {walk.metres}m
        </span>
      ) : null}
    </Link>
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
