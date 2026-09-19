export const Colors = {
  light: {
    bg: "#F7F9FC",
    card: "#FFFFFF",
    ink: "#0F172A",
    muted: "#64748B",
    line: "#E2E8F0",
    accent: "#0F9D8A",
    live: "#16A34A",
    warn: "#F59E0B",
    tabBar: "#FFFFFF",
  },
  dark: {
    bg: "#0B1220",
    card: "#141C2B",
    ink: "#F1F5F9",
    muted: "#94A3B8",
    line: "#243044",
    accent: "#2DD4BF",
    live: "#4ADE80",
    warn: "#FBBF24",
    tabBar: "#141C2B",
  },
};

export type Palette = (typeof Colors)["light"];
