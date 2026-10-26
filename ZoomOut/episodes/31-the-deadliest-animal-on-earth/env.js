// Environment for "The Deadliest Animal on Earth" (Zoom Out 31). One continuous dark data space.
//
// DRAWS (every frame):
//   drawBackground  near-black space, a faint world-space dot grid and three parallax dust layers (they stream past
//                   during the dive), macro bokeh at high zoom, a sparing red ambient.
//   drawForeground  THE LEADERBOARD (world space, layout.js CH): an honest horizontal bar chart of deaths per year that
//                   RESCALES as each animal enters (axis max 10 → 150,000 → 500,000 → 700,000), rows re-sort live
//                   (#1 at the top). Sharks' ≈ 6 becomes a sub-pixel bar: a loupe shows it magnified by an honest,
//                   labelled factor. Then the HEROES: each animal's big silhouette (screen space) that docks into its
//                   row icon. The mosquito lives in the #1 icon slot in world space: the camera dives into it (beat 5).
//   drawHud         top bar.
// FACTS (script.md FACT-CHECK): sharks ≈ 6 (ISAF) · snakes 81,000–138,000 (WHO) · rabies ≈ 59,000 (WHO; dogs cause up
// to 99 % of human cases) · homicides ≈ 460,000 shown (UNODC: 458,000 in 2021; the bar keeps 450,000) · malaria 610,000 in 2024 (WHO WMR 2025),
// ≈ 95 % in the WHO African Region, ≈ 3 in 4 children under 5.
import * as L from '../../../engine/runtime/lib.js';
import { topBar } from '../../../engine/runtime/kit.js';
import { drawAnimal, fitScale } from './animals.js';
import { zoomAt, diveK } from './camera.js';
import { B, BE, PH, W8, gq, CH, iconAt, HERO, NUM_Y, SUB_Y, MOSQ } from './layout.js';

const { W, H } = L;
export const RED = [230, 60, 60];
export const INKW = [236, 238, 242];
export const GREYT = [150, 158, 172];
export const STEEL = [176, 186, 202];

// ------------------------------------------------------------------ rows (the data)
// val: the bar (and the dot count) · disp: the number shown when it differs (homicides: the bar keeps 450,000, the
// label shows UNODC's 2021 figure ≈ 460,000)
export const ROWS = [
  { id: 'shark', kind: 'shark', name: 'SHARKS', val: 6, pre: '≈ ' },
  { id: 'snake', kind: 'snake', name: 'SNAKES', note: '81,000–138,000', val: 138000, lo: 81000, pre: 'UP TO ' },
  { id: 'dog', kind: 'dog', name: 'DOGS', note: 'RABIES', val: 59000, pre: '≈ ' },
  { id: 'human', kind: 'human', name: 'HUMANS', note: 'HOMICIDES', val: 450000, disp: 460000, pre: '≈ ' },
  { id: 'mosq', kind: 'mosquito', name: 'MOSQUITOES', note: 'MALARIA ALONE', val: 610000, pre: '≈ ' },
];
const BYID = Object.fromEntries(ROWS.map((r) => [r.id, r]));
// a new row enters in three clean steps: the rows below move down (SHIFT), then the new row slides in (SLIDE), then —
// if its value needs a bigger axis — the axis rescales (RESCALE: old tick labels out, bars shrink, new ticks in),
// and only then does the new bar grow (c0 → c1, landing ON the spoken number).
const SHIFT = 0.3, SLIDE = 0.3, RESC = 0.55;
/**
 * per-row timing (global s): appear (rows shift), pre (prefix + blurred odometer appear, with the spoken lead-in),
 * c0/c1 (bar grows / value revealed ON the spoken number), rs ([start, dur] of the axis rescale it causes, or null)
 */
export function rowT(tl, id) {
  switch (id) {
    case 'shark': { const c0 = W8(tl, 'six', -0.55); return { appear: B(tl, 1, 0.35), pre: c0, c0, c1: W8(tl, 'six', 0.02), rs: null }; }
    case 'snake': {
      const c0 = W8(tl, 'snakeHundred', -0.02), r0 = c0 - 0.1 - RESC;
      return { appear: r0 - 0.6, pre: W8(tl, 'upTo', -0.04), c0, c1: W8(tl, 'snakeThousand', 0.03), rs: [r0, RESC] };
    }
    case 'dog': { const c0 = W8(tl, 'sixty', -0.35); return { appear: c0 - 0.75, pre: c0, c0, c1: W8(tl, 'dogThousand', 0.03), rs: null }; }
    case 'human': {
      const c0 = W8(tl, 'four', -0.1), r0 = c0 - 0.1 - RESC;
      return { appear: r0 - 0.6, pre: c0, c0, c1: W8(tl, 'humThousand', 0.03), rs: [r0, RESC] };
    }
    case 'mosq': {
      // its axis stage is set while the camera is inside the macro shot (the board is off screen): no visible jump
      const c0 = W8(tl, 'malSix', -0.05);
      return { appear: B(tl, 5, 0.25), pre: c0, c0, c1: W8(tl, 'malThousand', 0.03), rs: [W8(tl, 'tiny', 1.75), RESC] };
    }
  }
  return null;
}
/** 0..1 bar progress (frame-quantised) */
export function countE(tl, id, gt) {
  const r = rowT(tl, id);
  return L.ease.outCubic(L.prog(gq(gt), r.c0, r.c1 - r.c0));
}
/** {landed, started}: the value is only ever shown once landed (no in-between numbers) */
export function countVal(tl, id, gt) {
  const r = rowT(tl, id), g = gq(gt);
  return { landed: g >= r.c1 - 1e-6, started: g >= r.pre, growing: g >= r.c0 };
}
export const fmtN = (n) => L.fmt(n);
export const shownVal = (id) => BYID[id].disp ?? BYID[id].val;

