// Beat 4 — "The world's richest people own hundreds of these."
// First the ten pallets close ranks onto the trillion grid (s3 squeezes them: pitch 1.3 × 1.15 → 1.1 × 1.0, a
// short shove with a tick). Then the $1B block duplicates outward across the floor with no aisles, one 5 × 2
// tile (5.5 × 2.0 m = exactly ten of s5's footprints) at a time: copies rise out of the floor in a
// quarter-ellipse wave from the original (a light ring on the floor marks the front), each one overshooting
// slightly and settling with a soft accent flash. The wave front is an iso diagonal (x + z = const), which reads
// as a level line sweeping DOWN the screen from the original block; it stops at x + z = REACH so the carpet
// ends on a visible near edge above y ≈ 1250 at the beat-4 hold (≈ 110 blocks = a countable "hundreds",
// and the caption band below stays on dark floor). The sides run off the frame. A key on the original block ("1 block = $1 billion") anchors the unit; the big label
// "$100s of billions" lands on "hundreds".
// RICH (exported) is the exact layout + timing so s5 can treat these footprints as already landed and carry
// the same wave front on: same grid, no re-pack.
import * as L from '../../../../engine/runtime/lib.js';
import { isoPt } from '../env.js';
import * as S5 from './s5-trillion.js';   // read lazily (FROM_RICH hand-off flag) — never at top level
import { PAL, EDGE, BILL, WOOD, WOOD_DK, drawPallet, contactShadow, onScreen, covered, squeezeK, layoutAt, SQ } from './s3-billion.js';

const { ease, clamp, lerp, prog, rgba, mix } = L;
const ACC = [110, 220, 140];

// ------------------------------------------------------------------ layout (metres) — s5's grid
// Literals on purpose (mirror s3 GRID / s5 NX, PX, PW…): this module must not read other scene modules at
// top level, so s5 can import RICH without an import-cycle TDZ.
const G = { PX: 1.1, PZ: 1.0, PW: 1.0, PD: 0.9, H: 1.15, BASE: 0.144, NX: 100, NZ: 50 };
const TI = 5, TJ = 2;                                         // a $1B tile = 5 × 2 footprints
const TW = TI * G.PX, TD = TJ * G.PZ;                         // 5.5 × 2.0 m tile pitch (no aisles)
const BW = (TI - 1) * G.PX + G.PW, BD = (TJ - 1) * G.PZ + G.PD;   // 5.4 × 1.9 m block footprint
// A bounded, countable carpet: NTI blocks along x (rows of 10) × NTJ rows along z = 200 × $1B, framed whole by
// camera key 4. s5 mirrors these literals (RICH_I = NTI·TI, RICH_J = NTJ·TJ footprints) and starts with them landed.
export const NTI = 10, NTJ = 20;
const DN_MAX = (NTI - 1) * TW + (NTJ - 1) * TD;               // block origin x + z of the nearest block
const AX = DN_MAX, AZ = DN_MAX;                               // (kept for RICH consumers: the front is x/AX + z/AZ)
const W0 = 0.5, SPAN = 1.55, POW = 0.85, HOP = 0.5;          // spawn: W0 + SPAN·dn^POW, growth duration

/** Normalised wave position of a block origin (x, z): 0 at the original, 1 at the near edge. */
const dnAt = (x, z) => (x + z) / DN_MAX;
const spawnAt = (dn) => W0 + SPAN * Math.pow(dn, POW);

const BLOCKS = (() => {
  const out = [];
  for (let tj = 0; tj < NTJ; tj++) {
    for (let ti = 0; ti < NTI; ti++) {
      if (!ti && !tj) continue;                                  // the original block (s2 + s3)
      const x = ti * TW, z = tj * TD;
      const dn = dnAt(x, z);
      if (dn > 1 + 1e-6) continue;
      out.push({ ti, tj, x, z, ts: spawnAt(dn), dn, tone: (ti * 7 + tj * 13 + ((ti * tj) % 5)) % 3 });
    }
  }
  return out;                                                    // row-major: back-to-front painter order
})();

