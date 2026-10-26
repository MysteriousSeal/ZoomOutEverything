// Beat 0 — the hook. Top-down over a busy Lower Manhattan crossing at night (0.14-0.16 m/px): the avenue (x = 0)
// streams with cars, taxis and a bus, headlight cones sweeping the asphalt, red tail-light streaks; the cross street
// (y = 0) waits at its red light. On "disappeared tomorrow" every lane eases to a stop mid-lane, headlights still
// on. The stopped cars persist (beat 1 pulls back over them) and die with the blackout (env litAt).
// The plaza block (upper left) holds dark trees around a small paved circle where the bronze statue stands.
// Masked headline: WHAT IF HUMANS / DISAPPEARED? ("DISAPPEARED?" on an accent bar).
// Exports the traffic model (cars, lanes) for s01.
import * as L from '../../../../engine/runtime/lib.js';
import { GRID, PLAZA, CENTRAL_PARK } from '../camera.js';
import { worldRect, litAt, cityState, glowDot, onLand, LAMP } from '../env.js';
import { adapt } from '../legacy.js';

const { W } = L;
const hash = (a, b, s = 0) => { const n = Math.sin(a * 127.1 + b * 311.7 + s * 74.7) * 43758.5453; return n - Math.floor(n); };

// ------------------------------------------------------------------ traffic model (pure function of time)
// Manhattan avenues and cross streets are ONE-WAY: avenue i runs south (+y) when i is even (x = 0, the hook avenue,
// runs down the screen) and north when odd; street j runs east when j is even, west when odd. Four avenue lanes
// (x = i·260 + off), two street lanes (y = j·80 + off).
const AVE_OFF = [-11.25, -3.75, 3.75, 11.25];
const ST_OFF = [-4.5, 4.5];
export const aveDir = (i) => (((i % 2) + 2) % 2 === 0 ? 1 : -1);
export const stDir = (j) => (((j % 2) + 2) % 2 === 0 ? 1 : -1);
const SLOT = 16;            // avenue slot spacing (m); ~60% occupied
const CAR_COLS = [[20, 22, 26], [38, 42, 50], [142, 148, 156], [196, 197, 196], [96, 22, 28], [26, 38, 66], [62, 66, 72], [16, 18, 20], [110, 112, 118]];
const TAXI = [236, 178, 38];
// no stopped car may sit on a crosswalk or in the intersection box: |y - j·80| < KEEP_CLEAR along the avenues
const KEEP_CLEAR = GRID.stW / 2 + 4.8;
const GAP = 1.6;            // bumper gap in a stopped queue (m)

// green spaces with no roads through them (env's PARKS)
const PARKS = [CENTRAL_PARK, { x0: 4950, y0: 1850, x1: 6350, y1: 3250 },
  { x0: -245, y0: -71, x1: -15, y1: -9 }, { x0: -420, y0: 300, x1: 120, y1: 640 }];
/** Is the world point inside a park (no cars, no traffic signals)? */
export const inPark = (x, y, pad = 0) => PARKS.some((r) => x > r.x0 - pad && x < r.x1 + pad && y > r.y0 - pad && y < r.y1 + pad);

/** When the traffic stops (global seconds): "disappeared tomorrow". */
export const STOP_AT = 1.85;
/** 15b: the traffic's clock, in the ORIGINAL film's seconds: aligned to the hook line's first word (it was at 0.35 s;
 *  with the preroll the main film starts at gt = preroll length and its first line 0.15 s into beat 0). */
export const hookTime = (v, gt = v.gt) => gt - v.tl.lines[0].start + 0.35;
const LEAD_SHIFT = 0.2;   // beat 0 now starts 0.2 s closer to its first word (lead 0.35 -> beat start 0.15 before it)
function laneParams(i, li) {
  const h1 = hash(i, li, 11), h2 = hash(i, li, 12), h3 = hash(i, li, 13);
  return { v0: 10.5 + 3.5 * h1, a: STOP_AT + 0.28 * h2 + (li % 2) * 0.08, T: 1.25 + 0.45 * h3 };
}
// distance driven (m) with brake start a: constant speed, then a smooth coast to a stop (speed ∝ (1-u)²)
function travel(gt, v0, a, T) {
  const u = L.clamp((gt - a) / T);
  return v0 * (Math.min(gt, a) + (T * (1 - Math.pow(1 - u, 3))) / 3);
}
function speed(gt, v0, a, T) { const u = L.clamp((gt - a) / T); return gt < a ? v0 : v0 * (1 - u) * (1 - u); }

