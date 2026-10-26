// Beat 1 — "Start with you. | A long life is about eighty years."
// On "Start with you" a man in a tailored jacket (side profile, relaxed stance, true proportions) rises in left of NOW, facing the
// past, with a cool rim light from NOW. On "a long life" an accent LIFELINE runs along the ruler from NOW back to
// 80 years ago (1946), with a measured bracket below it; bigLabel "80 YEARS / a long human life".
// Beat 2's zoom-out squeezes the whole life into NOW: the figure folds down into the NOW point, the bracket fades.
import * as L from '../../../../engine/runtime/lib.js';
import { AGE } from '../camera.js';
import { tx, rulerY, hBracket, ACCENT } from '../env.js';
import { label, tag, live, phraseAt, beatStart, GREYTXT } from './s00-hook.js';

const { W } = L;
const BRK_Y = 1160;           // bracket row below the ruler (tick labels live at 1070–1110)
const FIG_DX = -150;          // the figure stands clearly left of NOW (clear of the NOW tick and the 2026 tag)
const FIG_H = 340;            // px for 1.75 m

// ------------------------------------------------------------------ the figure (metres, x forward, y UP; drawn mirrored to face left)
// A man in a tailored jacket and trousers, true 1:7.5 adult proportions, side profile. Relaxed stance: weight on the
// far (straight) leg, the near knee eased forward. Near arm hangs with a soft elbow bend, hand relaxed. Short hair,
// ear, a hint of brow/nose/lips. Layers: far leg → far arm → near leg → jacket → neck/head → near arm.
// Shading: deep slate tones with value steps between layers; NOW's cool light rims the back edge and wraps the back.
const P = (x, y) => [x, -y];   // metres (y up) → canvas (y down)

/** closed smooth outline through pts (quadratic through midpoints) */
function smooth(c, pts) {
  const n = pts.length;
  const m = (i) => { const a = pts[i % n], b = pts[(i + 1) % n]; return [(a[0] + b[0]) / 2, -(a[1] + b[1]) / 2]; };
  const s = m(0);
  c.moveTo(s[0], s[1]);
  for (let i = 1; i <= n; i++) { const p = pts[i % n], e = m(i); c.quadraticCurveTo(p[0], -p[1], e[0], e[1]); }
  c.closePath();
}
/** a limb tube along joints J with radii R (front side = +normal), returned as an outline point list */
function tube(J, R, back = 1) {
  const L1 = [], L2 = [];
  for (let i = 0; i < J.length; i++) {
    const a = J[Math.max(0, i - 1)], b = J[Math.min(J.length - 1, i + 1)];
    let dx = b[0] - a[0], dy = b[1] - a[1];
    const d = Math.hypot(dx, dy) || 1; dx /= d; dy /= d;
    const nx = -dy, ny = dx;                    // normal (to the left of the direction)
    const [r1, r2] = Array.isArray(R[i]) ? R[i] : [R[i], R[i] * back];
    L1.push([J[i][0] + nx * r1, J[i][1] + ny * r1]);
    L2.push([J[i][0] - nx * r2, J[i][1] - ny * r2]);
  }
  return L1.concat(L2.reverse());
}
const lerp2 = (a, b, t) => [L.lerp(a[0], b[0], t), L.lerp(a[1], b[1], t)];

function pose(gt) {
  const br = Math.sin(gt * 1.9) * 0.004;        // breathing
  const sway = Math.sin(gt * 0.7) * 0.004;      // a slow, barely-there sway
  return {
    br, sway,
    far: { hip: [-0.02, 0.93], knee: [-0.012, 0.51], ankle: [-0.03, 0.095] },          // weight-bearing, straight
    near: { hip: [0.025, 0.925], knee: [0.1, 0.52], ankle: [0.075, 0.095] },          // relaxed, knee eased forward
    sh: [-0.005 + sway, 1.42 + br], el: [-0.045 + sway, 1.14 + br], wr: [0.0 + sway, 0.885 + br],
    fsh: [-0.05 + sway, 1.42 + br], fel: [-0.095 + sway, 1.15 + br], fwr: [-0.075 + sway, 0.9 + br],
    neck: [0.02 + sway, 1.5 + br], hc: [0.045 + sway, 1.64 + br],
  };
}

