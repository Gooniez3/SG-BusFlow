import { useCallback, useEffect, useState } from "react";
import { Pressable, RefreshControl, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { Navigation, RefreshCw } from "lucide-react-native";
import { Card, Muted, Screen, ScrollView, Title } from "@/components/Ui";
import { fetchArrivals, fetchNearby } from "@/lib/api";
import { arrivalShort, walkParts } from "@/lib/format";
import { requestUserLocation, type UserLocation } from "@/lib/location";
import { usePalette } from "@/lib/theme";
import type { Stop, StopArrivalsResponse } from "@/lib/types";

export default function NearbyScreen() {
  const palette = usePalette();
  const router = useRouter();
  const [location, setLocation] = useState<UserLocation | null>(null);
  const [stops, setStops] = useState<Stop[]>([]);
  const [arrivals, setArrivals] = useState<Record<string, StopArrivalsResponse>>({});
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [openCode, setOpenCode] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const current = await requestUserLocation();
      setLocation(current);
      const nearby = await fetchNearby(current.lat, current.lng);
      setStops(nearby.stops);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load nearby stops");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!openCode) return;
    fetchArrivals(openCode)
      .then((data) => setArrivals((current) => ({ ...current, [openCode]: data })))
      .catch(() => undefined);
  }, [openCode]);

  return (
    <Screen>
      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={load} />}
      >
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
          <View style={{ flex: 1 }}>
            <Title>Nearby</Title>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 6 }}>
              <Navigation color={palette.muted} size={14} />
              <Muted>{location?.isDemo ? `Demo pin · ${location.label}` : "Using your current location"}</Muted>
            </View>
          </View>
          <Pressable
            onPress={load}
            style={{
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
            <RefreshCw color={palette.muted} size={14} />
            <Text style={{ color: palette.muted, fontSize: 12 }}>Refresh</Text>
          </Pressable>
        </View>

        {error ? (
          <Card>
            <Text style={{ color: palette.ink, fontWeight: "600" }}>Could not load nearby stops</Text>
            <Muted>{error}</Muted>
          </Card>
        ) : null}

        <View style={{ gap: 10, marginTop: 16 }}>
          {stops.map((stop) => {
            const walk = walkParts(stop.distance_m);
            const selected = openCode === stop.code;
            const live = arrivals[stop.code];
            return (
              <Card key={stop.code} onPress={() => setOpenCode(selected ? null : stop.code)}>
                <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 12 }}>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={{ color: palette.ink, fontSize: 16, fontWeight: "600" }}>{stop.name}</Text>
                    <Muted>
                      {stop.code}
                      {stop.road_name ? ` · ${stop.road_name}` : ""}
                    </Muted>
                  </View>
                  {walk ? <Muted>{walk.metres} m</Muted> : null}
                </View>
                {selected ? (
                  <View style={{ marginTop: 12, gap: 8 }}>
                    {live?.services.slice(0, 4).map((service) => {
                      const next = arrivalShort(service.arrivals[0]?.minutes);
                      return (
                        <Pressable
                          key={service.service_no}
                          onPress={() =>
                            router.push({
                              pathname: "/live/[serviceNo]",
                              params: { serviceNo: service.service_no, stop: stop.code },
                            })
                          }
                        >
                          <Text style={{ color: palette.ink, fontWeight: "700" }}>
                            {service.service_no}
                            <Text style={{ color: palette.muted, fontWeight: "500" }}>
                              {"  "}
                              {next === "Here" ? "Here" : next ? `${next} min` : "—"}
                            </Text>
                          </Text>
                        </Pressable>
                      );
                    })}
                    <Pressable
                      onPress={() =>
                        router.push({ pathname: "/stop/[code]", params: { code: stop.code } })
                      }
                    >
                      <Text style={{ color: palette.accent, fontWeight: "600" }}>View stop</Text>
                    </Pressable>
                  </View>
                ) : null}
              </Card>
            );
          })}
        </View>
      </ScrollView>
    </Screen>
  );
}
