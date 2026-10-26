// Environment for "How to Survive a Nuclear Blast" (EP 27, How to Survive #1). Owned by the setup agent / orchestrator —
// builders: read, don't edit. Put shared needs in "sharedRequests".
//
// LOOK: a premium civil-defence film. One continuous world: a city at dusk drawn as a refined SIDE CROSS-SECTION.
//   Dusk blue-violet sky with a warm horizon (→ deep night by beat 5 → dawn in beats 6–7), warm sodium windows,
//   the flash in white-gold (ACCENT), civil-defence yellow/black (CD) for STEP badges, SAFE green, DANGER red.
//
// WHAT ENV DRAWS (every frame, under/over the scenes):
//   drawBackground: sky (+ stars at night) → the distant FIREBALL, column and drifting cloud (layer FIRE, p 0.06; far right
//     on the horizon) → three skyline layers FAR (p 0.12) / MID (p 0.3) / NEAR (p 0.55) receding into haze, with lit
//     windows; when the blast front passes a window it may glint once and ~45 % of lights go out → the blast DOME + DUST
//     sheet (ground-hugging, right → left) → the FOREGROUND (p 1, world metres): soil section, street, sodium lamps,
//     trees (bend when the front passes), and THE BUILDING: a brick facade that dissolves (cutK) in beat 3 to reveal the
//     section (concrete walls, slabs, warm rooms, the stair core, the basement in the soil); after beat 3 the core and
//     basement keep a soft SAFE-green glow (safeK); settled fallout ash on roofs/street (settleK).
//   drawForeground: falling fallout dust (screen-space tiers with parallax, density follows the decay chart), the FLASH
//     white-out (one bloom: 0.35 s rise, ~0.8 s decay, long warm tail — never strobes), a lingering dust haze after impact.
//   drawHud: top bar + a small "TO GET INSIDE" countdown readout (top right, y 250–336) in beats 1–3 (HUD_TIMER; stops,
//     turns green with a drawn check + SHELTERED once inside, holds ≈ 1 s, exits), on a
//     dark chip while the flash whites out the sky.
//   SERIES SYSTEM (shared by every scene; How to Survive #2 copies it): stepBadge (STEP n / icon tile + plate, opts.icon,
//     opts.sub), stepSub (the one sub-line chip), BADGE/SUB_Y slot geometry, drawFigure (safety-card pictogram; alias
//     pictoDrop), CARD_BG.
//   Scenes draw everything that is beat-specific: headline/countdown (s00), STEP badges + pictogram, heat map (s03),
//   labels, the decay chart, the 24 h clock, the question card.
//
// COORDINATES: foreground = world metres (camera.js header: street y 0, y down, BLD x −12…12). Parallax layers use
//   "hook px" (how they look in the hook framing): layerProj(v, p).x(X)/.y(Y) → screen; .X(sx)/.Y(sy) → back.
//
// TIME STATE (pure functions of film time; all story times come from the timeline via camera.js timesFor(tl) → T,
//   values below for the current 60.06 s timeline). Every state fn takes (gt, tl?) — pass v.tl from scenes.
//   flashK          0→1→0 white-out bloom: starts T.flash (≈ 9.13, on "the flash"), peak +0.35 s, decays (τ 0.8 s)
//   fireAt          the fireball/cloud {X, Y, r, heat, k} in FIRE-layer hook px; fireScreen(v) → screen {x, y, r}
//   blastFront      the pressure front in the FIXED blast frame BF: {R, edge (screen x), k, on}; leaves the fireball at
//                   T.blast0 ≈ 16.53, hits the building's right wall at T.impact ≈ 17.48 (camera shake, facade glass
//                   shatters + shards fall to the pavement), its left wall ≈ 17.98, leaves the screen ≈ 18.96
//   hitTime(sx) / hitTimeLayer(X, p) / hitTimeWorld(x) / frontScreenX(v, p)   when/where the front reaches things
//   cutK            facade → cut-away section, a wipe from the core outward (T.cut0 ≈ 25.43 → +0.55 s)
//   safeK           persistent green glow in the core + basement (from T.safe0 ≈ 30.1)
//   falloutK        falling dust density (arrives T.fallout0 ≈ 34.46, thins with the dose rate in beat 5)
//   settleK         ash settled on roofs/street/car 0..1
//   chartHours      hours shown by the decay chart (1 → 7 h by the end of beat-5 phrase 0 → 49 h by phrase 1)
//   doseRate(h)     h^−1.2 (the 7-10 rule: 7 h → 0.097, 49 h → 0.0094)
//   nightK / dawnK  sky state (night from ≈ 33.6, dawn from ≈ 46.9); cityShelterK: timing only (0→1 from
//                   T.family + 0.2 ≈ 50.57 over 1.8 s) — s06 draws the city's shelter glows from it
//   countdownAt(gt, tl) whole seconds left of the "10:00" (holds 10:00 until the flash, then ticks); fmtClock(s) → "9:47"
import * as L from '../../../engine/runtime/lib.js';
import { beatCues, topBar, stars } from '../../../engine/runtime/kit.js';
import { KEYS, SHOT, SHOTS, HOOK, MPP, AY, ANCHOR, rowAt, colAt, timesFor, shotAt, shotStart } from './camera.js';

export { KEYS, SHOT, SHOTS, HOOK, MPP, AY, rowAt, colAt, timesFor, shotAt, shotStart };
const { W, H } = L;
const TAU = Math.PI * 2;

// ------------------------------------------------------------------ palette
export const ACCENT = [255, 200, 60];                 // the flash, white-gold
export const CD = { yellow: [255, 204, 0], black: [14, 14, 16], ink: [10, 10, 12] };   // civil-defence yellow/black
export const SAFE = [70, 220, 130];
export const DANGER = [240, 72, 56];
export const AMBER = [255, 170, 60];
export const SODIUM = [255, 176, 88];
export const ASH = [214, 208, 188];
export const BRICK = [150, 78, 58];
export const CONCRETE = [150, 150, 156];
export const SOIL = [36, 26, 30];
export const TEXT = [238, 236, 230];

// ------------------------------------------------------------------ timing (derived from build/timeline.json)
/** Story times for the current timeline (camera.js timesFor). Live binding: set by sync(tl), which env calls at the top
 *  of every draw/cue entry point; scenes that need times before drawing should use timesFor(v.tl). */
export let T = null;
let TL = null;
export function sync(tl) { if (tl && tl !== TL) { TL = tl; T = timesFor(tl); } return T; }
const S = (tl, i) => tl.scenes[i].start;

export const flashK = (gt, tl) => {
  sync(tl);
  const a = gt - T.flash;
  if (a <= 0) return 0;
  const rise = L.smoothstep(L.clamp(a / T.flashRise));
  return rise * Math.exp(-Math.max(0, a - T.flashRise) / 0.8);
};
export const cutK = (gt, tl) => (sync(tl), L.ease.inOutCubic(L.prog(gt, T.cut0, T.cutDur)));
export const safeK = (gt, tl) => (sync(tl), L.ease.outCubic(L.prog(gt, T.safe0, 0.8)));
export const nightK = (gt, tl) => (sync(tl), L.smoothstep(L.prog(gt, T.night0, T.nightDur)));
export const dawnK = (gt, tl) => (sync(tl), L.smoothstep(L.prog(gt, T.dawn0, T.dawnDur)));
/** beat 6 "Don't go looking for family": shelters light up green across the whole city */
export const cityShelterK = (gt, tl) => (sync(tl), L.smoothstep(L.prog(gt, T.family + 0.2, 1.8)));
export const doseRate = (h) => Math.pow(Math.max(h, 1e-3), -1.2);
/** hours after detonation shown by the decay chart / implied by the dust density (log-eased between keys) */
export function chartHours(gt, tl) {
  const b5 = S(tl, 5), p0 = tl.lines[5].phrases[0], p1 = tl.lines[5].phrases[1];
  const e1 = L.ease.inOutCubic(L.prog(gt, b5 + 0.5, p0.end - 0.4 - (b5 + 0.5)));          // 1 h → 7 h
  const e2 = L.ease.inOutCubic(L.prog(gt, p1.start + 0.1, p1.end - 0.5 - (p1.start + 0.1)));   // 7 h → 49 h
  return Math.exp(Math.log(7) * e1 + Math.log(7) * e2);
}
export function falloutK(gt, tl) {
  sync(tl);
  const arrive = L.smoothstep(L.prog(gt, T.fallout0, 1.6));
  return arrive * Math.pow(doseRate(chartHours(gt, tl)), 0.45);   // 7 h → 0.35, 49 h → 0.12 (visual, not linear)
}
export const settleK = (gt, tl) => (sync(tl), L.ease.inOutCubic(L.prog(gt, T.fallout0 + 0.6, 3.6)));
/** "10:00" countdown: seconds left, whole and frame-stable. Holds 10:00 until the flash (the ten minutes start with
 *  the bomb), then ticks real seconds. */
export const countdownAt = (gt, tl) => {
  sync(tl ?? TL);
  const q = Math.round(gt * 30) / 30;
  return Math.max(0, 600 - Math.floor(Math.max(0, q - T.flash) + 1e-6));
};
export const fmtClock = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
export const HUD_TIMER = true;
export const COUNT_HUD = { x: W - 64, y: 302, sub: 336 };   // where the HUD countdown sits (right-aligned baseline)

// ------------------------------------------------------------------ parallax layers (hook px)
/**
 * Screen mapping for a parallax layer of depth p (1 = foreground plane, 0 = infinitely far) for camera `cam`.
 * Content is authored in hook px: what it looks like in the hook framing (camera.js HOOK).
 * Returns {s (scale), x(X), y(Y), X(sx), Y(sy)}.
 */
export function layerProjCam(cam, p) {
  const s = Math.pow(HOOK.mpp / cam.mpp, p);
  const ox = (p * (cam.x - HOOK.x)) / HOOK.mpp, oy = (p * (cam.y - HOOK.y)) / HOOK.mpp;
  const ay = H * (cam.anchor ?? ANCHOR);
  return {
    s, p,
    x: (X) => W / 2 + s * (X - W / 2 - ox),
    y: (Y) => ay + s * (Y - AY - oy),
    X: (sx) => W / 2 + (sx - W / 2) / s + ox,
    Y: (sy) => AY + (sy - ay) / s + oy,
  };
}
export const layerProj = (v, p) => layerProjCam(v.cam, p);
/** hook px ↔ world metres on the foreground plane */
export const hookX = (x) => W / 2 + (x - HOOK.x) / HOOK.mpp;
export const hookY = (y) => AY + (y - HOOK.y) / HOOK.mpp;

// the hook framing puts the street at y 1520 (camera.js HOOK): every layer is authored 230 px lower than in the first
// cut, and the skyline is ≈ 25 % taller so it fills the frame down to the street
export const FIRE = { p: 0.06, X: 860, Y: 1380 };          // fireball ground point (horizon), far right
export const LAYERS = {
  far: { p: 0.12, base: 1390, seed: 271, n: [16, 46], h: [22, 150], win: 0 },
  mid: { p: 0.3, base: 1435, seed: 272, n: [28, 74], h: [75, 335], win: 1 },
  near: { p: 0.55, base: 1480, seed: 273, n: [46, 112], h: [135, 530], win: 2 },
};
const X0 = -520, X1 = 1650;   // hook-px span every layer covers (camera range incl. zoom)
for (const [name, Ly] of Object.entries(LAYERS)) {
  const r = L.rng(Ly.seed);
  Ly.name = name;
  Ly.b = [];
  let x = X0;
  while (x < X1) {
    const w = L.lerp(Ly.n[0], Ly.n[1], r());
    // keep the skyline low right around the fireball so its base shows on the horizon
    const nearFire = Math.exp(-(((x + w / 2 - FIRE.X) / 70) ** 2));
    let h = L.lerp(Ly.h[0], Ly.h[1], Math.pow(r(), 1.3)) * (1 - (name === 'far' ? 0.75 : name === 'mid' ? 0.55 : 0.6) * nearFire);
    const b = { X: x, w, h, roof: r() < 0.3 ? 'step' : r() < 0.4 ? 'spire' : 'flat', hs: r(), gap: name === 'far' ? 0 : r() < 0.25 ? 6 + r() * 14 : 0 };
    Ly.b.push(b);
    x += w + b.gap;
  }
  Ly.maxH = Math.max(...Ly.b.map((b) => b.h)) + 30;
}
/** skyline anchors: top of the building at hook-px X on a layer (hook px Y), or null */
export function skylineTop(name, X) {
  const Ly = LAYERS[name];
  const b = Ly.b.find((q) => X >= q.X && X <= q.X + q.w);
  return b ? Ly.base - b.h : null;
}

// window bitmaps per layer: 'lit' (dusk) and 'after' (≈45 % cut by the blast); windows: [{X, Y, w, h, hash}]
const WSC = 1.6;
function buildWindows(Ly) {
  const r = L.rng(Ly.seed * 7 + 1);
  const wins = [];
  const big = Ly.win === 2;
  const cw = big ? 9 : 6, ch = big ? 12 : 9, ww = big ? 3.4 : 2, wh = big ? 4.6 : 2.4;
  for (const b of Ly.b) {
    if (b.h < 40) continue;
    const cols = Math.floor((b.w - 8) / cw), rows = Math.floor((b.h - 14) / ch);
    const ox = b.X + (b.w - cols * cw) / 2 + (cw - ww) / 2;
    const dense = 0.25 + 0.5 * b.hs;
    for (let i = 0; i < rows; i++) for (let j = 0; j < cols; j++) {
      const q = r();
      if (q > dense) continue;
      wins.push({ X: ox + j * cw, Y: Ly.base - b.h + 10 + i * ch, w: ww, h: wh, hash: r(), tone: r() });
    }
  }
  const mk = (keep) => {
    const cv = new OffscreenCanvas(Math.ceil((X1 - X0) * WSC), Math.ceil(Ly.maxH * WSC)), g = cv.getContext('2d');
    for (const w of wins) {
      if (!keep(w)) continue;
      const col = L.mix(SODIUM, [255, 226, 170], w.tone * 0.7);
      g.fillStyle = L.rgba(col, 0.55 + 0.45 * w.tone);
      g.fillRect((w.X - X0) * WSC, (w.Y - (Ly.base - Ly.maxH)) * WSC, w.w * WSC, w.h * WSC);
    }
    return cv;
  };
  Ly.wins = wins;
  Ly.glints = wins.filter((w) => w.hash < 0.09);
  if (typeof OffscreenCanvas !== 'undefined') { Ly.lit = mk(() => true); Ly.after = mk((w) => w.hash > 0.45); }
}
buildWindows(LAYERS.mid);
buildWindows(LAYERS.near);

// ------------------------------------------------------------------ the blast front (fixed blast frame)
/** The blast-beat key camera WITHOUT push/drift: every reaction time is computed in this frame, so it never depends on
 *  the live camera (frames render out of order). */
export const BF = { x: SHOT.blast.x, y: SHOT.blast.y, mpp: SHOT.blast.mpp, anchor: ANCHOR };
const BF_FIRE = layerProjCam(BF, FIRE.p);
export const FIRE_BF_X = BF_FIRE.x(FIRE.X);                        // ≈ 852
const RMAX = 1250, BDUR = 3.8, BPOW = 1.4;
/** the front at gt: R (px from the fireball, fixed frame), edge (fixed-frame screen x of its leading edge), k (strength) */
export function blastFront(gt, tl) {
  sync(tl);
  const u = L.prog(gt, T.blast0, BDUR);
  const R = RMAX * (1 - Math.pow(1 - u, BPOW));
  return { R, edge: FIRE_BF_X - R, k: (1 - u) * L.smoothstep(L.clamp((gt - T.blast0) / 0.3)), on: gt > T.blast0 && u < 1 };
}
/** when the front reaches fixed-frame screen x (Infinity if never) */
export function hitTime(sxFixed, tl) {
  sync(tl);
  const f = (FIRE_BF_X - sxFixed) / RMAX;
  if (f <= 0) return T.blast0;
  if (f >= 1) return Infinity;
  return T.blast0 + BDUR * (1 - Math.pow(1 - f, 1 / BPOW));
}
/** hit time of a layer element at hook px X (layer depth p) */
export const hitTimeLayer = (X, p) => hitTime(layerProjCam(BF, p).x(X));
/** hit time of a foreground point at world x */
export const hitTimeWorld = (x) => hitTime(W / 2 + (x - BF.x) / BF.mpp);
/** current-screen x of the front's leading edge on layer p (null when not travelling) */
export function frontScreenX(v, p = 1) {
  const f = blastFront(v.gt);
  if (!f.on) return null;
  return layerProj(v, p).x(layerProjCam(BF, p).X(f.edge));
}