// axis stages: [max, ticks]
const STAGES = [
  { max: 10, ticks: [0, 5, 10] },
  { max: 150000, ticks: [0, 50000, 100000, 150000] },
  { max: 500000, ticks: [0, 100000, 200000, 300000, 400000, 500000] },
  { max: 700000, ticks: [0, 200000, 400000, 600000] },
];
const rescales = (tl) => ['snake', 'human', 'mosq'].map((id, i) => ({ t0: rowT(tl, id).rs[0], d: rowT(tl, id).rs[1], to: i + 1 }));
/**
 * axis state at gt: {max, lines: [{si, a}], labels: [{si, a}], loupe (0..1: settled at a magnified stage)}
 * old tick labels fade out (0.15 s) before the bars move; the new labels fade in only once the axis has settled.
 */
export function axisAt(tl, gt) {
  const R = rescales(tl);
  let cur = 0, act = null;
  for (const r of R) if (gt >= r.t0) { cur = r.to; act = r; }
  if (!act) return { max: STAGES[0].max, lines: [{ si: 0, a: 1 }], labels: [{ si: 0, a: 1 }], loupe: 0 };
  const e = L.ease.inOutCubic(L.prog(gt, act.t0, act.d));
  const from = cur - 1;
  const max = Math.exp(L.lerp(Math.log(STAGES[from].max), Math.log(STAGES[cur].max), e));
  const labIn = L.ease.outCubic(L.prog(gt, act.t0 + act.d, 0.2));
  const labOut = 1 - L.prog(gt, act.t0, 0.15);
  const lines = [{ si: from, a: 1 - e }, { si: cur, a: L.prog(gt, act.t0 + act.d * 0.6, act.d * 0.4 + 0.1) }];
  const labels = [{ si: from, a: labOut }, { si: cur, a: labIn }];
  // the loupe (shark's sub-pixel bar) shows its factor only on a settled axis: it goes as a rescale starts, returns after
  let loupe;
  if (gt < act.t0 + act.d) loupe = from >= 1 ? 1 - L.prog(gt, act.t0, 0.1) : 0;
  else loupe = L.ease.outCubic(L.prog(gt, act.t0 + act.d + 0.05, 0.25));
  return { max, lines, labels, loupe };
}

// ranks: rows present at gt sorted by value
const present = (tl, gt) => ROWS.filter((r) => gt >= rowT(tl, r.id).appear);
function rankAt(tl, id, gt) {
  const p = present(tl, gt).sort((a, b) => b.val - a.val);
  return p.findIndex((r) => r.id === id);
}
const lastEvent = (tl, gt) => {
  const evs = ROWS.map((r) => rowT(tl, r.id).appear).filter((t) => t <= gt).sort((a, b) => a - b);
  return evs[evs.length - 1];
};
/** animated rank position (float): existing rows move down first (SHIFT); the new row holds its final slot */
export function rankPos(tl, id, gt) {
  const ev = lastEvent(tl, gt);
  if (ev == null) return 0;
  const before = rankAt(tl, id, ev - 1e-4), after = rankAt(tl, id, ev + 1e-4);
  if (before < 0) return after;
  return L.lerp(before, after, L.ease.inOutCubic(L.prog(gt, ev, SHIFT)));
}
/** the new row's entry (0..1): slides in once the others have made room */
export function rowIn(tl, id, gt) { return L.ease.outCubic(L.prog(gt, rowT(tl, id).appear + SHIFT - 0.05, SLIDE)); }
/** rank label shown at gt: {txt, a} — swapped only once the board has settled; no rank while a row is alone */
function rankLabel(tl, id, gt) {
  const ev = lastEvent(tl, gt);
  const settle = ev + SHIFT + SLIDE;
  const before = rankAt(tl, id, ev - 1e-4), after = rankAt(tl, id, ev + 1e-4);
  const nB = present(tl, ev - 1e-4).length, nA = present(tl, ev + 1e-4).length;
  const isNew = before < 0;
  if (isNew) return { r: after, a: nA > 1 ? L.clamp((gt - settle - 0.08) / 0.15) : 0 };   // no duplicate ranks mid-move
  if (gt < settle - 0.08) return { r: before, a: nB > 1 ? 1 : 0 };
  if (gt < settle + 0.08) return { r: after, a: nA > 1 && before === after && nB > 1 ? 1 : 0 };
  return { r: after, a: nA > 1 ? L.clamp((gt - settle - 0.08) / 0.15) : 0 };
}
/** rows' effective count (the panel grows with its rows) */
function rowCount(tl, gt) {
  return ROWS.reduce((s, r) => s + L.ease.inOutCubic(L.prog(gt, rowT(tl, r.id).appear, SHIFT)), 0);
}

// ------------------------------------------------------------------ chart placement
/** chart vertical offset (beat 7: the board slides down BEFORE the question card arrives) */
export const chartDy = (tl, gt) => 178 * L.ease.inOutCubic(L.prog(gt, B(tl, 7, -0.4), 0.55));
/** chart visibility (fades out early in the dive, back in only at the very end of the pull-out) */
export function chartK(v) {
  const z = zoomAt(v.gt, v.tl);
  // gone by z 2.2 / back from z 2.2 — its own zoom is capped (chartZ) and centred, so it never flies in huge or off-frame
  return 1 - L.smoothstep(L.clamp((z - 1.1) / 1.1));
}
/** the board's own zoom: follows the camera at rest, but only a quarter of any zoom beyond 1.05 (it never flies in huge) */
const chartZ = (z) => (z <= 1.05 ? z : 1.05 + (z - 1.05) * 0.12);
const panelIn = (tl, gt) => L.ease.outCubic(L.prog(gt, B(tl, 1, 0.1), 0.55));

