// Environment for "How Many Ants Are on Earth?". Owned by the orchestrator — builders: read, don't edit.
//
// One continuous world over ~25 orders of magnitude (5 mm ant → 668 AU line), drawn by LOD bands of the camera's
// metres-per-pixel (mpp):
//   mpp < 3e-3        MACRO: ground level. Soil cross-section with grains (world-space, scale-adaptive), surface grit,
//                     an out-of-focus meadow behind (screen space, slight parallax), floating dust motes in front.
//   3e-3 … ~250       LANDSCAPE → ALTITUDE: soil horizons below, a hazy horizon with low scrub, then the sky darkening
//                     with altitude (as in ep 06), stars above ~40 km.
//   ~250 … ~1e7       PLANET: the real Earth (earth.js) at centre (0, R_EARTH), oriented by globeView(v) (Texas on the
//                     top limb near the ground; upright + slowly spinning during beats 3–7).
//   > ~3e8            SOLAR SYSTEM: the Sun (a glow dot), true-radius orbits, planet markers (sizes NOT to scale).
// The ant line (beats 9–11) is NOT drawn here: env only exports its state (tipAt, lineK); s09/s10/s11 draw it.
//
// HUD: topBar + one persistent readout (top right): "ANTS IN VIEW" in beats 0–2, then "LINE LENGTH" in beats 9–11.
import * as L from '../../../engine/runtime/lib.js';
import { beatCues, stars, topBar } from '../../../engine/runtime/kit.js';
import { drawEarth, warm } from '../../../engine/runtime/earth.js';
warm();   // build earth.js's lazy tables (biomes, city lights, mips) at load, not on the first globe frame
import {
  R_EARTH, AU, ANT_LEN, ANTS, LINE_LEN, COL_TOP, X, EARTH_C, SUN, PLANETS, PLUTO, PLUTO_ORBIT, plutoAt, CROSS,
  TIP_PX, EARTH_SY, SHOTS, at as camAt, shotAt, shotStart,
} from './camera.js';

const { W, H } = L;
export const ACCENT = [235, 170, 70];
export { R_EARTH, AU, ANT_LEN, ANTS, LINE_LEN, COL_TOP, X, EARTH_C, SUN, PLANETS, PLUTO, PLUTO_ORBIT, plutoAt, CROSS, shotAt, shotStart };
const DEG = Math.PI / 180;
const lg = Math.log;
/** 0→1 as mpp goes from a to b (log scale, smoothstep). Use for every LOD crossfade. */
export const band = (mpp, a, b) => L.smoothstep(L.clamp(L.invLerp(lg(a), lg(b), lg(mpp))));

// ------------------------------------------------------------------ story timing helpers
const sc = (v, i) => v.tl.scenes[i];

/** Altitude (m above the ant's spot) of the ant line's tip at film time gt. Pure function of time; monotonic.
 *  Before beat 10: COL_TOP (s09's macro column). Beat 10: TIP_PX.flight px above Earth while the camera pulls out
 *  (passes Neptune ≈ 55.6 s, Pluto ≈ 57.0 s). Beat 11: grows to LINE_LEN (668 AU) as the camera settles. */
export function tipAt(gt, tl) {
  const s10 = tl.scenes[10].start;
  if (gt < s10) return COL_TOP;
  const mpp = camAt(gt, tl).mpp;
  const sh = shotAt(gt, tl);
  let px = TIP_PX.flight;
  if (sh.name === 'full-line') px = L.lerp(TIP_PX.flight, TIP_PX.full, L.ease.inOutCubic(sh.p));
  else if (SHOTS[sh.index].beat > 11) return LINE_LEN;
  return Math.min(LINE_LEN, Math.max(COL_TOP, px * mpp));
}
export const tip = (v) => tipAt(v.gt, v.tl);
/** Visibility of the whole ant line: 1 until beat 12, then it dissolves early in the zoom back down (camera still far out). */
export function lineK(v) {
  const s12 = sc(v, 12).start;
  return 1 - L.ease.inOutCubic(L.prog(v.gt, s12 + 0.15, 0.9));
}

