// Beat 0 — "How much water is there on Earth, really?"
// The planet's surface for the WHOLE film: the real Earth (engine/runtime/earth.js: ETOPO1 relief, true coastlines,
// ice caps, sun-lit terminator, ocean glint, city lights on the night side), slowly rotating, plus cloud wisps
// and a thin atmosphere skin. The hook opens on a sunrise: the terminator sweeps across the globe while the
// headline rises in.
//
// The surface also carries the story state used by beats 1–5 (all functions of global time):
//   glow   beat 1: the oceans light up and pulse (71% of the surface)
//   lift   beats 2–3: each water source dims as its stream lifts off (oceans darken to bare basins)
//   back   beats 4–5: the water quietly returns (off-focus) so Earth is blue again for beats 6 and 12
// Exports surf() / lonAt() / wordTime() / liftTime() / LIFT_WORDS for the stream scenes (s02, s03).
import * as L from '../../../../engine/runtime/lib.js';
import { R_EARTH, SUN_DIR } from '../env.js';
import { drawEarth, elevation, basis } from '../../../../engine/runtime/earth.js';

const { W, H } = L;
const DEG = Math.PI / 180;
const TAU = Math.PI * 2;
const LAT0 = 17 * DEG;              // viewed a little from the north
const TILT = -15 * DEG;             // axis leans to the upper left (towards the sun)
export const lonAt = (gt) => (-6 - 1.1 * gt) * DEG;   // eastward spin: the centred longitude drifts west
/** 09b: film time (s since the film's first beat, i.e. after the preroll), so the globe's spin matches the original. */
export const filmT = (v) => v.gt - v.tl.scenes[0].start;

// ------------------------------------------------------------------ geography
// The planet itself is the shared real-Earth renderer (NOAA ETOPO1 relief, true coastlines; engine/runtime/earth.js).
// Only the cloud wisps are drawn here.
const LAT0_DEG = 17, TILT_DEG = -15;
// drained sea floor (beats 2-5): a dusty grey-brown basin; bare rock where the ice caps were
const BASIN = [140, 126, 106], BARE_ICE = [118, 110, 100];

// ------------------------------------------------------------------ projection
const cT = Math.cos(TILT), sT = Math.sin(TILT), cL = Math.cos(LAT0), sL = Math.sin(LAT0);
/** Unit-sphere orthographic projection: [x, y (screen-down), z (towards the viewer)]. */
export function project(la, lo, lon0) {
  const cl = Math.cos(la), dl = lo - lon0;
  const x = cl * Math.sin(dl);
  const y = cL * Math.sin(la) - sL * cl * Math.cos(dl);
  const z = sL * Math.sin(la) + cL * cl * Math.cos(dl);
  return [x * cT + y * sT, -(-x * sT + y * cT), z];
}
/** A surface point at global time gt, in world metres (Earth at the origin): {x, y, z}. z > 0 = facing us. */
export function surf(la, lo, gt, lift = 0) {
  const [x, y, z] = project(la, lo, lonAt(gt));
  const R = R_EARTH * (1 + lift);
  return { x: x * R, y: y * R, z };
}

// ------------------------------------------------------------------ timing helpers (synced to the VO)
/** Start time (global s) of the first word matching `re` in a timeline line (same weighting as the captions). */
const warned = new Set();
export function wordTime(tl, li, re, ord) {
  const ln = tl.lines[li];
  const phs = ln.phrases ?? [ln];
  for (const ph of phs) {
    const words = ph.text.split(/\s+/);
    const wts = words.map((w) => w.replace(/\W/g, '').length + 1.5 + (/[,.?!:]$/.test(w) ? 3 : 0));
    const tot = wts.reduce((a, b) => a + b, 0);
    let acc = 0;
    for (let i = 0; i < words.length; i++) {
      if (re.test(words[i])) return ph.start + (ph.end - ph.start) * acc / tot;
      acc += wts[i];
    }
  }
  // no match (the VO line was reworded?): say so, and fall back to an ordinal slot in the last phrase
  const key = li + String(re);
  if (!warned.has(key)) {
    warned.add(key);
    console.warn(`wordTime: no word matching ${re} in line ${li}: "${ln.text}"`);
  }
  if (ord == null) return ln.start;
  const ph = phs[phs.length - 1];
  return ph.start + (ph.end - ph.start) * ord;
}
export const LIFT_WORDS = { oceans: /^oceans/i, ice: /^ice/i, lakes: /^lakes/i, rivers: /^rivers/i, clouds: /^clouds/i };
const LIFT_ORDER = Object.keys(LIFT_WORDS);
/** When a water source starts lifting off (global s): its word in beat 2's VO line. */
export const liftTime = (tl, kind) => wordTime(tl, 2, LIFT_WORDS[kind], LIFT_ORDER.indexOf(kind) / LIFT_ORDER.length);
const T = (v, i) => v.tl.scenes[i].start;

