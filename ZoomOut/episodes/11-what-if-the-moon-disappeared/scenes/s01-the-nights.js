// Beat 1 — "The first thing you'd notice would be the nights."
// The dark beach is the focal point. The eye adjusts: faint stars come out one by one (each with a tiny flare),
// and the Milky Way fills with fine star dust. On "nights" a single slow meteor draws across the sky.
// The dark-adapted sky (adaptedSky) is drawn every frame from the blink on, scaled by (1 − moonlight) and skyK,
// so it washes out when the Moon returns in beat 2, comes back in beat 3, and fades as the camera leaves the ground.
import * as L from '../../../../engine/runtime/lib.js';
import { moonlight, skyK, terrain, BLINK } from '../env.js';
import { wordTime } from './s00-hook.js';

const { W, H } = L;
const TAU = Math.PI * 2;

// faint field stars + Milky Way dust (screen space; the sky is at infinity)
const STARS = (() => {
  const r = L.rng(1101), out = [];
  for (let i = 0; i < 150; i++) {
    out.push({ x: r() * W, y: 300 + r() * 820, s: 0.5 + r() * 1.1, b: 0.25 + 0.55 * r() ** 2, ph: r() * TAU, at: r() ** 0.8, tint: r() });
  }
  for (let i = 0; i < 420; i++) {
    // dust along the band env's Milky Way follows: (−60, 1050) → (1140, 120)
    const u = r(), off = (r() + r() + r() + r() - 2) * 95;
    const nx = 0.612, ny = 0.79;   // unit normal to the band
    out.push({ x: L.lerp(-60, W + 60, u) + nx * off, y: L.lerp(1050, 120, u) + ny * off, s: 0.4 + r() * 0.8, b: 0.18 + 0.4 * r(), ph: r() * TAU, at: 0.3 + 0.7 * r(), tint: r(), dust: 1 });
  }
  return out;
})();

/** How dark-adapted the eye is (0..1). A little right after the blink, then the real adjustment plays out visibly
 *  over beat 1 (t 0.5-2.5): the Milky Way and the fainter stars fill in. Global time based. */
function adapt(v) {
  const a1 = L.ease.inOutCubic(L.prog(v.gt, v.tl.scenes[0].start + BLINK + 0.4, 1.6));
  const a2 = L.ease.inOutCubic(L.prog(v.gt, v.tl.scenes[1].start + 0.5, 2.0));
  return 0.25 * a1 + 0.75 * a2;
}

/** Screen y of the ground/sea surface under screen x (stars must stay above it). */
function horizonY(v, sx) {
  const wx = v.cam.x + (sx - W / 2) * v.cam.mpp;
  return v.wy(-Math.max(0, terrain(wx)));
}

export function adaptedSky(c, v) {
  const sk = skyK(v);
  const k = adapt(v) * (1 - moonlight(v)) * sk;
  if (k <= 0.004) return;
  const a = adapt(v);
  c.save();
  // the band itself gains a soft, uneven glow, with a darker dust lane down its middle
  for (let i = 0; i <= 6; i++) {
    const u = i / 6, x = L.lerp(-60, W + 60, u), y = L.lerp(1050, 120, u);
    L.lightBlob(c, x + 40 * Math.sin(i * 2.3), y, 210, [150, 160, 210], 0.13 * k * (0.6 + 0.4 * Math.sin(i * 1.9) ** 2));
  }
  starlitShore(c, v, k);
  swashSweep(c, v, sk * (1 - moonlight(v)));
  for (const st of STARS) {
    const appear = L.ease.outCubic(L.prog(a, st.at * 0.85, 0.15));
    if (appear <= 0) continue;
    const hy = horizonY(v, st.x);
    if (st.y > hy - 6) continue;
    const tw = 0.75 + 0.25 * Math.sin(v.gt * (1.1 + st.tint) + st.ph);
    const al = Math.min(1, 1.45 * k * appear * st.b * tw * L.clamp((hy - 6 - st.y) / 60));
    const col = st.tint < 0.18 ? [255, 222, 190] : st.tint > 0.85 ? [190, 210, 255] : [235, 238, 255];
    c.fillStyle = L.rgba(col, al);
    c.fillRect(st.x - st.s / 2, st.y - st.s / 2, st.s, st.s);
    // the moment a star comes out: a tiny flare
    if (!st.dust && appear < 1) {
      L.lightBlob(c, st.x, st.y, 9, col, 0.55 * k * Math.sin(Math.PI * appear));
    }
  }
  c.restore();
}

