export const NOTIFY_THRESHOLDS = [3, 5, 8] as const;
export type NotifyThreshold = (typeof NOTIFY_THRESHOLDS)[number];

export type NotifySettings = {
  enabled: boolean;
  thresholdMin: NotifyThreshold;
  savedStops: boolean;
  journeys: boolean;
};

export const DEFAULT_NOTIFY_SETTINGS: NotifySettings = {
  enabled: false,
  thresholdMin: 5,
  savedStops: true,
  journeys: true,
};

export type JourneyWatch = {
  stopCode: string;
  stopName: string;
  serviceNo: string;
  toLabel: string;
  expiresAt: number;
};

export type WatchTarget = {
  kind: "saved" | "journey";
  stopCode: string;
  stopName: string;
  serviceNo?: string;
  toLabel?: string;
};

export type NotifyCandidate = {
  key: string;
  kind: "saved" | "journey";
  stopCode: string;
  stopName: string;
  serviceNo: string;
  minutes: number;
  title: string;
  body: string;
};

type ArrivalLike = { minutes: number | null };
type ServiceLike = { service_no: string; arrivals: ArrivalLike[] };
type StopArrivalsLike = { bus_stop_code: string; stale: boolean; services: ServiceLike[] };

export function parseNotifySettings(raw: unknown): NotifySettings {
  if (!raw || typeof raw !== "object") return { ...DEFAULT_NOTIFY_SETTINGS };
  const value = raw as Partial<NotifySettings>;
  const threshold = NOTIFY_THRESHOLDS.includes(value.thresholdMin as NotifyThreshold)
    ? (value.thresholdMin as NotifyThreshold)
    : DEFAULT_NOTIFY_SETTINGS.thresholdMin;
  return {
    enabled: Boolean(value.enabled),
    thresholdMin: threshold,
    savedStops: value.savedStops !== false,
    journeys: value.journeys !== false,
  };
}

export function journeyWatchFromOption(
  option: {
    legs: {
      kind: string;
      service_no?: string | null;
      from_stop?: { code: string; name: string } | null;
    }[];
  },
  toLabel: string,
  now = Date.now(),
  ttlMs = 90 * 60 * 1000,
): JourneyWatch | null {
  const bus = option.legs.find((leg) => leg.kind === "bus" && leg.service_no && leg.from_stop?.code);
  if (!bus?.from_stop || !bus.service_no) return null;
  return {
    stopCode: bus.from_stop.code,
    stopName: bus.from_stop.name,
    serviceNo: bus.service_no.toUpperCase(),
    toLabel,
    expiresAt: now + ttlMs,
  };
}

export function collectCandidates(
  targets: WatchTarget[],
  arrivalsByStop: Record<string, StopArrivalsLike | undefined>,
  settings: NotifySettings,
): NotifyCandidate[] {
  if (!settings.enabled) return [];
  const out: NotifyCandidate[] = [];
  for (const target of targets) {
    if (target.kind === "saved" && !settings.savedStops) continue;
    if (target.kind === "journey" && !settings.journeys) continue;
    const payload = arrivalsByStop[target.stopCode];
    if (!payload || payload.stale) continue;
    for (const service of payload.services) {
      if (target.serviceNo && service.service_no.toUpperCase() !== target.serviceNo.toUpperCase()) continue;
      const minutes = service.arrivals[0]?.minutes;
      if (minutes == null || minutes <= 0 || minutes > settings.thresholdMin) continue;
      const serviceNo = service.service_no.toUpperCase();
      const key = `${target.kind}:${target.stopCode}:${serviceNo}`;
      const body =
        target.kind === "journey"
          ? `Bus ${serviceNo} is arriving at ${target.stopName} in ${minutes} minutes for ${target.toLabel ?? "your journey"}.`
          : `Bus ${serviceNo} is arriving at ${target.stopName} in ${minutes} minutes.`;
      out.push({
        key,
        kind: target.kind,
        stopCode: target.stopCode,
        stopName: target.stopName,
        serviceNo,
        minutes,
        title: `Bus ${serviceNo} in ${minutes} min`,
        body,
      });
    }
  }
  return out;
}

export function shouldFire(
  candidate: NotifyCandidate,
  last?: { minutes: number },
): boolean {
  if (!last) return true;
  return candidate.minutes > last.minutes;
}
