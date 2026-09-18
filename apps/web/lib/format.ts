export function greeting(now = new Date()) {
  const hour = now.getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

export function walkParts(distanceM: number | null | undefined) {
  if (distanceM == null) return null;
  const metres = Math.round(distanceM);
  const minutes = Math.max(1, Math.round(metres / 80));
  return { metres, minutes };
}

export function walkLabel(distanceM: number | null | undefined) {
  const parts = walkParts(distanceM);
  if (!parts) return null;
  return `${parts.metres} m · ~${parts.minutes} min walk`;
}

export function arrivalLabel(minutes: number | null | undefined) {
  if (minutes == null) return null;
  if (minutes <= 0) return "ARRIVING";
  return `${minutes} min`;
}

export function arrivalShort(minutes: number | null | undefined) {
  if (minutes == null) return null;
  if (minutes <= 0) return "Here";
  return String(minutes);
}

export function loadBarColor(load: string | null | undefined) {
  if (load === "LSD") return "#dc2626";
  if (load === "SDA") return "#f59e0b";
  return "#16a34a";
}

export function bearingTo(
  fromLat: number,
  fromLng: number,
  toLat: number,
  toLng: number,
) {
  const fromPhi = (fromLat * Math.PI) / 180;
  const toPhi = (toLat * Math.PI) / 180;
  const delta = ((toLng - fromLng) * Math.PI) / 180;
  const y = Math.sin(delta) * Math.cos(toPhi);
  const x =
    Math.cos(fromPhi) * Math.sin(toPhi) -
    Math.sin(fromPhi) * Math.cos(toPhi) * Math.cos(delta);
  return (Math.atan2(y, x) * 180) / Math.PI;
}

export function loadCopy(load: string | null | undefined) {
  if (load === "SEA") return { label: "Seats available", fill: 0.34 };
  if (load === "SDA") return { label: "Standing available", fill: 0.62 };
  if (load === "LSD") return { label: "Limited standing", fill: 0.9 };
  return null;
}

export function relativeUpdated(iso: string | null | undefined) {
  if (!iso) return null;
  const timestamp = Date.parse(iso);
  if (Number.isNaN(timestamp)) return null;
  const seconds = Math.max(0, Math.round((Date.now() - timestamp) / 1000));
  if (seconds < 5) return "just now";
  if (seconds < 60) return `${seconds} sec ago`;
  const minutes = Math.max(1, Math.round(seconds / 60));
  return `${minutes} min ago`;
}

export function clockTime(iso: string | null | undefined) {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleTimeString("en-SG", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

export function soonestMinutes(services: { arrivals: { minutes: number | null }[] }[]) {
  const values = services.flatMap((service) =>
    service.arrivals.map((arrival) => arrival.minutes).filter((minutes): minutes is number => minutes != null),
  );
  if (values.length === 0) return null;
  return Math.min(...values);
}

export function nextService(services: { service_no: string; arrivals: { minutes: number | null }[] }[]) {
  let best: { serviceNo: string; minutes: number } | null = null;
  for (const service of services) {
    const minutes = service.arrivals[0]?.minutes;
    if (minutes == null) continue;
    if (!best || minutes < best.minutes) {
      best = { serviceNo: service.service_no, minutes };
    }
  }
  return best;
}
