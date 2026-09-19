import { useEffect, useMemo, useState } from "react";
import { Linking, Pressable, ScrollView, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Heart, Navigation } from "lucide-react-native";

import { LiveBadge } from "@/components/LiveBadge";
import { LeafletMap } from "@/components/LeafletMap";
import { PageHeader } from "@/components/PageHeader";
import { IconButton } from "@/components/ThemeToggle";
import { Card, Muted, ServiceRow } from "@/components/Ui";
import { fetchNearby, fetchStop } from "@/lib/api";
import { busesFromServices, uniqueBuses } from "@/lib/buses";
import { isFavorite, toggleFavorite } from "@/lib/favorites";
import { walkParts } from "@/lib/format";
import { requestUserLocation } from "@/lib/location";
import { useStopLive } from "@/lib/live";
import { usePalette } from "@/lib/theme";
import type { Stop } from "@/lib/types";

export default function StopScreen() {
  const { code } = useLocalSearchParams<{ code: string }>();
  const palette = usePalette();
  const router = useRouter();
  const [stop, setStop] = useState<Stop | null>(null);
  const [nearbyStops, setNearbyStops] = useState<Stop[]>([]);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const live = useStopLive(code ?? null);
  const arrivals = live.data;
  const buses = useMemo(
    () => (arrivals ? uniqueBuses(busesFromServices(arrivals.services)) : []),
    [arrivals],
  );

  useEffect(() => {
    if (!code) return;
    let cancelled = false;
    void (async () => {
      const location = await requestUserLocation();
      try {
        const [stopData, favorite, nearby] = await Promise.all([
          fetchStop(code, location.lat, location.lng),
          isFavorite(code),
          fetchNearby(location.lat, location.lng).catch(() => ({ stops: [] as Stop[] })),
        ]);
        if (cancelled) return;
        setStop(stopData);
        setSaved(favorite);
        const others = nearby.stops.filter((item) => item.code !== stopData.code);
        setNearbyStops([stopData, ...others].slice(0, 12));
        setError(null);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Could not load stop");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [code]);

  const walk = walkParts(stop?.distance_m);
  const mapStops = nearbyStops.length > 0 ? nearbyStops : stop ? [stop] : [];

  return (
    <View style={{ flex: 1, backgroundColor: palette.bg }}>
      <PageHeader
        onBack={() => router.replace("/")}
        title={
          <Text style={{ color: palette.ink, fontSize: 20, fontWeight: "600", letterSpacing: -0.4 }}>
            {stop?.name ?? "Stop"}
          </Text>
        }
        extra={
          <>
            {stop?.latitude && stop.longitude ? (
              <IconButton
                onPress={() =>
                  void Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${stop.latitude},${stop.longitude}`)
                }
              >
                <Navigation size={16} color={palette.muted} strokeWidth={2} />
              </IconButton>
            ) : null}
            {stop ? (
              <IconButton
                onPress={async () => {
                  const next = await toggleFavorite({
                    code: stop.code,
                    name: stop.name,
                    road_name: stop.road_name,
                  });
                  setSaved(next.some((item) => item.code === stop.code));
                }}
              >
                <Heart
                  size={18}
                  color={saved ? palette.accent : palette.muted}
                  fill={saved ? palette.accent : "transparent"}
                  strokeWidth={2}
                />
              </IconButton>
            ) : null}
          </>
        }
      />
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 32, gap: 16 }}>
        {error ? <Muted>{error}</Muted> : null}

        {stop ? (
          <View
            style={{
              borderRadius: 16,
              borderWidth: 1,
              borderColor: palette.line,
              backgroundColor: palette.card,
              paddingHorizontal: 12,
              paddingVertical: 10,
            }}
          >
            {stop.road_name ? (
              <Text style={{ color: palette.muted, fontSize: 14 }} numberOfLines={1}>
                {stop.road_name}
              </Text>
            ) : null}
            <View style={{ flexDirection: "row", marginTop: stop.road_name ? 8 : 0 }}>
              <View style={{ flex: 1 }}>
                <Text style={{ color: palette.muted, fontSize: 10, fontWeight: "500", letterSpacing: 1.6 }}>STOP</Text>
                <Text
                  style={{
                    color: palette.ink,
                    marginTop: 2,
                    fontFamily: "Menlo",
                    fontSize: 15,
                    fontWeight: "500",
                    fontVariant: ["tabular-nums"],
                  }}
                >
                  {stop.code}
                </Text>
              </View>
              {walk ? (
                <>
                  <View style={{ flex: 1, borderLeftWidth: 1, borderLeftColor: palette.line, paddingLeft: 12 }}>
                    <Text style={{ color: palette.muted, fontSize: 10, fontWeight: "500", letterSpacing: 1.6 }}>DISTANCE</Text>
                    <Text style={{ color: palette.ink, marginTop: 2, fontSize: 15, fontWeight: "600" }}>
                      {walk.metres}
                      <Text style={{ color: palette.muted, fontSize: 13, fontWeight: "500" }}> m</Text>
                    </Text>
                  </View>
                  <View style={{ flex: 1, borderLeftWidth: 1, borderLeftColor: palette.line, paddingLeft: 12 }}>
                    <Text style={{ color: palette.muted, fontSize: 10, fontWeight: "500", letterSpacing: 1.6 }}>WALK</Text>
                    <Text style={{ color: palette.ink, marginTop: 2, fontSize: 15, fontWeight: "600" }}>
                      ~{walk.minutes}
                      <Text style={{ color: palette.muted, fontSize: 13, fontWeight: "500" }}> min</Text>
                    </Text>
                  </View>
                </>
              ) : null}
            </View>
          </View>
        ) : null}

        <Card padded>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
            <Text style={{ color: palette.muted, fontSize: 11, letterSpacing: 1.6, fontWeight: "500" }}>LIVE ARRIVALS</Text>
            {arrivals ? <LiveBadge cachedAt={arrivals.cached_at} stale={arrivals.stale} /> : null}
          </View>
          {arrivals && arrivals.services.length > 0 ? (
            <View style={{ overflow: "hidden", borderRadius: 8, borderWidth: 1, borderColor: palette.line, backgroundColor: palette.bg }}>
              {arrivals.services.map((service) => (
                <ServiceRow key={service.service_no} service={service} stopCode={stop?.code} />
              ))}
            </View>
          ) : null}
          {arrivals && arrivals.services.length === 0 ? (
            <Muted>No services reported right now.</Muted>
          ) : null}
        </Card>

        {stop ? (
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
              lat={stop.latitude}
              lng={stop.longitude}
              zoom={17}
              stops={mapStops}
              buses={buses}
              selectedCode={stop.code}
              fitBus={buses.length > 0}
              recenterKey={`${stop.code}:${buses.map((bus) => bus.serviceNo).join(",")}`}
              onSelectStop={(nextCode) => {
                if (nextCode !== stop.code) {
                  router.push({ pathname: "/stop/[code]", params: { code: nextCode } });
                }
              }}
              onSelectBus={(serviceNo) => {
                router.push({ pathname: "/live/[serviceNo]", params: { serviceNo, stop: stop.code } });
              }}
            />
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}
