// Builder D: the Milky Way model (face-on, seen from the north galactic pole) + its pre-rendered sprites.
//
// Galaxy frame "G": light-years, centred on Sagittarius A*, screen orientation (x right, y down), so that
// world = GC + G * LY. The Sun sits at G = (-26,000, 0) (GC is to its RIGHT: galactic longitude 0 points right).
// Azimuth β (deg) follows Reid et al. (2014): 0 toward the Sun, increasing in the direction of rotation (clockwise
// on screen). A point at (β, R) is at G = (-R cos β, -R sin β). Arms are trailing log spirals,
// R(β) = Rref · exp(-(β - βref) · tanψ), matched near the Sun to Reid's fits (scaled to R0 = 26,000 ly):
// Perseus ~6,500 ly outside the Sun, Sagittarius ~4,600 ly inside, the Sun ~700 ly inside the Orion Spur's crest.
// The bar is 27,000 ly long, its near end at +27° from the Sun–centre line (galactic longitude > 0, i.e. upward).
import * as L from '../../../../engine/runtime/lib.js';

const D2R = Math.PI / 180;
export const R0 = 26000;
export const SUN_G = { x: -R0, y: 0 };
export const BAR = { half: 13500, ang: 27, minor: 0.34 };
// unit vector from GC toward the bar's near end
export const BAR_U = { x: -Math.cos(BAR.ang * D2R), y: -Math.sin(BAR.ang * D2R) };

export const ARMS = [
  { id: 'SC', name: 'SCUTUM–CENTAURUS ARM', b0: 27, b1: -250, Rref: 14300, bref: 27, tan: 0.249, w: 1.0, width: 1250 },
  { id: 'PER', name: 'PERSEUS ARM', b0: 207, b1: -95, Rref: 14000, bref: 207, tan: 0.233, w: 1.0, width: 1250 },
  { id: 'SAG', name: 'SAGITTARIUS ARM', b0: 112, b1: -150, Rref: 21400, bref: 0, tan: 0.30, w: 0.62, width: 1150 },
  { id: 'NOR', name: 'NORMA ARM', b0: 292, b1: 22, Rref: 21400, bref: 180, tan: 0.30, w: 0.56, width: 1150 },
  { id: 'ORI', name: 'ORION SPUR', b0: 36, b1: -30, Rref: 26700, bref: 0, tan: 0.2, w: 0.6, width: 650 },
];
export const armR = (a, b) => a.Rref * Math.exp(-(b - a.bref) * D2R * a.tan);
export const polarG = (b, R) => ({ x: -R * Math.cos(b * D2R), y: -R * Math.sin(b * D2R) });
/** G position on arm `a` at azimuth b, offset `off` ly radially (+ = outward). */
export const armPt = (a, b, off = 0) => polarG(b, armR(a, b) + off);
/** 0..1 envelope along an arm: grows in from the root, fades at the outer tip. */
function armEnv(a, b) {
  const f = (a.b0 - b) / (a.b0 - a.b1);
  return L.smoothstep(L.clamp(f / 0.12)) * (1 - L.smoothstep(L.clamp((f - 0.72) / 0.28)));
}
/** Arm width grows a little outward. */
const armW = (a, b) => a.width * (0.75 + 0.5 * armR(a, b) / 40000);

// ------------------------------------------------------------------ analytic density (for star sampling)
/** Relative star density at G (x, y) ly: exponential disc + arms (+ bar). ~1 on an arm crest near the Sun. */
export function dens(x, y) {
  const r = Math.hypot(x, y);
  if (r > 60000) return 0;
  const disc = Math.exp(-(r - R0) / 11000) * (1 - L.smoothstep(L.clamp((r - 44000) / 12000)));
  let arms = 0;
  const b = Math.atan2(-y, -x) / D2R;
  for (const a of ARMS) {
    for (let k = -2; k <= 2; k++) {
      const bb = b + 360 * k;
      if (bb > a.b0 || bb < a.b1) continue;
      const d = (r - armR(a, bb)) / armW(a, bb);
      arms += a.w * Math.exp(-d * d * 0.5) * armEnv(a, bb);
    }
  }
  return disc * (0.32 + 1.3 * arms);
}

// ------------------------------------------------------------------ primitives (built once, deterministic)
function gauss(r) { return (r() + r() + r() + r() - 2) * 1.73; }
function clumpN(s, seed) { return L.clamp(0.5 + 0.55 * L.noise1(s, seed) + 0.3 * L.noise1(s * 2.7, seed + 1)); }

