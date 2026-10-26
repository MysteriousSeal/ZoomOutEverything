// Beat 2 — "Within hours, with no one to run them, | power plants would shut down."
// The riverside power station at PLANT, top-down: boiler house and turbine hall, four tall stacks (long moon
// shadows, red aviation lights), fuel tanks, a switchyard, a lit cooling-water intake on the river, and the
// transmission lines that feed the city. Steam plumes drift toward the upper left (world space).
// On "power plants" the plumes thin and stop, stack by stack; on "shut down" the site lights die in a short
// stutter and an accent pulse runs out along the lines (the blackout wave of beat 3 starts here).
// The plant stays in the world, dark (and follows env's daylight in beats 4-5).
import * as L from '../../../../engine/runtime/lib.js';
import { PLANT } from '../camera.js';
import { cityState, glowDot, LAMP } from '../env.js';
import { label } from './s01-lights-on.js';

const { W, H } = L;
const P = PLANT;
const WIND = { x: -0.5, y: -0.866 };   // plumes drift toward the upper left
const STACKS = [[-120, -122], [-55, -122], [10, -122], [75, -122]].map(([x, y], i) => ({ x: P.x + x, y: P.y + y, i }));
const TANKS = [[-140, 96, 24], [-82, 104, 22], [-26, 96, 24]];
const SHORE_X = 1866;                  // the Queens bank of the East River at the plant (real coastline, env)
// the yard layout below was drawn around an earlier site at (3520, -4400): OX/OY carry it to Ravenswood
const OX = P.x - 3520, OY = P.y + 4400;
// transmission lines (world polylines from the switchyard): one crosses the river into Manhattan
const LINES = [
  [[P.x + 185, P.y - 100], [P.x + 900, P.y - 1500], [P.x + 2300, P.y - 3800]],
  [[P.x + 185, P.y - 20], [P.x + 1600, P.y - 300], [P.x + 4200, P.y - 200]],
  [[P.x + 185, P.y + 80], [P.x + 1100, P.y + 1300], [P.x + 2600, P.y + 3400]],
  // from the south-west corner, west across the river into Manhattan: kept below the HUD band and the house label
  // at the beat-2 framing (screen y ~ 700-820)
  [[P.x - 150, P.y + 150], [P.x - 520, P.y + 380], [P.x - 1400, P.y + 500], [P.x - 3200, P.y + 620]],
];
const LEN = LINES.map((pl) => pl.slice(1).reduce((s, p, i) => s + Math.hypot(p[0] - pl[i][0], p[1] - pl[i][1]), 0));
// site lights: [x, y, white?] relative to the plant centre
const FLOODS = (() => {
  const r = L.rng(1520), out = [];
  for (let k = 0; k < 9; k++) out.push([-185 + k * 46, -146, r() < 0.4]);
  for (let k = 0; k < 9; k++) out.push([-185 + k * 46, 146, r() < 0.4]);
  for (let k = 0; k < 5; k++) out.push([-186, -110 + k * 55, 0], [186, -110 + k * 55, 1]);
  for (let k = 0; k < 6; k++) out.push([-140 + k * 48, 46, 1]);
  return out;
})();

// ------------------------------------------------------------------ timing (beat-2 relative seconds)
function times(v) {
  const s = v.tl.scenes[2].start;
  const p2 = (v.tl.lines[2].phrases?.[1]?.start ?? s + 2.85) - s;
  return { s, p2, off: p2 + 0.95 };   // "power plants…" thins the plumes; "…shut down" kills the lights
}
/** 0..1 plant lights at beat-2 time t: steady, a short stutter on "shut down", then dark. */
function plantOn(v, tm) {
  const t = v.gt - tm.s;
  const u = L.prog(t, tm.off, 0.5);
  if (u <= 0) return 1;
  if (u >= 1) return 0;
  const n = L.noise1(v.gt * 26, 5) * 0.5 + 0.5;
  return n > 0.25 + u * 0.75 ? 1 - u * 0.5 : 0.08 * (1 - u);
}
/** Steam emission strength of stack i at global time te. */
function emit(tm, i, te) {
  return 1 - L.smoothstep(L.prog(te - tm.s, tm.p2 + 0.05 + i * 0.22, 0.75));
}

