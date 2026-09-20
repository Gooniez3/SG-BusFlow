"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { StopArrivalsResponse } from "./types";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000";

export type LiveStatus = "idle" | "connecting" | "live" | "reconnecting" | "offline";

type LiveMessage<T> = {
  type: string;
  channel?: string;
  id?: string;
  payload?: T | null;
  detail?: string;
};

export function wsUrl(path: string) {
  const root = API_URL.replace(/\/$/, "");
  const protocol = root.startsWith("https") ? "wss" : "ws";
  return `${root.replace(/^https?/, protocol)}${path}`;
}

function connectLive<T>(
  path: string,
  onMessage: (payload: T | null, error?: string) => void,
  onStatus?: (status: LiveStatus) => void,
) {
  let closed = false;
  let hidden = typeof document !== "undefined" && document.visibilityState === "hidden";
  let socket: WebSocket | null = null;
  let retry: number | undefined;
  let ping: number | undefined;
  let delay = 1000;
  let everLive = false;

  function setStatus(status: LiveStatus) {
    onStatus?.(status);
  }

  function stopPing() {
    if (ping) window.clearInterval(ping);
    ping = undefined;
  }

  function open() {
    if (closed) return;
    if (hidden) {
      setStatus(everLive ? "reconnecting" : "connecting");
      return;
    }
    if (typeof navigator !== "undefined" && navigator.onLine === false) {
      setStatus("offline");
      retry = window.setTimeout(open, delay);
      delay = Math.min(delay * 2, 15000);
      return;
    }
    setStatus(everLive ? "reconnecting" : "connecting");
    socket = new WebSocket(wsUrl(path));
    socket.onmessage = (event) => {
      if (event.data === "pong") return;
      try {
        const message = JSON.parse(String(event.data)) as LiveMessage<T>;
        if (message.type === "error") {
          onMessage(null, message.detail ?? "Live arrivals are temporarily unavailable");
          return;
        }
        if (message.payload) onMessage(message.payload);
      } catch {
        /* ignore keepalives */
      }
    };
    socket.onopen = () => {
      delay = 1000;
      everLive = true;
      setStatus("live");
      ping = window.setInterval(() => {
        if (socket?.readyState === WebSocket.OPEN) socket.send("ping");
      }, 20000);
    };
    socket.onclose = () => {
      stopPing();
      if (closed) {
        setStatus("offline");
        return;
      }
      if (hidden) {
        setStatus("reconnecting");
        return;
      }
      setStatus(everLive ? "reconnecting" : "connecting");
      retry = window.setTimeout(open, delay);
      delay = Math.min(delay * 2, 15000);
    };
  }

  function reconnectNow() {
    if (closed || hidden) return;
    delay = 1000;
    if (retry) window.clearTimeout(retry);
    retry = undefined;
    if (socket?.readyState === WebSocket.OPEN || socket?.readyState === WebSocket.CONNECTING) {
      return;
    }
    open();
  }

  function onVisible() {
    hidden = document.visibilityState === "hidden";
    if (hidden) {
      if (retry) window.clearTimeout(retry);
      retry = undefined;
      socket?.close();
      setStatus(everLive ? "reconnecting" : "connecting");
      return;
    }
    reconnectNow();
  }

  function onOnline() {
    reconnectNow();
  }

  open();
  document.addEventListener("visibilitychange", onVisible);
  window.addEventListener("online", onOnline);

  return () => {
    closed = true;
    if (retry) window.clearTimeout(retry);
    stopPing();
    document.removeEventListener("visibilitychange", onVisible);
    window.removeEventListener("online", onOnline);
    socket?.close();
  };
}

export function useStopLive(code: string | null) {
  const [data, setData] = useState<StopArrivalsResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<LiveStatus>("idle");
  const generation = useRef(0);

  useEffect(() => {
    if (!code) {
      setData(null);
      setError(null);
      setStatus("idle");
      return;
    }
    const ticket = ++generation.current;
    setData(null);
    setError(null);
    setStatus("connecting");
    return connectLive<StopArrivalsResponse>(
      `/ws/v1/stops/${code}`,
      (payload, liveError) => {
        if (ticket !== generation.current) return;
        if (liveError) {
          setError(liveError);
          return;
        }
        if (payload) {
          setData(payload);
          setError(null);
        }
      },
      (next) => {
        if (ticket !== generation.current) return;
        setStatus(next);
      },
    );
  }, [code]);

  return useMemo(
    () => ({ data, error, status, connected: status === "live" }),
    [data, error, status],
  );
}

export function useLiveStops(codes: string[]) {
  const key = codes.join(",");
  const [data, setData] = useState<Record<string, StopArrivalsResponse>>({});
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!key) {
      setData({});
      return;
    }
    const list = key.split(",");
    const next: Record<string, StopArrivalsResponse> = {};
    const stops = list.map((code) =>
      connectLive<StopArrivalsResponse>(`/ws/v1/stops/${code}`, (payload, liveError) => {
        if (liveError) {
          setError(liveError);
          return;
        }
        if (!payload) return;
        next[code] = payload;
        setData({ ...next });
        setError(null);
      }),
    );
    return () => {
      for (const stop of stops) stop();
    };
  }, [key]);

  return useMemo(
    () => ({ data, error, loading: key.length > 0 && Object.keys(data).length === 0 }),
    [data, error, key],
  );
}

export type ServiceLive = {
  service_no: string;
  stop_code: string;
  cached_at: string;
  stale: boolean;
  operator?: string | null;
  arrivals: StopArrivalsResponse["services"][number]["arrivals"];
};

export function useServiceLive(serviceNo: string | null, stopCode: string | null) {
  const [data, setData] = useState<ServiceLive | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<LiveStatus>("idle");

  useEffect(() => {
    if (!serviceNo) {
      setData(null);
      setStatus("idle");
      return;
    }
    const query = stopCode ? `?stop=${encodeURIComponent(stopCode)}` : "";
    setStatus("connecting");
    return connectLive<ServiceLive>(
      `/ws/v1/services/${serviceNo}${query}`,
      (payload, liveError) => {
        if (liveError) {
          setError(liveError);
          return;
        }
        if (payload) {
          setData(payload);
          setError(null);
        }
      },
      setStatus,
    );
  }, [serviceNo, stopCode]);

  return useMemo(() => ({ data, error, status }), [data, error, status]);
}
