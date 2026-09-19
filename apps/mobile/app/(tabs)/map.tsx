import { useCallback, useEffect, useState } from "react";
import { Platform, Pressable, Text, View } from "react-native";
import { useRouter } from "expo-router";
import MapView, { Marker } from "react-native-maps";
import { Screen } from "@/components/Ui";
import { fetchNearby } from "@/lib/api";
import { requestUserLocation, type UserLocation } from "@/lib/location";
import { usePalette } from "@/lib/theme";
import type { Stop } from "@/lib/types";

export default function MapScreen() {
  const palette = usePalette();
  const router = useRouter();
  const [location, setLocation] = useState<UserLocation | null>(null);
  const [stops, setStops] = useState<Stop[]>([]);
  const [selected, setSelected] = useState<Stop | null>(null);

  const load = useCallback(async () => {
    const current = await requestUserLocation();
    setLocation(current);
    try {
      const nearby = await fetchNearby(current.lat, current.lng);
      setStops(nearby.stops);
    } catch {
      setStops([]);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (Platform.OS === "web") {
    return (
      <Screen>
        <View style={{ padding: 16 }}>
          <Text style={{ color: palette.ink, fontWeight: "600" }}>Map is available in Expo Go on your phone.</Text>
        </View>
      </Screen>
    );
  }

  if (!location) {
    return <Screen />;
  }

  return (
    <View style={{ flex: 1, backgroundColor: palette.bg }}>
      <MapView
        style={{ flex: 1 }}
        initialRegion={{
          latitude: location.lat,
          longitude: location.lng,
          latitudeDelta: 0.012,
          longitudeDelta: 0.012,
        }}
        showsUserLocation={!location.isDemo}
        onPress={() => setSelected(null)}
      >
        {stops.map((stop) => (
          <Marker
            key={stop.code}
            coordinate={{ latitude: stop.latitude, longitude: stop.longitude }}
            pinColor={selected?.code === stop.code ? palette.accent : undefined}
            onPress={(event) => {
              event.stopPropagation();
              setSelected(stop);
            }}
          />
        ))}
      </MapView>
      {selected ? (
        <Pressable
          onPress={() => router.push({ pathname: "/stop/[code]", params: { code: selected.code } })}
          style={{
            position: "absolute",
            left: 16,
            right: 16,
            bottom: 24,
            backgroundColor: palette.card,
            borderColor: palette.line,
            borderWidth: 1,
            borderRadius: 16,
            padding: 14,
          }}
        >
          <Text style={{ color: palette.ink, fontWeight: "700", fontSize: 16 }}>{selected.name}</Text>
          <Text style={{ color: palette.muted, marginTop: 4 }}>
            {selected.code}
            {selected.road_name ? ` · ${selected.road_name}` : ""}
          </Text>
          <Text style={{ color: palette.accent, marginTop: 10, fontWeight: "600" }}>View stop</Text>
        </Pressable>
      ) : null}
    </View>
  );
}
