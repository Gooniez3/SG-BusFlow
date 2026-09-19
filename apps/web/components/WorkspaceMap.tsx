"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { LocateFixed } from "lucide-react";
import { DynamicStopMap } from "@/components/DynamicStopMap";
import { MobileMapOverlay } from "@/components/MobileMapOverlay";
import { busesFromServices, uniqueBuses } from "@/lib/buses";
import { fetchStop } from "@/lib/api";
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
  const selectedStop = stops.find((stop) => stop.code === selectedCode) ?? extraStop;
  const mapStops = useMemo(() => {
    if (focused && selectedStop) return [selectedStop];
    return stops;
  }, [focused, selectedStop, stops]);
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
        buses={buses}
        selectedCode={selectedCode}
        showUser={!focused}
        fitToBus={Boolean(trackedService || (selectedCode && buses.length > 0))}
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
