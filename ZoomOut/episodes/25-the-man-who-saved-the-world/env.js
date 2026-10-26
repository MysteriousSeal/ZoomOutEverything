// Environment for "The Man Who Saved the World" (Zoom Out 25). Owned by the setup agent, then the orchestrator —
// builders: read, don't edit (put needs in "sharedRequests"). Read camera.js first: units, phases and shots.
//
// LOOK: cold-war thriller. Near-black blue-green bunker, phosphor-green CRT lines, ALARM RED (ACCENT), warm AMBER for
//   clocks and lamps, cold white type. No people anywhere: the officer is the empty chair, the phone, his name in text.
//
// WHAT ENV DRAWS (every frame, under the scenes):
//   (All times are DERIVED from build/timeline.json: beat starts, phrase starts and moments(tl) below. Never write an
//   absolute second in this episode: a re-recorded voice must re-time the whole film by itself.)
//   PHASE A (roomK > 0, until the match-cut CUT ends at shotStart('map') + 1.29): the control room in true perspective (camera.js):
//     ceiling with fluorescent strips · the wall (concrete panels) · the СТАРТ BOARD (lamp lit = lampK) with the
//     "ДОСТОВЕРНОСТЬ / ВЫСОКАЯ" (reliability: high) strip · amber 7-segment CLOCK (storyClock: 00:14, 00:15 from
//     "Just after midnight") and DATE (26.09.83) · side instrument panels (gauges, lamps, two CRTs) · the lower
//     instrument bank · the polished floor · the CONSOLES row (dz 1.6) · the duty DESK with the red PHONE and a
//     lamp (dz 3.2) · the empty CHAIR (dz 3.9) · the red alarm wash (alarmK, from "The alarm goes off").
//   THE MAP → GLOBE: the wall map is drawn with earth.js (style 'flat', phosphor green, real coastlines) in exactly the
//     same projection as the real globe (lat0 90, lon0 −98), so the CUT is a pure crossfade (globeMix) while the room
//     around it fades to space. After it: the real Earth (style 'day', real Sun for 26 Sep 1983 20:15 UTC: the USSR in
//     night with city lights, the US in late-afternoon daylight), a faint phosphor graticule (beats 2–5), stars.
//   PHASE B extras: the Sun's glow (sunK, beats 6–7, off-screen lower left) — the orbit/satellite/glint/arcs are
//     drawn by SCENES with the helpers below.
//   FOREGROUND: a slow red alarm pulse on the frame edges (edgeK) from the cut until the false-alarm stamp.
//   HUD: topBar (title automatic) + an amber "MOSCOW TIME" clock readout, top right (x ≤ 1016, y 250–340), beats 2–5
//     (hudClockK); it counts 00:15 → 00:38 from "And waits", landing on "Twenty-three minutes" — s05 builds on it.
//
// STORY STATE (pure functions of gt; scenes read these, never re-time them):
//   moments(tl)          every story beat's key instant (absolute s), shared by the scenes AND the sound cues.
//   launchState(gt, tl)  the 5 detected launches (t0 = moments().launches); p = fraction of the full
//                        US→USSR path drawn (eases to FLY_MAX = 0.42 and creeps); grey (beat 5 stamp) and alpha (gone
//                        by beat 6 + 0.6). Arc i starts at LAUNCH[i] (= the glint cloud GLINTS[i]: the "launches" were
//                        the glints) and heads for TARGET[i].
//   storyClock(gt, tl)   {min, text: '00:14'}.  lampK / alarmK / roomK / globeMix / sunK / edgeK: see below.
import * as L from '../../../engine/runtime/lib.js';
import { beatCues, stars, topBar } from '../../../engine/runtime/kit.js';
import { drawEarth, geoPath, basis, isLand, warm } from '../../../engine/runtime/earth.js';
import {
  FOCAL, CEIL_Y, BOARD, MAP, CLOCK, DATE, CONSOLES, DESK, PHONE, CHAIR, R_EARTH_KM, KM_PER_U, GLOBE, GLOBE_AT, MPP,
  SHOTS, at as camAt, shotAt, shotStart, B, PH, END, ANCHOR,
} from './camera.js';
warm();

export {
  FOCAL, CEIL_Y, BOARD, MAP, CLOCK, DATE, CONSOLES, DESK, PHONE, CHAIR, R_EARTH_KM, KM_PER_U, GLOBE, GLOBE_AT, MPP,
  shotAt, shotStart, B, PH, END,
};

const { W, H } = L;
const TAU = Math.PI * 2, DEG = Math.PI / 180;

// ------------------------------------------------------------------ palette + type
export const ACCENT = [220, 60, 50];                  // alarm red (episode accent)
export const RED_LAMP = [255, 72, 52];                // the lit СТАРТ glass
export const PHOSPHOR = [110, 255, 170];              // CRT green
export const PHOS_DIM = [40, 120, 80];
export const AMBER = [255, 176, 64];                  // clocks, lamps
export const COLD = [236, 242, 246];                  // cold white type
export const STEEL = [44, 52, 54];
export const BUNKER = [12, 20, 22];                   // near-black blue-green
export const SPACE = [3, 6, 11];
/** Cyrillic-safe condensed face (Avenir has no Cyrillic): use for every Russian word. */
export const CYR = '"PT Sans Narrow", "PT Sans", "Helvetica Neue", sans-serif';
export const cyr = (size, weight = 700) => `${weight} ${size}px ${CYR}`;
if (typeof document !== 'undefined') {
  await Promise.all([cyr(40, 700), cyr(40, 400)].map((f) => document.fonts.load(f, 'СТАРТ ЛОЖНАЯ ТРЕВОГА').catch(() => null)));
}

// ------------------------------------------------------------------ timing (absolute seconds, from the timeline)
const S = (tl, i) => tl.scenes[i].start;
/** Spoken length of phrase j of line i. */
const PD = (tl, i, j) => tl.lines[i].phrases[j].end - tl.lines[i].phrases[j].start;
/** A moment inside phrase j of line i: its start + frac × its spoken length (+ dt). frac ≈ the word's character
 *  position in the phrase text (no word timings exist), e.g. "high" in "The computer rates it: high reliability." ≈ 0.55. */
export const PT = (tl, i, j, frac = 0, dt = 0) => PH(i, j)(tl) + frac * PD(tl, i, j) + dt;
/** Every key story instant (absolute seconds), derived from the timeline. Scenes draw from these, env.cues() sounds
 *  them: picture and sound can never drift apart. */
export function moments(tl) {
  const p31 = PH(3, 1)(tl);
  return {
    tag: PH(0, 1)(tl),                                   // s00: the teleprinter verdict types in
    clockFlip: PH(1, 1)(tl),                             // s01: wall clock 00:14 → 00:15 ("Just after midnight")
    kal: PH(1, 2)(tl) + 0.35,                            // s01: KAL 007 mark + teleprinter card (after the 'wall' push starts)
    tension: PT(tl, 1, 2, 0.68),                         // s01: "Tension is at its peak"
    launches: launchTimes(tl),                           // s02: the 5 detections
    relyIn: PH(2, 3)(tl) + 0.05,                         // s02: the reliability panel appears ("The computer rates it")
    relyLit: PT(tl, 2, 3, 0.52),                         // s02: ВЫСОКАЯ lights up ("high reliability")
    chain: [p31 - 0.12, p31 + 0.16, p31 + 0.44, p31 + 0.74],   // s03: chain boxes land
    war: PT(tl, 3, 2, 0.32),                             // s03: COUNTERSTRIKE → NUCLEAR WAR ("a full nuclear war")
    ghosts: PT(tl, 4, 0, 0.12),                          // s04: the ghost first strike launches (lands on "hundreds")
    radar: PH(4, 1)(tl),                                 // s04: radar fans
    stampFall: PT(tl, 5, 0, 0.48, -0.3),                 // s05: the stamp drops …
    stampHit: PT(tl, 5, 0, 0.48),                        //      … and lands on "false alarm"
    waitFrom: PH(5, 1)(tl) - 0.05,                       // s05/HUD: the minute count starts ("And waits")
    waitTo: PT(tl, 5, 2, 0.12),                          //      … and lands on 00:38 / +23 MIN ("Twenty-three minutes")
    nothing: PT(tl, 5, 2, 0.57),                         // s05: NO MISSILES ARRIVED (on "nothing")
    glint: PH(6, 1)(tl),                                 // s06: sunlight → clouds → satellite
    secret: PH(6, 2)(tl) + 0.05,                         // s06: SECRET UNTIL 1998
    years: [PT(tl, 6, 2, 0.25), PT(tl, 6, 2, 0.9)],      // s06: the 1983 → 1998 bar fills ("for fifteen years")
    choices: [PT(tl, 7, 0, 0.3), PT(tl, 7, 0, 0.66)],    // s07: A / B light in turn
    comments: PH(7, 1)(tl) - 0.05,                       // s07: TELL ME IN THE COMMENTS
  };
}
/** The match-cut: wall map → real Earth, room → space (fixed to the 'map' shot: it starts at beat 2 − 0.3 s). */
export const cutWindow = (tl) => { const t0 = shotStart('map', tl) + 0.64; return { t0, t1: t0 + 0.65 }; };
/** 1 = the bunker is visible; → 0 across the cut and never comes back. */
export function roomK(gt, tl) { const w = cutWindow(tl); return 1 - L.smoothstep(L.prog(gt, w.t0, w.t1 - w.t0)); }
/** 0 = the green wall map, 1 = the real Earth (same disc, same projection). */
export const globeMix = (gt, tl) => 1 - roomK(gt, tl);
/** The СТАРТ lamp: lit in the hook (slow 0.7 Hz breathing, no strobe), dark in beat 1, lit again on "The alarm goes off". */
export function lampK(gt, tl) {
  const alarm = PH(2, 0)(tl);
  const breathe = 0.88 + 0.12 * Math.sin(gt * TAU * 0.7);
  if (gt < S(tl, 1)) return breathe;
  const off = 1 - L.ease.inOutCubic(L.prog(gt, S(tl, 1) + 0.2, 0.6));
  const on = L.prog(gt, alarm - 0.02, 0.1);
  return Math.max(0.1, L.lerp(off, 1, on)) * (on > 0 ? breathe : 1);
}
/** The red alarm wash over the room (from "The alarm goes off"). */
export const alarmK = (gt, tl) => L.prog(gt, PH(2, 0)(tl) - 0.02, 0.12) * (0.75 + 0.25 * Math.sin(gt * TAU * 0.75));
/** Red edge pulse in the globe phase: from the cut to the FALSE ALARM stamp (beat 5 + 0.4 s). */
export function edgeK(gt, tl) {
  const k = L.prog(gt, cutWindow(tl).t1, 0.4) * (1 - L.ease.inCubic(L.prog(gt, moments(tl).stampHit, 0.6)));
  return k * (0.55 + 0.45 * Math.sin(gt * TAU * 0.75));
}
/** The orbit view: Sun glow, stars brighter (beat 6 on). */
export const sunK = (gt, tl) => L.ease.inOutCubic(L.prog(gt, S(tl, 6) + 0.3, 1.6));
/** Faint phosphor graticule on the real globe (the cut → beat 6). */
export const gratK = (gt, tl) => globeMix(gt, tl) * (1 - L.prog(gt, S(tl, 6), 1.2));
/** HUD clock readout (beats 2–5). */
export const hudClockK = (gt, tl) => L.ease.outCubic(L.prog(gt, cutWindow(tl).t1 + 0.2, 0.5)) * (1 - L.ease.inCubic(L.prog(gt, S(tl, 6) - 0.45, 0.35)));   // gone before beat 6's chapter badge

