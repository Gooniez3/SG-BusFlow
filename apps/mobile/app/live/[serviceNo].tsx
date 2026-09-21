import { useEffect, useMemo, useState } from "react";
import { ScrollView, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Heart } from "lucide-react-native";

import { LeafletMap } from "@/components/LeafletMap";
import { LiveBadge } from "@/components/LiveBadge";
import { PageHeader } from "@/components/PageHeader";
import { IconButton } from "@/components/ThemeToggle";
import { Card, Muted, ServiceRow } from "@/components/Ui";
import { busesForService } from "@/lib/buses";
import { fetchStop } from "@/lib/api";
import { rememberService, rememberStop } from "@/lib/ai-context";
import { toggleFavoriteService } from "@/lib/favorites";
import { loadBarColor, loadCopy } from "@/lib/format";
import { useServiceLive } from "@/lib/live";
import { usePalette } from "@/lib/theme";
import type { Stop } from "@/lib/types";

export default function LiveScreen() {
  const { serviceNo, stop: stopCode } = useLocalSearchParams<{ serviceNo: string; stop?: string }>();
  const palette = usePalette();
  const router = useRouter();
  const [stop, setStop] = useState<Stop | null>(null);
  const [error, setError] = useState<string | null>(null);
  const live = useServiceLive(serviceNo?.toUpperCase() ?? null, stopCode ?? null);
  const service = live.data
    ? {
        service_no: live.data.service_no,
        operator: live.data.operator ?? "",
        arrivals: live.data.arrivals,
      }
    : undefined;
  const arrivals = live.data;
  const load = loadCopy(service?.arrivals[0]?.load);
  const next = service?.arrivals[0];

  const buses = useMemo(() => {
    if (!service) return [];
    return busesForService(service, serviceNo?.toUpperCase());
  }, [service, serviceNo]);

  useEffect(() => {
    if (!stopCode) {
      setError("Choose a stop first");
      return;
    }
    let cancelled = false;
    fetchStop(stopCode)
      .then((stopData) => {
        if (!cancelled) {
          setStop(stopData);
          void rememberStop({ code: stopData.code, name: stopData.name });
          if (serviceNo) void rememberService(serviceNo);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Could not load live bus");
      });
    return () => {
      cancelled = true;
    };
  }, [stopCode]);

  const mapCenter = stop ? { lat: stop.latitude, lng: stop.longitude } : null;

  return (
    <View style={{ flex: 1, backgroundColor: palette.bg }}>
      <PageHeader
        onBack={() => (stopCode ? router.replace({ pathname: "/stop/[code]", params: { code: stopCode } }) : router.back())}
        title={
          <View>
            <Text style={{ color: palette.muted, fontSize: 11, letterSpacing: 1.6, fontWeight: "500" }}>LIVE BUS</Text>
            <Text
              style={{
                color: palette.ink,
                fontSize: 32,
                fontWeight: "700",
                fontVariant: ["tabular-nums"],
                letterSpacing: -0.8,
              }}
            >
              {serviceNo?.toUpperCase()}
            </Text>
          </View>
        }
        extra={
          serviceNo ? (
            <IconButton
              onPress={() =>
                void toggleFavoriteService({
                  service_no: serviceNo.toUpperCase(),
                  operator: service?.operator,
                })
              }
            >
              <Heart size={18} color={palette.accent} strokeWidth={2} />
            </IconButton>
          ) : null
        }
      />
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 32, gap: 16 }}>
        {arrivals ? <LiveBadge cachedAt={arrivals.cached_at} stale={arrivals.stale} status={live.status} /> : <LiveBadge status={live.status} />}
        {error ? <Muted>{error}</Muted> : null}
        {live.error ? (
          <Muted>{arrivals ? "Live data delayed. Showing last arrivals." : live.error}</Muted>
        ) : null}
        {service ? (
          <Card>
            <ServiceRow service={service} stopCode={stopCode} linked={false} />
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                marginTop: 8,
                paddingTop: 8,
                borderTopWidth: 1,
                borderTopColor: palette.line,
              }}
            >
              <Muted>
                Next stop <Text style={{ color: palette.ink, fontWeight: "600" }}>{stop?.name}</Text>
              </Muted>
              {load ? <Muted>{load.label}</Muted> : null}
            </View>
            {load ? (
              <View style={{ height: 4, borderRadius: 99, backgroundColor: palette.line, marginTop: 8, overflow: "hidden" }}>
                <View
                  style={{
                    height: 4,
                    width: `${Math.round(load.fill * 100)}%`,
                    borderRadius: 99,
                    backgroundColor: loadBarColor(next?.load),
                  }}
                />
              </View>
            ) : null}
          </Card>
        ) : (
          <Muted>No live arrival for this service right now.</Muted>
        )}
        {mapCenter && stop ? (
          <View
            style={{
              height: 280,
              overflow: "hidden",
              borderRadius: 12,
              borderWidth: 1,
              borderColor: palette.line,
            }}
          >
            <LeafletMap
              lat={mapCenter.lat}
              lng={mapCenter.lng}
              zoom={16}
              stops={[stop]}
              buses={buses}
              selectedCode={stop.code}
              fitBus
              recenterKey={`${stop.code}:${buses[0] ? buses[0].lat.toFixed(3) : "nobus"}`}
            />
            {buses.length === 0 ? (
              <View
                style={{
                  position: "absolute",
                  left: 12,
                  right: 12,
                  bottom: 12,
                  borderRadius: 8,
                  backgroundColor: palette.glass,
                  paddingHorizontal: 12,
                  paddingVertical: 8,
                }}
              >
                <Muted>LTA has not published this bus GPS yet. The numbered badge appears when a location is reported.</Muted>
              </View>
            ) : null}
          </View>
        ) : (
          <Muted>Finding the bus on the map…</Muted>
        )}
      </ScrollView>
    </View>
  );
}
