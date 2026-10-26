// Beat 6 — the payoff: Challenger Deep floor → pull back to the whole column → Everest drops in → 2 km bracket.
// World space in metres (y = depth). Timings are tied to camera.REVEAL_TIMES so they follow the camera.
import * as L from '../../../../engine/runtime/lib.js';
import { REVEAL_TIMES, LAND_DELAY } from '../camera.js';
import { floorY, TRENCH_FLOOR } from '../env.js';

const { W, H, ease, clamp, lerp, prog, rgba } = L;
const TAU = Math.PI * 2;

const FX = -5000;               // Everest base centre / trench marker x (middle of the wide trench floor)
const EV_H = 8849;              // Everest height
const EV_HALF = 3000;           // half base width (width compressed ~4x to fit the frame; vertical scale true)
const PEAK = TRENCH_FLOOR - EV_H;   // 2,086 m
const PALE = [200, 228, 240];

// ------------------------------------------------------------------ timeline (seconds from beat start)
function times(d) {
  const r0 = REVEAL_TIMES.start * d, r1 = REVEAL_TIMES.end * d, rd = r1 - r0;
  const land = r1 + LAND_DELAY;                     // impact just after the pull-back settles (recap reads first)
  return {
    arrive: 1.9,
    label: 1.1,                              // arrival label in (camera ~settled; >= 1.6 s readable before labelOut)
    dial: 1.2,                               // pressure gauge in
    dialSweep: 0.5,                          // count 0 -> 1,086 bar; rests on 1,086 for >= 1 s before labelOut
    labelOut: r0 + rd * 0.3,                 // arrival text leaves when the camera really starts moving
    path: r0 + rd * 0.15,                    // recap path appears at the floor; its glowing head rides up with the pull-back
    climb: r0 + rd * 0.3 + 0.3,              // head starts climbing once the arrival text has cleared
    pathDur: rd * 0.65 - 0.3,
    labGate: r0 + rd * 0.5,                  // recap labels may enter (held >= 1.6 s until recapOut)
    drop: land - FALL,                        // Everest materialises (camera settled) and falls
    land,
    bracket: land + 0.32,
    recapOut: land + 0.3,                    // recap labels + path clear (0.3 s exit) ...
    payoff: land + 0.64,                     // ... before the "≈ 2 km" label starts
  };
}

// ------------------------------------------------------------------ Everest silhouette (u: -1..1 across base, h: 0..1)
// a broad massif, not a needle: concave lower flanks, the west shoulder, the summit pyramid, the South Col and Lhotse
const KEYS = [
  [-1.0, 0.0], [-0.9, 0.04], [-0.8, 0.09], [-0.7, 0.15], [-0.6, 0.22], [-0.5, 0.3], [-0.42, 0.37], [-0.35, 0.44],
  [-0.29, 0.5], [-0.24, 0.53], [-0.19, 0.56], [-0.14, 0.62], [-0.09, 0.72], [-0.05, 0.83], [-0.02, 0.93], [0.0, 1.0],
  [0.03, 0.95], [0.07, 0.87], [0.12, 0.8], [0.17, 0.75], [0.21, 0.74], [0.26, 0.77], [0.31, 0.79], [0.36, 0.76],
  [0.42, 0.68], [0.49, 0.58], [0.57, 0.47], [0.65, 0.36], [0.73, 0.26], [0.81, 0.17], [0.89, 0.09], [0.95, 0.035], [1.0, 0.0],
];
function profile(u) {
  let i = 1;
  while (i < KEYS.length - 1 && KEYS[i][0] < u) i++;
  const [u0, h0] = KEYS[i - 1], [u1, h1] = KEYS[i];
  const f = clamp((u - u0) / (u1 - u0));
  let h = lerp(h0, h1, f);
  // ridge texture: finer near the top, fading to 0 at the base corners
  const edge = Math.min(1, (1 - Math.abs(u)) * 6);
  h += (L.noise1(u * 38, 21) * 0.012 + L.noise1(u * 110, 22) * 0.005) * edge * Math.min(1, h * 4);
  return Math.max(0, h);
}
const N_PROF = 220;
const PROF = Array.from({ length: N_PROF + 1 }, (_, i) => { const u = -1 + (2 * i) / N_PROF; return [u, profile(u)]; });
// snow line (fraction of height) per u: a short, fairly flat line; dark rock ribs push UP into the snow
// rock ribs: [u centre, half width in u, height] (sharp tips pointing up)
const BUTTRESS = [[-0.07, 0.05, 0.07], [0.1, 0.05, 0.05], [0.38, 0.07, 0.05]];
const tri = (u, c, w) => Math.max(0, 1 - Math.abs(u - c) / w);
const SNOW = PROF.map(([u]) => {
  let s = 0.6 + 0.03 * L.noise1(u * 3, 31);
  for (const [c, w, hh] of BUTTRESS) s += hh * tri(u, c, w);
  return s + 0.004 * L.noise1(u * 30, 33);
});
// torn-out underside of the massif (hidden by the terrain once it lands)
// a deep, rounded keel of rock so the falling massif never shows a flat bottom
const ROOT = PROF.map(([u]) => 1500 * Math.pow(Math.max(0, 1 - u * u), 0.75) * (0.88 + 0.12 * L.noise1(u * 5, 61)) + 40 * L.noise1(u * 23, 62) * (1 - u * u));
const ROOT_MAX = Math.max(...ROOT);
// The fall: the whole silhouette is on screen for the entire drop, summit up in the sky band,
// so it reads as a mountain from its first frame. It plunges through the surface (the summit goes
// under last, with a closing splash) and lands at T.land.
const FALL = 0.72;                    // s of visible fall (drop -> land)
const PEAK0 = -1000;                  // summit depth at the start of the fall (above the sea surface)
const DROPD = PEAK - PEAK0;           // fall distance (m)
const FADE_IN = 0.12;               // short materialise, then fully opaque rock
/** ridge course: u at fraction k (0 = crest point, 1 = foot); flares out low down, following the face */
const ridgeU = (from, to, k, seed) => from + (to - from) * (Math.pow(k, 1.3) + 0.22 * Math.sin(Math.PI * k)) + L.noise1(k * 7 + seed, 41) * 0.02 * k;
// dark rock bands breaking through the snow (u centre, top h, bottom h, width in u)
const BANDS = [[0.04, 0.93, 0.84, 0.014], [0.24, 0.76, 0.7, 0.02]];
// face ridges: from a point on the crest down to the base, slightly wandering
const RIDGES = [
  { from: 0.0, to: -0.4, w: 1, len: 0.9 }, { from: -0.36, to: -0.74, w: 0.6, len: 0.7 }, { from: 0.27, to: 0.56, w: 0.7, len: 0.7 },
  { from: 0.47, to: 0.86, w: 0.6, len: 0.65 }, { from: 0.1, to: 0.24, w: 0.5, len: 0.5 }, { from: -0.17, to: -0.42, w: 0.4, len: 0.4 },
  { from: 0.17, to: 0.36, w: 0.35, len: 0.35 }, { from: -0.27, to: -0.5, w: 0.35, len: 0.38 },
];

