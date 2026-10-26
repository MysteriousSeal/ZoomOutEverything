// Beat 4 — "A trillion seconds ago, mammoths still roamed the Earth, | and humans were painting caves."
// The camera pulls out to 1e12 s. The billion span collapses into NOW ("a lifetime"), then the trillion span
// draws down like a measuring tape; every history marker lights up as its glowing head passes it.
// The head lands on the 31,700-years line, which becomes the ground a woolly mammoth walks in on.
// On "painting caves" a rock wall rises behind it: the mammoth turns into a charcoal-and-ochre cave painting
// and two hand stencils are sprayed onto the wall.
// World y = seconds ago; x is screen space beside the spine. Everything here persists through beats 5–6 and
// gives way (LOD by mpp) when the debt zoom compresses it into the sliver at NOW.
import * as L from '../../../../engine/runtime/lib.js';
import { SPINE_X, NOW_Y, YEAR, ACCENT } from '../env.js';

const { ease, clamp, lerp, prog, rgba, mix } = L;
const TAU = Math.PI * 2;
const TRILLION = 1e12;
const BILLION = 1e9;
const BAR_X = SPINE_X + 22, BAR_W = 20;          // the span bar, beside the spine
const WARM = [244, 236, 220];
const GREY = [190, 182, 168];
const OCHRE = [178, 74, 38];
const CHAR = [28, 20, 16];

// ------------------------------------------------------------------ choreography (s from beat start)
const HEAD0 = 0.22, HEAD_DUR = 1.38;       // the tape's head: 1e9 -> 1e12 (log), lands ~t 1.6 ("mammoths" ≈ 1.5)
const T = {
  life: 0.8,         // "a lifetime" tag rides the collapsing billion span into NOW
  mammoth: 1.42,      // mammoth walks in on the 31,700-year line
  walkEnd: 2.6,
  wall: 4.2,         // "and humans were painting caves": rock wall rises
  paint: 4.55,       // mammoth becomes a cave painting
  hand1: 4.8,        // "painting"
  hand2: 5.12,       // "caves"
};
// LOD: fade the labels and art as the debt zoom (beat 6) compresses this span
const lodK = (mpp) => 1 - clamp((mpp - 1.7e9) / 2.3e9);

const ioc = ease.inOutCubic;
const invIOC = (y) => (y < 0.5 ? Math.cbrt(y / 4) : 1 - Math.cbrt(2 * (1 - y)) / 2);
/** world seconds of the tape's head */
const headAt = (t) => Math.exp(lerp(Math.log(BILLION), Math.log(TRILLION), ioc(prog(t, HEAD0, HEAD_DUR))));
/** time (s from beat start) when the head passes world y */
const passT = (y) => HEAD0 + HEAD_DUR * invIOC(clamp(Math.log(y / BILLION) / Math.log(1000)));

// ------------------------------------------------------------------ history markers
// t = the notch flash as the head passes; lt = the label slide-in, staggered once the mammoth has landed and
// stopped walking (one marker at a time, before the wall rises)
const MARKS = [
  { yr: 4500, name: 'GREAT PYRAMID', icon: 'pyramid', lt: 2.7 },
  { yr: 5200, name: 'FIRST WRITING', icon: 'tablet', lt: 3.0 },
  { yr: 12000, name: 'FARMING BEGINS', icon: 'wheat', lt: 3.3 },
  { yr: 20000, name: 'ICE AGE PEAK', icon: 'snow', lt: 3.6 },
].map((m) => ({ ...m, s: m.yr * YEAR, t: passT(m.yr * YEAR) }));
const LABEL_X = 334;
const MIN_GAP = 66;

/** label y per marker: at the marker, pushed apart so two-line labels never collide */
function labelYs(ys, floor) {
  const out = ys.map((y) => Math.min(y, floor));
  for (let it = 0; it < 6; it++) {
    for (let i = 1; i < out.length; i++) {
      const gap = out[i] - out[i - 1];
      if (gap < MIN_GAP) { const p = (MIN_GAP - gap) / 2; out[i - 1] -= p; out[i] += p; }
    }
  }
  return out;
}

