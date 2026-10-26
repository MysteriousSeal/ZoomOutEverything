// Environment for "How Does GPS Know Where You Are?". Owned by the orchestrator — builders: read, don't edit.
//
// Layers:   drawBackground  deep space + parallax stars · the night sky over the street (darkens with altitude) ·
//                           the ground (flat/curved at street → city scale) · the REAL globe (engine/runtime/earth.js,
//                           NOAA ETOPO1: true coastlines, the Americas on the face), lit by a fixed Sun so New York sits
//                           just on the night side with its city lights, spinning once during the time-lapse · the atmosphere rim · the GPS
//                           constellation: 6 orbital planes (55°) + the 4 hero orbits, 31 satellites as small glints.
//           drawHud         top bar · adaptive scale bar (top right) · the FIX readout (top left): the phone's
//                           coordinates (they drift in beat 17) + a status line (time-lapse, satellites locked, …).
import * as L from '../../../engine/runtime/lib.js';
import { beatCues, fmtMetres, scaleBar, stars, topBar } from '../../../engine/runtime/kit.js';
import { drawEarth } from '../../../engine/runtime/earth.js';
import { C, GPS_A, GPS_ALT, HERO, HERO_TH, HOME, KEYS, PHONE, R_EARTH, SAT_B } from './camera.js';

const { W, H } = L;
export const ACCENT = [120, 230, 140];
/** The phone's location dot (the iconic map blue), and its soft halo. */
export const DOT = [70, 150, 255];
/** Satellite / signal ink (cool white) and the warm "clock" colour for time readouts. */
export const SAT_INK = [225, 235, 255];
export const CLOCK = [255, 214, 140];
export { C, GPS_A, GPS_ALT, HERO, HERO_TH, HOME, PHONE, R_EARTH, SAT_B };
const DEG = Math.PI / 180;

// ------------------------------------------------------------------ timeline helpers
export const beatStart = (tl, i) => tl.scenes[i].start;
/** Start/end of phrase j of line i (lines without "|" have one phrase). */
export const phrase = (tl, i, j = 0, edge = 'start') => (tl.lines[i].phrases ? tl.lines[i].phrases[j][edge] : tl.lines[i][edge]);

// ------------------------------------------------------------------ globe orientation (orthographic, like episode 14)
const vec3 = (lat, lon) => [Math.cos(lat * DEG) * Math.cos(lon * DEG), Math.cos(lat * DEG) * Math.sin(lon * DEG), Math.sin(lat * DEG)];
const dot3 = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross3 = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const norm3 = (a) => { const n = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / n, a[1] / n, a[2] / n]; };
/**
 * The view: New York exactly on the top limb (screen-up = New York's zenith, which the side-view world needs: the street,
 * the signal spheres and the phone all live in the picture plane through New York and the Earth's centre). The face
 * centre is the point 90° from New York along BEARING (deg from north): due south-south-west puts the Americas on the
 * face, north up, with North America (and New York's lights) along the top and South America in the middle.
 * Rows: screen-right, screen-up, toward viewer (Earth-fixed unit vectors). +x along the ground at New York is ≈ east.
 */
const BEARING = 190;
export const VIEW = (() => {
  const u = vec3(HOME.lat, HOME.lon);
  const la = HOME.lat * DEG, lo = HOME.lon * DEG, b = BEARING * DEG;
  const n = [-Math.sin(la) * Math.cos(lo), -Math.sin(la) * Math.sin(lo), Math.cos(la)], e = [-Math.sin(lo), Math.cos(lo), 0];
  const c = norm3(n.map((x, j) => Math.cos(b) * x + Math.sin(b) * e[j]));
  return { r: cross3(u, c), u, c };
})();
/** The same view as earth.js drawEarth parameters (centre lat/lon + clockwise screen roll). */
const VIEW_LL = (() => {
  const { u, c } = VIEW;
  const lat0 = Math.asin(c[2]) / DEG, lon0 = Math.atan2(c[1], c[0]) / DEG;
  const cl = Math.cos(lon0 * DEG), sl = Math.sin(lon0 * DEG), sp = Math.sin(lat0 * DEG), cp = Math.cos(lat0 * DEG);
  const r0 = [-sl, cl, 0], u0 = [-sp * cl, -sp * sl, cp];
  return { lat0, lon0, tilt: Math.atan2(-dot3(u, r0), dot3(u, u0)) / DEG };
})();
const rotZ = (p, a) => [p[0] * Math.cos(a) - p[1] * Math.sin(a), p[0] * Math.sin(a) + p[1] * Math.cos(a), p[2]];
/** Inertial vector (metres, Earth-centred) → world {x, y} + depth z (metres, + = toward the viewer). */
export function toWorld(p) {
  return { x: dot3(p, VIEW.r), y: R_EARTH - dot3(p, VIEW.u), z: dot3(p, VIEW.c) };
}
/** Sun direction in VIEW space (X right, Y up, Z toward viewer): lights the face, leaves the top limb (New York) at night. */
export const SUN = norm3([0.3, -0.12, 0.95]);

