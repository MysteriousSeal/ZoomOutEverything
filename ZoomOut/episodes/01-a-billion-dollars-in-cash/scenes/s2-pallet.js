// Beat 2 — $100,000,000 on one shipping pallet (≈ 1 tonne), with a person for scale.
// A wooden pallet rises out of the floor under the briefcase, then nine layers of $100k bricks stack up
// beneath it, carrying the case to the top. Shrink-wrap winds up the block and a sheen sweeps across it.
// The person (1.75 m) fades in beside it. Pallet, case and person stay in the world for later beats
// (LOD by v.cam.mpp; the origin pallet hands over to s3+ once the camera is far out).
import * as L from '../../../../engine/runtime/lib.js';
import { isoPt, drawHuman } from '../env.js';
import { BW, BD, SH, EDGE, PAPER, BAND, poly, softShadow, billTop } from './s0-stack.js';
import { drawBriefcase, caseState } from './s1-briefcase.js';

// ------------------------------------------------------------------ geometry (metres)
const PW = 1.2, PD = 1.0, PH = 0.144;                 // EUR-style pallet
const NX = 7, NZ = 15, NL = 9, LH = 10 * SH;          // bricks of 10 straps ($100k): 7 × 15 × 9 ≈ $100M
const CW = NX * BW, CD = NZ * BD;
const CX0 = (PW - CW) / 2, CZ0 = (PD - CD) / 2;
// the person stands on open floor left of the future $1B block's front row: with z − x ≥ 2.15 no pallet (all at
// x ≥ 0, z ≤ 2.15) can ever sit between him and the camera, so he is drawn last and never covered
export const HUMAN = [-1.1, 1.4];
const CASE_DX = 0.075, CASE_DZ = 0.03;                // where the case comes to rest on top of the cash

const WOOD = [170, 128, 82], WOOD_DK = [104, 76, 46];
const FILM = [210, 232, 240];

// ------------------------------------------------------------------ timing (beat-relative)
const PAL_T = 0.05, PAL_D = 0.45;
const LAY_T = 0.4, LAY_DT = 0.13, LAY_D = 0.32;
const WRAP_T = 1.85, WRAP_D = 0.7;
const SHEEN_T = 2.45, SHEEN_D = 0.8;
const HUMAN_T = 0.95;
export const HANDOFF = 0.35;                          // s3 takes the origin pallet over during the first 0.35 s of beat 3
const LAND = LAY_T + (NL - 1) * LAY_DT + LAY_D;      // last layer lands

function state(t) {
  const pk = L.ease.outCubic(L.prog(t, PAL_T, PAL_D));
  let H = 0, landed = 0;
  for (let k = 0; k < NL; k++) {
    const p = L.prog(t, LAY_T + k * LAY_DT, LAY_D);
    H += LH * (p >= 1 ? 1 : L.ease.outBack(p, 1.5));
    if (p >= 0.75) landed++;
  }
  return { pk, H, landed, wrap: L.ease.inOutCubic(L.prog(t, WRAP_T, WRAP_D)), sheen: L.prog(t, SHEEN_T, SHEEN_D) };
}

// ------------------------------------------------------------------ wooden pallet
function box(ctx, v, x, y, z, w, h, d, col, a = 1, grain = false) {
  const P = (px, py, pz) => isoPt(v, px, py, pz);
  poly(ctx, [P(x, y + h, z), P(x + w, y + h, z), P(x + w, y + h, z + d), P(x, y + h, z + d)], L.rgba(L.mix(col, [255, 240, 220], 0.16), a));
  poly(ctx, [P(x, y, z + d), P(x + w, y, z + d), P(x + w, y + h, z + d), P(x, y + h, z + d)], L.rgba(col, a));
  poly(ctx, [P(x + w, y, z), P(x + w, y, z + d), P(x + w, y + h, z + d), P(x + w, y + h, z)], L.rgba(L.mix(col, [0, 0, 0], 0.34), a));
  if (grain) {
    // a few grain lines along the board's length on its top face
    ctx.strokeStyle = `rgba(90,60,30,${0.25 * a})`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    const along = w > d;
    for (let i = 1; i < 4; i++) {
      const f = i / 4 + L.noise1(x * 9 + z * 7 + i, 8) * 0.06;
      const [ax, ay] = along ? P(x, y + h, z + d * f) : P(x + w * f, y + h, z);
      const [bx, by] = along ? P(x + w, y + h, z + d * f) : P(x + w * f, y + h, z + d);
      ctx.moveTo(ax, ay); ctx.lineTo(bx, by);
    }
    ctx.stroke();
  }
}

