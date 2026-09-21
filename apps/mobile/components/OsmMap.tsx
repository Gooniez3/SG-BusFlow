import { Platform, Text, View } from "react-native";
import MapView, { Marker, UrlTile, type MapViewProps, type Region } from "react-native-maps";
import Svg, { Circle, Path } from "react-native-svg";

import { usePalette } from "@/lib/theme";
import type { Stop } from "@/lib/types";

const OSM_URL = "https://tile.openstreetmap.org/{z}/{x}/{y}.png";

export type BusMarker = {
  serviceNo: string;
  lat: number;
  lng: number;
};

export function OsmMap({
  mapRef,
  initialRegion,
  children,
  onPress,
  mapPadding,
  style,
  scrollEnabled = true,
}: {
  mapRef?: React.Ref<MapView>;
  initialRegion: Region;
  children?: React.ReactNode;
  onPress?: MapViewProps["onPress"];
  mapPadding?: MapViewProps["mapPadding"];
  style?: MapViewProps["style"];
  scrollEnabled?: boolean;
}) {
  const palette = usePalette();

  if (Platform.OS === "web") {
    return (
      <View style={[{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: palette.bg }, style]}>
        <Text style={{ color: palette.muted }}>Map is available in Expo Go on your phone.</Text>
      </View>
    );
  }

  return (
    <MapView
      ref={mapRef}
      style={[{ flex: 1, backgroundColor: "#e8eef4" }, style]}
      initialRegion={initialRegion}
      mapType={Platform.OS === "android" ? "none" : "standard"}
      rotateEnabled={false}
      pitchEnabled={false}
      showsCompass={false}
      showsScale={false}
      showsBuildings={false}
      showsTraffic={false}
      showsIndoors={false}
      showsPointsOfInterests={false}
      showsUserLocation={false}
      showsMyLocationButton={false}
      toolbarEnabled={false}
      scrollEnabled={scrollEnabled}
      mapPadding={mapPadding}
      onPress={onPress}
    >
      <UrlTile urlTemplate={OSM_URL} maximumZ={19} tileSize={256} zIndex={-1} shouldReplaceMapContent />
      {children}
    </MapView>
  );
}

export function StopPinMarker({
  stop,
  selected,
  onPress,
  tracksViewChanges,
}: {
  stop: Stop;
  selected: boolean;
  onPress?: () => void;
  tracksViewChanges?: boolean;
}) {
  const palette = usePalette();
  return (
    <Marker
      coordinate={{ latitude: stop.latitude, longitude: stop.longitude }}
      anchor={{ x: 0.5, y: 1 }}
      tracksViewChanges={tracksViewChanges}
      zIndex={selected ? 400 : 120}
      onPress={(event) => {
        event.stopPropagation();
        onPress?.();
      }}
    >
      <View style={{ alignItems: "center" }}>
        {selected ? (
          <View
            style={{
              marginBottom: 4,
              maxWidth: 148,
              paddingHorizontal: 8,
              paddingVertical: 4,
              borderRadius: 8,
              backgroundColor: palette.card,
              borderWidth: 1.5,
              borderColor: palette.accent,
            }}
          >
            <Text numberOfLines={1} style={{ color: palette.ink, fontSize: 12, fontWeight: "600" }}>
              {stop.name}
            </Text>
          </View>
        ) : null}
        <Svg width={28} height={28} viewBox="0 0 24 24">
          <Path
            d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0"
            fill={selected ? palette.accent : palette.pin}
            stroke={selected ? palette.onAccent : palette.pinStroke}
            strokeWidth={1.8}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <Circle cx={12} cy={10} r={2.6} fill={selected ? palette.onAccent : palette.pinHole} />
        </Svg>
      </View>
    </Marker>
  );
}

export function BusPinMarker({ bus, tracksViewChanges }: { bus: BusMarker; tracksViewChanges?: boolean }) {
  const palette = usePalette();
  return (
    <Marker
      coordinate={{ latitude: bus.lat, longitude: bus.lng }}
      anchor={{ x: 0.5, y: 0.5 }}
      tracksViewChanges={tracksViewChanges}
      zIndex={500}
    >
      <View
        style={{
          minWidth: 40,
          height: 28,
          paddingHorizontal: 8,
          borderRadius: 8,
          borderWidth: 2,
          borderColor: palette.card,
          backgroundColor: palette.live,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Text style={{ color: "#FFFFFF", fontSize: 13, fontWeight: "800" }}>{bus.serviceNo}</Text>
      </View>
    </Marker>
  );
}

export function UserDotMarker({ lat, lng, tracksViewChanges }: { lat: number; lng: number; tracksViewChanges?: boolean }) {
  const palette = usePalette();
  return (
    <Marker
      coordinate={{ latitude: lat, longitude: lng }}
      anchor={{ x: 0.5, y: 0.5 }}
      tracksViewChanges={tracksViewChanges}
      zIndex={80}
    >
      <View
        style={{
          width: 18,
          height: 18,
          borderRadius: 9,
          backgroundColor: palette.accent,
          borderWidth: 3,
          borderColor: palette.card,
        }}
      />
    </Marker>
  );
}
