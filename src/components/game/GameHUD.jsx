import { Droplets, Clock, Star, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

const POWER_UP_EMOJIS = { slow_time: '🐢', attract: '🧲', blaster: '💥', cat_toy: '🪀', fast_time: '⚡', downpour: '🌊' };

export default function GameHUD({ timeLeft, score, purity, fillAmount, fillGoal, onSpill, level, levelLabel, combo, activePowerUps, spillsUsed = 0 }) {
  const fillPct = Math.round((fillAmount / fillGoal) * 100);
  const isLowTime = timeLeft <= 10;
  const isDirty = purity < 50;

  // Water color
  const waterHue = isDirty ? 35 : 199;
  const waterSat = isDirty ? 60 : 89;

  return (
    <div className="w-full max-w-[480px] px-1">
      <div className="bg-card/80 backdrop-blur-sm border border-border/50 rounded-xl p-3 flex flex-col gap-3">
        {/* Top row: time + score */}
        <div className="flex items-center justify-between">
          <div className={`flex items-center gap-2 font-pixel text-sm ${isLowTime ? 'text-destructive' : 'text-foreground'}`}>
            <Clock className={`w-4 h-4 ${isLowTime ? 'animate-pulse' : ''}`} />
            {String(Math.floor(timeLeft / 60)).padStart(2,'0')}:{String(timeLeft % 60).padStart(2,'0')}
          </div>

          <div className="flex items-center gap-2 font-pixel text-[10px] text-muted-foreground">
            Lvl {level} · {levelLabel}
          </div>

          <div className="flex items-center gap-1 font-pixel text-sm text-accent">
            <Star className="w-4 h-4" />
            {score}
            {combo > 1 && (
              <span className="text-[10px] bg-accent text-accent-foreground rounded px-1 py-0.5 ml-1 animate-pulse">
                x{combo}
              </span>
            )}
          </div>
        </div>

        {/* Cup fill bar */}
        <div>
          <div className="flex justify-between text-sm text-muted-foreground mb-1">
            <span className="flex items-center gap-1">
              <Droplets className="w-3 h-3" /> Cup Fill
            </span>
            <span>{fillPct}%</span>
          </div>
          <div className="h-4 bg-secondary rounded-full overflow-hidden border border-border/50">
            <div
              className="h-full rounded-full transition-all duration-300"
              style={{
                width: `${fillPct}%`,
                background: `hsl(${waterHue} ${waterSat}% 60%)`,
                boxShadow: `0 0 8px hsl(${waterHue} ${waterSat}% 60% / 0.6)`,
              }}
            />
          </div>
        </div>

        {/* Purity bar */}
        <div>
          <div className="flex justify-between text-sm text-muted-foreground mb-1">
            <span>✨ Purity</span>
            <span>{purity}%</span>
          </div>
          <div className="h-3 bg-secondary rounded-full overflow-hidden border border-border/50">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${purity}%`,
                background: purity > 70
                  ? 'linear-gradient(90deg, #1a8fcb, #4ee8a8)'
                  : purity > 40
                  ? 'linear-gradient(90deg, #e8a84e, #e88a4e)'
                  : 'linear-gradient(90deg, #c0392b, #8B4513)',
              }}
            />
          </div>
        </div>

        {/* Active power-ups */}
        {activePowerUps && Object.keys(activePowerUps).length > 0 && (
          <div className="flex gap-1.5 flex-wrap">
            {Object.entries(activePowerUps).map(([id, expiry]) => {
              const secs = Math.max(0, Math.ceil((expiry - Date.now()) / 1000));
              return (
                <div key={id} className="flex items-center gap-1 bg-accent/20 border border-accent/50 rounded-lg px-2 py-0.5 text-xs font-pixel text-accent animate-pulse">
                  <span>{POWER_UP_EMOJIS[id]}</span>
                  <span>{secs}s</span>
                </div>
              );
            })}
          </div>
        )}

        {/* Spill warning */}
        {spillsUsed >= 1 && (
          <div className="text-[10px] font-pixel text-destructive text-center bg-destructive/10 rounded-lg py-1 px-2 border border-destructive/30">
            ⚠️ Last spill! ({spillsUsed}/2) — next spill ends the level!
          </div>
        )}

        {/* Spill button */}
        {isDirty && fillAmount > 0 && spillsUsed < 2 && (
          <Button
            onClick={onSpill}
            variant="destructive"
            size="sm"
            className="text-xs font-pixel animate-pulse"
          >
            <Trash2 className="w-3 h-3 mr-1" />
            Spill Cup (-8s) — water is contaminated!
          </Button>
        )}
      </div>
    </div>
  );
}