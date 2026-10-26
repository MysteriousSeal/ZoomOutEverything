// Beat 6 (payoff) — "Stacked two high, they cover a whole football field."
// The finished trillion block (from s5) stays solid cash, and a US football field (109.7 × 48.8 m incl. end
// zones) draws itself underneath: perimeter, turf wipe with yard lines, end zones, numbers, goalposts. Then the
// cash is cut away along a diagonal from the near corner, so the near end zone and yard lines read through a
// clean two-pallet-high cross-section, while the back of the field stays covered in money. A person stands on the
// uncovered turf at the 50-yard line, a few metres in front of the 2.3 m cash wall: "you are here".
import * as L from '../../../../engine/runtime/lib.js';
import { drawHuman, isoPt } from '../env.js';
import { drawBlock, drawCounter, LABEL, BLOCK_W, BLOCK_D, PH, NX, NZ, PX, PZ, CUT_BAND } from './s5-trillion.js';

const { W, H, ease, clamp, lerp, prog, rgba } = L;
const C = Math.cos(Math.PI / 6);

// ------------------------------------------------------------------ field (world metres, from the origin)
const FL = 109.728, FWD = 48.768, YD = 0.9144, EZ = 10 * YD;
const HUMAN = [55, 31];          // on the 50-yard line, ~4 m in front of the cut face (uncovered once the cut has opened)
const HUMAN_IN = 2.6;            // he appears once the cut has cleared his spot
const HUMAN_MARK = 1.8;          // marker exaggeration of the human once "you are here" lands
const NUM_H = 4.2;               // painted yard-number height (m)
const POSTS = [0, FL];           // goalposts on the end lines
const POST_Z = FWD / 2, POST_HALF = 2.82, BAR_Y = 3.05, UP_Y = 3.05 + 9.1;

// ------------------------------------------------------------------ timing (seconds from beat start)
const T = {
  lift: 0.1, liftUp: 0.4, drop: 1.0, dropDur: 0.26,   // "stacked two high": layer 2 lifts off, holds, drops back
  xray: 1.1, xrayDur: 0.8,       // the block outline (glass volume over the cut-away part) draws in
  cut: 1.25, cutDur: 1.45,       // the diagonal cutaway opens from the near corner (on "whole football field")
  rim: 1.2, rimDur: 0.9,         // perimeter traces itself
  wipe: 1.45, wipeDur: 1.1,      // turf + yard lines sweep end to end
  posts: 2.45,                   // goalposts rise (back then front)
  countOut: 2.3,                 // the $1T counter leaves …
  label: 2.65,                   // … and the payoff label lands on "football field"
  you: 3.4,                      // "you are here"
};
const LIFT_M = 6.0;
const PAYOFF_Y = 420;            // payoff label baseline (the counter's was LABEL.y = 500)              // how far layer 2 lifts (m)

/** Height (m) the second layer is lifted at beat time t: eases up, holds, drops back with a small bounce. */
function liftAt(t) {
  const up = ease.outCubic(prog(t, T.lift, T.liftUp));
  const d = prog(t, T.drop, T.dropDur);
  const down = ease.inCubic(d);
  const bounce = d >= 1 ? 0.12 * Math.sin(prog(t, T.drop + T.dropDur, 0.18) * Math.PI) : 0;
  return LIFT_M * up * (1 - down) + bounce;
}
// the cut threshold on (i + ½)/NX + (j + ½)/NZ: 2.1 = nothing cut, CUT_END = the near ~45 % of the field open
const CUT_END = 1.06;
const cutAt = (t) => lerp(2 + CUT_BAND + 0.02, CUT_END, ease.inOutCubic(prog(t, T.cut, T.cutDur)));

// turf colours
const TURF = [30, 66, 44], TURF2 = [36, 76, 51], LINE = [236, 244, 238];

function wipeX(t) { return lerp(-2, FL + 2, ease.inOutCubic(prog(t, T.wipe, T.wipeDur))); }

/** Affine transform mapping (u along +x, w along +z) metres on the ground to the screen. */
function groundXf(ctx, v, x0, z0, y = 0) {
  const m = v.cam.mpp;
  const [ox, oy] = isoPt(v, x0, y, z0);
  ctx.setTransform(C / m, 0.5 / m, -C / m, 0.5 / m, ox, oy);
}

