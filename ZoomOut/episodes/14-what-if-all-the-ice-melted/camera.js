// Camera for "What If All the Ice Melted?" (60 s): one continuous journey over a real, rotating globe.
// Owned by the orchestrator — builders: read, don't edit (put needs in "sharedRequests").
//
// WORLD (metres): a SIDE VIEW of the planet. The globe is a sphere of radius R_EARTH centred at (0, +R_EARTH), so
// its top limb is the point (0, 0) and y = −elevation there (exactly like episode 06). What sits on the sphere is
// set by the globe ORIENTATION, a function of time (`view(gt, tl)`): an orthographic projection whose face centre
// is the world point (0, R_EARTH) and whose top limb is (0, 0).
//   * face views (Antarctica, Florida, Europe, Shanghai, the Arctic): a place at the face centre is drawn top-down.
//   * the limb view (beats 4-5): New York sits exactly on the top limb, so the Statue of Liberty is drawn SIDE-ON at
//     x ≈ 0 standing on y = 0 (sea level), and the rising sea is a circle of radius R_EARTH + seaLevel.
// Zooming out of the statue therefore reveals the curve of the Earth and then the globe, with no cut.
//
// SHOTS: one or more camera keys per beat. A shot starts at a time taken from the voice timeline (a beat start or a
// phrase start/end) and travels from the previous shot's end state to its key. Pan AND globe rotation progress are
// weighted by the zoom (they happen while the camera is zoomed out), so the target stays near the centre while the
// planet turns underneath. `peak` adds a mid-travel zoom-out (mpp at the top of the arc) for long hops.
import * as L from '../../../engine/runtime/lib.js';

export const R_EARTH = 6.371e6;
const DEG = Math.PI / 180;

// ------------------------------------------------------------------ places (lat, lon in degrees)
export const PLACES = {
  pole: { lat: -90, lon: 0 },
  liberty: { lat: 40.689, lon: -74.045 },
  florida: { lat: 27.9, lon: -82.6 },        // framing centre for the Florida beat (peninsula + Keys)
  orlando: { lat: 28.54, lon: -81.38 },
  miami: { lat: 25.76, lon: -80.19 },
  venice: { lat: 45.44, lon: 12.33 },
  amsterdam: { lat: 52.37, lon: 4.9 },
  europe: { lat: 48.6, lon: 8.4 },           // framing centre: Venice + Amsterdam both in frame
  shanghai: { lat: 31.23, lon: 121.47 },
  channel: { lat: 50.9, lon: 1.4 },          // Dover Strait (France to England)
  bering: { lat: 65.8, lon: -168.9 },        // Bering Strait (Siberia to Alaska)
};
/** Statue of Liberty, metres above sea level (island ground ≈ 3 m): ground → pedestal top → head → torch tip. */
export const LIBERTY = { ground: 3, pedestalTop: 49.9, heel: 49.9, chest: 71, head: 83.8, torch: 96 };

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
const NYL = PLACES.liberty;
export const VIEWS = {
  pole: latLonView(-90, 0),                              // Antarctica top-down, 0° meridian up, 90°E to the right
  nyLimb: latLonView(NYL.lat - 90, NYL.lon),             // New York exactly on the top limb (face = South Atlantic)
  nyFace: latLonView(12, -66),                           // the Americas + Atlantic: New York, Greenland on the face
  florida: latLonView(PLACES.florida.lat, PLACES.florida.lon),
  europe: latLonView(PLACES.europe.lat, PLACES.europe.lon),
  shanghai: latLonView(PLACES.shanghai.lat, PLACES.shanghai.lon),
  asia: latLonView(26, 108),                             // whole globe: East and South Asia's coasts
  arctic: latLonView(90, 0),                             // North Pole top-down: Europe at the bottom, Bering Strait at the top
  channel: latLonView(PLACES.channel.lat, PLACES.channel.lon),
  bering: latLonView(PLACES.bering.lat, PLACES.bering.lon),
  final: latLonView(52, -28),                            // the North Atlantic: both Americas' north, Europe, Africa
};
const FACE = { x: 0, y: R_EARTH };                       // the face centre in world coordinates
const off = (dx, dy, mpp) => ({ x: FACE.x + dx * mpp, y: FACE.y + dy * mpp });   // a screen-pixel offset from the face centre

