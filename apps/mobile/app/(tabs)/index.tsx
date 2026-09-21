import { AppState, Pressable, Text, View } from "react-native";
import { MapPin, Navigation, RefreshCw } from "lucide-react-native";
import { useRouter } from "expo-router";

import { EmptyState, Muted, Screen, Title } from "@/components/Ui";
import { StopPreview } from "@/components/StopPreview";
import { IconButton, ThemeToggle } from "@/components/ThemeToggle";
import { fetchNearby } from "@/lib/api";
import { readFavorites, toggleFavorite } from "@/lib/favorites";
import { enableUserLocation, requestUserLocation, type UserLocation } from "@/lib/location";
import { useStopLive } from "@/lib/live";
import { usePalette } from "@/lib/theme";
import type { Stop } from "@/lib/types";
import { useCallback, useEffect, useRef, useState } from "react";

export default function NearbyScreen() {
  const palette = usePalette();
  const router = useRouter();
  const [location, setLocation] = useState<UserLocation | null>(null);
  const [stops, setStops] = useState<Stop[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [openCode, setOpenCode] = useState<string | null>(null);
  const [savedCodes, setSavedCodes] = useState<string[]>([]);
  const live = useStopLive(openCode);

  const load = useCallback(async (mode: "read" | "enable" = "read") => {
    setLoading(true);
    try {
      const current = mode === "enable" ? await enableUserLocation() : await requestUserLocation();
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

  const deniedRef = useRef(false);
  deniedRef.current = Boolean(location?.denied);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active" && deniedRef.current) void load("read");
    });
    return () => sub.remove();
  }, [load]);

  useEffect(() => {
    void readFavorites().then((items) => setSavedCodes(items.map((item) => item.code)));
  }, []);

  return (
    <Screen refreshing={loading} onRefresh={load}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
        <View style={{ flex: 1 }}>
          <Title>Nearby</Title>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 4 }}>
            <Navigation color={palette.muted} size={14} strokeWidth={2} />
            <Muted>
              {loading && !location
                ? "Finding your location"
                : location?.denied
                  ? "Location is off · showing a demo area"
                  : location?.isDemo
                    ? `Demo pin · ${location.label}`
                    : "Using your current location"}
            </Muted>
          </View>
        </View>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          {location?.denied || location?.isDemo ? (
            <Pressable
              onPress={() => void load("enable")}
              style={{
                height: 36,
                borderRadius: 999,
                backgroundColor: palette.accent,
                paddingHorizontal: 12,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Text style={{ color: palette.onAccent, fontSize: 12, fontWeight: "600" }}>Turn on location</Text>
            </Pressable>
          ) : null}
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
          <IconButton onPress={() => router.push("/map")}>
            <MapPin size={16} color={palette.muted} strokeWidth={2} />
          </IconButton>
          <ThemeToggle />
        </View>
      </View>

      {error ? (
        <EmptyState title="Could not load nearby stops" detail="Try again in a moment." />
      ) : null}

      {loading && stops.length === 0 ? (
        <View style={{ gap: 8 }}>
          <View style={{ height: 72, borderRadius: 12, backgroundColor: palette.line }} />
          <View style={{ height: 72, borderRadius: 12, backgroundColor: palette.line }} />
          <View style={{ height: 72, borderRadius: 12, backgroundColor: palette.line }} />
        </View>
      ) : null}

      {!loading && stops.length === 0 && !error ? (
        <EmptyState title="No stops nearby" detail="Try a wider search or another location." />
      ) : null}

      <View style={{ gap: 8 }}>
        {stops.map((stop) => (
          <StopPreview
            key={stop.code}
            stop={stop}
            arrivals={live.data?.bus_stop_code === stop.code ? live.data : undefined}
            selected={openCode === stop.code}
            loading={openCode === stop.code && !live.data}
            fromLat={location?.lat}
            fromLng={location?.lng}
            favorite={savedCodes.includes(stop.code)}
            onSelect={() => setOpenCode(openCode === stop.code ? null : stop.code)}
            onToggleFavorite={async () => {
              const next = await toggleFavorite({
                code: stop.code,
                name: stop.name,
                road_name: stop.road_name,
              });
              setSavedCodes(next.map((item) => item.code));
            }}
          />
        ))}
      </View>
    </Screen>
  );
}
