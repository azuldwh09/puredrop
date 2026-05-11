import LeaderboardScreen from '@/components/game/LeaderboardScreen';
import BottomNav from '@/components/game/BottomNav';
import NavigationHeader from '@/components/game/NavigationHeader';

export default function LeaderboardPage() {
  return (
    <div className="min-h-screen bg-background pb-20 overflow-y-auto">
      <NavigationHeader />
      <LeaderboardScreen />
      <BottomNav />
    </div>
  );
}