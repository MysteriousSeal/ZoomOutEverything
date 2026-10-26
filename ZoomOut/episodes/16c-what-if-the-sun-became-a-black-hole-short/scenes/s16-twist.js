// Beat 16 — "But here's the twist: | the Sun can never do this."
// The camera flies 1 AU back to the black hole. env re-inflates the star (T.restore → T.restored); this scene makes
// that a MOMENT: the violet horizon brightens and cracks open (fine gold fissures), a shockless bloom, then the light
// floods back out as soft rings and slow rays in world space. Once the Sun is back it is a living star: fine granulation
// and limb darkening. "Never" lands on "never".
// Exports `surface()` (granulated stellar disc) and `drawSunDetail()` for s17 / s18.
import * as L from '../../../../engine/runtime/lib.js';
import { ACCENT, SUN, T, starState } from '../env.js';

const { W, H } = L;
const TAU = Math.PI * 2;
const WARM = [255, 226, 170];
const FISSURES = false;   // 16c (ported from the 16b audit): the fissures summed into crude white spidery tendrils

// ------------------------------------------------------------------ a granulated stellar disc (shared)
// cells on a slowly rotating sphere; bright / dark cells breathe with noise; limb darkening on top.
const CELLS = new Map();
function cellsFor(seed, n) {
  const key = seed * 1000 + n;
  if (CELLS.has(key)) return CELLS.get(key);
  const r = L.rng(seed), out = [];
  for (let i = 0; i < n; i++) {
    out.push({ lat: Math.asin(r() * 2 - 1), lon: r() * TAU, s: 0.6 + r() * 0.8, ph: r() * 50 });
  }
  CELLS.set(key, out);
  return out;
}
/**
 * Draw granulation + limb darkening over a star disc already painted by env (or by the caller).
 * o: {col, dark, gt, seed, n (cells), cell (cell radius / r), mottle (0..1), darkK (dark-cell weight), spin (rad/s),
 *     limb (0..1), alpha}
 */
export function surface(c, cx, cy, r, o) {
  if (r < 10 || (o.alpha ?? 1) <= 0.01) return;
  if (cx + r < 0 || cx - r > W || cy + r < 0 || cy - r > H) return;
  const a = o.alpha ?? 1, gt = o.gt;
  const cells = cellsFor(o.seed ?? 7, o.n ?? 70);
  const dark = o.dark ?? L.mix(o.col, [90, 30, 10], 0.6);
  const bright = L.mix(o.col, [255, 255, 240], 0.6);
  c.save();
  c.beginPath(); c.arc(cx, cy, Math.max(0, r), 0, TAU); c.clip();
  const rot = gt * (o.spin ?? 0.03);
  const cs = (o.cell ?? 0.12) * r, mot = (o.mottle ?? 0.5) * a;
  for (const p of cells) {
    const lon = p.lon + rot;
    const z = Math.cos(p.lat) * Math.cos(lon);
    if (z < 0.05) continue;
    const x = cx + Math.cos(p.lat) * Math.sin(lon) * r, y = cy + Math.sin(p.lat) * r;
    const n = L.noise1(gt * 0.45 + p.ph, (o.seed ?? 7) + 3);
    const rr = cs * p.s * (0.45 + 0.55 * z);
    const col = n > 0 ? bright : dark;
    const al = Math.abs(n) * mot * (0.35 + 0.65 * z) * (n > 0 ? 1 : (o.darkK ?? 1));
    if (al < 0.01) continue;
    const g = c.createRadialGradient(x, y, 0, x, y, rr);
    g.addColorStop(0, L.rgba(col, al));
    g.addColorStop(1, L.rgba(col, 0));
    c.fillStyle = g;
    c.fillRect(x - rr, y - rr, rr * 2, rr * 2);
  }
  // limb darkening
  const lg = c.createRadialGradient(cx, cy, r * 0.55, cx, cy, r);
  lg.addColorStop(0, L.rgba(dark, 0));
  lg.addColorStop(0.75, L.rgba(dark, 0.18 * (o.limb ?? 1) * a));
  lg.addColorStop(1, L.rgba(dark, 0.55 * (o.limb ?? 1) * a));
  c.fillStyle = lg;
  c.fillRect(cx - r, cy - r, 2 * r, 2 * r);
  c.restore();
}

