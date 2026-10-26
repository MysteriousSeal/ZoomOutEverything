// Beat 5 — "Over time, the oceans would start to move."
// The camera pulls back from the district to the whole planet. As the globe forms, the sea surface starts to
// stir: faint current lines drift from the equator toward both poles.
//
// This file also owns the REPAINTED SURFACE for beats 5–8 (the signature visual), drawn every frame from
// global time so the camera can move freely. It is computed PER PIXEL from the real ETOPO1 elevation (earth.js)
// and a geoid-like sea level: without the spin the equatorial bulge relaxes, so the sea surface drops by up to
// ~7.6 km at the equator and rises by up to ~13.8 km at the poles (zero near ±36°, as in Witold Fraczek's
// Esri map). Where elevation < new sea level there is water. So:
//   · the equatorial band drains: real sea floor appears (shelves, the S of the Mid-Atlantic Ridge, the East
//     Pacific Rise, trenches) behind a moving foam line; old coastlines stay readable;
//   · the high latitudes flood: Canada, northern Eurasia, Patagonia and Antarctica go under the polar oceans;
//   · current streaks on the water (a stir in beat 5, a strong poleward flow in beat 7, a calm drift in beat 8);
//   · beat 8's emphasis (polar oceans glow, a warm sweep along the ring continent) is part of the same raster.
//   → end state: two polar oceans + one ring continent around the middle. env lights it all afterwards.
// Everything fades out during beat 9's pull-out so the real Earth is back for the orbit reveal.
// Exports the shared timing/state and path helpers for s06–s08.
import * as L from '../../../../engine/runtime/lib.js';
import { elevation } from '../../../../engine/runtime/earth.js';
import { DEG, LON0, globeGeom, globeVisible } from '../env.js';

const { W, H } = L;
const TAU = Math.PI * 2;

// ------------------------------------------------------------------ timing (beat-local word times from the VO)
// beat 5: over 0.15 · oceans 1.04 · start 1.72 · move 2.20
// beat 6: spinning 0.15 · bulge 1.30 · twenty-one 1.95 · equator 3.49
// beat 7: without 0.15 · water 1.09 · slides 1.39 · poles 2.28
// beat 8: two 0.15 · polar 0.37 · oceans 0.70 · continent 2.45 · middle 3.57
export const W5 = { oceans: 1.04, start: 1.72, move: 2.2 };
export const W6 = { spinning: 0.15, bulge: 1.3, num: 1.95, equator: 3.49 };
export const W7 = { water: 1.09, slides: 1.39, poles: 2.28 };
export const W8 = { two: 0.15, polar: 0.37, oceans: 0.7, continent: 2.45, middle: 3.57 };   // continent: measured on the VO (43.28 s)
export const TB = (v, i) => v.tl.scenes[i].start;

/** Smoothstep ramp 0→1 over [t0, t0+dur] and its time integral (for flow phases that speed up smoothly). */
const ramp = (t, t0, dur) => L.smoothstep(L.prog(t, t0, dur));
function rampInt(t, t0, dur) {
  const x = L.prog(t, t0, dur);
  return dur * (x * x * x - (x * x * x * x) / 2) + Math.max(0, t - t0 - dur);
}
// flow intensity = Σ amp·ramp: the stir (beat 5), quieter under the bulge (6), the poleward rush (7), calm (8)
function flowTerms(v) {
  return [
    [TB(v, 5) + W5.start - 0.45, 1.3, 0.5],
    [TB(v, 6) + 0.6, 1.2, -0.32],
    [TB(v, 7) + W7.water - 0.5, 0.9, 0.82],
    [TB(v, 8) + 0.1, 1.6, -0.82],
  ];
}

/** The whole repaint's state at this frame (all functions of global time). */
export function surfaceState(v) {
  const gt = v.gt;
  const t7 = TB(v, 7), t9 = TB(v, 9);
  // visible only once the pull-back reaches globe scale, until the pull-out in beat 9
  const scale = L.clamp(L.invLerp(Math.log(2500), Math.log(9000), Math.log(v.cam.mpp)));
  const fade = 1 - L.ease.inOutCubic(L.prog(gt, t9 + 0.1, 1.1));
  const terms = flowTerms(v);
  let flow = 0, phase = 0;
  for (const [t0, d, a] of terms) { flow += a * ramp(gt, t0, d); phase += a * rampInt(gt, t0, d); }
  return {
    k: scale * fade * +(gt > TB(v, 5) && gt < t9 + 1.5),
    fade,
    flow: Math.max(0, flow),
    phase,
    // the sea drains outward from the equator…
    drain: L.ease.inOutCubic(L.prog(gt, t7 + W7.water - 0.25, 2.9)),
    // …and the water rises over the high latitudes, a little later
    flood: L.ease.inOutCubic(L.prog(gt, t7 + W7.slides - 0.1, 2.9)),
  };
}