function drawField(ctx, v, t) {
  const wx = wipeX(t);
  if (t < T.rim) return;
  const P = (x, z, y = 0) => isoPt(v, x, y, z);
  ctx.save();
  // ---- turf (revealed by the wipe), stripes every 5 yards
  if (wx > 0) {
    ctx.save();
    groundXf(ctx, v, 0, 0);
    const xr = clamp(wx, 0, FL);
    ctx.fillStyle = rgba(TURF, 0.95);
    ctx.fillRect(0, 0, xr, FWD);
    ctx.fillStyle = rgba(TURF2, 0.9);
    for (let k = 0; k < 20; k += 2) {
      const a = EZ + k * 5 * YD, b = Math.min(a + 5 * YD, xr);
      if (b > a) ctx.fillRect(a, 0, b - a, FWD);
    }
    // end zones in the accent tint
    const ezA = (x) => ease.outCubic(clamp((wx - x) / 6));
    for (const x of [0, FL - EZ]) {
      const a = ezA(x);
      if (a <= 0) continue;
      ctx.fillStyle = rgba(v.accent, 0.42 * a);
      ctx.fillRect(x, 0, Math.min(EZ, Math.max(0, xr - x)), FWD);
    }
    // soft bright edge riding the wipe
    if (wx < FL) {
      const g = ctx.createLinearGradient(wx - 6, 0, wx, 0);
      g.addColorStop(0, 'rgba(200,255,220,0)');
      g.addColorStop(1, 'rgba(200,255,220,0.35)');
      ctx.fillStyle = g;
      ctx.fillRect(Math.max(0, wx - 6), 0, Math.min(6, wx), FWD);
    }
    ctx.restore();
  }

  // ---- yard lines: each draws across the field as the wipe passes
  ctx.lineCap = 'round';
  for (let k = 0; k <= 20; k++) {
    const x = EZ + k * 5 * YD;
    const a = clamp((wx - x) / 9);
    if (a <= 0) continue;
    const e = ease.outCubic(a);
    const goal = k === 0 || k === 20;
    const [ax, ay] = P(x, 0), [bx, by] = P(x, FWD * e);
    ctx.strokeStyle = rgba(LINE, goal ? 0.95 : 0.7);
    ctx.lineWidth = goal ? 2.2 : 1.3;
    ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx, by); ctx.stroke();
  }
  // hash marks every yard (fine texture)
  if (v.cam.mpp < 0.2) {
    ctx.strokeStyle = rgba(LINE, 0.4);
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let k = 1; k < 100; k++) {
      if (k % 5 === 0) continue;
      const x = EZ + k * YD;
      if (x > wx - 4) break;
      for (const z of [0.3, POST_Z - 3.1, POST_Z + 3.1, FWD - 0.3]) {
        const [ax, ay] = P(x, z - 0.35), [bx, by] = P(x, z + 0.35);
        ctx.moveTo(ax, ay); ctx.lineTo(bx, by);
      }
    }
    ctx.stroke();
  }
  // yard numbers, painted on the turf (back ones face the far sideline)
  const nums = [10, 20, 30, 40, 50, 40, 30, 20, 10];
  ctx.save();
  ctx.fillStyle = rgba(LINE, 1);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  nums.forEach((n, i) => {
    const x = EZ + (i + 1) * 10 * YD;
    const a = clamp((wx - x - 3) / 8);
    if (a <= 0) return;
    ctx.globalAlpha = a * 0.6;
    for (const [z, flip] of [[FWD - 12, false], [12, true]]) {
      groundXf(ctx, v, x, z);
      if (flip) ctx.rotate(Math.PI);
      ctx.scale(NUM_H / 100, NUM_H / 100);   // exaggerated (real: 1.83 m) so they read as numbers at this zoom
      ctx.font = L.font(100, 700, L.FONT.din);
      ctx.fillText(String(n), 0, 0);
    }
  });
  ctx.restore();

  // ---- perimeter: traces itself from the origin corner (both ways round)
  const rk = ease.inOutCubic(prog(t, T.rim, T.rimDur));
  if (rk > 0) {
    const half = (FL + FWD) * rk;
    const path = (pts) => {
      // walk `half` metres along pts
      let left = half;
      ctx.beginPath();
      let [px, pz] = pts[0];
      ctx.moveTo(...P(px, pz));
      for (let i = 1; i < pts.length && left > 0; i++) {
        const [qx, qz] = pts[i];
        const len = Math.hypot(qx - px, qz - pz);
        const f = Math.min(1, left / len);
        ctx.lineTo(...P(lerp(px, qx, f), lerp(pz, qz, f)));
        left -= len;
        [px, pz] = [qx, qz];
      }
      ctx.stroke();
    };
    ctx.strokeStyle = rgba(LINE, 0.95);
    ctx.lineWidth = 2.4;
    path([[0, 0], [FL, 0], [FL, FWD]]);
    path([[0, 0], [0, FWD], [FL, FWD]]);
    // glowing pen tips
    if (rk < 1) {
      const tip = (pts) => {
        let left = half, [px, pz] = pts[0];
        for (let i = 1; i < pts.length; i++) {
          const [qx, qz] = pts[i], len = Math.hypot(qx - px, qz - pz);
          if (left <= len) return P(lerp(px, qx, left / len), lerp(pz, qz, left / len));
          left -= len; [px, pz] = [qx, qz];
        }
        return P(px, pz);
      };
      for (const p of [tip([[0, 0], [FL, 0], [FL, FWD]]), tip([[0, 0], [0, FWD], [FL, FWD]])]) L.lightBlob(ctx, p[0], p[1], 34, [200, 255, 220], 0.5);
    }
  }
  ctx.restore();
}

