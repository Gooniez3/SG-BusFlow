"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { LocateFixed } from "lucide-react";
import { DynamicStopMap } from "@/components/DynamicStopMap";
import { MobileMapOverlay } from "@/components/MobileMapOverlay";
import type { BusMarker } from "@/components/StopMap";
import { fetchStop } from "@/lib/api";
import { useWorkspace } from "@/lib/workspace";
import type { ServiceArrivals, Stop } from "@/lib/types";

function hasGps(arrival: { latitude: number | null; longitude: number | null }) {
  return Boolean(
    arrival.latitude &&
      arrival.longitude &&
      Math.abs(arrival.latitude) > 0.1 &&
      Math.abs(arrival.longitude) > 0.1,
  );
}

function nextBus(service: ServiceArrivals): BusMarker | null {
  const arrival = service.arrivals.find(hasGps);
  if (!arrival?.latitude || !arrival.longitude) return null;
  return {
    serviceNo: service.service_no,
    lat: arrival.latitude,
    lng: arrival.longitude,
    minutes: arrival.minutes,
  };
}

function stopBuses(services: ServiceArrivals[]) {
  return services
    .map(nextBus)
    .filter((bus): bus is BusMarker => bus !== null);
}

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
  const mapStops = useMemo(() => {
    const selected = stops.find((stop) => stop.code === selectedCode) ?? extraStop;
    if (focused && selected) return [selected];
    return stops;
  }, [extraStop, focused, selectedCode, stops]);
  const buses = useMemo(() => {
    if (!preview) return [];
    if (trackedService) {
      const service = preview.services.find((item) => item.service_no === trackedService);
      const bus = service ? nextBus(service) : null;
      return bus ? [bus] : [];
    }
    if (focused) return [];
    return stopBuses(preview.services);
  }, [focused, preview, trackedService]);
  const mapLat = buses[0]?.lat ?? mapStops[0]?.latitude ?? location?.lat ?? 1.35;
  const mapLng = buses[0]?.lng ?? mapStops[0]?.longitude ?? location?.lng ?? 103.85;

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
    if (stops.some((stop) => stop.code === selectedCode)) {
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
    return <div className="h-full w-full bg-[#e8eef4]" />;
  }

  return (
    <div className="relative h-full min-h-0 w-full">
      <DynamicStopMap
        key={mapKey}
        lat={mapLat}
        lng={mapLng}
        stops={mapStops}
        buses={buses}
        selectedCode={selectedCode}
        showUser={!focused}
        bottomPad={mapPage && mobile ? 250 : 0}
        onSelectStop={setSelectedCode}
        onSelectBus={(serviceNo) => {
          const stop = selectedCode ?? stops[0]?.code;
          if (stop) {
            router.push(`/live/${serviceNo}?stop=${stop}`);
          }
        }}
      />
      {mapPage ? <MobileMapOverlay /> : null}
      <button
        type="button"
        onClick={reload}
        className="absolute bottom-8 right-5 z-[1200] hidden h-11 w-11 items-center justify-center rounded-full bg-white text-[#0f172a] shadow-[0_2px_10px_rgb(15_23_42_/_0.18)] md:flex"
        aria-label="Use current location"
      >
        <LocateFixed size={18} strokeWidth={2} />
      </button>
    </div>
  );
}
