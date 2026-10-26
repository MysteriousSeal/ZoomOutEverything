// Beat 3 — sink the Burj Khalifa (828 m, true scale) beside the diver until it vanishes.
// World space in metres. Base centre x = +145; the base goes from 528 m (top 300 m in the air)
// to 900 m deep. The spire tip slips under the surface at t ≈ 1.95 s ("…it vanishes"), leaving
// a ring of surface turbulence and a trail of escaping air. It stays sunk for the rest of the film.
import * as L from '../../../../engine/runtime/lib.js';

const CX = 145;                 // base centre x (≈ +110 in the brief; nudged right so the 828 m label clears the spire)
const HEIGHT = 828;
const BASE0 = 528, BASE1 = 900; // base depth at start / end
const SINK = [0.2, 2.75];       // start, duration (beat-relative); spire tip goes under at T_SUB ≈ 1.95 s
const ACCENT = [70, 205, 215];
const RIM = [120, 200, 225];
const DIVER = { x: -0.35, y: 332 };

// half-width steps (h from base → half-width, m): the spiralling Y-plan setbacks seen in elevation.
// The wings step back alternately (3 m / 6 m) at different heights on each side, so the profile is
// asymmetric like the real tower; the broad lower wings run to h ≈ 30 m, and above ~585 m only the
// slender spire remains (the top third reads as a needle).
const RIGHT = [[0, 55], [30, 49], [95, 46], [160, 40], [222, 37], [288, 31], [345, 28], [405, 22], [455, 19], [505, 13], [548, 10], [572, 7.5]];
const LEFT = [[0, 55], [30, 52], [68, 46], [128, 43], [192, 37], [252, 34], [318, 28], [375, 25], [432, 19], [482, 16], [528, 10], [560, 8]];
const SPIRE0 = 585;
const CROWN = [[SPIRE0, 6], [630, 4.6], [690, 3.3], [750, 2], [800, 1], [HEIGHT, 0.35]];

const sinkK = (t) => L.ease.inOutCubic(L.prog(t, SINK[0], SINK[1]));
const baseAt = (t) => L.lerp(BASE0, BASE1, sinkK(t));
// time the spire tip crosses y = 0
const T_SUB = (() => { let lo = 0, hi = 4; for (let i = 0; i < 40; i++) { const m = (lo + hi) / 2; baseAt(m) - HEIGHT < 0 ? (lo = m) : (hi = m); } return (lo + hi) / 2; })();

function hwAt(edge, h) {
  let w = edge[0][1];
  for (const [hh, ww] of edge) if (h >= hh) w = ww;
  if (h >= SPIRE0) {   // above the last setback the spire tapers smoothly
    for (let i = 1; i < CROWN.length; i++) {
      if (h <= CROWN[i][0]) return Math.min(w, L.lerp(CROWN[i - 1][1], CROWN[i][1], L.invLerp(CROWN[i - 1][0], CROWN[i][0], h)));
    }
    return 0;
  }
  return w;
}

/** Outline in local coords (x from centre, y = -h, up negative) as a polygon. */
const OUTLINE = (() => {
  const pts = [];
  const side = (edge, sign) => {
    const out = [];
    for (let i = 0; i < edge.length; i++) {
      const [h, w] = edge[i];
      const hn = i + 1 < edge.length ? edge[i + 1][0] : SPIRE0;
      out.push([sign * w, -h], [sign * w, -(hn - 1.5)]);
    }
    for (const [h, w] of CROWN) out.push([sign * w, -h]);
    return out;
  };
  const r = side(RIGHT, 1), l = side(LEFT, -1);
  pts.push(...l);                 // up the left side
  pts.push(...r.reverse());       // down the right side
  return pts;
})();

function path(c, ox, oy) {
  c.beginPath();
  OUTLINE.forEach(([x, y], i) => (i ? c.lineTo(ox + x, oy + y) : c.moveTo(ox + x, oy + y)));
  c.closePath();
}

const BUB = (() => { const r = L.rng(3301); return Array.from({ length: 170 }, () => [r(), r(), r(), r(), r()]); })();
const TIP = (() => { const r = L.rng(3302); return Array.from({ length: 70 }, () => [r(), r(), r(), r()]); })();
const FOAM = (() => { const r = L.rng(3303); return Array.from({ length: 40 }, () => [r(), r(), r(), r()]); })();

