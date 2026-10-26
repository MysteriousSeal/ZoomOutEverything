// Beat 5 — "And a trillion dollars? … Ten thousand pallets."
// The wave of pallets keeps rolling out from the origin corner until 5,000 footprints (100 × 50, pitch 1.1 × 1.0 m)
// fill the floor, then a second layer drops on in a diagonal sweep: 10,000 pallets = $1,000,000,000,000.
// The block is drawn per pallet, batched per iso diagonal (back to front) so 10,000 boxes stay cheap.
// s6-field.js imports drawBlock() to keep drawing the finished block (as an x-ray volume) over the football field.
import * as L from '../../../../engine/runtime/lib.js';

const { W, H, ease, clamp, lerp, prog, rgba } = L;

// ------------------------------------------------------------------ layout (world metres)
export const NX = 100, NZ = 50;            // footprints along x and z
export const PX = 1.1, PZ = 1.0;           // pitch
export const PW = 1.0, PD = 0.9;           // pallet footprint (gaps of 10 cm read as fine dark seams)
export const PH = 1.15;                    // one pallet incl. its wooden base
const WOOD = 0.14;
export const BLOCK_W = (NX - 1) * PX + PW;  // 109.9 m
export const BLOCK_D = (NZ - 1) * PZ + PD;  // 49.9 m

// ------------------------------------------------------------------ timing (seconds from beat-5 start)
export const T = {
  l1: 0.0, l1Dur: 1.35,        // ground layer: the wave rolls out (while the camera pulls back)
  l2: 1.4, l2Dur: 1.2,        // second layer: diagonal sweep, back corner -> front corner
  drop1: 0.42, drop2: 0.36,     // fall time of one pallet
};
export const T_DONE = T.l2 + T.l2Dur + T.drop2 + 0.04;   // last pallet has landed (~3.04 s)

// ------------------------------------------------------------------ colours (muted note-green cash under clear shrink-wrap)
const CASH = { top: [146, 166, 146], left: [92, 112, 96], right: [62, 78, 68] };
const TOPS = [[140, 160, 140], [150, 170, 149], [158, 176, 155]];   // three tone buckets for life
const WOODC = { left: [122, 96, 66], right: [84, 66, 47] };
const ACC = [110, 220, 140];

// beat 4's carpet (s4: 10 × 20 blocks of 5 × 2 footprints) is already on the floor when this beat starts:
// those footprints are drawn settled from frame 0 and s3/s4 stop drawing (FROM_RICH). Mirrors s4's NTI/NTJ.
export const FROM_RICH = true;
export const RICH_I = 50, RICH_J = 40;
const inRich = (i, j) => i < RICH_I && j < RICH_J;
// beat 4's far-LOD palette (s3 EDGE / BILL / WOOD), blended into this beat's palette over its first second
const S4C = { top: [138, 156, 132], left: [204, 210, 193], right: L.mix([204, 210, 193], [20, 30, 26], 0.38),
  woodL: L.mix([158, 126, 88], [34, 27, 20], 0.3), woodR: L.mix([158, 126, 88], [34, 27, 20], 0.55) };

// per-pallet arrival times (deterministic)
const L1_ROWS = 36;                        // the ground layer finishes in clean diagonal rows (no per-pallet jitter)
const L2_ROWS = 60;                        // the layer-2 front advances in 60 clean diagonal rows
const A1 = new Float32Array(NX * NZ), A2 = new Float32Array(NX * NZ), TONE = new Uint8Array(NX * NZ * 2);
(() => {
  const r = L.rng(5150);
  for (let j = 0; j < NZ; j++) {
    for (let i = 0; i < NX; i++) {
      const n = j * NX + i;
      // ground layer: beat 4's carpet is already down; the rest arrives as a clean diagonal front (i + j rows)
      // carrying s4's wave on from the carpet's edge to the far corner
      if (inRich(i, j)) A1[n] = -100;
      else {
        const q = Math.floor(((i + j - RICH_J) / (NX + NZ - 2 - RICH_J)) * L1_ROWS) / (L1_ROWS - 1);
        A1[n] = T.l1 + T.l1Dur * (1 - (1 - clamp(q, 0, 1)) ** 2) * 0.999;
      }
      r();
      // second layer: a clean diagonal sweep, quantised into rows of the front (no per-pallet jitter)
      const s = Math.floor((((i + 0.5) / NX + (j + 0.5) / NZ) / 2) * L2_ROWS) / (L2_ROWS - 1);
      A2[n] = T.l2 + T.l2Dur * clamp(s, 0, 1);
      r();
      TONE[n * 2] = (r() * 3) | 0;
      TONE[n * 2 + 1] = (r() * 3) | 0;
    }
  }
})();