// ------------------------------------------------------------------ the time-lapse (beats 2-3): one sidereal day
// A GPS orbit lasts half a sidereal day (11 h 58 min), so in ONE sidereal day every satellite laps exactly twice and
// the Earth turns exactly once: the whole sky returns to where it started. Outside the window everything is in real
// time, which at these scales is frozen (a GPS satellite crosses one pixel at globe scale in ~15 s).
const LAPS = 2;
let lapCacheKey = null, lapTab = null, lapT0 = 0, lapT1 = 1;
const LN = 600;
function lapTable(tl) {
  if (lapCacheKey === tl) return;
  // the whole day plays inside "Each one laps the planet about twice a day": lap 1 closes on "laps the planet",
  // lap 2 on "twice", and "2 laps" then holds ≥ 1.5 s before the beat-4 dive (lapT1 ≈ 16.93 s)
  lapT0 = beatStart(tl, 3) - 0.75;
  lapT1 = phrase(tl, 3, 0, 'end') - 0.85;
  const w = [], acc = [0];
  for (let i = 0; i < LN; i++) {
    const t = L.lerp(lapT0, lapT1, (i + 0.5) / LN);
    w.push(L.smoothstep(L.prog(t, lapT0, 0.6)) * L.smoothstep(1 - L.prog(t, lapT1 - 0.7, 0.7)) + 0.02);
  }
  for (let i = 0; i < LN; i++) acc.push(acc[i] + w[i]);
  const tot = acc[LN];
  lapTab = acc.map((a) => (a / tot) * LAPS);
  lapCacheKey = tl;
}
/** Orbits completed since the time-lapse began (0 → 2), a smooth function of gt. */
export function lapsAt(gt, tl) {
  lapTable(tl);
  if (gt <= lapT0) return 0;
  if (gt >= lapT1) return LAPS;
  const f = ((gt - lapT0) / (lapT1 - lapT0)) * LN, i = Math.min(LN - 1, Math.floor(f));
  return L.lerp(lapTab[i], lapTab[i + 1], f - i);
}
/** Elapsed simulated hours in the time-lapse (0 → 23.93, one sidereal day), and the window itself. */
export const hoursAt = (gt, tl) => lapsAt(gt, tl) * 11.967;
export const timeLapseWindow = (tl) => { lapTable(tl); return { start: lapT0, end: lapT1 }; };
/** Earth's rotation angle (rad) at gt: one full turn over the time-lapse (so New York returns to the top limb). */
export const spinAt = (gt, tl) => (lapsAt(gt, tl) / LAPS) * Math.PI * 2;

// ------------------------------------------------------------------ the constellation (31 satellites)
// 27 "background" satellites on 6 planes (inclination 55°, nodes 60° apart) + the 4 HERO satellites, each on its own
// 55° orbit through its resting point in the picture plane (camera.js HERO). Rest = the instant after the time-lapse.
const INC = 55 * DEG;
const ORBITS = [];
for (let k = 0; k < 6; k++) {
  const om = (20 + 60 * k) * DEG;
  const p = [Math.cos(om), Math.sin(om), 0];
  const n = [Math.sin(INC) * Math.sin(om), -Math.sin(INC) * Math.cos(om), Math.cos(INC)];
  ORBITS.push({ p, q: cross3(n, p), hero: -1 });
}
HERO.forEach((h, i) => {
  // the hero's resting direction in inertial (= Earth-fixed at spin 0) coordinates
  const X = Math.sin(h.th * DEG), Y = Math.cos(h.th * DEG);
  const p = norm3([X * VIEW.r[0] + Y * VIEW.u[0], X * VIEW.r[1] + Y * VIEW.u[1], X * VIEW.r[2] + Y * VIEW.u[2]]);
  // orbit normal n ⟂ p with n·ẑ = cos(i): a 55° prograde orbit through p (steeper if p's latitude needs it)
  const zp = [-p[2] * p[0], -p[2] * p[1], 1 - p[2] * p[2]];
  const zl = Math.hypot(...zp), e1 = zp.map((v) => v / zl), e2 = cross3(p, e1);
  const ci = Math.min(Math.cos(INC), zl * 0.999) / zl;
  const n = norm3(e1.map((v, j) => v * ci + e2[j] * Math.sqrt(1 - ci * ci)));
  ORBITS.push({ p, q: cross3(n, p), hero: i });
});
const SATS = [];
for (let k = 0; k < 6; k++) {
  const n = k < 3 ? 5 : 4;
  for (let j = 0; j < n; j++) SATS.push({ orbit: k, u0: (2 * Math.PI * j) / n + k * 0.55 + (j % 2) * 0.25, hero: -1 });
}
HERO.forEach((h, i) => SATS.push({ orbit: 6 + i, u0: 0, hero: i }));
export const SAT_COUNT = SATS.length;   // 31

