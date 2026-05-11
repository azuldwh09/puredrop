export default function StreakBadge({ streak }) {
  if (!streak || streak < 1) return null;

  const flame = streak >= 30 ? '🔥🔥🔥' : streak >= 7 ? '🔥🔥' : '🔥';

  return (
    <div className="bg-card/60 border border-border/50 rounded-xl px-4 py-3 w-full flex items-center justify-between mb-3">
      <div className="flex flex-col">
        <span className="text-xs text-muted-foreground mb-0.5">Daily Streak</span>
        <div className="flex items-center gap-2">
          <span className="text-lg">{flame}</span>
          <span className="font-pixel text-accent text-sm">{streak} day{streak !== 1 ? 's' : ''}</span>
        </div>
      </div>
      <div className="text-right">
        <span className="text-xs text-muted-foreground">
          {streak >= 30 ? 'Legendary! 🏆' : streak >= 14 ? 'On fire!' : streak >= 7 ? 'Amazing!' : streak >= 3 ? 'Keep it up!' : 'Good start!'}
        </span>
      </div>
    </div>
  );
}