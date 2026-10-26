// Beat 2 — "Snakes kill up to a hundred and thirty-eight thousand. | Many of them farmers, far from a hospital."
// Phrase 0: the snake hero (env) glides in; the shark row moves down, the snake row slides in, the axis rescales
// 10 → 150,000 (shark bar → loupe) BEFORE the snake bar grows; "UP TO" arrives with "up to" and the value 138,000 is
// revealed ON "thousand" (WHO 81,000–138,000). The snake docks into its row.
// Phrase 1: an opaque map card in the hero zone: a rural landscape seen from above, a FARM marker (on "farmers"), a long
// winding track that draws itself (on "far") to the NEAREST HOSPITAL marker (on "hospital"). No invented distance.
import * as L from '../../../../engine/runtime/lib.js';
import { statBlock, RED, INKW, GREYT, PH, BE, W8 } from '../env.js';

const CARD = { x: 110, y: 372, w: 860, h: 384, r: 26 };
const FARM = { x: 236, y: 646 }, HOSP = { x: 846, y: 474 };
// the track: a winding rural road farm → hospital (screen px)
const ROAD = [[236, 646], [300, 640], [352, 606], [372, 560], [430, 534], [508, 552], [566, 590], [630, 586], [672, 548],
  [690, 500], [742, 478], [800, 486], [846, 474]];

