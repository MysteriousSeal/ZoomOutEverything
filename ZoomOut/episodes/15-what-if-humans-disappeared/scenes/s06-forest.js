// Beat 6 — "In about twenty years, | cracked streets would turn to forest."
// Env greens the land (cityState.green). On top: a web of cracks races across the pavement (jagged, branching,
// moonlit edge + dark core), then canopy clumps (layered top-down crowns, lit from the upper right, soft shadow
// to the lower left) burst out of the cracks and along every street, spreading from the waterfront inward.
// Persists: the canopy stays in the world for the rest of the film (LOD: it fades out above ~16 m/px, where env's
// flat green land takes over); the cracks sink under the canopy.
import * as L from '../../../../engine/runtime/lib.js';
import { onLand, addLand } from '../env.js';
import { GRID, SUN_DIR } from '../camera.js';

const B = (v, b) => v.tl.scenes[b].start;
const REGION = { x0: -3200, x1: 5000, y0: -8900, y1: 4400 };   // covers the beat-6 and beat-7 frames (edges feathered)
const T_CRACK = [0.75, 1.9];   // cracks web out ("twenty years ... cracked streets")
const T_TREES = [1.85, 1.9];    // canopy bursts out ("turn to forest"), staggered over this window
const T_LABEL = 0.75;

const hash = (a, b, s = 0) => { const n = Math.sin(a * 127.1 + b * 311.7 + s * 74.7) * 43758.5453; return n - Math.floor(n); };

// ------------------------------------------------------------------ cracks (precomputed, deterministic)
// Cracks start at street crossings and run along the streets (jagged, pulled back to the street axis), with short
// branches breaking off into the blocks. segments: [x0, y0, x1, y1, birth 0..0.9 (within T_CRACK), main?]
const CRACKS = (() => {
  const r = L.rng(6060), segs = [];
  let tries = 0, seeds = 0;
  while (seeds < 260 && tries < 4000) {
    tries++;
    const i = Math.round(L.lerp(REGION.x0, REGION.x1, r()) / GRID.ave), j = Math.round(L.lerp(REGION.y0, REGION.y1, r()) / GRID.st);
    const sx = i * GRID.ave, sy = j * GRID.st;
    if (!onLand(sx, sy)) continue;
    seeds++;
    const b0 = r() * 0.5;
    for (const dir of [0, 1]) {
      if (dir && r() < 0.35) continue;
      const alongAve = r() < 0.45;
      const base = (alongAve ? Math.PI / 2 : 0) + (dir ? Math.PI : 0);
      let x = sx, y = sy, birth = b0;
      const n = 3 + Math.floor(r() * 6);
      for (let k = 0; k < n; k++) {
        const len = 28 + r() * 50;
        let ang = base + (r() - 0.5) * 0.38;   // straight, angular runs (fractured asphalt, not roots)
        let nx = x + Math.cos(ang) * len, ny = y + Math.sin(ang) * len;
        // stay on the street: pull back toward its axis
        if (alongAve) nx = L.lerp(nx, sx, 0.3); else ny = L.lerp(ny, sy, 0.3);
        if (!onLand(nx, ny)) break;
        const b1 = birth + 0.05 + r() * 0.03;
        segs.push([x, y, nx, ny, birth, 1]);
        if (r() < 0.14) {   // an occasional straight branch into the block
          let bx = nx, by = ny, ba = base + (r() < 0.5 ? -1 : 1) * (0.9 + r() * 0.5), bb = b1;
          for (let q = 0; q < 1 + Math.floor(r() * 2); q++) {
            ba += (r() - 0.5) * 0.25;
            const l2 = 14 + r() * 26, ex = bx + Math.cos(ba) * l2, ey = by + Math.sin(ba) * l2;
            segs.push([bx, by, ex, ey, bb, 0]);
            bx = ex; by = ey; bb += 0.04;
          }
        }
        x = nx; y = ny; birth = b1;
      }
    }
  }
  const maxB = Math.max(...segs.map((q) => q[4]));
  for (const q of segs) q[4] = (q[4] / maxB) * 0.9;
  return segs;
})();

