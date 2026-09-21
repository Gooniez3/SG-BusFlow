import AsyncStorage from "@react-native-async-storage/async-storage";
import { Alert, Linking, Platform } from "react-native";

import {
  DEFAULT_NOTIFY_SETTINGS,
  journeyWatchFromOption,
  parseNotifySettings,
  type JourneyWatch,
  type NotifyCandidate,
  type NotifySettings,
  type NotifyThreshold,
} from "./notify-logic";
import {
  addNotificationResponseReceivedListener,
  cancelAllScheduledNotificationsAsync,
  nativePermissionGranted,
  presentLocalNotification,
  readNativePermission,
  requestNativePermission,
  scheduleLocalNotification,
} from "./notify-native";

const SETTINGS_KEY = "sg-busflow:notify";
const JOURNEY_KEY = "sg-busflow:journey-watch";

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

export async function readNotifySettings(): Promise<NotifySettings> {
  try {
    const raw = await AsyncStorage.getItem(SETTINGS_KEY);
    return parseNotifySettings(raw ? JSON.parse(raw) : null);
  } catch {
    return { ...DEFAULT_NOTIFY_SETTINGS };
  }
}

export async function writeNotifySettings(settings: NotifySettings) {
  await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  emit();
}

export async function readJourneyWatch(): Promise<JourneyWatch | null> {
  try {
    const raw = await AsyncStorage.getItem(JOURNEY_KEY);
    if (!raw) return null;
    const watch = JSON.parse(raw) as JourneyWatch;
    if (!watch?.stopCode || !watch.serviceNo || watch.expiresAt <= Date.now()) {
      await AsyncStorage.removeItem(JOURNEY_KEY);
      return null;
    }
    return watch;
  } catch {
    return null;
  }
}

export async function writeJourneyWatch(watch: JourneyWatch | null) {
  if (!watch) await AsyncStorage.removeItem(JOURNEY_KEY);
  else await AsyncStorage.setItem(JOURNEY_KEY, JSON.stringify(watch));
  emit();
}

export async function rememberJourneyWatch(
  option: Parameters<typeof journeyWatchFromOption>[0] | null,
  toLabel?: string | null,
) {
  await writeJourneyWatch(option && toLabel ? journeyWatchFromOption(option, toLabel) : null);
}

export async function notifyPermissionGranted() {
  if (Platform.OS === "web") {
    return typeof Notification !== "undefined" && Notification.permission === "granted";
  }
  try {
    return await nativePermissionGranted();
  } catch {
    return false;
  }
}

export async function requestNotifyPermission() {
  if (Platform.OS === "web") {
    if (typeof Notification === "undefined") return false;
    if (Notification.permission === "granted") return true;
    return (await Notification.requestPermission()) === "granted";
  }
  try {
    const current = await readNativePermission();
    if (current.granted) return true;
    if (!current.canAskAgain) {
      await Linking.openSettings();
      return nativePermissionGranted();
    }
    return requestNativePermission();
  } catch {
    return false;
  }
}

export async function setNotifyEnabled(enabled: boolean) {
  const settings = await readNotifySettings();
  if (!enabled) {
    await writeNotifySettings({ ...settings, enabled: false });
    if (Platform.OS !== "web") {
      try {
        await cancelAllScheduledNotificationsAsync();
      } catch {
        /* Expo Go may not expose the scheduler. */
      }
    }
    return { ...settings, enabled: false };
  }
  const granted = await requestNotifyPermission();
  const next = { ...settings, enabled: granted };
  await writeNotifySettings(next);
  return next;
}

export async function patchNotifySettings(patch: Partial<NotifySettings>) {
  const settings = await readNotifySettings();
  const next = { ...settings, ...patch };
  if (patch.thresholdMin != null) next.thresholdMin = patch.thresholdMin as NotifyThreshold;
  await writeNotifySettings(next);
  return next;
}

export async function showArrivalNotification(candidate: NotifyCandidate) {
  if (Platform.OS === "web") return;
  try {
    await presentLocalNotification({
      identifier: candidate.key,
      title: candidate.title,
      body: candidate.body,
      stopCode: candidate.stopCode,
    });
  } catch {
    Alert.alert(candidate.title, candidate.body);
  }
}

export async function scheduleArrivalNotification(candidate: NotifyCandidate, seconds: number) {
  if (Platform.OS === "web") return;
  try {
    await scheduleLocalNotification(
      {
        identifier: candidate.key,
        title: candidate.title,
        body: candidate.body,
        stopCode: candidate.stopCode,
      },
      seconds,
    );
  } catch {
    /* Foreground polling still fires when the app is open. */
  }
}

export async function clearScheduledArrivalNotifications() {
  if (Platform.OS === "web") return;
  try {
    await cancelAllScheduledNotificationsAsync();
  } catch {
    /* ignore */
  }
}

export function onArrivalNotificationTap(listener: (stopCode: string) => void) {
  return addNotificationResponseReceivedListener((response) => {
    const code = response.notification.request.content.data?.stopCode;
    if (typeof code === "string" && code) listener(code);
  });
}
