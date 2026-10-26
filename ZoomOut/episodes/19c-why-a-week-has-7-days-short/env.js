// Environment for "Why Does a Week Have 7 Days?". Owned by the orchestrator — builders: read, don't edit
// (put needs in "sharedRequests").
//
// Layers:   drawBackground  deep-space backdrop + an infinite-zoom starfield + a faint dust band, the Sun, the Earth
//                           (a REAL globe: data/etopo6.bin = NOAA ETOPO1 on a 0.1° grid, ray-cast per pixel at half
//                           resolution, day/night from the Sun's direction), the night-sky atmosphere above the limb
//                           (at rooftop zoom it IS the sky), the stylised night ground at rooftop zoom, the Moon.
//           drawForeground  the seven lights (rise in beat 8, arc → column in beat 12) until beat 16 starts; from
//                           then on s16 draws them (same helper, same positions at the handoff).
//           drawHud         top bar + the ERA readout (top right): TODAY → c. 600 BC · BABYLON → … → 1793 · PARIS →
//                           1929 · MOSCOW → TODAY. Years roll (count) during each camera travel.
// Exported helpers: earthView, project, moonPos, moonStepTimes, drawMoonDisc, sunDir, lightPos, lightRise, lightEmphasis, drawLight, lightSize, drawCalendarPage, calLayout,
// skyK, eraAt, and the world constants from camera.js.
import * as L from '../../../engine/runtime/lib.js';
import { beatCues, topBar } from '../../../engine/runtime/kit.js';
import { drawEarth } from '../../../engine/runtime/earth.js';
import { EARTH, MOON_ORBIT, MOON_R, SUN, EARTH_ORBIT, CAL, CAL2, ROOF, LIGHTS, skyPos, COL, colPos, KEYS } from './camera.js';
import { legacy, lview, isCut } from './legacy.js';
// 19c: every timing helper here works on the LEGACY (19-shaped) timeline of legacy.js (converted on entry, idempotent)

const { W, H } = L;
const DEG = Math.PI / 180;
export const ACCENT = [235, 200, 130];
export const PAPER = [238, 231, 218];
export const INKC = [24, 24, 30];
export { EARTH, MOON_ORBIT, MOON_R, SUN, EARTH_ORBIT, CAL, CAL2, ROOF, LIGHTS, skyPos, COL, colPos };

// ------------------------------------------------------------------ timeline helpers
const beatOf = (gt, tl) => { tl = legacy(tl); let b = 0; tl.scenes.forEach((s, i) => { if (s.start <= gt) b = i; }); return b; };
const T = (tl, b) => legacy(tl).scenes[b].start;
/** Babylon (the rooftop) */
export const BABYLON = { lat: 32.54, lon: 44.42 };

// ------------------------------------------------------------------ Earth orientation
const inOutSine = (t) => 0.5 - 0.5 * Math.cos(Math.PI * L.clamp(t));
/** Spin progress 0..1 of beat 2's "one spin" (shared with s02's ring). Sampled once per FRAME (30 fps), so the
 *  sub-frame motion blur never smears the continents; a gentle inOutSine over 2.3 s, inside beat 2. */
export const spinStart = (tl) => T(tl, 2) - 0.25;
export const SPIN_DUR = 1.85;   // 19c: beat 2 is 1.9 s (19: 2.3 s spin in a 2.2 s beat); the turn completes 0.3 s before beat 3
export const spinE = (gt, tl) => inOutSine(L.prog(Math.round(gt * 30) / 30, spinStart(tl), SPIN_DUR));
/**
 * The globe's view {lat0, lon0} (orthographic, north up; the face centre is (lat0, lon0)) at global time gt.
 *   beats 0-6: a 3/4 view (lat0 18°) that spins once during beat 2 ("one spin") and drifts slowly otherwise.
 *   beat 7 (the dive): first turns to FACE Babylon (Mesopotamia front and centre, gold ping), then, as the globe fills
 *     the frame, tips forward so Babylon rolls up onto the top limb (lat0 → 32.54 − 90) where the camera lands.
 *   beat 11 (the spread): turns to face the Old World (lat0 28, lon0 25), then back to Babylon-on-the-limb in beat 12.
 */
export function earthView(gt, tl) {
  tl = legacy(tl);
  // sampled once per frame: the globe's rotation is crisp (no sub-frame smear); the camera's own motion still blurs
  gt = Math.round(gt * 30) / 30;
  const t7 = T(tl, 7), t11 = T(tl, 11), t12 = T(tl, 12);
  // west → east: the face centre's longitude DEcreases, so surface points move left → right across the front
  // 19c (as 19b): the slow drift runs on FILM time (the preroll shifts the film), so the globe shows the same face
  const free = -40 - 360 * spinE(gt, tl) - 6 * (gt - (T(tl, 0) > 0 ? T(tl, 0) - 0.2 : 0));
  const kFace = L.ease.inOutCubic(L.prog(gt, t7 - 0.5, 1.45));
  const kTip = inOutSine(L.prog(gt, t7 + 0.95, 0.75));
  const wrap = (a) => ((((a + 180) % 360) + 360) % 360) - 180;
  let lon = free + wrap(BABYLON.lon - free) * kFace;
  let lat = L.lerp(L.lerp(18, BABYLON.lat, kFace), BABYLON.lat - 90, kTip);
  // the turn to the Old World starts with the dive-out, so Europe / the Middle East face the camera by ~1 s in
  // 19c: beat 11 (the globe pull-back) is cut, so the globe never turns to the Old World
  const kOut = isCut(11) ? 0 : L.ease.inOutCubic(L.prog(gt, t11 - 0.1, 1.25)) * (1 - L.ease.inOutCubic(L.prog(gt, t12 - 0.05, 1.7)));
  lon = L.lerp(lon, lon + wrap(25 - lon), kOut);
  lat = L.lerp(lat, 28, kOut);
  return { lat0: lat, lon0: lon };
}
/** Sun direction in view space (X right, Y up, Z toward the viewer): from the Earth toward SUN, a little frontal. */
const SD = (() => { const x = SUN.x - EARTH.x, y = -(SUN.y - EARTH.y), z = 0.42 * EARTH_ORBIT; const n = Math.hypot(x, y, z); return [x / n, y / n, z / n]; })();
export const sunDir = () => SD;