/** Per-source "how much is still on the planet" (1 = all there). Lift happens over beats 2–3, return over 4–5. */
export function remain(v, kind) {
  const t0 = liftTime(v.tl, kind) + 0.15;
  const gone = L.ease.inOutCubic(L.prog(v.gt, t0, T(v, 3) + 1.5 - t0));
  const back = L.ease.inOutCubic(L.prog(v.gt, T(v, 4) + 2.2, 3.2));
  const floor = kind === 'oceans' ? 0.04 : kind === 'clouds' ? 0 : 0.3;
  return 1 - (1 - floor) * gone * (1 - back);
}
/** Beat-1 ocean glow (0..1). */
export function oceanGlow(v) {
  const kin = L.ease.outCubic(L.prog(v.gt, T(v, 1) + 0.12, 0.7));
  const kout = L.ease.inOutCubic(L.prog(v.gt, T(v, 2) + 0.2, 1.0));
  return kin * (1 - kout);
}

// ------------------------------------------------------------------ drawing
function earthGeom(v) {
  return { cx: v.wx(0), cy: v.wy(0), r: v.ws(R_EARTH) };
}
function onScreen(cx, cy, r) {
  const dx = Math.max(0, Math.abs(cx - W / 2) - W / 2), dy = Math.max(0, Math.abs(cy - H / 2) - H / 2);
  if (Math.hypot(dx, dy) > r + 40) return false;
  // fully covering the screen from far outside? (disc so big the view sits inside it) — still draw
  return r > 1.5;
}

/** earth.js view for global time gt (same orientation as project()/surf()). */
function earthView(cx, cy, r, gt) {
  return { cx, cy, r, lon0: lonAt(gt) / DEG, lat0: LAT0_DEG, rot: 0, tilt: TILT_DEG };
}
/** Screen-space sun ([x right, y up, z to the viewer]) — upper left, like SUN_DIR. The hook's sunrise brings it round
 *  from the side so the terminator sweeps across the globe. */
function sunVec(gt) {
  const z = L.lerp(0.12, 0.78, L.ease.outCubic(L.prog(gt, 0, 1.8)));
  return [SUN_DIR.x, -SUN_DIR.y, z];
}

