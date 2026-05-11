# PureDrop — Complete Technical Documentation
**Version:** 1.2  
**Date:** May 2, 2026  
**Platform:** Base44 (Vite + React + Tailwind CSS)  
**Author:** Generated via Base44 AI Agent

---

## TABLE OF CONTENTS

1. [App Overview](#1-app-overview)
2. [Architecture Summary](#2-architecture-summary)
3. [File Structure & Code Reference](#3-file-structure--code-reference)
   - 3.1 Entry Points
   - 3.2 Pages
   - 3.3 Game Components
   - 3.4 UI Components
   - 3.5 Hooks
   - 3.6 Libraries / Utilities
   - 3.7 Backend Functions
   - 3.8 Entities (Database)
   - 3.9 Public / Service Worker
4. [Game Mechanics Deep Dive](#4-game-mechanics-deep-dive)
5. [Entities & Data Model](#5-entities--data-model)
6. [Audio System](#6-audio-system)
7. [Offline-First Strategy](#7-offline-first-strategy)
8. [Authentication & Auth Flow](#8-authentication--auth-flow)
9. [Demo Mode](#9-demo-mode)
10. [Monetization — AdSense / H5 Ads](#10-monetization--adsense--h5-ads)
11. [Maintenance Plan](#11-maintenance-plan)
12. [Troubleshooting Matrix](#12-troubleshooting-matrix)
13. [Platform Offload Plan](#13-platform-offload-plan)
14. [Change Log — All Changes Made](#14-change-log--all-changes-made)
15. [Full Chat Transcript](#15-full-chat-transcript)

---

## 1. APP OVERVIEW

**PureDrop** is a mobile-first browser/PWA arcade game where the player catches falling rain drops in a cup while avoiding obstacles. The goal is to fill the cup with pure (uncontaminated) water before time runs out.

### Core Concept
- Catch clean (blue) drops to fill your cup.
- Avoid dirty (brown) drops that contaminate purity.
- Dodge rocks 💥, balls 🏀, and cats 🐱 that spill your cup.
- Maintain purity ≥ 80% and fill ≥ fill-goal to win.
- 500 levels with 6 escalating difficulty tiers.
- Collect combo chains to earn power-ups.

### Tech Stack
| Layer | Technology |
|---|---|
| Frontend | React 18, Vite, Tailwind CSS, shadcn/ui |
| Animation | Framer Motion |
| Routing | React Router v6 |
| State/Data | @tanstack/react-query + Base44 SDK |
| Audio | Web Audio API (no external files) |
| Backend | Base44 BaaS (Deno edge functions) |
| Database | Base44 entities (NoSQL-like, RLS-secured) |
| Ads | Google AdSense H5 Games Ads API |
| Auth | Base44 built-in auth |

---

## 2. ARCHITECTURE SUMMARY

```
Browser
  └── React App (Vite)
        ├── AuthProvider  (lib/AuthContext.jsx)
        │     └── Offline-first auth, caches user to localStorage
        ├── QueryClientProvider  (@tanstack/react-query)
        ├── Router (react-router-dom)
        │     ├── /              → Game.jsx (level select view)
        │     ├── /play          → Game.jsx (gameplay view)
        │     ├── /customize     → Game.jsx (cup customizer view)
        │     ├── /gameover      → Game.jsx (game over view)
        │     ├── /leaderboard   → LeaderboardPage.jsx
        │     └── /privacy-policy→ PrivacyPolicy.jsx
        └── Game.jsx (mega state machine)
              ├── GameCanvas     (HTML5 canvas — draws everything)
              ├── GameHUD        (score, time, fill, purity bars)
              ├── LevelCarousel  (swipeable level picker)
              ├── CupCustomizer  (skin shop)
              ├── GameOverScreen (results + star rating)
              ├── BottomNav      (persistent tab bar)
              └── AdModal        (rewarded video ads)

Backend (Base44 / Deno)
  └── functions/
        ├── recalculateStars  (admin utility)
        └── resetLeaderboard  (admin utility)

Database (Base44 entities)
  ├── PlayerProfile  (per-user progress, cups, skin, streak)
  ├── LevelScore     (per-level attempt records)
  └── Leaderboard    (top 50 global scores)
```

---

## 3. FILE STRUCTURE & CODE REFERENCE

### 3.1 Entry Points

#### `index.html`
Standard Vite HTML shell. Hosts the `<div id="root">` React mount point and the main entry script. Also contains Google AdSense script tag (`ca-pub-2912984715921362`) and Open Graph / SEO meta tags.

#### `main.jsx`
React app entry — renders `<App />` into `#root`.

#### `App.jsx`
**The application router.** Key responsibilities:
- Wraps everything in `<AuthProvider>`, `<QueryClientProvider>`, `<BrowserRouter>`, `<Toaster>`.
- Defines all routes (`/`, `/customize`, `/play`, `/gameover`, `/leaderboard`, `/privacy-policy`).
- Injects the AdSense script lazily once user is authenticated or in demo mode.
- Initializes `window.adBreak` / `window.adConfig` for H5 Games Ads.
- Shows an offline yellow banner (`OfflineBanner`) when `navigator.onLine === false`.
- Handles `auth_required` error screen with Sign In / Demo buttons.

#### `index.css`
Global CSS with:
- Tailwind directives
- CSS custom property design tokens (dark theme by default, `.light` class for light mode)
- Touch-device hover removal (`@media (hover: none)`)
- Tap highlight color override
- Google Fonts import: `Press Start 2P` (pixel font) + `Inter` (body)
- Custom keyframe animations: `fall`, `sway`, `shake`, `splash`, `float-up`, `pulse-glow`, `rain-bg`, `lightning`

#### `tailwind.config.js`
Extends Tailwind with:
- All CSS variable–based color tokens
- Custom font families (`display`, `body`)
- `tailwindcss-animate` plugin

---

### 3.2 Pages

#### `pages/Game.jsx`
**The core game state machine.** This is the largest file (~450 lines). It manages:

**Screen routing via URL:**
| URL | Screen |
|---|---|
| `/` | `levelselect` |
| `/customize` | `customize` |
| `/play` | `playing` |
| `/gameover` | `gameover` |

**Constants:**
```
GAME_WIDTH  = 480px  (logical canvas width)
GAME_HEIGHT = 640px  (logical canvas height)
CUP_WIDTH   = 70px
CUP_HEIGHT  = 50px
CUP_SPEED   = 14px/frame
OBSTACLE_SIZE = 40px
DROP_SIZE   = 22px
SPILL_COST  = 8 seconds
```

**Item Types (`ITEM_TYPES`):**
- `clean` — blue water drop (+fill, +purity, +score, +combo)
- `dirty` — brown contaminated drop (+fill, -purity, -combo, -score)
- `rock` — obstacle (spills cup, -score)
- `ball` — obstacle (spills cup, -score)
- `cat` — obstacle (spills cup with meow SFX, -score)
- `powerup` — collectible (activates a power-up, +500 score)

**Game Loop:**
- Uses `requestAnimationFrame` at ~60fps via `rafRef`.
- Item spawn runs on `setInterval` at level-configured `spawnInterval`.
- Timer counts down via `setInterval` every 1000ms.
- All loops respect `isPausedRef` to freeze on pause.

**Spill Logic:**
- 2 spills allowed per game (tracked in `spillsThisGameRef`).
- On 3rd spill → game over immediately.
- Each spill: resets fill to 0, purity to 100, -8s, -1000 pts, calls `spendCup()`.

**Power-Up System:**
- Activated when caught falling power-up item.
- `activePowerUps` map: id → expiry timestamp.
- `usedPowerUps` map: id → boolean (prevents re-spawn same run).
- Power-ups expire automatically via `setTimeout`.

**Score Breakdown (on game over):**
- `baseScore` = accumulated in-game score
- `timeBonus` = `timeLeft * 5` (only on win)
- `accuracyBonus` = up to +1000 (only on win, if catch rate ≥ 90%)
- `finalScore` = base + time + accuracy

#### `pages/LeaderboardPage.jsx`
Thin wrapper — renders `<NavigationHeader>`, `<LeaderboardScreen>`, `<BottomNav>`.

#### `pages/PrivacyPolicy.jsx`
Static privacy policy page.

---

### 3.3 Game Components

#### `components/game/GameCanvas.jsx`
**HTML5 Canvas renderer.** Draws every frame:
1. Sky gradient (theme-based)
2. Animated clouds
3. Rain streaks (background)
4. Ground strip + grass
5. Theme-specific decorations (trees, birds, lightning, etc.)
6. All falling items (drops, obstacles, power-ups) with custom drawing per type
7. The player cup (outline, fill level, purity color, rim glow)
8. Floating effect text (score popups)
9. Shake animation via canvas transform

Handles both touch (`onTouchMove`) and mouse (`onMouseMove`) input to move the cup.

#### `components/game/GameHUD.jsx`
In-game heads-up display:
- Timer (red + pulse when ≤ 10s)
- Score with combo multiplier badge
- Cup fill progress bar (color shifts dirty/clean)
- Purity bar (green → orange → red)
- Active power-up badges with countdown timers
- Spill warning when spillsUsed ≥ 1
- Voluntary spill button (shown when dirty + fill > 0 + spills < 2)

#### `components/game/LevelCarousel.jsx`
The main level selection screen:
- Animated hero banner (SVG clouds, rain, grass)
- Cup counter with refill timer
- Swipeable 3-card carousel (center ± 1 visible, ± 2 pre-rendered for slide animation)
- Keyboard arrow key navigation
- Drag/swipe gesture support
- Pull-to-refresh (swipe down from top)
- `AdminLevelJump` for developer testing
- `StreakBadge` component
- Settings and tutorial modals

#### `components/game/LevelCard.jsx`
Single carousel card showing:
- Level number
- Lock/unlock state
- Star rating (0–3 ★)
- High score
- Difficulty emoji

#### `components/game/GameOverScreen.jsx`
Post-game screen:
- Win/loss emoji + title
- Animated star rating (1–3 ★)
- Stats: level, cup fill %, purity %, drop accuracy
- Score breakdown table
- Contextual tip (when purity-failed)
- `CupUnlockModal` trigger when new skin is earned at this exact level

#### `components/game/BottomNav.jsx`
Fixed-position floating pill navigation bar:
- Tabs: Play (`/`), Ranks (`/leaderboard`), Customize (`/customize`)
- Uses `pointer-events-none` on outer wrapper, `pointer-events-auto` on inner pill — allows touch-through to game content beneath
- Respects `env(safe-area-inset-bottom)` for iPhone notch/home bar

#### `components/game/CupCustomizer.jsx`
Skin selection grid:
- All skins from `CUP_SKINS` rendered as cards
- Lock/unlock state based on `profile.highest_level`
- Demo mode restricts to first 3 tiers

#### `components/game/AdModal.jsx`
Rewarded ad modal:
- Integrates with `window.adBreak` (Google H5 Games Ads API)
- 5-second fallback timer if ad fails to load
- States: idle → playing → reward → error
- On earn: calls `addCup(1)` to grant player a free cup

#### `components/game/Countdown.jsx`
"3… 2… 1… GO!" overlay before game starts. Triggers `onDone` callback.

#### `components/game/PauseOverlay.jsx`
Semi-transparent blur overlay with Resume / Exit buttons. Spring animation via Framer Motion.

#### `components/game/SettingsModal.jsx`
Settings panel (accessible via ⚙️ in level select):
- Sound toggle (persisted via `useSoundSettings`)
- Dark/light mode toggle (via `next-themes` or CSS class)
- Leaderboard privacy toggle (`hide_from_leaderboard` on profile)
- Tutorial replay
- Account: Sign Out, Delete Account (with confirmation)
- Admin-only: Recalculate Stars button

#### `components/game/TutorialModal.jsx`
Paginated tutorial slides explaining game mechanics, scoring, and controls. Shown on first launch (tracked in `localStorage`).

#### `components/game/NavigationHeader.jsx`
Top navigation bar used on secondary screens (customize, leaderboard). Shows dynamic page title based on route.

#### `components/game/LeaderboardScreen.jsx`
Fetches and displays top 50 global `Leaderboard` records. Shows rank, display name, level, score.

#### `components/game/StreakBadge.jsx`
Displays the player's current daily play streak with flame emoji and motivational message.

#### `components/game/CupUnlockModal.jsx`
Animated modal shown when player earns a new skin. Offers Apply / Skip options.

#### `components/game/SpillAnimation.jsx`
(Legacy component — spill animations were removed; reset is now instant. File may still exist but is not imported in current gameplay flow.)

#### `components/game/AdminLevelJump.jsx`
**Admin-only testing tool.** Only visible when `user.email === 'azuldwh@gmail.com'`.  
- Number input field + "Go" button
- Typing a level number and pressing Enter or Go moves the carousel to that level
- Gated by email check via `useAuth()` hook

#### `components/game/PowerUpBar.jsx`
(Secondary component for power-up display — logic is handled in-HUD primarily.)

#### `components/game/StartScreen.jsx`
Original start screen (replaced by `LevelCarousel` in current flow — may be legacy).

---

### 3.4 UI Components (`components/ui/`)

All shadcn/ui components, pre-installed:
`accordion`, `alert`, `alert-dialog`, `aspect-ratio`, `avatar`, `badge`, `breadcrumb`, `button`, `calendar`, `card`, `carousel`, `chart`, `checkbox`, `collapsible`, `command`, `context-menu`, `dialog`, `drawer`, `dropdown-menu`, `form`, `hover-card`, `input`, `input-otp`, `label`, `menubar`, `navigation-menu`, `pagination`, `popover`, `progress`, `radio-group`, `resizable`, `scroll-area`, `select`, `separator`, `sheet`, `sidebar`, `skeleton`, `slider`, `sonner`, `switch`, `table`, `tabs`, `textarea`, `toast`, `toggle`, `toggle-group`, `tooltip`, `use-toast`

---

### 3.5 Hooks

#### `hooks/usePlayerProfile.js`
**The most critical hook.** Offline-first player data management.

Key functions returned:
| Function | Description |
|---|---|
| `profile` | Current player profile object |
| `loading` | Boolean — true while initially fetching |
| `spendCup()` | Deducts 1 cup (optimistic + server sync) |
| `addCup(n)` | Adds n cups (optimistic + server sync) |
| `setSkin(id)` | Sets selected cup skin |
| `updateProgress(level, score, win, catchRate)` | Updates highest_level, total_score, saves LevelScore, submits leaderboard |
| `nextRefillIn` | String like "7h 23m 5s" (null if cups are full) |
| `reload` | Force re-sync from server |

**Stars formula (`computeStars`):**
- 0★ = lost
- 1★ = won at all
- 2★ = score ≥ 800 OR catch rate ≥ 70%
- 3★ = score ≥ 2000 AND catch rate ≥ 90%

**Cup refill:** Auto-computes refills since `last_refill_time` at 1 cup per 8 hours, max 5 cups.

**Streak logic:** Compares `last_play_date` to today/yesterday to maintain or reset streak.

#### `hooks/useGameAudio.js`
Pure Web Audio API — no audio files needed. Synthesizes all sounds:
- Background: looping rain noise (white noise + low-pass filter), occasional thunder rumble, soft pentatonic piano melody
- SFX: `playcatch` (random musical pluck), `playMiss` (descending tone), `playCatMeow` (LFO-modulated oscillator), `playSplash` (white noise burst), `playPowerUp` (ascending 3-beep)
- Sound is muted/unmuted by controlling master `GainNode` value — no restart needed

#### `hooks/useLevelScores.js`
Fetches all `LevelScore` records for the current user. Returns `levelData` map: `{ [level]: { stars, highScore } }`. Used by `LevelCarousel` / `LevelCard` to show star ratings per level.

#### `hooks/useSoundSettings.js`
Persists sound on/off in `localStorage` under key `puredrop_sound_enabled`. Returns `{ soundEnabled, toggleSound }`.

---

### 3.6 Libraries / Utilities

#### `lib/levelConfig.js`
**Generates game configuration for any of 500 levels.**

Tier system:
| Tier | Levels | Label |
|---|---|---|
| 1 | 1–10 | Drizzle |
| 2 | 11–30 | Shower |
| 3 | 31–70 | Downpour |
| 4 | 71–130 | Thunderstorm |
| 5 | 131–220 | Monsoon |
| 6 | 221–500 | Hurricane / Apocalypse |

Per-level config output:
- `gameDuration` — seconds (90s → 20s)
- `dropSpeedMin/Max` — pixels/frame
- `obstacleSpeedMin/Max`
- `spawnInterval` — ms between spawns (900ms → 160ms)
- `cleanChance` / `dirtyChance` — probabilities
- `fillGoal` — units to fill (100 → 160)
- `purityGoal` — minimum purity % to win
- `cupSpeedBonus` — extra cup speed
- `label`, `description`, `theme`

Also exports `getLevelTheme(tier)` — returns sky, ground, rain colors for the 6 visual environments.

#### `lib/cupSkins.js`
Defines all 35 cup skins across 5 rarity tiers:
- **Tier 1 Starter** (levels 1–10): classic, ocean, mint, cherry, lemon, lavender
- **Tier 2 Common** (levels 12–30): gold, emerald, amethyst, rose_gold, copper, sky, midnight, forest
- **Tier 3 Rare** (levels 35–60): fire, ice, toxic, magma, arctic, thunder
- **Tier 4 Epic** (levels 70–95): void, nebula, coral, obsidian, aurora, crystal
- **Tier 5 Legendary** (100–500): rainbow, solar, galaxy, platinum, pure

Each skin: `{ id, name, emoji, gradient, borderColor, rimColor, bodyColor, glowColor, accentColor, unlocked, requireLevel }`

Also exports `MAX_CUPS = 5` and `REFILL_INTERVAL_MS = 8 hours`.

#### `lib/cupThemes.js`
Maps each cup skin ID to a full gameplay background theme (sky gradient, cloud alpha, rain color, ground colors, grass color). Used to tint the canvas sky during gameplay based on equipped skin.

#### `lib/powerUps.js`
Defines 6 power-ups unlocked at combo thresholds:

| ID | Emoji | Combo Req | Effect | Duration |
|---|---|---|---|---|
| slow_time | 🐢 | 3 | Obstacles at half speed | 10s |
| attract | 🧲 | 4 | Clean drops drift to cup | 5s |
| blaster | 💥 | 5 | Destroys all rocks/balls | Instant |
| cat_toy | 🪀 | 6 | Removes cats from screen | 6s |
| fast_time | ⚡ | 7 | +10 seconds | Instant |
| downpour | 🌊 | 8 | Only clean rain, no obstacles | 8s |

#### `lib/AuthContext.jsx`
React context for authentication. See [Section 8](#8-authentication--auth-flow).

#### `lib/offlineStorage.js`
LocalStorage abstraction layer:
- `puredrop_profile` — cached PlayerProfile
- `puredrop_user` — cached User object
- `puredrop_sync_queue` — pending mutations (profile_update, level_score, leaderboard)

Key functions: `getCachedProfile`, `setCachedProfile`, `getCachedUser`, `setCachedUser`, `enqueueSyncItem`, `getSyncQueue`, `removeSyncItem`, `isOnline`.

Profile updates in the sync queue are **coalesced** — multiple pending updates merge into one.

#### `lib/demoMode.js`
Manages demo mode (for Play Store reviewers / unauthenticated users):
- Demo state stored in `sessionStorage` under `puredrop_demo`.
- Demo profile: 5 levels max, 3 cups max, no database writes.
- `enableDemoMode()`, `disableDemoMode()`, `isDemoMode()`, `getDemoProfile()`, `updateDemoProfile()`

#### `lib/app-params.js`
Reads Base44 app ID and token from environment / meta tags for SDK initialization.

#### `lib/gameConstants.js`
Shared game constants (may overlap with in-file constants in Game.jsx).

#### `lib/PageNotFound.jsx`
404 page component.

#### `lib/query-client.js`
Singleton `QueryClient` instance for React Query.

#### `lib/utils.js`
Tailwind `cn()` utility (clsx + tailwind-merge).

#### `api/base44Client.js`
Pre-initialized Base44 SDK client. Exported as `base44`. Used for all entity CRUD, auth, integrations, and function calls.

#### `public/sw.js`
Service Worker for PWA offline support. Caches app shell and assets for offline play.

---

### 3.7 Backend Functions

#### `functions/recalculateStars.js`
**Admin utility.** Recalculates star ratings for all of the requesting user's `LevelScore` records where `win === true` but `stars === 0`. Applies the same formula as the frontend.

Callable via: Settings → Admin → Recalculate Stars

#### `functions/resetLeaderboard.js`
**Admin utility.** Clears and resets leaderboard data. Admin-only (verifies `user.role === 'admin'`).

---

### 3.8 Entities (Database)

#### `PlayerProfile`
| Field | Type | Default | Notes |
|---|---|---|---|
| user_email | string | required | Indexed |
| cups | number | 5 | Current playable cups |
| last_refill_time | string (ISO) | — | For auto-refill calculation |
| selected_cup_skin | string | 'classic' | Active skin ID |
| highest_level | number | 1 | Unlocks levels ≤ this |
| total_score | number | 0 | Cumulative all-time |
| streak | number | 0 | Daily play streak |
| last_play_date | string | — | Date string for streak |
| difficulty_tier | number | 1 | Current tier (computed) |
| hide_from_leaderboard | boolean | false | Privacy toggle |

**RLS:** Users can only read/write their own record (`data.user_email == user.email`).

#### `LevelScore`
| Field | Type | Notes |
|---|---|---|
| user_email | string | |
| level | number | |
| score | number | |
| purity | number | Final purity % |
| win | boolean | |
| stars | number | 0–3 |
| accuracy | number | Catch rate 0.0–1.0 |

**RLS:** User-scoped.

#### `Leaderboard`
| Field | Type | Notes |
|---|---|---|
| user_email | string | |
| display_name | string | full_name or email prefix |
| level | number | |
| score | number | |
| purity | number | |

No RLS — public read. Top 50 entries kept (pruned after each submission).

---

### 3.9 Public / Service Worker

#### `public/sw.js`
Service Worker registered on app load. Provides:
- Cache-first strategy for static assets
- Offline fallback

#### `public/ads.txt`
Google AdSense ads.txt file for publisher verification.

---

## 4. GAME MECHANICS DEEP DIVE

### Item Probabilities
For any given level, every spawn tick rolls a random number:
- `[0, cleanChance)` → spawn clean drop
- `[cleanChance, cleanChance + dirtyChance)` → spawn dirty drop
- Remainder → spawn obstacle (40% rock, 35% ball, 25% cat — cat blocked if `cat_toy` power-up active)

### Collision Detection
Simple AABB (axis-aligned bounding box):
```
itemBottom >= cupTop  AND  itemBottom <= cupTop + CUP_HEIGHT + 10
itemRight  >= cupLeft AND  itemLeft   <= cupRight
```

### Win Condition
Checked every frame:
```
fillAmount >= levelConfig.fillGoal AND purity >= 80
```

### Lose Conditions
1. Timer reaches 0 → game over (loss)
2. 3rd spill in one game → game over (loss)
3. Obstacle hit → spill triggered → check spill count

### Accuracy Tracking
- `cleanDropsSpawnedRef` — incremented when a clean drop is spawned (non-downpour) OR missed
- `cleanDropsCaughtRef` — incremented when a clean drop is caught (non-downpour)
- `catchRate = caught / spawned`

---

## 5. ENTITIES & DATA MODEL

```
User (built-in)
  ↓ 1:1
PlayerProfile (user_email FK)
  ↓ 1:many
LevelScore (user_email, level)

Leaderboard (global, top 50)
```

All entity writes from the frontend go through the Base44 SDK which enforces Row-Level Security. Backend functions use `base44.asServiceRole` to bypass RLS when needed (e.g., admin utilities).

---

## 6. AUDIO SYSTEM

All audio is synthesized using the **Web Audio API** — no audio files are loaded or bundled.

### Architecture
```
AudioContext
  └── MasterGainNode (volume control — 1.0 on, 0 muted)
        ├── Rain noise (BufferSource → LowPassFilter → GainNode) — looping
        ├── Thunder rumble (scheduled every 18–48s)
        ├── Piano melody (pentatonic C major, scheduled every 2–4s)
        └── SFX (on-demand oscillators/buffers)
```

### Sound starts on first user interaction
`startBackgroundMusic()` is called on first touch/mouse event to comply with browser autoplay policy.

### Muting
Master gain is set to 0 (muted) or 1 (audible) — the audio graph stays active, which avoids click/pop artifacts when toggling.

---

## 7. OFFLINE-FIRST STRATEGY

PureDrop is designed to work without internet after first load. The architecture has three layers of offline protection.

### Layer 1 — Auth (AuthContext.jsx)
```
App Load
  ├── navigator.onLine === false?
  │     → setIsOffline(true)
  │     → Check localStorage for cached user
  │         ├── Found → authenticate locally, show game
  │         └── Not found → show Sign In / Demo screen
  └── Online, but cachedUser + token already exist?
        → Authenticate instantly from cache (no network call)
        → Background: base44.auth.me() to re-validate silently
        → Only on complete cache miss: hit /public-settings network call
```

### Layer 2 — Player Data (usePlayerProfile.js)
```
Hook Mount
  → Instantly load profile from localStorage (zero wait time)
  → Show game immediately with local data
  → Background: fetch from server, reconcile, cache fresh copy
  → On any mutation (spendCup, setSkin, updateProgress):
      → Apply optimistically to React state + localStorage
      → If isOnline(): attempt server write immediately
      → If offline or write fails: enqueue to sync_queue in localStorage
  → On window 'online' event:
      → flushQueue() — process all pending writes in order
      → syncFromServer() — reconcile any server-side changes
```

### Layer 3 — Level Scores (useLevelScores.js)
```
Hook Mount
  → Load from localStorage cache instantly (key: puredrop_level_scores)
  → Show star ratings / high scores from cache with zero wait
  → If online: fetch from server, update cache
  → On window 'online' event: re-fetch and refresh cache
```

### Reconnection UX (App.jsx)
When `isOffline` transitions from `true` → `false`:
- `App.jsx` detects the transition via `wasOfflineRef`
- Shows green "✓ Back online — syncing your progress…" banner for 3 seconds
- Calls `checkAppState(true)` (silent — no loading spinner) to re-validate session
- `usePlayerProfile`'s own `online` listener simultaneously flushes the sync queue

### LocalStorage Keys
| Key | Contents |
|---|---|
| `puredrop_profile` | PlayerProfile JSON |
| `puredrop_user` | User JSON |
| `puredrop_sync_queue` | Array of pending mutations |
| `puredrop_level_scores` | `{ [level]: { stars, highScore } }` map |
| `puredrop_sound_enabled` | "true" or "false" |
| `puredrop_tutorial_seen` | "true" if tutorial was completed |

### Sync Queue Item Types
| Type | Payload | Coalesced? |
|---|---|---|
| `profile_update` | `{ profileId, updates }` | Yes — multiple updates merge into one |
| `level_score` | `{ user_email, level, score, win, stars, accuracy }` | No |
| `leaderboard` | `{ user_email, display_name, level, score }` | No |

### Offline Acceptance Criteria
| Scenario | Behavior |
|---|---|
| App opened online, then offline | Profile + level scores loaded from localStorage cache |
| Game played offline | Score/progress saved locally, queued for sync |
| Cup spent offline | Deducted locally immediately, server write queued |
| App refreshed while offline | Local cache loads instantly, game playable |
| Reconnect | Queue flushed, server re-synced, green "syncing" banner shown |
| Sync failure | Item stays in queue, retried on next reconnect |
| Duplicate reconnects | Profile updates are coalesced (not duplicated) |

### Service Worker
`public/sw.js` caches the app shell so the game loads even with no network.

---

## 8. AUTHENTICATION & AUTH FLOW

### AuthContext Strategy
`checkAppState(silent?: boolean)` is the entry point. `silent=true` skips loading spinners and authError clears (used for reconnect re-validation).

Priority order:
1. `navigator.onLine === false` → immediate offline fallback (cached user or auth_required screen)
2. `cachedUser && appParams.token` → authenticate instantly from cache, validate silently in background
3. No cache → full network flow: fetch public-settings → `base44.auth.me()` → set user

### Reconnect Re-validation
When `isOffline` flips from `true` → `false` (detected in `App.jsx`):
- `checkAppState(true)` called silently — no spinner, no error state changes
- `usePlayerProfile` independently flushes sync queue + re-syncs profile from server

### `checkUserAuth(background?: boolean)`
- `background=true` — silently validates token, updates cache, never shows errors
- `background=false` — full foreground auth check with loading states

### Auth Error Types
| Type | Screen |
|---|---|
| `auth_required` | Sign In / Demo choice screen |
| `user_not_registered` | `UserNotRegisteredError` component |
| `unknown` | Generic error |

### User Roles
- `user` — default role
- `admin` — access to admin utilities in Settings

---

## 9. DEMO MODE

Demo mode allows unauthenticated exploration of the game.

| Limit | Value |
|---|---|
| Max levels | 5 |
| Max cups | 3 |
| Persistence | Session only (in-memory) |
| Leaderboard | Disabled |
| Database | No reads or writes |

Demo mode is activated via `sessionStorage` key `puredrop_demo = '1'`. Cleared when session ends (tab close).

---

## 10. MONETIZATION — ADSENSE / H5 ADS

### Setup
- AdSense publisher ID: `ca-pub-2912984715921362`
- H5 Games Ads API via `window.adBreak` / `window.adConfig`
- Script loaded lazily after auth completes (not on login screen)

### Rewarded Ad Flow (`AdModal.jsx`)
1. User taps "📺 +1" (watch ad for a free cup)
2. `AdModal` shown
3. `window.adBreak({ type: 'reward', ... })` called
4. On `afterAd` callback → `addCup(1)` called
5. Fallback: if ad fails after 5s, still reward the cup (developer-friendly)

---

## 11. MAINTENANCE PLAN

### Routine Tasks

| Frequency | Task |
|---|---|
| Weekly | Review leaderboard for spam/abuse; run reset if needed |
| Weekly | Check Base44 dashboard for errors / failed function calls |
| Monthly | Review AdSense performance and fill rate |
| Monthly | Test on iOS Safari + Android Chrome (latest versions) |
| Monthly | Verify cup refill timers are correct (check REFILL_INTERVAL_MS) |
| Quarterly | Review level difficulty curve — player drop-off by level |
| Quarterly | Add new cup skins if engagement metrics warrant |
| Quarterly | Update dependencies (especially framer-motion, react-router-dom) |
| Annually | Review Base44 SDK version and upgrade if major improvements |

### Monitoring Checklist
- [ ] Base44 entity error rate
- [ ] Backend function error logs (`recalculateStars`, `resetLeaderboard`)
- [ ] AdSense fill rate + revenue
- [ ] Service Worker cache hit rate
- [ ] App loading time (Lighthouse score)
- [ ] Leaderboard record count (should stay ≤ 50)

### Database Hygiene
- `LevelScore` grows unbounded per user. Consider archiving records older than 90 days if storage becomes an issue.
- `Leaderboard` is pruned to top 50 on every submission via `updateProgress`. Verify this periodically.

### Security Notes
- All entity RLS rules are on `user_email`. Never remove these.
- Admin functions check `user.role === 'admin'` — verify this check is present after any function edits.
- Demo mode uses `sessionStorage` (cleared on tab close) — safe.
- Admin level jump tool is gated by email (`azuldwh@gmail.com`) — safe for production.

---

## 12. TROUBLESHOOTING MATRIX

| Symptom | Likely Cause | Resolution |
|---|---|---|
| Player profile not loading | Network error or first-time user | Check Base44 entity logs; profile is created automatically on first sync |
| Cups not refilling | `last_refill_time` is null or corrupt | Run `setCachedProfile(null)` in console to force re-fetch; or manually update `last_refill_time` in DB |
| Stars not showing on level cards | `LevelScore` records have `stars = 0` | Run `recalculateStars` backend function from Settings |
| Leaderboard empty | `hide_from_leaderboard` enabled OR no wins yet | Toggle leaderboard privacy in Settings |
| Leaderboard has >50 entries | Pruning failed | Manually run `resetLeaderboard` backend function |
| Sound not working | Browser autoplay policy | Sound starts on first user interaction; no fix needed — by design |
| Sound toggle not persisting | localStorage blocked | Check browser privacy settings / incognito mode |
| Game lag / dropped frames | Too many items on screen | `getLevelConfig` spawn intervals may need tuning for low-end devices |
| Cup doesn't move on mobile | Touch event not reaching canvas | Verify `onTouchMove` is on the correct element; check `touchAction: 'none'` CSS |
| Offline banner never goes away | `navigator.onLine` stuck | Refresh page; check network tab |
| "Back online" banner doesn't show | Transition not detected | Check `wasOfflineRef` in `App.jsx`; ensure `isOffline` state is transitioning correctly |
| Level stars/scores missing offline | `puredrop_level_scores` cache empty | Play at least one level online first to populate the cache |
| Silent re-validation triggers error | `checkAppState(true)` not using silent mode | Verify `silent=true` is passed in reconnect handler in `App.jsx` |
| Sync queue grows after reconnect | Server write still failing | Check entity RLS rules; verify user token is still valid after long offline period |
| Demo mode stuck after sign-in | `sessionStorage` not cleared | Call `disableDemoMode()` from console or close/reopen tab |
| Admin level jump not visible | Email mismatch | Verify `ADMIN_EMAIL` constant in `AdminLevelJump.jsx` matches your account |
| Ad modal shows but no ad loads | AdSense not configured for H5 | Check `ads.txt` file; verify AdSense account approval status |
| Game over screen loops | `gameSavedRef` reset too early | Check `gameSavedRef.current = false` is only called in `startGame` |
| Power-ups not spawning | Combo not reaching threshold | Verify `comboRef.current` is updating correctly; check `lastPowerUpSpawnRef` cooldown |
| Skin not applying | `setSkin` not calling server | Check network tab for entity update request; look for RLS errors |
| Level progression not advancing | `win === false` or `level < highest_level` | `updateProgress` only advances if `win && level >= highest_level` |
| Sync queue grows infinitely | Backend function errors when online | Check `recalculateStars` / profile update endpoint; look for 403/500 errors |
| App crashes on load | Import error or missing entity | Check browser console for "Module not found" or entity 404 |
| Canvas renders blank | Theme object missing a field | Verify `getCupTheme(skinId)` returns complete theme object; falls back to `classic` |

---

## 13. PLATFORM OFFLOAD PLAN

This section documents how to migrate PureDrop off of Base44 to a self-hosted stack if ever needed.

### Prerequisites
- Node.js backend (Express, Fastify, or similar)
- PostgreSQL or MongoDB database
- Auth provider (Auth0, Supabase Auth, or custom JWT)
- Static file hosting (Vercel, Netlify, or S3+CloudFront)
- Deno Deploy or similar for edge functions (optional)

---

### Step 1 — Export Database
1. Export all entity records from Base44 dashboard → Data → Export.
2. Map entities to SQL tables or MongoDB collections:

```sql
-- PlayerProfile
CREATE TABLE player_profiles (
  id UUID PRIMARY KEY,
  user_email TEXT UNIQUE NOT NULL,
  cups INT DEFAULT 5,
  last_refill_time TIMESTAMPTZ,
  selected_cup_skin TEXT DEFAULT 'classic',
  highest_level INT DEFAULT 1,
  total_score BIGINT DEFAULT 0,
  streak INT DEFAULT 0,
  last_play_date TEXT,
  difficulty_tier INT DEFAULT 1,
  hide_from_leaderboard BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- LevelScore
CREATE TABLE level_scores (
  id UUID PRIMARY KEY,
  user_email TEXT NOT NULL,
  level INT NOT NULL,
  score INT NOT NULL,
  purity INT,
  win BOOLEAN,
  stars INT DEFAULT 0,
  accuracy FLOAT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Leaderboard
CREATE TABLE leaderboard (
  id UUID PRIMARY KEY,
  user_email TEXT NOT NULL,
  display_name TEXT,
  level INT,
  score INT,
  purity INT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

### Step 2 — Replace Base44 SDK Calls

Replace all `base44.entities.X.method()` calls with fetch calls to your REST API:

```js
// BEFORE (Base44)
const profile = await base44.entities.PlayerProfile.filter({ user_email: email });

// AFTER (custom API)
const res = await fetch('/api/player-profiles?user_email=' + email, {
  headers: { Authorization: `Bearer ${token}` }
});
const profile = await res.json();
```

All entity calls to replace:
- `PlayerProfile.filter()` → `GET /api/player-profiles?user_email=`
- `PlayerProfile.create()` → `POST /api/player-profiles`
- `PlayerProfile.update(id, data)` → `PATCH /api/player-profiles/:id`
- `LevelScore.create()` → `POST /api/level-scores`
- `LevelScore.filter()` → `GET /api/level-scores?user_email=`
- `LevelScore.update()` → `PATCH /api/level-scores/:id`
- `Leaderboard.create()` → `POST /api/leaderboard`
- `Leaderboard.list()` → `GET /api/leaderboard?limit=50&sort=-score`
- `Leaderboard.delete()` → `DELETE /api/leaderboard/:id`

---

### Step 3 — Replace Authentication

Replace `base44.auth.me()` with your auth provider's user fetch:

```js
// BEFORE
const user = await base44.auth.me();

// AFTER (example with JWT)
const res = await fetch('/api/auth/me', {
  headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
});
const user = await res.json();
```

Replace `base44.auth.logout()` and `base44.auth.redirectToLogin()` with your auth provider's equivalents.

---

### Step 4 — Replace Backend Functions

The two backend functions (`recalculateStars`, `resetLeaderboard`) are simple API endpoints. Re-implement as Express routes:

```js
// recalculateStars
app.post('/api/admin/recalculate-stars', authMiddleware, adminMiddleware, async (req, res) => {
  const scores = await db.query('SELECT * FROM level_scores WHERE user_email = $1 AND win = true AND stars = 0', [req.user.email]);
  // ... apply computeStars formula, update records
});
```

---

### Step 5 — Replace Integrations

The only integration used is `Core.InvokeLLM` (if any AI features were added). Replace with direct OpenAI/Anthropic API calls.

---

### Step 6 — Update `api/base44Client.js`

Replace with your own API client module that exposes the same interface (`entities`, `auth`, `functions`).

---

### Step 7 — Deploy

1. Build: `npm run build` → outputs to `dist/`
2. Host `dist/` on Vercel / Netlify / S3
3. Configure custom domain
4. Update `public/ads.txt` if domain changes
5. Update AdSense site verification

---

### Migration Risk Assessment

| Component | Risk | Notes |
|---|---|---|
| Game logic | None | 100% frontend, no migration needed |
| Audio system | None | Web Audio API, no dependencies |
| Canvas rendering | None | Pure HTML5 Canvas |
| Player profiles | Low | Simple CRUD, easy to replicate |
| Auth | Medium | Need to handle token refresh, offline cache |
| RLS security | Medium | Must re-implement access control in your API |
| Leaderboard pruning | Low | Simple query logic |
| Offline sync queue | Low | localStorage logic is framework-agnostic |

---

## 14. CHANGE LOG — ALL CHANGES MADE

This log documents every significant change made to PureDrop during development, from initial creation through April 29, 2026.

---

### [INITIAL BUILD] — Game Foundation
- Created `entities/PlayerProfile.json` with cups, skin, streak, highest_level
- Created `entities/LevelScore.json` for per-level attempt tracking
- Created `entities/Leaderboard.json` for global top scores
- Built `pages/Game.jsx` as core game state machine
- Built `components/game/GameCanvas.jsx` — HTML5 canvas renderer
- Built `components/game/GameHUD.jsx` — in-game HUD
- Built `components/game/GameOverScreen.jsx` — post-game results
- Built `components/game/StartScreen.jsx` — initial landing screen
- Created `lib/levelConfig.js` — 500-level difficulty progression
- Created `lib/cupSkins.js` — 35 skins across 5 rarity tiers
- Created `hooks/usePlayerProfile.js` — player data management
- Set up routing: `/`, `/play`, `/gameover`, `/customize`

### [AUDIO] — Web Audio Synthesis
- Created `hooks/useGameAudio.js`
- Implemented rain noise, thunder rumble, piano melody (all synthesized)
- SFX: catch pluck, miss tone, cat meow, splash, power-up fanfare
- Added `hooks/useSoundSettings.js` for persistent toggle

### [OFFLINE FIRST] — Offline-First Architecture
- Created `lib/offlineStorage.js` — localStorage cache + sync queue
- Updated `lib/AuthContext.jsx` — offline fallback with cached user
- Updated `hooks/usePlayerProfile.js` — optimistic writes + offline queue
- Added `public/sw.js` — service worker for PWA offline
- Added offline banner in `App.jsx`

### [DEMO MODE] — Play Store Demo Support
- Created `lib/demoMode.js` — session-based demo profile
- Integrated demo mode throughout `LevelCarousel`, `CupCustomizer`, `usePlayerProfile`
- Demo limits: 5 levels, 3 cups, no DB writes

### [LEVEL SELECT] — LevelSelect → LevelCarousel Upgrade
- Replaced grid-based `LevelSelect` with animated swipeable `LevelCarousel`
- Added hero banner with SVG clouds, rain, and grass animations
- Added `LevelCard` component with star ratings and high score display
- Added `StreakBadge` component
- Added `AdminLevelJump` component (admin-only)
- Implemented drag/swipe gesture support
- Implemented keyboard arrow key navigation
- Added pull-to-refresh

### [POWER-UPS] — Power-Up System
- Created `lib/powerUps.js` — 6 power-ups
- Added `ITEM_TYPES.POWERUP` to game
- Power-up spawning, collection, and activation in `Game.jsx`
- Power-up display in `GameHUD.jsx` with countdowns

### [CUP THEMES] — Skin-Based Canvas Themes
- Created `lib/cupThemes.js` — 35 sky/ground themes
- Canvas background now reflects equipped cup skin during gameplay

### [SPILL REWORK] — Removed Spill Animation, Instant Reset
- Removed `SpillAnimation` component from gameplay loop
- Spills now trigger instant cup reset (no pause or animation)
- 2-spill limit per game; 3rd spill ends level immediately
- Added spill warning in HUD when 1 spill used

### [BOTTOM NAV] — Navigation Bar
- Created `components/game/BottomNav.jsx`
- Floating pill design with `pointer-events-none` outer wrapper
- Tabs: Play, Ranks, Customize

### [LEADERBOARD] — Leaderboard Page
- Created `pages/LeaderboardPage.jsx`
- Created `components/game/LeaderboardScreen.jsx`
- Added `/leaderboard` route
- Leaderboard auto-pruned to top 50 on submission

### [SETTINGS] — Settings Modal
- Created `components/game/SettingsModal.jsx`
- Sound toggle, dark/light mode, leaderboard privacy
- Account: sign out, delete account
- Admin: recalculate stars trigger

### [TUTORIAL] — Tutorial Modal
- Created `components/game/TutorialModal.jsx`
- Paginated tutorial slides
- Shown on first launch, stored in localStorage

### [ADSENSE] — Monetization Integration
- Added AdSense script to `App.jsx` (lazy load post-auth)
- Initialized H5 Games Ads API (`window.adBreak`, `window.adConfig`)
- Created `components/game/AdModal.jsx`
- Rewarded ad grants +1 cup
- 5-second fallback if ad fails
- Added `public/ads.txt`

### [BACKEND FUNCTIONS] — Admin Utilities
- Created `functions/recalculateStars.js`
- Created `functions/resetLeaderboard.js`

### [ADMIN TESTING] — Developer Tools
- Updated `PlayerProfile` record: `highest_level = 500`, `cups = 99` (for testing)
- Created `components/game/AdminLevelJump.jsx` — level number input for quick navigation
- Admin tool gated by email `azuldwh@gmail.com`
- Integrated `AdminLevelJump` into `LevelCarousel`

### [OFFLINE FIX v1] — Offline-First Auth Layer — April 29, 2026
- **`lib/AuthContext.jsx`**: Added `cachedUser + token` short-circuit — if cache exists, authenticate instantly without any network call. SDK error screen is never triggered. Background `checkUserAuth(true)` silently re-validates token after app is already running.
- **`hooks/useLevelScores.js`**: Added `puredrop_level_scores` localStorage cache. Level star ratings and high scores now load instantly from cache and display offline.

### [OFFLINE FIX v2] — Reconnect UX + Silent Re-validation — May 2, 2026
- **`lib/AuthContext.jsx`**: `checkAppState` now accepts `silent` param. When `silent=true`, loading spinners and `authError` state are not modified — safe to call on reconnect without disrupting the running app.
- **`App.jsx`**: Added `syncingBanner` state + `wasOfflineRef` to detect offline→online transition. Shows green "✓ Back online — syncing your progress…" banner for 3 seconds. Calls `checkAppState(true)` on reconnect for silent session re-validation.
- **Documentation**: Sections 7 and 8 updated to reflect all offline layers, reconnect flow, LocalStorage keys table (added `puredrop_level_scores`), Sync Queue types, and acceptance criteria table.

---

## 15. FULL CHAT TRANSCRIPT

> **Note:** The following is a reconstructed transcript based on available conversation history. Some very early sessions may be summarized rather than verbatim due to context window compaction by the AI platform.

---

### [Early Development Sessions — Summarized]

The initial sessions covered building the game from scratch on Base44. Topics included:

- Game concept definition: "catch falling raindrops, avoid obstacles, fill a cup"
- Entity schema design for PlayerProfile, LevelScore, Leaderboard
- Building the HTML5 canvas game loop
- Implementing the 500-level difficulty progression system
- Adding cup skins and the customizer
- Offline-first architecture decisions

---

### [Session: Spill Animation Removal]

**User:** Can we remove the spill animation / pause and just make it an instant reset?

**AI (Base44):** Removed the `SpillAnimation` component from the gameplay flow. Spills now trigger an immediate cup reset (fill → 0, purity → 100, shake effect, timer penalty) without any pause or animation sequence.

---

### [Session: Bottom Nav Floating Pill]

**User:** Make the bottom nav a floating pill design, and make sure it doesn't block touches on the game content.

**AI (Base44):** Updated `BottomNav.jsx` to use a floating pill design. Applied `pointer-events-none` to the outer `<nav>` wrapper and `pointer-events-auto` to the inner pill div. This allows touch events to pass through the transparent area around the pill to the content beneath.

---

### [Session: Level Carousel]

**User:** Replace the level grid with a swipeable carousel.

**AI (Base44):** Built `LevelCarousel.jsx` with:
- AnimatePresence slide animation between level cards
- 3 visible cards (center + neighbors at 82% scale and 55% opacity)
- Drag/swipe gesture support
- Keyboard arrow navigation
- Pull-to-refresh

---

### [Session: Player Profile Testing]

**User:** Can you unlock all levels and give me unlimited cups for testing?

**AI (Base44):** Updated your `PlayerProfile` record directly in the database:
- `highest_level` → 500
- `cups` → 99

---

### [Session: Admin Level Jump Input — April 29, 2026]

**User:** Please put a field that I can type the number of the level into and it takes me to it. Again, this field is only for my account for testing purposes.

**AI (Base44):** Created `components/game/AdminLevelJump.jsx`. The component is only rendered when the authenticated user's email matches `azuldwh@gmail.com`. It shows a number input and a "Go" button. Typing a level number and pressing Enter or clicking Go moves the `LevelCarousel` to that level. Integrated into `LevelCarousel.jsx` with import and JSX insertion below the swipe hint.

---

### [Session: Documentation Request — April 29, 2026]

**User:** Can you provide a document that describes every bit of code and documents related to this app? To include a maintenance plan, troubleshooting matrix, and a platform offload plan. Please include a section that has all changes that have been made from the beginning and a full transcript of our chats to this point.

**AI (Base44):** Generated this document — `PUREDROP_TECHNICAL_DOCUMENTATION.md` — covering complete file reference, game mechanics, data model, audio system, offline strategy, auth flow, demo mode, monetization, maintenance plan, troubleshooting matrix, platform offload plan, full change log, and chat transcript.

---

*End of Document*

---

**PUREDROP_TECHNICAL_DOCUMENTATION.md**  
Generated: April 29, 2026  
Platform: Base44  
For questions or updates, edit this file directly in the Base44 file editor.