/** Goalposts (pale yellow), rising with overshoot. yMin clips to the part above a height (drawn over the block). */
function drawPosts(ctx, v, t, yMin = 0) {
  POSTS.forEach((x, i) => {
    const k = ease.outBack(clamp(prog(t, T.posts + i * 0.18, 0.55)), 1.6);
    if (k <= 0) return;
    const s = k;   // vertical scale
    const segs = [
      [[x, 0, POST_Z], [x, BAR_Y * s, POST_Z]],
      [[x, BAR_Y * s, POST_Z - POST_HALF], [x, BAR_Y * s, POST_Z + POST_HALF]],
      [[x, BAR_Y * s, POST_Z - POST_HALF], [x, UP_Y * s, POST_Z - POST_HALF]],
      [[x, BAR_Y * s, POST_Z + POST_HALF], [x, UP_Y * s, POST_Z + POST_HALF]],
    ];
    ctx.save();
    ctx.globalAlpha *= clamp(k * 3);
    ctx.lineCap = 'round';
    ctx.strokeStyle = rgba([246, 228, 150], 0.95);
    ctx.lineWidth = 2.6;
    ctx.beginPath();
    for (const [[ax, ay, az], [bx, by, bz]] of segs) {
      if (Math.max(ay, by) <= yMin) continue;
      const y0 = Math.max(ay, yMin), y1 = Math.max(by, yMin);
      const [px, py] = isoPt(v, ax, y0, az), [qx, qy] = isoPt(v, bx, y1, bz);
      ctx.moveTo(px, py); ctx.lineTo(qx, qy);
    }
    ctx.stroke();
    ctx.restore();
  });
}

/** Crisp outline of the x-ray block (top rim, layer seam, front edges). */
function drawOutline(ctx, v, a) {
  if (a <= 0) return;
  const P = (x, y, z) => isoPt(v, x, y, z);
  const Wb = BLOCK_W, Db = BLOCK_D, Hb = 2 * PH;
  const line = (pts) => { ctx.beginPath(); pts.forEach((p, i) => (i ? ctx.lineTo(...P(...p)) : ctx.moveTo(...P(...p)))); ctx.stroke(); };
  ctx.save();
  ctx.lineJoin = 'round';
  ctx.strokeStyle = rgba([225, 245, 230], 0.75 * a);
  ctx.lineWidth = 1.6;
  line([[0, Hb, 0], [Wb, Hb, 0], [Wb, Hb, Db], [0, Hb, Db], [0, Hb, 0]]);
  line([[0, Hb, Db], [0, 0, Db], [Wb, 0, Db], [Wb, 0, 0], [Wb, Hb, 0]]);
  line([[Wb, Hb, Db], [Wb, 0, Db]]);
  ctx.strokeStyle = rgba([225, 245, 230], 0.4 * a);
  ctx.lineWidth = 1;
  line([[0, PH, Db], [Wb, PH, Db], [Wb, PH, 0]]);
  ctx.restore();
}

