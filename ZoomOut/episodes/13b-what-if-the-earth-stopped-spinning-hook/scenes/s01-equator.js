// Beat 1 — "At the equator, | you're moving at about 1,670 km/h."
// Owns the CITY for beats 1–4: one top-down equatorial city built around the world origin (x = east, y = south,
// metres). A wide boulevard runs east–west exactly along the equator (env paints the dashed 0° line down its
// stone promenade); a grid of blocks with leaning roofs (light perspective parallax), cast shadows, street
// trees, a plaza with a fountain, traffic and pedestrians as minimal silhouettes. It thins out into fields
// ~2.5 km from the centre, so the district shot of beat 4 (3.2 m/px) has a readable edge.
//
// LOD by v.cam.mpp: nothing above 28 m/px (the dive), batched blocks ("district") above 0.9 m/px, every
// building drawn with walls, floors and rooftop details below. Cars/people only below ~1.2 m/px.
//
// Shared state for s02–s04 (import only):
//   V, WIND_V            the equator speed (464 m/s) and the wind speed used by s04
//   stopAt(tl)           the stop (global s)          windK(gt, tl)  how hard the wind blows (0..1)
//   looseAt(tg)          every loose object (cars, people, café chairs, bins) at time tg (pre-stop motion)
//   drawCar / drawPerson / drawProp / drawVector   drawing helpers   YOU, FOUNTAIN, PLAZA, inStreetLod
import * as L from '../../../../engine/runtime/lib.js';
import { OFF, V_EQ, numTime, stopTime, wordTime } from '../env.js';

const { W, H } = L;
const TAU = Math.PI * 2;
export const V = V_EQ / 3.6;                 // 463.9 m/s
export const WIND_V = 300;                   // m/s (1,080 km/h) for the beat-4 air
export const stopAt = (tl) => stopTime(tl);
export const YOU = { x: -3, y: 2.6 };        // you: standing on the equator promenade, just south of the 0° line
export const FOUNTAIN = { x: 0, y: 62, r: 7 };
export const PLAZA = { x0: -36, x1: 36, y0: 22, y1: 103 };
const FOC = 2600;                            // virtual focal length (px) for the roof parallax

function hh(a, b, s = 0) { const h = Math.sin(a * 127.1 + b * 311.7 + s * 74.7) * 43758.5453; return h - Math.floor(h); }
const pmod = (a, n) => ((a % n) + n) % n;

/** Wind strength 0..1: a breeze of dust right after the stop, the full gale from beat 4. */
export function windK(gt, tl) {
  const s = stopAt(tl);
  return 0.22 * L.ease.inOutCubic(L.prog(gt, s + 0.2, 1.4)) + 0.78 * L.ease.inOutCubic(L.prog(gt, tl.scenes[4].start - 0.1, 1.1));
}
/** City visibility from the camera scale (fades in on the dive, out on the pull-back). */
export const cityK = (v) => L.ease.inOutCubic(L.clamp(L.invLerp(14, 5.5, v.cam.mpp)));
export const inStreetLod = (v) => v.cam.mpp < 1.2;

// ------------------------------------------------------------------ the grid
// x: cross streets centred on x = 45 + 90 i (asphalt ±6, walks to ±9); blocks centred on x = 90 i, 72 m wide.
// y: the boulevard |y| < 22 (promenade ±4.5, lanes to ±16, walks to ±22); then streets at ±112, ±202, …
export function rowSpan(j) {
  const n = Math.abs(j);
  const y0 = n === 1 ? 22 : 121 + 90 * (n - 2), y1 = 103 + 90 * (n - 1);
  return j > 0 ? [y0, y1] : [-y1, -y0];
}
const ROOF = [[168, 164, 154], [190, 184, 172], [144, 142, 136], [162, 110, 84], [142, 96, 74], [108, 110, 112], [86, 90, 94], [126, 136, 134], [176, 158, 132]];
const ROOF_W = [3, 2.2, 3, 1.8, 1.6, 2, 1.4, 1, 1.5];
const ROOF_SUM = ROOF_W.reduce((a, b) => a + b, 0);
function pickRoof(u) { let a = u * ROOF_SUM; for (let i = 0; i < ROOF_W.length; i++) { a -= ROOF_W[i]; if (a <= 0) return i; } return 0; }
const PARKS = new Set(['4,-3', '5,-3', '4,-2', '5,-2', '-8,4', '-8,5', '-7,5', '13,-12', '-14,-9', '-3,14', '9,11']);

const cache = new Map();
export function block(i, j) {
  const key = `${i},${j}`;
  if (cache.has(key)) return cache.get(key);
  const b = makeBlock(i, j, key);
  cache.set(key, b);
  return b;
}
// arterials: every 7th cross street and every 5th row street are wide (trimmed blocks, a lighter median)
export const wideX = (k) => pmod(k, 7) === 3;              // cross street at x = 45 + 90 k
export const wideY = (n) => n > 0 && n % 5 === 3;          // street between rows n and n + 1 (both sides)
// a river crossing the south of the district
export const RIVER_W = 34;
// 13b: 270 m further north than the original, so in the district shot (beat 4 and the cold open) it runs above
// the caption line instead of under it
export const RIVER_Y0 = 1450;
export const riverY = (x) => RIVER_Y0 + 240 * Math.sin(x / 900 + 0.6) + 80 * Math.sin(x / 330 + 2.0);
const BANK = 22;
/** smooth value noise in [0, 1] (bilinear over the hash lattice, smoothstep weights) */
function vnoise(x, y, s) {
  const xi = Math.floor(x), yi = Math.floor(y), fx = x - xi, fy = y - yi;
  const u = fx * fx * (3 - 2 * fx), w = fy * fy * (3 - 2 * fy);
  const a = hh(xi, yi, s), b = hh(xi + 1, yi, s), c = hh(xi, yi + 1, s), d = hh(xi + 1, yi + 1, s);
  return a + (b - a) * u + (c - a) * w + (a - b - c + d) * u * w;
}
// 13b: neighbourhoods, so the district never reads as one repeated tile: low roofs in warm tile and many small
// lots (residential), big pale single-roof blocks and yards (commercial / industrial), and green clusters. The
// street-scale heart of the film (|i|, |j| <= 3: the plaza, the boulevard blocks, the facades s03 relies on) is
// generated exactly as before.
const ROOF_RES = [3, 4, 8, 3, 4, 2, 0, 8], ROOF_IND = [0, 1, 1, 2, 5, 7, 0, 6];
// 13b: an old diagonal avenue cuts across the grid north-east of the centre (well clear of the street-scale
// heart): the blocks it crosses become green strips along it, so the district shot has one strong line that no
// tile would have. Signed distance (m) from its centre line: x/y world metres.
export const AVE = { x: -600, y: 1300, dx: 0.8, dy: -0.6, hw: 20 };
/** the avenue's extent along its line (m): only where the city is (it stops at the fields) */
function aveSpan(list) {
  let t0 = Infinity, t1 = -Infinity;
  for (const b of list) if (b.ave) { const t = ((b.x0 + b.x1) / 2 - AVE.x) * AVE.dx + ((b.y0 + b.y1) / 2 - AVE.y) * AVE.dy; t0 = Math.min(t0, t - 70); t1 = Math.max(t1, t + 70); }
  return t1 > t0 ? [t0, t1] : null;
}
function avePath(c, v, [t0, t1], w) {
  const nx = -AVE.dy, ny = AVE.dx;
  c.beginPath();
  c.moveTo(v.wx(AVE.x + AVE.dx * t0 + nx * w), v.wy(AVE.y + AVE.dy * t0 + ny * w));
  c.lineTo(v.wx(AVE.x + AVE.dx * t1 + nx * w), v.wy(AVE.y + AVE.dy * t1 + ny * w));
  c.lineTo(v.wx(AVE.x + AVE.dx * t1 - nx * w), v.wy(AVE.y + AVE.dy * t1 - ny * w));
  c.lineTo(v.wx(AVE.x + AVE.dx * t0 - nx * w), v.wy(AVE.y + AVE.dy * t0 - ny * w));
  c.closePath();
}
const aveDist = (x, y) => (x - AVE.x) * -AVE.dy + (y - AVE.y) * AVE.dx;
function aveHits(x0, y0, x1, y1, pad = 0) {
  const d = [aveDist(x0, y0), aveDist(x1, y0), aveDist(x0, y1), aveDist(x1, y1)];
  return Math.min(...d) < AVE.hw + pad && Math.max(...d) > -AVE.hw - pad;
}
function makeBlock(i, j, key) {
  let [y0, y1] = rowSpan(j);
  const n = Math.abs(j);
  const inner = n > 1 && wideY(n - 1), outer = wideY(n);
  if (j > 0) { if (inner) y0 += 8; if (outer) y1 -= 8; } else { if (inner) y1 -= 8; if (outer) y0 += 8; }
  const x0 = 90 * i - 36 + (wideX(i - 1) ? 8 : 0), x1 = 90 * i + 36 - (wideX(i) ? 8 : 0), cx = 90 * i, cy = (y0 + y1) / 2;
  const core = Math.abs(i) <= 3 && Math.abs(j) <= 3;
  const art = !core && (wideX(i) || wideX(i - 1) || wideY(Math.abs(j)) || (Math.abs(j) > 1 && wideY(Math.abs(j) - 1)));
  // 13b: a ragged, organic outline (km-scale lobes, the city reaching out along its arterials), not an ellipse
  const e = (((cx - 250) / 2700) ** 2 + (cy / 3500) ** 2) * (art ? 0.82 : 1) + 0.26 * (hh(i, j, 1) - 0.5) + 0.2 * L.noise1(i * 0.27, j + 40)
    + (core ? 0 : 0.55 * (vnoise(cx / 650, cy / 650, 3) - 0.5));
  if (e > 1) return null;
  if (j > 8) {                                             // the river and its green banks
    for (const x of [x0, cx, x1]) { const ry = riverY(x); if (y1 > ry - RIVER_W - BANK - 9 && y0 < ry + RIVER_W + BANK + 9) return null; }
  }
  const edge = L.smoothstep(L.clamp((e - 0.5) / 0.5));
  const pad = { l: wideX(i - 1) ? 17 : 9, r: wideX(i) ? 17 : 9, t: 9, b: 9 };
  if (j === 1) pad.t = 22; if (j === -1) pad.b = 22;
  if (j > 0) { if (inner) pad.t = 17; if (outer) pad.b = 17; } else { if (inner) pad.b = 17; if (outer) pad.t = 17; }
  const b = { i, j, x0, x1, y0, y1, edge, pad, kind: 'build', blds: [], trees: [], lots: [], z: 0.5 };
  const r = L.rng((Math.imul(i + 9973, 73856093) ^ Math.imul(j + 7919, 19349663)) >>> 0);
  if (i === 0 && j === 1) { b.kind = 'plaza'; return b; }
  const z = core ? 0.5 : vnoise(i / 4.2, j / 3.1, 1);          // < 0.36 residential, > 0.64 commercial / industrial
  b.z = z;
  const green = core ? 0 : vnoise(i / 2.6, j / 2.2, 2);
  const onAve = !core && aveHits(x0, y0, x1, y1, 4);
  if (PARKS.has(key) || onAve || r() < 0.03 + 0.14 * edge + (green > 0.74 ? 0.55 : 0)) {
    b.kind = 'park';
    b.ave = onAve;
    const n = 26;
    for (let k = 0; k < n; k++) {
      const tx = L.lerp(x0 + 4, x1 - 4, r()), ty = L.lerp(y0 + 4, y1 - 4, r());
      if (Math.abs(tx - cx) < 3 || Math.abs(ty - cy) < 3) continue;     // footpaths cross the park
      if (onAve && Math.abs(aveDist(tx, ty)) < AVE.hw + 4) continue;
      b.trees.push({ x: tx, y: ty, r: 2.6 + 2.6 * r(), s: r() });
    }
    return b;
  }
  const res = z < 0.36, ind = z > 0.64;
  const nx = res ? (r() < 0.5 ? 4 : 3) : ind ? (r() < 0.6 ? 1 : 2) : r() < 0.45 ? 3 : 2;
  const ny = res ? (r() < 0.4 ? 3 : 2) : ind ? 1 : r() < 0.32 ? 1 : 2;
  const xs = [x0], ys = [y0];
  for (let k = 1; k < nx; k++) xs.push(x0 + (x1 - x0) * (k / nx + (r() - 0.5) * 0.16));
  xs.push(x1);
  for (let k = 1; k < ny; k++) ys.push(y0 + (y1 - y0) * (k / ny + (r() - 0.5) * 0.18));
  ys.push(y1);
  const dist = Math.hypot(cx * 0.85, cy * 1.25);
  const hmax = (11 + 60 * Math.exp(-dist / 620)) * (res ? 0.55 : ind ? 0.7 : 1);
  for (let a = 0; a < nx; a++) {
    for (let c = 0; c < ny; c++) {
      let px0 = xs[a], px1 = xs[a + 1], py0 = ys[c], py1 = ys[c + 1];
      if (r() < 0.07 + 0.16 * edge + (ind ? 0.12 : 0)) {       // an open yard / car park
        b.lots.push({ x0: px0 + 1, y0: py0 + 1, x1: px1 - 1, y1: py1 - 1, park: r() < 0.5 });
        if (r() < 0.7) b.trees.push({ x: (px0 + px1) / 2 + (r() - 0.5) * 6, y: (py0 + py1) / 2 + (r() - 0.5) * 6, r: 2.8 + 1.6 * r(), s: r() });
        continue;
      }
      const ins = () => 1.4 + 2.2 * r();
      px0 += a === 0 ? ins() : 0.7; px1 -= a === nx - 1 ? ins() : 0.7;
      py0 += c === 0 ? ins() : 0.7; py1 -= c === ny - 1 ? ins() : 0.7;
      const front = (j === 1 && c === 0) || (j === -1 && c === ny - 1);
      const h = hmax * (0.34 + 0.66 * Math.pow(r(), 1.4)) * (front ? 1.15 : 1);
      const ur = r();
      const roof = res ? ROOF_RES[Math.floor(ur * ROOF_RES.length)] : ind ? ROOF_IND[Math.floor(ur * ROOF_IND.length)] : pickRoof(ur);
      b.blds.push({ x0: px0, y0: py0, x1: px1, y1: py1, h, roof, det: Math.floor(r() * 1e6) });
    }
  }
  b.blds.sort((p, q) => p.h - q.h);
  return b;
}

