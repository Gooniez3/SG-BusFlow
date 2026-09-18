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

export function requestUserLocation(): Promise<UserLocation> {
  return new Promise((resolve) => {
    const fallback = { ...DEMO_LOCATION, isDemo: true, denied: false };
    if (!navigator.geolocation) {
      resolve({ ...fallback, denied: true });
      return;
    }
    let settled = false;
    const finish = (value: UserLocation) => {
      if (settled) return;
      settled = true;
      resolve(value);
    };
    const timer = window.setTimeout(() => finish(fallback), 8000);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        window.clearTimeout(timer);
        finish({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          label: "Current location",
          isDemo: false,
          denied: false,
        });
      },
      (error) => {
        window.clearTimeout(timer);
        finish({
          ...fallback,
          denied: error.code === error.PERMISSION_DENIED,
        });
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 60_000 },
    );
  });
}
