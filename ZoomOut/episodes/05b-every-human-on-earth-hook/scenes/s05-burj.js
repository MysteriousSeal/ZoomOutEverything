// Beat 5 — the cube is ~800 m tall; the Burj Khalifa (828 m) rises out of the ground beside it.
// World: side view seen from just above eye level (pitch P_BURJ ≈ 6°, so the cube shows a sliver of its top), ground
// at y = 0. The Burj stands at x = BX in the plane of the cube's farthest corner (Z = BZ), so the comparison stays
// honest in this slightly elevated view: its tip (828 m) clears the highest point of the cube's silhouette (the
// back-left top corner, 800 m at the same depth) by 28 m, and both heights are foreshortened by the same cos(p).
// The chapter card is drawn here, late (as the tower rises), instead of by the engine at the beat start.
// The tower sinks away at the very end of the beat, before beat 6's canyon starts to open.
import * as L from '../../../../engine/runtime/lib.js';
import { pitchAt, yawAt, halfWidth, SIDE, smallLine } from './s04-cube.js';

const BX = 900;
const BZ = -halfWidth((20 * Math.PI) / 180);   // depth of the cube's farthest corner (its yaw is 20° while the tower stands)
const HEIGHT = 828;
const RISE = [2.0, 1.3];           // beat 5: rises just before "Shorter than the Burj Khalifa" (2.6 s)
const SINK_LEAD = 0.5, SINK_DUR = 0.45;   // sinks over the last 0.5 s of beat 5 (gone before the canyon opens)
const BRACKET = 0.35;              // the 800 m bracket draws in on "eight hundred meters"
const SWAP = 3.1;                  // small line: the height first, then (once the tower stands) the comparison
const CARD = 1.8;                  // chapter card: as the tower starts to rise (≈ 31.3 s)
const STEEL = [150, 150, 160];
const RIM = [255, 170, 150];       // coral bounce light from the cube on the tower's left side

// Setback profile (h → half-width, m): the Y-plan's spiralling wings, asymmetric left/right.
const RIGHT = [[0, 55], [30, 49], [95, 46], [160, 40], [222, 37], [288, 31], [345, 28], [405, 22], [455, 19], [505, 13], [548, 10], [572, 7.5]];
const LEFT = [[0, 55], [30, 52], [68, 46], [128, 43], [192, 37], [252, 34], [318, 28], [375, 25], [432, 19], [482, 16], [528, 10], [560, 8]];
const SPIRE0 = 585;
const CROWN = [[SPIRE0, 6], [630, 4.6], [690, 3.3], [750, 2], [800, 1], [HEIGHT, 0.35]];

const OUTLINE = (() => {
  const side = (edge, sign) => {
    const out = [];
    for (let i = 0; i < edge.length; i++) {
      const [h, w] = edge[i];
      const hn = i + 1 < edge.length ? edge[i + 1][0] : SPIRE0;
      out.push([sign * w, h], [sign * w, hn - 1.5]);
    }
    for (const [h, w] of CROWN) out.push([sign * w, h]);
    return out;
  };
  return [...side(LEFT, -1), ...side(RIGHT, 1).reverse()];
})();

const sOf = (tl, i) => tl.scenes[i].start;

/** Height of the Burj's base below ground (m): HEIGHT = hidden, 0 = standing. */
function sunkAt(gt, tl) {
  const t5 = gt - sOf(tl, 5), d5 = sOf(tl, 6) - sOf(tl, 5);
  const up = L.ease.outCubic(L.prog(t5, RISE[0], RISE[1]));
  const down = L.ease.inCubic(L.prog(t5, d5 - SINK_LEAD, SINK_DUR));
  return HEIGHT * (1 - up + up * down);
}
/** Overlay exit for this beat: every label is gone by the beat boundary (a 0.38 s fade, no pop). */
const outK = (v) => 1 - L.ease.inOutCubic(L.prog(v.t, v.d - 0.4, 0.38));

// the chapter card (same look as the engine's), drawn late: it lands as the tower rises, not at the beat start.
// It is skipped while the cold open replays this beat (the engine draws no cards then): see chapterUntil below.
let LAST_T = -1;
const CHAP = { num: '05', title: 'Burj Khalifa', sub: 'Dubai · the tallest building on Earth' };

function path(c, v, sunk, co, gz) {
  c.beginPath();
  OUTLINE.forEach(([x, h], i) => {
    const X = v.wx(BX + x), Y = v.wy(gz - (h - sunk) * co);
    i ? c.lineTo(X, Y) : c.moveTo(X, Y);
  });
  c.closePath();
}

