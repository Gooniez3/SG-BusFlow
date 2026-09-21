import { useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { ArrowUp, Sparkles } from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AssistantCards } from "@/components/AssistantCards";
import { ProfileButton, ThemeToggle } from "@/components/ThemeToggle";
import { Card, Muted, Title } from "@/components/Ui";
import { readAiContext, type StoredAiContext } from "@/lib/ai-context";
import { fetchAssistantStatus, postAssistantChat } from "@/lib/api";
import { requestUserLocation } from "@/lib/location";
import { usePalette } from "@/lib/theme";
import type { AssistantCard, AssistantContext } from "@/lib/types";
import type { Palette } from "@/constants/Colors";

type ChatItem = {
  role: "user" | "assistant";
  content: string;
  cards?: AssistantCard[];
};

const BASE_CHIPS = [
  "Find buses near me",
  "How do I get to Changi Airport?",
  "When is the next 230?",
];

const SETUP_DETAIL =
  "Add GROQ_API_KEY or GEMINI_API_KEY to backend/api/.env, then restart the API. Nearby, search, and journeys still work.";

function AiMark({ palette }: { palette: Palette }) {
  return (
    <View
      style={{
        marginTop: 2,
        width: 28,
        height: 28,
        borderRadius: 8,
        backgroundColor: palette.accentSoft,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Sparkles size={14} color={palette.accent} strokeWidth={2.2} />
    </View>
  );
}

function ThinkingDots({ color }: { color: string }) {
  const a = useRef(new Animated.Value(0.28)).current;
  const b = useRef(new Animated.Value(0.28)).current;
  const c = useRef(new Animated.Value(0.28)).current;

  useEffect(() => {
    const values = [a, b, c];
    const loops = values.map((value, index) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(index * 160),
          Animated.timing(value, { toValue: 1, duration: 280, useNativeDriver: true }),
          Animated.timing(value, { toValue: 0.28, duration: 280, useNativeDriver: true }),
          Animated.delay(240),
        ]),
      ),
    );
    loops.forEach((loop) => loop.start());
    return () => loops.forEach((loop) => loop.stop());
  }, [a, b, c]);

  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 5, height: 18 }}>
      {[a, b, c].map((opacity, index) => (
        <Animated.View
          key={index}
          style={{
            width: 6,
            height: 6,
            borderRadius: 3,
            backgroundColor: color,
            opacity,
          }}
        />
      ))}
    </View>
  );
}

