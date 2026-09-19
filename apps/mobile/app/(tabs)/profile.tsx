import { Pressable, Text, View } from "react-native";

import { Card, Muted, Screen, Title } from "@/components/Ui";
import { ThemeToggle } from "@/components/ThemeToggle";
import { usePalette, useTheme } from "@/lib/theme";

export default function ProfileScreen() {
  const palette = usePalette();
  const { theme, setTheme } = useTheme();

  return (
    <Screen>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
        <Title>Profile</Title>
        <ThemeToggle />
      </View>
      <Card>
        <Text style={{ color: palette.ink, fontWeight: "600", fontSize: 16 }}>Accounts come later</Text>
        <View style={{ marginTop: 6 }}>
          <Muted>
            Sign-in is Phase 12. Favorites stay on this phone, and arrivals still come from the same FastAPI + LTA
            data — never invented.
          </Muted>
        </View>
      </Card>
      <Card>
        <Text style={{ color: palette.ink, fontWeight: "600", fontSize: 16 }}>Appearance</Text>
        <View style={{ marginTop: 6 }}>
          <Muted>Light is the default, same as the web app. Switch anytime.</Muted>
        </View>
        <View style={{ flexDirection: "row", gap: 8, marginTop: 12 }}>
          <Pressable
            onPress={() => setTheme("light")}
            style={{
              flex: 1,
              height: 40,
              borderRadius: 999,
              borderWidth: 1,
              borderColor: theme === "light" ? palette.accent : palette.line,
              backgroundColor: theme === "light" ? palette.accent : "transparent",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Text style={{ color: theme === "light" ? palette.onAccent : palette.ink, fontWeight: "600" }}>Light</Text>
          </Pressable>
          <Pressable
            onPress={() => setTheme("dark")}
            style={{
              flex: 1,
              height: 40,
              borderRadius: 999,
              borderWidth: 1,
              borderColor: theme === "dark" ? palette.accent : palette.line,
              backgroundColor: theme === "dark" ? palette.accent : "transparent",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Text style={{ color: theme === "dark" ? palette.onAccent : palette.ink, fontWeight: "600" }}>Dark</Text>
          </Pressable>
        </View>
      </Card>
    </Screen>
  );
}