// colours
const C = {
  jacket: [46, 62, 78], trousers: [32, 42, 56], shoe: [16, 18, 24], sole: [70, 74, 82],
  skin: [78, 74, 78], hair: [18, 22, 28], line: 'rgba(4,8,14,0.55)', fold: 'rgba(4,8,14,0.4)', hi: 'rgba(190,225,236,0.16)',
};

/** fill the current path with a vertical body gradient, then NOW's back-light wrapping from the back edge */
function shadeFill(c, col, x0, x1, y0, y1, dim = 0) {
  const g = c.createLinearGradient(0, -y1, 0, -y0);
  g.addColorStop(0, L.rgba(L.mix(col, [150, 180, 196], 0.12 - dim * 0.1)));
  g.addColorStop(1, L.rgba(L.mix(col, [6, 10, 16], 0.25 + dim)));
  c.fillStyle = g;
  c.fill();
  c.save();
  c.clip();
  const w = c.createLinearGradient(x0, 0, x0 + (x1 - x0) * 0.45, 0);
  w.addColorStop(0, L.rgba(ACCENT, 0.16 * (1 - dim))); w.addColorStop(1, L.rgba(ACCENT, 0));
  c.fillStyle = w;
  c.fillRect(x0 - 0.05, -y1 - 0.05, x1 - x0 + 0.1, y1 - y0 + 0.1);
  c.restore();
}

function shoe(c, ankle, dim) {
  const ax = ankle[0];
  const up = [[ax - 0.07, 0.022], [ax - 0.074, 0.075], [ax - 0.035, 0.1], [ax + 0.04, 0.094], [ax + 0.11, 0.064], [ax + 0.18, 0.045], [ax + 0.205, 0.03], [ax + 0.2, 0.022]];
  c.beginPath(); smooth(c, up.concat([[ax + 0.06, 0.018]]));
  shadeFill(c, C.shoe, ax - 0.08, ax + 0.21, 0.02, 0.1, dim);
  c.strokeStyle = C.line; c.stroke();
  // sole with a slight toe spring and a heel block
  c.beginPath();
  c.moveTo(...P(ax - 0.074, 0.024)); c.lineTo(...P(ax + 0.2, 0.024));
  c.quadraticCurveTo(...P(ax + 0.215, 0.02), ...P(ax + 0.205, 0.008));
  c.lineTo(...P(ax + 0.02, 0.0)); c.lineTo(...P(ax - 0.074, 0.0)); c.closePath();
  c.fillStyle = L.rgba(L.mix(C.sole, [0, 0, 0], dim)); c.fill();
  c.fillStyle = 'rgba(0,0,0,0.35)';
  c.fillRect(ax - 0.005, -0.012, 0.004, 0.012);      // the heel's front edge
  // the vamp / lacing line
  c.strokeStyle = 'rgba(150,180,196,0.28)'; c.lineWidth = 0.005;
  c.beginPath(); c.moveTo(...P(ax + 0.0, 0.098)); c.quadraticCurveTo(...P(ax + 0.05, 0.088), ...P(ax + 0.09, 0.07)); c.stroke();
  // a soft highlight on the toe cap
  c.strokeStyle = 'rgba(200,226,236,0.22)'; c.lineWidth = 0.006;
  c.beginPath(); c.moveTo(...P(ax + 0.07, 0.08)); c.quadraticCurveTo(...P(ax + 0.15, 0.06), ...P(ax + 0.195, 0.034)); c.stroke();
}