// ------------------------------------------------------------------ the new sea level
const A_GEO = 21400, C_GEO = 0.355;
/** Sea-level change (m) at latitude (deg) once the planet has stopped: < 0 drains, > 0 floods. */
export const seaShift = (lat) => { const s = Math.sin(lat * DEG); return A_GEO * (s * s - C_GEO); };
/** Sea level (m, relative to today's) at latitude lat (deg) for the current drain / flood progress. */
export function seaAt(st, lat) { const d = seaShift(lat); return d < 0 ? d * st.drain : d * st.flood; }

/** Screen point of (lat, lon) radians on the globe (front face). */
function sp(g, la, lo) {
  const cl = Math.cos(la), dl = lo - g.lon0;
  return [g.cx + g.r * cl * Math.sin(dl), g.cy - g.r * Math.sin(la)];
}

// ------------------------------------------------------------------ the stopped globe, sampled once
// N×N cells over the disc for the stopped orientation (LON0 facing us): latitude, elevation, local elevation
// change per cell (for anti-aliased shorelines) and a hillshade term.
const N = 760;
let GRID = null;
function grid() {
  if (GRID) return GRID;
  const LAT = new Float32Array(N * N), E = new Float32Array(N * N), GM = new Float32Array(N * N), SH = new Float32Array(N * N);
  const IN = new Uint8Array(N * N);
  for (let j = 0; j < N; j++) {
    const Y = ((j + 0.5) / N) * 2 - 1;
    for (let i = 0; i < N; i++) {
      const X = ((i + 0.5) / N) * 2 - 1, rr = X * X + Y * Y, o = j * N + i;
      const sc = rr > 0.99995 ? Math.sqrt(0.99995 / rr) : 1, Xc = X * sc, Yc = Y * sc;
      const lon = (LON0 + Math.atan2(Xc, Math.sqrt(Math.max(0, 1 - Xc * Xc - Yc * Yc)))) / DEG;
      IN[o] = rr < 1.0004 ? 1 : 0;
      LAT[o] = -Math.asin(Yc) / DEG;
      E[o] = elevation(LAT[o], lon);
    }
  }
  const cellM = (2 * 6.371e6) / N;
  for (let j = 1; j < N - 1; j++) {
    for (let i = 1; i < N - 1; i++) {
      const o = j * N + i;
      const dx = (E[o + 1] - E[o - 1]) / 2, dy = (E[o + N] - E[o - N]) / 2;
      GM[o] = Math.abs(dx) + Math.abs(dy) + 1;
      SH[o] = L.clamp(((dx + dy) / cellM) * 7, -0.32, 0.32);     // light from the upper left
    }
  }
  GRID = { LAT, E, GM, SH, IN, cv: new OffscreenCanvas(N, N), img: new ImageData(N, N) };
  return GRID;
}

// colour ramps: exposed sea floor by depth (m below today's sea), and water by depth
const FLOOR = [[0, [196, 178, 140]], [250, [176, 156, 120]], [2000, [142, 124, 98]], [4200, [112, 98, 82]], [6000, [86, 76, 66]], [9000, [58, 50, 46]]];
const WATER = [[0, [38, 104, 150]], [60, [28, 88, 140]], [200, [19, 66, 120]], [1000, [14, 48, 100]], [3000, [10, 36, 82]], [6000, [7, 27, 66]]];
function lut(stops, n, scale) {
  const a = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { const c = L.ramp(stops, i * scale); a[i * 3] = c[0]; a[i * 3 + 1] = c[1]; a[i * 3 + 2] = c[2]; }
  return a;
}
const FL = lut(FLOOR, 901, 10), WL = lut(WATER, 901, 10);