let PRIMS = null;
function prims() {
  if (PRIMS) return PRIMS;
  const r = L.rng(2112);
  const haze = [], dust = [], young = [], clusters = [], hii = [], field = [], barStars = [];
  for (const a of ARMS) {
    const seed = a.id.charCodeAt(0) * 7 + a.id.length;
    const w15 = Math.pow(a.w, 1.5);
    // walk along the arm in ~300 ly steps of arc
    let b = a.b0;
    while (b > a.b1) {
      const R = armR(a, b), env = armEnv(a, b), W = armW(a, b) * (0.8 + 0.4 * clumpN(b * 0.05, seed + 9));
      const step = (300 / R) / D2R, jb = () => b + (r() - 0.5) * step * 1.6;
      const s = (a.b0 - b) * D2R * R / 4000;              // arc-length coordinate (units of 4,000 ly)
      const cl = Math.pow(clumpN(s, seed), 1.8);
      const warm = L.clamp(1 - (R - 13000) / 15000);
      // soft arm light
      const p = armPt(a, jb(), gauss(r) * W * 0.15);
      haze.push([p.x, p.y, W * (1.4 + 0.5 * r()), L.mix([150, 178, 255], [255, 210, 165], warm * 0.85), 0.075 * w15 * env * (0.35 + 0.9 * cl)]);
      // dust: patchy lane along the INNER (concave) edge
      const nd = Math.round(3 + 6 * a.w * env * (0.3 + cl));
      for (let i = 0; i < nd; i++) {
        const q = armPt(a, jb(), -W * (0.5 + 0.3 * r()) + gauss(r) * W * 0.1);
        dust.push([q.x, q.y, L.lerp(120, 380, r() ** 1.5) * (0.7 + 0.3 * a.w), 0.3 * Math.min(1, a.w * 1.3) * env * (0.25 + 0.9 * clumpN(s * 1.7, seed + 5))]);
      }
      // dust feathers: thin spurs crossing the arm, angled outward
      if (r() < 0.06 * a.w * env) {
        const n = 6 + Math.floor(r() * 8), ang = 0.5 + 0.3 * r();
        for (let j = 0; j < n; j++) {
          const f = j / n;
          const q = armPt(a, b - f * (W * 1.6 / R) / D2R * ang, -W * 0.5 + f * W * 1.9);
          dust.push([q.x, q.y, L.lerp(110, 200, r()), 0.22 * env]);
        }
      }
      // young stars on the crest (clumpy)
      const ny = Math.round(120 * Math.pow(a.w, 1.6) * env * (0.12 + cl * 1.3));
      for (let i = 0; i < ny; i++) {
        const wide = r() < 0.2 ? 2.2 : 1;
        const q = armPt(a, jb(), gauss(r) * W * 0.3 * wide + W * 0.08);
        young.push([q.x, q.y, r()]);
      }
      // star clusters / OB associations
      if (r() < 0.55 * a.w * env * (0.15 + cl)) {
        const q = armPt(a, jb(), gauss(r) * W * 0.25 + W * 0.05);
        clusters.push([q.x, q.y, L.lerp(80, 240, r() ** 2), r()]);
      }
      // HII regions in small groups, a little inside the crest (just downstream of the dust)
      if (r() < 0.3 * a.w * a.w * env * (0.1 + cl * 1.3)) {
        const q0 = armPt(a, b, -W * 0.2 + gauss(r) * W * 0.12);
        const n = 2 + Math.floor(r() * 5);
        for (let j = 0; j < n; j++) hii.push([q0.x + gauss(r) * 220, q0.y + gauss(r) * 220, L.lerp(50, 200, r() ** 1.8), r()]);
      }
      b -= (300 / R) / D2R;
    }
  }
  // the old disc: warm field stars, exponential, a little enhanced on the arms
  for (let i = 0; field.length < 260000 && i < 2e6; i++) {
    const rr = -Math.log(1 - r() * 0.995) * 11500, th = r() * Math.PI * 2;
    const x = Math.cos(th) * rr, y = Math.sin(th) * rr;
    if (r() > dens(x, y) / (Math.exp(-(rr - R0) / 11000) * 1.62 + 1e-12)) continue;
    field.push([x, y, r()]);
  }
  // bar + bulge stars
  for (let i = 0; i < 45000; i++) {
    const along = gauss(r) * BAR.half * 0.4, across = gauss(r) * BAR.half * 0.1;
    barStars.push([BAR_U.x * along - BAR_U.y * across, BAR_U.y * along + BAR_U.x * across, r()]);
  }
  for (let i = 0; i < 12000; i++) {
    const rr = Math.abs(gauss(r)) * 2600, th = r() * Math.PI * 2;
    barStars.push([Math.cos(th) * rr, Math.sin(th) * rr * 0.85, r()]);
  }
  // dust along the bar's leading edges, curling into the arm roots (point-symmetric pair)
  for (let i = 0; i < 700; i++) {
    const side = r() < 0.5 ? 1 : -1, t = L.lerp(0.3, 1.1, r());
    const ax = side * t * BAR.half, ay = -side * (2600 + 2400 * t ** 3) + gauss(r) * 450;
    dust.push([BAR_U.x * ax - BAR_U.y * ay, BAR_U.y * ax + BAR_U.x * ay, L.lerp(260, 620, r()), 0.07 * L.smoothstep(L.clamp((t - 0.3) / 0.25))]);
  }
  // the inner ring around the bar (the "3-kpc arms"): faint warm haze + a few HII knots
  for (let i = 0; i < 160; i++) {
    const th = (i / 160) * Math.PI * 2, ex = Math.cos(th) * 15500, ey = Math.sin(th) * 10500;
    const x = BAR_U.x * ex - BAR_U.y * ey, y = BAR_U.y * ex + BAR_U.x * ey;
    haze.push([x + gauss(r) * 400, y + gauss(r) * 400, 2400, [255, 205, 160], 0.018]);
    if (r() < 0.12) hii.push([x + gauss(r) * 300, y + gauss(r) * 300, L.lerp(70, 180, r()), r()]);
  }
  // real nearby star-forming regions (unlabelled pink knots at their true places, seen from above the plane)
  const knot = (l, d) => { const a = l * D2R; return [-R0 + d * Math.cos(a), -d * Math.sin(a)]; };
  for (const [l, d, s] of [[209.0, 1344, 120], [6.0, 4100, 170], [17.0, 5700, 160], [287.6, 7500, 230], [80, 4600, 200], [15.1, 5500, 130], [133.7, 6400, 140], [111.5, 9100, 130]]) {
    const [x, y] = knot(l, d);
    hii.push([x, y, s, 0.95], [x + 90, y - 60, s * 0.55, 0.6]);
    clusters.push([x - 60, y + 40, s * 0.8, 0.8]);
  }
  PRIMS = { haze, dust, young, clusters, hii, field, barStars };
  return PRIMS;
}

