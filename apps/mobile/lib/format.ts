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

export function loadCopy(load: string | null | undefined) {
  if (load === "SEA") return "Seats available";
  if (load === "SDA") return "Standing available";
  if (load === "LSD") return "Limited standing";
  return null;
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