function icon(ctx, kind, x, y, s, a) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  ctx.strokeStyle = rgba(WARM, 0.9 * a);
  ctx.fillStyle = rgba(WARM, 0.9 * a);
  ctx.lineWidth = 2;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.beginPath();
  if (kind === 'pyramid') {
    ctx.moveTo(-16, 11); ctx.lineTo(0, -13); ctx.lineTo(16, 11); ctx.closePath(); ctx.stroke();
    ctx.globalAlpha *= 0.55;
    ctx.beginPath();
    ctx.moveTo(-8, -1); ctx.lineTo(8, -1); ctx.moveTo(-12, 5); ctx.lineTo(12, 5);
    ctx.moveTo(0, -13); ctx.lineTo(4, 11);
    ctx.stroke();
  } else if (kind === 'tablet') {
    ctx.rotate(-0.12);
    L.roundRect(ctx, -11, -14, 22, 28, 4); ctx.stroke();
    for (let r = 0; r < 4; r++) {
      for (let c = 0; c < 3; c++) {
        const wx = -6 + c * 6, wy = -8 + r * 5.5;
        ctx.beginPath(); ctx.moveTo(wx - 1.6, wy - 1.4); ctx.lineTo(wx + 2.2, wy); ctx.lineTo(wx - 1.6, wy + 1.4); ctx.closePath(); ctx.fill();
      }
    }
  } else if (kind === 'wheat') {
    ctx.moveTo(0, 14); ctx.quadraticCurveTo(1, 0, 0, -14); ctx.stroke();
    for (let i = 0; i < 4; i++) {
      const gy = -9 + i * 5.5;
      for (const sd of [-1, 1]) {
        ctx.beginPath();
        ctx.ellipse(sd * 4, gy, 2.2, 4.4, sd * 0.6, 0, TAU);
        ctx.stroke();
      }
    }
    ctx.beginPath(); ctx.moveTo(0, -14); ctx.lineTo(0, -17); ctx.stroke();
  } else if (kind === 'snow') {
    for (let i = 0; i < 3; i++) {
      ctx.save();
      ctx.rotate((i * Math.PI) / 3);
      ctx.beginPath();
      ctx.moveTo(0, -14); ctx.lineTo(0, 14);
      for (const sy of [-1, 1]) {
        ctx.moveTo(0, sy * 8); ctx.lineTo(-4, sy * 12);
        ctx.moveTo(0, sy * 8); ctx.lineTo(4, sy * 12);
      }
      ctx.stroke();
      ctx.restore();
    }
  }
  ctx.restore();
}

function drawMarkers(ctx, v, lod) {
  const ys = MARKS.map((m) => v.wy(m.s));
  const lys = labelYs(ys, v.wy(TRILLION) - WALL.up - 52);
  MARKS.forEach((m, i) => {
    const k = prog(v.t, m.t - 0.04, 0.55);
    if (k <= 0) return;
    const y = ys[i], ly = lys[i];
    // the notch on the span: a bright flash as the head passes, then a calm dot
    const flash = Math.exp(-6 * Math.max(0, v.t - m.t)) * clamp(k * 6);
    L.lightBlob(ctx, BAR_X + BAR_W / 2, y, 30 + 50 * flash, [255, 235, 190], 0.25 + 0.6 * flash);
    ctx.fillStyle = rgba([255, 248, 230], 0.95);
    ctx.beginPath(); ctx.arc(BAR_X + BAR_W / 2, y, Math.max(0, 4.5 * clamp(k * 3)), 0, TAU); ctx.fill();
    if (lod <= 0) return;
    // label slides in from the right on an elbow leader
    const kl = prog(v.t, m.lt, 0.55);
    if (kl <= 0) return;
    const e = ease.outCubic(kl);
    const a = clamp(kl * 1.6) * lod;
    const dx = (1 - e) * 70;
    ctx.save();
    ctx.globalAlpha *= a;
    ctx.strokeStyle = rgba(WARM, 0.45);
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    const x0 = BAR_X + BAR_W + 6, xe = lerp(x0, LABEL_X - 12, e);
    ctx.moveTo(x0, y);
    ctx.lineTo(Math.min(xe, x0 + 22), y);
    if (xe > x0 + 22) ctx.lineTo(xe, lerp(y, ly, clamp((xe - x0 - 22) / Math.max(1, LABEL_X - 12 - x0 - 22))));
    ctx.stroke();
    icon(ctx, m.icon, LABEL_X + 22 + dx, ly, 1, 1);
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.shadowColor = 'rgba(0,0,0,0.7)';
    ctx.shadowBlur = 10;
    ctx.font = L.font(25, 700, L.FONT.body);
    ctx.fillStyle = rgba(WARM, 0.96);
    L.trackedText(ctx, m.name, LABEL_X + 58 + dx, ly - 3, 2.5);
    ctx.font = L.font(30, 600, L.FONT.din);
    ctx.fillStyle = rgba(ACCENT, 0.95);
    L.trackedText(ctx, `${L.fmt(m.yr)} YEARS AGO`, LABEL_X + 58 + dx * 1.3, ly + 27, 1.5);
    ctx.restore();
  });
}

// ------------------------------------------------------------------ the span (measuring tape)
function drawSpan(ctx, v) {
  const y0 = v.wy(0);
  const head = headAt(v.t);
  const y1 = v.wy(head);
  if (y1 - y0 < 1) return;
  const landed = prog(v.t, HEAD0 + HEAD_DUR, 0.7);
  ctx.save();
  // trailing gradient: faint at NOW, full at the head
  const g = ctx.createLinearGradient(0, y0, 0, y1);
  g.addColorStop(0, rgba(ACCENT, 0.22));
  g.addColorStop(0.7, rgba(ACCENT, lerp(0.55, 0.75, landed)));
  g.addColorStop(1, rgba(ACCENT, 0.95));
  ctx.fillStyle = g;
  L.roundRect(ctx, BAR_X, y0, BAR_W, Math.max(2, y1 - y0), Math.min(BAR_W / 2, (y1 - y0) / 2));
  ctx.fill();
  // fine bright core
  ctx.fillStyle = 'rgba(255,246,220,0.55)';
  ctx.fillRect(BAR_X + BAR_W / 2 - 1, y0 + 4, 2, Math.max(0, y1 - y0 - 8));
  // the head: hot while travelling, a calm ember once landed
  const moving = 1 - landed;
  L.lightBlob(ctx, BAR_X + BAR_W / 2, y1, 90 + 60 * moving, ACCENT, 0.45 + 0.4 * moving);
  ctx.fillStyle = rgba([255, 250, 235], 0.9);
  ctx.beginPath(); ctx.arc(BAR_X + BAR_W / 2, y1, Math.max(0, 5 + 3 * moving), 0, TAU); ctx.fill();
  // landing ripple
  const rp = prog(v.t, HEAD0 + HEAD_DUR - 0.02, 0.9);
  if (rp > 0 && rp < 1) {
    ctx.strokeStyle = rgba(ACCENT, 0.55 * (1 - rp));
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(BAR_X + BAR_W / 2, y1, Math.max(0, 14 + 70 * ease.outCubic(rp)), 0, TAU); ctx.stroke();
  }
  ctx.restore();
}