// icon fit box (world px)
const ICON = { w: 62, h: 42 };
const MOSQ_ICON = { w: 46, h: 36 };   // "number one is tiny": the mosquito is the smallest icon
export const mosqIconBox = MOSQ_ICON;

// ------------------------------------------------------------------ heroes (screen space)
const HEROBOX = {
  shark: { w: 700, h: 330 },
  snake: { w: 820, h: 340 },
  dog: { w: 520, h: 360 },
  human: { w: 300, h: 380 },
};
/** dock window (global s): the hero flies into its row icon */
export function dockT(tl, id) {
  switch (id) {
    case 'shark': return [BE(tl, 1, -1.0), 0.65];
    case 'snake': return [PH(tl, 2, 1, 'start', -0.55), 0.6];
    case 'dog': return [W8(tl, 'rabies', -0.5), 0.6];   // cross-fades with the rabies virion landing on "rabies"
    case 'human': return [BE(tl, 4, -0.8), 0.65];
  }
  return null;
}
const heroIn = (tl, id) => ({ shark: 0, snake: B(tl, 2, 0.02), dog: B(tl, 3, 0.02), human: B(tl, 4, 0.02) })[id];
/** the hook's shark: big, centred low in the frame under the headline */
export const HOOK_SHARK = { y: 845, w: 940, h: 500 };

/** screen-space icon centre of a row at gt: {x, y, s (px per world px)} — same transform as the board */
function iconScreen(v, id) {
  const rp = rankPos(v.tl, id, v.gt);
  const ic = iconAt(0);
  const T = chartXf(v);
  const wy = ic.y + rp * CH.pitch;
  return { x: T.x(ic.x), y: T.y(wy), s: T.s };
}

function heroState(v, id) {
  const tl = v.tl, gt = v.gt;
  const [d0, dd] = dockT(tl, id);
  const dk = L.ease.inOutCubic(L.prog(gt, d0, dd));
  if (dk >= 1) return null;
  const t0 = heroIn(tl, id);
  if (gt < t0 - 0.01) return null;
  let x = HERO.cx, y = HERO.cy, bw = HEROBOX[id].w, bh = HEROBOX[id].h, a = 1;
  if (id === 'shark') {
    // the hook: big, centred under the headline, gliding; beat 1: rises into the hero zone
    const hk = L.ease.inOutCubic(L.prog(gt, B(tl, 1, -0.05), 0.95));
    const glide = L.lerp(-30, 30, L.clamp(gt / B(tl, 1)));
    x = L.lerp(540 + glide, HERO.cx, hk);
    y = L.lerp(HOOK_SHARK.y, HERO.cy, hk) + Math.sin(gt * 1.3) * 6;
    bw = L.lerp(HOOK_SHARK.w, bw, hk); bh = L.lerp(HOOK_SHARK.h, bh, hk);
  } else {
    const e = L.ease.outCubic(L.prog(gt, t0, 0.6));
    a = L.clamp(e * 1.6);
    const sc = L.lerp(0.9, 1, e);
    bw *= sc; bh *= sc;
    y += (1 - e) * 24 + Math.sin(gt * 1.1 + 1) * 4;
  }
  if (dk > 0) {
    const ic = iconScreen(v, id);
    // target: the fitted icon size in screen px
    const s1 = fitScale(BYID[id].kind, ICON.w, ICON.h) * ic.s, s0 = fitScale(BYID[id].kind, bw, bh);
    const s = Math.exp(L.lerp(Math.log(s0), Math.log(s1), dk));
    const k = s / s0;
    x = L.lerp(x, ic.x, dk); y = L.lerp(y, ic.y, dk) - Math.sin(Math.PI * dk) * 40;
    bw *= k; bh *= k;
  }
  return { x, y, w: bw, h: bh, a, dk };
}
/** has the hero landed in its icon slot? */
const docked = (tl, id, gt) => { const d = dockT(tl, id); return !d || gt >= d[0] + d[1]; };

/**
 * the board's transform at gt: world (x, y) -> screen. At rest it IS the camera transform. Zoomed (dive / pull-out),
 * it takes only a fraction of the zoom (chartZ), stays centred horizontally (never pushed off-frame) and keeps the #1
 * slot's height, so the board recedes / returns gently while the mosquito (true camera) leaves / re-enters its slot.
 */
function chartXf(v) {
  const z = 1 / v.cam.mpp, zc = chartZ(z);
  const f = L.clamp((1.3 - z) / 0.25);
  const cx = 540 + (v.wx(540) - 540) * f;
  const sy = v.wy(MOSQ.y);
  const dy = chartDy(v.tl, v.gt);
  return { s: zc, x: (wx) => cx + (wx - 540) * zc, y: (wy) => sy + (wy - MOSQ.y) * zc + dy, apply(c) { c.translate(cx, sy + dy); c.scale(zc, zc); c.translate(-540, -MOSQ.y); } };
}

