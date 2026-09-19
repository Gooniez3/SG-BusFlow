import { useEffect, useState } from "react";
import { Text, View } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { Card, Muted, Screen, ScrollView, ServiceRow } from "@/components/Ui";
import { fetchArrivals, fetchStop } from "@/lib/api";
import { loadCopy, relativeUpdated } from "@/lib/format";
import { usePalette } from "@/lib/theme";
import type { Stop, StopArrivalsResponse } from "@/lib/types";

export default function LiveScreen() {
  const { serviceNo, stop: stopCode } = useLocalSearchParams<{ serviceNo: string; stop?: string }>();
  const palette = usePalette();
  const [stop, setStop] = useState<Stop | null>(null);
  const [arrivals, setArrivals] = useState<StopArrivalsResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const service = arrivals?.services.find((item) => item.service_no === serviceNo?.toUpperCase());

  useEffect(() => {
    if (!stopCode) {
      setError("Choose a stop first");
      return;
    }
    let cancelled = false;
    Promise.all([fetchStop(stopCode), fetchArrivals(stopCode)])
      .then(([stopData, arrivalData]) => {
        if (cancelled) return;
        setStop(stopData);
        setArrivals(arrivalData);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Could not load live bus");
      });
    return () => {
      cancelled = true;
    };
  }, [stopCode]);

  return (
    <Screen>
      <ScrollView contentContainerStyle={{ padding: 16 }}>
        <Text style={{ color: palette.muted, fontSize: 11, letterSpacing: 1.6 }}>LIVE BUS</Text>
        <Text style={{ color: palette.ink, fontSize: 36, fontWeight: "700", fontVariant: ["tabular-nums"] }}>
          {serviceNo?.toUpperCase()}
        </Text>
        <Muted>{arrivals ? `Updated ${relativeUpdated(arrivals.cached_at) ?? ""}` : ""}</Muted>
        {error ? <Muted>{error}</Muted> : null}
        {service ? (
          <Card>
            <ServiceRow service={service} />
            <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 8 }}>
              <Muted>
                Next stop <Text style={{ color: palette.ink, fontWeight: "600" }}>{stop?.name}</Text>
              </Muted>
              <Muted>{loadCopy(service.arrivals[0]?.load)}</Muted>
            </View>
          </Card>
        ) : (
          <Muted>No live arrival for this service right now.</Muted>
        )}
      </ScrollView>
    </Screen>
  );
}