function orbitPoint(o, u) {
  const c = Math.cos(u) * GPS_A, s = Math.sin(u) * GPS_A;
  return [o.p[0] * c + o.q[0] * s, o.p[1] * c + o.q[1] * s, o.p[2] * c + o.q[2] * s];
}
/**
 * Every satellite at time gt: [{i, hero (-1 or 0-3 for A-D), x, y, z (world metres), vx, vy (unit screen-plane
 * velocity direction), front (not hidden by the Earth)}]. Heroes are the last four (i = 27..30).
 */
export function satsAt(gt, tl) {
  const du = 2 * Math.PI * (lapsAt(gt, tl) - LAPS);
  return SATS.map((s, i) => {
    const o = ORBITS[s.orbit];
    const u = s.u0 + du;
    const w = toWorld(orbitPoint(o, u)), w2 = toWorld(orbitPoint(o, u + 0.01));
    const dx = w2.x - w.x, dy = w2.y - w.y, dl = Math.hypot(dx, dy) || 1;
    const rr = Math.hypot(w.x, w.y - R_EARTH);
    return { i, hero: s.hero, x: w.x, y: w.y, z: w.z, vx: dx / dl, vy: dy / dl, front: w.z > 0 || rr > R_EARTH };
  });
}
/** The hero satellite (0-3) world position at gt (equals HERO[i] outside the time-lapse). */
export const heroAt = (i, gt, tl) => satsAt(gt, tl)[27 + i];

/** Reveal of satellite i (0..1) in beat 2: a sweep around the planet on "thirty-one GPS satellites". */
const REVEAL_ORDER = (() => {
  const rest = SATS.map((s) => toWorld(orbitPoint(ORBITS[s.orbit], s.u0)));
  return rest.map((w, i) => [Math.atan2(w.x, R_EARTH - w.y), i]).sort((a, b) => a[0] - b[0]).map(([, i]) => i);
})();
const REVEAL_RANK = []; REVEAL_ORDER.forEach((i, r) => { REVEAL_RANK[i] = r; });
/** The reveal sweep starts on "…satellites orbit the Earth", once the camera is nearly at planet scale. */
export const revealT0 = (tl) => phrase(tl, 2, 0, 'start') + 1.25;
export function satReveal(i, gt, tl) {
  return L.prog(gt, revealT0(tl) + (REVEAL_RANK[i] / (SAT_COUNT - 1)) * 1.6, 0.4);
}
/** How many satellites have appeared so far (for a counter that tracks the reveal). */
export const satsShown = (gt, tl) => SATS.reduce((n, s, i) => n + (satReveal(i, gt, tl) > 0.5 ? 1 : 0), 0);

/**
 * Act II-III focus (0..1): from beat 6 on, the 27 background satellites and all orbits step back so the four HERO
 * satellites lead (heroes keep full strength; scenes add their own highlight rings and labels).
 */
export const focusK = (gt, tl) => L.ease.inOutCubic(L.prog(gt, beatStart(tl, 6) + 0.3, 1.2));
/** The satellite close-up model span (m). Below ~4 px env draws a glint; above ~10 px the beat-4 model takes over. */
export const MODEL_SPAN = 8;
export const modelK = (v) => L.clamp(L.invLerp(4, 10, v.ws(MODEL_SPAN)));

