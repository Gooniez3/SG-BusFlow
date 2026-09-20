import { useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ChevronRight, Footprints } from "lucide-react-native";

import { LeafletMap } from "@/components/LeafletMap";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState, Muted } from "@/components/Ui";
import { fetchJourneys } from "@/lib/api";
import { journeyPoints, journeySummary, nextBusMinutes, transferLabel } from "@/lib/journey";
import { usePalette } from "@/lib/theme";
import type { JourneyOption, JourneyPlanResponse, Stop } from "@/lib/types";

export default function PlanScreen() {
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
  }>();
  const [plan, setPlan] = useState<JourneyPlanResponse | null>(null);
  const [selected, setSelected] = useState<JourneyOption | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fromLat = Number(params.from_lat);
  const fromLng = Number(params.from_lng);
  const toLat = Number(params.to_lat);
  const toLng = Number(params.to_lng);

  useEffect(() => {
    if (![fromLat, fromLng, toLat, toLng].every((value) => Number.isFinite(value))) return;
    let cancelled = false;
    setLoading(true);
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
        setSelected(result.options[0] ?? null);
        setError(null);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Could not plan this journey");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [fromLat, fromLng, toLat, toLng, params.from_stop, params.to, params.from_label, params.to_label]);

  const path = useMemo(() => {
    if (!plan || !selected) return undefined;
    return journeyPoints(selected, { lat: plan.from_lat, lng: plan.from_lng }, { lat: plan.to_lat, lng: plan.to_lng });
  }, [plan, selected]);
  const mapStops = useMemo(() => {
    if (!selected) return [];
    const collected: Stop[] = [];
    for (const leg of selected.legs) {
      if (leg.from_stop) collected.push(leg.from_stop);
      if (leg.to_stop) collected.push(leg.to_stop);
    }
    return collected.filter((stop, index, list) => list.findIndex((item) => item.code === stop.code) === index);
  }, [selected]);

  return (
    <View style={{ flex: 1, backgroundColor: palette.bg }}>
      <PageHeader
        onBack={() => router.back()}
        title={
          <View>
            <Text style={{ color: palette.muted, fontSize: 11, letterSpacing: 1.6, fontWeight: "500" }}>
              JOURNEY RESULTS
            </Text>
            <Text style={{ color: palette.ink, fontSize: 20, fontWeight: "600" }}>
              {params.to_label ?? "Destination"}
            </Text>
          </View>
        }
      />
      {path ? (
        <View style={{ height: 220 }}>
          <LeafletMap
            lat={plan?.from_lat ?? fromLat}
            lng={plan?.from_lng ?? fromLng}
            stops={mapStops}
            path={path}
            fitBus={false}
            showUser
            user={plan ? { lat: plan.from_lat, lng: plan.from_lng } : null}
            recenterKey={selected?.id}
          />
        </View>
      ) : null}
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 32, gap: 12 }}>
        {loading ? <View style={{ height: 96, borderRadius: 16, backgroundColor: palette.line }} /> : null}
        {error ? <Muted>{error}</Muted> : null}
        {plan && !plan.network_ready ? (
          <EmptyState
            title="Route network is still loading"
            detail="The journey planner needs ingested bus routes. After static ingest finishes, try again."
          />
        ) : null}
        {plan?.network_ready && plan.options.length === 0 ? (
          <EmptyState title="No bus journey found" detail="Try a closer destination, or a stop served by more services." />
        ) : null}
        {plan?.options.map((option) => {
          const next = nextBusMinutes(option);
          const active = selected?.id === option.id;
          return (
            <Pressable
              key={option.id}
              onPress={() => setSelected(option)}
              style={{
                borderRadius: 16,
                borderWidth: 1,
                borderColor: active ? palette.accent : palette.line,
                backgroundColor: palette.card,
                padding: 12,
              }}
            >
              <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                <Text style={{ color: palette.ink, fontSize: 18, fontWeight: "600" }}>
                  {option.duration_min}
                  <Text style={{ color: palette.muted, fontSize: 14, fontWeight: "500" }}> min</Text>
                </Text>
                <Muted>{transferLabel(option.transfers)}</Muted>
              </View>
              <Text style={{ color: palette.ink, fontSize: 14, marginTop: 4 }}>{journeySummary(option)}</Text>
              {next != null ? <Muted>Next bus: {next <= 0 ? "Arriving" : `${next} min`}</Muted> : null}
            </Pressable>
          );
        })}
        {selected ? (
          <Pressable
            onPress={() =>
              router.push({
                pathname: "/plan-detail",
                params: {
                  ...params,
                  option: selected.id,
                },
              })
            }
            style={{
              borderRadius: 16,
              borderWidth: 1,
              borderColor: palette.line,
              backgroundColor: palette.card,
              overflow: "hidden",
            }}
          >
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "flex-end",
                paddingHorizontal: 16,
                paddingVertical: 12,
                borderBottomWidth: 1,
                borderBottomColor: palette.line,
              }}
            >
              <View>
                <Text style={{ color: palette.muted, fontSize: 10, letterSpacing: 1.6, fontWeight: "500" }}>
                  JOURNEY DETAILS
                </Text>
                <Text style={{ color: palette.ink, fontSize: 24, fontWeight: "600", marginTop: 2 }}>
                  {selected.duration_min}
                  <Text style={{ color: palette.muted, fontSize: 14, fontWeight: "500" }}> min</Text>
                </Text>
              </View>
              <View
                style={{
                  backgroundColor: palette.accentSoft,
                  borderRadius: 999,
                  paddingHorizontal: 10,
                  paddingVertical: 4,
                  marginBottom: 2,
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 2,
                }}
              >
                <Text style={{ color: palette.accent, fontSize: 11, fontWeight: "600" }}>
                  {transferLabel(selected.transfers)}
                </Text>
                <ChevronRight size={12} color={palette.accent} strokeWidth={2.4} />
              </View>
            </View>
            <View style={{ paddingHorizontal: 16, paddingTop: 16 }}>
              {selected.legs.map((leg, index) => {
                const last = index === selected.legs.length - 1;
                const bus = leg.kind === "bus";
                return (
                  <View key={`${selected.id}-${index}`} style={{ flexDirection: "row", gap: 12 }}>
                    <View style={{ width: 22, alignItems: "center" }}>
                      <View
                        style={{
                          width: 22,
                          height: 22,
                          borderRadius: 11,
                          alignItems: "center",
                          justifyContent: "center",
                          backgroundColor: bus ? palette.accent : palette.bg,
                          borderWidth: bus ? 0 : 1,
                          borderColor: palette.line,
                        }}
                      >
                        {bus ? (
                          <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: palette.onAccent }} />
                        ) : (
                          <Footprints size={11} color={palette.muted} strokeWidth={2.2} />
                        )}
                      </View>
                      {last ? null : (
                        <View style={{ width: 1, flex: 1, minHeight: 18, backgroundColor: palette.line }} />
                      )}
                    </View>
                    <View style={{ flex: 1, paddingBottom: last ? 16 : 20 }}>
                      {bus ? (
                        <View>
                          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                            <View
                              style={{
                                backgroundColor: palette.accent,
                                borderRadius: 8,
                                minWidth: 44,
                                height: 28,
                                paddingHorizontal: 8,
                                alignItems: "center",
                                justifyContent: "center",
                              }}
                            >
                              <Text style={{ color: palette.onAccent, fontFamily: "monospace", fontWeight: "700" }}>
                                {leg.service_no}
                              </Text>
                            </View>
                            <Text
                              style={{
                                color: leg.live_minutes != null ? palette.live : palette.muted,
                                fontSize: 12,
                                fontWeight: leg.live_minutes != null ? "600" : "500",
                                fontVariant: ["tabular-nums"],
                              }}
                            >
                              {leg.live_minutes != null
                                ? leg.live_minutes <= 0
                                  ? "Arriving"
                                  : `${leg.live_minutes} min`
                                : `${leg.duration_min} min`}
                            </Text>
                          </View>
                          {leg.from_stop ? (
                            <Text style={{ color: palette.ink, marginTop: 8, fontSize: 14 }}>
                              <Text style={{ color: palette.muted, fontSize: 10, letterSpacing: 1.2, fontWeight: "500" }}>
                                BOARD{"  "}
                              </Text>
                              {leg.from_stop.name}
                            </Text>
                          ) : null}
                          {leg.to_stop ? (
                            <Text style={{ color: palette.ink, marginTop: 4, fontSize: 14 }}>
                              <Text style={{ color: palette.muted, fontSize: 10, letterSpacing: 1.2, fontWeight: "500" }}>
                                ALIGHT{"  "}
                              </Text>
                              {leg.to_stop.name}
                            </Text>
                          ) : null}
                        </View>
                      ) : (
                        <View>
                          <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                            <Text style={{ color: palette.ink, fontWeight: "500" }}>Walk</Text>
                            <Muted>{leg.duration_min} min</Muted>
                          </View>
                          {leg.to_label ? <Muted>to {leg.to_label}</Muted> : null}
                        </View>
                      )}
                    </View>
                  </View>
                );
              })}
            </View>
          </Pressable>
        ) : null}
      </ScrollView>
    </View>
  );
}