/** World bounds of the screen (plus a margin in metres). */
function bounds(v, pad = 0) {
  const m = v.cam.mpp;
  return {
    x0: v.cam.x - (W / 2) * m - pad, x1: v.cam.x + (W / 2) * m + pad,
    y0: v.cam.y - H * v.cam.anchor * m - pad, y1: v.cam.y + H * (1 - v.cam.anchor) * m + pad,
  };
}
function visibleBlocks(v, pad) {
  const B = bounds(v, pad), out = [];
  const i0 = Math.floor((B.x0 - 45) / 90), i1 = Math.ceil((B.x1 + 45) / 90);
  const j1 = Math.ceil((Math.max(0, B.y1) - 22) / 90) + 1, j0 = -(Math.ceil((Math.max(0, -B.y0) - 22) / 90) + 1);
  for (let j = j0; j <= j1; j++) {
    if (!j) continue;
    const [y0, y1] = rowSpan(j);
    if (y1 < B.y0 - 30 || y0 > B.y1 + 30) continue;
    for (let i = i0; i <= i1; i++) { const b = block(i, j); if (b) out.push(b); }
  }
  return { B, list: out };
}

// ------------------------------------------------------------------ palette
const ASPHALT0 = [52, 56, 61], WALK0 = [140, 136, 126], ASPHALT = ASPHALT0, LOT = [112, 110, 102], GRASS = [84, 106, 68], PAVE = [174, 166, 150];
const PROM = [158, 152, 138];
const CAR_COLS = [[228, 228, 224], [182, 186, 190], [72, 76, 82], [32, 34, 38], [150, 44, 40], [40, 60, 98], [224, 178, 44], [204, 204, 200], [112, 120, 126], [224, 178, 44], [96, 60, 44]];
const CLOTH = [[232, 228, 220], [60, 66, 78], [178, 70, 58], [70, 98, 140], [200, 170, 110], [40, 42, 46], [120, 140, 110], [210, 120, 70]];

// ------------------------------------------------------------------ loose objects
const LOOP = 460, LOOP_A = -215;                          // traffic wraps in x ∈ [-215, 245] (always off-screen)
const LANES = [{ y: -6.2, dir: -1, spd: 11.5, seed: 1 }, { y: -9.7, dir: -1, spd: 9.2, seed: 2 }, { y: 6.2, dir: 1, spd: 12.2, seed: 3 }, { y: 9.7, dir: 1, spd: 9.6, seed: 4 }];
const MOVERS = [];
for (const ln of LANES) {
  const r = L.rng(ln.seed * 977);
  let s = r() * 20;
  while (s < LOOP - 12) {
    const bus = ln.seed === 4 && MOVERS.filter((m) => m.bus).length === 0 && s > 120;
    MOVERS.push({ kind: 'car', lane: ln, s, bus, l: bus ? 12 : 4.3 + r() * 0.6, w: bus ? 2.55 : 1.82 + r() * 0.12, col: bus ? [232, 234, 228] : CAR_COLS[Math.floor(r() * CAR_COLS.length)], seed: r() });
    s += (bus ? 22 : 13) + r() * 34;
  }
}
const PARKED = [];
for (const y of [-13.6, 13.6]) {
  const r = L.rng(y > 0 ? 55 : 66);
  for (let x = -250; x < 280; x += 6.3) {
    const c = pmod(x - 45, 90);
    if (c < 15 || c > 75) continue;                         // keep intersections and crosswalks clear
    if (r() < 0.3) continue;
    PARKED.push({ kind: 'car', x: x + (r() - 0.5) * 0.6, y, ang: y < 0 ? Math.PI : 0, l: 4.2 + r() * 0.6, w: 1.8, col: CAR_COLS[Math.floor(r() * CAR_COLS.length)], seed: r() });
  }
}
// Walkers. Promenade walkers (|y| < 4.5, the median) wrap freely. Sidewalk walkers (|y| 19–21) each own ONE
// block face: they come out of a side-street sidewalk (x = 90 i ± 37.5), walk the block along the boulevard and
// turn off into the next side-street sidewalk, fading in/out on those short legs — never on a carriageway.
const WALKERS = [];
const TURN = 6, BLOCKW = 75;                              // side-street leg (m), block face between turns (m)
{
  const r = L.rng(4242);
  const paths = [[-19.4, 10], [-20.8, 8], [19.3, 10], [20.7, 8], [-2.9, 9], [-1.5, 7], [1.2, 6]];
  for (const [y, n] of paths) {
    const walk = Math.abs(y) > 15;
    for (let k = 0; k < n; k++) {
      WALKERS.push({ kind: 'person', walk, blk: -1 + (k % 4), y: y + (r() - 0.5) * 0.4, s: walk ? r() * (BLOCKW + 2 * TURN) : (k + r() * 0.7) * (320 / n), dir: r() < 0.5 ? -1 : 1, spd: 1.05 + r() * 0.45, col: CLOTH[Math.floor(r() * CLOTH.length)], ph: r() * 10 });
    }
  }
}
/** A sidewalk walker at time tg: {x, y, ang, vx, a}. */
function walkerAt(p, tg) {
  const P = BLOCKW + 2 * TURN, q = pmod(p.s + p.spd * tg, P), sg = Math.sign(p.y);
  const xs = 90 * p.blk - p.dir * 37.5, xe = 90 * p.blk + p.dir * 37.5;
  const inward = sg > 0 ? -Math.PI / 2 : Math.PI / 2;
  if (q < TURN) return { x: xs, y: p.y + sg * (TURN - q), ang: inward, vx: 0, a: L.smoothstep(q / TURN) };
  if (q < TURN + BLOCKW) return { x: xs + p.dir * (q - TURN), y: p.y, ang: p.dir > 0 ? 0 : Math.PI, vx: p.dir * p.spd, a: 1 };
  const u = q - TURN - BLOCKW;
  return { x: xe, y: p.y + sg * u, ang: inward + Math.PI, vx: 0, a: L.smoothstep(1 - u / TURN) };
}
// plaza: a few strollers circling the fountain, café chairs, tables, umbrellas, bins
const STROLL = Array.from({ length: 6 }, (_, k) => ({ kind: 'person', a0: k * 1.1 + 0.3, rad: 11.5 + (k % 3) * 2.2, w: (k % 2 ? 1 : -1) * (0.07 + 0.015 * k), col: CLOTH[(k * 3 + 1) % CLOTH.length], ph: k * 1.7 }));
const PROPS = [];
{
  const r = L.rng(808);
  for (let k = 0; k < 5; k++) {
    const ux = 14 + (k % 3) * 7.5, uy = 78 + Math.floor(k / 3) * 8 + (k % 2) * 2;
    PROPS.push({ kind: 'umbrella', x: ux, y: uy, r: 1.6, col: k % 2 ? [226, 214, 192] : [176, 92, 66], seed: r() });
    for (let c = 0; c < 3; c++) {
      const a = r() * TAU;
      PROPS.push({ kind: 'chair', x: ux + Math.cos(a) * 1.15, y: uy + Math.sin(a) * 1.15, r: 0.32, col: [200, 196, 188], seed: r() });
    }
  }
  for (const x of [-120, -78, -32, 22, 68, 112, 160, 204]) {
    PROPS.push({ kind: 'bin', x, y: 16.7, r: 0.35, col: [58, 64, 62], seed: r() });
    PROPS.push({ kind: 'bin', x: x + 17, y: -16.7, r: 0.35, col: [58, 64, 62], seed: r() });
  }
  for (let k = 0; k < 9; k++) PROPS.push({ kind: 'crate', x: -28 + r() * 10, y: 30 + r() * 12, r: 0.45, col: [150, 120, 84], seed: r() });   // market crates
}