/** As the eye adjusts, the shore emerges: a faint starlit rim on the dune and sand, and a few glints on the sea. */
function starlitShore(c, v, k) {
  if (v.cam.mpp > 0.3) return;
  c.save();
  c.globalCompositeOperation = 'lighter';
  // rim along the ground, brightest on the dune crest, fading toward the frame edges
  const rg = c.createLinearGradient(0, 0, W, 0);
  rg.addColorStop(0, `rgba(150,170,215,${0.22 * k})`);
  rg.addColorStop(0.45, `rgba(150,170,215,${0.3 * k})`);
  rg.addColorStop(1, `rgba(150,170,215,${0.12 * k})`);
  c.strokeStyle = rg;
  c.lineWidth = 1.6;
  c.beginPath();
  let pen = false, seaX = W;
  for (let sx = -10; sx <= W + 10; sx += 12) {
    const wx = v.cam.x + (sx - W / 2) * v.cam.mpp;
    if (terrain(wx) < 0) { seaX = sx; break; }
    const y = v.wy(-terrain(wx));
    if (!pen) { c.moveTo(sx, y); pen = true; } else c.lineTo(sx, y);
  }
  c.stroke();
  // starlight glints scattered on the sea (dim, slow twinkle)
  const r = L.rng(1107), sy = v.wy(0);
  for (let i = 0; i < 26; i++) {
    const gx = L.lerp(seaX + 30, W + 20, r()), ph = r() * TAU, sp = 0.8 + r();
    const a = k * 0.5 * Math.max(0, Math.sin(v.gt * sp + ph)) ** 4;
    if (a < 0.01) continue;
    c.fillStyle = `rgba(200,215,255,${a})`;
    c.fillRect(gx - 4, sy - 1 + 3 * Math.sin(gx * 0.05 + v.gt), 8, 1.5);
  }
  c.restore();
}

/** Beat 1: a slow sweep of starlight runs along the sea from the swash line out to the right edge (the eye adjusting). */
function swashSweep(c, v, k) {
  if (v.beat !== 1 || k <= 0 || v.cam.mpp > 0.3) return;
  const p = L.prog(v.t, 0.55, 2.0);
  if (p <= 0 || p >= 1) return;
  const a = k * Math.sin(Math.PI * p) ** 1.2;
  const x0 = v.wx(0) - 30, x = L.lerp(x0, W + 80, L.ease.inOutCubic(p)), y = v.wy(0);
  c.save();
  c.globalCompositeOperation = 'lighter';
  c.translate(x, y);
  c.scale(1, 0.16);
  L.lightBlob(c, 0, 0, 220, [150, 175, 235], 0.32 * a);
  c.restore();
  c.save();
  c.globalCompositeOperation = 'lighter';
  const g = c.createLinearGradient(x - 170, 0, x + 170, 0);
  g.addColorStop(0, 'rgba(200,215,255,0)'); g.addColorStop(0.5, `rgba(215,228,255,${0.7 * a})`); g.addColorStop(1, 'rgba(200,215,255,0)');
  c.fillStyle = g;
  c.fillRect(x - 170, y - 1.5, 340, 2.5);
  c.restore();
}

// ------------------------------------------------------------------ meteor on "nights"
function meteorTime(v) { return wordTime(v.tl, 1, /^nights/i) - v.tl.scenes[1].start - 0.45; }
function drawMeteor(c, v) {
  const m0 = meteorTime(v);
  const p = L.prog(v.t, m0, 0.9);
  if (p <= 0 || p >= 1) return;
  const k = skyK(v) * (1 - moonlight(v));
  if (k <= 0) return;
  const x0 = 210, y0 = 410, x1 = 640, y1 = 650;
  const e = L.ease.outCubic(p);
  const hx = L.lerp(x0, x1, e), hy = L.lerp(y0, y1, e);
  const tail = 190 * Math.sin(Math.PI * Math.min(1, p * 1.4)) + 20;
  const dx = (x1 - x0), dy = (y1 - y0), dl = Math.hypot(dx, dy);
  const tx = hx - (dx / dl) * tail, ty = hy - (dy / dl) * tail;
  const a = k * Math.sin(Math.PI * p) ** 0.7;
  c.save();
  c.globalCompositeOperation = 'lighter';
  const g = c.createLinearGradient(tx, ty, hx, hy);
  g.addColorStop(0, 'rgba(200,215,255,0)');
  g.addColorStop(1, `rgba(235,242,255,${0.85 * a})`);
  c.strokeStyle = g;
  c.lineCap = 'round';
  c.lineWidth = 2;
  c.beginPath(); c.moveTo(tx, ty); c.lineTo(hx, hy); c.stroke();
  c.restore();
  L.lightBlob(c, hx, hy, 16, [220, 230, 255], 0.6 * a);
}

export default {
  beat: 1,
  chapter: { num: '01', title: 'The nights', sub: 'the first thing you would notice' },
  captions: true,
  layer: 1,
  cues(d) {
    const m0 = 1.44;   // ≈ meteorTime at the current timeline ("nights" − 0.45)
    return [
      { t: 0.15, name: 'swell', gain: 0.14, pitch: 0.7 },
      { t: 0.5, name: 'shimmer', gain: 0.14, pitch: 1.25 },
      { t: 1.1, name: 'shimmer', gain: 0.1, pitch: 1.5 },
      { t: m0, name: 'swish', gain: 0.12, pitch: 1.7 },
      { t: d - 0.3, name: 'tick', gain: 0.1, pitch: 0.9 },
    ];
  },
  drawWorld(ctx, v) {
    adaptedSky(ctx, v);
    if (v.active) drawMeteor(ctx, v);
  },
};
