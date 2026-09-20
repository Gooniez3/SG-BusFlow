"use client";

import { ChevronRight, Footprints } from "lucide-react";
import { journeySummary, nextBusMinutes, transferLabel } from "@/lib/journey";
import type { JourneyLeg, JourneyOption } from "@/lib/types";

export function JourneyResults({
  options,
  selectedId,
  onSelect,
}: {
  options: JourneyOption[];
  selectedId?: string | null;
  onSelect?: (option: JourneyOption) => void;
}) {
  return (
    <div className="space-y-2">
      <h2 className="text-xs font-medium uppercase tracking-[0.16em] text-[var(--muted)]">Journey options</h2>
      {options.map((option) => {
        const next = nextBusMinutes(option);
        const selected = selectedId === option.id;
        return (
          <button
            key={option.id}
            type="button"
            onClick={() => onSelect?.(option)}
            className={`w-full rounded-2xl border px-3.5 py-3 text-left transition-colors ${
              selected
                ? "border-[var(--accent)] bg-[var(--accent-soft)]"
                : "border-[var(--line)] bg-[var(--card)]"
            }`}
          >
            <div className="flex items-baseline justify-between gap-3">
              <p>
                <span className="text-[22px] font-semibold tabular-nums tracking-tight">{option.duration_min}</span>
                <span className="ml-1 text-sm text-[var(--muted)]">min</span>
              </p>
              <span className="rounded-full bg-[var(--card)] px-2 py-0.5 text-[11px] font-medium text-[var(--muted)]">
                {transferLabel(option.transfers)}
              </span>
            </div>
            <p className="mt-1 text-sm leading-snug text-[var(--ink)]">{journeySummary(option)}</p>
            {next != null ? (
              <p className="mt-1 text-xs font-medium tabular-nums text-[var(--live)]">
                Next bus {next <= 0 ? "arriving" : `${next} min`}
              </p>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}

export function JourneyDetails({ option }: { option: JourneyOption }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-[var(--line)] bg-[var(--card)]">
      <div className="flex items-end justify-between gap-3 border-b border-[var(--line)] px-4 py-3">
        <div>
          <p className="text-[10px] font-medium uppercase tracking-[0.16em] text-[var(--muted)]">Journey details</p>
          <p className="mt-0.5 leading-none">
            <span className="text-2xl font-semibold tabular-nums tracking-tight">{option.duration_min}</span>
            <span className="ml-1 text-sm text-[var(--muted)]">min</span>
          </p>
        </div>
        <span className="mb-0.5 inline-flex items-center gap-1 rounded-full bg-[var(--accent-soft)] px-2.5 py-1 text-[11px] font-medium text-[var(--accent)]">
          {transferLabel(option.transfers)}
          <ChevronRight size={12} strokeWidth={2.4} />
        </span>
      </div>
      <ol className="px-4 pt-4">
        {option.legs.map((leg, index) => (
          <TimelineStep key={`${option.id}-detail-${index}`} leg={leg} last={index === option.legs.length - 1} />
        ))}
      </ol>
    </div>
  );
}

function TimelineStep({ leg, last }: { leg: JourneyLeg; last: boolean }) {
  const bus = leg.kind === "bus";
  return (
    <li className="grid grid-cols-[22px_minmax(0,1fr)] gap-x-3">
      <div className="relative flex flex-col items-center">
        <span
          className={`z-10 mt-0.5 flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full ${
            bus ? "bg-[var(--accent)]" : "border border-[var(--line)] bg-[var(--bg)] text-[var(--muted)]"
          }`}
        >
          {bus ? <span className="h-1.5 w-1.5 rounded-full bg-[var(--on-accent)]" /> : <Footprints size={11} strokeWidth={2.2} />}
        </span>
        {last ? null : <span className="absolute top-7 bottom-0 w-px bg-[var(--line)]" />}
      </div>
      <div className={last ? "pb-4" : "pb-5"}>
        {bus ? <BusLegBody leg={leg} /> : <WalkLegBody leg={leg} />}
      </div>
    </li>
  );
}

function WalkLegBody({ leg }: { leg: JourneyLeg }) {
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-sm font-medium">Walk</p>
        <p className="text-xs tabular-nums text-[var(--muted)]">{leg.duration_min} min</p>
      </div>
      {leg.to_label ? <p className="mt-0.5 truncate text-sm text-[var(--muted)]">to {leg.to_label}</p> : null}
    </div>
  );
}

function BusLegBody({ leg }: { leg: JourneyLeg }) {
  const live = leg.live_minutes;
  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <span className="bf-on-accent inline-flex h-7 min-w-11 items-center justify-center rounded-lg bg-[var(--accent)] px-2 font-mono text-[13px] font-semibold">
          {leg.service_no}
        </span>
        {live != null ? (
          <span className="text-xs font-medium tabular-nums text-[var(--live)]">
            {live <= 0 ? "Arriving" : `${live} min`}
          </span>
        ) : (
          <span className="text-xs tabular-nums text-[var(--muted)]">{leg.duration_min} min</span>
        )}
      </div>
      {leg.from_stop ? (
        <p className="mt-2 text-sm leading-snug">
          <span className="text-[10px] font-medium uppercase tracking-[0.14em] text-[var(--muted)]">Board</span>
          <span className="ml-2 font-medium">{leg.from_stop.name}</span>
          <span className="ml-1.5 text-xs text-[var(--muted)]">{leg.from_stop.code}</span>
        </p>
      ) : null}
      {leg.to_stop ? (
        <p className="mt-1 text-sm leading-snug">
          <span className="text-[10px] font-medium uppercase tracking-[0.14em] text-[var(--muted)]">Alight</span>
          <span className="ml-2 font-medium">{leg.to_stop.name}</span>
          {leg.stop_count ? (
            <span className="ml-1.5 text-xs text-[var(--muted)]">
              {leg.stop_count} {leg.stop_count === 1 ? "stop" : "stops"}
            </span>
          ) : null}
        </p>
      ) : null}
    </div>
  );
}