// ------------------------------------------------------------------ background
const DUST = (() => {
  const r = L.rng(3101), out = [];
  for (let i = 0; i < 150; i++) out.push({ x: r() * W, y: r() * H, d: 0.35 + r() * 0.65, s: 0.6 + r() * 1.8, ph: r() * 6.28, sp: 0.2 + r() * 0.6 });
  return out;
})();
const BOKEH = (() => {
  const r = L.rng(3107), out = [];
  for (let i = 0; i < 26; i++) out.push({ x: r() * W, y: r() * 1500 + 100, r: 30 + r() * 110, red: r() < 0.3, a: 0.04 + r() * 0.07, ph: r() * 6.28 });
  return out;
})();
let bgGrad = null;
export function drawBackground(c, v) {
  const z = zoomAt(v.gt, v.tl);
  if (!bgGrad) {
    bgGrad = c.createRadialGradient(W / 2, H * 0.4, 0, W / 2, H * 0.45, H * 0.85);
    bgGrad.addColorStop(0, 'rgb(17,19,25)');
    bgGrad.addColorStop(0.55, 'rgb(10,11,15)');
    bgGrad.addColorStop(1, 'rgb(5,5,8)');
  }
  c.fillStyle = bgGrad;
  c.fillRect(0, 0, W, H);
  // sparing red ambient, low left (and behind the macro mosquito)
  L.lightBlob(c, 120, 1560, 700, [120, 24, 28], 0.10);
  const mk = L.smoothstep(L.clamp((Math.log(z) - Math.log(1.15)) / (Math.log(5.5) - Math.log(1.15))));   // the macro world arrives early in the dive (no near-empty dark frames)
  // world dot grid (fades as the camera dives)
  const gk = 1 - L.smoothstep(L.clamp((z - 1.2) / 1.5));
  if (gk > 0.01) {
    c.fillStyle = `rgba(150,165,190,${0.07 * gk})`;
    const step = 54;
    const x0 = Math.floor((v.cam.x - W / 2 * v.cam.mpp) / step) * step, x1 = v.cam.x + W / 2 * v.cam.mpp;
    const y0 = Math.floor((v.cam.y - H * 0.5 * v.cam.mpp) / step) * step, y1 = v.cam.y + H * 0.6 * v.cam.mpp;
    for (let x = x0; x <= x1; x += step) for (let y = y0; y <= y1; y += step) {
      const sx = v.wx(x), sy = v.wy(y);
      c.fillRect(sx - 1, sy - 1, 2, 2);
    }
  }
  // dust (3 parallax depths): world-anchored, so the dive streams them outward
  for (const p of DUST) {
    const zz = Math.pow(z, p.d);
    const dx = (p.x + Math.sin(v.gt * p.sp + p.ph) * 14 - v.cam.x) * zz, dy = (p.y - v.gt * 6 * p.d - v.cam.y) * zz;
    const sx = W / 2 + dx, sy = H * 0.47 + dy;
    if (sx < -20 || sx > W + 20 || sy < -20 || sy > H + 20) continue;
    const a = (0.12 + 0.2 * (0.5 + 0.5 * Math.sin(v.gt * 1.3 + p.ph))) * (0.5 + 0.5 * p.d);
    c.fillStyle = `rgba(200,210,228,${a})`;
    c.beginPath(); c.arc(sx, sy, Math.max(0, p.s * Math.min(4, zz) * 0.8), 0, Math.PI * 2); c.fill();
  }
  // macro bokeh + red back-light behind the mosquito
  if (mk > 0.01) {
    c.save();
    c.globalCompositeOperation = 'lighter';
    for (const b of BOKEH) {
      const x = b.x + Math.sin(v.gt * 0.3 + b.ph) * 30, y = b.y + Math.cos(v.gt * 0.25 + b.ph) * 20;
      const g = c.createRadialGradient(x, y, b.r * 0.6, x, y, b.r);
      const col = b.red ? [150, 40, 44] : [90, 100, 125];
      g.addColorStop(0, L.rgba(col, b.a * mk)); g.addColorStop(0.85, L.rgba(col, b.a * mk * 0.8)); g.addColorStop(1, L.rgba(col, 0));
      c.fillStyle = g; c.fillRect(x - b.r, y - b.r, b.r * 2, b.r * 2);
    }
    c.restore();
    const p = { x: v.wx(iconAt(0).x), y: v.wy(iconAt(0).y) };
    L.lightBlob(c, p.x + 60, p.y + 40, 760, [170, 36, 40], 0.22 * mk);
  }
}

// ------------------------------------------------------------------ the leaderboard
/** panel geometry for n (float) rows: the card grows with its rows (never a big empty card) */
const panelGeom = (n) => ({ h: 100 + CH.pitch * n, tickY: CH.row0 + CH.pitch * n + 28, gridB: CH.row0 + CH.pitch * n - 4 });

function drawPanel(c, v, k) {
  const tl = v.tl, gt = v.gt;
  const pin = panelIn(tl, gt);
  if (pin <= 0) return;
  const G = panelGeom(Math.max(1, rowCount(tl, gt)));
  // opaque plate, wiped open from the top (never see-through)
  const top = CH.top, h = G.h * pin;
  c.save();
  c.globalAlpha = k;
  c.shadowColor = 'rgba(0,0,0,0.6)'; c.shadowBlur = 40; c.shadowOffsetY = 10;
  c.fillStyle = 'rgb(13,14,19)';
  L.roundRect(c, CH.x, top, CH.w, h, 22); c.fill();
  c.shadowColor = 'transparent';
  c.strokeStyle = 'rgba(170,184,206,0.16)'; c.lineWidth = 1.5;
  L.roundRect(c, CH.x + 0.5, top + 0.5, CH.w - 1, h - 1, 22); c.stroke();
  c.restore();
}

