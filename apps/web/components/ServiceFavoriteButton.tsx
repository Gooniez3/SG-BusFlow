"use client";

import { useEffect, useState } from "react";
import { isFavoriteService, toggleFavoriteService } from "@/lib/favorites";

export function ServiceFavoriteButton({
  serviceNo,
  operator,
}: {
  serviceNo: string;
  operator?: string | null;
}) {
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setSaved(isFavoriteService(serviceNo));
  }, [serviceNo]);

  return (
    <button
      type="button"
      onClick={() => {
        const next = toggleFavoriteService({ service_no: serviceNo, operator });
        setSaved(next.some((item) => item.service_no === serviceNo));
      }}
      className={`rounded-full border px-3 py-1.5 text-sm ${
        saved
          ? "border-[var(--accent)] text-[var(--accent)]"
          : "border-[var(--line)] text-[var(--muted)]"
      }`}
      aria-pressed={saved}
    >
      {saved ? "Saved" : "Save"}
    </button>
  );
}