function leg(c, lg, dim) {
  const { hip, knee, ankle } = lg;
  const J = [hip, lerp2(hip, knee, 0.5), knee, lerp2(knee, ankle, 0.5), [ankle[0] + 0.005, 0.105]];
  const pts = tube(J, [0.085, 0.072, 0.058, 0.055, 0.052]);
  c.beginPath(); smooth(c, pts);
  shadeFill(c, C.trousers, -0.12, 0.16, 0.1, 0.95, dim);
  c.lineWidth = 0.005; c.strokeStyle = C.line; c.stroke();
  // folds: behind the knee, the trouser break over the shoe, the front crease
  c.strokeStyle = C.fold; c.lineWidth = 0.006; c.lineCap = 'round';
  const kb = [knee[0] - 0.05, knee[1]];
  c.beginPath(); c.moveTo(...P(kb[0], kb[1] + 0.03)); c.quadraticCurveTo(...P(kb[0] + 0.03, kb[1]), ...P(kb[0] + 0.005, kb[1] - 0.04)); c.stroke();
  c.beginPath(); c.moveTo(...P(ankle[0] - 0.02, 0.15)); c.quadraticCurveTo(...P(ankle[0] + 0.02, 0.13), ...P(ankle[0] + 0.05, 0.14)); c.stroke();
  c.strokeStyle = C.hi; c.lineWidth = 0.004;
  c.beginPath(); c.moveTo(...P(hip[0] + 0.06, hip[1] - 0.1)); c.lineTo(...P(knee[0] + 0.04, knee[1])); c.lineTo(...P(ankle[0] + 0.04, 0.13)); c.stroke();
  shoe(c, ankle, dim);
}

function hand(c, wr, dir, dim) {
  // local frame: u along the forearm (down), w toward the front
  const [ux, uy] = dir, wx = -uy, wy = ux;
  const Q = (u, w) => [wr[0] + ux * u + wx * w, wr[1] + uy * u + wy * w];
  const palm = [Q(-0.01, -0.028), Q(0.05, -0.034), Q(0.1, -0.03), Q(0.15, -0.012), Q(0.16, 0.006), Q(0.13, 0.022), Q(0.08, 0.03), Q(0.03, 0.032), Q(-0.01, 0.026)];
  c.beginPath(); smooth(c, palm);
  shadeFill(c, C.skin, wr[0] - 0.05, wr[0] + 0.05, wr[1] - 0.17, wr[1] + 0.01, dim);
  c.strokeStyle = C.line; c.lineWidth = 0.004; c.stroke();
  // the thumb, lying along the front of the hand; knuckle lines of the curled fingers
  c.beginPath(); smooth(c, [Q(0.02, 0.02), Q(0.07, 0.04), Q(0.105, 0.036), Q(0.1, 0.022), Q(0.05, 0.016)]);
  c.fillStyle = L.rgba(L.mix(C.skin, [8, 10, 14], 0.15 + dim)); c.fill(); c.stroke();
  c.strokeStyle = C.fold; c.lineWidth = 0.004;
  for (const u of [0.11, 0.135]) { const a = Q(u, -0.02), b = Q(u + 0.012, 0.012); c.beginPath(); c.moveTo(...P(...a)); c.lineTo(...P(...b)); c.stroke(); }
}

function arm(c, sh, el, wr, dim) {
  const J = [sh, lerp2(sh, el, 0.5), el, lerp2(el, wr, 0.5), wr];
  const pts = tube(J, [0.058, 0.05, 0.046, 0.043, 0.041]);
  // the hand first (the cuff overlaps it)
  const d = [wr[0] - el[0], wr[1] - el[1]], dl = Math.hypot(...d);
  hand(c, [wr[0] + d[0] / dl * 0.02, wr[1] + d[1] / dl * 0.02], [d[0] / dl, d[1] / dl], dim);
  c.beginPath(); smooth(c, pts);
  shadeFill(c, C.jacket, sh[0] - 0.08, sh[0] + 0.08, wr[1], sh[1] + 0.06, dim);
  c.strokeStyle = C.line; c.lineWidth = 0.005; c.stroke();
  // folds at the inside of the elbow, the cuff seam
  c.strokeStyle = C.fold; c.lineWidth = 0.006; c.lineCap = 'round';
  c.beginPath(); c.moveTo(...P(el[0] + 0.03, el[1] + 0.04)); c.quadraticCurveTo(...P(el[0] + 0.01, el[1]), ...P(el[0] + 0.035, el[1] - 0.03)); c.stroke();
  const cu = lerp2(el, wr, 0.86);
  c.strokeStyle = C.hi; c.lineWidth = 0.005;
  c.beginPath(); c.moveTo(...P(cu[0] - 0.042, cu[1] - 0.004)); c.lineTo(...P(cu[0] + 0.042, cu[1] + 0.012)); c.stroke();
}