function drawRows(c, v, k) {
  const tl = v.tl, gt = v.gt;
  const ck = k * L.ease.outCubic(L.prog(gt, B(tl, 1, 0.22), 0.4));   // contents follow the plate
  if (ck <= 0.002) return;
  const ax = axisAt(tl, gt);
  const G = panelGeom(Math.max(1, rowCount(tl, gt)));
  const BW = CH.bx1 - CH.bx0;
  c.save();
  c.beginPath(); c.rect(CH.x, CH.top, CH.w, G.h); c.clip();
  // header
  c.globalAlpha = ck;
  c.textBaseline = 'alphabetic';
  c.font = L.font(20, 600, L.FONT.body);
  c.fillStyle = L.rgba(GREYT, 0.95);
  L.trackedText(c, 'DEATHS PER YEAR, WORLDWIDE', CH.rankX - 6, CH.headY, 3);
  c.fillStyle = L.rgba(RED, 0.9);
  c.fillRect(CH.rankX - 6, CH.headY - 34, 36, 4);
  // gridlines (they slide with the rescale) and tick labels (old ones out before the bars move, new ones once settled)
  for (const { si, a } of ax.lines) {
    if (a <= 0.01) continue;
    for (const tv of STAGES[si].ticks) {
      const x = CH.bx0 + BW * tv / ax.max;
      if (x > CH.bx1 + 2) continue;
      c.fillStyle = `rgba(170,184,206,${(tv ? 0.08 : 0.22) * a})`;
      c.fillRect(x - 0.5, CH.row0 + 4, 1, G.gridB - CH.row0 - 4);
    }
  }
  c.font = L.font(19, 600, L.FONT.body);
  for (const { si, a } of ax.labels) {
    if (a <= 0.01) continue;
    for (const tv of STAGES[si].ticks) {
      const x = CH.bx0 + BW * tv / STAGES[si].max;   // labels sit at their SETTLED positions (they never slide)
      c.fillStyle = L.rgba(GREYT, 0.85 * a);
      c.textAlign = tv === 0 ? 'left' : x > CH.bx1 - 40 ? 'right' : 'center';
      c.fillText(L.fmt(tv), tv === 0 ? x - 2 : x > CH.bx1 - 40 ? x + 2 : x, G.tickY);
    }
  }
  c.textAlign = 'left';
  // rows
  for (const row of ROWS) {
    const rt = rowT(tl, row.id);
    if (gt < rt.appear) continue;
    const ain = rowIn(tl, row.id, gt);
    const top = CH.row0 + rankPos(tl, row.id, gt) * CH.pitch;
    const isM = row.id === 'mosq';
    const rl = rankLabel(tl, row.id, gt);
    c.save();
    c.globalAlpha = ck * ain;
    if (ain <= 0.001) { c.restore(); continue; }
    c.translate((1 - ain) * -36, 0);
    // rank (only once there is more than one row; swapped once the board has settled)
    if (rl.a > 0.01) {
      c.globalAlpha = ck * ain * rl.a;
      c.font = L.font(30, 700, L.FONT.din);
      c.fillStyle = rl.r === 0 ? L.rgba(RED) : L.rgba(GREYT, 0.9);
      c.textAlign = 'left';
      c.fillText(`#${rl.r + 1}`, CH.rankX - 6, top + 42);
      c.globalAlpha = ck * ain;
    }
    // name (+ note)
    const named = !isM || gt >= B(tl, 6, 0.9);
    c.font = L.font(25, 700, L.FONT.display);
    c.fillStyle = L.rgba(INKW, 0.95);
    let nx = CH.nameX;
    if (named) {
      nx += L.trackedText(c, row.name, nx, top + CH.nameDy, 2);
      if (row.note) {
        c.font = L.font(19, 600, L.FONT.body);
        c.fillStyle = L.rgba(isM ? RED : GREYT, 0.9);
        L.trackedText(c, `  ·  ${row.note}`, nx, top + CH.nameDy, 1.5);
      }
      if (row.id === 'shark' && ax.loupe > 0.01) {
        // the loupe's factor, in the name line (never over the bar track)
        c.save();
        c.globalAlpha *= ax.loupe;
        c.font = L.font(19, 600, L.FONT.body);
        c.fillStyle = L.rgba(GREYT, 0.95);
        L.trackedText(c, `  ·  MAGNIFIED ×${L.fmt(loupeZ(ax))} · TOO THIN TO SEE`, nx, top + CH.nameDy, 1.5);
        c.restore();
      }
    } else {
      c.font = L.font(25, 700, L.FONT.display);
      c.fillStyle = L.rgba(RED, 0.95);
      L.trackedText(c, 'NUMBER ONE?', nx, top + CH.nameDy, 2);
    }
    // value: a dash while the bar grows, the final value revealed as the bar lands (no in-between numbers)
    const cv = countVal(tl, row.id, gt);
    c.textAlign = 'right';
    if (cv.landed) {
      const pk = L.ease.outCubic(L.clamp((gq(gt) - rt.c1) / 0.16));
      c.save();
      c.globalAlpha *= pk;
      c.font = L.font(28, 800, L.FONT.display);
      c.fillStyle = isM ? L.rgba(RED) : L.rgba(INKW);
      const num = fmtN(shownVal(row.id));
      c.fillText(num, CH.valX, top + CH.nameDy);
      const wn = c.measureText(num).width;
      const approx = row.pre.trim() === '≈';
      c.font = L.font(approx ? 28 : 19, approx ? 800 : 700, approx ? L.FONT.display : L.FONT.body);
      c.fillStyle = L.rgba(isM ? RED : GREYT, 0.95);
      c.fillText(row.pre.trimEnd() + ' ', CH.valX - wn, top + CH.nameDy);
      c.restore();
    } else if (isM && !cv.growing) {
      // the mosquito's empty slot pulses before its bar exists
      const pu = 0.5 + 0.5 * Math.sin(gt * 5);
      c.font = L.font(28, 800, L.FONT.display);
      c.fillStyle = L.rgba(RED, 0.6 + 0.4 * pu);
      c.fillText('?', CH.valX, top + CH.nameDy);
    } else {
      c.font = L.font(28, 800, L.FONT.display);
      c.fillStyle = L.rgba(GREYT, 0.55);
      c.fillText('—', CH.valX, top + CH.nameDy);
    }
    c.textAlign = 'left';
    // bar track + bar
    const by = top + CH.barDy;
    c.fillStyle = 'rgba(255,255,255,0.045)';
    L.roundRect(c, CH.bx0, by, BW, CH.barH, 4); c.fill();
    const e = countE(tl, row.id, gt);
    const wv = BW * row.val * e / ax.max;
    if (wv > 0) {
      if (row.lo) {
        // snakes: solid to the low estimate, lighter hatched extension to the high one (a range, not a point)
        const wl = Math.min(wv, BW * row.lo / ax.max);
        const g = c.createLinearGradient(CH.bx0, 0, CH.bx1, 0);
        g.addColorStop(0, L.rgba(STEEL, 0.75)); g.addColorStop(1, L.rgba([214, 220, 232], 0.95));
        c.fillStyle = g;
        L.roundRect(c, CH.bx0, by, Math.max(1, wl), CH.barH, 3); c.fill();
        if (wv > wl) {
          c.save();
          c.fillStyle = L.rgba(STEEL, 0.28);
          L.roundRect(c, CH.bx0 + wl, by, wv - wl, CH.barH, 3); c.fill();
          c.beginPath(); c.rect(CH.bx0 + wl, by, wv - wl, CH.barH); c.clip();
          c.strokeStyle = L.rgba(STEEL, 0.55); c.lineWidth = 2;
          c.beginPath();
          for (let x = CH.bx0 + wl - 20; x < CH.bx0 + wv + 20; x += 8) { c.moveTo(x, by + CH.barH); c.lineTo(x + CH.barH, by); }
          c.stroke();
          c.restore();
        }
      } else {
        const g = c.createLinearGradient(CH.bx0, 0, CH.bx1, 0);
        if (isM) { g.addColorStop(0, L.rgba([170, 40, 44])); g.addColorStop(1, L.rgba(RED)); }
        else { g.addColorStop(0, L.rgba(STEEL, 0.75)); g.addColorStop(1, L.rgba([214, 220, 232], 0.95)); }
        c.fillStyle = g;
        if (wv >= 2) { L.roundRect(c, CH.bx0, by, wv, CH.barH, Math.min(3, wv / 2)); c.fill(); }
        else { c.fillRect(CH.bx0, by, wv, CH.barH); }
      }
    }
    // the loupe: sharks' bar is far below one pixel once the axis passes ~10,000
    if (row.id === 'shark' && ax.loupe > 0.01) drawLoupe(c, top, ax);
    c.restore();
  }
  c.restore();
}