/** Paints the block's iso silhouette with the studio floor (same gradient as env.drawBackground), so whatever
 *  earlier scenes left under the cash (the $1B blocks, the first pallet…) can't show through the x-ray. */
function clearUnderBlock(ctx, v, lift = 0) {
  const Hb = 2 * PH + lift + 0.02;
  const pts = [[0, Hb, 0], [BLOCK_W, Hb, 0], [BLOCK_W, 0, 0], [BLOCK_W, 0, BLOCK_D], [0, 0, BLOCK_D], [0, Hb, BLOCK_D]].map(([x, y, z]) => isoPt(v, x, y, z));
  ctx.save();
  ctx.beginPath();
  pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
  ctx.closePath();
  const g = ctx.createRadialGradient(W / 2, H * 0.42, 50, W / 2, H * 0.5, H * 0.85);
  g.addColorStop(0, '#16201c');
  g.addColorStop(0.55, '#0c1210');
  g.addColorStop(1, '#050807');
  ctx.fillStyle = g;
  ctx.fill();
  ctx.restore();
}

/** "Stacked two high": while layer 2 is lifted, a glint runs from the visible front corner both ways along
 *  layer 1's top front edge, and the two front bands split (layer 1 dims, layer 2 gets an accent tint). */
const SEAM = { in: 0.12, run: 0.8, out: 1.15, outDur: 0.5 };
function drawSeam(ctx, v, t) {
  const k = prog(t, SEAM.in, SEAM.run);
  const fade = 1 - ease.inCubic(prog(t, SEAM.out, SEAM.outDur));
  if (k <= 0 || fade <= 0) return;
  const P = (x, y, z) => isoPt(v, x, y, z);
  const Wb = BLOCK_W, Db = BLOCK_D, l2 = PH + liftAt(t);
  const band = ease.outCubic(prog(t, SEAM.in, 0.4)) * fade;
  const face = (pts, col) => { ctx.beginPath(); pts.forEach((p, i) => (i ? ctx.lineTo(...P(...p)) : ctx.moveTo(...P(...p)))); ctx.closePath(); ctx.fillStyle = col; ctx.fill(); };
  ctx.save();
  face([[0, 0, Db], [Wb, 0, Db], [Wb, PH, Db], [0, PH, Db]], `rgba(0,0,0,${0.3 * band})`);
  face([[Wb, 0, 0], [Wb, 0, Db], [Wb, PH, Db], [Wb, PH, 0]], `rgba(0,0,0,${0.3 * band})`);
  ctx.globalCompositeOperation = 'lighter';
  face([[0, l2, Db], [Wb, l2, Db], [Wb, l2 + PH, Db], [0, l2 + PH, Db]], rgba(v.accent, 0.14 * band));
  face([[Wb, l2, 0], [Wb, l2, Db], [Wb, l2 + PH, Db], [Wb, l2 + PH, 0]], rgba(v.accent, 0.14 * band));
  ctx.restore();
  const e = ease.inOutCubic(k);
  const c0 = P(Wb, PH, Db), tA = P(lerp(Wb, 0, e), PH, Db), tB = P(Wb, PH, lerp(Db, 0, e));
  ctx.save();
  ctx.lineCap = 'round';
  L.glow(ctx, v.accent, 10, () => {
    ctx.strokeStyle = rgba(v.accent, 0.9);
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.moveTo(...tA); ctx.lineTo(...c0); ctx.lineTo(...tB);
    ctx.stroke();
  }, fade);
  if (k < 1) for (const p of [tA, tB]) L.lightBlob(ctx, p[0], p[1], 30, v.accent, 0.6 * fade);
  L.lightBlob(ctx, c0[0], c0[1], 26, v.accent, 0.5 * fade * (1 - ease.outCubic(k)));
  ctx.restore();
}

