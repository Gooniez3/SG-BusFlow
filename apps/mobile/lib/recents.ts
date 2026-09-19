import AsyncStorage from "@react-native-async-storage/async-storage";

const KEY = "sg-busflow:recent-searches";

export type RecentSearch = {
  query: string;
  at: number;
};

export async function readRecents(): Promise<RecentSearch[]> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as RecentSearch[]) : [];
  } catch {
    return [];
  }
}

export async function pushRecent(query: string) {
  const trimmed = query.trim();
  if (!trimmed) return readRecents();
  const current = await readRecents();
  const next = [
    { query: trimmed, at: Date.now() },
    ...current.filter((item) => item.query.toLowerCase() !== trimmed.toLowerCase()),
  ].slice(0, 8);
  await AsyncStorage.setItem(KEY, JSON.stringify(next));
  return next;
}

export async function clearRecents() {
  await AsyncStorage.removeItem(KEY);
}
