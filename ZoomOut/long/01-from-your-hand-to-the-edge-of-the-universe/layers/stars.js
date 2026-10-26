// Layer "stars" (lf 15.8 → 20.6) — builder D.
// The Sun as a star (takes over from builder C's Sun over lf 15.8–17.0, same glow recipe, so exactly one Sun shows),
// the real nearest stars at their true projected positions (galactic l, b, d → camera.js gal()), the bright naked-eye
// stars, and a deterministic local star field whose large-scale density follows the Milky Way model (Orion Spur,
// Sagittarius arm), so it hands off to the galaxy layer over lf 19.2–20.4.
// Exports positions for the scenes (s18–s20) to label.
import * as L from '../../../../engine/runtime/lib.js';
import { band } from '../world.js';
import { LY, SUN, GC, gal } from '../camera.js';
import { dens, R0 } from './d-galaxy-model.js';
import { bt, sliceCams } from './d-ui.js';

const { W, H } = L;
const TAU = Math.PI * 2;

// ------------------------------------------------------------------ catalogue (BRIEF.md facts)
// lum: rough luminosity class for glyph size; col: spectral colour.
const M_RED = [255, 122, 84];
export const NEAR = [
  { id: 'prox', name: 'PROXIMA CENTAURI', d: 4.24, l: 313.9, b: -1.9, core: 1.9, glow: 15, col: M_RED },
  { id: 'acen', name: 'ALPHA CENTAURI A & B', d: 4.37, l: 315.7, b: -0.7, core: 3.3, glow: 30, col: [255, 236, 200], n: 2 },
  { id: 'barn', name: "BARNARD'S STAR", d: 5.96, l: 31.0, b: 14.1, core: 1.9, glow: 13, col: M_RED },
  { id: 'wolf', name: 'WOLF 359', d: 7.86, l: 244.1, b: 56.1, core: 1.7, glow: 11, col: M_RED },
  { id: 'lal', name: 'LALANDE 21185', d: 8.31, l: 185.1, b: 65.4, core: 2.1, glow: 15, col: [255, 140, 96] },
  { id: 'sir', name: 'SIRIUS A & B', d: 8.60, l: 227.2, b: -8.9, core: 4.2, glow: 46, col: [200, 220, 255], n: 2 },
  { id: 'luy', name: 'LUYTEN 726-8 A & B', d: 8.73, l: 175.5, b: -76.0, core: 1.7, glow: 11, col: M_RED, n: 2 },
  { id: 'ross', name: 'ROSS 154', d: 9.70, l: 11.3, b: -10.3, core: 1.8, glow: 12, col: M_RED },
].map((s) => ({ ...s, n: s.n || 1, p: gal(s.l, s.b, s.d * LY) }));

export const BRIGHT = [
  { id: 'vega', name: 'VEGA', d: 25, l: 67.4, b: 19.2, core: 3.2, glow: 30, col: [205, 222, 255] },
  { id: 'arct', name: 'ARCTURUS', d: 37, l: 15.1, b: 69.1, core: 3.2, glow: 30, col: [255, 196, 136] },
  { id: 'alde', name: 'ALDEBARAN', d: 65, l: 181.0, b: -20.2, core: 3.4, glow: 32, col: [255, 176, 116] },
  { id: 'pola', name: 'POLARIS', d: 433, l: 123.3, b: 26.5, core: 3.3, glow: 32, col: [255, 238, 205] },
  { id: 'betl', name: 'BETELGEUSE', d: 550, l: 199.8, b: -9.0, core: 3.8, glow: 40, col: [255, 140, 88] },
  { id: 'rigl', name: 'RIGEL', d: 860, l: 209.2, b: -25.2, core: 3.8, glow: 40, col: [190, 212, 255] },
  { id: 'anta', name: 'ANTARES', d: 550, l: 351.9, b: 15.1, core: 3.7, glow: 38, col: [255, 132, 84] },
  { id: 'dene', name: 'DENEB', d: 2600, l: 84.3, b: 2.0, core: 3.9, glow: 40, col: [232, 238, 255] },
].map((s) => ({ ...s, p: gal(s.l, s.b, s.d * LY) }));

export const starById = (id) => NEAR.find((s) => s.id === id) || BRIGHT.find((s) => s.id === id);

