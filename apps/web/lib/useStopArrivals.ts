"use client";

import { useMemo } from "react";
import { useLiveStops } from "./live";

export function useStopArrivals(codes: string[]) {
  const live = useLiveStops(codes);
  return useMemo(
    () => ({
      data: live.data,
      loading: live.loading,
      reload: () => undefined,
    }),
    [live.data, live.loading],
  );
}
