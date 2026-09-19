import { Link, Stack } from "expo-router";
import { Text, View } from "react-native";
import { usePalette } from "@/lib/theme";

export default function NotFoundScreen() {
  const palette = usePalette();
  return (
    <>
      <Stack.Screen options={{ title: "Not found" }} />
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: palette.bg, padding: 24 }}>
        <Text style={{ color: palette.ink, fontSize: 18, fontWeight: "600" }}>This screen doesn't exist.</Text>
        <Link href="/" style={{ marginTop: 16 }}>
          <Text style={{ color: palette.accent, fontWeight: "600" }}>Back to nearby</Text>
        </Link>
      </View>
    </>
  );
}
