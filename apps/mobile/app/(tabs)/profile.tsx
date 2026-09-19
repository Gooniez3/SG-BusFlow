import { Text } from "react-native";
import { Card, Muted, Screen, ScrollView, Title } from "@/components/Ui";
import { usePalette } from "@/lib/theme";

export default function ProfileScreen() {
  const palette = usePalette();
  return (
    <Screen>
      <ScrollView contentContainerStyle={{ padding: 16 }}>
        <Title>Profile</Title>
        <Card>
          <Text style={{ color: palette.ink, fontWeight: "600" }}>Accounts come later</Text>
          <Muted>
            Sign-in is Phase 12. Favorites stay on this phone, and arrivals still come from the same FastAPI + LTA
            data — never invented.
          </Muted>
        </Card>
      </ScrollView>
    </Screen>
  );
}
