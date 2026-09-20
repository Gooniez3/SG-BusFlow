import { useRouter } from "expo-router";
import { Platform, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { usePalette } from "@/lib/theme";
import { arrivalShort, loadBarColor } from "@/lib/format";
import type { Arrival, ServiceArrivals } from "@/lib/types";

const mono = Platform.OS === "ios" ? "Menlo" : "monospace";

export function Screen({
  children,
  padded = true,
  refreshing = false,
  onRefresh,
  keyboardShouldPersistTaps,
}: {
  children: React.ReactNode;
  padded?: boolean;
  refreshing?: boolean;
  onRefresh?: () => void;
  keyboardShouldPersistTaps?: "always" | "handled" | "never";
}) {
  const palette = usePalette();
  const insets = useSafeAreaInsets();
  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: palette.bg }}
      keyboardShouldPersistTaps={keyboardShouldPersistTaps}
      refreshControl={
        onRefresh ? <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={palette.muted} /> : undefined
      }
      contentContainerStyle={{
        paddingTop: insets.top + 8,
        paddingHorizontal: padded ? 16 : 0,
        paddingBottom: 32,
        gap: 16,
      }}
    >
      {children}
    </ScrollView>
  );
}

export function Title({ children }: { children: string }) {
  const palette = usePalette();
  return (
    <Text style={{ color: palette.ink, fontSize: 24, fontWeight: "600", letterSpacing: -0.4 }}>{children}</Text>
  );
}

export function Muted({ children }: { children: React.ReactNode }) {
  const palette = usePalette();
  return <Text style={{ color: palette.muted, fontSize: 14, lineHeight: 20 }}>{children}</Text>;
}

export function SectionLabel({ children }: { children: React.ReactNode }) {
  const palette = usePalette();
  return (
    <Text
      style={{
        color: palette.muted,
        fontSize: 11,
        fontWeight: "500",
        letterSpacing: 1.8,
        textTransform: "uppercase",
      }}
    >
      {children}
    </Text>
  );
}

export function Card({
  children,
  padded = true,
  onPress,
  selected = false,
}: {
  children: React.ReactNode;
  padded?: boolean;
  onPress?: () => void;
  selected?: boolean;
}) {
  const palette = usePalette();
  const style = {
    backgroundColor: palette.card,
    borderColor: selected ? palette.accent : palette.line,
    borderWidth: 1,
    borderRadius: 12,
    padding: padded ? 12 : 0,
    overflow: "hidden" as const,
  };
  if (onPress) {
    return (
      <Pressable onPress={onPress} style={style}>
        {children}
      </Pressable>
    );
  }
  return <View style={style}>{children}</View>;
}

export function EmptyState({ title, detail }: { title: string; detail?: string }) {
  const palette = usePalette();
  return (
    <View
      style={{
        backgroundColor: palette.card,
        borderColor: palette.line,
        borderWidth: 1,
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 24,
      }}
    >
      <Text style={{ color: palette.ink, fontWeight: "600", fontSize: 16 }}>{title}</Text>
      {detail ? (
        <Text style={{ color: palette.muted, fontSize: 14, marginTop: 4, lineHeight: 20 }}>{detail}</Text>
      ) : null}
    </View>
  );
}

export function Mono({
  children,
  size = 15,
  weight = "600",
  color,
}: {
  children: React.ReactNode;
  size?: number;
  weight?: "500" | "600" | "700";
  color?: string;
}) {
  const palette = usePalette();
  return (
    <Text
      style={{
        color: color ?? palette.ink,
        fontFamily: mono,
        fontSize: size,
        fontWeight: weight,
        fontVariant: ["tabular-nums"],
      }}
    >
      {children}
    </Text>
  );
}

export function ServiceRow({
  service,
  stopCode,
  linked = true,
}: {
  service: ServiceArrivals;
  stopCode?: string;
  linked?: boolean;
}) {
  const palette = usePalette();
  const router = useRouter();
  const destination = service.arrivals[0]?.destination_name ?? service.operator;
  const slots: (Arrival | null)[] = [service.arrivals[0] ?? null, service.arrivals[1] ?? null, service.arrivals[2] ?? null];

  const body = (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        minHeight: 40,
        paddingVertical: 6,
        paddingHorizontal: 8,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: palette.line,
      }}
    >
      <View style={{ flex: 1, minWidth: 0 }}>
        <Mono size={15}>{service.service_no}</Mono>
        <Text numberOfLines={1} style={{ color: palette.muted, fontSize: 11, marginTop: 1 }}>
          {destination}
        </Text>
      </View>
      <View
        style={{
          width: 140,
          flexDirection: "row",
          overflow: "hidden",
          borderRadius: 6,
          borderWidth: 1,
          borderColor: palette.line,
          backgroundColor: palette.card,
        }}
      >
        {slots.map((arrival, index) => {
          const label = arrival ? arrivalShort(arrival.minutes) : null;
          const here = label === "Here";
          return (
            <View
              key={`${service.service_no}-${index}`}
              style={{
                flex: 1,
                alignItems: "center",
                justifyContent: "center",
                paddingVertical: 4,
                borderLeftWidth: index === 0 ? 0 : 1,
                borderLeftColor: palette.line,
              }}
            >
              <Text
                style={{
                  color: here ? palette.warn : palette.ink,
                  fontSize: 13,
                  fontWeight: "500",
                  fontVariant: ["tabular-nums"],
                }}
              >
                {label ?? "—"}
              </Text>
              {arrival ? (
                <View
                  style={{
                    marginTop: 3,
                    height: 2,
                    width: 22,
                    borderRadius: 99,
                    backgroundColor: loadBarColor(arrival.load),
                  }}
                />
              ) : (
                <View style={{ marginTop: 3, height: 2, width: 22 }} />
              )}
            </View>
          );
        })}
      </View>
    </View>
  );

  if (!linked || !stopCode) {
    return body;
  }

  return (
    <Pressable
      onPress={() => {
        router.push({ pathname: "/live/[serviceNo]", params: { serviceNo: service.service_no, stop: stopCode } });
      }}
    >
      {body}
    </Pressable>
  );
}
