// Beat 10 — the deep field. The camera pulls out of the Milky Way past the Local Group and the nearby clusters
// into a cosmic web of thousands of galaxies around us. The most distant galaxy we have seen (light-travel
// distance ~13.4 billion light-years) is marked; its photon sets off on "set off" and reaches us on
// "billion" while the travel-time clock races to 13+ billion years.
//
// This file also owns the world shared by beats 11–12 (galaxy field, photon trail, HUD readout, horizon);
// s11-fastest.js and s12-too-big.js import the helpers exported below.
import * as L from '../../../../engine/runtime/lib.js';
import { LY, GALAXY, at as camAt } from '../camera.js';
import { drawClock, clockRun, drawTravel, PHOTON_GOLD } from './s01-one-second.js';
import { clockIn, travelSegs } from './s08-proxima.js';
import { cruise, drawHit, drawReticle } from './s06-neptune.js';

const { W, H, ease, clamp, lerp, prog, rgba } = L;
const TAU = Math.PI * 2;
const DEG = Math.PI / 180;

// ------------------------------------------------------------------ world constants (metres)
export const HORIZON = 13.8e9 * LY;          // how far light has come since the Big Bang (light-travel distance)
export const HERO_D = 13.4e9 * LY;           // most distant galaxy seen (JADES-GS-z14-0, light left ~13.4–13.5 Gyr ago)
const HERO_A = -38 * DEG;
export const HERO = { x: HERO_D * Math.cos(HERO_A), y: HERO_D * Math.sin(HERO_A) };
const FIELD_R = 2.2 * HORIZON;               // ghost galaxies beyond the horizon, to fill any frame
const GOLD = PHOTON_GOLD;
const ORIGIN = { x: 0, y: 0 };
const ROUTE_TOP = 320;                         // the route line is clipped below the HUD band
const YR = 31557600;

// ------------------------------------------------------------------ timing (beat-relative seconds)
export const T10 = { reticle: 1.85, label: 2.05, here: 2.3, clockIn: 3.32, depart: 3.4, arrive: 4.85 };   // the clock rises with the departure
export const T11 = { count: 0.15, speed: 0.98, streak0: 0.1 };
export const T12 = { ring: 0.15, ringDur: 1.5, ghosts: 1.15, ghostDur: 1.6, ringLabel: 1.45, beyondLabel: 2.5 };
export const beatStart = (v, i) => v.tl.scenes[i].start;

/**
 * The horizon ring as drawn on screen. If the true radius would not fit the frame (camera zoomed in too far),
 * it is drawn schematically at RING_MAX px (`scaled`) and `f` (< 1) maps that radius back to a fraction of
 * HORIZON, so "inside / beyond the ring" stays consistent between the ring (s12) and the galaxies (here).
 */
export const RING_MAX = 440;
export function horizonView(v) {
  const tr = HORIZON / v.cam.mpp, r = Math.min(tr, RING_MAX);
  return { x: v.wx(0), y: v.wy(0), r, f: r / tr, scaled: tr > RING_MAX + 0.5 };
}

// ------------------------------------------------------------------ deterministic galaxy catalogue
function gauss(r) { return Math.sqrt(-2 * Math.log(Math.max(1e-9, r()))) * Math.cos(TAU * r()); }
function inDisc(r, R) { const a = r() * TAU, d = R * Math.sqrt(r()); return [d * Math.cos(a), d * Math.sin(a)]; }