function jacket(c, q) {
  const b = q.br, s = q.sway;
  const pts = [
    [-0.045 + s, 1.53 + b], [-0.1 + s, 1.47 + b], [-0.128 + s, 1.37 + b], [-0.122 + s, 1.24 + b], [-0.105 + s, 1.12], [-0.118, 1.0],
    [-0.13, 0.86], [-0.132, 0.79], [0.0, 0.775], [0.122, 0.79], [0.128, 0.88], [0.118, 1.0], [0.124 + s, 1.12],
    [0.138 + s, 1.27 + b], [0.12 + s, 1.4 + b], [0.07 + s, 1.5 + b], [0.03 + s, 1.535 + b],
  ];
  c.beginPath(); smooth(c, pts);
  shadeFill(c, C.jacket, -0.14, 0.14, 0.77, 1.54, 0);
  c.strokeStyle = C.line; c.lineWidth = 0.005; c.stroke();
  // lapel roll + the button stance, a pocket flap, the side seam, and the hem's soft highlight
  c.strokeStyle = C.fold; c.lineWidth = 0.006; c.lineCap = 'round';
  c.beginPath(); c.moveTo(...P(0.06 + s, 1.49 + b)); c.quadraticCurveTo(...P(0.13 + s, 1.34 + b), ...P(0.122, 1.08)); c.stroke();
  c.beginPath(); c.moveTo(...P(0.02, 0.93)); c.lineTo(...P(0.115, 0.935)); c.stroke();
  c.strokeStyle = C.hi; c.lineWidth = 0.005;
  c.beginPath(); c.moveTo(...P(-0.128, 0.795)); c.quadraticCurveTo(...P(0.0, 0.782), ...P(0.12, 0.795)); c.stroke();
  c.fillStyle = 'rgba(150,180,196,0.35)';
  c.beginPath(); c.arc(...P(0.124, 1.02), 0.007, 0, Math.PI * 2); c.fill();
}

function head(c, q) {
  const [hx, hy] = q.hc;
  // neck (behind the collar)
  c.beginPath(); smooth(c, [[hx - 0.07, hy - 0.06], [hx + 0.02, hy - 0.1], [hx + 0.035, hy - 0.16], [hx - 0.02, hy - 0.17], [hx - 0.07, hy - 0.15]]);
  shadeFill(c, C.skin, hx - 0.08, hx + 0.04, hy - 0.18, hy - 0.05, 0.1);
  // the head: cranium + face profile (brow, nose, lips, chin), jaw to the neck
  const F = [[-0.035, 0.122], [0.045, 0.118], [0.088, 0.078], [0.098, 0.04], [0.094, 0.025], [0.122, -0.012], [0.1, -0.028],
    [0.104, -0.045], [0.097, -0.058], [0.1, -0.072], [0.084, -0.1], [0.05, -0.112], [0.01, -0.104], [-0.04, -0.08],
    [-0.078, -0.06], [-0.108, -0.01], [-0.112, 0.055], [-0.085, 0.105]].map(([x, y]) => [hx + x, hy + y]);
  c.beginPath(); smooth(c, F);
  shadeFill(c, C.skin, hx - 0.12, hx + 0.13, hy - 0.12, hy + 0.13, 0);
  c.strokeStyle = C.line; c.lineWidth = 0.004; c.stroke();
  // short hair: a mass over the crown and the back, a soft hairline at the temple, tapered at the nape
  const Hh = [[-0.04, 0.132], [0.05, 0.126], [0.086, 0.09], [0.07, 0.07], [0.02, 0.078], [-0.005, 0.045], [-0.03, 0.01],
    [-0.06, -0.035], [-0.085, -0.055], [-0.113, -0.01], [-0.118, 0.06], [-0.09, 0.114]].map(([x, y]) => [hx + x, hy + y]);
  c.beginPath(); smooth(c, Hh);
  shadeFill(c, C.hair, hx - 0.12, hx + 0.09, hy - 0.06, hy + 0.135, 0.05);
  // ear, brow shadow, the eye's socket hint, the lips' line
  c.beginPath(); c.ellipse(hx - 0.022, -(hy - 0.005), 0.018, 0.03, 0.15, 0, Math.PI * 2);
  c.fillStyle = L.rgba(L.mix(C.skin, [140, 170, 186], 0.12)); c.fill();
  c.strokeStyle = C.fold; c.lineWidth = 0.004; c.stroke();
  c.strokeStyle = 'rgba(4,8,14,0.5)'; c.lineWidth = 0.005;
  c.beginPath(); c.moveTo(...P(hx + 0.055, hy + 0.028)); c.quadraticCurveTo(...P(hx + 0.075, hy + 0.04), ...P(hx + 0.093, hy + 0.034)); c.stroke();
  c.lineWidth = 0.004;
  c.beginPath(); c.moveTo(...P(hx + 0.088, hy - 0.05)); c.lineTo(...P(hx + 0.1, hy - 0.051)); c.stroke();
  // shirt collar + jacket collar at the neck
  c.beginPath(); smooth(c, [[hx - 0.062, hy - 0.128], [hx - 0.01, hy - 0.142], [hx + 0.03, hy - 0.152], [hx + 0.034, hy - 0.168], [hx - 0.01, hy - 0.162], [hx - 0.066, hy - 0.146]]);
  c.fillStyle = 'rgb(96,110,122)'; c.fill();
  c.strokeStyle = C.line; c.stroke();
}

