export type JourneyPlace = {
  label: string;
  lat: number;
  lng: number;
  stopCode?: string;
};

export type JourneyQuery = {
  fromLat: number;
  fromLng: number;
  toLat: number;
  toLng: number;
  fromStop?: string;
  toStop?: string;
  fromLabel: string;
  toLabel: string;
  optionId?: string;
};

export function transferLabel(count: number) {
  if (count === 0) return "Direct";
  if (count === 1) return "1 transfer";
  return `${count} transfers`;
}

export function nextBusMinutes(option: { legs: { kind: string; live_minutes?: number | null }[] }) {
  const first = option.legs.find((leg) => leg.kind === "bus");
  return first?.live_minutes ?? null;
}

export function journeySummary(option: {
  legs: { kind: string; duration_min: number; service_no?: string | null }[];
}) {
  const parts: string[] = [];
  for (const leg of option.legs) {
    if (leg.kind === "walk") parts.push(`Walk ${leg.duration_min} min`);
    else if (leg.service_no) parts.push(`Bus ${leg.service_no}`);
  }
  return parts.join(" → ");
}

export function journeyPoints(
  option: {
    legs: {
      kind: string;
      from_stop?: { latitude: number; longitude: number } | null;
      to_stop?: { latitude: number; longitude: number } | null;
      via_stops?: { latitude: number; longitude: number }[] | null;
    }[];
  },
  origin: { lat: number; lng: number },
  dest: { lat: number; lng: number },
): [number, number][] {
  const points: [number, number][] = [[origin.lat, origin.lng]];
  for (const leg of option.legs) {
    if (leg.from_stop) points.push([leg.from_stop.latitude, leg.from_stop.longitude]);
    for (const stop of leg.via_stops ?? []) {
      points.push([stop.latitude, stop.longitude]);
    }
    if (leg.to_stop) points.push([leg.to_stop.latitude, leg.to_stop.longitude]);
  }
  points.push([dest.lat, dest.lng]);
  return points.filter((point, index) => {
    const prev = points[index - 1];
    return !prev || prev[0] !== point[0] || prev[1] !== point[1];
  });
}

export function journeyHref(query: JourneyQuery) {
  const params = new URLSearchParams({
    from_lat: String(query.fromLat),
    from_lng: String(query.fromLng),
    to_lat: String(query.toLat),
    to_lng: String(query.toLng),
    from_label: query.fromLabel,
    to_label: query.toLabel,
  });
  if (query.fromStop) params.set("from_stop", query.fromStop);
  if (query.toStop) params.set("to_stop", query.toStop);
  if (query.optionId) params.set("option", query.optionId);
  return `/journey?${params.toString()}`;
}

export function journeyDetailHref(query: JourneyQuery) {
  const href = journeyHref(query);
  return href.replace("/journey?", "/journey/detail?");
}

export function arriveClock(durationMin: number, from = new Date()) {
  return new Date(from.getTime() + Math.max(0, durationMin) * 60_000).toLocaleTimeString("en-SG", {
    hour: "numeric",
    minute: "2-digit",
  });
}

export function parseJourneySearch(search: URLSearchParams): JourneyQuery | null {
  const fromLatRaw = search.get("from_lat");
  const fromLngRaw = search.get("from_lng");
  const toLatRaw = search.get("to_lat");
  const toLngRaw = search.get("to_lng");
  if (!fromLatRaw || !fromLngRaw || !toLatRaw || !toLngRaw) return null;
  const fromLat = Number(fromLatRaw);
  const fromLng = Number(fromLngRaw);
  const toLat = Number(toLatRaw);
  const toLng = Number(toLngRaw);
  if (![fromLat, fromLng, toLat, toLng].every((value) => Number.isFinite(value))) return null;
  return {
    fromLat,
    fromLng,
    toLat,
    toLng,
    fromStop: search.get("from_stop") ?? undefined,
    toStop: search.get("to_stop") ?? undefined,
    fromLabel: search.get("from_label") || "Current location",
    toLabel: search.get("to_label") || "Destination",
    optionId: search.get("option") ?? undefined,
  };
}