/** Dimension on the front vertical edge, out on the floor beside the left face: "2 pallets · 2.3 m". */
const DIM = { in: 0.2, dur: 0.45, out: 1.9, outDur: 0.22 };
function drawStackDim(ctx, v, t) {
  const kin = prog(t, DIM.in, DIM.dur), kout = ease.inCubic(prog(t, DIM.out, DIM.outDur));
  if (kin <= 0 || kout >= 1) return;
  const off = 3.2;                                   // metres out from the left face (+z)
  const [bx, by0] = isoPt(v, BLOCK_W, 0, BLOCK_D + off);
  const lift = liftAt(t);
  const [, by1] = isoPt(v, BLOCK_W, PH, BLOCK_D + off);
  const [, by1b] = isoPt(v, BLOCK_W, PH + lift, BLOCK_D + off);
  const [, by2] = isoPt(v, BLOCK_W, 2 * PH + lift, BLOCK_D + off);
  const [cx, cy] = isoPt(v, BLOCK_W, 0, BLOCK_D);
  const e = ease.outCubic(kin);
  ctx.save();
  ctx.globalAlpha *= 1 - kout;
  // extension line from the corner to the bracket's foot
  ctx.strokeStyle = rgba([235, 245, 238], 0.5);
  ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(lerp(cx, bx, e), lerp(cy, by0, e)); ctx.stroke();
  // bracket (arms point back towards the block), plus a tick at the layer seam
  // one segment marker per layer (they part as layer 2 lifts), each with end caps, drawing in from the seam
  const e2 = ease.outCubic(kin);
  ctx.strokeStyle = rgba(v.accent, 0.95);
  ctx.fillStyle = rgba(v.accent, 0.95);
  ctx.lineWidth = 3;
  ctx.lineCap = 'round';
  for (const [ya, yb] of [[by0, by1], [by1b, by2]]) {
    const m = (ya + yb) / 2, a = lerp(m, ya, e2), b = lerp(m, yb, e2);
    ctx.beginPath(); ctx.moveTo(bx, a - 1.5); ctx.lineTo(bx, b + 1.5); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(bx - 6, a - 1.5); ctx.lineTo(bx + 6, a - 1.5); ctx.moveTo(bx - 6, b + 1.5); ctx.lineTo(bx + 6, b + 1.5); ctx.stroke();
  }
  // label: two short lines, right-aligned, left of the bracket
  const la = clamp(kin * 1.8 - 0.6);
  if (la > 0) {
    const ty = (by0 + by2) / 2 + (1 - ease.outCubic(la)) * 8;
    const tx = bx - 34;
    ctx.globalAlpha *= la;
    ctx.shadowColor = 'rgba(0,0,0,0.75)';
    ctx.shadowBlur = 10;
    ctx.textBaseline = 'alphabetic';
    ctx.font = L.font(34, 800, L.FONT.display);
    ctx.fillStyle = rgba(v.accent);
    L.trackedText(ctx, '2 PALLETS HIGH', tx, ty + 2, 1, 'right');
    ctx.font = L.font(24, 600, L.FONT.body);
    ctx.fillStyle = rgba([215, 225, 235], 0.95);
    L.trackedText(ctx, '2.3 M · 7.5 FT', tx, ty + 34, 2, 'right');
  }
  ctx.restore();
}

