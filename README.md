# 💧 PureDrop

A fast-paced arcade challenge where you navigate stormy skies to catch pure raindrops while dodging obstacles and contaminated water.

## 🚀 Tech Stack

- **Frontend:** React + Vite
- **Mobile:** Capacitor (iOS + Android)
- **Backend:** Base44 (PlayerProfile, LevelScore, Leaderboard entities)
- **Offline-first:** Capacitor Preferences + Network plugin with automatic sync queue

## 📱 Offline-First Architecture

PureDrop is built offline-first:
- All game data (scores, profiles) are saved **locally first**
- When online, data syncs automatically to the Base44 backend
- A pending sync queue ensures no data is lost while offline
- The leaderboard caches locally and updates when connectivity returns
- An offline banner notifies players when they're disconnected

## 🛠 Setup

```bash
npm install
```

### Run in browser
```bash
npm run dev
```

### Build + sync to native platforms
```bash
npm run sync
```

### Open in Android Studio
```bash
npm run open:android
```

### Open in Xcode (iOS)
```bash
npm run open:ios
```

## 📁 Project Structure

```
src/
  api/
    offlineSync.js     # Offline-first data layer with sync queue
  hooks/
    useNetwork.js      # React hook for real-time network status
  components/
    OfflineBanner.jsx  # Shows offline status to users
  game/               # Game logic
  screens/            # App screens (Home, Game, Leaderboard)
  store/              # State management
capacitor.config.json  # Capacitor configuration
```

## 🔧 Environment

Set your Base44 app URL in `src/api/offlineSync.js`:
```js
const BASE_URL = 'https://sanjay-44af4aac.base44.app';
```

## 📦 Capacitor Plugins

- `@capacitor/network` — Online/offline detection
- `@capacitor/preferences` — Local key-value storage
- `@capacitor/splash-screen` — Native splash screen
- `@capacitor/status-bar` — Status bar styling

## 🗺 Roadmap

- [ ] Migrate game logic from Base44 app
- [ ] Add Android build + sign config
- [ ] Submit to Google Play Store
- [ ] iOS build (future)
- [ ] Submit to Apple App Store (future)