// rocks on the trench floor (world m)
const ROCKS = (() => {
  const r = L.rng(606), out = [];
  for (let i = 0; i < 26; i++) {
    const x = FX + (r() - 0.5) * 760, s = 0.8 + r() ** 2.4 * 9;
    out.push({ x, s, seed: r() * 100, sq: 0.55 + r() * 0.35 });
  }
  return out;
})();
const MOTES = (() => {
  const r = L.rng(607);
  return Array.from({ length: 110 }, () => ({ x: r(), y: r(), s: r(), ph: r() * 10 }));
})();
const PLUMES = [[FX - 120, 0.9], [FX + 40, 1.3], [FX + 170, 0.8], [FX - 200, 1.1], [FX - 20, 0.7]];
const DUST = (() => {
  const r = L.rng(608);
  return Array.from({ length: 22 }, (_, i) => ({ dir: i % 2 ? 1 : -1, sp: 0.35 + r() * 0.75, up: r() ** 1.5, size: 0.6 + r() * 0.8, ph: r() * 10 }));
})();
const WAKE = (() => {
  const r = L.rng(609);
  return Array.from({ length: 70 }, () => ({ u: (r() - 0.5) * 0.5, ts: r(), s: r(), ph: r() * 10 }));
})();

// recap landmarks along the dive (world x, depth)
const MARKS = [
  { x: 0, y: 0, num: '0 m', name: 'SURFACE', fan: null },
  { x: 0, y: 332, num: '332 m', name: 'SCUBA RECORD', fan: 336 },
  { x: 0, y: 828, num: '828 m', name: 'BURJ KHALIFA', fan: 412 },
  { x: 0, y: 2992, num: '2,992 m', name: 'BEAKED WHALE', fan: 500 },
  { x: 0, y: 3800, num: '3,800 m', name: 'TITANIC', fan: 590 },
];
// dive path: straight down the column, then down the trench wall to the floor
function pathPt(s) {
  // s 0..1 along the path
  if (s < 0.4) return [0, (s / 0.4) * 3800];
  // off the plain, out over the trench, then a long descent through open water to the floor
  const k = (s - 0.4) / 0.6;
  const x = FX * (1 - (1 - k) ** 3);
  return [x, Math.min(floorY(x) - 6, lerp(3800, TRENCH_FLOOR, k ** 1.4))];
}
const markS = (y) => (y <= 3800 ? (y / 3800) * 0.4 : 1);
/** Time (s from beat start) when recap label i enters (screen-anchored list; leaders connect once the marks are in frame). */
function labelT(T, i) {
  return T.labGate + (i - 1) * 0.06;
}
// path samples for the camera-following head
const PATH_N = 400;
const PATH_Y = Array.from({ length: PATH_N + 1 }, (_, i) => pathPt(i / PATH_N)[1]);
/** first path parameter s whose depth reaches y */
function sForY(y) {
  for (let i = 0; i <= PATH_N; i++) if (PATH_Y[i] >= y) return i / PATH_N;
  return 1;
}
/** recap head position along the path: retraces the dive upward from the floor, never leaving the frame */
function headS(v, T) {
  const sTime = 1 - ease.inOutCubic(prog(v.t, T.climb, T.pathDur));
  const mpp = v.cam.mpp;
  const top = v.cam.y - (H / 2) * mpp, bot = v.cam.y + (H / 2) * mpp;
  const margin = 480 * (1 - clamp((mpp - 2) / 4.4)) * mpp;   // keep the head inside the middle half of the frame while zooming out
  return clamp(sTime, sForY(top + margin), sForY(bot - margin));
}

// ------------------------------------------------------------------ helpers
function everestY(t, T) {
  // vertical offset of the base relative to the trench floor (m, negative = above)
  if (t < T.drop) return null;
  if (t < T.land) {
    const k = (t - T.drop) / (T.land - T.drop);
    return -DROPD * (1 - k * k);
  }
  const s = t - T.land;
  return 70 * Math.exp(-3.8 * s) * Math.sin(Math.min(s * 8, Math.PI * 1.5));
}

function terrainClip(ctx, v, x0, x1) {
  ctx.beginPath();
  ctx.moveTo(v.wx(x0), -4000);
  const n = 90;
  for (let i = 0; i <= n; i++) {
    const x = lerp(x0, x1, i / n);
    ctx.lineTo(v.wx(x), v.wy(floorY(x)) + 1);
  }
  ctx.lineTo(v.wx(x1), -4000);
  ctx.closePath();
  ctx.clip();
}

function mountainPath(ctx, v, by) {
  ctx.beginPath();
  PROF.forEach(([u, h], i) => {
    const x = v.wx(FX + u * EV_HALF), y = v.wy(by - h * EV_H);
    i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
  });
  for (let i = PROF.length - 1; i >= 0; i -= 4) ctx.lineTo(v.wx(FX + PROF[i][0] * EV_HALF), v.wy(by + ROOT[i]));
  ctx.closePath();
}

