"use client";

import Link from "next/link";
import { useWorkspace } from "@/lib/workspace";

export default function MapPage() {
  const { location, reload } = useWorkspace();

  return (
    <section className="space-y-4">
      <h1 className="text-2xl font-semibold tracking-tight">Map</h1>
      <p className="text-sm text-[var(--muted)]">
        {location?.denied
          ? "Location is off"
          : location?.isDemo
            ? `Demo pin · ${location.label}`
            : "Using your current location"}
      </p>
      <p className="text-sm text-[var(--muted)]">Tap a stop for arrivals. Tap a numbered marker to track a live bus.</p>
      <button
        type="button"
        onClick={reload}
        className="h-11 rounded-full border border-[var(--line)] px-4 text-sm"
      >
        Use current location
      </button>
      <Link href="/" className="block text-sm font-medium text-[var(--accent)]">
        Back to list
      </Link>
    </section>
  );
}