function drawTower(c, v, base) {
  const mpp = v.cam.mpp;
  const px = (n) => n * mpp;   // n screen pixels in metres
  // depth-lit fill: sunlit steel above water, dark below
  const g = c.createLinearGradient(0, base - HEIGHT, 0, base);
  const stop = (y) => L.clamp((y - (base - HEIGHT)) / HEIGHT);
  const col = (d) => (d < 0 ? [150, 172, 192] : L.mix([18, 42, 62], [72, 112, 140], Math.exp(-d / 90)));
  for (let i = 0; i <= 12; i++) {
    const y = base - HEIGHT + (HEIGHT * i) / 12;
    g.addColorStop(stop(y), L.rgba(col(y)));
  }
  if (base - HEIGHT < 0 && base > 0) {   // crisp change at the waterline
    g.addColorStop(L.clamp(stop(0) - 0.001), L.rgba(col(-1)));
    g.addColorStop(L.clamp(stop(0) + 0.001), L.rgba(col(1)));
  }
  path(c, CX, base);
  c.fillStyle = g;
  c.fill();

  c.save();
  path(c, CX, base);
  c.clip();
  // form shading: right face in shadow, central core slightly brighter
  const sg = c.createLinearGradient(CX - 55, 0, CX + 55, 0);
  sg.addColorStop(0, 'rgba(255,255,255,0.10)');
  sg.addColorStop(0.42, 'rgba(255,255,255,0.0)');
  sg.addColorStop(0.5, 'rgba(255,255,255,0.07)');
  sg.addColorStop(0.58, 'rgba(0,0,0,0.12)');
  sg.addColorStop(1, 'rgba(0,0,0,0.38)');
  c.fillStyle = sg;
  c.fillRect(CX - 60, base - HEIGHT, 120, HEIGHT);
  // vertical fins on the wing faces
  if (mpp < 1.2) {
    c.strokeStyle = 'rgba(0,10,20,0.16)';
    c.lineWidth = px(1.2);
    for (const fx of [-32, -18, -6, 6, 18, 32]) {
      c.beginPath(); c.moveTo(CX + fx, base); c.lineTo(CX + fx * 0.2, base - SPIRE0); c.stroke();
    }
  }
  // window bands: warm lights above water, a fading teal glow below
  const bandGap = 14;
  if (bandGap / mpp > 7) {
    c.lineWidth = px(1.4);
    for (let h = 18; h < SPIRE0; h += bandGap) {
      const y = base - h;
      if (!v.visibleY(y, y, 20)) continue;
      const under = y > 0;
      const a = under ? 0.16 * Math.exp(-y / 220) + 0.03 : 0.3;
      c.strokeStyle = under ? L.rgba([140, 215, 235], a) : L.rgba([255, 230, 190], a);
      c.beginPath(); c.moveTo(CX - 60, y); c.lineTo(CX + 60, y); c.stroke();
    }
  }
  c.restore();

  // rim light on the lit (left) edge + thin outline for definition at any zoom
  c.save();
  path(c, CX, base);
  c.strokeStyle = L.rgba(RIM, 0.28);
  c.lineWidth = px(1.2);
  c.stroke();
  c.beginPath();
  const l = OUTLINE.slice(0, Math.floor(OUTLINE.length / 2));
  l.forEach(([x, y], i) => (i ? c.lineTo(CX + x, base + y) : c.moveTo(CX + x, base + y)));
  c.strokeStyle = L.rgba(RIM, 0.55);
  c.lineWidth = px(2);
  c.stroke();
  c.restore();
}

function drawBeacon(c, v, base) {
  const tipY = base - HEIGHT + 1;
  const blink = Math.pow(Math.max(0, Math.sin(v.gt * Math.PI * 1.1)), 6);
  const under = tipY > 0 ? Math.exp(-tipY / 400) * 0.7 : 1;
  const x = v.wx(CX), y = v.wy(tipY);
  L.lightBlob(c, x, y, 26, [255, 80, 60], 0.75 * blink * under);
  L.lightBlob(c, x, y, 6, [255, 200, 190], 0.9 * blink * under);
}