/** Moscow time on screen: 00:14, 00:15 from "Just after midnight"; from "And waits" it counts the 23 minutes
 *  (script.md FACT-CHECK) to 00:38, easing out so 00:38 lands on "Twenty-three minutes" (moments waitFrom → waitTo),
 *  then holds. Integer minutes from the frame index: frame-stable. */
export function storyClock(gt, tl) {
  let min = gt < PH(1, 1)(tl) ? 14 : 15;
  const m = moments(tl), f = Math.round(gt * 30), f0 = Math.round(m.waitFrom * 30), f1 = Math.round(m.waitTo * 30);
  if (f >= f0) min = 15 + Math.min(23, Math.floor(23 * L.ease.outCubic(L.clamp((f - f0) / Math.max(1, f1 - f0))) + 1e-6));
  return { min, text: `00:${String(min).padStart(2, '0')}` };
}

// ------------------------------------------------------------------ PHASE A: perspective helpers (metres)
const AY = H * ANCHOR;
const MIN_M = 0.00032;          // closer than this (m/px) = the object is at / behind the lens: not drawn
/** m/px at depth dz in front of the wall (camera.js). */
export const mppAt = (v, dz = 0) => v.cam.mpp - dz / FOCAL;
/** World (x, y, dz) → screen {x, y, s: px per metre}, or null if at / behind the camera. */
export function proj(v, x, y, dz = 0) {
  const m = mppAt(v, dz);
  if (m <= MIN_M) return null;
  return { x: W / 2 + (x - v.cam.x) / m, y: AY + (y - v.cam.y) / m, s: 1 / m };
}
/** Run fn() with the canvas transform set so that 1 unit = 1 metre on the plane at depth dz. Returns false if culled. */
export function plane(c, v, dz, fn) {
  const m = mppAt(v, dz);
  if (m <= MIN_M) return false;
  c.save();
  c.translate(W / 2 - v.cam.x / m, AY - v.cam.y / m);
  c.scale(1 / m, 1 / m);
  fn();
  c.restore();
  return true;
}
/** Screen rect {x, y, w, h, s} of a wall-plane rect given by centre (cx, cy) and size (w, h) at depth dz. */
export function rectScreen(v, cx, cy, w, h, dz = 0) {
  const p = proj(v, cx - w / 2, cy - h / 2, dz);
  if (!p) return null;
  return { x: p.x, y: p.y, w: w * p.s, h: h * p.s, s: p.s, cx: p.x + (w * p.s) / 2, cy: p.y + (h * p.s) / 2 };
}
export const boardRect = (v) => rectScreen(v, BOARD.x, BOARD.y, BOARD.w, BOARD.h);
/** 1 when a screen rect sits fully inside the frame (sides + `top`) with a 60 px margin, easing to 0 as it nears an
 *  edge: wall instruments fade out BEFORE the camera crops them (nothing is ever cut by the frame edges). */
export function frameK(r, top = -1e9, ramp = 60) {
  if (!r) return 0;
  const m = Math.min(r.x, W - (r.x + r.w), r.y - top);
  return L.smoothstep(L.clamp(m / ramp));
}
/** The wall clock / date panel incl. their engraved labels (screen rect). */
const clockZone = (v, R) => rectScreen(v, R.x, R.y + 0.06, R.w + 0.36, R.h + 0.34);
/** СТАРТ board visibility: never ghosts under the HUD band (top bar + chapter card, y < 330). */
export const boardK = (v) => frameK(boardRect(v), 300, 40);
/** The СТАРТ glass inside the board (screen rect). */
export const lampRect = (v) => rectScreen(v, BOARD.x, BOARD.y - 0.17, 2.0, 0.6);
export const clockRect = (v) => rectScreen(v, CLOCK.x, CLOCK.y, CLOCK.w, CLOCK.h);
export const dateRect = (v) => rectScreen(v, DATE.x, DATE.y, DATE.w, DATE.h);
export const deskRect = (v) => rectScreen(v, (DESK.x0 + DESK.x1) / 2, DESK.top / 2, DESK.x1 - DESK.x0, -DESK.top, DESK.dz);
/** The phone's base centre on the desk (screen) + px per metre at its depth. */
export const phoneAt = (v) => proj(v, PHONE.x, PHONE.y, PHONE.dz);
export const chairRect = (v) => rectScreen(v, CHAIR.x, (CHAIR.top - 0.02) / 2, CHAIR.w + 0.16, -(CHAIR.top - 0.02), CHAIR.dz);
/** Text drawn in metres on a plane (call inside plane()): size = cap height-ish in metres. */
function mtext(c, str, x, y, size, { font = CYR, weight = 700, color = COLD, align = 'center', track = 0 } = {}) {
  c.save();
  c.translate(x, y);
  c.scale(size / 100, size / 100);
  c.font = `${weight} 100px ${font}`;
  c.fillStyle = typeof color === 'string' ? color : L.rgba(color);
  c.textBaseline = 'middle';
  L.trackedText(c, str, 0, 0, track, align);
  c.restore();
}

// ------------------------------------------------------------------ 7-segment digits (any units)
const SEGS = { 0: 'abcdef', 1: 'bc', 2: 'abged', 3: 'abgcd', 4: 'fgbc', 5: 'afgcd', 6: 'afgedc', 7: 'abc', 8: 'abcdefg', 9: 'abcfgd', '-': 'g' };
/** Draw `str` (digits, ':', '.', '-') as 7-segment digits; (x, y) = top-left, h = digit height. Returns the width.
 *  on/off: [r,g,b]; off segments are drawn faintly (period LED look). glow: shadow blur in the current units. */
export function seg7(c, str, x, y, h, on = AMBER, { offA = 0.08, alpha = 1, glow = 0 } = {}) {
  const w = h * 0.52, t = h * 0.11, gap = h * 0.2, sk = h * 0.06;
  const seg = (k, X, Y) => {
    const hx = w - t, hy = (h - t) / 2;
    const P = { a: [X, Y, hx, 0], g: [X, Y + hy, hx, 0], d: [X, Y + 2 * hy, hx, 0], f: [X, Y, 0, hy], b: [X + hx, Y, 0, hy], e: [X, Y + hy, 0, hy], c: [X + hx, Y + hy, 0, hy] }[k];
    const [px, py, dx, dy] = P;
    c.beginPath();
    if (dx) { // horizontal hexagon
      const x0 = px + t * 0.6, x1 = px + dx - t * 0.6 + t, yy = py + t / 2;
      c.moveTo(x0, yy); c.lineTo(x0 + t / 2, yy - t / 2); c.lineTo(x1 - t / 2, yy - t / 2); c.lineTo(x1, yy); c.lineTo(x1 - t / 2, yy + t / 2); c.lineTo(x0 + t / 2, yy + t / 2);
    } else {
      const y0 = py + t * 0.6, y1 = py + dy - t * 0.6 + t, xx = px + t / 2;
      c.moveTo(xx, y0); c.lineTo(xx + t / 2, y0 + t / 2); c.lineTo(xx + t / 2, y1 - t / 2); c.lineTo(xx, y1); c.lineTo(xx - t / 2, y1 - t / 2); c.lineTo(xx - t / 2, y0 + t / 2);
    }
    c.closePath();
    c.fill();
  };
  c.save();
  c.transform(1, 0, -sk / h, 1, sk, 0);   // slight italic, like real LED digits
  let cx = x;
  for (const ch of String(str)) {
    if (ch === ':' || ch === '.') {
      c.fillStyle = L.rgba(on, alpha);
      if (glow) { c.shadowColor = L.rgba(on, 0.8 * alpha); c.shadowBlur = glow; }
      const r = t * 0.62;
      if (ch === ':') { c.beginPath(); c.arc(cx + r, y + h * 0.3, r, 0, TAU); c.arc(cx + r, y + h * 0.72, r, 0, TAU); c.fill(); }
      else { c.beginPath(); c.arc(cx + r, y + h - r, r, 0, TAU); c.fill(); }
      c.shadowBlur = 0;
      cx += r * 2 + gap * 0.7;
      continue;
    }
    const lit = SEGS[ch] ?? '';
    for (const k of 'abcdefg') {
      const isOn = lit.includes(k);
      if (!isOn && offA <= 0) continue;
      c.fillStyle = L.rgba(on, isOn ? alpha : offA * alpha);
      if (isOn && glow) { c.shadowColor = L.rgba(on, 0.8 * alpha); c.shadowBlur = glow; } else c.shadowBlur = 0;
      seg(k, cx, y);
    }
    cx += w + gap;
  }
  c.restore();
  return cx - gap - x;
}
export const seg7Width = (str, h) => { let wd = 0; for (const ch of String(str)) wd += ch === ':' || ch === '.' ? h * 0.11 * 1.24 + h * 0.14 : h * 0.52 + h * 0.2; return wd - h * 0.2; };

