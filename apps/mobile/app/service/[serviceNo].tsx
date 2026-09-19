import { useEffect, useState } from "react";
import { Pressable, Text } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { Heart } from "lucide-react-native";
import { Card, Muted, Screen, ScrollView } from "@/components/Ui";
import { fetchService } from "@/lib/api";
import { toggleFavoriteService } from "@/lib/favorites";
import { usePalette } from "@/lib/theme";
import type { ServiceDetailResponse } from "@/lib/types";

export default function ServiceScreen() {
  const { serviceNo } = useLocalSearchParams<{ serviceNo: string }>();
  const palette = usePalette();
  const [service, setService] = useState<ServiceDetailResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!serviceNo) return;
    fetchService(serviceNo)
      .then(setService)
      .catch((err: unknown) => setError(err instanceof Error ? err.message : "Could not load service"));
  }, [serviceNo]);

  const primary = service?.directions[0];

  return (
    <Screen>
      <ScrollView contentContainerStyle={{ padding: 16 }}>
        <Text style={{ color: palette.muted, fontSize: 11, letterSpacing: 1.6 }}>BUS SERVICE</Text>
        <Text style={{ color: palette.ink, fontSize: 36, fontWeight: "700" }}>{serviceNo?.toUpperCase()}</Text>
        {error ? <Muted>{error}</Muted> : null}
        {primary ? (
          <Card>
            <Text style={{ color: palette.ink, fontWeight: "600" }}>{primary.operator}</Text>
            <Muted>{primary.loop_desc ?? `Direction ${primary.direction}`}</Muted>
            <Pressable
              onPress={() =>
                void toggleFavoriteService({
                  service_no: serviceNo.toUpperCase(),
                  operator: primary.operator,
                })
              }
              style={{
                marginTop: 12,
                alignSelf: "flex-start",
                flexDirection: "row",
                alignItems: "center",
                gap: 6,
                borderWidth: 1,
                borderColor: palette.line,
                borderRadius: 999,
                paddingHorizontal: 12,
                height: 36,
              }}
            >
              <Heart color={palette.accent} size={14} />
              <Text style={{ color: palette.ink }}>Save service</Text>
            </Pressable>
          </Card>
        ) : null}
      </ScrollView>
    </Screen>
  );
}
