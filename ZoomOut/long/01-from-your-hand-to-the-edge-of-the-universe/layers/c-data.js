// Builder C — solar-system data: true positions, deterministic point clouds, timing helpers.
// Planet longitudes: heliocentric ecliptic longitude on 15 July 2026 19:30 UTC (JD 2461237.3125), computed from JPL's
// approximate Keplerian elements (Standish, J2000 mean elements + rates, valid 1800–2050) with a full Kepler solve:
//   Mercury 298.79°  Venus 231.13°  Earth(EMB) 292.96°  Mars 44.20°  Jupiter 124.96°  Saturn 8.24°  Uranus 61.77°  Neptune 2.17°
// Earth is pinned to exactly 293° so it sits on the origin (camera.js); everything else uses the computed values.
// Orbits are drawn as circles with the true mean radii (AU).
import * as L from '../../../../engine/runtime/lib.js';
import { AU, LY, SUN, helio, eclDir } from '../camera.js';

export const R_SUN = 6.957e8;
export const R_MOON = 1.7374e6;
export const LIGHT_DAY_AU = 173.1;          // 25.9 billion km
export const HELIOPAUSE_AU = 120;           // upwind (nose)
export const NOSE_LON = 255;                // heliosphere nose ≈ the direction of the interstellar wind (Voyager 1 left near it)

export const PLANETS = [
  { name: 'MERCURY', lon: 298.79, a: 0.387, col: [196, 186, 172], px: 2.4, sub: '0.39 AU' },
  { name: 'VENUS', lon: 231.13, a: 0.723, col: [238, 218, 176], px: 3.4, sub: '0.72 AU' },
  { name: 'EARTH', lon: 293.0, a: 1.0, col: [96, 160, 255], px: 3.6, sub: '1 AU' },
  { name: 'MARS', lon: 44.20, a: 1.524, col: [228, 122, 78], px: 2.9, sub: '1.52 AU' },
  { name: 'JUPITER', lon: 124.96, a: 5.203, col: [226, 196, 156], px: 5.6, sub: '5.2 AU' },
  { name: 'SATURN', lon: 8.24, a: 9.537, col: [228, 208, 152], px: 4.8, sub: '9.5 AU', ring: true },
  { name: 'URANUS', lon: 61.77, a: 19.19, col: [158, 222, 232], px: 4.0, sub: '19.2 AU' },
  { name: 'NEPTUNE', lon: 2.17, a: 30.07, col: [96, 140, 255], px: 4.0, sub: '4.5 BILLION KM · 30 AU' },
];
for (const p of PLANETS) {
  const q = helio(p.lon, p.a * AU);
  p.x = p.name === 'EARTH' ? 0 : q.x;
  p.y = p.name === 'EARTH' ? 0 : q.y;
}
export const planet = (n) => PLANETS.find((p) => p.name === n);

// ------------------------------------------------------------------ Voyager 1's path (ecliptic projection)
// Launch 5 Sep 1977 (Earth at λ 342.6°, 1 AU) → Jupiter flyby Mar 1979 (λ 127.5°, 5.29 AU) → Saturn flyby Nov 1980
// (λ 182.2°, 9.50 AU) → outbound toward λ ≈ 256° (camera.js VOYAGER, 168 AU). Each leg is a conic in polar form.
function polarLeg(l0, r0, l1, r1, n, shape) {
  const out = [];
  for (let i = 0; i <= n; i++) {
    const u = i / n, lon = L.lerp(l0, l1, u);
    out.push([lon, shape(u, lon)]);
  }
  return out;
}
export const VOY_PATH = (() => {
  const pts = [];
  // leg 1: transfer ellipse with perihelion at launch (r = p / (1 + e cos ν)), through Jupiter
  const nu1 = 144.9 * Math.PI / 180, rJ = 5.29;
  const e = (rJ - 1) / (1 - rJ * Math.cos(nu1)), p = 1 + e;
  pts.push(...polarLeg(342.6, 1, 342.6 + 144.9, rJ, 60, (u) => p / (1 + e * Math.cos(u * nu1))));
  // leg 2: Jupiter → Saturn, log-radius eased between the two flybys
  pts.push(...polarLeg(487.5, rJ, 542.2, 9.50, 24, (u) => Math.exp(L.lerp(Math.log(rJ), Math.log(9.5), u))).slice(1));
  // leg 3: hyperbolic escape: λ(r) = λ∞ − Δ·(r_S / r), through Saturn (182.2°) and Voyager (256° at 168 AU)
  const rS = 9.5, d = (256 - 182.2) / (1 - rS / 168), lInf = 182.2 + d;
  for (let i = 1; i <= 90; i++) {
    const r = Math.exp(L.lerp(Math.log(rS), Math.log(168), i / 90));
    pts.push([lInf - d * (rS / r) + 360, r]);
  }
  return pts.map(([lon, r]) => helio(lon, r * AU));
})();

// ------------------------------------------------------------------ deterministic point clouds (offsets from SUN, metres)
// Each cloud: Float64Array [dx, dy, ...] split into alpha buckets for batched fills.
function buckets(n) { return Array.from({ length: n }, () => []); }