/** The phone's world position at gt (it rides the spinning Earth during the time-lapse; PHONE otherwise). */
export function homeWorld(gt, tl) {
  const s = spinAt(gt, tl);
  if (s <= 0 || s >= Math.PI * 2) return { x: PHONE.x, y: PHONE.y, z: 0 };
  const p = vec3(HOME.lat, HOME.lon).map((x) => x * R_EARTH);
  const w = toWorld(rotZ(p, s));
  return { x: w.x, y: w.y, z: w.z };
}

// ------------------------------------------------------------------ story state: the uncorrected drift (beats 17-18)
export const DRIFT_M = 10000;
/** The blue dot's eastward error (m): drifts to 10 km on "GPS would drift…", snaps back at the start of beat 18. */
export function driftAt(gt, tl) {
  const a = phrase(tl, 17, 1, 'start') - 0.1;
  const b = beatStart(tl, 18) + 0.02;              // in step with s17's shownDrift: the dot is home as the dive starts
  return DRIFT_M * (L.ease.inOutCubic(L.prog(gt, a, 2.8)) - L.ease.inOutCubic(L.prog(gt, b, 0.75)));
}

// ------------------------------------------------------------------ the globe: the real Earth (engine/runtime/earth.js)
/** Real coastlines and relief (NOAA ETOPO1): a Blue-Marble day side lit by the fixed Sun, New York's coast on the night
 *  side with its city lights; it spins once (rot) during the time-lapse. */
function drawGlobe(c, v, alpha) {
  const rpx = R_EARTH / v.cam.mpp;
  drawEarth(c, {
    cx: v.wx(0), cy: v.wy(R_EARTH), r: rpx,
    lat0: VIEW_LL.lat0, lon0: VIEW_LL.lon0, tilt: VIEW_LL.tilt, rot: spinAt(v.gt, v.tl) / DEG,
    style: 'day', sun: SUN, lights: 1, atmosphere: 0.7, alpha,
    // this view faces ~49°S, so Antarctica is large at the bottom: softer, greyer ice keeps it from reading as a white blob
    ice: [176, 190, 208], seaIce: 0.4, relief: 0.6,
  });
}

// ------------------------------------------------------------------ sky + ground
// night sky by altitude (m): city-lit navy at street level → black above ~60 km
const SKY = [[0, [34, 40, 66]], [200, [24, 30, 54]], [2000, [15, 20, 42]], [12000, [9, 13, 30]], [40000, [5, 7, 17]], [100000, [3, 4, 10]]];
export const skyColor = (alt) => L.ramp(SKY, alt);

export function drawBackground(c, v) {
  const cam = v.cam;
  const g0 = c.createRadialGradient(W / 2, H * 0.45, 40, W / 2, H * 0.5, H * 0.85);
  g0.addColorStop(0, '#0a0d18'); g0.addColorStop(1, '#020309');
  c.fillStyle = g0;
  c.fillRect(0, 0, W, H);
  const altAt = (sy) => -(cam.y + (sy - H * cam.anchor) * cam.mpp);
  const farBg = L.clamp(L.invLerp(Math.log(400), Math.log(5000), Math.log(cam.mpp)));
  if (farBg < 1) {
    const g = c.createLinearGradient(0, 0, 0, H);
    for (let i = 0; i <= 12; i++) g.addColorStop(i / 12, L.rgba(skyColor(Math.max(0, altAt((H * i) / 12)))));
    c.save(); c.globalAlpha = 1 - farBg; c.fillStyle = g; c.fillRect(0, 0, W, H); c.restore();
  }
  // stars: two layers that drift with the log of the zoom (parallax); faint over the city, full in space
  const sk = Math.max(L.lerp(0.22, 1, L.clamp(L.invLerp(3000, 60000, altAt(H * 0.3)))), farBg);
  const lz = Math.log10(cam.mpp);
  c.save();
  c.translate(0, ((lz * 110) % H + H) % H - H);
  stars(c, v, 0.6 * sk, 130, 31);
  c.translate(0, H);
  stars(c, v, 0.6 * sk, 130, 31);
  c.restore();
  stars(c, v, 0.4 * sk, 90, 47);

  const rpx = R_EARTH / cam.mpp;
  const cx = v.wx(0), cy = v.wy(R_EARTH);
  // the flat / gently curved ground (street → city scale); hands over to the ray-cast globe as we climb
  const flatK = L.clamp(L.invLerp(4000, 8000, rpx));
  if (flatK > 0 && cy - rpx < H + 50) {
    c.save();
    c.globalAlpha = flatK;
    c.beginPath();
    if (rpx > 2e5) c.rect(-10, cy - rpx, W + 20, H + 20 - (cy - rpx)); else c.arc(cx, cy, rpx, 0, Math.PI * 2);
    const top = cy - rpx;
    const gg = c.createLinearGradient(0, top, 0, Math.min(H, top + 700));
    gg.addColorStop(0, '#1a1e2a'); gg.addColorStop(1, '#07090e');
    c.fillStyle = gg;
    c.fill();
    c.restore();
  }
  if (flatK < 1) drawGlobe(c, v, 1 - flatK);
  // atmosphere rim (additive), only once the planet reads as a ball
  const rimK = L.clamp(L.invLerp(3500, 1500, rpx));
  if (rimK > 0) {
    c.save();
    c.globalCompositeOperation = 'lighter';
    const g = c.createRadialGradient(cx, cy, rpx * 0.97, cx, cy, rpx * 1.12);
    g.addColorStop(0, 'rgba(90,150,255,0)');
    g.addColorStop(0.18, `rgba(90,150,255,${0.28 * rimK})`);
    g.addColorStop(1, 'rgba(90,150,255,0)');
    c.fillStyle = g;
    c.beginPath(); c.arc(cx, cy, Math.max(0, rpx * 1.12), 0, Math.PI * 2); c.fill();
    c.restore();
  }
  drawConstellation(c, v);
}