// ------------------------------------------------------------------ globe orientation
const vec = (lat, lon) => [Math.cos(lat * DEG) * Math.cos(lon * DEG), Math.cos(lat * DEG) * Math.sin(lon * DEG), Math.sin(lat * DEG)];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const lin = (a, ka, b, kb) => [a[0] * ka + b[0] * kb, a[1] * ka + b[1] * kb, a[2] * ka + b[2] * kb];
/** The ant's spot: central Texas (Atta texana range). It is the globe's top limb whenever the camera is near the ground. */
export const SPOT = { lat: 30.27, lon: -97.74 };
const LEAN = 23.4;
/** basis {r, u, c} for euler (lat0, lon0, tilt) — same convention as earth.js basis() with rot = 0 */
function basisOf(lat0, lon0, tilt) {
  const l = lon0 * DEG, p = lat0 * DEG, t = tilt * DEG;
  const c = vec(lat0, lon0), r0 = [-Math.sin(l), Math.cos(l), 0], u0 = [-Math.sin(p) * Math.cos(l), -Math.sin(p) * Math.sin(l), Math.cos(p)];
  const ct = Math.cos(t), st = Math.sin(t);
  return { r: lin(r0, ct, u0, st), u: lin(r0, -st, u0, ct), c };
}
function eulerOf(b) {
  const lat0 = Math.asin(L.clamp(b.c[2], -1, 1)) / DEG, lon0 = Math.atan2(b.c[1], b.c[0]) / DEG;
  const l = lon0 * DEG, p = lat0 * DEG;
  const r0 = [-Math.sin(l), Math.cos(l), 0], u0 = [-Math.sin(p) * Math.cos(l), -Math.sin(p) * Math.sin(l), Math.cos(p)];
  return { lat0, lon0, tilt: Math.atan2(dot(b.r, u0), dot(b.r, r0)) / DEG };
}
// SPOT on the top limb; the north pole leans LEAN° right of screen-up (like a classroom globe), as in ep 06
const PTOP = (() => {
  const la = SPOT.lat * DEG, lo = SPOT.lon * DEG;
  const E = [-Math.sin(lo), Math.cos(lo), 0];
  const N = [-Math.sin(la) * Math.cos(lo), -Math.sin(la) * Math.sin(lo), Math.cos(la)];
  const cb = Math.tan(LEAN * DEG) * Math.tan(la), sb = Math.sqrt(1 - cb * cb);
  const c = lin(E, cb, N, -sb);
  const lat0 = Math.asin(c[2]) / DEG, lon0 = Math.atan2(c[1], c[0]) / DEG;
  const b0 = basisOf(lat0, lon0, 0), P = vec(SPOT.lat, SPOT.lon);
  const tilt = Math.atan2(-dot(P, b0.r), dot(P, b0.u)) / DEG;
  return basisOf(lat0, lon0, tilt);
})();
const UPRIGHT = { lat: 14, lon: 12, spin: 2.0 };   // upright face on Africa/Europe, then real spin (centre drifts west, deg/s)
function toQuat({ r, u, c }) {
  const m00 = r[0], m01 = r[1], m02 = r[2], m10 = u[0], m11 = u[1], m12 = u[2], m20 = c[0], m21 = c[1], m22 = c[2];
  const tr = m00 + m11 + m22;
  let w, x, y, z;
  if (tr > 0) { const s = Math.sqrt(tr + 1) * 2; w = s / 4; x = (m21 - m12) / s; y = (m02 - m20) / s; z = (m10 - m01) / s; }
  else if (m00 > m11 && m00 > m22) { const s = Math.sqrt(1 + m00 - m11 - m22) * 2; w = (m21 - m12) / s; x = s / 4; y = (m01 + m10) / s; z = (m02 + m20) / s; }
  else if (m11 > m22) { const s = Math.sqrt(1 + m11 - m00 - m22) * 2; w = (m02 - m20) / s; x = (m01 + m10) / s; y = s / 4; z = (m12 + m21) / s; }
  else { const s = Math.sqrt(1 + m22 - m00 - m11) * 2; w = (m10 - m01) / s; x = (m02 + m20) / s; y = (m12 + m21) / s; z = s / 4; }
  return [w, x, y, z];
}
function fromQuat([w, x, y, z]) {
  return {
    r: [1 - 2 * (y * y + z * z), 2 * (x * y - z * w), 2 * (x * z + y * w)],
    u: [2 * (x * y + z * w), 1 - 2 * (x * x + z * z), 2 * (y * z - x * w)],
    c: [2 * (x * z - y * w), 2 * (y * z + x * w), 1 - 2 * (x * x + y * y)],
  };
}
function slerp(a, b, k) {
  if (k <= 0) return a;
  if (k >= 1) return b;
  const qa = toQuat(a); let qb = toQuat(b);
  let d = qa[0] * qb[0] + qa[1] * qb[1] + qa[2] * qb[2] + qa[3] * qb[3];
  if (d < 0) { qb = qb.map((x) => -x); d = -d; }
  let q;
  if (d > 0.9995) q = qa.map((x, i) => x + (qb[i] - x) * k);
  else { const th = Math.acos(d), s = Math.sin(th); q = qa.map((x, i) => (x * Math.sin((1 - k) * th) + qb[i] * Math.sin(k * th)) / s); }
  const n = Math.hypot(...q);
  return fromQuat(q.map((x) => x / n));
}
/** Globe orientation phases (film seconds): [turn upright from, upright at, turn back from, Texas on top at]. */
export function globeTimes(tl) {
  const g = shotStart('globe', tl), a = shotStart('amber', tl);
  return [g + 0.9, g + 3.1, a - 0.1, a + 1.3];
}
const uprightAt = (gt, t1) => basisOf(UPRIGHT.lat, UPRIGHT.lon - UPRIGHT.spin * Math.max(0, gt - t1), 0);
/** Orientation basis {r, u, c} at film time gt. */
export function globeBasis(gt, tl) {
  const [t0, t1, t2, t3] = globeTimes(tl);
  if (gt <= t0 || gt >= t3) return PTOP;
  if (gt < t1) return slerp(PTOP, uprightAt(gt, t1), L.ease.inOutCubic(L.invLerp(t0, t1, gt)));
  if (gt < t2) return uprightAt(gt, t1);
  return slerp(uprightAt(gt, t1), PTOP, L.ease.inOutCubic(L.invLerp(t2, t3, gt)));
}
/** The earth.js view for camera v: {cx, cy, r, lat0, lon0, tilt, rot: 0}. Pass it to project()/geoPath()/unproject(). */
export function globeView(v) {
  const e = eulerOf(globeBasis(v.gt, v.tl));
  return { cx: v.wx(EARTH_C.x), cy: v.wy(EARTH_C.y), r: v.ws(R_EARTH), lat0: e.lat0, lon0: e.lon0, tilt: e.tilt, rot: 0 };
}
/** Screen-space key light shared by the globe and anything lit by the Sun (x right, y up, z toward the viewer). */
export const SUN_LIGHT = [0.42, 0.62, 0.66];