/** "a lifetime": the billion span shrinking into NOW, tagged as it goes */
function drawLifetime(ctx, v, lod) {
  const k = ease.outCubic(prog(v.t, T.life, 0.6)) * lod;
  if (k <= 0) return;
  const yb = Math.max(v.wy(BILLION), NOW_Y + 1.5);
  ctx.save();
  ctx.globalAlpha *= k;
  ctx.fillStyle = rgba([255, 248, 230], 0.9);
  ctx.fillRect(BAR_X - 4, yb - 1, BAR_W + 8, 2);
  ctx.strokeStyle = rgba(WARM, 0.4);
  ctx.lineWidth = 1.5;
  const ly = NOW_Y + 30;
  ctx.beginPath(); ctx.moveTo(BAR_X + BAR_W + 6, yb); ctx.lineTo(BAR_X + BAR_W + 26, ly - 8); ctx.lineTo(LABEL_X - 12, ly - 8); ctx.stroke();
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.font = L.font(22, 600, L.FONT.body);
  ctx.fillStyle = rgba(GREY, 0.95);
  ctx.shadowColor = 'rgba(0,0,0,0.7)';
  ctx.shadowBlur = 8;
  L.trackedText(ctx, '1 BILLION SECONDS · A LIFETIME', LABEL_X + (1 - k) * 30, ly - 7, 2);
  ctx.restore();
}