// ------------------------------------------------------------------ sprites
const PUFF = new Map();
function puffSprite(rgb) {
  const key = rgb.join(',');
  if (PUFF.has(key)) return PUFF.get(key);
  const s = new OffscreenCanvas(64, 64), g = s.getContext('2d');
  const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  gr.addColorStop(0, L.rgba(rgb, 0.9)); gr.addColorStop(0.45, L.rgba(rgb, 0.45)); gr.addColorStop(1, L.rgba(rgb, 0));
  g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
  PUFF.set(key, s);
  return s;
}

// ------------------------------------------------------------------ drawing
function pal(st) {
  const d = st.day;
  return {
    pad: L.mix([34, 35, 40], [104, 104, 100], d),
    roof: L.mix([66, 70, 80], [128, 128, 124], d),
    roof2: L.mix([54, 57, 66], [112, 110, 106], d),
    rib: L.mix([40, 42, 50], [92, 92, 90], d),
    tank: L.mix([82, 84, 90], [150, 148, 142], d),
    stack: L.mix([150, 140, 132], [190, 180, 170], d),
    water: L.mix([5, 10, 20], [46, 70, 86], d),
  };
}
const rect = (c, v, x0, y0, x1, y1) => c.fillRect(v.wx(x0), v.wy(y0), (x1 - x0) / v.cam.mpp, (y1 - y0) / v.cam.mpp);

function drawLines(c, v, on, tm) {
  const m = v.cam.mpp;
  const k = 1 - L.clamp(L.invLerp(16, 30, m));
  if (k <= 0) return;
  c.save();
  c.lineJoin = 'round';
  for (let n = 0; n < LINES.length; n++) {
    const pl = LINES[n];
    c.beginPath();
    pl.forEach(([x, y], i) => (i ? c.lineTo(v.wx(x), v.wy(y)) : c.moveTo(v.wx(x), v.wy(y))));
    c.strokeStyle = `rgba(140,150,170,${0.42 * k})`;
    c.lineWidth = Math.max(1.1, 2.8 / m);
    c.stroke();
    if (on > 0) {   // live: a faint warm hum
      c.strokeStyle = L.rgba(LAMP, 0.16 * on * k);
      c.lineWidth = Math.max(2.4, 8 / m);
      c.stroke();
    }
    // pylons every ~300 m
    c.fillStyle = `rgba(150,160,175,${0.45 * k})`;
    for (let i = 1; i < pl.length; i++) {
      const [ax, ay] = pl[i - 1], [bx, by] = pl[i], len = Math.hypot(bx - ax, by - ay);
      for (let s = 0; s <= len; s += 300) {
        const x = v.wx(ax + ((bx - ax) * s) / len), y = v.wy(ay + ((by - ay) * s) / len), r = Math.max(1.2, 7 / m);
        if (x < -20 || x > W + 20 || y < -20 || y > H + 20) continue;
        c.fillRect(x - r / 2, y - r / 2, r, r);
      }
    }
  }
  c.restore();
  // the shutdown pulse: the lines flash accent from the plant outward, a bright bead at the front
  const t = v.gt - tm.s;
  const pk = L.prog(t, tm.off + 0.1, 1.6);
  if (pk > 0 && pk < 1) {
    const fade = Math.sin(Math.PI * Math.min(1, pk * 1.6)) * (1 - L.ease.inCubic(pk));
    for (let n = 0; n < LINES.length; n++) {
      const pl = LINES[n];
      const e = L.ease.outCubic(L.clamp(pk * 1.15 - n * 0.03));
      // the bead travels at most ~2.2 km (stays on screen long enough to read), the trail fades behind it
      const s1 = Math.min(LEN[n], 2200) * e, s0 = Math.max(0, s1 - 900);
      c.save();
      c.globalCompositeOperation = 'lighter';
      c.lineCap = 'round';
      const a0 = pointAt(pl, s0), a1 = pointAt(pl, s1);
      const g = c.createLinearGradient(v.wx(a0[0]), v.wy(a0[1]), v.wx(a1[0]), v.wy(a1[1]));
      g.addColorStop(0, L.rgba(v.accent, 0)); g.addColorStop(1, L.rgba(v.accent, 0.95 * fade * k));
      c.strokeStyle = g;
      c.lineWidth = Math.max(2.5, 10 / m);
      c.beginPath();
      c.moveTo(v.wx(a0[0]), v.wy(a0[1]));
      for (let q = 1; q <= 12; q++) { const p = pointAt(pl, L.lerp(s0, s1, q / 12)); c.lineTo(v.wx(p[0]), v.wy(p[1])); }
      c.stroke();
      c.restore();
      const hud = L.clamp((v.wy(a1[1]) - 330) / 70);   // never run the bead through the HUD band
      glowDot(c, v.wx(a1[0]), v.wy(a1[1]), 30, v.accent, 0.8 * fade * k * hud);
      glowDot(c, v.wx(a1[0]), v.wy(a1[1]), 7, [255, 248, 230], fade * k * hud);
    }
  }
}
function pointAt(pl, s) {
  for (let i = 1; i < pl.length; i++) {
    const [ax, ay] = pl[i - 1], [bx, by] = pl[i], len = Math.hypot(bx - ax, by - ay);
    if (s <= len || i === pl.length - 1) { const f = L.clamp(s / len); return [ax + (bx - ax) * f, ay + (by - ay) * f]; }
    s -= len;
  }
  return pl[pl.length - 1];
}

