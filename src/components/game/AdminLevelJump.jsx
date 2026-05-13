import { useState } from 'react';

// =============================================================================
// LevelJump (formerly AdminLevelJump)
// =============================================================================
// A small inline input for jumping to any unlocked level. Previously gated
// behind a hard-coded admin email; now available to every player on the
// device so they can quickly navigate the carousel without swiping through
// every card.
//
// Props:
//   onJump(level: number)  -- called when the player taps Go or presses Enter
//   maxLevel  -- the highest level number the player is allowed to jump to.
//                Pass the player's highest_unlocked_level here; we never let
//                them skip past it.
// =============================================================================
export default function AdminLevelJump({ onJump, maxLevel }) {
  const [val, setVal] = useState('');

  const handleGo = () => {
    const n = parseInt(val, 10);
    if (!isNaN(n) && n >= 1 && n <= maxLevel) {
      onJump(n);
      setVal('');
    }
  };

  return (
    <div className="flex items-center gap-2 bg-card/60 border border-accent/40 rounded-xl px-3 py-2 w-full">
      {/* Label -- plain text, no emoji. The wrench icon was a holdover from
          the admin-only version and looked out of place in the production UI. */}
      <span className="text-[10px] font-pixel text-accent shrink-0">Jump to:</span>
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
