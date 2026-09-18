"use client";

import { useEffect, useMemo, useState } from "react";
import { fetchArrivals } from "@/lib/api";
import type { StopArrivalsResponse } from "@/lib/types";

export function useStopArrivals(codes: string[]) {
  const key = codes.join(",");
  const [data, setData] = useState<Record<string, StopArrivalsResponse>>({});
  const [loading, setLoading] = useState(false);
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    if (!key) {
      setData({});
      return;
    }
    let cancelled = false;
    setLoading(true);
    const list = key.split(",");
    Promise.allSettled(
      list.map(async (code) => {
        const arrivals = await fetchArrivals(code);
        return [code, arrivals] as const;
      }),
    ).then((results) => {
      if (cancelled) return;
      const next: Record<string, StopArrivalsResponse> = {};
      for (const result of results) {
        if (result.status === "fulfilled") {
          next[result.value[0]] = result.value[1];
        }
      }
      setData(next);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [key, reloadToken]);

  return useMemo(
    () => ({
      data,
      loading,
      reload: () => setReloadToken((value) => value + 1),
    }),
    [data, loading],
  );
}
