// Layer "galaxy" (lf 19.2 → 24.6) — builder D.
// The Milky Way face-on from the north galactic pole (model + sprites in d-galaxy-model.js), pre-rendered once into a
// 4096 px sprite with mips plus a 6.5 ly/px tile over the Sun's side of the disc for the close scales; then the Local
// Group: Andromeda (M31, with M32 and M110), Triangulum (M33), the Large and Small Magellanic Clouds and ~40 dwarfs.
// Everything fades out over lf 23.6–24.4 (handoff to builder E's galaxy field).
import * as L from '../../../../engine/runtime/lib.js';
import { band } from '../world.js';
import { LY, GC, ANDROMEDA, gal } from '../camera.js';
import { smearCams, viewFor } from './d-ui.js';
import { mainMips, tileCanvas, TILE, SPAN, spiralSprite, irregularSprite, pickMip } from './d-galaxy-model.js';

const { W, H } = L;
const TAU = Math.PI * 2;

// ------------------------------------------------------------------ the Local Group (world positions, metres)
export const M33 = gal(133.6, -31.3, 2.73e6 * LY);
export const LMC = gal(280.5, -32.9, 160000 * LY);
export const SMC = gal(302.8, -44.3, 200000 * LY);
const M31_PA = -0.62;                           // on-screen position angle of M31's long axis (rad)
const M31_Q = 0.3;                              // apparent axis ratio (inclined ~77°)
const M31_D = 220000 * LY;                      // diameter
const rot = (x, y, a) => [x * Math.cos(a) - y * Math.sin(a), x * Math.sin(a) + y * Math.cos(a)];
// M31's two bright satellites, placed beside it as on the sky (offsets in ly, along/across its long axis)
const [m32x, m32y] = rot(9000, 20000, M31_PA), [m110x, m110y] = rot(-14000, -36000, M31_PA);
export const M32 = { x: ANDROMEDA.x + m32x * LY, y: ANDROMEDA.y + m32y * LY };
export const M110 = { x: ANDROMEDA.x + m110x * LY, y: ANDROMEDA.y + m110y * LY };

// ~40 dwarfs: satellites of the Milky Way and of Andromeda, plus isolated dwarfs through the ~10 Mly group
export const DWARFS = (() => {
  const r = L.rng(4404), out = [];
  const around = (cx, cy, n, r0, r1) => {
    for (let i = 0; i < n; i++) {
      const d = L.lerp(r0, r1, r() ** 1.3) * LY, a = r() * TAU;
      out.push({ x: cx + Math.cos(a) * d, y: cy + Math.sin(a) * d, s: L.lerp(1.3, 2.3, r()), a: L.lerp(0.45, 0.85, r()), ph: r() * TAU });
    }
  };
  around(0, 0, 13, 7e4, 9e5);                                      // Milky Way satellites (Draco, Fornax, Leo I, …)
  around(ANDROMEDA.x, ANDROMEDA.y, 15, 6e4, 9e5);                  // Andromeda's satellites
  const bx = ANDROMEDA.x * 0.6, by = ANDROMEDA.y * 0.6;            // the group's barycentre lies nearer M31
  around(bx, by, 12, 1.4e6, 4.6e6);                                // isolated dwarfs (NGC 6822, IC 1613, WLM, …)
  return out;
})();

// ------------------------------------------------------------------ the Milky Way
/** Weight of the hi-res tile (1 at close scales, 0 once the main sprite is sharp enough). */
const tileW = (mppLy) => 1 - L.smoothstep(L.clamp((mppLy - 8) / 5));

/** Draw a canvas region so G (x, y) lands right: src rect clipped to the screen. */
function blit(c, img, sx0, sy0, sw, sh, dx, dy, dw, dh) {
  // clip destination to the screen, map back to the source
  const x0 = Math.max(0, dx), y0 = Math.max(0, dy), x1 = Math.min(W, dx + dw), y1 = Math.min(H, dy + dh);
  if (x1 <= x0 || y1 <= y0) return;
  const fx = sw / dw, fy = sh / dh;
  c.drawImage(img, sx0 + (x0 - dx) * fx, sy0 + (y0 - dy) * fy, (x1 - x0) * fx, (y1 - y0) * fy, x0, y0, x1 - x0, y1 - y0);
}

