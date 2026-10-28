// Environment for "The Loneliest Place on Earth" (Zoom Out 33, True Scale).
//
// WHAT ENV DRAWS (every frame, under all scenes):
//   1. deep navy-black space + twinkling stars (screen space)
//   2. the REAL Earth (earth.js 'day': ETOPO1 coastlines, bathymetry, relief, atmosphere) framed by camera.js; skipped
//      while the seabed scene fully covers the frame (uwK = 1)
//   3. a faint graticule once the globe reads as a planet
//   foreground: the Point Nemo pin (a lone cyan point with a slow pulse), on the globe whenever the globe is visible
// HUD: a soft top scrim + topBar.
//
// SCREEN RULES: HUD y < 340; captions y 1380–1520 (captionY 1450); nothing important at x > 940 below y 1100; y > 1580
// clear. Everything on the planet is placed with geo(v, lat, lon).
import * as L from '../../../engine/runtime/lib.js';
import { stars, topBar, scaleBar } from '../../../engine/runtime/kit.js';
import { drawEarth, project, unproject, geoPath, elevation, warm } from '../../../engine/runtime/earth.js';
import { R_EARTH, SHOTS, B, PH, WD, globeAt, shotAt, shotStart, NEMO, DUCIE, MOTU, MAHER, LIMB_R, LIMB_NEMO, LIMB_SIDE } from './camera.js';
warm();

export { R_EARTH, SHOTS, B, PH, WD, shotAt, shotStart, NEMO, DUCIE, MOTU, MAHER, LIMB_R, LIMB_NEMO, LIMB_SIDE };
const { W, H } = L;
const DEG = Math.PI / 180;

// ------------------------------------------------------------------ palette
export const ACCENT = [90, 190, 230];     // cold cyan (= episode.json accent)
export const NAVY = [5, 9, 20];
export const PLATE = [7, 12, 26];         // opaque card plates
export const INKW = [240, 244, 250];
export const GREYT = [170, 186, 206];     // secondary text
export const FIRE = [255, 160, 80];       // re-entry streaks

// every on-screen number (script.md FACT-CHECK)
export const FACTS = {
  coords: '48°52.6′ S · 123°23.6′ W',
  landKm: 2688,          // to Ducie, Motu Nui and Maher Island
  landKmRound: 2700,
  issKm: 400,
  wrecks: 260,
  mirYear: 2001,
  issEnd: 2030,
  depthKm: 3.7,
};

// ------------------------------------------------------------------ camera wrappers + timing
let gCacheT = NaN, gCache = null, gCacheTl = null;
export function globe(v) {
  if (v.gt !== gCacheT || v.tl !== gCacheTl) { gCache = globeAt(v.gt, v.tl); gCacheT = v.gt; gCacheTl = v.tl; }
  return gCache;
}
export const geo = (v, lat, lon, alt = 0) => project(lat, lon, globe(v), alt);
export const geoTrace = (c, v, pts, close = true, step = 1.5) => geoPath(c, globe(v), pts, close, step);
/** phrase j of the scene's own line, beat-relative seconds */
export function phrase(v, j, edge = 'start') {
  const i = v.index ?? v.beat;
  return PH(i, j, edge)(v.tl) - v.tl.scenes[i].start;
}
/** word k of phrase j of the scene's own line, beat-relative seconds (REAL word start from the voice alignment) */
export function word(v, j, k, dt = 0) {
  const i = v.index ?? v.beat;
  return WD(i, j, k, dt)(v.tl) - v.tl.scenes[i].start;
}
/** frame-quantised time: digits never flicker between motion-blur sub-frames */
export const gq = (t) => Math.round(t * 30) / 30;

// ------------------------------------------------------------------ the dive (beat 5) and the rise (beat 6)
/** 0 = globe, 1 = the seabed scene covers the frame */
export function uwK(gt, tl) {
  const a = PH(5, 1, 'start', -0.12)(tl), b = B(6, -0.12)(tl);
  return L.smoothstep(L.prog(gt, a, 0.42)) * (1 - L.smoothstep(L.prog(gt, b, 0.42)));
}

