// Beat 12 — "Zoom back out. | Every few seconds, you breathe in about half a liter of air."
// The camera pulls 3.9 decades out of the marrow (s10 dissolves through the hole, s09's skeleton returns and dims)
// to the chest. OWNS refined glass LUNGS from beat 12 to the end: two lobed lungs (cardiac notch on the person's left),
// fissures, a bronchial tree and trachea. On phrase 2 a cool glow of air runs down the trachea and branches and the
// lungs swell (diaphragm down); they keep breathing every ~4.6 s for the rest of the film, dimmer after this beat.
import * as L from '../../../../engine/runtime/lib.js';
import { ACCENT } from '../env.js';

const AIR = [190, 228, 255];
const GLASS = [150, 190, 245];
// viewer-left lung = the person's right (3 lobes); viewer-right = the person's left (2 lobes, cardiac notch)
const LUNGS = [
  { side: -1, pts: [[-0.04, 1.478], [-0.07, 1.468], [-0.104, 1.428], [-0.128, 1.362], [-0.14, 1.29], [-0.143, 1.228], [-0.137, 1.196],
    [-0.11, 1.203], [-0.066, 1.22], [-0.03, 1.232], [-0.021, 1.276], [-0.03, 1.326], [-0.046, 1.352], [-0.029, 1.392], [-0.031, 1.44]],
    fissures: [[[-0.137, 1.33], [-0.09, 1.322], [-0.05, 1.335]], [[-0.128, 1.39], [-0.1, 1.31], [-0.075, 1.25], [-0.06, 1.222]]] },
  { side: 1, pts: [[0.04, 1.478], [0.07, 1.468], [0.104, 1.428], [0.128, 1.362], [0.14, 1.29], [0.143, 1.228], [0.137, 1.196],
    [0.116, 1.2], [0.094, 1.21], [0.1, 1.244], [0.09, 1.284], [0.072, 1.318], [0.052, 1.348], [0.032, 1.392], [0.031, 1.44]],
    fissures: [[[0.128, 1.395], [0.105, 1.32], [0.1, 1.25]]] },
];
const MEDIAL = 0.03, APEX = 1.478;
// diaphragm: two domes under the lung bases (world x, h), mapped with each lung so it drops on the inhale
const DIA = [[0.0, 1.196], [0.025, 1.205], [0.06, 1.196], [0.1, 1.186], [0.13, 1.18], [0.15, 1.15]];

function inPoly(pts, x, h) {
  let ins = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const [xi, yi] = pts[i], [xj, yj] = pts[j];
    if ((yi > h) !== (yj > h) && x < ((xj - xi) * (h - yi)) / (yj - yi) + xi) ins = !ins;
  }
  return ins;
}
// bronchial tree: deterministic branching segments [x1,h1,x2,h2,width,dist1,dist2,depth]
const TREE = (() => {
  const segs = [];
  const q = L.rng(1212);
  const push = (x1, h1, x2, h2, w, d1, dep) => { const d2 = d1 + Math.hypot(x2 - x1, h2 - h1); segs.push([x1, h1, x2, h2, w, d1, d2, dep]); return d2; };
  const d0 = push(0, 1.535, 0, 1.39, 0.016, 0, 0);
  function grow(lung, x, h, ang, len, w, dist, dep) {
    const x2 = x + Math.cos(ang) * len, h2 = h + Math.sin(ang) * len;
    if (dep > 1 && !inPoly(lung.pts, x2 * 1.06 - lung.side * 0.002, (h2 - 1.33) * 1.06 + 1.33)) return;
    const d2 = push(x, h, x2, h2, w, dist, dep);
    if (dep >= 6) return;
    const spread = 0.42 + q() * 0.25;
    grow(lung, x2, h2, ang + spread, len * (0.7 + q() * 0.12), w * 0.68, d2, dep + 1);
    grow(lung, x2, h2, ang - spread * (0.8 + q() * 0.3), len * (0.66 + q() * 0.12), w * 0.66, d2, dep + 1);
  }
  for (const lung of LUNGS) {
    const s = lung.side;
    const hx = s * (s < 0 ? 0.044 : 0.05), hh = s < 0 ? 1.352 : 1.348;
    const d1 = push(0, 1.39, hx, hh, 0.011, d0, 1);
    // upper-lobe branch + the main stem that splits down to the lower lobes
    grow(lung, hx, hh, s < 0 ? Math.PI * 0.72 : Math.PI * 0.28, 0.04, 0.0075, d1, 2);
    grow(lung, hx, hh, s < 0 ? -Math.PI * 0.62 : -Math.PI * 0.38, 0.05, 0.0085, d1, 2);
    grow(lung, hx, hh, s < 0 ? Math.PI * 1.02 : -Math.PI * 0.02, 0.04, 0.007, d1, 2);
  }
  return segs;
})();
const MAXD = Math.max(...TREE.map((s) => s[6]));
const ALV = LUNGS.map((lung) => {
  const q = L.rng(500 + lung.side), out = [];
  while (out.length < 120) {
    const x = lung.side * (0.025 + q() * 0.125), h = 1.19 + q() * 0.29;
    if (inPoly(lung.pts, x, h)) out.push([x, h, q() * 6.28, 0.6 + q() * 0.8]);
  }
  return out;
});

