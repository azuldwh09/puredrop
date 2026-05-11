import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Trophy, User, Globe } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { isDemoMode } from '@/lib/demoMode';

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
      transition={{ delay: rank * 0.03 }}
      className={`flex items-center gap-3 px-4 py-3 rounded-xl border transition-all ${
        isMe
          ? 'bg-primary/10 border-primary/40'
          : 'bg-card/50 border-border/30'
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
      <span className="font-pixel text-sm text-accent shrink-0">{score.toLocaleString()}</span>
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

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      // Always load global scores — local mode players can view but not participate
      const global = await base44.entities.Leaderboard.list('-score', 50);
      setGlobalScores(global);

      if (!isLocal) {
        const user = await base44.auth.me();
        setMyEmail(user.email);
        const personal = await base44.entities.LevelScore.filter({ user_email: user.email }, '-score', 10);
        setPersonalScores(personal);
      }
      setLoading(false);
    };
    load();
  }, []);

  const displayName = (email) => {
    if (!email) return 'Player';
    return email.split('@')[0];
  };

  return (
    <div className="w-full max-w-sm mx-auto px-4 pt-4 pb-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Trophy className="w-6 h-6 text-accent" />
        <h2 className="font-pixel text-primary text-sm">Leaderboard</h2>
      </div>

      {/* Tabs */}
      <div role="tablist" aria-label="Leaderboard view" className="flex bg-card/60 rounded-xl p-1 mb-5 border border-border/40">
        {TABS.map(t => (
          <button
            key={t.id}
            role="tab"
            aria-selected={tab === t.id}
            aria-controls={`tabpanel-${t.id}`}
            onClick={() => setTab(t.id)}
            className={`flex-1 flex items-center justify-center gap-1.5 rounded-lg text-xs font-pixel transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
              tab === t.id
                ? 'bg-primary text-primary-foreground shadow'
                : 'text-muted-foreground hover:text-foreground'
            }`}
            style={{ minHeight: 44 }}
          >
            <t.icon className="w-3 h-3" aria-hidden="true" />
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-12" role="status" aria-label="Loading leaderboard">
          <div className="w-6 h-6 border-4 border-primary/30 border-t-primary rounded-full animate-spin" aria-hidden="true" />
        </div>
      ) : tab === 'global' ? (
        <div className="space-y-2 max-h-96 overflow-y-auto pr-2">
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
                key={entry.id}
                rank={i + 1}
                name={displayName(entry.user_email)}
                level={entry.level}
                score={entry.score}
                isMe={entry.user_email === myEmail}
              />
            ))
          )}
        </div>
      ) : (
        <div className="space-y-2 max-h-96 overflow-y-auto pr-2">
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
                  key={entry.id}
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