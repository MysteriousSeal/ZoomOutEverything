// Beat 3 — "If the crowd surges, | don't fight it. | Go with it, and drift sideways between waves."
// Camera 'surge' follows YOU (mpp 0.06; YOU ≈ (360, 790)). env sends planar SURGE waves south at 6 m/s, hitting YOU's
// row at T.surgeHits (23.57, 25.62, 27.12, 28.62); YOU is carried by each and steps WEST in the lulls (T.zig:
// 26.02–26.82, 27.52–28.32, 29.02–30.02) out of the crowd at (−27.5, 3).
//   always   each active surge front is traced ON its red compression band (front + 2.5 m, where env's measured density
//            peaks): a soft red glow + a thin hot-white core, with three down-chevrons riding just behind it (the push).
//            Fronts are clipped to the crowd (plaza / avenue) and to screen y 548–1360 (badge above, captions below).
//   phrase 0 (22.77) STEP 3 badge GO WITH THE SURGE; a SURGE chip rides the first front (right of YOU), fading by
//            phrase 2.
//   phrase 1 (24.57) "don't fight it": a red arrow pointing UP-stream from YOU, struck through with a red ✕.
//   phrase 2 (25.89) "go with it": a white arrow DOWN-stream from YOU (≈ 0.45 s) while the camera closes in (shot 'drift',
//            mpp 0.032); then the zig-zag ON THE MAP: the planned path to the edge faint (thin dashes), the travelled part
//            in bright yellow dashes, a yellow sideways arrow in each lull; a green target + EDGE chip at the crowd's
//            edge (−27.5, 3). sub DRIFT SIDEWAYS BETWEEN WAVES. (The earlier inset diagram was dropped: the map reads.)
import * as L from '../../../../engine/runtime/lib.js';
import { stepBadge, stepSub, drawYou, youInSurge, waveFronts, youAt, youTrail, timesFor, densityAt, CD, DANGER, SAFE, PLAZA, AVENUE } from '../env.js';

const TAU = Math.PI * 2;
const ph = (v, j) => v.tl.lines[v.index].phrases[j].start - v.tl.scenes[v.index].start;
const PEAK = 2.5;   // m: env's density peak sits this far ahead (south) of the analytic front
const win = (x) => L.smoothstep(L.clamp((x + 30) / 6)) * (1 - 0.65 * L.smoothstep(L.clamp((x - 8) / 16)));   // env lineWin
const inCrowd = (x, y) => (y > PLAZA.y1 - 0.5 ? false : y >= PLAZA.y0 ? x >= PLAZA.x0 && x <= PLAZA.x1 : x >= AVENUE.x0 - 2.5 && x <= AVENUE.x1 + 2.5);
const Y0 = 548, Y1 = 1360;

function arrowHead(c, x, y, a, hd) {
  c.beginPath();
  c.moveTo(x + Math.cos(a) * 4, y + Math.sin(a) * 4);
  c.lineTo(x - Math.cos(a - 0.5) * hd, y - Math.sin(a - 0.5) * hd);
  c.lineTo(x - Math.cos(a + 0.5) * hd, y - Math.sin(a + 0.5) * hd);
  c.closePath(); c.fill();
}
function chip(c, text, x, y, col, k) {
  if (k <= 0) return;
  c.save();
  c.globalAlpha *= L.clamp(k);
  c.font = L.font(28, 800, L.FONT.display);
  c.letterSpacing = '1px';
  const w = c.measureText(text).width + 34, h = 42, x0 = x, y0 = y - h / 2;
  c.fillStyle = 'rgba(10,10,14,0.88)'; L.roundRect(c, x0, y0, w, h, 8); c.fill();
  c.fillStyle = L.rgba(col); c.fillRect(x0 + 8, y0 + 9, 4, h - 18);
  c.fillStyle = '#fff'; c.textBaseline = 'middle';
  c.fillText(text, x0 + 22, y0 + h / 2 + 1);
  c.letterSpacing = '0px';
  c.restore();
}