// ------------------------------------------------------------------ geometry helpers
const vec = (la, lo) => [Math.cos(la * DEG) * Math.cos(lo * DEG), Math.cos(la * DEG) * Math.sin(lo * DEG), Math.sin(la * DEG)];
const toLL = (p) => ({ lat: Math.asin(L.clamp(p[2], -1, 1)) / DEG, lon: Math.atan2(p[1], p[0]) / DEG });
/** destination point from (lat, lon) along bearing brg (deg) by angular distance d (deg) */
export function dest(lat, lon, brg, d) {
  const p1 = lat * DEG, l1 = lon * DEG, t = brg * DEG, dd = d * DEG;
  const p2 = Math.asin(Math.sin(p1) * Math.cos(dd) + Math.cos(p1) * Math.sin(dd) * Math.cos(t));
  const l2 = l1 + Math.atan2(Math.sin(t) * Math.sin(dd) * Math.cos(p1), Math.cos(dd) - Math.sin(p1) * Math.sin(p2));
  return [p2 / DEG, ((l2 / DEG + 540) % 360) - 180];
}
/** small circle of angular radius rad (deg) around (lat, lon) as [[lat, lon], ...] */
export function smallCircle(lat, lon, rad, n = 180, a0 = 0, a1 = 360) {
  const out = [];
  for (let i = 0; i <= n; i++) out.push(dest(lat, lon, L.lerp(a0, a1, i / n), rad));
  return out;
}
/** great-circle points from a to b (deg), fraction f of the way */
export function gcPoints(a, b, f = 1, n = 60) {
  const pa = vec(a.lat, a.lon), pb = vec(b.lat, b.lon);
  const om = Math.acos(L.clamp(pa[0] * pb[0] + pa[1] * pb[1] + pa[2] * pb[2], -1, 1));
  const out = [];
  for (let i = 0; i <= n; i++) {
    const t = (i / n) * f, s = Math.sin(om);
    const ka = Math.sin((1 - t) * om) / s, kb = Math.sin(t * om) / s;
    const ll = toLL([ka * pa[0] + kb * pb[0], ka * pa[1] + kb * pb[1], ka * pa[2] + kb * pb[2]]);
    out.push([ll.lat, ll.lon]);
  }
  return out;
}
export const KM_PER_DEG = 111.195;
/** angular distance Nemo → island (deg) */
export const angDist = (a, b) => {
  const pa = vec(a.lat, a.lon), pb = vec(b.lat, b.lon);
  return Math.acos(L.clamp(pa[0] * pb[0] + pa[1] * pb[1] + pa[2] * pb[2], -1, 1)) / DEG;
};
export const LAND_DEG = FACTS.landKm / KM_PER_DEG;   // 24.17°

// ------------------------------------------------------------------ the ISS orbit (51.6° inclination, through Nemo)
// argument of latitude u (deg) → lat/lon; ascending pass over Nemo at u = U_NEMO
export const ISS_INC = 51.6, ISS_ALT = 408e3 / R_EARTH;   // altitude as a fraction of the radius (≈ 0.064)
const SI = Math.sin(ISS_INC * DEG), CI = Math.cos(ISS_INC * DEG);
export const U_NEMO = Math.asin(Math.sin(NEMO.lat * DEG) / SI) / DEG;   // ≈ −74°
const OMEGA = NEMO.lon - Math.atan2(CI * Math.sin(U_NEMO * DEG), Math.cos(U_NEMO * DEG)) / DEG;
export function orbitLL(u) {
  const ur = u * DEG;
  const lat = Math.asin(SI * Math.sin(ur)) / DEG;
  const lon = OMEGA + Math.atan2(CI * Math.sin(ur), Math.cos(ur)) / DEG;
  return { lat, lon: ((lon + 540) % 360) - 180 };
}
/** screen point of the orbit at u with altitude alt (fraction of r); hidden = behind the planet */
export function orbitPt(v, u, alt = ISS_ALT) {
  const ll = orbitLL(u), g = globe(v);
  const p = project(ll.lat, ll.lon, g, alt);
  const hidden = p.z < 0 && Math.hypot(p.x - g.cx, p.y - g.cy) < g.r;
  return { ...p, hidden };
}
/** heading of the orbit on screen at u (radians, for the station's roll) */
export function orbitAngle(v, u, alt = ISS_ALT) {
  const a = orbitPt(v, u - 0.5, alt), b = orbitPt(v, u + 0.5, alt);
  return Math.atan2(b.y - a.y, b.x - a.x);
}
/** stroke the orbit ring (or part of it) at altitude alt, skipping the part behind the planet */
export function strokeOrbit(c, v, u0, u1, alt = ISS_ALT, step = 1.5) {
  let pen = false;
  c.beginPath();
  for (let u = u0; u <= u1 + 1e-6; u += step) {
    const p = orbitPt(v, u, alt);
    if (!p.hidden) { if (pen) c.lineTo(p.x, p.y); else c.moveTo(p.x, p.y); pen = true; } else pen = false;
  }
  c.stroke();
}