/**
 * Layout for s5 (all times in seconds from the beat-4 start; beat 4 lasts tl.scenes[4] end − start).
 *  grid ............ s5's footprint grid (pitch PX × PZ, pallet PW × PD, NX × NZ footprints)
 *  tiles ........... every $1B block incl. the original: footprint origin (i0, j0), TI × TJ footprints, land time
 *  land ............ Float32Array(NX·NZ), footprint n = j·NX + i → land time (Infinity = not part of beat 4)
 *  count ........... blocks on the floor at the end of beat 4 (= $ billions; × 10 = pallets)
 *  dn(x, z), spawnAt(dn), HOP: the wave. A footprint outside RICH can continue the same front with
 *                    A1 = spawnAt(dn(x + PW/2, z + PD/2)) − beat4Duration  (beat-5 time; the far corner ≈ 1.25 s)
 */
export const RICH = (() => {
  const tiles = [{ ti: 0, tj: 0, i0: 0, j0: 0, land: 0, original: true }]
    .concat(BLOCKS.map(({ ti, tj, ts }) => ({ ti, tj, i0: ti * TI, j0: tj * TJ, land: ts + HOP })));
  const land = new Float32Array(G.NX * G.NZ).fill(Infinity);
  for (const t of tiles) for (let j = 0; j < TJ; j++) for (let i = 0; i < TI; i++) land[(t.j0 + j) * G.NX + t.i0 + i] = t.land;
  return { grid: { ...G }, TI, TJ, TW, TD, AX, AZ, W0, SPAN, POW, HOP, dn: dnAt, spawnAt, tiles, land, count: tiles.length };
})();

/** Wave front (normalised ellipse radius) at beat time t. */
const front = (t) => (t <= W0 ? 0 : Math.pow((t - W0) / SPAN, 1 / POW));

// ------------------------------------------------------------------ drawing
const quad = (ctx, pts, fill) => {
  ctx.beginPath();
  ctx.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
};
// per-block tone variants stay within ±3.5 % of s3's BILL, so the money colour never drifts between beats;
// they only let the $1B tiles read as units in the gapless field
const C_TOPS = [rgba(BILL), rgba(mix(BILL, [255, 255, 255], 0.035)), rgba(mix(BILL, [40, 60, 48], 0.035))];
const C_LEFT = rgba(EDGE), C_RIGHT = rgba(mix(EDGE, [20, 30, 26], 0.38));
const C_WL = rgba(mix(WOOD, WOOD_DK, 0.3)), C_WR = rgba(mix(WOOD, WOOD_DK, 0.55));

/**
 * A $1B block (5 × 2 pallets) with its corner at (x, y, z); hs = height scale (growth).
 * Close up: s3's full pallets. Further out: the same ten pallets as plain wrapped boxes, batched per row
 * (right faces → left faces → wooden skirts → tops, back row first), so hundreds of blocks stay cheap.
 */
function drawBlock(ctx, v, x, y, z, flash, hs = 1, tone = 0) {
  const s = 1 / v.cam.mpp;
  if (s >= 34) {
    for (let r = 0; r < TJ; r++) for (let c = 0; c < TI; c++) drawPallet(ctx, v, x + c * G.PX, y, z + r * G.PZ, { flash, hs, glow: false, w: G.PW, d: G.PD });
    return;
  }
  const P = (p, q, rr) => isoPt(v, p, y + q * hs, rr);
  const w = G.PW, d = G.PD, h = G.H, b = G.BASE;
  const q4 = (a1, a2, a3, a4) => { ctx.moveTo(a1[0], a1[1]); ctx.lineTo(a2[0], a2[1]); ctx.lineTo(a3[0], a3[1]); ctx.lineTo(a4[0], a4[1]); ctx.closePath(); };
  const fill = (col, fn) => { ctx.beginPath(); for (let c = 0; c < 5; c++) fn(x + c * G.PX); ctx.fillStyle = col; ctx.fill(); };
  for (let r = 0; r < 2; r++) {
    const zz = z + r * G.PZ;
    const wood = s > 6;
    const y0 = wood ? b : 0;
    fill(C_RIGHT, (xx) => q4(P(xx + w, y0, zz), P(xx + w, y0, zz + d), P(xx + w, h, zz + d), P(xx + w, h, zz)));
    fill(C_LEFT, (xx) => q4(P(xx, y0, zz + d), P(xx + w, y0, zz + d), P(xx + w, h, zz + d), P(xx, h, zz + d)));
    if (wood) {
      fill(C_WR, (xx) => q4(P(xx + w, 0, zz), P(xx + w, 0, zz + d), P(xx + w, b, zz + d), P(xx + w, b, zz)));
      fill(C_WL, (xx) => q4(P(xx, 0, zz + d), P(xx + w, 0, zz + d), P(xx + w, b, zz + d), P(xx, b, zz + d)));
    }
    fill(C_TOPS[tone], (xx) => q4(P(xx, h, zz), P(xx + w, h, zz), P(xx + w, h, zz + d), P(xx, h, zz + d)));
    if (s > 9) {
      // crisp highlight on the front top edges
      ctx.beginPath();
      for (let c = 0; c < 5; c++) {
        const xx = x + c * G.PX, p0 = P(xx, h, zz + d), p1 = P(xx + w, h, zz + d), p2 = P(xx + w, h, zz);
        ctx.moveTo(p0[0], p0[1]); ctx.lineTo(p1[0], p1[1]); ctx.lineTo(p2[0], p2[1]);
      }
      ctx.strokeStyle = 'rgba(255,255,255,0.4)';
      ctx.lineWidth = 1;
      ctx.stroke();
    }
    if (flash > 0.01) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      fill(rgba(ACC, 0.15 * flash), (xx) => q4(P(xx, h, zz), P(xx + w, h, zz), P(xx + w, h, zz + d), P(xx, h, zz + d)));
      ctx.restore();
    }
  }
}