// ------------------------------------------------------------------ the fireball, column and cloud
/** fireball state in FIRE-layer hook px: centre (X, Y), radius r, heat 1 (white) → 0 (cool smoke), k visibility */
export function fireAt(gt, tl) {
  sync(tl);
  const a = gt - T.flash;
  if (a <= 0) return null;
  const r = 12 + 44 * L.ease.outCubic(L.prog(a, 0, 2.6)) + 10 * L.prog(a, 2.6, 14);
  const rise = 360 * L.ease.inOutCubic(L.prog(a, 0.4, 13));
  return { X: FIRE.X - 30 * L.prog(a, 6, 14), Y: FIRE.Y - r * 0.85 - rise, r, rise, heat: Math.exp(-a / 2.6), k: L.smoothstep(L.clamp(a / 0.2)), age: a };
}
const heatCol = (h) => L.ramp([[0, [96, 76, 74]], [0.12, [168, 74, 40]], [0.35, [255, 128, 40]], [0.65, [255, 200, 90]], [1, [255, 250, 232]]], h);
const PLUME = (() => { const r = L.rng(92); return Array.from({ length: 16 }, (_, i) => ({ f: i / 15, dy: (r() - 0.5) * 40, s: 0.7 + r() * 0.6, sh: r() })); })();
const SURGE = (() => { const r = L.rng(93); return Array.from({ length: 7 }, (_, i) => ({ f: (i + 0.5) / 7 - 0.5, s: 0.5 + r() * 0.5, ph: r() * TAU })); })();
/** lumpy but static silhouette offset for the cap's top contour (t 0..1 across the cap) */
const capBump = (t, gt) => 0.6 * Math.sin(t * Math.PI * 5 + 1.3 + gt * 0.08) + 0.4 * Math.sin(t * Math.PI * 9 + 0.4 - gt * 0.05);

function drawFire(c, v) {
  const f = fireAt(v.gt);
  const pr = layerProj(v, FIRE.p), s = pr.s, base = pr.y(FIRE.Y), gx = pr.x(FIRE.X);
  const dusk = skyState(v.gt);
  const dark = nightK(v.gt) * (1 - dawnK(v.gt));
  const shade = (col) => L.mix(col, [24, 22, 38], 0.18 + 0.45 * dark);   // distant: sits in the dusk air, never glows
  c.save();
  // ---- the base surge: dust kicked up around ground zero, rising on the horizon ≈ 1 s before the front leaves it
  const sk0 = L.smoothstep(L.prog(v.gt, T.blast0 - 0.95, 1.3)) * Math.exp(-Math.max(0, v.gt - (T.blast0 + 5)) / 4);
  if (sk0 > 0.003) {
    const e = L.ease.outCubic(L.prog(v.gt, T.blast0 - 0.95, 3.2));
    const sw = (34 + 190 * e) * s, sh = (10 + 46 * e) * s;
    const col = shade(L.mix([150, 124, 104], dusk.hor, 0.3));
    const g = c.createLinearGradient(0, base - sh * 1.4, 0, base);
    g.addColorStop(0, L.rgba(col, 0));
    g.addColorStop(0.45, L.rgba(col, 0.55 * sk0));
    g.addColorStop(1, L.rgba(col, 0.85 * sk0));
    c.fillStyle = g;
    c.beginPath(); c.ellipse(gx, base, sw, sh * 1.4, 0, Math.PI, TAU); c.closePath(); c.fill();
    for (const q of SURGE) {
      const bx = gx + q.f * sw * 1.7, by = base - sh * (0.75 + 0.35 * Math.cos(q.f * Math.PI)), br = sh * 0.7 * q.s;
      const gg = c.createRadialGradient(bx, by - br * 0.3, 0, bx, by, br);
      gg.addColorStop(0, L.rgba(L.mix(col, [255, 220, 180], 0.15), 0.7 * sk0));
      gg.addColorStop(0.75, L.rgba(col, 0.5 * sk0));
      gg.addColorStop(1, L.rgba(col, 0));
      c.fillStyle = gg; c.fillRect(bx - br, by - br, br * 2, br * 2);
    }
  }
  if (!f) { c.restore(); return; }
  const cx = pr.x(f.X), cy = pr.y(f.Y), r = f.r * s;
  const smoke = shade(L.mix([96, 88, 96], dusk.low, 0.2));
  // warm ground glow on the horizon (long tail)
  L.lightBlob(c, gx, base, 260 * s, heatCol(Math.min(1, f.heat + 0.25)), 0.55 * f.k * (0.35 + 0.65 * f.heat));
  const capK = L.smoothstep(L.prog(f.age, 0.8, 2.4));
  const warm = heatCol(Math.min(1, f.heat * 0.8 + 0.3));
  // ---- the stem: crisp edges, a lit cylinder (light from the upper left + the warm cap above)
  const ck = L.smoothstep(L.prog(f.age, 0.6, 1.8));
  const top = cy + r * 0.3;
  if (ck > 0 && top < base) {
    const w0 = r * 0.36, w1 = r * 0.56, n = 20;
    const wAt = (i) => L.lerp(w0, w1, Math.pow(i / n, 2.4)) + r * 0.3 * Math.pow(1 - i / n, 7);   // flares into the cap
    c.beginPath();
    for (let i = 0; i <= n; i++) c.lineTo(cx - wAt(i), L.lerp(top, base, i / n));
    for (let i = n; i >= 0; i--) c.lineTo(cx + wAt(i), L.lerp(top, base, i / n));
    c.closePath();
    const g = c.createLinearGradient(cx - w1, 0, cx + w1, 0);
    const lit = L.mix(smoke, [150, 138, 140], 0.28), sh2 = L.mix(smoke, [30, 26, 36], 0.5);
    g.addColorStop(0, L.rgba(L.mix(sh2, lit, 0.4), ck)); g.addColorStop(0.35, L.rgba(lit, ck)); g.addColorStop(0.7, L.rgba(smoke, ck)); g.addColorStop(1, L.rgba(sh2, ck));
    c.fillStyle = g; c.fill();
    // the stem's foot dissolves into the haze of the horizon
    c.save();
    c.clip();
    const gb = c.createLinearGradient(0, L.lerp(top, base, 0.45), 0, base);
    gb.addColorStop(0, L.rgba(dusk.low, 0)); gb.addColorStop(1, L.rgba(L.mix(dusk.low, dusk.hor, 0.4), 0.55 * ck));
    c.fillStyle = gb; c.fillRect(cx - w1 - 2, top, w1 * 2 + 4, base - top);
    c.restore();
    // warm light from the hot cap pooling at the top of the stem
    c.save();
    c.clip();
    const gw = c.createLinearGradient(0, top, 0, top + (base - top) * 0.6);
    gw.addColorStop(0, L.rgba(warm, 0.55 * ck * (0.35 + 0.65 * f.heat)));
    gw.addColorStop(1, L.rgba(warm, 0));
    c.fillStyle = gw; c.fillRect(cx - w1 - 2, top, w1 * 2 + 4, base - top);
    c.restore();
  }
  // ---- drifting plume (fallout source): stretches LEFT over the city from beat 4
  const pk = L.ease.inOutCubic(L.prog(v.gt, T.fallout0 - 2.5, 9));
  if (pk > 0) {
    for (const q of PLUME) {
      const px = cx - q.f * 900 * s * pk, py = cy - r * 0.15 + q.dy * s + q.f * 60 * s * pk;
      const pr2 = r * (1.0 + q.f * 1.1) * q.s;
      const g = c.createRadialGradient(px, py - pr2 * 0.2, 0, px, py, pr2);
      const a = 0.5 * pk * (1 - q.f * 0.6);
      g.addColorStop(0, L.rgba(L.mix(smoke, [150, 150, 166], 0.2 + 0.15 * q.sh), a));
      g.addColorStop(1, L.rgba(smoke, 0));
      c.fillStyle = g;
      c.fillRect(px - pr2, py - pr2, pr2 * 2, pr2 * 2);
    }
  }
  // ---- the cap: a flattened torus, bluish-grey on top, lit warm from below, darker rolled underside, a skirt
  if (capK > 0) {
    const A = r * (0.95 + 0.42 * capK), yMid = cy + r * 0.1, hTop = r * (0.7 + 0.22 * capK), hBot = r * 0.3;
    const N = 28;
    const capPath = () => {
      c.beginPath();
      for (let i = 0; i <= N; i++) {
        const t = i / N, x = cx - A * Math.cos(Math.PI * t);
        const y = yMid - hTop * Math.pow(Math.sin(Math.PI * t), 0.75) * (1 + 0.1 * capBump(t, v.gt));
        if (i) c.lineTo(x, y); else c.moveTo(x, y);
      }
      for (let i = N; i >= 0; i--) {
        const t = i / N, x = cx - A * Math.cos(Math.PI * t);
        c.lineTo(x, yMid + hBot * Math.pow(Math.sin(Math.PI * t), 0.7));
      }
      c.closePath();
    };
    // skirt: a thin collar where the cap meets the stem
    const skY = yMid + hBot + r * 0.2, skW = r * 0.7, skH = r * 0.07;
    const gs = c.createLinearGradient(0, skY - skH, 0, skY + skH);
    gs.addColorStop(0, L.rgba(L.mix(smoke, [190, 176, 170], 0.2), 0.25 * capK));
    gs.addColorStop(1, L.rgba(L.mix(smoke, warm, 0.2), 0.15 * capK));
    c.fillStyle = gs;
    c.beginPath(); c.ellipse(cx, skY, skW, skH, 0, 0, TAU); c.fill();
    capPath();
    const top2 = shade(L.mix([118, 120, 142], dusk.mid, 0.35)), mid2 = shade(L.mix([128, 112, 118], dusk.low, 0.2));
    const bot2 = L.mix(shade([104, 80, 78]), warm, 0.2 + 0.4 * f.heat);
    const g = c.createLinearGradient(0, yMid - hTop, 0, yMid + hBot);
    g.addColorStop(0, L.rgba(top2, capK)); g.addColorStop(0.5, L.rgba(mid2, capK)); g.addColorStop(1, L.rgba(bot2, capK));
    c.fillStyle = g; c.fill();
    c.save();
    c.clip();
    // rolled underside: two darker lobes either side of the stem, a warm rim along the bottom edge
    for (const sx of [-1, 1]) {
      const lx = cx + sx * A * 0.5, ly = yMid + hBot * 0.55;
      const gl = c.createRadialGradient(lx, ly, 0, lx, ly, A * 0.55);
      gl.addColorStop(0, L.rgba(shade([58, 46, 54]), 0.6 * capK)); gl.addColorStop(1, L.rgba(shade([58, 46, 54]), 0));
      c.fillStyle = gl; c.fillRect(lx - A * 0.6, ly - A * 0.6, A * 1.2, A * 1.2);
    }
    // underside lit warm from below (by the stem's glow): a soft band, not a rim line
    const gu = c.createRadialGradient(cx, yMid + hBot * 1.1, 0, cx, yMid + hBot * 1.1, A * 0.9);
    gu.addColorStop(0, L.rgba(warm, (0.25 + 0.4 * f.heat) * capK)); gu.addColorStop(1, L.rgba(warm, 0));
    c.fillStyle = gu; c.fillRect(cx - A, yMid - hBot, A * 2, hBot * 2.6);
    // cumulus billows: soft lit puffs over the upper half (texture, so the cap reads as cloud, not a disc)
    for (let i = 0; i < 7; i++) {
      const t = (i + 0.5) / 7, bx = cx - A * Math.cos(Math.PI * t) * 0.82, by = yMid - hTop * 0.55 * Math.pow(Math.sin(Math.PI * t), 0.75) + (i % 2) * hTop * 0.2;
      const br = A * (0.26 + 0.06 * Math.sin(i * 2.3));
      const gb = c.createRadialGradient(bx - br * 0.3, by - br * 0.35, 0, bx, by, br);
      gb.addColorStop(0, L.rgba(shade([196, 190, 200]), 0.32 * capK)); gb.addColorStop(0.6, L.rgba(shade([150, 140, 150]), 0.12 * capK)); gb.addColorStop(1, 'rgba(150,140,150,0)');
      c.fillStyle = gb; c.fillRect(bx - br, by - br, br * 2, br * 2);
      const gd = c.createRadialGradient(bx + br * 0.2, by + br * 0.55, 0, bx + br * 0.2, by + br * 0.55, br * 0.7);
      gd.addColorStop(0, L.rgba(shade([70, 60, 70]), 0.22 * capK)); gd.addColorStop(1, 'rgba(70,60,70,0)');
      c.fillStyle = gd; c.fillRect(bx - br, by - br * 0.2, br * 2, br * 1.6);
    }
    // sky light on the crown
    const gh = c.createRadialGradient(cx - A * 0.25, yMid - hTop * 0.85, 0, cx - A * 0.25, yMid - hTop * 0.85, A * 0.8);
    gh.addColorStop(0, L.rgba(shade([200, 204, 220]), 0.28 * capK)); gh.addColorStop(1, 'rgba(200,204,220,0)');
    c.fillStyle = gh; c.fillRect(cx - A * 1.2, yMid - hTop * 2, A * 2.4, hTop * 2.4);
    c.restore();
  }
  // ---- the fireball core (bright while hot, then swallowed by the cap)
  const hk = f.k * L.clamp(f.heat * 1.4 + 0.08) * (1 - 0.85 * capK);
  if (hk > 0.002) {
    L.lightBlob(c, cx, cy, r * 6, heatCol(f.heat), 0.7 * hk);
    const g = c.createRadialGradient(cx, cy - r * 0.2, 0, cx, cy, Math.max(0, r));
    g.addColorStop(0, L.rgba(heatCol(Math.min(1, f.heat + 0.3)), hk));
    g.addColorStop(0.75, L.rgba(heatCol(f.heat), hk * 0.95));
    g.addColorStop(1, L.rgba(heatCol(f.heat * 0.7), 0));
    c.fillStyle = g;
    c.beginPath(); c.arc(cx, cy, Math.max(0, r), 0, TAU); c.fill();
  }
  c.restore();
}
/** current screen position + radius of the fireball (null before the flash) */
export function fireScreen(v) {
  const f = fireAt(v.gt), pr = layerProj(v, FIRE.p);
  if (!f) return { x: pr.x(FIRE.X), y: pr.y(FIRE.Y - 14), r: 0, heat: 1, k: 0 };
  return { x: pr.x(f.X), y: pr.y(f.Y), r: f.r * pr.s, heat: f.heat, k: f.k };
}

// ------------------------------------------------------------------ sky
const SKY = {
  dusk: { top: [14, 16, 44], mid: [52, 42, 92], low: [138, 80, 112], hor: [244, 146, 96] },
  night: { top: [5, 7, 20], mid: [13, 17, 42], low: [30, 30, 64], hor: [72, 54, 82] },
  dawn: { top: [20, 32, 70], mid: [66, 76, 128], low: [184, 134, 140], hor: [255, 192, 138] },
};
export function skyState(gt, tl) {
  sync(tl);
  const n = nightK(gt), d = dawnK(gt), o = {};
  for (const k of ['top', 'mid', 'low', 'hor']) o[k] = L.mix(L.mix(SKY.dusk[k], SKY.night[k], n), SKY.dawn[k], d);
  return o;
}
export const horizonY = (v) => layerProj(v, LAYERS.far.p).y(LAYERS.far.base);