function figure(c, q) {
  leg(c, q.far, 0.22);
  arm(c, q.fsh, q.fel, q.fwr, 0.3);
  leg(c, q.near, 0);
  jacket(c, q);
  head(c, q);
  arm(c, q.sh, q.el, q.wr, 0);
}
// the figure is painted into a scratch canvas, then laid down twice: a flat accent copy nudged toward NOW (the rim
// light on the back edge) and the figure itself on top
let FIGCV = null, RIMCV = null;
const FCW = 420, FCH = 620;

/** The standing figure, feet at (x, y), facing LEFT (the past). s = scale 0..1 (folds into NOW), a = alpha. */
function drawFigure(c, x, y, s, a, gt) {
  if (s <= 0.01 || a <= 0) return;
  const ppm = (FIG_H / 1.75) * s;
  const q = pose(gt);
  FIGCV ??= new OffscreenCanvas(FCW, FCH);
  RIMCV ??= new OffscreenCanvas(FCW, FCH);
  const g = FIGCV.getContext('2d');
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.clearRect(0, 0, FCW, FCH);
  g.translate(FCW / 2, FCH - 20);
  g.scale(-ppm, ppm);                      // mirror: faces left (figure geometry is y-up via P()/smooth())
  g.lineJoin = 'round';
  figure(g, q);
  const r = RIMCV.getContext('2d');
  r.globalCompositeOperation = 'copy';
  r.drawImage(FIGCV, 0, 0);
  r.globalCompositeOperation = 'source-in';
  r.fillStyle = L.rgba(ACCENT);
  r.fillRect(0, 0, FCW, FCH);
  r.globalCompositeOperation = 'source-over';
  c.save();
  c.globalAlpha *= a;
  // contact shadow on the ruler
  c.fillStyle = 'rgba(0,0,0,0.45)';
  c.beginPath(); c.ellipse(x - 8 * s, y + 1, Math.max(0, 66 * s), Math.max(0, 5 * s), 0, 0, Math.PI * 2); c.fill();
  const ox = x - FCW / 2, oy = y - (FCH - 20);
  const rim = 2.4 * Math.min(1, s * 1.2);
  c.globalAlpha *= 0.9;
  c.drawImage(RIMCV, ox + rim, oy - rim * 0.45);
  c.globalAlpha /= 0.9;
  c.drawImage(FIGCV, ox, oy);
  c.restore();
}

