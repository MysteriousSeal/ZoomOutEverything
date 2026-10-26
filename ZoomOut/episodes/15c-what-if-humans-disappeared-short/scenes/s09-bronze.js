// Beat 9 — Some bronze statues might keep their shape for millions of years.
// The region at 140 m/px, the city long gone under forest. A warm glint marks the old plaza (Bowling Green); a
// leader draws up from it and a loupe opens. Inside: the Charging Bull (15b: a ray-marched 3D bronze, scenes/bull3d.js), still standing on its
// granite plinth in a forest clearing, its shadow cast from the hooves along the ground. While the clock races to
// 1,000,000 YEARS the sun wheels round like a sundial; it settles just as the clock locks. A CHARGING BULL tag.
// The loupe closes before the pull-back to the planet.
import * as L from '../../../../engine/runtime/lib.js';
import { PLAZA } from '../camera.js';
import { glowDot } from '../env.js';
import { drawBull, drawBullShadow, SPINE } from './bull3d.js';

const LENS = { x: 690, y: 728, r: 212 };
// 15b: the loupe opens on "Some bronze statues" (~0.4-1.0 s); the card and the clock lock land on "millions" (~3.1 s)
const T_MARK = 0.05, T_LEAD = 0.2, T_OPEN = 0.42, T_LOCK = 3.2, T_CARD = 2.95;
const K0 = 37;                                                  // px per metre inside the loupe (at full open)
const S_FINAL = 1.45;                                           // shadow direction at the lock (bull-local ground: forward and away; the sun lights the near flank)
const PLINTH = { l: 5.6, w: 2.0, h: 0 };                         // 15b: no plinth: the bull stands on the Bowling Green cobbles
const XC = 2.4;                                                 // body x of the plinth centre (profile/plan x runs rump 0 to nose ~4.65)
const BRONZE_HI = [236, 190, 120];

// forest around the clearing (local metres from the statue) + paving stones
const TREES = (() => {
  const r = L.rng(919), out = [];
  const clear = (a, d) => Math.abs(Math.atan2(Math.sin(a - S_FINAL), Math.cos(a - S_FINAL))) < 0.95 && d < 11;
  for (let i = 0; i < 30; i++) {
    const a = (i / 30) * Math.PI * 2 + r() * 0.2, d = 6.6 + r() * 3.4;
    if (clear(a, d)) continue;   // the shadow falls across an open, sunlit clearing
    out.push({ x: Math.cos(a) * d, y: Math.sin(a) * d, s: 2.0 + r() * 1.6, ph: r() * 9, n: 5 + Math.floor(r() * 4), tone: r() });
  }
  for (let i = 0; i < 5; i++) {   // saplings pushing into the clearing
    const a = r() * Math.PI * 2, d = 4.6 + r() * 1.4;
    if (clear(a, d)) continue;
    out.push({ x: Math.cos(a) * d, y: Math.sin(a) * d, s: 0.7 + r() * 0.6, ph: r() * 9, n: 4, tone: r() });
  }
  return out;
})();
const STONES = (() => {
  const r = L.rng(313), out = [];
  for (let i = -6; i <= 6; i++) for (let j = -6; j <= 6; j++) {
    const x = i * 1.15, y = j * 1.15, d = Math.hypot(x, y);
    if (d > 6.2 || r() > L.clamp(1.25 - d / 6.5)) continue;
    out.push({ x, y, tone: r(), tilt: (r() - 0.5) * 0.1 });
  }
  return out;
})();

/** Bronze-statue lens (screen space): the Charging Bull in a 3/4 oblique view, standing on its weathered granite
 *  plinth in a forest clearing. Its shadow is the true projection of the statue along the sun (it starts at the
 *  hooves and lies along the ground), and it sweeps like a sundial while the clock races, settling at the lock. */