// ---- clouds: a real-looking cloud cover, not strokes. A global cloud map (equirectangular, 0.5°) is generated once
// from domain-warped 3D noise shaped by the planet's cloud belts (ITCZ, the dry subtropics, the stormy mid-latitudes,
// with streaky east-west fronts there), then projected onto the globe every frame at reduced resolution and drawn
// up-scaled (clouds are soft anyway). It drifts slowly east relative to the surface and fades into the night side.
const CM_W = 720, CM_H = 360;
let CLOUD_MAP = null;
function cloudMap() {
  if (CLOUD_MAP) return CLOUD_MAP;
  const m = new Float32Array(CM_W * CM_H);
  const vn = (x, y, z, s) => {
    const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z);
    let xf = x - xi, yf = y - yi, zf = z - zi;
    xf = xf * xf * (3 - 2 * xf); yf = yf * yf * (3 - 2 * yf); zf = zf * zf * (3 - 2 * zf);
    const h = (i, j, k) => {
      let q = Math.imul(s + 0x2545f491, 0x9e3779b1);
      q = Math.imul(q ^ i, 0xcc9e2d51); q = (q << 15) | (q >>> 17);
      q = Math.imul(q ^ j, 0x1b873593); q = (q << 13) | (q >>> 19);
      q = Math.imul(q ^ k, 0xe6546b64); q ^= q >>> 16; q = Math.imul(q, 0x85ebca6b); q ^= q >>> 13;
      return (q >>> 0) / 4294967296;
    };
    const a = h(xi, yi, zi), b = h(xi + 1, yi, zi), c = h(xi, yi + 1, zi), d = h(xi + 1, yi + 1, zi);
    const e = h(xi, yi, zi + 1), f = h(xi + 1, yi, zi + 1), g = h(xi, yi + 1, zi + 1), k = h(xi + 1, yi + 1, zi + 1);
    const x0 = a + (b - a) * xf, x1 = c + (d - c) * xf, x2 = e + (f - e) * xf, x3 = g + (k - g) * xf;
    const y0 = x0 + (x1 - x0) * yf, y1 = x2 + (x3 - x2) * yf;
    return y0 + (y1 - y0) * zf;
  };
  const fbm = (x, y, z, o, s) => { let a = 0, amp = 0.5, t = 0, f = 1; for (let i = 0; i < o; i++) { a += amp * vn(x * f, y * f, z * f, s + i); t += amp; amp *= 0.5; f *= 2.1; } return a / t; };
  for (let j = 0; j < CM_H; j++) {
    const lat = 90 - (j + 0.5) * 180 / CM_H, la = lat * DEG, al = Math.abs(lat);
    // cloud belts: ITCZ (~5°N), clear subtropics (~20-30°), cloudy storm tracks (45-65°), thinner polar caps
    const belt = 0.14 * Math.exp(-(((lat - 6) / 6) ** 2)) - 0.16 * Math.exp(-(((al - 24) / 8) ** 2)) + 0.12 * Math.exp(-(((al - 52) / 12) ** 2)) - 0.1 * L.clamp((al - 68) / 15);
    const streak = L.clamp((al - 30) / 20);   // mid-latitude fronts are stretched east-west
    for (let i = 0; i < CM_W; i++) {
      const lo = (i + 0.5) * 360 / CM_W - 180, l = lo * DEG;
      const x = Math.cos(la) * Math.cos(l), y = Math.cos(la) * Math.sin(l), z = Math.sin(la);
      const sz = 1 + 1.6 * streak;             // squash noise along the meridian -> zonal streaks
      const wx = (fbm(x * 2.2 + 5, y * 2.2, z * 2.2 * sz, 3, 3) - 0.5) * 0.9, wy = (fbm(x * 2.2, y * 2.2 + 3, z * 2.2 * sz, 3, 7) - 0.5) * 0.9;
      const n = fbm(x * 5 + wx, y * 5 + wy, z * 5 * sz, 5, 11);
      const fine = fbm(x * 22 + wx * 3, y * 22 + wy * 3, z * 22 * sz, 3, 21);
      const v = n + belt + 0.3 * (fine - 0.5) - 0.6;
      m[j * CM_W + i] = 0.8 * L.clamp(v / 0.3) ** 1.6;   // patchy, wispy-edged, never a solid sheet
    }
  }
  CLOUD_MAP = m;
  return m;
}
let CLOUD_CV = null;
function drawClouds(c, v, view, k, sun) {
  const { cx, cy, r } = view;
  if (k <= 0.01 || r < 30) return;
  const M = cloudMap();
  // visible part of the disc, sampled every `st` px (≤ ~120k samples)
  const x0 = Math.max(0, Math.floor(cx - r)), x1 = Math.min(W, Math.ceil(cx + r));
  const y0 = Math.max(0, Math.floor(cy - r)), y1 = Math.min(H, Math.ceil(cy + r));
  if (x1 <= x0 || y1 <= y0) return;
  const st = Math.max(1.5, Math.sqrt(((x1 - x0) * (y1 - y0)) / 120000));
  const gw = Math.ceil((x1 - x0) / st), gh = Math.ceil((y1 - y0) / st);
  if (!CLOUD_CV || CLOUD_CV.width < gw || CLOUD_CV.height < gh) CLOUD_CV = new OffscreenCanvas(Math.max(gw, CLOUD_CV?.width ?? 0), Math.max(gh, CLOUD_CV?.height ?? 0));
  const g = CLOUD_CV.getContext('2d');
  const img = g.createImageData(gw, gh), D = img.data;
  const b = basis(view);
  const sn = Math.hypot(...sun), sx = sun[0] / sn, sy = sun[1] / sn, sz = sun[2] / sn;
  const drift = 0.35 * filmT(v);   // degrees east, relative to the ground
  for (let j = 0; j < gh; j++) {
    const Y = (cy - (y0 + (j + 0.5) * st)) / r;
    for (let i = 0; i < gw; i++) {
      const X = ((x0 + (i + 0.5) * st) - cx) / r, rho2 = X * X + Y * Y;
      if (rho2 >= 1) continue;
      const Z = Math.sqrt(1 - rho2);
      const px = X * b.r[0] + Y * b.u[0] + Z * b.c[0], py = X * b.r[1] + Y * b.u[1] + Z * b.c[1], pz = X * b.r[2] + Y * b.u[2] + Z * b.c[2];
      const lat = Math.asin(L.clamp(pz, -1, 1)) / DEG;
      let lon = Math.atan2(py, px) / DEG - drift; lon -= Math.floor((lon + 180) / 360) * 360;
      // bilinear lookup
      let fi = (90 - lat) * CM_H / 180 - 0.5, fj = (lon + 180) * CM_W / 360 - 0.5;
      fi = L.clamp(fi, 0, CM_H - 1.001); if (fj < 0) fj += CM_W;
      const ii = fi | 0, jj = fj | 0, u = fi - ii, w = fj - jj, j1 = jj + 1 >= CM_W ? 0 : jj + 1;
      const a = M[ii * CM_W + jj] * (1 - w) + M[ii * CM_W + j1] * w, bb = M[(ii + 1) * CM_W + jj] * (1 - w) + M[(ii + 1) * CM_W + j1] * w;
      const dens = a + (bb - a) * u;
      if (dens < 0.01) continue;
      const ndl = X * sx + Y * sy + Z * sz;
      const day = L.clamp((ndl + 0.08) / 0.3);
      const lit = 0.55 + 0.45 * Math.sqrt(Math.max(0, ndl));
      const edge = L.clamp((1 - Math.sqrt(rho2)) * r / 3);   // no hard rim at the limb
      const al = dens * day * edge * (0.55 + 0.45 * Math.sqrt(Z));
      const o = (j * gw + i) * 4;
      D[o] = 240 * lit; D[o + 1] = 245 * lit; D[o + 2] = 252 * lit; D[o + 3] = 255 * L.clamp(al * 0.9);
    }
  }
  g.clearRect(0, 0, CLOUD_CV.width, CLOUD_CV.height);
  g.putImageData(img, 0, 0);
  c.save();
  c.globalAlpha *= k;
  c.imageSmoothingEnabled = true; c.imageSmoothingQuality = 'high';
  c.drawImage(CLOUD_CV, 0, 0, gw, gh, x0, y0, gw * st, gh * st);
  c.restore();
}

