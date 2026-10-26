// Beat 1 — $1,000,000 = 100 straps in an open aluminium briefcase (≈ 10 kg).
// The 15 straps from beat 0 are the bottom layer; the case walls rise around them, the lid swings up
// and the remaining 85 straps cascade in by layers while the camera pulls back. A sheen sweeps the
// metal as the narrator says "briefcase". Exports drawBriefcase() for s2, where the case rides the pallet.
import * as L from '../../../../engine/runtime/lib.js';
import { isoPt } from '../env.js';
import { BW, BD, SH, drawStrap, drawBottomLayer, bottomLanded, softShadow, poly } from './s0-stack.js';

// case geometry (metres): interior 0..0.47 (x) × 0..0.334 (z), the straps sit 3 × 5 per layer
export const X0 = -0.014, X1 = 0.484, Z0 = -0.014, Z1 = 0.348;
const T = 0.012;            // wall
export const HC = 0.092;    // base depth
const HL = 0.034;           // lid depth
export const LID_OPEN = (100 * Math.PI) / 180;

const ALU_TOP = [208, 214, 216], ALU_L = [150, 158, 163], ALU_R = [104, 111, 117];
const LINING = [34, 39, 42], LINING_L = [56, 62, 66], LINING_R = [44, 49, 53];
const HANDLE = [26, 28, 30];

// ------------------------------------------------------------------ the 100 straps
// layer 0 = the beat-0 bottom layer; layers 1..5 full (15); layer 6 = the back two columns (10)
const C0 = 0.42, LD = 0.24, DROP = 0.3;
export const STRAPS = (() => {
  const out = [];
  for (let l = 1; l <= 6; l++) {
    for (let s = 0; s <= 6; s++) for (let j = 0; j < 5; j++) {
      const i = s - j;
      if (i < 0 || i > 2 || (l === 6 && i === 2)) continue;
      out.push({ l, i, j, t0: C0 + (l - 1) * LD + s * 0.034 + j * 0.006 });
    }
  }
  return out;
})();
export const CASCADE_END = Math.max(...STRAPS.map((s) => s.t0)) + DROP;
/** Straps in the case at beat-1 time t1; d0 = beat-0 duration (the bottom layer finishes landing in beat 1). */
export const strapsIn = (t1, d0) => bottomLanded(d0 + t1, d0) + STRAPS.reduce((n, s) => n + (t1 >= s.t0 + DROP * 0.8 ? 1 : 0), 0);

/** Contents of the case at beat-1 time t1 (Infinity = full), offset (ox, oy, oz). */
export function drawContents(ctx, v, t1, ox = 0, oy = 0, oz = 0) {
  const full = t1 >= CASCADE_END;
  const mpp = v.cam.mpp;
  if (full && mpp > 0.0008) {
    // only what can be seen over the walls: layer 5's front column + the 10 straps of layer 6
    const lod = mpp > 0.006 ? 0 : undefined;
    for (let j = 0; j < 5; j++) drawStrap(ctx, v, ox + 2 * BW, oy + 5 * SH, oz + j * BD, { lod, seed: 50 + j });
    for (const s of STRAPS) if (s.l === 6) drawStrap(ctx, v, ox + s.i * BW, oy + 6 * SH, oz + s.j * BD, { lod, seed: s.i * 5 + s.j });
    return;
  }
  // bottom layer (the hero is still drawn note by note while the camera is close)
  const d0 = v.tl.scenes[1].start;
  drawBottomLayer(ctx, v, d0 + Math.max(0, t1), ox, oy, oz, true, d0);
  for (const s of STRAPS) {
    const p = L.prog(t1, s.t0, DROP);
    if (p <= 0) continue;
    const e = L.ease.outCubic(p);
    const lift = (1 - e) * 0.1 + Math.sin(Math.PI * L.clamp((p - 0.7) / 0.3)) * 0.0025;  // small settle bounce
    drawStrap(ctx, v, ox + s.i * BW, oy + s.l * SH + lift, oz + s.j * BD, { a: L.clamp(p * 4), seed: s.i * 5 + s.j + s.l * 17 });
  }
}

// ------------------------------------------------------------------ the case
function quadGrad(ctx, pts, c1, c2, a = 1) {
  // brushed metal: gradient from the first edge (pts[3]→pts[2], top) to the bottom edge (pts[0]→pts[1])
  const tx = (pts[2][0] + pts[3][0]) / 2, ty = (pts[2][1] + pts[3][1]) / 2;
  const bx = (pts[0][0] + pts[1][0]) / 2, by = (pts[0][1] + pts[1][1]) / 2;
  const g = ctx.createLinearGradient(tx, ty, bx, by);
  g.addColorStop(0, L.rgba(c1, a));
  g.addColorStop(1, L.rgba(c2, a));
  poly(ctx, pts, g);
}