/** Over the cut-away part: a faint glass lid at the block's top and a crisp accent line along the cut edge. */
function drawCutGlass(ctx, v, t, cut) {
  if (cut >= 2) return;
  const Hb = 2 * PH;
  // the cut line in metres: x/Wc + z/Dc = cut, with Wc = NX·PX, Dc = NZ·PZ (pallet-centre space)
  const Wc = NX * PX, Dc = NZ * PZ;
  const seg = (c) => {
    const pts = [];
    // intersect x/Wc + z/Dc = c with the block rectangle [0, BLOCK_W] × [0, BLOCK_D]
    const zAtX = (x) => (c - x / Wc) * Dc, xAtZ = (z) => (c - z / Dc) * Wc;
    for (const x of [0, BLOCK_W]) { const z = zAtX(x); if (z >= 0 && z <= BLOCK_D) pts.push([x, z]); }
    for (const z of [0, BLOCK_D]) { const x = xAtZ(z); if (x >= 0 && x <= BLOCK_W) pts.push([x, z]); }
    return pts.length >= 2 ? [pts[0], pts[pts.length - 1]] : null;
  };
  const e = seg(cut + CUT_BAND * 0.25);
  if (!e) return;
  const P = (x, y, z) => isoPt(v, x, y, z);
  const [[ax, az], [bx, bz]] = e;
  ctx.save();
  // glass lid over the open part: the cut segment closed round the near corner (BLOCK_W, BLOCK_D)
  ctx.beginPath();
  const [s0, s1] = az > bz ? [[ax, az], [bx, bz]] : [[bx, bz], [ax, az]];   // s0 on the +z side, s1 on the +x side
  const poly = [s0, [BLOCK_W, BLOCK_D], s1];
  if (s0[1] < BLOCK_D - 1e-6) poly.splice(1, 0, [0, BLOCK_D]);     // the cut meets the x = 0 face
  if (s1[0] < BLOCK_W - 1e-6) poly.splice(poly.length - 1, 0, [BLOCK_W, 0]);   // … or the z = 0 face
  poly.forEach(([x, z], i) => (i ? ctx.lineTo(...P(x, Hb, z)) : ctx.moveTo(...P(x, Hb, z))));
  ctx.closePath();
  ctx.fillStyle = 'rgba(190,225,200,0.06)';
  ctx.fill();
  // the cut edge on top of the cash
  const k = ease.outCubic(prog(t, T.cut, 0.3));
  ctx.lineCap = 'round';
  L.glow(ctx, v.accent, 10, () => {
    ctx.strokeStyle = rgba(v.accent, 0.85);
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(...P(ax, Hb + 0.02, az)); ctx.lineTo(...P(bx, Hb + 0.02, bz)); ctx.stroke();
  }, k);
  ctx.restore();
}

