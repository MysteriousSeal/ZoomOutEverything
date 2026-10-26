// Beat 5 — the cube is ~800 m tall; the Burj Khalifa (828 m) rises out of the ground beside it.
// World: side view, ground at y = 0, Burj centred on x = BX in the Z = 0 plane (same pitch as the cube,
// so its height is foreshortened by cos(p) like the cube's). It sinks away at the start of beat 6,
// before the canyon opens under it.
import * as L from '../../../../engine/runtime/lib.js';
import { pitchAt, yawAt, halfWidth, SIDE } from './s04-cube.js';

const BX = 900;
const BZ = 400;                    // the cube's front plane: both stand on the same ground line (the view is at eye level by then)
const HEIGHT = 828;
const RISE = [2.0, 1.3];           // beat 5: rises just before "Shorter than the Burj Khalifa" (2.6 s)
const SINK = [0.0, 0.55];          // beat 6
const BRACKET = 0.35;
const SWAP = 3.1;                  // small line swaps to the comparison once the tower has risen              // the 800 m bracket draws in on "eight hundred meters"
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
  const t5 = gt - sOf(tl, 5), t6 = gt - sOf(tl, 6);
  const up = L.ease.outCubic(L.prog(t5, RISE[0], RISE[1]));
  const down = L.ease.inCubic(L.prog(t6, SINK[0], SINK[1]));
  return HEIGHT * (1 - up + up * down);
}

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
  chapter: { num: '05', title: 'Burj Khalifa', sub: 'Dubai · the tallest building on Earth' },
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
    const t6 = v.gt - sOf(v.tl, 6);
    ctx.save();
    ctx.globalAlpha *= 1 - L.prog(t6, 0.25, 0.3);
    drawTower(ctx, v, sunk, p);
    ctx.restore();
    drawGrit(ctx, v, v.t - RISE[0], v.cam.mpp, BZ * Math.sin(p));
  },

  drawOverlay(ctx, v) {
    const p = pitchAt(v.gt, v.tl), co = Math.cos(p), s = Math.sin(p);
    // 800 m bracket on the cube's left side
    const bk = L.enter(v.t, BRACKET, 0.7) * v.k;
    const yaw = yawAt(v.gt, v.tl), zl = (SIDE / 2) * (Math.cos(yaw) - Math.sin(yaw));   // front-left edge depth
    if (bk > 0) {
      const x = v.wx(-halfWidth(yaw)) - 26;
      L.dimension(ctx, x, v.wy(zl * s - SIDE * co), v.wy(zl * s), bk, v.accent, '', 'left');
    }
    // comparison line at the cube's height, run across to the tower once it has risen
    const lk = L.enter(v.t, RISE[0] + RISE[1] - 0.25, 0.6) * v.k;
    if (lk > 0) {
      const zr = (SIDE / 2) * (Math.sin(yaw) - Math.cos(yaw));   // the cube's right top corner
      const y = v.wy(zr * s - SIDE * co);
      const xa = v.wx(halfWidth(yaw)) + 6, xb = L.lerp(xa, v.wx(BX + 110), lk);
      ctx.save();
      ctx.setLineDash([8, 7]);
      ctx.strokeStyle = 'rgba(255,214,200,0.8)';
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(xa, y); ctx.lineTo(xb, y); ctx.stroke();
      ctx.setLineDash([]);
      // the cube's height, on the line, so the spire's lead over it reads
      ctx.globalAlpha *= L.clamp(lk * 1.5 - 0.3);
      ctx.textBaseline = 'top';
      ctx.shadowColor = 'rgba(0,0,0,0.6)';
      ctx.shadowBlur = 6;
      ctx.font = L.font(24, 700, L.FONT.body);
      ctx.fillStyle = L.rgba(v.accent, 0.95);
      L.trackedText(ctx, '800 m', xa + 12, y + 12, 2);
      ctx.restore();
    }
    // tower tag beside the spire
    const tk = L.enter(v.t, RISE[0] + RISE[1] - 0.15, 0.5) * v.k;
    if (tk > 0) {
      const sunk = sunkAt(v.gt, v.tl);
      const tx = v.wx(BX) + 34, ty = v.wy(BZ * s - (HEIGHT - sunk) * co);
      ctx.save();
      ctx.globalAlpha *= tk;
      ctx.strokeStyle = 'rgba(235,230,240,0.6)';
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(tx - 26, ty); ctx.lineTo(tx - 26 + 20 * tk, ty); ctx.stroke();
      ctx.textBaseline = 'middle';
      ctx.shadowColor = 'rgba(0,0,0,0.6)';
      ctx.shadowBlur = 8;
      ctx.font = L.font(40, 800, L.FONT.display);
      ctx.fillStyle = 'rgba(240,236,244,0.98)';
      L.trackedText(ctx, '828 m', tx, ty - 4 + (1 - tk) * 10, 0);
      ctx.font = L.font(20, 600, L.FONT.body);
      ctx.fillStyle = 'rgba(200,198,212,0.95)';
      L.trackedText(ctx, 'BURJ KHALIFA', tx, ty + 28 + (1 - tk) * 10, 3);
      ctx.restore();
    }
    const k = L.enter(v.t, 0.4, 0.5) * v.k;
    L.bigLabel(ctx, { x: 120, y: 600, big: '≈ 800 m', k, accent: v.accent });
    // small line: the height first; the comparison only once the tower stands beside it
    if (k > 0) {
      const e = L.ease.outCubic(L.clamp(k));
      const sw = L.ease.inOutCubic(L.prog(v.t, SWAP, 0.4));
      ctx.save();
      ctx.globalAlpha *= L.clamp(k * 1.4);
      ctx.textBaseline = 'alphabetic';
      ctx.shadowColor = 'rgba(0,0,0,0.55)';
      ctx.shadowBlur = 8;
      ctx.font = L.font(30, 600, L.FONT.body);
      const y = 600 + 52 + (1 - e) * 18;
      for (const [str, a, dy] of [['2,620 FT TALL', 1 - sw, -10 * sw], ['SHORTER THAN THE BURJ', sw, 10 * (1 - sw)]]) {
        if (a <= 0) continue;
        ctx.fillStyle = L.rgba([205, 215, 230], 0.95 * a);
        L.trackedText(ctx, str, 120, y + dy, 3);
      }
      ctx.restore();
    }
  },
};
