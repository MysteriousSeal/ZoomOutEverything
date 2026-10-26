// Beat 1 — the sunlight zone. Sparse fish schools (deterministic flocking, shimmering flanks)
// thinning with depth, and the focal point: a dashed 200 m line that draws itself across the water.
import * as L from '../../../../engine/runtime/lib.js';

const { W } = L;
const LINE_Y = 200;
const LINE_X0 = 200;          // screen x where the line starts (clear of the depth gauge and its tick labels)

// ------------------------------------------------------------------ fish schools (world metres)
// n thins with depth; len = fish length (m); sx/sy = school half-extent; v = cruise speed (m/s)
const SCHOOLS = [
  { x: -55, y: 16, n: 150, len: 0.32, sx: 16, sy: 4.5, v: 2.2, dir: 1, seed: 1 },
  { x: 62, y: 30, n: 120, len: 0.3, sx: 13, sy: 4, v: 1.8, dir: -1, seed: 2 },
  { x: -20, y: 50, n: 95, len: 0.36, sx: 12, sy: 4, v: 2.0, dir: 1, seed: 3 },
  { x: 78, y: 74, n: 60, len: 0.4, sx: 10, sy: 3.4, v: 1.6, dir: -1, seed: 4 },
  { x: -80, y: 98, n: 38, len: 0.42, sx: 8, sy: 3, v: 1.5, dir: 1, seed: 5 },
  { x: 30, y: 126, n: 20, len: 0.45, sx: 7, sy: 2.6, v: 1.3, dir: -1, seed: 6 },
  { x: -40, y: 152, n: 9, len: 0.5, sx: 6, sy: 2.2, v: 1.1, dir: 1, seed: 7 },
];
// a few larger loners (tuna-sized) for scale and parallax of interest
const LONERS = [
  { x: -70, y: 40, len: 1.9, v: 3.0, dir: -1, seed: 21 },
  { x: -95, y: 64, len: 1.6, v: 2.6, dir: 1, seed: 22 },
  { x: 95, y: 112, len: 2.2, v: 2.2, dir: -1, seed: 23 },
];
const FISH = SCHOOLS.map((s) => {
  const r = L.rng(100 + s.seed);
  return Array.from({ length: s.n }, () => {
    // denser core: average of two uniforms
    const u = ((r() + r()) - 1), w = ((r() + r()) - 1);
    return { u, w, sz: 0.75 + r() * 0.5, ph: r() * 100, fl: r() };
  });
});

function schoolCentre(s, gt) {
  const x = s.x + s.dir * s.v * gt + 4 * L.noise1(gt * 0.18, s.seed);
  const y = s.y + 1.6 * L.noise1(gt * 0.22, s.seed + 10);
  return [x, y];
}

/** One fish silhouette, nose at +x, centred; lp = length in px, tail = tail swing. */
function fishPath(ctx, lp, tail, dorsal) {
  const h = lp * 0.26;
  ctx.beginPath();
  ctx.moveTo(lp * 0.5, 0);
  ctx.quadraticCurveTo(lp * 0.25, -h, -lp * 0.18, -h * 0.55);
  if (dorsal) { ctx.lineTo(-lp * 0.02, -h * 1.5); ctx.lineTo(-lp * 0.12, -h * 0.6); }
  ctx.quadraticCurveTo(-lp * 0.32, -h * 0.25, -lp * 0.36, 0);
  ctx.lineTo(-lp * 0.52, -h * 0.95 + tail);
  ctx.lineTo(-lp * 0.46, tail * 0.5);
  ctx.lineTo(-lp * 0.52, h * 0.95 + tail);
  ctx.lineTo(-lp * 0.36, 0);
  ctx.quadraticCurveTo(-lp * 0.32, h * 0.35, -lp * 0.18, h * 0.55);
  ctx.quadraticCurveTo(lp * 0.25, h * 0.95, lp * 0.5, 0);
  ctx.closePath();
}

