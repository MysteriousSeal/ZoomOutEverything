// The real Earth for "How High Is Space, Really?" (shared by env.js and the globe scenes s11/s12).
// One orientation for the whole film: New York (where the person stands, side-view x = 0) sits on the TOP of the
// disc, and the polar axis leans 23.4° like a classroom globe. Before beat 11 the planet is turned back by ROT0;
// during beat 11 it turns (east, real spin) and settles with New York back on top as s12's beacon lights.
// drawPlanet() renders it from any zoom: at huge radii the strip under the side-view horizon is the
// foreshortened surface (perspective-like), with a procedural cloud deck, surface haze and the limb glow.
import * as L from '../../../engine/runtime/lib.js';
import { drawEarth, basis } from '../../../engine/runtime/earth.js';
import { R_EARTH } from './camera.js';

const { W, H } = L;
const DEG = Math.PI / 180;
export const NYC = { lat: 40.69, lon: -74.04 };
const LEAN = 23.4;
export const ROT0 = -24;              // spin offset (deg) before the globe turns into place
const T11_FALLBACK = 49.672, T12_FALLBACK = 54.611;

const vec = (lat, lon) => [Math.cos(lat * DEG) * Math.cos(lon * DEG), Math.cos(lat * DEG) * Math.sin(lon * DEG), Math.sin(lat * DEG)];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const lin = (a, ka, b, kb) => [a[0] * ka + b[0] * kb, a[1] * ka + b[1] * kb, a[2] * ka + b[2] * kb];

// base orientation: u (screen up) = New York; the north pole projects LEAN° to the right of up (hidden behind the
// top limb), so the visible face is the Americas + the South Atlantic with New York on the horizon.
export const ORIENT = (() => {
  const la = NYC.lat * DEG, lo = NYC.lon * DEG;
  const P = vec(NYC.lat, NYC.lon);
  const E = [-Math.sin(lo), Math.cos(lo), 0];
  const N = [-Math.sin(la) * Math.cos(lo), -Math.sin(la) * Math.sin(lo), Math.cos(la)];
  const cb = Math.tan(LEAN * DEG) * Math.tan(la), sb = Math.sqrt(1 - cb * cb);
  const c = lin(E, cb, N, -sb);                       // view direction (disc centre)
  const lat0 = Math.asin(c[2]) / DEG, lon0 = Math.atan2(c[1], c[0]) / DEG;
  const l0 = lon0 * DEG, p0 = lat0 * DEG;
  const r0 = [-Math.sin(l0), Math.cos(l0), 0], u0 = [-Math.sin(p0) * Math.cos(l0), -Math.sin(p0) * Math.sin(l0), Math.cos(p0)];
  // basis(): u = -sin(t)·r0 + cos(t)·u0
  const tilt = Math.atan2(-dot(P, r0), dot(P, u0)) / DEG;
  return { lat0, lon0, tilt };
})();

export const t11Of = (v) => v?.tl?.scenes?.[11]?.start ?? T11_FALLBACK;
export const t12Of = (v) => v?.tl?.scenes?.[12]?.start ?? T12_FALLBACK;
/** Spin (deg): ROT0 until beat 11, then the globe turns east and settles (New York on top) as the beacon lights. */
export function rotAt(v) {
  const a = t11Of(v) + 0.2, b = t12Of(v) + 0.25;
  return ROT0 * (1 - L.ease.inOutCubic(L.prog(v.gt, a, b - a)));
}
/** The earth.js view for camera `v` (centre (0, R_EARTH) in world space). */
export function viewOf(v) {
  return { cx: v.wx(0), cy: v.wy(R_EARTH), r: v.ws(R_EARTH), lat0: ORIENT.lat0, lon0: ORIENT.lon0, tilt: ORIENT.tilt, rot: rotAt(v) };
}
// soft key light from the upper left (screen space), shared by the surface, the clouds and the terminator
export const SUN = [-0.62, 0.55, 0.56];