/** the loupe's magnification for the current (settled) axis: 1-2-5 steps, so the drawn bar is exactly 6 × Z / max */
function loupeZ(ax) {
  const w1 = (CH.bx1 - CH.bx0) * 6 / ax.max;
  let Z = 1;
  for (const m of [1, 2, 5, 10, 20, 50, 100, 200, 500, 1000, 2000, 5000, 10000, 20000, 50000]) { if (w1 * m <= 30) Z = m; }
  return Z;
}
/** honest magnifier: the bar drawn at a stated, real magnification inside a loupe at the bar's start */
function drawLoupe(c, top, ax) {
  const BW = CH.bx1 - CH.bx0;
  const Z = loupeZ(ax);
  const r = 19, cx = CH.bx0 + 17, cy = top + CH.barDy + CH.barH / 2;
  c.save();
  c.globalAlpha *= ax.loupe;
  c.save();
  c.beginPath(); c.arc(cx, cy, r, 0, Math.PI * 2);
  c.fillStyle = 'rgb(18,20,27)'; c.fill();
  c.clip();
  c.fillStyle = 'rgba(255,255,255,0.06)';
  c.fillRect(cx - r, cy - CH.barH * 0.45, 2 * r, CH.barH * 0.9);
  const mw = BW * 6 / ax.max * Z;          // the true bar × Z
  c.fillStyle = L.rgba([214, 220, 232], 0.95);
  c.fillRect(CH.bx0, cy - CH.barH * 0.45, Math.min(2 * r + 4, mw), CH.barH * 0.9);
  c.fillStyle = 'rgba(170,184,206,0.5)';
  c.fillRect(CH.bx0 - 1, cy - r, 1.5, 2 * r);
  c.restore();
  c.strokeStyle = 'rgba(214,222,236,0.85)'; c.lineWidth = 3;
  c.beginPath(); c.arc(cx, cy, r, 0, Math.PI * 2); c.stroke();
  c.lineWidth = 5; c.lineCap = 'round';
  c.beginPath(); c.moveTo(cx + r * 0.72, cy + r * 0.72); c.lineTo(cx + r * 1.18, cy + r * 1.18); c.stroke();
  c.restore();
}

