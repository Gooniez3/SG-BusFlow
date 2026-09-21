"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { transferLabel } from "@/lib/journey";
import type { AssistantCard } from "@/lib/types";

export function AssistantCards({ cards }: { cards: AssistantCard[] }) {
  if (!cards.length) return null;
  return (
    <div className="overflow-hidden rounded-2xl border border-[var(--line)] bg-[var(--card)]">
      {cards.map((card, index) => {
        const inner =
          card.kind === "journey" ? (
            <div className="w-full px-3.5 py-3 text-left">
              <div className="flex items-baseline justify-between gap-3">
                <p>
                  <span className="text-[22px] font-semibold tabular-nums tracking-tight">{card.duration_min}</span>
                  <span className="ml-1 text-sm text-[var(--muted)]">min</span>
                </p>
                {card.transfers != null ? (
                  <span className="rounded-full bg-[var(--bg)] px-2 py-0.5 text-[11px] font-medium text-[var(--muted)]">
                    {transferLabel(card.transfers)}
                  </span>
                ) : null}
              </div>
              {card.subtitle ? (
                <p className="mt-1 text-sm leading-snug">{card.subtitle.split(" · Next bus")[0]}</p>
              ) : null}
              {card.live_minutes != null ? (
                <p className="mt-1 text-xs font-medium tabular-nums text-[var(--live)]">
                  Next bus {card.live_minutes <= 0 ? "arriving" : `${card.live_minutes} min`}
                </p>
              ) : null}
              <p className="mt-2 text-xs font-medium text-[var(--accent)]">View journey</p>
            </div>
          ) : (
            <div className="flex w-full items-center gap-2 px-3.5 py-3 text-left">
              <div className="min-w-0 flex-1">
                <p className={card.kind === "service" || card.kind === "live_bus" ? "font-mono font-semibold" : "font-medium"}>
                  {card.title}
                </p>
                {card.subtitle ? <p className="mt-0.5 text-sm tabular-nums text-[var(--muted)]">{card.subtitle}</p> : null}
              </div>
              {card.href ? <ChevronRight size={16} strokeWidth={2} className="shrink-0 text-[var(--muted)]" /> : null}
            </div>
          );
        const rowClass = index === 0 ? "" : "border-t border-[var(--line)]";
        if (!card.href) {
          return (
            <div key={`${card.kind}-${index}`} className={rowClass}>
              {inner}
            </div>
          );
        }
        return (
          <Link key={`${card.kind}-${index}`} href={card.href} className={`block ${rowClass}`}>
            {inner}
          </Link>
        );
      })}
    </div>
  );
}