const R = L.rng(1308);
// cosmic web: nodes (clusters) joined to their nearest neighbours by filaments; denser inside the horizon
export const NODES = [
  ...Array.from({ length: 70 }, () => inDisc(R, HORIZON)),
  ...Array.from({ length: 150 }, () => { for (;;) { const p = inDisc(R, FIELD_R * 1.05); if (Math.hypot(p[0], p[1]) > HORIZON) return p; } }),
];
export const EDGES = [];
{
  const seen = new Set();
  NODES.forEach(([x, y], i) => {
    const near = NODES.map(([u, w], j) => [Math.hypot(u - x, w - y), j]).filter(([, j]) => j !== i).sort((a, b) => a[0] - b[0]);
    for (const [, j] of near.slice(0, 3)) {
      const key = i < j ? `${i}_${j}` : `${j}_${i}`;
      if (!seen.has(key)) { seen.add(key); EDGES.push([i, j]); }
    }
  });
}
function webPoint(r, pUniform = 0.4) {
  const m = r();
  if (m < 1 - pUniform - 0.2) {          // filament
    const [i, j] = EDGES[(r() * EDGES.length) | 0];
    const [ax, ay] = NODES[i], [bx, by] = NODES[j];
    const t = r(), len = Math.hypot(bx - ax, by - ay);
    const s = (0.05 * len + 0.012 * HORIZON) * gauss(r);
    return [lerp(ax, bx, t) - (by - ay) / len * s, lerp(ay, by, t) + (bx - ax) / len * s];
  }
  if (m < 1 - pUniform) {
    const [x, y] = NODES[(r() * NODES.length) | 0];
    const s = 0.028 * HORIZON;
    return [x + gauss(r) * s, y + gauss(r) * s];
  }
  return inDisc(r, FIELD_R);
}

// tints: blue-white (near) to red (redshifted, far); index 5 = ghost (unobservable) grey-blue
const TINTS = [[200, 220, 255], [240, 238, 255], [255, 232, 196], [255, 196, 146], [255, 150, 112], [150, 154, 166]];
const SHAPES = 4;   // spiral, barred-ish spiral, elliptical, irregular
function mkGalaxy(r, x, y, ghost) {
  const d = Math.hypot(x, y) / HORIZON;
  const big = r();
  const tint = ghost ? 5 : clamp(Math.round(lerp(0.3, 4.2, Math.min(1, d)) + (r() - 0.5) * 1.6), 0, 4);
  return {
    x, y, ghost, d,
    shape: r() < 0.55 ? (r() < 0.6 ? 0 : 1) : r() < 0.7 ? 2 : 3,
    tint,
    rot: r() * TAU, incl: lerp(0.3, 1, r()),
    trueR: lerp(1.5e4, 7e4, r() ** 2) * LY,
    px: (big > 0.985 ? lerp(5, 8, r()) : big > 0.86 ? lerp(2.8, 4.6, r()) : lerp(1.5, 2.7, r())),
    a: (ghost ? 0.7 : lerp(1, 0.62, Math.min(1, d))) * lerp(0.6, 1, r()),
    ph: r() * TAU, tw: lerp(0.6, 1.6, r()),
  };
}
export const FIELD = [];      // observable (inside the horizon)
export const GHOSTS = [];     // beyond the horizon: light hasn't reached us yet
{
  const r = L.rng(4242);
  const NF = 3600, NG = 7000;
  for (let k = 0; k < 160000 && (FIELD.length < NF || GHOSTS.length < NG); k++) {
    const [x, y] = webPoint(r);
    const d = Math.hypot(x, y);
    if (d < 0.03 * HORIZON || d > FIELD_R) continue;
    if (d < HORIZON * 0.985) { if (FIELD.length < NF) FIELD.push(mkGalaxy(r, x, y, false)); }
    else if (d > HORIZON * 1.02 && GHOSTS.length < NG) GHOSTS.push(mkGalaxy(r, x, y, true));
  }
}
// faint dust along the filaments (the web itself)
const DUST = [];
{
  const r = L.rng(77);
  for (let k = 0; k < 7000; k++) { const [x, y] = webPoint(r, 0); DUST.push([x, y, r(), Math.hypot(x, y) / HORIZON]); }
}
// nearby galaxies for the pull-out: the Milky Way's satellites, the Local Group, then a log-spread of
// ever more distant galaxies, so the zoom always flies through something (each fades once it nears us)
const LOCAL = [];
{
  const r = L.rng(31);
  const near = (dLy, aDeg, rLy, shape, tint, px, o = { x: 0, y: 0 }) => {
    const g = mkGalaxy(r, o.x + dLy * LY * Math.cos(aDeg * DEG), o.y + dLy * LY * Math.sin(aDeg * DEG), false);
    Object.assign(g, { trueR: rLy * LY, shape, tint, px, a: 0.95 });
    g.lvl = Math.hypot(g.x, g.y);
    return g;
  };
  LOCAL.push(near(1.63e5, 200, 7e3, 3, 0, 2.6, GALAXY), near(2.0e5, 222, 3.5e3, 3, 1, 2, GALAXY),
    near(2.54e6, 38, 1.1e5, 0, 1, 6), near(2.73e6, 47, 3e4, 1, 0, 3.5), near(2.9e6, -150, 1.5e4, 3, 0, 2.5),
    near(2.2e6, 160, 1.2e4, 2, 2, 2.2), near(1.9e6, -80, 1e4, 3, 1, 2), near(2.6e6, 110, 1.4e4, 2, 2, 2.2));
  for (let i = 0; i < 1500; i++) {
    const dd = Math.exp(lerp(Math.log(4e5), Math.log(2.5e9), Math.pow(r(), 0.8))) * LY, a = r() * TAU;
    const g = mkGalaxy(r, dd * Math.cos(a), dd * Math.sin(a), false);
    g.lvl = dd; g.tint = clamp(g.tint, 0, 2); g.px *= 1.7;
    LOCAL.push(g);
  }
}