/** Screen position of (lat, lon, height in u above the surface) on the env globe. front: on the visible hemisphere. */
export function project(v, lat, lon, h = 0) {
  const { lat0, lon0 } = earthView(v.gt, v.tl);
  const p = lat * DEG, l = (lon - lon0) * DEG, p0 = lat0 * DEG;
  const X = Math.cos(p) * Math.sin(l);
  const Y = Math.cos(p0) * Math.sin(p) - Math.sin(p0) * Math.cos(p) * Math.cos(l);
  const Z = Math.sin(p0) * Math.sin(p) + Math.cos(p0) * Math.cos(p) * Math.cos(l);
  const r = EARTH.r + h;
  return { x: v.wx(EARTH.x + X * r), y: v.wy(EARTH.y - Y * r), front: Z > 0, z: Z };
}

// ------------------------------------------------------------------ the globe (shared real-Earth renderer)
/** 0..1: how much of the stylised near ground replaces the raster (rooftop zoom). */
export const groundK = (v) => 1 - L.clamp(L.invLerp(Math.log(0.05), Math.log(0.14), Math.log(v.cam.mpp)));
/** The Earth's light: the same Sun direction as SD but more frontal, so most of the disc reads as day (Blue Marble)
 *  while the terminator stays on the side away from the Sun. */
const SD_EARTH = (() => { const [x, y, z] = SD; const zz = z + 0.75, n = Math.hypot(x, y, zz); return [x / n, y / n, zz / n]; })();

function drawGlobe(c, v) {
  const cx = v.wx(EARTH.x), cy = v.wy(EARTH.y), r = v.ws(EARTH.r);
  if (r < 1.5) {
    c.fillStyle = 'rgba(120,160,190,0.9)';
    c.beginPath(); c.arc(cx, cy, Math.max(0, Math.max(r, 1)), 0, Math.PI * 2); c.fill();
    return;
  }
  const { lat0, lon0 } = earthView(v.gt, v.tl);
  drawEarth(c, { cx, cy, r, lat0, lon0, style: 'day', sun: SD_EARTH, lights: 0.8, atmosphere: 0.55, maxPixels: 9e5 });
}

/** Beat 7: a gold ping on Babylon while the globe turns to face it (gone as the near ground takes over). */
function drawBabylonPing(c, v) {
  const t7 = T(v.tl, 7);
  if (v.gt < t7 || v.gt > t7 + 2.2) return;
  const k = L.ease.outCubic(L.prog(v.gt, t7 + 0.35, 0.4)) * (1 - L.clamp(L.invLerp(0.0, 0.35, groundK(v))));
  if (k <= 0) return;
  const p = project(v, BABYLON.lat, BABYLON.lon);
  if (!p.front) return;
  const a = k * L.clamp(p.z * 4);
  L.lightBlob(c, p.x, p.y, 54, ACCENT, 0.9 * a);
  c.save();
  c.fillStyle = L.rgba([255, 244, 214], a);
  c.beginPath(); c.arc(p.x, p.y, 6.5, 0, Math.PI * 2); c.fill();
  c.strokeStyle = L.rgba(ACCENT, 0.95 * a); c.lineWidth = 2.5;
  c.beginPath(); c.arc(p.x, p.y, 15, 0, Math.PI * 2); c.stroke();
  for (let i = 0; i < 3; i++) {
    const kr = L.prog(v.gt, t7 + 0.45 + i * 0.45, 0.9);
    if (kr <= 0 || kr >= 1) continue;
    c.strokeStyle = L.rgba(ACCENT, 0.85 * (1 - kr) * a);
    c.lineWidth = 2.5;
    c.beginPath(); c.arc(p.x, p.y, Math.max(0, 8 + 60 * L.ease.outCubic(kr)), 0, Math.PI * 2); c.stroke();
  }
  c.restore();
}

// ------------------------------------------------------------------ the atmosphere / night sky
const ATM = 16;   // u: the sky's depth above the limb (at rooftop zoom this is the whole night sky)
/** 0..1: the frame is "under the night sky" (rooftop zoom). Scenes can fade sky-only elements with it. */
export const skyK = (v) => 1 - L.clamp(L.invLerp(Math.log(0.06), Math.log(0.3), Math.log(v.cam.mpp)));

function drawAtmosphere(c, v) {
  const cx = v.wx(EARTH.x), cy = v.wy(EARTH.y), r = v.ws(EARTH.r);
  if (r < 2) return;
  const sk = skyK(v);
  // far: a thin luminous rim, brighter on the day side; near: a deep indigo night sky with a teal horizon glow
  const ra = r + v.ws(ATM);
  // skip when the atmosphere shell is entirely off screen
  const dx = Math.max(0, Math.abs(W / 2 - cx) - W / 2), dy = Math.max(0, Math.abs(H / 2 - cy) - H / 2);
  if (Math.hypot(dx, dy) > ra) return;
  const near = Math.hypot(Math.max(Math.abs(cx - 0), Math.abs(cx - W)), Math.max(Math.abs(cy - 0), Math.abs(cy - H)));
  if (near < r) return;   // the whole frame is inside the Earth
  c.save();
  const g = c.createRadialGradient(cx, cy, r, cx, cy, ra);
  const a = L.lerp(0.55, 1, sk);
  g.addColorStop(0, L.rgba(L.mix([70, 130, 170], [44, 70, 104], sk), 0.85 * a));
  g.addColorStop(0.06, L.rgba(L.mix([50, 96, 150], [26, 42, 78], sk), 0.7 * a));
  g.addColorStop(0.3, L.rgba(L.mix([22, 40, 90], [12, 18, 44], sk), 0.45 * a));
  g.addColorStop(0.7, L.rgba([8, 10, 26], 0.22 * a));
  g.addColorStop(1, 'rgba(4,6,16,0)');
  c.fillStyle = g;
  c.beginPath();
  c.rect(0, 0, W, H);
  if (r < 2e5) c.arc(cx, cy, Math.max(0, r - 0.5), 0, Math.PI * 2, true);
  c.fill('evenodd');
  c.restore();
}

