"use client";

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import type { JourneyOption, JourneyPlanResponse } from "./types";
import type { JourneyPlace } from "./journey";

type JourneySessionValue = {
  origin: JourneyPlace | null;
  destination: JourneyPlace | null;
  pickMode: "from" | "to" | null;
  selectedOption: JourneyOption | null;
  plan: JourneyPlanResponse | null;
  setOrigin: (place: JourneyPlace | null) => void;
  setDestination: (place: JourneyPlace | null) => void;
  setPickMode: (mode: "from" | "to" | null) => void;
  setSelectedOption: (option: JourneyOption | null) => void;
  setPlan: (plan: JourneyPlanResponse | null) => void;
};

const JourneySessionContext = createContext<JourneySessionValue | null>(null);

export function JourneyProvider({ children }: { children: ReactNode }) {
  const [origin, setOrigin] = useState<JourneyPlace | null>(null);
  const [destination, setDestination] = useState<JourneyPlace | null>(null);
  const [pickMode, setPickMode] = useState<"from" | "to" | null>(null);
  const [selectedOption, setSelectedOption] = useState<JourneyOption | null>(null);
  const [plan, setPlan] = useState<JourneyPlanResponse | null>(null);

  const setOriginAndClearPick = useCallback((place: JourneyPlace | null) => {
    setOrigin(place);
    setPickMode(null);
  }, []);
  const setDestinationAndClearPick = useCallback((place: JourneyPlace | null) => {
    setDestination(place);
    setPickMode(null);
  }, []);

  const value = useMemo(
    () => ({
      origin,
      destination,
      pickMode,
      selectedOption,
      plan,
      setOrigin: setOriginAndClearPick,
      setDestination: setDestinationAndClearPick,
      setPickMode,
      setSelectedOption,
      setPlan,
    }),
    [origin, destination, pickMode, selectedOption, plan, setOriginAndClearPick, setDestinationAndClearPick],
  );

  return <JourneySessionContext.Provider value={value}>{children}</JourneySessionContext.Provider>;
}

export function useJourneySession() {
  const context = useContext(JourneySessionContext);
  if (!context) {
    throw new Error("useJourneySession must be used within JourneyProvider");
  }
  return context;
}