// ------------------------------------------------------------------ sprites (built once, lazily, in the browser)
const SP = 64, SR = 30, HI = 3;   // sprite box / galaxy radius in sprite units; HI = scale of the large set
const SPRITES = {};
function sprites(res = 1) {
  if (SPRITES[res]) return SPRITES[res];
  const SPR = SPRITES[res] = [];
  const r = L.rng(9);
  for (let s = 0; s < SHAPES; s++) {
    for (let ti = 0; ti < TINTS.length; ti++) {
      const cv = new OffscreenCanvas(SP * res, SP * res), c = cv.getContext('2d');
      const tint = TINTS[ti], core = L.mix(tint, [255, 255, 255], 0.6);
      c.translate(SP * res / 2, SP * res / 2);
      c.scale(res, res);
      c.globalCompositeOperation = 'lighter';
      const blob = (x, y, rad, col, a) => {
        const g = c.createRadialGradient(x, y, 0, x, y, rad);
        g.addColorStop(0, rgba(col, a)); g.addColorStop(1, rgba(col, 0));
        c.fillStyle = g; c.fillRect(x - rad, y - rad, rad * 2, rad * 2);
      };
      if (s === 0 || s === 1) {
        blob(0, 0, SR, tint, 0.22);
        const turns = s === 0 ? 3.3 : 2.4;
        for (let arm = 0; arm < 2; arm++) {
          for (let i = 0; i < 90; i++) {
            const f = i / 90, th = f * turns * Math.PI + arm * Math.PI + (s === 1 ? 0.6 : 0);
            const rr = (s === 1 ? 7 : 3) + 23 * Math.pow(f, 0.85);
            blob(rr * Math.cos(th), rr * Math.sin(th), 4.2 - 2 * f, tint, 0.2 * (1 - f * 0.6));
            if (r() < 0.12) blob(rr * Math.cos(th) + (r() - 0.5) * 3, rr * Math.sin(th) + (r() - 0.5) * 3, 1.6, [255, 170, 200], 0.4);
          }
        }
        if (s === 1) { c.save(); c.scale(1, 0.32); blob(0, 0, 10, core, 0.5); c.restore(); }
        blob(0, 0, 9, core, 0.95);
        blob(0, 0, 3.5, [255, 255, 255], 0.9);
      } else if (s === 2) {
        blob(0, 0, SR, tint, 0.35);
        blob(0, 0, 14, core, 0.6);
        blob(0, 0, 5, [255, 255, 255], 0.85);
      } else {
        for (let i = 0; i < 9; i++) blob((r() - 0.5) * 30, (r() - 0.5) * 22, lerp(4, 11, r()), tint, 0.32);
        for (let i = 0; i < 6; i++) blob((r() - 0.5) * 24, (r() - 0.5) * 18, 2, [255, 200, 220], 0.5);
        blob(0, 0, 6, core, 0.5);
      }
      SPR.push(cv);
    }
  }
  return SPR;
}