const YAW = 0.38;                    // the bull turned ~22° toward the viewer (head to the right and forward)
const ELEV = 0.52;                   // camera elevation (rad, ~30°): ground depth x sin, heights x cos
function drawLens(ctx0, v, cx, cy, r, sc, t) {
  let ctx = ctx0;
  const K = 52 * sc;   // 15b: the rebuilt bull a little larger in the loupe
  const se = Math.sin(ELEV), ce = Math.cos(ELEV), cy0 = Math.cos(YAW), sy0 = Math.sin(YAW);
  const ox = cx - 6 * sc, oy = cy + 34 * sc;                  // plinth centre (ground level) in the lens
  // bull-local (x: rump -> nose, y: + toward the viewer's side, z: up) -> screen
  const proj = (x, y, z) => {
    const gx = x * cy0 - y * sy0, gy = x * sy0 + y * cy0;
    return [ox + gx * K, oy + gy * K * se - z * K * ce];
  };
  const sway = (ph, f = 1) => L.noise1(v.gt * 0.6 * f + ph, 7) * 0.08;
  // sun: the shadow direction on the ground (bull-local), sweeping while the clock races, settling at the lock
  const sw = 1 - L.ease.outCubic(L.prog(t, T_OPEN - 0.2, T_LOCK - T_OPEN + 0.2));
  const sa = S_FINAL - 2.2 * sw;                                 // final: forward and away from the viewer
  const S = { x: Math.cos(sa), y: Math.sin(sa) };
  const cot = 1.7;                                               // 15b: a low sun (~30°) behind the statue: backlit bronze, the shadow runs toward us
  const shadowOf = (x, y, z, base) => proj(x + S.x * (z - base) * cot, y + S.y * (z - base) * cot, base);

  ctx.save();
  ctx.beginPath(); ctx.arc(cx, cy, Math.max(0, r), 0, Math.PI * 2); ctx.clip();
  // the clearing floor, receding: warm near, darker toward the trees behind
  const fg = ctx.createLinearGradient(0, cy - r, 0, cy + r);
  fg.addColorStop(0, '#5a5236'); fg.addColorStop(0.45, '#4a4a34'); fg.addColorStop(1, '#46462f');
  ctx.fillStyle = fg; ctx.fillRect(cx - r, cy - r, 2 * r, 2 * r);
  // the cobbles of Bowling Green (granite setts, worn and mossy), cached once and laid in perspective
  const CB = cobbles(se, cy0, sy0), cs = K / CB.k;
  ctx.save(); ctx.filter = 'blur(0.6px)';
  ctx.drawImage(CB.cv, ox - CB.ax * cs, oy - CB.ay * cs, CB.cv.width * cs, CB.cv.height * cs);
  ctx.restore();
  const gr = L.rng(717);
  for (let i = 0; i < 120; i++) {
    const x = ox + (gr() - 0.5) * 15 * K, y = oy + (gr() - 0.5) * 15 * K * se, rr = (0.05 + gr() * 0.09) * K;
    ctx.fillStyle = gr() < 0.65 ? `rgba(120,140,70,${0.1 + gr() * 0.12})` : `rgba(170,120,66,${0.08 + gr() * 0.12})`;
    ctx.beginPath(); ctx.ellipse(x, y, Math.max(0, rr * 1.6), Math.max(0, rr * 0.7), 0, 0, Math.PI * 2); ctx.fill();
  }
  // trees: those behind the statue first
  const drawTree = (tr) => {
    const grow = tr.s < 1.5 ? L.ease.outCubic(L.prog(t, T_OPEN, 1.4)) : 1;
    if (grow <= 0.01) return;
    const [bx, by] = [ox + (tr.x + sway(tr.ph)) * K, oy + tr.y * K * se];
    const top = by - tr.s * 1.7 * K * ce * grow;
    ctx.fillStyle = 'rgba(6,12,10,0.25)';                       // ground shadow
    ctx.beginPath(); ctx.ellipse(bx + S.x * tr.s * K * 0.8, by + S.y * tr.s * K * se * 0.8, Math.max(0, tr.s * K * 0.8), Math.max(0, tr.s * K * 0.35), 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = 'rgba(30,24,18,0.9)'; ctx.lineWidth = Math.max(1, 0.18 * K * grow);
    ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(bx, top + tr.s * 0.4 * K); ctx.stroke();
    const rr = L.rng(Math.floor(tr.ph * 1000));
    const base = L.mix([24, 52, 30], [38, 70, 36], tr.tone);
    for (const [col, off, sz] of [[L.mix(base, [6, 14, 10], 0.45), 0, 1.08], [base, -0.12, 0.9], [L.mix(base, [196, 190, 110], 0.38), -0.36, 0.45]]) {
      ctx.fillStyle = L.rgba(col);
      const r2 = L.rng(Math.floor(tr.ph * 1000));
      for (let q = 0; q < 6 + tr.n; q++) {
        const a = r2() * 6.283, d = Math.sqrt(r2()) * tr.s * 0.6, s2 = tr.s * (0.3 + r2() * 0.22) * grow;
        const x = bx + Math.cos(a) * d * K + S.x * off * s2 * K * -1, y = top + Math.sin(a) * d * K * 0.75 - S.y * off * s2 * K;
        ctx.beginPath(); ctx.arc(x, y, Math.max(0, s2 * K * sz), 0, Math.PI * 2); ctx.fill();
      }
    }
    void rr;
  };
  const back = TREES.filter((tr) => tr.y < 1.2).sort((p, q) => p.y - q.y), front = TREES.filter((tr) => tr.y >= 1.2 && Math.abs(tr.x) > 6.5);
  // out of focus behind and in front of the statue (a long lens), so the bronze is the only crisp thing in the loupe
  const blurred = (list, px) => {
    const TL = treeLayer(), hw = TL.width / 2, tg = TL.getContext('2d');
    tg.setTransform(1, 0, 0, 1, 0, 0); tg.clearRect(0, 0, TL.width, TL.height);
    tg.setTransform(1, 0, 0, 1, hw - cx, hw - cy);
    const keep = ctx; ctx = tg; list.forEach(drawTree); ctx = keep;
    ctx.save(); ctx.filter = `blur(${(px * sc).toFixed(2)}px)`; ctx.drawImage(TL, cx - hw, cy - hw); ctx.restore();
  };
  blurred(back, 2.6);
  // shadows: the plinth onto the ground, then (over the plinth) the bull, cast from its hooves along the sun
  const SL = shadowLayer(), half = SL.width / 2, g = SL.getContext('2d');
  const PL = PLINTH.l / 2, PW = PLINTH.w / 2, PH = PLINTH.h;
  const box = [[-PL, -PW], [PL, -PW], [PL, PW], [-PL, PW]];
  const layer = (paint) => {
    g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, SL.width, SL.height);
    g.setTransform(1, 0, 0, 1, half - cx, half - cy);
    g.fillStyle = 'rgb(8,12,18)'; g.strokeStyle = 'rgb(8,12,18)';
    paint();
    ctx.save();
    ctx.globalAlpha *= 0.6;
    ctx.filter = `blur(${(0.8 * sc).toFixed(2)}px)`;
    ctx.drawImage(SL, cx - half, cy - half);
    ctx.restore();
  };
  if (PH > 0) layer(() => {
    const hp = [];
    for (const [x, y] of box) hp.push(proj(x, y, 0), shadowOf(x, y, PH, 0));
    g.beginPath(); hull(hp).forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.fill();
  });
  // plinth: a granite block (top lit, front face shaded, the visible end face darker), lichen
  const faces = [
    { pts: [[-PL, -PW, PH], [PL, -PW, PH], [PL, PW, PH], [-PL, PW, PH]], col: '#a3a096' },
    { pts: [[-PL, PW, PH], [PL, PW, PH], [PL, PW, 0], [-PL, PW, 0]], col: '#6c6a63' },
    { pts: [[PL, -PW, PH], [PL, PW, PH], [PL, PW, 0], [PL, -PW, 0]], col: '#57564f' },
  ];
  if (PH > 0) for (const f of faces.slice(1).concat(faces[0])) {
    ctx.beginPath(); f.pts.forEach(([x, y, z], i) => { const [px, py] = proj(x, y, z); i ? ctx.lineTo(px, py) : ctx.moveTo(px, py); }); ctx.closePath();
    ctx.fillStyle = f.col; ctx.fill();
    ctx.strokeStyle = 'rgba(20,20,18,0.5)'; ctx.lineWidth = 1; ctx.stroke();
  }
  const lr = L.rng(51);
  for (let i = 0; i < (PH > 0 ? 8 : 0); i++) {
    const [lx, ly] = proj((lr() - 0.5) * PLINTH.l * 0.9, PW, PH * (0.2 + 0.6 * lr()));
    ctx.fillStyle = `rgba(${lr() < 0.5 ? '96,128,70' : '150,150,110'},${0.25 + lr() * 0.3})`;
    ctx.beginPath(); ctx.ellipse(lx, ly, Math.max(0, (0.2 + lr() * 0.4) * K), Math.max(0, 0.06 * K), 0, 0, Math.PI * 2); ctx.fill();
  }
  layer(() => drawBullShadow(g, (x, y, z) => shadowOf(x, y, z + PH, PH), K, YAW, ELEV));
  // the bull itself, standing on the plinth
  drawBull(ctx, { ox, oy: oy - PH * K * ce, K, S, cot, YAW, ELEV });
  // a slow glint travelling along the spine as the clock locks (the polished back catching the settled sun)
  const gk = L.prog(t, T_LOCK - 0.1, 0.9);
  if (gk > 0 && gk < 1) {
    const u = L.ease.inOutCubic(gk) * (SPINE.length - 1), i = Math.min(SPINE.length - 2, Math.floor(u)), f = u - i;
    const [gx, gz] = [L.lerp(SPINE[i][0], SPINE[i + 1][0], f), L.lerp(SPINE[i][1], SPINE[i + 1][1], f)];
    const [px, py] = proj(gx - XC, 0, gz + PH);
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    L.lightBlob(ctx, px, py, 0.5 * K, [255, 226, 170], 0.4 * Math.sin(Math.PI * gk));
    ctx.restore();
  }
  blurred(front, 4);
  // low golden light from the sun side, cool shade opposite; inner lens vignette
  const lg = ctx.createLinearGradient(cx - S.x * r, cy - S.y * r, cx + S.x * r, cy + S.y * r);
  lg.addColorStop(0, 'rgba(255,196,120,0.24)'); lg.addColorStop(0.5, 'rgba(255,196,120,0)'); lg.addColorStop(1, 'rgba(20,34,60,0.2)');
  ctx.fillStyle = lg; ctx.fillRect(cx - r, cy - r, 2 * r, 2 * r);
  const vg = ctx.createRadialGradient(cx, cy, r * 0.6, cx, cy, r);
  vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(2,6,10,0.42)');
  ctx.fillStyle = vg; ctx.fillRect(cx - r, cy - r, 2 * r, 2 * r);
  // name tag: CHARGING BULL (bronze, Bowling Green)
  const bk = L.ease.outCubic(L.prog(t, T_OPEN + 0.55, 0.45)) * (1 - L.ease.inCubic(L.prog(t, v.d - 0.9, 0.28)));
  if (bk > 0) {
    ctx.save();
    ctx.globalAlpha *= bk;
    ctx.font = L.font(26, 700, L.FONT.body);   // 15b: ≥ 26 px house rule
    ctx.letterSpacing = '2px';
    const w = ctx.measureText('CHARGING BULL').width;
    ctx.letterSpacing = '0px';
    const tx = cx - w / 2, ty = cy + 150 * sc;
    ctx.fillStyle = 'rgba(8,10,12,0.9)';
    L.roundRect(ctx, tx - 14, ty - 21, w + 26, 42, 8); ctx.fill();
    ctx.strokeStyle = L.rgba(BRONZE_HI, 0.7); ctx.lineWidth = 1; ctx.stroke();
    ctx.fillStyle = L.rgba([246, 214, 160]);
    ctx.textBaseline = 'middle';
    L.trackedText(ctx, 'CHARGING BULL', tx, ty + 1, 2, 'left');
    ctx.restore();
  }
  // glass reflection
  const rg = ctx.createLinearGradient(cx - r, cy - r, cx, cy);
  rg.addColorStop(0, 'rgba(255,255,255,0.10)'); rg.addColorStop(0.5, 'rgba(255,255,255,0.02)'); rg.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = rg;
  ctx.beginPath(); ctx.arc(cx, cy, r * 0.93, Math.PI * 0.95, Math.PI * 1.55); ctx.arc(cx + r * 0.12, cy + r * 0.12, r * 0.86, Math.PI * 1.55, Math.PI * 0.95, true); ctx.fill();
  ctx.restore();
}