export function drawMilkyWay(c, v, k, boost = 1) {
  if (k <= 0.002) return;
  const mpp = v.cam.mpp, mppLy = mpp / LY;
  const gx = v.wx(GC.x), gy = v.wy(GC.y);
  const size = SPAN * LY / mpp;
  if (gx + size / 2 < -50 || gx - size / 2 > W + 50 || gy + size / 2 < -50 || gy - size / 2 > H + 50) return;
  c.save();
  c.globalCompositeOperation = 'lighter';
  c.imageSmoothingEnabled = true;
  c.imageSmoothingQuality = 'high';
  const tw = tileW(mppLy);
  const s = LY / mpp;                                      // px per ly
  const tx0 = gx + TILE.x0 * s, ty0 = gy + TILE.y0 * s, tw0 = (TILE.x1 - TILE.x0) * s, th0 = (TILE.y1 - TILE.y0) * s;
  if (tw < 1) {
    const mips = mainMips();
    const m = pickMip(mips, size);
    // inside the tile's rectangle the main sprite gives way to the tile; outside it, it stays at full strength
    c.globalAlpha = k * (1 - tw) * boost;
    blit(c, m, 0, 0, m.width, m.height, gx - size / 2, gy - size / 2, size, size);
    if (tw > 0) {
      c.save();
      c.beginPath(); c.rect(0, 0, W, H); c.rect(tx0, ty0, tw0, th0); c.clip('evenodd');
      c.globalAlpha = k * tw * boost;
      blit(c, m, 0, 0, m.width, m.height, gx - size / 2, gy - size / 2, size, size);
      c.restore();
    }
  } else if (!(tx0 <= 0 && ty0 <= 0 && tx0 + tw0 >= W && ty0 + th0 >= H)) {
    // the tile doesn't cover the frame: fill the rest from the main sprite
    const mips = mainMips(), m = pickMip(mips, size);
    c.save();
    c.beginPath(); c.rect(0, 0, W, H); c.rect(tx0, ty0, tw0, th0); c.clip('evenodd');
    c.globalAlpha = k * boost;
    blit(c, m, 0, 0, m.width, m.height, gx - size / 2, gy - size / 2, size, size);
    c.restore();
  }
  if (tw > 0) {
    const t = tileCanvas();
    c.globalAlpha = k * tw * boost;
    blit(c, t, 0, 0, t.width, t.height, tx0, ty0, tw0, th0);
  }
  c.restore();
  // a small galaxy needs a soft glow to read (Local Group scales)
  if (size < 160) {
    const g = L.clamp((160 - size) / 120);
    L.lightBlob(c, gx, gy, Math.max(10, size * 0.9), [255, 226, 190], 0.28 * g * k);
    L.lightBlob(c, gx, gy, Math.max(3, size * 0.2), [255, 240, 220], 0.5 * g * k);
  }
}

// ------------------------------------------------------------------ Local Group drawing
function sprite(c, mips, x, y, size, ang, q, a) {
  if (a <= 0.003 || x < -size - 40 || x > W + size + 40 || y < -size - 40 || y > H + size + 40) return;
  const m = pickMip(mips, size);
  c.save();
  c.globalCompositeOperation = 'lighter';
  c.globalAlpha = Math.min(1, a);
  c.imageSmoothingQuality = 'high';
  c.translate(x, y); c.rotate(ang); c.scale(1, q);
  c.drawImage(m, -size / 2, -size / 2, size, size);
  c.restore();
}