// ------------------------------------------------------------------ the ISS (accurate top-view silhouette)
// Units: metres, x along the main truss (109 m), y across it. 8 solar-array wings (P4/P6/S4/S6, each a two-blanket wing
// on a central mast, 34 m × 11.6 m) on either side of the truss ends; the pressurised stack crosses the truss in the
// middle (US segment forward: Destiny, Harmony with Kibo to port and Columbus to starboard; Russian segment aft: Zarya,
// Zvezda with its own small arrays); the heat-rejection radiators hang off the inner truss.
const WING_X = [-50, -37.5, 37.5, 50], WING_W = 11.6, WING_Y0 = 3.2, WING_Y1 = 37;
export function drawISS(c, x, y, span, ang = 0, alpha = 1, glowK = 0.6) {
  if (alpha <= 0 || span < 2) return;
  const s = span / 110;
  c.save();
  c.translate(x, y); c.rotate(ang); c.scale(s, s);
  c.globalAlpha *= alpha;
  if (glowK > 0) L.lightBlob(c, 0, 0, 75, [200, 230, 255], 0.22 * glowK);
  const lw = Math.max(0.35, 0.9 / s);   // ≥ ~0.9 screen px
  // radiators (behind the truss): three white panels each side of centre, trailing aft
  c.fillStyle = 'rgb(222,228,234)';
  for (const sx of [-1, 1]) {
    for (let k = 0; k < 3; k++) {
      const rx = sx * (9 + k * 0.2), ry = -3 - k * 7.4;
      c.fillRect(rx - 1.6, ry - 6.6, 3.2, 6.6);
    }
  }
  // solar-array wings: copper-gold blankets, dark cell grid, a bright mast down the middle
  for (const wx of WING_X) {
    for (const sy of [-1, 1]) {
      const y0 = sy > 0 ? WING_Y0 : -WING_Y1, h = WING_Y1 - WING_Y0;
      for (const half of [0, 1]) {
        const bx = wx - WING_W / 2 + half * (WING_W / 2 + 0.35), bw = WING_W / 2 - 0.35;
        const gr = c.createLinearGradient(bx, 0, bx + bw, 0);
        gr.addColorStop(0, 'rgb(122,86,44)'); gr.addColorStop(0.5, 'rgb(168,124,66)'); gr.addColorStop(1, 'rgb(112,80,42)');
        c.fillStyle = gr;
        c.fillRect(bx, y0, bw, h);
        if (s > 0.6) {
          c.strokeStyle = 'rgba(40,26,12,0.55)';
          c.lineWidth = lw * 0.8;
          c.beginPath();
          for (let k = 1; k < 9; k++) { const yy = y0 + (h * k) / 9; c.moveTo(bx, yy); c.lineTo(bx + bw, yy); }
          c.stroke();
        }
      }
      c.fillStyle = 'rgb(210,210,200)';
      c.fillRect(wx - 0.35, y0, 0.7, h);
      // blanket box at the tip
      c.fillRect(wx - WING_W / 2, sy > 0 ? WING_Y1 - 0.8 : -WING_Y1, WING_W, 0.8);
    }
  }
  // pressurised stack (crosses the truss): forward = +y
  const mod = (x0, y0, w, h, col = 'rgb(226,226,220)') => { c.fillStyle = col; L.roundRect(c, x0, y0, w, h, Math.min(w, h) * 0.45); c.fill(); };
  mod(-2.2, -0.5, 4.4, 9.5);              // Destiny
  mod(-2.2, 8.5, 4.4, 7.4);               // Harmony
  mod(-15, 10.2, 13, 4.4, 'rgb(214,214,206)');   // Kibo (port)
  mod(2.2, 10.4, 7, 4.4, 'rgb(214,214,206)');    // Columbus (starboard)
  mod(-2.0, 15.5, 4.0, 3.2, 'rgb(200,200,196)'); // PMA / docked port
  mod(-2.3, -6.5, 4.6, 6.0);              // Unity + Zarya fwd
  mod(-2.0, -18.5, 4.0, 12.5, 'rgb(220,220,212)'); // Zarya
  mod(-2.1, -31.5, 4.2, 13.5, 'rgb(216,216,208)'); // Zvezda
  // Zvezda's own arrays (smaller, dark blue)
  c.fillStyle = 'rgb(48,62,96)';
  c.fillRect(-15.5, -27.2, 13, 3.2); c.fillRect(2.5, -27.2, 13, 3.2);
  // main truss (on top): light grey with segment joints
  c.fillStyle = 'rgb(186,188,184)';
  c.fillRect(-55, -1.4, 110, 2.8);
  c.fillStyle = 'rgba(70,72,74,0.7)';
  for (let k = -50; k <= 50; k += 8.5) c.fillRect(k - 0.25, -1.4, 0.5, 2.8);
  // a soft sun-side highlight
  c.globalCompositeOperation = 'lighter';
  c.fillStyle = 'rgba(255,255,255,0.08)';
  c.fillRect(-55, -1.4, 110, 1.0);
  c.restore();
}