// terrain from above: a slightly rotated grid of dirt roads, fields inside each block (crop-row texture), soft canopy
// clusters (tree groups) and a river. Deterministic (seeded); drawn at FULL alpha and revealed only by the plate's wipe.
const GRID = { rot: 0.05, xs: [-430, -175, 70, 300, 430], ys: [-192, -48, 92, 192] };   // block edges (card-centred)
const ROADS_V = [-175, 70, 300], ROADS_H = [-48, 92];
const FIELD_COLS = [[100, 122, 70], [128, 132, 76], [150, 136, 90], [88, 110, 64], [116, 130, 84], [142, 122, 78], [82, 102, 60], [136, 140, 96]];
const FIELDS = (() => {
  const r = L.rng(3122), out = [];
  for (let bx = 0; bx < GRID.xs.length - 1; bx++) for (let by = 0; by < GRID.ys.length - 1; by++) {
    const x0 = GRID.xs[bx], x1 = GRID.xs[bx + 1], y0 = GRID.ys[by], y1 = GRID.ys[by + 1];
    // split each block into 2–3 plots along its long side
    const n = 2 + (r() < 0.45 ? 1 : 0), vert = (x1 - x0) > (y1 - y0);
    const cuts = [0];
    for (let k = 1; k < n; k++) cuts.push(k / n + (r() - 0.5) * 0.18);
    cuts.push(1);
    for (let k = 0; k < n; k++) {
      const f0 = cuts[k], f1 = cuts[k + 1];
      const fx0 = vert ? L.lerp(x0, x1, f0) : x0, fx1 = vert ? L.lerp(x0, x1, f1) : x1;
      const fy0 = vert ? y0 : L.lerp(y0, y1, f0), fy1 = vert ? y1 : L.lerp(y0, y1, f1);
      out.push({ x0: fx0, y0: fy0, x1: fx1, y1: fy1, col: FIELD_COLS[Math.floor(r() * FIELD_COLS.length)], rows: r() < 0.7, ang: r() < 0.5 ? 0 : Math.PI / 2, sp: 5 + Math.floor(r() * 3) });
    }
  }
  return out;
})();
const CANOPY = (() => {
  const r = L.rng(3123), out = [];
  // clusters along the river and at a few field corners
  const centres = [[-330, -120], [-250, 40], [-90, 150], [40, -150], [180, 40], [250, 150], [370, -110], [-20, 10], [390, 60], [-380, 150]];
  for (const [cx, cy] of centres) {
    const n = 5 + Math.floor(r() * 5);
    for (let i = 0; i < n; i++) out.push({ x: cx + (r() - 0.5) * 70, y: cy + (r() - 0.5) * 44, s: 9 + r() * 9 });
  }
  return out;
})();
function drawTerrain(c) {
  const cx = CARD.x + CARD.w / 2, cy = CARD.y + CARD.h / 2;
  c.fillStyle = 'rgb(86,92,62)';
  c.fillRect(CARD.x - 20, CARD.y - 20, CARD.w + 40, CARD.h + 40);
  c.save();
  c.translate(cx, cy); c.rotate(GRID.rot);
  for (const f of FIELDS) {
    const m = 4;   // field margin (the boundary between plots)
    c.fillStyle = L.rgba(f.col);
    c.fillRect(f.x0 + m, f.y0 + m, f.x1 - f.x0 - 2 * m, f.y1 - f.y0 - 2 * m);
    if (f.rows) {
      c.save();
      c.beginPath(); c.rect(f.x0 + m, f.y0 + m, f.x1 - f.x0 - 2 * m, f.y1 - f.y0 - 2 * m); c.clip();
      c.strokeStyle = 'rgba(30,36,20,0.16)'; c.lineWidth = 1.6;
      c.beginPath();
      if (f.ang === 0) for (let y = f.y0; y < f.y1; y += f.sp) { c.moveTo(f.x0, y); c.lineTo(f.x1, y); }
      else for (let x = f.x0; x < f.x1; x += f.sp) { c.moveTo(x, f.y0); c.lineTo(x, f.y1); }
      c.stroke();
      c.restore();
    }
  }
  // dirt roads on the grid
  c.strokeStyle = 'rgb(176,160,124)'; c.lineWidth = 9; c.lineCap = 'butt';
  c.beginPath();
  for (const x of ROADS_V) { c.moveTo(x, -260); c.lineTo(x, 260); }
  for (const y of ROADS_H) { c.moveTo(-500, y); c.lineTo(500, y); }
  c.stroke();
  c.strokeStyle = 'rgba(120,104,76,0.5)'; c.lineWidth = 1.5;
  c.beginPath();
  for (const x of ROADS_V) { c.moveTo(x - 4.5, -260); c.lineTo(x - 4.5, 260); c.moveTo(x + 4.5, -260); c.lineTo(x + 4.5, 260); }
  for (const y of ROADS_H) { c.moveTo(-500, y - 4.5); c.lineTo(500, y - 4.5); c.moveTo(-500, y + 4.5); c.lineTo(500, y + 4.5); }
  c.stroke();
  c.restore();
  // a river (meanders across the grid)
  c.lineCap = 'round';
  c.strokeStyle = 'rgb(58,78,62)'; c.lineWidth = 22;
  const river = () => { c.beginPath(); c.moveTo(CARD.x - 10, CARD.y + 110); c.bezierCurveTo(380, 440, 470, 700, 640, 690); c.bezierCurveTo(760, 680, 860, 720, CARD.x + CARD.w + 10, 700); };
  river(); c.stroke();
  c.strokeStyle = 'rgb(72,104,128)'; c.lineWidth = 11; river(); c.stroke();
  c.strokeStyle = 'rgba(170,200,220,0.25)'; c.lineWidth = 2.5; river(); c.stroke();
  // canopy clusters: soft, shaded tree crowns with a cast shadow
  c.save();
  c.translate(cx, cy); c.rotate(GRID.rot);
  for (const t of CANOPY) { c.fillStyle = 'rgba(20,28,16,0.35)'; c.beginPath(); c.arc(t.x + 3, t.y + 4, t.s, 0, Math.PI * 2); c.fill(); }
  for (const t of CANOPY) {
    const g = c.createRadialGradient(t.x - t.s * 0.35, t.y - t.s * 0.4, t.s * 0.1, t.x, t.y, t.s);
    g.addColorStop(0, 'rgb(84,116,62)'); g.addColorStop(1, 'rgb(40,62,36)');
    c.fillStyle = g; c.beginPath(); c.arc(t.x, t.y, t.s, 0, Math.PI * 2); c.fill();
  }
  c.restore();
  // gentle vignette (keeps the markers the brightest things) + a cool grade to sit in the dark episode
  const vg = c.createRadialGradient(cx, cy, 160, cx, cy, 560);
  vg.addColorStop(0, 'rgba(10,14,16,0.22)'); vg.addColorStop(1, 'rgba(10,14,16,0.5)');
  c.fillStyle = vg; c.fillRect(CARD.x, CARD.y, CARD.w, CARD.h);
}