/** Every loose object at time tg (pre-stop motion; s03 freezes this at the stop and flings it east). */
export function looseAt(tg) {
  tg -= OFF;   // 13b: the street runs on film time, so the stop freezes the exact arrangement of the original
  const out = [];
  MOVERS.forEach((m, k) => {
    const x = LOOP_A + pmod(m.s + m.lane.dir * m.lane.spd * tg - LOOP_A, LOOP);
    out.push({ id: k, kind: 'car', bus: m.bus, x, y: m.lane.y, ang: m.lane.dir > 0 ? 0 : Math.PI, vx: m.lane.dir * m.lane.spd, l: m.l, w: m.w, col: m.col, seed: m.seed });
  });
  PARKED.forEach((p, k) => out.push({ ...p, id: 100 + k, vx: 0 }));
  WALKERS.forEach((p, k) => {
    if (p.walk) {
      const w = walkerAt(p, tg);
      if (w.a > 0.02) out.push({ id: 300 + k, kind: 'person', ...w, col: p.col, ph: p.ph + tg * p.spd * 1.9, seed: hh(k, 3) });
      return;
    }
    const x = LOOP_A + 70 + pmod(p.s + p.dir * p.spd * tg - LOOP_A - 70, 320);
    out.push({ id: 300 + k, kind: 'person', x, y: p.y, ang: p.dir > 0 ? 0 : Math.PI, vx: p.dir * p.spd, col: p.col, ph: p.ph + tg * p.spd * 1.9, seed: hh(k, 3) });
  });
  STROLL.forEach((p, k) => {
    const a = p.a0 + p.w * tg;
    out.push({ id: 400 + k, kind: 'person', x: FOUNTAIN.x + Math.cos(a) * p.rad, y: FOUNTAIN.y + Math.sin(a) * p.rad * 0.92, ang: a + (p.w > 0 ? Math.PI / 2 : -Math.PI / 2), vx: -Math.sin(a) * p.w * p.rad, col: p.col, ph: p.ph + tg * 2.2, seed: hh(k, 9), plaza: true });
  });
  out.push({ id: 500, kind: 'person', you: true, x: YOU.x, y: YOU.y, ang: -Math.PI / 2, vx: 0, col: [70, 104, 146], ph: 0, seed: 0.2 });   // 13b: you face north, a blue jacket
  PROPS.forEach((p, k) => out.push({ ...p, id: 600 + k, ang: 0, vx: 0, plaza: p.y > 22 }));
  return out;
}

// ------------------------------------------------------------------ drawing helpers (world → screen inside)
export function drawCar(c, v, o, x, y, a = 1, ang = o.ang) {
  const s = 1 / v.cam.mpp;
  if (o.l * s < 2) return;
  c.save();
  c.globalAlpha *= a;
  c.translate(v.wx(x), v.wy(y));
  c.scale(s, s);
  c.fillStyle = 'rgba(8,10,14,0.38)';
  c.save(); c.translate(0.45, 0.32); c.rotate(ang); L.roundRect(c, -o.l / 2, -o.w / 2, o.l, o.w, 0.6); c.fill(); c.restore();
  c.rotate(ang);
  const [l, w] = [o.l, o.w];
  c.fillStyle = L.rgba(o.col);
  L.roundRect(c, -l / 2, -w / 2, l, w, o.bus ? 0.35 : 0.62);
  c.fill();
  if (o.bus) {
    c.fillStyle = L.rgba(L.mix(o.col, [0, 0, 0], 0.12));
    c.fillRect(-l / 2 + 1.4, -w / 2 + 0.35, l - 2.6, w - 0.7);
    c.fillStyle = 'rgba(200,206,210,0.95)';
    for (let k = 0; k < 3; k++) c.fillRect(-l / 2 + 2.2 + k * 3.2, -0.55, 1.6, 1.1);
    c.fillStyle = 'rgba(20,28,36,0.9)';
    c.fillRect(l / 2 - 0.55, -w / 2 + 0.2, 0.4, w - 0.4);
  } else {
    const dark = 'rgba(16,22,30,0.92)';
    c.fillStyle = dark;                                             // windscreen (front = +x) and rear window
    L.roundRect(c, l * 0.09, -w / 2 + 0.2, l * 0.17, w - 0.4, 0.25); c.fill();
    L.roundRect(c, -l * 0.36, -w / 2 + 0.25, l * 0.12, w - 0.5, 0.2); c.fill();
    c.fillStyle = L.rgba(L.mix(o.col, [255, 255, 255], 0.16));    // roof panel catching the light
    L.roundRect(c, -l * 0.22, -w / 2 + 0.26, l * 0.3, w - 0.52, 0.25); c.fill();
    c.fillStyle = 'rgba(255,255,255,0.18)';
    c.fillRect(-l / 2 + 0.3, -w / 2 + 0.12, l - 0.6, 0.12);
  }
  c.restore();
}

export function drawPerson(c, v, o, x, y, a = 1, ang = o.ang) {
  const s = (1 / v.cam.mpp) * 2.0 * (o.you ? 2.0 : 1);            // enlarged so a person reads at 0.14 m/px; you more (13b)
  if (s * 0.5 < 1.2) return;
  const sx = v.wx(x), sy = v.wy(y);
  c.save();
  c.globalAlpha *= a * (o.a ?? 1);
  c.translate(sx, sy);
  c.scale(s, s);
  if (o.you) {                                                     // a soft pool of light under you
    const g = c.createRadialGradient(0, 0, 0, 0, 0, 1.25);
    g.addColorStop(0, 'rgba(255,246,222,0.5)');
    g.addColorStop(0.45, 'rgba(255,240,210,0.2)');
    g.addColorStop(1, 'rgba(255,240,210,0)');
    c.fillStyle = g;
    c.beginPath(); c.arc(0, 0, 1.25, 0, TAU); c.fill();
  }
  // 13b: a person seen from straight above (local +x = heading): shoulders as a wide rounded bar, arms at the
  // sides, legs striding out front and back, the head (hair) slightly forward of the shoulder line. Shoulders are
  // ~2.4x wider than the head, so the figure never reads as an eye (an oval with a dark centre).
  const moving = Math.abs(o.vx ?? 0) > 0.05 || !!o.plaza;
  const st = moving ? Math.sin(o.ph * 3) : 0;                      // stride phase
  const seed = o.seed ?? 0.5;
  const body = L.rgba(o.col), dark = L.rgba(L.mix(o.col, [10, 12, 16], 0.38));
  const HAIR = [[34, 26, 22], [58, 40, 28], [20, 20, 22], [96, 70, 44], [140, 136, 130]];
  const hair = HAIR[Math.floor(seed * 7919) % HAIR.length];
  c.fillStyle = 'rgba(8,10,14,0.32)';                              // contact shadow (sun from the upper left)
  c.beginPath(); c.ellipse(0.3, 0.2, 0.36, 0.26, 0, 0, TAU); c.fill();
  c.rotate(ang);
  // legs + shoes (trousers dark), alternating out front / behind
  c.fillStyle = 'rgba(38,40,46,1)';
  for (const sd of [-1, 1]) {
    const lx = 0.2 * st * sd;
    c.beginPath(); c.ellipse(lx, sd * 0.085, 0.11, 0.06, 0, 0, TAU); c.fill();
  }
  // arms swinging opposite the legs
  c.fillStyle = dark;
  for (const sd of [-1, 1]) {
    c.beginPath(); c.ellipse(-0.14 * st * sd, sd * 0.25, 0.13, 0.055, 0, 0, TAU); c.fill();
  }
  // shoulders / torso
  c.fillStyle = body;
  L.roundRect(c, -0.11, -0.25, 0.22, 0.5, 0.1); c.fill();
  c.fillStyle = 'rgba(255,255,255,0.16)';                          // light from the upper left
  L.roundRect(c, -0.09, -0.23, 0.08, 0.3, 0.04); c.fill();
  // head: hair from above, a touch forward
  c.fillStyle = L.rgba(hair);
  c.beginPath(); c.arc(0.03, 0, 0.105, 0, TAU); c.fill();
  c.fillStyle = 'rgba(255,255,255,0.18)';
  c.beginPath(); c.arc(0.0, -0.035, 0.045, 0, TAU); c.fill();
  c.restore();
}

export function drawProp(c, v, o, x, y, a = 1, spin = 0) {
  const s = 1 / v.cam.mpp;
  if (o.r * s < 0.8) return;
  c.save();
  c.globalAlpha *= a;
  c.translate(v.wx(x), v.wy(y));
  c.scale(s, s);
  c.fillStyle = 'rgba(8,10,14,0.32)';
  c.beginPath(); c.arc(o.r * 0.5, o.r * 0.35, Math.max(0, o.r), 0, TAU); c.fill();
  c.rotate(spin);
  if (o.kind === 'umbrella') {
    for (let k = 0; k < 8; k++) {
      c.fillStyle = L.rgba(L.mix(o.col, k % 2 ? [255, 255, 255] : [0, 0, 0], 0.12));
      c.beginPath(); c.moveTo(0, 0); c.arc(0, 0, Math.max(0, o.r), (k * TAU) / 8, ((k + 1) * TAU) / 8); c.closePath(); c.fill();
    }
    c.fillStyle = 'rgba(60,50,40,0.9)';
    c.beginPath(); c.arc(0, 0, 0.12, 0, TAU); c.fill();
  } else if (o.kind === 'crate') {
    c.fillStyle = L.rgba(o.col);
    c.fillRect(-o.r, -o.r * 0.75, o.r * 2, o.r * 1.5);
    c.fillStyle = 'rgba(0,0,0,0.25)';
    c.fillRect(-o.r, -0.03, o.r * 2, 0.06);
  } else {
    c.fillStyle = L.rgba(o.col);
    c.beginPath(); c.arc(0, 0, Math.max(0, o.r), 0, TAU); c.fill();
    c.fillStyle = 'rgba(255,255,255,0.2)';
    c.beginPath(); c.arc(-o.r * 0.25, -o.r * 0.25, Math.max(0, o.r * 0.45), 0, TAU); c.fill();
  }
  c.restore();
}