/** The wave front: a soft diagonal line of light on the floor (level on screen). */
function drawFront(ctx, v, t) {
  const rho = front(t - HOP * 0.8);
  const a = clamp(rho * 6) * (1 - ease.inCubic(prog(rho, 0.8, 0.25)));
  if (a <= 0.01) return;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.beginPath();
  // a straight level line across the floor, just ahead of the newest blocks' near corners
  const c0 = rho * DN_MAX + BW + BD + 0.6;
  for (const [x, z] of [[c0 + 2, -2], [-2, c0 + 2]]) {
    const [sx, sy] = isoPt(v, x, 0.01, z);
    x > 0 ? ctx.moveTo(sx, sy) : ctx.lineTo(sx, sy);
  }
  ctx.strokeStyle = rgba(ACC, 0.08 * a);
  ctx.lineWidth = Math.max(6, v.ws(2.2));
  ctx.lineJoin = 'round';
  ctx.stroke();
  ctx.strokeStyle = rgba(ACC, 0.42 * a);
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.restore();
}

function blockState(b, t) {
  if (t < b.ts) return null;
  const p = prog(t, b.ts, HOP);
  const tau = t - b.ts - HOP;
  return {
    x: b.x, z: b.z, y: 0, tone: b.tone,
    hs: ease.outBack(p, 1.9),                                 // rises out of the floor, overshoots ~6 %, settles
    flash: p < 1 ? 0.5 * ease.outCubic(p) : 0.5 * Math.exp(-6 * tau),
  };
}

