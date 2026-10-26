// Environment for "What If the Earth Stopped Spinning?". Owned by the orchestrator — builders: read, don't edit.
//
// drawBackground: space + stars + the Sun (orbit view) + the GLOBE BASE (ocean, shelf glow, land, ice) + a
//                 multi-scale LAND TEXTURE (field patchwork) that carries the dives between globe and street.
// drawForeground: (after every scene's drawWorld) globe LIGHTING (night crescent, limb shade, atmosphere rim) and
//                 the EQUATOR line (dashed accent, y = 0) from street to globe. So scenes that repaint the surface
//                 (the ocean migration) are lit like the rest of the planet.
// drawHud:        top bar, scale bar (persistent), the equator SPEED readout (beats 1–8).
import * as L from '../../../engine/runtime/lib.js';
import { beatCues, scaleBar, stars, topBar } from '../../../engine/runtime/kit.js';
import { drawEarth, elevation } from '../../../engine/runtime/earth.js';
import { AU, BRAKE0, BRAKE1, CORAL, DEG, LON0, R_EARTH, SPIN0, SUN, lonAt, project, stopTime } from './camera.js';

const { W, H } = L;
const TAU = Math.PI * 2;
export const ACCENT = [90, 220, 235];
export { AU, BRAKE0, BRAKE1, CORAL, DEG, LON0, R_EARTH, SPIN0, SUN, lonAt, project, stopTime };
export const V_EQ = 1670;                                   // km/h, the equator's speed (40,075 km / 23.93 h)
/** Sunlight direction on the globe (screen x right, y down, z towards the viewer): from the upper left, in front. */
export const SUN_DIR = (() => { const v = [-0.55, -0.3, 0.78], m = Math.hypot(...v); return { x: v[0] / m, y: v[1] / m, z: v[2] / m }; })();

// ------------------------------------------------------------------ colours
export const OCEAN = [16, 58, 104];
export const OCEAN_DEEP = [7, 26, 54];
export const LAND_BASE = [92, 104, 74];                     // the generic land tone (also used for "all land" close-ups)
export const SEABED = [128, 112, 86];                       // exposed sea floor (for the ocean-migration scenes)

// ------------------------------------------------------------------ globe helpers (exported for scenes)
/** Screen geometry of the globe: centre (cx, cy), radius r in px, and the centred longitude. */
export function globeGeom(v) {
  return { cx: v.wx(0), cy: v.wy(0), r: v.ws(R_EARTH), lon0: lonAt(v.gt) };
}
/** Is the globe disc on screen (and big enough to draw)? */
export function globeVisible(g, pad = 40) {
  const dx = Math.max(0, Math.abs(g.cx - W / 2) - W / 2), dy = Math.max(0, Math.abs(g.cy - H / 2) - H / 2);
  return Math.hypot(dx, dy) < Math.max(g.r, 3) + pad;
}
/** Unit-sphere projection [x, y (down), z (towards us)] of (lat, lon) radians for centre longitude lon0. */
export function unit(la, lo, lon0) {
  const cl = Math.cos(la), dl = lo - lon0;
  return [cl * Math.sin(dl), -Math.sin(la), cl * Math.cos(dl)];
}
/** Start time (global s) of the first word matching `re` in timeline line `li` (same weighting as the captions). */
export function wordTime(tl, li, re) {
  const ln = tl.lines[li];
  for (const ph of ln.phrases ?? [ln]) {
    const words = ph.text.split(/\s+/);
    const wts = words.map((w) => w.replace(/\W/g, '').length + 1.5 + (/[,.?!:]$/.test(w) ? 3 : 0));
    const tot = wts.reduce((a, b) => a + b, 0);
    let acc = 0;
    for (let i = 0; i < words.length; i++) {
      if (re.test(words[i])) return ph.start + ((ph.end - ph.start) * acc) / tot;
      acc += wts[i];
    }
  }
  return ln.start;
}