function drawSky(c, v) {
  const sk = skyState(v.gt), hy = horizonY(v);
  const g = c.createLinearGradient(0, hy - 1700, 0, hy);
  g.addColorStop(0, L.rgba(sk.top));
  g.addColorStop(0.55, L.rgba(sk.mid));
  g.addColorStop(0.86, L.rgba(sk.low));
  g.addColorStop(1, L.rgba(sk.hor));
  c.fillStyle = g;
  c.fillRect(0, 0, W, H);
  const sn = 0.25 + 0.75 * nightK(v.gt) * (1 - dawnK(v.gt));
  stars(c, v, sn * 0.55 * L.clamp((hy - 300) / 600), 140, 27);
  // the flash lights the whole sky from behind the skyline (silhouettes)
  const fk = flashK(v.gt);
  if (fk > 0.002) {
    const fs = fireScreen(v);
    c.save();
    c.globalCompositeOperation = 'lighter';
    const gg = c.createRadialGradient(fs.x, hy, 0, fs.x, hy, 1700);
    gg.addColorStop(0, `rgba(255,250,236,${fk})`);
    gg.addColorStop(0.35, `rgba(255,226,170,${0.75 * fk})`);
    gg.addColorStop(1, `rgba(255,200,140,${0.35 * fk})`);
    c.fillStyle = gg;
    c.fillRect(0, 0, W, H);
    c.restore();
  }
}

// ------------------------------------------------------------------ skyline layers
function layerColour(name, sk) {
  const dark = [16, 14, 30];
  if (name === 'far') return L.mix(L.mix(sk.low, sk.hor, 0.35), dark, 0.42);
  if (name === 'mid') return L.mix(sk.low, dark, 0.66);
  return L.mix(sk.mid, dark, 0.8);
}
function drawLayer(c, v, Ly) {
  const pr = layerProj(v, Ly.p), s = pr.s;
  const sk = skyState(v.gt);
  const col = layerColour(Ly.name, sk), fk = flashK(v.gt);
  const by = pr.y(Ly.base);
  c.save();
  // section shots (beat 3): the skyline sinks below the STEP 3 slot (badge + sub chip end at y ≈ 540) so no tower
  // top pokes into the chips; it rises back during the beat-4 pull-back
  const sinkK = L.smoothstep(L.prog(v.gt, S(v.tl, 3) + 0.6, 0.8)) * (1 - L.smoothstep(L.prog(v.gt, S(v.tl, 4) + 0.2, 1.0)));
  if (sinkK > 0 && Ly.name !== 'far') { c.beginPath(); c.rect(-10, L.lerp(-10, 575, sinkK), W + 20, H + 20); c.clip(); }
  // silhouettes (the flash turns them near-black against the white sky)
  c.fillStyle = L.rgba(L.mix(col, [8, 6, 12], 0.6 * fk));
  c.beginPath();
  for (const b of Ly.b) {
    const x0 = pr.x(b.X), x1 = pr.x(b.X + b.w);
    if (x1 < -10 || x0 > W + 10) continue;
    const top = pr.y(Ly.base - b.h);
    c.rect(x0, top, x1 - x0 + 0.6, by - top + 1);
    if (b.roof === 'step') c.rect(x0 + (x1 - x0) * 0.2, top - 10 * s, (x1 - x0) * 0.6, 10 * s + 1);
    if (b.roof === 'spire' && Ly.name !== 'far') { const m = (x0 + x1) / 2; c.rect(m - 1.2 * s, top - 26 * s, 2.4 * s, 26 * s + 1); }
  }
  c.fill();
  // ground of this layer down to the screen bottom
  c.fillRect(-5, by, W + 10, H - by + 5);
  // settled ash on rooftops (beat 4 on)
  const st = settleK(v.gt);
  if (st > 0 && Ly.name !== 'far') {
    c.fillStyle = L.rgba(ASH, 0.22 * st * (Ly.name === 'near' ? 1 : 0.6));
    for (const b of Ly.b) {
      const x0 = pr.x(b.X), x1 = pr.x(b.X + b.w);
      if (x1 < -10 || x0 > W + 10) continue;
      c.fillRect(x0, pr.y(Ly.base - b.h) - 1, x1 - x0, Math.max(1, 2.2 * s * st));
    }
  }
  // windows (bitmaps): lit ahead of the blast front, ~45 % dark behind it
  if (Ly.lit) {
    const dx = pr.x(X0), dy = pr.y(Ly.base - Ly.maxH), dw = (X1 - X0) * s, dh = Ly.maxH * s;
    const lk = (1 - 0.85 * fk) * (1 - 0.25 * nightK(v.gt) * 0) ;
    const f = blastFront(v.gt);
    const edgeX = v.gt < T.blast0 ? Infinity : f.on ? pr.x(layerProjCam(BF, Ly.p).X(f.edge)) : -Infinity;
    c.globalAlpha = lk * (Ly.name === 'near' ? 1 : 0.8);
    if (edgeX > 0) { c.save(); c.beginPath(); c.rect(0, 0, Math.min(W, edgeX), H); c.clip(); c.drawImage(Ly.lit, dx, dy, dw, dh); c.restore(); }
    if (edgeX < W) { c.save(); c.beginPath(); c.rect(Math.max(0, edgeX), 0, W, H); c.clip(); c.drawImage(Ly.after, dx, dy, dw, dh); c.restore(); }
    c.globalAlpha = 1;
    // glints: a window catches the front as it passes (one short sparkle each)
    if (v.gt > T.blast0 && v.gt < T.blast0 + BDUR + 0.5) {
      const bp = layerProjCam(BF, Ly.p);
      for (const w of Ly.glints) {
        const ht = hitTime(bp.x(w.X));
        const a = v.gt - ht;
        if (a < 0 || a > 0.32) continue;
        const gx = pr.x(w.X + w.w / 2), gy = pr.y(w.Y + w.h / 2);
        if (gx < -10 || gx > W + 10) continue;
        sparkle(c, gx, gy, (4 + 6 * w.tone) * s * Math.sin(Math.PI * a / 0.32), 0.9);
      }
    }
  }
  // atmospheric haze at this layer's base
  const hz = c.createLinearGradient(0, by - 140 * s, 0, by);
  hz.addColorStop(0, L.rgba(sk.low, 0));
  hz.addColorStop(1, L.rgba(L.mix(sk.low, sk.hor, 0.3), Ly.name === 'far' ? 0.4 : Ly.name === 'mid' ? 0.22 : 0.12));
  c.fillStyle = hz;
  c.fillRect(0, by - 140 * s, W, 140 * s);
  c.restore();
}
/** four-point glint (additive) */
export function sparkle(c, x, y, s, a = 1, col = [255, 248, 230]) {
  if (s <= 0 || a <= 0) return;
  c.save();
  c.globalCompositeOperation = 'lighter';
  c.fillStyle = L.rgba(col, a);
  c.beginPath();
  c.moveTo(x, y - s); c.quadraticCurveTo(x, y, x + s * 0.5, y); c.quadraticCurveTo(x, y, x, y + s);
  c.quadraticCurveTo(x, y, x - s * 0.5, y); c.quadraticCurveTo(x, y, x, y - s);
  c.fill();
  c.restore();
  L.lightBlob(c, x, y, s * 2.4, col, 0.35 * a);
}

// ------------------------------------------------------------------ blast dome + dust sheet
// rolling dust billows along the front's leading edge (fixed table: no Math.random)
const BILLOWS = (() => { const r = L.rng(5177); return Array.from({ length: 12 }, (_, i) => ({ h: i / 11, dx: r() * 0.5, s: 0.55 + r() * 0.6, ph: r() * TAU, sh: r() })); })();
function drawBlast(c, v) {
  const f = blastFront(v.gt);
  const linger = v.gt > T.blast0 ? Math.exp(-Math.max(0, v.gt - (T.blast0 + BDUR)) / 1.6) : 0;
  if (!f.on && linger < 0.01) return;
  const fg = layerProj(v, 1), fgB = layerProjCam(BF, 1);
  const toCur = (sx) => fg.x(fgB.X(sx));
  const gy = v.wy(0);                                          // street level on screen
  const fs = fireScreen(v);
  const edge = f.on ? toCur(f.edge) : -2000;
  const sk = skyState(v.gt);
  const dustC = L.mix([150, 124, 104], sk.hor, 0.22), dustD = L.mix(dustC, [40, 30, 34], 0.45);
  const below = Math.max(0, Math.min(H + 10 - gy, 14 / v.cam.mpp * 0.55));   // over the road strip in front
  c.save();
  // dust sheet: an opaque, ground-hugging wall at the front (≈ 300 px tall), thinning behind it
  const hgt = 300 * fg.s * 0.85;
  const right = W + 60;
  if (edge < right) {
    const a0 = Math.max(f.k, 0.3) * L.smoothstep(L.clamp((v.gt - T.blast0) / 0.4));
    const turb = (y, k) => 30 * fg.s * L.noise1(y * 0.018 + v.gt * 3.1, 31 + k) + 14 * fg.s * L.noise1(y * 0.05 - v.gt * 5, 37 + k);
    const path = () => {
      c.beginPath();
      // turbulent leading edge, bottom → top (the base leads: drag slows the top)
      const nE = 16;
      for (let i = 0; i <= nE; i++) {
        const u = i / nE, y = gy + below - (below + hgt) * u;
        const x = edge + turb(y, 0) + 40 * fg.s * u * u;
        if (i) c.lineTo(x, y); else c.moveTo(x, y);
      }
      // billowing top, thinning behind the front
      const n = 26;
      for (let i = 1; i <= n; i++) {
        const x = L.lerp(edge + 40 * fg.s, right, i / n), d = (x - edge) / Math.max(1, 600 * fg.s);
        const h = hgt * (1 - 0.4 * Math.min(1, d)) * (1 + 0.16 * L.noise1(x * 0.012 + v.gt * 1.5, 8));
        c.lineTo(x, gy - h);
      }
      c.lineTo(right, gy + below);
      c.closePath();
    };
    // body: horizontal falloff behind the front
    path();
    const gx = c.createLinearGradient(edge, 0, Math.max(edge + 1, edge + 760 * fg.s), 0);
    gx.addColorStop(0, L.rgba(dustC, 0.55 * a0));
    gx.addColorStop(0.08, L.rgba(dustC, 0.62 * a0));
    gx.addColorStop(1, L.rgba(dustC, 0.26 * a0));
    c.fillStyle = gx; c.fill();
    // the opaque base (60–80 %): the lower third is solid dust, darker at the ground
    c.save();
    path(); c.clip();
    const gv = c.createLinearGradient(0, gy - hgt * 0.55, 0, gy + below);
    gv.addColorStop(0, L.rgba(dustD, 0));
    gv.addColorStop(0.45, L.rgba(L.mix(dustC, dustD, 0.4), 0.55 * a0));
    gv.addColorStop(1, L.rgba(dustD, 0.7 * a0));
    c.fillStyle = gv;
    c.fillRect(edge - 80, gy - hgt * 0.55, right - edge + 80, hgt * 0.55 + below + 2);
    c.restore();
    // rolling billows along the leading edge (lit tops, shaded undersides)
    for (const q of BILLOWS) {
      const y = gy + below * 0.3 - (hgt + below * 0.3) * q.h * 0.95;
      const x = edge + turb(y, 0) + 40 * fg.s * q.h * q.h + q.dx * 70 * fg.s + 10 * fg.s * Math.sin(v.gt * 4 + q.ph);
      const br = (40 + 30 * (1 - q.h)) * fg.s * q.s;
      if (x - br > W || x + br < 0) continue;
      const g = c.createRadialGradient(x - br * 0.2, y - br * 0.35, br * 0.1, x, y, br);
      g.addColorStop(0, L.rgba(L.mix(dustC, [255, 232, 206], 0.2 + 0.15 * q.sh), 0.75 * a0));
      g.addColorStop(0.7, L.rgba(dustC, 0.6 * a0));
      g.addColorStop(1, L.rgba(dustC, 0));
      c.fillStyle = g; c.fillRect(x - br, y - br, br * 2, br * 2);
    }
  }
  // lingering haze after the front has passed
  const lk = 0.3 * linger * L.smoothstep(L.prog(v.gt, T.impact, 1));
  if (lk > 0.003) {
    const g = c.createLinearGradient(0, gy - 500 * fg.s, 0, gy + below);
    g.addColorStop(0, L.rgba(dustC, 0));
    g.addColorStop(0.8, L.rgba(dustC, lk));
    g.addColorStop(1, L.rgba(dustC, lk * 0.6));
    c.fillStyle = g;
    c.fillRect(0, gy - 500 * fg.s, W, 500 * fg.s + below + 4);
  }
  // the pressure dome: a faint refractive shell from the fireball's base; gone within 0.4 s of the impact so it never
  // sweeps over the HUD or the STEP 2 card
  const domeK = f.on ? f.k * (1 - L.smoothstep(L.prog(v.gt, T.impact, 0.4))) : 0;
  if (domeK > 0.003) {
    const R = Math.max(0, fs.x - edge);
    const a = 0.5 * domeK;
    c.lineWidth = 3;
    c.strokeStyle = `rgba(255,236,210,${a})`;
    c.beginPath(); c.arc(fs.x, gy, R, Math.PI, TAU); c.stroke();
    c.lineWidth = 22;
    c.strokeStyle = `rgba(255,220,190,${a * 0.18})`;
    c.beginPath(); c.arc(fs.x, gy, Math.max(0, R - 12), Math.PI, TAU); c.stroke();
  }
  c.restore();
}

// ------------------------------------------------------------------ the foreground (world metres)
/** THE BUILDING (world metres). Floor i = 0 (ground) … 5 (top): y from FLOOR_Y(i+1) to FLOOR_Y(i). */
export const BLD = {
  x0: -12, x1: 12, wall: 0.5, slab: 0.32, floorH: 3.3, floors: 6,
  roof: -19.8, parapet: -20.8, ground: 0, base: 3.6, foot: 4.1,
  core: { x0: -2.4, x1: 2.4, wall: 0.35 },
};
export const FLOOR_Y = (i) => -BLD.floorH * i;
/** world rects {x0, y0, x1, y1} (y0 < y1) of the building's parts */
export const RECTS = {
  building: { x0: BLD.x0, y0: BLD.parapet, x1: BLD.x1, y1: BLD.foot },
  above: { x0: BLD.x0, y0: BLD.parapet, x1: BLD.x1, y1: 0 },
  basement: { x0: BLD.x0 + BLD.wall, y0: 0 + BLD.slab, x1: BLD.x1 - BLD.wall, y1: BLD.base },
  core: { x0: BLD.core.x0, y0: BLD.roof, x1: BLD.core.x1, y1: BLD.base },
  roofFloor: { x0: BLD.x0 + BLD.wall, y0: FLOOR_Y(6) + BLD.slab, x1: BLD.x1 - BLD.wall, y1: FLOOR_Y(5) },
  floors: Array.from({ length: 6 }, (_, i) => ({ i, x0: BLD.x0 + BLD.wall, y0: FLOOR_Y(i + 1) + BLD.slab, x1: BLD.x1 - BLD.wall, y1: FLOOR_Y(i) })),
};
/** a world rect → screen {x, y, w, h, x0, y0, x1, y1, cx, cy} */
export function toScreen(v, r) {
  const x0 = v.wx(r.x0), y0 = v.wy(r.y0), x1 = v.wx(r.x1), y1 = v.wy(r.y1);
  return { x: x0, y: y0, w: x1 - x0, h: y1 - y0, x0, y0, x1, y1, cx: (x0 + x1) / 2, cy: (y0 + y1) / 2 };
}
/** the building's parts in screen px for the current camera */
export function bldScreen(v) {
  return {
    building: toScreen(v, RECTS.building), above: toScreen(v, RECTS.above), basement: toScreen(v, RECTS.basement),
    core: toScreen(v, RECTS.core), roofFloor: toScreen(v, RECTS.roofFloor), floors: RECTS.floors.map((f) => toScreen(v, f)),
    ground: v.wy(0), roof: v.wy(BLD.roof),
  };
}
/**
 * Protection zones for the heat map (s03): level 0 = exposed (red) … 1 = safest (green). Mass + distance from the outside:
 * roof floor and outer rooms low, the core of the middle floors good, the basement best (FEMA protection factor, qualitative).
 */