function carLook(a, b, s) {
  const h = hash(a, b, s), hc = hash(a, b, s + 1), hl = hash(a, b, s + 2);
  const taxi = h < 0.24;
  return { taxi, col: taxi ? TAXI : CAR_COLS[Math.floor(hc * CAR_COLS.length)], len: 4.3 + hl * 0.9, wid: 1.85 + hl * 0.15, h };
}

// One avenue lane: every car's slot, natural stop point and the queue-corrected stop point (computed over a fixed
// window of slots around the view so that results never depend on the camera). A car whose natural stop would leave
// it on a crosswalk / in the box stops at the stop line instead, and the cars behind queue up; each car simply
// brakes a little earlier (a_i = a - pushback / v0), which keeps the gaps monotone (no overlaps while braking).
const laneCache = new Map();
function laneCars(i, li, nA, nB) {
  const key = `${i}|${li}|${nA}|${nB}`;
  let out = laneCache.get(key);
  if (out) return out;
  const dir = aveDir(i), p = laneParams(i, li);
  const Dstop = p.v0 * (p.a + p.T / 3);
  const cars = [];
  for (let n = nA; n <= nB; n++) {
    if (hash(i * 7 + li, n, 3) > 0.6) continue;
    const bus = li % 2 === 0 && hash(i + li, n, 4) < 0.05 && hash(i * 7 + li, n + dir, 3) > 0.6;
    const look = carLook(i * 13 + li, n, 5);
    const len = bus ? 12 : look.len;
    const room = (bus ? 2 * SLOT : SLOT) - len - 1.8;
    const y0 = n * SLOT + hash(i, n * 3 + li, 6) * room + len / 2;      // position at gt = 0 (minus the lane drift)
    cars.push({ n, bus, look, len, y0, yN: y0 + dir * Dstop });
  }
  // downstream first
  cars.sort((A, B) => dir * (B.yN - A.yN));
  let limit = Infinity;        // the furthest the next car's front may reach (in "dir" units)
  for (const car of cars) {
    let front = dir * car.yN + car.len / 2;
    front = Math.min(front, limit);
    // crosswalk / box rule: find the street whose keep-clear zone the car would overlap
    for (let it = 0; it < 3; it++) {
      const cy = dir * (front - car.len / 2);                         // centre in world y
      const j = Math.round(cy / GRID.st);
      const zc = dir * j * GRID.st;                                   // zone centre in dir units
      const z0 = zc - KEEP_CLEAR, z1 = zc + KEEP_CLEAR;
      if (front > z0 && front - car.len < z1) front = z0 - 0.6; else break;
    }
    car.yF = dir * (front - car.len / 2);
    car.push = dir * (car.yN - car.yF);                               // >= 0
    limit = front - car.len - GAP;
  }
  out = { dir, p, cars };
  laneCache.set(key, out);
  if (laneCache.size > 400) laneCache.delete(laneCache.keys().next().value);
  return out;
}

/**
 * Every car in the world rect R at time gt: {x, y, ang, len, wid, col, taxi, bus, speed, brake}.
 * Bounded by the rect: avenue slots and street segments outside it are never touched.
 */