// ------------------------------------------------------------------ shots
// at(tl) → start time; key {x, y, mpp}; travel (s); view (orientation at the end of the travel); push (hold zoom
// factor, default 0.97); peak (mpp at the top of a mid-travel zoom-out); spin (deg/s of extra longitude spin while held).
const B = (i) => (tl) => tl.scenes[i].start;
const PH = (i, j, edge = 'start', dt = 0) => (tl) => tl.lines[i].phrases[j][edge] + dt;
const LN = (i, edge = 'end', dt = 0) => (tl) => tl.lines[i][edge] + dt;
const LIB_X = 16, LIB_Y = -47;   // statue framing: sea level at screen y ≈ 1180, torch tip ≈ 540, statue at x ≈ 430

export const SHOTS = [
  { name: 'cube', beat: 0, at: B(0), view: VIEWS.pole, ...off(0, 0, 1e-4), mpp: 1.0e-4, travel: 0 },
  { name: 'zoom-out', beat: 1, at: B(1), view: VIEWS.pole, ...off(0, -30, 5900), mpp: 5900, travel: 3.7, blur: 0.2 },
  { name: 'antarctica', beat: 2, at: B(2), view: VIEWS.pole, ...off(5, -45, 6500), mpp: 6500, travel: 1.0, push: 0.96 },
  { name: 'thickness', beat: 3, at: B(3), view: VIEWS.pole, ...off(-40, 350, 9700), mpp: 9700, travel: 1.3, push: 0.97 },
  { name: 'globe-turn', beat: 4, at: B(4), view: VIEWS.nyFace, ...off(0, -20, 15500), mpp: 15500, travel: 2.1, push: 0.98 },
  // the dive: the camera stays locked on New York (follow) while the globe rolls it from the face up onto the limb,
  // so the descent visibly lands on New York; the camera's own motion blur is cut (blur = shutter fraction kept)
  { name: 'dive', beat: 4, at: PH(4, 1, 'start', -0.35), view: VIEWS.nyLimb, x: LIB_X, y: LIB_Y, mpp: 0.15, travel: 2.3, push: 0.985, follow: PLACES.liberty, blur: 0.15 },
  { name: 'liberty', beat: 5, at: B(5), view: VIEWS.nyLimb, x: LIB_X - 1, y: LIB_Y - 7, mpp: 0.128, travel: 1.4, push: 0.975 },
  // the climb out of the statue starts on 'Liberty' and runs early (tail ease): the 7-decade zoom is fast while the frame
  // is only sea and sky, and slow once the globe's limb is on screen, so the 4-sub-frame blur reads as a blur
  { name: 'to-florida', beat: 6, at: LN(5, 'end', -0.12), view: VIEWS.florida, ...off(-40, -10, 1600), mpp: 1600, travel: 2.9, peak: 1800, tail: 4, push: 0.96 },
  { name: 'europe', beat: 7, at: LN(6, 'end', -0.1), view: VIEWS.europe, ...off(-10, 0, 2300), mpp: 2300, travel: 1.6, peak: 6500, push: 0.965 },
  { name: 'shanghai', beat: 8, at: PH(7, 1, 'end', 0.05), view: VIEWS.shanghai, ...off(-60, 0, 1900), mpp: 1900, travel: 1.5, peak: 9000, push: 0.97 },
  { name: 'every-coast', beat: 8, at: PH(8, 1, 'start', -0.05), view: VIEWS.asia, ...off(0, 10, 13500), mpp: 13500, travel: 2.6, push: 0.985, spin: 1.5 },
  { name: 'to-arctic', beat: 9, at: B(9), view: VIEWS.arctic, ...off(0, -90, 10500), mpp: 10500, travel: 2.2, push: 0.985 },
  { name: 'ice-age', beat: 10, at: B(10), view: VIEWS.arctic, ...off(0, -85, 9400), mpp: 9400, travel: 1.4, push: 0.97 },
  { name: 'channel', beat: 11, at: (tl) => tl.scenes[11].start - 0.45, view: VIEWS.channel, ...off(0, 20, 1500), mpp: 1500, travel: 1.5, peak: 9000, push: 0.97 },
  { name: 'bering', beat: 11, at: PH(11, 1, 'start', -0.2), view: VIEWS.bering, ...off(0, 20, 3200), mpp: 3200, travel: 1.7, peak: 8000, push: 0.975 },
  { name: 'not-fixed', beat: 12, at: B(12), view: VIEWS.final, ...off(0, -40, 12500), mpp: 12500, travel: 2.6, push: 0.95, spin: 2.0 },
];