export const ZONES = (() => {
  const z = [];
  const inX0 = BLD.x0 + BLD.wall, inX1 = BLD.x1 - BLD.wall, mid0 = -6.5, mid1 = 6.5;
  for (let i = 0; i < 6; i++) {
    const y0 = FLOOR_Y(i + 1) + BLD.slab, y1 = FLOOR_Y(i);
    const top = i === 5, g = i === 0;
    const outer = top ? 0.05 : g ? 0.22 : 0.3;
    const centre = top ? 0.2 : g ? 0.6 : i <= 3 ? 0.78 : 0.55;
    z.push({ name: `f${i}-left`, x0: inX0, y0, x1: mid0, y1, level: outer });
    z.push({ name: `f${i}-middle`, x0: mid0, y0, x1: mid1, y1, level: centre });
    z.push({ name: `f${i}-right`, x0: mid1, y0, x1: inX1, y1, level: outer });
  }
  z.push({ name: 'basement', ...RECTS.basement, level: 1 });
  return z;
})();
export const heatColor = (level) => L.ramp([[0, DANGER], [0.45, AMBER], [0.75, [200, 220, 90]], [1, SAFE]], L.clamp(level));

export const STREET = { lamps: [-14.6, 14.6], trees: [-27, 33], lampH: 7.4 };
const TREE_BLOBS = (() => { const r = L.rng(55); return Array.from({ length: 9 }, () => ({ dx: (r() - 0.5) * 3.6, dy: -r() * 3.2, s: 1.3 + r() * 1.1, sh: r() })); })();

function drawGround(c, v) {
  const gy = v.wy(0);
  if (gy > H + 10) return;
  const sk = skyState(v.gt);
  // soil cross-section
  const g = c.createLinearGradient(0, gy, 0, gy + 30 / v.cam.mpp);
  g.addColorStop(0, L.rgba(L.mix(SOIL, [70, 52, 50], 0.4)));
  g.addColorStop(1, L.rgba([14, 10, 14]));
  c.fillStyle = g;
  c.fillRect(-5, gy, W + 10, H - gy + 5);
  // strata hairlines + pebbles (world-anchored)
  c.strokeStyle = 'rgba(130,100,90,0.24)';
  c.lineWidth = 1;
  c.beginPath();
  for (const d of [1.2, 2.6, 4.8, 7.5]) {
    const y = v.wy(d);
    if (y < 0 || y > H) continue;
    for (let x = 0; x <= W; x += 40) { const yy = y + L.noise1((x * v.cam.mpp + v.cam.x) * 0.15, d) * 2.5 / v.cam.mpp * 0.15; if (x) c.lineTo(x, yy); else c.moveTo(x, yy); }
  }
  c.stroke();
  // engineered section below the street, so wide framings never show an empty brown slab:
  // tonal strata bands and a rubble/bedrock band with stones
  const ws = 1 / v.cam.mpp;
  for (const [d0, d1, col, a] of [[1.2, 2.6, [96, 72, 62], 0.16], [4.8, 7.5, [84, 66, 72], 0.18], [7.5, 400, [58, 50, 60], 0.28]]) {
    const y0 = v.wy(d0), y1 = Math.min(H + 5, v.wy(d1));
    if (y1 < 0 || y0 > H) continue;
    c.fillStyle = L.rgba(col, a);
    c.fillRect(-5, y0, W + 10, y1 - y0);
  }
  // small hard-edged stones in the rubble band (fixed table; size capped in px so close-ups never show smudges)
  const by = v.wy(7.5);
  if (by < H) {
    const x0 = v.cam.x - (W / 2) * v.cam.mpp - 1, x1 = v.cam.x + (W / 2) * v.cam.mpp + 1;
    c.fillStyle = 'rgba(140,122,130,0.36)';
    c.strokeStyle = 'rgba(206,186,176,0.10)';
    c.lineWidth = 1;
    c.beginPath();
    for (const q of STONES) {
      if (q.x < x0 || q.x > x1) continue;
      const sy = v.wy(q.y);
      if (sy > H + 12 || sy < by + 4) continue;
      const sx = v.wx(q.x), rr = L.clamp(q.r * ws, 1.4, 8);
      q.v.forEach(([a, d], i) => { const px = sx + Math.cos(a) * rr * d, py = sy + Math.sin(a) * rr * d * 0.75; if (i) c.lineTo(px, py); else c.moveTo(px, py); });
      c.closePath();
    }
    c.fill();
    c.stroke();
  }
  // (no utility pipes: at film scale their circles read as stray glyphs on the street)
  // the street in front of the building: pavement, kerb, road with lane dashes + wet reflections (exterior shots only)
  drawRoad(c, v);
  // asphalt/pavement slab + curb line
  c.fillStyle = 'rgb(30,28,34)';
  c.fillRect(-5, gy, W + 10, Math.max(2, 0.3 / v.cam.mpp));
  c.fillStyle = L.rgba(L.mix(sk.hor, [255, 200, 150], 0.3), 0.35);
  c.fillRect(-5, gy - 1, W + 10, 1.5);
  // ash on the street
  const st = settleK(v.gt);
  if (st > 0) { c.fillStyle = L.rgba(ASH, 0.35 * st); c.fillRect(-5, gy - Math.max(1, 0.06 * st / v.cam.mpp), W + 10, Math.max(1, 0.06 * st / v.cam.mpp)); }
}

const STONES = (() => {
  const r = L.rng(91);
  return Array.from({ length: 1100 }, () => {
    const n = 5 + Math.floor(r() * 3), a0 = r() * TAU;
    return { x: -150 + r() * 300, y: 7.9 + r() * 60, r: 0.07 + r() * 0.2, v: Array.from({ length: n }, (_, i) => [a0 + (i / n) * TAU + (r() - 0.5) * 0.5, 0.7 + r() * 0.3]) };
  });
})();

/** sodium lamp state 0..1 (flickers when the front passes; the right-hand lamp dies in the blast) */
function lampOn(v, x) {
  const a = v.gt - hitTimeWorld(x);
  const flick = a > 0 && a < 0.5 ? 0.35 + 0.65 * (L.noise1(v.gt * 40, x) > 0 ? 1 : 0.2) : 1;
  return (a > 0.5 && x > 0 ? 0 : 1) * flick * (1 - flashK(v.gt));
}

/** the street seen in front of the building (exterior shots; gone once the section is cut, cutK): pavement with
 *  joints, a kerb, the road with lane dashes, and the lamps' and lit windows' reflections on the damp asphalt */
export const ROAD = { walk: 1.8, kerb: 0.22, road: 11 };
function drawRoad(c, v) {
  const rk = 1 - cutK(v.gt);
  if (rk <= 0.002) return;
  const gy = v.wy(0), ws = 1 / v.cam.mpp;
  if (gy > H) return;
  const sk = skyState(v.gt), fk = flashK(v.gt);
  const yW = gy, yK = gy + Math.max(5, ROAD.walk * ws), yR = yK + Math.max(2, ROAD.kerb * ws), yE = yR + ROAD.road * ws;
  const x0w = v.cam.x - (W / 2) * v.cam.mpp - 2, x1w = v.cam.x + (W / 2) * v.cam.mpp + 2;
  c.save();
  c.globalAlpha *= rk;
  // pavement
  const gp = c.createLinearGradient(0, yW, 0, yK);
  gp.addColorStop(0, L.rgba(L.mix([70, 64, 72], sk.hor, 0.1)));
  gp.addColorStop(1, L.rgba(L.mix([54, 50, 60], sk.hor, 0.06)));
  c.fillStyle = gp; c.fillRect(-5, yW, W + 10, yK - yW);
  c.strokeStyle = 'rgba(20,18,24,0.5)'; c.lineWidth = 1;
  c.beginPath();
  for (let x = Math.ceil(x0w / 1.5) * 1.5; x < x1w; x += 1.5) { const sx = v.wx(x); c.moveTo(sx, yW + 1); c.lineTo(sx - (yK - yW) * 0.35, yK); }
  c.stroke();
  // kerb: lit top edge + darker face
  c.fillStyle = L.rgba(L.mix([150, 142, 140], sk.hor, 0.25), 0.9); c.fillRect(-5, yK, W + 10, Math.max(1.5, (yR - yK) * 0.35));
  c.fillStyle = 'rgb(34,30,38)'; c.fillRect(-5, yK + Math.max(1.5, (yR - yK) * 0.35), W + 10, (yR - yK) * 0.65);
  // asphalt
  const ga = c.createLinearGradient(0, yR, 0, yE);
  ga.addColorStop(0, L.rgba(L.mix([40, 38, 48], sk.hor, 0.08)));
  ga.addColorStop(1, 'rgb(20,18,26)');
  c.fillStyle = ga; c.fillRect(-5, yR, W + 10, yE - yR);
  // a damp sheen of sky along the far half of the road (and the flash)
  const gs = c.createLinearGradient(0, yR, 0, yR + (yE - yR) * 0.5);
  gs.addColorStop(0, L.rgba(sk.hor, 0.1 + 0.4 * fk)); gs.addColorStop(1, L.rgba(sk.hor, 0));
  c.fillStyle = gs; c.fillRect(-5, yR, W + 10, (yE - yR) * 0.5);
  // reflections: lamps (long vertical streaks) and lit facade windows (soft columns)
  c.save();
  c.globalCompositeOperation = 'lighter';
  for (const lx of STREET.lamps) {
    const on = lampOn(v, lx), hx = v.wx(lx + (lx > 0 ? 1.3 : -1.3));
    if (on <= 0.01 || hx < -100 || hx > W + 100) continue;
    const g = c.createLinearGradient(0, yR, 0, yE);
    g.addColorStop(0, L.rgba(SODIUM, 0.0)); g.addColorStop(0.12, L.rgba(SODIUM, 0.32 * on)); g.addColorStop(1, L.rgba(SODIUM, 0));
    c.fillStyle = g;
    const hw = Math.max(2, 0.35 * ws);
    c.fillRect(hx - hw, yR, hw * 2, yE - yR);
    c.fillStyle = L.rgba(SODIUM, 0.06 * on); c.fillRect(hx - hw * 4, yR, hw * 8, (yE - yR) * 0.7);
  }
  const lightsOut = v.gt > T.impact;
  for (let j = 0; j < 6; j++) {
    let n = 0;
    for (const w of FACADE_WIN) if (w.j === j && w.lit && !lightsOut) n++;
    if (!n) continue;
    const wx = v.wx(BLD.x0 + 1.1 + j * 3.75 + 0.8), hw = Math.max(1.5, 0.55 * ws);
    if (wx < -50 || wx > W + 50) continue;
    const g = c.createLinearGradient(0, yR, 0, yR + (yE - yR) * 0.8);
    g.addColorStop(0, L.rgba(SODIUM, 0.05 * n * (1 - fk))); g.addColorStop(1, L.rgba(SODIUM, 0));
    c.fillStyle = g; c.fillRect(wx - hw, yR, hw * 2, (yE - yR) * 0.8);
  }
  c.restore();
  // lane dashes (world-anchored) + a faint edge line on the far side
  const yl = L.lerp(yR, yE, 0.55), dh = Math.max(2, 0.14 * ws);
  c.fillStyle = L.rgba(L.mix([214, 204, 176], sk.hor, 0.15), 0.55);
  for (let x = Math.floor(x0w / 9) * 9; x < x1w + 9; x += 9) { const a = v.wx(x), b = v.wx(x + 3); if (b > -5 && a < W + 5) c.fillRect(a, yl - dh / 2, b - a, dh); }
  c.fillStyle = L.rgba([214, 204, 176], 0.22);
  c.fillRect(-5, yR + Math.max(3, 0.5 * ws), W + 10, Math.max(1, 0.06 * ws));
  // the road's near edge fades into the soil section below
  const gf = c.createLinearGradient(0, yE - Math.max(10, 1.2 * ws), 0, yE);
  gf.addColorStop(0, 'rgba(14,10,14,0)'); gf.addColorStop(1, 'rgba(14,10,14,0.9)');
  c.fillStyle = gf; c.fillRect(-5, yE - Math.max(10, 1.2 * ws), W + 10, Math.max(10, 1.2 * ws));
  // settled ash
  const st = settleK(v.gt);
  if (st > 0) { c.fillStyle = L.rgba(ASH, 0.18 * st); c.fillRect(-5, yW, W + 10, yE - yW); }
  c.restore();
}

function drawLamp(c, v, x) {
  const sx = v.wx(x), gy = v.wy(0), top = v.wy(-STREET.lampH), ws = 1 / v.cam.mpp;
  if (sx < -300 || sx > W + 300) return;
  const dir = x > 0 ? 1 : -1;                                  // arm leans over the street, away from the building
  const on = lampOn(v, x);
  c.save();
  c.fillStyle = 'rgb(20,20,26)';
  c.fillRect(sx - 0.09 * ws, top, 0.18 * ws, gy - top);
  c.fillRect(sx, top, dir * 1.3 * ws, 0.12 * ws);
  const hx = sx + dir * 1.3 * ws, hy = top + 0.12 * ws;
  c.fillRect(hx - 0.35 * ws, hy, 0.7 * ws, 0.18 * ws);
  if (on > 0.01) {
    c.fillStyle = L.rgba([255, 214, 150], on);
    c.fillRect(hx - 0.3 * ws, hy + 0.16 * ws, 0.6 * ws, 0.07 * ws);
    L.lightBlob(c, hx, hy + 0.3 * ws, 5 * ws, SODIUM, 0.35 * on);
    // pool of light on the pavement
    c.save();
    c.globalCompositeOperation = 'lighter';
    const g = c.createRadialGradient(hx, gy, 0, hx, gy, 4 * ws);
    g.addColorStop(0, L.rgba(SODIUM, 0.22 * on));
    g.addColorStop(1, L.rgba(SODIUM, 0));
    c.fillStyle = g;
    c.fillRect(hx - 4 * ws, gy - 4 * ws, 8 * ws, 4 * ws);
    c.restore();
  }
  c.restore();
}

/** tree bend (radians, negative = leaning left, away from the blast) */
export function treeBend(gt, x, tl) {
  sync(tl);
  const a = gt - hitTimeWorld(x);
  const sway = Math.sin(gt * 1.3 + x) * 0.02;
  if (a <= 0) return sway;
  return sway - 0.6 * L.smoothstep(L.clamp(a / 0.14)) * Math.exp(-a / 1.1) * (1 + 0.25 * Math.sin(a * 9) * Math.exp(-a / 0.5));
}
function drawTree(c, v, x) {
  const sx = v.wx(x), gy = v.wy(0), ws = 1 / v.cam.mpp;
  if (sx < -8 * ws || sx > W + 8 * ws) return;
  const bend = treeBend(v.gt, x);
  const sk = skyState(v.gt);
  const leaf = L.mix([20, 34, 38], sk.mid, 0.15);
  c.save();
  c.translate(sx, gy);
  c.fillStyle = 'rgb(22,18,22)';
  c.beginPath();
  c.moveTo(-0.22 * ws, 0); c.lineTo(0.22 * ws, 0);
  const tx = Math.sin(bend) * 4 * ws, ty = -Math.cos(bend) * 4 * ws;
  c.lineTo(tx + 0.12 * ws, ty); c.lineTo(tx - 0.12 * ws, ty); c.closePath(); c.fill();
  // crown: a dark mass, then a lit upper-left layer (sky light) so it reads as foliage, not a flat grey cut-out;
  // the crown streams away from the blast (squashed + sheared) while the front passes
  const sq = 1 + 0.35 * Math.min(0, bend + 0.05) / 0.6;
  const pos = (b) => { const by = -4.6 + b.dy; return [(b.dx * sq + Math.sin(bend * 1.5) * (-by) * 1.15) * ws, by * ws]; };
  for (const b of TREE_BLOBS) {
    const [px, py] = pos(b);
    c.fillStyle = L.rgba(L.mix(leaf, [6, 8, 12], 0.55 + 0.15 * b.sh));
    c.beginPath(); c.ellipse(px, py, Math.max(0, b.s * ws * sq), Math.max(0, b.s * ws), 0, 0, TAU); c.fill();
  }
  for (const b of TREE_BLOBS) {
    const [px, py] = pos(b);
    c.fillStyle = L.rgba(L.mix(L.mix(leaf, [10, 14, 16], 0.3), sk.hor, 0.07 + 0.06 * b.sh), 0.75);
    c.beginPath(); c.ellipse(px - 0.18 * b.s * ws, py - 0.26 * b.s * ws, Math.max(0, 0.72 * b.s * ws * sq), Math.max(0, 0.7 * b.s * ws), 0, 0, TAU); c.fill();
  }
  c.restore();
}