// ------------------------------------------------------------------ blob sprites
const BLOBS = {};
function blob(col, hard = 0.35) {
  const key = col.join(',') + hard;
  if (BLOBS[key]) return BLOBS[key];
  const S = 64, cv = new OffscreenCanvas(S, S), g = cv.getContext('2d');
  const gr = g.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2);
  gr.addColorStop(0, L.rgba(col, 1));
  gr.addColorStop(hard, L.rgba(col, 0.42));
  gr.addColorStop(0.7, L.rgba(col, 0.1));
  gr.addColorStop(1, L.rgba(col, 0));
  g.fillStyle = gr; g.fillRect(0, 0, S, S);
  return (BLOBS[key] = cv);
}

/**
 * Render the galaxy into canvas `cv`: G (x0, y0) maps to pixel (0, 0); `s` ly per pixel.
 * `extra` = additional point stars (local detail for the hi-res tile).
 */
function render(cv, x0, y0, s, extra = null) {
  const P = prims();
  const c = cv.getContext('2d');
  const Wd = cv.width, Hd = cv.height;
  const X = (x) => (x - x0) / s, Y = (y) => (y - y0) / s;
  const inR = (x, y, rad) => { const px = X(x), py = Y(y), pr = rad / s; return px + pr > 0 && px - pr < Wd && py + pr > 0 && py - pr < Hd; };
  const pxs = Math.max(1, 1 / 1);   // point size in px
  c.globalCompositeOperation = 'lighter';
  // 1. the disc: warm old light toward the centre, a cool faint outer disc
  {
    const gx = X(0), gy = Y(0), R = 56000 / s;
    const g = c.createRadialGradient(gx, gy, 0, gx, gy, R);
    g.addColorStop(0, 'rgba(255,214,160,0.2)');
    g.addColorStop(0.05, 'rgba(255,206,150,0.17)');
    g.addColorStop(0.16, 'rgba(236,190,150,0.13)');
    g.addColorStop(0.36, 'rgba(185,172,190,0.1)');
    g.addColorStop(0.62, 'rgba(125,138,190,0.05)');
    g.addColorStop(0.85, 'rgba(100,120,180,0.012)');
    g.addColorStop(1, 'rgba(90,110,170,0)');
    c.fillStyle = g; c.fillRect(0, 0, Wd, Hd);
  }
  // 2. arm light
  for (const [x, y, rad, col, a] of P.haze) {
    if (a <= 0.001 || !inR(x, y, rad)) continue;
    c.globalAlpha = Math.min(1, a);
    c.drawImage(blob(col.map(Math.round), 0.3), X(x) - rad / s, Y(y) - rad / s, 2 * rad / s, 2 * rad / s);
  }
  c.globalAlpha = 1;
  // 3. bar + bulge glow (elongated), core
  c.save();
  c.translate(X(0), Y(0));
  c.rotate(Math.atan2(BAR_U.y, BAR_U.x));
  c.scale(1, BAR.minor);
  const bl = (rad, col, a) => { c.globalAlpha = a; c.drawImage(blob(col, 0.25), -rad / s, -rad / s, 2 * rad / s, 2 * rad / s); };
  bl(BAR.half * 1.2, [255, 190, 120], 0.5);
  bl(BAR.half * 0.95, [255, 204, 140], 0.4);
  bl(BAR.half * 0.55, [255, 218, 165], 0.25);
  c.restore();
  c.save();
  c.translate(X(0), Y(0));
  c.scale(1, 0.88);
  const bl2 = (rad, col, a) => { c.globalAlpha = a; c.drawImage(blob(col, 0.3), -rad / s, -rad / s, 2 * rad / s, 2 * rad / s); };
  bl2(6000, [255, 206, 145], 0.24);
  bl2(2400, [255, 226, 186], 0.2);
  c.restore();
  c.globalAlpha = 1;
  // 4. old field stars + bar stars (binned by brightness, so fillStyle changes rarely)
  const dots = (list, colF, aF, size, cull = 1) => {
    const bins = 6;
    for (let k = 0; k < bins; k++) {
      c.fillStyle = L.rgba(colF(k / (bins - 1)), aF(k / (bins - 1)));
      for (const p of list) {
        if (Math.min(bins - 1, (p[2] * bins) | 0) !== k) continue;
        const px = X(p[0]), py = Y(p[1]);
        if (px < -2 || py < -2 || px > Wd + 2 || py > Hd + 2) continue;
        c.fillRect(px, py, size, size);
      }
    }
  };
  dots(P.field, (b) => L.mix([255, 214, 176], [255, 236, 214], b), (b) => 0.05 + 0.2 * b, pxs * 1.1);
  dots(P.barStars, (b) => L.mix([255, 200, 140], [255, 232, 196], b), (b) => 0.04 + 0.12 * b, pxs * 1.1);
  if (extra) dots(extra, (b) => (b > 0.85 ? [215, 228, 255] : L.mix([255, 196, 150], [255, 236, 214], b)), (b) => 0.08 + 0.3 * b, 1.2);
  // 5. dust (removes light)
  c.globalCompositeOperation = 'destination-out';
  const dk = blob([0, 0, 0], 0.4);
  for (const [x, y, rad, a] of P.dust) {
    if (!inR(x, y, rad)) continue;
    c.globalAlpha = Math.min(1, a);
    c.drawImage(dk, X(x) - rad / s, Y(y) - rad / s, 2 * rad / s, 2 * rad / s);
  }
  c.globalAlpha = 1;
  c.globalCompositeOperation = 'lighter';
  // 6. young blue-white stars along the arm crests
  dots(P.young, (b) => (b > 0.94 ? [235, 242, 255] : L.mix([150, 180, 255], [205, 220, 255], b)), (b) => (b > 0.9 ? 0.75 : 0.1 + 0.3 * b), Math.max(1, 1.2));
  // 7. clusters (blue-white knots) and HII regions (pink)
  for (const [x, y, rad, b] of P.clusters) {
    const R = Math.max(rad, 1.6 * s);
    if (!inR(x, y, R)) continue;
    const res = L.clamp((rad / s - 4) / 8);           // resolved: a few bright stars in a faint glow
    c.globalAlpha = Math.min(1, (0.35 + 0.5 * b) * Math.min(1, rad / s / 1.6)) * (1 - 0.7 * res);
    c.drawImage(blob([200, 220, 255], 0.2), X(x) - R / s, Y(y) - R / s, 2 * R / s, 2 * R / s);
    if (res > 0) {
      const rr = L.rng((x * 7 + y * 13) | 0);
      c.fillStyle = 'rgba(225,235,255,1)';
      for (let j = 0; j < 14; j++) {
        const u = gauss(rr) * 0.35 * rad / s, w = gauss(rr) * 0.35 * rad / s, sz = 1 + 1.4 * rr();
        c.globalAlpha = res * (0.5 + 0.5 * rr());
        c.fillRect(X(x) + u, Y(y) + w, sz, sz);
      }
    }
  }
  for (const [x, y, rad, b] of P.hii) {
    const R = Math.max(rad, 1.6 * s);
    if (!inR(x, y, R)) continue;
    c.globalAlpha = Math.min(1, (0.4 + 0.45 * b) * Math.min(1, rad / s / 1.6) ** 0.6);
    c.drawImage(blob([255, 105, 160], 0.25), X(x) - R / s, Y(y) - R / s, 2 * R / s, 2 * R / s);
  }
  c.globalAlpha = 1;
  // 8. the bright core
  c.save();
  c.translate(X(0), Y(0));
  c.globalAlpha = 0.3;
  const cr = 700 / s;
  c.drawImage(blob([255, 240, 215], 0.25), -cr, -cr, 2 * cr, 2 * cr);
  c.restore();
}

