"use client";

import { useEffect, useState } from "react";
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
          ? `flex h-9 w-9 items-center justify-center rounded-full ${
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
      <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden>
        <path
          d="M12 18l-6.2-5.4A3.8 3.8 0 0112 7.2a3.8 3.8 0 016.2 5.4L12 18z"
          fill={saved ? "currentColor" : "none"}
          stroke="currentColor"
          strokeWidth="1.7"
        />
      </svg>
      {iconOnly ? null : saved ? "Saved" : "Save"}
    </button>
  );
}