const FACADE_WIN = (() => { const r = L.rng(808); const o = []; for (let i = 0; i < 6; i++) for (let j = 0; j < 6; j++) o.push({ i, j, lit: r() < 0.55, tone: r(), cut: r() < 0.5 }); return o; })();
function drawBuilding(c, v) {
  const B = BLD, ws = 1 / v.cam.mpp;
  const X = (x) => v.wx(x), Y = (y) => v.wy(y);
  if (X(B.x1) < -20 || X(B.x0) > W + 20 || Y(B.parapet) > H + 20 || Y(B.foot) < -20) return;
  const ck = cutK(v.gt), fk = flashK(v.gt), sk = skyState(v.gt);
  // the tilts into / out of the night-sky chart (beat 5): the building fades out as it sinks and back in as it rises,
  // so it never crosses the caption band
  const tilt = 1 - L.smoothstep(L.prog(v.gt, S(v.tl, 5) - 0.05, 0.2)) * (1 - L.smoothstep(L.prog(v.gt, S(v.tl, 6) + 0.2, 0.25)));
  if (tilt <= 0.002) return;
  const R = (x0, y0, x1, y1) => c.fillRect(X(x0), Y(y0), X(x1) - X(x0), Y(y1) - Y(y0));
  c.save();
  c.globalAlpha *= tilt;
  // ---------------- the SECTION (always drawn; revealed as the facade dissolves)
  if (ck > 0) {
    // basement excavation
    c.fillStyle = 'rgb(28,24,30)';
    R(B.x0, 0, B.x1, B.foot);
    // rooms: warm interior light, dimmer on the floors that lost power
    for (let i = 0; i < 6; i++) {
      const y0 = FLOOR_Y(i + 1) + B.slab, y1 = FLOOR_Y(i);
      const g = c.createLinearGradient(0, Y(y0), 0, Y(y1));
      const warm = L.mix([70, 52, 44], [120, 86, 60], 0.5 + 0.5 * Math.sin(i * 2.1));
      g.addColorStop(0, L.rgba(L.mix(warm, [30, 26, 34], 0.35)));
      g.addColorStop(1, L.rgba(L.mix(warm, [20, 18, 24], 0.1)));
      c.fillStyle = g;
      R(B.x0 + B.wall, y0, B.x1 - B.wall, y1);
      // partitions
      c.fillStyle = 'rgba(40,34,40,0.9)';
      for (const px of [-7.5, 7.5]) R(px - 0.08, y0, px + 0.08, y1 - 0.9);
      // a ceiling light per room
      for (const lx of [-9.5, 4.8, -4.8, 9.5]) L.lightBlob(c, X(lx), Y(y0 + 0.25), 2.2 * ws, [255, 196, 130], 0.22);
    }
    // basement room
    {
      const g = c.createLinearGradient(0, Y(B.slab), 0, Y(B.base));
      g.addColorStop(0, 'rgb(52,44,46)'); g.addColorStop(1, 'rgb(34,30,34)');
      c.fillStyle = g;
      R(B.x0 + B.wall, B.slab, B.x1 - B.wall, B.base);
      L.lightBlob(c, X(-6), Y(B.slab + 0.3), 2.4 * ws, [255, 190, 120], 0.2);
      L.lightBlob(c, X(6), Y(B.slab + 0.3), 2.4 * ws, [255, 190, 120], 0.2);
    }
    // structure: concrete slabs, outer walls (brick skin), core walls, basement walls + foundation
    const conc = L.rgba(L.mix(CONCRETE, [90, 90, 100], 0.25));
    c.fillStyle = conc;
    for (let i = 0; i <= 6; i++) R(B.x0, FLOOR_Y(i), B.x1, FLOOR_Y(i) + B.slab);
    R(B.x0, B.base, B.x1, B.foot);
    R(B.x0, 0, B.x0 + B.wall, B.base); R(B.x1 - B.wall, 0, B.x1, B.base);
    R(B.x0, B.parapet, B.x0 + B.wall, B.roof); R(B.x1 - B.wall, B.parapet, B.x1, B.roof);
    c.fillStyle = L.rgba(BRICK);
    R(B.x0, B.roof, B.x0 + B.wall, 0); R(B.x1 - B.wall, B.roof, B.x1, 0);
    // window openings in the outer walls (glass)
    c.fillStyle = 'rgba(150,190,220,0.55)';
    for (let i = 0; i < 6; i++) { const y = FLOOR_Y(i); R(B.x0, y - 2.5, B.x0 + B.wall, y - 0.9); R(B.x1 - B.wall, y - 2.5, B.x1, y - 0.9); }
    // concrete hatch on the cut faces (fine diagonal hairlines)
    c.save();
    c.beginPath();
    for (let i = 0; i <= 6; i++) c.rect(X(B.x0), Y(FLOOR_Y(i)), X(B.x1) - X(B.x0), B.slab * ws);
    c.rect(X(B.x0), Y(B.base), X(B.x1) - X(B.x0), (B.foot - B.base) * ws);
    c.clip();
    c.strokeStyle = 'rgba(40,40,48,0.35)';
    c.lineWidth = 1;
    c.beginPath();
    const step = Math.max(5, 0.5 * ws);
    for (let x = X(B.x0) - 200; x < X(B.x1) + 50; x += step) { c.moveTo(x, Y(B.foot)); c.lineTo(x + (B.foot - B.parapet) * ws, Y(B.parapet)); }
    c.stroke();
    c.restore();
    // the core: thick concrete walls + a zig-zag stair
    c.fillStyle = conc;
    R(B.core.x0, B.roof, B.core.x0 + B.core.wall, B.base);
    R(B.core.x1 - B.core.wall, B.roof, B.core.x1, B.base);
    c.strokeStyle = 'rgba(205,200,195,0.55)';
    c.lineWidth = Math.max(1, 0.1 * ws);
    c.beginPath();
    for (let i = -1; i < 6; i++) {
      const y1 = i < 0 ? B.base : FLOOR_Y(i), y0 = i < 0 ? B.slab : FLOOR_Y(i + 1) + B.slab;
      const ym = (y0 + y1) / 2, l = B.core.x0 + 0.5, r = B.core.x1 - 0.5;
      c.moveTo(X(l), Y(y1)); c.lineTo(X(r), Y(ym)); c.lineTo(X(l), Y(y0));
    }
    c.stroke();
    // roof: ash layer
    const st = settleK(v.gt);
    if (st > 0) { c.fillStyle = L.rgba(ASH, 0.8); R(B.x0 + B.wall, B.roof - 0.18 * st, B.x1 - B.wall, B.roof); }
    // SAFE glow: core + basement stay lit green from the end of beat 3
    const sk2 = safeK(v.gt) * ck;
    if (sk2 > 0) {
      c.save();
      c.globalCompositeOperation = 'lighter';
      c.fillStyle = L.rgba(SAFE, 0.16 * sk2);
      R(B.x0 + B.wall, B.slab, B.x1 - B.wall, B.base);
      R(B.core.x0 + B.core.wall, B.roof + B.slab, B.core.x1 - B.core.wall, 0);
      c.restore();
      c.strokeStyle = L.rgba(SAFE, 0.7 * sk2);
      c.lineWidth = 2;
      c.strokeRect(X(B.x0 + B.wall), Y(B.slab), X(B.x1 - B.wall) - X(B.x0 + B.wall), Y(B.base) - Y(B.slab));
    }
  }
  // during the beat-3 pull-back the basement starts inside the caption band: it is re-buried in soil until the camera has
  // lifted it clear (screen-position fade; only in the pull-back window, so later framings are untouched)
  if (ck > 0 && v.gt < T.cut0 + 1.9) {
    const bury = L.smoothstep(L.clamp((Y(B.foot) - 1392) / 70));
    if (bury > 0.001) {
      const gy = Y(0);
      const g = c.createLinearGradient(0, gy, 0, gy + 30 / v.cam.mpp);
      g.addColorStop(0, L.rgba(L.mix(SOIL, [70, 52, 50], 0.4)));
      g.addColorStop(1, L.rgba([14, 10, 14]));
      c.save();
      c.globalAlpha = bury * tilt;
      c.fillStyle = g;
      R(B.x0 - 0.1, 0.02, B.x1 + 0.1, B.foot + 0.1);
      c.restore();
    }
  }
  // ---------------- the FACADE (brick, lit windows): peels away from the core outward in beat 3 (a wipe, no ghosting)
  if (ck < 1) {
    c.save();
    const hw = ck * (B.x1 + 0.6);
    if (ck > 0) {
      c.beginPath();
      c.rect(X(B.x0) - 12, 0, X(-hw) - X(B.x0) + 12, H);
      c.rect(X(hw), 0, X(B.x1) - X(hw) + 12, H);
      c.clip();
    }
    const g = c.createLinearGradient(0, Y(B.parapet), 0, Y(0));
    g.addColorStop(0, L.rgba(L.mix(BRICK, sk.hor, 0.18)));
    g.addColorStop(1, L.rgba(L.mix(BRICK, [40, 22, 24], 0.45)));
    c.fillStyle = g;
    R(B.x0, B.parapet, B.x1, 0);
    // brick coursing (close-ups only)
    if (ws > 16) {
      c.save();
      c.beginPath(); c.rect(X(B.x0), Y(B.parapet), X(B.x1) - X(B.x0), Y(0) - Y(B.parapet)); c.clip();
      c.strokeStyle = `rgba(30,14,16,${0.16 * L.clamp((ws - 16) / 20)})`;
      c.lineWidth = 1;
      c.beginPath();
      for (let y = B.parapet; y < 0; y += 0.3) { c.moveTo(X(B.x0), Y(y)); c.lineTo(X(B.x1), Y(y)); }
      c.stroke();
      c.restore();
    }
    // cornice (opaque stone) + its shadow, floor bands
    c.fillStyle = 'rgba(0,0,0,0.3)';
    R(B.x0, B.roof + 0.15, B.x1, B.roof + 0.4);
    c.fillStyle = L.rgba(L.mix([168, 152, 140], sk.hor, 0.12));
    R(B.x0 - 0.25, B.roof - 0.2, B.x1 + 0.25, B.roof + 0.15);
    c.fillStyle = L.rgba(L.mix([196, 180, 166], sk.hor, 0.2));
    R(B.x0 - 0.25, B.roof - 0.2, B.x1 + 0.25, B.roof - 0.12);
    c.fillStyle = 'rgba(0,0,0,0.16)';
    for (let i = 1; i < 6; i++) R(B.x0, FLOOR_Y(i) - 0.12, B.x1, FLOOR_Y(i) + 0.12);
    for (const w of FACADE_WIN) drawWindow(c, v, w, fk, sk);
    // the peel edge: a fine lit section line where the facade is being cut away
    if (ck > 0.001) {
      c.fillStyle = L.rgba([226, 220, 210], 0.85 * Math.sin(Math.PI * ck));
      for (const sx of [X(-hw), X(hw)]) c.fillRect(sx - 1.5, Y(B.parapet), 3, Y(0) - Y(B.parapet));
    }
    c.restore();
  }
  drawShards(c, v, 1 - 0.7 * ck);
  c.restore();
}

// ------------------------------------------------------------------ facade windows (per pane: lit → shattered)
// Each window: stone lintel + sill, a painted frame with a mullion, two panes. Panes break one by one as the front
// sweeps the facade (T.impact + (BLD.x1 − pane x0) · 0.02 → ≈ 0.3 s across): a white crack flash, then 4–7 sharp
// shards left in the frame around the break point (light-catching edges) over a dim warm interior whose light dies;
// a few panes survive cracked (spider-web) or intact.
const WIN_W = 1.6, WIN_H = 1.8, FRAME = 0.07, MULL = 0.06;
const winRect = (w) => { const x0 = BLD.x0 + 1.1 + w.j * 3.75, y1 = FLOOR_Y(w.i) - 0.8; return { x0, x1: x0 + WIN_W, y0: y1 - WIN_H, y1 }; };
function rayRect(bx, by, a, r) {
  const dx = Math.cos(a), dy = Math.sin(a);
  let t = Infinity;
  if (dx > 1e-9) t = Math.min(t, (r.x1 - bx) / dx); else if (dx < -1e-9) t = Math.min(t, (r.x0 - bx) / dx);
  if (dy > 1e-9) t = Math.min(t, (r.y1 - by) / dy); else if (dy < -1e-9) t = Math.min(t, (r.y0 - by) / dy);
  return [bx + dx * t, by + dy * t];
}
const FACADE_PANES = (() => {
  const r = L.rng(809), o = [];
  for (const w of FACADE_WIN) {
    const wr = winRect(w), forced = w.i === 2 && w.j === 4;   // the window s02 brackets: always shattered
    for (let k = 0; k < 2; k++) {
      const pr = { x0: wr.x0 + FRAME + k * ((WIN_W - 2 * FRAME + MULL) / 2), y0: wr.y0 + FRAME, y1: wr.y1 - FRAME };
      pr.x1 = pr.x0 + (WIN_W - 2 * FRAME - MULL) / 2;
      const q = r();
      const kind = forced ? 'broken' : w.tone < 0.8 ? (q < 0.86 ? 'broken' : 'cracked') : q < 0.4 ? 'cracked' : 'intact';
      const bx = L.lerp(pr.x0, pr.x1, 0.3 + 0.4 * r()), by = L.lerp(pr.y0, pr.y1, 0.28 + 0.4 * r());
      const shards = [], cracks = [];
      if (kind === 'broken') {
        const n = 4 + Math.floor(r() * 4), start = r() * TAU;
        const corners = [[pr.x0, pr.y0], [pr.x1, pr.y0], [pr.x1, pr.y1], [pr.x0, pr.y1]];
        for (let i = 0; i < n; i++) {
          const s0 = start + (i / n) * TAU, s1 = start + ((i + 1) / n) * TAU, gap = (s1 - s0) * (0.3 + 0.3 * r());
          const a0 = s0 + gap * 0.5, a1 = s1 - gap * 0.5, am = L.lerp(a0, a1, 0.3 + 0.4 * r());
          const Pa = rayRect(bx, by, a0, pr), Pb = rayRect(bx, by, a1, pr), Pm = rayRect(bx, by, am, pr);
          const cs = corners.map(([cx, cy]) => { let a = Math.atan2(cy - by, cx - bx); while (a < a0) a += TAU; return [a, cx, cy]; })
            .filter(([a]) => a < a1).sort((p, q2) => p[0] - q2[0]).map(([, cx, cy]) => [cx, cy]);
          const fa = 0.04 + 0.12 * r(), fm = 0.28 + 0.34 * r(), fb = 0.04 + 0.12 * r();
          const tip = (P, f) => [L.lerp(P[0], bx, f), L.lerp(P[1], by, f)];
          shards.push({ outer: [Pa, ...cs, Pb], inner: [tip(Pb, fb), tip(Pm, fm), tip(Pa, fa)], sh: r() });
        }
      } else if (kind === 'cracked') {
        const n = 7 + Math.floor(r() * 3), start = r() * TAU;
        for (let i = 0; i < n; i++) {
          const a = start + (i / n) * TAU + (r() - 0.5) * 0.4, P = rayRect(bx, by, a, pr);
          const j1 = [L.lerp(bx, P[0], 0.35) + (r() - 0.5) * 0.04, L.lerp(by, P[1], 0.35) + (r() - 0.5) * 0.04];
          const j2 = [L.lerp(bx, P[0], 0.7) + (r() - 0.5) * 0.04, L.lerp(by, P[1], 0.7) + (r() - 0.5) * 0.04];
          cracks.push([j1, j2, P]);
        }
      }
      o.push({ w, k, ...pr, kind, bx, by, shards, cracks, jit: r() * 0.03, room: r() });
    }
  }
  return o;
})();
const PANES_OF = new Map();
for (const p of FACADE_PANES) { if (!PANES_OF.has(p.w)) PANES_OF.set(p.w, []); PANES_OF.get(p.w).push(p); }
export const paneBreakTime = (p) => T.impact + (BLD.x1 - p.x0) * 0.02 + p.jit;

