"use client";

import { useEffect, useState } from "react";
import { Heart } from "lucide-react";
import { isFavorite, toggleFavorite, type FavoriteStop } from "@/lib/favorites";

export function FavoriteButton({
  stop,
  iconOnly = false,
}: {
  stop: FavoriteStop;
  iconOnly?: boolean;
}) {
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setSaved(isFavorite(stop.code));
  }, [stop.code]);

  return (
    <button
      type="button"
      onClick={(event) => {
        event.stopPropagation();
        const next = toggleFavorite(stop);
        setSaved(next.some((item) => item.code === stop.code));
      }}
      className={
        iconOnly
          ? `flex h-10 w-10 items-center justify-center rounded-full border border-[var(--line)] bg-[var(--card)] ${
              saved ? "text-[var(--accent)]" : "text-[var(--muted)]"
            }`
          : `inline-flex min-h-10 items-center gap-1.5 rounded-full border px-3 text-sm ${
              saved
                ? "border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)]"
                : "border-[var(--line)] text-[var(--muted)]"
            }`
      }
      aria-pressed={saved}
      aria-label={saved ? "Remove from favorites" : "Save stop"}
    >
      <Heart size={18} strokeWidth={1.8} fill={saved ? "currentColor" : "none"} />
      {iconOnly ? null : saved ? "Saved" : "Save"}
    </button>
  );
}
