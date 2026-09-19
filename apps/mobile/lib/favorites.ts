import AsyncStorage from "@react-native-async-storage/async-storage";

const STOPS_KEY = "sg-busflow:favorite-stops";
const SERVICES_KEY = "sg-busflow:favorite-services";

export type FavoriteStop = {
  code: string;
  name: string;
  road_name: string | null;
};

export type FavoriteService = {
  service_no: string;
  operator?: string | null;
};

async function readJson<T>(key: string): Promise<T[]> {
  try {
    const raw = await AsyncStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T[]) : [];
  } catch {
    return [];
  }
}

export function readFavorites() {
  return readJson<FavoriteStop>(STOPS_KEY);
}

export function readFavoriteServices() {
  return readJson<FavoriteService>(SERVICES_KEY);
}

export async function toggleFavorite(stop: FavoriteStop) {
  const current = await readFavorites();
  const exists = current.some((item) => item.code === stop.code);
  const next = exists ? current.filter((item) => item.code !== stop.code) : [stop, ...current];
  await AsyncStorage.setItem(STOPS_KEY, JSON.stringify(next));
  return next;
}

export async function isFavorite(code: string) {
  const current = await readFavorites();
  return current.some((item) => item.code === code);
}

export async function toggleFavoriteService(service: FavoriteService) {
  const current = await readFavoriteServices();
  const exists = current.some((item) => item.service_no === service.service_no);
  const next = exists
    ? current.filter((item) => item.service_no !== service.service_no)
    : [service, ...current];
  await AsyncStorage.setItem(SERVICES_KEY, JSON.stringify(next));
  return next;
}
