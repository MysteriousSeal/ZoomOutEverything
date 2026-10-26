// Environment for "What If You Fell Through the Earth?". Owned by the orchestrator — builders: read, don't edit.
// Sky / space, the cut-away Earth (crust, mantle, outer core, inner core as concentric bands around CENTRE, with slow
// world-anchored texture), the tunnel, the faller marker + parallax embers, and the HUD (tunnel map + distance/speed
// readout, a scale bar for the city beats).
import * as L from '../../../engine/runtime/lib.js';
import { beatCues, scaleBar, stars, topBar } from '../../../engine/runtime/kit.js';
import { drawEarth } from '../../../engine/runtime/earth.js';
import { R_EARTH, RADIUS, DEPTH, fallerDepth, fallerSpeed, geoView } from './camera.js';

const { W, H } = L;
export const ACCENT = [255, 140, 70];
export { R_EARTH, RADIUS, DEPTH };

// ------------------------------------------------------------------ the layers
/** Base colours (also for builders' labels/diagrams). */
export const LAYER = {
  crust: { name: 'CRUST', col: [92, 78, 66] },
  mantle: { name: 'MANTLE', col: [150, 54, 30] },
  outer: { name: 'OUTER CORE', col: [236, 128, 46] },
  inner: { name: 'INNER CORE', col: [255, 214, 140] },
};
const EPS = 1;   // m: sharp boundaries
// colour by radius from the centre (m)
const STOPS = [
  [0, [246, 200, 132]], [RADIUS.icb * 0.6, [232, 164, 88]], [RADIUS.icb - EPS, [212, 124, 56]],
  [RADIUS.icb, [196, 98, 38]], [RADIUS.cmb * 0.75, [170, 74, 30]], [RADIUS.cmb - EPS, [140, 56, 26]],
  [RADIUS.cmb, [104, 36, 24]], [5.0e6, [84, 30, 22]], [RADIUS.moho - EPS, [58, 28, 24]],
  [RADIUS.moho, [52, 44, 40]], [R_EARTH - 6e3, [70, 60, 52]], [R_EARTH, [96, 84, 72]],
];
export const colourAtRadius = (r) => L.ramp(STOPS, r);
export const colourAtDepth = (d) => colourAtRadius(Math.abs(R_EARTH - d));
/** Layer key at a depth below the entry hole ('crust' | 'mantle' | 'outer' | 'inner'; null outside the planet). */
export function layerAt(depth) {
  const r = Math.abs(R_EARTH - depth);
  if (r > R_EARTH) return null;
  return r > RADIUS.moho ? 'crust' : r > RADIUS.cmb ? 'mantle' : r > RADIUS.icb ? 'outer' : 'inner';
}
const BOUNDS = [RADIUS.moho, RADIUS.cmb, RADIUS.icb];

// ------------------------------------------------------------------ small helpers
const beatOf = (v, gt = v.gt) => { let b = 0; v.tl.scenes.forEach((s, i) => { if (s.start <= gt) b = i; }); return b; };
const sceneStart = (v, i) => v.tl.scenes[Math.min(i, v.tl.scenes.length - 1)].start;
/** 1 while zoomed in near the surface (sky visible), 0 once the planet is a disc in space. */
const farK = (mpp) => L.clamp(L.invLerp(Math.log(40), Math.log(2500), Math.log(mpp)));
/** 0 during the dive (we are INSIDE the ground: a dusk sky above it, never stars or an orbital atmosphere), 1 once
 *  beat 7 pulls back to the whole planet in space. */
export const globeK = (v) => L.ease.inOutCubic(L.prog(v.gt, sceneStart(v, 7) + 0.4, 1.8));
/** 0..1: the real Earth (earth.js) covers the planet's surface. Beats 7-10: the left half (the right half is cut away
 *  to show the layers), fading in as the pull-back reaches globe scale. From beat 11 on: always. */
export function earthK(v) {
  if (v.gt < sceneStart(v, 7)) return 0;
  if (v.gt >= sceneStart(v, 11)) return 1;
  return L.smoothstep(L.clamp(L.invLerp(Math.log(4200), Math.log(10500), Math.log(v.cam.mpp))));
}
/** 0..1: the cut-away closes (beat 11): 0 = right half open (layers), 1 = the whole face is the real Earth. */
export const cutCloseK = (v) => L.ease.inOutCubic(L.prog(v.gt, sceneStart(v, 11) + 0.15, 1.2));