function drawWindow(c, v, w, fk, sk) {
  const X = (x) => v.wx(x), Y = (y) => v.wy(y), ws = 1 / v.cam.mpp;
  const wr = winRect(w);
  if (X(wr.x1) < -10 || X(wr.x0) > W + 10 || Y(wr.y1) < -10 || Y(wr.y0) > H + 10) return;
  const R = (x0, y0, x1, y1) => c.fillRect(X(x0), Y(y0), X(x1) - X(x0), Y(y1) - Y(y0));
  const poly = (pts) => { c.beginPath(); pts.forEach(([px, py], q) => (q ? c.lineTo(X(px), Y(py)) : c.moveTo(X(px), Y(py)))); c.closePath(); };
  const detail = L.clamp((ws - 8) / 14);   // fine lines only when the window is big enough to show them
  const stone = L.mix([170, 156, 146], sk.hor, 0.12);
  // lintel, sill (+ its shadow), the dark reveal + painted frame
  c.fillStyle = L.rgba(L.mix(stone, [60, 50, 50], 0.25));
  R(wr.x0 - 0.12, wr.y0 - 0.2, wr.x1 + 0.12, wr.y0);
  c.fillStyle = 'rgba(0,0,0,0.35)';
  R(wr.x0 - 0.1, wr.y1 + 0.14, wr.x1 + 0.1, wr.y1 + 0.32);
  c.fillStyle = L.rgba(stone);
  R(wr.x0 - 0.16, wr.y1, wr.x1 + 0.16, wr.y1 + 0.14);
  c.fillStyle = 'rgb(40,34,38)';
  R(wr.x0, wr.y0, wr.x1, wr.y1);
  for (const p of PANES_OF.get(w)) {
    const dt = v.gt - paneBreakTime(p);
    const broken = p.kind === 'broken' && dt >= 0, cracked = p.kind === 'cracked' && dt >= 0;
    // the room behind: dim warm; its light (if any) flickers and dies as the pane is hit
    const life = !w.lit ? 0 : dt < 0 ? 1 : dt < 0.16 ? (L.noise1(v.gt * 50, p.x0 * 3) > -0.1 ? 0.8 : 0.15) * (1 - dt / 0.16) : 0;
    const gi = c.createLinearGradient(0, Y(p.y0), 0, Y(p.y1));
    gi.addColorStop(0, L.rgba(L.mix([86, 58, 44], [255, 214, 150], life * (0.75 + 0.25 * w.tone))));
    gi.addColorStop(1, L.rgba(L.mix([34, 24, 26], [196, 128, 76], life * 0.9)));
    c.fillStyle = gi;
    R(p.x0, p.y0, p.x1, p.y1);
    if (detail > 0) {   // a hint of the room: a darker doorway / furniture block, a ceiling line
      c.fillStyle = `rgba(10,8,12,${0.35 * detail})`;
      const fx = L.lerp(p.x0, p.x1, 0.15 + 0.5 * p.room);
      R(fx, L.lerp(p.y0, p.y1, 0.35), Math.min(p.x1, fx + 0.22), p.y1);
      c.fillStyle = `rgba(255,220,170,${0.12 * detail * (0.3 + life)})`;
      R(p.x0, p.y0, p.x1, p.y0 + 0.05);
    }
    if (!broken) {
      // intact glass: sky reflection sheen (dark panes read as glass, not holes)
      const gg = c.createLinearGradient(X(p.x0), Y(p.y0), X(p.x1), Y(p.y1));
      gg.addColorStop(0, L.rgba(L.mix(sk.hor, [255, 255, 255], 0.2), 0.22 - 0.12 * life));
      gg.addColorStop(0.5, L.rgba(sk.mid, 0.08));
      gg.addColorStop(1, L.rgba(L.mix(sk.low, [20, 24, 40], 0.4), 0.3 - 0.2 * life));
      c.fillStyle = gg;
      R(p.x0, p.y0, p.x1, p.y1);
      if (fk > 0.01) { c.fillStyle = `rgba(255,246,225,${0.8 * fk})`; R(p.x0, p.y0, p.x1, p.y1); }
      if (cracked && detail > 0) {   // spider-web: radial cracks + two rings, growing out in 60 ms
        const gk = L.clamp(dt / 0.06);
        c.strokeStyle = `rgba(228,240,255,${0.42 * detail})`;
        c.lineWidth = Math.max(0.7, 0.012 * ws);
        c.lineJoin = 'miter';
        c.beginPath();
        for (const [j1, j2, P] of p.cracks) {
          c.moveTo(X(p.bx), Y(p.by));
          const e = (a, b) => [L.lerp(p.bx, a[0], b), L.lerp(p.by, a[1], b)];
          if (gk < 1) { const q = e(P, gk); c.lineTo(X(q[0]), Y(q[1])); } else { c.lineTo(X(j1[0]), Y(j1[1])); c.lineTo(X(j2[0]), Y(j2[1])); c.lineTo(X(P[0]), Y(P[1])); }
        }
        if (gk >= 1) for (const f of [0.35]) {
          p.cracks.forEach(([j1, j2], i) => { const q = f < 0.5 ? j1 : j2; if (i) c.lineTo(X(q[0]), Y(q[1])); else c.moveTo(X(q[0]), Y(q[1])); });
          c.closePath();
        }
        c.stroke();
      }
    } else {
      // the crack flash, then the shards left in the frame
      if (dt < 0.07) { c.fillStyle = `rgba(240,248,255,${0.75 * (1 - dt / 0.07)})`; R(p.x0, p.y0, p.x1, p.y1); }
      for (const q of p.shards) {
        poly([...q.outer, ...q.inner]);
        c.fillStyle = L.rgba(L.mix([176, 206, 232], sk.hor, 0.15), 0.26 + 0.14 * q.sh + 0.6 * fk);
        c.fill();
        // light-catching broken edges
        c.strokeStyle = `rgba(236,246,255,${(0.45 + 0.4 * q.sh) * (0.4 + 0.6 * detail)})`;
        c.lineWidth = Math.max(0.8, 0.018 * ws);
        c.lineJoin = 'miter';
        c.beginPath();
        const pts = [q.outer[q.outer.length - 1], ...q.inner, q.outer[0]];
        pts.forEach(([px, py], i) => (i ? c.lineTo(X(px), Y(py)) : c.moveTo(X(px), Y(py))));
        c.stroke();
      }
    }
    // shattering glint as the pane is hit
    if (dt > 0 && dt < 0.3 && p.kind !== 'intact') sparkle(c, X(p.bx), Y(p.by), 7 * Math.sin(Math.PI * dt / 0.3) * Math.min(1.6, ws / 10), 0.9);
  }
  // mullion + frame lines on top
  c.fillStyle = L.rgba(L.mix([92, 84, 84], sk.hor, 0.08));
  const fx0 = wr.x0 + FRAME + (WIN_W - 2 * FRAME - MULL) / 2;
  R(fx0, wr.y0, fx0 + MULL, wr.y1);
  if (detail > 0) {
    c.strokeStyle = L.rgba(L.mix([92, 84, 84], sk.hor, 0.08), detail);
    c.lineWidth = Math.max(1, FRAME * ws);
    c.strokeRect(X(wr.x0) + FRAME * ws / 2, Y(wr.y0) + FRAME * ws / 2, (WIN_W - FRAME) * ws, (WIN_H - FRAME) * ws);
  }
}

/** glass shards blown out of the facade windows at impact: they fall, tumble and come to rest on the pavement */
const SHARDS = (() => {
  const r = L.rng(5150), o = [];
  for (const w of FACADE_WIN) {
    if (w.tone >= 0.8) continue;
    for (let q = 0; q < 4; q++) o.push({ x: BLD.x0 + 1.1 + w.j * 3.75 + r() * 1.6, y: FLOOR_Y(w.i) - 0.8 - r() * 1.8, vx: -(1.5 + r() * 5), vy: -(r() * 2), s: 0.12 + r() * 0.22, rot: r() * TAU, spin: (r() - 0.5) * 14, d: r() * 0.12, rest: r() });
  }
  return o;
})();
export function drawShards(c, v, alpha = 1) {
  const a0 = v.gt - T.impact;
  if (a0 <= 0 || alpha <= 0) return;
  const ws = 1 / v.cam.mpp;
  c.save();
  for (const q of SHARDS) {
    const t = a0 - q.d - (BLD.x1 - q.x) * 0.02;
    if (t <= 0) continue;
    // fall time to the pavement (y = 0)
    const g = 9.8, tf = (q.vy + Math.sqrt(q.vy * q.vy + 2 * g * -q.y)) / g;
    const tt = Math.min(t, tf);
    let x = q.x + q.vx * tt * 0.85, y = q.y + q.vy * tt + 0.5 * g * tt * tt;
    if (t >= tf) { y = -0.03 - q.rest * 0.05; }
    const sx = v.wx(x), sy = v.wy(y);
    if (sx < -20 || sx > W + 20 || sy < -20 || sy > H + 20) continue;
    const rot = q.rot + q.spin * tt, sz = q.s * ws;
    const flash = t < tf ? 0.5 + 0.5 * Math.sin(rot * 3) : 0.35;
    c.save();
    c.translate(sx, sy); c.rotate(t >= tf ? 0.2 * q.rest : rot);
    c.fillStyle = `rgba(${200 + 55 * flash | 0},${225 + 30 * flash | 0},245,${alpha * (0.5 + 0.4 * flash)})`;
    c.beginPath(); c.moveTo(-sz * 0.5, sz * 0.3); c.lineTo(sz * 0.6, sz * 0.1); c.lineTo(-sz * 0.1, -sz * 0.45); c.closePath(); c.fill();
    c.restore();
  }
  c.restore();
}

/** THE PARKED CAR (poor shelter: "Not your car"), facing left on the right-hand kerb */
export const CAR = { x0: 16.2, x1: 20.6, y0: -1.45, y1: 0, wheelR: 0.33, wheels: [17.05, 19.75] };
/** the car as a heat-map zone (s03, "Not your car"): barely any protection */
export const CAR_ZONE = { name: 'car', x0: CAR.x0, y0: CAR.y0, x1: CAR.x1, y1: CAR.y1, level: 0.04 };
function drawCar(c, v) {
  const X = (x) => v.wx(x), Y = (y) => v.wy(y), ws = 1 / v.cam.mpp;
  if (X(CAR.x1) < -20 || X(CAR.x0) > W + 20 || Y(-2) > H + 20 || Y(0) < -20) return;
  const sk = skyState(v.gt);
  const a = v.gt - hitTimeWorld((CAR.x0 + CAR.x1) / 2);
  const rock = a > 0 ? -0.05 * Math.exp(-a / 0.5) * Math.sin(a * 11) : 0;
  c.save();
  c.translate(X(CAR.x1), Y(0));
  c.rotate(rock);
  c.translate(-X(CAR.x1), -Y(0));
  const body = L.mix([38, 44, 58], sk.mid, 0.12);
  // body: low hull with a rounded nose (left) and tail
  c.fillStyle = L.rgba(body);
  c.beginPath();
  c.moveTo(X(16.25), Y(-0.38));
  c.quadraticCurveTo(X(16.2), Y(-0.9), X(16.75), Y(-0.92));
  c.lineTo(X(17.45), Y(-0.98));
  c.quadraticCurveTo(X(17.9), Y(-1.44), X(18.5), Y(-1.45));
  c.lineTo(X(19.35), Y(-1.42));
  c.quadraticCurveTo(X(19.85), Y(-1.36), X(20.15), Y(-0.98));
  c.quadraticCurveTo(X(20.6), Y(-0.94), X(20.58), Y(-0.38));
  c.closePath(); c.fill();
  // glasshouse (dark windows, a B-pillar)
  c.fillStyle = 'rgba(20,26,38,0.95)';
  c.beginPath();
  c.moveTo(X(17.62), Y(-1.0)); c.quadraticCurveTo(X(18.0), Y(-1.36), X(18.5), Y(-1.37)); c.lineTo(X(19.3), Y(-1.35));
  c.quadraticCurveTo(X(19.7), Y(-1.3), X(19.95), Y(-1.0)); c.closePath(); c.fill();
  c.fillStyle = L.rgba(body); c.fillRect(X(18.72), Y(-1.38), 0.09 * ws, 0.4 * ws);
  // rim light along the roof + belt line
  c.strokeStyle = L.rgba(L.mix(sk.hor, [255, 255, 255], 0.2), 0.45);
  c.lineWidth = Math.max(1, 0.03 * ws);
  c.beginPath(); c.moveTo(X(17.5), Y(-1.0)); c.quadraticCurveTo(X(17.9), Y(-1.44), X(18.5), Y(-1.45)); c.lineTo(X(19.35), Y(-1.42)); c.stroke();
  c.beginPath(); c.moveTo(X(16.4), Y(-0.7)); c.lineTo(X(20.45), Y(-0.7)); c.stroke();
  // wheels
  for (const wx of CAR.wheels) {
    c.fillStyle = 'rgb(12,12,16)'; c.beginPath(); c.arc(X(wx), Y(-CAR.wheelR), Math.max(0, CAR.wheelR * ws), 0, TAU); c.fill();
    c.fillStyle = 'rgb(70,74,84)'; c.beginPath(); c.arc(X(wx), Y(-CAR.wheelR), Math.max(0, CAR.wheelR * 0.5 * ws), 0, TAU); c.fill();
  }
  // tail light / head light (dim)
  c.fillStyle = 'rgba(200,40,40,0.8)'; c.fillRect(X(20.5), Y(-0.85), 0.07 * ws, 0.16 * ws);
  c.fillStyle = 'rgba(255,230,190,0.5)'; c.fillRect(X(16.22), Y(-0.8), 0.07 * ws, 0.14 * ws);
  // settled ash on the roof
  const st = settleK(v.gt);
  if (st > 0) { c.fillStyle = L.rgba(ASH, 0.8); c.fillRect(X(18.3), Y(-1.45) - 0.07 * st * ws, X(19.4) - X(18.3), 0.07 * st * ws); }
  c.restore();
}