// ------------------------------------------------------------------ canopy clumps
// [x, y, radius m, sprite, birth 0..1 (within T_TREES)]
const TREES = (() => {
  const out = [];
  const i0 = Math.floor(REGION.x0 / GRID.ave), i1 = Math.ceil(REGION.x1 / GRID.ave);
  const j0 = Math.floor(REGION.y0 / GRID.st), j1 = Math.ceil(REGION.y1 / GRID.st);
  for (let i = i0; i < i1; i++) {
    for (let j = j0; j < j1; j++) {
      for (let q = 0; q < 2; q++) {
        const h1 = hash(i, j, 11 + q), h2 = hash(i, j, 12 + q), h3 = hash(i, j, 13 + q);
        const x = i * GRID.ave + (q + h2) * GRID.ave * 0.5, y = j * GRID.st + h3 * GRID.st;
        if (!onLand(x, y)) continue;
        // spread: from the waterfront inward, with noise
        let shore = 0;
        for (const d of [150, 350, 700]) if (!onLand(x + d, y) || !onLand(x - d, y) || !onLand(x, y + d) || !onLand(x, y - d)) { shore = 1 - d / 900; break; }
        const birth = L.clamp(0.62 - 0.45 * shore + (hash(i, j, 14 + q) - 0.5) * 0.55, 0, 0.98);
        out.push([x, y, 70 + h1 * 45, Math.floor(hash(i, j, 15 + q) * 4), birth]);
      }
    }
  }
  // trees burst out of the cracks first: small clumps at crack joints
  CRACKS.forEach(([, , x, y, b, main], k) => { if (main && k % 3 === 0) out.push([x, y, 34 + hash(k, 1, 7) * 26, k % 4, L.clamp(b * 0.35)]); });
  // big ones last so the small crack-born clumps stay visible on top early on
  return out.sort((a, b) => b[2] - a[2]);
})();

// crown sprites (lazy, deterministic): 4 variants, 160 px, each a patch of 10-14 crowns lit from the sun side
let SPR = null;
function sprites() {
  if (SPR) return SPR;
  SPR = [];
  const greens = [[38, 70, 40], [50, 84, 42], [30, 60, 44], [62, 88, 46], [44, 66, 36], [72, 92, 50]];
  for (let s = 0; s < 4; s++) {
    const cv = new OffscreenCanvas(160, 160), g = cv.getContext('2d'), r = L.rng(900 + s);
    const n = 10 + Math.floor(r() * 5);
    const crowns = Array.from({ length: n }, (_, i) => {
      const a = r() * Math.PI * 2, d = Math.sqrt(r()) * 46;
      return [80 + Math.cos(a) * d, 80 + Math.sin(a) * d, 12 + r() * 13, greens[Math.floor(r() * greens.length)]];
    }).sort((p, q) => p[1] - q[1]);
    for (const [x, y, rr] of crowns) {   // soft shadow to the lower left
      g.fillStyle = 'rgba(0,4,2,0.3)';
      g.beginPath(); g.arc(x - SUN_DIR.x * 6, y - SUN_DIR.y * 6, rr * 1.05, 0, Math.PI * 2); g.fill();
    }
    for (const [x, y, rr, col] of crowns) {
      const gr = g.createRadialGradient(x + SUN_DIR.x * rr * 0.4, y + SUN_DIR.y * rr * 0.4, rr * 0.05, x, y, rr);
      gr.addColorStop(0, L.rgba(L.mix(col, [175, 200, 130], 0.5)));
      gr.addColorStop(0.5, L.rgba(col));
      gr.addColorStop(1, L.rgba(L.mix(col, [6, 14, 10], 0.6)));
      g.fillStyle = gr;
      g.beginPath(); g.arc(x, y, rr, 0, Math.PI * 2); g.fill();
      for (let k = 0; k < 7; k++) {   // leaf clumps
        const a = r() * 6.283, d = r() * rr * 0.75;
        g.fillStyle = r() < 0.5 ? 'rgba(190,215,140,0.14)' : 'rgba(0,10,4,0.18)';
        g.beginPath(); g.arc(x + Math.cos(a) * d, y + Math.sin(a) * d, 1.5 + r() * 3.5, 0, Math.PI * 2); g.fill();
      }
    }
    SPR.push(cv);
  }
  return SPR;
}

/** Canopy growth 0..1 for a tree born at `birth` (0..1) at global time. */
const treeK = (v, birth) => L.prog(v.gt - B(v, 6), T_TREES[0] + birth * T_TREES[1], 0.75);