/** An east-pointing vector in screen space: glow, shaft, head; k draws it in (0..1). */
export function drawVector(c, x0, y, len, k, { w = 8, col = [90, 220, 235], alpha = 1, flow = null, glowA = 0.5 } = {}) {
  if (k <= 0 || len <= 1) return;
  const e = L.ease.outCubic(L.clamp(k));
  const x1 = x0 + len * e, hl = Math.min(w * 3.2, len * 0.4), hw = w * 1.9;
  c.save();
  c.globalAlpha *= alpha * L.clamp(k * 3);
  const shape = () => {
    c.beginPath();
    c.moveTo(x0, y - w / 2); c.lineTo(x1 - hl, y - w / 2); c.lineTo(x1 - hl, y - hw); c.lineTo(x1, y);
    c.lineTo(x1 - hl, y + hw); c.lineTo(x1 - hl, y + w / 2); c.lineTo(x0, y + w / 2); c.closePath();
  };
  c.shadowColor = L.rgba(col, glowA);
  c.shadowBlur = w * 3;
  c.fillStyle = L.rgba(col, 0.95);
  shape(); c.fill();
  c.shadowBlur = 0;
  c.shadowColor = 'rgba(0,0,0,0)';
  if (flow != null && len * e > 60) {   // light chevrons flowing east along the shaft
    c.save();
    shape(); c.clip();
    c.fillStyle = 'rgba(255,255,255,0.55)';
    const sp = w * 4.5;
    for (let xx = x0 - sp + pmod(flow * sp * 1.6, sp); xx < x1 - hl; xx += sp) {
      c.beginPath(); c.moveTo(xx, y - w / 2); c.lineTo(xx + w * 0.9, y); c.lineTo(xx, y + w / 2); c.lineTo(xx - w * 0.6, y + w / 2); c.lineTo(xx + w * 0.3, y); c.lineTo(xx - w * 0.6, y - w / 2); c.fill();
    }
    c.restore();
  }
  c.restore();
}

// ------------------------------------------------------------------ city drawing
function rectPath(c, v, x0, y0, x1, y1) { c.rect(v.wx(x0), v.wy(y0), (x1 - x0) / v.cam.mpp, (y1 - y0) / v.cam.mpp); }

function drawGround(c, v, list, B) {
  const m = v.cam.mpp;
  const dk = L.clamp(L.invLerp(1.2, 3, m));                // district: quieter grid (aerial perspective)
  const ASPHALT = L.mix(ASPHALT0, [104, 102, 98], 0.45 * dk), WALK = L.mix(WALK0, LOT, 0.7 * dk);
  // asphalt under every block's streets, then walks, then the block pads
  c.beginPath();
  for (const b of list) rectPath(c, v, b.x0 - b.pad.l, b.y0 - b.pad.t, b.x1 + b.pad.r, b.y1 + b.pad.b);
  c.fillStyle = L.rgba(ASPHALT); c.fill();
  c.beginPath();
  for (const b of list) rectPath(c, v, b.x0 - 3, b.y0 - (b.j === 1 ? 6 : 3), b.x1 + 3, b.y1 + (b.j === -1 ? 6 : 3));
  c.fillStyle = L.rgba(WALK); c.fill();
  c.beginPath();
  for (const b of list) if (b.kind === 'build') rectPath(c, v, b.x0, b.y0, b.x1, b.y1);
  c.fillStyle = L.rgba(LOT); c.fill();
  c.beginPath();
  for (const b of list) if (b.kind === 'park') rectPath(c, v, b.x0, b.y0, b.x1, b.y1);
  c.fillStyle = L.rgba(GRASS); c.fill();
  // park footpaths
  if (m < 4) {
    c.beginPath();
    for (const b of list) if (b.kind === 'park') { const cx = (b.x0 + b.x1) / 2, cy = (b.y0 + b.y1) / 2; rectPath(c, v, cx - 1.5, b.y0, cx + 1.5, b.y1); rectPath(c, v, b.x0, cy - 1.5, b.x1, cy + 1.5); }
    c.fillStyle = 'rgba(184,172,146,0.75)'; c.fill();
  }
  // yards and car parks
  c.beginPath();
  for (const b of list) for (const p of b.lots) if (p.park) rectPath(c, v, p.x0, p.y0, p.x1, p.y1);
  c.fillStyle = L.rgba(L.mix(ASPHALT, LOT, 0.4)); c.fill();
  c.beginPath();
  for (const b of list) for (const p of b.lots) if (!p.park) rectPath(c, v, p.x0, p.y0, p.x1, p.y1);
  c.fillStyle = L.rgba(L.mix(GRASS, LOT, 0.45)); c.fill();
  drawRiver(c, v, B);
  // 13b: the diagonal avenue (asphalt between pale kerbs), drawn after the river so it bridges it
  const sp = aveSpan(list);
  if (sp) {
    avePath(c, v, sp, AVE.hw); c.fillStyle = L.rgba(WALK); c.fill();
    avePath(c, v, sp, AVE.hw - 3.5); c.fillStyle = L.rgba(ASPHALT); c.fill();
  }
  // the boulevard's stone promenade on the equator
  const xs = list.filter((b) => Math.abs(b.j) === 1);
  if (xs.length) {
    const xa = Math.max(B.x0, Math.min(...xs.map((b) => b.x0)) - 9), xb = Math.min(B.x1, Math.max(...xs.map((b) => b.x1)) + 9);
    c.fillStyle = L.rgba(PROM);
    c.fillRect(v.wx(xa), v.wy(-4.5), (xb - xa) / m, 9 / m);
    if (m < 1.5) {
      c.fillStyle = 'rgba(214,206,186,0.5)';
      c.fillRect(v.wx(xa), v.wy(-4.5), (xb - xa) / m, Math.max(1, 0.35 / m));
      c.fillRect(v.wx(xa), v.wy(4.5) - Math.max(1, 0.35 / m), (xb - xa) / m, Math.max(1, 0.35 / m));
    }
    if (m < 0.6) drawMarkings(c, v, xa, xb);
  }
}

function drawRiver(c, v, B) {
  const m = v.cam.mpp;
  if (B.y1 < RIVER_Y0 - 420 || B.y0 > RIVER_Y0 + 420) return;
  const step = Math.max(5, m * 8), xa = Math.floor((B.x0 - 60) / step) * step, xb = B.x1 + 60;
  const band = (w0, w1, fill) => {
    c.beginPath();
    for (let x = xa; x <= xb; x += step) c.lineTo(v.wx(x), v.wy(riverY(x) + w0));
    for (let x = Math.floor(xb / step) * step; x >= xa; x -= step) c.lineTo(v.wx(x), v.wy(riverY(x) + w1));
    c.closePath();
    c.fillStyle = fill; c.fill();
  };
  band(-RIVER_W - BANK - 6, RIVER_W + BANK + 6, L.rgba(GRASS));
  band(-RIVER_W - 3, RIVER_W + 3, 'rgb(132,124,106)');
  band(-RIVER_W, RIVER_W, 'rgb(40,74,88)');
  band(-RIVER_W, -RIVER_W * 0.55, 'rgba(120,170,180,0.18)');
  // bridges on the arterials and every third street
  for (let k = Math.floor((xa - 45) / 90); 45 + 90 * k < xb; k++) {
    if (!(wideX(k) || pmod(k, 3) === 0)) continue;
    const x = 45 + 90 * k, ry = riverY(x), hw = wideX(k) ? 13 : 6.5, hl = RIVER_W + BANK + 12;
    c.fillStyle = 'rgba(0,0,0,0.3)';
    c.fillRect(v.wx(x - hw + 3), v.wy(ry - RIVER_W), (2 * hw) / m, (2 * RIVER_W) / m);
    c.fillStyle = 'rgb(150,146,136)';
    c.fillRect(v.wx(x - hw - 1.2), v.wy(ry - hl), (2 * hw + 2.4) / m, (2 * hl) / m);
    c.fillStyle = L.rgba(ASPHALT);
    c.fillRect(v.wx(x - hw), v.wy(ry - hl), (2 * hw) / m, (2 * hl) / m);
    // 13b: the bridge's street carries on across the open bank to the nearest block on each side (bridges used
    // to end in the grass)
    const has = (j) => block(k, j) || block(k + 1, j);
    let yn = null, ys = null;
    for (let j = 30; j >= 2 && yn == null; j--) if (rowSpan(j)[1] < ry - hl && has(j)) yn = rowSpan(j)[1] + 9;
    for (let j = 2; j <= 30 && ys == null; j++) if (rowSpan(j)[0] > ry + hl && has(j)) ys = rowSpan(j)[0] - 9;
    if (yn != null && ry - hl - yn < 400) c.fillRect(v.wx(x - hw), v.wy(yn), (2 * hw) / m, (ry - hl - yn) / m);
    if (ys != null && ys - (ry + hl) < 400) c.fillRect(v.wx(x - hw), v.wy(ry + hl), (2 * hw) / m, (ys - ry - hl) / m);
  }
  // bank trees
  if (m < 6) {
    const s = 1 / m;
    c.beginPath();
    for (let x = Math.floor(xa / 13) * 13; x < xb; x += 13) {
      for (const side of [-1, 1]) {
        const y = riverY(x) + side * (RIVER_W + 9 + 7 * hh(x, side)), r = 3 + 2 * hh(x, side, 3);
        if (pmod(x - 45, 90) < 20 || pmod(x - 45, 90) > 70) continue;
        c.moveTo(v.wx(x) + r * s, v.wy(y)); c.arc(v.wx(x), v.wy(y), Math.max(0, r * s), 0, TAU);
      }
    }
    c.fillStyle = 'rgb(58,82,52)'; c.fill();
  }
}