function drawSurface(c, v, base) {
  // piercing foam collar while the tower is through the surface; then the closing splash
  const t = v.t;
  const top = base - HEIGHT;
  const sy = v.wy(0);
  if (sy < -80 || sy > L.H + 80) return;
  const mpp = v.cam.mpp;
  c.save();
  if (top < 0 && base > 0) {
    const hw = Math.max(hwAt(LEFT, base), hwAt(RIGHT, base)) + 4;
    const sp = L.clamp((baseAt(t + 0.05) - baseAt(t - 0.05)) / 18);   // sink speed → foam
    const x0 = v.wx(CX - hw), x1 = v.wx(CX + hw);
    const fg = c.createLinearGradient(0, sy - 10, 0, sy + 18);
    fg.addColorStop(0, 'rgba(240,252,255,0)');
    fg.addColorStop(0.4, `rgba(240,252,255,${0.55 + 0.35 * sp})`);
    fg.addColorStop(1, 'rgba(240,252,255,0)');
    c.fillStyle = fg;
    c.beginPath();
    c.ellipse((x0 + x1) / 2, sy + 3, Math.max(0, (x1 - x0) / 2 + 10 + 22 * sp), 9 + 6 * sp, 0, 0, Math.PI * 2);
    c.fill();
    // wake rings pushed out by the sinking mass
    for (let i = 0; i < 4; i++) {
      const ph = ((t * 0.9 + i / 4) % 1 + 1) % 1;
      const r = hw / mpp + 10 + ph * 140;
      c.strokeStyle = `rgba(230,248,255,${0.35 * (1 - ph) * (0.4 + sp)})`;
      c.lineWidth = 2;
      c.beginPath();
      c.ellipse((x0 + x1) / 2, sy + 2, Math.max(0, r), Math.max(0, r * 0.08), 0, 0, Math.PI * 2);
      c.stroke();
    }
  }
  // closing splash once the spire slips under
  const a = t - T_SUB;
  if (a > 0 && a < 3.5) {
    const x = v.wx(CX);
    for (let i = 0; i < 3; i++) {
      const aa = a - i * 0.22;
      if (aa <= 0) continue;
      const r = 8 + L.ease.outCubic(L.clamp(aa / 2.2)) * (170 - i * 30);
      c.strokeStyle = `rgba(235,250,255,${0.6 * (1 - L.clamp(aa / 2.2))})`;
      c.lineWidth = 2.5 - i * 0.5;
      c.beginPath();
      c.ellipse(x, sy + 2, Math.max(0, r), Math.max(0, r * 0.09), 0, 0, Math.PI * 2);
      c.stroke();
    }
    // churned whitewater
    for (const [r1, r2, r3, r4] of FOAM) {
      const life = 1.4 + r3 * 1.4;
      if (a > life) continue;
      const k = a / life;
      const fx = x + (r1 - 0.5) * 70 * (0.4 + k * 1.6);
      const fy = sy + 4 + r2 * 26 * (0.3 + k) - Math.sin(Math.PI * Math.min(1, a / 0.5)) * r4 * 18;
      c.fillStyle = `rgba(235,250,255,${0.6 * (1 - k)})`;
      c.beginPath();
      c.arc(fx, fy, Math.max(0, 1.5 + r4 * 4 * (1 - k)), 0, Math.PI * 2);
      c.fill();
    }
  }
  c.restore();
}

function drawBubbles(c, v) {
  const t = v.t;
  if (t < 0 || t > 9) return;
  c.save();
  const draw = (x, y, r, a) => {
    if (a <= 0.01) return;
    const sx = v.wx(x), sy = v.wy(y);
    if (sy < -20 || sy > L.H + 20) return;
    c.strokeStyle = `rgba(215,240,250,${0.7 * a})`;
    c.fillStyle = `rgba(190,230,245,${0.15 * a})`;
    c.lineWidth = 1.2;
    c.beginPath(); c.arc(sx, sy, Math.max(0, r), 0, Math.PI * 2); c.fill(); c.stroke();
  };
  // air escaping from the flooded floors as they go under
  for (const [r1, r2, r3, r4, r5] of BUB) {
    const h = 120 + r1 * 640;                 // height on the tower
    // time this height crossed the surface: base(te) = h
    const tc = h < BASE0 ? -1 : crossTime(h);
    if (tc < 0) continue;
    const te = tc + 0.05 + r2 * 1.6;
    const a = t - te;
    if (a <= 0 || a > 2.8) continue;
    const side = (r3 - 0.5) * 2;
    const hw = side < 0 ? hwAt(LEFT, h) : hwAt(RIGHT, h);
    const x = CX + side * hw * 0.95 + L.noise1(a * 1.7 + r4 * 10, 31) * 3;
    const y = baseAt(te) - h - 14 * a - 9 * a * a;
    if (y < 0) continue;
    draw(x, y, 1.5 + r5 * 3.2, L.clamp(a / 0.2) * L.clamp((2.8 - a) / 0.8));
  }
  // the spire's last breath: a column rising from the tip
  for (const [r1, r2, r3, r4] of TIP) {
    const te = T_SUB - 0.15 + r1 * 1.9;
    const a = t - te;
    if (a <= 0 || a > 3) continue;
    const x = CX + L.clamp((r2 - 0.5) * 2.4 + L.noise1(a * 2 + r3 * 7, 32) * 0.9 * (1 + a), -2.8, 2.8);   // tight column, clear of the label
    const y = baseAt(te) - HEIGHT - 16 * a - 10 * a * a;
    if (y < 0) continue;
    draw(x, y, 1.5 + r4 * 3.5, L.clamp(a / 0.15) * L.clamp((3 - a) / 0.9));
  }
  c.restore();
}

