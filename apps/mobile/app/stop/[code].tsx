import { useEffect, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Heart } from "lucide-react-native";
import { Card, Muted, Screen, ScrollView, ServiceRow } from "@/components/Ui";
import { fetchArrivals, fetchStop } from "@/lib/api";
import { isFavorite, toggleFavorite } from "@/lib/favorites";
import { relativeUpdated, walkParts } from "@/lib/format";
import { requestUserLocation } from "@/lib/location";
import { usePalette } from "@/lib/theme";
import type { Stop, StopArrivalsResponse } from "@/lib/types";

export default function StopScreen() {
  const { code } = useLocalSearchParams<{ code: string }>();
  const palette = usePalette();
  const router = useRouter();
  const [stop, setStop] = useState<Stop | null>(null);
  const [arrivals, setArrivals] = useState<StopArrivalsResponse | null>(null);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!code) return;
    let cancelled = false;
    void (async () => {
      const location = await requestUserLocation();
      try {
        const [stopData, arrivalData, favorite] = await Promise.all([
          fetchStop(code, location.lat, location.lng),
          fetchArrivals(code),
          isFavorite(code),
        ]);
        if (cancelled) return;
        setStop(stopData);
        setArrivals(arrivalData);
        setSaved(favorite);
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

  return (
    <Screen>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 32 }}>
        {error ? <Muted>{error}</Muted> : null}
        {stop ? (
          <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 12 }}>
            <View style={{ flex: 1 }}>
              <Text style={{ color: palette.ink, fontSize: 24, fontWeight: "700" }}>{stop.name}</Text>
              <Muted>{stop.road_name}</Muted>
            </View>
            <Pressable
              onPress={async () => {
                const next = await toggleFavorite({
                  code: stop.code,
                  name: stop.name,
                  road_name: stop.road_name,
                });
                setSaved(next.some((item) => item.code === stop.code));
              }}
              style={{
                width: 40,
                height: 40,
                borderRadius: 20,
                borderWidth: 1,
                borderColor: palette.line,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Heart color={saved ? palette.accent : palette.muted} fill={saved ? palette.accent : "none"} size={18} />
            </Pressable>
          </View>
        ) : null}
        {stop ? (
          <Card>
            <View style={{ flexDirection: "row" }}>
              <View style={{ flex: 1 }}>
                <Text style={{ color: palette.muted, fontSize: 10, letterSpacing: 1.4 }}>STOP</Text>
                <Text style={{ color: palette.ink, marginTop: 4, fontVariant: ["tabular-nums"], fontWeight: "600" }}>
                  {stop.code}
                </Text>
              </View>
              {walk ? (
                <>
                  <View style={{ flex: 1, borderLeftWidth: 1, borderLeftColor: palette.line, paddingLeft: 12 }}>
                    <Text style={{ color: palette.muted, fontSize: 10, letterSpacing: 1.4 }}>DISTANCE</Text>
                    <Text style={{ color: palette.ink, marginTop: 4, fontWeight: "600" }}>{walk.metres} m</Text>
                  </View>
                  <View style={{ flex: 1, borderLeftWidth: 1, borderLeftColor: palette.line, paddingLeft: 12 }}>
                    <Text style={{ color: palette.muted, fontSize: 10, letterSpacing: 1.4 }}>WALK</Text>
                    <Text style={{ color: palette.ink, marginTop: 4, fontWeight: "600" }}>~{walk.minutes} min</Text>
                  </View>
                </>
              ) : null}
            </View>
          </Card>
        ) : null}
        <Card>
          <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
            <Text style={{ color: palette.muted, fontSize: 11, letterSpacing: 1.4, fontWeight: "600" }}>
              LIVE ARRIVALS
            </Text>
            <Muted>{arrivals ? `Updated ${relativeUpdated(arrivals.cached_at) ?? ""}` : ""}</Muted>
          </View>
          {arrivals?.services.map((service) => (
            <ServiceRow
              key={service.service_no}
              service={service}
              onPress={() =>
                router.push({
                  pathname: "/live/[serviceNo]",
                  params: { serviceNo: service.service_no, stop: stop?.code },
                })
              }
            />
          ))}
        </Card>
      </ScrollView>
    </Screen>
  );
}
