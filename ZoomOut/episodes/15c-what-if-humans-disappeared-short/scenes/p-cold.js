// Preroll (15b) — cold-open hook: "Our longest-lasting trace has already left Earth."
// The engine replays the film's payoff (episode.json preroll.from: beat 12, the 100-light-year radio bubble among the
// nearby stars, centred on the pale dot that is Earth) in slow motion, with scene overlays off (preroll.overlays =
// false). This layer adds:
//  - the two-line headline, fully on screen from frame 1 (no fade-in), in the clear band of space ABOVE the bubble
//    (bubble ≈ y 560-1250 at screen centre 902; the HUD is off during the preroll), with a soft dark backing;
//  - the signal itself in motion from frame 1: thin wavefronts leave the dot and run out to the rim, one every ~0.9 s,
//    so the bubble visibly keeps growing (the film's own shells are fixed at their true radii, the slow growth would
//    read as a still frame at this rate). Stylised (true radio waves are invisible), drawn faint and inside the rim.
// The headline holds to the cut (engine: v.k drops only in the last 0.12 s).
import * as L from '../../../../engine/runtime/lib.js';
import { leadR } from './s10-last-trace.js';
import { lview } from '../legacy.js';

const { W } = L;
const MAXW = 940;   // 70 px side margins
const Y1 = 372;     // first baseline: the block spans y ≈ 290-470, above the bubble's rim (≈ 560)

const L1 = 'OUR LONGEST-LASTING TRACE', L2A = 'HAS ALREADY ', L2B = 'LEFT EARTH';

/** centred line at size `s`, parts = [[text, colour], ...] */
function line(ctx, parts, y, s) {
  const text = parts.map((p) => p[0]).join('');
  ctx.font = L.font(s, 800, L.FONT.display);
  let x = W / 2 - ctx.measureText(text).width / 2;
  ctx.textAlign = 'left';
  for (const [t, c] of parts) { ctx.fillStyle = c; ctx.fillText(t, x, y); x += ctx.measureText(t).width; }
}

const PERIOD = 0.9, LIFE = 3.2;   // real seconds between wavefronts, and how long one takes from the dot to the rim