/** Rooftop zoom: the Earth's limb as dark night ground with a faint warm haze at the horizon (stylised). */
function drawNearGround(c, v, k) {
  if (k <= 0) return;
  const cx = v.wx(EARTH.x), cy = v.wy(EARTH.y), r = v.ws(EARTH.r);
  const top = cy - r;
  if (top > H + 10) return;
  c.save();
  c.globalAlpha = k;
  c.beginPath();
  c.arc(cx, cy, Math.max(0, r), 0, Math.PI * 2);
  const g = c.createLinearGradient(0, top, 0, top + v.ws(3));
  g.addColorStop(0, '#1b1916'); g.addColorStop(0.15, '#121110'); g.addColorStop(1, '#08080a');
  c.fillStyle = g;
  c.fill();
  // horizon haze: a warm glow far away to the left (the last of the dusk) and a cool rim
  const hz = c.createLinearGradient(0, top - v.ws(1.6), 0, top);
  hz.addColorStop(0, 'rgba(120,96,80,0)'); hz.addColorStop(1, 'rgba(120,96,80,0.22)');
  c.fillStyle = hz;
  c.fillRect(0, top - v.ws(1.6), W, v.ws(1.6));
  c.restore();
}

// ------------------------------------------------------------------ starfield: infinite zoom, 3 octave layers
const STAR_SETS = [0, 1, 2].map((j) => { const r = L.rng(1900 + j); return Array.from({ length: 110 }, () => [r() * 2 - 1, r() * 2 - 1, 0.5 + r() * 1.3, r() * 6.3, r()]); });
function drawStars(c, v, k) {
  if (k <= 0) return;
  const lz = Math.log2(v.cam.mpp) * 0.55;
  c.save();
  for (let j = 0; j < 3; j++) {
    const f = (((lz + j / 3) % 1) + 1) % 1;            // octave phase
    const s = Math.pow(2, 1 - f);                       // zooming OUT pulls the stars in toward the centre
    const a = Math.sin(Math.PI * f);
    // a slow drift with the camera's world position (screen-space, bounded)
    const ox = W / 2 + ((-v.cam.x / v.cam.mpp * 0.015) % W), oy = H / 2 + ((-v.cam.y / v.cam.mpp * 0.015) % H);
    for (const [ux, uy, sz, ph, hue] of STAR_SETS[j]) {
      let x = ox + ux * W * s, y = oy + uy * H * s;
      x = ((x % (W * 2)) + W * 2) % (W * 2) - W * 0.5; y = ((y % (H * 2)) + H * 2) % (H * 2) - H * 0.5;
      if (x < -4 || x > W + 4 || y < -4 || y > H + 4) continue;
      const tw = 0.55 + 0.45 * Math.sin(v.gt * 1.3 + ph);
      c.fillStyle = L.rgba(L.mix([200, 214, 255], [255, 226, 190], hue), k * a * tw * 0.75);
      c.beginPath(); c.arc(x, y, Math.max(0, sz * (0.7 + 0.3 * s)), 0, Math.PI * 2); c.fill();
    }
  }
  c.restore();
}
// a faint diagonal band of dust (the Milky Way), screen-anchored with a little drift
const DUST = (() => { const r = L.rng(1917); return Array.from({ length: 26 }, (_, i) => [i / 25 + (r() - 0.5) * 0.05, (r() - 0.5) * 0.18, 140 + r() * 220, r()]); })();
function drawDust(c, v, k) {
  if (k <= 0) return;
  for (const [u, off, rad, hue] of DUST) {
    const x = L.lerp(-150, W + 150, u) + off * 300 + 30 * Math.sin(v.gt * 0.05 + u * 6);
    const y = L.lerp(H * 0.95, H * 0.05, u) + off * 500;
    L.lightBlob(c, x, y, rad, L.mix([90, 100, 150], [150, 120, 100], hue), 0.05 * k);
  }
}

// ------------------------------------------------------------------ the Sun
function drawSun(c, v) {
  const x = v.wx(SUN.x), y = v.wy(SUN.y), r = v.ws(SUN.r);
  const reach = Math.max(r * 7, 260);
  if (x < -reach || x > W + reach || y < -reach || y > H + reach) return;
  L.lightBlob(c, x, y, reach, [255, 170, 80], 0.32);
  L.lightBlob(c, x, y, Math.max(r * 2.6, 60), [255, 210, 140], 0.6);
  c.save();
  const g = c.createRadialGradient(x - r * 0.2, y - r * 0.2, 0, x, y, Math.max(1, r));
  g.addColorStop(0, '#fff8e6'); g.addColorStop(0.6, '#ffd890'); g.addColorStop(1, '#f2a24c');
  c.fillStyle = g;
  c.beginPath(); c.arc(x, y, Math.max(1.5, r), 0, Math.PI * 2); c.fill();
  c.restore();
}

// ------------------------------------------------------------------ the Moon
/**
 * Moon angle (radians, screen convention: 0 = right, +π/2 = down) around the Earth.
 *   beat 3: one full lap (the month). beat 6: four quarter steps (new → first quarter → full → last quarter → new),
 *   starting at NEW MOON (between the Earth and the Sun) at beat 6 + 0.9 s. A slow drift otherwise.
 */
