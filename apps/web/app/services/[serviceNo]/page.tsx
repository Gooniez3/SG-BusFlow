"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { ErrorState } from "@/components/ErrorState";
import { PageHeader } from "@/components/PageHeader";
import { ServiceFavoriteButton } from "@/components/ServiceFavoriteButton";
import { useWorkspace } from "@/lib/workspace";

export default function ServicePage() {
  const params = useParams<{ serviceNo: string }>();
  const serviceNo = params.serviceNo.toUpperCase();
  const router = useRouter();
  const { selectedCode, stops, stopsLoading } = useWorkspace();
  const trackStop = selectedCode ?? stops[0]?.code ?? null;

  useEffect(() => {
    if (!trackStop) return;
    router.replace(`/live/${encodeURIComponent(serviceNo)}?stop=${encodeURIComponent(trackStop)}`);
  }, [router, serviceNo, trackStop]);

  if (trackStop || stopsLoading) {
    return <div className="h-24 animate-pulse rounded-xl bg-[var(--line)]" />;
  }

  return (
    <section className="flex min-h-0 flex-1 flex-col gap-3">
      <PageHeader
        href="/"
        label="Back to nearby"
        title={
          <div>
            <p className="text-xs uppercase tracking-[0.16em] text-[var(--muted)]">Live bus</p>
            <h1 className="font-mono text-3xl font-semibold">{serviceNo}</h1>
          </div>
        }
        extra={<ServiceFavoriteButton iconOnly serviceNo={serviceNo} />}
      />
      <ErrorState
        title="Choose a stop to track this bus"
        detail="Open a nearby stop, then tap the service. Live arrivals do not need the bus catalogue cache."
      />
    </section>
  );
}
