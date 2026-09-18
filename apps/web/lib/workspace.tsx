"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { fetchArrivals, fetchNearby } from "./api";
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
  const [preview, setPreview] = useState<StopArrivalsResponse | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

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

  useEffect(() => {
    if (!selectedCode) {
      setPreview(null);
      setPreviewError(null);
      setPreviewLoading(false);
      return;
    }
    let cancelled = false;
    setPreviewLoading(true);
    setPreviewError(null);
    fetchArrivals(selectedCode)
      .then((data) => {
        if (!cancelled) setPreview(data);
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setPreview(null);
          setPreviewError(err instanceof Error ? err.message : "Live arrivals unavailable");
        }
      })
      .finally(() => {
        if (!cancelled) setPreviewLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedCode]);

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