// ------------------------------------------------------------------ text, plates, counters
/** opaque plate (full alpha from its first frame; animate its size, not its alpha) */
export function plate(c, x, y, w, h, { r = 14, border = 0.55, accent = ACCENT, fill = PLATE } = {}) {
  c.save();
  c.shadowColor = 'rgba(0,0,0,0.5)'; c.shadowBlur = 24; c.shadowOffsetY = 6;
  c.fillStyle = L.rgba(fill);
  L.roundRect(c, x, y, w, h, r); c.fill();
  c.shadowColor = 'transparent';
  if (border > 0) {
    c.strokeStyle = L.rgba(accent, border);
    c.lineWidth = 2;
    L.roundRect(c, x, y, w, h, r); c.stroke();
  }
  c.restore();
}
/** text width with tracking */
export function tw(c, str, size, weight = 800, fam = L.FONT.display, track = 0) {
  c.font = L.font(size, weight, fam);
  c.letterSpacing = `${track}px`;
  const w = c.measureText(str).width - (str.length ? track : 0);
  c.letterSpacing = '0px';
  return w;
}
/** a map label (small tracked caps, dark halo), centred or aligned at (x, y) */
export function mapLabel(c, str, x, y, { size = 24, alpha = 1, align = 'center', color = GREYT, track = 4, weight = 600 } = {}) {
  if (alpha <= 0) return;
  c.save();
  c.globalAlpha *= alpha;
  c.font = L.font(size, weight, L.FONT.body);
  c.textBaseline = 'middle';
  c.shadowColor = 'rgba(2,6,14,0.95)'; c.shadowBlur = 10;
  c.fillStyle = L.rgba(color);
  L.trackedText(c, str, x, y, track, align);
  L.trackedText(c, str, x, y, track, align);
  c.restore();
}
/** crisp eased count: integer value at time t (frame-quantised by the caller), landing exactly on `final` at t1 */
export function countAt(t, t0, t1, final) {
  const k = L.ease.outCubic(L.prog(t, t0, t1 - t0));
  return k >= 1 ? final : Math.floor(final * k);
}
/** number drawn in fixed-width digit cells (no jitter while counting): returns the drawn width.
 *  str: e.g. '≈ 2,688 KM' — digits sit in cells of the '0' width, everything else in its own width. */
export function cellText(c, str, x, y, size, { weight = 800, fam = L.FONT.display, align = 'left', color = INKW, dry = false } = {}) {
  c.font = L.font(size, weight, fam);
  const cw = c.measureText('0').width;
  const ws = [...str].map((ch) => (/\d/.test(ch) ? cw : c.measureText(ch).width));
  const total = ws.reduce((a, b) => a + b, 0);
  if (dry) return total;
  let xx = align === 'center' ? x - total / 2 : align === 'right' ? x - total : x;
  c.fillStyle = typeof color === 'string' ? color : L.rgba(color);
  c.textAlign = 'center';
  [...str].forEach((ch, i) => { c.fillText(ch, xx + ws[i] / 2, y); xx += ws[i]; });
  c.textAlign = 'left';
  return total;
}
/** format with thousands separators, padded to the final's digit count (so the width never changes) */
export const fmtCount = (n, final) => {
  const s = L.fmt(n), f = L.fmt(final);
  return s.length >= f.length ? s : s.padStart(f.length, ' ');
};