// ------------------------------------------------------------------ fallout dust (screen space, parallax tiers)
const DUST = (() => {
  const r = L.rng(4242), o = [];
  for (let i = 0; i < 1300; i++) o.push({ x: r(), y: r(), tier: i % 3, s: r(), ph: r() * TAU, sq: 0.6 + r() * 0.4, rot: r() * 3 });
  return o;
})();
// ash, not stars: warm grey motes (normal blending), bigger in front; they drift down-LEFT, away from the plume (which
// hangs upper right) toward the city, and arrive from the plume's side first
const TIER = [{ p: 0.25, v: 30, vx: 16, sz: 2.0, a: 0.5 }, { p: 0.55, v: 50, vx: 26, sz: 3.1, a: 0.66 }, { p: 0.9, v: 78, vx: 40, sz: 4.6, a: 0.8 }];
const ASH_FALL = [178, 166, 148];
function drawFallout(c, v) {
  const k = falloutK(v.gt, v.tl);
  if (k <= 0.003) return;
  const F = L.ease.outCubic(L.prog(v.gt, T.fallout0, 2.6)) * (H + 900);   // the dust sweeps in from the upper right
  const gy = v.wy(0);
  const ck = cutK(v.gt);
  const bx0 = v.wx(BLD.x0) - 2, bx1 = v.wx(BLD.x1) + 2, broof = v.wy(BLD.roof) - 3;
  const col = L.mix(ASH_FALL, skyState(v.gt).low, 0.18);
  c.save();
  // an ash veil hanging under the plume (upper right → down-left over the city): the dust reads as one falling cloud
  {
    const fs = fireScreen(v), vk = 0.14 * k * L.smoothstep(L.prog(v.gt, T.fallout0, 2.5));
    const g = c.createLinearGradient(fs.x + 200, fs.y - 300, fs.x - 900, fs.y + 900);
    g.addColorStop(0, L.rgba(col, 0)); g.addColorStop(0.3, L.rgba(col, vk)); g.addColorStop(0.75, L.rgba(col, vk * 0.6)); g.addColorStop(1, L.rgba(col, 0.2 * vk));
    c.fillStyle = g;
    c.fillRect(0, 0, W, Math.max(0, Math.min(H, gy)));
  }
  c.fillStyle = L.rgba(col);
  for (const d of DUST) {
    const t = TIER[d.tier];
    const oy = (-(v.cam.y - HOOK.y) / v.cam.mpp) * t.p * 0.15, ox = (-(v.cam.x - HOOK.x) / v.cam.mpp) * t.p * 0.15;
    const span = H + 120, spx = W + 160;
    let y = (d.y * span + v.gt * t.v * (0.8 + 0.4 * d.s) + oy) % span; if (y < 0) y += span; y -= 60;
    let x = (d.x * spx + ox + L.noise1(v.gt * 0.4 + d.ph, d.tier) * 24 - v.gt * t.vx * (0.8 + 0.4 * d.s)) % spx; if (x < 0) x += spx; x -= 80;
    const front = F - (W - x) * 0.55;
    if (y > front || y > gy - 2) continue;   // never inside the soil section
    if (ck > 0.5 && y > broof && x > bx0 && x < bx1) continue;
    // denser near the plume (top of frame), thinning toward the street
    const dens = 0.55 + 0.45 * L.clamp(1 - y / (H * 0.85));
    const a = t.a * k * dens * (0.45 + 0.55 * d.s) * L.clamp((front - y) / 160);
    if (a < 0.01) continue;
    const rr = t.sz * (0.7 + 0.6 * d.s);
    c.globalAlpha = Math.min(1, a);
    c.beginPath(); c.ellipse(x, y, rr, rr * d.sq, d.rot + v.gt * 0.6, 0, TAU); c.fill();
  }
  c.restore();
}

// ------------------------------------------------------------------ frame
export function drawBackground(c, v) {
  sync(v.tl);
  drawSky(c, v);
  drawFire(c, v);
  drawLayer(c, v, LAYERS.far);
  drawLayer(c, v, LAYERS.mid);
  drawLayer(c, v, LAYERS.near);
  drawGround(c, v);
  drawBlast(c, v);
  for (const x of STREET.trees) drawTree(c, v, x);
  for (const x of STREET.lamps) drawLamp(c, v, x);
  drawCar(c, v);
  drawBuilding(c, v);
}

export function drawForeground(c, v) {
  sync(v.tl);
  drawFallout(c, v);
  // the impact: a two-frame dust/brightness pulse
  const ia = v.gt - T.impact;
  if (ia >= 0 && ia < 2 / 30) {
    c.save();
    c.globalCompositeOperation = 'lighter';
    c.fillStyle = `rgba(255,236,206,${0.2 * (1 - ia * 12)})`;
    c.fillRect(0, 0, W, H);
    c.restore();
    c.fillStyle = `rgba(150,124,104,${0.18 * (1 - ia * 12)})`;
    c.fillRect(0, 0, W, H);
  }
  // a soft plate under the caption band (beats 1–6 carry captions; the skyline + street now sit behind them)
  const tl = v.tl, cy = v.ep?.captionY ?? 1450;
  const pk = L.smoothstep(L.prog(v.gt, tl.scenes[1].start - 0.2, 0.4)) * (1 - L.smoothstep(L.prog(v.gt, tl.scenes[7].start - 0.1, 0.3)));
  if (pk > 0.002) {
    const g = c.createLinearGradient(0, cy - 100, 0, cy + 100);
    g.addColorStop(0, 'rgba(4,6,12,0)');
    g.addColorStop(0.5, `rgba(4,6,12,${0.42 * pk})`);
    g.addColorStop(1, 'rgba(4,6,12,0)');
    c.fillStyle = g;
    c.fillRect(0, cy - 100, W, 200);
  }
  // the flash: one bloom over everything (additive), plus a horizontal anamorphic streak through the fireball
  const fk = flashK(v.gt);
  if (fk > 0.002) {
    const fs = fireScreen(v);
    c.save();
    c.globalCompositeOperation = 'lighter';
    c.fillStyle = `rgba(255,244,220,${0.42 * fk})`;
    c.fillRect(0, 0, W, H);
    const g = c.createRadialGradient(fs.x, fs.y, 0, fs.x, fs.y, 900);
    g.addColorStop(0, `rgba(255,252,240,${0.9 * fk})`);
    g.addColorStop(0.3, `rgba(255,230,170,${0.4 * fk})`);
    g.addColorStop(1, 'rgba(255,210,140,0)');
    c.fillStyle = g;
    c.fillRect(0, 0, W, H);
    const s = c.createLinearGradient(0, 0, W, 0);
    s.addColorStop(0, 'rgba(255,230,180,0)');
    s.addColorStop(fs.x / W, `rgba(255,248,230,${0.55 * fk})`);
    s.addColorStop(1, 'rgba(255,230,180,0)');
    c.fillStyle = s;
    c.fillRect(0, fs.y - 6, W, 12);
    c.restore();
  }
}

// ------------------------------------------------------------------ STEP badge (How to Survive series system)
// THE SERIES CARD SYSTEM (How to Survive #1 is the template; later episodes copy this block):
//   stepBadge   the slot card at (64, 372): 104 px tile (STEP + numeral, or an icon) + black plate with the instruction,
//               accent keyline + hazard-stripe foot. Accent: CD.yellow = a STEP; DANGER = a hazard/warning; SAFE = a
//               "do this" card without a number. Same size, entrance and position for every card in the film.
//   stepSub     the ONE sub line style under any slot card: an opaque black chip (x 64, top y 490, 46 px tall) with a
//               4 px accent bar on its left and tracked 26 px Avenir caps; parts may be coloured or carry swatches.
//   BADGE       the slot geometry; SUB_Y the chip's top.
export const BADGE = { x: 64, y: 372, h: 104 };
export const SUB_Y = 490;
export const CARD_BG = [16, 17, 21];                  // safety-card backing (pictogram knock-out colour)

/**
 * The series sub line: an opaque chip under the slot card. Screen space. Returns its box (null when k ≤ 0).
 *   parts  a string, or an array of { t: 'TEXT', col?: [r,g,b] } and { sw: (c, x, cy) => widthPx } (a drawn swatch)
 *   k      0..1 entrance (fades + settles 8 px down)
 *   opts   bar (accent bar colour, default CD.yellow) · col (text colour) · x (64) · y (top, SUB_Y) · size (26)
 */
export function stepSub(c, parts, k, opts = {}) {
  if (k <= 0) return null;
  const { bar = CD.yellow, col = [226, 228, 234], x = BADGE.x, y = SUB_Y, size = 26 } = opts;
  const P = typeof parts === 'string' ? [{ t: parts }] : parts;
  const h = Math.round(size * 1.77), padL = 22, padR = 20, track = 3;
  c.save();
  c.globalAlpha *= L.clamp(k);
  c.font = L.font(size, 700, L.FONT.body);
  c.letterSpacing = `${track}px`;
  const ws = P.map((p) => (p.sw ? null : c.measureText(p.t).width));
  c.letterSpacing = '0px';
  let w = padL + padR - track;
  P.forEach((p, i) => { w += p.sw ? 0 : ws[i]; });
  // swatches report their width when drawn; measure them with a dry run (no canvas output)
  const swW = P.map((p) => (p.sw ? p.sw(null, 0, 0) : 0));
  w += swW.reduce((a, b) => a + b, 0);
  const yy = y + (1 - L.clamp(k)) * -8;
  c.shadowColor = 'rgba(0,0,0,0.5)'; c.shadowBlur = 16; c.shadowOffsetY = 4;
  c.fillStyle = L.rgba(CD.black, 0.93);
  L.roundRect(c, x, yy, w, h, 9); c.fill();
  c.shadowColor = 'transparent';
  c.fillStyle = L.rgba(bar);
  c.fillRect(x, yy + 10, 4, h - 20);
  c.textBaseline = 'middle';
  c.textAlign = 'left';
  let cx = x + padL;
  P.forEach((p, i) => {
    if (p.sw) { p.sw(c, cx, yy + h / 2); cx += swW[i]; return; }
    c.font = L.font(size, 700, L.FONT.body);
    c.letterSpacing = `${track}px`;
    c.fillStyle = L.rgba(p.col ?? col, 0.96);
    c.fillText(p.t, cx, yy + h / 2 + 1);
    c.letterSpacing = '0px';
    cx += ws[i];
  });
  c.restore();
  return { x, y: yy, w, h };
}

/**
 * STEP badge: a civil-defence yellow tile ("STEP" + big numeral) joined to a black plate with the instruction in white,
 * a fine accent keyline and a hazard-stripe foot. Screen space. Returns its box {x, y, w, h} (null when k ≤ 0).
 *   n     step number (1…)        text   'DON'T LOOK' (upper case recommended)
 *   opts  x, y (top-left; align 'center' → x is the centre) · k 0..1 (staged entrance: tile pops 0–0.6, plate wipes
 *         0.25–1; pass an eased in/out value) · size (1 = 104 px tall) · maxW (whole badge, default 940 − x) ·
 *         accent (tile colour, default CD.yellow) · dim (0..1 grey-out) ·
 *         icon (c, h) => draws in the tile instead of STEP + n, origin at the tile centre, h = tile size (hazard /
 *         safe cards: pass n = null) · sub (string or stepSub parts: the series sub chip, enters with subK, default
 *         follows the plate) · subK · subCol (sub text colour)
 */
export function stepBadge(c, v, n, text, opts = {}) {
  const { y = BADGE.y, k = 1, size = 1, align = 'left', sub = null, accent = CD.yellow, dim = 0, icon = null } = opts;
  if (k <= 0) return null;
  const h = 104 * size, tile = h, pad = 30 * size;
  let x = opts.x ?? BADGE.x;
  const maxW = opts.maxW ?? (align === 'center' ? 880 : 940 - x);
  c.save();
  const fs = L.fitSize(c, text, maxW - tile - 2 * pad, 76 * size, 800, L.FONT.display, 26);
  c.font = L.font(fs, 800, L.FONT.display);
  c.letterSpacing = `${1 * size}px`;
  const tw = c.measureText(text).width;
  c.letterSpacing = '0px';
  const pw = tw + 2 * pad, w = tile + pw;
  if (align === 'center') x -= w / 2;
  const kt = L.clamp(k / 0.6), kp = L.ease.outCubic(L.clamp((k - 0.25) / 0.75));
  const pop = L.ease.outBack(kt, 2.2);
  c.globalAlpha *= L.clamp(k * 2.5) * (1 - 0.55 * dim);
  // plate (wipes out of the tile)
  if (kp > 0) {
    c.save();
    c.beginPath(); c.rect(x + tile - 4, y - 4, (pw + 8) * kp + 4, h + 8); c.clip();
    c.shadowColor = 'rgba(0,0,0,0.55)'; c.shadowBlur = 24 * size; c.shadowOffsetY = 6 * size;
    c.fillStyle = L.rgba(CD.black, 0.94);
    L.roundRect(c, x + tile - 12, y, pw + 12, h, 10 * size); c.fill();
    c.shadowColor = 'transparent';
    c.strokeStyle = L.rgba(accent, 0.55);
    c.lineWidth = 1.5;
    L.roundRect(c, x + tile - 12 + 6 * size, y + 6 * size, pw + 12 - 12 * size, h - 12 * size, 6 * size); c.stroke();
    // hazard foot: diagonal accent/black stripes
    const fy = y + h - 12 * size, fh = 6 * size;
    c.save();
    c.beginPath(); c.rect(x + tile + 6 * size, fy, pw - 18 * size, fh); c.clip();
    c.fillStyle = L.rgba(accent, 0.9);
    c.fillRect(x + tile, fy, pw, fh);
    c.fillStyle = L.rgba(CD.black);
    const sw = 10 * size;
    c.beginPath();
    for (let sx = x + tile - fh; sx < x + tile + pw + fh; sx += sw * 2) { c.moveTo(sx, fy + fh); c.lineTo(sx + sw, fy + fh); c.lineTo(sx + sw + fh, fy); c.lineTo(sx + fh, fy); c.closePath(); }
    c.fill();
    c.restore();
    // the instruction
    c.fillStyle = L.rgba(TEXT);
    c.font = L.font(fs, 800, L.FONT.display);
    c.textBaseline = 'middle';
    c.letterSpacing = `${1 * size}px`;
    c.fillText(text, x + tile + pad + (1 - kp) * -20, y + h * 0.47 + fs * 0.04);
    c.letterSpacing = '0px';
    c.restore();
  }
  // the tile
  c.save();
  c.translate(x + tile / 2, y + h / 2);
  c.scale(Math.max(0.001, pop), Math.max(0.001, pop));
  c.shadowColor = 'rgba(0,0,0,0.5)'; c.shadowBlur = 18 * size; c.shadowOffsetY = 4 * size;
  c.fillStyle = L.rgba(accent);
  L.roundRect(c, -tile / 2, -h / 2, tile, h, 12 * size); c.fill();
  c.shadowColor = 'transparent';
  if (icon) icon(c, h);
  else {
    c.fillStyle = L.rgba(CD.ink);
    c.textAlign = 'center';
    c.textBaseline = 'alphabetic';
    c.font = L.font(Math.round(17 * size), 700, L.FONT.body);
    L.trackedText(c, 'STEP', 0, -h / 2 + 27 * size, 4 * size, 'center');
    c.font = L.font(Math.round(66 * size), 700, L.FONT.din);
    c.fillText(String(n), 0, h / 2 - 14 * size);
  }
  c.restore();
  if (sub) stepSub(c, sub, opts.subK ?? kp, { bar: accent, col: opts.subCol, x: x });
  c.restore();
  return { x, y, w, h };
}