/** Breath 0..1 (inhale fraction) at global time: first inhale on phrase 2, then every 4.6 s. */
export function breath(gt, tl) {
  const g0 = tl.scenes[12].start + 2.25;
  if (gt < g0) return { br: 0, front: 0, inh: false };
  const PER = 4.6, u = ((gt - g0) % PER) / PER;
  if (u < 0.43) { const p = u / 0.43; return { br: L.ease.inOutCubic(p), front: L.ease.outCubic(L.clamp(p * 1.25)), inh: true }; }
  if (u < 0.5) return { br: 1, front: 1, inh: false };
  return { br: 1 - L.ease.inOutCubic((u - 0.5) / 0.5), front: 1, inh: false };
}

function mapper(v, side, br) {
  const sx = 1 + 0.08 * br, sy = 1 + 0.12 * br;
  return {
    X: (x) => v.wx(side * MEDIAL + (x - side * MEDIAL) * sx),
    Y: (h) => v.wy(-(APEX - (APEX - h) * sy)),
  };
}
function lungPath(c, pts, M) {
  const n = pts.length, p = (i) => pts[(i + n) % n];
  c.moveTo(M.X(p(0)[0]), M.Y(p(0)[1]));
  for (let i = 0; i < n; i++) {
    const p0 = p(i - 1), p1 = p(i), p2 = p(i + 1), p3 = p(i + 2);
    c.bezierCurveTo(M.X(p1[0] + (p2[0] - p0[0]) / 6), M.Y(p1[1] + (p2[1] - p0[1]) / 6),
      M.X(p2[0] - (p3[0] - p1[0]) / 6), M.Y(p2[1] - (p3[1] - p1[1]) / 6), M.X(p2[0]), M.Y(p2[1]));
  }
  c.closePath();
}

