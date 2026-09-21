"use client";

import { useEffect, useRef } from "react";
import { fetchArrivals } from "@/lib/api";
import { readFavorites } from "@/lib/favorites";
import {
  collectCandidates,
  shouldFire,
  type WatchTarget,
} from "@/lib/notify-logic";
import {
  notifyPermissionGranted,
  readJourneyWatch,
  readNotifySettings,
  showArrivalNotification,
  subscribeNotify,
  writeNotifySettings,
} from "@/lib/notify";

const POLL_MS = 30_000;
const MAX_STOPS = 8;

export function NotifyWatcher() {
  const lastFired = useRef(new Map<string, { minutes: number }>());

  useEffect(() => {
    let cancelled = false;

    async function tick() {
      if (typeof document !== "undefined" && document.visibilityState === "hidden") return;
      const settings = readNotifySettings();
      if (!settings.enabled) return;
      if (!notifyPermissionGranted()) {
        writeNotifySettings({ ...settings, enabled: false });
        return;
      }
      const saved = readFavorites();
      const journey = readJourneyWatch();
      const targets: WatchTarget[] = [];
      if (settings.savedStops) {
        for (const stop of saved.slice(0, MAX_STOPS)) {
          targets.push({ kind: "saved", stopCode: stop.code, stopName: stop.name });
        }
      }
      if (settings.journeys && journey) {
        targets.push({
          kind: "journey",
          stopCode: journey.stopCode,
          stopName: journey.stopName,
          serviceNo: journey.serviceNo,
          toLabel: journey.toLabel,
        });
      }
      if (targets.length === 0) return;
      const arrivalsByStop: Record<string, Awaited<ReturnType<typeof fetchArrivals>> | undefined> = {};
      await Promise.all(
        [...new Set(targets.map((item) => item.stopCode))].map(async (code) => {
          try {
            arrivalsByStop[code] = await fetchArrivals(code);
          } catch {
            arrivalsByStop[code] = undefined;
          }
        }),
      );
      if (cancelled) return;
      const candidates = collectCandidates(targets, arrivalsByStop, settings);
      for (const candidate of candidates) {
        if (!shouldFire(candidate, lastFired.current.get(candidate.key))) continue;
        showArrivalNotification(candidate);
        lastFired.current.set(candidate.key, { minutes: candidate.minutes });
      }
    }

    void tick();
    const interval = window.setInterval(() => void tick(), POLL_MS);
    const unsub = subscribeNotify(() => void tick());
    const onVis = () => void tick();
    document.addEventListener("visibilitychange", onVis);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
      unsub();
      document.removeEventListener("visibilitychange", onVis);
    };
  }, []);

  return null;
}