function drawFish(ctx, x, y, ang, flip, lp, tail, body, flash, dorsal = false) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(ang);
  if (flip < 0) ctx.scale(-1, 1);
  fishPath(ctx, lp, tail, dorsal);
  ctx.fillStyle = body;
  ctx.fill();
  if (flash > 0.02) {
    ctx.fillStyle = `rgba(225,245,255,${flash})`;
    ctx.fill();
  }
  ctx.restore();
}

function drawSchools(ctx, v, vis) {
  const x0 = v.cam.x - (W / 2 + 60) * v.cam.mpp, x1 = v.cam.x + (W / 2 + 60) * v.cam.mpp;
  SCHOOLS.forEach((s, si) => {
    const [cx, cy] = schoolCentre(s, v.gt);
    if (cx + s.sx < x0 || cx - s.sx > x1 || !v.visibleY(cy - s.sy * 2, cy + s.sy * 2, 40)) return;
    const [nx, ny] = schoolCentre(s, v.gt + 0.25);
    const slope = Math.atan2(ny - cy, Math.abs(nx - cx) + 1e-6) * s.dir;
    const light = Math.exp(-s.y / 95);
    let depthTint = L.mix([10, 34, 58], [4, 14, 30], L.clamp(s.y / 160));
    // shallow schools sit in brighter water: lighter bodies so they read as fish, not specks
    if (s.y < 60) depthTint = L.mix(depthTint, [30, 70, 100], 0.45 * (1 - s.y / 60) + 0.25);
    const body = L.rgba(depthTint, 0.85 * vis);
    // the school breathes: bends, stretches and ripples as one
    const bend = 0.9 * L.noise1(v.gt * 0.35, s.seed + 20);
    const stretch = 1 + 0.18 * L.noise1(v.gt * 0.3, s.seed + 30);
    FISH[si].forEach((f, i) => {
      const un = f.u * stretch, wn = f.w;
      let fx = un * s.sx * 1.45 + 0.6 * L.noise1(v.gt * 0.5 + f.ph, 3);
      let fy = wn * s.sy * 1.35 + bend * un * un * s.sy + 0.4 * L.noise1(v.gt * 0.6 + f.ph, 4)
        + 0.5 * Math.sin(un * 3 - v.gt * 1.6);
      fx *= s.dir;
      const wx = cx + fx, wy = cy + fy;
      const sx = v.wx(wx), sy = v.wy(wy);
      if (sx < -20 || sx > W + 20) return;
      const lp = Math.max(v.ws(s.len * f.sz), 7.5 * f.sz);
      // a turning wave rolls through the school; fish flash silver as their flank catches the light
      const wave = Math.sin(v.gt * 2.4 - un * 3.2 + f.fl * 0.8);
      const flash = Math.min(0.95, Math.pow(Math.max(0, wave), 10) * (0.35 + light) * vis * (si < 3 ? 1.6 : 1));
      const ang = slope + 0.18 * L.noise1(v.gt * 1.4 + f.ph, 5) + 0.5 * Math.cos(v.gt * 1.6 - un * 3) * 0.25;
      const tail = Math.sin(v.gt * 14 + f.ph) * lp * 0.1;
      drawFish(ctx, sx, sy, ang, s.dir, lp, tail, body, flash);
    });
  });
  LONERS.forEach((f) => {
    const x = f.x + f.dir * f.v * v.gt + 2 * L.noise1(v.gt * 0.2, f.seed);
    const y = f.y + 0.8 * L.noise1(v.gt * 0.25, f.seed + 1);
    const sx = v.wx(x), sy = v.wy(y);
    if (sx < -60 || sx > W + 60 || !v.visibleY(y - 3, y + 3, 40)) return;
    // loners settle in after the camera arrives, so they never streak across the descent
    const la = L.prog(v.t, 1.2, 0.5);
    if (la <= 0) return;
    const lp = Math.max(v.ws(f.len), 14);
    const tint = L.mix([8, 30, 54], [4, 14, 30], L.clamp(f.y / 160));
    const flash = Math.pow(Math.max(0, Math.sin(v.gt * 1.3 + f.seed)), 10) * 0.35 * Math.exp(-f.y / 95) * vis;
    drawFish(ctx, sx, sy, 0.06 * L.noise1(v.gt * 0.5, f.seed + 2), f.dir, lp, Math.sin(v.gt * 7 + f.seed) * lp * 0.08,
      L.rgba(tint, 0.9 * vis * la), flash * la, true);
  });
}

