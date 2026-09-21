import { useCallback, useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, Text, useWindowDimensions, View } from "react-native";
import { useRouter } from "expo-router";
import { Footprints, Heart, LocateFixed, Search, X } from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { LeafletMap } from "@/components/LeafletMap";
import { LiveBadge } from "@/components/LiveBadge";
import { ProfileButton, ThemeToggle } from "@/components/ThemeToggle";
import { EmptyState, Mono, Muted, ServiceRow } from "@/components/Ui";
import { fetchNearby } from "@/lib/api";
import { busesFromServices, uniqueBuses } from "@/lib/buses";
import { isFavorite, toggleFavorite } from "@/lib/favorites";
import { arrivalShort, nextService, walkParts } from "@/lib/format";
import { requestUserLocation, type UserLocation } from "@/lib/location";
import { useLiveStops, useStopLive } from "@/lib/live";
import { usePalette } from "@/lib/theme";
import type { Stop } from "@/lib/types";

export default function MapScreen() {
  const palette = usePalette();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const [location, setLocation] = useState<UserLocation | null>(null);
  const [stops, setStops] = useState<Stop[]>([]);
  const [selectedCode, setSelectedCode] = useState<string | null>(null);
  const [followUser, setFollowUser] = useState(true);
  const [locateToken, setLocateToken] = useState(0);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [saved, setSaved] = useState(false);
  const live = useStopLive(selectedCode);
  const selected = stops.find((stop) => stop.code === selectedCode) ?? null;
  const nearby = stops.slice(0, 10);
  const visibleNearby = sheetOpen ? nearby : nearby.slice(0, 3);
  const walk = walkParts(selected?.distance_m);
  const liveCodes = useMemo(() => stops.slice(0, 8).map((stop) => stop.code), [stops]);
  const nearbyLive = useLiveStops(liveCodes);
  const buses = useMemo(() => {
    if (!selectedCode || !live.data) return [];
    return uniqueBuses(busesFromServices(live.data.services));
  }, [live.data, selectedCode]);
  const sheetHeight = selected
    ? sheetOpen
      ? Math.min(480, height * 0.55)
      : Math.min(352, height * 0.42)
    : sheetOpen
      ? Math.min(448, height * 0.5)
      : Math.min(292, height * 0.34);
  const camera = followUser || !selected
    ? { lat: location?.lat ?? 1.3521, lng: location?.lng ?? 103.8198 }
    : { lat: selected.latitude, lng: selected.longitude };

  const load = useCallback(async () => {
    const current = await requestUserLocation();
    setLocation(current);
    setFollowUser(true);
    setLocateToken((value) => value + 1);
    try {
      const nearbyStops = await fetchNearby(current.lat, current.lng);
      setStops(nearbyStops.stops);
    } catch {
      setStops([]);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    setSheetOpen(false);
    if (!selectedCode) {
      setSaved(false);
      return;
    }
    void isFavorite(selectedCode).then(setSaved);
  }, [selectedCode]);

  if (!location) {
    return <View style={{ flex: 1, backgroundColor: palette.bg }} />;
  }

  return (
    <View style={{ flex: 1, backgroundColor: palette.bg }}>
      <LeafletMap
        lat={camera.lat}
        lng={camera.lng}
        zoom={16}
        stops={stops}
        buses={buses}
        selectedCode={selectedCode}
        user={{ lat: location.lat, lng: location.lng }}
        showUser
        fitBus={buses.length > 0}
        bottomPad={sheetHeight}
        recenterKey={`${followUser ? "user" : "stop"}:${selectedCode ?? ""}:${buses.map((bus) => bus.serviceNo).join(",")}:${locateToken}`}
        onSelectStop={(code) => {
          setSelectedCode(code);
          setFollowUser(false);
        }}
        onSelectBus={(serviceNo) => {
          const stop = selectedCode ?? stops[0]?.code;
          if (stop) {
            router.push({ pathname: "/live/[serviceNo]", params: { serviceNo, stop } });
          }
        }}
      />

      <View
        style={{
          position: "absolute",
          top: insets.top + 8,
          left: 12,
          right: 12,
          flexDirection: "row",
          alignItems: "center",
          gap: 8,
        }}
      >
        <Pressable
          onPress={() => router.push("/search")}
          style={{
            flex: 1,
            height: 48,
            borderRadius: 999,
            backgroundColor: palette.glass,
            borderWidth: 1,
            borderColor: palette.line,
            flexDirection: "row",
            alignItems: "center",
            paddingHorizontal: 16,
            gap: 10,
          }}
        >
          <Search size={16} color={palette.muted} strokeWidth={2} />
          <Text style={{ color: palette.muted, fontSize: 14 }}>Search stops and buses</Text>
        </Pressable>
        <ProfileButton />
        <ThemeToggle />
      </View>

      <Pressable
        onPress={() => {
          setFollowUser(true);
          setSelectedCode(null);
          void load();
        }}
        style={{
          position: "absolute",
          right: 12,
          bottom: sheetHeight + 12,
          width: 44,
          height: 44,
          borderRadius: 22,
          backgroundColor: palette.card,
          borderWidth: 1,
          borderColor: palette.line,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <LocateFixed size={18} color={palette.ink} strokeWidth={2} />
      </Pressable>

      <View
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 0,
          height: sheetHeight,
          backgroundColor: palette.glass,
          borderTopLeftRadius: 26,
          borderTopRightRadius: 26,
          borderTopWidth: 1,
          borderColor: palette.line,
          overflow: "hidden",
        }}
      >
        <Pressable onPress={() => setSheetOpen((value) => !value)} style={{ alignItems: "center", paddingTop: 10, paddingBottom: 4 }}>
          <View style={{ width: 40, height: 4, borderRadius: 99, backgroundColor: palette.line }} />
        </Pressable>

        {selected ? (
          <>
            <View style={{ paddingHorizontal: 16 }}>
              <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 8 }}>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={{ color: palette.ink, fontSize: 17, fontWeight: "600", letterSpacing: -0.3 }}>
                    {selected.name}
                  </Text>
                  <View style={{ flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 8, marginTop: 4 }}>
                    <Text style={{ color: palette.muted, fontSize: 12 }}>{selected.code}</Text>
                    {walk ? (
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                        <Footprints size={12} color={palette.muted} strokeWidth={2} />
                        <Text style={{ color: palette.muted, fontSize: 12 }}>{walk.metres} m</Text>
                      </View>
                    ) : null}
                    {selected.road_name ? (
                      <Text style={{ color: palette.muted, fontSize: 12 }}>{selected.road_name}</Text>
                    ) : null}
                  </View>
                </View>
                <Pressable
                  onPress={async () => {
                    const next = await toggleFavorite({
                      code: selected.code,
                      name: selected.name,
                      road_name: selected.road_name,
                    });
                    setSaved(next.some((item) => item.code === selected.code));
                  }}
                  style={{ width: 40, height: 40, alignItems: "center", justifyContent: "center" }}
                >
                  <Heart
                    size={18}
                    color={saved ? palette.accent : palette.muted}
                    fill={saved ? palette.accent : "transparent"}
                    strokeWidth={2}
                  />
                </Pressable>
                <Pressable
                  onPress={() => {
                    setSelectedCode(null);
                    setFollowUser(true);
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
                  <X size={14} color={palette.muted} strokeWidth={2} />
                </Pressable>
              </View>
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 12, marginBottom: 4 }}>
                <Text
                  style={{
                    color: palette.muted,
                    fontSize: 11,
                    fontWeight: "500",
                    letterSpacing: 1.8,
                    textTransform: "uppercase",
                  }}
                >
                  Live arrivals
                </Text>
                {live.data ? (
                  <LiveBadge cachedAt={live.data.cached_at} stale={live.data.stale} status={live.status} />
                ) : (
                  <LiveBadge status={live.status} />
                )}
              </View>
            </View>
            <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 8 }}>
              {live.error ? (
                <Muted>
                  {live.data
                    ? "Live data delayed. Showing last arrivals."
                    : live.error}
                </Muted>
              ) : null}
              {live.data && live.data.services.length > 0 ? (
                <View style={{ overflow: "hidden", borderRadius: 8, borderWidth: 1, borderColor: palette.line, backgroundColor: palette.bg }}>
                  {live.data.services.map((service) => (
                    <ServiceRow key={service.service_no} service={service} stopCode={selected.code} />
                  ))}
                </View>
              ) : null}
              {live.data && live.data.services.length === 0 ? (
                <Muted>No services reported right now.</Muted>
              ) : null}
              {!live.data && !live.error ? (
                <View style={{ gap: 8, paddingVertical: 8 }}>
                  <View style={{ height: 40, borderRadius: 8, backgroundColor: palette.line }} />
                  <View style={{ height: 40, borderRadius: 8, backgroundColor: palette.line }} />
                </View>
              ) : null}
            </ScrollView>
            <Pressable
              onPress={() => router.push({ pathname: "/stop/[code]", params: { code: selected.code } })}
              style={{
                marginHorizontal: 16,
                marginBottom: 12,
                height: 44,
                borderRadius: 999,
                backgroundColor: palette.accent,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Text style={{ color: palette.onAccent, fontSize: 14, fontWeight: "600" }}>View stop</Text>
            </Pressable>
          </>
        ) : (
          <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 16 }}>
            <View style={{ marginBottom: 8 }}>
              <Text style={{ color: palette.ink, fontSize: 17, fontWeight: "600" }}>Nearby</Text>
              <Text style={{ color: palette.muted, fontSize: 12, marginTop: 2 }}>
                {location.isDemo ? "Demo pin until location is allowed" : `${nearby.length} stops around you`}
              </Text>
            </View>
            {visibleNearby.length === 0 ? (
              <EmptyState title="No stops nearby" detail="Move the map or enable location." />
            ) : (
              visibleNearby.map((stop, index) => {
                const metres = walkParts(stop.distance_m)?.metres;
                const next = nextService(nearbyLive.data[stop.code]?.services ?? []);
                const label = next ? arrivalShort(next.minutes) : null;
                return (
                  <Pressable
                    key={stop.code}
                    onPress={() => {
                      setSelectedCode(stop.code);
                      setFollowUser(false);
                    }}
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 12,
                      paddingVertical: 10,
                      borderTopWidth: index === 0 ? 0 : 1,
                      borderTopColor: palette.line,
                    }}
                  >
                    <View
                      style={{
                        width: 10,
                        height: 10,
                        borderRadius: 5,
                        backgroundColor: index === 0 ? palette.accent : palette.line,
                      }}
                    />
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 12 }}>
                        <Text style={{ color: palette.ink, fontWeight: "500", flex: 1 }} numberOfLines={1}>
                          {stop.name}
                        </Text>
                        {metres != null ? (
                          <Text style={{ color: palette.muted, fontSize: 14, fontVariant: ["tabular-nums"] }}>
                            {metres} m
                          </Text>
                        ) : null}
                      </View>
                      <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 12, marginTop: 2 }}>
                        <Text style={{ color: palette.muted, fontSize: 12, flex: 1 }} numberOfLines={1}>
                          {stop.code}
                          {stop.road_name ? ` · ${stop.road_name}` : ""}
                        </Text>
                        {next && label ? (
                          <Text style={{ color: palette.ink, fontSize: 12, fontWeight: "500" }}>
                            <Mono size={12}>{next.serviceNo}</Mono>
                            <Text style={{ color: label === "Here" ? palette.warn : palette.ink }}>
                              {` · ${label}${label !== "Here" ? " min" : ""}`}
                            </Text>
                          </Text>
                        ) : null}
                      </View>
                    </View>
                  </Pressable>
                );
              })
            )}
            {!sheetOpen && nearby.length > 3 ? (
              <Pressable onPress={() => setSheetOpen(true)} style={{ paddingVertical: 10 }}>
                <Text style={{ color: palette.accent, fontSize: 14, fontWeight: "600", textAlign: "center" }}>
                  See all nearby stops
                </Text>
              </Pressable>
            ) : (
              <Text style={{ color: palette.muted, fontSize: 10, paddingTop: 8 }}>Map data © OpenStreetMap</Text>
            )}
          </ScrollView>
        )}
      </View>
    </View>
  );
}