/**
 * Draw a list of galaxies; `alpha(g)` gives each one's extra visibility (0 skips). Screen-culled.
 * streak: stretch each sprite along its own screen motion over the shutter (so the 4 motion-blur
 * sub-frames merge into one smooth streak during the fast pull-out instead of strobing).
 */
function drawGalaxies(ctx, v, list, alphaFn, gt, streak = false, tintOv = null) {
  const lo = sprites(1);
  let hi = null;
  const mpp = v.cam.mpp;
  const anc = H * (v.cam.anchor ?? 0.5);
  const ox = W / 2 - v.cam.x / mpp, oy = anc - v.cam.y / mpp;
  let ca = null, cb = null;
  if (streak) { ca = camAt(gt - 1 / 120, v.tl); cb = camAt(gt + 1 / 120, v.tl); }
  for (const g of list) {
    const sx = ox + g.x / mpp, sy = oy + g.y / mpp;
    const px = Math.max(g.px, g.trueR / mpp);
    if (sx < -px - 60 || sx > W + px + 60 || sy < -px - 60 || sy > H + px + 60) continue;
    let a = alphaFn(g, px);
    if (a <= 0.004) continue;
    const big = px > 16;
    if (big && !hi) hi = sprites(HI);
    const res = big ? HI : 1;
    const s = (px * 1.25) / (SR * res);
    const c = Math.cos(g.rot) * s, sn = Math.sin(g.rot) * s;
    let m0 = c, m1 = sn, m2 = -sn * g.incl, m3 = c * g.incl;
    if (streak) {
      const dx = (W / 2 + (g.x - cb.x) / cb.mpp) - (W / 2 + (g.x - ca.x) / ca.mpp);
      const dy = (anc + (g.y - cb.y) / cb.mpp) - (anc + (g.y - ca.y) / ca.mpp);
      const len = Math.hypot(dx, dy);
      if (len > 1) {
        const ux = dx / len, uy = dy / len, f = len / (px * 2.2);   // extra length in sprite diameters
        const st = (x, y) => { const p = (x * ux + y * uy) * f; return [x + p * ux, y + p * uy]; };
        [m0, m1] = st(m0, m1); [m2, m3] = st(m2, m3);
        a /= Math.pow(1 + f, 0.6);
      }
    }
    ctx.globalAlpha = Math.min(1, a * g.a * (0.82 + 0.18 * Math.sin(gt * g.tw + g.ph)));
    ctx.setTransform(m0, m1, m2, m3, sx, sy);
    ctx.drawImage((big ? hi : lo)[g.shape * TINTS.length + (tintOv ?? g.tint)], -SP * res / 2, -SP * res / 2);
  }
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalAlpha = 1;
}

// ------------------------------------------------------------------ visibility helpers
/** Main deep-field visibility as the camera pulls out (by zoom). */
export const fieldK = (v) => ease.inOutCubic(L.invLerp(Math.log10(4e21), Math.log10(6e22), Math.log10(v.cam.mpp)));
/** Ghosts (beyond the horizon) appear in beat 12 only. */
export const ghostK = (v) => (v.tl.scenes.length > 12 ? ease.inOutCubic(prog(v.gt, beatStart(v, 12) + T12.ghosts, T12.ghostDur)) : 0);

// ------------------------------------------------------------------ photon (beat 10) + trail
/** Photon progress hero -> Earth (0..1): eases in, then cruises (light does not brake). */
export function photonP(v) {
  return cruise(prog(v.gt - beatStart(v, 10), T10.depart, T10.arrive - T10.depart), 0.12);
}
/** Screen position of a world point. */
const scr = (v, p) => [v.wx(p.x), v.wy(p.y)];

