// Beat 9 — "Experts estimate they use about one and a half percent of all the world's electricity."
// As the camera climbs from the campus to the New York region, accent power lines grow out of the campus substation
// (they extend outward in step with the log zoom, so they always reach the frame edge), linking five other glowing
// data-centre nodes across New Jersey, the Hudson Valley and Long Island. Once drawn, energy pulses run inward:
// everything converges on the data centres. Overlay, the standard top-left slot: one "world electricity" bar; on "one and a half
// percent" its first 1.5% ignites as a bright sliver, with the label "≈ 1.5%" / "of the world's electricity".
import * as L from '../../../../engine/runtime/lib.js';
import { ACCENT, homeAt, planK } from '../env.js';
import { SUB_WORLD } from './s08-data-centres.js';

const ACC = ACCENT;
const TAU = Math.PI * 2;
const KM = 1000;

// other data-centre nodes (local WORLD km east / south of HOME): Piscataway NJ, Orangeburg NY, Parsippany NJ,
// Long Island (Hauppauge), Newark
const NODES = [[-40, 23], [3, -32.5], [-36.6, -11.3], [66, -7], [-15.6, 3.1]];
// trunks, listed from the substation outward (km); some pass through nodes
const S0 = [SUB_WORLD.x / KM, SUB_WORLD.y / KM];
const TRUNKS = [
  [S0, [-12, -9], [-36.6, -11.3], [-58, -18], [-72, -24]],
  [S0, [-10, 2], [-15.6, 3.1], [-28, 14], [-40, 23], [-62, 31]],
  [S0, [-6, -14], [3, -32.5], [2, -48]],
  [S0, [-12, -24], [-34, -40], [-54, -50]],
  [S0, [2, -12], [24, -14], [66, -7], [76, -9]],
  [S0, [6, -20], [30, -36], [52, -48]],
].map((pts) => {
  const P = pts.map(([x, y]) => [x * KM, y * KM]);
  const acc = [0];
  for (let q = 1; q < P.length; q++) acc.push(acc[q - 1] + Math.hypot(P[q][0] - P[q - 1][0], P[q][1] - P[q - 1][1]));
  return { P, acc, len: acc[acc.length - 1] };
});
// distance along the first trunk passing through each node (for "node lights when the line reaches it")
const NODE_D = NODES.map(([nx, ny]) => {
  let best = Infinity;
  for (const T of TRUNKS) T.P.forEach(([x, y], q) => { if (Math.hypot(x - nx * KM, y - ny * KM) < 50) best = Math.min(best, T.acc[q]); });
  return best;
});

function times(tl) {
  const s = tl.scenes[9].start, ph = tl.lines[9].phrases[0];
  const at = (f) => ph.start + (ph.end - ph.start) * f;
  return { s, end: tl.scenes[9].end, grow: s + 0.1, growDur: 2.3, bar: at(0.24), sliver: at(0.36), out: tl.scenes[10].start - 0.15 };
}
/** Length grown from the substation (m): log-interpolated so it keeps pace with the camera's log zoom. */
function grown(gt, T, i) {
  const e = L.ease.inOutCubic(L.prog(gt, T.grow + i * 0.07, T.growDur));
  return e <= 0 ? 0 : Math.exp(L.lerp(Math.log(250), Math.log(95 * KM), e));
}
/** Length actually drawn (m): never shorter than a front-loaded on-screen reach (150 px easing out to the frame edge),
 *  so the tips never retreat toward the substation while the camera climbs faster than the log growth. */
function reach(v, T, i, Tr) {
  const p = L.prog(v.gt, T.grow + i * 0.07, T.growDur);
  if (p <= 0) return 0;
  const px = L.lerp(150, 640, L.ease.outCubic(p)) * L.clamp(p / 0.06);
  return Math.min(Tr.len, Math.max(grown(v.gt, T, i), px * v.cam.mpp));
}
function pointAt(Tr, s) {
  let q = 1;
  while (q < Tr.acc.length - 1 && Tr.acc[q] < s) q++;
  const f = L.clamp((s - Tr.acc[q - 1]) / Math.max(1e-6, Tr.acc[q] - Tr.acc[q - 1]));
  return [L.lerp(Tr.P[q - 1][0], Tr.P[q][0], f), L.lerp(Tr.P[q - 1][1], Tr.P[q][1], f)];
}