let SPRITES = null;   // created lazily (env is also imported in node for cues)
function sprites() {
  if (SPRITES || typeof OffscreenCanvas === 'undefined') return SPRITES;
  const mk = (rgb) => {
    const s = new OffscreenCanvas(128, 128), c = s.getContext('2d');
    const g = c.createRadialGradient(64, 64, 0, 64, 64, 64);
    g.addColorStop(0, `rgba(${rgb},1)`); g.addColorStop(0.45, `rgba(${rgb},0.45)`); g.addColorStop(1, `rgba(${rgb},0)`);
    c.fillStyle = g; c.fillRect(0, 0, 128, 128);
    return s;
  };
  SPRITES = { light: mk('255,255,255'), dark: mk('0,0,0'), warm: mk('255,200,140'), ember: mk('150,58,18') };
  return SPRITES;
}

/** Screen y of a circle (centre cx,cy, radius rp px) at screen x, top or bottom half. Stable for huge radii. */
function circleY(cx, cy, rp, x, top, yTop) {
  const dx = x - cx;
  if (Math.abs(dx) > rp) return null;
  const sag = (dx * dx) / (rp + Math.sqrt(Math.max(0, rp * rp - dx * dx)));
  return top ? yTop + sag : cy + rp - sag;
}

// ------------------------------------------------------------------ background: sky, planet, tunnel
const SKY = [[0, [120, 80, 62]], [600, [62, 56, 70]], [3000, [32, 36, 56]], [15000, [12, 15, 28]], [60000, [4, 5, 11]]];

export function drawBackground(c, v) {
  const mpp = v.cam.mpp;
  const far = farK(mpp);
  const space = far * globeK(v);
  c.fillStyle = '#030306';
  c.fillRect(0, 0, W, H);
  // dusk sky above the ground while we're near the surface, and for the whole dive (no orbital view from inside)
  if (space < 1) {
    // a dusk gradient that ends at the horizon line (warm glow just above the ground), darkening with altitude
    const hy = L.clamp(v.wy(0), 60, H);
    const altAt = (sy) => -(v.cam.y + (sy - H * v.cam.anchor) * mpp);
    const g = c.createLinearGradient(0, 0, 0, hy);
    for (let i = 0; i <= 10; i++) {
      const f = i / 10, sy = hy * f;
      const dusk = L.ramp([[0, [12, 16, 30]], [0.55, [34, 36, 54]], [0.85, [78, 58, 60]], [1, [150, 96, 66]]], f);
      g.addColorStop(f, L.rgba(L.mix(dusk, L.ramp(SKY, Math.max(0, altAt(sy))), 0.3 * L.clamp(L.invLerp(0.5, 200, mpp)))));
    }
    // only while the entry side is in view (never a dusk sky under the far side of the planet)
    c.save(); c.globalAlpha = (1 - space) * L.clamp((v.wy(0) + 60) / 120); c.fillStyle = g; c.fillRect(0, 0, W, H); c.restore();
  }
  stars(c, v, 0.15 * (1 - far) + space, 150, 1207);
  drawPlanet(c, v);
  drawCoreDepth(c, v);
  drawTunnel(c, v);
}

/** 0..1: how deep in the bright core a depth is (0 at the core-mantle boundary, 1 just inside the inner core). */
export function coreK(depth) {
  const r = Math.abs(R_EARTH - depth);
  return L.ease.inOutCubic(L.clamp(L.invLerp(RADIUS.cmb * 0.97, RADIUS.icb * 1.05, r)));
}
/** Inside the core at dive zooms the frame is one pale wash: a warm limb-darkening vignette keeps a value range. */
function drawCoreDepth(c, v) {
  const k = coreK(v.cam.y) * (1 - L.clamp(L.invLerp(Math.log(2200), Math.log(4200), Math.log(v.cam.mpp))));
  if (k <= 0.01) return;
  c.save();
  const g = c.createRadialGradient(W / 2, H * 0.36, 180, W / 2, H * 0.42, 1250);
  // 12b f12a: a saturated ember brown, not near-black (darkening the pale yellow core toward black read olive green)
  g.addColorStop(0, 'rgba(96,32,6,0)');
  g.addColorStop(0.55, `rgba(96,32,6,${0.2 * k})`);
  g.addColorStop(1, `rgba(70,22,4,${0.56 * k})`);
  c.fillStyle = g;
  c.fillRect(0, 0, W, H);
  c.restore();
}

