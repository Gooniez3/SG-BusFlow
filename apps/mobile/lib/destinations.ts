import AsyncStorage from "@react-native-async-storage/async-storage";

const KEY = "sg-busflow:recent-destinations";

export type RecentDestination = {
  label: string;
  lat: number;
  lng: number;
  stopCode?: string;
  at: number;
};

export async function readDestinations(): Promise<RecentDestination[]> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as RecentDestination[]) : [];
  } catch {
    return [];
  }
}

export async function pushDestination(place: Omit<RecentDestination, "at">) {
  const current = await readDestinations();
  const next = [
    { ...place, at: Date.now() },
    ...current.filter((item) => {
      if (place.stopCode && item.stopCode) return item.stopCode !== place.stopCode;
      return item.label.toLowerCase() !== place.label.toLowerCase();
    }),
  ].slice(0, 6);
  await AsyncStorage.setItem(KEY, JSON.stringify(next));
  return next;
}

export async function removeDestination(place: Pick<RecentDestination, "label" | "lat" | "stopCode">) {
  const current = await readDestinations();
  const next = current.filter((item) => {
    if (place.stopCode && item.stopCode) return item.stopCode !== place.stopCode;
    return item.label.toLowerCase() !== place.label.toLowerCase() || item.lat !== place.lat;
  });
  await AsyncStorage.setItem(KEY, JSON.stringify(next));
  return next;
}

export async function clearDestinations() {
  await AsyncStorage.removeItem(KEY);
  return [] as RecentDestination[];
}
