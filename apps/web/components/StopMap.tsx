"use client";

import { useEffect } from "react";
import L from "leaflet";
import { MapContainer, Marker, TileLayer, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
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
  return L.divIcon({
    className: "bf-marker",
    html: `<div class="bf-pin${selected ? " is-selected" : ""}">
      <span class="bf-pin-head"></span>
      <span class="bf-pin-label">${escapeHtml(name)}</span>
    </div>`,
    iconSize: [148, 32],
    iconAnchor: [8, 30],
  });
}

function busIcon(serviceNo: string) {
  return L.divIcon({
    className: "bf-marker",
    html: `<span class="bf-marker-bus is-live">${escapeHtml(serviceNo)}</span>`,
    iconSize: [28, 22],
    iconAnchor: [14, 11],
  });
}

function Recenter({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap();
  useEffect(() => {
    map.setView([lat, lng]);
  }, [lat, lng, map]);
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

export function StopMap({
  lat,
  lng,
  stops,
  buses = [],
  selectedCode,
  showStops = true,
  showBuses = true,
  onSelectStop,
  onSelectBus,
}: {
  lat: number;
  lng: number;
  stops: Stop[];
  buses?: BusMarker[];
  selectedCode?: string | null;
  showStops?: boolean;
  showBuses?: boolean;
  onSelectStop?: (code: string) => void;
  onSelectBus?: (serviceNo: string) => void;
}) {
  const focus = stops.find((stop) => stop.code === selectedCode);
  return (
    <MapContainer
      center={[lat, lng]}
      zoom={17}
      className="bf-map-dark h-full w-full"
      attributionControl
      zoomControl
      scrollWheelZoom
    >
      <Recenter lat={focus?.latitude ?? lat} lng={focus?.longitude ?? lng} />
      <InvalidateSize />
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <Marker position={[lat, lng]} icon={userIcon()} zIndexOffset={500} />
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
              key={`${bus.serviceNo}-${index}`}
              position={[bus.lat, bus.lng]}
              icon={busIcon(bus.serviceNo)}
              zIndexOffset={300}
              eventHandlers={{
                click: () => onSelectBus?.(bus.serviceNo),
              }}
            />
          ))
        : null}
    </MapContainer>
  );
}