function drawPlanet(c, v) {
  const mpp = v.cam.mpp;
  const cx = v.wx(0), cy = v.wy(R_EARTH), rp = R_EARTH / mpp, yTop = v.wy(0);
  // nearest / farthest screen point from the centre (px)
  const nx = L.clamp(cx, 0, W), ny = L.clamp(cy, 0, H);
  const dmin = Math.hypot(cx - nx, cy - ny);
  const dmax = Math.max(Math.hypot(cx, cy), Math.hypot(cx - W, cy), Math.hypot(cx, cy - H), Math.hypot(cx - W, cy - H));
  if (dmin > rp + 400) return;
  const far = farK(mpp) * globeK(v);
  // atmosphere: a thin glow skin around the limb (globe views)
  if (far > 0 && rp < 1e5) {
    c.save();
    const ag = c.createRadialGradient(cx, cy, rp * 0.98, cx, cy, rp + Math.max(10, 90e3 / mpp) + 18);
    ag.addColorStop(0, `rgba(120,170,255,${0.0})`);
    ag.addColorStop(0.25, `rgba(130,180,255,${0.35 * far})`);
    ag.addColorStop(1, 'rgba(120,170,255,0)');
    c.fillStyle = ag;
    c.beginPath(); c.arc(cx, cy, Math.max(0, rp + Math.max(10, 90e3 / mpp) + 18), 0, Math.PI * 2); c.fill();
    c.restore();
  }
  // gradient stops sampled over the visible radius range (+ sharp pairs at the boundaries)
  const r0 = Math.max(0, dmin) * mpp, r1 = Math.min(rp, dmax) * mpp;
  const samples = [];
  for (let i = 0; i <= 24; i++) samples.push(L.lerp(r0, r1, i / 24));
  for (const b of BOUNDS) if (b > r0 && b < r1) samples.push(b - EPS * 2, b);
  samples.sort((a, b) => a - b);
  c.save();
  if (rp < 1e5) {
    const g = c.createRadialGradient(cx, cy, 0, cx, cy, rp);
    g.addColorStop(0, L.rgba(colourAtRadius(r0)));
    for (const r of samples) g.addColorStop(L.clamp(r / R_EARTH), L.rgba(colourAtRadius(r)));
    g.addColorStop(1, L.rgba(colourAtRadius(R_EARTH)));
    c.fillStyle = g;
    c.beginPath(); c.arc(cx, cy, Math.max(0, rp), 0, Math.PI * 2); c.fill();
  } else {
    // flat mode (zoomed in at the top): bands are horizontal to well under a pixel; sample along screen y
    const y0 = Math.max(0, yTop);
    if (y0 < H) {
      const g = c.createLinearGradient(0, y0, 0, H);
      const rowR = (y) => R_EARTH - (y - yTop) * mpp;
      for (let i = 0; i <= 16; i++) { const y = L.lerp(y0, H, i / 16); g.addColorStop(i / 16, L.rgba(colourAtRadius(rowR(y)))); }
      for (const b of BOUNDS) {
        const y = yTop + (R_EARTH - b) / mpp;
        if (y > y0 && y < H) { const f = (y - y0) / (H - y0); g.addColorStop(L.clamp(f - 1e-4), L.rgba(colourAtRadius(b + EPS * 3))); g.addColorStop(f, L.rgba(colourAtRadius(b - EPS * 3))); }
      }
      c.fillStyle = g;
      c.beginPath();
      for (let x = -20; x <= W + 20; x += 40) { const y = circleY(cx, cy, rp, x, true, yTop) ?? H + 20; x === -20 ? c.moveTo(x, y) : c.lineTo(x, y); }
      c.lineTo(W + 20, H + 20); c.lineTo(-20, H + 20); c.closePath();
      c.fill();
    }
  }
  c.restore();
  drawTexture(c, v, cx, cy, rp);
  drawStrata(c, v, yTop, rp, cx, cy);
  // boundaries: thin light lines, and a hot glow where the mantle meets the liquid core
  c.save();
  for (const b of [R_EARTH, ...BOUNDS]) {
    const bp = b / mpp;
    const a = b === R_EARTH ? 0.28 : b === RADIUS.moho ? 0.22 : 0.3;
    c.strokeStyle = b === R_EARTH && far > 0.3 ? `rgba(150,195,255,${0.55 * far})` : `rgba(255,232,210,${a})`;
    c.lineWidth = b === R_EARTH ? 1.5 + 1.5 * far : 1.2;
    if (bp < 1e5) {
      if (Math.hypot(Math.max(0, dmin), 0) > bp + 4 || dmax < bp - 4) continue;
      c.beginPath(); c.arc(cx, cy, Math.max(0, bp), 0, Math.PI * 2); c.stroke();
    } else {
      const yb = v.wy(R_EARTH - b);
      if (yb < -10 || yb > H + 10) continue;
      c.beginPath();
      for (let x = -20; x <= W + 20; x += 60) { const y = circleY(cx, cy, bp, x, true, yb); x === -20 ? c.moveTo(x, y) : c.lineTo(x, y); }
      c.stroke();
    }
  }
  const cmbp = RADIUS.cmb / mpp;
  if (cmbp > 30 && cmbp < 1e5) {
    c.save();
    c.globalCompositeOperation = 'lighter';
    const w = Math.min(160, Math.max(14, 120e3 / mpp));
    const gg = c.createRadialGradient(cx, cy, Math.max(0, cmbp - w * 0.2), cx, cy, cmbp + w);
    gg.addColorStop(0, 'rgba(255,130,60,0.14)'); gg.addColorStop(1, 'rgba(255,120,50,0)');
    c.fillStyle = gg;
    c.beginPath(); c.arc(cx, cy, cmbp + w, 0, Math.PI * 2); c.arc(cx, cy, Math.max(0, cmbp - w * 0.2), 0, Math.PI * 2, true); c.fill();
    c.restore();
  }
  // the inner core glows
  const icbp = RADIUS.icb / mpp;
  if (icbp > 8 && icbp < 1e5) {
    c.save();
    c.globalCompositeOperation = 'lighter';
    const pulse = (0.85 + 0.15 * Math.sin(v.gt * 1.4)) * L.clamp(500 / icbp, 0.35, 1);   // calmer when it fills the frame
    const gg = c.createRadialGradient(cx, cy, 0, cx, cy, icbp * 1.6);
    gg.addColorStop(0, `rgba(255,226,170,${0.14 * pulse})`); gg.addColorStop(0.6, `rgba(255,170,90,${0.06 * pulse})`); gg.addColorStop(1, 'rgba(255,150,80,0)');
    c.fillStyle = gg;
    c.beginPath(); c.arc(cx, cy, icbp * 1.6, 0, Math.PI * 2); c.fill();
    c.restore();
  }
  c.restore();
  drawRealEarth(c, v, cx, cy, rp);
}

