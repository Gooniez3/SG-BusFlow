"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { LocateFixed } from "lucide-react";
import { DynamicStopMap } from "@/components/DynamicStopMap";
import { MobileMapOverlay } from "@/components/MobileMapOverlay";
import type { BusMarker } from "@/components/StopMap";
import { fetchArrivals } from "@/lib/api";
import { useWorkspace } from "@/lib/workspace";

function toBuses(services: { service_no: string; arrivals: { latitude: number | null; longitude: number | null; minutes: number | null }[] }[]) {
  const buses: BusMarker[] = [];
  const seen = new Set<string>();
  for (const service of services) {
    for (const arrival of service.arrivals) {
      if (
        !arrival.latitude ||
        !arrival.longitude ||
        Math.abs(arrival.latitude) < 0.1 ||
        Math.abs(arrival.longitude) < 0.1
      ) {
        continue;
      }
      const key = `${service.service_no}-${arrival.latitude.toFixed(4)}-${arrival.longitude.toFixed(4)}`;
      if (seen.has(key)) continue;
      seen.add(key);
      buses.push({
        serviceNo: service.service_no,
        lat: arrival.latitude,
        lng: arrival.longitude,
        minutes: arrival.minutes,
      });
    }
  }
  return buses;
}

export function WorkspaceMap() {
  const router = useRouter();
  const pathname = usePathname();
  const mapPage = pathname === "/map";
  const mapKey = mapPage ? "mobile-map" : "workspace-map";
  const [mobile, setMobile] = useState(false);
  const [fleet, setFleet] = useState<BusMarker[]>([]);
  const {
    location,
    stops,
    selectedCode,
    setSelectedCode,
    preview,
    reload,
  } = useWorkspace();
  const buses = useMemo(() => {
    const extra = preview ? toBuses(preview.services) : [];
    const seen = new Set(fleet.map((bus) => `${bus.serviceNo}-${bus.lat.toFixed(4)}-${bus.lng.toFixed(4)}`));
    return [
      ...fleet,
      ...extra.filter((bus) => {
        const key = `${bus.serviceNo}-${bus.lat.toFixed(4)}-${bus.lng.toFixed(4)}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      }),
    ];
  }, [fleet, preview]);

  useEffect(() => {
    const media = window.matchMedia("(max-width: 767px)");
    const sync = () => setMobile(media.matches);
    sync();
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    const codes = stops.slice(0, 8).map((stop) => stop.code);
    if (codes.length === 0) {
      setFleet([]);
      return;
    }
    let cancelled = false;
    Promise.all(codes.map((code) => fetchArrivals(code).catch(() => null))).then((results) => {
      if (cancelled) return;
      setFleet(
        toBuses(
          results.flatMap((result) => result?.services ?? []),
        ),
      );
    });
    return () => {
      cancelled = true;
    };
  }, [stops]);

  if (!location) {
    return <div className="h-full w-full bg-[#e8eef4]" />;
  }

  return (
    <div className="relative h-full min-h-0 w-full">
      <DynamicStopMap
        key={mapKey}
        lat={location.lat}
        lng={location.lng}
        stops={stops}
        buses={buses}
        selectedCode={selectedCode}
        showUser
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
