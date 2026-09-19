"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { StopArrivalsResponse } from "./types";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000";

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

function connectLive<T>(path: string, onMessage: (payload: T | null, error?: string) => void) {
  let closed = false;
  let socket: WebSocket | null = null;
  let retry: number | undefined;
  let ping: number | undefined;
  let delay = 1000;

  function open() {
    socket = new WebSocket(wsUrl(path));
    socket.onmessage = (event) => {
      if (event.data === "pong") return;
      try {
        const message = JSON.parse(String(event.data)) as LiveMessage<T>;
        if (message.type === "error") {
          onMessage(null, message.detail ?? "Live connection error");
          return;
        }
        onMessage(message.payload ?? null);
      } catch {
        /* ignore keepalives */
      }
    };
    socket.onopen = () => {
      delay = 1000;
      ping = window.setInterval(() => {
        if (socket?.readyState === WebSocket.OPEN) socket.send("ping");
      }, 20000);
    };
    socket.onclose = () => {
      if (ping) window.clearInterval(ping);
      ping = undefined;
      if (!closed) {
        retry = window.setTimeout(open, delay);
        delay = Math.min(delay * 2, 15000);
      }
    };
  }

  open();
  return () => {
    closed = true;
    if (retry) window.clearTimeout(retry);
    if (ping) window.clearInterval(ping);
    socket?.close();
  };
}

export function useStopLive(code: string | null) {
  const [data, setData] = useState<StopArrivalsResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);
  const generation = useRef(0);

  useEffect(() => {
    if (!code) {
      setData(null);
      setError(null);
      setConnected(false);
      return;
    }
    const ticket = ++generation.current;
    setConnected(true);
    setError(null);
    return connectLive<StopArrivalsResponse>(`/ws/v1/stops/${code}`, (payload, liveError) => {
      if (ticket !== generation.current) return;
      if (liveError) {
        setError(liveError);
        return;
      }
      if (payload) {
        setData(payload);
        setError(null);
      }
    });
  }, [code]);

  useEffect(() => {
    return () => {
      setConnected(false);
    };
  }, [code]);

  return useMemo(() => ({ data, error, connected }), [data, error, connected]);
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

  return useMemo(() => ({ data, error, loading: key.length > 0 && Object.keys(data).length === 0 }), [data, error, key]);
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

  useEffect(() => {
    if (!serviceNo) {
      setData(null);
      return;
    }
    const query = stopCode ? `?stop=${encodeURIComponent(stopCode)}` : "";
    return connectLive<ServiceLive>(`/ws/v1/services/${serviceNo}${query}`, (payload, liveError) => {
      if (liveError) {
        setError(liveError);
        return;
      }
      setData(payload);
      setError(null);
    });
  }, [serviceNo, stopCode]);

  return useMemo(() => ({ data, error }), [data, error]);
}