function drawTrail(ctx, v) {
  const t = v.gt - beatStart(v, 10);
  if (t < T10.depart - 0.3) return;
  const [hx, hy] = scr(v, HERO), [ex, ey] = scr(v, ORIGIN);
  const t12 = v.tl.scenes[12] ? v.gt - beatStart(v, 12) : -1;
  const dim = t12 > 0 ? lerp(1, 0.6, ease.inOutCubic(clamp(t12 / 1.5))) : 1;
  // the route the light took: a thin gold line that stays for the rest of the film
  const p = photonP(v);
  if (p > 0) {
    const px = lerp(hx, ex, p), py = lerp(hy, ey, p);
    // beat 12 with a schematic ring: the part of the route outside the ring fades with the ghosts
    const hv = horizonView(v), gk = hv.scaled ? ghostK(v) : 0;
    const pass = (a, outside) => {
      if (a <= 0.003) return;
      ctx.save();
      ctx.beginPath(); ctx.rect(0, ROUTE_TOP, W, H - ROUTE_TOP); ctx.clip();   // never through the HUD band
      if (gk > 0) {
        ctx.beginPath();
        if (outside) ctx.rect(0, 0, W, H);
        ctx.arc(hv.x, hv.y, hv.r, 0, TAU);
        ctx.clip('evenodd');
      }
      ctx.globalCompositeOperation = 'lighter';
      ctx.lineCap = 'round';
      ctx.strokeStyle = rgba(GOLD, 0.1 * a); ctx.lineWidth = 6;
      ctx.beginPath(); ctx.moveTo(hx, hy); ctx.lineTo(px, py); ctx.stroke();
      ctx.strokeStyle = rgba(GOLD, 0.5 * a); ctx.lineWidth = 1.6;
      ctx.beginPath(); ctx.moveTo(hx, hy); ctx.lineTo(px, py); ctx.stroke();
      ctx.restore();
    };
    pass(dim, false);
    if (gk > 0) pass(dim * (1 - gk), true);
  }
  // the photon itself (film-wide head + beam); the beam drains into Earth after arrival
  const after = t - T10.arrive;
  const head = clamp((t - T10.depart + 0.15) / 0.2) * (1 - clamp(after / 0.2));
  const beamA = 1 - clamp(after / 0.6);
  if (beamA > 0) drawTravel(ctx, v, HERO, ORIGIN, Math.max(0.001, p), { trail: 0.3, route: 0, head, s: 0.85, a: beamA });
  // departure flash at the galaxy
  const fk = prog(t, T10.depart - 0.1, 1.0);
  if (fk > 0 && fk < 1) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    L.lightBlob(ctx, hx, hy, lerp(30, 110, ease.outCubic(fk)), [255, 200, 160], 0.6 * (1 - fk));
    ctx.strokeStyle = rgba([255, 180, 150], 0.55 * (1 - fk));
    ctx.lineWidth = 1.8;
    ctx.beginPath(); ctx.arc(hx, hy, Math.max(0, lerp(10, 64, ease.outCubic(fk))), 0, TAU); ctx.stroke();
    ctx.restore();
  }
  // arrival hit at Earth
  drawHit(ctx, ex, ey, after);
}

/** "You are here": a small gold marker at the origin. */
function drawHere(ctx, v, k) {
  if (k <= 0) return;
  const x = v.wx(0), y = v.wy(0);
  const pulse = 0.5 + 0.5 * Math.sin(v.gt * 2.4);
  ctx.save();
  ctx.globalAlpha = k;
  L.lightBlob(ctx, x, y, 26, GOLD, 0.45);
  ctx.fillStyle = 'rgba(255,250,236,1)';
  ctx.beginPath(); ctx.arc(x, y, 3.5, 0, TAU); ctx.fill();
  ctx.strokeStyle = rgba(GOLD, 0.45 + 0.25 * pulse);
  ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.arc(x, y, 10 + 2 * pulse, 0, TAU); ctx.stroke();
  ctx.restore();
}

/** The marked most-distant galaxy (always drawn a little larger, glowing red). */
function drawHero(ctx, v, k) {
  if (k <= 0) return;
  const [x, y] = scr(v, HERO);
  if (x < -100 || x > W + 100 || y < -100 || y > H + 100) return;
  const spr = sprites(1);
  ctx.save();
  ctx.globalAlpha = k;
  L.lightBlob(ctx, x, y, 34, [255, 120, 90], 0.35);
  ctx.globalCompositeOperation = 'lighter';
  ctx.translate(x, y); ctx.rotate(0.5); ctx.scale(1, 0.62);
  const s = 8.5 / SR;
  ctx.scale(s, s);
  ctx.drawImage(spr[3 * TINTS.length + 4], -SP / 2, -SP / 2);
  ctx.restore();
}