/** The real Earth's surface over the planet (globe beats), with the right half cut away to show the layers. */
function drawRealEarth(c, v, cx, cy, rp) {
  const ek = earthK(v);
  if (ek <= 0.002 || rp > 3000) return;
  const close = cutCloseK(v);
  const bx = cx + (rp + 60) * close;                 // the cut's edge (sweeps right as the cut closes)
  // f12cv: no see-through dissolve. The surface arrives OPAQUE as a wipe that spreads out from the cut plane (x = cx)
  // to the left limb as the pull-back reaches globe scale; its leading edge carries a thin lit line.
  const wk = L.ease.inOutCubic(L.clamp(ek));
  const x0 = cx - (rp + 60) * wk;
  if (x0 >= bx - 0.5) return;
  c.save();
  c.beginPath(); c.rect(x0, -20, bx - x0, H + 40); c.clip();
  drawEarth(c, { cx, cy, r: rp, ...geoView(v.gt), style: 'day', atmosphere: 0.85, alpha: 1, maxPixels: 1.6e6 });
  c.restore();
  if (wk < 0.999 && Math.abs(x0 - cx) < rp) {
    const hh = Math.sqrt(Math.max(0, rp * rp - (x0 - cx) * (x0 - cx)));
    c.save();
    c.beginPath(); c.arc(cx, cy, Math.max(0, rp), 0, Math.PI * 2); c.clip();
    const eg = c.createLinearGradient(x0, 0, x0 + 26, 0);
    eg.addColorStop(0, 'rgba(8,4,3,0.45)'); eg.addColorStop(1, 'rgba(8,4,3,0)');
    c.fillStyle = eg; c.fillRect(x0, cy - hh, 26, hh * 2);
    c.fillStyle = `rgba(235,242,255,${0.5 * (1 - wk)})`;
    c.fillRect(x0 - 0.8, cy - hh, 1.6, hh * 2);
    c.restore();
  }
  // the cut edge: a lit rim along the Earth side and a soft shadow falling onto the cut face
  const dx = bx - cx;
  if (Math.abs(dx) < rp - 2) {
    const hh = Math.sqrt(rp * rp - dx * dx);
    c.save();
    c.globalAlpha = ek;
    c.beginPath(); c.arc(cx, cy, Math.max(0, rp), 0, Math.PI * 2); c.clip();
    const sg = c.createLinearGradient(bx, 0, bx + 34, 0);
    sg.addColorStop(0, 'rgba(8,4,3,0.5)'); sg.addColorStop(1, 'rgba(8,4,3,0)');
    c.fillStyle = sg;
    c.fillRect(bx, cy - hh, 34, hh * 2);
    c.fillStyle = 'rgba(235,242,255,0.55)';
    c.fillRect(bx - 1.2, cy - hh, 1.6, hh * 2);
    c.restore();
  }
}