export default function AiScreen() {
  const palette = usePalette();
  const insets = useSafeAreaInsets();
  const scroller = useRef<ScrollView>(null);
  const [items, setItems] = useState<ChatItem[]>([]);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState<boolean | null>(null);
  const [stored, setStored] = useState<StoredAiContext>({});
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    void readAiContext().then(setStored);
    void requestUserLocation().then((location) => setCoords({ lat: location.lat, lng: location.lng }));
    fetchAssistantStatus()
      .then((status) => setReady(status.ready))
      .catch(() => setReady(false));
  }, []);

  const context = useMemo<AssistantContext>(() => {
    const payload: AssistantContext = { ...stored };
    if (coords) {
      payload.lat = coords.lat;
      payload.lng = coords.lng;
    }
    return payload;
  }, [coords, stored]);

  const chips = useMemo(() => {
    const next = [...BASE_CHIPS];
    if (stored.journey) next.push("Explain my current journey");
    return next;
  }, [stored.journey]);

  async function send(text: string) {
    const content = text.trim();
    if (!content || busy || ready === false) return;
    const previous = items;
    const nextItems: ChatItem[] = [...items, { role: "user", content }];
    setItems(nextItems);
    setDraft("");
    setBusy(true);
    try {
      const result = await postAssistantChat(
        nextItems.map((item) => ({ role: item.role, content: item.content })),
        context,
      );
      setReady(true);
      setItems([...nextItems, { role: "assistant", content: result.reply, cards: result.cards }]);
    } catch (err) {
      const message = err instanceof Error ? err.message : "BusFlow AI is unavailable right now.";
      if (message.includes("API_KEY")) {
        setReady(false);
        setItems(previous);
        return;
      }
      setItems([...nextItems, { role: "assistant", content: message }]);
    } finally {
      setBusy(false);
      requestAnimationFrame(() => scroller.current?.scrollToEnd({ animated: true }));
    }
  }

  const chatting = items.length > 0;

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: palette.bg }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View
        style={{
          paddingTop: insets.top + 8,
          paddingHorizontal: 16,
          paddingBottom: 12,
          flexDirection: "row",
          alignItems: "center",
          gap: 10,
          borderBottomWidth: StyleSheet.hairlineWidth,
          borderBottomColor: palette.line,
          backgroundColor: palette.card,
        }}
      >
        <View
          style={{
            width: 32,
            height: 32,
            borderRadius: 10,
            backgroundColor: palette.accentSoft,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Sparkles size={16} color={palette.accent} strokeWidth={2.2} />
        </View>
        <Title>AI</Title>
        <View style={{ flex: 1 }} />
        <ProfileButton />
        <ThemeToggle />
      </View>
      <ScrollView
        ref={scroller}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 20, gap: 18 }}
        style={{ flex: 1 }}
      >
        {ready === false ? (
          <Card>
            <View
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                backgroundColor: palette.accentSoft,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Sparkles size={18} color={palette.accent} strokeWidth={2} />
            </View>
            <Text style={{ color: palette.ink, fontWeight: "600", fontSize: 16, marginTop: 12 }}>AI needs a server key</Text>
            <View style={{ marginTop: 6 }}>
              <Muted>{SETUP_DETAIL}</Muted>
            </View>
          </Card>
        ) : chatting ? (
          items.map((item, index) =>
            item.role === "user" ? (
              <View key={`user-${index}`} style={{ alignItems: "flex-end" }}>
                <View
                  style={{
                    maxWidth: "82%",
                    borderRadius: 20,
                    borderBottomRightRadius: 6,
                    paddingHorizontal: 14,
                    paddingVertical: 10,
                    backgroundColor: palette.accent,
                  }}
                >
                  <Text style={{ color: palette.onAccent, fontSize: 15, lineHeight: 22 }}>{item.content}</Text>
                </View>
              </View>
            ) : (
              <View key={`assistant-${index}`} style={{ flexDirection: "row", alignItems: "flex-start", gap: 8 }}>
                <AiMark palette={palette} />
                <View style={{ flex: 1, minWidth: 0, gap: 8 }}>
                  {item.content ? (
                    <View
                      style={{
                        alignSelf: "flex-start",
                        maxWidth: "100%",
                        borderRadius: 20,
                        borderBottomLeftRadius: 6,
                        borderWidth: 1,
                        borderColor: palette.line,
                        backgroundColor: palette.card,
                        paddingHorizontal: 14,
                        paddingVertical: 10,
                      }}
                    >
                      <Text style={{ color: palette.ink, fontSize: 15, lineHeight: 22 }}>{item.content}</Text>
                    </View>
                  ) : null}
                  {item.cards?.length ? <AssistantCards cards={item.cards} /> : null}
                </View>
              </View>
            ),
          )
        ) : (
          <Card>
            <Text style={{ color: palette.ink, fontWeight: "600", fontSize: 16 }}>Ask BusFlow</Text>
            <View style={{ marginTop: 4 }}>
              <Muted>Ask a question. I’ll look up live BusFlow data and answer here.</Muted>
            </View>
          </Card>
        )}
        {busy ? (
          <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 8 }}>
            <AiMark palette={palette} />
            <View
              style={{
                borderRadius: 20,
                borderBottomLeftRadius: 6,
                borderWidth: 1,
                borderColor: palette.line,
                backgroundColor: palette.card,
                paddingHorizontal: 16,
                paddingVertical: 12,
              }}
            >
              <ThinkingDots color={palette.accent} />
            </View>
          </View>
        ) : null}
      </ScrollView>
      <View
        style={{
          paddingTop: 8,
          paddingBottom: 10,
          borderTopWidth: StyleSheet.hairlineWidth,
          borderTopColor: palette.line,
          backgroundColor: palette.bg,
          gap: 8,
        }}
      >
        {ready !== false ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}
            keyboardShouldPersistTaps="handled"
          >
            {chips.map((chip) => (
              <Pressable
                key={chip}
                disabled={busy}
                onPress={() => void send(chip)}
                style={{
                  borderRadius: 999,
                  borderWidth: 1,
                  borderColor: palette.line,
                  backgroundColor: palette.card,
                  paddingHorizontal: 12,
                  paddingVertical: 8,
                  opacity: busy ? 0.5 : 1,
                }}
              >
                <Text style={{ color: palette.ink, fontSize: 12 }}>{chip}</Text>
              </Pressable>
            ))}
          </ScrollView>
        ) : null}
        <View style={{ position: "relative", marginHorizontal: 16 }}>
          <TextInput
            value={draft}
            editable={!busy && ready !== false}
            onChangeText={setDraft}
            placeholder={ready === false ? "AI is waiting for a server key" : "Ask about a bus, stop, or journey"}
            placeholderTextColor={palette.muted}
            onSubmitEditing={() => void send(draft)}
            returnKeyType="send"
            style={{
              height: 50,
              borderRadius: 25,
              borderWidth: 1,
              borderColor: palette.line,
              backgroundColor: palette.card,
              color: palette.ink,
              paddingHorizontal: 18,
              paddingRight: 52,
              fontSize: 15,
            }}
          />
          <Pressable
            onPress={() => void send(draft)}
            disabled={busy || ready === false || !draft.trim()}
            style={{
              position: "absolute",
              right: 6,
              top: 6,
              width: 38,
              height: 38,
              borderRadius: 19,
              backgroundColor: palette.accent,
              alignItems: "center",
              justifyContent: "center",
              opacity: busy || ready === false || !draft.trim() ? 0.4 : 1,
            }}
          >
            <ArrowUp size={16} color={palette.onAccent} strokeWidth={2.4} />
          </Pressable>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}