// ---- drained sea floor (beats 2-5): depth shading from ETOPO, multiplied over earth.js's flat basin colour.
// Shelves stay pale, slopes and abyssal plains go deep brown-grey, ridges catch the light, trenches are darkest.
const DEPTH_STOPS = [[0, 1], [200, 0.97], [1000, 0.9], [2500, 0.78], [4000, 0.66], [5500, 0.56], [7000, 0.48], [9000, 0.42]];
let BASIN_CV = null;
function drawBasinDepth(c, view, a) {
  const { cx, cy, r } = view;
  if (a <= 0.01) return;
  const x0 = Math.max(0, Math.floor(cx - r)), x1 = Math.min(W, Math.ceil(cx + r));
  const y0 = Math.max(0, Math.floor(cy - r)), y1 = Math.min(H, Math.ceil(cy + r));
  if (x1 <= x0 || y1 <= y0) return;
  const st = Math.max(2, Math.sqrt(((x1 - x0) * (y1 - y0)) / 150000));
  const gw = Math.ceil((x1 - x0) / st) + 1, gh = Math.ceil((y1 - y0) / st) + 1;
  if (!BASIN_CV || BASIN_CV.width < gw || BASIN_CV.height < gh) BASIN_CV = new OffscreenCanvas(Math.max(gw, BASIN_CV?.width ?? 0), Math.max(gh, BASIN_CV?.height ?? 0));
  const g = BASIN_CV.getContext('2d');
  const img = g.createImageData(gw, gh), D = img.data;
  const b = basis(view);
  const E = new Float32Array(gw * gh).fill(NaN);
  for (let j = 0; j < gh; j++) {
    const Y = (cy - (y0 + j * st)) / r;
    for (let i = 0; i < gw; i++) {
      const X = ((x0 + i * st) - cx) / r, rho2 = X * X + Y * Y;
      if (rho2 >= 1) continue;
      const Z = Math.sqrt(1 - rho2);
      const px = X * b.r[0] + Y * b.u[0] + Z * b.c[0], py = X * b.r[1] + Y * b.u[1] + Z * b.c[1], pz = X * b.r[2] + Y * b.u[2] + Z * b.c[2];
      E[j * gw + i] = elevation(Math.asin(L.clamp(pz, -1, 1)) / DEG, Math.atan2(py, px) / DEG);
    }
  }
  const pxM = st * R_EARTH / r;   // metres per sample at the disc centre
  for (let j = 0; j < gh; j++) for (let i = 0; i < gw; i++) {
    const e = E[j * gw + i], o = (j * gw + i) * 4;
    D[o] = D[o + 1] = D[o + 2] = 255; D[o + 3] = 255;
    if (!(e < 0)) continue;
    const dep = -e;
    let f = 1;
    for (let q = 1; q < DEPTH_STOPS.length; q++) {
      const [d1, f1] = DEPTH_STOPS[q], [d0, f0] = DEPTH_STOPS[q - 1];
      if (dep <= d1) { f = f0 + (f1 - f0) * (dep - d0) / (d1 - d0); break; }
      f = f1;
    }
    // hillshade from the screen-space slope (light from the upper left)
    const eR = E[j * gw + Math.min(gw - 1, i + 1)], eD = E[Math.min(gh - 1, j + 1) * gw + i];
    const gx = eR === eR ? (eR - e) / pxM : 0, gy = eD === eD ? (eD - e) / pxM : 0;
    const sh = L.clamp(1 + (0.62 * gx + 0.48 * gy) * 5 - 0.04, 0.8, 1);   // slopes facing the upper-left sun stay light
    const m = f * sh;
    D[o] = 255 * m; D[o + 1] = 255 * Math.min(1, m * 1.0); D[o + 2] = 255 * Math.min(1, m * (1.02 + 0.06 * (1 - f)));
  }
  g.putImageData(img, 0, 0);
  c.save();
  c.globalCompositeOperation = 'multiply';
  c.globalAlpha *= a;
  c.imageSmoothingEnabled = true; c.imageSmoothingQuality = 'high';
  c.drawImage(BASIN_CV, 0, 0, gw, gh, x0 - st / 2, y0 - st / 2, gw * st, gh * st);
  c.restore();
}

