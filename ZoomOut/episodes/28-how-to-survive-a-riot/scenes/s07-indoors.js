// Beat 7 — "Once you're out, get indoors, | away from windows."
// Times (59.00 s timeline: beat 48.23–52.23, d 4.00; phrase 0 +0.15, phrase 1 +2.51; env T.door 49.58 = +1.36,
// T.inside 51.04 = +2.82). Camera 'indoors' (fixed, mpp 0.035): the REFUGE plan fills x ≈ 311–711, y ≈ 645–1160; env
// lifts its roof from +0.15 (1.2 s).
//   phrase 0   STEP 7 badge GET INDOORS (+ −0.1). A green dashed route draws ahead of YOU (+0.45, 0.7 s): along the
//              footpath to the door, through it and down the central corridor, ending in an arrowhead at REFUGE.safe; the
//              part YOU has walked is eaten up behind it. A green ring pulses at the door as YOU reaches it (T.door).
//              From T.door the corridor fills green behind YOU (a soft SAFE band with a fine keyline), complete at
//              T.inside; it breathes gently after.
//   phrase 1   every window pane turns red with a stagger rippling out from YOU (≈ 0.5 s): a thick red bar on the pane,
//              a red danger halo reaching ≈ 1.8 m into the room (glass and projectiles), and the panes' blue glint goes
//              out. Sub AWAY FROM WINDOWS (red tint) at +0.2.
//   world marks (drawWorld, under YOU) fade out with the overlay over d−0.3 … d+0.05; the badge/sub use v.k.
import * as L from '../../../../engine/runtime/lib.js';
import { stepBadge, stepSub, WINDOWS, REFUGE, DANGER, SAFE, youAt, timesFor } from '../env.js';

const TAU = Math.PI * 2;
const ph = (v, j) => v.tl.lines[v.index].phrases[j].start - v.tl.scenes[v.index].start;
const B = 7;
const sceneT = (v) => v.gt - v.tl.scenes[B].start;
const p1Of = (v) => v.tl.lines[B].phrases[1].start - v.tl.scenes[B].start;
// the route (world m): footpath end → door → corridor → safe point
const ROUTE = [[-41.5, -2.1], [-44, -2.7], [-46, -3], [-48, -3.25], [-53, -3.5]];
const INWARD = { N: [0, 1], S: [0, -1], W: [1, 0], E: [-1, 0] };

function polyTrim(v, pts, xMax, k) {
  // the route's part west of xMax (YOU has walked the rest), revealed to fraction k of its full length
  const sc = pts.map(([x, y]) => [v.wx(x), v.wy(y)]);
  let total = 0;
  for (let i = 1; i < sc.length; i++) total += Math.hypot(sc[i][0] - sc[i - 1][0], sc[i][1] - sc[i - 1][1]);
  const out = [], lim = total * k;
  let acc = 0;
  for (let i = 0; i < sc.length; i++) {
    if (i > 0) {
      const seg = Math.hypot(sc[i][0] - sc[i - 1][0], sc[i][1] - sc[i - 1][1]);
      if (acc + seg > lim) { const f = (lim - acc) / seg; out.push([L.lerp(sc[i - 1][0], sc[i][0], f), L.lerp(sc[i - 1][1], sc[i][1], f), L.lerp(pts[i - 1][0], pts[i][0], f)]); break; }
      acc += seg;
    }
    out.push([sc[i][0], sc[i][1], pts[i][0]]);
  }
  // cut away what is east of xMax (behind YOU)
  const cut = [];
  for (let i = 0; i < out.length; i++) {
    if (out[i][2] <= xMax) {
      if (i > 0 && out[i - 1][2] > xMax) {
        const f = (out[i - 1][2] - xMax) / (out[i - 1][2] - out[i][2]);
        cut.push([L.lerp(out[i - 1][0], out[i][0], f), L.lerp(out[i - 1][1], out[i][1], f)]);
      }
      cut.push([out[i][0], out[i][1]]);
    }
  }
  return cut;
}