function drawMarkings(c, v, xa, xb) {
  const m = v.cam.mpp, s = 1 / m;
  c.save();
  c.fillStyle = 'rgba(226,224,214,0.62)';
  // lane dashes and the parking line
  for (const y of [-7.95, 7.95]) {
    for (let x = Math.floor(xa / 9) * 9; x < xb; x += 9) {
      const cc = pmod(x - 45, 90);
      if (cc < 10 || cc > 80) continue;
      c.fillRect(v.wx(x), v.wy(y) - 0.07 * s, 3 * s, 0.14 * s);
    }
  }
  for (const y of [-11.5, 11.5]) {
    for (let x = Math.floor(xa / 90) * 90 + 45; x < xb; x += 90) c.fillRect(v.wx(x + 10), v.wy(y) - 0.06 * s, 70 * s, 0.12 * s);
  }
  // (no zebra crossings on the boulevard: traffic flows through the junctions without ever crossing a
  //  pedestrian crossing; the walkers stay on sidewalks and the median)
  // parking bays
  c.fillStyle = 'rgba(226,224,214,0.3)';
  for (const y of [-14.8, 12.4]) {
    for (let x = Math.floor(xa / 6.3) * 6.3; x < xb; x += 6.3) {
      const cc = pmod(x - 45, 90);
      if (cc < 15 || cc > 75) continue;
      c.fillRect(v.wx(x), v.wy(y), 0.12 * s, 2.4 * s);
    }
  }
  // curb lines (a hint of a kerb shadow)
  c.fillStyle = 'rgba(0,0,0,0.22)';
  c.fillRect(v.wx(xa), v.wy(16), (xb - xa) * s, 0.25 * s);
  c.fillRect(v.wx(xa), v.wy(4.5), (xb - xa) * s, 0.25 * s);
  c.fillRect(v.wx(xa), v.wy(-16) - 0.25 * s, (xb - xa) * s, 0.25 * s);
  c.fillRect(v.wx(xa), v.wy(-4.5) - 0.25 * s, (xb - xa) * s, 0.25 * s);
  c.restore();
}

/** convex hull of a rect and the same rect offset by (ox, oy) — a prism's silhouette or its shadow */
function hull(c, x0, y0, x1, y1, ox, oy) {
  const A = [x0, y0], B = [x1, y0], C = [x1, y1], D = [x0, y1];
  const o = (p) => [p[0] + ox, p[1] + oy];
  let pts;
  if (ox >= 0 && oy >= 0) pts = [A, B, o(B), o(C), o(D), D];
  else if (ox >= 0) pts = [A, o(A), o(B), o(C), C, D];
  else if (oy >= 0) pts = [A, B, C, o(C), o(D), o(A)];
  else pts = [o(A), o(B), B, C, D, o(D)];
  c.moveTo(pts[0][0], pts[0][1]);
  for (let k = 1; k < 6; k++) c.lineTo(pts[k][0], pts[k][1]);
  c.closePath();
}
const SHADOW = [0.34, 0.21];          // shadow offset per metre of height (sun high, from the upper left)

function bldScreen(v, b, Hc) {
  const sx0 = v.wx(b.x0), sy0 = v.wy(b.y0), sx1 = v.wx(b.x1), sy1 = v.wy(b.y1);
  const f = b.h / Math.max(1, Hc - b.h);
  const ox = ((sx0 + sx1) / 2 - W / 2) * f, oy = ((sy0 + sy1) / 2 - H * v.cam.anchor) * f;
  return { sx0, sy0, sx1, sy1, ox, oy };
}

function drawBuildingsBatched(c, v, list) {
  const m = v.cam.mpp, Hc = m * FOC;
  const dk = L.clamp(L.invLerp(1.2, 3, m));
  c.beginPath();
  for (const bk of list) for (const b of bk.blds) hull(c, v.wx(b.x0), v.wy(b.y0), v.wx(b.x1), v.wy(b.y1), (b.h * SHADOW[0]) / m, (b.h * SHADOW[1]) / m);
  c.fillStyle = `rgba(10,14,20,${0.36 - 0.14 * dk})`; c.fill();
  drawParkTrees(c, v, list);
  for (let p = 0; p < ROOF.length; p++) {
    c.beginPath();
    for (const bk of list) for (const b of bk.blds) if (b.roof === p) { const s = bldScreen(v, b, Hc); hull(c, s.sx0, s.sy0, s.sx1, s.sy1, s.ox, s.oy); }
    const roof = L.mix(ROOF[p], [150, 146, 138], 0.4 * dk);
    c.fillStyle = L.rgba(L.mix(roof, [20, 24, 32], 0.45 * (1 - 0.4 * dk))); c.fill();
    c.beginPath();
    for (const bk of list) for (const b of bk.blds) if (b.roof === p) { const s = bldScreen(v, b, Hc); c.rect(s.sx0 + s.ox, s.sy0 + s.oy, s.sx1 - s.sx0, s.sy1 - s.sy0); }
    c.fillStyle = L.rgba(roof); c.fill();
  }
}

function drawBuilding(c, v, b, Hc, detK) {
  const m = v.cam.mpp, s = bldScreen(v, b, Hc);
  const { sx0, sy0, sx1, sy1, ox, oy } = s;
  const roof = ROOF[b.roof];
  // walls: y-facing wall in the hull colour, then the x-facing wall on top, then the roof
  c.beginPath(); hull(c, sx0, sy0, sx1, sy1, ox, oy);
  c.fillStyle = L.rgba(L.mix(roof, [16, 20, 30], oy >= 0 ? 0.36 : 0.5)); c.fill();
  c.beginPath();
  if (ox >= 0) { c.moveTo(sx0, sy0); c.lineTo(sx0, sy1); c.lineTo(sx0 + ox, sy1 + oy); c.lineTo(sx0 + ox, sy0 + oy); }
  else { c.moveTo(sx1, sy0); c.lineTo(sx1, sy1); c.lineTo(sx1 + ox, sy1 + oy); c.lineTo(sx1 + ox, sy0 + oy); }
  c.closePath();
  c.fillStyle = ox >= 0 ? L.rgba(L.mix(roof, [255, 236, 210], 0.05).map((q) => q * 0.84)) : L.rgba(L.mix(roof, [16, 22, 34], 0.56));
  c.fill();
  // floor lines on the walls
  if (detK > 0 && Math.hypot(ox, oy) > 14) {
    const n = Math.floor(b.h / 3.4);
    c.strokeStyle = `rgba(10,14,22,${0.22 * detK})`;
    c.lineWidth = 1;
    c.beginPath();
    for (let k = 1; k < n; k++) {
      const f = k / n;
      const ex = ox >= 0 ? sx0 : sx1;
      c.moveTo(ex + ox * f, sy0 + oy * f); c.lineTo(ex + ox * f, sy1 + oy * f);
      const ey = oy >= 0 ? sy0 : sy1;
      c.moveTo(sx0 + ox * f, ey + oy * f); c.lineTo(sx1 + ox * f, ey + oy * f);
    }
    c.stroke();
  }
  // roof + parapet
  const rx = sx0 + ox, ry = sy0 + oy, rw = sx1 - sx0, rh = sy1 - sy0;
  c.fillStyle = L.rgba(roof);
  c.fillRect(rx, ry, rw, rh);
  const pw = Math.max(0.6, 0.45 / m);
  c.strokeStyle = L.rgba(L.mix(roof, [255, 255, 255], 0.22));
  c.lineWidth = pw;
  c.strokeRect(rx + pw / 2, ry + pw / 2, rw - pw, rh - pw);
  c.fillStyle = 'rgba(0,0,0,0.13)';
  c.fillRect(rx + pw, ry + pw, rw - 2 * pw, Math.min(rh - 2 * pw, 0.9 / m));
  c.fillRect(rx + pw, ry + pw, Math.min(rw - 2 * pw, 0.9 / m), rh - 2 * pw);
  if (detK > 0) roofDetails(c, v, b, rx, ry, rw, rh, detK);
}

function roofDetails(c, v, b, rx, ry, rw, rh, k) {
  const m = v.cam.mpp, s = 1 / m, r = L.rng(b.det + 7);
  const W0 = (b.x1 - b.x0), H0 = (b.y1 - b.y0);
  if (W0 < 7 || H0 < 7) return;
  c.save();
  c.globalAlpha *= k;
  const at = (u, w) => 2 + u * Math.max(0, w - 4);
  if (r() < 0.32 && W0 > 14 && H0 > 12) {             // solar array
    const pw = W0 * 0.42, ph = H0 * 0.36, px = rx + at(r(), W0 - pw) * s, py = ry + at(r(), H0 - ph) * s;
    c.fillStyle = 'rgba(34,48,74,0.95)'; c.fillRect(px, py, pw * s, ph * s);
    c.strokeStyle = 'rgba(120,150,190,0.35)'; c.lineWidth = 1;
    c.beginPath();
    for (let x = 0; x < pw; x += 1.7) { c.moveTo(px + x * s, py); c.lineTo(px + x * s, py + ph * s); }
    for (let y = 0; y < ph; y += 1.1) { c.moveTo(px, py + y * s); c.lineTo(px + pw * s, py + y * s); }
    c.stroke();
  }
  if (r() < 0.6) {                                     // stair / lift housing
    const w = 3 + r() * 2, h = 2.5 + r() * 2, px = rx + at(r(), W0 - w) * s, py = ry + at(r(), H0 - h) * s;
    c.fillStyle = 'rgba(0,0,0,0.25)'; c.fillRect(px + 0.7 * s, py + 0.45 * s, w * s, h * s);
    c.fillStyle = L.rgba(L.mix(ROOF[b.roof], [255, 255, 255], 0.1)); c.fillRect(px, py, w * s, h * s);
  }
  const nac = Math.floor(r() * 5);
  for (let q = 0; q < nac; q++) {                      // AC units
    const px = rx + at(r(), W0 - 1.6) * s, py = ry + at(r(), H0 - 1.1) * s;
    c.fillStyle = 'rgba(0,0,0,0.25)'; c.fillRect(px + 0.35 * s, py + 0.25 * s, 1.6 * s, 1.1 * s);
    c.fillStyle = 'rgb(204,206,208)'; c.fillRect(px, py, 1.6 * s, 1.1 * s);
    c.fillStyle = 'rgba(90,96,100,0.8)'; c.beginPath(); c.arc(px + 0.8 * s, py + 0.55 * s, Math.max(0, 0.38 * s), 0, TAU); c.fill();
  }
  if (r() < 0.4) {                                     // water tank
    const px = rx + at(r(), W0 - 2.4) * s + 1.2 * s, py = ry + at(r(), H0 - 2.4) * s + 1.2 * s;
    c.fillStyle = 'rgba(0,0,0,0.28)'; c.beginPath(); c.arc(px + 0.6 * s, py + 0.4 * s, Math.max(0, 1.15 * s), 0, TAU); c.fill();
    c.fillStyle = 'rgb(116,122,126)'; c.beginPath(); c.arc(px, py, Math.max(0, 1.15 * s), 0, TAU); c.fill();
    c.fillStyle = 'rgba(255,255,255,0.25)'; c.beginPath(); c.arc(px - 0.3 * s, py - 0.3 * s, Math.max(0, 0.5 * s), 0, TAU); c.fill();
  }
  c.restore();
}