// ------------------------------------------------------------------ clouds: fBm on the sphere (pure function)
function hash(i, j, k) {
  let h = (Math.imul(i, 374761393) + Math.imul(j, 668265263) + Math.imul(k, 1274126177)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}
function vnoise(x, y, z) {
  const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z);
  let fx = x - xi, fy = y - yi, fz = z - zi;
  fx = fx * fx * (3 - 2 * fx); fy = fy * fy * (3 - 2 * fy); fz = fz * fz * (3 - 2 * fz);
  const a = hash(xi, yi, zi), b = hash(xi + 1, yi, zi), c = hash(xi, yi + 1, zi), d = hash(xi + 1, yi + 1, zi);
  const e = hash(xi, yi, zi + 1), f = hash(xi + 1, yi, zi + 1), g = hash(xi, yi + 1, zi + 1), h = hash(xi + 1, yi + 1, zi + 1);
  const ab = a + (b - a) * fx, cd = c + (d - c) * fx, ef = e + (f - e) * fx, gh = g + (h - g) * fx;
  const lo = ab + (cd - ab) * fy, hi = ef + (gh - ef) * fy;
  return lo + (hi - lo) * fz;
}
const OCT = 13, F0 = 3;
const DECK = vec(NYC.lat - 5, NYC.lon - ROT0 + 2);   // the point under the camera during the climb
const AMP = Array.from({ length: OCT }, (_, o) => Math.pow(0.6, o));

function canvasOf(slot, w, h) {
  slot.cv = slot.cv || document.createElement('canvas');
  if (slot.cv.width !== w || slot.cv.height !== h) { slot.cv.width = w; slot.cv.height = h; }
  return slot.cv;
}
const CL = {}, EA = {};