// ------------------------------------------------------------------ safety-card pictogram
// ISO 7010 / airline-safety-card figure (side view, facing LEFT): ONE merged filled silhouette — head disc with a clean
// neck gap, a constant-width torso, legs a touch apart with foot wedges, a nose cue on the face; far limbs one tone
// down; the near arm carries a thin knock-out (card colour) where it crosses the body or the head.
// Three key poses with eased transitions (pose u: 0 stand → 0.5 kneel → 1 face down); limbs are solved by 2-bone IK
// toward interpolated targets, so their lengths never stretch ("rubber tube") between keys.
// Figure units: s = standing height; origin = ground point under the hips at pose 0; x < 0 = forward (left); y down;
// angles in degrees, screen convention (0 right, 90 down, 180 left, −90 up).
const FIG_LEN = { torso: 0.30, neck: 0.172, thigh: 0.245, shin: 0.235, upper: 0.17, fore: 0.16, foot: 0.08 };
const FIG_WID = { torso: 0.125, leg: 0.088, arm: 0.05, head: 0.086, hand: 0.034, gap: 0.02 };
const FIG_KEYS = [
  // stand: arms hang, feet flat
  { hip: [0, -0.5], torso: -90, neck: -90, face: 180, nA: [-0.035, -0.042], fA: [0.03, -0.042], foot: 180, hang: 1 },
  // kneel: both knees down, leaning forward, hands rising to the back of the head
  { hip: [0.06, -0.27], torso: -122, neck: -140, face: 125, nA: [0.31, -0.046], fA: [0.285, -0.06], foot: 0, hang: 0 },
  // face down, flat, hands clasped over the back of the head
  { hip: [0.15, -0.072], torso: -180, neck: -180, face: 90, nA: [0.628, -0.074], fA: [0.625, -0.096], foot: 72, hang: 0 },
];
const RAD = Math.PI / 180;
const FD = (p, a, l) => ({ x: p.x + Math.cos(a * RAD) * l, y: p.y + Math.sin(a * RAD) * l });
const lerpP = (a, b, t) => [L.lerp(a[0], b[0], t), L.lerp(a[1], b[1], t)];
/** the pose at u: eased per half (stand → kneel → prone), no overshoot */
function poseAt(u) {
  u = L.clamp(u);
  const seg = u < 0.5 ? 0 : 1, f = L.smoothstep(u < 0.5 ? u * 2 : (u - 0.5) * 2);
  const a = FIG_KEYS[seg], b = FIG_KEYS[seg + 1], o = {};
  for (const k of Object.keys(a)) o[k] = Array.isArray(a[k]) ? lerpP(a[k], b[k], f) : L.lerp(a[k], b[k], f);
  return o;
}
/** 2-bone IK: joint between root A and target T (lengths l1, l2), bending to side sg (±1); returns [joint, end] */
function ik(A, T2, l1, l2, sg) {
  const dx = T2.x - A.x, dy = T2.y - A.y, d0 = Math.hypot(dx, dy) || 1e-6;
  const d = L.clamp(d0, Math.abs(l1 - l2) + 1e-4, l1 + l2 - 1e-4), a = Math.atan2(dy, dx);
  const b = Math.acos(L.clamp((l1 * l1 + d * d - l2 * l2) / (2 * l1 * d), -1, 1));
  const J = { x: A.x + Math.cos(a + sg * b) * l1, y: A.y + Math.sin(a + sg * b) * l1 };
  const e = Math.atan2(T2.y - J.y, T2.x - J.x);
  return [J, { x: J.x + Math.cos(e) * l2, y: J.y + Math.sin(e) * l2 }];
}
/** joint positions (figure units) for pose u */
export function figureJoints(u) {
  const q = poseAt(u);
  const hip = { x: q.hip[0], y: q.hip[1] };
  const sh = FD(hip, q.torso, FIG_LEN.torso);
  const head = FD(sh, q.neck, FIG_LEN.neck);
  const [nK, nA] = ik(hip, { x: q.nA[0], y: q.nA[1] }, FIG_LEN.thigh, FIG_LEN.shin, 1);
  const [fK, fA] = ik(hip, { x: q.fA[0], y: q.fA[1] }, FIG_LEN.thigh, FIG_LEN.shin, 1);
  // hands: hanging by the hips (stand) → over the back of the head (kneel, prone); near hand a little nearer the crown
  const back = q.face + 180, along = q.neck;
  const onHead = (o) => ({ x: head.x + Math.cos(back * RAD) * 0.112 + Math.cos(along * RAD) * o, y: head.y + Math.sin(back * RAD) * 0.112 + Math.sin(along * RAD) * o });
  const hangN = { x: sh.x - 0.035, y: sh.y + 0.305 }, hangF = { x: sh.x + 0.03, y: sh.y + 0.305 };
  const mixP = (a, b, t) => ({ x: L.lerp(a.x, b.x, t), y: L.lerp(a.y, b.y, t) });
  const [nE, nH] = ik(sh, mixP(onHead(-0.03), hangN, q.hang), FIG_LEN.upper, FIG_LEN.fore, -1);
  const [fE, fH] = ik(sh, mixP(onHead(0.02), hangF, q.hang), FIG_LEN.upper * 0.98, FIG_LEN.fore * 0.98, -1);
  return { hip, sh, head, nK, nA, fK, fA, nE, nH, fE, fH, face: q.face, foot: q.foot };
}

/**
 * The safety-card pictogram. (x, y) ground point under the hips at pose 0 · s standing height px ·
 * u pose 0 stand → 0.5 kneel → 1 face down, hands over the back of the head (eased inside; pass a linear u).
 *   opts: ink, gap (card colour = knock-out), alpha, ground (rule + soft contact shadow), arc (dashed motion-arc
 *         progress 0..1 with a drawn arrowhead, null = none), arcAlpha
 */
export function drawFigure(c, x, y, s, u, { ink = [246, 244, 238], gap = CARD_BG, alpha = 1, ground = true, arc = null, arcAlpha = 0.7 } = {}) {
  if (alpha <= 0 || s <= 0) return;
  const J = figureJoints(u);
  const shift = (uu) => x - 0.16 * s * L.smoothstep(L.clamp(uu));   // keep the figure centred: lying, shift by its extent
  const ox = shift(u);
  const P = (p) => [ox + p.x * s, y + p.y * s];
  const inkS = L.rgba(ink), farS = L.rgba(L.mix(ink, gap, 0.42)), gapS = L.rgba(gap);
  c.save();
  c.globalAlpha *= alpha;
  c.lineCap = 'round';
  c.lineJoin = 'round';
  const line = (pts, w, col) => { c.strokeStyle = col; c.lineWidth = w * s; c.beginPath(); pts.forEach((p, i) => (i ? c.lineTo(...P(p)) : c.moveTo(...P(p)))); c.stroke(); };
  const disc = (p, r, col) => { const [px, py] = P(p); c.fillStyle = col; c.beginPath(); c.arc(px, py, Math.max(0, r * s), 0, TAU); c.fill(); };
  const foot = (A, col) => {   // a wedge: heel under the ankle, toe along the foot direction, sole flat
    const a = J.foot * RAD, ax = Math.cos(a), ay = Math.sin(a), px = Math.sin(a), py = -Math.cos(a);
    const pt = (fx, fy) => P({ x: A.x + ax * fx + px * fy, y: A.y + ay * fx + py * fy });
    c.fillStyle = col;
    c.beginPath();
    c.moveTo(...pt(-0.03, -0.032)); c.lineTo(...pt(-0.036, 0.036)); c.lineTo(...pt(FIG_LEN.foot, 0.036)); c.lineTo(...pt(FIG_LEN.foot * 0.7, 0.0)); c.lineTo(...pt(0.02, -0.034));
    c.closePath(); c.fill();
  };
  if (ground) {
    const g = c.createLinearGradient(x - 0.75 * s, 0, x + 0.75 * s, 0);
    g.addColorStop(0, L.rgba(ink, 0)); g.addColorStop(0.18, L.rgba(ink, 0.42)); g.addColorStop(0.82, L.rgba(ink, 0.42)); g.addColorStop(1, L.rgba(ink, 0));
    c.fillStyle = g;
    c.fillRect(x - 0.75 * s, y + 0.006 * s, 1.5 * s, Math.max(2, 0.011 * s));
    // soft contact shadow under whatever touches the ground
    const xs = [J.nA.x, J.fA.x, J.hip.x, J.head.x, J.nK.x], x0 = Math.min(...xs), x1 = Math.max(...xs);
    const cxs = ox + ((x0 + x1) / 2) * s, rx = ((x1 - x0) / 2 + 0.12) * s;
    c.save();
    c.translate(cxs, y + 0.008 * s); c.scale(1, 0.09);
    const sg = c.createRadialGradient(0, 0, 0, 0, 0, rx);
    sg.addColorStop(0, L.rgba(ink, 0.16)); sg.addColorStop(1, L.rgba(ink, 0));
    c.fillStyle = sg; c.beginPath(); c.arc(0, 0, rx, 0, TAU); c.fill();
    c.restore();
  }
  if (arc != null && arc > 0.02) {
    const px0 = x + 0.25 * s, py0 = y, pts = [], n = 28;
    for (let i = 0; i <= n; i++) {
      const uu = 0.03 + 0.9 * (i / n) * arc;
      const h = figureJoints(uu).head, hx = shift(uu) + h.x * s, hy = y + h.y * s;
      const dx = hx - px0, dy = hy - py0, d = Math.hypot(dx, dy) || 1;
      pts.push([hx + (dx / d) * 0.17 * s, hy + (dy / d) * 0.17 * s]);
    }
    c.save();
    c.globalAlpha *= arcAlpha;
    c.strokeStyle = L.rgba(CD.yellow, 0.9);
    c.lineWidth = Math.max(2, 0.014 * s);
    c.setLineDash([0.035 * s, 0.03 * s]);
    c.beginPath(); pts.forEach(([px, py], i) => (i ? c.lineTo(px, py) : c.moveTo(px, py))); c.stroke();
    c.setLineDash([]);
    const [ax, ay] = pts[pts.length - 1], [bx, by] = pts[pts.length - 3];
    const a = Math.atan2(ay - by, ax - bx), hs = 0.05 * s;
    c.fillStyle = L.rgba(CD.yellow, 0.95);
    c.beginPath();
    c.moveTo(ax + Math.cos(a) * hs * 0.6, ay + Math.sin(a) * hs * 0.6);
    c.lineTo(ax + Math.cos(a + 2.5) * hs, ay + Math.sin(a + 2.5) * hs);
    c.lineTo(ax + Math.cos(a - 2.5) * hs, ay + Math.sin(a - 2.5) * hs);
    c.closePath(); c.fill();
    c.restore();
  }
  // far side (one tone down): leg + foot, arm + hand
  line([J.hip, J.fK, J.fA], FIG_WID.leg, farS);
  foot(J.fA, farS);
  line([J.sh, J.fE, J.fH], FIG_WID.arm, farS);
  disc(J.fH, FIG_WID.hand, farS);
  // the body: torso (constant width), near leg + foot, all one ink
  line([J.hip, J.sh], FIG_WID.torso, inkS);
  line([J.hip, J.nK, J.nA], FIG_WID.leg, inkS);
  foot(J.nA, inkS);
  // head: knock-out ring (separates the far hand behind it), disc, nose cue toward the face direction
  disc(J.head, FIG_WID.head + FIG_WID.gap, gapS);
  disc(J.head, FIG_WID.head, inkS);
  {
    const a = J.face * RAD, r = FIG_WID.head;
    const pt = (ang, rr) => P({ x: J.head.x + Math.cos(ang) * rr, y: J.head.y + Math.sin(ang) * rr });
    c.fillStyle = inkS;
    c.beginPath(); c.moveTo(...pt(a - 0.5, r * 0.92)); c.lineTo(...pt(a, r * 1.34)); c.lineTo(...pt(a + 0.5, r * 0.92)); c.closePath(); c.fill();
  }
  // near arm over everything, with a thin knock-out edge
  line([J.sh, J.nE, J.nH], FIG_WID.arm + 2 * FIG_WID.gap * 0.8, gapS);
  disc(J.nH, FIG_WID.hand + FIG_WID.gap * 0.8, gapS);
  line([J.sh, J.nE, J.nH], FIG_WID.arm, inkS);
  disc(J.nH, FIG_WID.hand, inkS);
  // re-close the shoulder (the knock-out must not notch the torso where the arm starts)
  disc(J.sh, FIG_WID.torso * 0.5, inkS);
  line([J.sh, J.nE], FIG_WID.arm, inkS);
  c.restore();
}
/** legacy name (setup spec): pictoDrop(c, x, y, s, { pose, color, gap, alpha, ground }) → drawFigure */
export const pictoDrop = (c, x, y, s, { pose = 1, color = [245, 245, 240], gap = CD.black, alpha = 1, ground = true } = {}) =>
  drawFigure(c, x, y, s, pose, { ink: color, gap, alpha, ground });

// ------------------------------------------------------------------ HUD
export function drawHud(c, v) {
  sync(v.tl);
  // the flash whites out the sky: a soft dark scrim under the top bar keeps it readable through the bloom
  const fkTop = L.clamp(flashK(v.gt) * 2.2);
  if (fkTop > 0.01) {
    const g = c.createLinearGradient(0, 0, 0, 260);
    g.addColorStop(0, `rgba(6,8,14,${0.5 * fkTop})`); g.addColorStop(1, 'rgba(6,8,14,0)');
    c.fillStyle = g; c.fillRect(0, 0, W, 260);
  }
  topBar(c, v, ACCENT, [236, 232, 224]);
  if (!HUD_TIMER) return;
  const tl = v.tl, gt = v.gt;
  // the digits (s00 flies them in; s01 holds them until this readout is in), the label lands with them
  const inK = L.ease.outCubic(L.prog(gt, S(tl, 1) + 0.15, 0.5));
  const labK = L.ease.outCubic(L.prog(gt, S(tl, 1) - 0.32, 0.3));
  // once inside: the clock stops, turns green, the label becomes a drawn check + SHELTERED, holds ≈ 1 s, then exits
  const tIn = T.cut0 + T.cutDur;
  const shK = L.smoothstep(L.prog(gt, tIn - 0.15, 0.3));
  const out = 1 - L.ease.inCubic(L.prog(gt, tIn + 1.25, 0.35));
  if (out <= 0 || (inK <= 0 && labK <= 0)) return;
  c.save();
  c.globalAlpha = out;
  // legible through the flash: a soft dark chip that rises with the white-out (invisible otherwise)
  const fk = L.clamp(flashK(gt) * 2.2);
  if (fk > 0.01) {
    c.fillStyle = `rgba(6,8,14,${0.6 * fk})`;
    L.roundRect(c, COUNT_HUD.x - 232, COUNT_HUD.y - 66, 252, 112, 14); c.fill();
  }
  c.textAlign = 'right';
  c.shadowColor = 'rgba(2,6,14,0.8)';
  c.shadowBlur = 14;
  if (inK > 0) {
    c.save();
    c.globalAlpha *= inK;
    c.font = L.font(64, 700, L.FONT.din);
    c.fillStyle = L.rgba(L.mix(TEXT, SAFE, shK));
    c.fillText(fmtClock(countdownAt(Math.min(gt, tIn), tl)), COUNT_HUD.x, COUNT_HUD.y);
    c.restore();
  }
  c.font = L.font(22, 600, L.FONT.body);
  if (shK < 1) {
    c.fillStyle = `rgba(232,228,220,${0.9 * labK * (1 - shK)})`;
    L.trackedText(c, 'TO GET INSIDE', COUNT_HUD.x, COUNT_HUD.sub, 3, 'right');
  }
  if (shK > 0) {
    c.fillStyle = L.rgba(SAFE, shK);
    c.font = L.font(22, 700, L.FONT.body);
    L.trackedText(c, 'SHELTERED', COUNT_HUD.x, COUNT_HUD.sub, 3, 'right');
    c.letterSpacing = '3px';
    const tw = c.measureText('SHELTERED').width;
    c.letterSpacing = '0px';
    // drawn check, ticking on
    const cx = COUNT_HUD.x - tw - 22, cy = COUNT_HUD.sub - 8, ck2 = L.clamp((gt - (tIn - 0.15)) / 0.35);
    c.shadowColor = 'transparent';
    c.strokeStyle = L.rgba(SAFE, shK); c.lineWidth = 4; c.lineCap = 'round'; c.lineJoin = 'round';
    c.beginPath();
    c.moveTo(cx - 9, cy);
    if (ck2 < 0.4) c.lineTo(cx - 9 + 6 * (ck2 / 0.4), cy + 7 * (ck2 / 0.4));
    else { c.lineTo(cx - 3, cy + 7); const f = (ck2 - 0.4) / 0.6; c.lineTo(cx - 3 + 13 * f, cy + 7 - 16 * f); }
    c.stroke();
  }
  c.restore();
}

export const cues = (tl) => (sync(tl), [
  ...beatCues(tl, { gain: 0.16, pitch: 0.9 }),
  { t: T.flash - 0.02, name: 'bloom', gain: 0.5, pitch: 0.6 },
  { t: T.flash + 0.05, name: 'deep', gain: 0.45, pitch: 0.7 },
  { t: T.blast0 + 0.1, name: 'riser', gain: 0.25, pitch: 0.8 },
  { t: T.impact, name: 'impact', gain: 0.6, pitch: 0.7 },
  { t: T.windows + 0.3, name: 'ping', gain: 0.18, pitch: 1.6 },
  { t: T.fallout0, name: 'shimmer', gain: 0.18, pitch: 0.7 },
]);