// ------------------------------------------------------------------ colours
const SKY = [[0, [168, 205, 232]], [2000, [120, 175, 232]], [10000, [60, 110, 200]], [20000, [26, 52, 125]],
  [35000, [10, 18, 55]], [60000, [4, 6, 20]], [100000, [2, 3, 10]]];
export const skyColor = (alt) => L.ramp(SKY, alt);
// soil colour by depth (m): leaf litter / humus → topsoil → subsoil → caliche-clay → limestone bedrock → deep crust
const SOIL = [[0, [74, 52, 34]], [0.015, [58, 40, 27]], [0.12, [66, 46, 31]], [0.5, [98, 72, 48]], [1.6, [118, 90, 62]],
  [4, [132, 108, 80]], [12, [126, 112, 96]], [400, [92, 82, 74]], [30000, [58, 48, 44]], [2e5, [70, 38, 26]]];
export const soilColor = (depth) => L.ramp(SOIL, depth);

// ------------------------------------------------------------------ background
/** screen row → altitude (m) for camera v (flat-ground approximation) */
const altAt = (v, sy) => -(v.cam.y + (sy - H * v.cam.anchor) * v.cam.mpp);

export function drawBackground(c, v) {
  const mpp = v.cam.mpp;
  const kMacro = 1 - band(mpp, 1.5e-3, 6e-3);           // out-of-focus meadow behind the ground line
  const kLand = band(mpp, 1.5e-3, 6e-3) * (1 - band(mpp, 0.5, 4));   // hazy horizon + scrub
  const kSpace = band(mpp, 600, 4000);                  // globe view and beyond: space, not sky
  const kAerial = band(mpp, 0.03, 0.15);                // soil cross-section → the land seen from above (perspective)
  const kPlanet = band(mpp, 60, 300);                   // → the real globe (its foreshortened face under the limb)

  c.fillStyle = '#020309';
  c.fillRect(0, 0, W, H);
  if (kSpace < 1) {
    const g = c.createLinearGradient(0, 0, 0, H);
    for (let i = 0; i <= 12; i++) g.addColorStop(i / 12, L.rgba(skyColor(Math.max(0, altAt(v, (H * i) / 12)))));
    c.save(); c.globalAlpha = 1 - kSpace; c.fillStyle = g; c.fillRect(0, 0, W, H); c.restore();
  }
  // stars: as the sky darkens (altitude), and always in space; parallax with the log of the zoom (as ep 08)
  const starK = Math.max(L.clamp(L.invLerp(35000, 90000, altAt(v, H * 0.3))), kSpace);
  if (starK > 0) {
    const lz = Math.log10(mpp);
    c.save();
    c.translate(0, ((lz * 70) % H + H) % H - H);
    stars(c, v, starK * 0.6, 120, 211);
    c.translate(0, H);
    stars(c, v, starK * 0.6, 120, 211);
    c.restore();
    stars(c, v, starK * 0.4, 80, 47);
  }
  const gy = v.wy(0);                                    // screen row of the ground (flat approximation)
  if (kMacro > 0) drawMeadow(c, v, gy, kMacro);
  if (kLand > 0) drawHorizon(c, v, gy, kLand);
  if (kAerial < 1) drawGround(c, v, 1);
  if (kAerial > 0 && kPlanet < 1) drawAerial(c, v, kAerial);
  if (kPlanet > 0) drawPlanet(c, v, kPlanet);
  if (mpp > 3e7) drawSolarSystem(c, v);
}