function drawPallet(ctx, v, pk, a) {
  const s = pk;                               // vertical extrusion 0..1
  const simple = v.cam.mpp > 0.012;
  if (simple) { box(ctx, v, 0, 0, 0, PW, PH * s, PD, WOOD, a); return; }
  const y = (yy) => yy * s;
  const grain = v.cam.mpp < 0.006;
  // bottom boards (along x)
  for (const z of [0, 0.4275, 0.855]) box(ctx, v, 0, 0, z, PW, y(0.022), 0.145, WOOD_DK, a);
  // blocks
  for (const z of [0, 0.4275, 0.855]) for (const x of [0, 0.5275, 1.055]) box(ctx, v, x, y(0.022), z, 0.145, y(0.078), 0.145, L.mix(WOOD, WOOD_DK, 0.35), a);
  // stringer boards (along z)
  for (const x of [0, 0.5275, 1.055]) box(ctx, v, x, y(0.1), 0, 0.145, y(0.022), PD, WOOD_DK, a);
  // top deck boards (along x)
  for (const [z, d] of [[0, 0.145], [0.2275, 0.1], [0.45, 0.1], [0.6725, 0.1], [0.855, 0.145]]) box(ctx, v, 0, y(0.122), z, PW, y(0.022), d, WOOD, a, grain);
}