/** Cloud deck over the disc of `view`, inside rect [x, y, w, h]. k = opacity. ds = raster downsample. */
export function drawClouds(c, view, k = 1, rect = [0, 0, W, H], ds = 4) {
  if (k <= 0) return;
  const { cx, cy, r } = view;
  const x0 = Math.max(rect[0], Math.floor(cx - r)), y0 = Math.max(rect[1], Math.floor(cy - r));
  const x1 = Math.min(rect[0] + rect[2], Math.ceil(cx + r)), y1 = Math.min(rect[1] + rect[3], Math.ceil(cy + r));
  if (x1 <= x0 || y1 <= y0) return;
  const w = Math.ceil((x1 - x0) / ds), h = Math.ceil((y1 - y0) / ds);
  const cv = canvasOf(CL, w, h);
  const cc = cv.getContext('2d');
  const img = cc.createImageData(w, h);
  const u32 = new Uint32Array(img.data.buffer);
  const b = basis(view);
  // octave weights: fine octaves fade in as the planet grows on screen (no detail finer than ~2 raster px)
  const fmax = r / (2.2 * ds);
  // a band of ~7 octaves under fmax, renormalised: the deck keeps the same contrast at every zoom (the coarsest
  // octaves drop out on the way down, so low views get broken cloud instead of a flat overcast)
  const wts = AMP.map((_, o) => { const l = Math.log2(fmax / (F0 * 2 ** o)); return L.clamp(l) * L.clamp((7.5 - l) / 1.5); });
  let top = OCT; while (top > 0 && wts[top - 1] <= 0) top--;
  let wsum = 0; for (let o = 0; o < top; o++) wsum += AMP[o] * wts[o];
  const inv = wsum > 0 ? 1 / wsum : 0;
  // coverage: a broken deck seen from low down, thinner and more scattered as the whole planet comes into view
  const thr = L.lerp(-0.02, 0.07, L.clamp(L.invLerp(Math.log(2e5), Math.log(2500), Math.log(r))));
  const sl = Math.hypot(SUN[0], SUN[1], SUN[2]), Lx = SUN[0] / sl, Ly = SUN[1] / sl, Lz = SUN[2] / sl;
  for (let py = 0; py < h; py++) {
    const Y = (cy - (y0 + (py + 0.5) * ds)) / r, Y2 = Y * Y;
    if (Y2 >= 1) continue;
    for (let px = 0; px < w; px++) {
      const X = (x0 + (px + 0.5) * ds - cx) / r, rho2 = X * X + Y2;
      if (rho2 >= 1) continue;
      const Z = Math.sqrt(1 - rho2);
      const ex = X * b.r[0] + Y * b.u[0] + Z * b.c[0], ey = X * b.r[1] + Y * b.u[1] + Z * b.c[1], ez = X * b.r[2] + Y * b.u[2] + Z * b.c[2];
      // latitude belts: ITCZ + storm tracks cloudy, subtropics clear
      const s = ez, s2 = s * s;
      const belt = 0.11 * Math.exp(-((s - 0.08) ** 2) / 0.004) + 0.1 * Math.exp(-((s2 - 0.55) ** 2) / 0.02) - 0.08 * Math.exp(-((s2 - 0.16) ** 2) / 0.006);
      // stretch east-west (streaky decks): compress the polar coordinate
      let n = 0, f = F0;
      const qx = ex + 0.35 * vnoise(ex * 2.1 + 9, ey * 2.1, ez * 2.1), qy = ey + 0.35 * vnoise(ex * 2.1, ey * 2.1 + 5, ez * 2.1), qz = ez * 1.7;
      for (let o = 0; o < top; o++, f *= 2) {
        const wv = wts[o];
        if (wv > 0) n += AMP[o] * wv * (vnoise(qx * f + o * 17.3, qy * f, qz * f) - 0.5);
      }
      // a broken cloud deck over the North Atlantic below the climb (so the low views always have weather)
      const dc = ex * DECK[0] + ey * DECK[1] + ez * DECK[2];
      n = 1.5 * n * inv + belt + 0.08 * Math.exp(-(1 - dc) / 0.03);
      let a = (n - thr) / 0.12; if (a <= 0) continue; if (a > 1) a = 1;
      a = a * a * (3 - 2 * a);
      const lit = 0.72 + 0.28 * Math.max(0, X * Lx + Y * Ly + Z * Lz);
      const day = L.clamp(0.25 + 1.6 * (X * Lx + Y * Ly + Z * Lz));
      const v8 = Math.round(255 * lit * (0.25 + 0.75 * day));
      const al = Math.round(255 * a * 0.88);
      u32[py * w + px] = (al << 24) | (Math.min(255, v8 + 4) << 16) | (Math.min(255, v8 + 2) << 8) | Math.max(0, v8 - 6);
    }
  }
  cc.putImageData(img, 0, 0);
  c.save();
  c.globalAlpha *= k;
  c.imageSmoothingEnabled = true; c.imageSmoothingQuality = 'high';
  c.drawImage(cv, 0, 0, w, h, x0, y0, w * ds, h * ds);
  c.restore();
}

/** drawEarth restricted to a screen rect (rendered on an offscreen canvas so only the rect costs pixels). */
export function drawEarthIn(c, o, rect) {
  const [rx, ry, rw, rh] = rect.map(Math.round);
  const cv = canvasOf(EA, rw, rh), cc = cv.getContext('2d');
  cc.setTransform(1, 0, 0, 1, 0, 0);
  cc.clearRect(0, 0, rw, rh);
  drawEarth(cc, { ...o, cx: o.cx - rx, cy: o.cy - ry });
  c.drawImage(cv, rx, ry);
}

/**
 * The planet for camera `v`. opts: alpha, clouds (0..1), rect (screen sub-rect, e.g. a lens), glow (0..1 limb glow),
 * haze (0..1 surface haze near the horizon), sun (true = SUN key light with a terminator).
 */
