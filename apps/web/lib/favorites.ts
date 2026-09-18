const STOPS_KEY = "sg-busflow:favorite-stops";
const SERVICES_KEY = "sg-busflow:favorite-services";
const LABELS_KEY = "sg-busflow:place-labels";

export type FavoriteStop = {
  code: string;
  name: string;
  road_name: string | null;
};

export type FavoriteService = {
  service_no: string;
  operator?: string | null;
};

export type PlaceLabels = {
  home?: string;
  work?: string;
};

function readJson<T>(key: string): T[] {
  if (typeof window === "undefined") {
    return [];
  }
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T[]) : [];
  } catch {
    return [];
  }
}

export function readFavorites(): FavoriteStop[] {
  return readJson<FavoriteStop>(STOPS_KEY);
}

export function writeFavorites(favorites: FavoriteStop[]) {
  window.localStorage.setItem(STOPS_KEY, JSON.stringify(favorites));
}

export function isFavorite(code: string): boolean {
  return readFavorites().some((stop) => stop.code === code);
}

export function toggleFavorite(stop: FavoriteStop): FavoriteStop[] {
  const current = readFavorites();
  const exists = current.some((item) => item.code === stop.code);
  const next = exists ? current.filter((item) => item.code !== stop.code) : [stop, ...current];
  writeFavorites(next);
  return next;
}

export function readFavoriteServices(): FavoriteService[] {
  return readJson<FavoriteService>(SERVICES_KEY);
}

export function isFavoriteService(serviceNo: string): boolean {
  return readFavoriteServices().some((item) => item.service_no === serviceNo);
}

export function toggleFavoriteService(service: FavoriteService): FavoriteService[] {
  const current = readFavoriteServices();
  const exists = current.some((item) => item.service_no === service.service_no);
  const next = exists
    ? current.filter((item) => item.service_no !== service.service_no)
    : [service, ...current];
  window.localStorage.setItem(SERVICES_KEY, JSON.stringify(next));
  return next;
}

export function moveFavorite(code: string, direction: -1 | 1): FavoriteStop[] {
  const current = readFavorites();
  const index = current.findIndex((item) => item.code === code);
  const nextIndex = index + direction;
  if (index < 0 || nextIndex < 0 || nextIndex >= current.length) return current;
  const next = [...current];
  const [item] = next.splice(index, 1);
  next.splice(nextIndex, 0, item);
  writeFavorites(next);
  return next;
}

export function readPlaceLabels(): PlaceLabels {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(LABELS_KEY);
    return raw ? (JSON.parse(raw) as PlaceLabels) : {};
  } catch {
    return {};
  }
}

export function setPlaceLabel(kind: "home" | "work", code: string | null) {
  const current = readPlaceLabels();
  const next = { ...current, [kind]: code ?? undefined };
  window.localStorage.setItem(LABELS_KEY, JSON.stringify(next));
  return next;
}
