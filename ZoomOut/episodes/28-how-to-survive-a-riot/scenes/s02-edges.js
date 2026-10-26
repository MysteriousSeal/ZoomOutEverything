// Beat 2 — "Stay at the edges. | Avoid walls, fences and narrow streets: that's where people get crushed."
// Camera 'edges' (fixed, mpp 0.088): wall x 26 → screen ≈ 822, fence y 22 → ≈ 1084, street mouth ≈ (540, 1110),
// YOU ≈ (330, 850) in the light edge band. env pressK builds from T.zones (phrase 1, 17.04): the crowd compresses red
// against the WALL, the FENCE and in the NARROW STREET.
//   phrase 0 (15.07) STEP 2 badge STAY AT THE EDGES; at + 0.45 a green exit route draws itself from YOU along the
//                    footpath into the park (marching dashes, arrowhead) with a small green EXIT chip at its tip.
//   phrase 1         each zone is NAMED as it is spoken (word-timed like the captions: "walls" ≈ 17.3, "fences" ≈ 17.9,
//                    "narrow streets" ≈ 18.6): an amber outline traces round it + its dark chip (WALL / FENCE /
//                    NARROW STREET). On "that's where people get crushed" (≈ 20.1) all three LIGHT UP red together: hazard hatching
//                    sweeps in, outlines turn red and pulse, sub AVOID CRUSH ZONES (red) under the badge (it replaces the phrase-0
//                    sub EDGE OF THE CROWD · NEAR AN EXIT).
// Layout: WALL chip right of the wall (y ≈ 640, above y 1100 so it may pass x 940); FENCE chip under the fence over
// the site (x ≤ 520, y ≈ 1125); NARROW STREET chip right of the street (x 600–≈ 830, y ≈ 1290): all clear of captions.
import * as L from '../../../../engine/runtime/lib.js';
import { stepBadge, stepSub, ZONES, EXIT, FOOTPATH, DANGER, SAFE, AMBER, youAt } from '../env.js';

const ph = (v, j) => v.tl.lines[v.index].phrases[j].start - v.tl.scenes[v.index].start;
function wordT(v, j, n) {
  const p = v.tl.lines[v.index].phrases[j], ws = p.text.split(/\s+/);
  const wt = ws.map((w) => w.replace(/\W/g, '').length + 1.5 + (/[,.?!:]$/.test(w.replace(/\/$/, '')) ? 3 : 0));
  const tot = wt.reduce((a, b) => a + b, 0);
  let acc = 0;
  for (let i = 0; i < n; i++) acc += wt[i];
  return p.start + ((p.end - p.start) * acc) / tot - v.tl.scenes[v.index].start;
}

/** screen-space chip: dark rounded plate, coloured tick, label. anchor (x, y) = left-middle (or right-middle) */
function chip(c, text, x, y, col, k, align = 'left') {
  if (k <= 0) return;
  c.save();
  c.globalAlpha *= L.clamp(k);
  c.font = L.font(28, 800, L.FONT.display);
  c.letterSpacing = '1px';
  const tw = c.measureText(text).width;
  const w = tw + 34, h = 42, x0 = align === 'left' ? x : x - w, y0 = y - h / 2 + (1 - k) * 8;
  c.fillStyle = 'rgba(10,10,14,0.88)';
  L.roundRect(c, x0, y0, w, h, 8); c.fill();
  c.fillStyle = L.rgba(col); c.fillRect(x0 + 8, y0 + 9, 4, h - 18);
  c.fillStyle = '#fff'; c.textBaseline = 'middle';
  c.fillText(text, x0 + 22, y0 + h / 2 + 1);
  c.letterSpacing = '0px';
  c.restore();
}

/** stroke a rect outline progressively (perimeter fraction u) */
function tracedRect(c, x0, y0, x1, y1, u) {
  const per = 2 * (x1 - x0 + y1 - y0);
  let left = per * L.clamp(u);
  const pts = [[x0, y0], [x1, y0], [x1, y1], [x0, y1], [x0, y0]];
  c.beginPath(); c.moveTo(x0, y0);
  for (let i = 1; i < pts.length && left > 0; i++) {
    const [ax, ay] = pts[i - 1], [bx, by] = pts[i], seg = Math.hypot(bx - ax, by - ay), f = Math.min(1, left / seg);
    c.lineTo(ax + (bx - ax) * f, ay + (by - ay) * f);
    left -= seg;
  }
  c.stroke();
}

// chip anchors (screen px) per zone, computed from the zone rect
const CHIP = [
  (r) => [r.x1 + 16, r.y0 + 60, 'left'],            // WALL: on the warehouse roof, right of the wall
  (r) => [Math.min(r.x1 - 10, 520), r.y1 + 36, 'right'],   // FENCE: under the fence, over the site
  (r) => [r.x1 + 16, r.y0 + 190, 'left'],           // NARROW STREET: right of the street
];

