import { useEffect, useRef } from "react";
import { AppState, Platform } from "react-native";
import { router } from "expo-router";

import { fetchArrivals } from "@/lib/api";
import { readFavorites } from "@/lib/favorites";
import {
  collectCandidates,
  shouldFire,
  type NotifyCandidate,
  type WatchTarget,
} from "@/lib/notify-logic";
import {
  clearScheduledArrivalNotifications,
  notifyPermissionGranted,
  onArrivalNotificationTap,
  readJourneyWatch,
  readNotifySettings,
  scheduleArrivalNotification,
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
      const settings = await readNotifySettings();
      if (cancelled) return;
      if (!settings.enabled) return;
      if (!(await notifyPermissionGranted())) {
        await writeNotifySettings({ ...settings, enabled: false });
        return;
      }
      const [saved, journey] = await Promise.all([readFavorites(), readJourneyWatch()]);
      if (cancelled) return;
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
        await showArrivalNotification(candidate);
        lastFired.current.set(candidate.key, { minutes: candidate.minutes });
      }
      if (Platform.OS !== "web" && AppState.currentState !== "active") {
        await clearScheduledArrivalNotifications();
        for (const target of targets) {
          const payload = arrivalsByStop[target.stopCode];
          if (!payload || payload.stale) continue;
          for (const service of payload.services) {
            if (target.serviceNo && service.service_no.toUpperCase() !== target.serviceNo) continue;
            const minutes = service.arrivals[0]?.minutes;
            if (minutes == null || minutes <= settings.thresholdMin || minutes > 20) continue;
            const later: NotifyCandidate = {
              key: `${target.kind}:${target.stopCode}:${service.service_no.toUpperCase()}`,
              kind: target.kind,
              stopCode: target.stopCode,
              stopName: target.stopName,
              serviceNo: service.service_no.toUpperCase(),
              minutes: settings.thresholdMin,
              title: `Bus ${service.service_no} in ${settings.thresholdMin} min`,
              body:
                target.kind === "journey"
                  ? `Bus ${service.service_no} is arriving at ${target.stopName} in ${settings.thresholdMin} minutes for ${target.toLabel ?? "your journey"}.`
                  : `Bus ${service.service_no} is arriving at ${target.stopName} in ${settings.thresholdMin} minutes.`,
            };
            await scheduleArrivalNotification(later, (minutes - settings.thresholdMin) * 60);
          }
        }
      }
    }

    void tick();
    const interval = setInterval(() => void tick(), POLL_MS);
    const unsub = subscribeNotify(() => void tick());
    const app = AppState.addEventListener("change", () => void tick());
    return () => {
      cancelled = true;
      clearInterval(interval);
      unsub();
      app.remove();
    };
  }, []);

  useEffect(() => {
    if (Platform.OS === "web") return;
    const sub = onArrivalNotificationTap((code) => {
      router.push({ pathname: "/stop/[code]", params: { code } });
    });
    return () => sub.remove();
  }, []);

  return null;
}