/** Number of pallets landed at beat-5 time t (for the counter). */
export function landed(t) {
  let c = 0;
  for (let n = 0; n < NX * NZ; n++) {
    if (t >= A1[n] + T.drop1 * 0.7) c++;
    if (t >= A2[n] + T.drop2 * 0.7) c++;
  }
  return c;
}

// ------------------------------------------------------------------ drawing
let off = null;   // offscreen layer for the x-ray fade (lazily created)

function proj(v) {
  const C = Math.cos(Math.PI / 6), mpp = v.cam.mpp;
  const ox = W / 2 - v.cam.x / mpp, oy = H * (v.cam.anchor ?? 0.5) - v.cam.y / mpp;
  return {
    sx: (x, z) => ox + ((x - z) * C) / mpp,
    sy: (x, y, z) => oy + ((x + z) * 0.5 - y) / mpp,
  };
}

/**
 * Draws the pallet block as it stands at beat-5 time t5.
 * opts.alpha < 1 renders through an offscreen layer so overlapping faces fade as one solid object.
 * opts.lift2 (m) raises the whole second layer (s6's "stacked two high" exploded view); layer 2 is then drawn
 * after all of layer 1 so the gap between them reads cleanly.
 * opts.cut cuts the block away along a diagonal (s6's payoff): pallets whose (i + ½)/NX + (j + ½)/NZ exceeds
 * cut are not drawn (the field shows through), and a thin band (opts.cutBand) just past the cut dissolves out.
 */