/** Equator ground speed shown by the HUD (km/h): counts up on beat 1's "you're moving…", drops to 0 at the stop. */
export function groundSpeed(v) {
  const t0 = wordTime(v.tl, 1, /moving/i), t1 = wordTime(v.tl, 1, /^one$/i) - 0.12;
  const up = L.ease.inOutCubic(L.prog(v.gt, t0, Math.max(0.8, t1 - t0)));
  const down = L.ease.inOutCubic(L.prog(v.gt, stopTime(v.tl), 0.45));
  return V_EQ * up * (1 - down);
}

// ------------------------------------------------------------------ background
function drawSpace(c, v) {
  const g = c.createRadialGradient(W / 2, H * 0.42, 40, W / 2, H * 0.5, H * 0.9);
  g.addColorStop(0, '#0a1018'); g.addColorStop(1, '#020307');
  c.fillStyle = g;
  c.fillRect(0, 0, W, H);
  // two star layers drifting with the log of the zoom (deep parallax)
  const lz = Math.log10(v.cam.mpp);
  c.save();
  c.translate(0, ((lz * 70) % H + H) % H - H);
  stars(c, v, 0.5, 120, 13);
  c.translate(0, H);
  stars(c, v, 0.5, 120, 13);
  c.restore();
  stars(c, v, 0.3, 80, 57);
}

function drawSun(c, v) {
  const x = v.wx(SUN.x), y = v.wy(SUN.y), r = v.ws(SUN.r);
  if (x < -600 || x > W + 600 || y < -600 || y > H + 600) return;
  const k = L.clamp(L.invLerp(Math.log(2e6), Math.log(5e7), Math.log(v.cam.mpp)));
  if (k <= 0) return;
  L.lightBlob(c, x, y, Math.max(140, r * 14), [255, 190, 110], 0.5 * k);
  L.lightBlob(c, x, y, Math.max(40, r * 4), [255, 225, 170], 0.9 * k);
  c.save();
  c.globalAlpha = k;
  c.fillStyle = '#fff6e4';
  c.beginPath(); c.arc(x, y, Math.max(7, r), 0, TAU); c.fill();
  c.restore();
}

/** The real Earth (NOAA ETOPO1 via engine/runtime/earth.js), equator-on, unlit-studio look; env's drawLighting adds
 *  the night crescent + rim afterwards so scene repaints (the ocean migration) are lit the same way. */
export const EARTH_STYLE = { style: 'day', atmosphere: false, iceLine: [80, -66] };
export function earthView(g) { return { cx: g.cx, cy: g.cy, r: g.r, lon0: g.lon0 / DEG, lat0: 0 }; }
function drawGlobeBase(c, v, g) {
  const { cx, cy, r } = g;
  if (r < 2.5) {   // orbit scale: Earth as a small blue point (scenes add their own markers)
    L.lightBlob(c, cx, cy, 16, [90, 170, 255], 0.5);
    c.fillStyle = '#9fd4ff';
    c.beginPath(); c.arc(cx, cy, 2.5, 0, TAU); c.fill();
    return;
  }
  // close-up: everything around the city (Andean Ecuador, 0°, 78.5°W) is land
  const close = L.clamp(L.invLerp(Math.log(450), Math.log(160), Math.log(v.cam.mpp)));
  // the 0.1° grid's hillshade turns into steps once a cell is > ~8 px: soften it on the way down
  const relief = L.lerp(1, 0.12, L.clamp(L.invLerp(Math.log(2500), Math.log(9000), Math.log(r))));
  if (close < 1) drawEarth(c, { ...earthView(g), ...EARTH_STYLE, relief });
  if (close > 0) {
    c.fillStyle = L.rgba(LAND_BASE, close);
    c.fillRect(-10, -10, W + 20, H + 20);
  }
}