function crossTime(h) {
  // when base == h (monotone), by bisection over the sink window
  let lo = SINK[0], hi = SINK[0] + SINK[1];
  if (baseAt(hi) < h) return -1;
  for (let i = 0; i < 24; i++) { const m = (lo + hi) / 2; baseAt(m) < h ? (lo = m) : (hi = m); }
  return (lo + hi) / 2;
}

export default {
  beat: 4,
  chapter: { num: '03', title: 'Burj Khalifa', sub: 'The tallest building on Earth' },
  captions: true,
  layer: 1,
  cues(d) {
    return [
      { t: 0.35, name: 'creak', gain: 0.32, pitch: 0.7 },
      { t: 0.45, name: 'swell', gain: 0.3, pitch: 0.8 },
      { t: 1.0, name: 'ping', gain: 0.18, pitch: 1.2 },
      { t: T_SUB - 0.05, name: 'splash', gain: 0.42, pitch: 0.8 },
      { t: T_SUB + 0.1, name: 'bubbles', gain: 0.35, pitch: 0.8 },
      { t: T_SUB + 0.15, name: 'blip', gain: 0.25, pitch: 1 },
    ];
  },

  drawWorld(ctx, v) {
    if (v.t < -0.3) return;   // off-camera until the diver close-up ends
    const base = baseAt(v.t);
    if (!v.visibleY(base - HEIGHT, base, 50)) return;
    const mpp = v.cam.mpp;
    if (HEIGHT / mpp < 2) return;
    const farFade = Math.max(0, Math.min(1, (4.5 - mpp) / 1.5));   // gone in the final column view (s6 recap marks it)
    if (farFade <= 0) return;
    ctx.save();
    ctx.globalAlpha *= farFade;
    ctx.translate(v.wx(0), v.wy(0));
    ctx.scale(1 / mpp, 1 / mpp);
    // faint caustic glow on the sunlit upper floors while near the surface
    drawTower(ctx, v, base);
    ctx.restore();
    drawBeacon(ctx, v, base);
    drawBubbles(ctx, v);
    drawSurface(ctx, v, base);
  },

  drawOverlay(ctx, v) {
    const base = baseAt(v.t);
    // marker on the diver from beat 2, for comparison
    const mk = L.enter(v.t, 0.9, 0.5) * v.k;
    if (mk > 0) {
      const x = v.wx(DIVER.x), y = v.wy(DIVER.y);
      ctx.save();
      ctx.globalAlpha = mk;
      ctx.strokeStyle = 'rgba(225,240,250,0.85)';
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(x, y, Math.max(0, 10 + 14 * (1 - mk)), 0, Math.PI * 2); ctx.stroke();
      ctx.restore();
      L.leader(ctx, x - 12, y, x - 70, y, mk, L.WHITE, 0.6);
      ctx.save();
      ctx.globalAlpha = L.clamp(mk * 1.5 - 0.5);
      ctx.font = L.font(24, 600, L.FONT.body);
      ctx.fillStyle = 'rgba(215,228,240,0.95)';
      ctx.textBaseline = 'middle';
      ctx.shadowColor = 'rgba(0,0,0,0.6)';
      ctx.shadowBlur = 8;
      L.trackedText(ctx, 'DIVER · 332 M', x - 82, y + 1, 2, 'right');
      ctx.restore();
    }
    // 828 m bracket along the drowned tower
    const dk = L.enter(v.t, T_SUB + 0.05, 0.7) * v.k;
    if (dk > 0) {
      const bx = v.wx(CX + 56);
      L.dimension(ctx, bx, v.wy(base - HEIGHT), v.wy(base), dk, ACCENT);
    }
    const k = L.enter(v.t, T_SUB - 0.35, 0.5) * v.k;   // ≥ 1.6 s fully readable before the beat ends
    L.bigLabel(ctx, { x: 130, y: 640, big: '828 m', small: '2,717 ft · fully submerged', k, accent: v.accent });
  },
};