export default {
  beat: 6,
  chapter: { num: '06', title: 'Forest', sub: 'about 20 years' },
  captions: true,
  layer: 3,
  cues(d) {
    return [
      { t: T_CRACK[0], name: 'creak', gain: 0.3, pitch: 1.3 },
      { t: T_CRACK[0] + 0.5, name: 'creak', gain: 0.24, pitch: 1.6 },
      { t: T_LABEL, name: 'swish', gain: 0.18, pitch: 1.1 },
      { t: T_TREES[0], name: 'swell', gain: 0.3, pitch: 1.0 },
      { t: T_TREES[0] + 0.9, name: 'bloom', gain: 0.32, pitch: 1.0 },
    ];
  },

  drawWorld(ctx, v) {
    const t6 = v.gt - B(v, 6);
    if (t6 < T_CRACK[0] - 0.05) return;
    const m = v.cam.mpp;
    const lod = 1 - L.ease.inOutCubic(L.clamp(L.invLerp(5.2, 9, m)));   // gone before the canopy's bounds can enter the frame
    if (lod <= 0) return;
    const R = { x0: v.cam.x - (L.W / 2 + 80) * m, x1: v.cam.x + (L.W / 2 + 80) * m, y0: v.cam.y - (L.H * v.cam.anchor + 80) * m, y1: v.cam.y + (L.H * (1 - v.cam.anchor) + 80) * m };
    ctx.save();
    // pavement and cracks live on land only
    ctx.beginPath();
    addLand(ctx, v);
    ctx.save();
    ctx.clip('nonzero');
    // ---- the pavement grid shows through first (env's streets are faint here), then the forest swallows it
    const pave = L.ease.outCubic(L.prog(t6, 0.0, 0.8)) * (1 - L.ease.inOutCubic(L.prog(t6, T_TREES[0] + 0.4, 1.4))) * lod;
    if (pave > 0.01) {
      // faint, and fading toward the frame edges so it never reads as graph paper
      const pg = ctx.createRadialGradient(L.W / 2, L.H * 0.47, 0, L.W / 2, L.H * 0.47, L.H * 0.62);
      pg.addColorStop(0, `rgba(150,156,150,${0.1 * pave})`); pg.addColorStop(0.5, `rgba(150,156,150,${0.06 * pave})`); pg.addColorStop(1, 'rgba(150,156,150,0)');
      ctx.strokeStyle = pg;
      for (const [axis, step, wm] of [['x', GRID.ave, GRID.aveW], ['y', GRID.st, GRID.stW]]) {
        ctx.lineWidth = Math.max(1, v.ws(wm) * 0.75);
        ctx.beginPath();
        if (axis === 'x') for (let k = Math.ceil(R.x0 / step); k * step <= R.x1; k++) { const x = v.wx(k * step); ctx.moveTo(x, 0); ctx.lineTo(x, L.H); }
        else for (let k = Math.ceil(R.y0 / step); k * step <= R.y1; k++) { const y = v.wy(k * step); ctx.moveTo(0, y); ctx.lineTo(L.W, y); }
        ctx.stroke();
      }
    }
    // ---- cracks: a pale fractured lip over a dark core, drawn in as they grow; they sink under the canopy
    const ck = L.prog(t6, T_CRACK[0], T_CRACK[1]);
    const sink = 1 - L.ease.inOutCubic(L.prog(t6, T_TREES[0] + 0.5, 1.8));
    if (sink > 0.01 && ck > 0) {
      ctx.lineCap = 'butt'; ctx.lineJoin = 'miter';
      const main = [], branch = [];
      for (const [x0, y0, x1, y1, b, mn] of CRACKS) {
        if (Math.max(x0, x1) < R.x0 || Math.min(x0, x1) > R.x1 || Math.max(y0, y1) < R.y0 || Math.min(y0, y1) > R.y1) continue;
        const u = L.clamp((ck - b) / 0.08);
        if (u <= 0) continue;
        (mn ? main : branch).push([v.wx(x0), v.wy(y0), v.wx(L.lerp(x0, x1, u)), v.wy(L.lerp(y0, y1, u))]);
      }
      const cw = L.clamp(5 / m, 0.7, 1.5);
      for (const [list, wl] of [[main, 1.7], [branch, 1.0]]) {
        for (const [col, w, o] of [[`rgba(14,16,18,${0.55 * sink * lod})`, wl * 1.3 * cw, 0.7], [`rgba(226,224,212,${0.65 * sink * lod})`, wl * 0.8 * cw, -0.4]]) {
          ctx.strokeStyle = col; ctx.lineWidth = w;
          ctx.beginPath();
          for (const [a, b2, c2, d2] of list) { ctx.moveTo(a - o, b2 + o); ctx.lineTo(c2 - o, d2 + o); }
          ctx.stroke();
        }
      }
    }
    ctx.restore();
    // ---- canopy (big patches drawn first, small crack-born clumps on top)
    const S = sprites();
    for (const [x, y, r, s, b] of TREES) {
      if (x < R.x0 - r || x > R.x1 + r || y < R.y0 - r || y > R.y1 + r) continue;
      const k = treeK(v, b);
      if (k <= 0) continue;
      const sc = L.ease.outBack(k, 1.5);
      const px = v.ws(r) * 2.3 * sc;
      if (px < 2) continue;
      // feather toward the generated region's bounds so its edge never reads as a rectangle
      const edge = Math.min(x - REGION.x0, REGION.x1 - x, y - REGION.y0, REGION.y1 - y);
      const fe = L.smoothstep(L.clamp(edge / 1400));
      if (fe <= 0.01) continue;
      ctx.globalAlpha = L.clamp(k * 3) * lod * fe;
      ctx.drawImage(S[s], v.wx(x) - px / 2, v.wy(y) - px / 2, px, px);
    }
    ctx.globalAlpha = 1;
    ctx.restore();
  },

  drawOverlay(ctx, v) {
    const k = L.enter(v.t, T_LABEL, 0.55) * v.k;
    L.bigLabel(ctx, { x: 64, y: 560, big: '≈ 20 YEARS', small: 'streets turn to forest', k, accent: v.accent, size: 120 });
  },
};