/** soft dark radial scrim behind a text block (no hard edge) */
export function scrim(c, x, y, rx, ry, a = 0.5) {
  const g = c.createRadialGradient(0, 0, 0, 0, 0, 1);
  g.addColorStop(0, `rgba(2,6,16,${a})`); g.addColorStop(0.6, `rgba(2,6,16,${a * 0.55})`); g.addColorStop(1, 'rgba(2,6,16,0)');
  c.save(); c.translate(x, y); c.scale(rx, ry); c.fillStyle = g; c.fillRect(-1, -1, 2, 2); c.restore();
}

/** a drawn arrow head at (x, y) pointing along angle a */
export function arrowHead(c, x, y, a, s = 12) {
  c.beginPath();
  c.moveTo(x + Math.cos(a) * s, y + Math.sin(a) * s);
  c.lineTo(x + Math.cos(a + 2.5) * s, y + Math.sin(a + 2.5) * s);
  c.lineTo(x + Math.cos(a - 2.5) * s, y + Math.sin(a - 2.5) * s);
  c.closePath(); c.fill();
}

// ------------------------------------------------------------------ light, graticule, glint
const SUN = [-0.42, 0.5, 0.76];
const SUN_LIMB = [0.15, 0.85, 0.5];   // limb shot: light from above so the horizon glows
export function sunAt(gt, tl) {
  const a = shotStart('limb', tl), b = shotStart('gyre', tl);
  const k = L.ease.inOutCubic(L.prog(gt, a, 1.4)) * (1 - L.ease.inOutCubic(L.prog(gt, b, 1.6)));
  const s = SUN.map((x, i) => L.lerp(x, SUN_LIMB[i], k));
  const n = Math.hypot(...s);
  return s.map((x) => x / n);
}
function geoPathVisible(c, g, pts, close = true) {
  let pen = false;
  const n = pts.length, last = close ? n + 1 : n;
  for (let i = 0; i < last; i++) {
    const [la, lo] = pts[i % n];
    const p = project(la, lo, g);
    if (p.z > 0.02) { if (pen) c.lineTo(p.x, p.y); else c.moveTo(p.x, p.y); pen = true; } else pen = false;
  }
}
export const gratK = (gt, tl) => {
  const g = globeAt(gt, tl);
  return L.smoothstep(L.invLerp(1800, 900, g.r)) * (1 - L.smoothstep(L.prog(gt, shotStart('limb', tl), 0.8))) +
    L.smoothstep(L.prog(gt, shotStart('gyre', tl), 1.2)) * L.smoothstep(L.invLerp(1800, 900, g.r));
};
function drawGraticule(c, g, k) {
  if (k <= 0.01) return;
  c.save();
  c.lineWidth = 1;
  for (let lat = -75; lat <= 75; lat += 15) {
    const pts = []; for (let lon = -180; lon < 180; lon += 3) pts.push([lat, lon]);
    c.strokeStyle = lat === 0 ? `rgba(200,225,255,${0.16 * k})` : `rgba(190,215,255,${0.06 * k})`;
    c.beginPath(); geoPathVisible(c, g, pts); c.stroke();
  }
  for (let lon = -180; lon < 180; lon += 30) {
    const pts = []; for (let lat = -80; lat <= 80; lat += 3) pts.push([lat, lon]);
    c.strokeStyle = `rgba(190,215,255,${0.06 * k})`;
    c.beginPath(); geoPathVisible(c, g, pts, false); c.stroke();
  }
  c.restore();
}
/** paint out earth.js's specular ocean glint (it reads as a bright blotch on a map) */
function glintDamper(c, g, sun) {
  let hx = sun[0], hy = sun[1], hz = sun[2] + 1; const hn = Math.hypot(hx, hy, hz) || 1; hx /= hn; hy /= hn; hz /= hn;
  const sg = 0.08 * g.r, rr = Math.max(0, 3.4 * sg);
  const gx = g.cx + hx * g.r, gy = g.cy - hy * g.r;
  if (rr < 1 || gx + rr < 0 || gx - rr > W || gy + rr < 0 || gy - rr > H) return;
  let ws = 0, ww = 0;
  for (let i = -3; i <= 3; i++) for (let j = -3; j <= 3; j++) {
    const ll = unproject(gx + i * 0.5 * sg, gy + j * 0.5 * sg, g);
    if (!ll) continue;
    const wgt = Math.exp(-0.125 * (i * i + j * j));
    ww += wgt; if (elevation(ll.lat, ll.lon) < 0) ws += wgt;
  }
  const pk = ww > 0 ? ws / ww : 0;
  if (pk < 0.005) return;
  const gr = c.createRadialGradient(gx, gy, 0, gx, gy, rr);
  for (let i = 0; i <= 16; i++) { const f = i / 16, d = 3.4 * f; gr.addColorStop(f, `rgba(8,22,52,${pk * Math.min(1, 2.2 * Math.exp(-0.5 * d * d)) * (1 - f ** 4)})`); }
  c.save();
  c.beginPath(); c.arc(g.cx, g.cy, Math.max(0, g.r - 1), 0, Math.PI * 2); c.clip();
  c.fillStyle = gr; c.fillRect(gx - rr, gy - rr, rr * 2, rr * 2);
  c.restore();
}