// slow, world-anchored mottling: soft light/dark sprites on a grid that cross-fades between octaves while zooming.
// Bounded by the screen (cells are 90-180 px), never by the planet's size.
function drawTexture(c, v, cx, cy, rp) {
  const S = sprites();
  if (!S) return;
  const mpp = v.cam.mpp;
  const lv = Math.log2(mpp * 180), l0 = Math.floor(lv), frac = lv - l0;
  c.save();
  for (const [lev, wgt] of [[l0, 1 - frac], [l0 + 1, frac]]) {
    if (wgt < 0.02) continue;
    const s = Math.pow(2, lev), sp = s / mpp;
    const x0 = v.cam.x - (W / 2 + sp) * mpp, x1 = v.cam.x + (W / 2 + sp) * mpp;
    const y0 = v.cam.y - (H * v.cam.anchor + sp) * mpp, y1 = v.cam.y + (H * (1 - v.cam.anchor) + sp) * mpp;
    for (let i = Math.floor(x0 / s); i <= Math.ceil(x1 / s); i++) {
      for (let j = Math.floor(y0 / s); j <= Math.ceil(y1 / s); j++) {
        const h = Math.sin(i * 127.1 + j * 311.7 + lev * 74.7) * 43758.5453, f = h - Math.floor(h);
        const h2 = Math.sin(i * 269.5 + j * 183.3 + lev * 12.9) * 24634.6345, f2 = h2 - Math.floor(h2);
        const wx = (i + f) * s, wy = (j + f2) * s;
        const r = Math.hypot(wx, wy - R_EARTH);
        if (r > R_EARTH) continue;
        const lay = r > RADIUS.moho ? 0 : r > RADIUS.cmb ? 1 : r > RADIUS.icb ? 2 : 3;
        const flow = lay === 2 ? 0.5 : 0.18;   // the liquid outer core moves faster
        const dx = L.noise1(v.gt * flow + f * 9, 3) * 0.35 * s, dy = L.noise1(v.gt * flow * 0.8 + f2 * 9, 5) * 0.35 * s;
        const sx = v.wx(wx + dx), sy = v.wy(wy + dy);
        const size = sp * (1.1 + 0.9 * f);
        const lightSide = f2 > 0.45;
        const a = wgt * (lay === 0 ? 0.16 : lay >= 2 ? (lightSide ? 0.07 : 0.22) : 0.2) * (0.5 + 0.5 * Math.sin(v.gt * 0.6 + f * 20));
        // 12b f12a: no additive light patches in the inner core (adding light to its R-saturated yellow only raised
        // green: a lime cast); there the mottling is ember-brown shade only
        if (lightSide && lay === 3) continue;
        c.globalAlpha = a;
        c.globalCompositeOperation = lightSide ? (lay === 0 ? 'soft-light' : 'lighter') : 'multiply';
        // 12b f12a: cool patches in the core are a warm ember brown (a black multiply on pale yellow read olive green)
        c.drawImage(lightSide ? (lay === 0 ? S.light : S.warm) : lay >= 2 ? S.ember : S.dark, sx - size, sy - size, size * 2, size * 2);
      }
    }
  }
  c.restore();
}

// rock strata in the crust (zoomed in): faint wavy lines, world-anchored, bounded by the screen
function drawStrata(c, v, yTop, rp) {
  const mpp = v.cam.mpp;
  if (rp < 1e5) return;
  const k = 1 - L.clamp(L.invLerp(30, 70, mpp));
  if (k <= 0) return;
  const step = Math.pow(2, Math.ceil(Math.log2(mpp * 26)));   // ~26-52 px apart
  const dTop = Math.max(0, (0 - yTop) * mpp), dBot = Math.min(DEPTH.moho, (H - yTop) * mpp);
  c.save();
  c.lineWidth = 1;
  for (let n = Math.ceil(dTop / step); n * step <= dBot; n++) {
    const d = n * step;
    const y = yTop + d / mpp;
    const tone = 0.5 + 0.5 * L.noise1(n * 0.37, 9);
    c.strokeStyle = tone > 0.5 ? `rgba(255,230,200,${0.06 * k * tone})` : `rgba(0,0,0,${0.18 * k * (1 - tone)})`;
    c.beginPath();
    for (let x = -20; x <= W + 20; x += 54) {
      const wob = L.noise1((v.cam.x + (x - W / 2) * mpp) / (step * 9) + n * 3.1, 4) * Math.min(10, step / mpp * 0.25);
      x === -20 ? c.moveTo(x, y + wob) : c.lineTo(x, y + wob);
    }
    c.stroke();
  }
  c.restore();
}

/** Tunnel visibility: full during the dive, recedes when the city chords take over (beat 11), gone in beat 12. */
export function tunnelAlpha(v) {
  return 1 - L.ease.inOutCubic(L.prog(v.gt, sceneStart(v, 11) + 0.05, 0.5));   // 12b f12b: gone before the globe turns (no stray line)
}
/** Tunnel half-width in metres (a 1.2 m wide shaft). */
export const TUNNEL_HW = 0.6;