export default {
  beat: 6,
  chapter: { num: '06', title: 'Football field', sub: '109.7 × 48.8 m, end zones included' },
  captions: true,
  layer: 5,
  cues(d) {
    return [
      { t: T.lift + 0.02, name: 'swish', gain: 0.2, pitch: 1.3 },          // layer 2 lifts: "stacked two high"
      { t: T.drop + T.dropDur, name: 'impact', gain: 0.3, pitch: 1.1 },    // … and drops back on
      { t: T.rim + 0.05, name: 'swish', gain: 0.22, pitch: 1.1 },          // the outline traces itself
      { t: T.wipe + 0.1, name: 'shimmer', gain: 0.25, pitch: 1.0 },        // turf + yard lines sweep
      { t: T.posts + 0.25, name: 'blip', gain: 0.25, pitch: 1.0 },         // goalposts
      { t: T.posts + 0.43, name: 'blip', gain: 0.22, pitch: 1.25 },
      { t: T.label, name: 'impact', gain: 0.55, pitch: 0.75 },             // the payoff
      { t: T.label + 0.02, name: 'bloom', gain: 0.4, pitch: 0.9 },
      { t: T.you + 0.1, name: 'ping', gain: 0.28, pitch: 1.4 },            // you are here
    ].filter((c) => c.t < d);
  },
  drawWorld(ctx, v) {
    if (v.t < 0) return;
    const t = v.t;
    const t5 = v.gt - v.tl.scenes[5].start;
    const lift = liftAt(t);
    clearUnderBlock(ctx, v, lift);
    drawField(ctx, v, t);
    drawPosts(ctx, v, t, 0);
    const cut = cutAt(t);
    drawBlock(ctx, v, t5, { lift2: lift, cut, cutBand: CUT_BAND * (1 - ease.inCubic(prog(t, T.cut + T.cutDur * 0.6, T.cutDur * 0.4))) });
    drawCutGlass(ctx, v, t, cut);
    // what stands above or behind the block reads through it
    drawPosts(ctx, v, t, 2 * PH);
    drawOutline(ctx, v, ease.outCubic(prog(t, T.xray + 0.2, 0.7)));
    drawSeam(ctx, v, t);
    // the tiny human (true scale: ~15 px tall here) gets a soft spotlight pool, an accent glow and one
    // expanding ping when "you are here" lands, so the circle clearly marks a person
    const hk = ease.outCubic(prog(t, T.you - 0.1, 0.6));
    const [hx, hy] = isoPt(v, HUMAN[0], 0.85, HUMAN[1]);
    if (hk > 0) {
      const [fx, fy] = isoPt(v, HUMAN[0], 0, HUMAN[1]);
      ctx.save();
      ctx.fillStyle = `rgba(235,248,240,${0.22 * hk})`;
      ctx.beginPath(); ctx.ellipse(fx, fy, 16, 7, 0, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
      L.lightBlob(ctx, hx, hy, 30, v.accent, 0.5 * hk);
      const pg = prog(t, T.you + 0.05, 0.9);
      if (pg > 0 && pg < 1) {
        ctx.save();
        ctx.strokeStyle = rgba(v.accent, 0.8 * (1 - pg));
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(hx, hy, 8 + 40 * ease.outCubic(pg), 0, Math.PI * 2); ctx.stroke();
        ctx.restore();
      }
    }
    // drawn as a marker: 1.8× true size (still a speck next to the field) with a dark rim so it reads on the cash
    const humK = ease.outCubic(prog(t, HUMAN_IN, 0.5));
    if (humK > 0) {
      const [fx, fy] = isoPt(v, HUMAN[0], 0, HUMAN[1]);
      const sc = lerp(1, HUMAN_MARK, hk);
      ctx.save();
      ctx.translate(fx, fy); ctx.scale(sc, sc); ctx.translate(-fx, -fy);
      ctx.shadowColor = 'rgba(0,10,4,0.95)';
      ctx.shadowBlur = 5;
      drawHuman(ctx, v, HUMAN[0], HUMAN[1], humK, L.mix([225, 232, 240], [255, 255, 255], hk));
      ctx.restore();
    }
  },
  drawOverlay(ctx, v) {
    const t = v.t;
    const t5 = v.gt - v.tl.scenes[5].start;
    // 1) the $1T counter carried over from beat 5, leaving before the payoff label
    const out = ease.inCubic(prog(t, T.countOut, 0.32));
    if (out < 1) drawCounter(ctx, v, t5, 1 - out, out * 40);
    // 1b) "stacked two high": dimension on the front edge, timed with the seam glint
    drawStackDim(ctx, v, t);
    // 2) payoff label
    const kl = prog(t, T.label, 0.55);
    // sits a little higher than the counter it replaces, so "you are here" (at the field's back corner) gets its own band
    if (kl > 0) L.bigLabel(ctx, { x: LABEL.x, y: PAYOFF_Y, big: '≈ 1 football field', small: 'stacked two pallets high', k: kl, accent: v.accent, align: 'right', size: 88 });
    // 3) "you are here" callout on the tiny human
    const ky = prog(t, T.you, 0.6);
    if (ky > 0) {
      const [hx, hy] = isoPt(v, HUMAN[0], 0.85, HUMAN[1]);
      const r = 28;
      ctx.save();
      ctx.strokeStyle = rgba([240, 248, 242], 0.9);
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(hx, hy, Math.max(0, r * lerp(1.6, 1, ease.outCubic(ky))), -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * ease.outCubic(ky));
      ctx.stroke();
      // elbow leader: up-left out of the circle, then a short rule the text sits on
      const kk = prog(t, T.you + 0.2, 0.45);
      if (kk > 0) {
        const e = ease.outCubic(kk);
        ctx.font = L.font(24, 700, L.FONT.body);
        ctx.letterSpacing = '3px';
        const tw = ctx.measureText('YOU ARE HERE').width;
        ctx.letterSpacing = '0px';
        // up-left to just above the near goalpost's uprights, then left: below the payoff label's band
        const [sx0, sy0] = [hx - r * 0.71, hy - r * 0.71];
        const ex = sx0 - 14, ey = sy0 - 14;
        const x1 = Math.max(48, ex - tw - 10);
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(sx0, sy0);
        const e1 = clamp(e * 2), e2 = clamp(e * 2 - 1);
        ctx.lineTo(lerp(sx0, ex, e1), lerp(sy0, ey, e1));
        if (e2 > 0) ctx.lineTo(lerp(ex, x1, e2), ey);
        ctx.stroke();
        ctx.globalAlpha *= clamp(kk * 1.6 - 0.4);
        ctx.fillStyle = rgba([240, 248, 242], 0.95);
        ctx.shadowColor = 'rgba(0,0,0,0.7)';
        ctx.shadowBlur = 8;
        ctx.textBaseline = 'alphabetic';
        L.trackedText(ctx, 'YOU ARE HERE', x1, ey - 9 + (1 - e) * 8, 3, 'left');
      }
      ctx.restore();
    }
  },
};
