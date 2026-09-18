const KEY = "sg-busflow:recent-searches";

export type RecentSearch = {
  query: string;
  at: number;
};

export function readRecents(): RecentSearch[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as RecentSearch[]) : [];
  } catch {
    return [];
  }
}

export function pushRecent(query: string) {
  const trimmed = query.trim();
  if (!trimmed) return;
  const next = [
    { query: trimmed, at: Date.now() },
    ...readRecents().filter((item) => item.query.toLowerCase() !== trimmed.toLowerCase()),
  ].slice(0, 8);
  window.localStorage.setItem(KEY, JSON.stringify(next));
}

export function clearRecents() {
  window.localStorage.removeItem(KEY);
}