export default {
  beat: 7,
  chapter: null,
  captions: true,
  layer: 6,
  cues(d) { return [{ t: 0.45, name: 'swish', gain: 0.16, pitch: 1.2 }, { t: 1.35, name: 'ping', gain: 0.2, pitch: 1.0 }, { t: 2.4, name: 'tick', gain: 0.22, pitch: 0.8 }]; },
  drawWorld(c, v) {
    const t = sceneT(v), d = v.tl.scenes[B].end - v.tl.scenes[B].start;
    if (t < 0 || t > d + 0.1) return;
    const T = timesFor(v.tl), p1 = p1Of(v);
    const fade = 1 - L.smoothstep(L.prog(t, d - 0.3, 0.35));
    const you = youAt(v.gt, v.tl);
    c.save();
    c.globalAlpha = fade;
    // ---- red window halos + bars (phrase 1), rippling out from YOU
    const yx = v.wx(you.x), yy = v.wy(you.y);
    WINDOWS.forEach((w) => {
      const mx = v.wx((w.x0 + w.x1) / 2), my = v.wy((w.y0 + w.y1) / 2);
      const dist = Math.hypot(mx - yx, my - yy);
      const k = L.ease.outCubic(L.prog(t, p1 + 0.02 + dist / 900, 0.35));
      if (k <= 0) return;
      const [ix, iy] = INWARD[w.side], depth = v.ws(1.8) * k;
      const ax = v.wx(w.x0), ay = v.wy(w.y0), bx = v.wx(w.x1), by = v.wy(w.y1);
      // halo: a trapezoid fading into the room
      const g = c.createLinearGradient(mx, my, mx + ix * depth, my + iy * depth);
      g.addColorStop(0, L.rgba(DANGER, 0.55)); g.addColorStop(1, L.rgba(DANGER, 0));
      c.fillStyle = g;
      const sp = v.ws(0.4) * k;
      const lo = { x: Math.min(ax, bx) - (iy ? sp : 0), y: Math.min(ay, by) - (ix ? sp : 0) }, hi = { x: Math.max(ax, bx) + (iy ? sp : 0), y: Math.max(ay, by) + (ix ? sp : 0) };
      const rx0 = Math.min(lo.x, lo.x + ix * depth), rx1 = Math.max(hi.x, hi.x + ix * depth), ry0 = Math.min(lo.y, lo.y + iy * depth), ry1 = Math.max(hi.y, hi.y + iy * depth);
      c.fillRect(rx0, ry0, rx1 - rx0, ry1 - ry0);
      // the bar on the pane
      c.save();
      c.shadowColor = L.rgba(DANGER, 0.9); c.shadowBlur = 14 * k;
      c.strokeStyle = L.rgba(DANGER, 0.98); c.lineWidth = 10; c.lineCap = 'round';
      const cx = (ax + bx) / 2, cy = (ay + by) / 2;
      c.beginPath(); c.moveTo(L.lerp(cx, ax, k), L.lerp(cy, ay, k)); c.lineTo(L.lerp(cx, bx, k), L.lerp(cy, by, k)); c.stroke();
      c.restore();
    });
    // ---- green corridor: fills behind YOU from the door (T.door) to the safe point (T.inside)
    const gdoor = v.gt - T.door;
    if (gdoor > -0.2) {
      const { x0: rx0, x1: rx1 } = REFUGE, { y0: cy0, y1: cy1 } = REFUGE.corridor;
      const xEnd = Math.min(rx1, Math.max(rx0 + 2.5, Math.min(you.x + 0.6, rx1)));
      const xr = L.lerp(rx1, rx0 + 2.5, L.ease.inOutCubic(L.prog(v.gt, T.door - 0.1, T.inside - T.door + 0.3)));
      const left = Math.min(xEnd, xr);
      const breath = 0.85 + 0.15 * Math.sin((v.gt - T.inside) * 2.6);
      const a = L.smoothstep(L.prog(gdoor, -0.2, 0.3)) * (v.gt > T.inside ? breath : 1);
      const X0 = v.wx(left), X1 = v.wx(rx1), Y0 = v.wy(cy0), Y1 = v.wy(cy1);
      if (X1 - X0 > 1) {
        c.fillStyle = L.rgba(SAFE, 0.26 * a); c.fillRect(X0, Y0, X1 - X0, Y1 - Y0);
        c.strokeStyle = L.rgba(SAFE, 0.85 * a); c.lineWidth = 2.5;
        c.beginPath(); c.moveTo(X1, Y0 + 3); c.lineTo(X0, Y0 + 3); c.moveTo(X1, Y1 - 3); c.lineTo(X0, Y1 - 3); c.stroke();
      }
    }
    // ---- door ring (pulses as YOU arrives)
    const dk = L.prog(v.gt, T.door - 0.25, 0.9);
    if (dk > 0 && dk < 1) {
      const dx = v.wx(REFUGE.door.x), dy = v.wy(REFUGE.door.y);
      c.strokeStyle = L.rgba(SAFE, 0.9 * (1 - dk)); c.lineWidth = 4;
      c.beginPath(); c.arc(dx, dy, Math.max(0, 20 + 60 * L.ease.outCubic(dk)), 0, TAU); c.stroke();
    }
    // ---- route (dashed green, eaten up behind YOU)
    const rk = L.ease.inOutCubic(L.prog(t, 0.45, 0.7));
    const ra = 1 - L.smoothstep(L.prog(v.gt, T.inside - 0.3, 0.4));
    if (rk > 0 && ra > 0) {
      const pts = polyTrim(v, ROUTE, you.x - 0.7, rk);
      if (pts.length >= 2) {
        c.save();
        c.globalAlpha *= ra;
        c.strokeStyle = L.rgba(SAFE, 0.95); c.lineWidth = 5; c.lineCap = 'round'; c.lineJoin = 'round';
        c.setLineDash([14, 11]); c.lineDashOffset = -v.gt * 30;
        c.beginPath(); pts.forEach((p, i) => (i ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1]))); c.stroke();
        c.setLineDash([]);
        const [ax, ay] = pts[pts.length - 1], [bx, by] = pts[pts.length - 2];
        const an = Math.atan2(ay - by, ax - bx), hs = 22;
        c.fillStyle = L.rgba(SAFE, 0.98);
        c.beginPath(); c.moveTo(ax + Math.cos(an) * 8, ay + Math.sin(an) * 8);
        c.lineTo(ax + Math.cos(an + 2.5) * hs, ay + Math.sin(an + 2.5) * hs); c.lineTo(ax + Math.cos(an - 2.5) * hs, ay + Math.sin(an - 2.5) * hs);
        c.closePath(); c.fill();
        c.restore();
      }
    }
    c.restore();
  },
  drawOverlay(c, v) {
    c.save();
    c.globalAlpha = v.k;
    stepBadge(c, v, 7, 'GET INDOORS', { k: L.enter(v.t, ph(v, 0) - 0.1, 0.75, L.ease.linear) });
    stepSub(c, 'AWAY FROM WINDOWS', L.ease.outCubic(L.prog(v.t, ph(v, 1) + 0.2, 0.45)), { col: [255, 190, 180], bar: DANGER });
    c.restore();
  },
};