// ------------------------------------------------------------------ constellation drawing
/** Orbit lines + satellite glints. Orbits read only at planet scale; glints hide under the beat-4 close-up model. */
function drawConstellation(c, v) {
  const cam = v.cam;
  const orbitPx = GPS_A / cam.mpp;
  if (orbitPx > 2e5 && cam.mpp < 0.05) return;                  // street / city scale: everything is far off-screen
  const farOrbits = orbitPx > 2e5;                              // zooming into one satellite: glints only, no orbits
  const tl = v.tl, gt = v.gt;
  const t0 = revealT0(tl);
  const orbitK = L.ease.inOutCubic(L.prog(gt, t0 + 0.4, 1.8)) * L.clamp(L.invLerp(Math.log(1500), Math.log(9000), Math.log(cam.mpp)));
  const fk = focusK(gt, tl);
  const hidden = (w) => w.z < 0 && Math.hypot(w.x, w.y - R_EARTH) < R_EARTH;
  if (orbitK > 0.01 && !farOrbits) {
    c.save();
    c.lineWidth = 1.5;
    ORBITS.forEach((o) => {
      c.strokeStyle = L.rgba(SAT_INK, (o.hero >= 0 ? 0.2 : 0.15) * orbitK * (1 - 0.55 * fk));
      c.beginPath();
      let pen = false;
      for (let j = 0; j <= 160; j++) {
        const w = toWorld(orbitPoint(o, (j / 160) * Math.PI * 2));
        if (hidden(w)) { pen = false; continue; }
        const X = v.wx(w.x), Y = v.wy(w.y);
        if (pen) c.lineTo(X, Y); else c.moveTo(X, Y);
        pen = true;
      }
      c.stroke();
    });
    c.restore();
  }
  const hideM = 1 - modelK(v);
  if (hideM <= 0) return;
  const sats = satsAt(gt, tl);
  c.save();
  for (const s of sats) {
    const k = satReveal(s.i, gt, tl);
    if (k <= 0) continue;
    if (!s.front) continue;
    const X = v.wx(s.x), Y = v.wy(s.y);
    if (X < -40 || X > W + 40 || Y < -40 || Y > H + 40) continue;
    // the satellite is right over the planet's dark disc: keep it, but it never sits behind the Earth
    const e = L.ease.outBack(L.clamp(k));
    const a = L.clamp(k * 1.5) * hideM * (s.hero >= 0 ? 1 : 1 - 0.6 * fk);
    // while the camera dives into a satellite its glint grows with the zoom, so there is always a subject on screen
    const zk = s.hero === 1 ? L.clamp(L.invLerp(Math.log(3000), Math.log(0.4), Math.log(cam.mpp))) : 0;
    if (zk > 0) L.lightBlob(c, X, Y, 50 + 170 * zk, [190, 210, 255], 0.42 * a * Math.sin(Math.PI * Math.min(1, zk * 1.15)) + 0.12 * a * zk);
    L.lightBlob(c, X, Y, 16 * e * (1 + 1.5 * zk), SAT_INK, (0.35 + 0.4 * zk) * a);
    c.save();
    c.translate(X, Y);
    c.rotate(Math.atan2(s.vy, s.vx) + Math.PI / 2);   // solar wings across the direction of travel
    c.fillStyle = L.rgba(SAT_INK, 0.9 * a);
    const gs = 1 + 1.6 * zk;
    c.fillRect(-6 * e * gs, -1 * gs, 12 * e * gs, 2 * gs);
    c.beginPath(); c.arc(0, 0, Math.max(0, 2.6 * e * gs), 0, Math.PI * 2); c.fill();
    c.restore();
  }
  c.restore();
}
export function drawForeground() {}

