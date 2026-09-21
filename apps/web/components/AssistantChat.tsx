"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { ArrowUp, Sparkles } from "lucide-react";
import { AssistantCards } from "@/components/AssistantCards";
import { fetchAssistantStatus, postAssistantChat } from "@/lib/api";
import { journeySummary } from "@/lib/journey";
import { useJourneySession } from "@/lib/journey-session";
import type { AssistantCard, AssistantContext } from "@/lib/types";
import { useWorkspace } from "@/lib/workspace";

type ChatItem = {
  role: "user" | "assistant";
  content: string;
  cards?: AssistantCard[];
};

const BASE_CHIPS = [
  "Find buses near me",
  "How do I get to Changi Airport?",
  "When is the next 230?",
];

const SETUP_DETAIL =
  "Add GROQ_API_KEY or GEMINI_API_KEY to backend/api/.env, then restart the API. Nearby, search, and journeys still work.";

function AiMark() {
  return (
    <span
      className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[var(--accent-soft)] text-[var(--accent)]"
      aria-hidden
    >
      <Sparkles size={14} strokeWidth={2.2} />
    </span>
  );
}

function Thinking() {
  return (
    <div className="flex items-start gap-2.5">
      <AiMark />
      <div className="flex h-11 items-center gap-1.5 rounded-[20px] rounded-bl-md border border-[var(--line)] bg-[var(--card)] px-4">
        <span className="bf-ai-dot" />
        <span className="bf-ai-dot" />
        <span className="bf-ai-dot" />
      </div>
    </div>
  );
}

