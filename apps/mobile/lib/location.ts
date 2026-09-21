import * as Location from "expo-location";
import { Alert, Linking } from "react-native";

export const DEMO_LOCATION = {
  lat: 1.3404,
  lng: 103.705,
  label: "Boon Lay",
};

export type UserLocation = {
  lat: number;
  lng: number;
  label: string;
  isDemo: boolean;
  denied: boolean;
};

const fallback = (denied: boolean): UserLocation => ({
  ...DEMO_LOCATION,
  isDemo: true,
  denied,
});

async function readGps(): Promise<UserLocation> {
  const position = await Location.getCurrentPositionAsync({
    accuracy: Location.Accuracy.Balanced,
  });
  return {
    lat: position.coords.latitude,
    lng: position.coords.longitude,
    label: "Current location",
    isDemo: false,
    denied: false,
  };
}

export async function requestUserLocation(): Promise<UserLocation> {
  try {
    const servicesOn = await Location.hasServicesEnabledAsync();
    let permission = await Location.getForegroundPermissionsAsync();
    if (permission.status !== Location.PermissionStatus.GRANTED && permission.canAskAgain) {
      permission = await Location.requestForegroundPermissionsAsync();
    }
    if (!servicesOn || permission.status !== Location.PermissionStatus.GRANTED) {
      return fallback(true);
    }
    return await readGps();
  } catch {
    return fallback(false);
  }
}

export async function enableUserLocation(): Promise<UserLocation> {
  try {
    const servicesOn = await Location.hasServicesEnabledAsync();
    let permission = await Location.getForegroundPermissionsAsync();
    if (permission.status !== Location.PermissionStatus.GRANTED && permission.canAskAgain) {
      permission = await Location.requestForegroundPermissionsAsync();
    }
    if (servicesOn && permission.status === Location.PermissionStatus.GRANTED) {
      return await readGps();
    }
    await new Promise<void>((resolve) => {
      Alert.alert(
        "Turn on location",
        "Allow location for SG BusFlow in Settings, then return to the app.",
        [
          { text: "Not now", style: "cancel", onPress: () => resolve() },
          {
            text: "Open Settings",
            onPress: () => {
              void Linking.openSettings().finally(() => resolve());
            },
          },
        ],
      );
    });
    return await requestUserLocation();
  } catch {
    return fallback(true);
  }
}
