/** Remote push is unused; Expo Go also cannot load those expo-notifications files. */

export async function getDevicePushTokenAsync() {
  throw new Error("Remote push tokens are not used.");
}

export async function getExpoPushTokenAsync() {
  throw new Error("Remote push tokens are not used.");
}

export async function unregisterForNotificationsAsync() {}

export async function subscribeToTopicAsync() {}

export async function unsubscribeFromTopicAsync() {}

export async function setAutoServerRegistrationEnabledAsync() {}

export function warnOfExpoGoPushUsage() {}