// ------------------------------------------------------------------ mammoth (unit = shoulder height, faces left)
// Origin at the feet (ground line), y up is negative. A proper woolly-mammoth silhouette: high domed head, a saddle
// behind it, a tall shoulder hump, a steeply sloping back, columnar legs, curved tusks that thin to a point and a
// skirt of long hair strands. Lit by the gold spine on its left (rim light) and a warm key from above.
const MAM_H = 172;
function bodyPath(ctx) {
  ctx.beginPath();
  ctx.moveTo(-0.6, -0.68);                                          // forehead, low front
  ctx.bezierCurveTo(-0.66, -0.86, -0.6, -1.1, -0.43, -1.12);        // domed skull
  ctx.bezierCurveTo(-0.33, -1.13, -0.28, -1.04, -0.22, -1.0);       // back of the dome
  ctx.bezierCurveTo(-0.17, -0.97, -0.12, -1.04, -0.02, -1.05);      // neck saddle -> shoulder hump
  ctx.bezierCurveTo(0.18, -1.04, 0.42, -0.9, 0.6, -0.72);           // steep sloping back
  ctx.bezierCurveTo(0.7, -0.62, 0.72, -0.5, 0.68, -0.42);           // rump
  ctx.bezierCurveTo(0.64, -0.36, 0.56, -0.36, 0.5, -0.38);          // under the rump
  ctx.bezierCurveTo(0.3, -0.33, 0.0, -0.33, -0.3, -0.37);           // belly (the hair skirt hangs below)
  ctx.bezierCurveTo(-0.42, -0.4, -0.49, -0.46, -0.52, -0.54);       // chest up to the jaw
  // trunk: hangs from the face, tapers and curls forward at the tip
  ctx.bezierCurveTo(-0.53, -0.4, -0.54, -0.24, -0.56, -0.12);       // inner edge
  ctx.bezierCurveTo(-0.57, -0.06, -0.6, -0.03, -0.645, -0.05);      // curl
  ctx.bezierCurveTo(-0.675, -0.06, -0.675, -0.1, -0.655, -0.12);    // tip
  ctx.bezierCurveTo(-0.64, -0.22, -0.67, -0.42, -0.69, -0.56);      // outer edge, widening to the face
  ctx.bezierCurveTo(-0.7, -0.63, -0.65, -0.67, -0.6, -0.68);
  ctx.closePath();
}
/** a curved tusk as a filled sliver that thins to a point; far = the second tusk (offset, darker) */
function tuskPath(ctx, far = 0) {
  const ox = far * 0.07, oy = -far * 0.03;
  ctx.beginPath();
  ctx.moveTo(-0.55 + ox, -0.63 + oy);
  ctx.bezierCurveTo(-0.66 + ox, -0.36 + oy, -0.9 + ox, -0.26 + oy, -1.02 + ox, -0.36 + oy);   // lower edge, sweeping forward
  ctx.bezierCurveTo(-1.08 + ox, -0.42 + oy, -1.06 + ox, -0.52 + oy, -0.99 + ox, -0.6 + oy);  // up and in: the tip
  ctx.bezierCurveTo(-1.02 + ox, -0.5 + oy, -1.0 + ox, -0.4 + oy, -0.94 + ox, -0.37 + oy);    // inner edge back (thin)
  ctx.bezierCurveTo(-0.82 + ox, -0.33 + oy, -0.66 + ox, -0.42 + oy, -0.585 + ox, -0.58 + oy);
  ctx.closePath();
}
/** a columnar leg hanging from the hip at (x, -0.56): slight taper, a hint of knee, a rounded foot pad */
function legPath(ctx, x, ang, w, far = 0) {
  ctx.save();
  ctx.translate(x, -0.56);
  ctx.rotate(ang);
  const h = 0.56 - far * 0.012;
  ctx.beginPath();
  ctx.moveTo(-w * 0.5, 0);
  ctx.bezierCurveTo(-w * 0.52, h * 0.3, -w * 0.4, h * 0.5, -w * 0.43, h * 0.62);   // front, the knee
  ctx.bezierCurveTo(-w * 0.45, h * 0.8, -w * 0.47, h * 0.93, -w * 0.52, h * 0.97); // shin to a slight flare
  ctx.quadraticCurveTo(-w * 0.5, h, -w * 0.3, h);                                   // foot pad
  ctx.lineTo(w * 0.34, h);
  ctx.quadraticCurveTo(w * 0.52, h, w * 0.5, h * 0.96);
  ctx.bezierCurveTo(w * 0.45, h * 0.8, w * 0.44, h * 0.55, w * 0.5, h * 0.4);       // back of the leg
  ctx.bezierCurveTo(w * 0.54, h * 0.25, w * 0.52, h * 0.1, w * 0.5, 0);
  ctx.closePath();
  ctx.restore();
}
// long hair: a skirt of strands hanging from the belly/flank, plus shorter strands following the body's contours
const HAIR = (() => {
  const r = L.rng(4411);
  const skirt = Array.from({ length: 200 }, () => {
    const x = lerp(-0.48, 0.64, r());
    const edge = x < -0.38 || x > 0.56 ? 0.55 : 1;
    return { x, y: -0.38 - 0.12 * r(), l: (0.08 + 0.09 * r()) * edge, bend: (r() - 0.3) * 0.04, a: 0.45 + r() * 0.45, w: 0.007 + r() * 0.008, t: r() };
  });
  const coat = Array.from({ length: 170 }, () => ({ x: lerp(-0.6, 0.68, r()), y: lerp(-1.1, -0.42, r()), l: 0.05 + r() * 0.08, a: 0.15 + r() * 0.35, s: r() }));
  return { skirt, coat };
})();
/** soft hair mass under the belly: a gently scalloped hem (no sawtooth) */
function skirtPath(ctx) {
  ctx.beginPath();
  ctx.moveTo(0.62, -0.46);
  ctx.lineTo(0.6, -0.33);
  const n = 9;
  for (let i = 0; i < n; i++) {
    const x0 = lerp(0.6, -0.44, i / n), x1 = lerp(0.6, -0.44, (i + 1) / n);
    const sag = 0.035 * Math.sin(((i + 0.5) / n) * Math.PI);
    ctx.quadraticCurveTo((x0 + x1) / 2, -0.265 + sag * 0.3 + 0.012 * L.noise1(i * 1.3, 8), x1, -0.3 + sag * 0.2);
  }
  ctx.lineTo(-0.47, -0.44);
  ctx.closePath();
}
/** the lit top line of the silhouette (forehead, dome, hump, back) for the rim light */
function topLine(ctx) {
  ctx.beginPath();
  ctx.moveTo(-0.65, -0.5);
  ctx.bezierCurveTo(-0.67, -0.6, -0.64, -0.66, -0.6, -0.68);
  ctx.bezierCurveTo(-0.66, -0.86, -0.6, -1.1, -0.43, -1.12);
  ctx.bezierCurveTo(-0.33, -1.13, -0.28, -1.04, -0.22, -1.0);
  ctx.bezierCurveTo(-0.17, -0.97, -0.12, -1.04, -0.02, -1.05);
  ctx.bezierCurveTo(0.18, -1.04, 0.42, -0.9, 0.6, -0.72);
}

// scratch layer: the mammoth is built from overlapping shapes, so a translucent fade is composited as one image
const LAYER = { w: 460, h: 300, ox: 260, oy: 236 };   // canvas size; origin (feet) inside it
let layer = null;
function mammothLayer() {
  if (!layer) {
    layer = typeof OffscreenCanvas !== 'undefined' ? new OffscreenCanvas(LAYER.w, LAYER.h) : document.createElement('canvas');
    layer.width = LAYER.w; layer.height = LAYER.h;
  }
  return layer;
}

