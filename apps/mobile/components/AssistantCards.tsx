import { useRouter } from "expo-router";
import { ChevronRight } from "lucide-react-native";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { assistantHref } from "@/lib/ai-context";
import { transferLabel } from "@/lib/journey";
import { usePalette } from "@/lib/theme";
import type { AssistantCard } from "@/lib/types";

export function AssistantCards({ cards }: { cards: AssistantCard[] }) {
  const palette = usePalette();
  const router = useRouter();
  if (!cards.length) return null;
  return (
    <View
      style={{
        alignSelf: "stretch",
        overflow: "hidden",
        borderRadius: 16,
        borderWidth: 1,
        borderColor: palette.line,
        backgroundColor: palette.card,
      }}
    >
      {cards.map((card, index) => {
        const href = assistantHref(card.href);
        const summary = card.subtitle?.split(" · Next bus")[0];
        const body =
          card.kind === "journey" ? (
            <View>
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "baseline" }}>
                <Text>
                  <Text style={{ color: palette.ink, fontSize: 22, fontWeight: "600" }}>{card.duration_min}</Text>
                  <Text style={{ color: palette.muted, fontSize: 14 }}> min</Text>
                </Text>
                {card.transfers != null ? (
                  <Text style={{ color: palette.muted, fontSize: 11, fontWeight: "600" }}>{transferLabel(card.transfers)}</Text>
                ) : null}
              </View>
              {summary ? (
                <Text style={{ color: palette.ink, marginTop: 4, fontSize: 14, lineHeight: 20 }}>{summary}</Text>
              ) : null}
              {card.live_minutes != null ? (
                <Text style={{ color: palette.live, marginTop: 4, fontSize: 12, fontWeight: "600" }}>
                  Next bus {card.live_minutes <= 0 ? "arriving" : `${card.live_minutes} min`}
                </Text>
              ) : null}
              <Text style={{ color: palette.accent, marginTop: 8, fontSize: 12, fontWeight: "600" }}>View journey</Text>
            </View>
          ) : (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text
                  style={{
                    color: palette.ink,
                    fontWeight: "600",
                    fontSize: 16,
                    fontFamily: card.kind === "service" || card.kind === "live_bus" ? "monospace" : undefined,
                  }}
                >
                  {card.title}
                </Text>
                {card.subtitle ? (
                  <Text style={{ color: palette.muted, marginTop: 2, fontSize: 13 }}>{card.subtitle}</Text>
                ) : null}
              </View>
              {href ? <ChevronRight size={16} color={palette.muted} strokeWidth={2} /> : null}
            </View>
          );
        const rowStyle = {
          paddingHorizontal: 14,
          paddingVertical: card.kind === "journey" ? 12 : 11,
          borderTopWidth: index === 0 ? 0 : StyleSheet.hairlineWidth,
          borderTopColor: palette.line,
        };
        if (!href) {
          return (
            <View key={`${card.kind}-${index}`} style={rowStyle}>
              {body}
            </View>
          );
        }
        return (
          <Pressable key={`${card.kind}-${index}`} onPress={() => router.push(href as never)} style={rowStyle}>
            {body}
          </Pressable>
        );
      })}
    </View>
  );
}