/** Lifeline + bracket progress 0..1 (draws from NOW back to 1946 on "a long life") */
function lifeK(v) {
  return L.ease.inOutCubic(L.prog(v.gt, phraseAt(v, 1, 1) - 0.05, 1.0));
}

export default {
  beat: 1,
  chapter: { num: '01', title: 'A lifetime', sub: 'about 80 years' },
  layer: 1,
  cues(d) {
    const p2 = 1.57;   // "A long life…" (beat-relative)
    return [
      { t: 0.18, name: 'blip', gain: 0.26, pitch: 1.0 },
      { t: p2, name: 'swish', gain: 0.3, pitch: 0.95 },
      { t: p2 + 0.95, name: 'tick', gain: 0.32, pitch: 1.2 },
    ];
  },

  drawWorld(ctx, v) {
    const lk = live(v);
    const b1 = beatStart(v, 1), b2 = beatStart(v, 2);
    if (lk <= 0 || v.gt < b1 - 0.45 || v.gt > b2 + 2.2) return;
    const nowX = tx(v, 0), y = rulerY(v);
    const x80 = tx(v, AGE.life);
    const span = nowX - x80;
    // ---- lifeline + bracket (shrinks with the zoom-out, fades once it is a sliver)
    const lp = lifeK(v);
    const fade = L.clamp((span - 26) / 90) * (1 - L.enter(v.gt, b2 + 0.3, 0.6, L.ease.inCubic)) * lk;
    if (lp > 0 && fade > 0) {
      const xa = L.lerp(nowX, x80, lp);
      ctx.save();
      ctx.globalAlpha *= fade;
      // the lived span glows on the ruler
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.shadowColor = L.rgba(ACCENT, 0.9); ctx.shadowBlur = 18;
      ctx.strokeStyle = L.rgba(ACCENT, 0.85); ctx.lineWidth = 5; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(xa, y); ctx.lineTo(nowX, y); ctx.stroke();
      ctx.restore();
      // the head of the line: a bright bead travelling back in time
      if (lp < 1) L.lightBlob(ctx, xa, y, 26, ACCENT, 0.7);
      ctx.fillStyle = L.rgba(ACCENT);
      ctx.beginPath(); ctx.arc(xa, y, 6, 0, Math.PI * 2); ctx.fill();
      // bracket below the ruler
      hBracket(ctx, xa, nowX, BRK_Y, 1, ACCENT, '', 'below');
      // birth-year tag above the far end, once the line has arrived
      const tk = L.prog(lp, 0.85, 0.15);
      tag(ctx, x80, y - 40, '1946', { k: tk, color: GREYTXT, size: 28, family: L.FONT.din, weight: 700, tr: 2, maxW: 120 });
      ctx.fillStyle = L.rgba(GREYTXT, 0.8 * tk);
      ctx.fillRect(x80 - 1, y - 30, 2, 22);
      ctx.restore();
    }
    // ---- the figure: rises in on "Start with you", folds into NOW as beat 2 zooms out
    const rise = L.ease.outCubic(L.prog(v.gt, b1 - 0.4, 0.5));   // on screen as "Start with you" begins
    const fold = L.ease.inCubic(L.prog(v.gt, b2 + 0.05, 0.55));
    const s = L.lerp(0.9, 1, rise) * (1 - fold);
    const a = L.clamp(rise * 1.4) * (1 - L.clamp(fold * 1.3)) * lk;
    if (a > 0) {
      const fx = nowX + FIG_DX * (1 - fold);
      // light pooling at the figure's feet from NOW
      L.lightBlob(ctx, fx, y, 150 * s, ACCENT, 0.14 * a);
      L.lightBlob(ctx, nowX, y - 120, 260, ACCENT, 0.05 * a);
      drawFigure(ctx, fx, y - 1 + (1 - rise) * 40, s, a, v.gt);
    }
  },

  drawOverlay(ctx, v) {
    const k = v.k * L.enter(v.gt, phraseAt(v, 1, 1) - 0.1, 0.55);
    label(ctx, { x: 80, y: 560, big: '80 YEARS', small: 'a long human life', k, accent: v.accent });
  },
};