export const CUT_BAND = 0.07;
export function drawBlock(ctx, v, t5, { alpha = 1, lift2 = 0, cut = Infinity, cutBand = CUT_BAND } = {}) {
  if (t5 < T.l1 - 0.2 || alpha <= 0) return;
  // always drawn on an offscreen layer: lets the block be lit as one object and faded as one solid
  if (!off) off = new OffscreenCanvas(W, H);
  const c = off.getContext('2d');
  c.setTransform(1, 0, 0, 1, 0, 0);
  c.globalAlpha = 1;
  c.globalCompositeOperation = 'source-over';
  c.clearRect(0, 0, W, H);
  const { sx, sy } = proj(v);
  const C = Math.cos(Math.PI / 6);

  // soft contact shadow under the finished part (grows with the ground layer)
  const sha = ease.outCubic(prog(t5, T.l1Dur * 0.8, 0.6));
  const grow = 1;
  if (sha > 0) {
    for (let k = 3; k >= 1; k--) {
      const e = k * 0.9;
      const x1 = BLOCK_W * grow + e, z1 = BLOCK_D * grow + e;
      c.beginPath();
      c.moveTo(sx(-e * 0.3, -e * 0.3), sy(-e * 0.3, 0, -e * 0.3));
      c.lineTo(sx(x1, -e * 0.3), sy(x1, 0, -e * 0.3));
      c.lineTo(sx(x1, z1), sy(x1, 0, z1));
      c.lineTo(sx(-e * 0.3, z1), sy(-e * 0.3, 0, z1));
      c.closePath();
      c.fillStyle = `rgba(0,0,0,${0.12 * sha})`;
      c.fill();
    }
  }

  // collect pallets per diagonal: settled ones are batched, falling ones drawn one by one
  const quad = (pts) => { c.moveTo(pts[0], pts[1]); c.lineTo(pts[2], pts[3]); c.lineTo(pts[4], pts[5]); c.lineTo(pts[6], pts[7]); c.closePath(); };
  const topPts = (x, y, z) => [sx(x, z), sy(x, y, z), sx(x + PW, z), sy(x + PW, y, z), sx(x + PW, z + PD), sy(x + PW, y, z + PD), sx(x, z + PD), sy(x, y, z + PD)];
  const leftPts = (x, y0, y1, z) => [sx(x, z + PD), sy(x, y0, z + PD), sx(x + PW, z + PD), sy(x + PW, y0, z + PD), sx(x + PW, z + PD), sy(x + PW, y1, z + PD), sx(x, z + PD), sy(x, y1, z + PD)];
  const rightPts = (x, y0, y1, z) => [sx(x + PW, z), sy(x + PW, y0, z), sx(x + PW, z + PD), sy(x + PW, y0, z + PD), sx(x + PW, z + PD), sy(x + PW, y1, z + PD), sx(x + PW, z), sy(x + PW, y1, z)];

  // palette: beat 4's look at the hand-off, this beat's darker cash within the first second
  const pk = ease.inOutCubic(prog(t5, 0.15, 0.9));
  const CL = rgba(L.mix(S4C.left, CASH.left, pk)), CR = rgba(L.mix(S4C.right, CASH.right, pk));
  const WL = rgba(L.mix(S4C.woodL, WOODC.left, pk)), WR = rgba(L.mix(S4C.woodR, WOODC.right, pk));
  const TOPC = TOPS.map((c, b) => L.mix(L.mix(S4C.top, [255, 255, 255], [0, 0.035, 0][b]), c, pk));
  const drawBatch = (list, layerY, topDim = 0) => {
    // list: array of [x, z, tone]
    if (!list.length) return;
    const y0 = layerY, y1 = layerY + PH, yw = layerY + WOOD;
    // side faces (cash), then wood bands, then tops in tone buckets
    c.beginPath(); for (const [x, , z] of list) quad(leftPts(x, yw, y1, z)); c.fillStyle = CL; c.fill();
    c.beginPath(); for (const [x, , z] of list) quad(rightPts(x, yw, y1, z)); c.fillStyle = CR; c.fill();
    c.beginPath(); for (const [x, , z] of list) quad(leftPts(x, y0, yw, z)); c.fillStyle = WL; c.fill();
    c.beginPath(); for (const [x, , z] of list) quad(rightPts(x, y0, yw, z)); c.fillStyle = WR; c.fill();
    for (let b = 0; b < 3; b++) {
      c.beginPath();
      let any = false;
      for (const [x, tone, z] of list) if (tone === b) { quad(topPts(x, y1, z)); any = true; }
      if (any) { c.fillStyle = rgba(L.mix(TOPC[b], [20, 32, 26], topDim)); c.fill(); }
    }
    // LOD: paper straps across the bundles under the wrap, only when a pallet is big enough to read them
    if (lod > 0) {
      c.beginPath();
      for (const [x, , z] of list) {
        for (const f of [0.3, 0.7]) {
          const za = z + PD * f - 0.05, zb = z + PD * f + 0.05;
          c.moveTo(sx(x + 0.04, za), sy(x + 0.04, y1, za)); c.lineTo(sx(x + PW - 0.04, za), sy(x + PW - 0.04, y1, za));
          c.lineTo(sx(x + PW - 0.04, zb), sy(x + PW - 0.04, y1, zb)); c.lineTo(sx(x + 0.04, zb), sy(x + 0.04, y1, zb)); c.closePath();
        }
      }
      c.fillStyle = `rgba(228,232,214,${0.55 * lod})`;
      c.fill();
    }
  };
  const drawOne = (x, z, y, a, tone, tint = 0) => {
    c.globalAlpha = a;
    const y1 = y + PH, yw = y + WOOD;
    c.beginPath(); quad(leftPts(x, yw, y1, z)); c.fillStyle = CL; c.fill();
    c.beginPath(); quad(rightPts(x, yw, y1, z)); c.fillStyle = CR; c.fill();
    c.beginPath(); quad(leftPts(x, y, yw, z)); c.fillStyle = WL; c.fill();
    c.beginPath(); quad(rightPts(x, y, yw, z)); c.fillStyle = WR; c.fill();
    c.beginPath(); quad(topPts(x, y1, z)); c.fillStyle = rgba(L.mix(L.mix(TOPC[tone], [235, 245, 235], 0.25 * (1 - a)), ACC, tint)); c.fill();
    c.globalAlpha = 1;
  };

  const lod = clamp((PW / v.cam.mpp - 9) / 8);    // strap detail fades in above ~9 px per pallet
  const ND = NX + NZ - 1;
  // ground-layer tops dim a little as the second layer starts, so the layer-2 front reads as a raised, brighter step
  const dim1 = 0.16 * ease.inOutCubic(prog(t5, T.l2 - 0.3, 0.4));
  const fall1 = (u) => 1.3 * (1 - ease.outBack(u, 1.3));           // m above rest (overshoots slightly below, settles)
  // layer 2 settles from a low hover with an eased (decelerating) drop and a tiny overshoot: fully opaque,
  // so the sweep reads as a clean step moving across the block rather than a translucent smear
  const fall2 = (u) => 1.6 * (1 - ease.outBack(u, 1.2));
  const L2 = PH + lift2;
  const later = [];   // layer-2 batches deferred while lifted
  for (let s = 0; s < ND; s++) {
    const set1 = [], set2 = [], fly1 = [], fly2 = [], band = [];
    const i0 = Math.max(0, s - (NZ - 1)), i1 = Math.min(NX - 1, s);
    for (let i = i0; i <= i1; i++) {
      const j = s - i, n = j * NX + i, x = i * PX, z = j * PZ;
      const cv = (i + 0.5) / NX + (j + 0.5) / NZ - cut;
      if (cv > 0) {
        // the cut: a short dissolve band, both layers, then nothing (the field below reads through)
        if (cv < cutBand) band.push([x, z, 1 - cv / cutBand, TONE[n * 2], TONE[n * 2 + 1]]);
        continue;
      }
      const u1 = (t5 - A1[n]) / T.drop1;
      if (u1 <= 0) continue;
      if (u1 >= 1) set1.push([x, TONE[n * 2], z]);
      else fly1.push([x, z, u1, TONE[n * 2]]);
      const u2 = (t5 - A2[n]) / T.drop2;
      if (u2 <= 0) continue;
      if (u2 >= 1) set2.push([x, TONE[n * 2 + 1], z]);
      else fly2.push([x, z, u2, TONE[n * 2 + 1]]);
    }
    drawBatch(set1, 0, dim1);
    for (const [x, z, a, t1, t2] of band) { drawOne(x, z, 0, a * a, t1); drawOne(x, z, L2, a * a, t2); }
    // opaque almost at once (a solid pallet dropping in, not a translucent smear over beat 4's blocks)
    for (const [x, z, u, tone] of fly1) drawOne(x, z, Math.max(-0.05, fall1(u)), ease.outCubic(clamp(u * 6)), tone);
    if (lift2 > 0) { later.push([set2, fly2]); continue; }
    drawBatch(set2, L2);
    for (const [x, z, u, tone] of fly2) drawOne(x, z, L2 + Math.max(-0.03, fall2(u)), 1, tone, 0.3 * (1 - ease.outCubic(u)));
  }
  for (const [set2, fly2] of later) {
    drawBatch(set2, L2);
    for (const [x, z, u, tone] of fly2) drawOne(x, z, L2 + Math.max(-0.03, fall2(u)), 1, tone, 0.3 * (1 - ease.outCubic(u)));
  }

  // the layer-2 leading edge: a thin accent line along the landed front (top of layer 2), soft glow under it
  {
    const sL = (t5 - T.l2 - T.drop2 * 0.3) / T.l2Dur;        // front of the rows that have (visually) settled
    const a = clamp(sL * 12) * (1 - ease.inCubic(prog(sL, 0.92, 0.08)));
    if (a > 0.01 && lift2 === 0) {
      const f = clamp(sL * (L2_ROWS - 1) / L2_ROWS + 1 / L2_ROWS) * 2;   // x/BLOCK_W + z/BLOCK_D on the front
      const yT = 2 * PH + 0.02;
      const p0 = f <= 1 ? [f * BLOCK_W, 0] : [BLOCK_W, (f - 1) * BLOCK_D];
      const p1 = f <= 1 ? [0, f * BLOCK_D] : [(f - 1) * BLOCK_W, BLOCK_D];
      c.save();
      c.globalCompositeOperation = 'lighter';
      c.lineCap = 'round';
      c.beginPath();
      c.moveTo(sx(p0[0], p0[1]), sy(p0[0], yT, p0[1]));
      c.lineTo(sx(p1[0], p1[1]), sy(p1[0], yT, p1[1]));
      c.strokeStyle = rgba(ACC, 0.12 * a); c.lineWidth = 9; c.stroke();
      c.strokeStyle = rgba(ACC, 0.7 * a); c.lineWidth = 1.6; c.stroke();
      c.restore();
    }
  }

  // sheen: a soft light band sweeps over the top as the second layer lands
  const sh = prog(t5, T.l2 + 0.3, 1.6);
  if (sh > 0 && sh < 1) {
    const yT = 2 * PH;
    const a = Math.sin(sh * Math.PI);
    const d0 = lerp(-0.2, 1.2, ease.inOutCubic(sh));     // band position along the diagonal
    const p0 = [sx(BLOCK_W * d0, 0), sy(BLOCK_W * d0, yT, 0)], p1 = [sx(0, BLOCK_D * d0), sy(0, yT, BLOCK_D * d0)];
    const mx = (p0[0] + p1[0]) / 2, my = (p0[1] + p1[1]) / 2;
    c.save();
    c.beginPath();
    c.moveTo(sx(0, 0), sy(0, yT, 0)); c.lineTo(sx(BLOCK_W, 0), sy(BLOCK_W, yT, 0));
    c.lineTo(sx(BLOCK_W, BLOCK_D), sy(BLOCK_W, yT, BLOCK_D)); c.lineTo(sx(0, BLOCK_D), sy(0, yT, BLOCK_D));
    c.closePath();
    c.clip();
    const g = c.createLinearGradient(mx - 260, my - 150, mx + 260, my + 150);
    g.addColorStop(0, 'rgba(255,255,255,0)');
    g.addColorStop(0.5, `rgba(235,255,240,${0.22 * a})`);
    g.addColorStop(1, 'rgba(255,255,255,0)');
    c.globalCompositeOperation = 'lighter';
    c.fillStyle = g;
    c.fillRect(0, 0, W, H);
    c.restore();
  }
  // studio light from the back-left: a soft falloff towards the front-right corner (lights the block only)
  {
    const [ax, ay] = [sx(0, 0), sy(0, 2 * PH + lift2, 0)], [bx, by] = [sx(BLOCK_W, BLOCK_D), sy(BLOCK_W, 0, BLOCK_D)];
    c.save();
    c.globalCompositeOperation = 'source-atop';
    const g = c.createLinearGradient(ax, ay, bx, by);
    g.addColorStop(0, `rgba(255,255,250,${0.10 * pk})`);
    g.addColorStop(0.35, 'rgba(0,0,0,0)');
    g.addColorStop(1, `rgba(0,8,4,${0.34 * pk})`);
    c.fillStyle = g;
    c.fillRect(0, 0, W, H);
    c.restore();
  }
  // crisp rim light on the finished block's top edges
  const rim = ease.outCubic(prog(t5, T_DONE - 0.1, 0.6)) * (cut < 2.05 ? 0 : 1);   // s6 outlines a cut block itself
  if (rim > 0) {
    const yT = 2 * PH + lift2;
    c.save();
    c.lineJoin = 'round';
    c.strokeStyle = `rgba(230,250,236,${0.55 * rim})`;
    c.lineWidth = 1.4;
    c.beginPath();
    c.moveTo(sx(0, BLOCK_D), sy(0, yT, BLOCK_D)); c.lineTo(sx(BLOCK_W, BLOCK_D), sy(BLOCK_W, yT, BLOCK_D)); c.lineTo(sx(BLOCK_W, 0), sy(BLOCK_W, yT, 0));
    c.stroke();
    c.strokeStyle = `rgba(230,250,236,${0.3 * rim})`;
    c.beginPath();
    c.moveTo(sx(0, BLOCK_D), sy(0, yT, BLOCK_D)); c.lineTo(sx(0, 0), sy(0, yT, 0)); c.lineTo(sx(BLOCK_W, 0), sy(BLOCK_W, yT, 0));
    c.stroke();
    c.restore();
  }
  void C;

  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalAlpha *= alpha;
  ctx.drawImage(off, 0, 0);
  ctx.restore();
}

