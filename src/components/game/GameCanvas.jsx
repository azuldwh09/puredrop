import { useRef, useEffect } from 'react';
import { ITEM_TYPES } from '../../pages/Game';
// ITEM_TYPES.POWERUP is used below for rendering catchable power-up items

const RAIN_DROPS = Array.from({ length: 55 }, () => ({
  x: Math.random() * 480,
  y: Math.random() * 640,
  speed: 5 + Math.random() * 7,
  length: 10 + Math.random() * 14,
  opacity: 0.15 + Math.random() * 0.2,
}));

export default function GameCanvas({
  width, height, items, cupX, cupWidth, cupHeight,
  fillAmount, fillGoal, purity, effects, isShaking, onTouchMove, onMouseMove, cupSkin, theme,
  onUserGesture  // fired on first pointer/touch -- caller uses this to unlock audio
}) {
  const canvasRef = useRef(null);
  const isDraggingRef = useRef(false);
  const rainRef = useRef(RAIN_DROPS.map(d => ({ ...d })));
  const frameRef = useRef(0);

  // Use refs for hot-path values so the draw loop never restarts on state changes
  const cupXRef = useRef(cupX);
  const itemsRef = useRef(items);
  const fillAmountRef = useRef(fillAmount);
  const fillGoalRef = useRef(fillGoal);
  const purityRef = useRef(purity);
  const effectsRef = useRef(effects);
  const isShakingRef = useRef(isShaking);
  const cupSkinRef = useRef(cupSkin);
  const themeRef = useRef(theme);

  // Sync refs every render — no re-registration of rAF loop needed
  cupXRef.current = cupX;
  itemsRef.current = items;
  fillAmountRef.current = fillAmount;
  fillGoalRef.current = fillGoal;
  purityRef.current = purity;
  effectsRef.current = effects;
  isShakingRef.current = isShaking;
  cupSkinRef.current = cupSkin;
  themeRef.current = theme;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const draw = () => {
      frameRef.current++;
      const f = frameRef.current;

      // Read from refs — no stale closure issues
      const _cupX = cupXRef.current;
      const _items = itemsRef.current;
      const _fillAmount = fillAmountRef.current;
      const _fillGoal = fillGoalRef.current;
      const _purity = purityRef.current;
      const _effects = effectsRef.current;
      const _isShaking = isShakingRef.current;
      const _cupSkin = cupSkinRef.current || {};
      const _theme = themeRef.current || {};

      ctx.clearRect(0, 0, width, height);

      // ── SKY ──────────────────────────────────────────────────
      const skyGrad = ctx.createLinearGradient(0, 0, 0, height);
      skyGrad.addColorStop(0,   _theme.skyTop  || '#0d2b5e');
      skyGrad.addColorStop(0.6, _theme.skyMid  || '#1a4d8c');
      skyGrad.addColorStop(1,   _theme.skyBot  || '#1565c0');
      ctx.fillStyle = skyGrad;
      ctx.fillRect(0, 0, width, height);

      // ── CLOUDS ───────────────────────────────────────────────
      const cloudAlpha = _theme.cloudAlpha ?? 0.18;
      const drawCloud = (cx, cy, sc, alpha) => {
        ctx.save();
        ctx.fillStyle = `rgba(255,255,255,${alpha})`;
        ctx.beginPath();
        ctx.arc(cx,              cy,           32 * sc, 0, Math.PI * 2);
        ctx.arc(cx + 32 * sc,   cy - 14 * sc, 26 * sc, 0, Math.PI * 2);
        ctx.arc(cx + 60 * sc,   cy,            28 * sc, 0, Math.PI * 2);
        ctx.arc(cx + 30 * sc,   cy + 14 * sc, 22 * sc, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = `rgba(255,255,255,${alpha * 0.6})`;
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.restore();
      };
      const drift = (f * 0.12) % (width + 120);
      drawCloud(60  - drift % 90,  70,  0.85, cloudAlpha);
      drawCloud(260 - drift % 110, 45,  1.0,  cloudAlpha * 0.85);
      drawCloud(170 - drift % 70,  115, 0.65, cloudAlpha * 0.7);

      // ── RAIN ─────────────────────────────────────────────────
      ctx.save();
      rainRef.current.forEach(drop => {
        drop.y += drop.speed;
        if (drop.y > height) { drop.y = -drop.length; drop.x = Math.random() * width; }
        ctx.strokeStyle = _theme.rainColor || 'rgba(160,220,255,0.25)';
        ctx.lineWidth = 2.5;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(drop.x, drop.y);
        ctx.lineTo(drop.x - 3, drop.y + drop.length);
        ctx.stroke();
      });
      ctx.restore();

      // ── GROUND ───────────────────────────────────────────────
      const gGrad = ctx.createLinearGradient(0, height - 26, 0, height);
      gGrad.addColorStop(0, _theme.groundTop || '#2ecc71');
      gGrad.addColorStop(1, _theme.groundBot || '#1a5c32');
      ctx.fillStyle = gGrad;
      ctx.beginPath();
      ctx.roundRect(0, height - 24, width, 24, [10, 10, 0, 0]);
      ctx.fill();
      ctx.strokeStyle = _theme.grassColor || '#57e88a';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(0, height - 24);
      ctx.lineTo(width, height - 24);
      ctx.stroke();
      // Grass tufts
      ctx.strokeStyle = _theme.grassColor || '#57e88a';
      ctx.lineWidth = 2;
      ctx.lineCap = 'round';
      for (let gx = 18; gx < width; gx += 28) {
        const jitter = (gx * 7919) % 6 - 3;
        ctx.beginPath();
        ctx.moveTo(gx + jitter, height - 24);
        ctx.lineTo(gx + jitter - 4, height - 32);
        ctx.moveTo(gx + jitter + 6, height - 24);
        ctx.lineTo(gx + jitter + 2, height - 31);
        ctx.stroke();
      }

      // ── ENVIRONMENT DECORATIONS (tier-specific) ──────────────
      const tier = _theme.tier || 1;
      if (tier === 1) {
        // Sunny meadow — cute little flowers
        const flowerColors = ['#ff9ff3','#feca57','#ff6b6b','#48dbfb','#ff9ff3'];
        for (let fx = 22; fx < width - 10; fx += 52) {
          const fc = flowerColors[(fx / 52 | 0) % flowerColors.length];
          const sway = Math.sin(f * 0.04 + fx * 0.08) * 2;
          ctx.save();
          ctx.translate(fx + sway, height - 30);
          // Stem
          ctx.strokeStyle = '#2ecc71'; ctx.lineWidth = 2;
          ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -12); ctx.stroke();
          // Petals
          ctx.fillStyle = fc;
          for (let p = 0; p < 5; p++) {
            const a = (p / 5) * Math.PI * 2;
            ctx.beginPath();
            ctx.ellipse(Math.cos(a) * 4, -12 + Math.sin(a) * 4, 3.5, 2.5, a, 0, Math.PI * 2);
            ctx.fill();
          }
          // Centre
          ctx.fillStyle = '#fff176';
          ctx.beginPath(); ctx.arc(0, -12, 3, 0, Math.PI * 2); ctx.fill();
          ctx.restore();
        }
      } else if (tier === 2) {
        // Overcast — small bushes / shrubs
        ctx.fillStyle = '#4caf50';
        for (let bx = 30; bx < width - 10; bx += 65) {
          const sway = Math.sin(f * 0.03 + bx * 0.05) * 1.5;
          ctx.save(); ctx.translate(bx + sway, height - 26);
          ctx.beginPath();
          ctx.arc(0, -10, 14, Math.PI, 0); ctx.fill();
          ctx.beginPath();
          ctx.arc(-10, -8, 10, Math.PI, 0); ctx.fill();
          ctx.beginPath();
          ctx.arc(10, -8, 10, Math.PI, 0); ctx.fill();
          ctx.restore();
        }
      } else if (tier === 3) {
        // Rainy forest — tall dark pine trees
        for (let tx = 20; tx < width; tx += 80) {
          ctx.save(); ctx.translate(tx, height - 26);
          ctx.fillStyle = '#1b5e20';
          ctx.beginPath();
          ctx.moveTo(0, -55); ctx.lineTo(18, -20); ctx.lineTo(-18, -20); ctx.closePath();
          ctx.fill();
          ctx.beginPath();
          ctx.moveTo(0, -40); ctx.lineTo(22, 0); ctx.lineTo(-22, 0); ctx.closePath();
          ctx.fill();
          ctx.fillStyle = '#4e342e';
          ctx.fillRect(-4, 0, 8, 14);
          ctx.restore();
        }
      } else if (tier === 4) {
        // Thunderstorm — lightning bolt silhouettes in background
        if (f % 90 < 4) {
          ctx.save();
          ctx.fillStyle = 'rgba(220,200,255,0.18)';
          ctx.fillRect(0, 0, width, height);
          ctx.restore();
        }
        // Jagged dead trees
        for (let tx = 30; tx < width; tx += 90) {
          ctx.save(); ctx.translate(tx, height - 26);
          ctx.strokeStyle = '#2d1b00'; ctx.lineWidth = 5; ctx.lineCap = 'round';
          ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -50); ctx.stroke();
          ctx.lineWidth = 3;
          ctx.beginPath(); ctx.moveTo(0, -35); ctx.lineTo(15, -25); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(0, -42); ctx.lineTo(-12, -32); ctx.stroke();
          ctx.restore();
        }
      } else if (tier === 5) {
        // Monsoon — sandy beach + palm trees
        for (let px = 40; px < width; px += 100) {
          const lean = Math.sin(f * 0.05 + px * 0.04) * 4;
          ctx.save(); ctx.translate(px + lean, height - 26);
          // Trunk
          ctx.strokeStyle = '#8d6e63'; ctx.lineWidth = 6; ctx.lineCap = 'round';
          ctx.beginPath();
          ctx.moveTo(0, 0); ctx.bezierCurveTo(lean * 0.5, -20, lean, -38, lean * 1.5, -50);
          ctx.stroke();
          // Fronds
          const frondX = lean * 1.5; const frondY = -50;
          ctx.strokeStyle = '#33691e'; ctx.lineWidth = 3;
          for (let fi = 0; fi < 5; fi++) {
            const fa = (-0.4 + fi * 0.25) * Math.PI;
            ctx.beginPath();
            ctx.moveTo(frondX, frondY);
            ctx.lineTo(frondX + Math.cos(fa) * 22, frondY + Math.sin(fa) * 14);
            ctx.stroke();
          }
          ctx.restore();
        }
      } else {
        // Hurricane tier 6 — apocalyptic swirling debris dots
        for (let d = 0; d < 6; d++) {
          const angle = (f * 0.022 + d * 1.05) % (Math.PI * 2);
          const radius = 18 + d * 12;
          const debrisX = width * 0.5 + Math.cos(angle) * radius;
          const debrisY = height * 0.15 + Math.sin(angle) * (radius * 0.4);
          ctx.fillStyle = `rgba(150,160,180,${0.25 + d * 0.05})`;
          ctx.beginPath();
          ctx.arc(debrisX, debrisY, 3 + d * 0.5, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // ── FALLING ITEMS ────────────────────────────────────────
      _items.forEach(item => {
        ctx.save();

        if (item.type === ITEM_TYPES.CLEAN) {
          // ── Teardrop water drop ──
          ctx.translate(item.x, item.y);
          const sway = Math.sin(f * 0.14 + item.id * 1.7) * 1.5;
          ctx.translate(sway, 0);
          const r = item.size * 0.95;

          // Teardrop path: pointed top, round bottom
          ctx.shadowColor = '#38bdf8';
          ctx.shadowBlur = 18;
          const tdGrad = ctx.createRadialGradient(-r * 0.28, r * 0.1, r * 0.03, 0, r * 0.25, r * 0.9);
          tdGrad.addColorStop(0,   '#e0f7ff');
          tdGrad.addColorStop(0.35,'#56cffa');
          tdGrad.addColorStop(0.75,'#0ea5e9');
          tdGrad.addColorStop(1,   '#0369a1');
          ctx.fillStyle = tdGrad;
          ctx.beginPath();
          ctx.moveTo(0, -r * 1.2);           // pointed tip at top
          ctx.bezierCurveTo( r * 0.9, -r * 0.1,  r, r * 0.7,  0, r);   // right curve
          ctx.bezierCurveTo(-r, r * 0.7, -r * 0.9, -r * 0.1, 0, -r * 1.2); // left curve
          ctx.closePath();
          ctx.fill();
          ctx.shadowBlur = 0;
          // Outline
          ctx.strokeStyle = '#0284c7';
          ctx.lineWidth = 3;
          ctx.stroke();
          // Shine streak
          ctx.fillStyle = 'rgba(255,255,255,0.7)';
          ctx.beginPath();
          ctx.ellipse(-r * 0.28, -r * 0.15, r * 0.14, r * 0.32, -0.4, 0, Math.PI * 2);
          ctx.fill();

        } else if (item.type === ITEM_TYPES.DIRTY) {
          // ── Dirty teardrop sludge ──
          ctx.translate(item.x, item.y);
          const wobble = Math.sin(f * 0.13 + item.id) * 1.5;
          ctx.translate(wobble, 0);
          const r = item.size * 0.95;

          ctx.shadowColor = '#92400e';
          ctx.shadowBlur = 14;
          const dg = ctx.createRadialGradient(-r * 0.2, r * 0.1, r * 0.03, 0, r * 0.25, r * 0.9);
          dg.addColorStop(0,   '#fde68a');
          dg.addColorStop(0.4, '#b45309');
          dg.addColorStop(0.8, '#78350f');
          dg.addColorStop(1,   '#3a1500');
          ctx.fillStyle = dg;
          ctx.beginPath();
          ctx.moveTo(0, -r * 1.2);
          ctx.bezierCurveTo( r * 0.9, -r * 0.1,  r, r * 0.7,  0, r);
          ctx.bezierCurveTo(-r, r * 0.7, -r * 0.9, -r * 0.1, 0, -r * 1.2);
          ctx.closePath();
          ctx.fill();
          ctx.shadowBlur = 0;
          ctx.strokeStyle = '#92400e';
          ctx.lineWidth = 3;
          ctx.stroke();
          // Skull emoji centred in drop body
          ctx.font = `${r * 0.95}px serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('☠️', 0, r * 0.2);
          // Shine
          ctx.fillStyle = 'rgba(255,255,255,0.18)';
          ctx.beginPath();
          ctx.ellipse(-r * 0.25, -r * 0.1, r * 0.13, r * 0.28, -0.3, 0, Math.PI * 2);
          ctx.fill();

        } else if (item.type === ITEM_TYPES.ROCK) {
          ctx.translate(item.x, item.y);
          ctx.shadowColor = 'rgba(0,0,0,0.55)';
          ctx.shadowBlur = 8;
          ctx.shadowOffsetY = 4;
          ctx.font = `${item.size * 1.35}px serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('🪨', 0, 0);

        } else if (item.type === ITEM_TYPES.BALL) {
          ctx.translate(item.x, item.y);
          ctx.rotate((f * 3) * Math.PI / 180);
          ctx.shadowColor = 'rgba(0,0,0,0.4)';
          ctx.shadowBlur = 7;
          ctx.shadowOffsetY = 4;
          ctx.font = `${item.size * 1.35}px serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('⚽', 0, 0);

        } else if (item.type === ITEM_TYPES.CAT) {
          ctx.translate(item.x, item.y);
          const catB = Math.abs(Math.sin(f * 0.11 + item.id)) * 4;
          ctx.translate(0, -catB);
          ctx.shadowColor = 'rgba(0,0,0,0.4)';
          ctx.shadowBlur = 7;
          ctx.shadowOffsetY = 4;
          ctx.font = `${item.size * 1.35}px serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('🐱', 0, 0);

        } else if (item.type === ITEM_TYPES.POWERUP) {
          ctx.translate(item.x, item.y);
          const POWER_UP_EMOJIS = {
            slow_time: '🐢', attract: '🧲', blaster: '💥',
            cat_toy: '🪀', fast_time: '⚡', downpour: '🌊',
          };
          const pulse = 0.72 + Math.sin(f * 0.13) * 0.28;
          const spin  = (f * 0.028) % (Math.PI * 2);
          const R = item.size * 1.05;

          // ── Outer soft aura ──
          const auraGrad = ctx.createRadialGradient(0, 0, R * 0.3, 0, 0, R * 1.7);
          auraGrad.addColorStop(0,   `rgba(255,230,80,${0.32 * pulse})`);
          auraGrad.addColorStop(0.5, `rgba(255,180,20,${0.18 * pulse})`);
          auraGrad.addColorStop(1,   'rgba(255,140,0,0)');
          ctx.fillStyle = auraGrad;
          ctx.beginPath();
          ctx.arc(0, 0, R * 1.7, 0, Math.PI * 2);
          ctx.fill();

          // ── Spinning dashed ring ──
          ctx.save();
          ctx.rotate(spin);
          ctx.shadowColor = '#ffe55a';
          ctx.shadowBlur = 14 * pulse;
          ctx.strokeStyle = `rgba(255,230,60,${0.85 * pulse})`;
          ctx.lineWidth = 2.2;
          ctx.setLineDash([6, 5]);
          ctx.beginPath();
          ctx.arc(0, 0, R * 1.18, 0, Math.PI * 2);
          ctx.stroke();
          ctx.setLineDash([]);
          ctx.restore();

          // ── Counter-spinning inner ring ──
          ctx.save();
          ctx.rotate(-spin * 1.6);
          ctx.strokeStyle = `rgba(255,255,255,${0.55 * pulse})`;
          ctx.lineWidth = 1.5;
          ctx.setLineDash([3, 7]);
          ctx.beginPath();
          ctx.arc(0, 0, R * 0.92, 0, Math.PI * 2);
          ctx.stroke();
          ctx.setLineDash([]);
          ctx.restore();

          // ── Glassy orb body ──
          const orbGrad = ctx.createRadialGradient(-R * 0.25, -R * 0.3, R * 0.06, 0, 0, R * 0.82);
          orbGrad.addColorStop(0,   'rgba(255,255,255,0.72)');
          orbGrad.addColorStop(0.25,'rgba(255,240,140,0.55)');
          orbGrad.addColorStop(0.6, 'rgba(255,190,30,0.38)');
          orbGrad.addColorStop(1,   'rgba(200,100,0,0.22)');
          ctx.shadowColor = '#ffd700';
          ctx.shadowBlur = 22 * pulse;
          ctx.fillStyle = orbGrad;
          ctx.beginPath();
          ctx.arc(0, 0, R * 0.82, 0, Math.PI * 2);
          ctx.fill();
          ctx.shadowBlur = 0;

          // ── Orb border ──
          ctx.strokeStyle = `rgba(255,220,60,${0.9 * pulse})`;
          ctx.lineWidth = 2.5;
          ctx.beginPath();
          ctx.arc(0, 0, R * 0.82, 0, Math.PI * 2);
          ctx.stroke();

          // ── Top-left gloss bubble ──
          const glossGrad = ctx.createRadialGradient(-R * 0.28, -R * 0.32, 0, -R * 0.2, -R * 0.22, R * 0.42);
          glossGrad.addColorStop(0,   'rgba(255,255,255,0.80)');
          glossGrad.addColorStop(0.6, 'rgba(255,255,255,0.18)');
          glossGrad.addColorStop(1,   'rgba(255,255,255,0)');
          ctx.fillStyle = glossGrad;
          ctx.beginPath();
          ctx.ellipse(-R * 0.22, -R * 0.26, R * 0.38, R * 0.28, -0.5, 0, Math.PI * 2);
          ctx.fill();

          // ── Power-up emoji — large & centred ──
          ctx.font = `${R * 1.12}px serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(POWER_UP_EMOJIS[item.powerUpId] || '⭐', 0, R * 0.05);

          // ── Sparkle dots on the rim ──
          for (let sp = 0; sp < 5; sp++) {
            const sa = spin * 2 + (sp / 5) * Math.PI * 2;
            const sx = Math.cos(sa) * R * 1.35;
            const sy = Math.sin(sa) * R * 1.35;
            const sparkA = (0.5 + Math.sin(f * 0.18 + sp) * 0.5) * pulse;
            ctx.fillStyle = `rgba(255,255,200,${sparkA})`;
            ctx.beginPath();
            ctx.arc(sx, sy, 2.2, 0, Math.PI * 2);
            ctx.fill();
          }
        }

        // Downpour dense rain overlay
        if (item.type === ITEM_TYPES.POWERUP && item.powerUpId === 'downpour') {
          ctx.save();
          ctx.translate(item.x, item.y);
          // Draw extra dense rain drops around this power-up drop
          ctx.strokeStyle = 'rgba(160,220,255,0.35)';
          ctx.lineWidth = 2;
          ctx.lineCap = 'round';
          for (let d = 0; d < 8; d++) {
            const angle = (d / 8) * Math.PI * 2;
            const dist = 18 + Math.sin(f * 0.08 + angle) * 4;
            const px = Math.cos(angle) * dist;
            const py = Math.sin(angle) * dist - 8;
            ctx.beginPath();
            ctx.moveTo(px, py);
            ctx.lineTo(px - 2, py + 12);
            ctx.stroke();
          }
          ctx.restore();
        }

        ctx.restore();
      });

      // ── WATER FILL ───────────────────────────────────────────
      const cupY = height - cupHeight - 20;
      const shakeX = _isShaking ? (Math.random() - 0.5) * 12 : 0;
      const cx = _cupX + shakeX;

      const fillRatio = Math.min(1, _fillAmount / _fillGoal);
      const fillHeight = fillRatio * (cupHeight - 8);
      const fillY = cupY + (cupHeight - fillHeight - 4);

      // Water color: pure blue → mid teal → dirty brown
      let wR, wG, wB;
      if (_purity >= 50) {
        const t = (_purity - 50) / 50;
        wR = Math.round(18  + t * 14);
        wG = Math.round(115 + t * 85);
        wB = Math.round(95  + t * 160);
      } else {
        const t = _purity / 50;
        wR = Math.round(115 - t * 97);
        wG = Math.round(65  + t * 50);
        wB = Math.round(18  + t * 77);
      }

      if (fillHeight > 0) {
        ctx.save();
        const innerSlant = 7;
        ctx.beginPath();
        ctx.moveTo(cx + innerSlant + 2, cupY + 2);
        ctx.lineTo(cx + cupWidth - innerSlant - 2, cupY + 2);
        ctx.lineTo(cx + cupWidth + 1, cupY + cupHeight - 2);
        ctx.lineTo(cx + 1, cupY + cupHeight - 2);
        ctx.closePath();
        ctx.clip();

        const waterGrad = ctx.createLinearGradient(cx, fillY, cx, fillY + fillHeight);
        waterGrad.addColorStop(0, `rgba(${wR+30},${wG+30},${wB+30},0.85)`);
        waterGrad.addColorStop(1, `rgba(${Math.max(0,wR-10)},${Math.max(0,wG-20)},${Math.max(0,wB-10)},1)`);
        ctx.fillStyle = waterGrad;
        ctx.fillRect(cx, fillY, cupWidth, fillHeight + 4);

        // Wavy surface
        const waveAmp = 3;
        ctx.fillStyle = `rgba(255,255,255,0.22)`;
        ctx.beginPath();
        ctx.ellipse(cx + cupWidth / 2, fillY + Math.sin(f * 0.12) * waveAmp, (cupWidth - 12) / 2, 5, 0, 0, Math.PI * 2);
        ctx.fill();

        // Bubbles inside water
        if (f % 14 === 0) {
          const bx = cx + 10 + Math.random() * (cupWidth - 20);
          const by = fillY + fillHeight * (0.3 + Math.random() * 0.6);
          ctx.fillStyle = `rgba(255,255,255,0.3)`;
          ctx.beginPath();
          ctx.arc(bx, by, 2.5, 0, Math.PI * 2);
          ctx.fill();
        }

        ctx.restore();
      }

      // ── CARTOON CUP ──────────────────────────────────────────
      const borderCol = _cupSkin.borderColor || '#1e88e5';
      const rimCol    = _cupSkin.rimColor    || '#ffffff';
      const bodyCol   = _cupSkin.bodyColor   || 'rgba(100,190,255,0.22)';
      const glowCol   = _cupSkin.glowColor   || null;
      const accentCol = _cupSkin.accentColor || null;

      ctx.save();

      // Trapezoid cup shape (wider at top, narrower at bottom — classic cup)
      const slant = 6;
      const bRadius = 8; // bottom corner radius
      const cTop = cupY;
      const cBot = cupY + cupHeight;
      const cLeft = cx;
      const cRight = cx + cupWidth;
      const btmL = cLeft + slant;
      const btmR = cRight - slant;

      const cupPath = () => {
        ctx.beginPath();
        // Top left → top right (wide rim)
        ctx.moveTo(cLeft - 4, cTop);
        ctx.lineTo(cRight + 4, cTop);
        // Right side slopes inward to bottom
        ctx.lineTo(btmR + bRadius, cBot - bRadius);
        ctx.quadraticCurveTo(btmR + bRadius, cBot, btmR, cBot);
        // Bottom (narrower)
        ctx.lineTo(btmL, cBot);
        ctx.quadraticCurveTo(btmL - bRadius, cBot, btmL - bRadius, cBot - bRadius);
        ctx.lineTo(cLeft - 4, cTop);
        ctx.closePath();
      };

      // Shadow beneath cup
      ctx.shadowColor = 'rgba(0,0,0,0.35)';
      ctx.shadowBlur = 14;
      ctx.shadowOffsetY = 6;

      // Glow pulse (special skins)
      if (glowCol) {
        ctx.shadowColor = glowCol;
        ctx.shadowBlur = 26 + Math.sin(f * 0.07) * 8;
      }

      // Body fill
      cupPath();
      ctx.fillStyle = bodyCol;
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.shadowOffsetY = 0;

      // Shimmer sweep
      if (accentCol) {
        const shimX = ((f * 1.8) % (cupWidth + 50)) - 25;
        ctx.save();
        cupPath();
        ctx.clip();
        const shimGrad = ctx.createLinearGradient(cx + shimX - 15, 0, cx + shimX + 30, 0);
        shimGrad.addColorStop(0, 'rgba(255,255,255,0)');
        shimGrad.addColorStop(0.5, accentCol);
        shimGrad.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = shimGrad;
        ctx.fillRect(cx - 8, cupY - 2, cupWidth + 16, cupHeight + 4);
        ctx.restore();
      }

      // Left gloss strip
      ctx.save();
      cupPath();
      ctx.clip();
      const glossGrad = ctx.createLinearGradient(cLeft, cTop, cLeft + cupWidth * 0.35, cTop);
      glossGrad.addColorStop(0,   'rgba(255,255,255,0.38)');
      glossGrad.addColorStop(0.5, 'rgba(255,255,255,0.12)');
      glossGrad.addColorStop(1,   'rgba(255,255,255,0)');
      ctx.fillStyle = glossGrad;
      ctx.fillRect(cLeft - 4, cTop, cupWidth * 0.38, cupHeight);
      ctx.restore();

      // Bold cartoon outline
      if (glowCol) { ctx.shadowColor = glowCol; ctx.shadowBlur = 12; }
      cupPath();
      ctx.strokeStyle = borderCol;
      ctx.lineWidth = 5;
      ctx.lineJoin = 'round';
      ctx.stroke();
      ctx.shadowBlur = 0;

      // Extra thick rim bar at top
      ctx.beginPath();
      ctx.moveTo(cLeft - 6, cTop + 1);
      ctx.lineTo(cRight + 6, cTop + 1);
      ctx.strokeStyle = rimCol;
      ctx.lineWidth = 9;
      ctx.lineCap = 'round';
      ctx.stroke();
      // Rim inner shadow
      ctx.beginPath();
      ctx.moveTo(cLeft - 4, cTop + 6);
      ctx.lineTo(cRight + 4, cTop + 6);
      ctx.strokeStyle = 'rgba(0,0,0,0.12)';
      ctx.lineWidth = 3;
      ctx.stroke();

      // Horizontal stripe decoration
      const stripeY = cTop + cupHeight * 0.42;
      const stripeColor = accentCol || (borderCol + 'aa');
      ctx.save();
      cupPath();
      ctx.clip();
      ctx.fillStyle = typeof stripeColor === 'string' && stripeColor.length <= 9
        ? stripeColor + '55'
        : 'rgba(255,255,255,0.12)';
      ctx.fillRect(cLeft - 6, stripeY, cupWidth + 12, 8);
      ctx.restore();



      ctx.restore();

      // Theme sticker on cup (emoji only, no face)
      const themeEmojis = {
        ocean: '🌊', mint: '🌿', cherry: '🍒', lemon: '🍋', lavender: '💜',
        gold: '🏆', emerald: '💚', amethyst: '🔮', rose_gold: '🌸', copper: '🟤',
        sky: '☁️', midnight: '🌙', forest: '🌲', fire: '🔥', ice: '❄️',
        toxic: '☢️', magma: '🌋', arctic: '🐧', thunder: '⚡', void: '🌑',
        nebula: '🌌', coral: '🪸', obsidian: '🖤', aurora: '🌠', crystal: '💎',
        rainbow: '🌈', solar: '☀️', galaxy: '🪐', platinum: '⚪', pure: '💧',
        classic: '💧',
      };
      const themeEmoji = themeEmojis[_cupSkin.id] || '✨';
      ctx.font = `${20}px serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(themeEmoji, cx + cupWidth * 0.75, cupY + cupHeight * 0.35);

      // ── FLOATING EFFECT TEXT ──────────────────────────────────
      _effects.forEach(effect => {
        ctx.save();
        ctx.font = 'bold 16px Inter, sans-serif';
        ctx.textAlign = 'center';
        if (effect.type === 'clean') {
          ctx.fillStyle = '#34d399';
          ctx.strokeStyle = '#065f46';
        } else if (effect.type === 'dirty') {
          ctx.fillStyle = '#fbbf24';
          ctx.strokeStyle = '#78350f';
        } else {
          ctx.fillStyle = '#f87171';
          ctx.strokeStyle = '#7f1d1d';
        }
        ctx.lineWidth = 3;
        ctx.strokeText(effect.text, effect.x, effect.y);
        ctx.fillText(effect.text, effect.x, effect.y);
        ctx.restore();
      });
    };

    let animId;
    const loop = () => { draw(); animId = requestAnimationFrame(loop); };
    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [width, height]); // Only (re)start loop when canvas dimensions change

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      className="rounded-2xl border-4 border-white/10 shadow-2xl"
      style={{
        touchAction: 'none',
        maxHeight: '60vh',
        cursor: 'grab',
        WebkitUserSelect: 'none',
        WebkitTouchCallout: 'none',
        WebkitTransform: 'translateZ(0)',
      }}
      onTouchMove={onTouchMove}
      onTouchStart={() => { onUserGesture?.(); }}
      onPointerDown={() => { onUserGesture?.(); }}
      onMouseDown={() => { isDraggingRef.current = true; onUserGesture?.(); }}
      onMouseUp={() => { isDraggingRef.current = false; }}
      onMouseLeave={() => { isDraggingRef.current = false; }}
      onMouseMove={(e) => {
        if (!isDraggingRef.current) return;
        const rect = e.currentTarget.getBoundingClientRect();
        const scaleX = width / rect.width;
        const relX = (e.clientX - rect.left) * scaleX;
        onMouseMove?.(relX);
      }}
    />
  );
}