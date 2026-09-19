import { useColorScheme } from "react-native";
import { Colors, type Palette } from "@/constants/Colors";

export function usePalette(): Palette {
  const scheme = useColorScheme() === "dark" ? "dark" : "light";
  return Colors[scheme];
}
