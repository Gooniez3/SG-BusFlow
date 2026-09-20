import type {
  JourneyPlanResponse,
  NearbyResponse,
  ServiceDetailResponse,
  ServiceSearchItem,
  Stop,
  StopArrivalsResponse,
} from "./types";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000";

async function getJson<T>(path: string, params?: Record<string, string | number | undefined>): Promise<T> {
  const url = new URL(path, API_URL);
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined) {
        url.searchParams.set(key, String(value));
      }
    }
  }
  const response = await fetch(url);
  if (!response.ok) {
    const detail = await response.json().catch(() => null);
    const message =
      typeof detail?.detail === "string" ? detail.detail : `Request failed (${response.status})`;
    throw new Error(message);
  }
  return response.json() as Promise<T>;
}

export function fetchNearby(lat: number, lng: number, radius = 1000) {
  return getJson<NearbyResponse>("/api/v1/stops/nearby", { lat, lng, radius });
}

export function searchStops(query: string, lat?: number, lng?: number) {
  return getJson<{ query: string; stops: Stop[] }>("/api/v1/stops/search", { q: query, lat, lng });
}

export function searchServices(query: string) {
  return getJson<{ query: string; services: ServiceSearchItem[] }>("/api/v1/services/search", {
    q: query,
  });
}

export function fetchStop(code: string, lat?: number, lng?: number) {
  return getJson<Stop>(`/api/v1/stops/${code}`, { lat, lng });
}

export function fetchArrivals(code: string) {
  return getJson<StopArrivalsResponse>(`/api/v1/stops/${code}/arrivals`);
}

export function fetchService(serviceNo: string) {
  return getJson<ServiceDetailResponse>(`/api/v1/services/${serviceNo}`);
}

export function fetchJourneys(params: {
  fromLat: number;
  fromLng: number;
  toLat: number;
  toLng: number;
  fromStop?: string;
  toStop?: string;
  fromLabel?: string;
  toLabel?: string;
}) {
  return getJson<JourneyPlanResponse>("/api/v1/journey", {
    from_lat: params.fromLat,
    from_lng: params.fromLng,
    to_lat: params.toLat,
    to_lng: params.toLng,
    from_stop: params.fromStop,
    to_stop: params.toStop,
    from_label: params.fromLabel,
    to_label: params.toLabel,
  });
}