// ------------------------------------------------------------------ the 200 m line
function lineState(v) {
  // draws in during beat 1, lingers faintly through beat 2, gone before the Burj pull-out
  const draw = L.ease.inOutCubic(L.prog(v.t, 1.0, 1.05));
  const fadeTo = 1 - 0.6 * L.ease.inOutCubic(L.prog(v.t, v.d, 0.6));
  const gone = 1 - L.prog(v.gt, v.tl.scenes[4].start - 0.6   /* 03b: the Burj is beat 4 */, 0.5);
  return { draw, a: fadeTo * Math.max(0, gone) };
}

function drawLine(ctx, v) {
  const { draw, a } = lineState(v);
  if (draw <= 0 || a <= 0 || !v.visibleY(LINE_Y, LINE_Y, 40)) return;
  const y = v.wy(LINE_Y);
  const xEnd = L.lerp(LINE_X0, W + 10, draw);
  const acc = v.accent;
  ctx.save();
  // soft glow band
  ctx.globalCompositeOperation = 'lighter';
  const g = ctx.createLinearGradient(0, y - 26, 0, y + 26);
  g.addColorStop(0, L.rgba(acc, 0));
  g.addColorStop(0.5, L.rgba(acc, 0.16 * a));
  g.addColorStop(1, L.rgba(acc, 0));
  ctx.fillStyle = g;
  ctx.fillRect(LINE_X0, y - 26, xEnd - LINE_X0, 52);
  ctx.globalCompositeOperation = 'source-over';
  // dashes march slowly to the right
  ctx.beginPath();
  ctx.rect(LINE_X0 - 10, y - 20, xEnd - LINE_X0 + 10, 40);
  ctx.clip();
  ctx.setLineDash([24, 13]);
  ctx.lineDashOffset = -v.gt * 18;
  ctx.strokeStyle = L.rgba(acc, 0.95 * a);
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(LINE_X0, y);
  ctx.lineTo(W + 20, y);
  ctx.stroke();
  ctx.restore();
  // start node + travelling head
  ctx.save();
  ctx.fillStyle = L.rgba(acc, a);
  ctx.beginPath(); ctx.arc(LINE_X0, y, 7, 0, Math.PI * 2); ctx.fill();
  if (draw < 1) {
    L.lightBlob(ctx, xEnd, y, 70, acc, 0.55 * a);
    ctx.fillStyle = `rgba(230,255,255,${a})`;
    ctx.beginPath(); ctx.arc(xEnd, y, 4, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();
}

// ------------------------------------------------------------------ scene
export default {
  beat: 2,
  chapter: { num: '01', title: 'Sunlight zone', sub: 'Where almost all ocean life lives' },
  captions: true,
  layer: 1,
  cues(d) {
    return [
      { t: 0.35, name: 'shimmer', gain: 0.2, pitch: 1.0 },
      { t: 1.0, name: 'swish', gain: 0.3, pitch: 0.9 },
      { t: 1.42, name: 'ping', gain: 0.3, pitch: 1.0 },
      { t: 2.05, name: 'tick', gain: 0.22, pitch: 1.3 },
    ];
  },

  drawWorld(ctx, v) {
    // fish fade away on big pull-outs (they'd be sub-pixel noise)
    const vis = L.clamp((0.75 - v.cam.mpp) / 0.4);
    if (vis > 0 && v.visibleY(0, 170, 100)) drawSchools(ctx, v, vis);
    drawLine(ctx, v);
  },

  drawOverlay(ctx, v) {
    const y = Math.min(v.wy(LINE_Y), 1240) - 92;
    const k = L.prog(v.t, 1.35, 0.7) * v.k;
    bigLabel(ctx, v, y, k);
  },
};

function bigLabel(ctx, v, y, k) {
  if (k <= 0) return;
  L.bigLabel(ctx, { x: LINE_X0 + 20, y, big: '200 m', small: '656 ft · 1% of sunlight left', k, accent: v.accent });
}
