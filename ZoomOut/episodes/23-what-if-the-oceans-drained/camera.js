// Camera for "What If the Oceans Drained?" (≈78 s, hook format): ONE continuous journey over the real, rotating globe
// while the sea level drops from 0 to −10,935 m. Owned by the orchestrator — builders: read, don't edit (put needs in
// "sharedRequests").
//
// WORLD (metres): a SIDE VIEW of the planet, exactly like episode 14. The globe is a sphere of radius R_EARTH centred at
// (0, +R_EARTH), so its top limb is (0, 0). What sits on the sphere is set by the globe ORIENTATION, a function of time
// (`view(gt, tl)`): an orthographic projection whose FACE CENTRE is the world point (0, R_EARTH). A place at the face
// centre is drawn top-down there. Never place things with fixed world coordinates: use env.js `project`/`geoPath`.
//
// SHOTS: one or more camera keys per beat. A shot starts at a time taken from the voice timeline (a beat or a phrase
// start) and travels from wherever the previous shot is at that instant to its key: {x, y, mpp} and a globe orientation
// `view`. Pan AND rotation progress are weighted by the zoom (they happen while the camera is zoomed out), so the
// target stays near the centre while the planet turns underneath. `peak` adds a mid-travel zoom-out for long hops,
// `spin` (deg/s) keeps the planet turning while held (negative = the face centre drifts EAST), `push` is the hold zoom.
import * as L from '../../../engine/runtime/lib.js';

export const R_EARTH = 6.371e6;
const DEG = Math.PI / 180;

// ------------------------------------------------------------------ places (lat, lon in degrees)
export const PLACES = {
  pacific: { lat: 22, lon: -162 },          // hook: the water hemisphere
  bering: { lat: 65.8, lon: -168.9 },       // Bering Strait (Cape Dezhnev ↔ Cape Prince of Wales)
  alaska: { lat: 65.6, lon: -168.1 },       // Cape Prince of Wales
  russia: { lat: 66.08, lon: -169.7 },      // Cape Dezhnev, Chukotka
  northSea: { lat: 54.2, lon: 2.6 },        // framing centre: Britain, Doggerland, the Low Countries, Denmark
  doggerBank: { lat: 54.75, lon: 2.2 },
  dover: { lat: 51.0, lon: 1.45 },
  beringia: { lat: 64.3, lon: -171 },       // framing centre for the ice-age land bridge
  atlantic: { lat: 8, lon: -33 },           // the Mid-Atlantic Ridge face-on
  hawaii: { lat: 19.6, lon: -155.6 },
  maunaKea: { lat: 19.82, lon: -155.47 },
  mariana: { lat: 13.2, lon: 144.2 },       // framing centre: the southern Mariana Trench arc
  challenger: { lat: 11.35, lon: 142.45 },  // the deepest cell of the data grid (Challenger Deep ≈ 11.37 N, 142.59 E)
};

// ------------------------------------------------------------------ globe orientation
// A view = rotation matrix rows {r, u, c} (unit vectors in Earth-fixed xyz): screen-right, screen-up, toward viewer.
const vec = (lat, lon) => [Math.cos(lat * DEG) * Math.cos(lon * DEG), Math.cos(lat * DEG) * Math.sin(lon * DEG), Math.sin(lat * DEG)];
/** Orthographic view centred on (lat, lon), north up, rotated by roll degrees (positive = clockwise on screen). */
export function latLonView(lat, lon, roll = 0) {
  const p = lat * DEG, l = lon * DEG, q = roll * DEG;
  const c = vec(lat, lon);
  const n = [-Math.sin(p) * Math.cos(l), -Math.sin(p) * Math.sin(l), Math.cos(p)];
  const e = [-Math.sin(l), Math.cos(l), 0];
  const r = e.map((v, i) => v * Math.cos(q) + n[i] * Math.sin(q));
  const u = e.map((v, i) => -v * Math.sin(q) + n[i] * Math.cos(q));
  return { r, u, c };
}
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
function slerpView(a, b, k) {
  if (k <= 0) return a;
  if (k >= 1) return b;
  const qa = toQuat(a); let qb = toQuat(b);
  let d = qa[0] * qb[0] + qa[1] * qb[1] + qa[2] * qb[2] + qa[3] * qb[3];
  if (d < 0) { qb = qb.map((v) => -v); d = -d; }
  let q;
  if (d > 0.9995) q = qa.map((v, i) => v + (qb[i] - v) * k);
  else {
    const th = Math.acos(d), s = Math.sin(th);
    q = qa.map((v, i) => (v * Math.sin((1 - k) * th) + qb[i] * Math.sin(k * th)) / s);
  }
  const n = Math.hypot(...q);
  return fromQuat(q.map((v) => v / n));
}