/** Low-res land mask of the screen (alpha = land) for the close-up texture, so the fields never cover the sea. */
const MW = 270, MH = 480;
let maskCv = null, maskImg = null, layerCv = null;
function landMask(g) {
  if (!maskCv) { maskCv = new OffscreenCanvas(MW, MH); maskImg = new ImageData(MW, MH); }
  const d = maskImg.data, sx = W / MW, sy = H / MH;
  for (let j = 0; j < MH; j++) {
    const Y = ((j + 0.5) * sy - g.cy) / g.r;
    for (let i = 0; i < MW; i++) {
      const X = ((i + 0.5) * sx - g.cx) / g.r, rr = X * X + Y * Y, o = (j * MW + i) * 4;
      if (rr >= 1) { d[o + 3] = 0; continue; }
      const lat = -Math.asin(Y) / DEG, lon = (g.lon0 + Math.atan2(X, Math.sqrt(1 - rr))) / DEG;
      d[o] = d[o + 1] = d[o + 2] = 255;
      d[o + 3] = 255 * L.clamp(0.5 + elevation(lat, lon) / 60);
    }
  }
  maskCv.getContext('2d').putImageData(maskImg, 0, 0);
  return maskCv;
}

// multi-scale field patchwork: half-decade cell sizes, each octave peaks when its cells are ~140 px on screen.
// Bounded by the screen: at most ~(W/45)·(H/45) cells per visible octave.
const OCTAVES = Array.from({ length: 10 }, (_, i) => 10 * Math.pow(10, i / 2));   // 10 m … 316 km
const PATCH = [[104, 118, 80], [78, 96, 66], [122, 116, 84], [70, 84, 62], [112, 104, 76], [88, 106, 72]];
function hash2(i, j, s) { const h = Math.sin(i * 127.1 + j * 311.7 + s * 74.7) * 43758.5453; return h - Math.floor(h); }

function drawTexture(c, v, g) {  // eslint-disable-line no-param-reassign
  const mpp = v.cam.mpp;
  const k = L.clamp(L.invLerp(Math.log(4000), Math.log(700), Math.log(mpp)));
  if (k <= 0 || g.r < 50 || mpp < 0.05) return;     // below 5 cm/px (beat 12's rock) the scenes cover the frame
  // above 180 m/px the coast can be on screen: paint the fields into a layer, then keep only the land
  const masked = mpp >= 180;
  const c0 = c;
  if (masked) {
    if (!layerCv) layerCv = new OffscreenCanvas(W, H);
    c = layerCv.getContext('2d');
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.globalCompositeOperation = 'source-over';
    c.clearRect(0, 0, W, H);
  }
  c.save();
  // world bounds of the screen
  const x0 = v.cam.x + (0 - W / 2) * mpp, x1 = v.cam.x + (W / 2) * mpp;
  const y0 = v.cam.y - H * v.cam.anchor * mpp, y1 = v.cam.y + H * (1 - v.cam.anchor) * mpp;
  OCTAVES.forEach((s, oi) => {
    const px = s / mpp;
    if (px < 45 || px > 900) return;
    const w = k * Math.exp(-Math.pow(Math.log10(px / 160) / 0.45, 2));
    if (w < 0.02) return;
    const inset = Math.max(0.5, px * 0.02);
    for (let i = Math.floor(x0 / s); i <= Math.floor(x1 / s); i++) {
      for (let j = Math.floor(y0 / s); j <= Math.floor(y1 / s); j++) {
        const h = hash2(i, j, oi);
        const sx = v.wx(i * s), sy = v.wy(j * s);
        // soft terrain shading (forest / hill shadow) on some cells: organic, not blocky
        if (h < 0.3 && px > 70) {
          const rr = px * (0.6 + 0.9 * hash2(i + 3, j - 5, oi)), bx = sx + px * hash2(i, j + 1, oi), by = sy + px * hash2(i + 1, j, oi);
          const gg = c.createRadialGradient(bx, by, 0, bx, by, rr);
          const dark = h < 0.17;
          gg.addColorStop(0, dark ? `rgba(34,52,38,${0.28 * w})` : `rgba(150,140,100,${0.16 * w})`);
          gg.addColorStop(1, 'rgba(0,0,0,0)');
          c.fillStyle = gg;
          c.fillRect(bx - rr, by - rr, rr * 2, rr * 2);
          continue;
        }
        if (h < 0.42) continue;                              // plain ground
        // a field split in two strips (orientation and ratio vary per cell)
        const col = PATCH[Math.floor(hash2(j, i, oi + 9) * PATCH.length)];
        const col2 = PATCH[Math.floor(hash2(j + 4, i - 2, oi + 3) * PATCH.length)];
        const a = w * (0.12 + 0.2 * hash2(i + 7, j, oi)), f = 0.3 + 0.4 * hash2(i - 9, j + 2, oi);
        const ww = px - 2 * inset;
        c.fillStyle = L.rgba(col, a);
        if (h > 0.71) {
          c.fillRect(sx + inset, sy + inset, ww * f - inset, ww);
          c.fillStyle = L.rgba(col2, a * 0.8);
          c.fillRect(sx + inset + ww * f + inset, sy + inset, ww * (1 - f) - inset, ww);
        } else {
          c.fillRect(sx + inset, sy + inset, ww, ww * f - inset);
          c.fillStyle = L.rgba(col2, a * 0.8);
          c.fillRect(sx + inset, sy + inset + ww * f + inset, ww, ww * (1 - f) - inset);
        }
      }
    }
  });
  c.restore();
  if (masked) {
    c.save();
    c.globalCompositeOperation = 'destination-in';
    c.imageSmoothingEnabled = true; c.imageSmoothingQuality = 'high';
    c.drawImage(landMask(g), 0, 0, W, H);
    c.restore();
    c0.drawImage(layerCv, 0, 0);
  }
}