// ------------------------------------------------------------------ the cash block ($100k bricks)
function drawCash(ctx, v, y0, H, a, landed) {
  if (H <= 0.0005) return;
  const mpp = v.cam.mpp;
  const P = (px, py, pz) => isoPt(v, px, py, pz);
  const x0 = CX0, x1 = CX0 + CW, z0 = CZ0, z1 = CZ0 + CD, yt = y0 + H;
  // faces
  const F = [P(x0, y0, z1), P(x1, y0, z1), P(x1, yt, z1), P(x0, yt, z1)];
  const R = [P(x1, y0, z0), P(x1, y0, z1), P(x1, yt, z1), P(x1, yt, z0)];
  const Tp = [P(x0, yt, z0), P(x1, yt, z0), P(x1, yt, z1), P(x0, yt, z1)];
  const grad = (pts, c1, c2) => {
    const g = ctx.createLinearGradient(0, (pts[2][1] + pts[3][1]) / 2, 0, (pts[0][1] + pts[1][1]) / 2);
    g.addColorStop(0, L.rgba(c1, a)); g.addColorStop(1, L.rgba(c2, a));
    poly(ctx, pts, g);
  };
  grad(F, L.mix(EDGE, [0, 0, 0], 0.06), L.mix(EDGE, [0, 0, 0], 0.3));
  grad(R, L.mix(EDGE, [20, 30, 25], 0.36), L.mix(EDGE, [10, 15, 12], 0.58));
  if (mpp < 0.03) {
    // paper bands down every brick column on the front face
    for (let i = 0; i < NX; i++) {
      const u0 = x0 + i * BW + 0.062, u1 = x0 + i * BW + 0.094;
      poly(ctx, [P(u0, y0, z1 + 0.0005), P(u1, y0, z1 + 0.0005), P(u1, yt, z1 + 0.0005), P(u0, yt, z1 + 0.0005)], L.rgba(L.mix(L.mix(BAND, EDGE, 0.25), [0, 0, 0], 0.18), a * 0.8));
    }
    // seams: strap lines (faint), brick layers and columns (dark)
    const strapPx = SH / mpp;
    ctx.lineWidth = 1;
    if (strapPx > 2.2) {
      ctx.strokeStyle = `rgba(40,55,45,${0.13 * a * L.clamp((strapPx - 2.2) / 2)})`;
      ctx.beginPath();
      for (let yy = y0 + SH; yy < yt - 1e-4; yy += SH) {
        let [ax, ay] = P(x0, yy, z1), [bx, by] = P(x1, yy, z1);
        ctx.moveTo(ax, ay); ctx.lineTo(bx, by);
        [ax, ay] = P(x1, yy, z1); [bx, by] = P(x1, yy, z0);
        ctx.moveTo(ax, ay); ctx.lineTo(bx, by);
      }
      ctx.stroke();
    }
    ctx.strokeStyle = `rgba(20,30,24,${0.4 * a})`;
    ctx.lineWidth = mpp < 0.008 ? 1.4 : 1;
    ctx.beginPath();
    for (let yy = y0 + LH; yy < yt - 1e-4; yy += LH) {
      let [ax, ay] = P(x0, yy, z1), [bx, by] = P(x1, yy, z1);
      ctx.moveTo(ax, ay); ctx.lineTo(bx, by);
      [ax, ay] = P(x1, yy, z1); [bx, by] = P(x1, yy, z0);
      ctx.moveTo(ax, ay); ctx.lineTo(bx, by);
    }
    if (mpp < 0.012) {
      for (let i = 1; i < NX; i++) { const [ax, ay] = P(x0 + i * BW, y0, z1), [bx, by] = P(x0 + i * BW, yt, z1); ctx.moveTo(ax, ay); ctx.lineTo(bx, by); }
      for (let j = 1; j < NZ; j++) { const [ax, ay] = P(x1, y0, z0 + j * BD), [bx, by] = P(x1, yt, z0 + j * BD); ctx.moveTo(ax, ay); ctx.lineTo(bx, by); }
    }
    ctx.stroke();
  }
  // top: one bill face per brick, with its band
  if (mpp < 0.009) {
    for (let j = 0; j < NZ; j++) for (let i = 0; i < NX; i++) {
      const bx = x0 + i * BW, bz = z0 + j * BD;
      billTop(ctx, v, bx + BW / 2, yt, bz + BD / 2, 0, 0, a);
      poly(ctx, [P(bx + 0.062, yt, bz), P(bx + 0.094, yt, bz), P(bx + 0.094, yt, bz + BD), P(bx + 0.062, yt, bz + BD)], L.rgba(BAND, a));
    }
    ctx.strokeStyle = `rgba(30,45,36,${0.35 * a})`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let j = 1; j < NZ; j++) { const [ax, ay] = P(x0, yt, z0 + j * BD), [bx, by] = P(x1, yt, z0 + j * BD); ctx.moveTo(ax, ay); ctx.lineTo(bx, by); }
    for (let i = 1; i < NX; i++) { const [ax, ay] = P(x0 + i * BW, yt, z0), [bx, by] = P(x0 + i * BW, yt, z1); ctx.moveTo(ax, ay); ctx.lineTo(bx, by); }
    ctx.stroke();
  } else {
    poly(ctx, Tp, L.rgba(L.mix(PAPER, [255, 255, 255], 0.12), a));
    if (mpp < 0.03) for (let i = 0; i < NX; i++) {
      const bx = x0 + i * BW;
      poly(ctx, [P(bx + 0.062, yt, z0), P(bx + 0.094, yt, z0), P(bx + 0.094, yt, z1), P(bx + 0.062, yt, z1)], L.rgba(BAND, a * 0.85));
    }
  }
  // crisp top edges
  ctx.strokeStyle = `rgba(245,250,240,${0.45 * a})`;
  ctx.lineWidth = 1.2;
  ctx.beginPath(); ctx.moveTo(...Tp[3]); ctx.lineTo(...Tp[2]); ctx.lineTo(...Tp[1]); ctx.stroke();
  void landed;
}