// ------------------------------------------------------------------ world
function drawWorld(ctx, v) {
  if (v.tl.scenes.length < 11 || v.gt < beatStart(v, 10) - 0.05 || v.cam.mpp < 5e17) return;
  const gt = v.gt;
  const fk = fieldK(v);
  const mpp = v.cam.mpp;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';

  // the web: faint filament glow + dust
  if (fk > 0) {
    const ox = W / 2 - v.cam.x / mpp, oy = H * (v.cam.anchor ?? 0.5) - v.cam.y / mpp;
    const gk = ghostK(v);
    const f = gk > 0 ? horizonView(v).f : 1;     // beyond-the-ring threshold (fraction of HORIZON)
    // soft glow on the web's knots (clusters)
    const nr = 0.075 * HORIZON / mpp;
    for (let i = 0; i < NODES.length; i++) {
      const [x, y] = NODES[i];
      const dm = Math.hypot(x, y) / HORIZON;
      // beyond the horizon the web stays a faint texture (fills the frame) until beat 12 greys it as the ghosts appear
    const vis = dm < f ? fk * 0.09 : dm < 1 ? fk * 0.09 * (1 - gk) + gk * 0.04 : fk * 0.085 * (1 - gk) + gk * 0.045;
      const sx = ox + x / mpp, sy = oy + y / mpp;
      if (vis <= 0 || sx < -nr || sx > W + nr || sy < -nr || sy > H + nr) continue;
      L.lightBlob(ctx, sx, sy, nr, dm < f || (dm < 1 && gk < 0.5) ? L.mix([170, 180, 255], [255, 160, 130], clamp(dm)) : TINTS[5], vis);
    }
    const ds = Math.max(1, 1.4 * Math.min(1, 2.2e23 / mpp));
    for (const [x, y, rr, dm] of DUST) {
      const sx = ox + x / mpp, sy = oy + y / mpp;
      if (sx < 0 || sx > W || sy < 0 || sy > H) continue;
      const out = dm > f * 1.01;                 // beyond the (drawn) ring
      const vis = !out ? (dm < 0.99 ? fk * 1.25 : 0) : dm < 0.99 ? fk * 1.25 * (1 - gk) + gk * 0.55 : dm > 1.01 ? fk * 1.6 * (1 - gk) + gk * 0.6 : 0;
      if (vis <= 0) continue;
      ctx.fillStyle = !out || (dm < 1 && gk < 0.5) ? rgba(L.mix([190, 200, 255], [255, 170, 130], clamp(dm)), (0.1 + 0.18 * rr) * vis) : rgba(TINTS[5], (0.08 + 0.14 * rr) * vis);
      ctx.fillRect(sx, sy, ds, ds);
    }
  }

  const lk = ease.outCubic(prog(gt - beatStart(v, 10), 0, 0.5));
  // nearby galaxies (fly past during the pull-out; fade once their level collapses towards us)
  drawGalaxies(ctx, v, LOCAL, (g) => {
    const rpx = g.lvl / mpp;
    return clamp(L.invLerp(14, 80, rpx)) * lk * lerp(1, 0.5, fk);
  }, gt, fk < 0.98);
  // the deep field (observable) and the ghosts beyond the horizon
  if (fk > 0) {
    const gk = ghostK(v);
    const f = gk > 0 ? horizonView(v).f : 1;
    const base = (g) => fk * (1 - 0.55 * L.smoothstep(clamp((g.d - 0.8) / 0.2)));
    // observable galaxies; any that sit beyond a schematic (not-to-scale) ring turn ghost-grey with the ghosts
    drawGalaxies(ctx, v, FIELD, (g) => 1.25 * base(g) * (g.d > f ? 1 - gk : 1), gt);
    if (gk > 0) {
      // unobservable: grey and about half as bright as the observable field (they must read as fainter, not bluer)
      if (f < 0.985) drawGalaxies(ctx, v, FIELD, (g) => (g.d > f ? gk * base(g) * 0.55 : 0), gt, false, 5);
      drawGalaxies(ctx, v, GHOSTS, (g) => gk * 0.8 * clamp(1.2 - (g.d - 1) * 0.5), gt);
    }
  }
  ctx.restore();

  const t = gt - beatStart(v, 10);
  drawHero(ctx, v, fk * lerp(0.55, 1, ease.outCubic(prog(t, T10.reticle - 0.3, 0.6))));
  drawHere(ctx, v, ease.outCubic(prog(t, 1.6, 0.8)));
  drawTrail(ctx, v);
}

