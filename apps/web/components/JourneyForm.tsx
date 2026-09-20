"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { MapPin, Navigation, X } from "lucide-react";
import { searchStops } from "@/lib/transport";
import {
  clearDestinations,
  pushDestination,
  readDestinations,
  removeDestination,
  type RecentDestination,
} from "@/lib/destinations";
import { journeyHref } from "@/lib/journey";
import { useJourneySession } from "@/lib/journey-session";
import { useWorkspace } from "@/lib/workspace";
import type { Stop } from "@/lib/types";

export function JourneyForm() {
  const router = useRouter();
  const { location, stops } = useWorkspace();
  const { origin, destination, pickMode, setOrigin, setDestination, setPickMode } = useJourneySession();
  const [fromOpen, setFromOpen] = useState(false);
  const [fromQuery, setFromQuery] = useState("");
  const [toQuery, setToQuery] = useState(destination?.label ?? "");
  const [fromMatches, setFromMatches] = useState<Stop[]>([]);
  const [toMatches, setToMatches] = useState<Stop[]>([]);
  const [recents, setRecents] = useState<RecentDestination[]>([]);

  useEffect(() => {
    setRecents(readDestinations());
  }, []);

  useEffect(() => {
    if (destination) setToQuery(destination.label);
  }, [destination]);

  useEffect(() => {
    const trimmed = toQuery.trim();
    if (!trimmed || destination?.label === trimmed) {
      setToMatches([]);
      return;
    }
    let cancelled = false;
    const timer = window.setTimeout(() => {
      searchStops(trimmed, location?.lat, location?.lng)
        .then((result) => {
          if (!cancelled) setToMatches(result.stops.slice(0, 6));
        })
        .catch(() => {
          if (!cancelled) setToMatches([]);
        });
    }, 200);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [toQuery, destination?.label, location?.lat, location?.lng]);

  useEffect(() => {
    const trimmed = fromQuery.trim();
    if (!trimmed) {
      setFromMatches(stops.slice(0, 6));
      return;
    }
    let cancelled = false;
    const timer = window.setTimeout(() => {
      searchStops(trimmed, location?.lat, location?.lng)
        .then((result) => {
          if (!cancelled) setFromMatches(result.stops.slice(0, 6));
        })
        .catch(() => {
          if (!cancelled) setFromMatches([]);
        });
    }, 200);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [fromQuery, location?.lat, location?.lng, stops]);

  const originLabel = origin?.label ?? "Current location";

  function chooseDestination(stop: Stop) {
    const place = {
      label: stop.name,
      lat: stop.latitude,
      lng: stop.longitude,
      stopCode: stop.code,
    };
    setDestination(place);
    setToQuery(stop.name);
    setToMatches([]);
    setRecents(pushDestination(place));
  }

  function findJourney() {
    if (!location || !destination) return;
    setRecents(pushDestination(destination));
    router.push(
      journeyHref({
        fromLat: origin?.lat ?? location.lat,
        fromLng: origin?.lng ?? location.lng,
        toLat: destination.lat,
        toLng: destination.lng,
        fromStop: origin?.stopCode,
        toStop: destination.stopCode,
        fromLabel: originLabel,
        toLabel: destination.label,
      }),
    );
  }

  return (
    <div className="rounded-2xl border border-[var(--line)] bg-[var(--card)] p-3">
      <p className="mb-3 text-sm font-medium">Plan a journey</p>
      <div className="border-b border-[var(--line)] pb-3">
        <p className="text-[10px] font-medium uppercase tracking-[0.16em] text-[var(--muted)]">From</p>
        <button
          type="button"
          className="mt-1 flex w-full items-center justify-between gap-3 text-left"
          onClick={() => {
            setFromOpen((value) => !value);
            setPickMode(null);
          }}
        >
          <span className="flex min-w-0 items-center gap-2">
            <Navigation size={16} strokeWidth={2} className="shrink-0 text-[var(--accent)]" />
            <span className="truncate font-medium">{originLabel}</span>
          </span>
          <span className="text-xs text-[var(--accent)]">{fromOpen ? "Close" : "Change"}</span>
        </button>
        {fromOpen ? (
          <div className="mt-3 space-y-2">
            <button
              type="button"
              className="w-full rounded-xl border border-[var(--line)] px-3 py-2 text-left text-sm"
              onClick={() => {
                setOrigin(null);
                setFromOpen(false);
              }}
            >
              Current location
            </button>
            <button
              type="button"
              className={`w-full rounded-xl border px-3 py-2 text-left text-sm ${
                pickMode === "from" ? "border-[var(--accent)] text-[var(--accent)]" : "border-[var(--line)]"
              }`}
              onClick={() => setPickMode(pickMode === "from" ? null : "from")}
            >
              {pickMode === "from" ? "Tap a stop on the map…" : "Pick on map"}
            </button>
            <input
              value={fromQuery}
              onChange={(event) => setFromQuery(event.target.value)}
              placeholder="Search a stop"
              className="h-10 w-full rounded-xl border border-[var(--line)] bg-[var(--bg)] px-3 text-sm"
            />
            {fromMatches.map((stop) => (
              <button
                key={stop.code}
                type="button"
                className="flex w-full items-start gap-2 py-2 text-left text-sm"
                onClick={() => {
                  setOrigin({
                    label: stop.name,
                    lat: stop.latitude,
                    lng: stop.longitude,
                    stopCode: stop.code,
                  });
                  setFromOpen(false);
                  setFromQuery("");
                }}
              >
                <MapPin size={14} strokeWidth={2} className="mt-0.5 text-[var(--muted)]" />
                <span>
                  <span className="block font-medium">{stop.name}</span>
                  <span className="text-xs text-[var(--muted)]">{stop.code}</span>
                </span>
              </button>
            ))}
          </div>
        ) : null}
      </div>
      <div className="pt-3">
        <p className="text-[10px] font-medium uppercase tracking-[0.16em] text-[var(--muted)]">To</p>
        <div className="mt-1 flex items-center gap-2">
          <MapPin size={16} strokeWidth={2} className="text-[var(--muted)]" />
          <input
            value={toQuery}
            onChange={(event) => {
              setToQuery(event.target.value);
              setDestination(null);
            }}
            placeholder="Where do you want to go?"
            className="h-10 min-w-0 flex-1 rounded-xl border border-[var(--line)] bg-[var(--bg)] px-3 text-sm"
          />
        </div>
        <button
          type="button"
          className={`mt-2 text-xs ${pickMode === "to" ? "text-[var(--accent)]" : "text-[var(--muted)]"}`}
          onClick={() => setPickMode(pickMode === "to" ? null : "to")}
        >
          {pickMode === "to" ? "Tap a stop on the map…" : "Pick destination on map"}
        </button>
        {toMatches.length > 0 ? (
          <div className="mt-2 divide-y divide-[var(--line)]">
            {toMatches.map((stop) => (
              <button
                key={stop.code}
                type="button"
                className="flex w-full items-start gap-2 py-2 text-left text-sm"
                onClick={() => chooseDestination(stop)}
              >
                <MapPin size={14} strokeWidth={2} className="mt-0.5 text-[var(--muted)]" />
                <span>
                  <span className="block font-medium">{stop.name}</span>
                  <span className="text-xs text-[var(--muted)]">
                    {stop.code}
                    {stop.road_name ? ` · ${stop.road_name}` : ""}
                  </span>
                </span>
              </button>
            ))}
          </div>
        ) : null}
        {!toQuery && recents.length > 0 ? (
          <div className="mt-3">
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-medium uppercase tracking-[0.16em] text-[var(--muted)]">Recent</p>
              <button
                type="button"
                className="text-xs text-[var(--muted)]"
                onClick={() => setRecents(clearDestinations())}
              >
                Clear
              </button>
            </div>
            {recents.map((item) => (
              <div key={`${item.label}-${item.stopCode ?? item.lat}`} className="mt-1 flex items-center gap-2">
                <button
                  type="button"
                  className="min-w-0 flex-1 py-1.5 text-left text-sm"
                  onClick={() => {
                    setDestination(item);
                    setToQuery(item.label);
                  }}
                >
                  {item.label}
                </button>
                <button
                  type="button"
                  aria-label={`Remove ${item.label}`}
                  className="shrink-0 p-1.5 text-[var(--muted)]"
                  onClick={() => setRecents(removeDestination(item))}
                >
                  <X size={14} strokeWidth={2} />
                </button>
              </div>
            ))}
          </div>
        ) : null}
      </div>
      <button
        type="button"
        disabled={!location || !destination}
        onClick={findJourney}
        className="bf-on-accent mt-4 flex h-11 w-full items-center justify-center rounded-full bg-[var(--accent)] text-sm font-medium disabled:opacity-40"
      >
        Find journey
      </button>
    </div>
  );
}
