import AsyncStorage from "@react-native-async-storage/async-storage";

const KEY = "sg-busflow:ai-context";

export type StoredAiContext = {
  stop_code?: string;
  stop_name?: string;
  service_no?: string;
  journey?: {
    from_label?: string;
    to_label?: string;
    from_lat?: number;
    from_lng?: number;
    to_lat?: number;
    to_lng?: number;
    from_stop?: string;
    to_stop?: string;
    duration_min?: number;
    summary?: string;
  };
};

export async function readAiContext(): Promise<StoredAiContext> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as StoredAiContext) : {};
  } catch {
    return {};
  }
}

async function write(patch: StoredAiContext) {
  const current = await readAiContext();
  const next = { ...current, ...patch };
  await AsyncStorage.setItem(KEY, JSON.stringify(next));
  return next;
}

export function rememberStop(stop: { code: string; name: string }) {
  return write({ stop_code: stop.code, stop_name: stop.name });
}

export function rememberService(serviceNo: string) {
  return write({ service_no: serviceNo.toUpperCase() });
}

export function rememberJourney(journey: NonNullable<StoredAiContext["journey"]>) {
  return write({ journey });
}

export function assistantHref(href: string | null | undefined) {
  if (!href) return null;
  if (href.startsWith("/stops/")) return href.replace("/stops/", "/stop/");
  if (href.startsWith("/journey/detail")) {
    return href.replace("/journey/detail", "/plan-detail").replace("to_stop=", "to=");
  }
  if (href.startsWith("/search")) return "/(tabs)/search";
  return href;
}
