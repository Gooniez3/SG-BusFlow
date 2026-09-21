"use client";

import { useCallback, useEffect, useState } from "react";
import { NOTIFY_THRESHOLDS, type NotifySettings } from "@/lib/notify-logic";
import { notifyPermissionGranted, patchNotifySettings, readNotifySettings, setNotifyEnabled, subscribeNotify } from "@/lib/notify";

export function NotifySettings() {
  const [settings, setSettings] = useState<NotifySettings | null>(null);
  const [denied, setDenied] = useState(false);

  const reload = useCallback(() => {
    setSettings(readNotifySettings());
    setDenied(typeof Notification !== "undefined" && Notification.permission === "denied");
  }, []);

  useEffect(() => {
    reload();
    return subscribeNotify(reload);
  }, [reload]);

  if (!settings) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-medium text-[var(--ink)]">Arrival alerts</p>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Saved stops and journey search only. Times come from live LTA arrivals on this device.
          </p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={settings.enabled}
          aria-label="Arrival alerts"
          onClick={() => void setNotifyEnabled(!settings.enabled).then(setSettings)}
          className={`relative h-6 w-11 shrink-0 rounded-full ${
            settings.enabled ? "bg-[var(--accent)]" : "bg-[var(--line)]"
          }`}
        >
          <span
            className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-[left] ${
              settings.enabled ? "left-5" : "left-0.5"
            }`}
          />
        </button>
      </div>
      {denied ? (
        <p className="text-sm text-[var(--muted)]">Allow notifications for this site in the browser, then turn alerts on.</p>
      ) : null}
      <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-[var(--muted)]">Alert when a bus is within</p>
      <div className="flex gap-2">
        {NOTIFY_THRESHOLDS.map((minutes) => {
          const active = settings.thresholdMin === minutes;
          return (
            <button
              key={minutes}
              type="button"
              onClick={() => setSettings(patchNotifySettings({ thresholdMin: minutes }))}
              className={`h-9 flex-1 rounded-full border text-sm font-semibold ${
                active
                  ? "border-[var(--accent)] bg-[var(--accent)] text-[var(--on-accent)]"
                  : "border-[var(--line)] text-[var(--ink)]"
              }`}
            >
              {minutes} min
            </button>
          );
        })}
      </div>
      <label className="flex items-center justify-between gap-3 text-sm">
        <span>
          <span className="block font-medium">Saved stops</span>
          <span className="text-[var(--muted)]">Bus 230 is arriving in 3 minutes.</span>
        </span>
        <input
          type="checkbox"
          checked={settings.savedStops}
          onChange={(event) => setSettings(patchNotifySettings({ savedStops: event.target.checked }))}
        />
      </label>
      <label className="flex items-center justify-between gap-3 text-sm">
        <span>
          <span className="block font-medium">Journey reminders</span>
          <span className="text-[var(--muted)]">After you search a trip, remind you before the first bus.</span>
        </span>
        <input
          type="checkbox"
          checked={settings.journeys}
          onChange={(event) => setSettings(patchNotifySettings({ journeys: event.target.checked }))}
        />
      </label>
      {settings.enabled && notifyPermissionGranted() ? (
        <p className="text-xs text-[var(--muted)]">Watching saved stops and your last journey search.</p>
      ) : null}
    </div>
  );
}