// ---- macro: out-of-focus meadow behind the ground line (screen space, slight parallax)
const BOKEH = (() => { const r = L.rng(2101); return Array.from({ length: 34 }, () => [r(), r(), r(), r(), r()]); })();
const STEMS = (() => { const r = L.rng(2102); return Array.from({ length: 22 }, () => [r(), r(), r(), r()]); })();
function drawMeadow(c, v, gy, k) {
  const top = Math.min(gy, H + 40);
  if (top < -40) return;
  c.save();
  c.globalAlpha = k;
  const g = c.createLinearGradient(0, top - 1400, 0, top);
  g.addColorStop(0, 'rgb(176,198,196)');
  g.addColorStop(0.45, 'rgb(150,170,122)');
  g.addColorStop(0.8, 'rgb(112,124,72)');
  g.addColorStop(1, 'rgb(92,96,56)');
  c.fillStyle = g;
  c.fillRect(0, top - 1400, W, 1400);
  c.fillStyle = 'rgb(176,198,196)';
  if (top - 1400 > 0) c.fillRect(0, 0, W, top - 1400);
  const par = (-v.cam.x / v.cam.mpp) * 0.03;              // far background barely moves
  // out-of-focus grass blades: tall, thin, tapering, gently curved (soft horizontal gradient across each blade)
  for (const [a, b, s, tone] of STEMS) {
    const w = 7 + 20 * s, h = 700 + 900 * b;
    const x = ((a * (W + 400) + par * (0.6 + s)) % (W + 400) + W + 400) % (W + 400) - 200;
    const bend = (b - 0.5) * 260 + 20 * Math.sin(v.gt * 0.5 + a * 9);
    const gg = c.createLinearGradient(x - w * 2, 0, x + w * 2, 0);
    const col = L.mix([62, 80, 40], [128, 140, 78], tone);
    gg.addColorStop(0, L.rgba(col, 0)); gg.addColorStop(0.5, L.rgba(col, 0.28)); gg.addColorStop(1, L.rgba(col, 0));
    c.fillStyle = gg;
    c.beginPath();
    c.moveTo(x - w * 2, top);
    c.quadraticCurveTo(x - w + bend * 0.2, top - h * 0.55, x + bend, top - h);
    c.quadraticCurveTo(x + w + bend * 0.2, top - h * 0.55, x + w * 2, top);
    c.closePath(); c.fill();
  }
  // bokeh discs of sunlit leaves
  for (const [a, b, s, tone, ph] of BOKEH) {
    const x = ((a * (W + 300) + par * (0.5 + s)) % (W + 300) + W + 300) % (W + 300) - 150;
    const y = top - 60 - b * 1100;
    const r = 30 + 110 * s;
    const col = L.mix([150, 170, 90], [255, 236, 170], tone);
    const al = 0.07 + 0.08 * (0.5 + 0.5 * Math.sin(v.gt * 0.7 + ph * 6.3));
    const rg = c.createRadialGradient(x, y, 0, x, y, r);
    rg.addColorStop(0, L.rgba(col, al)); rg.addColorStop(0.75, L.rgba(col, al * 0.8)); rg.addColorStop(1, L.rgba(col, 0));
    c.fillStyle = rg;
    c.fillRect(x - r, y - r, 2 * r, 2 * r);
  }
  // warm low sun haze from the upper right
  L.lightBlob(c, W * 0.85, top - 900, 900, [255, 230, 170], 0.18);
  c.restore();
}

// ---- landscape: hazy horizon with low scrub (screen space, flattens as we rise)
const SCRUB = (() => {
  const r = L.rng(2103), out = [];
  for (let x = -80; x < W + 200;) { const w = L.lerp(30, 120, r()); out.push([x, w, r(), r()]); x += w * L.lerp(0.5, 1.2, r()); }
  return out;
})();
function drawHorizon(c, v, gy, k) {
  if (gy < -60 || gy > H + 200) return;
  const flat = 1 - band(v.cam.mpp, 0.02, 1.5);       // scrub height shrinks as the camera climbs
  c.save();
  c.globalAlpha = k;
  const hz = c.createLinearGradient(0, gy - 260, 0, gy);
  hz.addColorStop(0, 'rgba(220,232,240,0)');
  hz.addColorStop(1, 'rgba(214,224,226,0.55)');
  c.fillStyle = hz;
  c.fillRect(0, gy - 260, W, 260);
  const drift = -v.cam.x / v.cam.mpp * 0.01;
  c.fillStyle = 'rgba(98,112,84,0.75)';
  c.beginPath();
  c.moveTo(-40, gy + 1);
  for (const [x, w, h, s] of SCRUB) {
    const xx = x + drift, hh = (6 + 34 * h) * (0.25 + 0.75 * flat);
    c.lineTo(xx, gy - hh * 0.3);
    c.quadraticCurveTo(xx + w * 0.5, gy - hh * (1.4 + 0.4 * s), xx + w, gy - hh * 0.3);
  }
  c.lineTo(W + 40, gy + 1);
  c.closePath();
  c.fill();
  c.restore();
}

