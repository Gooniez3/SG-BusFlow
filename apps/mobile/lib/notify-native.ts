import { Platform } from "react-native";
import { cancelAllScheduledNotificationsAsync } from "expo-notifications/build/cancelAllScheduledNotificationsAsync";
import { AndroidImportance } from "expo-notifications/build/NotificationChannelManager.types";
import {
  getPermissionsAsync,
  requestPermissionsAsync,
} from "expo-notifications/build/NotificationPermissions";
import { IosAuthorizationStatus } from "expo-notifications/build/NotificationPermissions.types";
import { addNotificationResponseReceivedListener } from "expo-notifications/build/NotificationsEmitter";
import { setNotificationHandler } from "expo-notifications/build/NotificationsHandler";
import { SchedulableTriggerInputTypes } from "expo-notifications/build/Notifications.types";
import { scheduleNotificationAsync } from "expo-notifications/build/scheduleNotificationAsync";
import { setNotificationChannelAsync } from "expo-notifications/build/setNotificationChannelAsync";

const CHANNEL = "arrivals";

if (Platform.OS !== "web") {
  setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
    }),
  });
}

export async function ensureNotifyChannel() {
  if (Platform.OS !== "android") return;
  await setNotificationChannelAsync(CHANNEL, {
    name: "Bus arrivals",
    importance: AndroidImportance.HIGH,
    lightColor: "#0F9D8A",
  });
}

export async function readNativePermission() {
  const current = await getPermissionsAsync();
  return {
    granted: current.granted || current.ios?.status === IosAuthorizationStatus.PROVISIONAL,
    canAskAgain: current.canAskAgain,
  };
}

export async function nativePermissionGranted() {
  return (await readNativePermission()).granted;
}

export async function requestNativePermission() {
  await ensureNotifyChannel();
  const current = await readNativePermission();
  if (current.granted) return true;
  if (!current.canAskAgain) return false;
  const next = await requestPermissionsAsync();
  return next.granted || next.ios?.status === IosAuthorizationStatus.PROVISIONAL;
}

export async function presentLocalNotification(input: {
  identifier: string;
  title: string;
  body: string;
  stopCode: string;
}) {
  await ensureNotifyChannel();
  await scheduleNotificationAsync({
    identifier: input.identifier,
    content: {
      title: input.title,
      body: input.body,
      data: { stopCode: input.stopCode },
      sound: false,
    },
    trigger: null,
  });
}

export async function scheduleLocalNotification(
  input: { identifier: string; title: string; body: string; stopCode: string },
  seconds: number,
) {
  await ensureNotifyChannel();
  await scheduleNotificationAsync({
    identifier: `later:${input.identifier}`,
    content: {
      title: input.title,
      body: input.body,
      data: { stopCode: input.stopCode },
      sound: false,
    },
    trigger: {
      type: SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: Math.max(5, Math.round(seconds)),
      repeats: false,
      channelId: CHANNEL,
    },
  });
}

export { cancelAllScheduledNotificationsAsync, addNotificationResponseReceivedListener };