// the industrial waterfront around the plant: dark ground with rail sidings and yard lights (masks the street lattice)
const shoreAt = (y) => SHORE_X - 0.035 * (y - P.y);
const YARD = [[shoreAt(-4930 + OY) + 12, -4930 + OY], [3950 + OX, -4930 + OY], [4280 + OX, -4720 + OY], [4330 + OX, -4160 + OY], [4060 + OX, -3880 + OY], [shoreAt(-3880 + OY) + 12, -3880 + OY]];
function drawYard(c, v, st, on) {
  const m = v.cam.mpp, d = st.day;
  const ground = L.mix(L.mix([17, 19, 24], [84, 84, 80], d), [20, 40, 28], st.green * 0.7);
  c.save();
  c.beginPath();
  YARD.forEach(([x, y], i) => (i ? c.lineTo(v.wx(x), v.wy(y)) : c.moveTo(v.wx(x), v.wy(y))));
  c.closePath();
  c.fillStyle = L.rgba(ground);
  c.fill();
  // feathered edge: the yard dissolves into the street grid instead of ending on a hard line
  c.lineJoin = 'round';
  for (const [wm, a] of [[180, 0.16], [110, 0.28], [50, 0.5]]) {   // stroke widths in metres
    c.strokeStyle = L.rgba(ground, a);
    c.lineWidth = Math.max(3, wm / m);
    c.stroke();
  }
  c.clip();
  // rail sidings sweeping in from the south-east, a few warehouse roofs and parked tankers
  c.strokeStyle = L.rgba(L.mix(ground, [110, 110, 115], 0.35), 0.8);
  c.lineWidth = Math.max(0.6, 1.6 / m);
  for (let k = 0; k < 4; k++) {
    c.beginPath();
    c.moveTo(v.wx(4350 + OX), v.wy(-3980 - k * 14 + OY));
    c.bezierCurveTo(v.wx(4050 + OX), v.wy(-4000 - k * 14 + OY), v.wx(3900 + OX), v.wy(-4210 - k * 10 + OY), v.wx(3720 + k * 4 + OX), v.wy(-4230 - k * 9 + OY));
    c.stroke();
  }
  const r = L.rng(1521);
  c.fillStyle = L.rgba(L.mix(ground, [70, 74, 84], 0.45));
  for (let q = 0; q < 9; q++) {
    const x = 3760 + r() * 450 + OX, y = -4900 + r() * 980 + OY, w = 40 + r() * 70, h = 24 + r() * 40;
    if (x > 3300 + OX && x < 3740 + OX && y > -4570 + OY && y < -4230 + OY) continue;
    if (!(x > 3730 + OX || y < -4580 + OY || y > -4220 + OY)) continue;
    c.fillRect(v.wx(x), v.wy(y), w / m, h / m);
  }
  c.restore();
  // yard lights + a warm pool of light around the whole site while it runs
  if (on > 0) {
    const night = 1 - d * 0.8;
    glowDot(c, v.wx(P.x), v.wy(P.y), Math.max(80, 900 / m), LAMP, 0.32 * on * night);
    glowDot(c, v.wx(P.x - 60), v.wy(P.y - 40), Math.max(40, 420 / m), [255, 220, 170], 0.22 * on * night);
    const rl = L.rng(1522);
    for (let q = 0; q < 26; q++) {
      const x = 3700 + rl() * 560 + OX, y = -4880 + rl() * 950 + OY;
      if (x < 3730 + OX && y > -4570 + OY && y < -4230 + OY) continue;
      glowDot(c, v.wx(x), v.wy(y), Math.max(4, 22 / m), LAMP, 0.45 * on * night);
      glowDot(c, v.wx(x), v.wy(y), Math.max(1, 2.6 / m), [255, 240, 210], 0.85 * on);
    }
  }
}