/** The restored Sun's surface detail (beats 16–18 while it is the ordinary Sun). */
export function drawSunDetail(c, v, alpha = 1) {
  const s = starState(v.gt);
  if (!(s.mode === 'sun' || s.mode === 'restore') || v.gt < T.restore) return;
  const cx = v.wx(SUN.x), cy = v.wy(SUN.y), r = v.ws(s.r);
  const live = alpha * (s.mode === 'restore' ? L.clamp(1 - s.bh * 1.2) : 1);
  surface(c, cx, cy, r, { col: [255, 214, 150], dark: [230, 130, 60], gt: v.gt, seed: 16, n: 130, cell: 0.075, mottle: 0.4, darkK: 0.35, spin: 0.02, limb: 0.9, alpha: live });
  // a thin hot rim
  if (r > 12 && live > 0.01) {
    c.save();
    c.globalCompositeOperation = 'lighter';
    c.strokeStyle = L.rgba([255, 236, 200], 0.25 * live);
    c.lineWidth = Math.max(1, r * 0.012);
    c.beginPath(); c.arc(cx, cy, Math.max(0, r), 0, TAU); c.stroke();
    c.restore();
  }
}

// ------------------------------------------------------------------ the re-inflation moment
const CRACKS = (() => {
  const r = L.rng(1616), out = [];
  for (let i = 0; i < 11; i++) {
    const pts = [];
    let a = (i / 11) * TAU + (r() - 0.5) * 0.4, d = 0;
    for (let k = 0; k < 6; k++) { d += 0.18 + r() * 0.12; a += (r() - 0.5) * 0.35; pts.push([a, d]); }
    out.push({ pts, w: 0.6 + r() * 0.8, delay: r() * 0.25 });
  }
  return out;
})();
const RAYS = (() => {
  const r = L.rng(4040), out = [];
  for (let i = 0; i < 28; i++) out.push({ a: (i / 28) * TAU + (r() - 0.5) * 0.15, w: 0.012 + r() * 0.025, len: 0.6 + r() * 0.5, al: 0.4 + r() * 0.6 });
  return out;
})();
const FLOOD_V = 2.2e9;   // m/s: the flood rings' (stylised) speed, ~700 px/s at the arrival framing

