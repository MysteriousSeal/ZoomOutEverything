// Layer "cosmos" (lf 23.0 → 28), builder E.
// One deterministic universe of galaxies (layers/e-model.js) rendered as a multi-level point cloud (layers/e-render.js):
// resolved galaxies as sprites up close, a cosmic web of points further out, the edge of the observable universe
// (the CMB, layers/e-cmb.js), and a small "you" marker at the origin. Everything is a pure function of v.cam.
import * as L from '../../../../engine/runtime/lib.js';
import { band } from '../world.js';
import { R_OBS } from '../camera.js';
import { MLY, LEVELS, level, dwarfs, LOCAL_GROUP, DWARF_RHO } from './e-model.js';
import { begin, splat, splatOne, finish, drawSprites } from './e-render.js';
import { drawCMB } from './e-cmb.js';

const { W, H } = L;
export const GOLD = [255, 222, 150];

/** Exposure (mean surface brightness per Mly² of galaxies), by scale. */
function exposure(lf) {
  return L.ramp([[24.0, [0.05]], [24.9, [0.032]], [25.5, [0.034]], [26.3, [0.042]], [26.9, [0.06]], [27.2, [0.085]]], lf)[0];
}
/** Tone-curve gamma: deeper voids at the web scales. */
function gammaAt(lf) {
  return L.ramp([[24.2, [1.0]], [24.9, [1.25]], [25.5, [1.7]], [26.3, [2.05]], [26.9, [1.7]], [27.2, [1.3]]], lf)[0];
}

/** Screen-space distance range from the origin covered by the frame (Mly). */
function rangeOnScreen(cx, cy, mpp) {
  const x0 = cx - W / 2 * mpp, x1 = cx + W / 2 * mpp, y0 = cy - H / 2 * mpp, y1 = cy + H / 2 * mpp;
  const nx = Math.max(x0, Math.min(0, x1)), ny = Math.max(y0, Math.min(0, y1));
  const fx = Math.max(Math.abs(x0), Math.abs(x1)), fy = Math.max(Math.abs(y0), Math.abs(y1));
  return [Math.hypot(nx, ny), Math.hypot(fx, fy)];
}

const PPX = 1.6;   // max points per pixel drawn per level (the rest is compensated in brightness)

export function drawUniverse(c, v, opts = {}) {
  const lf = v.cam.lf;
  const kIn = band(lf, 22.88, 23.2);
  if (kIn <= 0) return;
  const cx = v.cam.x / MLY, cy = v.cam.y / MLY, mpp = v.cam.mpp / MLY;
  const B = exposure(lf), K = B / (mpp * mpp);
  const [rNear, rFar] = rangeOnScreen(cx, cy, mpp);
  const spriteMin = 1.6;
  begin();
  // dwarfs (only while they could be seen individually)
  const kd = band(lf, 22.9, 23.25, 24.25, 24.7) * kIn;
  if (kd > 0) {
    const o = dwarfs();
    const ppx = DWARF_RHO * mpp * mpp;
    splat(o, cx, cy, mpp, K, kd, PPX / ppx, spriteMin, rNear, rFar);
  }
  for (let k = 0; k < LEVELS.length; k++) {
    const Lv = LEVELS[k];
    const rIn = k === 0 ? 0 : LEVELS[k - 1].R * 0.55;
    if (rFar < rIn || rNear > Lv.R) continue;
    const o = level(k);
    const ppx = Lv.rho * mpp * mpp;
    splat(o, cx, cy, mpp, K, kIn, PPX / ppx, Lv.galaxies ? spriteMin : 0, rNear, rFar);
  }
  // the Local Group, once builder D's sprites have gone (lf > 24.4)
  const klg = band(lf, 24.2, 24.5) * kIn;
  if (klg > 0) {
    for (const [x, y, lum, t] of LOCAL_GROUP) {
      const I = Math.min(0.5 + 0.35 * lum, lum * K * 2.2) * klg;
      splatOne(W / 2 + (x - cx) / mpp, H / 2 + (y - cy) / mpp, I, t);
    }
  }
  const web = L.smoothstep(L.clamp((lf - 25.2) / 0.8)) * (1 - 0.5 * L.smoothstep(L.clamp((lf - 26.6) / 0.6)));
  finish(c, 1, 1 + 0.5 * web, 1, gammaAt(lf), 1, 1 - 0.55 * web, 1 + 1.1 * web, 0.55 * web);
  // resolved galaxies
  if (lf < 24.7) {
    if (kd > 0) drawSprites(c, dwarfs(), cx, cy, mpp, dwarfs().n, spriteMin, kd);
    if (rNear < LEVELS[0].R) drawSprites(c, level(0), cx, cy, mpp, level(0).n, spriteMin, kIn);
  }
  // the edge: the cosmic microwave background
  const rr = R_OBS / v.cam.mpp;
  drawCMB(c, v.wx(0), v.wy(0), rr, band(lf, 26.55, 26.85), opts.cmbGlow ?? 0);
}

/** "You": a small gold marker at the origin (from the Local Group's handoff to the edge of the universe). */
export function drawYou(c, v, k) {
  if (k <= 0) return;
  const x = v.wx(0), y = v.wy(0);
  c.save();
  c.globalAlpha = k;
  L.lightBlob(c, x, y, 22, GOLD, 0.5);
  c.fillStyle = 'rgba(255,248,230,1)';
  c.beginPath(); c.arc(x, y, 3.2, 0, Math.PI * 2); c.fill();
  c.strokeStyle = L.rgba(GOLD, 0.75);
  c.lineWidth = 1.6;
  c.beginPath(); c.arc(x, y, 9.5, 0, Math.PI * 2); c.stroke();
  c.restore();
}

export default {
  draw(c, v) {
    // the CMB brightens while beat 32 names it
    let glow = 0;
    const b32 = v.tl.scenes[32];
    if (b32) glow = L.ease.inOutCubic(L.prog(v.gt, b32.start + 0.3, 0.9)) * (1 - L.ease.inOutCubic(L.prog(v.gt, b32.end + 0.5, 1.5)));
    drawUniverse(c, v, { cmbGlow: glow });
    drawYou(c, v, band(v.cam.lf, 24.35, 24.6));
  },
};