function polyLen(pts) { let s = 0; for (let i = 1; i < pts.length; i++) s += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); return s; }
const RLEN = polyLen(ROAD);
function pointAt(pts, d) {
  for (let i = 1; i < pts.length; i++) {
    const l = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
    if (d <= l) return [L.lerp(pts[i - 1][0], pts[i][0], d / l), L.lerp(pts[i - 1][1], pts[i][1], d / l)];
    d -= l;
  }
  return pts[pts.length - 1];
}
function roadPath(c, upto) {
  c.beginPath(); c.moveTo(ROAD[0][0], ROAD[0][1]);
  let d = 0;
  for (let i = 1; i < ROAD.length; i++) {
    const l = Math.hypot(ROAD[i][0] - ROAD[i - 1][0], ROAD[i][1] - ROAD[i - 1][1]);
    if (d + l >= upto) { const p = pointAt(ROAD, upto); c.lineTo(p[0], p[1]); return; }
    c.lineTo(ROAD[i][0], ROAD[i][1]); d += l;
  }
}

function label(c, txt, x, y, align, k, col = INKW) {
  if (k <= 0) return;
  c.save();
  c.globalAlpha *= k;
  c.font = L.font(22, 700, L.FONT.body);
  c.letterSpacing = '2.5px';
  const w = c.measureText(txt).width - 2.5;
  c.letterSpacing = '0px';
  const x0 = align === 'right' ? x - w : align === 'center' ? x - w / 2 : x;
  c.fillStyle = 'rgba(8,10,14,0.88)';
  L.roundRect(c, x0 - 12, y - 25, w + 24, 36, 8); c.fill();
  c.fillStyle = L.rgba(col);
  L.trackedText(c, txt, x0, y, 2.5);
  c.restore();
}