export function carsIn(R, gt) {
  const out = [];
  const i0 = Math.floor((R.x0 - 20) / GRID.ave), i1 = Math.ceil((R.x1 + 20) / GRID.ave);
  // avenues: slots are evaluated over fixed 40-slot windows (plus one window of margin each side) so the queue
  // solution is identical whatever the camera sees
  const WIN = 40;
  for (let i = i0; i <= i1; i++) {
    const ax = i * GRID.ave;
    if (ax < R.x0 - 20 || ax > R.x1 + 20) continue;
    AVE_OFF.forEach((off, li) => {
      const p = laneParams(i, li);
      const maxD = p.v0 * (p.a + p.T / 3) + 10;
      const w0 = Math.floor((Math.min(R.y0, R.y0 - maxD) - 40) / SLOT / WIN) - 1, w1 = Math.floor((Math.max(R.y1, R.y1 + maxD) + 40) / SLOT / WIN) + 1;
      const lane = laneCars(i, li, w0 * WIN, w1 * WIN + WIN - 1);
      const dir = lane.dir;
      for (const car of lane.cars) {
        const a = p.a - car.push / p.v0;
        const yy = car.y0 + dir * travel(gt, p.v0, a, p.T);   // = yF exactly once at rest
        if (yy < R.y0 - 14 || yy > R.y1 + 14) continue;
        const x = ax + off + (hash(car.n, li, 7) - 0.5) * 0.5;
        if (inPark(x, yy, car.len / 2)) continue;
        const spd = speed(gt, p.v0, a, p.T);
        const brake = L.clamp((gt - a + 0.15) / 0.3) * (1 - L.clamp((gt - a - p.T - 0.6) / 0.8));
        out.push({ x, y: yy, ang: dir > 0 ? Math.PI / 2 : -Math.PI / 2, len: car.len, wid: car.bus ? 2.6 : car.look.wid, col: car.look.col, taxi: !car.bus && car.look.taxi, bus: car.bus, speed: spd, brake });
      }
    });
  }
  // streets: short queues behind the stop line of each block segment (waiting at red; they never moved)
  const j0 = Math.floor((R.y0 - 10) / GRID.st), j1 = Math.ceil((R.y1 + 10) / GRID.st);
  for (let j = j0; j <= j1; j++) {
    const dir = stDir(j);
    for (let i = i0 - 1; i <= i1; i++) {
      ST_OFF.forEach((off, li) => {
        const q = Math.floor(hash(i * 3 + li, j, 8) * 4.6);
        // the stop line sits before the crosswalk over the street (4.5 m short of the avenue's kerb)
        let edge = dir > 0 ? (i + 1) * GRID.ave - GRID.aveW / 2 - 5.2 : i * GRID.ave + GRID.aveW / 2 + 5.2;
        for (let k = 0; k < q; k++) {
          const look = carLook(i * 5 + li, j * 11 + k, 9);
          const cx = edge - dir * look.len / 2;
          edge = cx - dir * (look.len / 2 + 1.4 + hash(i, j * 5 + k, 10) * 1.6);
          if (cx < R.x0 - 8 || cx > R.x1 + 8) continue;
          if (inPark(cx, j * GRID.st, look.len / 2)) continue;
          out.push({ x: cx, y: j * GRID.st + off + (hash(k, j, 2) - 0.5) * 0.4, ang: dir > 0 ? 0 : Math.PI, len: look.len, wid: look.wid, col: look.col, taxi: look.taxi, bus: false, speed: 0, brake: 0.55 });
        }
      });
    }
  }
  return out;
}

// ------------------------------------------------------------------ sprites (cached, deterministic)
let CONE = null, TRAIL = null;
function coneSprite() {
  if (CONE) return CONE;
  const s = new OffscreenCanvas(160, 80), g = s.getContext('2d');
  g.filter = 'blur(5px)';
  const gr = g.createLinearGradient(8, 0, 156, 0);
  gr.addColorStop(0, 'rgba(255,240,210,0.95)'); gr.addColorStop(0.35, 'rgba(255,232,190,0.45)'); gr.addColorStop(1, 'rgba(255,225,180,0)');
  g.fillStyle = gr;
  g.beginPath(); g.moveTo(8, 32); g.lineTo(152, 6); g.lineTo(152, 74); g.lineTo(8, 48); g.closePath(); g.fill();
  CONE = s;
  return s;
}
function trailSprite() {
  if (TRAIL) return TRAIL;
  const s = new OffscreenCanvas(128, 16), g = s.getContext('2d');
  g.filter = 'blur(2px)';
  const gr = g.createLinearGradient(124, 0, 4, 0);
  gr.addColorStop(0, 'rgba(255,60,40,0.95)'); gr.addColorStop(0.3, 'rgba(255,40,30,0.4)'); gr.addColorStop(1, 'rgba(255,30,30,0)');
  g.fillStyle = gr; g.fillRect(4, 5, 120, 6);
  TRAIL = s;
  return s;
}

// ------------------------------------------------------------------ drawing
const RED = [255, 46, 36], HEAD = [255, 236, 200];