export function drawPlanet(c, v, opts = {}) {
  const view = viewOf(v);
  const { cx, cy, r } = view;
  if (cy - r > H + 20) return;
  const alpha = opts.alpha ?? 1;
  if (alpha <= 0) return;
  const mpp = v.cam.mpp;
  const rect = opts.rect;
  const o = { ...view, style: 'day', sun: opts.sun === false ? undefined : SUN, atmosphere: false, alpha,
    maxPixels: opts.maxPixels ?? 7e5, relief: opts.relief ?? 1.2 };
  if (rect) drawEarthIn(c, o, rect); else drawEarth(c, o);
  const ck = (opts.clouds ?? 1) * alpha;
  if (ck > 0) drawClouds(c, view, ck, rect ?? [0, 0, W, H], rect ? 2 : r > 3000 ? 4 : 3);
  // surface haze: thick toward the horizon, thinner as we climb (aerial perspective)
  const hz = (opts.haze ?? 1) * alpha;
  const y0 = cy - r;
  if (hz > 0 && y0 < H) {
    const alt = Math.max(0, -(v.cam.y + (0 - H * v.cam.anchor) * mpp));
    const hk = L.clamp(L.invLerp(Math.log(2e6), Math.log(5e3), Math.log(Math.max(1, alt))));   // 0 at 2000 km, 1 low down
    const depth = L.clamp(L.lerp(50, 150, hk), 0, H);
    const col = [176, 204, 236];
    c.save();
    c.globalAlpha *= hz;
    if (r < 4e4) {
      const g = c.createRadialGradient(cx, cy, Math.max(0, r - depth), cx, cy, r);
      g.addColorStop(0, L.rgba(col, 0.08 * hk));
      g.addColorStop(0.7, L.rgba(col, 0.25 + 0.3 * hk));
      g.addColorStop(1, L.rgba(col, 0.6 + 0.3 * hk));
      c.fillStyle = g;
      c.beginPath(); c.arc(cx, cy, Math.max(0, r), 0, Math.PI * 2); c.fill();
    } else {
      const g = c.createLinearGradient(0, y0, 0, y0 + depth * 2);
      g.addColorStop(0, L.rgba(col, 0.6 + 0.25 * hk));
      g.addColorStop(0.25, L.rgba(col, 0.2 + 0.15 * hk));
      g.addColorStop(1, L.rgba([46, 100, 178], 0.3));
      c.fillStyle = g;
      c.beginPath();
      for (let x = -20; x <= W + 20; x += 40) c.lineTo(x, cy - Math.sqrt(Math.max(0, r * r - (x - cx) ** 2)));
      c.lineTo(W + 20, H + 20); c.lineTo(-20, H + 20); c.closePath();
      c.fill();
    }
    c.restore();
  }
  // limb glow: the thin blue skin of air seen edge-on (grows in as the sky goes black)
  const gk = (opts.glow ?? 1) * alpha;
  if (gk > 0 && y0 < H) {
    const th = Math.max(3, v.ws(70000));
    c.save();
    c.globalCompositeOperation = 'lighter';
    c.globalAlpha *= gk;
    if (r < 4e4) {
      const g = c.createRadialGradient(cx, cy, Math.max(0, r - th * 0.3), cx, cy, r + th);
      g.addColorStop(0, 'rgba(110,170,255,0)');
      g.addColorStop(0.2, 'rgba(140,195,255,0.55)');
      g.addColorStop(0.45, 'rgba(90,150,255,0.25)');
      g.addColorStop(1, 'rgba(60,110,255,0)');
      c.fillStyle = g;
      c.beginPath(); c.arc(cx, cy, r + th, 0, Math.PI * 2); c.arc(cx, cy, Math.max(0, r - th * 0.3), 0, Math.PI * 2, true); c.fill();
    } else {
      const g = c.createLinearGradient(0, y0 - th, 0, y0 + th * 0.3);
      g.addColorStop(0, 'rgba(60,110,255,0)');
      g.addColorStop(0.55, 'rgba(90,150,255,0.25)');
      g.addColorStop(0.8, 'rgba(140,195,255,0.55)');
      g.addColorStop(1, 'rgba(110,170,255,0)');
      c.fillStyle = g;
      c.beginPath();
      for (let x = -20; x <= W + 20; x += 40) c.lineTo(x, cy - Math.sqrt(Math.max(0, r * r - (x - cx) ** 2)) - th);
      for (let x = W + 20; x >= -20; x -= 40) c.lineTo(x, cy - Math.sqrt(Math.max(0, r * r - (x - cx) ** 2)) + th * 0.3);
      c.closePath();
      c.fill();
    }
    c.restore();
  }
}