function drawTunnel(c, v) {
  const mpp = v.cam.mpp;
  const x = v.wx(0);
  if (x < -40 || x > W + 40) return;
  const ya = Math.max(-10, v.wy(0)), yb = Math.min(H + 10, v.wy(2 * R_EARTH));
  if (yb <= ya) return;
  const a = tunnelAlpha(v);
  const hw = Math.max(1.4, TUNNEL_HW / mpp);
  c.save();
  c.globalAlpha = a;
  // 12b f12a: during the dive the line fades out under the HUD band (it ran through the chapter title)
  const masked = hudMasked(v);
  const y0 = masked ? Math.max(ya, HUD_CLIP0) : ya;
  if (yb > y0) {
    const ramp = (col, al) => {
      if (!masked) return `rgba(${col},${al})`;
      const g = c.createLinearGradient(0, HUD_CLIP0, 0, HUD_CLIP0 + 50);
      g.addColorStop(0, `rgba(${col},0)`); g.addColorStop(1, `rgba(${col},${al})`);
      return g;
    };
    // shaft: dark void with lit rims (lined like a bore hole)
    c.fillStyle = ramp('4,4,6', 0.92);
    c.fillRect(x - hw, y0, hw * 2, yb - y0);
    c.fillStyle = ramp('255,226,200', 0.42);
    c.fillRect(x - hw - 1, y0, 1, yb - y0);
    c.fillRect(x + hw, y0, 1, yb - y0);
  }
  c.restore();
}
/** 12b f12a: during the dive, keep thin world lines (tunnel, faller trail) out of the HUD band (y < 285). */
const HUD_CLIP0 = 285;
const hudMasked = (v) => v.cam.mpp < 8000 && v.gt >= sceneStart(v, 1);
function hudMask(c, v) {
  if (!hudMasked(v)) return;
  c.beginPath(); c.rect(-50, HUD_CLIP0, W + 100, H + 100); c.clip();
}

// ------------------------------------------------------------------ foreground: faller marker + embers
/** Person → marker swap by zoom: s00 draws the true-scale person while mpp < SWAP[1], fading out from SWAP[0]. */
export const FALLER_SWAP = [0.05, 0.2];
/** 0..1 visibility of the env faller marker at view v (zoom swap in, fades out as the city chords take over). */
export function fallerMarkerK(v) {
  const z = L.clamp(L.invLerp(Math.log(FALLER_SWAP[0]), Math.log(FALLER_SWAP[1]), Math.log(v.cam.mpp)));
  return z * (1 - L.ease.inOutCubic(L.prog(v.gt, sceneStart(v, 11) - 0.05, 0.35)));   // 12b f12b: no comet over the Atlantic
}
export const FALLER_COL = [215, 232, 255];

/** The faller marker (white-hot point with a speed trail). Exported so builders can redraw it on top of effects. */
export function drawFaller(c, v, k = fallerMarkerK(v)) {
  if (k <= 0) return;
  const d = fallerDepth(v.gt);
  const x = v.wx(0), y = v.wy(d);
  if (x < -100 || x > W + 100 || y < -300 || y > H + 300) return;
  // trail: where the faller was 0.35 s ago, in screen space at today's camera
  const yb = v.wy(fallerDepth(v.gt - 0.35));
  const len = L.clamp(yb - y, -520, 520);
  c.save();
  c.globalAlpha = k;
  hudMask(c, v);
  if (Math.abs(len) > 2) {
    const g = c.createLinearGradient(x, y, x, y + len);
    g.addColorStop(0, L.rgba(FALLER_COL, 0.85)); g.addColorStop(1, L.rgba(FALLER_COL, 0));
    c.fillStyle = g;
    c.fillRect(x - 2.5, Math.min(y, y + len), 5, Math.abs(len));
  }
  L.lightBlob(c, x, y, 46, [170, 200, 255], 0.45 * k);
  c.fillStyle = L.rgba([255, 255, 255]);
  c.shadowColor = 'rgba(190,215,255,0.9)';
  c.shadowBlur = 14;
  c.beginPath(); c.arc(x, y, 6.5, 0, Math.PI * 2); c.fill();
  c.restore();
}

const EMBERS = (() => { const r = L.rng(1212); return Array.from({ length: 70 }, () => ({ x: r(), y: r(), z: r(), ph: r() * 6.28 })); })();
/** 0..1: the dive's parallax embers (inside the rock, beats 1-7). */
function emberK(v) {
  return L.prog(v.gt, sceneStart(v, 1) + 1.6, 0.8) * (1 - L.ease.inOutCubic(L.prog(v.gt, sceneStart(v, 7) + 0.2, 1.4)));
}