// ------------------------------------------------------------------ district (aerial) hierarchy
// From ~1.2 m/px up, the per-block grid would read as wallpaper. A per-block wash (extended over the minor side
// streets, so neighbouring blocks merge into superblocks) calms the roofs into a low-frequency backdrop: light
// in the dense core near x ≈ 300, heavier and greener toward the edges. Collector streets stay as soft mid-tone
// lines, the arterials as dark wide bands and the equator boulevard as the widest, darkest line of all.
const CORE_X = 300;
// collectors run in broken segments (3 blocks at a time), so the superblocks come in varied sizes
const collectorX = (k, j) => !wideX(k) && hh(k, Math.floor(j / 3), 77) < 0.3;          // cross street at x = 45 + 90 k
const collectorY = (n, i) => !wideY(n) && hh(n, Math.floor(i / 3), 78) < 0.3;          // row street after row n
const W_GREY = [128, 124, 114], W_GREEN = [86, 104, 70];
function drawDistrict(c, v, list) {
  const m = v.cam.mpp;
  // rooftops stay readable down to ~3.5 m/px (beat 4's district); the simplified block map only takes over beyond
  // 13b: the wash starts earlier (about a third strength at beat 4's 3.2 m/px) and is tinted per neighbourhood
  // (warm tile roofs, pale commercial roofs, mixed), so the district reads as quarters, not as one repeated tile
  const dk = Math.pow(L.clamp(L.invLerp(1.9, 8, m)), 0.75);
  if (dk <= 0) return;
  const NB = 6;
  const buckets = Array.from({ length: NB * 3 }, () => []), parks = [];
  for (const b of list) {
    if (b.kind === 'park') { parks.push(b); continue; }   // 13b: parks stay green under the wash
    const d = Math.hypot((((b.x0 + b.x1) / 2) - CORE_X) / 2100, ((b.y0 + b.y1) / 2) / 2600);
    const f = L.clamp(0.55 * L.smoothstep(L.clamp((d - 0.12) / 0.75)) + 0.45 * b.edge + 0.12 * (hh(Math.floor(b.i / 3), Math.floor(b.j / 2), 5) - 0.5));
    const zc = b.z < 0.36 ? 0 : b.z > 0.64 ? 2 : 1;
    buckets[zc * NB + Math.min(NB - 1, Math.floor(f * NB))].push(b);
  }
  // extend each block over the minor streets around it (to the street centre), not over collectors/arterials
  const ext = (b) => {
    const n = Math.abs(b.j);
    const east = !(wideX(b.i) || collectorX(b.i, b.j)), west = !(wideX(b.i - 1) || collectorX(b.i - 1, b.j));
    const outer = !(wideY(n) || collectorY(n, b.i)), inner = n > 1 && !(wideY(n - 1) || collectorY(n - 1, b.i));
    const top = b.j > 0 ? inner : outer, bot = b.j > 0 ? outer : inner;
    return [b.x0 - (west ? b.pad.l : 0), b.y0 - (top ? b.pad.t : 0), b.x1 + (east ? b.pad.r : 0), b.y1 + (bot ? b.pad.b : 0)];
  };
  c.save();
  const W_ZONE = [[156, 112, 88], W_GREY, [176, 174, 166]];
  buckets.forEach((bk, q) => {
    if (!bk.length) return;
    const f = ((q % NB) + 0.5) / NB;
    c.beginPath();
    for (const b of bk) { const [x0, y0, x1, y1] = ext(b); rectPath(c, v, x0, y0, x1, y1); }
    const col = L.mix(W_ZONE[Math.floor(q / NB)], W_GREEN, Math.pow(f, 1.3));
    c.fillStyle = L.rgba(col, dk * (0.52 + 0.36 * f));
    c.fill();
  });
  if (parks.length) {
    c.beginPath();
    for (const b of parks) rectPath(c, v, b.x0, b.y0, b.x1, b.y1);
    c.fillStyle = L.rgba([72, 98, 58], dk * 0.75);
    c.fill();
  }
  // collectors: a soft mid-tone line
  const COLL = [96, 96, 94], ART = [58, 61, 66];
  c.beginPath();
  for (const b of list) {
    const n = Math.abs(b.j);
    if (collectorX(b.i, b.j)) rectPath(c, v, b.x1 + b.pad.r - 4.5, b.y0 - b.pad.t, b.x1 + b.pad.r + 4.5, b.y1 + b.pad.b);
    if (collectorY(n, b.i)) { const yc = b.j > 0 ? b.y1 + b.pad.b : b.y0 - b.pad.t; rectPath(c, v, b.x0 - b.pad.l, yc - 4.5, b.x1 + b.pad.r, yc + 4.5); }
  }
  c.fillStyle = L.rgba(COLL, 0.75 * dk); c.fill();
  // arterials: dark, wide
  c.beginPath();
  for (const b of list) {
    const n = Math.abs(b.j);
    if (wideX(b.i)) rectPath(c, v, b.x1 + b.pad.r - 10, b.y0 - b.pad.t, b.x1 + b.pad.r + 10, b.y1 + b.pad.b);
    if (wideY(n)) { const yc = b.j > 0 ? b.y1 + b.pad.b : b.y0 - b.pad.t; rectPath(c, v, b.x0 - b.pad.l, yc - 10, b.x1 + b.pad.r, yc + 10); }
  }
  c.fillStyle = L.rgba(ART, 0.85 * dk); c.fill();
  // 13b: the diagonal avenue reads as an arterial too
  const asp = aveSpan(list);
  if (asp) { avePath(c, v, asp, 13); c.fillStyle = L.rgba(ART, 0.85 * dk); c.fill(); }
  // the equator boulevard: the widest, darkest line, a pale promenade down its middle
  c.beginPath();
  for (const b of list) if (b.j === 1 || (b.j === -1 && !block(b.i, 1))) rectPath(c, v, b.x0 - b.pad.l, -30, b.x1 + b.pad.r, 30);
  c.fillStyle = L.rgba([30, 33, 38], 0.96 * dk); c.fill();
  c.beginPath();
  for (const b of list) if (b.j === 1 || (b.j === -1 && !block(b.i, 1))) rectPath(c, v, b.x0 - b.pad.l, -5, b.x1 + b.pad.r, 5);
  c.fillStyle = L.rgba(PROM, 0.4 * dk); c.fill();
  c.restore();
}

// ------------------------------------------------------------------ trees
/** Canopy bend after the stop (metres east) for a tree at x with seed s. */
function bendOf(v, s) {
  const st = stopAt(v.tl);
  const u = v.gt - st;
  if (u <= 0) return { dx: 0, sx: 1, shrink: 1 };
  const kick = L.ease.outCubic(L.clamp(u / 0.18)) * (1 + 0.5 * Math.exp(-u * 3) * Math.sin(u * 30 + s * 6));
  const wk = windK(v.gt, v.tl);
  const gust = L.noise1(v.gt * 3 + s * 20, 7) * 0.25;
  const b = 0.55 * kick + 0.9 * wk + gust * wk;
  return { dx: b * 1.4, sx: 1 + 0.3 * b, shrink: 1 - 0.18 * L.clamp(b) };
}

function drawTree(c, v, t, a = 1) {
  const s = 1 / v.cam.mpp, x = v.wx(t.x), y = v.wy(t.y), r = t.r * s;
  if (r < 0.6) return;
  const bd = bendOf(v, t.s);
  c.save();
  c.globalAlpha *= a;
  c.fillStyle = 'rgba(8,14,10,0.34)';
  c.beginPath(); c.ellipse(x + 2.4 * s + bd.dx * s * 1.4, y + 1.6 * s, Math.max(0, r * bd.sx), Math.max(0, r * 0.95), 0, 0, TAU); c.fill();
  const cx = x + bd.dx * s, rr = r * bd.shrink;
  const g = L.mix([46, 70, 46], [70, 82, 50], t.s);
  c.fillStyle = L.rgba(g);
  c.beginPath(); c.ellipse(cx, y, Math.max(0, rr * bd.sx), Math.max(0, rr), 0, 0, TAU); c.fill();
  if (r > 4) {
    for (let k = 0; k < 5; k++) {
      const an = k * 1.26 + t.s * 6, d = rr * 0.42;
      c.fillStyle = L.rgba(L.mix(g, [118, 140, 84], 0.35 + 0.12 * (k % 2)));
      c.beginPath(); c.arc(cx + Math.cos(an) * d * bd.sx - rr * 0.12, y + Math.sin(an) * d - rr * 0.12, Math.max(0, rr * 0.45), 0, TAU); c.fill();
    }
    c.fillStyle = 'rgba(190,210,140,0.22)';
    c.beginPath(); c.arc(cx - rr * 0.3, y - rr * 0.32, Math.max(0, rr * 0.32), 0, TAU); c.fill();
  } else {
    c.fillStyle = L.rgba(L.mix(g, [130, 150, 90], 0.35));
    c.beginPath(); c.arc(cx - rr * 0.25, y - rr * 0.25, Math.max(0, rr * 0.55), 0, TAU); c.fill();
  }
  c.restore();
}

function drawParkTrees(c, v, list) {
  const m = v.cam.mpp, s = 1 / m;
  const bd = bendOf(v, 0.3);
  c.beginPath();
  for (const b of list) for (const t of b.trees) { c.moveTo(v.wx(t.x + 2.4) + (t.r * bd.sx + bd.dx * 1.4) * s, v.wy(t.y + 1.6)); c.ellipse(v.wx(t.x + 2.4 + bd.dx * 1.4), v.wy(t.y + 1.6), Math.max(0, t.r * bd.sx * s), Math.max(0, t.r * s), 0, 0, TAU); }
  c.fillStyle = 'rgba(8,14,10,0.3)'; c.fill();
  c.beginPath();
  for (const b of list) for (const t of b.trees) { c.moveTo(v.wx(t.x + bd.dx) + t.r * bd.sx * s, v.wy(t.y)); c.ellipse(v.wx(t.x + bd.dx), v.wy(t.y), Math.max(0, t.r * bd.sx * s), Math.max(0, t.r * s), 0, 0, TAU); }
  c.fillStyle = 'rgb(56,80,50)'; c.fill();
}

