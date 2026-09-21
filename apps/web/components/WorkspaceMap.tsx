"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { LocateFixed } from "lucide-react";
import { DynamicStopMap } from "@/components/DynamicStopMap";
import { MobileMapOverlay } from "@/components/MobileMapOverlay";
import { busesFromServices, uniqueBuses } from "@/lib/buses";
import { fetchStop } from "@/lib/api";
import { journeyPoints } from "@/lib/journey";
import { useJourneySession } from "@/lib/journey-session";
import { useWorkspace } from "@/lib/workspace";
import type { Stop } from "@/lib/types";

export function WorkspaceMap() {
  const router = useRouter();
  const pathname = usePathname();
  const mapPage = pathname === "/map";
  const liveService = pathname.match(/^\/live\/([^/]+)/)?.[1]?.toUpperCase() ?? null;
  const stopPage = pathname.startsWith("/stops/");
  const servicePage = pathname.match(/^\/services\/([^/]+)/)?.[1]?.toUpperCase() ?? null;
  const focused = Boolean(liveService || stopPage || servicePage);
  const trackedService = liveService ?? servicePage;
  const mapKey = mapPage ? "mobile-map" : "workspace-map";
  const [mobile, setMobile] = useState(false);
  const [extraStop, setExtraStop] = useState<Stop | null>(null);
  const {
    location,
    stops,
    selectedCode,
    setSelectedCode,
    preview,
    reload,
  } = useWorkspace();
  const { pickMode, setOrigin, setDestination, selectedOption, plan, setPickMode } = useJourneySession();
  const selectedStop = stops.find((stop) => stop.code === selectedCode) ?? extraStop;
  const journeyStops = useMemo(() => {
    if (!selectedOption || !plan) return [];
    const collected: Stop[] = [];
    for (const leg of selectedOption.legs) {
      if (leg.from_stop) collected.push(leg.from_stop);
      for (const stop of leg.via_stops ?? []) collected.push(stop);
      if (leg.to_stop) collected.push(leg.to_stop);
    }
    return collected.filter((stop, index, list) => list.findIndex((item) => item.code === stop.code) === index);
  }, [plan, selectedOption]);
  const showJourney = pathname.startsWith("/journey") && selectedOption && plan;
  const mapStops = useMemo(() => {
    if (showJourney && journeyStops.length > 0) return journeyStops;
    if (focused && selectedStop) return [selectedStop];
    return stops;
  }, [focused, journeyStops, selectedStop, showJourney, stops]);
  const path = useMemo(() => {
    if (!showJourney || !selectedOption || !plan) return undefined;
    return journeyPoints(selectedOption, { lat: plan.from_lat, lng: plan.from_lng }, { lat: plan.to_lat, lng: plan.to_lng });
  }, [plan, selectedOption, showJourney]);
  const buses = useMemo(() => {
    if (!selectedCode || !preview || preview.bus_stop_code !== selectedCode) return [];
    const list = uniqueBuses(busesFromServices(preview.services));
    if (trackedService) return list.filter((bus) => bus.serviceNo === trackedService);
    return list;
  }, [preview, selectedCode, trackedService]);

  useEffect(() => {
    const media = window.matchMedia("(max-width: 767px)");
    const sync = () => setMobile(media.matches);
    sync();
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    if (!selectedCode) {
      setExtraStop(null);
      return;
    }
    if (stops.some((item) => item.code === selectedCode)) {
      setExtraStop(null);
      return;
    }
    let cancelled = false;
    fetchStop(selectedCode)
      .then((stop) => {
        if (!cancelled) setExtraStop(stop);
      })
      .catch(() => {
        if (!cancelled) setExtraStop(null);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedCode, stops]);

  if (!location) {
    return <div className="bf-map-slot" />;
  }

  return (
    <div className="relative h-full min-h-0 w-full">
      <DynamicStopMap
        key={mapKey}
        lat={location.lat}
        lng={location.lng}
        userLat={location.lat}
        userLng={location.lng}
        stops={mapStops}
        buses={showJourney ? [] : buses}
        selectedCode={selectedCode}
        showUser={!focused || pathname.startsWith("/journey") || pathname === "/search"}
        fitToBus={Boolean(!path && (trackedService || (selectedCode && buses.length > 0)))}
        path={path}
        bottomPad={mapPage && mobile ? 250 : 0}
        onSelectStop={(code) => {
          if (pickMode) {
            const known = stops.find((item) => item.code === code) ?? extraStop;
            const assign = (stop: Stop) => {
              const place = { label: stop.name, lat: stop.latitude, lng: stop.longitude, stopCode: stop.code };
              if (pickMode === "from") setOrigin(place);
              else setDestination(place);
              setPickMode(null);
            };
            if (known) {
              assign(known);
              return;
            }
            void fetchStop(code).then(assign).catch(() => undefined);
            return;
          }
          setSelectedCode(code);
        }}
        onSelectBus={(serviceNo) => {
          const stop = selectedCode ?? stops[0]?.code;
          if (stop) {
            router.push(`/live/${serviceNo}?stop=${stop}`);
          }
        }}
      />
      {mapPage ? <MobileMapOverlay /> : null}
      {trackedService && selectedStop && buses.length === 0 && !showJourney ? (
        <p className="pointer-events-none absolute bottom-3 left-3 right-3 z-[1200] rounded-lg bg-[var(--glass)] px-3 py-2 text-xs text-[var(--muted)] md:bottom-8 md:left-4 md:right-20 md:max-w-sm">
          LTA has not published this bus GPS yet. The numbered badge appears when a location is reported.
        </p>
      ) : null}
      <button
        type="button"
        onClick={() => {
          setSelectedCode(null);
          reload();
        }}
        className="bf-shadow absolute bottom-8 right-5 z-[1200] hidden h-11 w-11 items-center justify-center rounded-full border border-[var(--line)] bg-[var(--card)] text-[var(--ink)] md:flex"
        aria-label="Use current location"
      >
        <LocateFixed size={18} strokeWidth={2} />
      </button>
    </div>
  );
}
