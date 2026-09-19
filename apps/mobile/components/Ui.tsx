import { ReactNode } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { usePalette } from "@/lib/theme";
import type { Palette } from "@/constants/Colors";
import type { ServiceArrivals } from "@/lib/types";
import { arrivalShort } from "@/lib/format";

export function Screen({ children }: { children?: ReactNode }) {
  const palette = usePalette();
  return (
    <SafeAreaView style={[styles.flex, { backgroundColor: palette.bg }]} edges={["top"]}>
      {children}
    </SafeAreaView>
  );
}

export function Title({ children }: { children: string }) {
  const palette = usePalette();
  return <Text style={[styles.title, { color: palette.ink }]}>{children}</Text>;
}

export function Muted({ children }: { children: ReactNode }) {
  const palette = usePalette();
  return <Text style={[styles.muted, { color: palette.muted }]}>{children}</Text>;
}

export function Card({ children, onPress }: { children: ReactNode; onPress?: () => void }) {
  const palette = usePalette();
  const body = (
    <View style={[styles.card, { backgroundColor: palette.card, borderColor: palette.line }]}>{children}</View>
  );
  if (!onPress) return body;
  return (
    <Pressable onPress={onPress} style={({ pressed }) => ({ opacity: pressed ? 0.72 : 1 })}>
      {body}
    </Pressable>
  );
}

export function ServiceRow({
  service,
  onPress,
}: {
  service: ServiceArrivals;
  onPress?: () => void;
}) {
  const palette = usePalette();
  const destination = service.arrivals[0]?.destination_name;
  return (
    <Pressable onPress={onPress} style={[styles.serviceRow, { borderBottomColor: palette.line }]}>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={[styles.serviceNo, { color: palette.ink }]}>{service.service_no}</Text>
        <Text style={[styles.muted, { color: palette.muted }]} numberOfLines={1}>
          {destination ?? service.operator}
        </Text>
      </View>
      <View style={styles.times}>
        {service.arrivals.slice(0, 3).map((arrival, index) => {
          const label = arrivalShort(arrival.minutes);
          const here = label === "Here";
          return (
            <View key={`${service.service_no}-${index}`} style={styles.timeCol}>
              <Text style={[styles.time, { color: here ? palette.warn : palette.ink }]}>{label ?? "—"}</Text>
              <View style={[styles.bar, { backgroundColor: here ? palette.warn : palette.live }]} />
            </View>
          );
        })}
      </View>
    </Pressable>
  );
}

export function emptyState(palette: Palette, title: string, detail?: string) {
  return (
    <View style={[styles.card, { backgroundColor: palette.card, borderColor: palette.line, marginTop: 12 }]}>
      <Text style={{ color: palette.ink, fontWeight: "600" }}>{title}</Text>
      {detail ? <Text style={{ color: palette.muted, marginTop: 6 }}>{detail}</Text> : null}
    </View>
  );
}

export { ScrollView };

const styles = StyleSheet.create({
  flex: { flex: 1 },
  title: { fontSize: 28, fontWeight: "700", letterSpacing: -0.4 },
  muted: { fontSize: 13, marginTop: 2 },
  card: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
  },
  serviceRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  serviceNo: { fontSize: 20, fontWeight: "700", fontVariant: ["tabular-nums"] },
  times: { flexDirection: "row", gap: 14 },
  timeCol: { width: 36, alignItems: "center" },
  time: { fontSize: 16, fontWeight: "700", fontVariant: ["tabular-nums"] },
  bar: { marginTop: 6, height: 3, width: 28, borderRadius: 99 },
});