// beat-1 ocean glow: painted in an offscreen layer, multiplied by an ocean-only mask globe, then added on top
let GLOW_CV = null;
function drawOceanGlow(c, v, view, glow) {
  const cw = c.canvas.width, ch = c.canvas.height;
  if (!GLOW_CV || GLOW_CV.width !== cw || GLOW_CV.height !== ch) GLOW_CV = new OffscreenCanvas(cw, ch);
  const g2 = GLOW_CV.getContext('2d');
  const { cx, cy, r } = view;
  g2.setTransform(1, 0, 0, 1, 0, 0);
  g2.globalCompositeOperation = 'source-over';
  g2.clearRect(0, 0, cw, ch);
  g2.setTransform(c.getTransform());
  g2.save();
  g2.beginPath(); g2.arc(cx, cy, Math.max(0, r), 0, TAU); g2.clip();
  g2.fillStyle = '#000';
  g2.fillRect(cx - r, cy - r, r * 2, r * 2);
  const pulse = 0.5 + 0.5 * Math.sin((v.gt - T(v, 1)) * 3.2);
  g2.fillStyle = L.rgba(v.accent, glow * (0.2 + 0.1 * pulse));
  g2.fillRect(cx - r, cy - r, r * 2, r * 2);
  // two waves of light roll across the water from the sun-lit side
  for (const w0 of [0.35, 1.55]) {
    const wp = L.prog(v.gt - T(v, 1), w0, 1.6);
    if (wp <= 0 || wp >= 1) continue;
    const ox = cx + SUN_DIR.x * r * 0.9, oy = cy + SUN_DIR.y * r * 0.9;
    const rr = r * 2.3 * L.ease.outCubic(wp), band = r * 0.35;
    const g = g2.createRadialGradient(ox, oy, Math.max(0, rr - band), ox, oy, rr + 1);
    g.addColorStop(0, 'rgba(0,0,0,0)');
    g.addColorStop(0.75, L.rgba([150, 215, 255], 0.42 * glow * (1 - wp)));
    g.addColorStop(1, 'rgba(0,0,0,0)');
    g2.globalCompositeOperation = 'lighter';
    g2.fillStyle = g;
    g2.fillRect(cx - r, cy - r, r * 2, r * 2);
  }
  // multiply by the ocean mask: white water, black land and ice
  g2.globalCompositeOperation = 'multiply';
  drawEarth(g2, { ...view, style: 'flat', ocean: [235, 235, 235], land: [0, 0, 0], ice: [0, 0, 0], coast: [0, 0, 0], relief: 0,
    atmosphere: false });
  g2.restore();
  c.save();
  c.setTransform(1, 0, 0, 1, 0, 0);
  c.globalCompositeOperation = 'lighter';
  c.drawImage(GLOW_CV, 0, 0);
  c.restore();
}