function drawPlant(c, v, st, on) {
  const m = v.cam.mpp, Q = pal(st);
  const X = (x) => P.x + x, Y = (y) => P.y + y;
  // the intake canal from the river, then the site pad
  c.fillStyle = L.rgba(Q.water);
  rect(c, v, SHORE_X - 30, Y(22), X(-170), Y(58));
  c.fillStyle = L.rgba(Q.pad);
  rect(c, v, X(-190), Y(-150), X(190), Y(150));
  c.strokeStyle = L.rgba(L.mix(Q.pad, [140, 150, 170], 0.35), 0.8);
  c.lineWidth = Math.max(0.6, 1.2 / m);
  c.strokeRect(v.wx(X(-190)), v.wy(Y(-150)), 380 / m, 300 / m);
  // long moon shadows of the tall structures (toward the lower left)
  c.fillStyle = 'rgba(0,0,0,0.35)';
  rect(c, v, X(-150) - 14, Y(-95) + 10, X(110) - 14, Y(40) + 10);
  c.save();
  c.lineCap = 'round';
  c.strokeStyle = 'rgba(0,0,0,0.42)';
  for (const s of STACKS) {
    c.lineWidth = Math.max(1, 14 / m);
    c.beginPath(); c.moveTo(v.wx(s.x), v.wy(s.y)); c.lineTo(v.wx(s.x - 150), v.wy(s.y + 95)); c.stroke();
  }
  c.restore();
  // boiler house (4 units) and the turbine hall with roof ribs
  c.fillStyle = L.rgba(Q.roof2);
  rect(c, v, X(-150), Y(-95), X(110), Y(-22));
  c.fillStyle = L.rgba(Q.roof);
  rect(c, v, X(-150), Y(-18), X(110), Y(40));
  c.fillStyle = L.rgba(Q.rib);
  if (m < 6) {
    for (let x = -146; x < 110; x += 9) rect(c, v, X(x), Y(-16), X(x + 1.4), Y(38));
    for (let u = 1; u < 4; u++) rect(c, v, X(-150 + u * 65 - 1), Y(-95), X(-150 + u * 65 + 1), Y(-22));
  }
  // lit window strip along the turbine hall (and a warm floodlight wash over the roofs)
  if (on > 0) {
    c.save();
    c.globalCompositeOperation = 'lighter';
    c.fillStyle = L.rgba(LAMP, 0.1 * on * (1 - st.day));
    rect(c, v, X(-150), Y(-95), X(110), Y(40));
    c.restore();
    c.fillStyle = L.rgba(L.mix(LAMP, [255, 235, 200], 0.4), 0.75 * on);
    rect(c, v, X(-146), Y(38), X(106), Y(41.5));
  }
  // fuel tanks: rings with roof seams
  for (const [x, y, r] of TANKS) {
    const cx = v.wx(X(x)), cy = v.wy(Y(y)), rr = r / m;
    c.fillStyle = 'rgba(0,0,0,0.35)';
    c.beginPath(); c.arc(cx - 10 / m, cy + 7 / m, Math.max(0, rr), 0, Math.PI * 2); c.fill();
    c.fillStyle = L.rgba(Q.tank);
    c.beginPath(); c.arc(cx, cy, Math.max(0, rr), 0, Math.PI * 2); c.fill();
    c.strokeStyle = L.rgba(L.mix(Q.tank, [0, 0, 0], 0.35));
    c.lineWidth = Math.max(0.5, 1.2 / m);
    c.beginPath(); c.arc(cx, cy, Math.max(0, rr * 0.62), 0, Math.PI * 2); c.stroke();
  }
  // switchyard: gantry rows and transformers
  c.fillStyle = L.rgba(L.mix(Q.pad, [0, 0, 0], 0.25));
  rect(c, v, X(128), Y(-135), X(184), Y(135));
  c.fillStyle = L.rgba(L.mix(Q.roof, [120, 126, 138], 0.3));
  for (let y = -126; y < 130; y += 18) for (const x of [136, 156, 172]) rect(c, v, X(x), Y(y), X(x + 7), Y(y + 6));
  // admin block + intake pumphouse
  c.fillStyle = L.rgba(Q.roof2);
  rect(c, v, X(30), Y(78), X(108), Y(128));
  rect(c, v, X(-188), Y(14), X(-160), Y(66));
  // stacks: rings (seen from above) with a dark flue
  for (const s of STACKS) {
    const cx = v.wx(s.x), cy = v.wy(s.y);
    c.fillStyle = L.rgba(L.mix([150, 40, 34], [200, 70, 60], st.day));      // red top band (aviation marking)
    c.beginPath(); c.arc(cx, cy, Math.max(0, 13 / m), 0, Math.PI * 2); c.fill();
    c.fillStyle = L.rgba(Q.stack);
    c.beginPath(); c.arc(cx, cy, Math.max(0, 10.5 / m), 0, Math.PI * 2); c.fill();
    c.fillStyle = 'rgba(8,8,10,0.95)';
    c.beginPath(); c.arc(cx, cy, Math.max(0, 7 / m), 0, Math.PI * 2); c.fill();
    if (on > 0) {   // the hot flue glows faintly while the boilers run
      glowDot(c, cx, cy, Math.max(2, 9 / m), [255, 150, 80], 0.5 * on);
    }
  }
}