/** Beat-specific accents baked into the raster. */
function fxState(v) {
  const t5 = TB(v, 5), t8 = v.gt - TB(v, 8);
  return {
    // "start to move": the water's edge lights up along every coast, then settles; gone once the sea drains
    lap: L.ease.outCubic(L.prog(v.gt, t5 + W5.start, 0.7)) * (1 - 0.65 * L.ease.inOutCubic(L.prog(v.gt, t5 + W5.move + 0.4, 1.4)))
      * (1 - L.ease.inOutCubic(L.prog(v.gt, TB(v, 7) + W7.water - 0.4, 0.9))),
    // beat 8: the two oceans glow ("polar oceans"), then a warm light sweeps east along the continent
    ocean: L.ease.outCubic(L.prog(t8, W8.polar - 0.1, 0.6)) * (1 - 0.45 * L.ease.inOutCubic(L.prog(t8, W8.continent - 0.2, 0.8))),
    sweep: L.prog(t8, W8.continent - 0.15, 1.8),
  };
}

function paint(st, fx) {
  const G = grid();
  const { LAT, E, GM, SH, IN } = G, d = G.img.data;
  const shoreK = Math.max(L.clamp(st.drain * 6), L.clamp(st.flood * 6));
  const sweepX = fx.sweep > 0 && fx.sweep < 1 ? L.lerp(-1.3, 1.3, L.ease.inOutCubic(fx.sweep)) : 9;
  const sweepA = 0.16 * Math.sin(Math.PI * L.clamp(fx.sweep));
  // sea level per row (it only depends on latitude, and rows are latitudes in this equator-on view)
  for (let j = 0; j < N; j++) {
    const lat = -Math.asin(L.clamp(((j + 0.5) / N) * 2 - 1, -1, 1)) / DEG;
    const sea = seaAt(st, lat), alat = Math.abs(lat);
    const glowRow = fx.ocean > 0 ? 0.24 * fx.ocean * (1 - L.clamp((alat - 22) / 50)) : 0;
    for (let i = 0; i < N; i++) {
      const o = j * N + i, p = o * 4;
      d[p + 3] = 0;
      if (!IN[o]) continue;
      const e = E[o], gm = GM[o], dd = e - sea;
      // land factor at the new sea level (anti-aliased), and at today's
      let land = L.clamp(0.5 + dd / gm);
      // no trench puddles near the equator: a feathered band whose edge follows the bathymetry (deep basins keep
      // their water a little closer to the equator), so the drained floor never shows a straight edge at ±20°
      if (alat < 28 && e < 0 && st.drain > 0.6) {
        const edge = 24 - 13 * L.clamp(-dd / 2600) + 1.4 * (L.noise1(i * 0.02, 7) + L.noise1(j * 0.025, 8));
        const wq = L.smoothstep(L.clamp(0.5 + (edge - alat) * 0.45));
        land = Math.max(land, L.clamp((st.drain - 0.6) / 0.3) * wq);
      }
      const was = L.clamp(0.5 + e / gm);
      let r = 0, gg = 0, b = 0, a = 0;
      const over = (cr, cg, cb, ca) => { if (ca <= 0) return; const na = ca + a * (1 - ca); r = (cr * ca + r * a * (1 - ca)) / na; gg = (cg * ca + gg * a * (1 - ca)) / na; b = (cb * ca + b * a * (1 - ca)) / na; a = na; };
      const sh = 1 + SH[o];
      // exposed sea floor: old sea, now above the water
      const dry = (1 - was) * land;
      if (dry > 0) {
        const k = Math.min(900, Math.max(0, -e / 10) | 0) * 3;
        // freshly exposed floor is still wet: darker just above the water line
        const wet = 1 - 0.28 * L.clamp(1 - dd / 900) * shoreK;
        over(FL[k] * sh * wet, FL[k + 1] * sh * wet, FL[k + 2] * sh * wet, dry);
      }
      // flooded land: old land, now under the polar oceans (its relief faintly visible)
      const wetL = was * (1 - land);
      if (wetL > 0) {
        const k = Math.min(900, Math.max(0, -dd / 10) | 0) * 3, s2 = 1 + SH[o] * 0.35;
        over(WL[k] * s2, WL[k + 1] * s2, WL[k + 2] * s2, wetL * 0.93);
      }
      const water = 1 - land;
      // shallows along the new shores (today's sea that is now only a little deep)
      if (shoreK > 0 && water > 0) {
        const sh2 = L.clamp(1 - -dd / 450) * water * 0.5 * shoreK;
        over(70, 176, 196, sh2);
      }
      // today's polar sea ice (drawn by the globe base beyond ±66–80°) sinks under the new polar oceans: cover it
      // with open water as the flood arrives, so no pale ice floats in the middle of a 10 km deep sea
      if (water > 0 && st.flood > 0 && (lat < -62 || lat > 76)) {
        const ik = lat < 0 ? L.smoothstep(L.clamp((-lat - 62) / 4)) : L.smoothstep(L.clamp((lat - 76) / 4));
        const k = Math.min(900, Math.max(0, -dd / 10) | 0) * 3;
        over(WL[k], WL[k + 1], WL[k + 2], 0.95 * water * ik * L.clamp(st.flood * 1.6));
      }
      // polar-ocean glow (beat 8)
      if (glowRow > 0 && water > 0 && alat > 14) over(90, 220, 235, glowRow * water);
      // the foam line at the new shore
      if (shoreK > 0) {
        const f = L.clamp(1 - Math.abs(dd) / (gm * 1.25));
        if (f > 0) over(228, 248, 255, 0.6 * f * shoreK);
      }
      // "start to move": today's coasts light up
      if (fx.lap > 0.01) {
        const f = L.clamp(1 - Math.abs(e) / (gm * 2.2));
        if (f > 0) over(150, 236, 248, 0.6 * f * fx.lap);
      }
      // beat 8: a warm light travelling east along the continent
      if (sweepA > 0 && land > 0) {
        const xx = ((i + 0.5) / N) * 2 - 1, w = Math.exp(-(((xx - sweepX) / 0.35) ** 2));
        if (w > 0.01) over(255, 224, 168, sweepA * w * land);
      }
      d[p] = r; d[p + 1] = gg; d[p + 2] = b; d[p + 3] = a * 255;
    }
  }
  G.cv.getContext('2d').putImageData(G.img, 0, 0);
  return G.cv;
}

