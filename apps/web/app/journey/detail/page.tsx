"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { EmptyState } from "@/components/EmptyState";
import { JourneyItinerary } from "@/components/JourneyItinerary";
import { PageHeader } from "@/components/PageHeader";
import { fetchJourneys } from "@/lib/transport";
import { journeyHref, parseJourneySearch } from "@/lib/journey";
import { useJourneySession } from "@/lib/journey-session";
import type { JourneyOption, JourneyPlanResponse } from "@/lib/types";

function DetailInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const query = parseJourneySearch(searchParams);
  const { plan, selectedOption, setPlan, setSelectedOption } = useJourneySession();
  const [localPlan, setLocalPlan] = useState<JourneyPlanResponse | null>(plan);
  const [loading, setLoading] = useState(!plan);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!query) {
      router.replace("/search");
      return;
    }
    if (plan?.options.length) {
      const match = plan.options.find((item) => item.id === query.optionId) ?? selectedOption ?? plan.options[0];
      if (match) setSelectedOption(match);
      setLocalPlan(plan);
      setLoading(false);
    }
    let cancelled = false;
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
        const match = result.options.find((item) => item.id === query.optionId) ?? result.options[0] ?? null;
        setSelectedOption(match);
        setError(null);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Could not load this trip");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [query?.fromLat, query?.fromLng, query?.toLat, query?.toLng, query?.fromStop, query?.toStop, query?.optionId, router, setPlan, setSelectedOption]);

  if (!query) return null;
  const option: JourneyOption | null =
    selectedOption ?? localPlan?.options.find((item) => item.id === query.optionId) ?? localPlan?.options[0] ?? null;
  const back = journeyHref(query);

  return (
    <section className="space-y-4">
      <PageHeader
        href={back}
        label="Back to results"
        title={
          <div>
            <p className="text-xs uppercase tracking-[0.16em] text-[var(--muted)]">Trip</p>
            <h1 className="text-xl font-semibold tracking-tight">{query.toLabel}</h1>
            <p className="text-sm text-[var(--muted)]">From {query.fromLabel}</p>
          </div>
        }
      />
      {loading && !option ? <div className="h-48 animate-pulse rounded-2xl bg-[var(--line)]" /> : null}
      {error ? <p className="text-sm text-[var(--muted)]">{error}</p> : null}
      {!loading && !option ? <EmptyState title="Trip not found" detail="Go back and pick a journey option." /> : null}
      {option ? <JourneyItinerary option={option} fromLabel={query.fromLabel} toLabel={query.toLabel} /> : null}
    </section>
  );
}

export default function JourneyDetailPage() {
  return (
    <Suspense fallback={<p className="text-sm text-[var(--muted)]">Trip</p>}>
      <DetailInner />
    </Suspense>
  );
}