// ------------------------------------------------------------------ layers
const bgCache = { g: null };
export function drawBackground(c, v) {
  if (!bgCache.g) {
    bgCache.g = c.createRadialGradient(W / 2, H * 0.45, 0, W / 2, H * 0.45, H * 0.8);
    bgCache.g.addColorStop(0, 'rgb(9,16,34)');
    bgCache.g.addColorStop(1, 'rgb(2,4,10)');
  }
  c.fillStyle = bgCache.g;
  c.fillRect(0, 0, W, H);
  if (uwK(v.gt, v.tl) >= 0.999) return;
  stars(c, v, 0.8, 170, 33);
  const g = globe(v);
  // no sun: earth.js's soft studio light (whole disc lit, no specular glint blotch on the open ocean).
  // No sea-ice pack (its noise-feathered edge read as a fake white "cauliflower"): the real Antarctic coast shows,
  // the ice sheet a soft blue-grey so it never outshines the ocean, relief up so the ice reads as terrain.
  drawEarth(c, { ...g, style: 'day', atmosphere: true, seaIce: 0, ice: [200, 212, 228], relief: 1.5 });
  drawOceanSurface(c, v, g);
  drawGraticule(c, g, gratK(v.gt, v.tl));
}

// ------------------------------------------------------------------ open-ocean surface (close range)
// When the camera is so low that earth.js's 0.1° bathymetry cells would show as flat blue blocks (r > ≈ 4,000 px), a
// soft swell texture covers the sea: hook, dive, rise.
let SWELL = null;
export function swell() {
  if (SWELL) return SWELL;
  const n = 512, cv = new OffscreenCanvas(n, n), cx = cv.getContext('2d');
  const img = cx.createImageData(n, n);
  // tileable smooth value noise, three octaves (lattice wraps at the tile edge)
  const r = L.rng(808), lat = {};
  const val = (G, i, j) => { const k = `${G}:${((i % G) + G) % G}:${((j % G) + G) % G}`; return lat[k] ?? (lat[k] = r()); };
  const noise = (u, v, G) => {
    const x = u * G, y = v * G, i = Math.floor(x), j = Math.floor(y), fx = L.smoothstep(x - i), fy = L.smoothstep(y - j);
    return L.lerp(L.lerp(val(G, i, j), val(G, i + 1, j), fx), L.lerp(val(G, i, j + 1), val(G, i + 1, j + 1), fx), fy);
  };
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
    const u = x / n, v = y / n;
    const h = 0.55 * noise(u, v, 4) + 0.3 * noise(u, v, 8) + 0.15 * noise(u, v, 16);
    const i = (y * n + x) * 4, b = L.clamp(0.5 + (h - 0.5) * 1.1);
    img.data[i] = 9 + 14 * b; img.data[i + 1] = 30 + 26 * b; img.data[i + 2] = 64 + 40 * b; img.data[i + 3] = 255;
  }
  cx.putImageData(img, 0, 0);
  SWELL = cv;
  return cv;
}
export function drawOceanSurface(c, v, g = globe(v)) {
  const k = L.smoothstep(L.invLerp(4000, 9000, g.r));
  if (k <= 0.01) return;
  const pxkm = g.r / 6371, tile = 160 * pxkm;   // one tile ≈ 160 km of sea
  const pat = c.createPattern(swell(), 'repeat');
  pat.setTransform(new DOMMatrix().translateSelf(g.cx + v.gt * 3, g.cy).rotateSelf(-18).scaleSelf(tile / 512, tile / 512 * 0.45));
  c.save();
  c.globalAlpha = k;
  c.fillStyle = pat;
  c.fillRect(0, 0, W, H);
  const sh = c.createRadialGradient(W / 2, g.cy, 100, W / 2, g.cy, 1300);
  sh.addColorStop(0, 'rgba(10,40,80,0.0)'); sh.addColorStop(1, 'rgba(2,8,20,0.55)');
  c.fillStyle = sh; c.fillRect(0, 0, W, H);
  c.restore();
}

