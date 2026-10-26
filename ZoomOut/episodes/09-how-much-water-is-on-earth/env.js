// Environment for "How Much Water Is on Earth, Really?". Owned by the orchestrator — builders: read, don't edit.
// Space, stars, and a lit Earth sphere (ocean + atmosphere + terminator). Continents are drawn by scenes/s00-hook.js.
import * as L from '../../../engine/runtime/lib.js';
import { beatCues, scaleBar, stars, topBar } from '../../../engine/runtime/kit.js';
import { R_EARTH } from './camera.js';

const { W, H } = L;
export const ACCENT = [80, 180, 255];
export { R_EARTH };
export const SUN_DIR = { x: -0.62, y: -0.48 };   // light comes from the upper left

/** Draw a lit sphere (water balls, Moon outline…): base colour, rim light, terminator shading. */
export function sphere(c, v, x, y, d, base = [40, 120, 220], { alpha = 1, rim = [150, 210, 255], spec = true } = {}) {
  const cx = v.wx(x), cy = v.wy(y), r = Math.max(0.5, v.ws(d / 2));
  c.save();
  c.globalAlpha *= alpha;
  const lx = cx + SUN_DIR.x * r * 0.45, ly = cy + SUN_DIR.y * r * 0.45;
  const g = c.createRadialGradient(lx, ly, r * 0.05, cx, cy, r);
  g.addColorStop(0, L.rgba(L.mix(base, [255, 255, 255], 0.35)));
  g.addColorStop(0.55, L.rgba(base));
  g.addColorStop(1, L.rgba(L.mix(base, [0, 0, 0], 0.7)));
  c.fillStyle = g;
  c.beginPath(); c.arc(cx, cy, r, 0, Math.PI * 2); c.fill();
  c.strokeStyle = L.rgba(rim, 0.55);
  c.lineWidth = Math.max(1, r * 0.02);
  c.beginPath(); c.arc(cx, cy, r, Math.PI * 0.9, Math.PI * 1.6); c.stroke();
  if (spec && r > 8) L.lightBlob(c, cx + SUN_DIR.x * r * 0.5, cy + SUN_DIR.y * r * 0.5, r * 0.35, [255, 255, 255], 0.25);
  c.restore();
}

export function drawBackground(c, v) {
  const g = c.createRadialGradient(W / 2, H * 0.45, 40, W / 2, H * 0.5, H * 0.85);
  g.addColorStop(0, '#0a0d16'); g.addColorStop(1, '#020308');
  c.fillStyle = g;
  c.fillRect(0, 0, W, H);
  stars(c, v, 0.6, 150, 9);
  // Earth (always in the world; culled when off-screen)
  const r = v.ws(R_EARTH), cx = v.wx(0), cy = v.wy(0);
  if (cx + r < -50 || cx - r > W + 50 || cy + r < -50 || cy - r > H + 50) return;
  L.lightBlob(c, cx, cy, r * 1.25, [70, 140, 255], 0.22);
  sphere(c, v, 0, 0, 2 * R_EARTH, [22, 78, 160], { rim: [140, 200, 255] });
}
export function drawForeground() {}

export function drawHud(c, v) {
  topBar(c, v, ACCENT);
  scaleBar(c, v, { k: L.ease.outCubic(L.prog(v.gt, 1.2, 0.6)) });
}
export const cues = (tl) => beatCues(tl, { gain: 0.18, pitch: 1.0 });
