import AsyncStorage from "@react-native-async-storage/async-storage";
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { Appearance } from "react-native";

import { Colors, type Palette } from "@/constants/Colors";

export type Theme = "light" | "dark";

const THEME_KEY = "busflow-theme";

type ThemeContextValue = {
  theme: Theme;
  ready: boolean;
  toggle: () => void;
  setTheme: (theme: Theme) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

function applyNativeScheme(theme: Theme) {
  Appearance.setColorScheme?.(theme);
}

export function AppThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>("light");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void AsyncStorage.getItem(THEME_KEY).then((value) => {
      const next: Theme = value === "dark" ? "dark" : "light";
      if (cancelled) return;
      setThemeState(next);
      applyNativeScheme(next);
      setReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const setTheme = useCallback((next: Theme) => {
    setThemeState(next);
    applyNativeScheme(next);
    void AsyncStorage.setItem(THEME_KEY, next);
  }, []);

  const toggle = useCallback(() => {
    setThemeState((current) => {
      const next: Theme = current === "dark" ? "light" : "dark";
      applyNativeScheme(next);
      void AsyncStorage.setItem(THEME_KEY, next);
      return next;
    });
  }, []);

  const value = useMemo(() => ({ theme, ready, toggle, setTheme }), [theme, ready, toggle, setTheme]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const value = useContext(ThemeContext);
  if (!value) {
    throw new Error("useTheme must be used within AppThemeProvider");
  }
  return value;
}

export function usePalette(): Palette {
  const context = useContext(ThemeContext);
  return Colors[context?.theme === "dark" ? "dark" : "light"];
}
