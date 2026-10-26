// Builder B — a world-anchored tile pyramid for the city ground. Level k has 2^k metres per tile pixel; tiles are
// 512 px, painted once by b-paint.js and kept in an LRU cache. Each frame draws level k = floor(log2 mpp) (downscaled
// ≤ 2x) and level k+1 over it with alpha = frac(log2 mpp), so LOD changes are continuous cross-fades, never pops.
import * as L from '../../../../engine/runtime/lib.js';
import { paint } from './b-paint.js';
import { logField } from '../camera.js';

const T = 512;
const CACHE = new Map();
const MAX = 150;
export const tileStats = { renders: 0, ms: 0 };

function tile(k, i, j) {
  const key = `${k}|${i}|${j}`;
  let cv = CACHE.get(key);
  if (cv) { CACHE.delete(key); CACHE.set(key, cv); return cv; }
  const t0 = performance.now();
  const m = Math.pow(2, k);
  cv = new OffscreenCanvas(T, T);
  const g = cv.getContext('2d');
  const x0 = i * T * m, y0 = j * T * m;
  g.setTransform(1 / m, 0, 0, 1 / m, -x0 / m, -y0 / m);
  paint(g, { x0, y0, x1: x0 + T * m, y1: y0 + T * m }, m);
  CACHE.set(key, cv);
  while (CACHE.size > MAX) CACHE.delete(CACHE.keys().next().value);
  tileStats.renders++; tileStats.ms += performance.now() - t0;
  return cv;
}

function drawLevel(c, v, k, alpha, clipR) {
  if (alpha <= 0.002) return;
  const m = Math.pow(2, k), span = T * m, mpp = v.cam.mpp;
  const X0 = v.cam.x - (L.W / 2) * mpp, Y0 = v.cam.y - (L.H / 2) * mpp;
  const X1 = v.cam.x + (L.W / 2) * mpp, Y1 = v.cam.y + (L.H / 2) * mpp;
  const i0 = Math.floor(X0 / span), i1 = Math.floor(X1 / span), j0 = Math.floor(Y0 / span), j1 = Math.floor(Y1 / span);
  c.save();
  c.globalAlpha *= alpha;
  c.imageSmoothingEnabled = true; c.imageSmoothingQuality = 'high';
  for (let i = i0; i <= i1; i++) {
    const sx0 = Math.round(v.wx(i * span)), sx1 = Math.round(v.wx((i + 1) * span));
    for (let j = j0; j <= j1; j++) {
      if (clipR && !clipR(i * span, j * span, (i + 1) * span, (j + 1) * span)) continue;
      const sy0 = Math.round(v.wy(j * span)), sy1 = Math.round(v.wy((j + 1) * span));
      c.drawImage(tile(k, i, j), sx0, sy0, sx1 - sx0, sy1 - sy0);
    }
  }
  c.restore();
}

/** Draw the ground for the current camera (both LOD levels). */
/** zoom speed in decades per second at this moment (pure function of time) */
export function zoomSpeed(v) {
  return Math.abs(logField(v.gt + 0.04, v.tl) - logField(v.gt - 0.04, v.tl)) / 0.08;
}
export function drawGround(c, v, { kMin = -8, kMax = 11 } = {}) {
  let lm = Math.log2(v.cam.mpp);
  // during the very fast rush back (beat 35, 4+ decades/s) motion blur hides detail: use coarser levels (2-4x fewer
  // pixels per tile, far fewer first paints), smoothly, so no single frame stalls on painting a whole new level
  const sp = zoomSpeed(v);
  lm += 2 * L.smoothstep(L.clamp((sp - 2.5) / 1.5));
  let k = Math.floor(lm), f = lm - k;
  if (k < kMin) { k = kMin; f = 0; }
  if (k > kMax) { k = kMax; f = 0; }
  drawLevel(c, v, k, 1);
  // smooth the cross-fade so it never reads as a step in contrast
  drawLevel(c, v, k + 1, L.smoothstep(f));
}