let SHADOW_LAYER = null, TREE_LAYER = null;
function treeLayer() { return TREE_LAYER || (TREE_LAYER = new OffscreenCanvas(620, 620)); }

/** The Bowling Green cobbles: granite setts in courses along the bull, ~0.22 x 0.12 m, worn tops, dark joints, moss in
 *  the gaps, fading out into the forest floor ~6 m away. Drawn once at k px/m in the loupe's fixed projection. */
let COBBLES = null;
function cobbles(se, cy0, sy0) {
  if (COBBLES) return COBBLES;
  const k = 80, half = 7.2, Wc = Math.ceil(2 * half * k), Hc = Math.ceil(2 * half * k * se) + 4;
  const cv = new OffscreenCanvas(Wc, Hc), g = cv.getContext('2d');
  const ax = Wc / 2, ay = Hc / 2;
  const P = (x, y) => [ax + (x * cy0 - y * sy0) * k, ay + (x * sy0 + y * cy0) * k * se];
  const r = L.rng(4401);
  const SW = 0.3, SH = 0.17;
  for (let j = -46; j <= 46; j++) {
    const y = j * SH, off = (j % 2) * SW * 0.5;
    for (let i = -26; i <= 26; i++) {
      const x = i * SW + off, d = Math.hypot(x, y * 1.15);
      const cover = L.clamp((6.4 - d) / 1.8) * (0.55 + 0.45 * L.noise1(x * 0.7 + y * 0.3, 9) + 0.25);
      if (r() > cover) continue;
      const tone = r(), wear = r();
      const q = [[x + 0.012, y + 0.01], [x + SW - 0.014, y + 0.012], [x + SW - 0.01, y + SH - 0.014], [x + 0.014, y + SH - 0.012]].map(([a, b]) => P(a + (r() - 0.5) * 0.02, b + (r() - 0.5) * 0.02));
      g.beginPath(); q.forEach(([a, b], n) => (n ? g.lineTo(a, b) : g.moveTo(a, b))); g.closePath();
      const base = L.mix([104, 96, 80], [160, 148, 124], tone), moss = L.clamp((d - 3.2) / 3) * (0.4 + 0.5 * r());
      g.fillStyle = L.rgba(L.mix(base, [62, 78, 44], moss), L.clamp(cover * 1.4));
      g.fill();
      // the worn, rounded top catches the light (upper left), the lower edge darkens
      const [cxs, cys] = P(x + SW * 0.45, y + SH * 0.4);
      const hl = g.createRadialGradient(cxs - 2, cys - 2, 0, cxs, cys, SW * k * 0.55);
      hl.addColorStop(0, `rgba(186,180,166,${0.06 + 0.12 * wear})`); hl.addColorStop(1, 'rgba(196,190,176,0)');
      g.fillStyle = hl; g.fill();
      g.strokeStyle = 'rgba(14,16,14,0.55)'; g.lineWidth = 1.2; g.stroke();
    }
  }
  COBBLES = { cv, k, ax, ay };
  return COBBLES;
}
function shadowLayer() { return SHADOW_LAYER || (SHADOW_LAYER = new OffscreenCanvas(620, 620)); }