/** earth.js adds a specular sun glint wherever the map is 'water' — including the drained basins. Take it back out
 *  (exact inverse of its pow(n.h, 220) spot, via 'difference') so the dry sea floor doesn't shine. */
function unGlint(c, cx, cy, r, sun) {
  const n = Math.hypot(...sun);
  let hx = sun[0] / n, hy = sun[1] / n, hz = sun[2] / n + 1;
  const hn = Math.hypot(hx, hy, hz); hx /= hn; hy /= hn; hz /= hn;
  const px = cx + hx * r, py = cy - hy * r, R = r * 0.26;
  c.save();
  c.globalCompositeOperation = 'difference';
  c.translate(px, py);
  c.rotate(Math.atan2(-hy, hx));
  c.scale(Math.max(0.2, hz), 1);              // foreshortened along the radial direction
  const g = c.createRadialGradient(0, 0, 0, 0, 0, R);
  for (let i = 0; i <= 12; i++) {
    const f = i / 12, th = f * 0.26, sp = 0.4 * Math.exp(-110 * th * th) * (i === 12 ? 0 : 1);
    g.addColorStop(f, `rgb(${Math.round(210 * sp)},${Math.round(220 * sp)},${Math.round(230 * sp)})`);
  }
  c.fillStyle = g;
  c.beginPath(); c.arc(0, 0, R, 0, TAU); c.fill();
  c.restore();
}

/** The whole surface, for any view. */
function drawSurface(c, v) {
  const { cx, cy, r } = earthGeom(v);
  if (!onScreen(cx, cy, r)) return;
  const ft = filmT(v);   // 09b: the hook's sunrise / spin run on film time (the preroll precedes the film)
  const glow = oceanGlow(v);
  // how much of each source is still on the planet, as a visual 0..1 (remain() keeps small floors for the streams)
  const ocean = L.clamp((remain(v, 'oceans') - 0.04) / 0.96);
  const ice = L.clamp((remain(v, 'ice') - 0.3) / 0.7);
  const clouds = remain(v, 'clouds');
  const hook = L.ease.outCubic(L.prog(ft, 0, 1.8));
  const view = earthView(cx, cy, r, ft);
  const base = { ...view, sun: sunVec(ft), lights: 0.55, atmosphere: 1 };

  c.save();
  c.beginPath(); c.arc(cx, cy, Math.max(0, r), 0, TAU); c.clip();
  // ---- the planet: today's Earth over its drained states (beats 2-5). Layers: B = bare (no water, no ice),
  //      M = drained oceans but ice still on, A = full. Only the layers that show are drawn.
  // (relief halved on the drained layers: full ETOPO hillshade turns low coasts and bare Greenland into a crumbly stipple)
  if (ocean < 0.999 && ice < 0.999) drawEarth(c, { ...base, ocean: BASIN, ice: BARE_ICE, seaIce: 0, relief: 0.45 });
  if (ocean < 0.999 && ice > 0.001) drawEarth(c, { ...base, ocean: BASIN, seaIce: 0, relief: 0.45, alpha: ice < 0.999 ? ice : 1 });
  if (ocean < 0.999) { unGlint(c, cx, cy, r, base.sun); drawBasinDepth(c, view, 1); }
  if (ocean > 0.001) drawEarth(c, { ...base, alpha: ocean < 0.999 ? ocean : 1 });
  if (glow > 0.001) {
    c.fillStyle = `rgba(4,8,16,${0.22 * glow})`;   // land recedes a touch while the oceans glow (beat 1)
    c.fillRect(cx - r, cy - r, r * 2, r * 2);
    drawOceanGlow(c, v, view, glow);
  }

  // ---- clouds
  drawClouds(c, v, view, clouds * (1 - 0.6 * glow), base.sun);

  // ---- the hook's sunrise: the globe brightens out of the dark as the light comes round
  if (hook < 1) {
    c.fillStyle = `rgba(2,4,12,${0.35 * (1 - hook)})`;
    c.fillRect(cx - r, cy - r, r * 2, r * 2);
  }
  c.restore();

  // ---- atmosphere: a thin glowing skin, brighter on the day side
  const th = Math.max(3, r * 0.028);
  c.save();
  c.globalCompositeOperation = 'lighter';
  const ag = c.createRadialGradient(cx, cy, Math.max(0, r - 1), cx, cy, r + th);
  ag.addColorStop(0, `rgba(140,200,255,${0.5 * (0.35 + 0.65 * hook)})`);
  ag.addColorStop(1, 'rgba(140,200,255,0)');
  c.fillStyle = ag;
  c.beginPath(); c.arc(cx, cy, r + th, 0, TAU); c.arc(cx, cy, Math.max(0, r - 1), 0, TAU, true); c.fill('evenodd');
  // sunrise flare on the upper-left limb: soft, peaks ~0.8 s (frame 0 is already a clean, composed globe)
  const flare = Math.sin(Math.PI * L.clamp((ft - 0.15) / 1.5)) * (ft >= 0 && ft < 3 ? 1 : 0);
  if (flare > 0.01) {
    const n = Math.hypot(SUN_DIR.x, SUN_DIR.y);
    const fx = cx + SUN_DIR.x / n * r * 0.99, fy = cy + SUN_DIR.y / n * r * 0.99;
    L.lightBlob(c, fx, fy, r * 0.5, [255, 236, 210], 0.16 * flare);
    L.lightBlob(c, fx, fy, r * 0.1, [255, 250, 240], 0.3 * flare);
  }
  c.restore();
}