// ------------------------------------------------------------------ main sprite (+ mips) and the hi-res local tile
export const SPAN = 116000;              // ly across the main sprite
const MAIN_PX = 4096;
let MAIN = null;
export function mainMips() {
  if (MAIN) return MAIN;
  const cv = new OffscreenCanvas(MAIN_PX, MAIN_PX);
  render(cv, -SPAN / 2, -SPAN / 2, SPAN / MAIN_PX);
  const mips = [cv];
  let src = cv, s = MAIN_PX;
  while (s > 32) {
    s = Math.round(s / 2);
    const m = new OffscreenCanvas(s, s), mc = m.getContext('2d');
    mc.imageSmoothingQuality = 'high';
    mc.drawImage(src, 0, 0, s, s);
    mips.push(m);
    src = m;
  }
  return (MAIN = mips);
}

// The tile covers the Sun's side of the disc out to the far edge of the view while the camera glides to the centre.
export const TILE = { x0: -37000, x1: -600, y0: -7600, y1: 7600, s: 7 };
let TILE_CV = null;
export function tileCanvas() {
  if (TILE_CV) return TILE_CV;
  const w = Math.ceil((TILE.x1 - TILE.x0) / TILE.s), h = Math.ceil((TILE.y1 - TILE.y0) / TILE.s);
  const cv = new OffscreenCanvas(w, h);
  // local detail: extra point stars following the same density
  const r = L.rng(5150), extra = [];
  const dmax = 2.2;
  for (let i = 0; extra.length < 170000 && i < 3e6; i++) {
    const x = L.lerp(TILE.x0, TILE.x1, r()), y = L.lerp(TILE.y0, TILE.y1, r());
    if (r() * dmax > dens(x, y)) continue;
    extra.push([x, y, r() ** 1.6]);
  }
  render(cv, TILE.x0, TILE.y0, TILE.s, extra);
  return (TILE_CV = cv);
}

