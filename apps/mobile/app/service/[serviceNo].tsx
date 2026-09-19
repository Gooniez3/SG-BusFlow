import { useEffect, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Heart } from "lucide-react-native";

import { PageHeader } from "@/components/PageHeader";
import { Card, Muted } from "@/components/Ui";
import { fetchService } from "@/lib/api";
import { toggleFavoriteService } from "@/lib/favorites";
import { usePalette } from "@/lib/theme";
import type { ServiceDetailResponse } from "@/lib/types";

export default function ServiceScreen() {
  const { serviceNo } = useLocalSearchParams<{ serviceNo: string }>();
  const palette = usePalette();
  const router = useRouter();
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
    <View style={{ flex: 1, backgroundColor: palette.bg }}>
      <PageHeader
        onBack={() => router.back()}
        title={
          <View>
            <Text style={{ color: palette.muted, fontSize: 11, letterSpacing: 1.6, fontWeight: "500" }}>BUS SERVICE</Text>
            <Text style={{ color: palette.ink, fontSize: 32, fontWeight: "700", letterSpacing: -0.8 }}>
              {serviceNo?.toUpperCase()}
            </Text>
          </View>
        }
      />
      <ScrollView contentContainerStyle={{ padding: 16, gap: 16 }}>
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
              <Heart color={palette.accent} size={14} strokeWidth={2} />
              <Text style={{ color: palette.ink }}>Save service</Text>
            </Pressable>
          </Card>
        ) : null}
      </ScrollView>
    </View>
  );
}