/** Car lights (additive): headlight cones on the asphalt, head + tail glows, tail streaks while moving. */
function carLights(c, v, car, lk, k) {
  const m = v.cam.mpp, sx = v.wx(car.x), sy = v.wy(car.y);
  const ca = Math.cos(car.ang), sa = Math.sin(car.ang);
  const fwd = (d, s) => [sx + (ca * d - sa * s) / m, sy + (sa * d + ca * s) / m];
  const a = lk * k;
  if (a <= 0.01) return;
  // cone: a short throw (~1.5 car lengths) anchored at the car's nose
  if (m > 1.1) {
    for (const s of [-1, 1]) {
      const [hx, hy] = fwd(car.len / 2, s * car.wid * 0.34);
      glowDot(c, hx, hy, 2.2, HEAD, 0.75 * a);
      const [tx, ty] = fwd(-car.len / 2, s * car.wid * 0.36);
      glowDot(c, tx, ty, 1.8, RED, 0.6 * a);
    }
    return;
  }
  c.save();
  c.globalCompositeOperation = 'lighter';
  c.globalAlpha = (car.bus ? 0.22 : 0.3) * a * (m < 0.5 ? 1 : 0.45);
  c.translate(sx, sy); c.rotate(car.ang); c.scale(1 / m, 1 / m);
  c.drawImage(coneSprite(), car.len / 2 - 0.4, -2.6, 8, 5.2);
  // tail streak while moving (length ~ 0.22 s of travel)
  const tl = car.speed * 0.22;
  if (tl > 0.4) {
    c.globalAlpha = 0.7 * a;
    for (const s of [-1, 1]) c.drawImage(trailSprite(), -car.len / 2 - tl, s * car.wid * 0.36 - 0.45, tl, 0.9);
  }
  c.restore();
  const rH = Math.max(2.2, 1.6 / m), rT = Math.max(1.8, 1.3 / m);
  for (const s of [-1, 1]) {
    const [hx, hy] = fwd(car.len / 2 - 0.15, s * car.wid * 0.34);
    glowDot(c, hx, hy, rH, HEAD, 0.75 * a);
    const [tx, ty] = fwd(-car.len / 2 + 0.1, s * car.wid * 0.36);
    glowDot(c, tx, ty, rT * (1 + 0.5 * car.brake), RED, (0.55 + 0.4 * car.brake) * a);
  }
}

/** Refined top-down body (close zoom) or a simple lit rectangle (mid zoom). */
function carBody(c, v, car, lk, detail, k) {
  const m = v.cam.mpp;
  c.save();
  c.globalAlpha = k;
  c.translate(v.wx(car.x), v.wy(car.y)); c.rotate(car.ang); c.scale(1 / m, 1 / m);
  const l = car.len, w = car.wid, x0 = -l / 2, y0 = -w / 2;
  if (!detail) {
    c.fillStyle = L.rgba(L.mix(car.col, [30, 32, 40], 0.25));
    c.fillRect(x0, y0, l, w);
    c.restore();
    return;
  }
  // soft contact shadow (toward the lower left of the screen, whatever the heading)
  c.save();
  c.rotate(-car.ang); c.translate(-0.45, 0.55); c.rotate(car.ang);
  c.fillStyle = 'rgba(0,0,0,0.5)';
  L.roundRect(c, x0 - 0.15, y0 - 0.15, l + 0.3, w + 0.3, 0.8); c.fill();
  c.restore();
  const col = car.col;
  if (car.bus) {
    c.fillStyle = L.rgba(L.mix([200, 205, 212], col, 0.15));
    L.roundRect(c, x0, y0, l, w, 0.35); c.fill();
    c.fillStyle = 'rgba(30,60,120,0.85)';
    c.fillRect(x0, y0 + 0.1, l, 0.32); c.fillRect(x0, -y0 - 0.42, l, 0.32);
    c.fillStyle = 'rgba(150,155,165,0.9)';                       // roof AC units
    c.fillRect(x0 + 2.2, -0.7, 2.4, 1.4); c.fillRect(x0 + 6.4, -0.55, 1.6, 1.1);
    c.fillStyle = 'rgba(12,16,24,0.95)';
    c.fillRect(l / 2 - 0.55, y0 + 0.2, 0.42, w - 0.4);              // windscreen
  } else {
    // body with a subtle front-to-back sheen
    const g = c.createLinearGradient(x0, y0, x0, -y0);
    g.addColorStop(0, L.rgba(L.mix(col, [255, 240, 220], 0.16)));
    g.addColorStop(0.5, L.rgba(col));
    g.addColorStop(1, L.rgba(L.mix(col, [0, 0, 0], 0.35)));
    c.fillStyle = g;
    L.roundRect(c, x0, y0, l, w, 0.75); c.fill();
    // glass: windscreen (front), rear window, and the roof between them
    const glass = 'rgba(8,12,20,0.92)';
    c.fillStyle = glass;
    c.beginPath(); c.moveTo(l / 2 - 1.15, y0 + 0.2); c.lineTo(l / 2 - 1.75, y0 + 0.28); c.lineTo(l / 2 - 1.75, -y0 - 0.28); c.lineTo(l / 2 - 1.15, -y0 - 0.2); c.closePath(); c.fill();
    c.beginPath(); c.moveTo(x0 + 0.55, y0 + 0.25); c.lineTo(x0 + 1.05, y0 + 0.3); c.lineTo(x0 + 1.05, -y0 - 0.3); c.lineTo(x0 + 0.55, -y0 - 0.25); c.closePath(); c.fill();
    c.fillStyle = L.rgba(L.mix(col, [255, 255, 255], 0.1));
    L.roundRect(c, x0 + 1.05, y0 + 0.3, l - 2.8, w - 0.6, 0.3); c.fill();
    // side windows as thin dark slits
    c.fillStyle = 'rgba(8,12,20,0.6)';
    c.fillRect(x0 + 1.1, y0 + 0.12, l - 2.9, 0.16); c.fillRect(x0 + 1.1, -y0 - 0.28, l - 2.9, 0.16);
    if (car.taxi) {   // roof sign
      c.fillStyle = `rgba(255,236,180,${0.4 + 0.55 * lk})`;
      c.fillRect(-0.45, -0.38, 0.5, 0.76);
    }
    // lamp clusters
    c.fillStyle = `rgba(255,246,225,${0.35 + 0.65 * lk})`;
    c.fillRect(l / 2 - 0.22, y0 + 0.2, 0.2, 0.5); c.fillRect(l / 2 - 0.22, -y0 - 0.7, 0.2, 0.5);
    c.fillStyle = `rgba(255,50,40,${0.35 + 0.65 * lk})`;
    c.fillRect(x0 + 0.02, y0 + 0.18, 0.18, 0.45); c.fillRect(x0 + 0.02, -y0 - 0.63, 0.18, 0.45);
  }
  c.restore();
}

