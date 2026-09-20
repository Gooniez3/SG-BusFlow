"use client";

import { useEffect } from "react";
import L from "leaflet";
import { Minus, Plus } from "lucide-react";
import { MapContainer, Marker, Polyline, TileLayer, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { busesForMapFit } from "@/lib/buses";
import type { Stop } from "@/lib/types";

export type BusMarker = {
  serviceNo: string;
  lat: number;
  lng: number;
  minutes?: number | null;
};

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function userIcon() {
  return L.divIcon({
    className: "bf-marker",
    html: `<span class="bf-user"><span class="bf-user-ring"></span><span class="bf-user-dot"></span></span>`,
    iconSize: [44, 44],
    iconAnchor: [22, 22],
  });
}

function stopIcon(name: string, selected: boolean) {
  const label = selected
    ? `<span class="bf-pin-label">${escapeHtml(name)}</span>`
    : "";
  return L.divIcon({
    className: "bf-marker",
    html: `<div class="bf-stop-marker${selected ? " is-selected" : ""}">
      ${label}
      <svg width="28" height="28" viewBox="0 0 24 24" aria-hidden="true">
        <path class="bf-pin-body" d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
        <circle class="bf-pin-hole" cx="12" cy="10" r="2.6"/>
      </svg>
    </div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 27],
  });
}

function busIcon(serviceNo: string) {
  const width = Math.max(44, 18 + serviceNo.length * 9);
  return L.divIcon({
    className: "bf-marker",
    html: `<span class="bf-marker-bus is-live">${escapeHtml(serviceNo)}</span>`,
    iconSize: [width, 28],
    iconAnchor: [width / 2, 14],
  });
}

function Recenter({
  lat,
  lng,
  bottomPad = 0,
  fit,
  cameraKey,
}: {
  lat: number;
  lng: number;
  bottomPad?: number;
  fit?: [number, number][];
  cameraKey: string;
}) {
  const map = useMap();
  useEffect(() => {
    map.invalidateSize({ animate: false });
    if (fit && fit.length >= 1) {
      const size = map.getSize();
      const padX = Math.min(32, Math.max(12, size.x * 0.08));
      const padTop = Math.min(48, Math.max(24, size.y * 0.12));
      const padBottom = Math.min(bottomPad + 16, Math.max(24, size.y * 0.36));
      map.fitBounds(fit, {
        paddingTopLeft: [padX, padTop],
        paddingBottomRight: [padX, padBottom],
        maxZoom: 16,
        animate: true,
      });
      return;
    }
    const zoom = map.getZoom();
    const point = map.project([lat, lng], zoom);
    point.y += bottomPad / 2;
    map.setView(map.unproject(point, zoom), zoom, { animate: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- cameraKey is the identity; live GPS must not refit.
  }, [cameraKey, map]);
  return null;
}

function InvalidateSize() {
  const map = useMap();
  useEffect(() => {
    const container = map.getContainer();
    const update = () => {
      map.invalidateSize({ animate: false });
    };
    const observer = new ResizeObserver(update);
    observer.observe(container);
    window.addEventListener("resize", update);
    const timers = [50, 200, 500, 1000].map((ms) => window.setTimeout(update, ms));
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", update);
      for (const timer of timers) window.clearTimeout(timer);
    };
  }, [map]);
  return null;
}

function ZoomControls() {
  const map = useMap();
  return (
    <div className="absolute left-3 top-3 z-[1000] hidden flex-col gap-2 md:flex">
      <button
        type="button"
        className="bf-map-btn"
        onClick={() => map.zoomIn()}
        aria-label="Zoom in"
      >
        <Plus size={16} strokeWidth={2} />
      </button>
      <button
        type="button"
        className="bf-map-btn"
        onClick={() => map.zoomOut()}
        aria-label="Zoom out"
      >
        <Minus size={16} strokeWidth={2} />
      </button>
    </div>
  );
}

export function StopMap({
  lat,
  lng,
  stops,
  buses = [],
  selectedCode,
  showStops = true,
  showBuses = true,
  showUser = false,
  userLat,
  userLng,
  bottomPad = 0,
  fitToBus = false,
  onSelectStop,
  onSelectBus,
  path,
}: {
  lat: number;
  lng: number;
  stops: Stop[];
  buses?: BusMarker[];
  selectedCode?: string | null;
  showStops?: boolean;
  showBuses?: boolean;
  showUser?: boolean;
  userLat?: number;
  userLng?: number;
  bottomPad?: number;
  fitToBus?: boolean;
  onSelectStop?: (code: string) => void;
  onSelectBus?: (serviceNo: string) => void;
  path?: [number, number][];
}) {
  const focus = stops.find((stop) => stop.code === selectedCode);
  const userPosition =
    userLat != null && userLng != null && Math.abs(userLat) > 0.1 ? ([userLat, userLng] as [number, number]) : null;
  const cameraLat = focus?.latitude ?? userPosition?.[0] ?? lat;
  const cameraLng = focus?.longitude ?? userPosition?.[1] ?? lng;
  const fit =
    path && path.length >= 2
      ? path
      : fitToBus && focus && buses.length > 0
      ? ([
          [focus.latitude, focus.longitude] as [number, number],
          ...busesForMapFit(focus, buses).map((bus) => [bus.lat, bus.lng] as [number, number]),
        ])
      : undefined;
  const cameraKey = path && path.length >= 2
    ? `path:${path[0]?.join(",")}:${path[path.length - 1]?.join(",")}:${path.length}`
    : selectedCode
    ? `${selectedCode}:${fitToBus ? "fit" : "center"}:${buses.map((bus) => bus.serviceNo).join(",")}`
    : `user:${cameraLat.toFixed(4)}:${cameraLng.toFixed(4)}:${bottomPad}`;
  return (
    <MapContainer
      center={[cameraLat, cameraLng]}
      zoom={17}
      className="bf-map-light h-full w-full"
      attributionControl
      zoomControl={false}
      scrollWheelZoom
    >
      <Recenter lat={cameraLat} lng={cameraLng} bottomPad={bottomPad} fit={fit} cameraKey={cameraKey} />
      <InvalidateSize />
      <ZoomControls />
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {path && path.length >= 2 ? (
        <Polyline positions={path} pathOptions={{ color: "#0f9d8a", weight: 4, opacity: 0.85 }} />
      ) : null}
      {showUser && userPosition ? <Marker position={userPosition} icon={userIcon()} zIndexOffset={500} /> : null}
      {showStops
        ? stops.map((stop) => (
            <Marker
              key={stop.code}
              position={[stop.latitude, stop.longitude]}
              icon={stopIcon(stop.name, selectedCode === stop.code)}
              zIndexOffset={selectedCode === stop.code ? 400 : 120}
              eventHandlers={{
                click: () => onSelectStop?.(stop.code),
              }}
            />
          ))
        : null}
      {showBuses
        ? buses.map((bus, index) => (
            <Marker
              key={`${bus.serviceNo}:${bus.lat.toFixed(5)}:${bus.lng.toFixed(5)}:${index}`}
              position={[bus.lat, bus.lng]}
              icon={busIcon(bus.serviceNo)}
              zIndexOffset={800}
              eventHandlers={{
                click: () => onSelectBus?.(bus.serviceNo),
              }}
            />
          ))
        : null}
    </MapContainer>
  );
}
