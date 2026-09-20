import { useEffect, useMemo, useState } from "react";
import { ScrollView, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";

import { JourneyItinerary } from "@/components/JourneyItinerary";
import { LeafletMap } from "@/components/LeafletMap";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState, Muted } from "@/components/Ui";
import { fetchJourneys } from "@/lib/api";
import { journeyPoints } from "@/lib/journey";
import { usePalette } from "@/lib/theme";
import type { JourneyOption, JourneyPlanResponse, Stop } from "@/lib/types";

export default function PlanDetailScreen() {
  const palette = usePalette();
  const router = useRouter();
  const params = useLocalSearchParams<{
    to?: string;
    to_label?: string;
    to_lat?: string;
    to_lng?: string;
    from_lat?: string;
    from_lng?: string;
    from_label?: string;
    from_stop?: string;
    option?: string;
  }>();
  const [plan, setPlan] = useState<JourneyPlanResponse | null>(null);
  const [option, setOption] = useState<JourneyOption | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fromLat = Number(params.from_lat);
  const fromLng = Number(params.from_lng);
  const toLat = Number(params.to_lat);
  const toLng = Number(params.to_lng);

  useEffect(() => {
    if (![fromLat, fromLng, toLat, toLng].every((value) => Number.isFinite(value))) return;
    let cancelled = false;
    fetchJourneys({
      fromLat,
      fromLng,
      toLat,
      toLng,
      fromStop: params.from_stop,
      toStop: params.to,
      fromLabel: params.from_label || "Current location",
      toLabel: params.to_label || "Destination",
    })
      .then((result) => {
        if (cancelled) return;
        setPlan(result);
        setOption(result.options.find((item) => item.id === params.option) ?? result.options[0] ?? null);
        setError(null);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Could not load this trip");
      });
    return () => {
      cancelled = true;
    };
  }, [fromLat, fromLng, toLat, toLng, params.from_stop, params.to, params.from_label, params.to_label, params.option]);

  const path = useMemo(() => {
    if (!plan || !option) return undefined;
    return journeyPoints(option, { lat: plan.from_lat, lng: plan.from_lng }, { lat: plan.to_lat, lng: plan.to_lng });
  }, [plan, option]);
  const mapStops = useMemo(() => {
    if (!option) return [];
    const collected: Stop[] = [];
    for (const leg of option.legs) {
      if (leg.from_stop) collected.push(leg.from_stop);
      for (const stop of leg.via_stops ?? []) collected.push(stop);
      if (leg.to_stop) collected.push(leg.to_stop);
    }
    return collected.filter((stop, index, list) => list.findIndex((item) => item.code === stop.code) === index);
  }, [option]);

  return (
    <View style={{ flex: 1, backgroundColor: palette.bg }}>
      <PageHeader
        onBack={() => router.back()}
        title={
          <View>
            <Text style={{ color: palette.muted, fontSize: 11, letterSpacing: 1.6, fontWeight: "500" }}>TRIP</Text>
            <Text style={{ color: palette.ink, fontSize: 20, fontWeight: "600" }}>{params.to_label ?? "Destination"}</Text>
          </View>
        }
      />
      {path ? (
        <View style={{ height: 180 }}>
          <LeafletMap
            lat={plan?.from_lat ?? fromLat}
            lng={plan?.from_lng ?? fromLng}
            stops={mapStops}
            path={path}
            fitBus={false}
            showUser
            user={plan ? { lat: plan.from_lat, lng: plan.from_lng } : null}
            recenterKey={option?.id}
          />
        </View>
      ) : null}
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 32, gap: 12 }}>
        {error ? <Muted>{error}</Muted> : null}
        {!option && !error ? <View style={{ height: 180, borderRadius: 16, backgroundColor: palette.line }} /> : null}
        {plan && !plan.network_ready ? (
          <EmptyState title="Route network is still loading" detail="Try again after static ingest finishes." />
        ) : null}
        {option ? (
          <JourneyItinerary
            option={option}
            fromLabel={params.from_label || "Current location"}
            toLabel={params.to_label || "Destination"}
          />
        ) : null}
      </ScrollView>
    </View>
  );
}
