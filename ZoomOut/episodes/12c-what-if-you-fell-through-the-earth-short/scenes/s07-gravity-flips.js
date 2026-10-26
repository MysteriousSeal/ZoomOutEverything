// Beat 6 (12c) — gravity flips. A column of gravity arrows lines the tunnel (left of it, world-anchored; length ∝ distance
// from the centre, as in a uniform planet). Past the centre gravity already points back at the centre, so every
// arrow points to the middle from the first frame; on "flips" they light up one by one (nearest the faller first), never
// rotating, while the camera
// pulls back to the whole planet, so the field reads: everything points to the middle. On "slowing you down" a small
// tag rides beside the faller. The arrows leave as beat 7 starts.
import * as L from '../../../../engine/runtime/lib.js';
import { R_EARTH, fallerDepth, BS, PH } from '../camera.js';
import { plate } from './lib-core.js';

const ARROW = [196, 222, 255];
const FLIP = 0.92;               // beat-local: "flips" (phrase 1 starts at 0.15 s; same line as 12b)
const SLOW = PH(6, 1).start - BS[6] + 0.02;   // "and starts slowing you down"
const N = 10;                    // arrows per half (every R/10)

/** Arrow visibility (global): in with beat 6, out early in beat 7. */
function arrowsK(v) {
  const s7 = v.tl.scenes[6].start, s8 = v.tl.scenes[7].start;
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
  beat: 6,
  chapter: { num: '06', title: 'Gravity flips', sub: 'Now it pulls you back' },
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
    const t = v.gt - v.tl.scenes[6].start;
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
        // every arrow points at the centre from the start (upper half down, lower half up); on "flips" the lower half
        // pulses bright in a wave from the faller outward (a highlight only: gravity never rotates)
        const ang = half > 0 ? -Math.PI / 2 : Math.PI / 2;
        let pulse = 0;
        if (half > 0) {
          const order = Math.abs(depth - fd) / (R_EARTH / N);
          const st = FLIP + 0.06 * order;
          pulse = Math.exp(-Math.pow((t - st - 0.25) / 0.3, 2));
        }
        // the arrows nearest the faller are the brightest (where your eye is)
        const near = Math.exp(-Math.abs(depth - fd) / (R_EARTH * 0.45));
        const a = k * (0.62 + 0.38 * near);
        const col = L.mix(ARROW, [255, 255, 255], pulse * 0.6);
        if (pulse > 0.05) L.lightBlob(ctx, cx, y, len * 1.5, [170, 205, 255], 0.35 * pulse * k);
        for (const sx of [-1, 1]) arrow(ctx, cx + sx * gap, y, len * (1 + 0.12 * pulse), ang, L.clamp(spacing * 0.05, 2.2, 3.4), col, Math.min(1, a + 0.3 * pulse * k), under);
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
    // in on "slowing you down", out before the beat ends (no tag lingering into beat 8)
    const d = v.tl.scenes[v.index].end - v.tl.scenes[v.index].start;
    const k = L.enter(t, SLOW, 0.5) * (1 - L.ease.inOutCubic(L.prog(t, d - 0.45, 0.35))) * v.k;
    if (k <= 0) return;
    const fx = v.wx(0), fy = v.wy(fallerDepth(v.gt));
    const x = fx + 40, y = L.clamp(fy, 420, 1000);   // stops riding down before the limb narrows the face
    ctx.save();
    ctx.font = L.font(22, 700, L.FONT.body);
    // plate sized to the text, kept inside the cut face (clear of the limb: right edge well left of it)
    const tw = ctx.measureText('SLOWING DOWN').width + 11 * 3;
    const pw = Math.ceil(40 + tw + 22);
    const cyc = v.wy(R_EARTH), rp = v.ws(R_EARTH);
    const dy = Math.min(rp, Math.abs(y - cyc));
    const xMax = fx + Math.sqrt(Math.max(0, rp * rp - dy * dy)) - 22;   // inner edge of the limb at this height
    const px = Math.min(x - 6, xMax - pw);
    ctx.globalAlpha *= k;
    plate(ctx, px, y - 26, pw, 52, 1, 12, 0.92);
    // a small downward trend glyph
    ctx.fillStyle = L.rgba(v.accent, 1);
    const gx = px + 26, gy = y;
    ctx.beginPath(); ctx.moveTo(gx - 8, gy - 5); ctx.lineTo(gx + 8, gy - 5); ctx.lineTo(gx, gy + 7); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.textBaseline = 'middle';
    L.trackedText(ctx, 'SLOWING DOWN', px + 46 + (1 - L.ease.outCubic(k)) * 10, y + 1, 3);
    ctx.restore();
  },
};
