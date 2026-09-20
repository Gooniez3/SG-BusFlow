"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { fetchNearby } from "./api";
import { useStopLive, type LiveStatus } from "./live";
import { requestUserLocation, type UserLocation } from "./location";
import type { Stop, StopArrivalsResponse } from "./types";

type WorkspaceValue = {
  location: UserLocation | null;
  locationLoading: boolean;
  stops: Stop[];
  stopsLoading: boolean;
  error: string | null;
  selectedCode: string | null;
  setSelectedCode: (code: string | null) => void;
  preview: StopArrivalsResponse | null;
  previewLoading: boolean;
  previewError: string | null;
  liveStatus: LiveStatus;
  reload: () => void;
};

const WorkspaceContext = createContext<WorkspaceValue | null>(null);

export function WorkspaceProvider({ children }: { children: React.ReactNode }) {
  const [location, setLocation] = useState<UserLocation | null>(null);
  const [locationLoading, setLocationLoading] = useState(true);
  const [stops, setStops] = useState<Stop[]>([]);
  const [stopsLoading, setStopsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCode, setSelectedCode] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  const live = useStopLive(selectedCode);

  const reload = useCallback(() => setReloadToken((value) => value + 1), []);

  useEffect(() => {
    let cancelled = false;
    setLocationLoading(true);
    requestUserLocation().then(async (current) => {
      if (cancelled) return;
      setLocation(current);
      setLocationLoading(false);
      setStopsLoading(true);
      try {
        const result = await fetchNearby(current.lat, current.lng);
        if (!cancelled) {
          setStops(result.stops);
          setError(null);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Could not load nearby stops");
        }
      } finally {
        if (!cancelled) setStopsLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [reloadToken]);

  const preview = live.data;
  const previewError = live.error;
  const previewLoading = Boolean(selectedCode) && !live.data && !live.error;
  const liveStatus = live.status;

  const value = useMemo(
    () => ({
      location,
      locationLoading,
      stops,
      stopsLoading,
      error,
      selectedCode,
      setSelectedCode,
      preview,
      previewLoading,
      previewError,
      liveStatus,
      reload,
    }),
    [
      location,
      locationLoading,
      stops,
      stopsLoading,
      error,
      selectedCode,
      preview,
      previewLoading,
      previewError,
      liveStatus,
      reload,
    ],
  );

  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>;
}

export function useWorkspace() {
  const context = useContext(WorkspaceContext);
  if (!context) {
    throw new Error("useWorkspace must be used within WorkspaceProvider");
  }
  return context;
}