// ---- ground: soil cross-section (world space). Flat for small mpp, the true curve (circle of radius R) above.
const GRAIN_TILE = 7;                                    // tile = 7 grain sizes
function surfaceY(v, sx) {
  const wxv = v.cam.x + (sx - W / 2) * v.cam.mpp;
  if (v.cam.mpp < 1) return v.wy(0);
  const d = Math.abs(wxv) < R_EARTH ? R_EARTH - Math.sqrt(R_EARTH * R_EARTH - wxv * wxv) : R_EARTH;
  return v.wy(d);
}
function drawGround(c, v, k) {
  const mpp = v.cam.mpp;
  const ys = [];
  for (let sx = -40; sx <= W + 40; sx += 40) ys.push([sx, surfaceY(v, sx)]);
  const minY = Math.min(...ys.map((p) => p[1]));
  if (minY > H + 10) return;
  c.save();
  c.globalAlpha = k;
  c.beginPath();
  c.moveTo(-40, H + 40);
  for (const [sx, sy] of ys) c.lineTo(sx, Math.max(-40, sy));
  c.lineTo(W + 40, H + 40);
  c.closePath();
  // horizons: gradient by depth below the (local) surface
  const g0 = Math.max(-40, v.wy(0)), span = Math.max(1, H + 40 - g0);
  const g = c.createLinearGradient(0, g0, 0, H + 40);
  for (let i = 0; i <= 14; i++) {
    const f = i / 14, sy = g0 + span * f * f;
    g.addColorStop(f * f, L.rgba(soilColor(Math.max(0, (sy - v.wy(0)) * mpp))));
  }
  c.fillStyle = g;
  c.fill();
  c.clip();
  if (mpp < 0.05) drawGrains(c, v);
  c.restore();
  if (mpp < 0.05) { c.save(); c.globalAlpha = k; drawGrit(c, v); c.restore(); }
}
// soil grains: world-space tiles at the size levels whose crumbs are ~4–40 px on screen. Opaque, irregular crumbs and
// pebbles (5–7-sided, jittered), plus organic bits (rootlets, dark humus slivers, pale mineral specks). Never translucent.
function grainLevels(mpp) {
  const out = [];
  for (let e = -5; e <= -1; e++) {
    for (const m of [1, 3.2]) {
      const g = m * Math.pow(10, e), px = g / mpp;
      const a = L.smoothstep(L.clamp(L.invLerp(4, 8, px))) * (1 - L.smoothstep(L.clamp(L.invLerp(22, 40, px))));
      if (a > 0.01) out.push([g, a, Math.round(e * 10 + m)]);
    }
  }
  return out;
}
function crumb(c, x, y, r, rot, nv, rnd) {
  c.beginPath();
  for (let k = 0; k < nv; k++) {
    const th = rot + (k / nv) * Math.PI * 2, rr = r * (0.7 + 0.45 * rnd[k]);
    const px = x + Math.cos(th) * rr, py = y + Math.sin(th) * rr * 0.8;
    k ? c.lineTo(px, py) : c.moveTo(px, py);
  }
  c.closePath();
}
function drawGrains(c, v) {
  const mpp = v.cam.mpp;
  const x0 = v.cam.x - (W / 2 + 40) * mpp, x1 = v.cam.x + (W / 2 + 40) * mpp;
  const y0 = Math.max(0, v.cam.y - (H * v.cam.anchor + 40) * mpp), y1 = v.cam.y + (H * (1 - v.cam.anchor) + 40) * mpp;
  if (y1 <= 0) return;
  const rnd = new Array(10);
  for (const [g, a, seed] of grainLevels(mpp)) {
    const T = g * 8;
    const i0 = Math.floor(x0 / T), i1 = Math.floor(x1 / T), j0 = Math.floor(y0 / T), j1 = Math.floor(y1 / T);
    if ((i1 - i0 + 1) * (j1 - j0 + 1) > 3000) continue;
    const gpx = g / mpp;
    for (let j = j0; j <= j1; j++) {
      const depth = (j + 0.5) * T;
      const base = soilColor(depth);
      const organic = L.clamp(1 - depth / 0.3);            // humus-rich topsoil: more roots and dark bits
      for (let i = i0; i <= i1; i++) {
        const r = L.rng((i * 73856093) ^ (j * 19349663) ^ (seed * 83492791));
        const n = 1 + Math.floor(r() * 3);
        for (let q = 0; q < n; q++) {
          const gx = (i + r()) * T, gyw = (j + r()) * T, kind = r();
          const sx = v.wx(gx), sy = v.wy(gyw);
          const pebble = kind < 0.05 && gpx < 14;
          const sz = (pebble ? 1.4 + 0.9 * r() : 0.3 + 0.7 * r()) * g / mpp;
          if (sx < -sz * 3 || sx > W + sz * 3 || sy < -sz * 3 || sy > H + sz * 3) continue;
          const tone = r(), rot = r() * 6.28, nv = (pebble ? 8 : 5) + Math.floor(r() * 3);
          for (let k = 0; k < nv; k++) rnd[k] = r();
          c.globalAlpha = a;
          if (!pebble && kind > 0.86 && organic > 0.05) {
            // rootlet / humus sliver: a short curved stroke
            c.strokeStyle = tone < 0.6 ? 'rgb(34,23,15)' : 'rgb(146,116,78)';
            c.lineWidth = Math.max(1, sz * 0.35);
            c.lineCap = 'round';
            const L2 = sz * (2 + 3 * rnd[0]), th = rot;
            c.beginPath();
            c.moveTo(sx, sy);
            c.quadraticCurveTo(sx + Math.cos(th) * L2 * 0.5 + rnd[1] * sz, sy + Math.sin(th) * L2 * 0.5 - rnd[2] * sz, sx + Math.cos(th) * L2, sy + Math.sin(th) * L2);
            c.stroke();
            continue;
          }
          let col;
          if (pebble) col = L.mix([150, 136, 116], [104, 92, 80], tone);              // limestone / chert pebble
          else if (tone < 0.12) col = L.mix(base, [214, 200, 172], 0.55);             // pale mineral speck
          else if (tone < 0.55) col = L.mix(base, [28, 19, 12], 0.32 + 0.2 * organic); // dark crumb / humus
          else col = L.mix(base, [148, 118, 84], 0.3);                                // ped of subsoil
          c.fillStyle = L.rgba(col);
          crumb(c, sx, sy, Math.max(0.6, sz), rot, nv, rnd);
          c.fill();
          if (sz > 5) {   // opaque shading: lit upper rim, shadowed lower edge
            c.fillStyle = L.rgba(L.mix(col, [255, 238, 205], 0.28));
            crumb(c, sx - sz * 0.12, sy - sz * 0.16, sz * 0.62, rot, nv, rnd);
            c.fill();
            c.strokeStyle = L.rgba(L.mix(col, [10, 6, 4], 0.5), 0.8);
            c.lineWidth = Math.max(1, sz * 0.08);
            crumb(c, sx, sy, sz, rot, nv, rnd);
            c.stroke();
          }
        }
      }
    }
  }
  c.globalAlpha = 1;
}
// surface grit: grains sitting ON the ground line (half above it), so the walking surface has a crisp, real edge
function drawGrit(c, v) {
  const mpp = v.cam.mpp, gy = v.wy(0);
  // grit stays small: grains over ~45 px would read as mounds under the hero ant
  if (gy < -50 || gy > H + 50) return;
  const x0 = v.cam.x - (W / 2 + 40) * mpp, x1 = v.cam.x + (W / 2 + 40) * mpp;
  for (const [g, a0, seed] of grainLevels(mpp)) {
    const a = a0 * (1 - L.smoothstep(L.clamp(L.invLerp(25, 45, g / mpp))));
    if (a <= 0.01) continue;
    const T = g * 2.2;
    const i0 = Math.floor(x0 / T), i1 = Math.floor(x1 / T);
    if (i1 - i0 > 1400) continue;
    for (let i = i0; i <= i1; i++) {
      const r = L.rng((i * 2654435761) ^ (seed * 97531));
      const sz = g * (0.3 + 0.8 * r()), gx = (i + r()) * T, tone = r();
      const rx = sz / mpp, ry = rx * (0.45 + 0.35 * r()), sx = v.wx(gx), sy = gy + ry * (0.1 + 0.5 * r());
      if (sx < -rx || sx > W + rx) continue;
      const col = tone < 0.2 ? [176, 156, 124] : tone < 0.7 ? [92, 68, 46] : [128, 100, 70];
      c.globalAlpha = a * 0.9;
      c.fillStyle = L.rgba(col);
      c.beginPath(); c.ellipse(sx, sy, Math.max(0, rx), Math.max(0, ry), (r() - 0.5) * 0.6, Math.PI, Math.PI * 2); c.fill();
    }
  }
  c.globalAlpha = 1;
}