function drawIcons(c, v, k) {
  const tl = v.tl, gt = v.gt;
  for (const row of ROWS) {
    if (row.id === 'mosq') continue;
    if (!docked(tl, row.id, gt)) continue;
    const rt = rowT(tl, row.id);
    if (gt < rt.appear) continue;
    const top = CH.row0 + rankPos(tl, row.id, gt) * CH.pitch;
    drawAnimal(c, row.kind, { x: CH.iconX, y: top + 30, w: ICON.w, h: ICON.h, t: gt, alpha: k, glow: 0.6 });
  }
}

/** the mosquito: in the #1 icon slot from its slot's appearance, drawn at the camera's TRUE zoom (the dive's subject) */
function drawMosquito(c, v) {
  const tl = v.tl, gt = v.gt;
  const rt = rowT(tl, 'mosq');
  if (gt < rt.appear) return;
  const ain = L.ease.outCubic(L.prog(gt, rt.appear + SHIFT + 0.1, 0.5));
  const z = zoomAt(gt, tl);
  const zt = 1 / v.cam.mpp;
  const rp = rankPos(tl, 'mosq', gt);
  c.save();
  c.translate(v.wx(MOSQ.x), v.wy(MOSQ.y) + (rp * CH.pitch) * chartZ(zt) + chartDy(tl, gt));
  c.scale(zt, zt);
  // a faint pulse ring marks the speck before the dive
  const pre = 1 - L.smoothstep(L.clamp((z - 1.1) / 0.8));
  if (pre > 0.01 && gt < B(tl, 6)) {
    const pu = (gt * 0.9) % 1;
    c.strokeStyle = L.rgba(RED, 0.55 * (1 - pu) * pre * ain);
    c.lineWidth = 2;
    c.beginPath(); c.arc(0, 0, Math.max(0, 16 + 26 * pu), 0, Math.PI * 2); c.stroke();
  }
  drawAnimal(c, 'mosquito', { x: 0, y: 0, w: MOSQ_ICON.w, h: MOSQ_ICON.h, t: gt, alpha: ain, pxScale: zt });
  c.restore();
}

export function drawForeground(c, v) {
  const tl = v.tl, gt = v.gt;
  const k = chartK(v);
  if (k > 0.002) {
    c.save();
    chartXf(v).apply(c);
    drawPanel(c, v, k);
    drawRows(c, v, k);
    drawIcons(c, v, k);
    c.restore();
  }
  drawMosquito(c, v);
  // heroes (screen space, above the board)
  for (const id of ['shark', 'snake', 'dog', 'human']) {
    const hs = heroState(v, id);
    if (!hs) continue;
    drawAnimal(c, BYID[id].kind, { x: hs.x, y: hs.y, w: hs.w, h: hs.h, t: gt, alpha: hs.a, glow: 1 - 0.6 * hs.dk });
  }
}

// ------------------------------------------------------------------ shared overlay helpers
/**
 * A heavy-blur "odometer" standing in for a number that has not landed yet: rolling digit columns under a ~15 px blur,
 * so no frame reads as a value. Laid out on the FINAL string (right-aligned at xr) so the reveal doesn't jump.
 */
function odometer(c, str, xr, y, size, color, gt, a) {
  if (a <= 0.01) return;
  c.save();
  c.font = L.font(size, 800, L.FONT.display);
  c.textAlign = 'left';
  const w = c.measureText(str).width;
  c.beginPath(); c.rect(xr - w - 30, y - size * 0.95, w + 60, size * 1.15); c.clip();
  c.filter = `blur(${Math.round(size * 0.12)}px)`;
  c.globalAlpha *= 0.5 * a;
  c.fillStyle = L.rgba(color);
  let x = xr - w, di = 0;
  const pitch = size * 0.78;
  for (const ch of str) {
    const cw = c.measureText(ch).width;
    if (/\d/.test(ch)) {
      const roll = gt * (9 + di * 1.3) + di * 0.41;
      const base = Math.floor(roll), ph = roll - base;
      for (let j = -1; j <= 1; j++) c.fillText(String((base + j + 10 * 100) % 10), x, y + (j + ph) * pitch);
      di++;
    } else c.fillText(ch, x, y);
    x += cw;
  }
  c.restore();
}
/**
 * Big number. The prefix ("UP TO", "≈") arrives with its spoken lead-in, a blurred odometer holds the number's place
 * while the bar grows, and the FINAL value is revealed as the bar lands. Returns {x0, x1} (final extents).
 */