/** Main asteroid belt 2.1–3.35 AU with Kirkwood gaps (3:1 2.50, 5:2 2.82, 7:3 2.95, 2:1 3.28 AU) + Jupiter's Trojans. */
export const BELT = (() => {
  const r = L.rng(1401), B = buckets(4);
  const gaps = [[2.502, 0.03], [2.825, 0.026], [2.958, 0.018], [3.279, 0.04]];
  let n = 0;
  while (n < 15000) {
    let a = 2.1 + 1.25 * (0.5 * (r() + r()) * 0.55 + r() * 0.45);
    if (a < 2.1 || a > 3.35) continue;
    let keep = 1;
    for (const [g, w] of gaps) keep *= 1 - 0.985 * Math.exp(-(((a - g) / w) ** 2));
    if (a < 2.2) keep *= (a - 2.1) / 0.1;
    if (a > 3.3) keep *= (3.35 - a) / 0.05;
    if (r() > keep) continue;
    const ecc = 0.006 * (r() + r() - 1), th = r() * Math.PI * 2, rr = a * (1 + ecc) * AU;
    B[Math.min(3, Math.floor(r() * r() * 4))].push(Math.cos(th) * rr, Math.sin(th) * rr);
    n++;
  }
  return B.map((b) => Float64Array.from(b));
})();
export const TROJANS = (() => {
  const r = L.rng(1402), B = buckets(3), J = 124.96;
  for (let i = 0; i < 1100; i++) {
    const lead = i % 2 ? 60 : -60;
    const lon = J + lead + 22 * (r() + r() + r() - 1.5) * 1.1;
    const a = 5.203 * (1 + 0.035 * (r() + r() - 1));
    const d = eclDir(lon);
    B[Math.floor(r() * 3)].push(d.x * a * AU, d.y * a * AU);
  }
  return B.map((b) => Float64Array.from(b));
})();
/** Kuiper belt 30–50 AU: classical belt (42–47), plutinos (39.4, 3:2 with Neptune), and a scattered spread. */
export const KUIPER = (() => {
  const r = L.rng(1501), B = buckets(3);
  for (let i = 0; i < 7000; i++) {
    const u = r();
    let a = u < 0.5 ? 42 + 5 * r() : u < 0.72 ? 39.4 + 0.5 * (r() - 0.5) : 30 + 20 * Math.pow(r(), 0.8);
    a *= 1 + 0.06 * (r() + r() - 1);
    const th = r() * Math.PI * 2;
    B[Math.floor(r() * r() * 3)].push(Math.cos(th) * a * AU, Math.sin(th) * a * AU);
  }
  return B.map((b) => Float64Array.from(b));
})();
/** Oort cloud: a spherical shell (isotropic directions) projected onto the ecliptic; inner edge ~2,000–5,000 AU,
 *  thinning out past ~100,000 AU (~1.6 light-years). */
export const OORT = (() => {
  const r = L.rng(1701), B = buckets(4);
  for (let i = 0; i < 24000; i++) {
    const u = r();
    let R;
    if (u < 0.2) R = 2000 * Math.pow(10, r()) * (1 + 0.6 * r());          // inner (Hills) cloud, 2,000–30,000 AU
    else R = 20000 + 90000 * Math.pow(r(), 0.75);                          // outer cloud to ~110,000 AU
    if (r() < 0.06) R *= 1 + 0.25 * r();                                   // ragged outer edge
    const z = 2 * r() - 1, ph = r() * Math.PI * 2, s = Math.sqrt(1 - z * z) * R * AU;
    B[Math.min(3, Math.floor(Math.pow(r(), 1.6) * 4))].push(Math.cos(ph) * s, Math.sin(ph) * s);
  }
  return B.map((b) => Float64Array.from(b));
})();

// ------------------------------------------------------------------ timing (read from the live timeline)
export const ph = (v, beat, i) => v.tl.lines[beat].phrases[i];
/** Time a word starts within a phrase (estimated by character position). */
export function wordT(v, beat, i, word) {
  const p = ph(v, beat, i), txt = p.text, j = Math.max(0, txt.indexOf(word));
  return p.start + (p.end - p.start) * (j / txt.length);
}
export const sceneStart = (v, b) => v.tl.scenes[b].start;
export const backStart = (v) => v.tl.scenes[35].start;
/** 0→1 from t0 over dur seconds (smooth); always 1 during and after the zoom-back so layers never pop there. */
export function reveal(v, t0, dur = 0.8) {
  if (v.gt >= backStart(v) - 1) return 1;
  return L.smoothstep(L.clamp((v.gt - t0) / dur));
}
/** Visible between tOn and tOff (forward pass only), smooth fades. */
export function win(gt, tOn, tOff, fin = 0.5, fout = 0.5) {
  return L.smoothstep(L.clamp((gt - tOn) / fin)) * (1 - L.smoothstep(L.clamp((gt - tOff) / fout)));
}

/** Voyager's path draw-in progress (0..1). */
export function voyProgress(v) {
  if (v.gt >= backStart(v) - 1) return 1;
  const t0 = ph(v, 16, 0).start + 0.1;
  return L.ease.inOutCubic(L.clamp((v.gt - t0) / 2.5));
}

export { AU, LY, SUN };

// ------------------------------------------------------------------ cue timing (scene cues(d) has no timeline access)
let TLJ = null;
try { TLJ = await (await fetch(new URL('../build/timeline.json', import.meta.url))).json(); } catch (e) { TLJ = null; }
/** Seconds from beat start to a phrase (frac 0..1 through it, or a word in it); `fallback` if the timeline is missing. */
export function cueT(beat, i, at = 0, fallback = 0) {
  if (!TLJ) return fallback;
  const v = { tl: TLJ };
  const t = typeof at === 'string' ? wordT(v, beat, i, at) : L.lerp(ph(v, beat, i).start, ph(v, beat, i).end, at);
  return t - TLJ.scenes[beat].start;
}