export function drawLocalGroup(c, v, k) {
  if (k <= 0.002) return;
  const mpp = v.cam.mpp;
  // Andromeda: bigger and brighter than the Milky Way, ring-like arms, big warm bulge
  const m31 = spiralSprite('m31', { S: 384, turns: 0.9, arms: 2, tint: [200, 212, 255], core: [255, 222, 175], bulge: 0.3, ring: 0.62, seed: 31, dustA: 0.8 });
  const ax = v.wx(ANDROMEDA.x), ay = v.wy(ANDROMEDA.y);
  const aSize = Math.max(14, M31_D / mpp * 1.08);
  L.lightBlob(c, ax, ay, Math.max(16, aSize * 1.3), [210, 215, 255], 0.12 * k);
  L.lightBlob(c, ax, ay, Math.max(16, aSize * 0.75), [255, 228, 196], 0.22 * k);
  sprite(c, m31, ax, ay, aSize, M31_PA, M31_Q, k * 1.15);
  L.lightBlob(c, ax, ay, Math.max(3.5, aSize * 0.08), [255, 240, 220], 0.75 * k);
  // M32 (compact elliptical) and M110 (dwarf elliptical)
  L.lightBlob(c, v.wx(M32.x), v.wy(M32.y), Math.max(2.5, 8000 * LY / mpp), [255, 232, 205], 0.55 * k);
  L.lightBlob(c, v.wx(M110.x), v.wy(M110.y), Math.max(3, 16000 * LY / mpp), [255, 226, 200], 0.4 * k);
  // Triangulum (M33): a loose, fairly face-on spiral, ~60,000 ly
  const m33 = spiralSprite('m33', { S: 256, turns: 1.0, arms: 2, tint: [190, 210, 255], core: [255, 232, 200], bulge: 0.1, seed: 33, dustA: 0.4 });
  const tx = v.wx(M33.x), ty = v.wy(M33.y), tSize = Math.max(9, 60000 * LY / mpp * 1.1);
  L.lightBlob(c, tx, ty, tSize * 0.7, [200, 215, 255], 0.16 * k);
  sprite(c, m33, tx, ty, tSize, 0.9, 0.7, k);
  // the Magellanic Clouds (irregulars; the LMC ~14,000 ly, the SMC ~7,000 ly)
  const lmc = irregularSprite('lmc', 7), smc = irregularSprite('smc', 8, [210, 220, 255]);
  const lx = v.wx(LMC.x), ly = v.wy(LMC.y), sx = v.wx(SMC.x), sy = v.wy(SMC.y);
  sprite(c, lmc, lx, ly, Math.max(6, 14000 * LY / mpp * 1.3), -0.3, 0.75, k * 0.95);
  sprite(c, smc, sx, sy, Math.max(4.5, 7000 * LY / mpp * 1.3), 0.6, 0.7, k * 0.85);
  L.lightBlob(c, lx, ly, Math.max(5, 9000 * LY / mpp), [210, 220, 255], 0.22 * k);
  L.lightBlob(c, sx, sy, Math.max(4, 5000 * LY / mpp), [210, 220, 255], 0.18 * k);
  // dwarfs: faint warm dots (never smaller than ~1.3 px, so they don't shimmer)
  c.save();
  c.globalCompositeOperation = 'lighter';
  for (const d of DWARFS) {
    const x = v.wx(d.x), y = v.wy(d.y);
    if (x < -10 || x > W + 10 || y < -10 || y > H + 10) continue;
    const s = Math.max(d.s, 3000 * LY / mpp);
    L.lightBlob(c, x, y, s * 3.2, [230, 225, 215], 0.18 * d.a * k);
    c.fillStyle = `rgba(240,236,228,${0.65 * d.a * k})`;
    c.beginPath(); c.arc(x, y, s * 0.6, 0, TAU); c.fill();
  }
  c.restore();
}

/** Milky Way reveal bloom (beat 21): a brief extra glow on the disc as it first fills the frame. */
function bloom(v) {
  const s = v.tl.scenes[21];
  if (!s) return 0;
  const t = v.gt - s.start;
  return 0.22 * Math.exp(-((t - 1.6) ** 2) / 0.9);
}

export default {
  draw(c, v) {
    const lf = v.cam.lf;
    const k = band(lf, 19.2, 19.9, 23.6, 24.4);
    if (k <= 0) return;
    const cams = smearCams(v, 4);
    for (const cam of cams) drawMilkyWay(c, cams.length > 1 ? viewFor(v, cam) : v, k / cams.length, 1 + bloom(v));
    const kl = band(lf, 21.35, 21.9, 23.6, 24.4);
    if (kl > 0) for (const cam of cams) drawLocalGroup(c, cams.length > 1 ? viewFor(v, cam) : v, kl / cams.length);
  },
};
