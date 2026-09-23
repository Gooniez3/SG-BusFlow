# SG BusFlow mobile

Expo Go client for the same API as the web app. It does not call LTA.

```powershell
npm install
npx expo start --lan
```

On a phone, use the same Wi-Fi as the computer. The app calls port 8000 on the Metro host. Set `EXPO_PUBLIC_API_URL` only if that host is localhost.

Screens: Nearby, Search, Map, Saved, AI. Profile is in the header. Full setup is in the [root README](../../README.md).