// ---- aerial land (0.03 < mpp < ~300): no more cut-away. The ground is seen from a virtual camera whose height scales
// with the zoom (hc = 900·mpp), in perspective: a row d px under the horizon is ground D = hc·F/d away. Scrub clumps,
// dry-grass and bare-soil patches at LOD sizes, fading into atmospheric haze toward the horizon (scale height ~40 km),
// so climbing reads as the land falling away; the real globe then takes over (kPlanet).
const AF = 900;
const AERIAL_COLS = [[64, 80, 44], [86, 98, 56], [148, 138, 92], [128, 106, 74], [104, 112, 66]];
function drawAerial(c, v, k) {
  const mpp = v.cam.mpp, hc = 900 * mpp;
  const ys = [];
  for (let sx = -40; sx <= W + 40; sx += 40) ys.push([sx, surfaceY(v, sx)]);
  const hy = surfaceY(v, W / 2);
  if (Math.min(...ys.map((p) => p[1])) > H + 10) return;
  const sag = (sx) => surfaceY(v, sx) - hy;
  const haze = [192, 204, 212];
  c.save();
  c.globalAlpha = k;
  c.beginPath();
  c.moveTo(-40, H + 40);
  for (const [sx, sy] of ys) c.lineTo(sx, Math.max(-40, sy));
  c.lineTo(W + 40, H + 40);
  c.closePath();
  const span = Math.max(1, H + 40 - Math.max(-40, hy));
  const g = c.createLinearGradient(0, Math.max(-40, hy), 0, H + 40);
  // air path to a ground point D away seen from height hc: horizontal for a low camera, but only ~8 km of air (one
  // scale height) per unit of slant once the camera is high — looking down from 40 km the ground is clear, the
  // horizon is not
  const hzK = (D) => 1 - Math.exp(-Math.min(D, 8000 * D / Math.max(1, hc)) / 25000);
  for (let i = 0; i <= 10; i++) {
    const f = i / 10, d = Math.max(0.5, f * f * span + (Math.max(-40, hy) - hy));
    const D = hc * AF / d;
    g.addColorStop(f * f, L.rgba(L.mix([96, 104, 64], haze, hzK(D) * 0.88)));
  }
  c.fillStyle = g;
  c.fill();
  c.clip();
  // land patches: (X across, D away), levels S whose on-screen width S·F/D is 8–120 px
  const dMax = Math.max(1, H + 40 - hy);
  const Dnear = hc * AF / dMax;
  for (let e = 0; e <= 5; e++) {
    for (const m of [3, 10]) {
      const S = m * Math.pow(10, e);
      const Da = Math.max(Dnear, S * AF / 120), Db = S * AF / 8;
      if (Db <= Da) continue;
      const T = 3 * S;
      for (let j = Math.floor(Da / T); j <= Math.floor(Db / T); j++) {
        const Dc = (j + 0.5) * T;
        const half = (W / 2 + 80) * Dc / AF;
        const i0 = Math.floor((v.cam.x - half) / T), i1 = Math.floor((v.cam.x + half) / T);
        for (let i = i0; i <= i1; i++) {
          const r = L.rng((i * 2246822519) ^ (j * 3266489917) ^ (S * 668265263));
          const n = 1 + Math.floor(r() * 2);
          for (let q = 0; q < n; q++) {
            const X = (i + r()) * T, D = (j + r()) * T;
            const w = S * (0.5 + r()) * AF / D;
            const fade = L.smoothstep(L.clamp(L.invLerp(8, 16, w))) * (1 - L.smoothstep(L.clamp(L.invLerp(90, 140, w))));
            if (fade <= 0.01 || D < Dnear) continue;
            const sx = W / 2 + (X - v.cam.x) * AF / D;
            if (sx < -w || sx > W + w) continue;
            const sy = hy + hc * AF / D + sag(sx);
            const hgt = Math.max(0.7, w * 0.5 * Math.min(1, hc / D) * (0.5 + r()));
            const col = L.mix(AERIAL_COLS[Math.floor(r() * AERIAL_COLS.length)], haze, hzK(D) * 0.88);
            c.globalAlpha = k * fade * (0.55 + 0.35 * r());
            c.fillStyle = L.rgba(col);
            c.beginPath(); c.ellipse(sx, sy, Math.max(0, w * 0.5), hgt, (r() - 0.5) * 0.2, 0, Math.PI * 2); c.fill();
          }
        }
      }
    }
  }
  c.globalAlpha = k;
  // haze band hugging the horizon + a crisp bright horizon line
  const hb = c.createLinearGradient(0, hy - 2, 0, hy + 90);
  hb.addColorStop(0, L.rgba(haze, 0.85)); hb.addColorStop(1, L.rgba(haze, 0));
  c.fillStyle = hb;
  c.fillRect(-40, hy - 30, W + 80, 140);
  c.restore();
  c.save();
  c.globalAlpha = k * 0.6;
  c.strokeStyle = 'rgba(235,242,248,0.8)';
  c.lineWidth = 1.5;
  c.beginPath();
  ys.forEach(([sx, sy], i) => (i ? c.lineTo(sx, sy) : c.moveTo(sx, sy)));
  c.stroke();
  c.restore();
}

