// Preroll (07b) — cold-open hook: "Every atom in your body is almost entirely empty space."
// "EVERY ATOM IN YOU IS / ALMOST ENTIRELY EMPTY SPACE" (matches the voice line).
// The engine replays the stadium-sized atom (episode.json preroll.from ≈ 0.9 s into the electrons beat): the stadium is
// fully built and the electron haze is already glowing in the stands on frame 1. This layer adds the headline, fully on
// screen from frame 1, in the dark band above the stadium (whose roof starts at y ≈ 555), plus slow accent pings on the
// centre spot where the grain-of-sand nucleus sits (the replayed overlays are off: their label would collide).
import * as L from '../../../../engine/runtime/lib.js';
import { frame } from './s09-stadium.js';

const { W, ease, clamp } = L;
const MAXW = 940;   // 70 px side margins
const L1 = 'EVERY ATOM IN YOU IS', L2A = 'ALMOST ENTIRELY ', L2B = 'EMPTY SPACE';

/** centred line at a given size, parts = [[text, colour], ...] */
function line(ctx, parts, y, s) {
  const text = parts.map((p) => p[0]).join('');
  ctx.font = L.font(s, 800, L.FONT.display);
  let x = W / 2 - ctx.measureText(text).width / 2;
  ctx.textAlign = 'left';
  for (const [t, c] of parts) { ctx.fillStyle = c; ctx.fillText(t, x, y); x += ctx.measureText(t).width; }
}

export default {
  cues(d) {
    return [
      { t: 0.0, name: 'riser', gain: 0.3, pitch: 0.9 },
      { t: 0.3, name: 'ping', gain: 0.22, pitch: 1.5 },
      { t: 2.0, name: 'bloom', gain: 0.25, pitch: 1.0 },
      { t: d - 0.15, name: 'whoosh', gain: 0.35, pitch: 1.2 },
    ];
  },
  drawOverlay(ctx, v) {
    if (v.k <= 0) return;
    ctx.save();
    ctx.globalAlpha = v.k;
    // the nucleus: a bright point on the centre spot with slow expanding pings (real time, repeating every 1.6 s)
    const F = frame(v);
    ctx.save();
    for (let i = 0; i < 2; i++) {
      const q = (((v.t + 0.9 + i * 0.8) % 1.6) + 1.6) % 1.6 / 1.6;
      ctx.strokeStyle = L.rgba(v.accent, 0.75 * (1 - q));
      ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.arc(F.cx, F.cy, Math.max(0, 10 + ease.outCubic(q) * 70), 0, Math.PI * 2); ctx.stroke();
    }
    const g = ctx.createRadialGradient(F.cx, F.cy, 0, F.cx, F.cy, 22);
    g.addColorStop(0, 'rgba(255,240,200,0.95)');
    g.addColorStop(0.35, 'rgba(255,220,160,0.45)');
    g.addColorStop(1, 'rgba(255,220,160,0)');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(F.cx, F.cy, 22, 0, Math.PI * 2); ctx.fill();
    // small tag under the centre circle (inside the pitch)
    ctx.font = L.font(24, 700, L.FONT.body);
    ctx.fillStyle = 'rgba(236,240,244,0.92)';
    ctx.shadowColor = 'rgba(0,0,0,0.8)';
    ctx.shadowBlur = 10;
    ctx.textBaseline = 'alphabetic';
    L.trackedText(ctx, 'NUCLEUS', F.cx, F.cy + 92, 4, 'center');
    ctx.restore();
    // headline in the dark band above the stadium (the HUD is off during the preroll); one shared fitted size
    ctx.textBaseline = 'alphabetic';
    ctx.shadowColor = 'rgba(0,0,0,0.7)';
    ctx.shadowBlur = 18;
    const s = Math.min(L.fitSize(ctx, L1, MAXW, 112, 800, L.FONT.display, 40),
      L.fitSize(ctx, L2A + L2B, MAXW, 112, 800, L.FONT.display, 40));
    const y2 = 470, y1 = y2 - Math.round(s * 1.1);   // second baseline sits just above the stadium roof (≈ y 540)
    line(ctx, [[L1, 'rgb(236,240,244)']], y1, s);
    line(ctx, [[L2A, 'rgb(236,240,244)'], [L2B, L.rgba(v.accent)]], y2, s);
    ctx.restore();
  },
};
