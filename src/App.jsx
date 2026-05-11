import { useState, useEffect } from 'react';
import { useGameStore } from './store/gameStore';
import { flushSyncQueue } from './api/offlineSync';
import { useNetwork } from './hooks/useNetwork';
import { OfflineBanner } from './components/OfflineBanner';
import HomeScreen from './screens/HomeScreen';
import GameScreen from './screens/GameScreen';
import ResultScreen from './screens/ResultScreen';
import LeaderboardScreen from './screens/LeaderboardScreen';
import SkinsScreen from './screens/SkinsScreen';

const SCREENS = {
  HOME: 'home',
  GAME: 'game',
  RESULT: 'result',
  LEADERBOARD: 'leaderboard',
  SKINS: 'skins',
};

export default function App() {
  const [screen, setScreen] = useState(SCREENS.HOME);
  const [gameResult, setGameResult] = useState(null);
  const { startGame, currentLevel, highestLevel, authToken } = useGameStore();
  const { isOnline } = useNetwork();

  // Flush sync queue when connectivity returns
  useEffect(() => {
    if (isOnline && authToken) {
      flushSyncQueue(authToken);
    }
  }, [isOnline, authToken]);

  const handlePlay = () => {
    startGame(highestLevel);
    setScreen(SCREENS.GAME);
  };

  const handleGameEnd = (result, score, purity, stars) => {
    setGameResult({ result, score, purity, stars });
    setScreen(SCREENS.RESULT);
  };

  const handleNext = () => {
    startGame(currentLevel + 1);
    setScreen(SCREENS.GAME);
  };

  const handleRetry = () => {
    startGame(currentLevel);
    setScreen(SCREENS.GAME);
  };

  return (
    <div style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>
      <OfflineBanner />

      {screen === SCREENS.HOME && (
        <HomeScreen
          onPlay={handlePlay}
          onLeaderboard={() => setScreen(SCREENS.LEADERBOARD)}
          onSkins={() => setScreen(SCREENS.SKINS)}
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
    </div>
  );
}
