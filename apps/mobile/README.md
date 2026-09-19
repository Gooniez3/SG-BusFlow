# SG BusFlow mobile

Expo app for the same FastAPI backend as the web client. It does not call LTA DataMall itself.

## Run

Keep Docker, the API, and stop ingest running (same as web). Then:

```powershell
cd "C:\Users\sawlw\Desktop\SG BusFlow\apps\mobile"
npm start
```

Scan the QR code with Expo Go. On a physical phone, the app talks to your computer’s LAN address on port 8000 automatically. To force a URL:

```
EXPO_PUBLIC_API_URL=http://127.0.0.1:8000
```

Use `http://10.0.2.2:8000` for the Android emulator if needed.

## Screens

Nearby, Search, Map, Saved, and Profile. Arrivals come from `/api/v1/` only.
