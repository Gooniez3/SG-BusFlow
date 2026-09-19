"use client";

import { NearbyPanel } from "@/components/NearbyPanel";
import { useWorkspace } from "@/lib/workspace";

export default function NearbyPage() {
  const { location, reload } = useWorkspace();

  return (
    <section>
      {location?.denied ? (
        <div className="rounded-xl border border-[var(--line)] bg-[var(--card)] p-4">
          <p className="font-medium">Location access is needed to find nearby bus stops.</p>
          <button
            type="button"
            onClick={reload}
            className="bf-on-accent mt-3 h-11 rounded-full bg-[var(--accent)] px-4 text-sm"
          >
            Enable location
          </button>
        </div>
      ) : (
        <NearbyPanel />
      )}
    </section>
  );
}