function line(ctx, a, b, col, w) {
  ctx.strokeStyle = col;
  ctx.lineWidth = w;
  ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke();
}

/**
 * The open briefcase. s = { ox, oy, oz, wall (0..1 base height), lid (angle, rad), lidA (0..1),
 *   t1 (contents time), sheen (0..1 sweep progress, ≤0 = none), a (alpha), shadow }.
 */
export function drawBriefcase(ctx, v, s) {
  const { ox = 0, oy = 0, oz = 0, wall = 1, lid = LID_OPEN, lidA = 1, t1 = Infinity, sheen = 0, a = 1 } = s;
  const mpp = v.cam.mpp;
  const P = (x, y, z) => isoPt(v, x + ox, y + oy, z + oz);
  const h = HC * wall;
  const detail = (X1 - X0) / mpp > 120;
  ctx.save();
  ctx.globalAlpha *= a;
  ctx.lineJoin = 'round';

  if (s.shadow !== false && wall > 0) softShadow(ctx, v, X0 + ox, Z0 + oz, X1 - X0, Z1 - Z0, L.clamp(wall * 1.3), 0.045 * (0.4 + 0.6 * wall), oy);

  // ---- lid (hinged on the back edge z = Z0, at the rim height)
  if (lidA > 0) {
    const sn = Math.sin(lid), cs = Math.cos(lid), Dz = Z1 - Z0;
    const LP = (x, dz, dy) => P(x, h + dz * sn + dy * cs, Z0 + dz * cs - dy * sn);
    ctx.save();
    ctx.globalAlpha *= lidA;
    // +x end
    quadGrad(ctx, [LP(X1, 0, 0), LP(X1, Dz, 0), LP(X1, Dz, HL), LP(X1, 0, HL)], ALU_R, L.mix(ALU_R, [0, 0, 0], 0.15));
    // the opening (lining) face, seen while the lid is past 45°
    if (sn - cs > 0) {
      poly(ctx, [LP(X0, 0, 0), LP(X1, 0, 0), LP(X1, Dz, 0), LP(X0, Dz, 0)], L.rgba(ALU_TOP));
      const inset = [LP(X0 + T, T, 0), LP(X1 - T, T, 0), LP(X1 - T, Dz - T, 0), LP(X0 + T, Dz - T, 0)];
      quadGrad(ctx, [inset[1], inset[0], inset[3], inset[2]], L.mix(LINING, [255, 255, 255], 0.06), L.mix(LINING, [0, 0, 0], 0.3));
      if (detail) {
        // document pocket with a stitched seam
        const pk = [LP(X0 + 0.03, Dz * 0.48, 0), LP(X1 - 0.03, Dz * 0.48, 0), LP(X1 - 0.03, Dz - 0.03, 0), LP(X0 + 0.03, Dz - 0.03, 0)];
        poly(ctx, pk, L.rgba(L.mix(LINING, [255, 255, 255], 0.07)));
        ctx.setLineDash([5, 5]);
        line(ctx, LP(X0 + 0.04, Dz * 0.48 + 0.008, 0), LP(X1 - 0.04, Dz * 0.48 + 0.008, 0), 'rgba(150,160,165,0.35)', 1.2);
        ctx.setLineDash([]);
        line(ctx, pk[0], pk[1], 'rgba(120,130,135,0.5)', 1.5);
      }
    }
    // front edge (top while open)
    if (sn + cs > 0) {
      poly(ctx, [LP(X0, Dz, 0), LP(X1, Dz, 0), LP(X1, Dz, HL), LP(X0, Dz, HL)], L.rgba(L.mix(ALU_TOP, [255, 255, 255], 0.1)));
      line(ctx, LP(X0, Dz, 0), LP(X1, Dz, 0), 'rgba(255,255,255,0.6)', 1.2);
    }
    ctx.restore();
  }

  // ---- base: floor, back walls (their inner faces show), contents, front walls
  if (h > 0.0005) {
    poly(ctx, [P(X0, 0.0005, Z0), P(X1, 0.0005, Z0), P(X1, 0.0005, Z1), P(X0, 0.0005, Z1)], L.rgba(LINING));
    const box = (x, z, w, d, top, left, right) => {
      poly(ctx, [P(x, h, z), P(x + w, h, z), P(x + w, h, z + d), P(x, h, z + d)], L.rgba(top));
      quadGrad(ctx, [P(x, 0, z + d), P(x + w, 0, z + d), P(x + w, h, z + d), P(x, h, z + d)], left[0], left[1]);
      quadGrad(ctx, [P(x + w, 0, z), P(x + w, 0, z + d), P(x + w, h, z + d), P(x + w, h, z)], right[0], right[1]);
    };
    box(X0, Z0, X1 - X0, T, ALU_TOP, [LINING_L, L.mix(LINING_L, [0, 0, 0], 0.5)], [ALU_R, ALU_R]);
    box(X0, Z0, T, Z1 - Z0, ALU_TOP, [ALU_L, ALU_L], [LINING_R, L.mix(LINING_R, [0, 0, 0], 0.5)]);
  }
  drawContents(ctx, v, t1, ox, oy, oz);
  if (h > 0.0005) {
    // front walls: outer +x face, outer +z face, rims
    const R = [P(X1, 0, Z0), P(X1, 0, Z1), P(X1, h, Z1), P(X1, h, Z0)];
    const F = [P(X0, 0, Z1), P(X1, 0, Z1), P(X1, h, Z1), P(X0, h, Z1)];
    poly(ctx, [P(X1 - T, h, Z0), P(X1, h, Z0), P(X1, h, Z1), P(X1 - T, h, Z1)], L.rgba(ALU_TOP));
    poly(ctx, [P(X0, h, Z1 - T), P(X1, h, Z1 - T), P(X1, h, Z1), P(X0, h, Z1)], L.rgba(ALU_TOP));
    quadGrad(ctx, R, L.mix(ALU_R, [255, 255, 255], 0.12), L.mix(ALU_R, [0, 0, 0], 0.25));
    quadGrad(ctx, F, L.mix(ALU_L, [255, 255, 255], 0.14), L.mix(ALU_L, [0, 0, 0], 0.22));
    if (detail) {
      // two pressed ridges around the base
      for (const fy of [0.34, 0.62]) {
        const y = h * fy;
        line(ctx, P(X0 + 0.01, y, Z1), P(X1, y, Z1), 'rgba(40,46,50,0.45)', 1.6);
        line(ctx, P(X0 + 0.01, y - 0.003, Z1), P(X1, y - 0.003, Z1), 'rgba(235,240,242,0.35)', 1.2);
        line(ctx, P(X1, y, Z1), P(X1, y, Z0 + 0.01), 'rgba(30,34,38,0.45)', 1.6);
        line(ctx, P(X1, y - 0.003, Z1), P(X1, y - 0.003, Z0 + 0.01), 'rgba(220,225,228,0.22)', 1.2);
      }
      // corner guards
      const cg = 0.03;
      poly(ctx, [P(X1 - cg, 0, Z1), P(X1, 0, Z1), P(X1, h, Z1), P(X1 - cg, h, Z1)], 'rgba(30,34,38,0.35)');
      poly(ctx, [P(X1, 0, Z1), P(X1, 0, Z1 - cg), P(X1, h, Z1 - cg), P(X1, h, Z1)], 'rgba(20,24,28,0.4)');
      poly(ctx, [P(X0, 0, Z1), P(X0 + cg, 0, Z1), P(X0 + cg, h, Z1), P(X0, h, Z1)], 'rgba(30,34,38,0.35)');
    }
    // rim highlights
    line(ctx, P(X0, h, Z1), P(X1, h, Z1), 'rgba(255,255,255,0.75)', 1.4);
    line(ctx, P(X1, h, Z1), P(X1, h, Z0), 'rgba(255,255,255,0.45)', 1.2);
    line(ctx, P(X1, 0, Z1), P(X1, h, Z1), 'rgba(255,255,255,0.3)', 1);

    if (detail && wall > 0.6) {
      // latches
      for (const lx of [0.055, 0.375]) {
        const y0 = h - 0.034, y1 = h - 0.006, z = Z1 + 0.002;
        quadGrad(ctx, [P(lx, y0, z), P(lx + 0.052, y0, z), P(lx + 0.052, y1, z), P(lx, y1, z)], [235, 240, 244], [120, 128, 134]);
        line(ctx, P(lx + 0.008, y0 + 0.012, z), P(lx + 0.044, y0 + 0.012, z), 'rgba(40,44,48,0.8)', 2);
        poly(ctx, [P(lx + 0.052, y0, z), P(lx + 0.052, y0, Z1), P(lx + 0.052, y1, Z1), P(lx + 0.052, y1, z)], L.rgba([90, 96, 100]));
      }
      // handle: posts + grip, standing off the front face
      const hy = h * 0.5, hz = Z1 + 0.03, w = Math.max(2, 0.013 / mpp);
      ctx.lineCap = 'round';
      for (const px of [0.18, 0.3]) line(ctx, P(px, hy, Z1), P(px, hy, hz), L.rgba(HANDLE), w * 0.8);
      line(ctx, P(0.18, hy, hz), P(0.3, hy, hz), L.rgba(HANDLE), w);
      line(ctx, P(0.185, hy + 0.004, hz), P(0.295, hy + 0.004, hz), 'rgba(140,150,155,0.6)', Math.max(1, w * 0.18));
      ctx.lineCap = 'butt';
    }

    // sheen: a soft diagonal band of light sweeping across the outer metal
    if (sheen > 0 && sheen < 1) {
      ctx.save();
      ctx.beginPath();
      for (const q of [R, F]) { ctx.moveTo(q[0][0], q[0][1]); for (let i = 1; i < 4; i++) ctx.lineTo(q[i][0], q[i][1]); ctx.closePath(); }
      ctx.clip();
      const [lx0] = P(X0, 0, Z1), [lx1] = P(X1, 0, Z0);
      const cx = L.lerp(lx0 - 120, lx1 + 120, L.ease.inOutCubic(sheen));
      const g = ctx.createLinearGradient(cx - 90, 0, cx + 90, 0);
      g.addColorStop(0, 'rgba(255,255,255,0)');
      g.addColorStop(0.5, 'rgba(255,255,255,0.5)');
      g.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.globalCompositeOperation = 'lighter';
      ctx.fillStyle = g;
      ctx.fillRect(cx - 100, 0, 200, L.H);
      ctx.restore();
    }
  }
  ctx.restore();
}