const SCENE = {
  cues(d) {
    return [
      { t: 0.0, name: 'swell', gain: 0.3, pitch: 0.8 },
      { t: 0.05, name: 'shimmer', gain: 0.22, pitch: 0.9 },
      { t: 1.6, name: 'ping', gain: 0.22, pitch: 0.85 },
      { t: d - 0.15, name: 'whoosh', gain: 0.35, pitch: 1.2 },
    ];
  },
  drawWorld(ctx, v) {
    // wavefronts leaving the dot, already under way on frame 1 (phase offset: some are mid-flight at t = 0)
    const R = leadR(v, v.filmGt) / v.cam.mpp;
    if (R < 40) return;
    const cx = v.wx(0), cy = v.wy(0);
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (let n = Math.floor((v.t - LIFE) / PERIOD); n <= Math.floor(v.t / PERIOD); n++) {
      const u = (v.t - n * PERIOD) / LIFE;
      if (u <= 0 || u >= 1) continue;
      const r = 10 + (R - 10) * u;
      const a = L.clamp(u / 0.1) * (1 - u) ** 1.3;
      ctx.strokeStyle = L.rgba(v.accent, 0.16 * a); ctx.lineWidth = 16;
      ctx.beginPath(); ctx.arc(cx, cy, Math.max(0, r), 0, Math.PI * 2); ctx.stroke();
      ctx.strokeStyle = L.rgba(L.mix(v.accent, [255, 244, 220], 0.5), 0.9 * a); ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(cx, cy, Math.max(0, r), 0, Math.PI * 2); ctx.stroke();
    }
    ctx.restore();
    // "100 LY" on the radius rule from frame 1: the film's own tag (s12) fades in ~1 s into the replay, so this layer
    // draws the identical tag, fully opaque, until s12's has fully landed (same geometry: no visible hand-over)
    {
      const t12 = v.filmGt - v.tl.scenes[12].start;
      const tk12 = L.ease.outCubic(L.prog(t12, 1.95 + 0.75, 0.5));
      if (tk12 < 1) {
        const DIR = 0.36, ux = Math.cos(DIR), uy = Math.sin(DIR);
        const mx = cx + ux * 12 + ux * (R - 12) * 0.5, my = cy + uy * 12 + uy * (R - 12) * 0.5;
        ctx.save();
        ctx.translate(mx, my); ctx.rotate(DIR);
        ctx.font = L.font(26, 700, L.FONT.body);
        ctx.letterSpacing = '3px';
        const tw = ctx.measureText('100 LY').width;
        ctx.letterSpacing = '0px';
        ctx.fillStyle = 'rgba(6,8,14,0.9)';
        L.roundRect(ctx, -tw / 2 - 14, -20, tw + 26, 40, 20); ctx.fill();
        ctx.strokeStyle = L.rgba(v.accent, 0.6); ctx.lineWidth = 1.2; ctx.stroke();
        ctx.fillStyle = 'rgba(240,234,224,0.95)';
        ctx.textBaseline = 'middle';
        L.trackedText(ctx, '100 LY', 0, 1, 3, 'center');
        ctx.restore();
      }
    }
    // Earth: the pale dot the waves leave, marked so "LEFT EARTH" has a subject (tag on an opaque plate, left of the
    // dot: the film's 100 LY rule runs to the lower right)
    ctx.save();
    ctx.strokeStyle = 'rgba(235,230,222,0.7)';
    ctx.lineWidth = 1.8;
    const rr = 15 + 2 * Math.sin(v.t * 2);
    for (let i = 0; i < 4; i++) {
      const a0 = v.t * 0.4 + (i * Math.PI) / 2;
      ctx.beginPath(); ctx.arc(cx, cy, rr, a0, a0 + 0.9); ctx.stroke();
    }
    ctx.font = L.font(26, 700, L.FONT.body);
    ctx.letterSpacing = '2px';
    const tw = ctx.measureText('EARTH').width;
    ctx.letterSpacing = '0px';
    const bx = cx - 34 - tw - 24, by = cy - 62;
    ctx.beginPath(); ctx.moveTo(cx - 13, cy - 13); ctx.lineTo(bx + tw + 24, by + 21); ctx.stroke();
    ctx.fillStyle = 'rgba(6,8,14,0.9)';
    L.roundRect(ctx, bx, by, tw + 24, 42, 8); ctx.fill();
    ctx.strokeStyle = L.rgba(v.accent, 0.6); ctx.lineWidth = 1.2; ctx.stroke();
    ctx.fillStyle = 'rgba(244,238,228,0.97)';
    ctx.textBaseline = 'middle';
    L.trackedText(ctx, 'EARTH', bx + 12, by + 22, 2, 'left');
    ctx.restore();
  },
  drawOverlay(ctx, v) {
    if (v.k <= 0) return;
    ctx.save();
    ctx.globalAlpha = v.k;
    ctx.textBaseline = 'alphabetic';
    const s = Math.min(
      L.fitSize(ctx, L1, MAXW, 84, 800, L.FONT.display, 40),
      L.fitSize(ctx, L2A + L2B, MAXW, 84, 800, L.FONT.display, 40));
    const y2 = Y1 + Math.round(s * 1.18);
    // soft backing so the type never sits on a bright star (no hard band)
    const g = ctx.createLinearGradient(0, Y1 - s * 1.6, 0, y2 + s * 0.9);
    g.addColorStop(0, 'rgba(2,4,10,0)'); g.addColorStop(0.3, 'rgba(2,4,10,0.55)');
    g.addColorStop(0.7, 'rgba(2,4,10,0.55)'); g.addColorStop(1, 'rgba(2,4,10,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, Y1 - s * 1.6, W, y2 - Y1 + s * 2.5);
    ctx.shadowColor = 'rgba(0,0,0,0.85)';
    ctx.shadowBlur = 10;
    ctx.shadowOffsetY = 2;
    line(ctx, [[L1, 'rgb(246,242,236)']], Y1, s);
    line(ctx, [[L2A, 'rgb(246,242,236)'], [L2B, L.rgba(v.accent)]], y2, s);
    ctx.restore();
  },
};
// 15c: the replayed film runs on the legacy (15b-shaped) timeline (legacy.js); t / d / k stay the preroll's own
export default { ...SCENE, drawWorld: (c, v) => SCENE.drawWorld(c, lview(v)), drawOverlay: (c, v) => SCENE.drawOverlay(c, lview(v)) };