/** All cars in view (LOD by mpp; gone beyond ~3 m/px). */
export function drawTraffic(c, v) {
  const m = v.cam.mpp;
  const k = 1 - L.clamp(L.invLerp(1.2, 2.0, m));
  if (k <= 0) return;
  const st = cityState(v);
  const R = worldRect(v, 30);
  const cars = carsIn(R, hookTime(v));   // 15b: hook-relative (the film now starts after the preroll)
  const detail = m < 0.5;
  const lits = cars.map((car) => (onLand(car.x, car.y) ? litAt(v, car.x, car.y, st) : -1));
  for (let n = 0; n < cars.length; n++) if (lits[n] >= 0) carBody(c, v, cars[n], lits[n], detail, k);
  for (let n = 0; n < cars.length; n++) if (lits[n] > 0) carLights(c, v, cars[n], lits[n], k * (1 - st.day));
}

// ------------------------------------------------------------------ the plaza: trees around the statue's paved circle
const PB = { x0: -245, y0: -71, x1: -15, y1: -9 };
const TREES = (() => {
  const r = L.rng(1501), out = [];
  for (let x = PB.x0 + 6; x < PB.x1 - 4; x += 8.5) {
    for (let y = PB.y0 + 5; y < PB.y1 - 3; y += 8.5) {
      const tx = x + (r() - 0.5) * 4, ty = y + (r() - 0.5) * 4;
      if (Math.hypot(tx - PLAZA.x, (ty - PLAZA.y) * 1.2) < 17) continue;   // the paved circle
      if (Math.abs(ty - PLAZA.y) < 2.6 && r() < 0.8) continue;              // an east-west path
      out.push([tx, ty, 3.4 + r() * 2.2, r() * 6.3, r()]);
    }
  }
  return out;
})();
function drawPlaza(c, v) {
  const m = v.cam.mpp;
  const k = 1 - L.clamp(L.invLerp(1.4, 2.6, m));
  if (k <= 0) return;
  const R = worldRect(v, 40);
  if (PB.x1 < R.x0 || PB.x0 > R.x1 || PB.y1 < R.y0 || PB.y0 > R.y1) return;
  const st = cityState(v);
  const lk = litAt(v, PLAZA.x, PLAZA.y, st) * (1 - st.day);
  c.save();
  c.globalAlpha = k;
  // paths + the paved circle (pale stone, warm under the lamps)
  const stone = L.mix([44, 44, 48], [58, 52, 44], lk);
  c.fillStyle = L.rgba(stone);
  c.fillRect(v.wx(PB.x0 + 2), v.wy(PLAZA.y - 1.6), v.ws(PB.x1 - PB.x0 - 4), v.ws(3.2));
  c.beginPath(); c.ellipse(v.wx(PLAZA.x), v.wy(PLAZA.y), Math.max(0, v.ws(13)), Math.max(0, v.ws(11)), 0, 0, Math.PI * 2); c.fill();
  c.strokeStyle = L.rgba(L.mix(stone, [90, 84, 74], 0.6), 0.8);
  c.lineWidth = Math.max(0.5, v.ws(0.4));
  c.beginPath(); c.ellipse(v.wx(PLAZA.x), v.wy(PLAZA.y), Math.max(0, v.ws(9)), Math.max(0, v.ws(7.5)), 0, 0, Math.PI * 2); c.stroke();
  // plinth + the statue's dark top-down silhouette (the loupe in beat 9 shows it close)
  c.fillStyle = 'rgba(0,0,0,0.45)';
  c.fillRect(v.wx(PLAZA.x - 2.6), v.wy(PLAZA.y - 1.2), v.ws(3.2), v.ws(3.2));
  c.fillStyle = L.rgba([78, 76, 72]);
  c.fillRect(v.wx(PLAZA.x - 1.6), v.wy(PLAZA.y - 1.6), v.ws(3.2), v.ws(3.2));
  c.fillStyle = L.rgba([30, 44, 40]);
  c.beginPath(); c.ellipse(v.wx(PLAZA.x), v.wy(PLAZA.y), Math.max(0, v.ws(0.9)), Math.max(0, v.ws(0.6)), 0.3, 0, Math.PI * 2); c.fill();
  // crowns: shadow, body, then a lamp-lit rim on the street side and a cool moon edge
  const dark = L.mix([12, 22, 18], [40, 64, 40], st.day), hi = L.mix([26, 40, 30], [70, 100, 60], st.day);
  for (const [x, y, r0, ph, tone] of TREES) {
    const sw = 0.25 * L.noise1(v.gt * 0.5 + ph, 9);
    const sx = v.wx(x + sw), sy = v.wy(y), r = v.ws(r0);
    if (sx < -r - 20 || sx > W + r + 20 || sy < -r - 20 || sy > L.H + r + 20) continue;
    c.fillStyle = 'rgba(0,0,0,0.38)';
    c.beginPath(); c.arc(sx - r * 0.35, sy + r * 0.35, Math.max(0, r), 0, Math.PI * 2); c.fill();
    c.fillStyle = L.rgba(L.mix(dark, hi, tone * 0.4));
    c.beginPath(); c.arc(sx, sy, Math.max(0, r), 0, Math.PI * 2); c.fill();
    c.fillStyle = L.rgba(hi, 0.55);
    c.beginPath(); c.arc(sx + r * 0.22, sy - r * 0.22, Math.max(0, r * 0.62), 0, Math.PI * 2); c.fill();
    const toStreet = y > (PB.y0 + PB.y1) / 2 ? 1 : -1;
    const near = 1 - L.clamp(Math.min(y - PB.y0, PB.y1 - y) / 20);
    if (lk * near > 0.02) {
      c.fillStyle = L.rgba(LAMP, 0.22 * lk * near);
      c.beginPath(); c.arc(sx, sy + toStreet * r * 0.3, Math.max(0, r * 0.75), 0, Math.PI * 2); c.fill();
    }
  }
  c.restore();
}

