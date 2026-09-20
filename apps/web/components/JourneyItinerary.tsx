"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronDown, ChevronRight, Footprints, MapPin, Navigation } from "lucide-react";
import { arriveClock, transferLabel } from "@/lib/journey";
import type { JourneyLeg, JourneyOption, Stop } from "@/lib/types";

export function JourneyItinerary({
  option,
  fromLabel,
  toLabel,
}: {
  option: JourneyOption;
  fromLabel: string;
  toLabel: string;
}) {
  const buses = option.legs.filter((leg) => leg.kind === "bus");
  return (
    <div className="overflow-hidden rounded-2xl border border-[var(--line)] bg-[var(--card)]">
      <div className="border-b border-[var(--line)] px-4 py-3">
        <p className="text-[10px] font-medium uppercase tracking-[0.16em] text-[var(--muted)]">Your trip</p>
        <div className="mt-1 flex items-end justify-between gap-3">
          <p className="leading-none">
            <span className="text-[28px] font-semibold tabular-nums tracking-tight">{option.duration_min}</span>
            <span className="ml-1 text-sm text-[var(--muted)]">min</span>
          </p>
          <p className="text-sm text-[var(--muted)]">Arrive {arriveClock(option.duration_min)}</p>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          {option.legs.map((leg, index) => (
            <span key={`${option.id}-chip-${index}`} className="flex items-center gap-1.5">
              {index > 0 ? <ChevronRight size={12} className="text-[var(--muted)]" /> : null}
              {leg.kind === "walk" ? (
                <span className="flex h-7 w-7 items-center justify-center rounded-full border border-[var(--line)] bg-[var(--bg)] text-[var(--muted)]">
                  <Footprints size={13} strokeWidth={2} />
                </span>
              ) : (
                <span className="bf-on-accent inline-flex h-7 min-w-11 items-center justify-center rounded-lg bg-[var(--accent)] px-2 font-mono text-[13px] font-semibold">
                  {leg.service_no}
                </span>
              )}
            </span>
          ))}
          <span className="ml-auto text-[11px] font-medium text-[var(--accent)]">{transferLabel(option.transfers)}</span>
        </div>
      </div>
      <ol className="px-4 pt-4">
        <PlaceRow icon="origin" title={fromLabel} last={false} />
        {option.legs.map((leg, index) => (
          <LegRows key={`${option.id}-itin-${index}`} leg={leg} />
        ))}
        <PlaceRow icon="dest" title={toLabel} last />
      </ol>
      {buses.length > 0 ? (
        <p className="px-4 pb-4 text-xs text-[var(--muted)]">Tap a bus number to see live arrivals.</p>
      ) : null}
    </div>
  );
}

function PlaceRow({ icon, title, last }: { icon: "origin" | "dest"; title: string; last: boolean }) {
  return (
    <li className="grid grid-cols-[22px_minmax(0,1fr)] gap-x-3">
      <div className="relative flex flex-col items-center">
        {icon === "origin" ? (
          <span className="z-10 mt-0.5 flex h-[22px] w-[22px] items-center justify-center rounded-full border-2 border-[var(--accent)] bg-[var(--card)]">
            <span className="h-2 w-2 rounded-full bg-[var(--accent)]" />
          </span>
        ) : (
          <span className="z-10 mt-0.5 flex h-[22px] w-[22px] items-center justify-center text-[var(--accent)]">
            <MapPin size={18} strokeWidth={2.2} />
          </span>
        )}
        {last ? null : <span className="absolute top-7 bottom-0 w-px bg-[var(--line)]" />}
      </div>
      <div className={last ? "pb-4" : "pb-5"}>
        <p className="flex items-center gap-2 pt-0.5 text-sm font-medium">
          {icon === "origin" ? <Navigation size={14} className="text-[var(--accent)]" /> : null}
          {title}
        </p>
      </div>
    </li>
  );
}