function drawLights(c, v, st, on) {
  if (on <= 0) return;
  const m = v.cam.mpp, night = 1 - st.day * 0.7;
  const X = (x) => P.x + x, Y = (y) => P.y + y;
  for (const [x, y, wh] of FLOODS) {
    const fl = 0.85 + 0.15 * L.noise1(v.gt * 3 + x * 0.1, 3);
    glowDot(c, v.wx(X(x)), v.wy(Y(y)), Math.max(4, 26 / m), wh ? [215, 228, 255] : LAMP, 0.55 * on * fl * night);
    glowDot(c, v.wx(X(x)), v.wy(Y(y)), Math.max(1.2, 3 / m), [255, 250, 240], 0.9 * on);
  }
  // the intake: a cool lit pool on the canal
  glowDot(c, v.wx(X(-174)), v.wy(Y(40)), Math.max(6, 60 / m), [140, 200, 255], 0.5 * on * night);
  glowDot(c, v.wx(X(-200)), v.wy(Y(40)), Math.max(2, 10 / m), [220, 240, 255], 0.9 * on);
  // the switchyard hums: a few blue-white points
  for (let y = -110; y < 130; y += 54) glowDot(c, v.wx(X(160)), v.wy(Y(y)), Math.max(3, 16 / m), [190, 210, 255], 0.5 * on * night);
  // red aviation lights on the stacks (slow blink)
  const blink = 0.35 + 0.65 * Math.pow(0.5 + 0.5 * Math.sin(v.gt * 3.4), 3);
  for (const s of STACKS) {
    glowDot(c, v.wx(s.x + 6), v.wy(s.y), Math.max(3, 14 / m), [255, 40, 30], 0.9 * blink * on);
    glowDot(c, v.wx(s.x + 6), v.wy(s.y), Math.max(1, 2.5 / m), [255, 200, 190], blink * on);
  }
}