// ------------------------------------------------------------------ manhole steam (secondary motion at street level)
const MANHOLES = [[-4.5, 38, 0], [7, 96, 1], [-62, 2.5, 2], [6.5, -112, 3]];
let STEAM = null;
function steamSprite() {
  if (STEAM) return STEAM;
  const s = new OffscreenCanvas(64, 64), g = s.getContext('2d');
  const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  gr.addColorStop(0, 'rgba(215,219,228,0.42)'); gr.addColorStop(0.55, 'rgba(210,215,225,0.26)'); gr.addColorStop(1, 'rgba(205,210,220,0)');   // flat, billowy (no hot core)
  g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
  STEAM = s;
  return s;
}
function drawSteam(c, v) {
  const m = v.cam.mpp;
  const k = 1 - L.clamp(L.invLerp(0.5, 1.1, m));
  if (k <= 0) return;
  const st = cityState(v), spr = steamSprite();
  const DT = 0.1, AM = 3.6;
  c.save();
  for (const [mx, my, id] of MANHOLES) {
    const sx0 = v.wx(mx), sy0 = v.wy(my);
    if (sx0 < -200 || sx0 > W + 200 || sy0 < -200 || sy0 > L.H + 200) continue;
    // the cover
    c.globalAlpha = k;
    c.fillStyle = 'rgba(8,9,12,0.9)';
    c.beginPath(); c.arc(sx0, sy0, Math.max(0, v.ws(0.42)), 0, Math.PI * 2); c.fill();
    c.strokeStyle = 'rgba(90,92,98,0.6)'; c.lineWidth = Math.max(0.5, v.ws(0.08));
    c.stroke();
    for (let n = Math.ceil((v.gt - AM) / DT); n <= Math.floor(v.gt / DT); n++) {
      const a = v.gt - n * DT;
      if (a < 0) continue;
      const f = a / AM;
      const dist = 1.1 * a + 0.35 * a * a;
      const side = L.noise1(n * 0.37 + id * 5, 61) * (1.0 + 2.2 * a), side2 = L.noise1(n * 0.29 + id * 3, 62) * (0.6 + 1.6 * a);
      const x = mx - 0.55 * dist + 0.8 * side + 0.5 * side2, y = my - 0.84 * dist + 0.5 * side - 0.6 * side2;
      const r = 1.3 + 1.2 * a + 0.2 * a * a;
      // fades IN as it rises (the vent itself stays dim): a soft drifting cloud, never a bright-tipped beam
      c.globalAlpha = k * 0.13 * Math.pow(1 - f, 1.3) * L.smoothstep(L.clamp(a / 0.9)) * (0.7 + 0.3 * litAt(v, mx, my, st));
      const pr = r / m;
      c.drawImage(spr, v.wx(x) - pr, v.wy(y) - pr, 2 * pr, 2 * pr);
    }
  }
  c.restore();
}

