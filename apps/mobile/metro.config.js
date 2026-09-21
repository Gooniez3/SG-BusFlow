const path = require("path");
const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);
const stub = path.resolve(__dirname, "lib/expo-push-token-stub.js");
const PUSH_TOKEN = /(?:^|[\\/])(getDevicePushTokenAsync|getExpoPushTokenAsync|unregisterForNotificationsAsync|topicSubscription|DevicePushTokenAutoRegistration\.fx)(\.|$)/;

config.resolver.resolveRequest = (context, moduleName, platform) => {
  const origin = String(context.originModulePath || "").replace(/\\/g, "/");
  const name = String(moduleName).replace(/\\/g, "/");
  if (origin.includes("/expo-notifications/") && PUSH_TOKEN.test(name)) {
    return { type: "sourceFile", filePath: stub };
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