export default {
  beat: 3,
  chapter: null,
  captions: true,
  layer: 5,
  cues() { return []; },
  drawOverlay(c, v) {
    const T = timesFor(v.tl);
    c.save();
    c.globalAlpha = v.k;
    const you = { ...youAt(v.gt, v.tl) }, ux = v.wx(you.x), uy = v.wy(you.y);

    // ---- a soft dark band behind the captions for the whole beat (white captions over bright dots, map cars and the
    //      red fronts); it fades in with the overlay from the beat's first frame
    const capK = 1;
    if (capK > 0) {
      const g = c.createLinearGradient(0, 1300, 0, 1600);
      g.addColorStop(0, 'rgba(4,6,12,0)'); g.addColorStop(0.3, `rgba(4,6,12,${0.62 * capK})`); g.addColorStop(0.7, `rgba(4,6,12,${0.62 * capK})`); g.addColorStop(1, 'rgba(4,6,12,0)');
      c.fillStyle = g; c.fillRect(0, 1300, L.W, 300);
    }

    // ---- the surge fronts
    const fronts = waveFronts(v.gt, v.tl).filter((f) => f.kind === 'line' && f.k > 0.02);
    c.save();
    c.beginPath(); c.rect(0, Y0, L.W, Y1 - Y0); c.clip();
    for (const f of fronts) {
      const pts = [];
      for (let x = PLAZA.x0; x <= PLAZA.x1 + 1e-6; x += 1) {
        const y = f.yAt(x) + PEAK;
        // the stroke starts where the crowd is actually packed (not at the plaza's open edge) and feathers out over the
        // last 60 px before the clip band's edges
        const sy = v.wy(y), rho = inCrowd(x, y) ? densityAt(x, y, v.gt, v.tl) : 0;
        const feather = L.clamp((Y1 - sy) / 60) * L.clamp((sy - Y0) / 60);
        pts.push(inCrowd(x, y) ? [v.wx(x), sy, win(x) * L.smoothstep(L.prog(rho, 1.6, 1.4)) * feather] : null);
      }
      const fk = f.k;
      // glow, then core (segment alpha follows env's window, so the front fades where the wave weakens)
      for (const [lw, col, a0] of [[14, [255, 70, 56], 0.16], [5, [255, 110, 90], 0.28], [2, [255, 240, 230], 0.7]]) {   // light: the dots carry the band
        c.lineWidth = lw; c.lineCap = 'round';
        for (let i = 1; i < pts.length; i++) {
          const p0 = pts[i - 1], p1 = pts[i];
          if (!p0 || !p1) continue;
          c.strokeStyle = L.rgba(col, a0 * fk * Math.min(p0[2], p1[2]));
          c.beginPath(); c.moveTo(p0[0], p0[1]); c.lineTo(p1[0], p1[1]); c.stroke();
        }
      }
      // chevrons behind the front: the push travels south
      c.strokeStyle = `rgba(255,190,170,${0.85 * fk})`; c.lineWidth = 3; c.lineJoin = 'round';
      for (const cx of [-12, 0, 12]) {
        const x = you.x + cx + 6;
        if (!inCrowd(x, f.yAt(x))) continue;
        const sx = v.wx(x), sy = v.wy(f.yAt(x) + PEAK) - 34 - 6 * Math.sin(v.gt * 6 + cx);
        if (Math.hypot(sx - ux, sy - uy) < 50 + 26 || sy < Y0 + 20 || sy > Y1 - 20) continue;   // never on YOU's ring
        c.beginPath(); c.moveTo(sx - 12, sy - 7); c.lineTo(sx, sy + 5); c.lineTo(sx + 12, sy - 7); c.stroke();
      }
    }
    c.restore();

    // SURGE chip on the first wave
    const w0 = fronts.find((f) => Math.abs(f.hit - T.surgeHits[0]) < 1e-6);
    // (gone before the drift shot's zoom starts at drift0 − 0.55: no ghost through the move)
    const sk = L.ease.outCubic(L.prog(v.t, ph(v, 0) + 0.25, 0.4)) * (1 - L.ease.inCubic(L.prog(v.gt, T.drift0 - 0.55 - 0.3, 0.26)));
    if (w0 && sk > 0) {
      const x = you.x + 13, sy = v.wy(w0.yAt(x) + PEAK) - 46;
      if (sy > Y0 + 30 && sy < Y1 - 30) chip(c, 'SURGE', v.wx(x), sy, DANGER, sk * w0.k);
    }

    // ---- "don't fight it": a struck-through arrow against the surge
    const fk = L.ease.outCubic(L.prog(v.t, ph(v, 1) - 0.05, 0.4)) * (1 - L.ease.inCubic(L.prog(v.t, ph(v, 2) - 0.05, 0.3)));
    if (fk > 0) {
      c.save();
      c.globalAlpha *= fk;
      c.shadowColor = 'rgba(0,0,0,0.7)'; c.shadowBlur = 8;
      c.strokeStyle = L.rgba(DANGER); c.fillStyle = L.rgba(DANGER);
      c.lineWidth = 6; c.lineCap = 'round';
      const y0 = uy - 40, y1 = uy - 40 - 110 * fk;
      c.beginPath(); c.moveTo(ux, y0); c.lineTo(ux, y1 + 14); c.stroke();
      arrowHead(c, ux, y1, -Math.PI / 2, 28);
      const xk = L.ease.outCubic(L.prog(v.t, ph(v, 1) + 0.15, 0.3));
      if (xk > 0) {
        const cx = ux, cy = uy - 95, s = 26 * xk;
        c.strokeStyle = '#fff'; c.lineWidth = 7;
        c.beginPath(); c.moveTo(cx - s, cy - s); c.lineTo(cx + s, cy + s); c.moveTo(cx + s, cy - s); c.lineTo(cx - s, cy + s); c.stroke();
        c.strokeStyle = L.rgba(DANGER); c.lineWidth = 4;
        c.beginPath(); c.moveTo(cx - s, cy - s); c.lineTo(cx + s, cy + s); c.moveTo(cx + s, cy - s); c.lineTo(cx - s, cy + s); c.stroke();
      }
      c.restore();
    }
    // "go with it": an arrow with the surge
    const gk = L.ease.outCubic(L.prog(v.t, ph(v, 2) - 0.05, 0.35)) * (1 - L.ease.inCubic(L.prog(v.t, ph(v, 2) + 0.2, 0.2)));
    if (gk > 0) {
      c.save();
      c.globalAlpha *= gk;
      c.shadowColor = 'rgba(0,0,0,0.7)'; c.shadowBlur = 8;
      c.strokeStyle = '#fff'; c.fillStyle = '#fff'; c.lineWidth = 6; c.lineCap = 'round';
      const y0 = uy + 40, y1 = uy + 40 + 100 * gk;
      c.beginPath(); c.moveTo(ux, y0); c.lineTo(ux, y1 - 14); c.stroke();
      arrowHead(c, ux, y1, Math.PI / 2, 28);
      c.restore();
    }

    // ---- the zig-zag to the edge
    const zk = L.ease.outCubic(L.prog(v.gt, T.drift0 + 0.1, 0.5));
    if (zk > 0) {
      const tEnd = T.zig[T.zig.length - 1][1];
      const ep = { ...youAt(tEnd, v.tl) }, end = [v.wx(ep.x), v.wy(ep.y)];
      c.save();
      c.globalAlpha *= zk;
      c.lineCap = 'round'; c.lineJoin = 'round';
      // the zig-zag on the map: the planned path faint, the travelled part in bright yellow dashes
      const plan = youTrail(T.drift0, tEnd, v.tl, 90).map(([x, y]) => [v.wx(x), v.wy(y)]);
      c.save();
      c.shadowColor = 'rgba(0,0,0,0.8)'; c.shadowBlur = 6;
      c.strokeStyle = L.rgba(CD.yellow, 0.78); c.lineWidth = 4; c.setLineDash([6, 10]);   // bright enough to read the direction without sound
      c.beginPath(); plan.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y))); c.stroke();
      const now = Math.min(v.gt, tEnd);
      if (now > T.drift0 + 0.05) {
        const done = youTrail(T.drift0, now, v.tl, 70).map(([x, y]) => [v.wx(x), v.wy(y)]);
        while (done.length > 2 && Math.hypot(done[done.length - 1][0] - ux, done[done.length - 1][1] - uy) < 30) done.pop();   // stop at the ring
        c.strokeStyle = L.rgba(CD.yellow); c.lineWidth = 6; c.setLineDash([16, 10]);
        c.beginPath(); done.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y))); c.stroke();
      }
      c.setLineDash([]);
      c.restore();
      // a bold sideways arrow at each step (only in the lulls, after a wave has passed; the first waits for the
      // "go with it" arrow to clear)
      for (const [t0, t1, ex] of T.zig) {
        const ta = Math.max(t0 - 0.12, T.drift0 + 0.42);
        const ak = L.ease.outCubic(L.prog(v.gt, ta, 0.3)) * (1 - L.ease.inCubic(L.prog(v.gt, t1 + 0.15, 0.25)));
        if (ak <= 0) continue;
        const a = { ...youAt(t0, v.tl) }, ay = v.wy(a.y) - 44, ax0 = v.wx(a.x) - 30, ax1 = Math.min(ax0 - 80, v.wx(ex) - 4);
        c.save();
        c.globalAlpha *= ak;
        c.shadowColor = 'rgba(0,0,0,0.75)'; c.shadowBlur = 8;
        c.strokeStyle = L.rgba(CD.yellow); c.fillStyle = L.rgba(CD.yellow); c.lineWidth = 7; c.lineCap = 'round';
        const tip = L.lerp(ax0, ax1, ak);
        c.beginPath(); c.moveTo(ax0, ay); c.lineTo(tip + 14, ay); c.stroke();
        arrowHead(c, tip, ay, Math.PI, 28);
        c.restore();
      }
      // the edge target
      const pulse = 0.5 + 0.5 * Math.sin(v.gt * 4);
      c.strokeStyle = L.rgba(SAFE, 0.95); c.lineWidth = 3;
      c.beginPath(); c.arc(end[0], end[1], 14, 0, TAU); c.stroke();
      c.strokeStyle = L.rgba(SAFE, 0.5 * (1 - pulse)); c.lineWidth = 2;
      c.beginPath(); c.arc(end[0], end[1], Math.max(0, 20 + 14 * pulse), 0, TAU); c.stroke();
      c.fillStyle = L.rgba(SAFE); c.beginPath(); c.arc(end[0], end[1], 5, 0, TAU); c.fill();
      c.restore();
      chip(c, 'EDGE', end[0] - 130, end[1] - 58, SAFE, L.ease.outCubic(L.prog(v.gt, T.drift0 + 0.4, 0.4)));
    }


    // ---- YOU (env hands the draw to this scene in beat 3): dot, ring and chip OVER the fronts, at full strength
    if (youInSurge(v)) { c.save(); c.globalAlpha = 1; drawYou(c, v); c.restore(); }

    // ---- badge + sub
    stepBadge(c, v, 3, 'GO WITH THE SURGE', { k: L.enter(v.t, ph(v, 0) - 0.1, 0.75) });
    stepSub(c, 'DRIFT SIDEWAYS BETWEEN WAVES', L.enter(v.t, ph(v, 2) + 0.3, 0.45));
    c.restore();
  },
};
