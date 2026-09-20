import { Pressable, Text, View } from "react-native";
import { useState } from "react";
import { useRouter } from "expo-router";
import { ChevronDown, ChevronRight, Footprints, MapPin, Navigation } from "lucide-react-native";

import { Muted } from "@/components/Ui";
import { arriveClock, transferLabel } from "@/lib/journey";
import { usePalette } from "@/lib/theme";
import type { JourneyLeg, JourneyOption, Stop } from "@/lib/types";

export function JourneyItinerary({
  option,
  fromLabel,
  toLabel,
}: {
  option: JourneyOption;
  fromLabel: string;
  toLabel: string;
}) {
  const palette = usePalette();
  const router = useRouter();
  return (
    <View
      style={{
        borderRadius: 16,
        borderWidth: 1,
        borderColor: palette.line,
        backgroundColor: palette.card,
        overflow: "hidden",
      }}
    >
      <View style={{ paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: palette.line }}>
        <Text style={{ color: palette.muted, fontSize: 10, letterSpacing: 1.6, fontWeight: "500" }}>YOUR TRIP</Text>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end", marginTop: 4 }}>
          <Text style={{ color: palette.ink, fontSize: 28, fontWeight: "600" }}>
            {option.duration_min}
            <Text style={{ color: palette.muted, fontSize: 14, fontWeight: "500" }}> min</Text>
          </Text>
          <Muted>Arrive {arriveClock(option.duration_min)}</Muted>
        </View>
        <View style={{ flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 6, marginTop: 12 }}>
          {option.legs.map((leg, index) => (
            <View key={`${option.id}-chip-${index}`} style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              {index > 0 ? <ChevronRight size={12} color={palette.muted} /> : null}
              {leg.kind === "walk" ? (
                <View
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: 14,
                    borderWidth: 1,
                    borderColor: palette.line,
                    backgroundColor: palette.bg,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Footprints size={13} color={palette.muted} strokeWidth={2} />
                </View>
              ) : (
                <View
                  style={{
                    minWidth: 44,
                    height: 28,
                    borderRadius: 8,
                    backgroundColor: palette.accent,
                    paddingHorizontal: 8,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Text style={{ color: palette.onAccent, fontFamily: "monospace", fontWeight: "700" }}>{leg.service_no}</Text>
                </View>
              )}
            </View>
          ))}
          <Text style={{ marginLeft: "auto", color: palette.accent, fontSize: 11, fontWeight: "600" }}>
            {transferLabel(option.transfers)}
          </Text>
        </View>
      </View>
      <View style={{ paddingHorizontal: 16, paddingTop: 16 }}>
        <PlaceRow icon="origin" title={fromLabel} last={false} />
        {option.legs.map((leg, index) => (
          <LegRows
            key={`${option.id}-itin-${index}`}
            leg={leg}
            onLive={() => {
              if (leg.service_no && leg.from_stop) {
                router.push({
                  pathname: "/live/[serviceNo]",
                  params: { serviceNo: leg.service_no, stop: leg.from_stop.code },
                });
              }
            }}
          />
        ))}
        <PlaceRow icon="dest" title={toLabel} last />
        {option.legs.some((leg) => leg.kind === "bus") ? (
          <Text style={{ color: palette.muted, fontSize: 12, paddingBottom: 16 }}>Tap a bus number to see live arrivals.</Text>
        ) : null}
      </View>
    </View>
  );
}

function PlaceRow({ icon, title, last }: { icon: "origin" | "dest"; title: string; last: boolean }) {
  const palette = usePalette();
  return (
    <View style={{ flexDirection: "row", gap: 12 }}>
      <View style={{ width: 22, alignItems: "center" }}>
        {icon === "origin" ? (
          <View
            style={{
              width: 22,
              height: 22,
              borderRadius: 11,
              borderWidth: 2,
              borderColor: palette.accent,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: palette.card,
            }}
          >
            <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: palette.accent }} />
          </View>
        ) : (
          <MapPin size={18} color={palette.accent} strokeWidth={2.2} />
        )}
        {last ? null : <View style={{ width: 1, flex: 1, minHeight: 16, backgroundColor: palette.line }} />}
      </View>
      <View style={{ flex: 1, paddingBottom: last ? 16 : 20, paddingTop: 2 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          {icon === "origin" ? <Navigation size={14} color={palette.accent} strokeWidth={2} /> : null}
          <Text style={{ color: palette.ink, fontWeight: "500" }}>{title}</Text>
        </View>
      </View>
    </View>
  );
}

function LegRows({ leg, onLive }: { leg: JourneyLeg; onLive: () => void }) {
  const palette = usePalette();
  if (leg.kind !== "bus") {
    return (
      <View style={{ flexDirection: "row", gap: 12 }}>
        <View style={{ width: 22, alignItems: "center" }}>
          <View
            style={{
              width: 22,
              height: 22,
              borderRadius: 11,
              borderWidth: 1,
              borderColor: palette.line,
              backgroundColor: palette.bg,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Footprints size={11} color={palette.muted} strokeWidth={2.2} />
          </View>
          <View style={{ width: 1, flex: 1, minHeight: 16, backgroundColor: palette.line }} />
        </View>
        <View style={{ flex: 1, paddingBottom: 20 }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
            <Text style={{ color: palette.ink, fontWeight: "500" }}>Walk</Text>
            <Muted>{leg.duration_min} min</Muted>
          </View>
          <Muted>
            {leg.distance_m ? `${leg.distance_m} m` : ""}
            {leg.distance_m && leg.to_label ? " · " : ""}
            {leg.to_label ? `to ${leg.to_label}` : ""}
          </Muted>
        </View>
      </View>
    );
  }

  return (
    <View style={{ flexDirection: "row", gap: 12 }}>
      <View style={{ width: 22, alignItems: "center" }}>
        <View
          style={{
            width: 22,
            height: 22,
            borderRadius: 11,
            backgroundColor: palette.accent,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: palette.onAccent }} />
        </View>
        <View style={{ width: 4, flex: 1, minHeight: 16, borderRadius: 2, backgroundColor: palette.accent }} />
      </View>
      <View style={{ flex: 1, paddingBottom: 20 }}>
        <Text style={{ color: palette.ink, fontWeight: "500" }}>{leg.from_stop?.name ?? "Board"}</Text>
        {leg.from_stop ? <Muted>{leg.from_stop.code}</Muted> : null}
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 8, gap: 8 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8, flex: 1, minWidth: 0 }}>
            <Pressable onPress={onLive}>
              <View
                style={{
                  minWidth: 44,
                  height: 28,
                  borderRadius: 8,
                  backgroundColor: palette.accent,
                  paddingHorizontal: 8,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Text style={{ color: palette.onAccent, fontFamily: "monospace", fontWeight: "700" }}>{leg.service_no}</Text>
              </View>
            </Pressable>
            {leg.to_stop ? (
              <Text style={{ color: palette.muted, fontSize: 14, flexShrink: 1 }} numberOfLines={1}>
                {leg.to_stop.name}
              </Text>
            ) : null}
          </View>
          <Text
            style={{
              color: leg.live_minutes != null ? palette.live : palette.muted,
              fontSize: 12,
              fontWeight: leg.live_minutes != null ? "600" : "500",
              fontVariant: ["tabular-nums"],
            }}
          >
            {leg.live_minutes != null
              ? leg.live_minutes <= 0
                ? "Arriving"
                : `${leg.live_minutes} min`
              : `${leg.duration_min} min`}
          </Text>
        </View>
        {leg.stop_count ? <RideStops stops={leg.via_stops ?? []} stopCount={leg.stop_count} /> : null}
      </View>
    </View>
  );
}

function RideStops({ stops, stopCount }: { stops: Stop[]; stopCount: number }) {
  const palette = usePalette();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const count = stopCount || stops.length;
  if (!count) return null;
  const label = `Ride ${count} ${count === 1 ? "stop" : "stops"}`;
  if (!stops.length) {
    return <Muted>{label}</Muted>;
  }
  return (
    <View style={{ marginTop: 6 }}>
      <Pressable onPress={() => setOpen((value) => !value)} style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
        <Text style={{ color: palette.muted, fontSize: 12, fontWeight: "600" }}>{label}</Text>
        <ChevronDown size={13} color={palette.muted} style={{ transform: [{ rotate: open ? "180deg" : "0deg" }] }} />
      </Pressable>
      {open
        ? stops.map((stop, index) => {
            const last = index === stops.length - 1;
            return (
              <Pressable
                key={`${stop.code}-${index}`}
                onPress={() => router.push({ pathname: "/stop/[code]", params: { code: stop.code } })}
                style={{
                  marginTop: 8,
                  marginLeft: 4,
                  paddingLeft: 10,
                  borderLeftWidth: 1,
                  borderLeftColor: palette.line,
                }}
              >
                <Text style={{ color: palette.ink, fontSize: 14 }}>{stop.name}</Text>
                <Muted>
                  {stop.code}
                  {last ? " · Alight" : ""}
                </Muted>
              </Pressable>
            );
          })
        : null}
    </View>
  );
}
