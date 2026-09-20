"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { EmptyState } from "@/components/EmptyState";
import { JourneyDetails, JourneyResults } from "@/components/JourneyResults";
import { PageHeader } from "@/components/PageHeader";
import { fetchJourneys } from "@/lib/transport";
import { journeyDetailHref, parseJourneySearch, samePlace } from "@/lib/journey";
import { useJourneySession } from "@/lib/journey-session";
import type { JourneyPlanResponse } from "@/lib/types";

function JourneyInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const query = parseJourneySearch(searchParams);
  const { setPlan, setSelectedOption, selectedOption } = useJourneySession();
  const [plan, setLocalPlan] = useState<JourneyPlanResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!query) {
      setLocalPlan(null);
      setPlan(null);
      setSelectedOption(null);
      router.replace("/search");
      return;
    }
    let cancelled = false;
    const load = (silent: boolean) => {
      if (!silent) {
        setLoading(true);
        setError(null);
      }
      fetchJourneys({
        fromLat: query.fromLat,
        fromLng: query.fromLng,
        toLat: query.toLat,
        toLng: query.toLng,
        fromStop: query.fromStop,
        toStop: query.toStop,
        fromLabel: query.fromLabel,
        toLabel: query.toLabel,
      })
        .then((result) => {
          if (cancelled) return;
          setLocalPlan(result);
          setPlan(result);
          const optionId =
            typeof window === "undefined" ? query.optionId : new URLSearchParams(window.location.search).get("option");
          const match = result.options.find((item) => item.id === optionId) ?? result.options[0] ?? null;
          setSelectedOption(match);
          setError(null);
        })
        .catch((err: unknown) => {
          if (!cancelled && !silent) setError(err instanceof Error ? err.message : "Could not plan this journey");
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    };
    load(false);
    const timer = window.setInterval(() => load(true), 20_000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [query?.fromLat, query?.fromLng, query?.toLat, query?.toLng, query?.fromStop, query?.toStop, query?.fromLabel, query?.toLabel, router, setPlan, setSelectedOption]);

  if (!query) {
    return null;
  }

  return (
    <section className="space-y-4">
      <PageHeader
        href="/search"
        label="Back to search"
        title={
          <div>
            <p className="text-xs uppercase tracking-[0.16em] text-[var(--muted)]">Journey results</p>
            <h1 className="text-xl font-semibold tracking-tight">{query.toLabel}</h1>
            <p className="text-sm text-[var(--muted)]">From {query.fromLabel}</p>
          </div>
        }
      />
      {loading ? (
        <div className="space-y-2">
          <div className="h-24 animate-pulse rounded-2xl bg-[var(--line)]" />
          <div className="h-24 animate-pulse rounded-2xl bg-[var(--line)]" />
        </div>
      ) : null}
      {error ? <p className="text-sm text-[var(--muted)]">{error}</p> : null}
      {plan && !plan.network_ready ? (
        <EmptyState
          title="Route network is still loading"
          detail="The journey planner needs ingested bus routes. After static ingest finishes, try again."
        />
      ) : null}
      {plan?.network_ready && plan.options.length === 0 ? (
        samePlace({ lat: query.fromLat, lng: query.fromLng }, { lat: query.toLat, lng: query.toLng }) ? (
          <EmptyState title="You're already here" detail="Pick a different destination to plan a bus journey." />
        ) : (
          <EmptyState title="No bus journey found" detail="Try a closer destination, or a stop served by more services." />
        )
      ) : null}
      {plan?.options.length ? (
        <JourneyResults
          options={plan.options}
          selectedId={selectedOption?.id}
          onSelect={(option) => {
            setSelectedOption(option);
            const params = new URLSearchParams(searchParams.toString());
            params.set("option", option.id);
            router.replace(`/journey?${params.toString()}`, { scroll: false });
          }}
        />
      ) : null}
      {selectedOption ? (
        <button
          type="button"
          className="block w-full text-left"
          onClick={() =>
            router.push(
              journeyDetailHref({
                ...query,
                optionId: selectedOption.id,
              }),
            )
          }
        >
          <JourneyDetails option={selectedOption} />
        </button>
      ) : null}
    </section>
  );
}

export default function JourneyPage() {
  return (
    <Suspense fallback={<p className="text-sm text-[var(--muted)]">Journey</p>}>
      <JourneyInner />
    </Suspense>
  );
}