// convex hull (monotone chain) for the plinth's shadow
function hull(pts) {
  const p = [...pts].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const cr = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lo = [], up = [];
  for (const q of p) { while (lo.length >= 2 && cr(lo[lo.length - 2], lo[lo.length - 1], q) <= 0) lo.pop(); lo.push(q); }
  for (const q of p.reverse()) { while (up.length >= 2 && cr(up[up.length - 2], up[up.length - 1], q) <= 0) up.pop(); up.push(q); }
  return [...lo.slice(0, -1), ...up.slice(0, -1)];
}

function drawFrame(ctx, cx, cy, r, k, gt, accent) {
  if (r < 2) return;
  ctx.save();
  // drop shadow + bezel
  ctx.shadowColor = 'rgba(0,0,0,0.6)'; ctx.shadowBlur = 28;
  ctx.strokeStyle = 'rgba(14,16,22,0.95)'; ctx.lineWidth = 9;
  ctx.beginPath(); ctx.arc(cx, cy, r + 4, 0, Math.PI * 2); ctx.stroke();
  ctx.shadowBlur = 0;
  ctx.strokeStyle = L.rgba(accent, 0.9 * k); ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(cx, cy, r + 1, 0, Math.PI * 2); ctx.stroke();
  ctx.strokeStyle = `rgba(255,255,255,${0.22 * k})`; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.arc(cx, cy, Math.max(0, r - 6), 0, Math.PI * 2); ctx.stroke();
  // bezel ticks (slowly turning: secondary motion)
  ctx.strokeStyle = `rgba(235,230,222,${0.38 * k})`;
  ctx.lineWidth = 1.2;
  const rot = gt * 0.04;
  ctx.beginPath();
  for (let i = 0; i < 72; i++) {
    const a = rot + (i / 72) * Math.PI * 2, major = i % 6 === 0;
    const r0 = r + 11, r1 = r + (major ? 22 : 16);
    ctx.moveTo(cx + Math.cos(a) * r0, cy + Math.sin(a) * r0); ctx.lineTo(cx + Math.cos(a) * r1, cy + Math.sin(a) * r1);
  }
  ctx.stroke();
  ctx.restore();
}

