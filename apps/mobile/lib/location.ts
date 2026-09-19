import * as Location from "expo-location";

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
};

export async function requestUserLocation(): Promise<UserLocation> {
  const fallback: UserLocation = { ...DEMO_LOCATION, isDemo: true };
  try {
    const current = await Location.getForegroundPermissionsAsync();
    let status = current.status;
    if (status !== "granted") {
      const asked = await Location.requestForegroundPermissionsAsync();
      status = asked.status;
    }
    if (status !== "granted") return fallback;
    const position = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });
    return {
      lat: position.coords.latitude,
      lng: position.coords.longitude,
      label: "Current location",
      isDemo: false,
    };
  } catch {
    return fallback;
  }
}