// ------------------------------------------------------------------ HUD
/** The FIX readout's status line for this instant. */
function fixStatus(v) {
  const tl = v.tl, gt = v.gt, b = v.beat;
  const w = timeLapseWindow(tl);
  if (gt > w.start - 0.2 && gt < w.end + 0.4) return `TIME-LAPSE  ·  +${L.fmt(Math.min(24, hoursAt(gt, tl)))} H`;
  if (b >= 10 && b <= 13) {
    // follows the picture: a satellite counts once its sphere has landed on the phone; the 4th only once the clock
    // error is solved (mirror of s10's TRI.grow / TRI.miss / TRI.solve, beat-relative)
    const at = (i, x) => gt - beatStart(tl, i) >= x;
    if (at(13, 0.6) && !at(13, 2.4)) return 'CLOCK ERROR  ·  SOLVING';
    const n = (at(10, 3.3) ? 1 : 0) + (at(11, 1.95) ? 1 : 0) + (at(12, 1.42) ? 1 : 0) + (at(13, 2.4) ? 1 : 0);
    return n ? `SATELLITES LOCKED  ·  ${n}` : 'ACQUIRING  ·  0';
  }
  if (b < 18 && Math.abs(driftAt(gt, tl)) > 30) return 'UNCORRECTED  ·  DRIFTING';
  return 'GPS FIX  ·  ±5 M';
}
const fmtCoord = (d, pos, neg) => `${Math.abs(d).toFixed(4)}° ${d >= 0 ? pos : neg}`;
export function drawHud(c, v) {
  topBar(c, v, ACCENT);
  scaleBar(c, v, { k: L.ease.outCubic(L.prog(v.gt, 1.0, 0.6)), fmt: fmtMetres });
  const k = L.ease.outCubic(L.prog(v.gt, 1.2, 0.6));
  if (k <= 0) return;
  const drift = driftAt(v.gt, v.tl);
  const lon = HOME.lon + drift / (111320 * Math.cos(HOME.lat * DEG));
  c.save();
  c.globalAlpha = k;
  c.shadowColor = 'rgba(2,6,16,0.7)';
  c.shadowBlur = 12;
  c.textBaseline = 'alphabetic';
  // top right, under the scale bar (the chapter card owns the top left): coordinates + a status line + a pulsing pin
  const txt = `${fmtCoord(HOME.lat, 'N', 'S')}   ${fmtCoord(lon, 'E', 'W')}`;
  c.font = L.font(40, 700, L.FONT.din);
  c.fillStyle = Math.abs(drift) > 30 && v.beat < 18 ? '#ffb38a' : '#fff';
  c.textAlign = 'right';
  c.fillText(txt, W - 64, 306);
  const tw = c.measureText(txt).width;
  c.textAlign = 'left';
  const px = W - 64 - tw - 24, py = 293;
  c.fillStyle = L.rgba(DOT);
  c.beginPath(); c.arc(px, py, 6, 0, Math.PI * 2); c.fill();
  c.strokeStyle = L.rgba(DOT, 0.5); c.lineWidth = 2;
  c.beginPath(); c.arc(px, py, 11 + 2 * Math.sin(v.gt * 3), 0, Math.PI * 2); c.stroke();
  c.font = L.font(20, 600, L.FONT.body);
  c.fillStyle = 'rgba(220,228,240,0.8)';
  L.trackedText(c, fixStatus(v), W - 64, 338, 2, 'right');
  c.restore();
}

export function cues(tl) {
  const out = beatCues(tl, { gain: 0.16, pitch: 1.05 });
  const w = timeLapseWindow(tl);
  out.push({ t: w.start, name: 'riser', gain: 0.18, pitch: 1.1 });
  out.push({ t: revealT0(tl), name: 'shimmer', gain: 0.22, pitch: 1.2 });
  return out;
}
export { KEYS };