export function drawBackground(c, v) {
  drawSpace(c, v);
  drawSun(c, v);
  const g = globeGeom(v);
  if (!globeVisible(g)) return;
  drawGlobeBase(c, v, g);
  drawTexture(c, v, g);
}

// ------------------------------------------------------------------ foreground: lighting + equator
function drawLighting(c, v, g) {
  const { cx, cy, r } = g;
  if (r < 2.5 || r > 6e4) return;
  const phi = Math.atan2(SUN_DIR.y, SUN_DIR.x), sz = SUN_DIR.z / Math.hypot(SUN_DIR.x, SUN_DIR.y, SUN_DIR.z);
  const ex = sz;                                     // terminator ellipse semi-axis (towards the Sun)
  c.save();
  c.translate(cx, cy);
  c.rotate(phi);                                     // +x now points at the Sun
  c.beginPath(); c.arc(0, 0, Math.max(0, r), 0, TAU); c.clip();
  // night crescent with a soft terminator: stacked passes, the ellipse narrowing towards the limb
  const NP = 28, pa = 1 - Math.pow(1 - 0.13, 7 / NP);   // same total darkness as 7 passes at 0.13, finer steps
  c.fillStyle = `rgba(2,5,14,${pa.toFixed(4)})`;
  for (let i = 0; i < NP; i++) {
    const f = L.lerp(1.25, 0.7, i / (NP - 1));
    c.beginPath();
    c.arc(0, 0, Math.max(0, r), Math.PI / 2, Math.PI * 1.5, false);
    c.ellipse(0, 0, Math.max(0, ex * r * f), Math.max(0, r), 0, Math.PI * 1.5, Math.PI / 2, true);
    c.fill();
  }
  c.restore();
  // limb darkening + atmosphere
  c.save();
  const lg = c.createRadialGradient(cx, cy, r * 0.72, cx, cy, r);
  lg.addColorStop(0, 'rgba(0,0,0,0)');
  lg.addColorStop(1, 'rgba(2,8,20,0.38)');
  c.fillStyle = lg;
  c.beginPath(); c.arc(cx, cy, Math.max(0, r), 0, TAU); c.fill();
  const ag = c.createRadialGradient(cx, cy, r * 0.985, cx, cy, r * 1.07);
  ag.addColorStop(0, 'rgba(120,200,255,0.42)');
  ag.addColorStop(0.35, 'rgba(90,170,255,0.16)');
  ag.addColorStop(1, 'rgba(60,140,255,0)');
  c.fillStyle = ag;
  c.beginPath(); c.arc(cx, cy, Math.max(0, r * 1.07), 0, TAU); c.arc(cx, cy, Math.max(0, r * 0.985), 0, TAU, true); c.fill();
  c.restore();
}