/** 19c: the month lap (beat-3 local): 1.8 s from 0.15 s (19: 3.6 s from 0.35 s; 19c's beat 3 is 2.6 s). s03 imports it. */
export const MOON_LAP = { t0: 0.15, dur: 1.5 };   // (visual audit: locks at 1.65 s so 29.5 reads before it fades by the beat end)
export function moonAngle(gt, tl) {
  tl = legacy(tl);
  const t3 = T(tl, 3), t6 = T(tl, 6);
  const drift = 0.02;
  const aNew = Math.atan2(SUN.y - EARTH.y, SUN.x - EARTH.x);
  const a0 = aNew - drift * (t6 + 0.9);
  let a = a0 + drift * gt + 2 * Math.PI * L.ease.inOutCubic(L.prog(gt, t3 + MOON_LAP.t0, MOON_LAP.dur));
  if (!isCut(6)) for (let q = 0; q < 4; q++) a += (Math.PI / 2) * L.ease.inOutCubic(L.prog(gt, t6 + 1.25 + q * 0.85, 0.6));   // 19c: the phases beat is cut
  return a;
}
/** Phase-step times (global s) in beat 6: when each quarter step BEGINS (each lasts 0.6 s). */
export const moonStepTimes = (tl) => [0, 1, 2, 3].map((q) => T(tl, 6) + 1.25 + q * 0.85);
export function moonPos(gt, tl) {
  tl = legacy(tl);
  const a = moonAngle(gt, tl);
  return { x: EARTH.x + MOON_ORBIT * Math.cos(a), y: EARTH.y + MOON_ORBIT * Math.sin(a), a };
}
/** A shaded moon disc at screen (x, y) radius r, lit from screen direction (lx, ly) (unit). k = alpha. */
export function drawMoonDisc(c, x, y, r, lx, ly, k = 1) {
  if (r <= 0 || k <= 0) return;
  c.save();
  c.globalAlpha *= k;
  c.beginPath(); c.arc(x, y, Math.max(0, r), 0, Math.PI * 2);
  c.fillStyle = '#1c1f26';
  c.fill();
  c.clip();
  // lit hemisphere: an offset bright disc with a soft edge
  const g = c.createRadialGradient(x + lx * r * 0.55, y + ly * r * 0.55, r * 0.1, x + lx * r * 0.2, y + ly * r * 0.2, r * 1.25);
  g.addColorStop(0, '#f1efe8'); g.addColorStop(0.55, '#c9c6bd'); g.addColorStop(0.8, 'rgba(120,118,112,0.5)'); g.addColorStop(1, 'rgba(40,40,44,0)');
  c.fillStyle = g;
  c.beginPath(); c.arc(x + lx * r * 0.08, y + ly * r * 0.08, Math.max(0, r), 0, Math.PI * 2); c.fill();
  // maria
  c.fillStyle = 'rgba(70,72,80,0.22)';
  for (const [mx, my, mr] of [[-0.3, -0.25, 0.28], [0.15, -0.1, 0.22], [0.05, 0.3, 0.18], [-0.35, 0.2, 0.14]]) {
    c.beginPath(); c.arc(x + mx * r, y + my * r, Math.max(0, mr * r), 0, Math.PI * 2); c.fill();
  }
  c.restore();
}
function drawMoon(c, v) {
  const m = moonPos(v.gt, v.tl);
  const x = v.wx(m.x), y = v.wy(m.y), r = v.ws(MOON_R);
  if (x < -r - 40 || x > W + r + 40 || y < -r - 40 || y > H + r + 40) return;
  // fade out at rooftop scale (the Moon in that sky is one of the seven lights)
  // (and out over the first 0.4 s of the dive in beat 7: it would cross the caption band)
  const t7 = T(v.tl, 7), t8 = T(v.tl, 8);
  const k = L.clamp(L.invLerp(0.12, 0.35, v.cam.mpp)) * (v.gt >= t7 && v.gt < t8 ? 1 - L.ease.inCubic(L.prog(v.gt, t7, 0.4)) : 1);
  if (k <= 0) return;
  const lx = SUN.x - m.x, ly = SUN.y - m.y, n = Math.hypot(lx, ly);
  if (r < 1.2) { c.fillStyle = `rgba(230,230,225,${0.9 * k})`; c.beginPath(); c.arc(x, y, 1.3, 0, Math.PI * 2); c.fill(); return; }
  L.lightBlob(c, x, y, r * 2.2, [200, 210, 230], 0.12 * k);
  drawMoonDisc(c, x, y, r, lx / n, ly / n, k);
}

/** Beat 8: as the Sun-light rises, a brief dawn glow warms the horizon beneath it (then the sky settles back to night). */
function drawDawn(c, v) {
  const t0 = lightRise(0, v.tl);
  const k = L.ease.inOutCubic(L.prog(v.gt, t0 - 0.3, 0.7)) * (1 - L.ease.inOutCubic(L.prog(v.gt, t0 + 1.2, 1.6))) * skyK(v);
  if (k <= 0) return;
  const s = skyPos(0);
  const x = v.wx(s.x * 1.04), y = v.wy(ROOF.y);
  const cx = v.wx(EARTH.x), cy = v.wy(EARTH.y), r = v.ws(EARTH.r);
  c.save();
  c.beginPath(); c.rect(0, 0, W, H);
  if (r < 2e6) c.arc(cx, cy, Math.max(0, r), 0, Math.PI * 2, true);
  c.clip('evenodd');
  const g = c.createLinearGradient(0, y - v.ws(9), 0, y);
  g.addColorStop(0, 'rgba(60,70,120,0)'); g.addColorStop(0.6, `rgba(70,74,120,${0.16 * k})`); g.addColorStop(1, `rgba(200,130,80,${0.42 * k})`);
  c.fillStyle = g; c.fillRect(0, y - v.ws(9), W, v.ws(9));
  L.lightBlob(c, x, y, v.ws(6.5), [255, 160, 90], 0.6 * k);
  L.lightBlob(c, x, y, v.ws(2.2), [255, 200, 140], 0.4 * k);
  c.restore();
}

export function drawBackground(c, v) {
  v = lview(v);
  const g = c.createRadialGradient(W / 2, H * 0.42, 60, W / 2, H * 0.5, H * 0.9);
  g.addColorStop(0, '#0d0f19'); g.addColorStop(1, '#030409');
  c.fillStyle = g;
  c.fillRect(0, 0, W, H);
  drawDust(c, v, 1);
  drawStars(c, v, 1);
  drawSun(c, v);
  const gk = groundK(v);
  if (gk < 1) drawGlobe(c, v);
  drawAtmosphere(c, v);
  if (gk < 1) drawBabylonPing(c, v);
  drawDawn(c, v);
  drawNearGround(c, v, gk);
  drawMoon(c, v);
}

// ------------------------------------------------------------------ the seven lights
/** Global time at which light i (LIGHTS index) starts to rise: on its name in line 8 (character-proportional). */
export function lightRise(i, tl) {
  tl = legacy(tl);
  // 19c: "The Sun, the Moon, | and five planets." The Sun and the Moon rise on their names; the five planets rise in
  // their arc order, 0.13 s apart, from "five"
  if (LIGHTS[i].sky >= 2 && tl.marks) return tl.marks.planets - 0.1 + (LIGHTS[i].sky - 2) * 0.13;
  const ln = tl.lines[8];
  const text = ln.text.toLowerCase();
  const idx = text.indexOf(LIGHTS[i].key);
  const f = idx < 0 ? LIGHTS[i].sky / 7 : idx / text.length;
  return ln.start + f * (ln.end - ln.start) - 0.2;
}
const RISE = 1.2;
/** 19c: the beat-12 arc → column move (beat-local start, per-weekday stagger, duration). 19: 0.35 / 0.07 / 1.7; 19c's
 *  beat 12 is 2.1 s, so the lights land (and their names slide out) before "Saturday" starts. s12 imports it. */