export function streetTrees(B) {
  const out = [];
  for (const y of [-17.6, 17.6]) {
    for (let x = Math.floor(B.x0 / 12) * 12 + 6; x < B.x1; x += 12) {
      const cc = pmod(x - 45, 90);
      if (cc < 12 || cc > 78) continue;
      if (!block(Math.round(x / 90), y > 0 ? 1 : -1)) continue;
      out.push({ x, y: y + (hh(x, y) - 0.5) * 0.4, r: 2.7 + hh(x, y, 2) * 0.9, s: hh(x, y, 3) });
    }
  }
  // the plaza's ring of trees
  for (let k = 0; k < 7; k++) { out.push({ x: -30 + k * 10, y: 26.8, r: 3.1, s: hh(k, 1) }); out.push({ x: -30 + k * 10, y: 98.5, r: 3.1, s: hh(k, 2) }); }
  for (let k = 0; k < 5; k++) { out.push({ x: -31.5, y: 38 + k * 12, r: 3, s: hh(k, 4) }); if (k < 2) out.push({ x: 31.5, y: 38 + k * 12, r: 3, s: hh(k, 5) }); }
  return out.filter((t) => t.x > B.x0 - 6 && t.x < B.x1 + 6 && t.y > B.y0 - 6 && t.y < B.y1 + 6);
}

// ------------------------------------------------------------------ plaza + fountain
const KIOSK = { x0: -26.5, y0: 85.5, x1: -19.5, y1: 92.5, h: 3.6, roof: 3, det: 1 };   // 13b: clear of the tree ring
function drawPlaza(c, v) {
  const m = v.cam.mpp, s = 1 / m;
  const P = PLAZA;
  c.fillStyle = L.rgba(PAVE);
  c.fillRect(v.wx(P.x0), v.wy(P.y0), (P.x1 - P.x0) * s, (P.y1 - P.y0) * s);
  if (m < 0.8) {
    c.strokeStyle = 'rgba(120,110,96,0.22)';
    c.lineWidth = 1;
    c.beginPath();
    for (let x = P.x0 + 6; x < P.x1; x += 6) { c.moveTo(v.wx(x), v.wy(P.y0)); c.lineTo(v.wx(x), v.wy(P.y1)); }
    for (let y = P.y0 + 6; y < P.y1; y += 6) { c.moveTo(v.wx(P.x0), v.wy(y)); c.lineTo(v.wx(P.x1), v.wy(y)); }
    c.stroke();
  }
  // circular paving around the fountain
  const fx = v.wx(FOUNTAIN.x), fy = v.wy(FOUNTAIN.y);
  c.fillStyle = 'rgba(196,188,170,1)';
  c.beginPath(); c.arc(fx, fy, Math.max(0, 16 * s), 0, TAU); c.fill();
  c.strokeStyle = 'rgba(140,128,110,0.5)';
  c.lineWidth = Math.max(1, 0.25 * s);
  for (const rr of [10.5, 13.5]) { c.beginPath(); c.arc(fx, fy, Math.max(0, rr * s), 0, TAU); c.stroke(); }
  // benches (bolted down) on the ring
  c.fillStyle = 'rgba(94,72,54,0.95)';
  for (let k = 0; k < 6; k++) {
    const a = k * (TAU / 6) + 0.5;
    c.save(); c.translate(v.wx(Math.cos(a) * 15), v.wy(FOUNTAIN.y + Math.sin(a) * 15)); c.rotate(a + Math.PI / 2);
    c.fillRect(-1 * s, -0.25 * s, 2 * s, 0.5 * s); c.restore();
  }
  // kiosk (bolted)
  const kb = KIOSK;
  c.fillStyle = 'rgba(10,14,20,0.32)';
  c.beginPath(); hull(c, v.wx(kb.x0), v.wy(kb.y0), v.wx(kb.x1), v.wy(kb.y1), kb.h * SHADOW[0] * s, kb.h * SHADOW[1] * s); c.fill();
  drawBuilding(c, v, kb, m * FOC, 0);
}

function drawFountain(c, v) {
  const s = 1 / v.cam.mpp, fx = v.wx(FOUNTAIN.x), fy = v.wy(FOUNTAIN.y), R = FOUNTAIN.r * s;
  const st = stopAt(v.tl), u = v.gt - st;
  const drain = u > 0 ? L.ease.outCubic(L.clamp(u / 0.5)) : 0;
  c.save();
  c.fillStyle = 'rgba(0,0,0,0.3)';
  c.beginPath(); c.arc(fx + 0.5 * s, fy + 0.35 * s, Math.max(0, R + 0.6 * s), 0, TAU); c.fill();
  c.fillStyle = 'rgb(206,198,182)';
  c.beginPath(); c.arc(fx, fy, Math.max(0, R + 0.6 * s), 0, TAU); c.fill();
  // basin floor, then the water (sloshes east and drains at the stop)
  c.fillStyle = 'rgb(84,104,108)';
  c.beginPath(); c.arc(fx, fy, Math.max(0, R), 0, TAU); c.fill();
  c.save();
  c.beginPath(); c.arc(fx, fy, Math.max(0, R), 0, TAU); c.clip();
  // 13b: most of the water leaves east with the stop (s03 draws the sheet and the wet trail); what is left
  // sloshes against the basin's east rim and settles there as a crescent
  const wa = 1 - 0.62 * drain;
  if (wa > 0) {
    const g = c.createRadialGradient(fx - R * 0.3, fy - R * 0.3, R * 0.1, fx, fy, R);
    g.addColorStop(0, `rgba(120,196,210,${wa})`); g.addColorStop(1, `rgba(46,120,140,${wa})`);
    c.fillStyle = g;
    c.beginPath(); c.arc(fx + drain * R * 1.05, fy, Math.max(0, R), 0, TAU); c.fill();
    // ripples
    c.strokeStyle = `rgba(230,250,255,${0.35 * wa})`;
    c.lineWidth = Math.max(1, 0.12 * s);
    for (let k = 0; k < 3; k++) {
      const ph = pmod(v.gt * 0.55 + k / 3, 1);
      c.globalAlpha = (1 - ph) * wa * (1 - drain);
      c.beginPath(); c.arc(fx, fy, Math.max(0, (1.2 + ph * 5.4) * s), 0, TAU); c.stroke();
    }
    c.globalAlpha = 1;
  }
  c.restore();
  // jet: a spray rosette at the centre
  if (u < 0.15) {
    const a = 1 - L.clamp(u / 0.15);
    for (let k = 0; k < 14; k++) {
      const an = k * 0.449 + v.gt * 0.7, rr = (0.6 + 0.9 * (0.5 + 0.5 * Math.sin(v.gt * 7 + k * 1.3))) * s;
      c.fillStyle = `rgba(240,252,255,${0.55 * a})`;
      c.beginPath(); c.arc(fx + Math.cos(an) * rr, fy + Math.sin(an) * rr, Math.max(0, 0.18 * s), 0, TAU); c.fill();
    }
    c.fillStyle = `rgba(250,255,255,${0.9 * a})`;
    c.beginPath(); c.arc(fx, fy, Math.max(0, 0.45 * s), 0, TAU); c.fill();
  }
  c.restore();
}

// street lamps along the kerbs (bolted): a pole dot, an arm over the road and a long thin shadow
function drawLamps(c, v, B) {
  const s = 1 / v.cam.mpp;
  c.save();
  for (const y of [-16.4, 16.4]) {
    for (let x = Math.floor(B.x0 / 30) * 30 + 15; x < B.x1; x += 30) {
      const cc = pmod(x - 45, 90);
      if (cc < 14 || cc > 76) continue;
      const sx = v.wx(x), sy = v.wy(y), dir = y < 0 ? 1 : -1;
      c.strokeStyle = 'rgba(8,10,14,0.3)'; c.lineWidth = Math.max(1, 0.18 * s);
      c.beginPath(); c.moveTo(sx, sy); c.lineTo(sx + 3.1 * s, sy + 1.9 * s); c.stroke();
      c.strokeStyle = 'rgba(70,74,78,0.95)'; c.lineWidth = Math.max(1, 0.14 * s);
      c.beginPath(); c.moveTo(sx, sy); c.lineTo(sx, sy + dir * 2.4 * s); c.stroke();
      c.fillStyle = 'rgb(214,214,200)';
      c.fillRect(sx - 0.25 * s, sy + dir * 2.4 * s - 0.15 * s, 0.5 * s, 0.3 * s);
      c.fillStyle = 'rgb(60,64,68)';
      c.beginPath(); c.arc(sx, sy, Math.max(0, 0.2 * s), 0, TAU); c.fill();
    }
  }
  c.restore();
}

// planters on the promenade (bolted)
function drawPlanters(c, v, B) {
  const s = 1 / v.cam.mpp;
  for (let x = Math.floor(B.x0 / 15) * 15 + 7.5; x < B.x1; x += 15) {
    if (Math.abs(x - YOU.x) < 6) continue;
    const cc = pmod(x - 45, 90);
    if (cc < 14 || cc > 76) continue;
    const sx = v.wx(x), sy = v.wy(-3.1);
    c.fillStyle = 'rgba(0,0,0,0.25)'; c.fillRect(sx - 0.9 * s + 0.4 * s, sy - 0.6 * s + 0.3 * s, 1.8 * s, 1.2 * s);
    c.fillStyle = 'rgb(120,112,100)'; c.fillRect(sx - 0.9 * s, sy - 0.6 * s, 1.8 * s, 1.2 * s);
    c.fillStyle = 'rgb(76,104,62)'; c.beginPath(); c.arc(sx, sy, Math.max(0, 0.55 * s), 0, TAU); c.fill();
  }
}

/** 13b: erase every building in view (walls + roof silhouette, with the roof lean) from layer c: s03 paints its
 *  ground-level streaks and dust into a layer and cuts the buildings out, so nothing at street level is ever
 *  painted over a rooftop. */
export function cutBuildings(c, v) {
  const m = v.cam.mpp, Hc = m * FOC;
  const { list } = visibleBlocks(v, 70);
  c.save();
  c.globalCompositeOperation = 'destination-out';
  c.fillStyle = '#000';
  const one = (b) => { const s = bldScreen(v, b, Hc); c.beginPath(); hull(c, s.sx0, s.sy0, s.sx1, s.sy1, s.ox, s.oy); c.fill(); };
  for (const bk of list) for (const b of bk.blds) one(b);
  if (list.some((b) => b.kind === 'plaza')) one(KIOSK);
  c.restore();
}

