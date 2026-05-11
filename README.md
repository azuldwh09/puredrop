# 💧 PureDrop

A fast-paced arcade challenge — catch pure raindrops, dodge the contaminated ones.

**App ID:** `com.base69e449509428256538e448f2.app`  
**Web:** [pure-rain-catch.base44.app](https://pure-rain-catch.base44.app)

---

## 🚀 Quick Start

```bash
git clone https://github.com/azuldwh09/puredrop.git
cd puredrop
npm install
npm run dev        # run in browser
```

---

## 📱 Android Build (first time)

```bash
bash scripts/setup-android.sh
npx cap open android
```

This script:
1. Builds the web assets
2. Adds the Android platform via Capacitor
3. Syncs all plugins
4. **Injects the AdMob App ID** into `AndroidManifest.xml` automatically

---

## 🔄 Subsequent Android Syncs

After making changes:
```bash
npm run build
npx cap sync android
npx cap open android
```

---

## 📺 AdMob

| | Value |
|---|---|
| **App ID** | `ca-app-pub-2912984715921362~2822387889` |
| **NewCupAd Unit** | `ca-app-pub-2912984715921362/8687061841` |
| **Ad Type** | Rewarded Interstitial |
| **Placement** | Home screen — shown when player has 0 cups |

The `AndroidManifest.xml` meta-data entry is injected automatically by `scripts/setup-android.sh`.

---

## 🏗️ Project Structure

```
src/
  api/
    admob.js          # AdMob init + showNewCupAd()
    offlineSync.js    # Local storage + Base44 sync
  game/
    constants.js      # Levels, skins, difficulty tiers
    gameEngine.js     # Drop physics, scoring, purity calc
  screens/
    HomeScreen.jsx    # Main menu, cups/lives, ad button
    GameScreen.jsx    # Canvas game loop
    ResultScreen.jsx  # Win/lose, stars, score
    LeaderboardScreen.jsx
    SkinsScreen.jsx
    SettingsScreen.jsx
  store/
    gameStore.js      # Zustand state (persisted)
```