/** paint: 0 = lit sculpted figure, 1 = charcoal + ochre cave painting */
function drawMammoth(ctx, x, ground, phase, walk, paint, alpha, breath = 0) {
  if (alpha <= 0) return;
  if (alpha < 0.995) {
    const cv = mammothLayer(), lc = cv.getContext('2d');
    lc.setTransform(1, 0, 0, 1, 0, 0);
    lc.globalAlpha = 1;
    lc.clearRect(0, 0, LAYER.w, LAYER.h);
    const fx = Math.floor(x), fy = Math.floor(ground);
    drawMammothFull(lc, LAYER.ox + (x - fx), LAYER.oy + (ground - fy), phase, walk, paint, breath);
    ctx.save();
    ctx.globalAlpha *= alpha;
    ctx.drawImage(cv, fx - LAYER.ox, fy - LAYER.oy);
    ctx.restore();
    return;
  }
  drawMammothFull(ctx, x, ground, phase, walk, paint, breath);
}
function drawMammothFull(ctx, x, ground, phase, walk, paint, breath) {
  const s = MAM_H;
  ctx.save();
  ctx.translate(x, ground);
  ctx.scale(s, s);
  // contact shadow on the ground line (fades as it becomes a painting)
  ctx.save();
  ctx.globalAlpha *= 1 - paint;
  const sg = ctx.createRadialGradient(0.05, 0, 0, 0.05, 0, 0.85);
  sg.addColorStop(0, 'rgba(0,0,0,0.6)');
  sg.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = sg;
  ctx.scale(1, 0.09);
  ctx.beginPath(); ctx.arc(0.05, 0, 0.85, 0, TAU); ctx.fill();
  ctx.restore();

  // palette: 3 tones (key-lit top, mid, shadowed underside) -> ochre + dark red-brown when painted
  const TOP = mix([214, 178, 128], [196, 88, 44], paint);
  const MID = mix([146, 104, 66], OCHRE, paint);
  const BOT = mix([66, 46, 32], [118, 46, 26], paint);
  const fillA = lerp(1, 0.8, paint);
  const legW = 0.2;
  const sw = (off) => walk * 0.26 * Math.sin(phase + off);
  const body = (sy) => {   // vertical 3-tone gradient across the body
    const g = ctx.createLinearGradient(0, -1.12, 0, sy);
    g.addColorStop(0, rgba(TOP, fillA));
    g.addColorStop(0.45, rgba(MID, fillA));
    g.addColorStop(1, rgba(BOT, fillA));
    return g;
  };
  // legs: far pair first (darker), then the near pair
  const LEGS = [[-0.17, Math.PI, 1], [0.55, 0, 1], [-0.33, 0, 0], [0.42, Math.PI, 0]];
  for (const [lx, off, far] of LEGS) {
    const g = ctx.createLinearGradient(0, -0.56, 0, 0);
    g.addColorStop(0, rgba(far ? mix(BOT, [20, 14, 10], 0.35) : MID, fillA));
    g.addColorStop(1, rgba(far ? mix(BOT, [20, 14, 10], 0.5) : BOT, fillA));
    ctx.fillStyle = g;
    legPath(ctx, lx, sw(off), legW * (far ? 0.92 : 1), far); ctx.fill();
    if (paint > 0) { ctx.strokeStyle = rgba(CHAR, 0.85 * paint); ctx.lineWidth = 0.02; ctx.stroke(); }
    // toenail hint on the near feet
    if (!far && paint < 1) {
      ctx.save();
      ctx.translate(lx, -0.56); ctx.rotate(sw(off));
      ctx.fillStyle = rgba([226, 208, 176], 0.35 * (1 - paint));
      for (const nx of [-0.06, 0.0]) { ctx.beginPath(); ctx.ellipse(nx, 0.545, 0.022, 0.012, 0, 0, TAU); ctx.fill(); }
      ctx.restore();
    }
  }
  // far tusk sits behind the head
  ctx.fillStyle = rgba(mix([168, 150, 120], [200, 176, 130], paint), lerp(0.95, 0.75, paint));
  tuskPath(ctx, 1); ctx.fill();

  // body (gentle breathing once it stands)
  ctx.save();
  ctx.translate(0, walk * 0.01 * Math.sin(phase * 2));
  ctx.scale(1, 1 + 0.008 * breath * (1 - walk));
  ctx.fillStyle = body(-0.25);
  bodyPath(ctx); ctx.fill();
  ctx.save();
  bodyPath(ctx); ctx.clip();
  // coat: short strands following the hide, darker in the shadows
  ctx.lineCap = 'round';
  ctx.lineWidth = 0.011;
  const coatC = mix([70, 46, 28], [80, 26, 14], paint);
  for (const h of HAIR.coat) {
    ctx.strokeStyle = rgba(coatC, h.a * lerp(0.7, 0.8, paint));
    ctx.beginPath();
    ctx.moveTo(h.x, h.y);
    ctx.quadraticCurveTo(h.x + h.l * 0.25, h.y + h.l * 0.6, h.x + h.l * 0.18, h.y + h.l);
    ctx.stroke();
  }
  // warm key light on the dome and hump; a soft gold rim from the spine on the left
  const kl = ctx.createRadialGradient(-0.25, -1.15, 0, -0.25, -1.15, 0.6);
  kl.addColorStop(0, `rgba(255,236,196,${0.3 * (1 - paint)})`);
  kl.addColorStop(1, 'rgba(255,236,196,0)');
  ctx.fillStyle = kl;
  ctx.fillRect(-1, -1.2, 2, 0.9);
  ctx.restore();
  // skirt of long hair below the belly (over the tops of the legs): a soft mass, then fine strands
  ctx.fillStyle = body(-0.25);          // same gradient as the body, so the hair mass reads as one coat
  skirtPath(ctx); ctx.fill();
  ctx.lineCap = 'round';
  for (const h of HAIR.skirt) {
    ctx.strokeStyle = rgba(h.t > 0.75 ? mix(MID, BOT, 0.2) : mix(BOT, [20, 14, 10], 0.25), h.a * fillA * (h.t > 0.75 ? 0.5 : 0.75));
    ctx.lineWidth = h.w;
    ctx.beginPath();
    ctx.moveTo(h.x, h.y);
    ctx.quadraticCurveTo(h.x + h.bend, h.y + h.l * 0.6, h.x + h.bend * 1.6, h.y + h.l);
    ctx.stroke();
  }
  // eye, ear flap, tail
  ctx.fillStyle = rgba(mix([30, 20, 14], CHAR, paint), 0.9);
  ctx.beginPath(); ctx.ellipse(-0.53, -0.82, 0.016, 0.011, -0.3, 0, TAU); ctx.fill();
  ctx.strokeStyle = rgba(mix([60, 40, 26], CHAR, paint), 0.55);
  ctx.lineWidth = 0.013;
  ctx.beginPath(); ctx.ellipse(-0.39, -0.8, 0.055, 0.085, 0.25, -1.3, 2.0); ctx.stroke();
  ctx.strokeStyle = rgba(mix(BOT, CHAR, paint), 0.9);
  ctx.lineWidth = 0.022;
  ctx.beginPath(); ctx.moveTo(0.68, -0.58); ctx.quadraticCurveTo(0.74, -0.5, 0.73, -0.42); ctx.stroke();
  ctx.fillStyle = rgba(mix(BOT, CHAR, paint), 0.9);
  ctx.beginPath(); ctx.ellipse(0.73, -0.41, 0.014, 0.03, 0, 0, TAU); ctx.fill();
  // near tusk: ivory, shaded along its underside, thinning to the tip
  const tg = ctx.createLinearGradient(-0.6, -0.6, -1.02, -0.36);
  tg.addColorStop(0, rgba(mix([214, 196, 160], [235, 215, 170], paint), lerp(1, 0.8, paint)));
  tg.addColorStop(0.6, rgba(mix([246, 236, 214], [235, 215, 170], paint), lerp(1, 0.8, paint)));
  tg.addColorStop(1, rgba(mix([228, 214, 186], [235, 215, 170], paint), lerp(1, 0.8, paint)));
  ctx.fillStyle = tg;
  tuskPath(ctx, 0); ctx.fill();
  // rim light from the spine (left): a gold edge on the front of the silhouette, fading toward the back
  ctx.lineJoin = 'round';
  if (paint < 1) {
    const rg = ctx.createLinearGradient(-0.7, 0, 0.55, 0);
    rg.addColorStop(0, `rgba(255,214,140,${0.85 * (1 - paint)})`);
    rg.addColorStop(1, 'rgba(255,214,140,0)');
    ctx.strokeStyle = rg;
    ctx.lineWidth = 0.018;
    ctx.lineCap = 'round';
    topLine(ctx); ctx.stroke();
  }
  if (paint > 0) {
    ctx.strokeStyle = rgba(CHAR, 0.92 * paint);
    for (let p = 0; p < 2; p++) {
      ctx.save();
      ctx.translate(p * 0.006, -p * 0.004);
      ctx.lineWidth = p ? 0.012 : 0.026;
      bodyPath(ctx); ctx.stroke();
      tuskPath(ctx, 0); ctx.stroke();
      ctx.restore();
    }
  }
  ctx.restore();
  ctx.restore();
}