// ---- the real Earth
function drawPlanet(c, v, k) {
  const view = globeView(v);
  if (view.r < 0.5) return;
  if (view.r < 4) {   // a pale blue dot (the Solar System shots)
    L.lightBlob(c, view.cx, view.cy, 14, [120, 180, 255], 0.55 * k);
    c.fillStyle = L.rgba([170, 210, 255], k);
    c.beginPath(); c.arc(view.cx, view.cy, Math.max(1.6, view.r), 0, Math.PI * 2); c.fill();
    return;
  }
  // cull: disc entirely off screen
  if (view.cx + view.r < -50 || view.cx - view.r > W + 50 || view.cy + view.r < -50 || view.cy - view.r > H + 50) return;
  drawEarth(c, { ...view, style: 'day', sun: SUN_LIGHT, lights: 0.7, atmosphere: true, alpha: k });
}

// ---- the Solar System map: Sun, true-radius orbits, planet markers (marker sizes are NOT to scale)
function orbitAlpha(rpx) { return L.clamp(L.invLerp(4, 14, rpx)) * (1 - L.clamp(L.invLerp(1400, 3000, rpx))); }
export function drawSolarSystem(c, v) {
  const mpp = v.cam.mpp;
  const kIn = band(mpp, 3e7, 3e8);
  if (kIn <= 0) return;
  const sx = v.wx(SUN.x), sy = v.wy(SUN.y);
  c.save();
  c.globalAlpha = kIn;
  c.lineWidth = 1.5;
  for (const p of PLANETS) {
    const r = (p.a * AU) / mpp, a = orbitAlpha(r);
    if (a <= 0) continue;
    if (p.name !== 'Earth') {
      c.strokeStyle = L.rgba([200, 210, 230], 0.22 * a);
      c.beginPath(); c.arc(sx, sy, Math.max(0, r), 0, Math.PI * 2); c.stroke();
    } else {
      c.strokeStyle = L.rgba([120, 180, 255], 0.3 * a);
      c.beginPath(); c.arc(sx, sy, Math.max(0, r), 0, Math.PI * 2); c.stroke();
    }
    if (p.name !== 'Earth' && r > 10) {
      const px = v.wx(p.x), py = v.wy(p.y);
      L.lightBlob(c, px, py, p.px * 5, p.col, 0.35 * a);
      c.fillStyle = L.rgba(p.col, a);
      c.beginPath(); c.arc(px, py, Math.max(0, p.px), 0, Math.PI * 2); c.fill();
    }
  }
  // Pluto's eccentric orbit (flat map; inclination ignored)
  const pr = PLUTO_ORBIT.a / mpp, pa = orbitAlpha(pr);
  if (pa > 0) {
    c.strokeStyle = L.rgba([215, 195, 180], 0.22 * pa);
    c.setLineDash([6, 6]);
    c.beginPath();
    c.ellipse(v.wx(PLUTO_ORBIT.cx), v.wy(PLUTO_ORBIT.cy), Math.max(0, pr), Math.max(0, PLUTO_ORBIT.b / mpp), 0, 0, Math.PI * 2);
    c.stroke();
    c.setLineDash([]);
    if (pr > 10) {
      const px = v.wx(PLUTO.x), py = v.wy(PLUTO.y);
      L.lightBlob(c, px, py, PLUTO.px * 5, PLUTO.col, 0.3 * pa);
      c.fillStyle = L.rgba(PLUTO.col, pa);
      c.beginPath(); c.arc(px, py, Math.max(0, PLUTO.px), 0, Math.PI * 2); c.fill();
    }
  }
  // the Sun: a hot dot with a soft glow (never larger than ~10 px here)
  L.lightBlob(c, sx, sy, 60, [255, 210, 140], 0.55);
  L.lightBlob(c, sx, sy, 18, [255, 240, 210], 0.9);
  c.fillStyle = 'rgb(255,250,235)';
  c.beginPath(); c.arc(sx, sy, 3, 0, Math.PI * 2); c.fill();
  c.restore();
}