// ------------------------------------------------------------------ the local field (deterministic levels)
// Level j: stars spread over a disc of radius RJ[j] ly around the Sun (none inside 11 ly: only the real
// neighbours live there). Each level is ~a constant count, i.e. ever brighter (rarer) stars at larger radii, so the
// field keeps a steady density on screen at every zoom; a level fades as its disc shrinks below the frame.
const RJ = [36, 110, 330, 1000, 3000, 9000, 22000];
const NJ = [420, 2600, 3400, 3600, 3600, 4200, 3600];
// colours: M dwarfs orange-red, K orange, G/F yellow-white, A/B blue-white
const CLS = [[255, 132, 92], [255, 178, 122], [255, 228, 192], [244, 244, 255], [196, 214, 255]];
const LEVELS = (() => {
  const r = L.rng(1717), out = [];
  RJ.forEach((R, j) => {
    const list = [];
    let guard = 0;
    while (list.length < NJ[j] && guard++ < NJ[j] * 40) {
      const rr = R * Math.sqrt(r()), th = r() * TAU;
      if (rr < 11) continue;
      const x = Math.cos(th) * rr, y = Math.sin(th) * rr;          // ly from the Sun, screen axes
      if (j >= 3 && r() * 2.0 > dens(-R0 + x, y)) continue;        // follow the spur / arms at large scales
      const u = r();
      // spectral mix shifts toward luminous classes at the larger (brighter) levels
      const hot = L.clamp(j / 6);
      const cls = u < 0.62 - 0.4 * hot ? 0 : u < 0.8 - 0.25 * hot ? 1 : u < 0.92 - 0.12 * hot ? 2 : u < 0.97 ? 3 : 4;
      list.push({ x: x * LY, y: y * LY, cls, b: r() ** 2.2, rr });
    }
    out.push({ R, list });
  });
  return out;
})();

// point sprites (one per class): a soft disc with a slightly harder core
const DOTS = [];
function dotSprite(i) {
  if (DOTS[i]) return DOTS[i];
  const S = 32, cv = new OffscreenCanvas(S, S), g = cv.getContext('2d');
  const col = CLS[i];
  const gr = g.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2);
  gr.addColorStop(0, L.rgba(L.mix(col, [255, 255, 255], 0.55), 1));
  gr.addColorStop(0.16, L.rgba(L.mix(col, [255, 255, 255], 0.2), 0.85));
  gr.addColorStop(0.4, L.rgba(col, 0.2));
  gr.addColorStop(1, L.rgba(col, 0));
  g.fillStyle = gr; g.fillRect(0, 0, S, S);
  return (DOTS[i] = cv);
}

/** Beat-19 highlight (0..1): the stars inside 10 ly light up, the rest dim. */
export function h19(v) {
  if (!v.tl.scenes[19]) return 0;
  const t = bt(v, 19), d = v.tl.scenes[19].end - v.tl.scenes[19].start;
  return L.ease.inOutCubic(L.prog(t, 0.6, 0.8)) * (1 - L.ease.inOutCubic(L.prog(t, d + 0.1, 0.6)));
}

function drawField(c, v, k) {
  const mpp = v.cam.mpp, sx0 = v.wx(SUN.x), sy0 = v.wy(SUN.y);
  const dim = 1 - 0.6 * h19(v);
  // where each star moves across this sub-frame's shutter slice (zoom streaks instead of dotted strobes)
  const [ca, cb] = sliceCams(v);
  const ax0 = W / 2 + (SUN.x - ca.x) / ca.mpp, ay0 = H / 2 + (SUN.y - ca.y) / ca.mpp;
  const bx0 = W / 2 + (SUN.x - cb.x) / cb.mpp, by0 = H / 2 + (SUN.y - cb.y) / cb.mpp;
  c.save();
  c.globalCompositeOperation = 'lighter';
  c.lineCap = 'round';
  for (const { R, list } of LEVELS) {
    const Rpx = R * LY / mpp;
    // a level shows while its disc covers the frame; fades as it shrinks toward the Sun
    const lk = L.smoothstep(L.clamp((Rpx - 650) / 700));
    if (lk <= 0.003) continue;
    for (const s of list) {
      const x = sx0 + s.x / mpp, y = sy0 + s.y / mpp;
      if (x < -30 || x > W + 30 || y < -30 || y > H + 30) continue;
      const edge = 1 - L.smoothstep(L.clamp((s.rr / R - 0.7) / 0.3));   // soft rim
      let a = k * lk * edge * dim * (0.42 + 0.58 * s.b);
      if (a <= 0.01) continue;
      const size = 3.2 + 6.5 * s.b + (s.cls >= 3 ? 2 : 0);
      const xa = ax0 + s.x / ca.mpp, ya = ay0 + s.y / ca.mpp, xb = bx0 + s.x / cb.mpp, yb = by0 + s.y / cb.mpp;
      const len = Math.hypot(xb - xa, yb - ya);
      if (len > 1.5) {
        // a streak: same light spread along the motion
        const col = CLS[s.cls];
        c.globalAlpha = Math.min(1, a * Math.min(1, size * 0.45 / len) * 1.6);
        c.strokeStyle = L.rgba(L.mix(col, [255, 255, 255], 0.35));
        c.lineWidth = Math.max(1.1, size * 0.28);
        c.beginPath(); c.moveTo(xa, ya); c.lineTo(xb, yb); c.stroke();
        continue;
      }
      c.globalAlpha = Math.min(1, a);
      c.drawImage(dotSprite(s.cls), x - size / 2, y - size / 2, size, size);
    }
  }
  c.restore();
}