/** Draw a loose object at its own position (used pre-stop here, and by s03 in flight). */
export function drawLoose(c, v, o, x, y, a = 1, ang = o.ang, spin = 0) {
  if (o.kind === 'car') drawCar(c, v, o, x, y, a, ang);
  else if (o.kind === 'person') drawPerson(c, v, o, x, y, a, ang);
  else drawProp(c, v, o, x, y, a, spin);
}

/** Far LOD: the district as one soft urban haze (no per-block pixels) while the camera is far out. */
function drawCityHaze(c, v, k) {
  const m = v.cam.mpp;
  const kh = (1 - k) * L.clamp(L.invLerp(260, 40, m)) * L.clamp(L.invLerp(4, 7, m));
  if (kh <= 0.01) return;
  // 13b: a cluster of soft lobes along the city's real footprint (it reaches out along the boulevard and the
  // river), muted urban grey-brown, instead of one pale disc
  const x = v.wx(0), y = v.wy(0), R = 3600 / m;
  if (x + R < 0 || x - R > L.W || y + R < 0 || y - R > L.H) return;
  const LOBES = [[300, 0, 1900, 1], [-900, -300, 1300, 0.8], [1500, 400, 1400, 0.85], [2300, -200, 900, 0.6], [-1700, 200, 800, 0.5],
    [200, -1500, 1200, 0.7], [600, 1500, 1100, 0.7], [-500, 2300, 700, 0.45], [1100, -2400, 800, 0.5]];
  c.save();
  for (const [lx, ly, lr, la] of LOBES) {
    const sx = v.wx(lx), sy = v.wy(ly), r = lr / m;
    const g = c.createRadialGradient(sx, sy, 0, sx, sy, Math.max(1, r));
    g.addColorStop(0, `rgba(146,138,124,${0.4 * la * kh})`);
    g.addColorStop(0.6, `rgba(140,134,120,${0.22 * la * kh})`);
    g.addColorStop(1, 'rgba(136,130,118,0)');
    c.fillStyle = g;
    c.beginPath(); c.arc(sx, sy, Math.max(0, r), 0, TAU); c.fill();
  }
  c.restore();
}

function drawCity(c, v) {
  const k = cityK(v);
  drawCityHaze(c, v, k);
  if (k <= 0) return;
  const m = v.cam.mpp, street = m < 0.9;
  const { B, list } = visibleBlocks(v, street ? 70 : 30);
  c.save();
  c.globalAlpha = k;
  drawGround(c, v, list, B);
  const plazaOn = list.some((b) => b.kind === 'plaza');
  if (plazaOn) drawPlaza(c, v);
  const detK = L.clamp(L.invLerp(0.85, 0.45, m));
  if (street) {
    drawPlanters(c, v, B);
    if (plazaOn) drawFountain(c, v);
    // shadows first, then buildings by height (taller ones lean over the rest)
    c.beginPath();
    for (const bk of list) for (const b of bk.blds) hull(c, v.wx(b.x0), v.wy(b.y0), v.wx(b.x1), v.wy(b.y1), (b.h * SHADOW[0]) / m, (b.h * SHADOW[1]) / m);
    c.fillStyle = 'rgba(10,14,20,0.34)'; c.fill();
    drawParkTrees(c, v, list);
    // loose objects ride under the trees but over the ground
    const st = stopAt(v.tl);
    if (v.gt < st) {
      const ka = L.clamp(L.invLerp(1.0, 0.55, m));
      if (ka > 0) {
        const ORD = { person: 0, car: 2 };    // a person is never painted over a car
        const vis = looseAt(v.gt).filter((o) => o.x > B.x0 && o.x < B.x1 && o.y > B.y0 && o.y < B.y1)
          .sort((p, q) => (ORD[p.kind] ?? 1) - (ORD[q.kind] ?? 1));
        for (const o of vis) drawLoose(c, v, o, o.x, o.y, ka);
      }
    }
    const all = [];
    for (const bk of list) for (const b of bk.blds) all.push(b);
    all.sort((p, q) => p.h - q.h);
    const Hc = m * FOC;
    for (const b of all) drawBuilding(c, v, b, Hc, detK);
    drawLamps(c, v, B);
    const tk = L.clamp(L.invLerp(1.6, 0.9, m));
    for (const t of streetTrees(B)) drawTree(c, v, t, tk);
  } else {
    drawBuildingsBatched(c, v, list);
    const tk = L.clamp(L.invLerp(2.2, 1.0, m));
    if (tk > 0) for (const t of streetTrees(B)) drawTree(c, v, t, tk);
    drawDistrict(c, v, list);
  }
  c.restore();
}

// ------------------------------------------------------------------ beat-1 timing
function times(tl) {
  const ph = tl.lines[1].phrases ?? [tl.lines[1]];
  return {
    moving: wordTime(tl, 1, /moving/i),
    num: numTime(tl),   // 13b: on the voiced "1,670" (the HUD readout lands with it)
    end: ph[ph.length - 1].end,
  };
}

export default {
  beat: 1,
  chapter: { num: '01', title: 'The equator', sub: '0° latitude · Ecuador' },
  captions: true,
  layer: 0,
  // beat 1 starts at 3.10 s: dive 3.1–5.7, "moving" 5.03, "one thousand…" 5.92
  cues(d) {
    return [
      { t: 0.12, name: 'dive', gain: 0.4, pitch: 0.9 },
      { t: 0.2, name: 'blip', gain: 0.16, pitch: 1.4 },     // reticle locks on
      { t: 1.32, name: 'swish', gain: 0.22, pitch: 0.8 },   // the city resolves under the zoom
      { t: 1.85, name: 'bloom', gain: 0.2, pitch: 0.9 },    // ring on you
      { t: 1.98, name: 'whoosh', gain: 0.3, pitch: 1.3 },   // the east vector draws in
      { t: 3.0, name: 'ping', gain: 0.28, pitch: 1.1 },     // 1,670 km/h (13b: label + readout land together)
    ];
  },
  drawWorld(ctx, v) {
    if (v.cam.mpp > 260) return;
    drawCity(ctx, v);
  },
  drawOverlay(ctx, v) {
    const T = times(v.tl), gt = v.gt, acc = v.accent;
    const yx = v.wx(YOU.x), yy = v.wy(YOU.y);
    // 1) the dive: a reticle locks onto you (from the globe down to the street)
    const kr = L.ease.outCubic(L.prog(gt, v.tl.scenes[1].start + 0.15, 0.4)) * (1 - L.ease.inCubic(L.prog(gt - OFF, 5.0, 0.45)));
    if (kr > 0) {
      ctx.save();
      ctx.globalAlpha = v.k * kr;
      ctx.strokeStyle = L.rgba(acc, 0.9);
      ctx.lineWidth = 2;
      const rr = 58 - 14 * L.ease.inOutCubic(L.prog(gt - OFF, 3.4, 1.4));
      const rot = gt * 0.6;
      for (let q = 0; q < 4; q++) {
        ctx.beginPath(); ctx.arc(yx, yy, Math.max(0, rr), rot + q * (TAU / 4) + 0.25, rot + (q + 1) * (TAU / 4) - 0.25); ctx.stroke();
        const a = rot + q * (TAU / 4);
        ctx.beginPath(); ctx.moveTo(yx + Math.cos(a) * (rr + 8), yy + Math.sin(a) * (rr + 8)); ctx.lineTo(yx + Math.cos(a) * (rr + 22), yy + Math.sin(a) * (rr + 22)); ctx.stroke();
      }
      ctx.fillStyle = L.rgba(acc);
      ctx.beginPath(); ctx.arc(yx, yy, 4, 0, TAU); ctx.fill();
      ctx.restore();
    }
    // 2) you: a calm ring on the person, from the landing
    const ky = L.ease.outCubic(L.prog(gt - OFF, 4.95, 0.5));
    if (ky > 0) {
      ctx.save();
      ctx.globalAlpha = v.k * ky;
      const pr = 22 / Math.max(1, v.cam.mpp / 0.14) ** 0.3;
      ctx.strokeStyle = L.rgba(acc, 0.95);
      ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.arc(yx, yy, Math.max(0, pr * (0.6 + 0.4 * ky)), 0, TAU); ctx.stroke();
      const ph = pmod(gt * 0.7, 1);
      ctx.globalAlpha = v.k * ky * (1 - ph) * 0.6;
      ctx.beginPath(); ctx.arc(yx, yy, Math.max(0, pr + ph * 26), 0, TAU); ctx.stroke();
      // a small tracked tag: YOU
      const kt = L.ease.outCubic(L.prog(gt - OFF, 5.15, 0.5));
      ctx.globalAlpha = v.k * kt;
      ctx.font = L.font(26, 700, L.FONT.body);   // 13b: ≥ 26 px
      ctx.fillStyle = 'rgba(6,10,16,0.55)';
      L.trackedText(ctx, 'YOU', yx + 1, yy - pr - 15 - 6 * (1 - kt) + 1, 5, 'center');
      ctx.fillStyle = L.rgba(acc);
      L.trackedText(ctx, 'YOU', yx, yy - pr - 15 - 6 * (1 - kt), 5, 'center');
      ctx.restore();
    }
    // 3) the east vector, drawn on "moving", with chevrons flowing east
    const kv = L.prog(gt, T.moving + 0.05, 0.75);
    if (kv > 0) {
      const x0 = yx + 30, len = Math.min(900, W - 150) - x0;
      drawVector(ctx, x0, yy, len, kv * v.k, { w: 10, flow: gt, alpha: 1 });
    }
    // 4) the number lands with the VO ("one thousand six hundred seventy")
    const kl = L.prog(gt, T.num - 0.1, 0.6) * v.k;   // same curve as the HUD readout (env drawHud)
    if (kl > 0) {
      scrim(ctx, 64, 420, 640, 240, kl);
      L.bigLabel(ctx, { x: 96, y: 560, big: '1,670 km/h', small: '1,040 mph · at the equator', k: kl, accent: acc, size: 112 });
    }
  },
};

/** soft dark backing for a label over the busy city */
export function scrim(c, x, y, w, h, k) {
  if (k <= 0) return;
  c.save();
  c.globalAlpha *= L.clamp(k) * 0.6;
  c.translate(x + w * 0.42, y + h / 2);
  c.scale(1, 0.45);
  const g = c.createRadialGradient(0, 0, 10, 0, 0, w * 0.9);
  g.addColorStop(0, 'rgba(6,10,16,0.6)');
  g.addColorStop(0.55, 'rgba(6,10,16,0.32)');
  g.addColorStop(1, 'rgba(6,10,16,0)');
  c.fillStyle = g;
  c.fillRect(-w, -w, w * 2, w * 2);
  c.restore();
}