export default {
  beat: 4,
  chapter: { num: '04', title: 'The richest', sub: 'Fortunes in the hundreds of billions' },
  captions: true,
  layer: 0,
  cues(d) {
    const out = [
      { t: SQ.t + SQ.d - 0.02, name: 'tick', gain: 0.26, pitch: 0.75 },   // the ten pallets lock onto the grid
      { t: 0.5, name: 'blip', gain: 0.22, pitch: 1.2 },           // key on the original block
      { t: 0.45, name: 'swell', gain: 0.3, pitch: 1 },
      { t: 0.7, name: 'shimmer', gain: 0.28, pitch: 1 },
      { t: 1.32, name: 'ping', gain: 0.3, pitch: 1.1 },           // "$100s of billions" lands
    ];
    // the first copies land on soft ticks, then the wave takes over
    BLOCKS.slice().sort((a, b) => a.ts - b.ts).slice(0, 4).forEach((b, i) => out.push({ t: b.ts + HOP, name: 'tick', gain: 0.2 - i * 0.03, pitch: 1.2 + i * 0.1 }));
    return out;
  },
  drawWorld(ctx, v) {
    const t = v.t;
    if (t < W0 || (S5.FROM_RICH && v.gt >= v.tl.scenes[5]?.start)) return;   // s5 owns these footprints from its first frame
    const sts = [];
    for (const b of BLOCKS) {
      const st = blockState(b, t);
      if (!st || !onScreen(v, st.x, st.z, BW, BD, 3) || covered(v, st.x, st.z, BW, BD)) continue;
      sts.push(st);
    }
    for (const st of sts) contactShadow(ctx, v, st.x, st.z, BW, BD, 0, clamp(st.hs));
    for (const st of sts) drawBlock(ctx, v, st.x, st.y, st.z, st.flash, st.hs, st.tone);
  },
  drawOverlay(ctx, v) {
    const t = v.t;
    // key: outline the original block (follows the squeeze) and call it out; it leaves before s5 starts
    const kout = 1 - ease.inCubic(prog(t, v.d - 0.4, 0.35));
    const kk = v.k * kout * ease.outCubic(prog(t, 0.42, 0.5));
    if (kk > 0) {
      const lay = layoutAt(squeezeK(v));
      const bw = 4 * lay.px + lay.w, bd = lay.pz + lay.d;
      const P = (p, r) => isoPt(v, p, PAL.h + 0.02, r);
      const pts = [P(-0.08, -0.08), P(bw + 0.08, -0.08), P(bw + 0.08, bd + 0.08), P(-0.08, bd + 0.08)];
      const draw = ease.inOutCubic(prog(t, 0.42, 0.6));
      ctx.save();
      ctx.globalAlpha *= v.k * kout;
      ctx.shadowColor = rgba(ACC, 0.9);
      ctx.shadowBlur = 10;
      ctx.strokeStyle = rgba(ACC, 0.95);
      ctx.lineWidth = 3;
      ctx.lineJoin = 'round';
      // the outline draws itself around the block
      const per = pts.map((p, i) => Math.hypot(pts[(i + 1) % 4][0] - p[0], pts[(i + 1) % 4][1] - p[1]));
      let left = draw * per.reduce((a, b) => a + b, 0);
      ctx.beginPath();
      ctx.moveTo(pts[0][0], pts[0][1]);
      for (let i = 0; i < 4 && left > 0; i++) {
        const q = pts[(i + 1) % 4], f = Math.min(1, left / per[i]);
        ctx.lineTo(lerp(pts[i][0], q[0], f), lerp(pts[i][1], q[1], f));
        left -= per[i];
      }
      ctx.stroke();
      ctx.restore();
      // callout: leader from the block's right corner up to the key text
      const [ax, ay] = P(bw + 0.08, -0.08);
      const tx = Math.min(ax + 70, L.W - 420), ty = ay - 80;
      const lk = prog(t, 0.57, 0.4);
      L.leader(ctx, ax, ay, tx, ty, lk * v.k * kout, ACC, 0.85);
      const tk = v.k * kout * ease.outCubic(prog(t, 0.72, 0.45));
      if (tk > 0) {
        ctx.save();
        ctx.globalAlpha *= tk;
        ctx.font = L.font(28, 600, L.FONT.body);
        ctx.textBaseline = 'middle';
        const s1 = '1 BLOCK = ', s2 = '$1 BILLION';
        ctx.letterSpacing = '3px';
        const w1 = ctx.measureText(s1).width;
        ctx.font = L.font(30, 800, L.FONT.body);
        const w2 = ctx.measureText(s2).width;
        ctx.letterSpacing = '0px';
        const bx = tx + 6, by = ty, pad = 16, bw = w1 + w2 + pad * 2;
        ctx.fillStyle = 'rgba(6,12,9,0.72)';
        L.roundRect(ctx, bx, by - 26, bw * ease.outCubic(clamp(tk * 1.2)), 52, 10);
        ctx.fill();
        ctx.font = L.font(28, 600, L.FONT.body);
        ctx.fillStyle = 'rgba(220,230,225,0.95)';
        L.trackedText(ctx, s1, bx + pad + (1 - tk) * 12, by + 1, 3);
        ctx.font = L.font(30, 800, L.FONT.body);
        ctx.fillStyle = rgba(ACC);
        L.trackedText(ctx, s2, bx + pad + w1 + (1 - tk) * 12, by + 1, 3);
        ctx.restore();
      }
    }
    // headline lands on "hundreds"
    const k = v.k * ease.outCubic(prog(t, 1.3, 0.5)) * (1 - ease.inCubic(prog(t, v.d - 0.4, 0.33)));   // gone before s5's counter
    L.bigLabel(ctx, { x: 72, y: 450, big: '$100s of billions', small: "the world's richest fortunes", k, accent: v.accent, size: 112 });
  },
};