export default {
  beat: 9,
  chapter: { num: '09', title: 'Power', sub: 'Share of world electricity' },
  captions: true,
  layer: 3,
  cues(d) {
    // offsets from the beat start (40.73): lines grow 0.1-2.5, bar 1.33, sliver + label 1.92
    return [
      { t: 0.15, name: 'riser', gain: 0.16, pitch: 0.7 },
      { t: 1.1, name: 'blip', gain: 0.1, pitch: 0.8 },
      { t: 1.45, name: 'blip', gain: 0.1, pitch: 0.95 },
      { t: 1.3, name: 'swish', gain: 0.16, pitch: 0.9 },
      { t: 1.92, name: 'ping', gain: 0.28, pitch: 1.2 },
      { t: 1.95, name: 'bloom', gain: 0.16, pitch: 1.1 },
    ];
  },

  drawWorld(c, v) {
    const T = times(v.tl);
    const gt = v.gt;
    if (gt < T.grow - 0.1 || gt > T.out + 2) return;
    const zk = 1 - L.clamp((Math.log(v.cam.mpp) - Math.log(450)) / (Math.log(1300) - Math.log(450)));
    const k = planK(v) * zk * (1 - L.ease.inCubic(L.prog(gt, T.out, 0.8)));
    if (k <= 0) return;
    const h = homeAt(v);
    const X = (x) => v.wx(h.x + x), Y = (y) => v.wy(h.y + y);
    c.save();
    c.globalCompositeOperation = 'lighter';
    c.lineCap = 'round';
    c.lineJoin = 'round';
    TRUNKS.forEach((Tr, i) => {
      const g = reach(v, T, i, Tr);
      if (g <= 0) return;
      const path = new Path2D();
      path.moveTo(X(Tr.P[0][0]), Y(Tr.P[0][1]));
      for (let q = 1; q < Tr.P.length && Tr.acc[q - 1] < g; q++) {
        const p = Tr.acc[q] <= g ? Tr.P[q] : pointAt(Tr, g);
        path.lineTo(X(p[0]), Y(p[1]));
      }
      c.strokeStyle = L.rgba(ACC, 0.13 * k); c.lineWidth = 7; c.stroke(path);
      c.strokeStyle = L.rgba([150, 205, 255], 0.7 * k); c.lineWidth = 1.6; c.stroke(path);
      // growing tip
      if (g < Tr.len) {
        const p = pointAt(Tr, g);
        L.lightBlob(c, X(p[0]), Y(p[1]), 22, ACC, 0.7 * k);
      }
      // the power plant at the far end (appears when the line reaches it)
      const pe = L.clamp((g - Tr.len * 0.98) / (Tr.len * 0.02));
      if (pe > 0) {
        const p = Tr.P[Tr.P.length - 1], x = X(p[0]), y = Y(p[1]);
        L.lightBlob(c, x, y, 26, [255, 190, 120], 0.55 * k * pe);
        c.strokeStyle = L.rgba([255, 214, 170], 0.9 * k * pe);
        c.lineWidth = 1.5;
        c.strokeRect(x - 4.5, y - 4.5, 9, 9);
      }
      // energy pulses running inward (toward the campus), once a stretch is drawn
      const pk = k * L.prog(gt, T.grow + 0.9, 0.8);
      if (pk > 0) {
        const SP = 26 * KM * Math.max(0.05, Math.min(1, v.cam.mpp / 120)), GAP = 14 * KM;
        const off = GAP - ((gt * SP + i * 3100) % GAP);
        const plen = 14 * v.cam.mpp;
        const pp = new Path2D();
        for (let s = off; s < g; s += GAP) {
          const a = pointAt(Tr, s + plen), b = pointAt(Tr, s);
          pp.moveTo(X(a[0]), Y(a[1])); pp.lineTo(X(b[0]), Y(b[1]));
        }
        c.strokeStyle = L.rgba(ACC, 0.35 * pk); c.lineWidth = 6; c.stroke(pp);
        c.strokeStyle = L.rgba([225, 242, 255], 0.95 * pk); c.lineWidth = 2.2; c.stroke(pp);
      }
    });
    // the other data-centre nodes light up as the lines reach them
    NODES.forEach(([nx, ny], i) => {
      const d = NODE_D[i];
      let gmax = 0;
      TRUNKS.forEach((Tr, j) => { gmax = Math.max(gmax, reach(v, T, j, Tr)); });
      const tOn = L.clamp((gmax - d) / Math.max(1, d * 0.5));
      if (tOn <= 0) return;
      const x = X(nx * KM), y = Y(ny * KM);
      const br = 0.75 + 0.25 * Math.sin(gt * 2.4 + i * 1.3);
      L.lightBlob(c, x, y, 34, ACC, 0.7 * k * tOn * br);
      c.fillStyle = L.rgba([230, 244, 255], 0.95 * k * tOn);
      c.beginPath(); c.arc(x, y, 3.2, 0, TAU); c.fill();
      // one ping ring when it connects
      const pr = L.clamp(tOn * 1.0);
      c.strokeStyle = L.rgba(ACC, 0.6 * k * (1 - pr));
      c.lineWidth = 1.5;
      c.beginPath(); c.arc(x, y, Math.max(0, 6 + 40 * pr), 0, TAU); c.stroke();
    });
    // the campus itself: the convergence point
    const cx = X(SUB_WORLD.x), cy = Y(SUB_WORLD.y);
    const ck = k * L.prog(gt, T.grow + 0.6, 0.8);
    if (ck > 0) {
      const beat = 0.8 + 0.2 * Math.sin(gt * 3.1);
      L.lightBlob(c, cx, cy, 64, ACC, 0.75 * ck * beat);
      L.lightBlob(c, cx, cy, 20, [235, 245, 255], 0.9 * ck);
      c.strokeStyle = L.rgba([200, 230, 255], 0.75 * ck);
      c.lineWidth = 1.5;
      c.beginPath(); c.arc(cx, cy, 13, 0, TAU); c.stroke();
    }
    c.restore();
  },

  drawOverlay(c, v) {
    const T = times(v.tl);
    const gt = v.gt;
    const ok = v.k;
    if (ok <= 0) return;
    const BX0 = 96, BX1 = 936, BY = 596, BH = 18;   // the bar sits right under the label's unit line (as s18's)
    const bk = ok * L.ease.outCubic(L.prog(gt, T.bar - 0.2, 0.5));
    if (bk <= 0) return;
    // backing: a soft dark band behind the label + bar
    c.save();
    c.globalAlpha = bk;
    const g = c.createLinearGradient(0, 300, 0, 700);
    g.addColorStop(0, 'rgba(3,6,12,0)');
    g.addColorStop(0.2, 'rgba(3,6,12,0.55)');
    g.addColorStop(0.75, 'rgba(3,6,12,0.55)');
    g.addColorStop(1, 'rgba(3,6,12,0)');
    c.fillStyle = g;
    c.fillRect(0, 300, L.W, 400);
    // a dark pill of its own under the bar, so the power-line web never runs through the 1.5 % sliver
    c.fillStyle = 'rgba(5,10,20,0.78)';
    L.roundRect(c, BX0 - 16, BY - 16, BX1 - BX0 + 32, BH + 32, 16); c.fill();
    c.strokeStyle = 'rgba(120,160,210,0.12)';
    c.lineWidth = 1;
    L.roundRect(c, BX0 - 16, BY - 16, BX1 - BX0 + 32, BH + 32, 16); c.stroke();
    // the bar: track, then "all the world's electricity" wipes in
    const wipe = L.ease.inOutCubic(L.prog(gt, T.bar, 0.65));
    c.fillStyle = 'rgba(255,255,255,0.07)';
    L.roundRect(c, BX0, BY, BX1 - BX0, BH, 4); c.fill();
    if (wipe > 0) {
      c.save();
      c.beginPath(); c.rect(BX0, BY - 2, (BX1 - BX0) * wipe, BH + 4); c.clip();
      c.fillStyle = 'rgba(150,165,185,0.32)';
      L.roundRect(c, BX0, BY, BX1 - BX0, BH, 4); c.fill();
      // fine hatching: a measured quantity, not a solid slab
      c.strokeStyle = 'rgba(200,212,228,0.12)';
      c.lineWidth = 1;
      c.beginPath();
      for (let x = BX0 + 6; x < BX1; x += 8.4) { c.moveTo(x, BY + 3); c.lineTo(x, BY + BH - 3); }
      c.stroke();
      c.restore();
    }
    // end ticks: 0 and 100 %
    c.fillStyle = 'rgba(220,228,240,0.6)';
    c.fillRect(BX0 - 1, BY - 8, 2, BH + 16);
    c.fillRect(BX0 + (BX1 - BX0) * wipe - 1, BY - 8, 2, BH + 16);
    // the sliver: 1.5 %
    const sk = L.ease.outCubic(L.prog(gt, T.sliver, 0.35));
    if (sk > 0) {
      const sw = (BX1 - BX0) * 0.015;
      c.save();
      c.globalCompositeOperation = 'lighter';
      L.lightBlob(c, BX0 + sw / 2, BY + BH / 2, 70 * sk, ACC, 0.9 * sk * (0.85 + 0.15 * Math.sin(gt * 3)));
      c.restore();
      c.fillStyle = L.rgba([170, 220, 255], sk);
      c.fillRect(BX0, BY - 4 * sk, sw, BH + 8 * sk);
      // a flash on ignition
      const fl = 1 - L.prog(gt, T.sliver, 0.5);
      if (fl > 0 && fl < 1) {
        c.save();
        c.globalCompositeOperation = 'lighter';
        L.lightBlob(c, BX0 + sw / 2, BY + BH / 2, 160, [220, 240, 255], 0.6 * fl);
        c.restore();
      }
    }
    c.restore();
    const lk = ok * L.prog(gt, T.sliver, 0.45);
    if (lk > 0) L.bigLabel(c, { x: 96, y: 470, big: '≈ 1.5%', small: "of the world's electricity", k: lk, accent: ACC });
  },
};
