import { useEffect, useMemo, useState } from "react";
import { apiUrl } from "./api";
import type { StopArrivalsResponse } from "./types";

type LiveMessage<T> = {
  type: string;
  payload?: T | null;
  detail?: string;
};

export function wsUrl(path: string) {
  const root = apiUrl().replace(/\/$/, "");
  const protocol = root.startsWith("https") ? "wss" : "ws";
  return `${root.replace(/^https?/, protocol)}${path}`;
}

function connectLive<T>(path: string, onMessage: (payload: T | null, error?: string) => void) {
  let closed = false;
  let socket: WebSocket | null = null;
  let retry: ReturnType<typeof setTimeout> | undefined;
  let ping: ReturnType<typeof setInterval> | undefined;
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
      ping = setInterval(() => {
        if (socket?.readyState === WebSocket.OPEN) socket.send("ping");
      }, 20000);
    };
    socket.onclose = () => {
      if (ping) clearInterval(ping);
      ping = undefined;
      if (!closed) {
        retry = setTimeout(open, delay);
        delay = Math.min(delay * 2, 15000);
      }
    };
  }

  open();
  return () => {
    closed = true;
    if (retry) clearTimeout(retry);
    if (ping) clearInterval(ping);
    socket?.close();
  };
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
    const sockets = list.map((code) =>
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
      for (const close of sockets) close();
    };
  }, [key]);

  return useMemo(
    () => ({ data, error, loading: key.length > 0 && Object.keys(data).length === 0 }),
    [data, error, key],
  );
}

export function useStopLive(code: string | null) {
  const [data, setData] = useState<StopArrivalsResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!code) {
      setData(null);
      setError(null);
      return;
    }
    return connectLive<StopArrivalsResponse>(`/ws/v1/stops/${code}`, (payload, liveError) => {
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

  return useMemo(() => ({ data, error }), [data, error]);
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
    if (!serviceNo || !stopCode) {
      setData(null);
      return;
    }
    return connectLive<ServiceLive>(
      `/ws/v1/services/${serviceNo}?stop=${encodeURIComponent(stopCode)}`,
      (payload, liveError) => {
        if (liveError) {
          setError(liveError);
          return;
        }
        setData(payload);
        setError(null);
      },
    );
  }, [serviceNo, stopCode]);

  return useMemo(() => ({ data, error }), [data, error]);
}