// ------------------------------------------------------------------ cave wall + hand stencils
const WALL = { x0: 352, x1: 948, up: 250, down: 30 };     // screen x; up/down relative to the 31,700-year line
const SPECK = (() => {
  const r = L.rng(5150);
  return Array.from({ length: 260 }, () => ({ x: r(), y: r(), s: 0.5 + r() * 2.2, a: r() }));
})();
const CRACKS = (() => {
  const r = L.rng(5151);
  return Array.from({ length: 7 }, () => {
    const pts = [[r(), r()]];
    for (let i = 0; i < 5; i++) { const [px, py] = pts[pts.length - 1]; pts.push([px + (r() - 0.4) * 0.12, py + (r() - 0.3) * 0.16]); }
    return pts;
  });
})();
function wallPath(ctx, ground, k) {
  const { x0, x1, up, down } = WALL;
  const cx = (x0 + x1) / 2, cy = ground - (up - down) / 2;
  const rx = (x1 - x0) / 2, ry = (up + down) / 2;
  ctx.beginPath();
  const n = 72;
  for (let i = 0; i <= n; i++) {
    const a = (i / n) * TAU;
    const c = Math.cos(a), s = Math.sin(a);
    // superellipse + rocky noise
    const sp = 0.32;
    const px = Math.sign(c) * Math.pow(Math.abs(c), sp), py = Math.sign(s) * Math.pow(Math.abs(s), sp);
    const nn = 1 + 0.035 * L.noise1(i * 0.9, 77) + 0.02 * L.noise1(i * 2.7, 78);
    const x = cx + px * rx * nn * lerp(0.92, 1, k), y = cy + py * ry * nn * lerp(0.85, 1, k);
    i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
  }
  ctx.closePath();
}
function drawWall(ctx, v, ground, k, torch) {
  if (k <= 0) return;
  const { x0, x1, up, down } = WALL;
  ctx.save();
  ctx.globalAlpha *= k;
  ctx.shadowColor = 'rgba(0,0,0,0.75)';
  ctx.shadowBlur = 40;
  ctx.shadowOffsetY = 12;
  wallPath(ctx, ground, k);
  const g = ctx.createRadialGradient(x0 + (x1 - x0) * 0.4, ground - up * 0.6, 20, x0 + (x1 - x0) * 0.5, ground - up * 0.4, (x1 - x0) * 0.7);
  g.addColorStop(0, '#5a4330');
  g.addColorStop(0.55, '#3a2b1e');
  g.addColorStop(1, '#1f1712');
  ctx.fillStyle = g;
  ctx.fill();
  ctx.shadowColor = 'transparent';
  ctx.save();
  wallPath(ctx, ground, k);
  ctx.clip();
  // stone texture
  for (const p of SPECK) {
    ctx.fillStyle = p.a > 0.5 ? `rgba(255,225,180,${0.05 + 0.06 * p.a})` : `rgba(0,0,0,${0.12 + 0.18 * p.a})`;
    ctx.fillRect(lerp(x0, x1, p.x), ground - up + (up + down) * p.y, p.s, p.s);
  }
  ctx.strokeStyle = 'rgba(15,10,6,0.45)';
  ctx.lineWidth = 1.2;
  for (const c of CRACKS) {
    ctx.beginPath();
    c.forEach(([px, py], i) => { const x = lerp(x0, x1, px), y = ground - up + (up + down) * py; i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); });
    ctx.stroke();
  }
  // torchlight flicker
  L.lightBlob(ctx, x0 + (x1 - x0) * 0.35, ground - up * 0.55, 420, [255, 150, 70], 0.16 * torch);
  ctx.restore();
  // rim
  ctx.strokeStyle = 'rgba(255,220,170,0.12)';
  ctx.lineWidth = 1.5;
  wallPath(ctx, ground, k);
  ctx.stroke();
  ctx.restore();
}