// ------------------------------------------------------------------ headline
function headline(ctx, v) {
  const t = v.t, d = v.d;
  const lines = [
    { parts: [['WHAT IF HUMANS', false]], y: 520, size: 132, t0: 0.18 },
    { parts: [['DISAPPEARED?', true]], y: 690, size: 150, t0: 0.46 },
  ];
  // a soft dark scrim behind the headline (no band edge): the white line reads cleanly over the trees and traffic
  const sk = L.enter(t, 0.0, 0.5) * (1 - L.enter(t, d - 0.45, 0.35, L.ease.inCubic));
  if (sk > 0) {
    ctx.save();
    ctx.translate(W / 2, 560); ctx.scale(1, 0.42);
    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, 640);
    g.addColorStop(0, `rgba(4,6,10,${0.58 * sk})`); g.addColorStop(0.55, `rgba(4,6,10,${0.4 * sk})`); g.addColorStop(1, 'rgba(4,6,10,0)');
    ctx.fillStyle = g;
    ctx.fillRect(-W, -660, 2 * W, 1320);
    ctx.restore();
  }
  // a thin accent rule draws in above the headline
  const rk = L.enter(t, 0.05, 0.6, L.ease.outExpo) * (1 - L.enter(t, d - 0.5, 0.26, L.ease.inCubic));
  if (rk > 0) {
    ctx.fillStyle = L.rgba(v.accent, 0.95);
    ctx.fillRect(W / 2 - 60 * rk, 372, 120 * rk, 5);
  }
  // v15fx: the exit is timed on the OUTPUT frame (not the motion-blur sub-frame): the accent bar slides up ~250 px in
  // 0.28 s, and its sub-frames summed into a translucent orange strip with no text (~6.7 s)
  const tq = t + Math.round(v.gt * 30) / 30 - v.gt;
  lines.forEach((ln, i) => {
    const kin = L.enter(t, ln.t0, 0.65, L.ease.outExpo);
    const kout = L.enter(tq, d - 0.5 + i * 0.06, 0.28, L.ease.inCubic);
    if (kin <= 0 || kout >= 1) return;
    ctx.save();
    const size = L.fitSize(ctx, ln.parts.map((p) => p[0]).join(''), ln.parts.some((p) => p[1]) ? 860 : 920, ln.size, 800, L.FONT.display);
    ctx.font = L.font(size, 800, L.FONT.display);
    ctx.letterSpacing = '-1px';
    const widths = ln.parts.map(([s]) => ctx.measureText(s).width);
    ctx.letterSpacing = '0px';
    const total = widths.reduce((a, b) => a + b, 0);
    let x = W / 2 - total / 2;
    const top = ln.y - size * 0.8, bot = ln.y + size * 0.1;
    const dy = (1 - kin) * size * 1.05 - kout * size * 1.1;
    const by = -kout * (size * 0.9 + 80);
    ln.parts.forEach(([s, acc], j) => {
      const w = widths[j];
      ctx.save();
      if (acc) {
        const bk = L.enter(t, ln.t0 + 0.1, 0.55, L.ease.outExpo);
        const bx0 = x - 28, bw = w + 50;
        const bL = bx0, bR = bx0 + bw * bk;
        ctx.beginPath(); ctx.rect(bx0 - 60, top - 20, bw + 120, bot - top + 40); ctx.clip();
        // v15fx: no alpha fade any more (15b faded the bar as it left, against motion-blur strips, which left a
        // half-transparent orange plate with ghost text for a frame or two): the exit is now on output-frame time
        // (tq above), so the bar simply slides out of its mask fully opaque, like a clean wipe
        ctx.translate(0, by);
        if (bR > bL) {
          ctx.shadowColor = 'rgba(0,0,0,0.55)'; ctx.shadowBlur = 36; ctx.shadowOffsetY = 10;
          ctx.fillStyle = L.rgba(v.accent);
          ctx.fillRect(bL, top - 20, bR - bL, bot - top + 40);
          ctx.shadowColor = 'transparent';
          const sw = L.prog(t, ln.t0 + 0.8, 0.9);
          if (sw > 0 && sw < 1) {
            const gx = L.lerp(bL - 120, bR + 120, L.ease.inOutCubic(sw));
            const g = ctx.createLinearGradient(gx - 90, 0, gx + 90, 0);
            g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(0.5, 'rgba(255,255,255,0.4)'); g.addColorStop(1, 'rgba(255,255,255,0)');
            ctx.fillStyle = g;
            ctx.fillRect(bL, top - 20, bR - bL, bot - top + 40);
          }
        }
        ctx.beginPath(); ctx.rect(Math.max(0, bL), top - 20, Math.max(0, bR - bL), bot - top + 40); ctx.clip();
        ctx.fillStyle = L.rgba([16, 12, 8]);
      } else {
        ctx.beginPath(); ctx.rect(0, top - 14, W, bot - top + 30); ctx.clip();
        ctx.shadowColor = 'rgba(0,0,0,0.85)'; ctx.shadowBlur = 26; ctx.shadowOffsetY = 4;
        ctx.fillStyle = L.rgba([246, 242, 234]);
      }
      ctx.textBaseline = 'alphabetic';
      L.trackedText(ctx, s, x, ln.y + (acc ? (1 - kin) * size * 1.05 : dy), -1, 'left');
      ctx.restore();
      x += w;
    });
    ctx.restore();
  });
}

export const SCENE = {
  beat: 0,
  chapter: null,
  captions: false,
  layer: 1,
  cues(d) {
    return [
      { t: 0.06, name: 'swell', gain: 0.24, pitch: 0.9 },
      { t: 0.2, name: 'swish', gain: 0.26, pitch: 1.0 },
      { t: 0.5, name: 'blip', gain: 0.22, pitch: 1.1 },
      { t: 1.3, name: 'shimmer', gain: 0.12, pitch: 1.2 },
      { t: STOP_AT - LEAD_SHIFT + 0.05, name: 'deep', gain: 0.34, pitch: 0.75 },
      { t: d - 0.45, name: 'riser', gain: 0.2, pitch: 0.9 },
    ];
  },
  drawWorld(ctx, v) {
    drawPlaza(ctx, v);
    drawTraffic(ctx, v);
    drawSteam(ctx, v);
  },
  drawOverlay(ctx, v) {
    headline(ctx, v);
  },
};
// 15c: 15b beat 0 plays as a 15c beat on the legacy timeline (legacy.js)
export default adapt(SCENE, 0);