export default {
  beat: 2,
  chapter: null,
  captions: true,
  layer: 5,
  drawOverlay(c, v) {
    const tl = v.tl, gt = v.gt;
    statBlock(c, v, 'snake', 'SNAKEBITE DEATHS PER YEAR · WHO ESTIMATE 81,000–138,000');
    // ---- the map card (phrase 1)
    const p1 = PH(tl, 2, 1, 'start');
    const win = L.ease.outCubic(L.prog(gt, p1 - 0.12, 0.45));
    if (win <= 0) return;
    const end = BE(tl, 2);
    // exit: markers/track/labels first (0.15 s), then the plate wipes shut WITH its terrain, done before the beat's fade
    const cOut = L.ease.inCubic(L.prog(gt, end - 0.78, 0.15));
    const pOut = L.ease.inCubic(L.prog(gt, end - 0.62, 0.3));
    const hh = CARD.h * win * (1 - pOut);
    if (hh <= 1) return;
    c.save();
    // plate + terrain: opaque from the first frame, wiped open (and shut) from the centre line together
    const cy = CARD.y + CARD.h / 2;
    c.shadowColor = 'rgba(0,0,0,0.6)'; c.shadowBlur = 36; c.shadowOffsetY = 10;
    c.fillStyle = 'rgb(20,25,24)';
    L.roundRect(c, CARD.x, cy - hh / 2, CARD.w, hh, Math.min(CARD.r, hh / 2)); c.fill();
    c.shadowColor = 'transparent';
    c.save();
    L.roundRect(c, CARD.x, cy - hh / 2, CARD.w, hh, Math.min(CARD.r, hh / 2)); c.clip();
    drawTerrain(c);
    const ck = 1 - cOut;
    c.globalAlpha = ck;
    // ---- the track: draws itself from "far" to "hospital"
    const tFar = W8(tl, 'far', -0.1), tH = W8(tl, 'hospital', 0.15);
    const re = L.ease.inOutCubic(L.prog(gt, tFar, tH - tFar));
    if (re > 0) {
      c.save();
      c.strokeStyle = 'rgba(0,0,0,0.45)'; c.lineWidth = 9; c.lineCap = 'round'; c.lineJoin = 'round';
      roadPath(c, RLEN * re); c.stroke();
      c.setLineDash([12, 10]); c.lineDashOffset = 0;
      c.strokeStyle = 'rgba(232,226,210,0.9)'; c.lineWidth = 4;
      roadPath(c, RLEN * re); c.stroke();
      c.setLineDash([]);
      const hp = pointAt(ROAD, RLEN * re);
      if (re < 1) { c.fillStyle = L.rgba(INKW); c.beginPath(); c.arc(hp[0], hp[1], 6, 0, Math.PI * 2); c.fill(); }
      c.restore();
    }
    // ---- farm marker (on "farmers")
    const fk = L.ease.outBack(L.prog(gt, W8(tl, 'farmers', -0.2), 0.4), 2);
    if (fk > 0) {
      const pu = (gt * 0.8) % 1;
      c.strokeStyle = L.rgba(RED, 0.6 * (1 - pu)); c.lineWidth = 3;
      c.beginPath(); c.arc(FARM.x, FARM.y, Math.max(0, 14 + 30 * pu), 0, Math.PI * 2); c.stroke();
      c.fillStyle = L.rgba(RED);
      c.beginPath(); c.arc(FARM.x, FARM.y, Math.max(0, 13 * fk), 0, Math.PI * 2); c.fill();
      c.fillStyle = 'rgb(20,8,10)';
      // a tiny house glyph in the marker
      c.beginPath(); c.moveTo(FARM.x - 6, FARM.y + 5); c.lineTo(FARM.x - 6, FARM.y - 1); c.lineTo(FARM.x, FARM.y - 7); c.lineTo(FARM.x + 6, FARM.y - 1); c.lineTo(FARM.x + 6, FARM.y + 5); c.closePath(); c.fill();
      label(c, 'FARM', FARM.x, FARM.y + 52, 'center', L.clamp(fk));
    }
    // ---- hospital marker (on "hospital")
    const hk = L.ease.outBack(L.prog(gt, W8(tl, 'hospital', -0.15), 0.4), 2);
    if (hk > 0) {
      const s = 40 * L.clamp(hk, 0, 1.2);
      c.fillStyle = 'rgb(230,236,244)';
      L.roundRect(c, HOSP.x - s / 2, HOSP.y - s / 2, s, s, 7); c.fill();
      c.fillStyle = 'rgb(36,120,110)';
      const a = s * 0.62, b = s * 0.2;
      c.fillRect(HOSP.x - a / 2, HOSP.y - b / 2, a, b); c.fillRect(HOSP.x - b / 2, HOSP.y - a / 2, b, a);
      label(c, 'NEAREST HOSPITAL', HOSP.x + 22, HOSP.y + 62, 'right', L.clamp(hk));
    }
    c.restore();
    c.strokeStyle = 'rgba(170,184,206,0.22)'; c.lineWidth = 1.5;
    L.roundRect(c, CARD.x + 0.5, cy - hh / 2 + 0.5, CARD.w - 1, hh - 1, Math.min(CARD.r, hh / 2)); c.stroke();
    c.restore();
    void GREYT;
  },
};