// ------------------------------------------------------------------ HUD (screen space)
const TOTAL = 13e9 * YR;     // "more than thirteen billion years"

/** Where the hero galaxy sits on screen, and whether it is comfortably visible. */
export function heroScreen(v) {
  const [x, y] = scr(v, HERO);
  return { x, y, on: x > 70 && x < W - 70 && y > 560 && y < 1500 };
}

/** drawTag's look (elbow leader + tracked name + sub line), but the text fades/rises in instead of wiping. */
function fadeTag(ctx, x, y, lx, ly, text, k, { align = 'left', col = [235, 230, 222], sub = '' } = {}) {
  if (k <= 0.001) return;
  const e = ease.outCubic(clamp(k));
  const dir = align === 'left' ? 1 : -1;
  ctx.save();
  ctx.globalAlpha *= clamp(k * 1.4);
  ctx.strokeStyle = rgba(col, 0.5);
  ctx.lineWidth = 1.5;
  const e1 = clamp(e * 1.6), e2 = clamp(e * 1.6 - 0.6);
  ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(lerp(x, lx, e1), lerp(y, ly, e1));
  if (e2 > 0) ctx.lineTo(lx + dir * 24 * e2, ly);
  ctx.stroke();
  if (e2 > 0) {
    const tx = lx + dir * 34, dy = (1 - e2) * 8;
    ctx.globalAlpha *= e2;
    ctx.textBaseline = 'middle';
    ctx.shadowColor = 'rgba(0,0,0,0.8)';
    ctx.shadowBlur = 10;
    ctx.font = L.font(25, 700, L.FONT.body);
    ctx.fillStyle = rgba(col, 0.96);
    L.trackedText(ctx, text, tx, ly + dy, 3.5, align);
    if (sub) {
      ctx.font = L.font(20, 500, L.FONT.body);
      ctx.fillStyle = 'rgba(178,190,208,0.88)';
      L.trackedText(ctx, sub, tx, ly + 29 + dy, 1, align);
    }
  }
  ctx.restore();
}