/** World position (metres) of (lat, lon, elevation) under a view. z > 0 = on the visible hemisphere. */
export function worldOf(view, lat, lon, elev = 0) {
  const p = vec(lat, lon), s = R_EARTH + elev;
  const X = p[0] * view.r[0] + p[1] * view.r[1] + p[2] * view.r[2];
  const Y = p[0] * view.u[0] + p[1] * view.u[1] + p[2] * view.u[2];
  const Z = p[0] * view.c[0] + p[1] * view.c[1] + p[2] * view.c[2];
  return { x: s * X, y: R_EARTH - s * Y, z: Z };
}

// ------------------------------------------------------------------ views used by the film
export const CLASSROOM_TILT = 23.4;              // a classroom globe's axis leans 23.4° from vertical
export const VIEWS = {
  pacific: latLonView(PLACES.pacific.lat, PLACES.pacific.lon),
  bering: latLonView(PLACES.bering.lat, PLACES.bering.lon),
  beringWalk: latLonView(65.1, -168.8),          // the walk across the dry strait, closer
  northSea: latLonView(PLACES.northSea.lat, PLACES.northSea.lon),
  arctic: latLonView(90, 0),                     // North Pole top-down: the North Sea at the bottom, Beringia at the top
  beringia: latLonView(PLACES.beringia.lat, PLACES.beringia.lon),
  atlantic: latLonView(PLACES.atlantic.lat, PLACES.atlantic.lon),
  south: latLonView(-58, -12),                   // oblique from the south: the ridge ring around Antarctica in one view
  abyss: latLonView(32, -42),                    // the North Atlantic basins: abyssal plains either side of the ridge
  hawaii: latLonView(PLACES.hawaii.lat, PLACES.hawaii.lon),
  mariana: latLonView(PLACES.mariana.lat, PLACES.mariana.lon),
  challenger: latLonView(PLACES.challenger.lat, PLACES.challenger.lon),
  dry: latLonView(6, -172),                      // the dry Pacific basin, whole planet
  classroom: latLonView(12, -150, CLASSROOM_TILT),
  blue: latLonView(8, -160),                     // the blue planet again
};
const FACE = { x: 0, y: R_EARTH };                // the face centre in world coordinates
/** World point that puts the face centre dx, dy screen pixels from the screen anchor at this mpp. */
const off = (dx, dy, mpp) => ({ x: FACE.x - dx * mpp, y: FACE.y - dy * mpp });

// ------------------------------------------------------------------ shots
// at(tl) → start time; key {x, y, mpp}; travel (s); view (orientation at the end of the travel); push (hold zoom
// factor, default 0.97); peak (mpp at the top of a mid-travel zoom-out); spin (deg/s while held).
// Note: off(dx, dy) moves the FACE CENTRE to (anchor + dx, anchor + dy) on screen; anchor = (540, 864).
const B = (i, dt = 0) => (tl) => tl.scenes[i].start + dt;
const PH = (i, j, edge = 'start', dt = 0) => (tl) => tl.lines[i].phrases[j][edge] + dt;
export const ANCHOR = 0.45;
export const GLOBE_MPP = 15500;                   // a whole globe: r ≈ 411 px (right edge clear of the HUD gauge)