// ------------------------------------------------------------------ beat-1 timing
// walls and lid wait until the camera has pulled back to case scale (mpp > ~0.0006 at t1 ≈ 0.55),
// so the lid never overflows the frame and the front wall never runs through the caption band
const WALL_T = 0.5, WALL_D = 0.6;
const LID_T = 0.78, LID_D = 0.95;
export const SHEEN_T = 2.55;

export function caseState(t1) {
  return {
    wall: L.ease.outCubic(L.prog(t1, WALL_T, WALL_D)),
    // the lid swings up from ~126° (leaning back, so it never overshoots the frame) and settles at 100°
    lid: L.lerp(Math.PI * 0.7, LID_OPEN, L.ease.outBack(L.prog(t1, LID_T, LID_D), 1.2)),
    lidA: L.ease.outCubic(L.prog(t1, LID_T, 0.3)),
    sheen: L.prog(t1, SHEEN_T, 0.8),
    t1,
  };
}

export default {
  beat: 1,
  chapter: { num: '01', title: 'One million', sub: '100 straps · 10,000 bills' },
  captions: true,
  layer: 0,
  cues(d) {
    return [
      { t: WALL_T + 0.05, name: 'swish', gain: 0.22, pitch: 0.7 },
      { t: LID_T + 0.55, name: 'tick', gain: 0.25, pitch: 0.7 },
      { t: C0, name: 'count', gain: 0.24, pitch: 0.9 },
      { t: C0 + 0.85, name: 'count', gain: 0.22, pitch: 1.0 },
      { t: CASCADE_END - 0.04, name: 'impact', gain: 0.24, pitch: 1.3 },
      { t: SHEEN_T + 0.1, name: 'shimmer', gain: 0.22, pitch: 1.1 },
    ];
  },

  drawWorld(ctx, v) {
    const tl = v.tl.scenes;
    if (v.gt < tl[1].start || v.gt >= tl[2].start) return;   // s0 before, s2 after (the case rides the pallet)
    drawBriefcase(ctx, v, caseState(v.t));
  },

  drawOverlay(ctx, v) {
    const n = strapsIn(v.t + Math.round(v.gt * 30) / 30 - v.gt, v.tl.scenes[1].start);   // frame time: no sub-frame digit ghosting
    const k = L.enter(v.t, 0.4, 0.5) * v.k;   // beat 0's "$10,000" has fully gone by t1 = 0
    const done = L.prog(v.t, CASCADE_END - 0.05, 0.01);
    const pulse = done * Math.exp(-Math.max(0, v.t - CASCADE_END) * 5);
    L.bigLabel(ctx, { x: 72, y: 500, size: 86, big: `$${L.fmt(n * 10000)}`, small: '10 kg · 22 lb', k, accent: L.mix(v.accent, [235, 255, 240], pulse * 0.5) });
  },
};