/** A named star glyph: soft glow + bright core + faint cross-glint. sc scales the glyph. */
export function starGlyph(c, x, y, s, a, sc = 1) {
  if (a <= 0.003 || x < -80 || x > W + 80 || y < -80 || y > H + 80) return;
  const col = s.col;
  L.lightBlob(c, x, y, s.glow * sc, col, 0.32 * a);
  L.lightBlob(c, x, y, s.glow * 0.38 * sc, L.mix(col, [255, 255, 255], 0.25), 0.55 * a);
  c.save();
  c.globalCompositeOperation = 'lighter';
  if (s.core >= 3) {
    const len = s.glow * 0.9 * sc;
    for (const [dx, dy] of [[1, 0], [0, 1]]) {
      const g = c.createLinearGradient(x - dx * len, y - dy * len, x + dx * len, y + dy * len);
      g.addColorStop(0, L.rgba(col, 0)); g.addColorStop(0.5, L.rgba(L.mix(col, [255, 255, 255], 0.5), 0.35 * a)); g.addColorStop(1, L.rgba(col, 0));
      c.fillStyle = g;
      if (dx) c.fillRect(x - len, y - 0.6, len * 2, 1.2); else c.fillRect(x - 0.6, y - len, 1.2, len * 2);
    }
  }
  c.fillStyle = L.rgba(L.mix(col, [255, 255, 255], 0.65), Math.min(1, a));
  c.beginPath(); c.arc(x, y, Math.max(0.6, s.core * 0.62 * Math.sqrt(sc)), 0, TAU); c.fill();
  c.restore();
}

// ------------------------------------------------------------------ the Sun (same recipe as builder C's, shrinking to a star)
const SUN_STAR = { col: [255, 226, 180] };
export const sunInK = (lf) => L.smoothstep(L.clamp((lf - 15.8) / 1.2));
function drawSun(c, v, k) {
  const lf = v.cam.lf, a = sunInK(lf) * k;
  if (a <= 0.003) return;
  const sx = v.wx(SUN.x), sy = v.wy(SUN.y);
  if (sx < -300 || sx > W + 300 || sy < -300 || sy > H + 300) return;
  // at lf 15.8 this matches C's glyph (s = 0.55); it settles into a star by lf ~17.6
  const e = L.smoothstep(L.invLerp(15.8, 17.6, lf));
  const big = L.lerp(181, 62, e), mid = L.lerp(63, 21, e), core = L.lerp(14, 6, e);
  const sc = L.lerp(1, 0.75, L.smoothstep(L.invLerp(18.5, 20, lf)));
  L.lightBlob(c, sx, sy, big * sc, [255, 128, 40], L.lerp(0.15, 0.1, e) * a);
  L.lightBlob(c, sx, sy, mid * sc, [255, 186, 96], L.lerp(0.42, 0.45, e) * a);
  L.lightBlob(c, sx, sy, core * sc, [255, 236, 200], 0.9 * a);
  const sw = mid * 1.6 * sc;
  const g = c.createLinearGradient(sx - sw, 0, sx + sw, 0);
  g.addColorStop(0, 'rgba(255,190,110,0)');
  g.addColorStop(0.5, `rgba(255,222,170,${0.28 * a})`);
  g.addColorStop(1, 'rgba(255,190,110,0)');
  c.save();
  c.globalCompositeOperation = 'lighter';
  c.fillStyle = g;
  c.fillRect(sx - sw, sy - 1.1, sw * 2, 2.2);
  c.fillStyle = `rgba(255,248,232,${a})`;
  c.beginPath(); c.arc(sx, sy, 1.9, 0, TAU); c.fill();
  c.restore();
}

export default {
  draw(c, v) {
    const lf = v.cam.lf;
    const k = band(lf, 15.8, 17.0, 20.2, 20.6);
    if (k <= 0) return;
    const mpp = v.cam.mpp;
    // the field: from the nearest-star scale up (it never crowds the Sun's own neighbourhood)
    const kf = band(lf, 16.9, 17.4, 20.2, 20.6);
    if (kf > 0) drawField(c, v, kf);
    drawSun(c, v, band(lf, 15.8, 15.8, 20.2, 20.6));
    // the nearest stars: they collapse into the Sun's glow as the zoom passes ~100 ly; fade before they pile up
    const glyphSc = L.lerp(1, 0.72, L.smoothstep(L.invLerp(17.3, 18.4, lf)));
    const hl = h19(v);
    for (const s of NEAR) {
      const x = v.wx(s.p.x), y = v.wy(s.p.y);
      const dpx = (Math.hypot(s.p.x, s.p.y)) / mpp;
      const sep = L.smoothstep(L.clamp((dpx - 10) / 30));
      const a = band(lf, 16.3, 16.9) * sep * (0.82 + 0.18 * hl);
      starGlyph(c, x, y, s, a, glyphSc * (1 + 0.25 * hl));
    }
    // the bright naked-eye stars (luminous: they keep a glyph all the way to the galaxy scale)
    const bsc = L.lerp(1, 0.62, L.smoothstep(L.invLerp(18.6, 20, lf)));
    for (const s of BRIGHT) {
      const x = v.wx(s.p.x), y = v.wy(s.p.y);
      const dpx = Math.hypot(s.p.x - SUN.x, s.p.y - SUN.y) / mpp;
      const sep = L.smoothstep(L.clamp((dpx - 6) / 22));
      const a = band(lf, 16.6, 17.4, 20.2, 20.6) * sep;
      starGlyph(c, x, y, s, a, bsc);
    }
  },
};
