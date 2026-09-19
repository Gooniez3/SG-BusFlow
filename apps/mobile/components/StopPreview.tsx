import { Footprints, Heart } from "lucide-react-native";
import { Pressable, Text, View } from "react-native";
import Svg, { Path } from "react-native-svg";

import { Card, Mono, ServiceRow } from "@/components/Ui";
import type { Palette } from "@/constants/Colors";
import { bearingTo, walkParts } from "@/lib/format";
import { usePalette } from "@/lib/theme";
import type { Stop, StopArrivalsResponse } from "@/lib/types";

function DirectionChip({ bearing, palette }: { bearing: number | null; palette: Palette }) {
  return (
    <View
      style={{
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: palette.accent,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {bearing != null ? (
        <View style={{ transform: [{ rotate: `${bearing}deg` }] }}>
          <Svg width={18} height={18} viewBox="0 0 24 24">
            <Path d="M12 2.2 20.6 21.2 12 16.6 3.4 21.2 12 2.2Z" fill={palette.onAccent} />
          </Svg>
        </View>
      ) : (
        <Svg width={18} height={18} viewBox="0 0 24 24">
          <Path
            d="M12 21s7-5.33 7-11a7 7 0 1 0-14 0c0 5.67 7 11 7 11Z"
            fill={palette.onAccent}
          />
          <Path d="M12 11.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Z" fill={palette.accent} />
        </Svg>
      )}
    </View>
  );
}

export function StopPreview({
  stop,
  arrivals,
  selected = false,
  loading = false,
  fromLat,
  fromLng,
  favorite = false,
  onSelect,
  onToggleFavorite,
}: {
  stop: Stop;
  arrivals?: StopArrivalsResponse | null;
  selected?: boolean;
  loading?: boolean;
  fromLat?: number;
  fromLng?: number;
  favorite?: boolean;
  onSelect?: () => void;
  onToggleFavorite?: () => void;
}) {
  const palette = usePalette();
  const walk = walkParts(stop.distance_m);
  const bearing =
    fromLat != null &&
    fromLng != null &&
    stop.latitude &&
    stop.longitude &&
    Math.abs(stop.latitude) > 0.1
      ? bearingTo(fromLat, fromLng, stop.latitude, stop.longitude)
      : null;

  return (
    <Card padded={false} selected={selected}>
      <Pressable
        onPress={onSelect}
        style={{ flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 12, paddingVertical: 10 }}
      >
        <DirectionChip bearing={bearing} palette={palette} />
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={{ color: palette.ink, fontSize: 16, fontWeight: "500", lineHeight: 20 }} numberOfLines={1}>
            {stop.name}
          </Text>
          <Text style={{ color: palette.muted, fontSize: 12, marginTop: 4 }}>
            <Mono size={12} weight="500" color={palette.muted}>
              {stop.code}
            </Mono>
            {stop.road_name ? `  ${stop.road_name}` : ""}
          </Text>
        </View>
        {walk ? (
          <View style={{ flexDirection: "row", alignItems: "center", gap: 4, paddingTop: 2 }}>
            <Footprints size={14} color={palette.muted} strokeWidth={2} />
            <Text style={{ color: palette.muted, fontSize: 14, fontVariant: ["tabular-nums"] }}>{walk.metres}m</Text>
          </View>
        ) : null}
      </Pressable>
      {selected ? (
        <View style={{ borderTopWidth: 1, borderTopColor: palette.line, paddingHorizontal: 8, paddingBottom: 8, paddingTop: 6 }}>
          {onToggleFavorite ? (
            <View style={{ alignItems: "flex-end", marginBottom: 2 }}>
              <Pressable onPress={onToggleFavorite} hitSlop={8} style={{ padding: 4 }}>
                <Heart
                  size={16}
                  color={favorite ? palette.accent : palette.muted}
                  fill={favorite ? palette.accent : "transparent"}
                  strokeWidth={2}
                />
              </Pressable>
            </View>
          ) : null}
          {loading && !arrivals ? (
            <View style={{ gap: 8, paddingVertical: 8 }}>
              <View style={{ height: 32, borderRadius: 8, backgroundColor: palette.line }} />
              <View style={{ height: 32, borderRadius: 8, backgroundColor: palette.line }} />
            </View>
          ) : null}
          {arrivals && arrivals.services.length > 0 ? (
            <View style={{ overflow: "hidden", borderRadius: 8, borderWidth: 1, borderColor: palette.line, backgroundColor: palette.bg }}>
              {arrivals.services.map((service) => (
                <ServiceRow key={service.service_no} service={service} stopCode={stop.code} />
              ))}
            </View>
          ) : null}
          {arrivals && arrivals.services.length === 0 ? (
            <Text style={{ color: palette.muted, fontSize: 14, paddingVertical: 12 }}>No services reported right now.</Text>
          ) : null}
        </View>
      ) : null}
    </Card>
  );
}
