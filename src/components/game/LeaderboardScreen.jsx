import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Trophy, User, Globe, RefreshCw, WifiOff } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { getCurrentFirebaseUser } from '@/lib/firebaseAuth';
import { isDemoMode } from '@/lib/demoMode';
import { Button } from '@/components/ui/button';

const ALL_TABS = [
  { id: 'global', label: 'Global', icon: Globe },
  { id: 'personal', label: 'My Scores', icon: User },
];

function Medal({ rank }) {
  if (rank === 1) return <span className="text-lg">🥇</span>;
  if (rank === 2) return <span className="text-lg">🥈</span>;
  if (rank === 3) return <span className="text-lg">🥉</span>;
  return <span className="font-pixel text-xs text-muted-foreground w-6 text-center">{rank}</span>;
}

function ScoreRow({ rank, name, level, score, isMe }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: Math.min(rank * 0.03, 0.5) }}
      className={`flex items-center gap-3 px-4 py-3 rounded-xl border transition-all ${
        isMe ? 'bg-primary/10 border-primary/40' : 'bg-card/50 border-border/30'
      }`}
    >
      <div className="w-7 flex items-center justify-center shrink-0">
        <Medal rank={rank} />
      </div>
      <div className="flex-1 min-w-0">
        <p className={`text-sm truncate font-medium ${isMe ? 'text-primary' : 'text-foreground'}`}>
          {name} {isMe && <span className="text-xs opacity-70">(you)</span>}
        </p>
        <p className="text-xs text-muted-foreground">Level {level}</p>
      </div>
      <span className="font-pixel text-sm text-accent shrink-0">{(score || 0).toLocaleString()}</span>
    </motion.div>
  );
}

export default function LeaderboardScreen() {
  const isLocal = isDemoMode();
  const TABS = isLocal ? ALL_TABS.filter(t => t.id === 'global') : ALL_TABS;
  const [tab, setTab] = useState('global');
  const [globalScores, setGlobalScores] = useState([]);
  const [personalScores, setPersonalScores] = useState([]);
  const [myEmail, setMyEmail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      // Fetch global scores — open to all players
      const global = await base44.entities.Leaderboard.list('-score', 50);
      setGlobalScores(Array.isArray(global) ? global : []);
    } catch (err) {
      console.error('Failed to load global leaderboard:', err);
      setError('Could not load scores. Check your connection.');
      setGlobalScores([]);
    }

    if (!isLocal) {
      try {
        const user = await getCurrentFirebaseUser();
        setMyEmail(user?.email || null);
        const personal = await base44.entities.LevelScore.filter(
          { user_email: user.email }, '-score', 10
        );
        setPersonalScores(Array.isArray(personal) ? personal : []);
      } catch (err) {
        console.error('Failed to load personal scores:', err);
        setPersonalScores([]);
      }
    }

    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const displayName = (email) => {
    if (!email) return 'Player';
    return email.split('@')[0];
  };

  return (
    <div className="w-full max-w-sm mx-auto px-4 pt-4 pb-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Trophy className="w-6 h-6 text-accent" />
          <h2 className="font-pixel text-primary text-sm">Leaderboard</h2>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="text-muted-foreground hover:text-foreground transition-colors"
          aria-label="Refresh"
          style={{ minWidth: 44, minHeight: 44, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Tabs */}
      <div role="tablist" className="flex bg-card/60 rounded-xl p-1 mb-5 border border-border/40">
        {TABS.map(t => (
          <button
            key={t.id}
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => setTab(t.id)}
            className={`flex-1 flex items-center justify-center gap-1.5 rounded-lg text-xs font-pixel transition-all ${
              tab === t.id
                ? 'bg-primary text-primary-foreground shadow'
                : 'text-muted-foreground hover:text-foreground'
            }`}
            style={{ minHeight: 44 }}
          >
            <t.icon className="w-3 h-3" />
            {t.label}
          </button>
        ))}
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex justify-center py-12">
          <div className="w-6 h-6 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
        </div>
      )}

      {/* Error state */}
      {!loading && error && (
        <div className="text-center py-12">
          <WifiOff className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <p className="font-pixel text-xs text-muted-foreground mb-4">{error}</p>
          <Button onClick={load} size="sm" variant="outline" className="font-pixel text-xs">
            <RefreshCw className="w-3 h-3 mr-1" /> Retry
          </Button>
        </div>
      )}

      {/* Global tab */}
      {!loading && !error && tab === 'global' && (
        <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-1">
          {isLocal && (
            <p className="text-xs text-muted-foreground text-center mb-3 pb-2 border-b border-border/30">
              Sign in to appear on the leaderboard
            </p>
          )}
          {globalScores.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-4xl mb-3">💧</p>
              <p className="font-pixel text-xs text-muted-foreground">No scores yet. Be the first!</p>
            </div>
          ) : (
            globalScores.map((entry, i) => (
              <ScoreRow
                key={entry.id || i}
                rank={i + 1}
                name={displayName(entry.user_email)}
                level={entry.level}
                score={entry.score}
                isMe={entry.user_email === myEmail}
              />
            ))
          )}
        </div>
      )}

      {/* Personal tab */}
      {!loading && !error && tab === 'personal' && (
        <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-1">
          {personalScores.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-4xl mb-3">🎮</p>
              <p className="font-pixel text-xs text-muted-foreground">No scores yet. Play a level!</p>
            </div>
          ) : (
            <>
              <p className="text-xs text-muted-foreground mb-3 text-center">Your top scores across all levels</p>
              {personalScores.map((entry, i) => (
                <ScoreRow
                  key={entry.id || i}
                  rank={i + 1}
                  name={`Level ${entry.level}`}
                  level={entry.level}
                  score={entry.score}
                  isMe={false}
                />
              ))}
            </>
          )}
        </div>
      )}
    </div>
  );
}
