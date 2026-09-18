"use client";

import { useEffect, useState } from "react";
import { Heart } from "lucide-react";
import { isFavoriteService, toggleFavoriteService } from "@/lib/favorites";

export function ServiceFavoriteButton({
  serviceNo,
  operator,
  iconOnly = false,
}: {
  serviceNo: string;
  operator?: string | null;
  iconOnly?: boolean;
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
      className={
        iconOnly
          ? `flex h-10 w-10 items-center justify-center rounded-full border border-[var(--line)] bg-[var(--card)] ${
              saved ? "text-[var(--accent)]" : "text-[var(--muted)]"
            }`
          : `rounded-full border px-3 py-1.5 text-sm ${
              saved
                ? "border-[var(--accent)] text-[var(--accent)]"
                : "border-[var(--line)] text-[var(--muted)]"
            }`
      }
      aria-pressed={saved}
      aria-label={saved ? "Remove from saved services" : "Save service"}
    >
      <Heart size={18} strokeWidth={1.8} fill={saved ? "currentColor" : "none"} />
      {iconOnly ? null : saved ? "Saved" : "Save"}
    </button>
  );
}
