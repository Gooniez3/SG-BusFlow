import type { BusMarker } from "@/components/StopMap";
import type { ServiceArrivals } from "@/lib/types";

export function hasGps(arrival: { latitude: number | null; longitude: number | null }) {
  const lat = Number(arrival.latitude);
  const lng = Number(arrival.longitude);
  return Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) > 0.1 && Math.abs(lng) > 0.1;
}

export function nextBus(service: ServiceArrivals): BusMarker | null {
  const arrival = service.arrivals.find(hasGps);
  if (!arrival) return null;
  return {
    serviceNo: service.service_no,
    lat: Number(arrival.latitude),
    lng: Number(arrival.longitude),
    minutes: arrival.minutes,
  };
}

export function busesFromServices(services: ServiceArrivals[]) {
  return uniqueBuses(services.map(nextBus).filter((bus): bus is BusMarker => bus !== null));
}

export function busesForService(service: ServiceArrivals, serviceNo?: string) {
  const wanted = serviceNo?.toUpperCase();
  return uniqueBuses(
    service.arrivals
      .filter(hasGps)
      .filter(() => !wanted || service.service_no.toUpperCase() === wanted)
      .map((arrival) => ({
        serviceNo: service.service_no,
        lat: Number(arrival.latitude),
        lng: Number(arrival.longitude),
        minutes: arrival.minutes,
      })),
  );
}

function metresBetween(aLat: number, aLng: number, bLat: number, bLng: number) {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(bLat - aLat);
  const dLng = toRad(bLng - aLng);
  const lat1 = toRad(aLat);
  const lat2 = toRad(bLat);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * 6371000 * Math.asin(Math.min(1, Math.sqrt(h)));
}

export function busesForMapFit(stop: { latitude: number; longitude: number }, buses: BusMarker[], maxMetres = 2500) {
  const nearby = buses.filter((bus) => metresBetween(stop.latitude, stop.longitude, bus.lat, bus.lng) <= maxMetres);
  return nearby.length > 0 ? nearby : buses.slice(0, 1);
}

export function uniqueBuses(buses: BusMarker[]) {
  const seen = new Set<string>();
  const next: BusMarker[] = [];
  for (const bus of buses) {
    const lat = Number(bus.lat);
    const lng = Number(bus.lng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;
    const key = `${bus.serviceNo}:${lat.toFixed(4)}:${lng.toFixed(4)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    next.push({ ...bus, lat, lng });
  }
  return next;
}