export function bigNumber(c, { id, tl, gt, x = 540, y, size = 124, color = INKW, k = 1, prefixSize }) {
  const row = BYID[id], rt = rowT(tl, id);
  const cv = countVal(tl, id, gt);
  const finalNum = fmtN(shownVal(id));
  const pre = row.pre;
  const approx = pre.trim() === '≈';
  const ps = prefixSize ?? (approx ? size : Math.round(size * 0.42));
  c.save();
  c.textBaseline = 'alphabetic';
  c.font = L.font(size, 800, L.FONT.display);
  const wn = c.measureText(finalNum).width;
  c.font = L.font(ps, 800, L.FONT.display);
  const wp = c.measureText(pre).width;
  const x0 = x - (wn + wp) / 2, x1 = x0 + wp + wn;
  if (cv.started && k > 0) {
    c.globalAlpha *= k;
    const g = gq(gt);
    const rk = cv.landed ? L.ease.outCubic(L.clamp((g - rt.c1) / 0.14)) : 0;
    // prefix: from its spoken lead-in
    const pa = L.clamp((g - rt.pre) / 0.18);
    c.shadowColor = 'rgba(0,0,0,0.6)'; c.shadowBlur = 20;
    c.font = L.font(ps, 800, L.FONT.display);
    c.fillStyle = L.rgba(approx ? color : GREYT, pa);
    c.textAlign = 'left';
    c.fillText(pre, x0, approx ? y : y - size * 0.3);
    c.shadowBlur = 0;
    // odometer until the value lands, then the value (a short settle: scale 1.06 → 1)
    odometer(c, finalNum, x1, y, size, color, g, 1 - rk);
    if (rk > 0) {
      c.save();
      c.globalAlpha *= rk;
      const s = L.lerp(1.06, 1, rk);
      c.translate(x1 - wn / 2, y - size * 0.36); c.scale(s, s); c.translate(-(x1 - wn / 2), -(y - size * 0.36));
      c.shadowColor = 'rgba(0,0,0,0.6)'; c.shadowBlur = 20;
      c.font = L.font(size, 800, L.FONT.display);
      c.fillStyle = L.rgba(color);
      c.textAlign = 'right';
      c.fillText(finalNum, x1, y);
      c.restore();
    }
  }
  c.restore();
  return { x0, x1 };
}
/** small tracked caps line, centred, fitted to maxW */
export function subLine(c, txt, y, { k = 1, color = GREYT, size = 26, maxW = 900, x = 540, align = 'center', track = 3 } = {}) {
  if (k <= 0) return;
  c.save();
  c.globalAlpha *= k;
  const s = L.fitSize(c, txt, maxW - track * txt.length, size, 600, L.FONT.body, 16);
  c.font = L.font(s, 600, L.FONT.body);
  c.fillStyle = L.rgba(color, 0.95);
  c.shadowColor = 'rgba(0,0,0,0.6)'; c.shadowBlur = 10;
  c.textBaseline = 'alphabetic';
  L.trackedText(c, txt, x, y, track, align);
  c.restore();
}
/** the standard stat block of beats 1–4: big number at NUM_Y + its source line (both arrive with the prefix) */
export function statBlock(c, v, id, sub, { subK = 1, size = 124, color = INKW } = {}) {
  const cv = countVal(v.tl, id, v.gt);
  if (!cv.started) return;
  const a = L.ease.outCubic(L.prog(v.gt, rowT(v.tl, id).pre, 0.3));
  c.save();
  c.globalAlpha *= v.k;
  bigNumber(c, { id, tl: v.tl, gt: v.gt, y: NUM_Y + (1 - a) * 12, size, color, k: a });
  subLine(c, sub, SUB_Y, { k: a * subK });
  c.restore();
}
/** beat-relative helpers for scenes */
export { B, BE, PH, W8, gq, zoomAt, diveK };

export function drawHud(c, v) {
  topBar(c, v, RED);
}

// SOUND. Transition swishes sit in the silences between lines (never on a first word); every other cue is placed from
// the timeline (word fractions), soft and under the voice. The dive and the pull-back own their sounds.
export function cues(tl) {
  const out = [];
  const gap = (i) => (tl.lines[i - 1].end + tl.lines[i].start) / 2;
  for (let i = 1; i < tl.lines.length; i++) {
    if (i === 5 || i === 6) continue;
    out.push({ t: gap(i) - 0.175, name: 'swish', gain: 0.15, pitch: 0.7 * (i % 2 ? 0.85 : 1) });
  }
  const ph = (i, j, e = 'start') => PH(tl, i, j, e);
  // hook
  out.push({ t: 0.0, name: 'deep', gain: 0.34, pitch: 0.7 });
  out.push({ t: (ph(0, 0, 'end') + ph(0, 1)) / 2 - 0.08, name: 'impact', gain: 0.24, pitch: 0.85 });   // the stamp, in the pause
  // count-ups (soft ticks under the voice)
  for (const id of ['shark', 'snake', 'dog', 'human', 'mosq']) {
    const r = rowT(tl, id);
    out.push({ t: r.c0, name: 'count', gain: 0.07, pitch: id === 'shark' ? 1.2 : 1 });
  }
  // map card: farm, hospital
  out.push({ t: W8(tl, 'farmers', -0.2), name: 'blip', gain: 0.1, pitch: 0.9 });
  out.push({ t: W8(tl, 'hospital', -0.15), name: 'ping', gain: 0.1, pitch: 1.1 });
  // rabies virion: a soft swell leading into "rabies" (the virion lands on the word)
  out.push({ t: W8(tl, 'rabies', -0.32), name: 'shimmer', gain: 0.1, pitch: 0.9 });
  // the dive: starts on "tiny", peaks in the pause before "The mosquito"; #1 impact in that pause
  out.push({ t: W8(tl, 'tiny', -0.05), name: 'dive', gain: 0.16, pitch: 0.9 });
  out.push({ t: (ph(5, 0, 'end') + ph(5, 1)) / 2 - 0.12, name: 'impact', gain: 0.26, pitch: 0.75 });
  for (const w of ['dengue', 'zika', 'yellow']) out.push({ t: W8(tl, w, w === 'yellow' ? -0.2 : -0.13), name: 'tick', gain: 0.09, pitch: 1.25 });   // in the silences before each word
  // the pull-back, in the gap before "Malaria"
  out.push({ t: tl.lines[5].end + 0.02, name: 'whoosh', gain: 0.2, pitch: 0.75 });
  out.push({ t: W8(tl, 'under', -0.15), name: 'blip', gain: 0.1, pitch: 0.8 });
  // question card
  out.push({ t: B(tl, 7, -0.1), name: 'bloom', gain: 0.16, pitch: 1.1 });
  out.push({ t: (ph(7, 0, 'end') + ph(7, 1)) / 2 - 0.1, name: 'ping', gain: 0.18, pitch: 1.0 });
  return out;
}