// ------------------------------------------------------------------ caption activity (for the caption scrim)
// Mirrors the engine's caption timing closely enough: a phrase's captions run from its first word to the next phrase or
// its end + 0.35 s (beat 2's own groups hold the last one 0.9 s). Beats 0 and 7 have no captions.
let capCacheTl = null, capSpans = [];
export function captionK(gt, tl) {
  if (capCacheTl !== tl) {
    capCacheTl = tl;
    const ph = [];
    tl.lines.forEach((ln, i) => { if (i >= 1 && i <= 6) (ln.phrases ?? [ln]).forEach((p, j, arr) => ph.push({ a: p.start, e: p.end, beat: i, last: j === arr.length - 1 })); });
    capSpans = ph.map((p, n) => {
      const nx = ph[n + 1];
      let b = p.e + (p.beat === 2 && p.last ? 0.9 : 0.35);
      if (p.beat === 2 && p.last) b = Math.min(b, tl.scenes[2].end - 0.02);
      if (nx && nx.a < b) b = nx.a;
      return [p.a - 0.05, b];
    });
  }
  let k = 0;
  for (const [a, b] of capSpans) k = Math.max(k, L.smoothstep(L.prog(gt, a - 0.2, 0.2)) * (1 - L.smoothstep(L.prog(gt, b, 0.25))));
  return k;
}

/** Point Nemo: a lone cyan point with a slow pulse (hidden under water and when a scene asks: pinOff(gt)) */
export function drawPin(c, v, k = 1) {
  if (k <= 0) return;
  const p = geo(v, NEMO.lat, NEMO.lon);
  if (p.z < 0.05) return;
  const zk = L.smoothstep(L.invLerp(0.05, 0.25, p.z));
  c.save();
  c.globalAlpha *= k * zk;
  const ph = (v.gt * 0.55) % 1;
  c.strokeStyle = L.rgba(ACCENT, 0.7 * (1 - ph));
  c.lineWidth = 2.5;
  c.beginPath(); c.arc(p.x, p.y, 9 + 34 * L.ease.outCubic(ph), 0, Math.PI * 2); c.stroke();
  L.lightBlob(c, p.x, p.y, 46, ACCENT, 0.55);
  c.fillStyle = L.rgba(ACCENT);
  c.beginPath(); c.arc(p.x, p.y, 8, 0, Math.PI * 2); c.fill();
  c.fillStyle = '#fff';
  c.beginPath(); c.arc(p.x, p.y, 3.6, 0, Math.PI * 2); c.fill();
  c.restore();
}
export function drawForeground(c, v) {
  // a soft dark band behind the caption line: keeps captions readable over the white Antarctic ice
  // (only while a caption is up: no seam across the frame when there is nothing to read)
  const cy = v.ep.captionY ?? 1335, qk = captionK(v.gt, v.tl);
  if (qk > 0.005) {
    const g = c.createLinearGradient(0, cy - 110, 0, cy + 110);
    // stronger where the Antarctic ice lies under the caption line
    const gl = globe(v);
    let ice = 0;
    if (uwK(v.gt, v.tl) < 0.99) for (let i = 0; i < 9; i++) { const ll = unproject(160 + i * 95, cy, gl); if (ll && ll.lat < -62 && elevation(ll.lat, ll.lon) > 0) ice++; }
    const sa = L.lerp(0.46, 0.62, Math.min(1, ice / 3)) * qk;
    g.addColorStop(0, 'rgba(2,6,16,0)'); g.addColorStop(0.5, `rgba(2,6,16,${sa})`); g.addColorStop(1, 'rgba(2,6,16,0)');
    c.fillStyle = g; c.fillRect(0, cy - 110, W, 220);
  }
  const sh = shotAt(v.gt, v.tl).name;
  const off = sh === 'limb' ? 1 - L.smoothstep(L.prog(v.gt, shotStart('limb', v.tl), 0.5)) : 1;   // the limb scene draws its own marker
  drawPin(c, v, (1 - uwK(v.gt, v.tl)) * off);
}

