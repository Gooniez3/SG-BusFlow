import { Moon, Sun } from "lucide-react-native";
import { Pressable } from "react-native";

import { usePalette, useTheme } from "@/lib/theme";

export function ThemeToggle() {
  const palette = usePalette();
  const { theme, toggle } = useTheme();
  const dark = theme === "dark";

  return (
    <Pressable
      onPress={toggle}
      accessibilityLabel={dark ? "Switch to light theme" : "Switch to dark theme"}
      style={{
        width: 36,
        height: 36,
        borderRadius: 18,
        borderWidth: 1,
        borderColor: palette.line,
        backgroundColor: palette.card,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {dark ? <Sun size={16} color={palette.ink} strokeWidth={2} /> : <Moon size={16} color={palette.ink} strokeWidth={2} />}
    </Pressable>
  );
}

export function IconButton({
  onPress,
  children,
}: {
  onPress: () => void;
  children: React.ReactNode;
}) {
  const palette = usePalette();
  return (
    <Pressable
      onPress={onPress}
      style={{
        width: 40,
        height: 40,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: palette.line,
        backgroundColor: palette.card,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {children}
    </Pressable>
  );
}