// ------------------------------------------------------------------ current streaks
const STREAKS = (() => {
  const r = L.rng(505);
  return Array.from({ length: 96 }, (_, i) => ({
    lo: LON0 + (r() * 2 - 1) * 82 * DEG,
    s: i % 2 ? 1 : -1,
    ph: r(),
    sp: 0.8 + r() * 0.4,
    w: 0.7 + r() * 0.8,
    seed: i,
  }));
})();
const SEG = 7;

/** Long, soft current lines on the water only: a bright head and a tail that fades to nothing (additive). */
function drawStreaks(c, v, g, st, a) {
  if (a <= 0.01) return;
  c.save();
  c.globalCompositeOperation = 'lighter';
  c.lineCap = 'round';
  const f = L.clamp(st.flow);
  const lenBase = (5 + 11 * f) * DEG;
  const lw = Math.max(0.9, g.r / 330);
  const n = g.r > 250 ? STREAKS.length : 60;
  const isWater = (la, lo) => elevation(la / DEG, lo / DEG) < seaAt(st, la / DEG) - 40;
  for (let i = 0; i < n; i++) {
    const k = STREAKS[i];
    const lo0 = 6 * DEG, hi = 84 * DEG;
    const u = (((k.ph + st.phase * 0.3 * k.sp) % 1) + 1) % 1;
    const la = lo0 + (hi - lo0) * u;
    const len = lenBase * (0.75 + 0.35 * k.w);
    const al = a * Math.pow(Math.sin(Math.PI * u), 0.7) * (0.55 + 0.45 * (k.w - 0.7) / 0.8);
    if (al < 0.01) continue;
    // a slow sideways meander keeps the flow organic
    const wob = (x) => k.lo + 2.5 * DEG * L.noise1(x * 0.1 + k.seed * 1.7, 4);
    let prev = null;
    c.lineWidth = lw * k.w;
    for (let j = 0; j <= SEG; j++) {
      const lj = Math.max(lo0, la - len * (1 - j / SEG)), lon = wob(lj / DEG);
      if (!isWater(k.s * lj, lon)) { prev = null; continue; }
      const p = sp(g, k.s * lj, lon);
      if (prev) {
        const q = j / SEG;
        c.strokeStyle = `rgba(150,220,245,${0.6 * al * q * q})`;
        c.beginPath(); c.moveTo(prev[0], prev[1]); c.lineTo(p[0], p[1]); c.stroke();
      }
      prev = p;
    }
  }
  c.restore();
}