export default {
  beat: 9,
  chapter: { num: '09', title: 'Bronze', sub: 'Millions of years' },
  captions: true,
  layer: 2,
  cues(d) {
    return [
      { t: T_MARK, name: 'blip', gain: 0.22, pitch: 1.1 },
      { t: T_LEAD + 0.05, name: 'swish', gain: 0.18, pitch: 1.2 },
      { t: T_OPEN, name: 'bloom', gain: 0.26, pitch: 0.9 },
      { t: T_OPEN + 0.2, name: 'creak', gain: 0.1, pitch: 0.8 },
      { t: T_LOCK, name: 'tick', gain: 0.34, pitch: 0.9 },
      { t: T_LOCK + 0.02, name: 'deep', gain: 0.24, pitch: 0.8 },
      { t: d - 0.62, name: 'swish', gain: 0.14, pitch: 0.9 },
    ];
  },
  drawWorld(ctx, v) {
    // a warm glint where the plaza was: the bronze still there under the forest
    const t = v.t;
    const k = L.ease.outCubic(L.prog(t, T_MARK - 0.2, 0.5)) * (1 - L.prog(t, v.d + 0.4, 1.2));
    if (k <= 0 || v.cam.mpp > 2000) return;
    const x = v.wx(PLAZA.x), y = v.wy(PLAZA.y);
    glowDot(ctx, x, y, 22, [255, 200, 130], 0.45 * k);
    ctx.fillStyle = `rgba(255,230,190,${0.95 * k})`;
    ctx.beginPath(); ctx.arc(x, y, 2.4, 0, Math.PI * 2); ctx.fill();
  },
  drawOverlay(ctx, v) {
    const t = v.t;
    const px = v.wx(PLAZA.x), py = v.wy(PLAZA.y);
    // marker ring at the plaza
    const mk = L.ease.outBack(L.prog(t, T_MARK, 0.45)) * v.k;
    if (mk > 0) {
      ctx.save();
      ctx.strokeStyle = L.rgba(v.accent, 0.85 * Math.min(1, mk));
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(px, py, Math.max(0, 13 * mk), 0, Math.PI * 2); ctx.stroke();
      const pulse = ((t - T_MARK) % 1.4) / 1.4;
      if (t > T_MARK) {
        ctx.strokeStyle = L.rgba(v.accent, 0.5 * (1 - pulse) * v.k);
        ctx.beginPath(); ctx.arc(px, py, Math.max(0, 13 + 26 * L.ease.outCubic(pulse)), 0, Math.PI * 2); ctx.stroke();
      }
      ctx.restore();
    }
    // leader from the plaza to the lens edge
    const dx = px - LENS.x, dy = py - LENS.y, dl = Math.hypot(dx, dy);
    const qx = LENS.x + (dx / dl) * (LENS.r + 4), qy = LENS.y + (dy / dl) * (LENS.r + 4);
    const close = L.ease.inOutCubic(L.prog(t, v.d - 0.62, 0.42));      // 15b: ~13 frames, a fade in place
    const lk = L.prog(t, T_LEAD, 0.25) * (1 - L.prog(t, v.d - 0.3, 0.2));
    if (lk > 0) {
      const e = L.ease.outCubic(lk);
      ctx.save();
      ctx.strokeStyle = L.rgba(v.accent, 0.8 * v.k);
      ctx.lineWidth = 2;
      const sx = px + (dx / dl) * -15, sy = py + (dy / dl) * -15;
      ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(L.lerp(sx, qx, e), L.lerp(sy, qy, e)); ctx.stroke();
      ctx.restore();
    }
    // label
    L.bigLabel(ctx, { x: 64, y: 474, big: 'MILLIONS OF YEARS', small: 'bronze keeps its shape', k: v.k * L.enter(t, T_CARD, 0.45), accent: v.accent, size: 76 });
    // the loupe: inflates from the leader tip, closes back into it
    const open = L.ease.outCubic(L.prog(t, T_OPEN, 0.6));
    if (open <= 0.001 || close >= 0.999) return;
    const r = LENS.r * L.ease.outBack(Math.min(1, open), 1.1) * (1 - 0.05 * close);
    const cx = L.lerp(qx, LENS.x, open), cy = L.lerp(qy, LENS.y, open);
    ctx.save();
    ctx.globalAlpha *= v.k * L.clamp(open * 3) * (1 - close);
    drawLens(ctx, v, cx, cy, Math.max(0, r), L.lerp(0.6, 1, open) * (1 + 0.025 * L.prog(t, T_OPEN, v.d - T_OPEN)), t);
    drawFrame(ctx, cx, cy, Math.max(0, r), open, v.gt, v.accent);
    ctx.restore();
  },
};