export default {
  beat: 12,
  chapter: { num: '12', title: 'Breath', sub: 'in, out, every few seconds' },
  captions: true,
  layer: 0,
  cues() {
    return [
      { t: 0.0, name: 'whoosh', gain: 0.34, pitch: 0.65 },
      { t: 0.15, name: 'swell', gain: 0.22, pitch: 0.7 },
      { t: 1.9, name: 'bloom', gain: 0.2, pitch: 1.1 },
      { t: 2.25, name: 'swish', gain: 0.22, pitch: 0.5 },
      { t: 2.3, name: 'riser', gain: 0.12, pitch: 0.8 },
      { t: 3.6, name: 'tick', gain: 0.3, pitch: 1.0 },
    ];
  },
  drawWorld(c, v) {
    if (v.t < 0 || v.cam.mpp < 6e-5) return;
    const k = L.ease.outCubic(L.prog(v.t, 1.55, 0.9));
    if (k <= 0) return;
    const focus = L.lerp(1, 0.5, L.ease.inOutCubic(L.prog(v.t, v.d + 0.3, 1.0)));
    const { br, front } = breath(v.gt, v.tl);
    const a = k * focus;
    const lw = (m, lo, hi) => L.clamp(v.ws(m), lo, hi);
    c.save();
    for (const [li, lung] of LUNGS.entries()) {
      const M = mapper(v, lung.side, br);
      // glass body of the lung
      c.beginPath(); lungPath(c, lung.pts, M);
      const top = M.Y(1.48), bot = M.Y(1.19);
      const g = c.createLinearGradient(0, top, 0, bot);
      g.addColorStop(0, L.rgba(GLASS, (0.16 + 0.1 * br) * a)); g.addColorStop(1, L.rgba([90, 120, 200], (0.1 + 0.08 * br) * a));
      c.fillStyle = g; c.fill();
      c.save();
      c.clip();
      // air filling the lung from the hilum outward
      c.globalCompositeOperation = 'lighter';
      const hx = M.X(lung.side * 0.045), hy = M.Y(1.35), R = v.ws(0.16);
      const ag = c.createRadialGradient(hx, hy, 0, hx, hy, Math.max(1, R * (0.55 + 0.5 * br)));
      ag.addColorStop(0, L.rgba(AIR, 0.42 * br * a)); ag.addColorStop(0.6, L.rgba(AIR, 0.2 * br * a)); ag.addColorStop(1, L.rgba(AIR, 0));
      c.fillStyle = ag; c.fillRect(hx - R * 1.1, hy - R * 1.1, R * 2.2, R * 2.2);
      // alveolar sparkle (a fine texture that brightens with air)
      for (const [x, h, ph, s] of ALV[li]) {
        const tw = 0.5 + 0.5 * Math.sin(v.gt * 1.7 + ph);
        const al = (0.06 + 0.32 * br) * tw * a;
        if (al < 0.01) continue;
        c.fillStyle = L.rgba(AIR, al);
        c.beginPath(); c.arc(M.X(x), M.Y(h), Math.max(0, lw(0.0016 * s, 0.6, 3)), 0, Math.PI * 2); c.fill();
      }
      // inner fresnel rim
      c.globalCompositeOperation = 'source-over';
      c.beginPath(); lungPath(c, lung.pts, M);
      c.strokeStyle = L.rgba([170, 205, 255], 0.16 * a); c.lineWidth = lw(0.014, 4, 30); c.stroke();
      c.restore();
      // fissures + crisp rim
      c.beginPath();
      for (const f of lung.fissures) { c.moveTo(M.X(f[0][0]), M.Y(f[0][1])); for (let i = 1; i < f.length; i++) c.lineTo(M.X(f[i][0]), M.Y(f[i][1])); }
      c.strokeStyle = L.rgba([170, 205, 255], 0.28 * a); c.lineWidth = lw(0.0012, 0.8, 2); c.stroke();
      c.beginPath(); lungPath(c, lung.pts, M);
      c.strokeStyle = L.rgba([185, 215, 255], 0.7 * a); c.lineWidth = lw(0.0018, 1, 3); c.stroke();
    }
    // bronchial tree: glass tubes, lit by the incoming air front
    c.lineCap = 'round';
    for (const [x1, h1, x2, h2, w, d1, d2, dep] of TREE) {
      const side = x2 < 0 ? -1 : 1;
      const M = dep === 0 ? mapper(v, 0, 0) : mapper(v, side, br);
      c.strokeStyle = L.rgba([200, 220, 250], (dep < 2 ? 0.42 : 0.3) * a);
      c.lineWidth = lw(w, 0.7, 26);
      c.beginPath(); c.moveTo(M.X(x1), M.Y(h1)); c.lineTo(M.X(x2), M.Y(h2)); c.stroke();
    }
    // the diaphragm: a glass sheet under the lungs that visibly drops as they fill
    for (const side of [-1, 1]) {
      const M = mapper(v, side, br);
      const pts = DIA.map(([x, h]) => [M.X(side * x), M.Y(h - 0.006)]);
      c.beginPath(); c.moveTo(pts[0][0], pts[0][1]);
      for (let i = 1; i < pts.length - 1; i++) c.quadraticCurveTo(pts[i][0], pts[i][1], (pts[i][0] + pts[i + 1][0]) / 2, (pts[i][1] + pts[i + 1][1]) / 2);
      c.lineTo(pts[pts.length - 1][0], pts[pts.length - 1][1]);
      c.strokeStyle = L.rgba([150, 190, 245], 0.1 * a); c.lineWidth = lw(0.008, 3, 22); c.stroke();
      c.strokeStyle = L.rgba([185, 215, 255], (0.38 + 0.2 * br) * a); c.lineWidth = lw(0.0018, 1, 3); c.stroke();
    }
    // trachea rings
    c.strokeStyle = L.rgba([210, 228, 255], 0.35 * a); c.lineWidth = lw(0.0015, 0.7, 3);
    for (let h = 1.4; h < 1.53; h += 0.0085) {
      c.beginPath(); c.moveTo(v.wx(-0.008), v.wy(-h)); c.quadraticCurveTo(v.wx(0), v.wy(-h + 0.003), v.wx(0.008), v.wy(-h)); c.stroke();
    }
    // the air front (only while inhaling: a bright pulse travelling down the tree)
    if (br > 0 && front < 1) {
      const fd = front * MAXD;
      c.globalCompositeOperation = 'lighter';
      for (const [x1, h1, x2, h2, w, d1, d2, dep] of TREE) {
        if (d1 > fd) continue;
        const f = L.clamp((fd - d1) / Math.max(1e-6, d2 - d1));
        const M = dep === 0 ? mapper(v, 0, 0) : mapper(v, x2 < 0 ? -1 : 1, br);
        const ex = L.lerp(x1, x2, f), eh = L.lerp(h1, h2, f);
        const near = Math.exp(-Math.max(0, fd - d2) * 40);
        c.strokeStyle = L.rgba(AIR, (0.25 + 0.55 * near) * a);
        c.lineWidth = lw(w * 0.6, 0.8, 14);
        c.beginPath(); c.moveTo(M.X(x1), M.Y(h1)); c.lineTo(M.X(ex), M.Y(eh)); c.stroke();
        if (f < 1) L.lightBlob(c, M.X(ex), M.Y(eh), lw(0.012, 6, 60), AIR, 0.45 * a);
      }
    }
    // at the top of the inhale ("half a liter") the whole airway glows with the air it just carried in
    const pk = br * br * front;
    if (pk > 0.02) {
      c.globalCompositeOperation = 'lighter';
      for (const [x1, h1, x2, h2, w, , , dep] of TREE) {
        const M = dep === 0 ? mapper(v, 0, 0) : mapper(v, x2 < 0 ? -1 : 1, br);
        c.strokeStyle = L.rgba(AIR, (dep < 2 ? 0.16 : 0.1) * pk * a); c.lineWidth = lw(w * 2.2, 2, 40);
        c.beginPath(); c.moveTo(M.X(x1), M.Y(h1)); c.lineTo(M.X(x2), M.Y(h2)); c.stroke();
        c.strokeStyle = L.rgba(AIR, (dep < 2 ? 0.6 : 0.4) * pk * a); c.lineWidth = lw(w * 0.6, 0.8, 14);
        c.stroke();
      }
      L.lightBlob(c, v.wx(0), v.wy(-1.45), lw(0.05, 20, 200), AIR, 0.28 * pk * a);
      for (const sd of [-1, 1]) L.lightBlob(c, v.wx(sd * 0.05), v.wy(-1.345), lw(0.06, 20, 240), AIR, 0.22 * pk * a);
    }
    c.restore();
  },
  drawOverlay(c, v) {
    const k = v.k * L.ease.outCubic(L.prog(v.t, 3.6, 0.5));
    if (k <= 0) return;
    // leader from the label to the person's right lung, then the label (left of the head, above the shoulder)
    // (the label sits left of the head, its right edge well clear of the neck and trachea; the leader runs from the
    // outer edge of the right lung up to the label's lower-right corner)
    const lx = v.wx(-0.138), ly = v.wy(-1.37);
    L.leader(c, lx, ly, 300, 580, L.prog(v.t, 3.75, 0.5), [190, 228, 255], 0.7);
    L.bigLabel(c, { x: 66, y: 500, big: '≈ 0.5 L', small: '17 fl oz a breath', k, accent: ACCENT, align: 'left', size: 104 });
  },
};
