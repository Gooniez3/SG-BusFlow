import { useCallback, useEffect, useState } from "react";
import { Pressable, Switch, Text, View } from "react-native";

import { Card, Muted } from "@/components/Ui";
import { NOTIFY_THRESHOLDS, type NotifySettings } from "@/lib/notify-logic";
import { patchNotifySettings, readNotifySettings, setNotifyEnabled } from "@/lib/notify";
import { usePalette } from "@/lib/theme";

export function NotifySettings() {
  const palette = usePalette();
  const [settings, setSettings] = useState<NotifySettings | null>(null);

  const reload = useCallback(() => {
    void readNotifySettings().then(setSettings);
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  if (!settings) return null;

  return (
    <Card>
      <Text style={{ color: palette.ink, fontWeight: "600", fontSize: 16 }}>Arrival alerts</Text>
      <View style={{ marginTop: 6 }}>
        <Muted>Saved stops and journey search only. Times come from live LTA arrivals on this phone.</Muted>
      </View>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 14 }}>
        <Text style={{ color: palette.ink, fontWeight: "500" }}>Alerts</Text>
        <Switch
          value={settings.enabled}
          onValueChange={(value) => {
            void setNotifyEnabled(value).then(setSettings);
          }}
          trackColor={{ true: palette.accent }}
        />
      </View>
      <Text style={{ color: palette.muted, fontSize: 11, letterSpacing: 1.4, fontWeight: "500", marginTop: 16 }}>
        ALERT WHEN A BUS IS WITHIN
      </Text>
      <View style={{ flexDirection: "row", gap: 8, marginTop: 8 }}>
        {NOTIFY_THRESHOLDS.map((minutes) => {
          const active = settings.thresholdMin === minutes;
          return (
            <Pressable
              key={minutes}
              onPress={() => {
                void patchNotifySettings({ thresholdMin: minutes }).then(setSettings);
              }}
              style={{
                flex: 1,
                height: 40,
                borderRadius: 999,
                borderWidth: 1,
                borderColor: active ? palette.accent : palette.line,
                backgroundColor: active ? palette.accent : "transparent",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Text style={{ color: active ? palette.onAccent : palette.ink, fontWeight: "600" }}>{minutes} min</Text>
            </Pressable>
          );
        })}
      </View>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 16 }}>
        <View style={{ flex: 1, paddingRight: 12 }}>
          <Text style={{ color: palette.ink, fontWeight: "500" }}>Saved stops</Text>
          <Muted>Bus 230 is arriving in 3 minutes.</Muted>
        </View>
        <Switch
          value={settings.savedStops}
          onValueChange={(value) => {
            void patchNotifySettings({ savedStops: value }).then(setSettings);
          }}
          trackColor={{ true: palette.accent }}
        />
      </View>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 12 }}>
        <View style={{ flex: 1, paddingRight: 12 }}>
          <Text style={{ color: palette.ink, fontWeight: "500" }}>Journey reminders</Text>
          <Muted>After you search a trip, remind you before the first bus.</Muted>
        </View>
        <Switch
          value={settings.journeys}
          onValueChange={(value) => {
            void patchNotifySettings({ journeys: value }).then(setSettings);
          }}
          trackColor={{ true: palette.accent }}
        />
      </View>
    </Card>
  );
}