export const MOVE = { t0: 0.1, st: 0.05, dur: 1.3 };
/** World position + visibility of light i at gt (arc after its rise; arc → column in beat 12). */
export function lightPos(i, gt, tl) {
  tl = legacy(tl);
  const Lt = LIGHTS[i];
  const s = skyPos(Lt.sky), cp = colPos(Lt.day);
  const t0 = lightRise(i, tl);
  const kr = L.ease.outCubic(L.prog(gt, t0, RISE));
  // rise: from just below the horizon, along a slight arc
  let x = L.lerp(s.x * 0.94, s.x, kr), y = L.lerp(ROOF.y + 0.6, s.y, kr);
  const vis = L.clamp((gt - t0) / 0.35);
  // beat 12: arc → weekday column (staggered by weekday)
  const t12 = T(tl, 12);
  const km = L.ease.inOutCubic(L.prog(gt, t12 + MOVE.t0 + MOVE.st * Lt.day, MOVE.dur));
  if (km > 0) {
    const bow = Math.sin(Math.PI * km) * 0.9;
    x = L.lerp(x, cp.x, km) - bow * 0.6;
    y = L.lerp(y, cp.y, km) - bow;
  }
  return { x, y, vis, rise: kr, move: km };
}
/**
 * Draw light i at SCREEN (x, y). size = core radius in px; k = alpha; glint = 0..1 spike strength.
 * Sun: a warm disc with a corona. Moon: a shaded crescent-gibbous disc. Planets: a bright point with a soft halo
 * and a fine four-point glint.
 */
/**
 * A Moon PHASE at screen (x, y), radius r: lit toward screen direction (lx, ly); f = illuminated fraction (0 new ..
 * 0.5 half .. 1 full). Dark limb with faint earthshine; the terminator is the usual projected ellipse.
 */
export function drawMoonPhase(c, x, y, r, lx, ly, f, k = 1) {
  if (r <= 0 || k <= 0) return;
  const rot = Math.atan2(ly, lx), q = Math.max(0, Math.min(1, f)), ex = Math.max(0.001, r * Math.abs(1 - 2 * q));
  c.save();
  c.globalAlpha *= k;
  c.translate(x, y); c.rotate(rot);
  c.beginPath(); c.arc(0, 0, Math.max(0, r), 0, Math.PI * 2);
  c.fillStyle = 'rgba(40,46,60,0.55)';   // the unlit limb (earthshine)
  c.fill();
  // lit region: the sunward half-disc, closed by the terminator ellipse (bulging sunward for a crescent)
  c.beginPath();
  c.arc(0, 0, Math.max(0, r), -Math.PI / 2, Math.PI / 2, false);
  if (q < 0.5) c.ellipse(0, 0, ex, Math.max(0, r), 0, Math.PI / 2, -Math.PI / 2, true);
  else c.ellipse(0, 0, ex, Math.max(0, r), 0, Math.PI / 2, Math.PI * 1.5, false);
  c.closePath();
  const g = c.createRadialGradient(r * 0.45, 0, r * 0.1, 0, 0, r * 1.1);
  g.addColorStop(0, '#f4f1ea'); g.addColorStop(0.7, '#d6d2c8'); g.addColorStop(1, '#a9a69e');
  c.fillStyle = g;
  c.fill();
  c.restore();
}

export function drawLight(c, i, x, y, size, k = 1, glint = 1, gt = 0, moonLit = null) {
  if (k <= 0) return;
  const Lt = LIGHTS[i], col = Lt.col;
  const s = Math.max(1.4, size);
  const tw = 1 + 0.06 * Math.sin(gt * 2.1 + i * 1.7);
  L.lightBlob(c, x, y, s * 7 * tw, col, 0.22 * k);
  L.lightBlob(c, x, y, s * 2.6, col, 0.5 * k);
  c.save();
  c.globalAlpha *= k;
  if (Lt.key === 'moon') {
    // moonLit = [lx, ly, f]: a real phase lit toward the Sun (the seven lights' sky); otherwise the generic disc
    if (moonLit) drawMoonPhase(c, x, y, s, moonLit[0], moonLit[1], moonLit[2], 1);
    else drawMoonDisc(c, x, y, s, 0.8, 0.35, 1);
  } else if (Lt.key === 'sun') {
    // the Sun as one of the seven LIGHTS: a gold medallion with the old sun sign (a ring around a dot) and short rays,
    // not a blazing daytime disc in a starry sky
    const g = c.createRadialGradient(x, y, 0, x, y, s);
    g.addColorStop(0, 'rgba(120,70,24,0.95)'); g.addColorStop(0.8, 'rgba(92,52,18,0.95)'); g.addColorStop(1, 'rgba(70,40,14,0.9)');
    c.fillStyle = g;
    c.beginPath(); c.arc(x, y, s, 0, Math.PI * 2); c.fill();
    c.strokeStyle = '#ffd98e'; c.lineWidth = Math.max(1.2, s * 0.16);
    c.beginPath(); c.arc(x, y, s * 0.92, 0, Math.PI * 2); c.stroke();
    c.fillStyle = '#fff1cc';
    c.beginPath(); c.arc(x, y, Math.max(1, s * 0.24), 0, Math.PI * 2); c.fill();
    c.strokeStyle = 'rgba(255,214,140,0.8)'; c.lineWidth = Math.max(1, s * 0.09); c.lineCap = 'round';
    c.beginPath();
    for (let j = 0; j < 12; j++) {
      const a = (j / 12) * Math.PI * 2 + gt * 0.08, r0 = s * 1.18, r1 = s * (j % 2 ? 1.42 : 1.58);
      c.moveTo(x + Math.cos(a) * r0, y + Math.sin(a) * r0); c.lineTo(x + Math.cos(a) * r1, y + Math.sin(a) * r1);
    }
    c.stroke();
  } else {
    c.fillStyle = L.rgba(L.mix(col, [255, 255, 255], 0.55));
    c.beginPath(); c.arc(x, y, s, 0, Math.PI * 2); c.fill();
    if (glint > 0) {
      c.globalCompositeOperation = 'lighter';
      const len = s * 6 * glint * tw;
      for (const [dx, dy] of [[1, 0], [0, 1]]) {
        const gg = c.createLinearGradient(x - dx * len, y - dy * len, x + dx * len, y + dy * len);
        gg.addColorStop(0, L.rgba(col, 0)); gg.addColorStop(0.5, L.rgba(col, 0.7)); gg.addColorStop(1, L.rgba(col, 0));
        c.fillStyle = gg;
        c.fillRect(x - dx * len - dy * 0.8, y - dy * len - dx * 0.8, dx * len * 2 + dy * 1.6, dy * len * 2 + dx * 1.6);
      }
    }
  }
  c.restore();
}
/** Core radius in px for light i at the current zoom. */
export const lightSize = (i, v) => LIGHTS[i].r / v.cam.mpp;