export const SHOTS = [
  { name: 'hook', beat: 0, at: B(0), view: VIEWS.pacific, ...off(0, 110, 16500), mpp: 16500, travel: 0 },   // r 449 → 386 px, centre y 974
  { name: 'bering', beat: 1, at: B(1), view: VIEWS.bering, ...off(0, -40, 2300), mpp: 2300, travel: 1.8, push: 0.97 },
  { name: 'bering-walk', beat: 1, at: PH(1, 1, 'start', -0.3), view: VIEWS.beringWalk, ...off(0, -60, 1250), mpp: 1250, travel: 1.5, push: 0.98 },
  { name: 'doggerland', beat: 2, at: PH(1, 1, 'end', -0.5), view: VIEWS.northSea, ...off(0, -40, 1350), mpp: 1350, travel: 1.45, peak: 6000, push: 0.95 },   // lands ≈ 14.5, before "Britain"
  { name: 'ice-age', beat: 3, at: B(3), view: VIEWS.arctic, ...off(0, -10, 9200), mpp: 9200, travel: 2.0, push: 0.97 },
  { name: 'beringia', beat: 4, at: B(4, -0.1), view: VIEWS.beringia, ...off(0, -60, 2500), mpp: 2500, travel: 1.7, push: 0.96 },
  { name: 'atlantic', beat: 5, at: B(5), view: VIEWS.atlantic, ...off(-15, -20, GLOBE_MPP), mpp: GLOBE_MPP, travel: 2.2, peak: 20000, push: 0.97 },
  { name: 'ridge-ring', beat: 6, at: B(6), view: VIEWS.south, ...off(-15, -20, 15500), mpp: 15500, travel: 1.9, push: 0.985, spin: -9 },
  { name: 'abyss', beat: 7, at: B(7), view: VIEWS.abyss, ...off(-15, -20, 15000), mpp: 15000, travel: 2.0, push: 0.97 },
  { name: 'hawaii', beat: 8, at: B(8), view: VIEWS.hawaii, ...off(0, -170, 1500), mpp: 1500, travel: 2.1, peak: 16000, push: 0.96 },
  { name: 'mariana', beat: 9, at: B(9), view: VIEWS.mariana, ...off(0, -60, 1900), mpp: 1900, travel: 2.0, peak: 7000, push: 0.98 },
  { name: 'deep', beat: 9, at: PH(9, 1, 'start', -0.35), view: VIEWS.challenger, ...off(0, -60, 1400), mpp: 1400, travel: 1.5, push: 0.97 },
  { name: 'gone', beat: 10, at: B(10, 0.05), view: VIEWS.dry, ...off(-15, -20, 15500), mpp: 15500, travel: 1.9, push: 0.985 },
  { name: 'classroom', beat: 11, at: B(11), view: VIEWS.classroom, ...off(0, -224, 24500), mpp: 24500, travel: 1.8, push: 0.985 },   // r 260, centre (540, 640)
  { name: 'blue', beat: 12, at: B(12), view: VIEWS.blue, ...off(-15, -30, 16000), mpp: 16000, travel: 2.2, push: 0.97, spin: 2.5 },
];

// ------------------------------------------------------------------ evaluation
function easeTable(tail, N) {
  if (!tail) return null;
  const d = [], e = [0];
  for (let i = 0; i < N; i++) { const x = (i + 0.5) / N; d.push(x * Math.pow(1 - x, tail - 1)); }
  const tot = d.reduce((a, b) => a + b, 0);
  for (let i = 0; i < N; i++) e.push(e[i] + d[i] / tot);
  return e;
}
/** Zoom-weighted progress table for a travel: pan + rotation advance in proportion to the current mpp. */
function travelCurve(a, b, peak, tail) {
  const la = Math.log(a), lb = Math.log(b);
  const lift = peak ? Math.max(0, Math.log(peak) - (la + lb) / 2) : 0;
  const N = 192, logm = [], acc = [0];
  const et = easeTable(tail, N);
  for (let i = 0; i <= N; i++) {
    const e = et ? et[i] : L.ease.inOutCubic(i / N);
    logm.push(L.lerp(la, lb, e) + lift * Math.sin(Math.PI * e));
  }
  for (let i = 1; i <= N; i++) acc.push(acc[i - 1] + Math.exp((logm[i - 1] + logm[i]) / 2));
  const tot = acc[N] || 1;
  return (k) => {
    const f = L.clamp(k) * N, i = Math.min(N - 1, Math.floor(f)), u = f - i;
    return { mpp: Math.exp(L.lerp(logm[i], logm[i + 1], u)), p: L.lerp(acc[i], acc[i + 1], u) / tot };
  };
}