function drawMoment(c, v) {
  const gt = v.gt, dur = T.restored - T.restore;
  if (gt < T.restore - 0.6 || gt > T.restored + 2.6) return;
  const cx = v.wx(SUN.x), cy = v.wy(SUN.y);
  if (cx < -1500 || cx > W + 1500 || cy < -1500 || cy > H + 1500) return;
  const s = starState(gt);
  const rpx = Math.max(4, v.ws(s.r));
  const k = (gt - T.restore) / dur;               // <0 before, 0..1 during, >1 after
  c.save();
  c.globalCompositeOperation = 'lighter';
  // 1. the violet horizon charges up just before it opens
  const charge = L.clamp(L.invLerp(-0.5, 0.0, k)) * (1 - L.clamp(L.invLerp(0.15, 0.45, k)));
  if (charge > 0.01) {
    const rr = Math.max(rpx * 1.6, 12);
    L.lightBlob(c, cx, cy, rr * 7, ACCENT, 0.35 * charge);
    c.strokeStyle = L.rgba(L.mix(ACCENT, [255, 255, 255], 0.5), 0.8 * charge);
    c.lineWidth = 2.5;
    c.beginPath(); c.arc(cx, cy, Math.max(0, rr * (1 + 0.15 * Math.sin(gt * 30))), 0, TAU); c.stroke();
  }
  // 2. gold fissures crack outward from the horizon
  const ck = L.clamp(L.invLerp(-0.05, 0.4, k));
  const cf = 1 - L.ease.inCubic(L.clamp(L.invLerp(0.35, 0.75, k)));
  if (FISSURES && ck > 0 && cf > 0.01) {
    const len = Math.max(rpx * 1.6, 70);
    c.lineCap = 'round'; c.lineJoin = 'round';
    for (const cr of CRACKS) {
      const e = L.ease.outCubic(L.clamp((ck - cr.delay) / (1 - cr.delay)));
      if (e <= 0) continue;
      c.beginPath();
      c.moveTo(cx, cy);
      for (const [a, d] of cr.pts) {
        if (d > e * 1.25) break;
        c.lineTo(cx + Math.cos(a) * d * len, cy + Math.sin(a) * d * len);
      }
      for (const [lw, al] of [[7, 0.12], [2.6, 0.45], [1, 0.95]]) {
        c.strokeStyle = L.rgba(L.mix(WARM, [255, 255, 255], 0.4), al * cf);
        c.lineWidth = lw * cr.w;
        c.stroke();
      }
    }
  }
  // 3. the bloom: a soft, shockless swell of light
  const bloom = L.ease.outCubic(L.clamp(L.invLerp(0.2, 0.55, k))) * (1 - L.ease.inOutCubic(L.clamp(L.invLerp(0.6, 1.9, k))));
  if (bloom > 0.01) {
    L.lightBlob(c, cx, cy, Math.max(rpx * 4.5, 380), [255, 236, 200], 0.55 * bloom);
    L.lightBlob(c, cx, cy, Math.max(rpx * 1.6, 140), [255, 250, 235], 0.7 * bloom);
  }
  // 4. the light floods out: three soft rings + slow rays, in world space
  const tf = gt - (T.restore + 0.45 * dur);
  if (tf > 0) {
    for (let i = 0; i < 3; i++) {
      const ti = tf - i * 0.32;
      if (ti <= 0) continue;
      const R = v.ws(s.r + FLOOD_V * ti) + rpx * 0.1;
      const fade = (1 - L.clamp(ti / 2.2)) * (i === 0 ? 1 : 0.55);
      if (fade <= 0.01 || R > 2600) continue;
      const band = L.clamp(R * 0.18, 18, 140);
      const g = c.createRadialGradient(cx, cy, Math.max(0, R - band), cx, cy, R + 4);
      g.addColorStop(0, L.rgba(WARM, 0));
      g.addColorStop(0.85, L.rgba(WARM, 0.22 * fade));
      g.addColorStop(1, L.rgba([255, 245, 225], 0));
      c.fillStyle = g;
      c.beginPath(); c.arc(cx, cy, Math.max(0, R + 4), 0, TAU); c.arc(cx, cy, Math.max(0, R - band), 0, TAU, true); c.fill();
      c.strokeStyle = L.rgba([255, 244, 220], 0.5 * fade);
      c.lineWidth = 1.5;
      c.beginPath(); c.arc(cx, cy, Math.max(0, R), 0, TAU); c.stroke();
    }
    // rays (slowly turning, fading over ~2.4 s)
    const rk = L.ease.outCubic(L.clamp(tf / 0.5)) * (1 - L.ease.inOutCubic(L.clamp((tf - 0.4) / 1.6)));
    if (rk > 0.01) {
      const Rr = v.ws(s.r + FLOOD_V * tf) + rpx;
      for (const ry of RAYS) {
        const a = ry.a + tf * 0.05;
        const r0 = rpx * 1.02, r1 = Math.min(Rr, 2400) * ry.len + rpx;
        if (r1 <= r0) continue;
        const g = c.createLinearGradient(cx + Math.cos(a) * r0, cy + Math.sin(a) * r0, cx + Math.cos(a) * r1, cy + Math.sin(a) * r1);
        g.addColorStop(0, L.rgba(WARM, 0.17 * ry.al * rk));
        g.addColorStop(1, L.rgba(WARM, 0));
        c.fillStyle = g;
        c.beginPath();
        c.moveTo(cx + Math.cos(a - ry.w) * r0, cy + Math.sin(a - ry.w) * r0);
        c.lineTo(cx + Math.cos(a) * r1, cy + Math.sin(a) * r1);
        c.lineTo(cx + Math.cos(a + ry.w) * r0, cy + Math.sin(a + ry.w) * r0);
        c.closePath(); c.fill();
      }
    }
  }
  c.restore();
}

export default {
  beat: 16,
  chapter: { num: '16', title: 'The twist', sub: 'the Sun can never do this' },
  captions: true,
  layer: 2,
  cues() {
    // beat starts 70.62; restore 72.35–73.35 (rel 1.73–2.73), after the flight lands; "never" ≈ rel 2.6
    const r0 = T.restore - 70.62;
    return [
      { t: 0.05, name: 'riser', gain: 0.3, pitch: 0.8 },        // the flight back to the black hole
      { t: r0 - 0.1, name: 'shimmer', gain: 0.2, pitch: 0.7 },  // the horizon charges up
      { t: r0 + 0.45, name: 'bloom', gain: 0.5, pitch: 1.0 },   // the bloom
      { t: r0 + 0.55, name: 'swell', gain: 0.32, pitch: 0.9 },  // light floods out
      { t: 2.75, name: 'impact', gain: 0.3, pitch: 0.9 },        // "Never"
    ];
  },
  drawWorld(c, v) {
    if (v.gt < T.restore - 0.6) return;
    if (v.gt < v.tl.scenes[17].start) drawSunDetail(c, v);   // s17 takes the Sun over from its beat on
    drawMoment(c, v);
  },
  drawOverlay(c, v) {
    const lk = L.enter(v.t, 2.65, 0.5) * v.k;
    L.bigLabel(c, { x: 90, y: 500, big: 'Never', small: "the Sun can't do this", k: lk, accent: v.accent, size: 104 });
  },
};