export function drawForeground(c, v) {
  const ek = emberK(v);
  if (ek > 0) {
    const sc = v.cam.scroll ?? 0;
    const H2 = H + 200;
    c.save();
    c.globalCompositeOperation = 'lighter';
    for (const e of EMBERS) {
      const par = 0.5 + e.z * 1.3;                         // nearer = faster and bigger
      const y = ((((e.y * H2 - sc * par) % H2) + H2) % H2) - 100;
      const x = e.x * W + 18 * Math.sin(v.gt * 0.7 + e.ph);
      // colour from the rock it is in
      const dep = v.cam.y + (y - H * v.cam.anchor) * v.cam.mpp;
      const lay = layerAt(dep);
      if (!lay) continue;
      const col = lay === 'crust' ? [210, 190, 170] : L.mix(colourAtDepth(dep), [255, 230, 190], 0.5);
      const tw = 0.5 + 0.5 * Math.sin(v.gt * 3 + e.ph * 3);
      const a = ek * (0.12 + 0.3 * e.z) * (0.6 + 0.4 * tw);
      const s = 1 + e.z * 2.2;
      const streak = 4 + e.z * 26;
      c.fillStyle = L.rgba(col, a);
      c.fillRect(x - s / 2, y - streak / 2, s, streak);
    }
    c.restore();
  }
  drawFaller(c, v);
}

// ------------------------------------------------------------------ HUD
const fmtKm = (m) => `${L.fmt(Math.round(m / 1000))} km`;
/** HUD (tunnel map + readout) visibility: in after the jump, out at beat 10 ("42 minutes"). */
function hudK(v) {
  return L.ease.outCubic(L.prog(v.gt, sceneStart(v, 1) + 1.2, 0.8)) * (1 - L.ease.inCubic(L.prog(v.gt, sceneStart(v, 10) - 0.1, 0.5)));
}

/** Left "tunnel map": a vertical strip of the four layers (entry at top, antipode at bottom) with the faller on it. */
function drawTunnelMap(c, v, k) {
  if (k <= 0) return;
  const x = 58, top = 360, bot = 1180, len = bot - top;
  const yOf = (d) => top + (d / (2 * R_EARTH)) * len;
  c.save();
  c.globalAlpha = k;
  // the strip, with the layers in their true proportions
  const segs = [[0, DEPTH.moho], [DEPTH.moho, DEPTH.cmb], [DEPTH.cmb, DEPTH.icb], [DEPTH.icb, 2 * R_EARTH - DEPTH.icb],
    [2 * R_EARTH - DEPTH.icb, 2 * R_EARTH - DEPTH.cmb], [2 * R_EARTH - DEPTH.cmb, 2 * R_EARTH - DEPTH.moho], [2 * R_EARTH - DEPTH.moho, 2 * R_EARTH]];
  for (const [a, b] of segs) {
    const m = (a + b) / 2;
    c.fillStyle = L.rgba(colourAtDepth(m), 0.9);
    c.fillRect(x - 3, yOf(a), 6, Math.max(1, yOf(b) - yOf(a)));
  }
  c.fillStyle = 'rgba(235,230,222,0.7)';
  c.fillRect(x - 9, top - 1, 18, 2);
  c.fillRect(x - 9, bot - 1, 18, 2);
  c.font = L.font(26, 600, L.FONT.body);
  c.textBaseline = 'middle';
  c.fillStyle = 'rgba(238,233,226,0.8)';
  c.shadowColor = 'rgba(0,0,0,0.85)'; c.shadowBlur = 8;
  L.trackedText(c, 'START', x + 18, top - 2, 1.5);
  L.trackedText(c, 'OTHER SIDE', x + 18, bot + 2, 1.5);
  c.shadowBlur = 0;
  // faller dot + current layer name
  const d = L.clamp(fallerDepth(v.gt), 0, 2 * R_EARTH);
  const y = yOf(d);
  L.lightBlob(c, x, y, 26, [170, 200, 255], 0.5 * k);
  c.fillStyle = '#fff';
  c.beginPath(); c.arc(x, y, 5, 0, Math.PI * 2); c.fill();
  const lay = layerAt(d) ?? 'crust';
  // f12cv: near the ends the layer name sits just inside START / OTHER SIDE (it used to vanish: no "CRUST" ever showed)
  const ly = L.clamp(y, top + 34, bot - 34);
  c.globalAlpha = k;
  c.font = L.font(26, 700, L.FONT.body);
  c.fillStyle = 'rgba(248,244,238,0.95)';
  c.shadowColor = 'rgba(0,0,0,0.85)'; c.shadowBlur = 8;
  L.trackedText(c, LAYER[lay].name, x + 20, ly, 1.5);
  c.restore();
}