// ------------------------------------------------------------------ PHASE B: the globe, its geometry, the sky
/** earth.js view of the globe at this frame (screen px): {cx, cy, r, lat0, lon0, rot, tilt}. */
export function globeView(v) {
  return { cx: v.wx(MAP.x), cy: v.wy(MAP.y), r: MAP.r / v.cam.mpp, lat0: GLOBE.lat0, lon0: GLOBE.lon0, rot: 0, tilt: 0 };
}
/** The Sun on 26 Sep 1983, 00:15 Moscow summer time = 20:15 UTC on 25 Sep: subsolar point (declination −0.9°,
 *  longitude −121.7° incl. the equation of time). The US is in afternoon light, the USSR in night. */
export const SUN_LL = { lat: -0.9, lon: -121.7 };
const v3 = (lat, lon, k = 1) => [k * Math.cos(lat * DEG) * Math.cos(lon * DEG), k * Math.cos(lat * DEG) * Math.sin(lon * DEG), k * Math.sin(lat * DEG)];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
/** Earth-frame vector (units of Earth radii; x → 0°N 0°E, z → North Pole) → screen {x, y, z, hidden}.
 *  hidden = behind the globe's disc (far side). */
export function earth3(view, p) {
  const b = basis(view);
  const X = dot(p, b.r), Y = dot(p, b.u), Z = dot(p, b.c);
  return { x: view.cx + X * view.r, y: view.cy - Y * view.r, z: Z, hidden: Z < 0 && X * X + Y * Y < 1 };
}
/** lat/lon/alt (alt in Earth radii above the surface) → screen {x, y, z, hidden}. */
export const geo = (view, lat, lon, alt = 0) => earth3(view, v3(lat, lon, 1 + alt));
/** Unit screen direction from the globe centre toward the Sun (the Sun is ~in the screen plane in this pole view). */
export function sunDir(view) {
  const p = earth3({ ...view, cx: 0, cy: 0, r: 1 }, v3(SUN_LL.lat, SUN_LL.lon));
  const n = Math.hypot(p.x, p.y) || 1;
  return { x: p.x / n, y: p.y / n };
}
/** cos(angle to the Sun) at a surface point: > 0 day, < 0 night (cloud / feature shading by the terminator). */
export const sunDot = (lat, lon) => dot(v3(lat, lon), v3(SUN_LL.lat, SUN_LL.lon));
/** Where the Sun's glow sits on screen (far off the lower-left of the globe). */
export const sunPos = (view, dist = Math.max(view.r * 6.5, 950)) => { const d = sunDir(view); return { x: view.cx + d.x * dist, y: view.cy + d.y * dist }; };

// --- the 5 detections and their cause
/** High clouds over the US northern plains where sunlight glinted (= where the satellite "saw" launches). No named base. */
export const GLINTS = [
  { lat: 47.2, lon: -103.2 }, { lat: 46.0, lon: -106.6 }, { lat: 48.4, lon: -100.4 }, { lat: 44.9, lon: -102.0 }, { lat: 47.9, lon: -108.6 },
];
export const LAUNCH = GLINTS;
/** Where each detected "missile" was heading (central Russia: the arcs only fly FLY_MAX of the way). */
export const TARGET = [
  { lat: 55.7, lon: 37.6 }, { lat: 59.9, lon: 30.3 }, { lat: 56.8, lon: 60.6 }, { lat: 54.9, lon: 73.4 }, { lat: 53.2, lon: 50.1 },
];
export const ARC_ALT = 0.17;    // ballistic apogee ≈ 1,100 km (fraction of the Earth's radius), for the path's bulge
export const FLY_MAX = 0.42;    // detections, not impacts: the drawn arcs stop well short of the USSR
/** Point s (0 launch → 1 target) on a great-circle path from A to B with a ballistic bulge (alt), as a 3-vector. */
export function path3(A, Bp, s, alt = ARC_ALT) {
  const a = v3(A.lat, A.lon), b = v3(Bp.lat, Bp.lon);
  const om = Math.acos(L.clamp(dot(a, b), -1, 1)), so = Math.sin(om) || 1;
  const ka = Math.sin((1 - s) * om) / so, kb = Math.sin(s * om) / so;
  const h = 1 + alt * Math.sin(Math.PI * L.clamp(s));
  return [(ka * a[0] + kb * b[0]) * h, (ka * a[1] + kb * b[1]) * h, (ka * a[2] + kb * b[2]) * h];
}
/** Screen point s along detected launch i. */
export const arcPt = (view, i, s) => earth3(view, path3(LAUNCH[i], TARGET[i], s));
/** Trace launch i from s0 to s1 (beginPath first; then stroke). */
export function traceArc(c, view, i, s0, s1, n = 40) {
  for (let k = 0; k <= n; k++) {
    const p = arcPt(view, i, L.lerp(s0, s1, k / n));
    if (k === 0) c.moveTo(p.x, p.y); else c.lineTo(p.x, p.y);
  }
}
/** Launch times (absolute s): arc 1 on "a US missile launch" (≈ half-way through phrase 0), arc 2 on "Then
 *  another", 3–5 on "Five in total". */
export function launchTimes(tl) {
  const p1 = PH(2, 1)(tl), p2 = PH(2, 2)(tl);
  return [PT(tl, 2, 0, 0.48), p1, p2, p2 + 0.18, p2 + 0.36];
}
/** State of the 5 detections at gt: [{t0, p (path fraction drawn), on (0/1 launched), grey (0→1 in beat 5), alpha}]. */
export function launchState(gt, tl) {
  const ts = launchTimes(tl), b6 = S(tl, 6);
  const grey = L.ease.inOutCubic(L.prog(gt, moments(tl).stampHit - 0.05, 0.8));
  const alpha = L.lerp(1, 0.4, grey) * (1 - L.ease.inCubic(L.prog(gt, b6, 0.6)));
  return ts.map((t0) => {
    const dt = gt - t0;
    const p = dt <= 0 ? 0 : FLY_MAX * L.ease.outCubic(L.clamp(dt / 2.2)) + 0.012 * Math.max(0, dt - 2.2) * (1 - grey);
    return { t0, p: Math.min(p, FLY_MAX + 0.12), on: dt >= 0 ? 1 : 0, grey, alpha };
  });
}
/** Detections counted on screen at gt (0..5): integer, frame-stable. */
export const detections = (gt, tl) => launchTimes(tl).filter((t) => Math.round(gt * 30) >= Math.round(t * 30)).length;

// --- the ghost "hundreds" (what a real first strike looks like: beat 4)
/** 300 deterministic ghost paths: US launch points on land → USSR targets on land, with a stagger `d` (0..1). */
export const GHOSTS = (() => {
  const r = L.rng(1983), out = [];
  let guard = 0;
  while (out.length < 300 && guard++ < 20000) {
    const a = { lat: 33 + r() * 16, lon: -122 + r() * 40 };
    const b = { lat: 44 + r() * 22, lon: 26 + r() * 110 };
    if (!isLand(a.lat, a.lon) || !isLand(b.lat, b.lon)) continue;
    out.push({ a, b, d: r(), fly: 0.45 + r() * 0.5, alt: 0.12 + r() * 0.1 });
  }
  return out;
})();
export const ghostPt = (view, g, s) => earth3(view, path3(g.a, g.b, s, g.alt));
export function traceGhost(c, view, g, s0, s1, n = 18) {
  for (let k = 0; k <= n; k++) {
    const p = ghostPt(view, g, L.lerp(s0, s1, k / n));
    if (k === 0) c.moveTo(p.x, p.y); else c.lineTo(p.x, p.y);
  }
}

// --- Soviet ground early-warning radars (beat 4): positions only, nothing named on screen
export const RADARS = [
  { lat: 68.1, lon: 33.9 }, { lat: 65.2, lon: 57.3 }, { lat: 56.7, lon: 21.9 }, { lat: 52.9, lon: 103.1 }, { lat: 46.6, lon: 74.5 },
  { lat: 45.0, lon: 33.4 },
];
export const RADAR_RANGE_KM = 4800;
/** A radar fan on screen: site {x, y}, axis angle `ang` (rad, screen; points toward the North Pole = the US threat
 *  axis), half-spread `spread` (rad), range `len` (px, ≈ 4,800 km along the surface, approximated in the plane). */