const AMAX = 6.5, DT = 0.085;
function drawPlumes(c, v, st, tm, on) {
  const m = v.cam.mpp;
  // the steam disperses for good a little after the shutdown
  const gone = L.prog(v.gt - tm.s, tm.off + 0.2, 2.2);
  if (gone >= 1 || m > 40) return;
  const warm = puffSprite([255, 214, 170]), cool = puffSprite(L.mix([150, 168, 198], [235, 235, 235], st.day));
  const px = { x: -WIND.y, y: WIND.x };
  c.save();
  for (const s of STACKS) {
    const nEnd = Math.floor(v.gt / DT), nStart = Math.ceil((v.gt - AMAX) / DT);
    for (let n = nStart; n <= nEnd; n++) {
      const te = n * DT, a = v.gt - te;
      if (a < 0) continue;
      const e = emit(tm, s.i, te);
      if (e <= 0.01) continue;
      const f = a / AMAX;
      const dist = 38 * a + 15 * a * a;
      const mea = L.noise1(te * 0.6 + s.i * 3.1, 21) * (10 + 50 * a) + L.noise1(v.gt * 0.4 + s.i, 22) * 14 * a;
      const x = s.x + WIND.x * dist + px.x * mea, y = s.y + WIND.y * dist + px.y * mea;
      const r = (9 + 20 * a + 3.5 * a * a) * (0.8 + 0.4 * e);
      const al = e * Math.pow(1 - f, 1.6) * L.clamp(a / 0.2) * (1 - gone) * 0.34;
      if (al < 0.004) continue;
      const sx = v.wx(x), sy = v.wy(y), sr = Math.max(2, r / m);
      if (sx < -sr || sx > W + sr || sy < -sr || sy > H + sr) continue;
      const wk = L.clamp(1 - a / 2.2) * on;   // lit warm from below near the stacks
      c.globalAlpha = al * (1 - wk);
      c.drawImage(cool, sx - sr, sy - sr, 2 * sr, 2 * sr);
      if (wk > 0.02) {
        c.globalAlpha = al * wk;
        c.drawImage(warm, sx - sr, sy - sr, 2 * sr, 2 * sr);
      }
    }
  }
  c.restore();
}

export default {
  beat: 2,
  chapter: { num: '02', title: 'The grid', sub: 'No one at the controls' },
  captions: true,
  layer: 0,   // under s04's x-ray tint (layer 1), so the yard never pops grey in the beat-4/5 day sweep
  cues(d) {
    return [
      { t: 0.35, name: 'swish', gain: 0.16, pitch: 0.9 },
      { t: 1.55, name: 'sonar', gain: 0.14, pitch: 0.6 },
      { t: 2.9, name: 'creak', gain: 0.2, pitch: 0.7 },
      { t: 3.8, name: 'blip', gain: 0.2, pitch: 0.6 },
      { t: 3.92, name: 'impact', gain: 0.4, pitch: 0.55 },
      { t: 4.0, name: 'whoosh', gain: 0.22, pitch: 1.2 },
    ].filter((c) => c.t < d);
  },
  drawWorld(ctx, v) {
    const m = v.cam.mpp;
    if (m > 60) return;
    const R = 2600;   // lines + plumes reach this far around the plant
    const x0 = v.wx(P.x - R), x1 = v.wx(P.x + R), y0 = v.wy(P.y - R * 1.6), y1 = v.wy(P.y + R * 1.4);
    if (x1 < 0 || x0 > W || y1 < 0 || y0 > H) return;
    const st = cityState(v);
    const tm = times(v);
    const on = v.gt < tm.s ? 1 : plantOn(v, tm);
    drawYard(ctx, v, st, on);
    drawLines(ctx, v, on, tm);
    const sx0 = v.wx(P.x - 200), sx1 = v.wx(P.x + 200), sy0 = v.wy(P.y - 160), sy1 = v.wy(P.y + 160);
    if (!(sx1 < 0 || sx0 > W || sy1 < 0 || sy0 > H)) {
      drawPlant(ctx, v, st, on);
      drawLights(ctx, v, st, on);
    }
    drawPlumes(ctx, v, st, tm, on);
  },
  drawOverlay(ctx, v) {
    const tm = times(v);
    label(ctx, v, 'WITHIN HOURS', 'power plants shut down', 0.4, tm.p2 - 0.05);
  },
};
