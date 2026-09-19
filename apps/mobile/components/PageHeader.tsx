import { useRouter } from "expo-router";
import { ArrowLeft } from "lucide-react-native";
import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { IconButton, ThemeToggle } from "@/components/ThemeToggle";
import { usePalette } from "@/lib/theme";

export function PageHeader({
  title,
  extra,
  onBack,
}: {
  title: React.ReactNode;
  extra?: React.ReactNode;
  onBack?: () => void;
}) {
  const palette = usePalette();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "flex-start",
        gap: 12,
        paddingTop: insets.top + 8,
        paddingHorizontal: 16,
        paddingBottom: 8,
        backgroundColor: palette.bg,
      }}
    >
      <IconButton onPress={onBack ?? (() => router.back())}>
        <ArrowLeft size={18} color={palette.ink} strokeWidth={2} />
      </IconButton>
      <View style={{ minWidth: 0, flex: 1 }}>{title}</View>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
        {extra}
        <ThemeToggle />
      </View>
    </View>
  );
}
