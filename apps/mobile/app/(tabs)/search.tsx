import { useEffect, useMemo, useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import { useRouter } from "expo-router";
import { BusFront, Clock, Footprints, MapPin, Navigation, Search, X } from "lucide-react-native";

import { EmptyState, Muted, Mono, Screen, SectionLabel, Title } from "@/components/Ui";
import { ProfileButton, ThemeToggle } from "@/components/ThemeToggle";
import { searchServices, searchStops } from "@/lib/api";
import {
  clearDestinations,
  pushDestination,
  readDestinations,
  removeDestination,
  type RecentDestination,
} from "@/lib/destinations";
import { walkParts } from "@/lib/format";
import { requestUserLocation } from "@/lib/location";
import { clearRecents, pushRecent, readRecents, type RecentSearch } from "@/lib/recents";
import { usePalette } from "@/lib/theme";
import type { ServiceSearchItem, Stop } from "@/lib/types";

export default function SearchScreen() {
  const palette = usePalette();
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [stops, setStops] = useState<Stop[]>([]);
  const [services, setServices] = useState<ServiceSearchItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [recents, setRecents] = useState<RecentSearch[]>([]);
  const [destinations, setDestinations] = useState<RecentDestination[]>([]);
  const [toQuery, setToQuery] = useState("");
  const [destination, setDestination] = useState<Stop | null>(null);
  const [toMatches, setToMatches] = useState<Stop[]>([]);

  useEffect(() => {
    void readRecents().then(setRecents);
    void readDestinations().then(setDestinations);
  }, []);

  useEffect(() => {
    const needle = query.trim();
    if (needle.length < 1) {
      setStops([]);
      setServices([]);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
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
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 280);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query]);

  useEffect(() => {
    const trimmed = toQuery.trim();
    if (!trimmed || destination?.name === trimmed) {
      setToMatches([]);
      return;
    }
    let cancelled = false;
    const timer = setTimeout(async () => {
      try {
        const location = await requestUserLocation();
        const result = await searchStops(trimmed, location.lat, location.lng);
        if (!cancelled) setToMatches(result.stops.slice(0, 6));
      } catch {
        if (!cancelled) setToMatches([]);
      }
    }, 200);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [toQuery, destination?.name]);

  const nearbyStops = useMemo(
    () => stops.filter((stop) => stop.distance_m != null && stop.distance_m <= 1500),
    [stops],
  );
  const otherStops = useMemo(
    () => stops.filter((stop) => !nearbyStops.some((item) => item.code === stop.code)),
    [stops, nearbyStops],
  );
  const looksLikeService = /^[0-9][0-9A-Za-z]{0,4}$/.test(query.trim());
  const hasQuery = query.trim().length > 0;

  async function go(value: string) {
    const trimmed = value.trim();
    setQuery(trimmed);
    if (trimmed) setRecents(await pushRecent(trimmed));
  }

  const serviceBlock =
    services.length > 0 ? (
      <ResultGroup title="Services">
        {services.map((service) => (
          <Pressable
            key={service.service_no}
            onPress={() => {
              void go(service.service_no);
              router.push({ pathname: "/service/[serviceNo]", params: { serviceNo: service.service_no } });
            }}
            style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 12 }}
          >
            <BusFront size={18} color={palette.muted} strokeWidth={2} />
            <View style={{ flex: 1 }}>
              <Mono size={18}>{service.service_no}</Mono>
              {service.operator ? (
                <Text style={{ color: palette.muted, fontSize: 14, marginTop: 2 }}>{service.operator}</Text>
              ) : null}
            </View>
          </Pressable>
        ))}
      </ResultGroup>
    ) : null;

  return (
    <Screen keyboardShouldPersistTaps="handled">
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
        <Title>Search</Title>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <ProfileButton />
          <ThemeToggle />
        </View>
      </View>
      <View
        style={{
          borderRadius: 16,
          borderWidth: 1,
          borderColor: palette.line,
          backgroundColor: palette.card,
          padding: 12,
          gap: 12,
        }}
      >
        <Text style={{ color: palette.ink, fontWeight: "500" }}>Plan a journey</Text>
        <View>
          <Text style={{ color: palette.muted, fontSize: 10, letterSpacing: 1.6, fontWeight: "500" }}>FROM</Text>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginTop: 6 }}>
            <Navigation size={16} color={palette.accent} strokeWidth={2} />
            <Text style={{ color: palette.ink, fontWeight: "500" }}>Current location</Text>
          </View>
        </View>
        <View>
          <Text style={{ color: palette.muted, fontSize: 10, letterSpacing: 1.6, fontWeight: "500" }}>TO</Text>
          <View
            style={{
              marginTop: 6,
              height: 44,
              borderRadius: 12,
              borderWidth: 1,
              borderColor: palette.line,
              backgroundColor: palette.bg,
              flexDirection: "row",
              alignItems: "center",
              paddingHorizontal: 10,
              gap: 8,
            }}
          >
            <MapPin size={16} color={palette.muted} strokeWidth={2} />
            <TextInput
              value={toQuery}
              onChangeText={(value) => {
                setToQuery(value);
                setDestination(null);
              }}
              placeholder="Where do you want to go?"
              placeholderTextColor={palette.muted}
              autoCorrect={false}
              style={{ flex: 1, color: palette.ink, fontSize: 15, paddingVertical: 0 }}
            />
          </View>
        </View>
        {toMatches.map((stop) => (
          <Pressable
            key={stop.code}
            onPress={() => {
              setDestination(stop);
              setToQuery(stop.name);
              setToMatches([]);
            }}
            style={{ flexDirection: "row", gap: 8, paddingVertical: 4 }}
          >
            <MapPin size={14} color={palette.muted} strokeWidth={2} style={{ marginTop: 2 }} />
            <View>
              <Text style={{ color: palette.ink, fontWeight: "500" }}>{stop.name}</Text>
              <Muted>
                {stop.code}
                {stop.road_name ? ` · ${stop.road_name}` : ""}
              </Muted>
            </View>
          </Pressable>
        ))}
        {!toQuery && destinations.length > 0 ? (
          <View>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
              <SectionLabel>Recent</SectionLabel>
              <Pressable onPress={() => void clearDestinations().then(setDestinations)}>
                <Text style={{ color: palette.muted, fontSize: 12 }}>Clear</Text>
              </Pressable>
            </View>
            {destinations.map((item) => (
              <View
                key={`${item.label}-${item.stopCode ?? item.lat}`}
                style={{ flexDirection: "row", alignItems: "center", gap: 8 }}
              >
                <Pressable
                  onPress={() => {
                    setToQuery(item.label);
                    if (item.stopCode) {
                      setDestination({
                        code: item.stopCode,
                        name: item.label,
                        road_name: null,
                        latitude: item.lat,
                        longitude: item.lng,
                      });
                    }
                  }}
                  style={{ flex: 1, paddingVertical: 8 }}
                >
                  <Text style={{ color: palette.ink, fontSize: 14 }}>{item.label}</Text>
                </Pressable>
                <Pressable
                  onPress={() => void removeDestination(item).then(setDestinations)}
                  hitSlop={8}
                  accessibilityLabel={`Remove ${item.label}`}
                >
                  <X size={14} color={palette.muted} strokeWidth={2} />
                </Pressable>
              </View>
            ))}
          </View>
        ) : null}
        <Pressable
          disabled={!destination}
          onPress={async () => {
            if (!destination) return;
            const location = await requestUserLocation();
            await pushDestination({
              label: destination.name,
              lat: destination.latitude,
              lng: destination.longitude,
              stopCode: destination.code,
            });
            router.push({
              pathname: "/plan",
              params: {
                to: destination.code,
                to_label: destination.name,
                to_lat: String(destination.latitude),
                to_lng: String(destination.longitude),
                from_lat: String(location.lat),
                from_lng: String(location.lng),
                from_label: "Current location",
              },
            });
          }}
          style={{
            height: 44,
            borderRadius: 999,
            backgroundColor: destination ? palette.accent : palette.line,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Text style={{ color: destination ? palette.onAccent : palette.muted, fontWeight: "600" }}>Find journey</Text>
        </Pressable>
      </View>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
        <View style={{ flex: 1, height: 1, backgroundColor: palette.line }} />
        <Text style={{ color: palette.muted, fontSize: 11, letterSpacing: 1.6, fontWeight: "500" }}>OR</Text>
        <View style={{ flex: 1, height: 1, backgroundColor: palette.line }} />
      </View>
      <View
        style={{
          height: 48,
          borderRadius: 12,
          borderWidth: 1,
          borderColor: palette.line,
          backgroundColor: palette.card,
          flexDirection: "row",
          alignItems: "center",
          paddingHorizontal: 12,
          gap: 8,
        }}
      >
        <Search size={18} color={palette.muted} strokeWidth={2} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          onSubmitEditing={() => void go(query)}
          placeholder="Search buses, stops or places"
          placeholderTextColor={palette.muted}
          autoCorrect={false}
          autoCapitalize="none"
          returnKeyType="search"
          style={{ flex: 1, color: palette.ink, fontSize: 15, paddingVertical: 0 }}
        />
        {query ? (
          <Pressable onPress={() => setQuery("")} hitSlop={8}>
            <Text style={{ color: palette.muted, fontSize: 13 }}>Clear</Text>
          </Pressable>
        ) : null}
      </View>

      {!hasQuery && recents.length > 0 ? (
        <View>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
            <SectionLabel>Recent</SectionLabel>
            <Pressable
              onPress={() => {
                void clearRecents();
                setRecents([]);
              }}
            >
              <Text style={{ color: palette.muted, fontSize: 12 }}>Clear</Text>
            </Pressable>
          </View>
          {recents.map((item) => (
            <Pressable
              key={item.query}
              onPress={() => void go(item.query)}
              style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 12 }}
            >
              <Clock size={16} color={palette.muted} strokeWidth={2} />
              <Text style={{ color: palette.ink, fontSize: 14 }}>{item.query}</Text>
            </Pressable>
          ))}
        </View>
      ) : null}

      {loading ? (
        <View style={{ gap: 8 }}>
          <View style={{ height: 48, borderRadius: 12, backgroundColor: palette.line }} />
          <View style={{ height: 48, borderRadius: 12, backgroundColor: palette.line }} />
        </View>
      ) : null}

      {error ? <Muted>{error}</Muted> : null}

      {!loading && hasQuery && stops.length === 0 && services.length === 0 && !error ? (
        <EmptyState title="No results" detail="Try a stop name, code, or bus service number." />
      ) : null}

      {looksLikeService ? serviceBlock : null}
      {nearbyStops.length > 0 ? (
        <ResultGroup title="Nearby">
          {nearbyStops.map((stop) => (
            <StopResult key={stop.code} stop={stop} onPress={() => router.push({ pathname: "/stop/[code]", params: { code: stop.code } })} />
          ))}
        </ResultGroup>
      ) : null}
      {otherStops.length > 0 ? (
        <ResultGroup title={nearbyStops.length > 0 ? "Other stops" : "Bus stops"}>
          {otherStops.map((stop) => (
            <StopResult key={stop.code} stop={stop} onPress={() => router.push({ pathname: "/stop/[code]", params: { code: stop.code } })} />
          ))}
        </ResultGroup>
      ) : null}
      {!looksLikeService ? serviceBlock : null}
    </Screen>
  );
}

