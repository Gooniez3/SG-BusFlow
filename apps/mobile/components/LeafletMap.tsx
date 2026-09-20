import { useEffect, useMemo, useRef } from "react";
import { Platform, Text, View } from "react-native";
import { WebView, type WebViewMessageEvent } from "react-native-webview";

import { busesForMapFit, type BusMarker } from "@/lib/buses";
import type { Stop } from "@/lib/types";

const LEAFLET_HTML = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <style>
    html, body, #map { height: 100%; margin: 0; background: #e8eef4; }
    .leaflet-control-attribution { font-size: 10px; }
    .bf-marker { background: transparent !important; border: none !important; overflow: visible !important; }
    .bf-user { position: relative; display: block; width: 44px; height: 44px; }
    .bf-user-dot { position: absolute; top: 50%; left: 50%; z-index: 1; width: 14px; height: 14px; margin: -7px 0 0 -7px; border-radius: 999px; background: #2563eb; border: 2.5px solid #fff; box-shadow: 0 1px 4px rgb(17 24 39 / 0.4); }
    .bf-user-ring { position: absolute; top: 50%; left: 50%; width: 22px; height: 22px; margin: -11px 0 0 -11px; border-radius: 999px; background: rgb(37 99 235 / 0.28); animation: pulse 2s ease-out infinite; }
    @keyframes pulse { 0% { transform: scale(0.7); opacity: 0.65; } 100% { transform: scale(2.4); opacity: 0; } }
    .bf-stop { position: relative; width: 28px; height: 28px; }
    .bf-stop svg { display: block; filter: drop-shadow(0 1px 3px rgb(15 23 42 / 0.35)); }
    .bf-pin-body { fill: #fff; stroke: #475569; }
    .bf-pin-hole { fill: #64748b; }
    .is-selected .bf-pin-body { fill: #0f9d8a; stroke: #fff; }
    .is-selected .bf-pin-hole { fill: #fff; }
    .bf-pin-label { position: absolute; left: 50%; bottom: calc(100% + 4px); transform: translateX(-50%); padding: 4px 8px; border-radius: 8px; background: #fff; color: #0f172a; font: 650 12px/1.2 -apple-system, sans-serif; box-shadow: 0 0 0 1.5px #0f9d8a, 0 8px 18px rgb(15 23 42 / 0.14); white-space: nowrap; max-width: 148px; overflow: hidden; text-overflow: ellipsis; }
    .bf-bus { display: flex; height: 28px; min-width: 40px; align-items: center; justify-content: center; border-radius: 8px; border: 2px solid #fff; background: #16a34a; color: #fff; font: 800 13px/1 -apple-system, sans-serif; padding: 0 8px; box-shadow: 0 2px 8px rgb(15 23 42 / 0.2); }
  </style>
</head>
<body>
  <div id="map"></div>
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <script>
    const map = L.map("map", { zoomControl: false, attributionControl: true });
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "&copy; OpenStreetMap",
      maxZoom: 19
    }).addTo(map);
    map.setView([1.3521, 103.8198], 16);
    function send(payload) {
      if (window.ReactNativeWebView) window.ReactNativeWebView.postMessage(JSON.stringify(payload));
    }
    function escapeHtml(value) {
      return String(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
    }
    function stopIcon(name, selected) {
      const label = selected ? '<span class="bf-pin-label">' + escapeHtml(name) + "</span>" : "";
      return L.divIcon({
        className: "bf-marker",
        html: '<div class="bf-stop' + (selected ? " is-selected" : "") + '">' + label + '<svg width="28" height="28" viewBox="0 0 24 24"><path class="bf-pin-body" d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/><circle class="bf-pin-hole" cx="12" cy="10" r="2.6"/></svg></div>',
        iconSize: [28, 28],
        iconAnchor: [14, 27]
      });
    }
    function busIcon(serviceNo) {
      const width = Math.max(44, 18 + String(serviceNo).length * 9);
      return L.divIcon({
        className: "bf-marker",
        html: '<span class="bf-bus">' + escapeHtml(serviceNo) + "</span>",
        iconSize: [width, 28],
        iconAnchor: [width / 2, 14]
      });
    }
    function userIcon() {
      return L.divIcon({
        className: "bf-marker",
        html: '<span class="bf-user"><span class="bf-user-ring"></span><span class="bf-user-dot"></span></span>',
        iconSize: [44, 44],
        iconAnchor: [22, 22]
      });
    }
    const stopLayer = L.layerGroup().addTo(map);
    const busLayer = L.layerGroup().addTo(map);
    let routeLine = null;
    let userMarker = null;
    const busMarkers = {};
    let lastStopsKey = "";
    window.__bfUpdate = function(state) {
      if (state.showUser && state.user) {
        const latlng = [state.user.lat, state.user.lng];
        if (userMarker) userMarker.setLatLng(latlng);
        else userMarker = L.marker(latlng, { icon: userIcon(), zIndexOffset: 500 }).addTo(map);
      } else if (userMarker) {
        map.removeLayer(userMarker);
        userMarker = null;
      }
      const stopsKey = (state.stops || []).map(function(stop) {
        return stop.code + (stop.code === state.selectedCode ? "*" : "");
      }).join(",");
      if (stopsKey !== lastStopsKey) {
        stopLayer.clearLayers();
        (state.stops || []).forEach(function(stop) {
          const selected = stop.code === state.selectedCode;
          L.marker([stop.lat, stop.lng], { icon: stopIcon(stop.name, selected), zIndexOffset: selected ? 400 : 120 })
            .on("click", function() { send({ type: "stop", code: stop.code }); })
            .addTo(stopLayer);
        });
        lastStopsKey = stopsKey;
      }
      const seen = {};
      (state.buses || []).forEach(function(bus) {
        const id = bus.serviceNo;
        seen[id] = true;
        if (busMarkers[id]) {
          busMarkers[id].setLatLng([bus.lat, bus.lng]);
        } else {
          busMarkers[id] = L.marker([bus.lat, bus.lng], { icon: busIcon(bus.serviceNo), zIndexOffset: 800 })
            .on("click", function() { send({ type: "bus", serviceNo: bus.serviceNo }); })
            .addTo(busLayer);
        }
      });
      Object.keys(busMarkers).forEach(function(id) {
        if (!seen[id]) {
          busLayer.removeLayer(busMarkers[id]);
          delete busMarkers[id];
        }
      });
      if (routeLine) {
        map.removeLayer(routeLine);
        routeLine = null;
      }
      if (state.path && state.path.length >= 2) {
        routeLine = L.polyline(state.path, { color: "#0f9d8a", weight: 4, opacity: 0.85 }).addTo(map);
      }
      if (state.recenter) {
        map.invalidateSize();
        if (state.fit && state.fit.length >= 1) {
          const bounds = L.latLngBounds(state.fit);
          const size = map.getSize();
          const padX = Math.min(28, Math.max(12, size.x * 0.08));
          const padTop = Math.min(72, Math.max(24, size.y * 0.12));
          const padBottom = Math.min((state.bottomPad || 0) + 16, Math.max(24, size.y * 0.36));
          map.fitBounds(bounds, {
            paddingTopLeft: [padX, padTop],
            paddingBottomRight: [padX, padBottom],
            maxZoom: 16,
            animate: true
          });
        } else if (state.lat && state.lng) {
          const zoom = state.zoom || Math.max(map.getZoom() || 16, 16);
          const point = map.project([state.lat, state.lng], zoom);
          point.y += (state.bottomPad || 0) / 2;
          map.setView(map.unproject(point, zoom), zoom, { animate: true });
        }
      }
    };
    send({ type: "ready" });
  </script>
</body>
</html>`;

export function LeafletMap({
  lat,
  lng,
  zoom = 16,
  stops,
  buses = [],
  selectedCode,
  user,
  showUser = false,
  bottomPad = 0,
  recenterKey,
  onSelectStop,
  onSelectBus,
  style,
  fitBus = false,
  path,
}: {
  lat: number;
  lng: number;
  zoom?: number;
  stops: Stop[];
  buses?: BusMarker[];
  selectedCode?: string | null;
  user?: { lat: number; lng: number } | null;
  showUser?: boolean;
  bottomPad?: number;
  recenterKey?: string;
  onSelectStop?: (code: string) => void;
  onSelectBus?: (serviceNo: string) => void;
  style?: object;
  fitBus?: boolean;
  path?: [number, number][];
}) {
  const webRef = useRef<WebView>(null);
  const lastRecenter = useRef<string | null>(null);
  const payload = useMemo(() => {
    const selected = stops.find((stop) => stop.code === selectedCode);
    const fit =
      path && path.length >= 2
        ? path
        : fitBus && selected && buses.length > 0
        ? [
            [selected.latitude, selected.longitude] as [number, number],
            ...busesForMapFit(selected, buses).map((bus) => [bus.lat, bus.lng] as [number, number]),
          ]
        : null;
    return {
      lat,
      lng,
      zoom,
      bottomPad,
      selectedCode,
      showUser,
      user: user ?? null,
      stops: stops.map((stop) => ({
        code: stop.code,
        name: stop.name,
        lat: stop.latitude,
        lng: stop.longitude,
      })),
      buses,
      fit,
      path: path ?? null,
    };
  }, [buses, bottomPad, fitBus, lat, lng, path, selectedCode, showUser, stops, user, zoom]);
  const payloadRef = useRef(payload);
  payloadRef.current = payload;

  useEffect(() => {
    const key = recenterKey ?? "init";
    const recenter = lastRecenter.current !== key;
    lastRecenter.current = key;
    const body = JSON.stringify({ ...payload, recenter });
    webRef.current?.injectJavaScript(`window.__bfUpdate && window.__bfUpdate(${body}); true;`);
  }, [payload, recenterKey]);

  function onMessage(event: WebViewMessageEvent) {
    try {
      const message = JSON.parse(event.nativeEvent.data) as {
        type: string;
        code?: string;
        serviceNo?: string;
      };
      if (message.type === "ready") {
        lastRecenter.current = null;
        const body = JSON.stringify({ ...payloadRef.current, recenter: true });
        webRef.current?.injectJavaScript(`window.__bfUpdate && window.__bfUpdate(${body}); true;`);
        return;
      }
      if (message.type === "stop" && message.code) onSelectStop?.(message.code);
      if (message.type === "bus" && message.serviceNo) onSelectBus?.(message.serviceNo);
    } catch {
      /* ignore */
    }
  }

  if (Platform.OS === "web") {
    return (
      <View style={[{ flex: 1, alignItems: "center", justifyContent: "center" }, style]}>
        <Text>Map is available in Expo Go on your phone.</Text>
      </View>
    );
  }

  return (
    <WebView
      ref={webRef}
      originWhitelist={["*"]}
      source={{ html: LEAFLET_HTML, baseUrl: "https://localhost" }}
      style={[{ flex: 1, backgroundColor: "#e8eef4" }, style]}
      onMessage={onMessage}
      javaScriptEnabled
      domStorageEnabled
      setSupportMultipleWindows={false}
      nestedScrollEnabled
      androidLayerType="hardware"
    />
  );
}