export function radarFan(view, i) {
  const R = RADARS[i], p = geo(view, R.lat, R.lon);
  const ang = Math.atan2(view.cy - p.y, view.cx - p.x);
  // range: illustrative, but capped at 42 % of the way to the pole so the six fans never knot together there
  const toPole = Math.hypot(view.cx - p.x, view.cy - p.y);
  return { x: p.x, y: p.y, ang, spread: 0.32, len: Math.max(0, Math.min((RADAR_RANGE_KM / R_EARTH_KM) * view.r * 0.8, toPole * 0.42)) };
}

// --- the Oko satellite on its Molniya orbit (beat 6)
/** Molniya orbit, Earth radii: perigee ≈ 600 km, apogee ≈ 39,700 km, inclination 63.4°, apogee over the north.
 *  APO_LON: the longitude under the apogee in this frame (illustrative; nothing on screen names it). */
export const MOLNIYA = { rp: 1 + 600 / R_EARTH_KM, ra: 1 + 39700 / R_EARTH_KM, inc: 63.4, apoLon: 5 };   // apogee east of the globe on screen: sunlight in from the lower left, glint out to the right — a visible ≈ 30° bend at the clouds
/** Orbit point at true anomaly nu (rad; 0 = perigee, π = apogee) as an Earth-frame 3-vector. */
export function orbit3(nu) {
  const { rp, ra, inc, apoLon } = MOLNIYA;
  const a = (rp + ra) / 2, e = (ra - rp) / (ra + rp);
  const r = (a * (1 - e * e)) / (1 + e * Math.cos(nu));
  const A = v3(inc, apoLon), N = [-Math.sin(apoLon * DEG), Math.cos(apoLon * DEG), 0];   // apogee dir, line of nodes
  const c = Math.cos(nu), s = Math.sin(nu);
  return [r * (-c * A[0] + s * N[0]), r * (-c * A[1] + s * N[1]), r * (-c * A[2] + s * N[2])];
}
export const orbitPt = (view, nu) => earth3(view, orbit3(nu));
/** Trace the whole orbit (beginPath first). Points behind the globe are skipped (path breaks). */
export function traceOrbit(c, view, n = 180) {
  let pen = false;
  for (let k = 0; k <= n; k++) {
    const p = orbitPt(view, (k / n) * TAU);
    if (p.hidden) { pen = false; continue; }
    if (!pen) { c.moveTo(p.x, p.y); pen = true; } else c.lineTo(p.x, p.y);
  }
}
/** The satellite near apogee, creeping (true anomaly in rad) during beats 6–7 (capped: beat 6 is long now). */
export const satNu = (gt, tl) => Math.PI - 0.22 + 0.03 * Math.min(9, Math.max(0, gt - S(tl, 6)));
export const satPos = (view, gt, tl) => orbitPt(view, satNu(gt, tl));
/** Screen points of glint ray i: from the Sun (off-screen) → the cloud → the satellite. */
export function glintRay(view, i, gt, tl) {
  const g = GLINTS[i], cl = geo(view, g.lat, g.lon, 0.0016);   // ≈ 10 km cloud tops
  return { sun: sunPos(view), cloud: cl, sat: satPos(view, gt, tl) };
}

// ------------------------------------------------------------------ the room (phase A)
const LAMP_X = 0.35;            // the duty lamp sits at the desk's right end (clear of the chair pulled up to the desk)
function drawRoom(c, v, k) {
  const tl = v.tl, gt = v.gt;
  const lamp = lampK(gt, tl), alarm = alarmK(gt, tl);
  const Zc = v.cam.mpp * FOCAL;                    // eye-to-wall distance (m)
  const near = Math.max(0.2, Zc - 0.35);           // (as built: proj() culls this depth, so the ceiling plane never draws — kept dark on purpose: its strips would sit in the HUD band)
  c.save();
  c.globalAlpha *= k;
  // ---- ceiling plane (y = CEIL_Y), receding to the camera
  {
    const a = proj(v, -9, CEIL_Y, 0), b = proj(v, 9, CEIL_Y, 0), cN = proj(v, 9, CEIL_Y, near), dN = proj(v, -9, CEIL_Y, near);
    if (a && cN && a.y > -50) {
      c.fillStyle = 'rgb(7,11,13)';
      c.beginPath(); c.moveTo(a.x, a.y); c.lineTo(b.x, b.y); c.lineTo(cN.x, cN.y); c.lineTo(dN.x, dN.y); c.closePath(); c.fill();
      // fluorescent strips
      for (const dz of [0.9, 2.4, 3.9, 5.4]) {
        if (dz > near - 0.2) continue;
        for (const x0 of [-3.4, -0.6, 2.2]) {
          const p0 = proj(v, x0, CEIL_Y, dz), p1 = proj(v, x0 + 1.2, CEIL_Y, dz + 0.12);
          if (!p0 || !p1) continue;
          c.fillStyle = 'rgba(190,225,215,0.55)';
          c.fillRect(p0.x, Math.min(p0.y, p1.y), p1.x - p0.x, Math.max(1.5, Math.abs(p1.y - p0.y)));
          L.lightBlob(c, (p0.x + p1.x) / 2, p0.y, (p1.x - p0.x) * 0.6, [150, 210, 200], 0.08);
        }
      }
    }
  }
  // edge fades: the board never slides under the HUD, the clock / date never get cropped by the frame sides
  const bk = boardK(v), ck = frameK(clockZone(v, CLOCK)), dk = frameK(clockZone(v, DATE));
  // ---- the wall (dz 0)
  plane(c, v, 0, () => {
    const g = c.createLinearGradient(0, CEIL_Y, 0, 0);
    g.addColorStop(0, 'rgb(14,24,26)'); g.addColorStop(0.55, 'rgb(17,29,31)'); g.addColorStop(1, 'rgb(10,17,19)');
    c.fillStyle = g;
    c.fillRect(-9, CEIL_Y, 18, -CEIL_Y);
    // concrete panel seams
    c.strokeStyle = 'rgba(0,0,0,0.45)';
    c.lineWidth = 0.012;
    c.beginPath();
    for (let x = -8.75; x <= 9; x += 1.25) { c.moveTo(x, CEIL_Y); c.lineTo(x, 0); }
    for (const y of [-5.25, -1.8]) { c.moveTo(-9, y); c.lineTo(9, y); }
    c.stroke();
    c.strokeStyle = 'rgba(120,170,160,0.05)';
    c.beginPath();
    for (let x = -8.74; x <= 9; x += 1.25) { c.moveTo(x, CEIL_Y); c.lineTo(x, 0); }
    c.stroke();
    // a dark plinth band at the base
    c.fillStyle = 'rgb(8,12,13)';
    c.fillRect(-9, -0.18, 18, 0.18);
    drawSidePanels(c, gt, v);
    drawLowerBank(c, gt);
    const a0 = c.globalAlpha;
    c.globalAlpha = a0 * bk;
    drawBoard(c, lamp);
    c.globalAlpha = a0 * ck;
    drawClock(c, storyClock(gt, tl).text, CLOCK);
    mtext(c, 'МОСКОВСКОЕ ВРЕМЯ', CLOCK.x, CLOCK.y + CLOCK.h / 2 + 0.09, 0.075, { color: [150, 170, 165], weight: 400, track: 4 });
    c.globalAlpha = a0 * dk;
    drawClock(c, '26.09.83', DATE);
    mtext(c, 'ДАТА', DATE.x, DATE.y + DATE.h / 2 + 0.09, 0.075, { color: [150, 170, 165], weight: 400, track: 4 });
    c.globalAlpha = a0;
    // map panel frame (the disc itself is drawn by drawMapDisc)
    const P = MAP.panel;
    c.fillStyle = 'rgb(6,12,12)';
    c.fillRect(MAP.x - P / 2, MAP.y - P / 2, P, P);
    c.strokeStyle = 'rgb(46,58,58)';
    c.lineWidth = 0.05;
    c.strokeRect(MAP.x - P / 2, MAP.y - P / 2, P, P);
    c.strokeStyle = L.rgba(PHOSPHOR, 0.18);
    c.lineWidth = 0.006;
    for (let i = 0; i <= 20; i++) {   // edge ticks
      const t = MAP.x - P / 2 + 0.08 + (i / 20) * (P - 0.16);
      c.beginPath(); c.moveTo(t, MAP.y - P / 2 + 0.04); c.lineTo(t, MAP.y - P / 2 + (i % 5 ? 0.07 : 0.11)); c.stroke();
      c.beginPath(); c.moveTo(t, MAP.y + P / 2 - 0.04); c.lineTo(t, MAP.y + P / 2 - (i % 5 ? 0.07 : 0.11)); c.stroke();
    }
  });
  // red light of the board on the wall + ceiling
  const br = boardRect(v);
  if (br) L.lightBlob(c, br.cx, br.cy, br.w * 1.5, RED_LAMP, 0.42 * lamp * bk);
  c.restore();
}