function ResultGroup({ title, children }: { title: string; children: React.ReactNode }) {
  const palette = usePalette();
  return (
    <View>
      <SectionLabel>{title}</SectionLabel>
      <View style={{ marginTop: 4, borderTopWidth: 1, borderTopColor: palette.line }}>{children}</View>
    </View>
  );
}

function StopResult({ stop, onPress }: { stop: Stop; onPress: () => void }) {
  const palette = usePalette();
  const walk = walkParts(stop.distance_m);
  return (
    <Pressable
      onPress={onPress}
      style={{
        flexDirection: "row",
        alignItems: "flex-start",
        gap: 12,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: palette.line,
      }}
    >
      <MapPin size={18} color={palette.muted} strokeWidth={2} style={{ marginTop: 2 }} />
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={{ color: palette.ink, fontWeight: "500" }}>{stop.name}</Text>
        <Text style={{ color: palette.muted, fontSize: 14, marginTop: 2 }}>
          {stop.code}
          {stop.road_name ? ` · ${stop.road_name}` : ""}
        </Text>
      </View>
      {walk ? (
        <View style={{ flexDirection: "row", alignItems: "center", gap: 4, paddingTop: 2 }}>
          <Footprints size={14} color={palette.muted} strokeWidth={2} />
          <Text style={{ color: palette.muted, fontSize: 14, fontVariant: ["tabular-nums"] }}>{walk.metres}m</Text>
        </View>
      ) : null}
    </Pressable>
  );
}
