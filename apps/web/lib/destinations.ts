const KEY = "sg-busflow:recent-destinations";

export type RecentDestination = {
  label: string;
  lat: number;
  lng: number;
  stopCode?: string;
  at: number;
};

export function readDestinations(): RecentDestination[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as RecentDestination[]) : [];
  } catch {
    return [];
  }
}

export function pushDestination(place: Omit<RecentDestination, "at">) {
  const next = [
    { ...place, at: Date.now() },
    ...readDestinations().filter((item) => {
      if (place.stopCode && item.stopCode) return item.stopCode !== place.stopCode;
      return item.label.toLowerCase() !== place.label.toLowerCase();
    }),
  ].slice(0, 6);
  window.localStorage.setItem(KEY, JSON.stringify(next));
  return next;
}

export function removeDestination(place: Pick<RecentDestination, "label" | "lat" | "stopCode">) {
  const next = readDestinations().filter((item) => {
    if (place.stopCode && item.stopCode) return item.stopCode !== place.stopCode;
    return item.label.toLowerCase() !== place.label.toLowerCase() || item.lat !== place.lat;
  });
  window.localStorage.setItem(KEY, JSON.stringify(next));
  return next;
}

export function clearDestinations() {
  window.localStorage.removeItem(KEY);
  return [] as RecentDestination[];
}