// ------------------------------------------------------------------ shrink-wrap
function drawWrap(ctx, v, y0, H, wrap, sheen, a) {
  if (wrap <= 0) return;
  const P = (px, py, pz) => isoPt(v, px, py, pz);
  const m = 0.006;                                           // film stands slightly proud of the cash
  const x0 = CX0 - m, x1 = CX0 + CW + m, z0 = CZ0 - m, z1 = CZ0 + CD + m;
  const yb = PH * 0.55, ytop = y0 + H + 0.004;
  const yw = L.lerp(yb, ytop, wrap);
  const F = [P(x0, yb, z1), P(x1, yb, z1), P(x1, yw, z1), P(x0, yw, z1)];
  const R = [P(x1, yb, z0), P(x1, yb, z1), P(x1, yw, z1), P(x1, yw, z0)];
  ctx.save();
  ctx.globalAlpha *= a;
  poly(ctx, F, L.rgba(FILM, 0.13));
  poly(ctx, R, L.rgba(FILM, 0.09));
  // over the top once the wrap reaches it
  const tk = L.clamp((wrap - 0.9) / 0.1);
  if (tk > 0) poly(ctx, [P(x0, ytop, z0), P(x1, ytop, z0), P(x1, ytop, z1), P(x0, ytop, z1)], L.rgba(FILM, 0.1 * tk));
  // wound film: slightly slanted bands, each turn a faint highlight
  ctx.save();
  ctx.beginPath();
  for (const q of [F, R]) { ctx.moveTo(...q[0]); for (let i = 1; i < 4; i++) ctx.lineTo(...q[i]); ctx.closePath(); }
  ctx.clip();
  const turn = 0.14;
  ctx.lineWidth = Math.max(1, 0.01 / v.cam.mpp);
  for (let yy = yb; yy < yw + turn; yy += turn) {
    ctx.strokeStyle = L.rgba([235, 248, 255], 0.13);
    ctx.beginPath();
    ctx.moveTo(...P(x0, yy, z1)); ctx.lineTo(...P(x1, yy + turn * 0.35, z1)); ctx.lineTo(...P(x1, yy + turn * 0.7, z0));
    ctx.stroke();
  }
  // sheen sweep (diagonal band of light moving left → right)
  if (sheen > 0 && sheen < 1) {
    const [lx0] = P(x0, 0, z1), [lx1] = P(x1, 0, z0);
    const cx = L.lerp(lx0 - 200, lx1 + 200, L.ease.inOutCubic(sheen));
    const w = 0.18 / v.cam.mpp;
    ctx.translate(cx, 0);
    ctx.transform(1, 0, -0.35, 1, 0, 0);
    const g = ctx.createLinearGradient(-w, 0, w, 0);
    g.addColorStop(0, 'rgba(255,255,255,0)');
    g.addColorStop(0.5, 'rgba(255,255,255,0.32)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = g;
    ctx.fillRect(-w, -L.H, 2 * w, L.H * 3);
  }
  ctx.restore();
  // the leading edge of the film while it winds up, and the stretched vertical corner
  if (wrap < 1) {
    ctx.strokeStyle = 'rgba(240,250,255,0.7)';
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(...P(x0, yw, z1)); ctx.lineTo(...P(x1, yw, z1)); ctx.lineTo(...P(x1, yw, z0)); ctx.stroke();
  }
  ctx.strokeStyle = 'rgba(240,250,255,0.5)';
  ctx.lineWidth = 1.4;
  ctx.beginPath(); ctx.moveTo(...P(x1, yb, z1)); ctx.lineTo(...P(x1, yw, z1)); ctx.stroke();
  ctx.restore();
}

/** The 1.75 m person for scale (beat 2 → 4). Fades out early in beat 5, where the trillion slab buries his spot. */
export function drawScaleHuman(ctx, v) {
  const t2 = v.gt - v.tl.scenes[2].start;
  if (t2 < HUMAN_T) return;
  const s5 = v.tl.scenes[5];
  const out = s5 ? L.ease.inCubic(L.prog(v.gt - s5.start, -0.1, 0.45)) : 0;
  drawHuman(ctx, v, HUMAN[0], HUMAN[1], L.ease.outCubic(L.prog(t2, HUMAN_T, 0.6)) * (1 - out));
}

export default {
  beat: 2,
  chapter: { num: '02', title: 'One hundred million', sub: 'One shipping pallet' },
  captions: true,
  layer: 0,
  cues(d) {
    const out = [
      { t: PAL_T + 0.05, name: 'creak', gain: 0.12, pitch: 1.6 },
      { t: LAND - 0.05, name: 'impact', gain: 0.32, pitch: 0.9 },
      { t: HUMAN_T, name: 'blip', gain: 0.2, pitch: 0.8 },
      { t: WRAP_T, name: 'swish', gain: 0.26, pitch: 0.6 },
      { t: SHEEN_T + 0.1, name: 'shimmer', gain: 0.24, pitch: 1.0 },
    ];
    for (let k = 0; k < NL; k += 2) out.push({ t: LAY_T + k * LAY_DT + LAY_D * 0.6, name: 'tick', gain: 0.18, pitch: 0.7 + k * 0.05 });
    return out;
  },

  drawWorld(ctx, v) {
    if (v.gt < v.tl.scenes[2].start) return;
    const mpp = v.cam.mpp;
    const st = state(v.t);
    // the origin pallet hands over to s3's renderer (same look as the nine new pallets) as soon as beat 3 starts:
    // s3 fades its copy in on top, then this one is dropped
    const t3 = v.gt - v.tl.scenes[3].start;
    const pa = t3 >= HANDOFF ? 0 : 1 - L.smoothstep(L.clamp((mpp - 0.04) / 0.02));
    if (pa > 0) {
      softShadow(ctx, v, 0, 0, PW, PD, pa * st.pk, 0.06);
      drawPallet(ctx, v, st.pk, pa);
      const y0 = PH * st.pk;
      drawCash(ctx, v, y0, st.H, pa, st.landed);
      drawWrap(ctx, v, y0, st.H, st.wrap, st.sheen, pa);
      // the briefcase rides up on the stack, sliding onto the top
      // the briefcase leaves when the billion beat starts (it should not ride on top of the $1B block)
      const ca = pa * (1 - L.smoothstep(L.clamp((mpp - 0.016) / 0.012))) * (1 - L.ease.inCubic(L.prog(t3, -0.15, 0.4)));
      if (ca > 0) {
        const e = L.ease.inOutCubic(L.prog(v.t, 0.15, 1.2));
        drawBriefcase(ctx, v, {
          ...caseState(Infinity), sheen: 0, a: ca,
          ox: CASE_DX * e, oy: y0 + st.H, oz: CASE_DZ * e,
        });
      }
    }
    if (t3 < 0) drawScaleHuman(ctx, v);     // from beat 3 on, s3 draws him after its pallets (depth order)
  },

  drawOverlay(ctx, v) {
    const st = state(v.t + Math.round(v.gt * 30) / 30 - v.gt);   // frame time: no sub-frame digit ghosting
    const m = Math.round(1 + 99 * L.clamp(st.H / (NL * LH)));
    const k = L.enter(v.t, 0.6, 0.5) * v.k;
    const pulse = L.prog(v.t, LAND - 0.06, 0.01) * Math.exp(-Math.max(0, v.t - LAND) * 5);
    L.bigLabel(ctx, { x: 1000, y: 520, big: `$${L.fmt(m * 1e6)}`, small: '1 pallet · ≈ 1 tonne', k, align: 'right', size: 104,
      accent: L.mix(v.accent, [235, 255, 240], pulse * 0.5) });
  },
};
