import { useEffect, useState } from "react";
import { Text, View } from "react-native";
import { Radio } from "lucide-react-native";

import { relativeUpdated } from "@/lib/format";
import type { LiveStatus } from "@/lib/live";
import { usePalette } from "@/lib/theme";

function badgeCopy(status?: LiveStatus, stale?: boolean) {
  if (status === "connecting") return "Connecting";
  if (status === "reconnecting") return "Reconnecting";
  if (status === "offline") return "Offline";
  if (stale) return "Delayed";
  return "Live";
}

export function LiveBadge({
  cachedAt,
  stale,
  status,
}: {
  cachedAt?: string | null;
  stale?: boolean;
  status?: LiveStatus;
}) {
  const palette = usePalette();
  const [freshness, setFreshness] = useState<string | null>(null);
  const delayed = Boolean(stale) || status === "offline" || status === "reconnecting";
  const label = badgeCopy(status, stale);

  useEffect(() => {
    setFreshness(relativeUpdated(cachedAt));
    const timer = setInterval(() => {
      setFreshness(relativeUpdated(cachedAt));
    }, 15000);
    return () => clearInterval(timer);
  }, [cachedAt]);

  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
      <Radio size={12} color={delayed ? palette.warn : palette.live} strokeWidth={2.4} />
      <Text
        style={{
          color: palette.muted,
          fontSize: 11,
          fontWeight: "500",
          letterSpacing: 1.4,
          textTransform: "uppercase",
        }}
      >
        {label}
      </Text>
      {freshness ? (
        <Text style={{ color: palette.muted, fontSize: 12 }}>Updated {freshness}</Text>
      ) : null}
    </View>
  );
}
