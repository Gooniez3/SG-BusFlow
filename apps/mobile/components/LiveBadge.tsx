import { useEffect, useState } from "react";
import { Text, View } from "react-native";
import { Radio } from "lucide-react-native";

import { relativeUpdated } from "@/lib/format";
import { usePalette } from "@/lib/theme";

export function LiveBadge({
  cachedAt,
  stale,
}: {
  cachedAt?: string | null;
  stale?: boolean;
}) {
  const palette = usePalette();
  const [freshness, setFreshness] = useState<string | null>(null);

  useEffect(() => {
    setFreshness(relativeUpdated(cachedAt));
    const timer = setInterval(() => {
      setFreshness(relativeUpdated(cachedAt));
    }, 15000);
    return () => clearInterval(timer);
  }, [cachedAt]);

  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
      <Radio size={12} color={stale ? palette.warn : palette.live} strokeWidth={2.4} />
      <Text
        style={{
          color: palette.muted,
          fontSize: 11,
          fontWeight: "500",
          letterSpacing: 1.4,
          textTransform: "uppercase",
        }}
      >
        {stale ? "Delayed" : "Live"}
      </Text>
      {freshness ? (
        <Text style={{ color: palette.muted, fontSize: 12 }}>Updated {freshness}</Text>
      ) : null}
    </View>
  );
}
