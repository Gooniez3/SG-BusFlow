import { useEffect, useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import { useRouter } from "expo-router";
import { Card, Muted, Screen, ScrollView, Title } from "@/components/Ui";
import { searchServices, searchStops } from "@/lib/api";
import { walkParts } from "@/lib/format";
import { requestUserLocation } from "@/lib/location";
import { usePalette } from "@/lib/theme";
import type { ServiceSearchItem, Stop } from "@/lib/types";

export default function SearchScreen() {
  const palette = usePalette();
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [stops, setStops] = useState<Stop[]>([]);
  const [services, setServices] = useState<ServiceSearchItem[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const needle = query.trim();
    if (needle.length < 1) {
      setStops([]);
      setServices([]);
      return;
    }
    let cancelled = false;
    const timer = setTimeout(async () => {
      try {
        const location = await requestUserLocation();
        const [stopResult, serviceResult] = await Promise.all([
          searchStops(needle, location.lat, location.lng),
          searchServices(needle),
        ]);
        if (cancelled) return;
        setStops(stopResult.stops);
        setServices(serviceResult.services);
        setError(null);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Search failed");
      }
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query]);

  return (
    <Screen>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 32 }} keyboardShouldPersistTaps="handled">
        <Title>Search</Title>
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Stop, road, or bus number"
          placeholderTextColor={palette.muted}
          autoCorrect={false}
          style={{
            marginTop: 16,
            height: 48,
            borderRadius: 14,
            borderWidth: 1,
            borderColor: palette.line,
            backgroundColor: palette.card,
            color: palette.ink,
            paddingHorizontal: 14,
            fontSize: 16,
          }}
        />
        {error ? <Muted>{error}</Muted> : null}
        {services.length > 0 ? (
          <View style={{ marginTop: 20 }}>
            <Muted>Services</Muted>
            <View style={{ marginTop: 8, gap: 8 }}>
              {services.map((service) => (
                <Card
                  key={service.service_no}
                  onPress={() =>
                    router.push({ pathname: "/service/[serviceNo]", params: { serviceNo: service.service_no } })
                  }
                >
                  <Text style={{ color: palette.ink, fontWeight: "700", fontSize: 18 }}>{service.service_no}</Text>
                  <Muted>{service.operator ?? "Bus service"}</Muted>
                </Card>
              ))}
            </View>
          </View>
        ) : null}
        {stops.length > 0 ? (
          <View style={{ marginTop: 20 }}>
            <Muted>Stops</Muted>
            <View style={{ marginTop: 8, gap: 8 }}>
              {stops.map((stop) => {
                const walk = walkParts(stop.distance_m);
                return (
                  <Card key={stop.code} onPress={() => router.push({ pathname: "/stop/[code]", params: { code: stop.code } })}>
                    <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                      <View style={{ flex: 1 }}>
                        <Text style={{ color: palette.ink, fontWeight: "600" }}>{stop.name}</Text>
                        <Muted>
                          {stop.code}
                          {stop.road_name ? ` · ${stop.road_name}` : ""}
                        </Muted>
                      </View>
                      {walk ? <Muted>{walk.metres} m</Muted> : null}
                    </View>
                  </Card>
                );
              })}
            </View>
          </View>
        ) : null}
      </ScrollView>
    </Screen>
  );
}