function drawBoard(c, lamp) {
  const { x, y, w, h } = BOARD;
  c.fillStyle = 'rgb(30,35,36)';
  c.fillRect(x - w / 2, y - h / 2, w, h);
  c.strokeStyle = 'rgb(70,80,80)';
  c.lineWidth = 0.025;
  c.strokeRect(x - w / 2, y - h / 2, w, h);
  // rivets
  c.fillStyle = 'rgb(90,98,98)';
  for (const [dx, dy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) { c.beginPath(); c.arc(x + dx * (w / 2 - 0.06), y + dy * (h / 2 - 0.06), 0.018, 0, TAU); c.fill(); }
  // the СТАРТ glass
  const gx = x - 1.0, gy = y - 0.47, gw = 2.0, gh = 0.6;
  const lit = L.clamp(lamp);
  const g = c.createRadialGradient(x, gy + gh / 2, 0.05, x, gy + gh / 2, 1.1);
  g.addColorStop(0, L.rgba(L.mix([60, 12, 12], [255, 96, 70], lit)));
  g.addColorStop(1, L.rgba(L.mix([34, 8, 8], [170, 22, 16], lit)));
  c.fillStyle = g;
  c.fillRect(gx, gy, gw, gh);
  if (lit > 0.2) {
    c.save();
    c.shadowColor = L.rgba([255, 120, 90], 0.9 * lit);
    c.shadowBlur = 40;   // (px, unaffected by the plane scale)
    mtext(c, 'СТАРТ', x, gy + gh / 2 + 0.01, 0.46, { color: L.mix([110, 40, 36], [255, 236, 226], lit), track: 14 });
    c.restore();
  } else mtext(c, 'СТАРТ', x, gy + gh / 2 + 0.01, 0.46, { color: [80, 30, 28], track: 14 });
  // glass scanlines (subtle) + bezel
  c.fillStyle = 'rgba(0,0,0,0.12)';
  for (let yy = gy; yy < gy + gh; yy += 0.022) c.fillRect(gx, yy, gw, 0.007);
  c.strokeStyle = 'rgb(18,20,20)';
  c.lineWidth = 0.03;
  c.strokeRect(gx, gy, gw, gh);
  // reliability strip: label + amber window
  const sy = y + 0.2, sh = 0.22;
  c.fillStyle = 'rgb(16,18,18)';
  c.fillRect(gx, sy, 1.05, sh);
  mtext(c, 'ДОСТОВЕРНОСТЬ', gx + 0.525, sy + sh / 2, 0.105, { color: [200, 206, 200], weight: 700, track: 3 });
  const ag = L.mix([60, 40, 16], AMBER, lit);
  c.fillStyle = L.rgba(ag, 0.9);
  c.fillRect(gx + 1.12, sy, 0.88, sh);
  mtext(c, 'ВЫСОКАЯ', gx + 1.56, sy + sh / 2, 0.12, { color: L.mix([90, 70, 40], [40, 18, 6], lit), weight: 700, track: 4 });
}

function drawClock(c, str, R) {
  c.fillStyle = 'rgb(10,9,8)';
  c.fillRect(R.x - R.w / 2, R.y - R.h / 2, R.w, R.h);
  c.strokeStyle = 'rgb(60,62,60)';
  c.lineWidth = 0.02;
  c.strokeRect(R.x - R.w / 2, R.y - R.h / 2, R.w, R.h);
  const h = R.h * 0.62, wd = seg7Width(str, h);
  seg7(c, str, R.x - wd / 2, R.y - h / 2, h, AMBER, { offA: 0.07, glow: 18 });
}

function drawSidePanels(c, gt, v) {
  const r = L.rng(26);
  const a0 = c.globalAlpha;
  // every instrument fades out before the frame edge crops it (no half gauges / half lamps at the sides)
  const fk = (x, y, w, h) => { c.globalAlpha = a0 * frameK(rectScreen(v, x, y, w + 0.1, h + 0.1), -1e9, 40); return c.globalAlpha > 0.002; };
  for (const side of [-1, 1]) {
    const x0 = side < 0 ? -4.4 : 1.25, x1 = side < 0 ? -1.25 : 4.4, y0 = -3.7, y1 = -1.95;
    c.fillStyle = 'rgb(24,30,31)';
    c.fillRect(x0, y0, x1 - x0, y1 - y0);
    c.strokeStyle = 'rgb(52,62,62)';
    c.lineWidth = 0.02;
    c.strokeRect(x0, y0, x1 - x0, y1 - y0);
    if (fk((x0 + x1) / 2, y0 + 0.11, 0.6, 0.1)) mtext(c, side < 0 ? 'ПУЛЬТ 1' : 'ПУЛЬТ 2', (x0 + x1) / 2, y0 + 0.11, 0.08, { color: [170, 182, 176], track: 6 });
    c.globalAlpha = a0;
    // a CRT with a phosphor trace
    const cx = side < 0 ? x0 + 0.62 : x1 - 0.62, cy = -2.75, cw = 0.85, ch = 0.62;
    fk(cx, cy, cw, ch);
    c.fillStyle = 'rgb(4,14,10)';
    L.roundRect(c, cx - cw / 2, cy - ch / 2, cw, ch, 0.08); c.fill();
    c.strokeStyle = L.rgba(PHOSPHOR, 0.75);
    c.lineWidth = 0.012;
    c.beginPath();
    for (let i = 0; i <= 40; i++) {
      const tx = cx - cw / 2 + 0.06 + (i / 40) * (cw - 0.12);
      const ty = cy + Math.sin(i * 0.5 + gt * 2.2 * side) * 0.09 * Math.sin(i * 0.13 + 1);
      if (i === 0) c.moveTo(tx, ty); else c.lineTo(tx, ty);
    }
    c.stroke();
    c.strokeStyle = L.rgba(PHOSPHOR, 0.15);
    c.beginPath(); c.moveTo(cx - cw / 2 + 0.05, cy); c.lineTo(cx + cw / 2 - 0.05, cy); c.stroke();
    // gauges
    const gx0 = side < 0 ? x0 + 1.3 : x0 + 0.35;
    for (let i = 0; i < 3; i++) {
      const gx = gx0 + i * 0.5, gy = -3.15, gr = 0.18;
      fk(gx, gy, 2 * gr, 2 * gr);
      c.fillStyle = 'rgb(206,200,180)';
      c.beginPath(); c.arc(gx, gy, gr, 0, TAU); c.fill();
      c.strokeStyle = 'rgb(20,20,20)'; c.lineWidth = 0.02; c.stroke();
      c.strokeStyle = 'rgba(30,30,30,0.6)'; c.lineWidth = 0.006;
      for (let a = 0; a <= 10; a++) { const an = Math.PI * (0.8 + 1.4 * a / 10); c.beginPath(); c.moveTo(gx + Math.cos(an) * gr * 0.72, gy + Math.sin(an) * gr * 0.72); c.lineTo(gx + Math.cos(an) * gr * 0.88, gy + Math.sin(an) * gr * 0.88); c.stroke(); }
      const an = Math.PI * (1.1 + 0.8 * (0.5 + 0.3 * r() + 0.04 * L.noise1(gt * 0.8, i + side * 7)));
      c.strokeStyle = 'rgb(180,30,24)'; c.lineWidth = 0.012;
      c.beginPath(); c.moveTo(gx, gy); c.lineTo(gx + Math.cos(an) * gr * 0.8, gy + Math.sin(an) * gr * 0.8); c.stroke();
    }
    // indicator lamps (slow deterministic blinks, ≤ 1 Hz)
    for (let row = 0; row < 3; row++) {
      for (let col = 0; col < 8; col++) {
        const lx = gx0 - 0.1 + col * 0.17, ly = -2.65 + row * 0.17;
        const kind = r(), ph = r() * TAU;
        const on = kind < 0.6 ? 1 : 0.5 + 0.5 * Math.sin(gt * TAU * 0.5 + ph) > 0.5 ? 1 : 0.25;
        const col3 = kind < 0.75 ? PHOSPHOR : kind < 0.92 ? AMBER : [255, 80, 60];
        fk(lx, ly, 0.07, 0.07);
        c.fillStyle = L.rgba(col3, 0.18 + 0.7 * on);
        c.beginPath(); c.arc(lx, ly, 0.035, 0, TAU); c.fill();
      }
    }
  }
  c.globalAlpha = a0;
}

function drawLowerBank(c, gt) {
  const r = L.rng(83);
  c.fillStyle = 'rgb(22,27,28)';
  c.fillRect(-4.4, -1.7, 8.8, 1.45);
  c.strokeStyle = 'rgb(48,56,56)';
  c.lineWidth = 0.015;
  c.strokeRect(-4.4, -1.7, 8.8, 1.45);
  for (let i = 0; i < 6; i++) {
    const x = -3.75 + i * 1.5, y = -1.25;
    c.fillStyle = 'rgb(4,14,10)';
    L.roundRect(c, x - 0.3, y - 0.22, 0.6, 0.44, 0.05); c.fill();
    c.fillStyle = L.rgba(PHOSPHOR, 0.55);
    for (let j = 0; j < 4; j++) c.fillRect(x - 0.24, y - 0.15 + j * 0.08, 0.2 + 0.25 * r(), 0.018);
    // toggle row
    for (let j = 0; j < 7; j++) {
      const tx = x - 0.33 + j * 0.11, ty = -0.62;
      c.fillStyle = 'rgb(150,156,150)'; c.fillRect(tx, ty - 0.05, 0.03, 0.1);
      c.fillStyle = 'rgb(70,74,72)'; c.fillRect(tx - 0.015, ty + 0.03, 0.06, 0.03);
    }
  }
}

/** The floor plane (y = 0) from the wall to the camera, with perspective joints and the board's red reflection. */
function drawFloor(c, v, k) {
  const Zc = v.cam.mpp * FOCAL, near = Math.max(0.2, Zc - 1.0);   // (proj() culls depths closer than Zc − 0.64: the floor was never drawn)
  const a = proj(v, -12, 0, 0), b = proj(v, 12, 0, 0), cN = proj(v, 12, 0, near), dN = proj(v, -12, 0, near);
  if (!a || !cN || a.y > H + 50) return;
  c.save();
  c.globalAlpha *= k;
  const g = c.createLinearGradient(0, a.y, 0, Math.min(H, cN.y));
  g.addColorStop(0, 'rgb(14,19,20)'); g.addColorStop(1, 'rgb(6,9,10)');
  c.fillStyle = g;
  c.beginPath(); c.moveTo(a.x, a.y); c.lineTo(b.x, b.y); c.lineTo(cN.x, cN.y); c.lineTo(dN.x, dN.y); c.closePath(); c.fill();
  c.save();
  c.beginPath(); c.moveTo(a.x, a.y); c.lineTo(b.x, b.y); c.lineTo(cN.x, cN.y); c.lineTo(dN.x, dN.y); c.closePath(); c.clip();
  // polished linoleum: alternate tiles a touch lighter (1 m grid), then the joints
  c.fillStyle = 'rgba(150,190,180,0.025)';
  for (let x = -12; x < 12; x += 1) {
    for (let dz = 0; dz < near; dz += 1) {
      if ((x + dz) % 2 === 0) continue;
      const p0 = proj(v, x, 0, dz), p1 = proj(v, x + 1, 0, dz), p2 = proj(v, x + 1, 0, Math.min(near, dz + 1)), p3 = proj(v, x, 0, Math.min(near, dz + 1));
      if (!p0 || !p2) continue;
      c.beginPath(); c.moveTo(p0.x, p0.y); c.lineTo(p1.x, p1.y); c.lineTo(p2.x, p2.y); c.lineTo(p3.x, p3.y); c.closePath(); c.fill();
    }
  }
  c.strokeStyle = 'rgba(120,160,150,0.11)';
  c.lineWidth = 1;
  c.beginPath();
  for (let x = -12; x <= 12; x += 1) { const p = proj(v, x, 0, 0), q = proj(v, x, 0, near); c.moveTo(p.x, p.y); c.lineTo(q.x, q.y); }
  for (let dz = 1; dz < near; dz += 1) { const p = proj(v, -12, 0, dz), q = proj(v, 12, 0, dz); c.moveTo(p.x, p.y); c.lineTo(q.x, q.y); }
  c.stroke();
  // reflections in the polished floor: mirror images (x, −y, dz) of the lit things, soft and stretched
  const lamp = lampK(v.gt, v.tl);
  const refl = (x, y, dz, rad, col, a) => {
    const p = proj(v, x, -y, dz);
    if (!p || a <= 0.002) return;
    c.save(); c.translate(p.x, p.y); c.scale(0.75, 1.6);
    L.lightBlob(c, 0, 0, rad * p.s, col, a);
    c.restore();
  };
  refl(0, BOARD.y, 0, 1.4, RED_LAMP, 0.16 * lamp + 0.05);
  refl(MAP.x, MAP.y, 0, 0.8, PHOSPHOR, 0.07);
  for (const side of [-1, 1]) refl(side * 2.85, -2.75, 0, 0.45, PHOSPHOR, 0.06);   // the side CRTs
  for (let i = 0; i < 4; i++) refl(CONSOLES.x0 + i * 2.15 + 1.0, CONSOLES.top - 0.3, CONSOLES.dz, 0.55, PHOSPHOR, 0.06);
  refl(LAMP_X - 0.42, DESK.top - 0.32, DESK.dz - 0.15, 0.4, AMBER, 0.2);              // the duty lamp
  // polished-floor streaks: the lamp's amber spill and the chair's dark shape + red rim, stretched toward the camera
  const streak = (x, dz, wM, lenM, col, a, dark = false) => {
    const p = proj(v, x, 0, dz);
    if (!p || a <= 0.002) return;
    const y1 = Math.min(p.y + lenM * p.s, 1360), w = wM * p.s;
    if (y1 <= p.y + 2) return;
    const g = c.createLinearGradient(0, p.y, 0, y1);
    g.addColorStop(0, L.rgba(col, a)); g.addColorStop(1, L.rgba(col, 0));
    c.save();
    if (!dark) c.globalCompositeOperation = 'lighter';
    c.fillStyle = g;
    c.beginPath(); c.moveTo(p.x - w / 2, p.y); c.lineTo(p.x + w / 2, p.y); c.lineTo(p.x + w * 0.35, y1); c.lineTo(p.x - w * 0.35, y1); c.closePath(); c.fill();
    c.restore();
  };
  streak(LAMP_X - 0.4, DESK.dz + 0.5, 0.22, 0.55, AMBER, 0.07);
  streak(LAMP_X - 0.4, DESK.dz + 0.5, 0.06, 0.7, [255, 214, 150], 0.06);
  streak(CHAIR.x, CHAIR.dz + 0.08, 0.7, 0.4, [0, 0, 0], 0.22, true);
  streak(CHAIR.x, CHAIR.dz + 0.08, 0.3, 0.3, RED_LAMP, 0.025 + 0.03 * lamp);
  for (const dz of [0.9, 2.4, 3.9, 5.4]) if (dz < near - 0.2) for (const x0 of [-3.4, -0.6, 2.2]) refl(x0 + 0.6, CEIL_Y, dz, 0.5, [150, 210, 200], 0.04);
  // a soft sheen band across the floor (the room's light glancing off the polish)
  const sh = proj(v, 0, 0, 2.2);
  if (sh) {
    const sg = c.createLinearGradient(0, sh.y - 60, 0, sh.y + 90);
    sg.addColorStop(0, 'rgba(160,200,190,0)'); sg.addColorStop(0.5, 'rgba(160,200,190,0.035)'); sg.addColorStop(1, 'rgba(160,200,190,0)');
    c.fillStyle = sg; c.fillRect(0, sh.y - 60, W, 150);
  }
  c.restore();
  c.restore();
}

/** Consoles, desk, phone, chair: the near layers (drawn over the map). */
function drawNear(c, v, k) {
  const gt = v.gt;
  c.save();
  c.globalAlpha *= k;
  // ---- consoles row (we see their backs; their CRT light spills up the wall)
  plane(c, v, CONSOLES.dz, () => {
    for (let i = 0; i < 4; i++) {
      const x0 = CONSOLES.x0 + i * 2.15, w = 2.0;
      c.fillStyle = 'rgb(28,33,34)';
      c.fillRect(x0, CONSOLES.top, w, -CONSOLES.top);
      c.fillStyle = 'rgb(46,54,55)';
      c.fillRect(x0, CONSOLES.top, w, 0.06);
      c.fillStyle = 'rgba(0,0,0,0.35)';
      for (let j = 0; j < 9; j++) c.fillRect(x0 + 0.2 + j * 0.18, CONSOLES.top + 0.25, 0.08, 0.32);   // vents
      // CRT hood behind
      c.fillStyle = 'rgb(22,26,27)';
      c.fillRect(x0 + 0.65, CONSOLES.top - 0.42, 0.7, 0.42);
      // ambient occlusion: dark toward the floor and into the side seams, a worn top lip, grime smudges
      const ao = c.createLinearGradient(0, -0.4, 0, 0);
      ao.addColorStop(0, 'rgba(0,0,0,0)'); ao.addColorStop(1, 'rgba(0,0,0,0.5)');
      c.fillStyle = ao; c.fillRect(x0, -0.4, w, 0.4);
      for (const [sx, sg] of [[x0, 1], [x0 + w, -1]]) {
        const eg = c.createLinearGradient(sx, 0, sx + sg * 0.12, 0);
        eg.addColorStop(0, 'rgba(0,0,0,0.42)'); eg.addColorStop(1, 'rgba(0,0,0,0)');
        c.fillStyle = eg; c.fillRect(Math.min(sx, sx + sg * 0.12), CONSOLES.top, 0.12, -CONSOLES.top);
      }
      c.fillStyle = 'rgba(0,0,0,0.3)'; c.fillRect(x0, CONSOLES.top + 0.06, w, 0.02);
      c.fillStyle = 'rgba(160,170,160,0.07)'; c.fillRect(x0 + 0.05, CONSOLES.top, w - 0.1, 0.012);
      for (let j = 0; j < 9; j++) {
        const [gx, gy, gr, ga] = CONSOLE_GRIME[i * 9 + j];
        const px = x0 + 0.1 + gx * (w - 0.2), py = CONSOLES.top + 0.12 + gy * (-CONSOLES.top - 0.2);
        const gg = c.createRadialGradient(px, py, 0, px, py, gr);
        gg.addColorStop(0, `rgba(6,8,6,${ga})`); gg.addColorStop(1, 'rgba(6,8,6,0)');
        c.fillStyle = gg; c.fillRect(px - gr, py - gr, 2 * gr, 2 * gr);
      }
    }
  });
  for (let i = 0; i < 4; i++) {
    const p = proj(v, CONSOLES.x0 + i * 2.15 + 1.0, CONSOLES.top - 0.45, CONSOLES.dz);
    if (p) L.lightBlob(c, p.x, p.y, 0.9 * p.s, PHOSPHOR, 0.05);
  }
  // ---- duty desk (top seen from above: far edge at dz 2.7, near edge at DESK.dz + 0.45)
  const dzF = DESK.dz - 0.5, dzN = DESK.dz + 0.45;
  const f0 = proj(v, DESK.x0, DESK.top, dzF), f1 = proj(v, DESK.x1, DESK.top, dzF), n1 = proj(v, DESK.x1, DESK.top, dzN), n0 = proj(v, DESK.x0, DESK.top, dzN);
  if (f0 && n1) {
    c.fillStyle = 'rgb(44,40,34)';   // worn laminate top
    c.beginPath(); c.moveTo(f0.x, f0.y); c.lineTo(f1.x, f1.y); c.lineTo(n1.x, n1.y); c.lineTo(n0.x, n0.y); c.closePath(); c.fill();
    plane(c, v, dzN, () => {
      c.fillStyle = 'rgb(26,28,27)';
      c.fillRect(DESK.x0, DESK.top, DESK.x1 - DESK.x0, -DESK.top);
      c.fillStyle = 'rgb(64,60,52)';
      c.fillRect(DESK.x0, DESK.top, DESK.x1 - DESK.x0, 0.035);
      c.fillStyle = 'rgba(0,0,0,0.3)';
      c.fillRect(DESK.x0 + 0.1, DESK.top + 0.12, 0.8, 0.22);   // drawer
    });
    // the duty lamp's amber pool on the desk
    const lp = proj(v, LAMP_X - 0.35, DESK.top, DESK.dz);
    if (lp) L.lightBlob(c, lp.x, lp.y, 0.75 * lp.s, AMBER, 0.22);
    // logbook
    plane(c, v, DESK.dz + 0.1, () => {
      c.fillStyle = 'rgb(70,58,40)';
      c.beginPath(); c.moveTo(-0.6, DESK.top); c.lineTo(-0.1, DESK.top); c.lineTo(-0.14, DESK.top - 0.035); c.lineTo(-0.56, DESK.top - 0.035); c.closePath(); c.fill();
    });
    // the duty lamp (brass, angled)
    plane(c, v, DESK.dz - 0.15, () => {
      c.translate(LAMP_X, 0);
      c.strokeStyle = 'rgb(120,96,56)'; c.lineWidth = 0.025;
      c.beginPath(); c.moveTo(-0.15, DESK.top); c.lineTo(-0.22, DESK.top - 0.32); c.lineTo(-0.38, DESK.top - 0.42); c.stroke();
      c.fillStyle = 'rgb(90,70,40)';
      c.beginPath(); c.moveTo(-0.46, DESK.top - 0.46); c.lineTo(-0.3, DESK.top - 0.4); c.lineTo(-0.35, DESK.top - 0.3); c.lineTo(-0.5, DESK.top - 0.34); c.closePath(); c.fill();
      c.fillStyle = 'rgb(60,50,34)'; c.fillRect(-0.24, DESK.top - 0.02, 0.18, 0.02);
    });
    const bulb = proj(v, LAMP_X - 0.42, DESK.top - 0.32, DESK.dz - 0.15);
    if (bulb) L.lightBlob(c, bulb.x, bulb.y, 0.35 * bulb.s, AMBER, 0.5);
    drawPhone(c, v, gt);
  }
  // ---- the empty chair (its back to us, facing the board)
  plane(c, v, CHAIR.dz, () => {
    const { x, w, top, seat } = CHAIR;
    // base: column + star legs + casters
    c.strokeStyle = 'rgb(30,32,32)'; c.lineWidth = 0.05;
    c.beginPath(); c.moveTo(x, seat + 0.05); c.lineTo(x, -0.1); c.stroke();
    c.lineWidth = 0.035;
    c.beginPath();
    for (const dx of [-0.32, -0.15, 0.15, 0.32]) { c.moveTo(x, -0.1); c.lineTo(x + dx, -0.04); }
    c.stroke();
    c.fillStyle = 'rgb(16,16,16)';
    for (const dx of [-0.32, -0.15, 0.15, 0.32]) { c.beginPath(); c.arc(x + dx, -0.03, 0.03, 0, TAU); c.fill(); }
    // seat edge
    c.fillStyle = 'rgb(34,38,34)';
    L.roundRect(c, x - w / 2 - 0.05, seat - 0.02, w + 0.1, 0.09, 0.04); c.fill();
    // back (leather, buttoned), with a rim light from the board
    c.fillStyle = 'rgb(40,46,40)';
    L.roundRect(c, x - w / 2, top, w, seat - top - 0.08, 0.09); c.fill();
    c.strokeStyle = 'rgba(0,0,0,0.4)'; c.lineWidth = 0.01;
    c.beginPath(); c.moveTo(x - w / 2 + 0.08, top + 0.28); c.lineTo(x + w / 2 - 0.08, top + 0.28); c.stroke();
    c.strokeStyle = L.rgba([255, 120, 100], 0.25 + 0.35 * alarmK(gt, v.tl));
    c.lineWidth = 0.012;
    L.roundRect(c, x - w / 2, top, w, seat - top - 0.08, 0.09); c.stroke();
    c.fillStyle = 'rgb(30,30,28)';
    c.fillRect(x - 0.04, seat - 0.12, 0.08, 0.1);   // back post
  });
  c.restore();
}

const CONSOLE_GRIME = (() => { const r = L.rng(1983 + 26), out = []; for (let i = 0; i < 4 * 9; i++) out.push([r(), r(), 0.04 + r() * 0.12, 0.05 + r() * 0.1]); return out; })();

function drawPhone(c, v, gt) {
  const p = phoneAt(v);
  if (!p) return;
  plane(c, v, PHONE.dz, () => {
    const { x, y } = PHONE;
    // Bakelite body (no dial: a direct line), handset cradled on top
    c.fillStyle = 'rgb(150,22,20)';
    c.beginPath();
    c.moveTo(x - 0.12, y); c.lineTo(x + 0.12, y); c.lineTo(x + 0.09, y - 0.09); c.lineTo(x - 0.09, y - 0.09); c.closePath(); c.fill();
    c.fillStyle = 'rgb(120,16,14)';
    c.fillRect(x - 0.03, y - 0.12, 0.06, 0.04);
    c.fillStyle = 'rgb(170,28,24)';
    c.beginPath();
    c.moveTo(x - 0.16, y - 0.12); c.quadraticCurveTo(x, y - 0.17, x + 0.16, y - 0.12);
    c.lineTo(x + 0.15, y - 0.09); c.quadraticCurveTo(x, y - 0.13, x - 0.15, y - 0.09); c.closePath(); c.fill();
    c.fillStyle = 'rgb(170,28,24)';
    for (const s of [-1, 1]) { L.roundRect(c, x + s * 0.155 - 0.035, y - 0.15, 0.07, 0.06, 0.02); c.fill(); }
    c.strokeStyle = 'rgba(255,190,170,0.35)'; c.lineWidth = 0.006;
    c.beginPath(); c.moveTo(x - 0.12, y - 0.14); c.quadraticCurveTo(x, y - 0.165, x + 0.12, y - 0.14); c.stroke();
    // coiled cord
    c.strokeStyle = 'rgb(110,18,16)'; c.lineWidth = 0.008;
    c.beginPath();
    for (let i = 0; i <= 30; i++) { const t = i / 30; const cx = x + 0.12 + t * 0.25, cy = y - 0.03 + Math.sin(t * 40) * 0.012 + t * 0.02; if (i === 0) c.moveTo(cx, cy); else c.lineTo(cx, cy); }
    c.stroke();
  });
}

/** The wall map (green, phase A) crossfading into the real Earth (phase B). Same disc, same projection. */
function drawMapDisc(c, v, mix) {
  const view = globeView(v);
  if (view.r < 4 || view.cy - view.r > H + 40 || view.cy + view.r < -40) return;
  const relief = 0.35;
  if (mix < 1) {
    drawEarth(c, { ...view, style: 'flat', ocean: [6, 26, 22], land: [34, 104, 70], ice: [64, 140, 104], coast: [150, 255, 190], relief, atmosphere: false, alpha: 1 - mix * mix });
    graticule(c, view, 0.32 * (1 - mix));
  }
  if (mix > 0) {
    drawEarth(c, { ...view, style: 'day', sun: SUN_LL, lights: 1, atmosphere: true, seaIce: 0.2, alpha: L.smoothstep(mix) });   // late-Sept minimum pack, thin: full-strength ice read as a flat white smear
    polarDusk(c, view, L.smoothstep(mix));
  }
}

/** The low Sun grazes the Arctic (the terminator runs through the pole): earth.js lights grazing ice at its ambient
 *  floor, so the pack + Greenland read as a bright sticker there. Darken a soft band along the terminator, only over
 *  the polar cap (feathered radial mask × a linear ramp across the terminator), so the ice falls into twilight. */
let duskCv = null;
export function polarDusk(c, view, a) {
  if (a <= 0.002 || view.r < 8) return;
  const R = Math.ceil(view.r * 0.68), S2 = 2 * R;
  if (!duskCv || duskCv.width !== S2) duskCv = new OffscreenCanvas(S2, S2);
  const d = duskCv.getContext('2d');
  d.setTransform(1, 0, 0, 1, 0, 0);
  d.globalCompositeOperation = 'source-over';
  d.clearRect(0, 0, S2, S2);
  const rg = d.createRadialGradient(R, R, 0, R, R, R);
  rg.addColorStop(0, 'rgba(0,0,0,1)'); rg.addColorStop(0.55, 'rgba(0,0,0,0.9)'); rg.addColorStop(1, 'rgba(0,0,0,0)');
  d.fillStyle = rg; d.fillRect(0, 0, S2, S2);
  d.globalCompositeOperation = 'source-in';
  const sd = sunDir(view), rr = view.r;
  // s = signed distance toward the Sun (px) from the terminator line through the pole
  const lg = d.createLinearGradient(R - sd.x * 0.14 * rr, R - sd.y * 0.14 * rr, R + sd.x * 0.42 * rr, R + sd.y * 0.42 * rr);
  lg.addColorStop(0, 'rgba(2,4,8,0)');          // deep night side: already dark, city lights untouched
  lg.addColorStop(0.17, 'rgba(2,4,8,0.55)');
  lg.addColorStop(0.25, 'rgba(2,4,8,0.72)');    // the terminator (s = 0)
  lg.addColorStop(0.42, 'rgba(2,4,8,0.6)');
  lg.addColorStop(0.7, 'rgba(2,4,8,0.25)');
  lg.addColorStop(1, 'rgba(2,4,8,0)');          // full day
  d.fillStyle = lg; d.fillRect(0, 0, S2, S2);
  c.save();
  c.globalAlpha *= a;
  c.drawImage(duskCv, view.cx - R, view.cy - R);
  c.restore();
}

/** Phosphor graticule: latitude rings every 30°, meridians every 30°. */
export function graticule(c, view, a, color = PHOSPHOR) {
  if (a <= 0.002) return;
  c.save();
  c.strokeStyle = L.rgba(color, a);
  c.lineWidth = Math.max(0.6, view.r / 500);
  for (const lat of [30, 60]) {
    c.beginPath();
    geoPath(c, view, Array.from({ length: 73 }, (_, i) => [lat, -180 + i * 5]), true, 2);
    c.stroke();
  }
  for (let lon = -180; lon < 180; lon += 30) {
    c.beginPath();
    geoPath(c, view, [[0, lon], [88, lon]], false, 2);
    c.stroke();
  }
  c.restore();
}

// ------------------------------------------------------------------ frame layers
export function drawBackground(c, v) {
  const tl = v.tl, gt = v.gt;
  const rk = roomK(gt, tl), mix = globeMix(gt, tl), sk = sunK(gt, tl);
  // space
  c.fillStyle = L.rgba(SPACE);
  c.fillRect(0, 0, W, H);
  if (rk < 1) {
    stars(c, v, (1 - rk) * (0.55 + 0.45 * sk), 220, 25);
    if (sk > 0) {
      const sp = sunPos(globeView(v));
      L.lightBlob(c, sp.x, sp.y, 1250, [255, 226, 180], 0.55 * sk);
      L.lightBlob(c, sp.x, sp.y, 420, [255, 246, 226], 0.9 * sk);
    }
  }
  if (rk > 0) {
    drawRoom(c, v, rk);
    drawFloor(c, v, rk);
  }
  drawMapDisc(c, v, mix);
  if (mix > 0) graticule(c, globeView(v), 0.07 * gratK(gt, tl));
  if (rk > 0) {
    drawNear(c, v, rk);
    // the red alarm wash over the whole room
    const ak = alarmK(gt, tl) * rk;
    if (ak > 0) {
      c.save();
      c.globalCompositeOperation = 'lighter';
      c.fillStyle = L.rgba([150, 18, 12], 0.16 * ak);
      c.fillRect(0, 0, W, H);
      c.restore();
    }
  }
}

export function drawForeground(c, v) {
  // top scrim: from the 'wall' push (beat 1) until the room is gone, the lit board / wall clock pass behind the HUD
  // band (y < 340); keep the top bar + chapter card readable
  const sk = L.prog(v.gt, shotStart('wall', v.tl), 0.6) * roomK(v.gt, v.tl);
  if (sk > 0) {
    const g = c.createLinearGradient(0, 0, 0, 340);
    g.addColorStop(0, `rgba(3,6,10,${0.9 * sk})`);
    g.addColorStop(0.7, `rgba(3,6,10,${0.82 * sk})`);
    g.addColorStop(1, 'rgba(3,6,10,0)');
    c.fillStyle = g;
    c.fillRect(0, 0, W, 360);
    // … and a soft dark band behind the caption line (the lower instrument bank's CRTs sit right there in this framing)
    const cg = c.createLinearGradient(0, 1300, 0, 1600);
    cg.addColorStop(0, 'rgba(3,6,10,0)'); cg.addColorStop(0.35, `rgba(3,6,10,${0.6 * sk})`);
    cg.addColorStop(0.65, `rgba(3,6,10,${0.6 * sk})`); cg.addColorStop(1, 'rgba(3,6,10,0)');
    c.fillStyle = cg;
    c.fillRect(0, 1300, W, 300);
  }
  const k = edgeK(v.gt, v.tl);
  if (k <= 0) return;
  c.save();
  const g = c.createRadialGradient(W / 2, H * 0.47, H * 0.32, W / 2, H * 0.47, H * 0.68);
  g.addColorStop(0, 'rgba(200,30,20,0)');
  g.addColorStop(1, `rgba(200,30,20,${0.22 * k})`);
  c.fillStyle = g;
  c.fillRect(0, 0, W, H);
  c.restore();
}

/** Amber clock readout, top right (y 250–340). */
function hudClock(c, v, k) {
  const ck = storyClock(v.gt, v.tl);
  c.save();
  c.globalAlpha = k;
  const h = 58, wd = seg7Width(ck.text, h), x1 = W - 64;
  c.fillStyle = 'rgba(4,6,8,0.6)';
  L.roundRect(c, x1 - wd - 28, 246, wd + 40, h + 26, 10); c.fill();
  seg7(c, ck.text, x1 - wd - 8, 259, h, AMBER, { offA: 0.08, glow: 14 });
  c.font = L.font(20, 600, L.FONT.body);
  c.fillStyle = 'rgba(232,226,210,0.85)';
  c.textBaseline = 'alphabetic';
  L.trackedText(c, 'MOSCOW · 26 SEP 1983', x1, 362, 2.5, 'right');
  c.restore();
}

export function drawHud(c, v) {
  topBar(c, v, ACCENT, [236, 238, 234]);
  const k = hudClockK(v.gt, v.tl);
  if (k > 0) hudClock(c, v, k);
}

/** Sound. Scene cues() only get their beat's duration, so every cue tied to a WORD lives here, built from
 *  moments(tl) (the same instants the pictures use). Scene files keep only beat-start-relative cues. */
export function cues(tl) {
  const m = moments(tl);
  return [
    ...beatCues(tl, { gain: 0.16, pitch: 0.9 }),
    { t: shotStart('map', tl) + 0.1, name: 'dive', gain: 0.26, pitch: 0.85 },
    { t: shotStart('orbit', tl) + 0.1, name: 'swell', gain: 0.2, pitch: 0.9 },
    // s00: the teleprinter verdict
    { t: m.tag - 0.04, name: 'blip', gain: 0.18, pitch: 0.9 },
    { t: m.tag + 0.25, name: 'tick', gain: 0.12, pitch: 1.3 },
    // s01: clock flip, KAL 007 card, tension
    { t: m.clockFlip - 0.06, name: 'tick', gain: 0.25, pitch: 1.0 },
    { t: m.kal + 0.4, name: 'blip', gain: 0.16, pitch: 0.75 },
    { t: m.tension, name: 'deep', gain: 0.22, pitch: 0.8 },
    // s02: detections + the reliability panel
    ...m.launches.map((t, i) => ({ t, name: 'blip', gain: 0.22, pitch: 1.1 + 0.06 * i })),
    { t: m.relyLit, name: 'impact', gain: 0.24, pitch: 0.9 },
    // s03: the chain lands, then escalates
    ...m.chain.slice(0, 3).map((t, i) => ({ t: t + 0.08, name: 'blip', gain: 0.18, pitch: 0.9 + i * 0.08 })),
    { t: m.chain[3] + 0.08, name: 'impact', gain: 0.28, pitch: 0.7 },
    { t: m.war, name: 'impact', gain: 0.38, pitch: 0.55 },
    { t: m.war + 0.02, name: 'deep', gain: 0.28, pitch: 0.6 },
    // s04: the ghost wave, the radars
    { t: m.ghosts, name: 'riser', gain: 0.18, pitch: 0.8 },
    { t: m.ghosts + 1.0, name: 'swell', gain: 0.2, pitch: 0.8 },
    { t: m.radar - 0.1, name: 'sonar', gain: 0.32, pitch: 0.9 },
    { t: m.radar + 0.6, name: 'sonar', gain: 0.18, pitch: 0.9 },
    // s05: the stamp, the wait, nothing
    { t: m.stampHit, name: 'impact', gain: 0.45, pitch: 0.55 },
    { t: m.stampHit + 0.02, name: 'deep', gain: 0.25, pitch: 0.7 },
    { t: m.waitFrom + 0.05, name: 'tick', gain: 0.16, pitch: 0.8 },
    { t: m.waitTo, name: 'tick', gain: 0.2, pitch: 1.0 },
    { t: m.nothing, name: 'bloom', gain: 0.18, pitch: 0.8 },
    // s06: the glints, the secret
    { t: m.glint - 0.05, name: 'shimmer', gain: 0.22, pitch: 1.0 },
    { t: m.glint + 0.4, name: 'ping', gain: 0.18, pitch: 1.3 },
    { t: m.glint + 0.95, name: 'blip', gain: 0.22, pitch: 0.8 },
    { t: m.secret + 0.3, name: 'impact', gain: 0.26, pitch: 0.7 },
    // s07: the choices, the comments line
    ...m.choices.map((t, i) => ({ t, name: 'blip', gain: 0.22, pitch: 1.0 + 0.12 * i })),
    { t: m.comments, name: 'blip', gain: 0.18, pitch: 1.25 },
  ];
}