/** a left hand (fingers up), unit = palm width, origin at the palm centre */
function handPath(ctx) {
  const F = [   // [base x, top y, width]  index, middle, ring, little
    [-0.36, -1.22, 0.22], [-0.1, -1.36, 0.23], [0.15, -1.25, 0.22], [0.39, -0.95, 0.19],
  ];
  ctx.moveTo(-0.38, 0.95);
  ctx.lineTo(-0.5, 0.25);
  // thumb
  ctx.quadraticCurveTo(-0.85, 0.05, -1.02, -0.28);
  ctx.arc(-0.92, -0.34, 0.11, Math.PI * 0.85, Math.PI * 1.95);
  ctx.quadraticCurveTo(-0.72, -0.12, -0.5, -0.2);
  for (const [bx, ty, w] of F) {
    const l = bx - w / 2, r = bx + w / 2;
    ctx.lineTo(l, -0.52);
    ctx.lineTo(l + 0.01, ty + w / 2);
    ctx.arc(bx, ty + w / 2, w / 2, Math.PI, 0);
    ctx.lineTo(r - 0.01, -0.52);
  }
  ctx.lineTo(0.52, 0.25);
  ctx.lineTo(0.4, 0.95);
  ctx.closePath();
}
/** negative hand stencil: a sprayed ochre halo with the hand left bare */
function drawStencil(ctx, x, y, size, rot, k, seed) {
  if (k <= 0) return;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  const R = size * 1.25 * lerp(0.7, 1, ease.outCubic(k));
  ctx.beginPath();
  ctx.arc(0, -size * 0.25, R, 0, TAU);
  ctx.save();
  ctx.scale(size * 0.6, size * 0.6);
  handPath(ctx);
  ctx.restore();
  const g = ctx.createRadialGradient(0, -size * 0.25, size * 0.2, 0, -size * 0.25, R);
  g.addColorStop(0, rgba(OCHRE, 0.85 * k));
  g.addColorStop(0.55, rgba(OCHRE, 0.55 * k));
  g.addColorStop(1, rgba(OCHRE, 0));
  ctx.fillStyle = g;
  ctx.fill('evenodd');
  // spray speckle around the edge
  const r = L.rng(seed);
  for (let i = 0; i < 70; i++) {
    const a = r() * TAU, d = R * (0.55 + r() * 0.6);
    if (r() > k) continue;
    ctx.fillStyle = rgba(OCHRE, 0.25 + r() * 0.4);
    ctx.fillRect(Math.cos(a) * d, -size * 0.25 + Math.sin(a) * d, 1.6, 1.6);
  }
  ctx.restore();
}

