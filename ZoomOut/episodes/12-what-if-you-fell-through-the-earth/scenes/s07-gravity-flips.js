// Beat 7 — gravity flips. A column of gravity arrows lines the tunnel (left of it, world-anchored; length ∝ distance
// from the centre, as in a uniform planet). Past the centre they first point onward, the way you've been falling;
// on "flips" they swing round one by one (nearest the faller first) to point back at the centre, while the camera
// pulls back to the whole planet, so the field reads: everything points to the middle. On "slowing you down" a small
// tag rides beside the faller. The arrows leave as beat 8 starts.
import * as L from '../../../../engine/runtime/lib.js';
import { R_EARTH, fallerDepth } from '../camera.js';
import { plate } from './s04-inner-core.js';

const ARROW = [196, 222, 255];
const FLIP = 0.92;               // beat-local: "flips" (31.49 + ~0.85)
const SLOW = 1.95;               // "and starts slowing you down"
const N = 10;                    // arrows per half (every R/10)

/** Arrow visibility (global): in with beat 7, out early in beat 8. */
function arrowsK(v) {
  const s7 = v.tl.scenes[7].start, s8 = v.tl.scenes[8].start;
  return L.ease.outCubic(L.prog(v.gt, s7 + 0.05, 0.5)) * (1 - L.ease.inCubic(L.prog(v.gt, s8 + 0.25, 0.7)));
}

function arrow(ctx, x, y, len, ang, w, col, a, under = 0) {
  if (a <= 0.01 || len < 3) return;
  const dx = Math.cos(ang), dy = Math.sin(ang);
  const hx = x + dx * len / 2, hy = y + dy * len / 2, tx = x - dx * len / 2, ty = y - dy * len / 2;
  const hs = Math.min(13, Math.max(4, len * 0.32));
  const shape = (c, ww, grow) => {
    ctx.strokeStyle = c; ctx.fillStyle = c;
    ctx.lineWidth = ww;
    ctx.beginPath(); ctx.moveTo(tx, ty); ctx.lineTo(hx - dx * hs * 0.6, hy - dy * hs * 0.6); ctx.stroke();
    const h2 = hs + grow;
    ctx.beginPath();
    ctx.moveTo(hx + dx * grow * 0.6, hy + dy * grow * 0.6);
    ctx.lineTo(hx - dx * h2 - dy * h2 * 0.55, hy - dy * h2 + dx * h2 * 0.55);
    ctx.lineTo(hx - dx * h2 + dy * h2 * 0.55, hy - dy * h2 - dx * h2 * 0.55);
    ctx.closePath(); ctx.fill();
  };
  // dark under-stroke so the pale arrows read over warm rock (fades out at globe scale)
  if (under > 0.01) shape(`rgba(20,10,6,${0.6 * a * under})`, w + 2.5, 1.6);
  shape(L.rgba(col, a), w, 0);
}

