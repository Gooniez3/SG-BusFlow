import { useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Heart } from "lucide-react-native";

import { LeafletMap } from "@/components/LeafletMap";
import { LiveBadge } from "@/components/LiveBadge";
import { PageHeader } from "@/components/PageHeader";
import { Card, Muted, ServiceRow } from "@/components/Ui";
import { fetchArrivals, fetchNearby, fetchService } from "@/lib/api";
import { busesForService } from "@/lib/buses";
import { toggleFavoriteService } from "@/lib/favorites";
import { requestUserLocation } from "@/lib/location";
import { useServiceLive } from "@/lib/live";
import { usePalette } from "@/lib/theme";
import type { ServiceDetailResponse, Stop } from "@/lib/types";

export default function ServiceScreen() {
  const { serviceNo } = useLocalSearchParams<{ serviceNo: string }>();
  const needle = serviceNo?.toUpperCase() ?? "";
  const palette = usePalette();
  const router = useRouter();
  const [service, setService] = useState<ServiceDetailResponse | null>(null);
  const [trackStop, setTrackStop] = useState<Stop | null>(null);
  const [error, setError] = useState<string | null>(null);
  const live = useServiceLive(needle || null, trackStop?.code ?? null);
  const arrivals = live.data
    ? {
        service_no: live.data.service_no,
        operator: live.data.operator ?? "",
        arrivals: live.data.arrivals,
      }
    : undefined;
  const buses = useMemo(() => (arrivals ? busesForService(arrivals, needle) : []), [arrivals, needle]);

  useEffect(() => {
    if (!needle) return;
    fetchService(needle)
      .then(setService)
      .catch((err: unknown) => setError(err instanceof Error ? err.message : "Could not load service"));
  }, [needle]);

  useEffect(() => {
    if (!needle) return;
    let cancelled = false;
    void (async () => {
      try {
        const location = await requestUserLocation();
        const nearby = await fetchNearby(location.lat, location.lng);
        const candidates = nearby.stops.slice(0, 8);
        const scans = await Promise.all(
          candidates.map(async (stop) => {
            try {
              const payload = await fetchArrivals(stop.code);
              const served = payload.services.some((item) => item.service_no.toUpperCase() === needle);
              return served ? stop : null;
            } catch {
              return null;
            }
          }),
        );
        if (cancelled) return;
        setTrackStop(scans.find((stop) => stop != null) ?? candidates[0] ?? null);
      } catch {
        if (!cancelled) setTrackStop(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [needle]);

  const primary = service?.directions[0];

  return (
    <View style={{ flex: 1, backgroundColor: palette.bg }}>
      <PageHeader
        onBack={() => router.back()}
        title={
          <View>
            <Text style={{ color: palette.muted, fontSize: 11, letterSpacing: 1.6, fontWeight: "500" }}>BUS SERVICE</Text>
            <Text style={{ color: palette.ink, fontSize: 32, fontWeight: "700", letterSpacing: -0.8 }}>
              {needle}
            </Text>
          </View>
        }
      />
      <ScrollView contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: 32 }}>
        {error ? <Muted>{error}</Muted> : null}
        {primary ? (
          <Card>
            <Text style={{ color: palette.ink, fontWeight: "600" }}>{primary.operator}</Text>
            <Muted>{primary.loop_desc ?? `Direction ${primary.direction}`}</Muted>
            <Pressable
              onPress={() =>
                void toggleFavoriteService({
                  service_no: needle,
                  operator: primary.operator,
                })
              }
              style={{
                marginTop: 12,
                alignSelf: "flex-start",
                flexDirection: "row",
                alignItems: "center",
                gap: 6,
                borderWidth: 1,
                borderColor: palette.line,
                borderRadius: 999,
                paddingHorizontal: 12,
                height: 36,
              }}
            >
              <Heart color={palette.accent} size={14} strokeWidth={2} />
              <Text style={{ color: palette.ink }}>Save service</Text>
            </Pressable>
          </Card>
        ) : null}
        <Card>
          {live.data ? <LiveBadge cachedAt={live.data.cached_at} stale={live.data.stale} status={live.status} /> : <LiveBadge status={live.status} />}
          {arrivals && trackStop ? (
            <>
              <ServiceRow service={arrivals} stopCode={trackStop.code} />
              <Pressable
                onPress={() => router.push({ pathname: "/stop/[code]", params: { code: trackStop.code } })}
                style={{ paddingTop: 8 }}
              >
                <Muted>At {trackStop.name}</Muted>
              </Pressable>
            </>
          ) : (
            <Muted>No live arrival for {needle} at nearby stops right now.</Muted>
          )}
        </Card>
        {trackStop ? (
          <View
            style={{
              height: 240,
              overflow: "hidden",
              borderRadius: 12,
              borderWidth: 1,
              borderColor: palette.line,
            }}
          >
            <LeafletMap
              lat={trackStop.latitude}
              lng={trackStop.longitude}
              zoom={16}
              stops={[trackStop]}
              buses={buses}
              selectedCode={trackStop.code}
              fitBus={buses.length > 0}
              recenterKey={`${trackStop.code}:${buses[0] ? buses[0].lat.toFixed(3) : "nobus"}`}
            />
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}