export function AssistantChat() {
  const { location, selectedCode, stops, preview } = useWorkspace();
  const { plan, selectedOption, origin, destination } = useJourneySession();
  const [items, setItems] = useState<ChatItem[]>([]);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState<boolean | null>(null);
  const scroller = useRef<HTMLDivElement>(null);

  const selectedStop = stops.find((stop) => stop.code === selectedCode);
  const stopName = selectedStop?.name;

  useEffect(() => {
    fetchAssistantStatus()
      .then((status) => setReady(status.ready))
      .catch(() => setReady(false));
  }, []);

  const context = useMemo<AssistantContext>(() => {
    const payload: AssistantContext = {};
    if (selectedCode) payload.stop_code = selectedCode;
    if (stopName) payload.stop_name = stopName;
    if (location) {
      payload.lat = location.lat;
      payload.lng = location.lng;
    }
    const serviceNo = preview?.services[0]?.service_no;
    if (serviceNo && selectedCode && preview?.bus_stop_code === selectedCode) {
      payload.service_no = serviceNo;
    }
    if (plan && selectedOption) {
      payload.journey = {
        from_label: plan.from_label,
        to_label: plan.to_label,
        from_lat: plan.from_lat,
        from_lng: plan.from_lng,
        to_lat: plan.to_lat,
        to_lng: plan.to_lng,
        from_stop: origin?.stopCode,
        to_stop: destination?.stopCode,
        duration_min: selectedOption.duration_min,
        summary: journeySummary(selectedOption),
      };
    }
    return payload;
  }, [destination?.stopCode, location, origin?.stopCode, plan, preview, selectedCode, selectedOption, stopName]);

  const chips = useMemo(() => {
    const next = [...BASE_CHIPS];
    if (plan && selectedOption) next.push("Explain my current journey");
    return next;
  }, [plan, selectedOption]);

  async function send(text: string) {
    const content = text.trim();
    if (!content || busy || ready === false) return;
    const previous = items;
    const nextItems: ChatItem[] = [...items, { role: "user", content }];
    setItems(nextItems);
    setDraft("");
    setBusy(true);
    try {
      const result = await postAssistantChat(
        nextItems.map((item) => ({ role: item.role, content: item.content })),
        context,
      );
      setReady(true);
      setItems([...nextItems, { role: "assistant", content: result.reply, cards: result.cards }]);
    } catch (err) {
      const message = err instanceof Error ? err.message : "BusFlow AI is unavailable right now.";
      if (message.includes("API_KEY")) {
        setReady(false);
        setItems(previous);
        return;
      }
      setItems([...nextItems, { role: "assistant", content: message }]);
    } finally {
      setBusy(false);
      window.setTimeout(() => {
        scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: "smooth" });
      }, 50);
    }
  }

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    void send(draft);
  }

  const chatting = items.length > 0;

  return (
    <section data-ai-page className="flex min-h-0 flex-1 flex-col">
      <div className="-mx-3 -mt-3 flex shrink-0 items-center gap-2.5 border-b border-[var(--line)] bg-[var(--card)] px-3 py-2.5 md:-mx-4 md:-mt-4 md:px-4">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] bg-[var(--accent-soft)] text-[var(--accent)]">
          <Sparkles size={16} strokeWidth={2.2} />
        </span>
        <h1 className="text-xl font-semibold tracking-tight">AI</h1>
        <span className="flex-1" />
      </div>

      <div ref={scroller} className="mt-4 min-h-0 flex-1 space-y-5 overflow-y-auto pr-1 pb-2">
        {ready === false ? (
          <div className="rounded-2xl border border-[var(--line)] bg-[var(--card)] px-4 py-5">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--accent-soft)] text-[var(--accent)]">
              <Sparkles size={18} strokeWidth={2} />
            </div>
            <p className="mt-3 font-medium">AI needs a server key</p>
            <p className="mt-1 text-sm text-[var(--muted)]">{SETUP_DETAIL}</p>
          </div>
        ) : chatting ? (
          items.map((item, index) =>
            item.role === "user" ? (
              <div key={`user-${index}`} className="flex justify-end">
                <p className="bf-on-accent max-w-[82%] rounded-[20px] rounded-br-md bg-[var(--accent)] px-4 py-2.5 text-[15px] leading-relaxed">
                  {item.content}
                </p>
              </div>
            ) : (
              <div key={`assistant-${index}`} className="flex items-start gap-2.5">
                <AiMark />
                <div className="min-w-0 flex-1 space-y-2">
                  {item.content ? (
                    <p className="max-w-[95%] rounded-[20px] rounded-bl-md border border-[var(--line)] bg-[var(--card)] px-4 py-2.5 text-[15px] leading-relaxed text-[var(--ink)]">
                      {item.content}
                    </p>
                  ) : null}
                  {item.cards?.length ? <AssistantCards cards={item.cards} /> : null}
                </div>
              </div>
            ),
          )
        ) : (
          <div className="rounded-2xl border border-[var(--line)] bg-[var(--card)] px-4 py-4">
            <p className="font-semibold">Ask BusFlow</p>
            <p className="mt-1 text-sm leading-relaxed text-[var(--muted)]">
              Ask a question. I’ll look up live BusFlow data and answer here.
            </p>
          </div>
        )}
        {busy ? <Thinking /> : null}
      </div>

      <div className="sticky bottom-0 z-10 -mx-3 mt-auto border-t border-[var(--line)] bg-[var(--bg)] px-3 pt-3 md:-mx-4 md:px-4">
        {ready !== false ? (
          <div className="-mx-1 mb-2 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {chips.map((chip) => (
              <button
                key={chip}
                type="button"
                disabled={busy}
                onClick={() => void send(chip)}
                className="shrink-0 rounded-full border border-[var(--line)] bg-[var(--card)] px-3 py-1.5 text-xs text-[var(--ink)] disabled:opacity-50"
              >
                {chip}
              </button>
            ))}
          </div>
        ) : null}
        <form onSubmit={onSubmit} className="relative pb-3 md:pb-2">
          <label className="sr-only" htmlFor="ai-draft">
            Ask BusFlow
          </label>
          <input
            id="ai-draft"
            value={draft}
            disabled={busy || ready === false}
            onChange={(event) => setDraft(event.target.value)}
            placeholder={ready === false ? "AI is waiting for a server key" : "Ask about a bus, stop, or journey"}
            className="h-12 w-full rounded-full border border-[var(--line)] bg-[var(--card)] py-3 pl-4 pr-14 text-[15px]"
          />
          <button
            type="submit"
            disabled={busy || ready === false || !draft.trim()}
            className="bf-on-accent absolute inset-y-1.5 right-1.5 flex h-9 w-9 items-center justify-center rounded-full bg-[var(--accent)] disabled:opacity-40"
            aria-label="Send"
          >
            <ArrowUp size={16} strokeWidth={2.4} />
          </button>
        </form>
      </div>
    </section>
  );
}