export default {
  beat: 7,
  chapter: { num: '07', title: 'Gravity flips', sub: 'Now it pulls you back' },
  captions: true,
  layer: 2,
  cues(d) {
    return [
      { t: 0.15, name: 'blip', gain: 0.2, pitch: 0.9 },
      { t: FLIP - 0.04, name: 'swish', gain: 0.38, pitch: 0.75 },
      { t: FLIP + 0.02, name: 'deep', gain: 0.34, pitch: 1.0 },
      { t: FLIP + 0.3, name: 'tick', gain: 0.18, pitch: 1.3 },
      { t: SLOW, name: 'swell', gain: 0.22, pitch: 0.7 },
    ];
  },

  drawWorld(ctx, v) {
    const k = arrowsK(v);
    if (k <= 0) return;
    const t = v.gt - v.tl.scenes[7].start;
    const mpp = v.cam.mpp;
    const cx = v.wx(0);
    const spacing = R_EARTH / N / mpp;                 // px between arrows
    const gap = L.clamp(spacing * 0.38, 14, 34);       // offset left of the tunnel
    const fd = fallerDepth(v.gt);
    ctx.save();
    ctx.lineCap = 'round';
    ctx.shadowColor = 'rgba(0,0,0,0.65)';
    ctx.shadowBlur = 6;
    const under = L.clamp((spacing - 60) / 120);       // under-stroke only at close range
    for (let half = -1; half <= 1; half += 2) {
      for (let i = 1; i <= N; i++) {
        const r = (i - 0.5) * (R_EARTH / N);
        const depth = R_EARTH + half * r;
        const y = v.wy(depth);
        if (y < -120 || y > L.H + 120) continue;
        // close up, a minimum on-screen length so they read as arrows, not tunnel ticks
        const len = Math.max(48 * L.clamp((spacing - 90) / 160), Math.min(120, spacing * 0.8) * (0.3 + 0.7 * (r / R_EARTH)));
        // upper half: already pointing at the centre (down). Lower half: pointing onward (down) until the flip.
        let ang = Math.PI / 2;
        let pulse = 0;
        if (half > 0) {
          // stagger: nearest to the faller first
          const order = Math.abs(depth - fd) / (R_EARTH / N);
          const st = FLIP + 0.06 * order;
          const f = L.ease.outBack(L.prog(t, st, 0.42), 1.3);
          ang = Math.PI / 2 - Math.PI * f;            // swings round anticlockwise to point up
          pulse = Math.exp(-Math.pow((t - st - 0.25) / 0.25, 2));
        }
        // the arrows nearest the faller are the brightest (where your eye is)
        const near = Math.exp(-Math.abs(depth - fd) / (R_EARTH * 0.45));
        const a = k * (0.62 + 0.38 * near);
        const col = L.mix(ARROW, [255, 255, 255], pulse * 0.6);
        if (pulse > 0.05) L.lightBlob(ctx, cx, y, len * 1.5, [170, 205, 255], 0.35 * pulse * k);
        // the pair flips mirror-wise (left anticlockwise, right clockwise)
        for (const sx of [-1, 1]) arrow(ctx, cx + sx * gap, y, len, half > 0 ? Math.PI / 2 + sx * (ang - Math.PI / 2) : ang, L.clamp(spacing * 0.05, 2.2, 3.4), col, a, under);
      }
    }
    // centre marker at globe scale: where every arrow points
    const ck = k * L.prog(t, FLIP + 0.5, 0.6);
    if (ck > 0) {
      const cy = v.wy(R_EARTH);
      ctx.shadowBlur = 0;
      ctx.strokeStyle = `rgba(220,235,255,${0.7 * ck})`;
      ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(cx, cy, Math.max(0, 7 + 4 * (1 - ck)), 0, Math.PI * 2); ctx.stroke();
    }
    ctx.restore();
  },

  drawOverlay(ctx, v) {
    const t = v.t;
    const k = L.enter(t, SLOW, 0.5) * v.k;
    if (k <= 0) return;
    const fx = v.wx(0), fy = v.wy(fallerDepth(v.gt));
    const x = fx + 62, y = L.clamp(fy, 420, 1180);
    ctx.save();
    ctx.globalAlpha *= k;
    plate(ctx, x - 6, y - 26, 292, 52, 1, 12);
    // a small downward trend glyph
    ctx.fillStyle = L.rgba(v.accent, 0.95);
    const gx = x + 20, gy = y;
    ctx.beginPath(); ctx.moveTo(gx - 8, gy - 5); ctx.lineTo(gx + 8, gy - 5); ctx.lineTo(gx, gy + 7); ctx.closePath(); ctx.fill();
    ctx.font = L.font(22, 700, L.FONT.body);
    ctx.fillStyle = 'rgba(245,240,232,0.96)';
    ctx.textBaseline = 'middle';
    L.trackedText(ctx, 'SLOWING DOWN', x + 40 + (1 - L.ease.outCubic(k)) * 10, y + 1, 3);
    ctx.restore();
  },
};