// ------------------------------------------------------------------ counter label (shared with s6 for the hand-off)
const fmtUsd = (n) => '$' + L.fmt(n);
export const LABEL = { x: 1000, y: 500, maxW: 880 };

/** The "$… / … pallets" counter at beat-5 time t5; k = visibility, lift = exit offset (px). */
export function drawCounter(ctx, v, t5, k = 1, lift = 0) {
  if (k <= 0) return;
  // read at the frame's own time (all motion-blur sub-frames agree → no ghost digits), stepping at 15 Hz
  const tq = Math.floor((t5 + Math.round(v.gt * 30) / 30 - v.gt) * 15 + 1e-6) / 15;
  // the count starts where beat 4 left off (its 200 blocks = 2,000 pallets) and follows the pallets landing
  const n = landed(tq);
  const done = t5 >= T_DONE;
  const pallets = done ? 10000 : n;
  const dollars = pallets * 1e8;
  ctx.save();
  ctx.translate(0, -lift);
  const big = fmtUsd(dollars);
  const size = Math.min(104, L.fitSize(ctx, '$1,000,000,000,000', LABEL.maxW, 104, 800, L.FONT.display));
  L.bigLabel(ctx, { x: LABEL.x, y: LABEL.y, big, small: `${L.fmt(pallets)} pallets`, k, accent: v.accent, align: 'right', size });
  // completion flash
  const f = prog(t5, T_DONE, 0.7);
  if (f > 0 && f < 1) {
    ctx.font = L.font(size, 800, L.FONT.display);
    L.glow(ctx, v.accent, 30, () => {
      ctx.fillStyle = rgba(v.accent, 0.5);
      ctx.textBaseline = 'alphabetic';
      L.trackedText(ctx, big, LABEL.x, LABEL.y, -1, 'right');
    }, k * Math.sin(f * Math.PI) * 0.8);
  }
  ctx.restore();
}