/** The globe orientation of shot s at the end of its travel, at time gt (its view plus any held spin). */
function heldView(s, gt) {
  if (!s.spin) return s.view;
  const t = Math.max(0, gt - s.start);
  const a = -s.spin * t * DEG, ca = Math.cos(a), sa = Math.sin(a);
  const rot = (v) => [v[0] * ca - v[1] * sa, v[0] * sa + v[1] * ca, v[2]];
  return { r: rot(s.view.r), u: rot(s.view.u), c: rot(s.view.c) };
}

/** Shot s evaluated at gt (no drift): {x, y, mpp, view, p}. */
function evalShot(s, gt) {
  const t = gt - s.start, d = s.end - s.start;
  if (!s.from) {
    const mpp = s.mpp * L.lerp(0.86, 1, L.ease.inOutCubic(L.prog(t, 0, d)));
    return { x: s.x, y: s.y, mpp, view: s.view, p: 1 };
  }
  const { mpp: m, p } = s.curve(L.prog(t, -0.05, s.travel));
  const view = slerpView(s.from.view, heldView(s, gt), L.smoothstep(p));
  const pull = L.lerp(1, s.push ?? 0.97, L.ease.inOutCubic(L.prog(t, s.travel, d - s.travel)));
  return { x: L.lerp(s.from.x, s.x, p), y: L.lerp(s.from.y, s.y, p), mpp: m * pull, view, p };
}

let cacheKey = null, cache = null;
function prepared(tl) {
  if (cacheKey === tl) return cache;
  const starts = SHOTS.map((s) => s.at(tl));
  const out = [];
  SHOTS.forEach((src, i) => {
    const s = { ...src, start: starts[i], end: i + 1 < SHOTS.length ? starts[i + 1] : tl.total, from: null };
    if (i > 0) { s.from = evalShot(out[i - 1], s.start); s.curve = travelCurve(s.from.mpp, s.mpp, s.peak, s.tail); }
    out.push(s);
  });
  cacheKey = tl; cache = out;
  return out;
}
function state(gt, tl) {
  const sh = prepared(tl);
  let i = 0;
  sh.forEach((s, j) => { if (s.start <= gt) i = j; });
  return { ...evalShot(sh[i], gt), shot: i };
}

/** Camera: {x, y, mpp, anchor} in world metres. Drift noise scales with the zoom. */
export function at(gt, tl) {
  const s = state(gt, tl);
  const drift = 3.0;
  return {
    x: s.x + L.noise1(gt * 0.3, 1) * drift * s.mpp,
    y: s.y + L.noise1(gt * 0.27, 2) * drift * s.mpp,
    mpp: s.mpp,
    anchor: ANCHOR,
  };
}
/** The globe orientation {r, u, c} at time gt. */
export function view(gt, tl) { return state(gt, tl).view; }
/** Which shot is playing, its start time and travel progress (0..1, zoom-weighted). */
export function shotAt(gt, tl) {
  const sh = prepared(tl), s = state(gt, tl), cur = sh[s.shot];
  return { index: s.shot, name: cur.name, start: cur.start, end: cur.end, travel: cur.travel, p: s.p };
}
export const shotStart = (name, tl) => prepared(tl).find((s) => s.name === name).start;
export const KEYS = SHOTS;
