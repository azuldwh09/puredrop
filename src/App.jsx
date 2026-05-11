import { useState, useEffect } from 'react';
import { useGameStore } from './store/gameStore';
import { flushSyncQueue, savePlayerProfile } from './api/offlineSync';
import { useNetwork } from './hooks/useNetwork';
import { OfflineBanner } from './components/OfflineBanner';
import HomeScreen from './screens/HomeScreen';
import GameScreen from './screens/GameScreen';
import ResultScreen from './screens/ResultScreen';
import LeaderboardScreen from './screens/LeaderboardScreen';
import SkinsScreen from './screens/SkinsScreen';
import SettingsScreen from './screens/SettingsScreen';

const SCREENS = {
  HOME: 'home',
  GAME: 'game',
  RESULT: 'result',
  LEADERBOARD: 'leaderboard',
  SKINS: 'skins',
  SETTINGS: 'settings',
};

export default function App() {
  const [screen, setScreen] = useState(SCREENS.HOME);
  const [gameResult, setGameResult] = useState(null);
  const { startGame, currentLevel, highestLevel, authToken, toProfileRecord } = useGameStore();
  const { isOnline } = useNetwork();

  // Flush sync queue when connectivity returns
  useEffect(() => {
    if (isOnline && authToken) {
      flushSyncQueue(authToken);
    }
  }, [isOnline, authToken]);

  const handlePlay = () => {
    const ok = startGame(highestLevel);
    if (ok) setScreen(SCREENS.GAME);
  };

  const handleGameEnd = (result, score, purity, stars) => {
    setGameResult({ result, score, purity, stars });
    // Sync profile after every game
    const profile = toProfileRecord();
    savePlayerProfile(profile, authToken);
    setScreen(SCREENS.RESULT);
  };

  const handleNext = () => {
    const ok = startGame(currentLevel + 1);
    if (ok) setScreen(SCREENS.GAME);
  };

  const handleRetry = () => {
    const ok = startGame(currentLevel);
    if (ok) setScreen(SCREENS.GAME);
  };

  return (
    <div style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>
      <OfflineBanner />

      {screen === SCREENS.HOME && (
        <HomeScreen
          onPlay={handlePlay}
          onLeaderboard={() => setScreen(SCREENS.LEADERBOARD)}
          onSkins={() => setScreen(SCREENS.SKINS)}
          onSettings={() => setScreen(SCREENS.SETTINGS)}
        />
      )}

      {screen === SCREENS.GAME && (
        <GameScreen onGameEnd={handleGameEnd} />
      )}

      {screen === SCREENS.RESULT && gameResult && (
        <ResultScreen
          {...gameResult}
          onNext={handleNext}
          onRetry={handleRetry}
          onHome={() => setScreen(SCREENS.HOME)}
        />
      )}

      {screen === SCREENS.LEADERBOARD && (
        <LeaderboardScreen onBack={() => setScreen(SCREENS.HOME)} />
      )}

      {screen === SCREENS.SKINS && (
        <SkinsScreen onBack={() => setScreen(SCREENS.HOME)} />
      )}

      {screen === SCREENS.SETTINGS && (
        <SettingsScreen onBack={() => setScreen(SCREENS.HOME)} />
      )}
    </div>
  );
}
