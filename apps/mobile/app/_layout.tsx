import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from "expo-router";
import { StatusBar } from "expo-status-bar";
import "react-native-reanimated";

import { AppThemeProvider, useTheme } from "@/lib/theme";
import { NotifyWatcher } from "@/components/NotifyWatcher";

export { ErrorBoundary } from "expo-router";

export const unstable_settings = {
  initialRouteName: "(tabs)",
};

function RootStack() {
  const { theme } = useTheme();
  const dark = theme === "dark";

  return (
    <ThemeProvider value={dark ? DarkTheme : DefaultTheme}>
      <StatusBar style={dark ? "light" : "dark"} />
      <Stack screenOptions={{ headerShown: false, headerBackTitle: "Back" }}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="stop/[code]" options={{ headerShown: false }} />
        <Stack.Screen name="live/[serviceNo]" options={{ headerShown: false }} />
        <Stack.Screen name="service/[serviceNo]" options={{ headerShown: false }} />
        <Stack.Screen name="plan" options={{ headerShown: false }} />
        <Stack.Screen name="plan-detail" options={{ headerShown: false }} />
      </Stack>
    </ThemeProvider>
  );
}

export default function RootLayout() {
  return (
    <AppThemeProvider>
      <NotifyWatcher />
      <RootStack />
    </AppThemeProvider>
  );
}