export default {
  beat: 2,
  chapter: null,
  captions: true,
  layer: 5,
  cues(d) { return []; },
  drawOverlay(c, v) {
    c.save();
    c.globalAlpha = v.k;
    const tName = [wordT(v, 1, 1), wordT(v, 1, 2), wordT(v, 1, 4)];   // walls, fences, narrow
    const tHot = wordT(v, 1, 6) + 0.2;                                  // "that's where people get crushed"
    const hot = L.ease.outCubic(L.prog(v.t, tHot, 0.5));
    const pulse = 0.5 + 0.5 * Math.sin((v.t - tHot) * 5);

    // ---- crush zones
    ZONES.forEach((z, i) => {
      const nk = L.prog(v.t, tName[i] - 0.15, 0.6);
      if (nk <= 0) return;
      const r = { x0: v.wx(z.x0), y0: v.wy(z.y0), x1: v.wx(z.x1), y1: Math.min(v.wy(z.y1), 1360) };   // the street's zone stops above the captions
      // hazard hatching sweeps in on "crushed"
      if (hot > 0) {
        c.save();
        c.beginPath(); c.rect(r.x0, r.y0, r.x1 - r.x0, r.y1 - r.y0); c.clip();
        c.fillStyle = L.rgba(DANGER, 0.2 * hot * (0.75 + 0.25 * pulse));
        c.fillRect(r.x0, r.y0, r.x1 - r.x0, r.y1 - r.y0);
        c.strokeStyle = L.rgba(DANGER, 0.55 * hot); c.lineWidth = 4;
        c.beginPath();
        for (let s = -(r.y1 - r.y0); s < (r.x1 - r.x0) * hot + 1; s += 16) { c.moveTo(r.x0 + s, r.y1); c.lineTo(r.x0 + s + (r.y1 - r.y0), r.y0); }
        c.stroke();
        c.restore();
      }
      const col = L.mix(AMBER, DANGER, hot);
      c.save();
      c.shadowColor = L.rgba(col, 0.8 * (0.4 + 0.6 * hot)); c.shadowBlur = 8 + 10 * hot * pulse;
      c.strokeStyle = L.rgba(col, 0.95); c.lineWidth = 3 + 1.5 * hot;
      c.lineJoin = 'round';
      tracedRect(c, r.x0, r.y0, r.x1, r.y1, L.ease.inOutCubic(nk));
      c.restore();
      const [cx, cy, al] = CHIP[i](r);
      chip(c, z.name, cx, cy, col, L.ease.outCubic(L.prog(v.t, tName[i] + 0.05, 0.4)), al);
    });

    // ---- exit route: YOU → plaza edge → along the footpath
    const ek = L.ease.inOutCubic(L.prog(v.t, ph(v, 0) + 0.45, 1.0));
    if (ek > 0) {
      const p = { ...youAt(v.gt, v.tl) };
      const w = [[p.x, p.y], [EXIT.x, EXIT.y], ...FOOTPATH.slice(1, 3)].map(([x, y]) => [v.wx(x), v.wy(y)]);
      // start just outside the YOU ring
      const d0 = Math.hypot(w[1][0] - w[0][0], w[1][1] - w[0][1]) || 1;
      w[0] = [w[0][0] + (w[1][0] - w[0][0]) * Math.min(0.9, 32 / d0), w[0][1] + (w[1][1] - w[0][1]) * Math.min(0.9, 32 / d0)];
      const segs = []; let tot = 0;
      for (let i = 1; i < w.length; i++) { const l = Math.hypot(w[i][0] - w[i - 1][0], w[i][1] - w[i - 1][1]); segs.push(l); tot += l; }
      let left = tot * ek, tip = w[0], dir = [1, 0];
      c.save();
      c.shadowColor = 'rgba(0,0,0,0.7)'; c.shadowBlur = 8;
      c.strokeStyle = L.rgba(SAFE, 0.95); c.fillStyle = L.rgba(SAFE, 0.95);
      c.lineWidth = 5; c.lineCap = 'round'; c.lineJoin = 'round';
      c.setLineDash([14, 11]); c.lineDashOffset = -v.gt * 40;
      c.beginPath(); c.moveTo(w[0][0], w[0][1]);
      for (let i = 1; i < w.length && left > 0; i++) {
        const f = Math.min(1, left / segs[i - 1]);
        tip = [w[i - 1][0] + (w[i][0] - w[i - 1][0]) * f, w[i - 1][1] + (w[i][1] - w[i - 1][1]) * f];
        dir = [(w[i][0] - w[i - 1][0]) / segs[i - 1], (w[i][1] - w[i - 1][1]) / segs[i - 1]];
        c.lineTo(tip[0] - dir[0] * 12 * (f === 1 && i === w.length - 1 ? 1 : 0), tip[1] - dir[1] * 12 * (f === 1 && i === w.length - 1 ? 1 : 0));
        left -= segs[i - 1];
      }
      c.stroke();
      c.setLineDash([]);
      const a = Math.atan2(dir[1], dir[0]), hd = 26;
      c.beginPath();
      c.moveTo(tip[0] + dir[0] * 6, tip[1] + dir[1] * 6);
      c.lineTo(tip[0] - Math.cos(a - 0.5) * hd, tip[1] - Math.sin(a - 0.5) * hd);
      c.lineTo(tip[0] - Math.cos(a + 0.5) * hd, tip[1] - Math.sin(a + 0.5) * hd);
      c.closePath(); c.fill();
      c.restore();
      const end = w[w.length - 1];
      chip(c, 'EXIT', end[0] - 20, end[1] - 52, SAFE, L.ease.outCubic(L.prog(v.t, ph(v, 0) + 1.25, 0.4)), 'left');
    }

    // ---- badge + sub
    stepBadge(c, v, 2, 'STAY AT THE EDGES', { k: L.enter(v.t, ph(v, 0) - 0.1, 0.75) });
    // phrase 0: where to be; on "that's where people get crushed" it hands over to the red warning (sequential, no overlap)
    stepSub(c, 'EDGE OF THE CROWD · NEAR AN EXIT', L.ease.outCubic(L.prog(v.t, ph(v, 0) + 0.5, 0.45)) * (1 - L.ease.inCubic(L.prog(v.t, tHot - 0.1, 0.2))), { col: [170, 236, 196], bar: SAFE });
    stepSub(c, 'AVOID CRUSH ZONES', L.enter(v.t, tHot + 0.15, 0.45), { col: [255, 150, 136], bar: DANGER });
    c.restore();
  },
};