/**
 * Emphasis 0.35..1 of light i: beat 13 features Saturn, Sun, Moon; beats 14-15 feature Mars, Mercury, Jupiter, Venus
 * (weekdays 2-5). Eased in at each beat start, released at beat 16.
 */
export function lightEmphasis(i, gt, tl) {
  tl = legacy(tl);
  const d = LIGHTS[i].day;
  const k13 = L.ease.inOutCubic(L.prog(gt, T(tl, 13) + 0.1, 0.5)) * (1 - L.ease.inOutCubic(L.prog(gt, T(tl, 14), 0.5)));
  const k14 = isCut(14) ? 0 : L.ease.inOutCubic(L.prog(gt, T(tl, 14), 0.5)) * (1 - L.ease.inOutCubic(L.prog(gt, T(tl, 16) - 0.1, 0.5)));   // 19c: no French beat
  const off13 = d === 0 || d === 1 || d === 6 ? 0 : 1, off14 = d >= 2 && d <= 5 ? 0 : 1;
  return 1 - 0.65 * Math.max(k13 * off13, k14 * off14);
}

function drawLights(c, v) {
  const t16 = T(v.tl, 16);
  if (v.gt >= t16) return;   // s16 owns the lights from beat 16
  const cx = v.wx(EARTH.x), cy = v.wy(EARTH.y), r = v.ws(EARTH.r);
  c.save();
  // only above the horizon (outside the Earth's disc)
  c.beginPath(); c.rect(0, 0, W, H);
  if (r < 2e6) c.arc(cx, cy, Math.max(0, r), 0, Math.PI * 2, true);
  c.clip('evenodd');
  // the lights belong to the rooftop sky: above rooftop zoom (beat 11's pull-back to the globe) they fade out, so they
  // never sit on the globe's limb like a floating object
  const kz = 1 - L.clamp(L.invLerp(0.022, 0.042, v.cam.mpp));
  if (kz <= 0) { c.restore(); return; }
  c.globalAlpha *= kz;
  // the Moon sits next to the Sun on the ecliptic, so it is a waxing CRESCENT lit toward the Sun (never a full Moon
  // beside it): its lit side follows the Sun's actual on-screen direction (arc, then the weekday column) (19b audit)
  const iS = LIGHTS.findIndex((Lt) => Lt.key === 'sun'), pS = lightPos(iS, v.gt, v.tl);
  for (let i = 0; i < LIGHTS.length; i++) {
    const p = lightPos(i, v.gt, v.tl);
    if (p.vis <= 0) continue;
    const x = v.wx(p.x), y = v.wy(p.y);
    if (x < -80 || x > W + 80 || y < -80 || y > H + 80) continue;
    let lit = null;
    if (LIGHTS[i].key === 'moon') {
      const dx = v.wx(pS.x) - x, dy = v.wy(pS.y) - y, n = Math.hypot(dx, dy) || 1;
      lit = [dx / n, dy / n, 0.3];
    }
    drawLight(c, i, x, y, lightSize(i, v), p.vis * lightEmphasis(i, v.gt, v.tl), 1, v.gt, lit);
  }
  c.restore();
}
export function drawForeground(c, v) {
  v = lview(v);
  drawLights(c, v);
}

// ------------------------------------------------------------------ the calendar page (shared by s00/s01 and s16-18)
export const WEEK_SHORT = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
/** October 2026: day 1 is a Thursday (column 4 with Sunday first), 31 days. */
export const MONTH = { name: 'OCTOBER', year: '2026', first: 4, days: 31 };

/** Layout of a page centred at world (x, y), size (w, h) in u, with `cols` columns and `rows` rows (all world u). */
export function calLayout({ x, y, w, h, cols = 7, rows = 5 }) {
  const left = x - w / 2, topY = y - h / 2;
  const bind = h * 0.055, title = h * 0.17, head = h * 0.065, pad = w * 0.045;
  const gridTop = topY + bind + title + head, gridBot = y + h / 2 - pad * 0.8;
  const gx0 = left + pad, gx1 = x + w / 2 - pad;
  const cw = (gx1 - gx0) / cols, ch = (gridBot - gridTop) / rows;
  return {
    left, top: topY, w, h, bind, titleY: topY + bind + title * 0.66, headY: topY + bind + title + head * 0.55,
    gridTop, gridBot, gx0, gx1, cw, ch, cols, rows,
    cell: (col, row) => ({ x: gx0 + col * cw, y: gridTop + row * ch, w: cw, h: ch, cx: gx0 + (col + 0.5) * cw, cy: gridTop + (row + 0.5) * ch }),
    headX: (col) => gx0 + (col + 0.5) * cw,
  };
}

/**
 * Draw a premium paper calendar page in WORLD space (crisp, via v.wx / v.ws).
 * o: {x, y, w, h, cols=7, rows=5, first, days, month, year, headers, k=1, today (day number or 0),
 *     numbers=1 (0..1 alpha of day numbers), grid=1, headK=1, shadow=1, paper, cellTint(col,row)->[rgb, a]|null}
 * Returns the layout (world units) so scenes can place overlays on cells / headers.
 */
