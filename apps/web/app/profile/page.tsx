"use client";

import { NotifySettings } from "@/components/NotifySettings";

export default function ProfilePage() {
  return (
    <section className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold tracking-tight md:text-2xl">Profile</h1>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Saved stops stay on this device. No account needed.
        </p>
      </div>
      <div className="rounded-xl border border-[var(--line)] bg-[var(--card)] px-4 py-4">
        <NotifySettings />
      </div>
    </section>
  );
}