function LegRows({ leg }: { leg: JourneyLeg }) {
  if (leg.kind !== "bus") {
    return (
      <li className="grid grid-cols-[22px_minmax(0,1fr)] gap-x-3">
        <div className="relative flex flex-col items-center">
          <span className="z-10 mt-0.5 flex h-[22px] w-[22px] items-center justify-center rounded-full border border-[var(--line)] bg-[var(--bg)] text-[var(--muted)]">
            <Footprints size={11} strokeWidth={2.2} />
          </span>
          <span className="absolute top-7 bottom-0 w-px bg-[var(--line)]" />
        </div>
        <div className="pb-5">
          <div className="flex items-baseline justify-between gap-3">
            <p className="text-sm font-medium">Walk</p>
            <p className="text-xs tabular-nums text-[var(--muted)]">{leg.duration_min} min</p>
          </div>
          <p className="mt-0.5 text-sm text-[var(--muted)]">
            {leg.distance_m ? `${leg.distance_m} m` : null}
            {leg.distance_m && leg.to_label ? " · " : null}
            {leg.to_label ? `to ${leg.to_label}` : null}
          </p>
        </div>
      </li>
    );
  }

  const live = leg.live_minutes;
  const badge = (
    <span className="bf-on-accent inline-flex h-7 min-w-11 items-center justify-center rounded-lg bg-[var(--accent)] px-2 font-mono text-[13px] font-semibold">
      {leg.service_no}
    </span>
  );

  return (
    <li className="grid grid-cols-[22px_minmax(0,1fr)] gap-x-3">
      <div className="relative flex flex-col items-center">
        <span className="z-10 mt-0.5 flex h-[22px] w-[22px] items-center justify-center rounded-full bg-[var(--accent)]">
          <span className="h-1.5 w-1.5 rounded-full bg-[var(--on-accent)]" />
        </span>
        <span className="absolute top-7 bottom-0 w-1 rounded-full bg-[var(--accent)]" />
      </div>
      <div className="pb-5">
        <p className="text-sm font-medium">{leg.from_stop?.name ?? "Board"}</p>
        {leg.from_stop ? <p className="text-xs text-[var(--muted)]">{leg.from_stop.code}</p> : null}
        <div className="mt-2 flex items-center justify-between gap-3">
          <span className="flex min-w-0 items-center gap-2">
            {leg.from_stop && leg.service_no ? (
              <Link href={`/live/${leg.service_no}?stop=${leg.from_stop.code}`}>{badge}</Link>
            ) : (
              badge
            )}
            {leg.to_stop ? <span className="truncate text-sm text-[var(--muted)]">{leg.to_stop.name}</span> : null}
          </span>
          {live != null ? (
            <span className="shrink-0 text-xs font-medium tabular-nums text-[var(--live)]">
              {live <= 0 ? "Arriving" : `${live} min`}
            </span>
          ) : (
            <span className="shrink-0 text-xs tabular-nums text-[var(--muted)]">{leg.duration_min} min</span>
          )}
        </div>
        <RideStops stops={leg.via_stops ?? []} stopCount={leg.stop_count ?? 0} />
      </div>
    </li>
  );
}

function RideStops({ stops, stopCount }: { stops: Stop[]; stopCount: number }) {
  const [open, setOpen] = useState(false);
  const count = stopCount || stops.length;
  if (!count) return null;
  const label = `Ride ${count} ${count === 1 ? "stop" : "stops"}`;
  if (!stops.length) {
    return <p className="mt-1 text-xs text-[var(--muted)]">{label}</p>;
  }
  return (
    <div className="mt-1.5">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="inline-flex items-center gap-1 text-xs font-medium text-[var(--muted)]"
        aria-expanded={open}
      >
        {label}
        <ChevronDown size={13} className={open ? "rotate-180" : undefined} />
      </button>
      {open ? (
        <ol className="mt-2 space-y-2 border-l border-[var(--line)] pl-3">
          {stops.map((stop, index) => {
            const last = index === stops.length - 1;
            return (
              <li key={`${stop.code}-${index}`}>
                <Link href={`/stops/${stop.code}`} className="block min-w-0">
                  <p className="text-sm leading-snug">{stop.name}</p>
                  <p className="text-xs text-[var(--muted)]">
                    {stop.code}
                    {last ? " · Alight" : ""}
                  </p>
                </Link>
              </li>
            );
          })}
        </ol>
      ) : null}
    </div>
  );
}