export function drawCalendarPage(c, v, o) {
  const lay = calLayout(o);
  const k = o.k ?? 1;
  if (k <= 0) return lay;
  const s = v.ws(1);
  const X = (wx) => v.wx(wx), Y = (wy) => v.wy(wy);
  const px = X(lay.left), py = Y(lay.top), pw = lay.w * s, ph = lay.h * s;
  if (px > W + 50 || px + pw < -50 || py > H + 50 || py + ph < -50) return lay;
  const paper = o.paper ?? PAPER;
  const cols = lay.cols, rows = lay.rows;
  const first = o.first ?? MONTH.first, days = o.days ?? MONTH.days;
  const headers = o.headers ?? WEEK_SHORT;
  c.save();
  c.globalAlpha *= k;
  // shadow + paper
  if ((o.shadow ?? 1) > 0) {
    c.save();
    c.shadowColor = 'rgba(0,0,0,0.55)'; c.shadowBlur = Math.max(4, 0.08 * pw); c.shadowOffsetY = Math.max(2, 0.03 * pw);
    c.fillStyle = L.rgba(paper);
    L.roundRect(c, px, py, pw, ph, Math.max(1, 0.012 * pw));
    c.fill();
    c.restore();
  }
  const pg = c.createLinearGradient(px, py, px + pw * 0.4, py + ph);
  pg.addColorStop(0, L.rgba(L.mix(paper, [255, 255, 255], 0.25)));
  pg.addColorStop(1, L.rgba(L.mix(paper, [150, 136, 112], 0.18)));
  c.fillStyle = pg;
  L.roundRect(c, px, py, pw, ph, Math.max(1, 0.012 * pw));
  c.fill();
  if (pw < 24) { c.restore(); return lay; }
  // binding strip with ring holes
  c.fillStyle = L.rgba(INKC, 0.92);
  c.save();
  L.roundRect(c, px, py, pw, ph, Math.max(1, 0.012 * pw)); c.clip();
  c.fillRect(px, py, pw, lay.bind * s);
  c.restore();
  const nRing = 9;
  for (let i = 0; i < nRing; i++) {
    const rx = px + pw * (0.1 + 0.8 * i / (nRing - 1)), ry = py + lay.bind * s * 0.5;
    c.fillStyle = 'rgba(0,0,0,0.85)';
    c.beginPath(); c.arc(rx, ry, Math.max(0, lay.bind * s * 0.2), 0, Math.PI * 2); c.fill();
    c.strokeStyle = 'rgba(210,200,185,0.8)'; c.lineWidth = Math.max(0.8, pw * 0.003);
    c.beginPath(); c.arc(rx, ry - lay.bind * s * 0.45, Math.max(0, lay.bind * s * 0.42), Math.PI * 0.15, Math.PI * 0.85); c.stroke();
  }
  // title: month in condensed heavy ink, year in the accent (deepened for paper)
  const ty = Y(lay.titleY);
  c.textBaseline = 'alphabetic';
  c.fillStyle = L.rgba(INKC);
  c.font = L.font(Math.max(6, lay.h * 0.1 * s), 800, L.FONT.display);
  L.trackedText(c, o.month ?? MONTH.name, X(lay.gx0), ty, Math.max(0, 0.004 * pw));
  c.fillStyle = L.rgba(L.mix(ACCENT, [120, 80, 30], 0.55));
  c.font = L.font(Math.max(5, lay.h * 0.05 * s), 700, L.FONT.din);
  c.textAlign = 'right';
  c.fillText(o.year ?? MONTH.year, X(lay.gx1), ty);
  c.textAlign = 'left';
  // header row
  const hk = o.headK ?? 1;
  if (hk > 0) {
    c.save();
    c.globalAlpha *= hk;
    c.font = L.font(Math.max(4, Math.min(lay.cw * 0.2, lay.h * 0.032) * s), 700, L.FONT.body);
    c.fillStyle = L.rgba(INKC, 0.65);
    c.textBaseline = 'middle';
    for (let i = 0; i < cols; i++) {
      if (!headers[i]) continue;
      L.trackedText(c, headers[i], X(lay.headX(i)), Y(lay.headY), Math.max(0, 0.002 * pw), 'center');
    }
    c.restore();
  }
  // grid hairlines
  const gk = o.grid ?? 1;
  if (gk > 0) {
    c.strokeStyle = L.rgba(INKC, 0.22 * gk);
    c.lineWidth = Math.max(0.6, 0.0016 * pw);
    c.beginPath();
    for (let i = 0; i <= cols; i++) { const gx = X(lay.gx0 + i * lay.cw); c.moveTo(gx, Y(lay.gridTop)); c.lineTo(gx, Y(lay.gridBot)); }
    for (let j = 0; j <= rows; j++) { const gy = Y(lay.gridTop + j * lay.ch); c.moveTo(X(lay.gx0), gy); c.lineTo(X(lay.gx1), gy); }
    c.stroke();
  }
  // cells: optional tint, day numbers
  const nk = o.numbers ?? 1;
  const fs = Math.min(lay.cw, lay.ch) * 0.3 * s;
  for (let d = 1; d <= days; d++) {
    const idx = first + d - 1, col = idx % cols, row = Math.floor(idx / cols);
    if (row >= rows) break;
    const cell = lay.cell(col, row);
    const tint = o.cellTint?.(col, row, d);
    if (tint) { c.fillStyle = L.rgba(tint[0], tint[1]); c.fillRect(X(cell.x) + 0.5, Y(cell.y) + 0.5, cell.w * s - 1, cell.h * s - 1); }
    if (nk > 0 && fs >= 3) {
      c.font = L.font(fs, 600, L.FONT.din);
      c.fillStyle = L.rgba(INKC, 0.8 * nk);
      c.textBaseline = 'top';
      c.fillText(String(d), X(cell.x + cell.w * 0.1), Y(cell.y + cell.h * 0.12));
      if (o.today === d) {
        c.strokeStyle = L.rgba(L.mix(ACCENT, [170, 110, 40], 0.5), nk);
        c.lineWidth = Math.max(1, fs * 0.09);
        c.beginPath(); c.arc(X(cell.x + cell.w * 0.1) + fs * 0.32, Y(cell.y + cell.h * 0.12) + fs * 0.45, Math.max(0, fs * 0.72), 0, Math.PI * 2); c.stroke();
      }
    }
  }
  c.restore();
  return lay;
}