function drawOverlay(ctx, v) {
  const t = v.t;
  const hs = heroScreen(v);
  // world labels are gone by the beat's end (no ghosting into beat 11)
  const out = v.tl.scenes[11] ? 1 - ease.inOutCubic(prog(v.gt, beatStart(v, 11) - 0.4, 0.38)) : 1;
  const [ex, ey] = scr(v, ORIGIN);
  // the most distant galaxy: reticle + tag (or a chevron on the frame edge if it is out of frame)
  const tk = prog(t, T10.label, 0.6) * v.k * out;
  if (hs.on) {
    drawReticle(ctx, hs.x, hs.y, 22, prog(t, T10.reticle, 0.5) * v.k * out, [255, 175, 150], 0.85, v.gt);
    fadeTag(ctx, hs.x - 20, hs.y + 10, hs.x - 140, hs.y + 46, 'MOST DISTANT GALAXY SEEN', tk,
      { align: 'right', sub: 'Spotted by the James Webb telescope' });
  } else if (tk > 0) {
    // off-screen: a chevron where the route meets the safe frame edge, the tag set clear of the route line
    const dx = hs.x - ex, dy = hs.y - ey;
    const X0 = 70, X1 = W - 70, Y0 = ROUTE_TOP + 30, Y1 = 1450;
    const s = Math.min(dx > 0 ? (X1 - ex) / dx : dx < 0 ? (X0 - ex) / dx : 9, dy < 0 ? (Y0 - ey) / dy : dy > 0 ? (Y1 - ey) / dy : 9);
    const cx = clamp(ex + dx * s, X0, X1), cy = clamp(ey + dy * s, Y0, Y1);
    const ang = Math.atan2(dy, dx);
    const ck = L.clamp(tk * 1.4);
    ctx.save();
    ctx.globalAlpha = ck;
    ctx.translate(cx, cy); ctx.rotate(ang);
    ctx.shadowColor = 'rgba(0,0,0,0.8)'; ctx.shadowBlur = 8;
    const nudge = 5 * Math.sin(v.gt * 3.2);           // a gentle "this way" push
    ctx.strokeStyle = rgba(GOLD); ctx.lineWidth = 3; ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    for (const [o, a] of [[0, 1], [-16, 0.45]]) {
      ctx.globalAlpha = ck * a;
      ctx.beginPath(); ctx.moveTo(-10 + o + nudge, -12); ctx.lineTo(4 + o + nudge, 0); ctx.lineTo(-10 + o + nudge, 12); ctx.stroke();
    }
    ctx.restore();
    // tag below the chevron, right-aligned so its text ends well left of the route line at that height
    const ly = Math.max(cy + 130, 560);
    const lineX = Math.abs(dy) > 1 ? ex + dx * (ly - ey) / dy : W;
    const lx = Math.min(cx - 40, lineX - 30);
    // the leader leaves from the chevron's text side of the route, so it never crosses the gold line
    const nx = Math.sin(ang), ny = -Math.cos(ang);     // normal on the side where the text sits
    const side = lx < lineX ? (nx < 0 ? 1 : -1) : (nx < 0 ? -1 : 1);
    fadeTag(ctx, cx - 14 * Math.cos(ang) + side * 20 * nx, cy - 14 * Math.sin(ang) + side * 20 * ny, lx, ly, 'MOST DISTANT GALAXY SEEN', tk,
      { align: 'right', sub: 'Off-screen, this way' });
  }
  // you are here
  drawReticle(ctx, ex, ey, 18, prog(t, T10.here - 0.15, 0.5) * v.k * out, [235, 230, 222], 0.6, -v.gt);
  fadeTag(ctx, ex - 14, ey + 14, ex - 64, ey + 70, 'YOU ARE HERE', prog(t, T10.here, 0.6) * v.k * out, { align: 'right', col: [240, 236, 228] });
  // the travel-time clock races through seconds, hours, years… to 13+ billion years
  const tq = Math.round(v.gt * 30) / 30 - beatStart(v, 10);    // digits change once per frame (crisp under blur)
  const locked = tq >= T10.arrive;
  const sec = clockRun(tq, T10.depart, T10.arrive, TOTAL, 'exp');
  drawClock(ctx, v, {
    segs: locked ? [{ n: '13+', u: 'BILLION YEARS' }] : travelSegs(sec),
    lockAt: T10.arrive, lockLabel: 'GALAXY TO EARTH',
    k: clockIn(v, T10.depart),
  });
}

export default {
  beat: 10,
  chapter: { num: '10', title: 'The deep field', sub: 'The most distant galaxies' },
  captions: true,
  layer: 1,
  cues(d) {
    return [
      { t: 0.05, name: 'swell', gain: 0.4, pitch: 0.7 },          // the long pull-out
      { t: 1.25, name: 'shimmer', gain: 0.25, pitch: 0.8 },       // the deep field blooms in
      { t: T10.reticle, name: 'blip', gain: 0.3, pitch: 1.1 },
      { t: T10.here, name: 'tick', gain: 0.18, pitch: 1.2 },
      { t: T10.depart, name: 'bloom', gain: 0.3, pitch: 1.3 },    // the photon sets off
      { t: T10.arrive - 1.2, name: 'riser', gain: 0.28, pitch: 0.9 },
      { t: T10.depart + 0.5, name: 'count', gain: 0.22, pitch: 1.1 },
      { t: T10.arrive, name: 'impact', gain: 0.55, pitch: 0.8 },  // arrives: clock locks
      { t: T10.arrive + 0.02, name: 'tick', gain: 0.4, pitch: 0.9 },
    ];
  },
  drawWorld,
  drawOverlay,
};