function drawTower(c, v, sunk, p) {
  const co = Math.cos(p), mpp = v.cam.mpp;
  const gz = BZ * Math.sin(p);
  const gy = v.wy(gz);
  const yTop = v.wy(gz - (HEIGHT - sunk) * co);
  c.save();
  c.beginPath(); c.rect(0, -10, L.W, gy + 10); c.clip();   // emerges from the ground line
  // body: cool steel, catching warm light near the top
  const g = c.createLinearGradient(0, yTop, 0, gy + sunk * co / mpp);
  g.addColorStop(0, 'rgb(214,206,208)');
  g.addColorStop(0.35, L.rgba(L.mix(STEEL, [200, 196, 204], 0.4)));
  g.addColorStop(1, 'rgb(74,72,84)');
  path(c, v, sunk, co, gz);
  c.fillStyle = g;
  c.fill();
  c.save();
  path(c, v, sunk, co, gz);
  c.clip();
  // form shading: lit left wing, shadowed right wing, bright core
  const x0 = v.wx(BX - 60), x1 = v.wx(BX + 60);
  const sg = c.createLinearGradient(x0, 0, x1, 0);
  sg.addColorStop(0, 'rgba(255,190,170,0.22)');
  sg.addColorStop(0.4, 'rgba(255,255,255,0.02)');
  sg.addColorStop(0.5, 'rgba(255,255,255,0.12)');
  sg.addColorStop(0.58, 'rgba(0,0,0,0.14)');
  sg.addColorStop(1, 'rgba(0,0,0,0.42)');
  c.fillStyle = sg;
  c.fillRect(x0, yTop - 4, x1 - x0, gy - yTop + 8);
  // floor bands (warm windows) when they resolve
  const gap = 14;
  if (gap / mpp > 4.5) {
    c.lineWidth = 1;
    c.strokeStyle = `rgba(255,226,196,${0.22 * L.clamp((gap / mpp - 4.5) / 3)})`;
    c.beginPath();
    for (let h = 18; h < SPIRE0; h += gap) {
      const y = v.wy(gz - (h - sunk) * co);
      if (y > gy) continue;
      c.moveTo(x0, y); c.lineTo(x1, y);
    }
    c.stroke();
  }
  c.restore();
  // rim: coral bounce on the left edge, thin cool outline
  path(c, v, sunk, co, gz);
  c.strokeStyle = 'rgba(230,228,240,0.25)';
  c.lineWidth = 1;
  c.stroke();
  c.beginPath();
  const l = OUTLINE.slice(0, Math.floor(OUTLINE.length / 2));
  l.forEach(([x, h], i) => { const X = v.wx(BX + x), Y = v.wy(gz - (h - sunk) * co); i ? c.lineTo(X, Y) : c.moveTo(X, Y); });
  c.strokeStyle = L.rgba(RIM, 0.55);
  c.lineWidth = 1.6;
  c.stroke();
  c.restore();
  // aviation beacon on the spire tip
  if (sunk < HEIGHT - 5) {
    const blink = Math.pow(Math.max(0, Math.sin(v.gt * Math.PI * 1.1)), 6);
    L.lightBlob(c, v.wx(BX), yTop, 22, [255, 80, 60], 0.7 * blink);
    L.lightBlob(c, v.wx(BX), yTop, 5, [255, 210, 200], 0.9 * blink);
  }
}

const GRIT = (() => { const r = L.rng(5501); return Array.from({ length: 36 }, () => [r(), r(), r(), r()]); })();
function drawGrit(c, v, a, mpp, gz) {
  // dust kicked up where the tower breaks the ground
  if (a <= 0 || a > 1.8) return;
  c.save();
  for (const [r1, r2, r3, r4] of GRIT) {
    const life = 0.9 + r3 * 0.9;
    if (a > life) continue;
    const k = a / life;
    const x = BX + (r1 - 0.5) * 2 * (60 + k * 160);
    const y = gz - k * (20 + r2 * 70);
    c.fillStyle = `rgba(220,190,170,${0.4 * (1 - k)})`;
    c.beginPath(); c.arc(v.wx(x), v.wy(y), Math.max(0, (5 + r4 * 10) * (0.6 + k) / mpp), 0, Math.PI * 2); c.fill();
  }
  c.restore();
}