// ------------------------------------------------------------------ other galaxies (Local Group sprites)
const SPR = {};
/** A face-on spiral sprite (later squashed for inclination). */
export function spiralSprite(key, { S = 384, turns = 1.1, arms = 2, tint = [190, 205, 255], core = [255, 228, 185], bulge = 0.22, ring = 0, seed = 3, dustA = 0.5 }) {
  if (SPR[key]) return SPR[key];
  const cv = new OffscreenCanvas(S, S), c = cv.getContext('2d');
  const r = L.rng(seed), C = S / 2, RR = S * 0.46;
  c.globalCompositeOperation = 'lighter';
  const b = (x, y, rad, col, a, hard = 0.3) => { c.globalAlpha = Math.min(1, a); c.drawImage(blob(col, hard), x - rad, y - rad, rad * 2, rad * 2); };
  b(C, C, RR * 1.05, L.mix(tint, core, 0.4), 0.35);
  b(C, C, RR * 0.6, L.mix(tint, core, 0.6), 0.35);
  for (let k = 0; k < arms; k++) {
    for (let i = 0; i < 260; i++) {
      const f = i / 260, th = k * Math.PI * 2 / arms + f * turns * Math.PI * 2, rr = RR * (0.18 + 0.82 * f);
      const x = C + Math.cos(th) * rr + gauss(r) * 2, y = C + Math.sin(th) * rr + gauss(r) * 2;
      b(x, y, RR * 0.07, tint, 0.09 * (1 - 0.5 * f));
      if (r() < 0.25) b(x + gauss(r) * 3, y + gauss(r) * 3, RR * 0.012, [255, 130, 180], 0.5);
      if (r() < 0.5) b(x + gauss(r) * 4, y + gauss(r) * 4, RR * 0.01, [220, 232, 255], 0.6);
    }
  }
  if (ring) for (let i = 0; i < 300; i++) { const th = r() * Math.PI * 2, rr = RR * ring * (1 + gauss(r) * 0.03); b(C + Math.cos(th) * rr, C + Math.sin(th) * rr, RR * 0.04, tint, 0.08); }
  for (let i = 0; i < 2500; i++) {
    const rr = Math.abs(gauss(r)) * RR * 0.35, th = r() * Math.PI * 2;
    c.globalAlpha = 0.25; c.fillStyle = L.rgba(core); c.fillRect(C + Math.cos(th) * rr, C + Math.sin(th) * rr, 1, 1);
  }
  // dust lanes just inside the arms
  c.globalCompositeOperation = 'destination-out';
  for (let k = 0; k < arms; k++) {
    for (let i = 0; i < 160; i++) {
      const f = 0.1 + 0.8 * i / 160, th = k * Math.PI * 2 / arms + f * turns * Math.PI * 2 - 0.18, rr = RR * (0.18 + 0.82 * f) * 0.96;
      b(C + Math.cos(th) * rr, C + Math.sin(th) * rr, RR * 0.035, [0, 0, 0], dustA * 0.5);
    }
  }
  if (ring) for (let i = 0; i < 220; i++) { const th = r() * Math.PI * 2, rr = RR * ring * 0.93; b(C + Math.cos(th) * rr, C + Math.sin(th) * rr, RR * 0.03, [0, 0, 0], dustA * 0.4); }
  c.globalCompositeOperation = 'lighter';
  b(C, C, RR * bulge * 1.6, core, 0.75, 0.2);
  b(C, C, RR * bulge * 0.5, [255, 245, 225], 0.9, 0.2);
  c.globalAlpha = 1;
  const mips = [cv];
  let src = cv, s = S;
  while (s > 16) { s = Math.round(s / 2); const m = new OffscreenCanvas(s, s), mc = m.getContext('2d'); mc.imageSmoothingQuality = 'high'; mc.drawImage(src, 0, 0, s, s); mips.push(m); src = m; }
  return (SPR[key] = mips);
}
/** An irregular dwarf (clumpy blobs). */
export function irregularSprite(key, seed, tint = [200, 215, 255]) {
  if (SPR[key]) return SPR[key];
  const S = 96, cv = new OffscreenCanvas(S, S), c = cv.getContext('2d'), r = L.rng(seed), C = S / 2;
  c.globalCompositeOperation = 'lighter';
  const b = (x, y, rad, col, a) => { c.globalAlpha = a; c.drawImage(blob(col), x - rad, y - rad, rad * 2, rad * 2); };
  b(C, C, 40, tint, 0.35);
  // a bar-ish elongated core (the LMC has a prominent bar)
  for (let i = 0; i < 14; i++) b(C + gauss(r) * 9, C + gauss(r) * 4, L.lerp(6, 12, r()), L.mix(tint, [255, 240, 220], 0.5), 0.3);
  for (let i = 0; i < 8; i++) b(C + gauss(r) * 10, C + gauss(r) * 8, 3, [255, 140, 185], 0.5);
  c.globalAlpha = 1;
  const mips = [cv];
  let src = cv, s = S;
  while (s > 12) { s = Math.round(s / 2); const m = new OffscreenCanvas(s, s), mc = m.getContext('2d'); mc.imageSmoothingQuality = 'high'; mc.drawImage(src, 0, 0, s, s); mips.push(m); src = m; }
  return (SPR[key] = mips);
}
export const pickMip = (mips, size) => { let m = mips[0]; for (const mm of mips) if (mm.width >= size) m = mm; return m; };