/** When the camera is zoomed in on the water balls (mpp well below the Earth framings), Earth is only context
 *  at the frame edge: dim it so its bright limb doesn't sit loudly behind the HUD / headlines (beats 4, 5, 7). */
function drawRecede(c, v) {
  drawHudShade(c, v);
  let k = L.smoothstep(L.clamp(L.invLerp(Math.log(1.6e4), Math.log(7e3), Math.log(v.cam.mpp))));
  // beat 6 ("Next to Earth"): the planet comes back to full light from the first word, not when the pull-back ends
  if (v.beat === 6) k *= 1 - L.ease.inOutCubic(L.prog(v.gt, T(v, 6) - 0.05, 0.4));
  if (k <= 0.001) return;
  const { cx, cy, r } = earthGeom(v);
  if (!onScreen(cx, cy, r * 1.1)) return;
  c.save();
  const g = c.createRadialGradient(cx, cy, Math.max(0, r * 0.9), cx, cy, r * 1.06);
  g.addColorStop(0, `rgba(2,4,10,${0.62 * k})`);
  g.addColorStop(0.62, `rgba(2,4,10,${0.62 * k})`);
  g.addColorStop(1, 'rgba(2,4,10,0)');
  c.fillStyle = g;
  c.beginPath(); c.arc(cx, cy, Math.max(0, r * 1.06), 0, TAU); c.fill();
  c.restore();
}

/** While the camera sweeps between Earth and the water balls (beats 4, 6, 7, 12), the big globe passes through the HUD
 *  band (y < 300: top bar, chapter card). Wherever its disc reaches into that band, the globe (and its atmosphere)
 *  sinks into shadow there, so the card always reads on dark sky. Scaled by how deep the disc intrudes. */
const HUD_Y = 330;
function drawHudShade(c, v) {
  const { cx, cy, r } = earthGeom(v);
  const R = r * 1.04;
  const xs = L.clamp(cx, 0, W);
  if (Math.abs(xs - cx) >= R) return;
  const top = cy - Math.sqrt(R * R - (xs - cx) ** 2);    // highest point of the disc inside the frame's width
  const k = L.smoothstep(L.clamp((HUD_Y + 30 - top) / 140));
  if (k <= 0.001) return;
  c.save();
  c.beginPath(); c.arc(cx, cy, Math.max(0, R + 2), 0, TAU); c.clip();
  const g = c.createLinearGradient(0, 0, 0, HUD_Y + 60);
  g.addColorStop(0, `rgba(2,4,10,${0.86 * k})`);
  g.addColorStop(0.62, `rgba(2,4,10,${0.72 * k})`);
  g.addColorStop(1, 'rgba(2,4,10,0)');
  c.fillStyle = g;
  c.fillRect(0, 0, W, HUD_Y + 60);
  c.restore();
}

