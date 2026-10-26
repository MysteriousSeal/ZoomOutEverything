// Beat 6 — "In about twenty years, | cracked streets would turn to forest."
// Env greens the land (cityState.green). On top: a web of cracks races across the pavement (jagged, branching,
// moonlit edge + dark core), then canopy clumps (layered top-down crowns, lit from the upper right, soft shadow
// to the lower left) burst out of the cracks and along every street, spreading from the waterfront inward.
// Persists: the canopy stays in the world for the rest of the film (LOD: it fades out above ~16 m/px, where env's
// flat green land takes over); the cracks sink under the canopy.
import * as L from '../../../../engine/runtime/lib.js';
import { onLand, addLand, cityState, worldRect } from '../env.js';
import { inPark } from './s00-hook.js';
import { labelScrim } from './s04-pumps.js';
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
      const n = 5 + Math.floor(r() * 9);
      for (let k = 0; k < n; k++) {
        const len = 14 + r() * 30;
        let ang = base + (r() - 0.5) * 0.95;   // short jagged runs (fractured asphalt, not ruled lines)
        let nx = x + Math.cos(ang) * len, ny = y + Math.sin(ang) * len;
        // stay on the street: pull back toward its axis
        if (alongAve) nx = L.lerp(nx, sx, 0.62); else ny = L.lerp(ny, sy, 0.62);
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

// ------------------------------------------------------------------ the city still standing (beat 6 on)
// Twenty years on, the towers still stand: the forest takes the streets, the parks, the vacant lots and the roof
// gardens AROUND them. Top-down roofs (concrete tones, lit edge toward the sun, rooftop plant), each with its long
// shadow toward the lower left (the same sun as the bridges and the falling towers in beat 7). In beat 7 (env `ruin`)
// a share of them fall over the centuries: the roof and its shadow go, a rubble patch takes its place and greens over.
// Hero towers (HERO, Lower Manhattan) are drawn and felled by s07 on "towers"; this layer leaves their lots empty.
export const SH_TOWER = { x: -SUN_DIR.x * 0.95, y: -SUN_DIR.y * 0.95 };   // shadow offset per metre of height
// [x, y, w, d, height m, collapse time (beat-7 s), fall direction (rad)], footprints inside real blocks (x 15..245
// within an avenue cell, depth <= 56 m inside the 62 m block between two streets)
export const HERO = [
  [175, -1160, 80, 54, 210, 3.15, 2.4], [430, -1080, 74, 54, 250, 3.5, -0.6], [350, -680, 90, 54, 300, 3.75, 2.9],
  [610, -520, 78, 54, 240, 4.05, 0.4], [150, -920, 84, 54, 280, 4.3, 1.9],
].filter(([x, y]) => onLand(x, y));
const heroHit = (x0, y0, x1, y1) => HERO.some(([x, y, w, d]) => x0 < x + w / 2 + 4 && x1 > x - w / 2 - 4 && y0 < y + d / 2 + 4 && y1 > y - d / 2 - 4);
/** Visibility of the standing city (0..1): fades in with the daylight of beat 6, out above ~9 m/px. */
export function cityK(v) {
  const t6 = v.gt - B(v, 6);
  return L.ease.inOutCubic(L.prog(t6, -0.2, 1.0)) * (1 - L.ease.inOutCubic(L.clamp(L.invLerp(6, 10, v.cam.mpp))));
}
const dens = (x, y) => L.clamp(1.25 - Math.hypot(x + 500, (y + 6000) * 0.55) / 16000, 0.25, 1);
/** Buildings of block (i, j): [x0, y0, x1, y1, height, tone 0..1, fall threshold 0..1 (> 1 = never falls)]. Cached. */
const BLK = new Map();
function blockBuildings(i, j) {
  const key = i * 100003 + j;
  let out = BLK.get(key);
  if (out) return out;
  out = [];
  const bx0 = i * GRID.ave + GRID.aveW / 2, bx1 = (i + 1) * GRID.ave - GRID.aveW / 2;
  const by0 = j * GRID.st + GRID.stW / 2, by1 = (j + 1) * GRID.st - GRID.stW / 2;
  const cx = (bx0 + bx1) / 2, cy = (by0 + by1) / 2;
  if (!inPark(cx, cy) && (onLand(cx, cy) || onLand(bx0 + 20, cy) || onLand(bx1 - 20, cy))) {
    const D = dens(cx, cy);
    for (const [ry0, ry1, row] of [[by0 + 5, cy - 1.5, 0], [cy + 1.5, by1 - 5, 1]]) {   // set back 5 m: sidewalk trees
      let x = bx0 + 5, n = 0;
      while (x < bx1 - 12 && n < 12) {
        const h1 = hash(i * 31 + n, j * 7 + row, 1), h2 = hash(i + n * 13, j * 3 + row, 2), h3 = hash(i * 7 + n, j + row * 5, 3);
        const w = Math.min(bx1 - 5 - x, 22 + h1 * 40);
        // vacant lots, parking and low sheds: the forest takes them (fewer in the dense core)
        const vacant = h2 < 0.3 - 0.12 * D;
        // a tall tower may take both rows of the block
        const tall = !row && h3 > 1 - 0.16 * D;
        const yy0 = ry0, yy1 = tall ? by1 - 5 : ry1;
        if (!vacant && w > 9 && onLand(x + w / 2, (yy0 + yy1) / 2) && !heroHit(x, yy0, x + w, yy1)) {
          const H = tall ? 90 + 230 * D * hash(i, j + n, 4) : 10 + (18 + 70 * D) * h1 * h1 + 8 * h2;
          out.push([x + 0.8, yy0, x + w - 0.8, yy1, H, h3, tall ? 0.35 + 0.9 * hash(n, i, j) : 0.3 + 1.2 * hash(j, n, i)]);
        }
        x += w; n++;
      }
    }
  }
  BLK.set(key, out);
  if (BLK.size > 9000) BLK.delete(BLK.keys().next().value);
  return out;
}
/** Draw the standing (and, in beat 7, falling) city in the view. Batched: one shadow path, a few roof tone buckets. */
function drawCity(ctx, v, st, k) {
  const m = v.cam.mpp;
  const R = worldRect(v, 60);
  const i0 = Math.floor(R.x0 / GRID.ave), i1 = Math.ceil(R.x1 / GRID.ave), j0 = Math.floor(R.y0 / GRID.st), j1 = Math.ceil(R.y1 / GRID.st);
  if ((i1 - i0) * (j1 - j0) > 6000) return { roofs: new Path2D(), edges: new Path2D(), col: 'rgba(0,0,0,0)', edgeCol: 'rgba(0,0,0,0)' };
  const NB = 5, buckets = Array.from({ length: NB }, () => []), rubble = [], fallen = [];
  const shadow = new Path2D(), edges = new Path2D(), plant = new Path2D(), tallP = new Path2D(), tallE = new Path2D();
  const ex = Math.max(0.8, v.ws(1.6));
  for (let i = i0; i <= i1; i++) {
    for (let j = j0; j <= j1; j++) {
      for (const b of blockBuildings(i, j)) {
        const [x0, y0, x1, y1, H, tone, fth] = b;
        // beat 7: this building falls when the city's ruin passes its threshold (over ~0.6 of the ruin span)
        const fall = L.smoothstep(L.clamp((st.ruin - fth) / 0.25));
        if (fall >= 1) { rubble.push(b); continue; }
        const h = H * (1 - fall);
        const ox = SH_TOWER.x * h, oy = SH_TOWER.y * h;
        // the shadow hull of an axis-aligned box lit from the upper right: B, C, C', D', A', A
        shadow.moveTo(v.wx(x1), v.wy(y0)); shadow.lineTo(v.wx(x1), v.wy(y1)); shadow.lineTo(v.wx(x1 + ox), v.wy(y1 + oy));
        shadow.lineTo(v.wx(x0 + ox), v.wy(y1 + oy)); shadow.lineTo(v.wx(x0 + ox), v.wy(y0 + oy)); shadow.lineTo(v.wx(x0), v.wy(y0)); shadow.closePath();
        if (fall > 0) { fallen.push([b, fall]); continue; }
        buckets[Math.min(NB - 1, Math.floor(tone * NB))].push(b);
        const X0 = v.wx(x0), X1 = v.wx(x1), Y0 = v.wy(y0), Y1 = v.wy(y1);
        if (H > 45) {
          tallP.rect(X0, Y0, X1 - X0, Y1 - Y0);
          const e = Math.min(ex, (Y1 - Y0) / 3), f = Math.min(ex, (X1 - X0) / 3);
          tallE.rect(X0, Y0, X1 - X0, e); tallE.rect(X1 - f, Y0, f, Y1 - Y0);
        }
        // sunlit parapet: top and right edges
        edges.rect(X0, Y0, X1 - X0, Math.min(ex, (Y1 - Y0) / 3)); edges.rect(X1 - Math.min(ex, (X1 - X0) / 3), Y0, Math.min(ex, (X1 - X0) / 3), Y1 - Y0);
        // rooftop plant room / water tank (only once it reads)
        if (X1 - X0 > 9 && Y1 - Y0 > 7) { const pw = (X1 - X0) * 0.3, ph = (Y1 - Y0) * 0.32; plant.rect(L.lerp(X0, X1, 0.22 + 0.4 * tone), L.lerp(Y0, Y1, 0.3), pw, ph); }
      }
    }
  }
  ctx.save();
  ctx.globalAlpha = k;
  ctx.fillStyle = `rgba(2,6,4,${0.42 + 0.1 * st.day})`;
  ctx.fill(shadow, 'nonzero');
  // rubble of the fallen: a low grey-brown heap, already greening at the edges
  const rub = L.mix([58, 56, 50], [104, 98, 86], st.day);
  if (rubble.length) {
    ctx.fillStyle = L.rgba(L.mix(rub, [44, 60, 38], 0.35), 0.85);
    ctx.beginPath();
    for (const [x0, y0, x1, y1] of rubble) ctx.rect(v.wx(x0 - 3), v.wy(y0 - 2), (x1 - x0 + 6) / m, (y1 - y0 + 4) / m);
    ctx.fill();
  }
  const roofBase = L.mix([46, 50, 58], [128, 126, 120], 0.25 + 0.75 * st.day);
  const moss = 0.12 * st.green + 0.22 * st.ruin;
  // roof materials: tar, grey concrete, pale concrete, brownstone, a roof already greened over
  const MAT = [[0.55, [0, 0, 0]], [0.1, [0, 0, 0]], [0.18, [255, 250, 240]], [0.3, [120, 74, 54]], [0.55, [52, 74, 40]]];
  for (let q = 0; q < NB; q++) {
    if (!buckets[q].length) continue;
    const tone = L.mix(L.mix(roofBase, MAT[q][1], MAT[q][0] * (q === 4 ? st.green : 1)), [70, 82, 58], moss);
    ctx.fillStyle = L.rgba(L.mix(tone, [96, 70, 50], 0.18 * st.ruin));
    ctx.beginPath();
    for (const [x0, y0, x1, y1] of buckets[q]) ctx.rect(v.wx(x0), v.wy(y0), (x1 - x0) / m, (y1 - y0) / m);
    ctx.fill();
  }
  // falling: the roof sags and darkens into the dust (s07 adds the hero collapses' dust)
  for (const [[x0, y0, x1, y1], f] of fallen) {
    ctx.fillStyle = L.rgba(L.mix(roofBase, rub, f), 1 - 0.3 * f);
    const sh = (1 - f) * 0.15;
    ctx.fillRect(v.wx(x0 - (x1 - x0) * sh), v.wy(y0), (x1 - x0) * (1 + sh) / m, (y1 - y0) / m);
  }
  ctx.fillStyle = L.rgba(L.mix(roofBase, [255, 244, 222], 0.35), 0.55);
  ctx.fill(edges);
  ctx.fillStyle = L.rgba(L.mix(roofBase, [0, 0, 0], 0.3), 0.8);
  ctx.fill(plant);
  ctx.restore();
  // the towers' roofs (re-laid above the over-canopy pass): their own concrete tone and sunlit parapet
  const tcol = L.mix(L.mix(roofBase, [70, 80, 100], 0.18), [70, 82, 58], moss * 0.5);
  return { roofs: tallP, edges: tallE, col: L.rgba(tcol), edgeCol: L.rgba(L.mix(roofBase, [255, 244, 222], 0.35), 0.55) };
}

// crown sprites (lazy, deterministic): 4 variants, 160 px (~1-1.6 m per px), each a patch of young woodland seen from
// above: many SMALL crowns (3-10 m) of mixed species, irregular lobed outlines, matte foliage (no glossy highlight),
// lit on the sun side, dark gaps of understory between them, soft edges (no disc outline)
let SPR = null;
function sprites() {
  if (SPR) return SPR;
  SPR = [];
  const greens = [[44, 66, 36], [56, 76, 40], [36, 58, 38], [70, 82, 44], [48, 62, 44], [82, 90, 52], [40, 52, 34], [62, 74, 50]];
  for (let s = 0; s < 4; s++) {
    const cv = new OffscreenCanvas(160, 160), g = cv.getContext('2d'), r = L.rng(900 + s);
    // understory: an irregular dark mass that holds the crowns together (soft, lobed)
    for (let q = 0; q < 14; q++) {
      const a = r() * Math.PI * 2, d = Math.sqrt(r()) * 40, rr = 16 + r() * 18;
      const x = 80 + Math.cos(a) * d, y = 80 + Math.sin(a) * d;
      const gr = g.createRadialGradient(x, y, 0, x, y, rr);
      gr.addColorStop(0, 'rgba(14,26,16,0.55)'); gr.addColorStop(1, 'rgba(14,26,16,0)');
      g.fillStyle = gr; g.beginPath(); g.arc(x, y, rr, 0, Math.PI * 2); g.fill();
    }
    const n = 60 + Math.floor(r() * 25);
    const crowns = [];
    for (let i = 0; i < n * 3 && crowns.length < n; i++) {
      const a = r() * Math.PI * 2, d = Math.pow(r(), 0.65) * 58;
      const x = 80 + Math.cos(a) * d, y = 80 + Math.sin(a) * d * (0.85 + 0.3 * r());
      const rr = (3 + r() * 4.5) * (1 - 0.35 * (d / 58));          // smaller toward the patch edge (young growth)
      crowns.push([x, y, rr, greens[Math.floor(r() * greens.length)], r()]);
    }
    crowns.sort((p, q) => p[1] - q[1]);
    const sx = SUN_DIR.x, sy = SUN_DIR.y;
    for (const [x, y, rr] of crowns) {   // each crown's shadow on the ground / lower crowns (toward the lower left)
      g.fillStyle = 'rgba(0,6,2,0.32)';
      g.beginPath(); g.ellipse(x - sx * rr * 0.7, y - sy * rr * 0.7, rr * 1.05, rr * 0.95, 0, 0, Math.PI * 2); g.fill();
    }
    for (const [x, y, rr, col, h] of crowns) {
      // lobed outline: 4-6 overlapping leaf clusters
      const lobes = 4 + Math.floor(h * 3);
      g.fillStyle = L.rgba(L.mix(col, [10, 18, 12], 0.25));
      for (let k = 0; k < lobes; k++) {
        const a = (k / lobes) * Math.PI * 2 + h * 6, d = rr * 0.45;
        g.beginPath(); g.arc(x + Math.cos(a) * d, y + Math.sin(a) * d, rr * (0.55 + 0.15 * r()), 0, Math.PI * 2); g.fill();
      }
      g.beginPath(); g.arc(x, y, rr * 0.7, 0, Math.PI * 2); g.fill();
      // matte sun side: a lighter crescent of leaf clusters toward the upper right (no specular point)
      g.fillStyle = L.rgba(L.mix(col, [150, 170, 110], 0.28), 0.8);
      for (let k = 0; k < 3; k++) {
        const a = Math.atan2(sy, sx) + (r() - 0.5) * 1.4, d = rr * (0.3 + 0.25 * r());
        g.beginPath(); g.arc(x + Math.cos(a) * d, y + Math.sin(a) * d, rr * (0.28 + 0.14 * r()), 0, Math.PI * 2); g.fill();
      }
      // leaf texture: tiny dark gaps
      for (let k = 0; k < 4; k++) {
        const a = r() * 6.283, d = r() * rr * 0.8;
        g.fillStyle = 'rgba(4,12,6,0.22)';
        g.beginPath(); g.arc(x + Math.cos(a) * d, y + Math.sin(a) * d, 0.6 + r() * 1.1, 0, Math.PI * 2); g.fill();
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
  chapter: { num: '06', title: 'Forest', sub: 'About 20 years' },
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
    const ck = cityK(v);
    if (ck <= 0.005) return;
    drawForest(ctx, v);                                   // streets, lots, parks: under the roofs
    const tall = drawCity(ctx, v, cityState(v), ck);      // the city still standing
    // trees overhang the streets and take the low roofs, never the towers: the tall roofs are re-laid on top
    drawForest(ctx, v, true);
    ctx.save();
    ctx.globalAlpha = ck;
    ctx.fillStyle = tall.col;
    ctx.fill(tall.roofs);
    ctx.fillStyle = tall.edgeCol;
    ctx.fill(tall.edges);
    ctx.restore();
  },

  drawOverlay(ctx, v) {
    const k = L.enter(v.t, T_LABEL, 0.55) * v.k * (1 - L.ease.inCubic(L.prog(v.t, v.d - 0.4, 0.35)));   // out by the beat end
    if (k > 0) labelScrim(ctx, 330, 545, k);   // the overgrown city is busy: a soft dark scrim keeps the label clean
    L.bigLabel(ctx, { x: 64, y: 560, big: '≈ 20 YEARS', small: 'streets start turning to forest', k, accent: v.accent, size: 120 });
  },
};

function drawForest(ctx, v, over = false) {
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
    if (!over) {
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
        for (const [col, w, o] of [[`rgba(6,8,8,${0.82 * sink * lod})`, wl * 1.1 * cw, 0.5], [`rgba(196,194,182,${0.14 * sink * lod})`, wl * 0.55 * cw, -0.6]]) {   // dark fissure, a faint dry lip
          ctx.strokeStyle = col; ctx.lineWidth = w;
          ctx.beginPath();
          for (const [a, b2, c2, d2] of list) { ctx.moveTo(a - o, b2 + o); ctx.lineTo(c2 - o, d2 + o); }
          ctx.stroke();
        }
      }
    }
    }
    ctx.restore();
    // ---- canopy (big patches drawn first, small crack-born clumps on top). The `over` pass (drawn above the city,
    // never over the tall towers) is a sparser subset: trees overhanging the streets and taking low roofs and lots.
    const S = sprites();
    for (let ti = 0; ti < TREES.length; ti++) {
      const [x, y, r, s, b] = TREES[ti];
      if (over && hash(ti, 3, 91) > (r < 64 ? 0.9 : 0.42)) continue;
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
}