export default {
  beat: 5,
  chapter: { num: '05', title: 'One trillion', sub: '10,000 pallets, stacked two high' },
  captions: true,
  layer: 5,
  cues(d) {
    return [
      { t: 0.08, name: 'shimmer', gain: 0.22, pitch: 0.9 },     // the wave rolls on
      { t: 0.3, name: 'count', gain: 0.28, pitch: 1.0 },        // counter climbing
      { t: 0.95, name: 'riser', gain: 0.25, pitch: 1.0 },       // build into the second layer
      { t: T.l2 + T.drop2 * 0.7, name: 'impact', gain: 0.35, pitch: 0.8 },   // first pallets of layer 2 land
      { t: T.l2 + 0.5, name: 'swish', gain: 0.2, pitch: 0.9 },  // the sweep
      { t: T_DONE, name: 'ping', gain: 0.4, pitch: 1.2 },        // $1,000,000,000,000
      { t: T_DONE + 0.02, name: 'bloom', gain: 0.3, pitch: 1.0 },
    ].filter((c) => c.t < d + 0.5);
  },
  drawWorld(ctx, v) {
    const s6 = v.tl.scenes[6];
    if (v.t < 0 || (s6 && v.gt >= s6.start)) return;   // s6-field.js draws the block from beat 6 on
    drawBlock(ctx, v, v.t);
  },
  drawOverlay(ctx, v) {
    // fade in with the beat; no fade-out at the end: s6 picks the counter up seamlessly
    const s6 = v.tl.scenes[6];
    if (s6 && v.gt >= s6.start) return;
    const kin = ease.outCubic(prog(v.t, 0.3, 0.5));   // s4's "$100s of billions" has left by the beat start
    drawCounter(ctx, v, v.t, kin);
  },
};