export default {
  beat: 5,
  chapter: CHAP,
  // the engine draws the card from the beat start; this holds it back until CARD and fades it in (LAST_T = this
  // frame's beat time, set by drawOverlay, which runs before the card in the same frame; during the cold open the
  // engine draws no card at all, so the replayed overlays never bring it in)
  chapterUntil() {
    const vis = L.ease.outCubic(L.prog(LAST_T, CARD, 0.5));
    if (vis >= 1) return null;
    return LAST_T - 0.4 * Math.cbrt(1 - vis);
  },
  captions: true,
  layer: 1,
  cues(d) {
    return [
      { t: BRACKET, name: 'tick', gain: 0.24, pitch: 1.1 },
      { t: BRACKET + 0.55, name: 'blip', gain: 0.22, pitch: 0.9 },
      { t: RISE[0], name: 'creak', gain: 0.3, pitch: 0.6 },
      { t: RISE[0] + 0.05, name: 'swell', gain: 0.28, pitch: 0.8 },
      { t: RISE[0] + RISE[1] - 0.2, name: 'ping', gain: 0.2, pitch: 1.3 },
    ];
  },

  drawWorld(ctx, v) {
    if (v.t < 0) return;
    const sunk = sunkAt(v.gt, v.tl);
    if (sunk >= HEIGHT - 0.5) return;
    const p = pitchAt(v.gt, v.tl);
    ctx.save();
    ctx.globalAlpha *= 1 - L.prog(v.gt - sOf(v.tl, 5), sOf(v.tl, 6) - sOf(v.tl, 5) - SINK_LEAD + 0.2, SINK_DUR - 0.2);
    drawTower(ctx, v, sunk, p);
    ctx.restore();
    drawGrit(ctx, v, v.t - RISE[0], v.cam.mpp, BZ * Math.sin(p));
  },

  drawOverlay(ctx, v) {
    LAST_T = v.t;
    const p = pitchAt(v.gt, v.tl), co = Math.cos(p), s = Math.sin(p);
    const out = outK(v);
    if (out <= 0) return;
    ctx.save();
    ctx.globalAlpha *= out;
    const yaw = yawAt(v.gt, v.tl);
    // 800 m bracket on the cube's right silhouette edge (between the cube and the tower), labelled on its right like
    // the tower's 828 m tag (a label left of the cube would sit on the frame edge)
    const bk = L.enter(v.t, BRACKET, 0.7);
    if (bk > 0) {
      const zr = (SIDE / 2) * (Math.sin(yaw) - Math.cos(yaw));   // back-right edge depth (the right silhouette)
      const x = v.wx(halfWidth(yaw)) + 18;
      const ya = v.wy(zr * s - SIDE * co), yb = v.wy(zr * s);
      L.dimension(ctx, x, ya, yb, bk, v.accent, '', 'right');
      heightTag(ctx, '800 m', null, x + 14, (ya + yb) / 2, 'left', L.rgba(v.accent), L.clamp(bk * 2 - 1));
    }
    // comparison line at the cube's highest point (its back-left top corner, in the tower's plane), run across to
    // the spire once the tower has risen: the spire clears it by 28 m
    const lk = L.enter(v.t, RISE[0] + RISE[1] - 0.25, 0.6);
    const sunk = sunkAt(v.gt, v.tl);
    const xs = v.wx(BX);
    if (lk > 0) {
      const y = v.wy(BZ * s - SIDE * co);
      const xa = v.wx(halfWidth(yaw)) + 30, xb = L.lerp(xa, xs - 6, lk);
      ctx.save();
      ctx.setLineDash([8, 7]);
      ctx.strokeStyle = 'rgba(255,214,200,0.8)';
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(xa, y); ctx.lineTo(xb, y); ctx.stroke();
      ctx.restore();
    }
    // tower tag beside the spire tip (same style as the cube's tag, on the right of its tick)
    const tk = L.enter(v.t, RISE[0] + RISE[1] - 0.15, 0.5);
    if (tk > 0) {
      const ty = v.wy(BZ * s - (HEIGHT - sunk) * co);
      ctx.save();
      ctx.strokeStyle = 'rgba(235,230,240,0.6)';
      ctx.lineWidth = 2;
      ctx.globalAlpha *= tk;
      ctx.beginPath(); ctx.moveTo(xs + 8, ty); ctx.lineTo(xs + 8 + 18 * tk, ty); ctx.stroke();
      ctx.restore();
      heightTag(ctx, '828 m', 'BURJ KHALIFA', xs + 34, ty + (1 - tk) * 10, 'left', 'rgba(240,236,244,0.98)', tk);
    }
    // the big number, then its small line: the height first; the comparison once the tower stands beside it
    const k = L.enter(v.t, 0.4, 0.5);
    L.bigLabel(ctx, { x: 120, y: 600, big: '≈ 800 m', k, accent: v.accent });
    if (k > 0) {
      const a1 = 1 - L.ease.inOutCubic(L.prog(v.t, SWAP, 0.3)), a2 = L.ease.inOutCubic(L.prog(v.t, SWAP + 0.38, 0.4));
      if (a1 > 0) smallLine(ctx, '2,620 FT TALL', 120, 600, k, 'left', a1, -8 * (1 - a1));
      if (a2 > 0) smallLine(ctx, 'SHORTER THAN THE BURJ KHALIFA', 120, 600, k, 'left', a2, 8 * (1 - a2));
    }
    ctx.restore();
  },
};

/** A height tag: value (34 px bold) + optional small caption under it, vertically centred on y. */
function heightTag(ctx, value, caption, x, y, align, color, a) {
  if (a <= 0) return;
  ctx.save();
  ctx.globalAlpha *= a;
  ctx.shadowColor = 'rgba(0,0,0,0.65)';
  ctx.shadowBlur = 8;
  ctx.textBaseline = 'middle';
  ctx.font = L.font(34, 700, L.FONT.body);
  ctx.fillStyle = color;
  L.trackedText(ctx, value, x, caption ? y - 4 : y, 1, align);
  if (caption) {
    ctx.font = L.font(20, 600, L.FONT.body);
    ctx.fillStyle = 'rgba(200,198,212,0.95)';
    L.trackedText(ctx, caption, x, y + 26, 3, align);
  }
  ctx.restore();
}