export function drawHud(c, v) {
  const g = c.createLinearGradient(0, 0, 0, 300);
  g.addColorStop(0, 'rgba(2,5,12,0.62)'); g.addColorStop(1, 'rgba(2,5,12,0)');
  c.fillStyle = g; c.fillRect(0, 0, W, 300);
  topBar(c, v, ACCENT);
  // the Zoom Out scale bar: on whenever we look straight down at the globe (not side-on, not under water)
  const sh = shotAt(v.gt, v.tl).name;
  const lk = L.smoothstep(L.prog(v.gt, shotStart('limb', v.tl), 0.4)) * (1 - L.smoothstep(L.prog(v.gt, shotStart('gyre', v.tl), 0.6)));
  const qk = 1 - L.smoothstep(L.prog(v.gt, v.tl.scenes[7].start, 0.4));
  // off while diving / climbing out of the water (never over the seabed)
  const gr = globeAt(v.gt, v.tl).r;
  const dk = sh === 'dive' || sh === 'rise' ? L.smoothstep(L.invLerp(2400, 1200, gr)) : 1;
  const k = (1 - uwK(v.gt, v.tl)) * (1 - lk) * qk * dk;
  if (k > 0.01) scaleBar(c, v, { k: 0.9 * k });
}

// Transition swishes sit in the silence BETWEEN lines, never on a word.
export const cues = (tl) => tl.scenes.slice(1).map((s, j) => {
  const i = j + 1, a = tl.lines[i - 1].end, b = tl.lines[i].start, mid = (a + b) / 2;
  return { t: mid - 0.2, name: i === 3 || i === 6 ? 'whoosh' : 'swish', gain: i === 3 || i === 6 ? 0.2 : 0.16, pitch: 0.7 * (i % 2 ? 0.85 : 1) };
});

// ------------------------------------------------------------------ custom captions (same look as the engine's)
// For a line whose spoken number would make one caption group too wide ("IS ALMOST TWO THOUSAND SEVEN HUNDRED
// KILOMETRES"): the scene turns engine captions off and passes its own groups, timed on the REAL word starts.
// groups: [{ words: [[gt, 'WORD'], ...], end: gt, tail: bool }]
export function drawCaptionGroups(c, v, groups) {
  const g = groups.find((q) => q.words[0][0] <= v.gt && v.gt < q.end);
  if (!g) return;
  let active = 0;
  g.words.forEach(([st], i) => { if (st <= v.gt) active = i; });
  const gOut = g.tail ? 1 - L.prog(v.gt, g.end - 0.12, 0.12) : 1;
  if (gOut <= 0) return;
  const y = v.ep.captionY ?? 1335;
  c.save();
  c.textBaseline = 'middle';
  let size = 78;
  const sp = () => c.measureText(' ').width + 4;
  for (;;) {
    c.font = L.font(size, 800, L.FONT.display);
    const w = g.words.reduce((a, [, wd]) => a + c.measureText(wd).width, 0) + sp() * (g.words.length - 1);
    if (w <= 800 || size <= 48) break;
    size -= 4;
  }
  const widths = g.words.map(([, wd]) => c.measureText(wd).width);
  const total = widths.reduce((a, b) => a + b, 0) + sp() * (g.words.length - 1);
  let x = W / 2 - total / 2;
  g.words.forEach(([st, wd], i) => {
    const wk = L.ease.outBack(L.prog(v.gt, st - 0.05, 0.22), 2.2);
    const lift = (1 - L.clamp(wk)) * 6;
    c.globalAlpha = L.clamp(0.6 + wk) * gOut;
    c.lineJoin = 'round';
    c.lineWidth = 10;
    c.strokeStyle = 'rgba(2,6,14,0.75)';
    c.textAlign = 'left';
    c.strokeText(wd, x, y + lift);
    c.fillStyle = i === active ? L.rgba(v.accent) : '#fff';
    c.fillText(wd, x, y + lift);
    x += widths[i] + sp();
  });
  c.restore();
}
