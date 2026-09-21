import Constants from "expo-constants";
import type {
  AssistantChatResponse,
  AssistantContext,
  AssistantStatus,
  JourneyPlanResponse,
  NearbyResponse,
  ServiceDetailResponse,
  ServiceSearchItem,
  Stop,
  StopArrivalsResponse,
} from "./types";

function hostFromExpo(): string | null {
  const hostUri =
    Constants.expoConfig?.hostUri ??
    Constants.linkingUri?.replace(/^[a-z]+:\/\//, "");
  if (!hostUri) return null;
  const host = hostUri.split(":")[0]?.split("/")[0];
  if (!host || host === "localhost" || host === "127.0.0.1") return null;
  return host;
}

export function apiUrl() {
  const host = hostFromExpo();
  if (host) return `http://${host}:8000`;
  if (process.env.EXPO_PUBLIC_API_URL) {
    return process.env.EXPO_PUBLIC_API_URL.replace(/\/$/, "");
  }
  return "http://127.0.0.1:8000";
}

async function getJson<T>(path: string, params?: Record<string, string | number | undefined>): Promise<T> {
  const url = new URL(path, `${apiUrl()}/`);
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined) url.searchParams.set(key, String(value));
    }
  }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 30_000);
  try {
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) {
      const detail = await response.json().catch(() => null);
      const message =
        typeof detail?.detail === "string" ? detail.detail : `Request failed (${response.status})`;
      throw new Error(message);
    }
    return response.json() as Promise<T>;
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      throw new Error("Request timed out. Try again.");
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
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

export async function postAssistantChat(
  messages: { role: "user" | "assistant"; content: string }[],
  context?: AssistantContext,
) {
  const url = new URL("/api/v1/assistant/chat", `${apiUrl()}/`);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 60_000);
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages, context }),
      signal: controller.signal,
    });
    if (!response.ok) {
      const detail = await response.json().catch(() => null);
      const message =
        typeof detail?.detail === "string" ? detail.detail : `Request failed (${response.status})`;
      throw new Error(message);
    }
    return response.json() as Promise<AssistantChatResponse>;
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      throw new Error("Request timed out. Try again.");
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

export function fetchAssistantStatus() {
  return getJson<AssistantStatus>("/api/v1/assistant/status");
}
