export function walkParts(distanceM: number | null | undefined) {
  if (distanceM == null) return null;
  const metres = Math.round(distanceM);
  const minutes = Math.max(1, Math.round(metres / 80));
  return { metres, minutes };
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

export function bearingTo(fromLat: number, fromLng: number, toLat: number, toLng: number) {
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

export function relativeUpdated(iso: string | null | undefined) {
  if (!iso) return null;
  const timestamp = Date.parse(iso);
  if (Number.isNaN(timestamp)) return null;
  const seconds = Math.max(0, Math.round((Date.now() - timestamp) / 1000));
  if (seconds < 5) return "just now";
  if (seconds < 60) return `${seconds} sec ago`;
  return `${Math.max(1, Math.round(seconds / 60))} min ago`;
}
