// Camera for "The Man Who Survived Two Atomic Bombs" (Zoom Out 32, Hidden History, ≈ 64.7 s).
//
// ONE CONTINUOUS WORLD: a real-coastline map of western Japan (earth.js, drawn by env.js), seen straight down,
// north up. World units are KILOMETRES on a local plane around REF (x east, y SOUTH = screen down); env.js draws the
// Earth as an orthographic globe centred under the camera with r = 6371 / mpp px, and places every pin with
// project(), so the map and the pins always agree.
//
// SHOTS (every start comes from build/timeline.json: B = beat start, PH = phrase start, W = a word's real start):
//   hook    B0          both cities, Hiroshima upper right, Nagasaki lower left, under the headline
//   intro   B1          the same map, slow push (calendar + ID card above)
//   trip    W(1,1,8)    "business trip": a push toward Hiroshima while the marker travels there
//   hiro    B2          close on Hiroshima (ground zero at screen 300, 1000): clock, flash, 3 KM lens
//   route   B3          pull back (tight: Kyushu + western Honshu): the railway Hiroshima → Shimonoseki → Kokura → Tosu → Nagasaki
//   naga    B4          push toward Nagasaki, under the office card
//   nagaGZ  B5          close on Nagasaki (ground zero at screen 300, 1000): clock, second flash, lens
//   both    PH(6,0)     pull back: both cities, low in frame (cards above)
//   ask     B7          wider still, under the question card
import * as L from '../../../engine/runtime/lib.js';

const DEG = Math.PI / 180;
export const REF = { lat: 33.6, lon: 131.2 };
export const KX = 111.32 * Math.cos(REF.lat * DEG), KY = 110.9;   // km per degree (lon, lat) at REF
export const toW = (lat, lon) => ({ x: (lon - REF.lon) * KX, y: -(lat - REF.lat) * KY });
export const toLL = (x, y) => ({ lat: REF.lat - y / KY, lon: REF.lon + x / KX });

// ground zero of each bomb (script.md: about 3 km from Yamaguchi both times)
export const HIRO = { lat: 34.3955, lon: 132.4536 };
export const NAGA = { lat: 32.7735, lon: 129.8633 };

export const ANCHOR = 0.5, AY = L.H * ANCHOR;

// ------------------------------------------------------------------ timing helpers (all from the timeline)
export const B = (tl, i, dt = 0) => tl.scenes[i].start + dt;
export const BE = (tl, i, dt = 0) => tl.scenes[i].end + dt;
export const PH = (tl, i, j, dt = 0) => tl.lines[i].phrases[j].start + dt;
export const PE = (tl, i, j, dt = 0) => tl.lines[i].phrases[j].end + dt;
/** real start of word k of phrase j of line i */
export const W = (tl, i, j, k, dt = 0) => tl.lines[i].phrases[j].words[k][0] + dt;

/** camera that puts geo point p at screen (sx, sy) with mpp km/px */
function put(p, sx, sy, mpp) {
  const w = toW(p.lat, p.lon);
  return { x: w.x - (sx - L.W / 2) * mpp, y: w.y - (sy - AY) * mpp, mpp };
}
const MID = { lat: (HIRO.lat + NAGA.lat) / 2, lon: (HIRO.lon + NAGA.lon) / 2 };

export const SHOTS = [
  { name: 'hook', at: (tl) => B(tl, 0), travel: 0, push: 0.95, ...put(MID, 545, 1135, 0.56) },
  { name: 'intro', at: (tl) => B(tl, 1), travel: 1.2, push: 0.97, ...put(MID, 545, 1100, 0.56) },
  { name: 'trip', at: (tl) => W(tl, 1, 1, 7, -0.6), travel: 1.6, push: 0.98, ...put(HIRO, 740, 990, 0.47) },
  { name: 'hiro', at: (tl) => B(tl, 2, -0.1), travel: 1.5, push: 0.95, ...put(HIRO, 300, 1010, 0.24) },
  { name: 'route', at: (tl) => B(tl, 3, -0.1), travel: 1.3, push: 0.97, ...put(HIRO, 885, 680, 0.40) },   // Kyushu + western Honshu
  { name: 'naga', at: (tl) => B(tl, 4, -0.1), travel: 1.6, push: 0.97, ...put(NAGA, 540, 980, 0.30) },
  { name: 'nagaGZ', at: (tl) => B(tl, 5, -0.1), travel: 1.2, push: 0.95, ...put(NAGA, 300, 1010, 0.24) },
  { name: 'both', at: (tl) => B(tl, 6, 0.1), travel: 1.8, push: 0.97, ...put(MID, 545, 1215, 0.80) },
  { name: 'ask', at: (tl) => B(tl, 7, -0.05), travel: 1.4, push: 0.98, ...put(MID, 545, 1250, 0.66) },
];

const cache = new WeakMap();
function starts(tl) {
  let s = cache.get(tl);
  if (!s) { s = SHOTS.map((k) => k.at(tl)); cache.set(tl, s); }
  return s;
}
/** hold state of shot i at time gt (its slow push after the travel) */
function hold(i, gt, tl) {
  const st = starts(tl), s = SHOTS[i];
  const t0 = st[i] + s.travel, t1 = i + 1 < SHOTS.length ? st[i + 1] : tl.total;
  const k = L.ease.inOutCubic(L.prog(gt, i === 0 ? st[0] : t0, Math.max(0.5, t1 - (i === 0 ? st[0] : t0))));
  return { x: s.x, y: s.y, mpp: s.mpp * L.lerp(1, s.push, k) };
}
export function shotIndex(gt, tl) {
  const st = starts(tl);
  let i = 0;
  st.forEach((a, j) => { if (a <= gt) i = j; });
  return i;
}
export const shotStart = (name, tl) => starts(tl)[SHOTS.findIndex((s) => s.name === name)];

function base(gt, tl) {
  const i = shotIndex(gt, tl);
  if (i === 0) return hold(0, gt, tl);
  const st = starts(tl);
  const a = hold(i - 1, st[i], tl), b = hold(i, gt, tl);
  const k = L.ease.inOutCubic(L.prog(gt, st[i], SHOTS[i].travel));
  return { x: L.lerp(a.x, b.x, k), y: L.lerp(a.y, b.y, k), mpp: Math.exp(L.lerp(Math.log(a.mpp), Math.log(b.mpp), k)) };
}

export function at(gt, tl) {
  const c = base(gt, tl);
  c.x += L.noise1(gt * 0.3, 1) * 2.5 * c.mpp;
  c.y += L.noise1(gt * 0.27, 2) * 2.5 * c.mpp;
  c.anchor = ANCHOR;
  return c;
}
