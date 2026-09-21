import { useCallback, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { BusFront, Heart, RefreshCw } from "lucide-react-native";

import { Card, EmptyState, Mono, Muted, Screen, SectionLabel, Title } from "@/components/Ui";
import { StopPreview } from "@/components/StopPreview";
import { ProfileButton, ThemeToggle } from "@/components/ThemeToggle";
import { fetchStop } from "@/lib/api";
import {
  readFavoriteServices,
  readFavorites,
  toggleFavorite,
  toggleFavoriteService,
  type FavoriteService,
} from "@/lib/favorites";
import { requestUserLocation, type UserLocation } from "@/lib/location";
import { useStopLive } from "@/lib/live";
import { usePalette } from "@/lib/theme";
import type { Stop } from "@/lib/types";

export default function SavedScreen() {
  const palette = usePalette();
  const router = useRouter();
  const [location, setLocation] = useState<UserLocation | null>(null);
  const [stops, setStops] = useState<Stop[]>([]);
  const [services, setServices] = useState<FavoriteService[]>([]);
  const [openCode, setOpenCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const live = useStopLive(openCode);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const current = await requestUserLocation();
      setLocation(current);
      const [savedStops, savedServices] = await Promise.all([readFavorites(), readFavoriteServices()]);
      setServices(savedServices);
      const details = await Promise.all(
        savedStops.map((item) =>
          fetchStop(item.code, current.lat, current.lng).catch(
            (): Stop => ({
              code: item.code,
              name: item.name,
              road_name: item.road_name,
              latitude: 0,
              longitude: 0,
            }),
          ),
        ),
      );
      setStops(details);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  return (
    <Screen refreshing={loading} onRefresh={() => void load()}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
        <View style={{ flex: 1 }}>
          <Title>Saved</Title>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 4 }}>
            <Heart color={palette.muted} size={14} strokeWidth={2} />
            <Muted>Stops and services you keep on this phone</Muted>
          </View>
        </View>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <Pressable
            onPress={() => void load()}
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 6,
              borderWidth: 1,
              borderColor: palette.line,
              borderRadius: 999,
              paddingHorizontal: 12,
              height: 36,
              backgroundColor: palette.card,
            }}
          >
            <RefreshCw color={palette.muted} size={14} strokeWidth={2} />
            <Text style={{ color: palette.muted, fontSize: 12 }}>Refresh</Text>
          </Pressable>
          <ProfileButton />
          <ThemeToggle />
        </View>
      </View>

      <View>
        <SectionLabel>Saved stops</SectionLabel>
        {loading && stops.length === 0 ? (
          <View style={{ gap: 8, marginTop: 12 }}>
            <View style={{ height: 72, borderRadius: 12, backgroundColor: palette.line }} />
            <View style={{ height: 72, borderRadius: 12, backgroundColor: palette.line }} />
          </View>
        ) : null}
        {!loading && stops.length === 0 ? (
          <View style={{ marginTop: 12 }}>
            <EmptyState
              title="No saved stops yet"
              detail="Tap the heart on a stop from Nearby, Map, or the stop page."
            />
          </View>
        ) : null}
        {stops.length > 0 ? (
          <View style={{ gap: 8, marginTop: 12 }}>
            {stops.map((stop) => (
              <StopPreview
                key={stop.code}
                stop={stop}
                arrivals={live.data?.bus_stop_code === stop.code ? live.data : undefined}
                selected={openCode === stop.code}
                loading={openCode === stop.code && !live.data}
                fromLat={location?.lat}
                fromLng={location?.lng}
                favorite
                onSelect={() => setOpenCode(openCode === stop.code ? null : stop.code)}
                onToggleFavorite={async () => {
                  const next = await toggleFavorite({
                    code: stop.code,
                    name: stop.name,
                    road_name: stop.road_name,
                  });
                  const codes = new Set(next.map((item) => item.code));
                  setStops((current) => current.filter((item) => codes.has(item.code)));
                  if (openCode === stop.code) setOpenCode(null);
                }}
              />
            ))}
          </View>
        ) : null}
      </View>

      <View>
        <SectionLabel>Saved services</SectionLabel>
        {services.length === 0 ? (
          <View style={{ marginTop: 12 }}>
            <EmptyState
              title="No saved services yet"
              detail="Save a bus from a live arrival or the service page."
            />
          </View>
        ) : (
          <View style={{ marginTop: 12 }}>
            <Card padded={false}>
              {services.map((service, index) => (
                <Pressable
                  key={service.service_no}
                  onPress={() =>
                    router.push({ pathname: "/service/[serviceNo]", params: { serviceNo: service.service_no } })
                  }
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 12,
                    paddingHorizontal: 12,
                    paddingVertical: 12,
                    borderTopWidth: index === 0 ? 0 : 1,
                    borderTopColor: palette.line,
                  }}
                >
                  <BusFront size={18} color={palette.muted} strokeWidth={2} />
                  <View style={{ flex: 1 }}>
                    <Mono size={18}>{service.service_no}</Mono>
                    {service.operator ? (
                      <Text style={{ color: palette.muted, fontSize: 13, marginTop: 2 }}>{service.operator}</Text>
                    ) : (
                      <Text style={{ color: palette.muted, fontSize: 13, marginTop: 2 }}>Bus service</Text>
                    )}
                  </View>
                  <Pressable
                    onPress={async () => {
                      const next = await toggleFavoriteService(service);
                      setServices(next);
                    }}
                    hitSlop={8}
                    style={{ width: 36, height: 36, alignItems: "center", justifyContent: "center" }}
                  >
                    <Heart size={16} color={palette.accent} fill={palette.accent} strokeWidth={2} />
                  </Pressable>
                </Pressable>
              ))}
            </Card>
          </View>
        )}
      </View>
    </Screen>
  );
}
