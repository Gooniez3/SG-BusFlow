const SETTINGS_KEY = "sg-busflow:notify";
const JOURNEY_KEY = "sg-busflow:journey-watch";

import {
  DEFAULT_NOTIFY_SETTINGS,
  journeyWatchFromOption,
  parseNotifySettings,
  type JourneyWatch,
  type NotifyCandidate,
  type NotifySettings,
  type NotifyThreshold,
} from "./notify-logic";

const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

export function subscribeNotify(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function readRaw(key: string) {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function readNotifySettings(): NotifySettings {
  return parseNotifySettings(readRaw(SETTINGS_KEY));
}

export function writeNotifySettings(settings: NotifySettings) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  emit();
}

export function readJourneyWatch(): JourneyWatch | null {
  const watch = readRaw(JOURNEY_KEY) as JourneyWatch | null;
  if (!watch?.stopCode || !watch.serviceNo || watch.expiresAt <= Date.now()) {
    if (typeof window !== "undefined") window.localStorage.removeItem(JOURNEY_KEY);
    return null;
  }
  return watch;
}

export function writeJourneyWatch(watch: JourneyWatch | null) {
  if (typeof window === "undefined") return;
  if (!watch) window.localStorage.removeItem(JOURNEY_KEY);
  else window.localStorage.setItem(JOURNEY_KEY, JSON.stringify(watch));
  emit();
}

export function rememberJourneyWatch(
  option: Parameters<typeof journeyWatchFromOption>[0] | null,
  toLabel?: string | null,
) {
  writeJourneyWatch(option && toLabel ? journeyWatchFromOption(option, toLabel) : null);
}

export function notifyPermissionGranted() {
  return typeof Notification !== "undefined" && Notification.permission === "granted";
}

export async function requestNotifyPermission() {
  if (typeof Notification === "undefined") return false;
  if (Notification.permission === "granted") return true;
  if (Notification.permission === "denied") return false;
  const result = await Notification.requestPermission();
  return result === "granted";
}

export async function setNotifyEnabled(enabled: boolean) {
  const settings = readNotifySettings();
  if (!enabled) {
    const next = { ...settings, enabled: false };
    writeNotifySettings(next);
    return next;
  }
  const granted = await requestNotifyPermission();
  const next = { ...settings, enabled: granted };
  writeNotifySettings(next);
  return next;
}

export function patchNotifySettings(patch: Partial<NotifySettings>) {
  const settings = readNotifySettings();
  const next = { ...settings, ...patch };
  if (patch.thresholdMin != null) next.thresholdMin = patch.thresholdMin as NotifyThreshold;
  writeNotifySettings(next);
  return next;
}

export function showArrivalNotification(candidate: NotifyCandidate) {
  if (typeof Notification === "undefined" || Notification.permission !== "granted") return;
  const note = new Notification(candidate.title, {
    body: candidate.body,
    icon: "/logo-mark.png",
    tag: candidate.key,
  });
  note.onclick = () => {
    window.focus();
    window.location.assign(`/stops/${candidate.stopCode}`);
    note.close();
  };
}