// ------------------------------------------------------------------ HUD: the ERA readout
// year: negative = BC; null = TODAY. c: circa.
const ERA = [
  null, { label: 'YOUR CALENDAR' }, { label: 'YOUR CALENDAR' }, { label: 'YOUR CALENDAR' }, { label: 'YOUR CALENDAR' },
  { label: 'YOUR CALENDAR' }, { label: 'YOUR CALENDAR' },
  { year: -600, c: true, label: 'BABYLON' }, { year: -600, c: true, label: 'BABYLON' }, { year: -600, c: true, label: 'BABYLON' },
  { year: -600, c: true, label: 'JUDAH' },
  { year: 600, c: true, label: 'CHRISTIANITY & ISLAM' },
  { year: 100, c: true, label: 'ROMAN EMPIRE' }, { year: 100, c: true, label: 'ROMAN EMPIRE' },
  { label: 'FRENCH' }, { label: 'ENGLISH' },
  { year: 1793, label: 'PARIS', swap: true },                                   // big jumps: a clean slot swap, no odd
  { year: 1929, label: 'MOSCOW', swap: true, then: { year: 1940, phrase: 1 } },  // in-between years (19c, as 19b)
  { label: 'YOUR CALENDAR' },
];
const NOW = 2026;
const yearOf = (e) => (e && e.year != null ? e.year : NOW);
const fmtYear = (y, c) => {
  const n = Math.round(y);
  if (n <= 0) return `${c ? 'c. ' : ''}${L.fmt(Math.max(1, -n))} BC`;
  if (n < 1000) return `${c ? 'c. ' : ''}AD ${n}`;
  return `${c ? 'c. ' : ''}${n}`;
};
/** The era readout at gt: {text, label, k (visibility), rolling}. */
export function eraAt(gt0, tl) {
  const gt = Math.round(gt0 * 30) / 30;   // frame-stable: motion-blur sub-frames never blend two years
  tl = legacy(tl);
  const b = Math.min(beatOf(gt, tl), ERA.length - 1);
  const e = ERA[b];
  if (!e) return { k: 0 };
  let pb = b - 1;
  while (pb > 0 && isCut(pb)) pb--;   // 19c: roll from the last KEPT beat's era (Babylon → Rome, Rome → Paris)
  let prev = ERA[pb] || e;
  if (prev.then) prev = { ...prev, year: prev.then.year };   // roll on from where the previous beat ENDED (19c, as 19b: 1940 → 2026, not 1929 → 2026)
  let cur = e;
  const t0 = T(tl, b) - 0.05;
  let dur = Math.max(0.8, KEYS[b]?.travel ?? 0.8);
  let start = t0;
  if (e.then) {
    const ph = tl.lines[b].phrases[e.then.phrase];
    if (ph && gt >= ph.start - 0.1) { prev = e; cur = { ...e, year: e.then.year }; start = ph.start - 0.1; dur = 0.9; }
  }
  const y0 = yearOf(prev), y1 = yearOf(cur);
  const kk = L.ease.inOutCubic(L.prog(gt, start, dur));
  const y = L.lerp(y0, y1, kk);
  const done = kk >= 1 || y0 === y1;
  const k = L.ease.outCubic(L.prog(gt, T(tl, 1) + 0.3, 0.6));
  if (e.swap && cur === e && y0 !== y1) {
    // beats 16-17 (19c, as 19b): the old year + place lift out, then the new ones rise in (0.45 s), no counting
    const p = L.prog(gt, t0 + 0.1, 0.45);
    const fmt = (en, yy) => (en.year == null ? 'TODAY' : fmtYear(yy, en.c));
    if (p < 1) return { k, label: cur.label, rolling: false, swap: { a: { text: fmt(prev, y0), label: prev.label }, b: { text: fmt(cur, y1), label: cur.label }, p } };
    return { text: fmt(cur, y1), label: cur.label, k, rolling: false };
  }
  const text = done ? (cur.year == null ? 'TODAY' : fmtYear(y1, cur.c)) : kk <= 0 && prev.year == null ? 'TODAY' : fmtYear(y, false);
  return { text, label: cur.label, k, rolling: !done };
}

export function drawHud(c, v) {
  v = lview(v);
  topBar(c, v, ACCENT);
  const e = eraAt(v.gt, v.tl);
  if (e.k > 0) {
    c.save();
    c.globalAlpha = e.k;
    c.shadowColor = 'rgba(2,4,12,0.7)';
    c.shadowBlur = 12;
    c.textAlign = 'right';
    c.textBaseline = 'alphabetic';
    const rows = e.swap
      ? [[e.swap.a, 1 - L.ease.inCubic(L.clamp(e.swap.p * 2)), -14 * L.ease.inCubic(L.clamp(e.swap.p * 2))],
        [e.swap.b, L.ease.outCubic(L.clamp(e.swap.p * 2 - 1)), 14 * (1 - L.ease.outCubic(L.clamp(e.swap.p * 2 - 1)))]]
      : [[e, 1, 0]];
    for (const [r, a, dy] of rows) {
      if (a <= 0.002) continue;
      c.globalAlpha = e.k * a;
      c.font = L.font(54, 700, L.FONT.din);
      c.fillStyle = e.rolling ? L.rgba(ACCENT) : '#f4efe6';
      c.fillText(r.text, W - 64, 262 + dy);
      c.font = L.font(19, 600, L.FONT.body);
      c.fillStyle = 'rgba(225,218,205,0.8)';
      L.trackedText(c, r.label, W - 64, 294 + dy, 3, 'right');
    }
    // a small accent tick to the left of the label
    c.fillStyle = L.rgba(ACCENT, 0.9);
    c.restore();
  }
}

export function cues(tl) {
  const out = beatCues(tl, { gain: 0.16, pitch: 0.85 });
  // era rolls: a soft tick run when the year counts
  const lt = legacy(tl);
  for (const b of [7, 11, 12, 14, 18]) {
    if (isCut(b)) continue;   // 19c
    const s = lt.scenes[b]?.start;
    if (s != null) for (let i = 0; i < 4; i++) out.push({ t: s + 0.1 + i * 0.16, name: 'tick', gain: 0.07, pitch: 1.6 + i * 0.1 });
  }
  // beats 16-17 swap the year (no count): one soft tick as the new year lands (19c, as 19b)
  for (const b of [16, 17]) { const st = lt.scenes[b]?.start; if (st != null) out.push({ t: st + 0.35, name: 'tick', gain: 0.07, pitch: 1.7 }); }
  return out;
}
