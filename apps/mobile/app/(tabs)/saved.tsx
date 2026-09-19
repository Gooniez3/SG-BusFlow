import { useCallback, useState } from "react";
import { Text, View } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { Card, Muted, Screen, ScrollView, Title } from "@/components/Ui";
import { readFavoriteServices, readFavorites, type FavoriteService, type FavoriteStop } from "@/lib/favorites";
import { usePalette } from "@/lib/theme";

export default function SavedScreen() {
  const palette = usePalette();
  const router = useRouter();
  const [stops, setStops] = useState<FavoriteStop[]>([]);
  const [services, setServices] = useState<FavoriteService[]>([]);

  useFocusEffect(
    useCallback(() => {
      void Promise.all([readFavorites(), readFavoriteServices()]).then(([nextStops, nextServices]) => {
        setStops(nextStops);
        setServices(nextServices);
      });
    }, []),
  );

  return (
    <Screen>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 32 }}>
        <Title>Saved</Title>
        <Muted>Favorites stay on this device until accounts exist.</Muted>
        <Text style={{ color: palette.muted, marginTop: 20, fontSize: 11, fontWeight: "600", letterSpacing: 1.4 }}>
          STOPS
        </Text>
        <View style={{ marginTop: 8, gap: 8 }}>
          {stops.length === 0 ? (
            <Card>
              <Text style={{ color: palette.ink }}>No saved stops yet.</Text>
            </Card>
          ) : (
            stops.map((stop) => (
              <Card key={stop.code} onPress={() => router.push({ pathname: "/stop/[code]", params: { code: stop.code } })}>
                <Text style={{ color: palette.ink, fontWeight: "600" }}>{stop.name}</Text>
                <Muted>
                  {stop.code}
                  {stop.road_name ? ` · ${stop.road_name}` : ""}
                </Muted>
              </Card>
            ))
          )}
        </View>
        <Text style={{ color: palette.muted, marginTop: 20, fontSize: 11, fontWeight: "600", letterSpacing: 1.4 }}>
          SERVICES
        </Text>
        <View style={{ marginTop: 8, gap: 8 }}>
          {services.length === 0 ? (
            <Card>
              <Text style={{ color: palette.ink }}>No saved services yet.</Text>
            </Card>
          ) : (
            services.map((service) => (
              <Card key={service.service_no} onPress={() => router.push({ pathname: "/service/[serviceNo]", params: { serviceNo: service.service_no } })}>
                <Text style={{ color: palette.ink, fontWeight: "700", fontSize: 18 }}>{service.service_no}</Text>
                <Muted>{service.operator ?? "Bus service"}</Muted>
              </Card>
            ))
          )}
        </View>
      </ScrollView>
    </Screen>
  );
}