function drawCave(ctx, v, lod) {
  const ground = v.wy(TRILLION);
  const kWall = ease.outCubic(prog(v.t, T.wall, 0.7)) * lod;
  const torch = 0.85 + 0.15 * L.noise1(v.gt * 7, 31) + 0.08 * L.noise1(v.gt * 19, 32);
  drawWall(ctx, v, ground, kWall, torch);

  // mammoth: walks in from the right along the 31,700-year line, then stands; idles (trunk/breath via bob)
  const km = prog(v.t, T.mammoth, T.walkEnd - T.mammoth);
  if (km > 0) {
    const e = ease.outCubic(km);
    const mx = lerp(800, 560, e);
    const walk = 1 - ease.inOutCubic(prog(v.t, T.walkEnd - 0.5, 0.5));
    const phase = (v.t - T.mammoth) * 6.5;
    const paint = ease.inOutCubic(prog(v.t, T.paint, 0.7));
    L.lightBlob(ctx, mx, ground - MAM_H * 0.55, 260, [255, 210, 150], 0.12 * clamp(km * 3) * (1 - paint) * lod);
    drawMammoth(ctx, mx, ground, phase, walk, paint, clamp(km * 6) * lod, Math.sin(v.gt * 2.3));
  }
  // hand stencils, clipped to the rock so the spray never drifts off the wall
  const k1 = ease.outCubic(prog(v.t, T.hand1, 0.55)) * lod, k2 = ease.outCubic(prog(v.t, T.hand2, 0.55)) * lod;
  if (k1 > 0 || k2 > 0) {
    ctx.save();
    wallPath(ctx, ground, kWall);
    ctx.clip();
    drawStencil(ctx, 822, ground - 128, 62, -0.26, k1, 71);
    drawStencil(ctx, 872, ground - 52, 46, 0.34, k2, 72);
    ctx.restore();
  }
}

/** the 31,700-year line: where the span lands, and the ground the mammoth stands on */
function drawGround(ctx, v, lod) {
  const k = ease.inOutCubic(prog(v.t, HEAD0 + HEAD_DUR - 0.1, 0.8)) * lod;
  if (k <= 0) return;
  const y = v.wy(TRILLION);
  const x0 = BAR_X + BAR_W + 4, x1 = lerp(x0, 940, k);
  const g = ctx.createLinearGradient(x0, 0, 940, 0);
  g.addColorStop(0, rgba(ACCENT, 0.8));
  g.addColorStop(0.75, rgba(ACCENT, 0.35));
  g.addColorStop(1, rgba(ACCENT, 0));
  ctx.fillStyle = g;
  ctx.fillRect(x0, y - 1, x1 - x0, 2);
}

function drawTags(ctx, v, lod) {
  const y = v.wy(TRILLION);
  ctx.save();
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.shadowColor = 'rgba(0,0,0,0.75)';
  ctx.shadowBlur = 10;
  ctx.font = L.font(23, 700, L.FONT.body);
  const km = ease.outCubic(prog(v.t, T.mammoth + 0.35, 0.6)) * lod;
  if (km > 0) {
    ctx.globalAlpha = km;
    ctx.fillStyle = rgba(WARM, 0.95);
    L.trackedText(ctx, 'WOOLLY MAMMOTHS', 400 + (1 - km) * 30, y - 198, 2.5);
  }
  const kc = ease.outCubic(prog(v.t, T.hand1 + 0.15, 0.6)) * lod;
  if (kc > 0) {
    ctx.globalAlpha = kc;
    ctx.fillStyle = rgba([235, 150, 110], 0.98);
    L.trackedText(ctx, 'CAVE ART', 912 + (1 - kc) * 30, y - 198, 2.5, 'right');
  }
  ctx.restore();
}

export default {
  beat: 4,
  chapter: { num: '04', title: 'A trillion seconds', sub: '1,000,000,000,000 s' },
  captions: true,
  layer: 3,
  cues(d) {
    const out = [
      { t: HEAD0 + 0.1, name: 'riser', gain: 0.22, pitch: 0.9 },
      { t: T.life, name: 'blip', gain: 0.18, pitch: 0.8 },
    ];
    MARKS.forEach((m, i) => out.push({ t: m.lt, name: 'tick', gain: 0.22, pitch: 1.1 + i * 0.12 }));
    out.push({ t: HEAD0 + HEAD_DUR, name: 'impact', gain: 0.4, pitch: 0.75 });
    out.push({ t: HEAD0 + HEAD_DUR + 0.02, name: 'deep', gain: 0.3, pitch: 0.7 });
    out.push({ t: T.wall, name: 'swell', gain: 0.25, pitch: 0.8 });
    out.push({ t: T.paint, name: 'shimmer', gain: 0.2, pitch: 0.9 });
    out.push({ t: T.hand1, name: 'swish', gain: 0.22, pitch: 1.7 });
    out.push({ t: T.hand2, name: 'swish', gain: 0.2, pitch: 1.5 });
    return out;
  },
  drawWorld(ctx, v) {
    if (v.t < 0) return;
    const mpp = v.cam.mpp;
    if (mpp < 1e7) return;                         // nothing of ours on screen yet
    // before the beat-6 pull-back starts, labels and art fade out so only the gold span + dots ride the zoom
    const s6 = v.tl.scenes[6];
    const out = s6 ? 1 - ease.inCubic(prog(v.gt, s6.start - 0.32, 0.28)) : 1;
    const lod = lodK(mpp) * out;
    // beat 5 holds on the big "31,700 years": our art steps back so that label leads
    const recede = ease.inOutCubic(prog(v.t, v.d + 0.05, 0.6));
    ctx.save();
    if (lod > 0) drawCave(ctx, v, lod * lerp(1, 0.5, recede));
    drawSpan(ctx, v);
    if (lod > 0) drawGround(ctx, v, lod);
    drawLifetime(ctx, v, lod);
    drawMarkers(ctx, v, lod * lerp(1, 0.8, recede));
    if (lod > 0) drawTags(ctx, v, lod * lerp(1, 0.5, recede));
    ctx.restore();
  },
};