// ------------------------------------------------------------------ evaluation
/** Zoom-weighted progress table for a travel: pan + rotation advance in proportion to the current mpp. */
// tail (optional, > 2): an asymmetric ease (Beta(2, tail) CDF) that starts gently, peaks early and lands long, for
// big climbs out of a close-up whose far end must stay slow enough for motion blur to read as blur, not copies.
function easeTable(tail, N) {
  if (!tail) return null;
  const d = [], e = [0];
  for (let i = 0; i < N; i++) { const x = (i + 0.5) / N; d.push(x * Math.pow(1 - x, tail - 1)); }
  const tot = d.reduce((a, b) => a + b, 0);
  for (let i = 0; i < N; i++) e.push(e[i] + d[i] / tot);
  return e;
}
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
  // spin = extra eastward rotation of the planet (the face-centre longitude drifts west), about Earth's axis
  const a = -s.spin * t * DEG, ca = Math.cos(a), sa = Math.sin(a);
  const rot = (v) => [v[0] * ca - v[1] * sa, v[0] * sa + v[1] * ca, v[2]];
  return { r: rot(s.view.r), u: rot(s.view.u), c: rot(s.view.c) };
}

/** Shot s evaluated at gt (no drift): {x, y, mpp, view, p}. */
function evalShot(s, gt) {
  const t = gt - s.start, d = s.end - s.start;
  if (!s.from) {
    const mpp = s.mpp * L.lerp(0.82, 1, L.ease.inOutCubic(L.prog(t, 0, d)));
    return { x: s.x, y: s.y, mpp, view: s.view, p: 1 };
  }
  const { mpp: m, p } = s.curve(L.prog(t, -0.05, s.travel));
  const view = slerpView(s.from.view, heldView(s, gt), L.smoothstep(p));
  const pull = L.lerp(1, s.push ?? 0.97, L.ease.inOutCubic(L.prog(t, s.travel, d - s.travel)));
  if (s.follow) {
    // track the place as the globe turns under the camera: offset from it eases from the start state to the key
    const f = s.follow, a = worldOf(s.from.view, f.lat, f.lon), b = worldOf(s.view, f.lat, f.lon), n = worldOf(view, f.lat, f.lon);
    return { x: n.x + L.lerp(s.from.x - a.x, s.x - b.x, p), y: n.y + L.lerp(s.from.y - a.y, s.y - b.y, p), mpp: m * pull, view, p };
  }
  return { x: L.lerp(s.from.x, s.x, p), y: L.lerp(s.from.y, s.y, p), mpp: m * pull, view, p };
}

let cacheKey = null, cache = null;
function prepared(tl) {
  if (cacheKey === tl) return cache;
  const starts = SHOTS.map((s) => s.at(tl));
  const out = [];
  SHOTS.forEach((src, i) => {
    const s = { ...src, start: starts[i], end: i + 1 < SHOTS.length ? starts[i + 1] : tl.total, from: null };
    // start exactly where the previous shot is at this instant (even if its travel or push had not finished)
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
  // blur < 1: the camera only moves by that fraction of the shutter inside a frame (sub-frames are pulled toward the
  // frame's own time), which caps the motion blur of very fast zooms without touching anything else
  const b = sh[i].blur;
  if (b != null && b < 1) { const fc = Math.round(gt * 30) / 30; gt = fc + (gt - fc) * b; }
  return { ...evalShot(sh[i], gt), shot: i };
}

/** Camera: {x, y, mpp, anchor} in world metres. Drift noise scales with the zoom. */
export function at(gt, tl) {
  const s = state(gt, tl);
  const drift = 3.5;
  return {
    x: s.x + L.noise1(gt * 0.3, 1) * drift * s.mpp,
    y: s.y + L.noise1(gt * 0.27, 2) * drift * s.mpp,
    mpp: s.mpp,
    anchor: 0.45,
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