/** The equator (y = 0): a dashed accent line across the globe's face, at every scale from street to planet. */
function drawEquator(c, v, g) {
  if (v.gt > v.tl.scenes[12].start - 0.2) return;              // the coral dive is about New York, not the equator
  const k = L.ease.outCubic(L.prog(v.gt, 2.5, 0.7)) * L.clamp(L.invLerp(30, 120, g.r));
  if (k <= 0) return;
  const y = v.wy(0);
  if (y < 300 || y > H) return;
  const xa = Math.max(-20, g.cx - g.r), xb = Math.min(W + 20, g.cx + g.r);
  if (xb <= xa) return;
  c.save();
  c.globalAlpha = k;
  c.strokeStyle = L.rgba(ACCENT, 0.55);
  c.lineWidth = 2;
  c.setLineDash([16, 12]);
  c.lineDashOffset = -((((xa - g.cx) % 28) + 28) % 28);
  c.beginPath(); c.moveTo(xa, y); c.lineTo(xb, y); c.stroke();
  c.setLineDash([]);
  // small tag at the left end, kept in the safe area
  const tx = Math.max(64, xa + 14);
  if (tx < W - 300) {
    c.font = L.font(19, 600, L.FONT.body);
    c.fillStyle = L.rgba(ACCENT, 0.85);
    c.shadowColor = 'rgba(0,0,0,0.6)';
    c.shadowBlur = 6;
    L.trackedText(c, 'EQUATOR  0°', tx, y - 12, 3);
  }
  c.restore();
}

export function drawForeground(c, v) {
  const g = globeGeom(v);
  if (!globeVisible(g, 120)) return;
  drawLighting(c, v, g);
  drawEquator(c, v, g);
}

// ------------------------------------------------------------------ HUD
export function drawHud(c, v) {
  topBar(c, v, ACCENT);
  scaleBar(c, v, { k: L.ease.outCubic(L.prog(v.gt, 1.0, 0.6)) });
  // equator speed readout: beats 1–4; it reads 0 after the stop, so it leaves as beat 5 pulls back to the globe
  const sc = v.tl.scenes;
  const kin = L.ease.outCubic(L.prog(v.gt, sc[1].start + 1.4, 0.6));
  const kout = L.ease.inCubic(L.prog(v.gt, sc[5].start - 0.35, 0.4));   // gone before chapter 05 opens
  const k = kin * (1 - kout);
  if (k <= 0) return;
  const kmh = groundSpeed(v), mph = kmh * 0.621371;
  c.save();
  c.globalAlpha = k;
  c.shadowColor = 'rgba(2,6,14,0.7)';
  c.shadowBlur = 12;
  c.textAlign = 'right';
  c.font = L.font(60, 700, L.FONT.din);
  c.fillStyle = kmh < 1 ? L.rgba(ACCENT) : '#fff';
  c.fillText(`${L.fmt(Math.round(kmh))} km/h`, W - 64, 322);
  c.font = L.font(20, 600, L.FONT.body);
  c.fillStyle = 'rgba(220,228,240,0.85)';
  const what = v.gt > stopTime(v.tl) ? 'THE GROUND, STOPPED' : 'SPEED AT THE EQUATOR';
  L.trackedText(c, `${L.fmt(mph > 100 ? Math.round(mph / 10) * 10 : Math.round(mph))} MPH  ·  ${what}`, W - 64, 354, 2, 'right');
  c.restore();
}

export const cues = (tl) => beatCues(tl, { gain: 0.18, pitch: 0.85 });