// ------------------------------------------------------------------ foreground: dust motes at macro scale (depth)
const MOTES = (() => { const r = L.rng(2104); return Array.from({ length: 26 }, () => [r(), r(), r(), r()]); })();
export function drawForeground(c, v) {
  const k = 1 - band(v.cam.mpp, 4e-4, 2e-3);
  if (k <= 0) return;
  c.save();
  for (const [a, b, s, ph] of MOTES) {
    const x = ((a * W + v.gt * (6 + 14 * s) + L.noise1(v.gt * 0.3 + ph * 9, 5) * 30) % W + W) % W;
    const y = ((b * H - v.gt * (4 + 8 * s)) % H + H) % H;
    const r = 1.5 + 4 * s;
    c.fillStyle = `rgba(255,244,220,${k * (0.12 + 0.2 * s) * (0.6 + 0.4 * Math.sin(v.gt * 1.7 + ph * 6.3))})`;
    c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.fill();
  }
  c.restore();
}

// ------------------------------------------------------------------ HUD: top bar + one readout
/** Line length as a short readout string (cm → m → km → million km → AU). */
export function fmtLen(m) {
  if (m < 1) return `${L.fmt(m * 100)} cm`;
  if (m < 1000) return `${L.fmt(m)} m`;
  if (m < 1e9) return `${L.fmt(m / 1000)} km`;
  if (m < 0.2 * AU) return `${L.fmt(m / 1e9)} million km`;
  return `${L.fmt(m / AU, m < 10 * AU ? 1 : 0)} AU`;
}
/** "ants in view" for beats 0–2: 1 → ~3,000 (colony) → ~5,000,000 (leafcutter nest), counted in log space. */
const COUNT = [1, 3000, 5e6];
export function antsInView(v) {
  const sh = shotAt(v.gt, v.tl);
  const b = SHOTS[sh.index].beat;
  if (b <= 0) return 1;
  if (b > 2) return COUNT[2];                    // hold the nest's count while the readout leaves
  const i = b;
  const k = L.ease.inOutCubic(sh.p);
  const n = Math.exp(L.lerp(lg(COUNT[i - 1]), lg(COUNT[i]), k));
  const step = n < 50 ? 1 : n < 5000 ? 10 : n < 50000 ? 100 : n < 1e6 ? 1000 : 10000;
  return Math.round(n / step) * step;
}
function readout(c, big, small, k) {
  if (k <= 0) return;
  c.save();
  c.globalAlpha = k;
  c.shadowColor = 'rgba(4,8,16,0.6)';
  c.shadowBlur = 14;
  c.textAlign = 'right';
  c.textBaseline = 'alphabetic';
  const size = L.fitSize(c, big, 560, 64, 700, L.FONT.din, 36);
  c.font = L.font(size, 700, L.FONT.din);
  c.fillStyle = '#fff';
  c.fillText(big, W - 64, 300);
  c.font = L.font(22, 600, L.FONT.body);
  c.fillStyle = 'rgba(230,226,216,0.88)';
  L.trackedText(c, small, W - 64, 334, 2, 'right');
  c.restore();
}
export function drawHud(c, v) {
  topBar(c, v, ACCENT);
  const s = v.tl.scenes;
  // ANTS IN VIEW: from 1 s into beat 0 until the globe takes over
  const kCount = L.ease.outCubic(L.prog(v.gt, s[0].start + 1.0, 0.6)) * (1 - L.ease.inCubic(L.prog(v.gt, s[3].start + 0.2, 0.5)));
  readout(c, L.fmt(antsInView(v)), 'ANTS IN VIEW (APPROX.)', kCount);
  // LINE LENGTH: once s09's column is complete (≈ 0.8 s into "end to end", ≈ 51.0 s) to the end of beat 11
  const p = v.tl.lines[9].phrases[1].start + 0.8;
  const kLine = L.ease.outCubic(L.prog(v.gt, p, 0.6)) * (1 - L.ease.inCubic(L.prog(v.gt, s[12].start - 0.1, 0.4)));
  if (kLine > 0) {
    const len = tip(v);
    readout(c, fmtLen(len), len < 5 * AU ? 'LINE LENGTH' : `LINE LENGTH  ·  ${L.fmt(len / 1e12, len < 1e13 ? 1 : 0)} BILLION KM`, kLine);
  }
}
export const cues = (tl) => beatCues(tl, { gain: 0.18, pitch: 0.95 });