function drawEverest(ctx, v, T) {
  const off = everestY(v.t, T);
  if (off === null) return;
  const by = TRENCH_FLOOR + off;
  if (!v.visibleY(by - EV_H - 50, by + 50)) return;
  const peakSy = v.wy(by - EV_H), baseSy = v.wy(by);
  const settle = prog(v.t, T.land, 1.6);
  // materialise: the complete silhouette fades in (summit already in the sky band), then falls
  const appear = ease.outCubic(prog(v.t, T.drop, FADE_IN));
  if (appear <= 0) return;
  ctx.save();
  ctx.globalAlpha *= appear;
  terrainClip(ctx, v, FX - EV_HALF - 50, FX + EV_HALF + 50);

  // body: one solid rock massif (alpha 1 everywhere), lighter high up, deep slate at the foot
  // (kept a step brighter and bluer than the terrain fill so the lower flanks still read as mountain)
  mountainPath(ctx, v, by);
  const rootSy = v.wy(by + ROOT_MAX);
  const fb = clamp((baseSy - peakSy) / Math.max(1, rootSy - peakSy), 0.5, 0.999);
  const g = ctx.createLinearGradient(0, peakSy, 0, rootSy);
  g.addColorStop(0, '#41566c');
  g.addColorStop(0.3 * fb, '#24334a');
  g.addColorStop(0.65 * fb, '#172333');
  g.addColorStop(fb, '#111b28');
  g.addColorStop(1, '#0c141e');            // torn underside: solid dark rock (only seen during the fall)
  ctx.fillStyle = g;
  ctx.fill();
  // torn underside rim (only matters while falling through open water)
  if (v.t < T.land) {
    ctx.beginPath();
    for (let i = PROF.length - 1; i >= 0; i -= 2) {
      const x = v.wx(FX + PROF[i][0] * EV_HALF), y = v.wy(by + ROOT[i]);
      i === PROF.length - 1 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
    ctx.strokeStyle = 'rgba(120,165,190,0.3)';
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }

  ctx.save();
  mountainPath(ctx, v, by);
  ctx.clip();
  // lit west faces: left of each ridge, a cool translucent wash
  const faceL = (from, to, a) => {
    ctx.beginPath();
    const n = 30;
    const cu = from, cy = profile(cu);
    // ridge from crest point down to base
    for (let i = 0; i <= n; i++) {
      const k = i / n;
      const u = ridgeU(cu, to, k, from * 10);
      const h = cy * (1 - k);
      const x = v.wx(FX + u * EV_HALF), y = v.wy(by - h * EV_H);
      i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
    }
    // back along the base to the left and up the silhouette to the crest point
    ctx.lineTo(v.wx(FX - EV_HALF), v.wy(by));
    for (const [u, h] of PROF) { if (u > cu) break; ctx.lineTo(v.wx(FX + u * EV_HALF), v.wy(by - h * EV_H)); }
    ctx.closePath();
    const fg = ctx.createLinearGradient(0, peakSy, 0, baseSy);
    fg.addColorStop(0, `rgba(150,190,215,${0.16 * a})`);
    fg.addColorStop(0.45, `rgba(90,130,160,${0.05 * a})`);
    fg.addColorStop(0.8, 'rgba(60,90,120,0)');
    ctx.fillStyle = fg;
    ctx.fill();
  };
  faceL(0.0, -0.34, 1);
  faceL(0.47, 0.82, 0.55);

  // snow cap
  ctx.beginPath();
  PROF.forEach(([u, h], i) => {
    const x = v.wx(FX + u * EV_HALF), y = v.wy(by - h * EV_H);
    i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
  });
  for (let i = PROF.length - 1; i >= 0; i--) {
    const [u, h] = PROF[i];
    const sl = Math.min(h, SNOW[i]);
    ctx.lineTo(v.wx(FX + u * EV_HALF), v.wy(by - sl * EV_H));
  }
  ctx.closePath();
  const sg = ctx.createLinearGradient(0, peakSy, 0, v.wy(by - 0.45 * EV_H));
  sg.addColorStop(0, 'rgba(225,238,248,0.95)');
  sg.addColorStop(0.5, 'rgba(170,195,215,0.7)');
  sg.addColorStop(1, 'rgba(120,150,175,0.25)');
  ctx.fillStyle = sg;
  ctx.fill();
  // shadow side of the snow (right of the summit ridge)
  ctx.beginPath();
  ctx.moveTo(v.wx(FX), peakSy);
  for (let k = 0; k <= 1.0001; k += 0.05) {
    const u = ridgeU(0, 0.3, k, 3);
    ctx.lineTo(v.wx(FX + u * EV_HALF), v.wy(by - (1 - k) * EV_H));
  }
  // continue the shadow straight down through the keel, so there's no tone step at the base line
  ctx.lineTo(v.wx(FX + ridgeU(0, 0.3, 1, 3) * EV_HALF), v.wy(by + ROOT_MAX + 20));
  ctx.lineTo(v.wx(FX + EV_HALF), v.wy(by + ROOT_MAX + 20));
  ctx.lineTo(v.wx(FX + EV_HALF), peakSy);
  ctx.closePath();
  ctx.fillStyle = 'rgba(8,14,26,0.42)';
  ctx.fill();

  // rock bands showing through the snow
  for (const [bu, h0, h1, bw] of BANDS) {
    ctx.beginPath();
    for (let k = 0; k <= 1.0001; k += 0.1) {
      const u = bu + L.noise1(k * 3 + bu * 20, 63) * 0.012 - bw * (1 - k) * 0.5;
      ctx.lineTo(v.wx(FX + u * EV_HALF), v.wy(by - lerp(h0, h1, k) * EV_H));
    }
    for (let k = 1; k >= -0.0001; k -= 0.1) {
      const u = bu + L.noise1(k * 3 + bu * 20, 63) * 0.012 + bw * (1 - k);
      ctx.lineTo(v.wx(FX + u * EV_HALF), v.wy(by - lerp(h0, h1, k) * EV_H));
    }
    ctx.closePath();
    ctx.fillStyle = 'rgba(40,55,72,0.55)';
    ctx.fill();
  }
  // ridge lines
  ctx.lineCap = 'round';
  for (const r of RIDGES) {
    const cy = profile(r.from);
    ctx.beginPath();
    for (let k = 0; k <= r.len + 0.0001; k += 0.025) {
      const u = ridgeU(r.from, r.to, k, r.from * 10);
      const x = v.wx(FX + u * EV_HALF), y = v.wy(by - cy * (1 - k) * EV_H);
      k ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
    }
    const rg = ctx.createLinearGradient(0, v.wy(by - cy * EV_H), 0, v.wy(by - cy * (1 - r.len) * EV_H));
    rg.addColorStop(0, `rgba(215,235,248,${0.5 * r.w})`);
    rg.addColorStop(1, 'rgba(210,230,245,0)');
    ctx.strokeStyle = rg;
    ctx.lineWidth = Math.max(1.2, v.ws(12));
    ctx.stroke();
  }
  // impact glint: a light sweep up the faces right after landing
  if (settle > 0 && settle < 1) {
    const sy = lerp(baseSy, peakSy - 80, ease.inOutCubic(settle));
    const lg = ctx.createLinearGradient(0, sy - 120, 0, sy + 120);
    lg.addColorStop(0, 'rgba(160,230,240,0)');
    lg.addColorStop(0.5, `rgba(160,230,240,${0.16 * Math.sin(Math.PI * settle)})`);
    lg.addColorStop(1, 'rgba(160,230,240,0)');
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = lg;
    ctx.fillRect(0, sy - 120, W, 240);
  }
  ctx.restore();

  // rim light along the silhouette (strongest on the summit pyramid)
  ctx.beginPath();
  PROF.forEach(([u, h], i) => {
    const x = v.wx(FX + u * EV_HALF), y = v.wy(by - h * EV_H);
    i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
  });
  const rim = ctx.createLinearGradient(0, peakSy, 0, baseSy);
  rim.addColorStop(0, 'rgba(225,245,255,0.95)');
  rim.addColorStop(0.5, 'rgba(160,210,230,0.5)');
  rim.addColorStop(1, 'rgba(120,170,200,0.32)');   // the flanks stay outlined down to the floor
  ctx.strokeStyle = rim;
  ctx.lineWidth = 2;
  ctx.lineJoin = 'round';
  ctx.shadowColor = 'rgba(140,220,240,0.7)';
  ctx.shadowBlur = 14;
  ctx.stroke();
  ctx.restore();

  // summit glow (soft halo, makes the peak the focal point)
  const pk = clamp((v.t - T.land) / 0.8);
  if (pk > 0) L.lightBlob(ctx, v.wx(FX), peakSy, 160, [120, 210, 230], pk * 0.24 * (0.85 + 0.15 * Math.sin(v.gt * 2.1)));

  // speed streaks trailing above the falling summit and shoulders (motion trail on a fast move)
  if (v.t < T.land) {
    const kf = clamp((v.t - T.drop) / (T.land - T.drop));
    const vel = 2 * DROPD * kf / (T.land - T.drop) / v.cam.mpp;   // px/s
    const len = Math.min(260, vel * 0.09);
    if (len > 4) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.lineCap = 'round';
      for (let i = 0; i < 9; i++) {
        const u = -0.42 + i * 0.105 + 0.02 * L.noise1(i * 3.1, 71);
        if (Math.abs(u) < 0.08) continue;
        const x = v.wx(FX + u * EV_HALF), y = v.wy(by - profile(u) * EV_H) - 6;
        const l = len * (0.55 + 0.45 * Math.abs(L.noise1(i * 1.7, 72)) * 2) * (1 - Math.abs(u) * 0.8);
        const sg2 = ctx.createLinearGradient(0, y - l, 0, y);
        sg2.addColorStop(0, 'rgba(210,240,250,0)');
        sg2.addColorStop(1, `rgba(210,240,250,${0.32 * appear})`);
        ctx.strokeStyle = sg2;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(x, y - l);
        ctx.lineTo(x, y);
        ctx.stroke();
      }
      ctx.restore();
    }
  }

  // wake: bubbles shed by the falling mountain, rising and fading
  const fallK = clamp((v.t - T.drop) / (T.land - T.drop));
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (const b of WAKE) {
    if (b.ts > fallK) continue;
    const tSpawn = T.drop + b.ts * (T.land - T.drop);
    const age = v.t - tSpawn;
    const life = 1.6 + b.s;
    if (age > life) continue;
    const offAt = everestY(tSpawn, T);
    const u = b.u;
    const y0 = TRENCH_FLOOR + offAt - profile(u) * EV_H;
    if (y0 < 0) continue;   // shed above the surface: no bubbles in the sky
    const y = y0 - age * (120 + b.s * 160);
    if (y < 30) continue;
    const x = FX + u * EV_HALF + L.noise1(age * 2 + b.ph, 47) * 60;
    const a = 0.5 * (1 - age / life) * clamp(age * 6);
    ctx.fillStyle = `rgba(190,230,245,${a})`;
    ctx.beginPath();
    ctx.arc(v.wx(x), v.wy(y), Math.max(0, 1 + b.s * 2.2), 0, TAU);
    ctx.fill();
  }
  ctx.restore();
}