// ------------------------------------------------------------------ headline
function drawHeadline(c, v) {
  const t = v.t;
  const kout = L.ease.inCubic(L.prog(t, v.d - 0.55, 0.4));
  if (kout >= 1) return;
  const top = v.wy(-R_EARTH) - v.ws(R_EARTH) * 0.05;          // just above the atmosphere
  const size = 100, lh = 104;
  const yb2 = L.clamp(top - 40, 300 + size * 0.78 + lh, 640);  // second line baseline (line 1 clear of the HUD band)
  c.save();
  c.textBaseline = 'alphabetic';
  // a soft dark backing (keeps the type crisp if it ever meets the bright limb)
  const bg = c.createRadialGradient(W / 2, yb2 - lh * 0.6, 20, W / 2, yb2 - lh * 0.6, 520);
  bg.addColorStop(0, `rgba(2,4,10,${0.5 * (1 - kout)})`);
  bg.addColorStop(1, 'rgba(2,4,10,0)');
  c.fillStyle = bg;
  c.fillRect(0, yb2 - lh * 0.6 - 520, W, 1040);
  const lines = [[['HOW', 0], ['MUCH', 0], ['WATER', 1]], [['IS', 0], ['ON', 0], ['EARTH?', 0]]];
  c.font = L.font(size, 800, L.FONT.display);
  const sp = 26;
  lines.forEach((words, li) => {
    const ws = words.map(([w]) => c.measureText(w).width);
    const total = ws.reduce((a, b) => a + b, 0) + sp * (words.length - 1);
    let x = W / 2 - total / 2;
    const yb = yb2 - (1 - li) * lh;
    words.forEach(([w, acc], wi) => {
      const st = -0.3 + li * 0.32 + wi * 0.075;   // frame 0: 'HOW MUCH WATER' already rising in
      const e = L.ease.outQuint(L.prog(t, st, 0.7));
      if (e > 0) {
        // each word rises out of its own mask line
        c.save();
        c.beginPath(); c.rect(x - 10, yb - size * 1.05, ws[wi] + 20, size * 1.3); c.clip();
        c.globalAlpha = L.clamp(e * 1.6) * (1 - kout);
        c.fillStyle = acc ? L.rgba(v.accent) : 'rgb(242,246,252)';
        c.shadowColor = 'rgba(0,0,0,0.6)';
        c.shadowBlur = 22;
        const dy = (1 - e) * size * 0.9 - kout * 24;
        c.fillText(w, x, yb + dy);
        if (acc) {
          // a glint of light runs through "WATER" once it lands
          const gp = L.prog(t, st + 0.75, 0.9);
          if (gp > 0 && gp < 1) {
            c.globalCompositeOperation = 'lighter';
            const gx = x - 80 + (ws[wi] + 160) * L.ease.inOutCubic(gp);
            const g = c.createLinearGradient(gx - 60, 0, gx + 60, 0);
            g.addColorStop(0, 'rgba(255,255,255,0)');
            g.addColorStop(0.5, 'rgba(220,240,255,0.75)');
            g.addColorStop(1, 'rgba(255,255,255,0)');
            c.fillStyle = g;
            c.shadowBlur = 0;
            c.fillText(w, x, yb + dy);
          }
        }
        c.restore();
      }
      x += ws[wi] + sp;
    });
  });
  // accent rule under the headline, wiping out from the centre
  const re = L.ease.outCubic(L.prog(t, 0.5, 0.7)) * (1 - kout);
  if (re > 0) {
    c.fillStyle = L.rgba(v.accent, 0.9 * re);
    c.fillRect(W / 2 - 70 * re, yb2 + 30, 140 * re, 4);
  }
  c.restore();
}

// ------------------------------------------------------------------ scene
export default {
  beat: 0,
  chapter: null,
  captions: false,
  layer: 0,
  cues(d) {
    return [
      { t: 0.0, name: 'swell', gain: 0.32, pitch: 0.8 },
      { t: 0.05, name: 'swish', gain: 0.24, pitch: 0.9 },
      { t: 0.15, name: 'swish', gain: 0.2, pitch: 1.1 },
      { t: 0.75, name: 'shimmer', gain: 0.22, pitch: 1.0 },
      { t: d - 0.7, name: 'riser', gain: 0.16, pitch: 1.1 },
    ];
  },
  drawWorld(ctx, v) {
    drawSurface(ctx, v);
    drawRecede(ctx, v);
    // the headline is drawn here rather than in drawOverlay: overlays are gated by the beat's fade-in (k = 0 on
    // frame 0), and the first frame in the feed must already read. Nothing else is in the world during beat 0.
    if (v.t < v.d + 0.1) { ctx.save(); drawHeadline(ctx, v); ctx.restore(); }
  },
};