// ------------------------------------------------------------------ beat 5: the first flow, equator → poles
// Eight eased cyan flow lines over open ocean (Pacific and Atlantic), each growing from the equator toward its
// pole with a drawn arrowhead, on "would start to MOVE"; they hold ≥ 1 s and leave before "Spinning".
const FLOW_LON = [-142, -128, -34, -22];
function flowArrowK(v) {
  const t5 = TB(v, 5), t6 = TB(v, 6);
  const grow = L.ease.inOutCubic(L.prog(v.gt, t5 + W5.start - 0.05, 0.9));
  const out = 1 - L.ease.inOutCubic(L.prog(v.gt, t6 + 0.05, 0.45));
  return { grow, k: Math.min(1, grow * 3) * out };
}
function drawFlowArrows(c, v, g) {
  const { grow, k } = flowArrowK(v);
  if (k <= 0.01 || grow <= 0.01) return;
  const acc = v.accent || [90, 220, 235];
  const lw = Math.max(2, g.r / 150);
  const LA0 = 5, LA1 = 5 + 41 * grow;
  c.save();
  c.lineCap = 'round'; c.lineJoin = 'round';
  for (const lo of FLOW_LON) {
    for (const s of [1, -1]) {
      const n = 24, pts = [];
      for (let i = 0; i <= n; i++) {
        const la = (LA0 + (LA1 - LA0) * (i / n)) * DEG * s;
        pts.push(sp(g, la, lo * DEG + 1.2 * DEG * Math.sin(i / n * Math.PI) * (lo < -80 ? -1 : 1)));
      }
      // tail → head: faint to bright
      for (let i = 1; i <= n; i++) {
        const q = i / n;
        c.strokeStyle = L.rgba(acc, k * (0.12 + 0.78 * q * q));
        c.lineWidth = lw * (0.6 + 0.4 * q);
        c.beginPath(); c.moveTo(pts[i - 1][0], pts[i - 1][1]); c.lineTo(pts[i][0], pts[i][1]); c.stroke();
      }
      // a soft pulse travelling along the line keeps it alive while it holds
      const u = ((v.gt * 0.7 + (lo + 180) / 97 + (s > 0 ? 0 : 0.5)) % 1 + 1) % 1, pi = Math.min(n - 1, Math.floor(u * n));
      c.strokeStyle = L.rgba([220, 250, 255], 0.55 * k * Math.sin(Math.PI * u));
      c.lineWidth = lw * 1.4;
      c.beginPath(); c.moveTo(pts[pi][0], pts[pi][1]); c.lineTo(pts[pi + 1][0], pts[pi + 1][1]); c.stroke();
      // arrowhead (drawn shape, pointing poleward along the line)
      const [hx, hy] = pts[n], [px, py] = pts[n - 2];
      const dx = hx - px, dy = hy - py, m = Math.hypot(dx, dy) || 1, ux = dx / m, uy = dy / m, hs = lw * 4.2;
      c.fillStyle = L.rgba(acc, k);
      c.beginPath();
      c.moveTo(hx + ux * hs * 0.6, hy + uy * hs * 0.6);
      c.lineTo(hx - ux * hs + -uy * hs * 0.62, hy - uy * hs + ux * hs * 0.62);
      c.lineTo(hx - ux * hs + uy * hs * 0.62, hy - uy * hs - ux * hs * 0.62);
      c.closePath(); c.fill();
    }
  }
  c.restore();
}

// ------------------------------------------------------------------ the repaint
export function drawSurface(c, v) {
  const st = surfaceState(v);
  if (st.k <= 0.003) return;
  const g = globeGeom(v);
  if (!globeVisible(g) || g.r < 20) return;
  const fx = fxState(v);
  c.save();
  c.globalAlpha = st.k;
  c.beginPath(); c.arc(g.cx, g.cy, Math.max(0, g.r), 0, TAU); c.clip();
  if (st.drain > 0.002 || st.flood > 0.002 || fx.lap > 0.01 || fx.ocean > 0 || fx.sweep > 0) {
    c.imageSmoothingEnabled = true; c.imageSmoothingQuality = 'high';
    c.drawImage(paint(st, fx), g.cx - g.r, g.cy - g.r, g.r * 2, g.r * 2);
  }
  // ---- current streaks on the water
  const sa = L.clamp(st.flow * 1.8) * L.clamp(L.invLerp(60, 200, g.r));
  drawStreaks(c, v, g, st, sa);
  drawFlowArrows(c, v, g);
  c.restore();
}

export default {
  beat: 5,
  chapter: { num: '05', title: 'The oceans', sub: 'once the spin is gone' },
  captions: true,
  layer: 0,
  cues() {
    return [
      { t: W5.oceans + 0.2, name: 'swell', gain: 0.26, pitch: 0.7 },
      { t: W5.move - 0.1, name: 'shimmer', gain: 0.2, pitch: 0.8 },
      { t: W5.move + 0.15, name: 'bubbles', gain: 0.12, pitch: 0.7 },
    ];
  },
  drawWorld(ctx, v) {
    drawSurface(ctx, v);
  },
};
