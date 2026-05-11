import { useState } from 'react';
import { useAuth } from '@/lib/AuthContext';

const ADMIN_EMAIL = 'azuldwh@gmail.com';

export default function AdminLevelJump({ onJump, maxLevel }) {
  const { user } = useAuth();
  const [val, setVal] = useState('');

  if (!user || user.email !== ADMIN_EMAIL) return null;

  const handleGo = () => {
    const n = parseInt(val, 10);
    if (!isNaN(n) && n >= 1 && n <= maxLevel) {
      onJump(n);
      setVal('');
    }
  };

  return (
    <div className="flex items-center gap-2 bg-card/60 border border-accent/40 rounded-xl px-3 py-2 w-full">
      <span className="text-[10px] font-pixel text-accent shrink-0">🛠 Jump to:</span>
      <input
        type="number"
        min={1}
        max={maxLevel}
        value={val}
        onChange={e => setVal(e.target.value)}
        onKeyDown={e => e.key === 'Enter' && handleGo()}
        placeholder="level #"
        className="flex-1 bg-transparent text-xs text-foreground placeholder:text-muted-foreground outline-none min-w-0"
        style={{ userSelect: 'text', WebkitUserSelect: 'text' }}
      />
      <button
        onClick={handleGo}
        className="font-pixel text-[10px] text-accent-foreground bg-accent rounded-lg px-2 py-1 shrink-0"
      >
        Go
      </button>
    </div>
  );
}