/** time (s from beat start) when the falling summit goes under the sea surface */
const splashT = (T) => T.drop + Math.sqrt(1 - PEAK / DROPD) * (T.land - T.drop);
/** the u-range of the massif cut by the sea surface for a base at depth by (null if not crossing) */
function crossU(by) {
  const hAt = by / EV_H;   // the profile height that sits at y = 0
  if (by <= 0 || hAt >= 1) return null;
  let u0 = 1, u1 = -1;
  for (const [u, h] of PROF) if (h >= hAt) { u0 = Math.min(u0, u); u1 = Math.max(u1, u); }
  return u1 > u0 ? [u0, u1] : null;
}
const SPRAY = (() => {
  const r = L.rng(610);
  return Array.from({ length: 46 }, () => ({ u: (r() - 0.5) * 2.1, v: 0.5 + r(), s: r(), ph: r() * 10 }));
})();
const SHEET = (() => {   // spray flung off both sides while the massif slices through the surface
  const r = L.rng(611);
  return Array.from({ length: 70 }, (_, i) => ({ side: i % 2 ? 1 : -1, ts: r(), v: 0.4 + r(), out: 0.3 + r(), s: r() }));
})();
function drawSplash(ctx, v, T) {
  const s = v.t - splashT(T), s0 = v.t - T.drop;
  if (s0 < 0 || s > 2.6 || !v.visibleY(-600, 300)) return;
  const appear = ease.outCubic(prog(v.t, T.drop, FADE_IN));
  const sy = v.wy(0), cx = v.wx(FX);
  const hw = v.ws(EV_HALF);
  const tS = splashT(T);
  ctx.save();
  // 1. foam collar where the mountain is slicing through the surface, with a bow-wave mound at each edge
  const off = everestY(v.t, T);
  const cr = off !== null && v.t < T.land ? crossU(TRENCH_FLOOR + off) : null;
  if (cr) {
    const x0 = cx + cr[0] * hw, x1 = cx + cr[1] * hw;
    ctx.globalAlpha = appear;
    ctx.fillStyle = 'rgba(236,247,252,0.85)';
    ctx.beginPath();
    ctx.moveTo(x0 - 34, sy + 1);
    ctx.quadraticCurveTo(x0 - 10, sy - 12, x0 + 4, sy - 3);
    ctx.lineTo(x1 - 4, sy - 3);
    ctx.quadraticCurveTo(x1 + 10, sy - 12, x1 + 34, sy + 1);
    ctx.quadraticCurveTo(x1, sy + 7, x1 - 4, sy + 5);
    ctx.lineTo(x0 + 4, sy + 5);
    ctx.quadraticCurveTo(x0, sy + 7, x0 - 34, sy + 1);
    ctx.closePath();
    ctx.fill();
    ctx.globalAlpha = 1;
  }
  // 2. sheets of spray thrown outward from both cut edges (spawned along the crossing)
  ctx.shadowColor = 'rgba(40,70,90,0.5)';
  ctx.shadowBlur = 3;
  for (const p of SHEET) {
    const tsp = T.drop + 0.04 + p.ts * (tS - T.drop - 0.04);
    const age = v.t - tsp;
    if (age < 0 || age > 0.9) continue;
    const offS = everestY(tsp, T);
    const c2 = offS !== null ? crossU(TRENCH_FLOOR + offS) : null;
    if (!c2) continue;
    const ex = cx + (p.side > 0 ? c2[1] : c2[0]) * hw;
    const x = ex + p.side * (6 + p.out * 150 * age);
    const y = sy - (p.v * 260 * age - 420 * age * age);
    if (y > sy + 1) continue;
    ctx.fillStyle = `rgba(245,251,253,${0.85 * (1 - age / 0.9) * appear})`;
    ctx.beginPath();
    ctx.arc(x, y, Math.max(0, 1.4 + p.s * 2.2), 0, TAU);
    ctx.fill();
  }
  // 3. the water closes over the summit: a narrow jet of spray straight up
  for (const p of SPRAY) {
    const age = s - p.s * 0.18;
    if (age < 0 || age > 1.0) continue;
    const x = cx + p.u * 26 + p.u * age * 60;
    const y = sy - (p.v * 300 * age - 480 * age * age);
    if (y > sy + 2) continue;
    ctx.fillStyle = `rgba(245,251,253,${0.85 * (1 - age / 1.0)})`;
    ctx.beginPath();
    ctx.arc(x, y, Math.max(0, 1.4 + p.s * 2.4), 0, TAU);
    ctx.fill();
  }
  ctx.shadowBlur = 0;
  // 4. rings spreading out along the surface (from the plunge, and again from the closing splash)
  ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 3; i++) {
    const age = i === 0 ? s0 : s - (i - 1) * 0.3;
    const k = clamp(age / 1.8);
    if (k <= 0 || k >= 1) continue;
    const rx = (i === 0 ? hw * 0.9 : hw * 0.15) + hw * 1.8 * ease.outCubic(k);
    ctx.strokeStyle = `rgba(200,235,245,${0.32 * (1 - k) ** 1.5})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(cx, sy + 2, Math.max(0, rx), Math.max(0, rx * 0.04 + 2), 0, 0, Math.PI);
    ctx.stroke();
  }
  if (s > -0.05) L.lightBlob(ctx, cx, sy + 4, hw * 0.3, [190, 230, 245], 0.1 * Math.exp(-Math.max(0, s) * 2.5) * clamp(s * 20 + 1));
  ctx.restore();
}

/** silt plume rolling out from the base: drawn BEHIND the massif so the mountain stays one solid shape */
function drawDust(ctx, v, T) {
  const s = v.t - T.land;
  if (s < 0 || s > 4) return;
  ctx.save();
  terrainClip(ctx, v, FX - 7000, FX + 7000);
  // silt plume rolling out from the base and climbing the trench walls
  for (const d of DUST) {
    const k = clamp(s / (2.8 + d.sp));
    const spread = ease.outCubic(k);
    // billows out from under the flanks and climbs the trench walls on both sides
    const x = FX + d.dir * (EV_HALF * 0.55 + spread * 2600 * d.sp);
    const y = TRENCH_FLOOR - 200 - spread * 2400 * d.up + L.noise1(s * 0.8 + d.ph, 48) * 60;
    const r = v.ws((300 + spread * 800) * d.size);
    const a = 0.24 * Math.sin(Math.PI * Math.min(1, k * 1.05)) * clamp(s * 5);
    if (a <= 0.002) continue;
    const gx = v.wx(x), gy = v.wy(y);
    ctx.save();
    ctx.translate(gx, gy);
    ctx.scale(1, 0.5);
    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, Math.max(1, r));
    g.addColorStop(0, `rgba(125,150,165,${a})`);
    g.addColorStop(0.5, `rgba(110,135,150,${a * 0.5})`);
    g.addColorStop(1, 'rgba(110,135,150,0)');
    ctx.fillStyle = g;
    ctx.fillRect(-r, -r, r * 2, r * 2);
    ctx.restore();
  }
  ctx.restore();
}

function drawImpact(ctx, v, T) {
  const s = v.t - T.land;
  if (s < 0 || s > 4) return;
  const fy = v.wy(TRENCH_FLOOR), cx = v.wx(FX);
  ctx.save();
  // shockwave: a pulse of light running out along the seabed contour, both ways
  const k = clamp(s / 1.8);
  if (k < 1) {
    const dpos = lerp(EV_HALF * 0.5, 6500, ease.outCubic(k));
    const amp = (1 - k) ** 1.4;
    ctx.lineCap = 'round';
    for (const dir of [-1, 1]) {
      for (let i = 0; i < 24; i++) {
        const x0 = FX + dir * (dpos - 900 + i * 37.5), x1 = x0 + dir * 37.5;
        const f = 1 - Math.abs(i - 12) / 12;
        if (f <= 0) continue;
        ctx.strokeStyle = `rgba(170,235,245,${0.8 * amp * f * f})`;
        ctx.lineWidth = 2 + 2 * f;
        ctx.beginPath();
        ctx.moveTo(v.wx(x0), v.wy(floorY(x0)));
        ctx.lineTo(v.wx(x1), v.wy(floorY(x1)));
        ctx.stroke();
      }
    }
  }
  // pressure wave through the water
  const kw = clamp(s / 2.4);
  if (kw < 1) {
    ctx.strokeStyle = `rgba(150,215,230,${0.16 * (1 - kw)})`;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(cx, fy, Math.max(0, v.ws(lerp(2000, 10000, ease.outCubic(kw)))), Math.PI, TAU);
    ctx.stroke();
  }
  // flash at contact
  L.lightBlob(ctx, cx, fy, v.ws(2400), [150, 220, 235], 0.3 * Math.exp(-s * 3));
  ctx.restore();
}

function drawFloor(ctx, v, T) {
  // close-up details of the trench floor; only meaningful when zoomed in
  if (v.cam.mpp > 2.2 || !v.visibleY(TRENCH_FLOOR - 500, TRENCH_FLOOR + 200)) return;
  const fade = clamp((2.2 - v.cam.mpp) / 1.2);
  const t = v.t;
  ctx.save();
  ctx.globalAlpha = fade;
  // light pool from our lamp: a soft cone + pool on the floor
  const lx = FX + 40 + L.noise1(v.gt * 0.25, 51) * 40;
  const lk = clamp((t + 0.5) / 1.8) * (1 - ease.inCubic(prog(t, T.labelOut, 1.5)));
  if (lk > 0) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const fy = v.wy(floorY(lx));
    const cone = ctx.createLinearGradient(0, fy - v.ws(420), 0, fy);
    cone.addColorStop(0, 'rgba(120,180,200,0)');
    cone.addColorStop(1, `rgba(120,180,200,${0.07 * lk})`);
    ctx.fillStyle = cone;
    ctx.beginPath();
    ctx.moveTo(v.wx(lx - 30), fy - v.ws(420));
    ctx.lineTo(v.wx(lx + 30), fy - v.ws(420));
    ctx.lineTo(v.wx(lx + 190), fy);
    ctx.lineTo(v.wx(lx - 190), fy);
    ctx.closePath();
    ctx.fill();
    ctx.translate(v.wx(lx), fy);
    ctx.scale(1, 0.22);
    L.lightBlob(ctx, 0, 0, v.ws(230), [130, 190, 205], 0.33 * lk);
    ctx.restore();
  }
  const lit = (x) => lk * Math.exp(-(((x - lx) / 170) ** 2));

  // sediment strata under the floor
  ctx.lineWidth = 1;
  for (let i = 1; i <= 6; i++) {
    ctx.strokeStyle = `rgba(110,140,160,${0.11 - i * 0.012})`;
    ctx.beginPath();
    for (let k = 0; k <= 60; k++) {
      const x = v.cam.x + (k / 60 - 0.5) * (W + 80) * v.cam.mpp;
      const y = floorY(x) + i * i * 2.2 + L.noise1(x / 25 + i, 52) * 1.5;
      k ? ctx.lineTo(v.wx(x), v.wy(y)) : ctx.moveTo(v.wx(x), v.wy(y));
    }
    ctx.stroke();
  }
  // rocks and nodules
  for (const r of ROCKS) {
    const sx = v.wx(r.x);
    if (sx < -60 || sx > W + 60) continue;
    const fy = floorY(r.x);
    const rad = r.s, cy = fy - rad * r.sq * 0.45;
    ctx.beginPath();
    for (let i = 0; i <= 10; i++) {
      const a = Math.PI + (i / 10) * Math.PI;
      const rr = rad * (0.85 + 0.15 * L.noise1(i * 0.9 + r.seed, 53));
      const x = v.wx(r.x + Math.cos(a) * rr), y = v.wy(cy + Math.sin(a) * rr * r.sq);
      i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
    }
    ctx.lineTo(v.wx(r.x + rad), v.wy(fy + 0.6));
    ctx.lineTo(v.wx(r.x - rad), v.wy(fy + 0.6));
    ctx.closePath();
    ctx.fillStyle = '#0c121b';
    ctx.fill();
    const l = 0.12 + 0.5 * lit(r.x);
    ctx.strokeStyle = `rgba(170,210,225,${l})`;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    for (let i = 1; i <= 6; i++) {
      const a = Math.PI + (i / 10) * Math.PI;
      const rr = rad * (0.85 + 0.15 * L.noise1(i * 0.9 + r.seed, 53));
      const x = v.wx(r.x + Math.cos(a) * rr), y = v.wy(cy + Math.sin(a) * rr * r.sq);
      i > 1 ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
    }
    ctx.stroke();
  }
  // silt haze hugging the floor
  ctx.globalCompositeOperation = 'lighter';
  for (const [px, sc] of PLUMES) {
    const x = px + v.gt * 3.5 * sc + L.noise1(v.gt * 0.2 + sc * 9, 54) * 25;
    const gx = v.wx(x), gy = v.wy(floorY(x) - 14 * sc);
    const r = v.ws(70 * sc);
    const a = 0.05 + 0.1 * lit(x);
    ctx.save();
    ctx.translate(gx, gy);
    ctx.scale(1, 0.35);
    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, Math.max(1, r));
    g.addColorStop(0, `rgba(140,170,185,${a})`);
    g.addColorStop(1, 'rgba(140,170,185,0)');
    ctx.fillStyle = g;
    ctx.fillRect(-r, -r, r * 2, r * 2);
    ctx.restore();
  }
  // drifting motes near the bottom (benthic current, left → right, slowly settling)
  for (const m of MOTES) {
    const spanX = 700, spanY = 360;
    const x = FX - spanX / 2 + ((((m.x * spanX + v.gt * (3 + m.s * 4)) % spanX) + spanX) % spanX);
    const yy = ((m.y * spanY + v.gt * (0.8 + m.s)) % spanY);
    const y = TRENCH_FLOOR - spanY + yy + L.noise1(v.gt * 0.5 + m.ph, 55) * 4;
    if (y > floorY(x) - 0.5) continue;
    const a = (0.12 + 0.6 * lit(x)) * (0.4 + 0.6 * m.s) * clamp((spanY - yy) / 30) * clamp(yy / 40);
    ctx.fillStyle = `rgba(200,225,235,${a})`;
    ctx.beginPath();
    ctx.arc(v.wx(x), v.wy(y), Math.max(0, 0.8 + m.s * 1.8), 0, TAU);
    ctx.fill();
  }
  ctx.restore();

  // touchdown marker: accent ring pulse on the floor
  const mx = FX + 150, my = floorY(FX + 150);
  const mk = enterK(t, T.arrive - 0.2, 0.5) * (1 - ease.inCubic(prog(t, T.labelOut, 0.5)));
  if (mk > 0) {
    const sx = v.wx(mx), sy = v.wy(my);
    ctx.save();
    ctx.globalAlpha = mk;
    for (let i = 0; i < 2; i++) {
      const ph = ((t - T.arrive + i * 0.9) / 1.8) % 1;
      if (t - T.arrive + i * 0.9 < 0) continue;
      ctx.strokeStyle = rgba(v.accent, 0.6 * (1 - ph));
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(sx, sy, Math.max(0, 8 + ph * 70), Math.max(0, (8 + ph * 70) * 0.25), 0, 0, TAU);
      ctx.stroke();
    }
    ctx.fillStyle = rgba(v.accent);
    ctx.beginPath();
    ctx.arc(sx, sy, Math.max(0, 6), 0, TAU);
    ctx.fill();
    L.lightBlob(ctx, sx, sy, 40, v.accent, 0.35);
    ctx.restore();
  }
}
const enterK = (t, s, d) => ease.outCubic(prog(t, s, d));

function drawRecap(ctx, v, T) {
  if (v.t < T.path) return;
  const dim = 1 - ease.inOutCubic(prog(v.t, T.recapOut, 0.35));
  if (dim <= 0) return;
  const hs = headS(v, T);
  const ink = clamp((v.t - T.path) / 0.3);
  ctx.save();
  ctx.globalAlpha = dim * ink;
  // dashed dive path, retraced from the floor up to the head
  ctx.setLineDash([6, 8]);
  ctx.lineDashOffset = v.gt * 20;
  ctx.strokeStyle = rgba(v.accent, 0.55);
  ctx.lineWidth = 2;
  ctx.beginPath();
  const n = 140;
  for (let i = 0; i <= n; i++) {
    const s = lerp(1, hs, i / n);
    const [x, y] = pathPt(s);
    i ? ctx.lineTo(v.wx(x), v.wy(y)) : ctx.moveTo(v.wx(x), v.wy(y));
  }
  ctx.stroke();
  ctx.setLineDash([]);
  // the travelling head (fades once it reaches the surface)
  if (hs > 0.001 || v.t < T.climb + T.pathDur + 0.3) {
    const [hx, hy] = pathPt(hs);
    const fadeTop = hs > 0.001 ? 1 : 1 - clamp((v.t - (T.climb + T.pathDur)) / 0.3);
    const hX = v.wx(hx), hY = v.wy(hy);
    // boost while the camera pulls back: the head is the one focal point of the move
    const boost = Math.sin(Math.PI * clamp((v.t - T.path) / Math.max(0.1, T.recapOut - T.path))) ** 0.5;
    // short comet trail behind the head (sampled down the path until ~110 px of screen length)
    const pts = [[hX, hY]];
    let acc = 0;
    for (let i = 1; i <= 80 && acc < 110; i++) {
      const sN = Math.min(1, hs + i * 0.004);
      const [tx, ty] = pathPt(sN);
      const px = v.wx(tx), py = v.wy(ty);
      acc += Math.hypot(px - pts[pts.length - 1][0], py - pts[pts.length - 1][1]);
      pts.push([px, py]);
      if (sN >= 1) break;
    }
    if (pts.length > 1 && acc > 4) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.lineCap = 'round';
      for (let i = 1; i < pts.length; i++) {
        const f = 1 - i / pts.length;
        ctx.strokeStyle = rgba([150, 240, 248], (0.25 + 0.6 * boost) * f * fadeTop);
        ctx.lineWidth = 1.5 + 4.5 * f;
        ctx.beginPath();
        ctx.moveTo(pts[i - 1][0], pts[i - 1][1]);
        ctx.lineTo(pts[i][0], pts[i][1]);
        ctx.stroke();
      }
      ctx.restore();
    }
    L.lightBlob(ctx, hX, hY, 30 + 34 * boost, v.accent, (0.85 + 0.15 * boost) * fadeTop);
    L.lightBlob(ctx, hX, hY, 12 + 6 * boost, [220, 250, 252], 0.6 * boost * fadeTop);
    ctx.fillStyle = rgba([235, 252, 253], fadeTop);
    ctx.beginPath();
    ctx.arc(hX, hY, 3.5 + 1.5 * boost, 0, TAU);
    ctx.fill();
  }
  // landmark dots pop on as the head passes them
  for (const m of MARKS) {
    const mk = ease.outCubic(clamp((markS(m.y) + 0.01 - hs) / 0.05));
    if (mk <= 0) continue;
    const sx = v.wx(m.x), sy = v.wy(m.y);
    ctx.fillStyle = rgba(v.accent, mk);
    ctx.beginPath();
    ctx.arc(sx, sy, Math.max(0, 5 * ease.outBack(mk)), 0, TAU);
    ctx.fill();
    ctx.strokeStyle = rgba(v.accent, 0.4 * mk);
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(sx, sy, Math.max(0, 11 * mk), 0, TAU);
    ctx.stroke();
  }
  ctx.restore();
}

const LIST_X = 818;                 // just right of the dive column (dots at x ≈ 773)
const LIST_MAX = 950;               // nothing past x = 950 (YouTube UI)
function drawRecapLabels(ctx, v, T) {
  const pk = prog(v.t, T.path, T.pathDur);
  if (pk <= 0) return;
  const out = 1 - ease.inCubic(prog(v.t, T.recapOut, 0.3));
  if (out <= 0) return;
  ctx.save();
  MARKS.forEach((m, i) => {
    if (m.fan === null) return;
    const sx = v.wx(m.x), sy = v.wy(m.y);
    const mk = enterK(v.t, labelT(T, i), 0.45) * out * v.k;
    if (mk <= 0) return;
    const ly = m.fan;
    const lx = LIST_X;
    ctx.globalAlpha = mk;
    // elbow leader, only once its mark (dot) is in frame and lit
    const dotK = ease.outCubic(clamp((markS(m.y) + 0.01 - headS(v, T)) / 0.05));
    const lead = dotK * clamp((sy - 60) / 120) * clamp((lx - 24 - sx) / 12);
    if (lead > 0) {
      ctx.save();
      ctx.globalAlpha = mk * lead;
      ctx.strokeStyle = 'rgba(210,225,235,0.55)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(sx + 12, sy);
      ctx.lineTo(sx + 26, sy);
      ctx.lineTo(Math.max(sx + 26, lx - 14), ly);
      ctx.lineTo(lx - 6, ly);
      ctx.stroke();
      ctx.restore();
    }
    const dx = (1 - mk) * 16;
    ctx.textBaseline = 'alphabetic';
    ctx.shadowColor = 'rgba(0,0,0,0.6)';
    ctx.shadowBlur = 8;
    fitFont(ctx, m.num, LIST_MAX - lx - 4, 40, 700, L.FONT.din, 0.5);
    ctx.fillStyle = rgba(v.accent);
    L.trackedText(ctx, m.num, lx + dx, ly + 12, 0.5);
    fitFont(ctx, m.name, LIST_MAX - lx - 4, 18, 600, L.FONT.body, 1.2);
    ctx.fillStyle = 'rgba(205,215,230,0.9)';
    L.trackedText(ctx, m.name, lx + dx, ly + 36, 1.2);
  });
  ctx.restore();
}

/** set ctx.font to the largest size <= size whose tracked width fits maxW (sizes in 0.5 px steps) */
function fitFont(ctx, str, maxW, size, weight, family, tracking = 0) {
  let sz = size;
  for (; sz > 10; sz -= 0.5) {
    ctx.font = L.font(sz, weight, family);
    ctx.letterSpacing = `${tracking}px`;
    const w = ctx.measureText(str).width - tracking;
    ctx.letterSpacing = '0px';
    if (w <= maxW) break;
  }
  return sz;
}

// pressure gauge
function drawDial(ctx, v, T, x, y) {
  const k = enterK(v.t, T.dial, 0.5) * (1 - ease.inCubic(prog(v.t, T.labelOut, 0.35))) * v.k;
  if (k <= 0) return;
  const sweep = ease.outCubic(prog(v.t, T.dial + 0.05, T.dialSweep));
  const r = 52;
  const a0 = Math.PI * 0.75, a1 = Math.PI * 2.25;
  ctx.save();
  ctx.globalAlpha = k;
  ctx.translate(0, (1 - k) * 16);
  ctx.fillStyle = 'rgba(4,10,20,0.6)';
  ctx.beginPath(); ctx.arc(x, y, Math.max(0, r + 14), 0, TAU); ctx.fill();
  ctx.strokeStyle = 'rgba(210,225,235,0.25)';
  ctx.lineWidth = 6;
  ctx.lineCap = 'round';
  ctx.beginPath(); ctx.arc(x, y, Math.max(0, r), a0, a1); ctx.stroke();
  ctx.strokeStyle = rgba(v.accent);
  ctx.beginPath(); ctx.arc(x, y, Math.max(0, r), a0, lerp(a0, a1, sweep * 0.94)); ctx.stroke();
  // ticks
  ctx.lineWidth = 2;
  for (let i = 0; i <= 10; i++) {
    const a = lerp(a0, a1, i / 10);
    ctx.strokeStyle = `rgba(210,225,235,${i / 10 <= sweep * 0.94 ? 0.8 : 0.3})`;
    ctx.beginPath();
    ctx.moveTo(x + Math.cos(a) * (r - 14), y + Math.sin(a) * (r - 14));
    ctx.lineTo(x + Math.cos(a) * (r - 8), y + Math.sin(a) * (r - 8));
    ctx.stroke();
  }
  // needle with a tiny tremble at full pressure
  const na = lerp(a0, a1, sweep * 0.94) + Math.sin(v.gt * 23) * 0.012 * sweep;
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(x - Math.cos(na) * 8, y - Math.sin(na) * 8);
  ctx.lineTo(x + Math.cos(na) * (r - 16), y + Math.sin(na) * (r - 16));
  ctx.stroke();
  ctx.fillStyle = '#fff';
  ctx.beginPath(); ctx.arc(x, y, Math.max(0, 5), 0, TAU); ctx.fill();
  // readout
  ctx.textBaseline = 'alphabetic';
  ctx.textAlign = 'left';
  ctx.shadowColor = 'rgba(0,0,0,0.6)';
  ctx.shadowBlur = 10;
  ctx.font = L.font(70, 700, L.FONT.din);
  ctx.fillStyle = '#fff';
  const bar = Math.round(1086 * sweep);
  const tx = x + r + 34;
  const w = L.trackedText(ctx, `${L.fmt(bar)}`, tx, y + 14, 0);
  ctx.font = L.font(34, 700, L.FONT.din);
  ctx.fillStyle = 'rgba(205,215,230,0.95)';
  ctx.fillText(' BAR', tx + w + 4, y + 14);
  ctx.font = L.font(22, 600, L.FONT.body);
  ctx.fillStyle = 'rgba(205,215,230,0.9)';
  L.trackedText(ctx, '≈ 1.1 TONNES ON EVERY CM²', tx, y + 50, 2);
  ctx.restore();
}

const BRACKET_DX = 150;   // bracket clear of the summit, leaving the payoff label room left of x = 950
function drawBracket(ctx, v, T) {
  const k = prog(v.t, T.bracket, 0.8);
  if (k <= 0) return;
  const off = everestY(v.t, T) || 0;
  const peakY = v.wy(TRENCH_FLOOR + off - EV_H), surfY = v.wy(0);
  const px = v.wx(FX);
  const bx = px + BRACKET_DX;
  const e = ease.outCubic(k);
  ctx.save();
  ctx.globalAlpha = v.k;
  // reference line at the summit
  ctx.strokeStyle = rgba(v.accent, 0.75);
  ctx.lineWidth = 2;
  ctx.setLineDash([5, 7]);
  ctx.beginPath();
  ctx.moveTo(bx - 18, peakY); ctx.lineTo(lerp(bx - 18, px + 14, e), peakY);
  ctx.stroke();
  ctx.setLineDash([]);
  // measure upward: the bracket grows from the summit tick to the surface
  const ek = L.ease.outCubic(Math.max(0, Math.min(1, k)));
  const topY = lerp(peakY, surfY, ek);
  ctx.strokeStyle = rgba(v.accent, 0.9);
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(bx - 18, peakY); ctx.lineTo(bx, peakY); ctx.lineTo(bx, topY);
  if (ek > 0.98) ctx.lineTo(bx - 18, topY);
  ctx.stroke();
  ctx.fillStyle = rgba(v.accent);
  for (const y of [peakY, surfY]) { ctx.beginPath(); ctx.arc(bx, y, Math.max(0, 4.5 * e), 0, TAU); ctx.fill(); }
  ctx.restore();
}

export default {
  beat: 7,
  chapter: { num: '06', title: 'Challenger Deep', sub: 'Mariana Trench · the deepest point' },
  chapterUntil(d) { return REVEAL_TIMES.start * d; },
  captions: true,
  layer: 2,
  cues(d) {
    const T = times(d);
    const out = [
      { t: T.arrive - 0.1, name: 'deep', gain: 0.3, pitch: 0.8 },
      { t: T.arrive, name: 'sonar', gain: 0.28, pitch: 0.7 },
      { t: T.label, name: 'blip', gain: 0.25, pitch: 0.9 },
      { t: T.dial + 0.05, name: 'count', gain: 0.22, pitch: 0.8 },
      { t: T.dial + 0.05 + T.dialSweep, name: 'creak', gain: 0.22, pitch: 0.7 },
      { t: T.path - 0.2, name: 'swell', gain: 0.3, pitch: 1 },
      { t: T.drop - 0.35, name: 'riser', gain: 0.3, pitch: 0.8 },
      { t: T.drop + 0.1, name: 'whoosh', gain: 0.4, pitch: 0.55 },
      { t: T.land, name: 'impact', gain: 0.65, pitch: 0.6 },
      { t: T.land + 0.02, name: 'deep', gain: 0.55, pitch: 0.6 },
      { t: T.land + 0.25, name: 'bubbles', gain: 0.18, pitch: 0.7 },
      { t: T.bracket, name: 'swish', gain: 0.2, pitch: 0.9 },
      { t: T.payoff, name: 'bloom', gain: 0.28, pitch: 1 },
      { t: splashT(T), name: 'splash', gain: 0.4, pitch: 0.6 },
    ];
    // ticks as each recap label enters
    MARKS.forEach((m, i) => { if (i) out.push({ t: labelT(T, i), name: 'tick', gain: 0.16, pitch: 1 + i * 0.12 }); });
    return out;
  },
  drawWorld(ctx, v) {
    if (v.t < -0.5) return;
    const T = times(v.d);
    drawFloor(ctx, v, T);
    drawRecap(ctx, v, T);
    drawDust(ctx, v, T);
    drawEverest(ctx, v, T);
    drawSplash(ctx, v, T);
    drawImpact(ctx, v, T);
    drawBracket(ctx, v, T);
  },
  drawOverlay(ctx, v) {
    const T = times(v.d);
    // 1. arrival label + pressure gauge (right column; the depth gauge owns the left edge)
    const lk = enterK(v.t, T.label, 0.6) * (1 - ease.inCubic(prog(v.t, T.labelOut, 0.35))) * v.k;
    if (lk > 0) {
      bigLabel(ctx, { x: 940, y: 640, big: '10,935 m', small: '35,876 ft · Challenger Deep', k: lk, accent: v.accent, align: 'right', size: 116 });
    }
    drawDial(ctx, v, T, 470, 800);
    // 2. recap
    drawRecapLabels(ctx, v, T);
    // 3. Everest name tag on the mountain body
    const ek = enterK(v.t, T.land + 0.15, 0.6) * v.k;
    if (ek > 0) {
      const off = everestY(v.t, T) || 0;
      const x = v.wx(FX), y = v.wy(TRENCH_FLOOR + off - EV_H * 0.5);
      ctx.save();
      ctx.globalAlpha = ek;
      ctx.textBaseline = 'alphabetic';
      ctx.shadowColor = 'rgba(0,0,0,0.7)';
      ctx.shadowBlur = 12;
      ctx.font = L.font(46, 700, L.FONT.display);
      ctx.fillStyle = '#fff';
      L.trackedText(ctx, 'EVEREST', x, y + (1 - ek) * 14, 8, 'center');
      ctx.font = L.font(30, 700, L.FONT.din);
      ctx.fillStyle = 'rgba(205,215,230,0.9)';
      L.trackedText(ctx, '8,849 m TALL', x, y + 40 + (1 - ek) * 14, 2, 'center');
      ctx.restore();
    }
    // 4. the payoff label next to the bracket
    const bk = prog(v.t, T.payoff, 0.6) * v.k;
    if (bk > 0) {
      const off = everestY(v.t, T) || 0;
      const peakY = v.wy(TRENCH_FLOOR + off - EV_H);
      const x = v.wx(FX) + BRACKET_DX + 36, y = Math.max(470, peakY + 40);
      const bigSz = Math.min(130, L.fitSize(ctx, '≈ 2 km', LIST_MAX - x - 6, 130, 800, L.FONT.display, 60));
      bigLabel(ctx, { x, y, big: '≈ 2 km', small: '', k: bk, accent: v.accent, align: 'left', size: bigSz });
      const e = ease.outCubic(bk);
      ctx.save();
      ctx.globalAlpha = clamp(bk * 1.4);
      ctx.textBaseline = 'alphabetic';
      ctx.shadowColor = 'rgba(0,0,0,0.6)';
      ctx.shadowBlur = 8;
      const subSz = fitFont(ctx, 'ABOVE THE SUMMIT', LIST_MAX - x, 30, 600, L.FONT.body, 3);
      ctx.fillStyle = 'rgba(205,215,230,0.95)';
      L.trackedText(ctx, 'OF WATER STILL', x, y + 52 + (1 - e) * 18, 3);
      L.trackedText(ctx, 'ABOVE THE SUMMIT', x, y + 52 + subSz * 1.33 + (1 - e) * 22, 3);
      ctx.globalAlpha = clamp((bk - 0.5) * 2) * 0.8;
      const scSz = fitFont(ctx, 'WIDTH COMPRESSED', LIST_MAX - x, 20, 600, L.FONT.body, 4);
      ctx.fillStyle = 'rgba(170,190,210,0.9)';
      L.trackedText(ctx, 'VERTICAL SCALE TRUE', x, y + 140, 4);
      L.trackedText(ctx, 'WIDTH COMPRESSED', x, y + 140 + scSz * 1.4, 4);
      ctx.restore();
    }
  },
};

const bigLabel = L.bigLabel;

// 03b: the cold open (s00-cold.js) replays the Everest drop with these, on its own clock.
export const parts = { times, everestY, splashT, drawDust, drawEverest, drawSplash, drawImpact, drawBracket, FX, EV_H, PEAK, BRACKET_DX };
