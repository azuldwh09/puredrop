# Offline Architecture — Backup Notes
## Created: 2026-05-02

## Summary
The app is FULLY offline-capable. No additional rework is needed. The architecture was
implemented across multiple sessions and all layers are in place.

## Three Layers of Offline Support

### Layer 1 — Auth (lib/AuthContext.jsx)
- If offline → check localStorage for `puredrop_user` cache
  - Found → authenticate immediately, show game
  - Not found → show Sign In / Demo screen
- If online with cached user+token → authenticate instantly from cache, validate silently in background
- `checkAppState(silent=true)` — safe to call on reconnect without spinner/error side-effects

### Layer 2 — Player Profile (hooks/usePlayerProfile.js)
- Instant load from `puredrop_profile` localStorage cache
- Background server sync via `syncFromServer()`
- All mutations (spendCup, setSkin, updateProgress) → optimistic local apply → server write
- If offline/failed → `enqueueSyncItem()` → `puredrop_sync_queue`
- On window 'online' → `flushQueue()` → `syncFromServer()`
- Profile updates are coalesced in queue (no duplicates)

### Layer 3 — Level Scores (hooks/useLevelScores.js)
- Instant load from `puredrop_level_scores` localStorage cache
- Background server sync
- Re-syncs on window 'online' event

### Reconnect UX (App.jsx)
- `wasOfflineRef` tracks offline→online transition
- Shows green "✓ Back online — syncing your progress…" banner for 3s
- Calls `checkAppState(true)` silently on reconnect
- `usePlayerProfile` independently flushes queue + re-syncs

### Service Worker (public/sw.js)
- Caches app shell for full offline load

## LocalStorage Keys
| Key | Contents |
|---|---|
| `puredrop_profile` | PlayerProfile JSON |
| `puredrop_user` | User JSON |
| `puredrop_sync_queue` | Array of pending mutations |
| `puredrop_level_scores` | `{ [level]: { stars, highScore } }` |
| `puredrop_sound_enabled` | "true" / "false" |
| `puredrop_tutorial_seen` | "true" if completed |

## Key Files
- `lib/AuthContext.jsx` — offline-first auth
- `lib/offlineStorage.js` — localStorage helpers + sync queue
- `hooks/usePlayerProfile.js` — profile with offline mutations
- `hooks/useLevelScores.js` — level scores with localStorage cache
- `App.jsx` — reconnect banner + silent re-validation
- `public/sw.js` — service worker for app shell caching
- `main.jsx` — service worker registration