export function drawHud(c, v) {
  // 12b f12a: one soft dark scrim under the HUD band in EVERY beat (bright rock, the core, the globe's ice caps), a
  // touch stronger over the white-hot core; it also carries the right-hand readout (no separate blob behind it)
  {
    const ckS = coreK(L.clamp(fallerDepth(v.gt), 0, 2 * R_EARTH)) * hudK(v);
    const sk = 0.5 + 0.26 * ckS;   // f12cv: stronger over the white-hot core (HUD subtitle + speed read)
    const g = c.createLinearGradient(0, 0, 0, 430);
    g.addColorStop(0, `rgba(6,4,4,${sk})`); g.addColorStop(0.55, `rgba(6,4,4,${sk * 0.62})`); g.addColorStop(0.82, `rgba(6,4,4,${sk * 0.22})`); g.addColorStop(1, 'rgba(6,4,4,0)');
    c.fillStyle = g; c.fillRect(0, 0, W, 430);
  }
  topBar(c, v, ACCENT);
  const k = hudK(v);
  // over the bright core: soft dark backings behind the right readout and the left tunnel map
  const ck = coreK(L.clamp(fallerDepth(v.gt), 0, 2 * R_EARTH)) * k;
  if (ck > 0.01) {
    const mk = ck * (1 - L.ease.inOutCubic(L.prog(v.gt, sceneStart(v, 7) + 0.15, 0.6)));
    if (mk > 0.01) {
      c.save();
      c.translate(80, 770); c.scale(1, 2.4);
      const lg = c.createRadialGradient(0, 0, 0, 0, 0, 230);
      // 12b f12a: a warm ember-brown backing (near-black over the pale yellow core read as an olive-green smear)
      lg.addColorStop(0, `rgba(66,22,6,${0.5 * mk})`); lg.addColorStop(0.6, `rgba(66,22,6,${0.36 * mk})`); lg.addColorStop(1, 'rgba(66,22,6,0)');
      c.fillStyle = lg; c.fillRect(-230, -230, 460, 460);
      c.restore();
    }
  }
  // the map leaves on the globe pull-back (the globe itself is the map from there)
  const mapK = k * (1 - L.ease.inOutCubic(L.prog(v.gt, sceneStart(v, 7) + 0.15, 0.6)));   // 12b f12b: out before the globe crossfade
  drawTunnelMap(c, v, mapK);
  if (k > 0) {
    const d = L.clamp(fallerDepth(v.gt), 0, 2 * R_EARTH);
    const sp = fallerSpeed(v.gt);
    // f12cv: over the core, a soft ember-brown backing behind the small readout lines (orange-on-orange failed)
    if (ck > 0.01) {
      c.save();
      c.translate(W - 230, 350); c.scale(1.9, 0.62);
      const rg = c.createRadialGradient(0, 0, 0, 0, 0, 170);
      rg.addColorStop(0, `rgba(60,20,6,${0.55 * ck})`); rg.addColorStop(0.65, `rgba(60,20,6,${0.38 * ck})`); rg.addColorStop(1, 'rgba(60,20,6,0)');
      c.fillStyle = rg; c.fillRect(-170, -170, 340, 340);
      c.restore();
    }
    c.save();
    c.globalAlpha = k;
    c.shadowColor = `rgba(0,0,0,${0.6 + 0.25 * ck})`;
    c.shadowBlur = 14 + 8 * ck;
    c.textAlign = 'right';
    c.font = L.font(64, 700, L.FONT.din);
    c.fillStyle = '#fff';
    c.fillText(fmtKm(d), W - 64, 292);
    c.shadowColor = 'rgba(0,0,0,0.9)';
    c.shadowBlur = 8;
    c.font = L.font(26, 600, L.FONT.body);
    c.fillStyle = 'rgba(232,234,240,0.92)';
    L.trackedText(c, `${L.fmt(Math.round(d / 1609.344))} MI FROM THE HOLE`, W - 64, 334, 1.5, 'right');
    c.fillStyle = L.rgba(L.mix(ACCENT, [255, 236, 214], 0.3 * ck), 1);
    L.trackedText(c, `SPEED  ${L.fmt(sp / 1000, 1)} KM/S`, W - 64, 370, 1.5, 'right');
    c.restore();
  }
  // a scale bar for the city beats
  scaleBar(c, v, { k: L.ease.outCubic(L.prog(v.gt, sceneStart(v, 11) + 0.4, 0.8)) * (1 - L.ease.inOutCubic(L.prog(v.gt, sceneStart(v, 13) + 0.1, 0.25))) });
}
export const cues = (tl) => beatCues(tl, { gain: 0.18, pitch: 0.8 });
