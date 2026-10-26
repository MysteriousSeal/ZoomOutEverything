// Beat 10 — "One satellite's delay puts you somewhere on a giant sphere."
// TRILATERATION (beats 10-13, group 20C) is ONE system drawn here, in world space, every frame of beats 10-13 and
// the first half second of 14 (exit). s11-s13 add their labels, chapter cards and cues on top of it.
//
//   beat 10  B's signal sphere grows out of B (radius 0 → 20,437 km) and lands exactly on the phone: you are
//            somewhere on it. A counter turns the delay into the distance.
//   beat 11  A's sphere lands too; the two meet in a RING through the phone (drawn as the tilted ring whose ends are
//            the two rim crossings: the phone and its mirror point across the A–B line).
//   beat 12  C cuts the ring at TWO POINTS: the phone, and one far out in space (struck out).
//   beat 13  the phone's quartz clock is off: every sphere is inflated by the same error and they MISS (a warm
//            fuzzy triangle). D lands, the common error is solved away and all four snap onto one point (lock).
//
// The honest part: every sphere is centred on its hero satellite with radius HERO[i].range, so in the picture plane
// its rim passes exactly through the phone at (0, 0). The ring's tilt is schematic (centres in one plane are a
// degenerate case in real life); its two ends are exact.
//
// SHARED (s11-s13): drawSignalSphere(ctx, v, i, k, opts) · TRI (timings) · bt(v, beat) · ringPoint(φ) · Q_WORLD ·
// missAt(v) · lockT(v).
import * as L from '../../../../engine/runtime/lib.js';
import { ACCENT, DOT, HERO, R_EARTH, SAT_INK, beatStart } from '../env.js';
import { drawPhoneDot } from './s06-only-listens.js';

const { W, H } = L;
export const WARN = [255, 150, 96];
const HOT = [215, 255, 222];

// ====================================================================== timings (seconds into each beat)
// Fixed against the VO word timing (see wordT in s04), mirrored by the scenes' cues(d).
export const TRI = {
  // per hero A, B, C, D: the beat its sphere arrives in, marker on, growth start → landing on the phone
  grow: [
    { beat: 11, mark: 0.15, t0: 0.45, t1: 1.95 },   // A: "A second satellite"
    { beat: 10, mark: 1.2, t0: 1.55, t1: 3.3 },     // B: born as the camera lands (≈44.3), lands on "sphere"
    { beat: 12, mark: 0.12, t0: 0.32, t1: 1.42 },   // C: lands on "two points"
    { beat: 13, mark: 0.12, t0: 0.32, t1: 1.38 },   // D: "A fourth"
  ],
  ring: { beat: 11, t0: 2.1, dur: 1.15 },           // "meet in a circle"
  strike: { beat: 12, t0: 3.6 },                    // "far out in space"
  miss: { beat: 13, t0: 0.6, dur: 0.5 },            // the common clock error inflates every sphere (camera settled)
  solve: { beat: 13, t0: 1.9, dur: 0.5 },           // "…your phone's own clock": the error is solved away (≈0.8 s stable miss)
};
export const ERR = 4e6;                             // the drawn clock error (m): schematic, ~150 px patch at this scale
export const lockT = (v) => bt(v, 13) - (TRI.solve.t0 + TRI.solve.dur);

/** Seconds since beat b started (negative before). */
export const bt = (v, b) => v.gt - beatStart(v.tl, b);
/** The whole system's presence: on from beat 10, fast exit at the start of beat 14. */
function sysK(v) {
  const b10 = bt(v, 10);
  if (b10 < 0) return 0;
  return 1 - L.ease.inCubic(L.prog(bt(v, 14), 0.0, 0.55));
}
/** Growth of hero i's sphere, 0..1 (signals travel at constant speed; a soft landing). */
function growK(v, i) {
  const g = TRI.grow[i];
  const p = L.prog(bt(v, g.beat), g.t0, g.t1 - g.t0);
  return p <= 0 ? 0 : p >= 1 ? 1 : 1 - Math.pow(1 - p, 1.7);
}
/** 1 while hero i's sphere is the newest, steps back when the next one starts growing. */
function leadK(v, i) {
  const order = [1, 0, 2, 3];
  const n = order.indexOf(i);
  if (n === 3) return 1;
  const nx = TRI.grow[order[n + 1]];
  return 1 - 0.68 * L.ease.inOutCubic(L.prog(bt(v, nx.beat), nx.t0 - 0.25, 0.7));
}
/** The common clock error now (m): inflated in beat 13, then solved away. */
export function missAt(v) {
  const t = bt(v, 13);
  return ERR * (L.ease.inOutCubic(L.prog(t, TRI.miss.t0, TRI.miss.dur)) - L.ease.inOutCubic(L.prog(t, TRI.solve.t0, TRI.solve.dur)));
}

// ====================================================================== geometry (world metres)
const P = { x: 0, y: 0 };                           // the phone, on the limb
const [HA, HB, HC] = HERO;
const AB = (() => { const dx = HB.x - HA.x, dy = HB.y - HA.y, l = Math.hypot(dx, dy); return { x: dx / l, y: dy / l }; })();
/** The ring A ∩ B: centre F (foot of the phone on the A–B line), major half-axis F→phone, minor along A–B (tilt). */
const F = (() => { const t = -(HA.x * AB.x + HA.y * AB.y); return { x: HA.x + AB.x * t, y: HA.y + AB.y * t }; })();
const RING_A = { x: P.x - F.x, y: P.y - F.y };
const RING_TILT = -0.36;                            // minor/major ratio; − = the near side bulges toward A
const RING_B = { x: AB.x * Math.hypot(RING_A.x, RING_A.y) * RING_TILT, y: AB.y * Math.hypot(RING_A.x, RING_A.y) * RING_TILT };
/** World point of the ring at angle φ (φ = 0 is the phone, φ = π its mirror across the A–B line). */
export const ringPoint = (f) => ({ x: F.x + RING_A.x * Math.cos(f) + RING_B.x * Math.sin(f), y: F.y + RING_A.y * Math.cos(f) + RING_B.y * Math.sin(f) });
/** Q: where C's sphere crosses the ring away from the phone (the second point, far out in space). */
export const Q_WORLD = (() => {
  const g = (f) => { const p = ringPoint(f); return Math.hypot(p.x - HC.x, p.y - HC.y) - HC.range; };
  let best = null;
  for (let j = 1; j < 720; j++) {
    const f0 = 0.25 + (j - 1) / 720 * (2 * Math.PI - 0.5), f1 = 0.25 + j / 720 * (2 * Math.PI - 0.5);
    if (Math.sign(g(f0)) !== Math.sign(g(f1))) {
      let a = f0, b = f1;
      for (let k = 0; k < 40; k++) { const m = (a + b) / 2; if (Math.sign(g(m)) === Math.sign(g(a))) a = m; else b = m; }
      const p = ringPoint((a + b) / 2);
      const alt = Math.hypot(p.x, p.y - R_EARTH) - R_EARTH;
      if (!best || alt > best.alt) best = { ...p, f: (a + b) / 2, alt };
    }
  }
  return best;
})();

/** Circle–circle intersection nearest the phone (world), or null. */
function meet(c1, r1, c2, r2) {
  const dx = c2.x - c1.x, dy = c2.y - c1.y, d = Math.hypot(dx, dy);
  if (d < 1 || d > r1 + r2 || d < Math.abs(r1 - r2)) return null;
  const a = (r1 * r1 - r2 * r2 + d * d) / (2 * d), h = Math.sqrt(Math.max(0, r1 * r1 - a * a));
  const mx = c1.x + dx * a / d, my = c1.y + dy * a / d;
  const p1 = { x: mx + h * dy / d, y: my - h * dx / d }, p2 = { x: mx - h * dy / d, y: my + h * dx / d };
  return Math.hypot(p1.x, p1.y) < Math.hypot(p2.x, p2.y) ? p1 : p2;
}

// ====================================================================== the signal sphere
/**
 * One hero's signal sphere, drawn as a lit glass bubble in world space: soft fresnel fill, a crisp rim, a faint
 * equator + a slowly turning meridian for volume, a specular glint.
 *   i: hero 0-3 (A-D) · k: overall alpha 0..1
 *   opts: { r (m, default HERO[i].range), lead (0..1: 1 = the focal sphere), front (0..1: growth wavefront heat),
 *           warm (0..1: tint toward the miss colour), flash (0..1) }
 */
export function drawSignalSphere(ctx, v, i, k, opts = {}) {
  if (k <= 0.002) return;
  const h = HERO[i];
  const r = opts.r ?? h.range;
  const lead = opts.lead ?? 1, front = opts.front ?? 0, warm = opts.warm ?? 0, flash = opts.flash ?? 0;
  const cx = v.wx(h.x), cy = v.wy(h.y), R = v.ws(r);
  if (R < 0.5 || R > 9000) return;                           // LOD: invisible, or the camera is far too close
  if (cx + R < -50 || cx - R > W + 50 || cy + R < -50 || cy - R > H + 50) return;
  const col = L.mix(ACCENT, WARM, warm * 0.25);          // the shell stays green-ish, the rim carries the warning
  const rimCol = L.mix(ACCENT, WARM, warm * 0.85);
  const lf = (0.3 + 0.7 * lead) * (opts.fillK ?? 1);
  const part = opts.part ?? 'all';
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  if (part !== 'rim') {
  // body: almost clear in the middle, denser toward the rim (seen edge-on, a shell holds more light)
  const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, R);
  g.addColorStop(0, L.rgba(col, 0.012 * k * lf));
  g.addColorStop(0.62, L.rgba(col, 0.03 * k * lf));
  g.addColorStop(0.9, L.rgba(col, 0.075 * k * lf));
  g.addColorStop(0.985, L.rgba(col, 0.15 * k * lf));
  g.addColorStop(1, L.rgba(col, 0));
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.arc(cx, cy, Math.max(0, R), 0, Math.PI * 2); ctx.fill();
  // specular: a soft highlight up-left (the Sun is up-left of the scene)
  if (R > 30) {
    const hx = cx - R * 0.42, hy = cy - R * 0.46;
    const s = ctx.createRadialGradient(hx, hy, 0, hx, hy, R * 0.55);
    s.addColorStop(0, L.rgba(HOT, 0.05 * k * lead));
    s.addColorStop(1, L.rgba(HOT, 0));
    ctx.fillStyle = s;
    ctx.beginPath(); ctx.arc(cx, cy, Math.max(0, R * 0.98), 0, Math.PI * 2); ctx.fill();
  }
  // equator + meridian: oriented on the satellite's nadir (its axis points at the Earth's centre)
  const eqK = k * lead * (1 - front) * L.clamp((R - 40) / 80);
  if (eqK > 0.01) {
    const rot = Math.atan2(h.x, R_EARTH - h.y);
    ctx.translate(cx, cy);
    ctx.rotate(rot);
    ctx.lineWidth = 1.4;
    // equator: front half solid, back half dashed
    ctx.strokeStyle = L.rgba(col, 0.32 * eqK);
    ctx.beginPath(); ctx.ellipse(0, 0, R, R * 0.2, 0, 0, Math.PI); ctx.stroke();
    ctx.setLineDash([5, 9]);
    ctx.strokeStyle = L.rgba(col, 0.16 * eqK);
    ctx.beginPath(); ctx.ellipse(0, 0, R, R * 0.2, 0, Math.PI, Math.PI * 2); ctx.stroke();
    ctx.setLineDash([]);
    // a meridian that turns slowly (secondary motion)
    const ph = v.gt * 0.35 + i * 1.3;
    const mr = Math.abs(Math.cos(ph)) * R;
    ctx.strokeStyle = L.rgba(col, 0.13 * eqK);
    ctx.beginPath(); ctx.ellipse(0, 0, Math.max(0, mr), R, 0, 0, Math.PI * 2); ctx.stroke();
    ctx.rotate(-rot);
    ctx.translate(-cx, -cy);
  }
  }
  if (part === 'fill') { ctx.restore(); return; }
  // the rim: a soft glow + a crisp line; hotter while it is still a travelling wavefront
  const rimA = k * (0.32 + 0.6 * lead + 0.4 * flash);
  ctx.strokeStyle = L.rgba(rimCol, 0.14 * rimA * (1 + front));
  ctx.lineWidth = 9 + 10 * front;
  ctx.beginPath(); ctx.arc(cx, cy, Math.max(0, R), 0, Math.PI * 2); ctx.stroke();
  ctx.strokeStyle = L.rgba(L.mix(rimCol, HOT, 0.5 * front + 0.5 * flash), Math.min(1, rimA));
  ctx.lineWidth = 2 + 1.2 * front;
  ctx.beginPath(); ctx.arc(cx, cy, Math.max(0, R), 0, Math.PI * 2); ctx.stroke();
  // wake echoes behind a travelling front
  if (front > 0.01) {
    for (const [f, a] of [[0.93, 0.35], [0.86, 0.18]]) {
      ctx.strokeStyle = L.rgba(col, a * front * k);
      ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(cx, cy, Math.max(0, R * f), 0, Math.PI * 2); ctx.stroke();
    }
  }
  ctx.restore();
}

// ====================================================================== the system
let layerBuf = null;
/** A scratch layer the size of the target canvas (the spheres are composited from it). */
function sphereLayer(ctx) {
  const w = ctx.canvas.width, h = ctx.canvas.height;
  if (!layerBuf || layerBuf.cv.width !== w || layerBuf.cv.height !== h) {
    const cv = new OffscreenCanvas(w, h);
    layerBuf = { cv, c: cv.getContext('2d') };
  }
  return layerBuf;
}
const WARM = WARN;
const ORDER = [1, 0, 2, 3];                         // draw order = arrival order (newest on top)

/** A small marker + letter on a hero satellite. */
function heroMarker(ctx, v, i, k, on, charge) {
  if (k <= 0.01) return;
  const h = HERO[i];
  const x = v.wx(h.x), y = v.wy(h.y);
  if (x < -60 || x > W + 60 || y < -60 || y > H + 60) return;
  ctx.save();
  const col = L.mix(SAT_INK, ACCENT, on);
  if (charge > 0) {
    L.lightBlob(ctx, x, y, 70, ACCENT, 0.55 * charge * k);
    ctx.strokeStyle = L.rgba(ACCENT, 0.7 * charge * k); ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(x, y, Math.max(0, 10 + 40 * (1 - charge)), 0, Math.PI * 2); ctx.stroke();
  }
  ctx.strokeStyle = L.rgba(col, (0.35 + 0.5 * on) * k);
  ctx.lineWidth = 1.8;
  ctx.beginPath(); ctx.arc(x, y, 15, 0, Math.PI * 2); ctx.stroke();
  ctx.font = L.font(26, 700, L.FONT.body);
  ctx.fillStyle = L.rgba(col, (0.5 + 0.5 * on) * k);
  ctx.shadowColor = 'rgba(0,0,0,0.7)'; ctx.shadowBlur = 8;
  ctx.textBaseline = 'alphabetic';
  // the letter sits on the side away from the phone
  const ang = Math.atan2(y - v.wy(0), x - v.wx(0));
  L.trackedText(ctx, h.name, L.clamp(x + Math.cos(ang) * 34, 22, W - 22), y + Math.sin(ang) * 34 + 9, 0, 'center');
  ctx.restore();
}

/** A faint thread from a locked satellite to the phone, with a pulse sliding down it (signals keep arriving). */
function thread(ctx, v, i, k, head = 1) {
  if (k <= 0.01) return;
  const h = HERO[i];
  const x0 = v.wx(h.x), y0 = v.wy(h.y), x1 = v.wx(0), y1 = v.wy(0);
  const hx = L.lerp(x0, x1, head), hy = L.lerp(y0, y1, head);
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.strokeStyle = L.rgba(ACCENT, 0.2 * k);
  ctx.lineWidth = 1.5;
  ctx.setLineDash([3, 7]);
  ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(hx, hy); ctx.stroke();
  ctx.setLineDash([]);
  if (head >= 1) {
    const p = ((v.gt * 0.55 + i * 0.27) % 1);
    const px = L.lerp(x0, x1, p), py = L.lerp(y0, y1, p);
    L.lightBlob(ctx, px, py, 16, ACCENT, 0.5 * k * Math.sin(Math.PI * p));
  }
  ctx.restore();
}

function polyline(ctx, pts) {
  ctx.beginPath();
  pts.forEach((p, j) => (j ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])));
}

/** The A ∩ B ring: draws itself both ways from the phone; front half bright, back half fine and dashed. */
function drawRing(ctx, v, k, draw) {
  if (k <= 0.01 || draw <= 0) return;
  const N = 160;
  const scr = (f) => { const p = ringPoint(f); return [v.wx(p.x), v.wy(p.y)]; };
  const span = draw * Math.PI;
  const front = [], back = [];
  for (let j = 0; j <= N; j++) {
    const f = -span + (2 * span * j) / N;
    const p = scr(f);
    (Math.sin(f) * Math.sign(RING_TILT) >= 0 ? front : back).push([p, f]);
  }
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.lineCap = 'round';
  // keep the HUD band (y < 300) clean: the ring fades out over y 380 → 300
  const hud = (c, a) => { const gr = ctx.createLinearGradient(0, 300, 0, 380); gr.addColorStop(0, L.rgba(c, 0)); gr.addColorStop(1, L.rgba(c, a)); return gr; };
  const seg = (arr) => {   // split at gaps so the halves don't bridge
    const out = []; let cur = [];
    arr.forEach(([p, f], j) => { if (j && Math.abs(f - arr[j - 1][1]) > 3 * Math.PI / N) { out.push(cur); cur = []; } cur.push(p); });
    if (cur.length) out.push(cur);
    return out;
  };
  for (const s of seg(back)) {
    ctx.setLineDash([6, 8]);
    ctx.strokeStyle = hud(HOT, 0.4 * k); ctx.lineWidth = 2;
    polyline(ctx, s); ctx.stroke();
  }
  ctx.setLineDash([]);
  for (const s of seg(front)) {
    for (const [lw, a, c] of [[18, 0.1, ACCENT], [7, 0.3, ACCENT], [3, 0.95, HOT]]) {
      ctx.strokeStyle = hud(c, a * k); ctx.lineWidth = lw;
      polyline(ctx, s); ctx.stroke();
    }
  }
  // the two drawing heads
  if (draw < 1) {
    for (const f of [span, -span]) { const p = scr(f); L.lightBlob(ctx, p[0], p[1], 40, HOT, 0.8 * k * L.clamp((p[1] - 300) / 80)); }
  }
  ctx.restore();
}

/** A bright intersection point. */
function point(ctx, x, y, k, col = HOT, size = 1) {
  if (k <= 0.01) return;
  L.lightBlob(ctx, x, y, 46 * size, ACCENT, 0.6 * k);
  ctx.save();
  ctx.globalAlpha *= k;
  ctx.fillStyle = L.rgba(col);
  ctx.beginPath(); ctx.arc(x, y, Math.max(0, 6.5 * size), 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

function drawSystem(ctx, v) {
  const sk = sysK(v);
  if (sk <= 0) return;
  if (v.cam.mpp < 300) return;                       // street scale: the system is thousands of km away
  const scaleK = L.clamp(L.invLerp(Math.log(2000), Math.log(15000), Math.log(v.cam.mpp)));
  const k = sk * scaleK;
  if (k <= 0.002) return;
  const e = missAt(v);
  const missK = e / ERR;
  const lt = lockT(v);
  const flash = lt >= 0 ? Math.exp(-lt * 3.2) : 0;
  const all4 = lt >= 0 ? L.ease.outCubic(L.prog(lt, 0, 0.5)) : 0;   // after the lock all four rims agree: equal weight

  // 1 · markers on the four heroes (dim letters first, the active one turns green and charges)
  const mk = k * L.ease.outCubic(L.prog(bt(v, 10), 1.6, 0.6));
  HERO.forEach((h, i) => {
    const g = TRI.grow[i];
    const tb = bt(v, g.beat);
    const on = L.ease.outCubic(L.prog(tb, g.mark, 0.4));
    const charge = L.ease.inOutCubic(L.prog(tb, g.mark, 0.3)) * (1 - L.prog(tb, g.t0, 0.25));
    heroMarker(ctx, v, i, mk, on, charge);
  });

  // 2 · the spheres, in arrival order. Drawn into a layer: the shells' fills thin out as more spheres stack and
  //     step back over the planet (the Earth stays readable), and the whole layer fades out under the HUD band
  //     (y < 380) and the stat panel (top right), so rims and fills never cross the numbers.
  const L2 = sphereLayer(ctx);
  const lc = L2.c;
  lc.setTransform(1, 0, 0, 1, 0, 0);
  lc.clearRect(0, 0, L2.cv.width, L2.cv.height);
  lc.setTransform(ctx.getTransform());
  const grown = ORDER.filter((i) => growK(v, i) > 0);
  const nStack = grown.reduce((n, i) => n + L.clamp(growK(v, i) * 3), 0);
  const fillK = 1 / Math.max(1, 0.6 + 0.55 * nStack);
  const sph = (i) => {
    const gk = growK(v, i), g = TRI.grow[i], tb = bt(v, g.beat);
    const front = 1 - L.ease.outCubic(L.prog(tb, g.t1, 0.5));
    const lead = Math.max(leadK(v, i), 0.6 * all4 * (1 - flash) + flash);
    const r = HERO[i].range * gk + e * (i === 3 ? gk : 1);
    return { gk, k: k * L.clamp(gk * 8), opts: { r, lead, front: gk < 1 ? 1 : front, warm: missK, flash, fillK } };
  };
  for (const i of grown) { const q = sph(i); drawSignalSphere(lc, v, i, q.k, { ...q.opts, part: 'fill' }); }
  // the planet shows through the shells' fills
  lc.save();
  lc.globalCompositeOperation = 'destination-out';
  lc.fillStyle = 'rgba(0,0,0,0.78)';
  lc.beginPath(); lc.arc(v.wx(0), v.wy(R_EARTH), Math.max(0, v.ws(R_EARTH) * 1.02), 0, Math.PI * 2); lc.fill();
  lc.restore();
  for (const i of grown) {
    const q = sph(i);
    drawSignalSphere(lc, v, i, q.k, { ...q.opts, part: 'rim' });
    // the radius line: B's delay becomes a distance (beat 10); for the others a quick thread
    thread(lc, v, i, k * (i === 1 ? 1 : 0.8) * L.clamp(q.gk * 4) * (1 - 0.5 * missK), q.gk);
  }
  lc.save();
  lc.setTransform(1, 0, 0, 1, 0, 0);
  const sxf = L2.cv.width / W, syf = L2.cv.height / H;
  lc.scale(sxf, syf);
  lc.globalCompositeOperation = 'destination-out';
  const hg = lc.createLinearGradient(0, 270, 0, 390);
  hg.addColorStop(0, 'rgba(0,0,0,1)'); hg.addColorStop(1, 'rgba(0,0,0,0)');
  lc.fillStyle = hg; lc.fillRect(0, 0, W, 390);
  lc.filter = 'blur(28px)';
  lc.fillStyle = 'rgba(0,0,0,0.88)';
  lc.fillRect(500, 360, W - 470, 250);
  lc.filter = 'none';
  lc.restore();
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalCompositeOperation = 'lighter';
  ctx.drawImage(L2.cv, 0, 0);
  ctx.restore();

  // 3 · ring (A ∩ B) and the two points (∩ C)
  const tr = bt(v, TRI.ring.beat);
  const ringDraw = L.ease.inOutCubic(L.prog(tr, TRI.ring.t0, TRI.ring.dur));
  const ringOut = 1 - L.ease.inCubic(L.prog(bt(v, 13), 0.0, 0.5));
  const ringLead = 1 - 0.45 * L.ease.inOutCubic(L.prog(bt(v, 12), TRI.grow[2].t1 - 0.2, 0.6));
  drawRing(ctx, v, k * ringOut * ringLead, ringDraw);
  const tc = bt(v, 12);
  const pts = L.ease.outBack(L.prog(tc, TRI.grow[2].t1 - 0.05, 0.45)) * ringOut;
  const strike = L.ease.outCubic(L.prog(tc, TRI.strike.t0, 0.35));
  if (pts > 0 && Q_WORLD) {
    const qx = v.wx(Q_WORLD.x), qy = v.wy(Q_WORLD.y);
    const qk = k * L.clamp(pts) * (1 - 0.55 * strike);
    point(ctx, qx, qy, qk, L.mix(HOT, [190, 196, 205], strike), L.clamp(pts) * 1.15);
    // the far point answers the landing with its own ripple (it is just as valid, until we ask "on Earth?")
    const qa = L.prog(tc, TRI.grow[2].t1 + 0.1, 1.0);
    if (qa > 0 && qa < 1) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.strokeStyle = L.rgba(ACCENT, 0.8 * (1 - qa) * k); ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.arc(qx, qy, Math.max(0, 10 + 70 * L.ease.outCubic(qa)), 0, Math.PI * 2); ctx.stroke();
      ctx.restore();
    }
    if (strike > 0) {
      ctx.save();
      ctx.globalAlpha *= k * ringOut;
      L.lightBlob(ctx, qx, qy, 70, WARN, 0.45 * Math.exp(-L.prog(tc, TRI.strike.t0, 1) * 4) * strike);
      ctx.strokeStyle = L.rgba(WARN, 0.95); ctx.lineWidth = 5; ctx.lineCap = 'round';
      const s = 22;
      ctx.beginPath(); ctx.moveTo(qx - s, qy - s); ctx.lineTo(qx - s + 2 * s * strike, qy - s + 2 * s * strike); ctx.stroke();
      const s2 = L.ease.outCubic(L.prog(tc, TRI.strike.t0 + 0.12, 0.35));
      if (s2 > 0) { ctx.beginPath(); ctx.moveTo(qx + s, qy - s); ctx.lineTo(qx + s - 2 * s * s2, qy - s + 2 * s * s2); ctx.stroke(); }
      ctx.restore();
    }
  }

  // 4 · the miss (beat 13): the inflated rims cross in a warm fuzzy patch instead of on the phone
  const px = v.wx(0), py = v.wy(0);
  if (missK > 0.01) {
    const shown = [0, 1, 2, 3].filter((i) => growK(v, i) >= 1);
    const cross = [];
    for (let a = 0; a < shown.length; a++) for (let b = a + 1; b < shown.length; b++) {
      const i = shown[a], j = shown[b];
      const m = meet(HERO[i], HERO[i].range + e, HERO[j], HERO[j].range + e);
      if (m) cross.push([v.wx(m.x), v.wy(m.y)]);
    }
    if (cross.length) {
      const cxm = cross.reduce((s, p) => s + p[0], 0) / cross.length, cym = cross.reduce((s, p) => s + p[1], 0) / cross.length;
      const rad = Math.max(24, ...cross.map((p) => Math.hypot(p[0] - cxm, p[1] - cym))) + 14;
      const wob = 1 + 0.05 * Math.sin(v.gt * 9);
      // a dark disc first, so the warm patch separates from the lit land under it
      ctx.save();
      ctx.globalCompositeOperation = 'source-over';
      const dg = ctx.createRadialGradient(cxm, cym, 0, cxm, cym, rad * 1.4);
      dg.addColorStop(0, L.rgba([0, 0, 0], 0.3 * missK * k));
      dg.addColorStop(0.75, L.rgba([0, 0, 0], 0.25 * missK * k));
      dg.addColorStop(1, L.rgba([0, 0, 0], 0));
      ctx.fillStyle = dg;
      ctx.beginPath(); ctx.arc(cxm, cym, Math.max(0, rad * 1.4), 0, Math.PI * 2); ctx.fill();
      ctx.restore();
      L.lightBlob(ctx, cxm, cym, rad * 1.15 * wob, WARN, 0.22 * missK * k);
      ctx.save();
      ctx.globalAlpha *= missK * k;
      // the fuzzy patch itself: the hull of the crossings (the triangle the phone cannot resolve)
      if (cross.length >= 3) {
        const hull = cross.slice().sort((a, b) => Math.atan2(a[1] - cym, a[0] - cxm) - Math.atan2(b[1] - cym, b[0] - cxm));
        ctx.fillStyle = L.rgba(WARN, 0.14);
        ctx.strokeStyle = L.rgba(WARN, 0.6); ctx.lineWidth = 1.5; ctx.lineJoin = 'round';
        polyline(ctx, hull); ctx.closePath(); ctx.fill(); ctx.stroke();
      }
      ctx.strokeStyle = L.rgba(WARN, 0.75); ctx.lineWidth = 2;
      ctx.setLineDash([5, 6]); ctx.lineDashOffset = -v.gt * 20;
      ctx.beginPath(); ctx.arc(cxm, cym, Math.max(0, rad * wob), 0, Math.PI * 2); ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = L.rgba([255, 220, 190], 0.95);
      const pr = 4.5 + 1.5 * Math.sin(v.gt * 7);       // the crossings pulse: they no longer agree
      for (const p of cross) { ctx.beginPath(); ctx.arc(p[0], p[1], Math.max(0, pr), 0, Math.PI * 2); ctx.fill(); }
      ctx.restore();
    }
  }

  // 5 · the phone's blue dot on the limb (planet scale), + the beat-10…12 receive pings and the beat-13 lock
  const dotK = k * L.ease.outCubic(L.prog(bt(v, 10), 1.6, 0.6));
  let boost = flash;
  for (const i of ORDER) {
    const g = TRI.grow[i];
    const age = bt(v, g.beat) - g.t1;
    if (age < 0 || age > 1.1) continue;
    const a = L.ease.outCubic(age / 1.1);
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.strokeStyle = L.rgba(i === 3 ? WARN : ACCENT, 0.8 * (1 - a) * dotK); ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.arc(px, py, Math.max(0, 10 + 70 * a), 0, Math.PI * 2); ctx.stroke();
    ctx.restore();
    if (i !== 3) boost = Math.max(boost, Math.exp(-age * 5));
  }
  drawPhoneDot(ctx, v, dotK * (1 - 0.55 * missK), boost);
  // the C landing also lights the phone as one of the two points
  if (pts > 0) point(ctx, px, py, k * L.clamp(pts) * ringOut * 0.7, HOT, 0.9);
  // lock: shock rings + reticle
  if (lt >= 0 && lt < 1.6) {
    const a = L.prog(lt, 0, 1.2);
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    L.lightBlob(ctx, px, py, 160, ACCENT, 0.7 * Math.exp(-lt * 3) * k);
    for (const [dl, s] of [[0, 1], [0.1, 0.55]]) {
      const a2 = L.clamp((a - dl) / (1 - dl));
      if (a2 <= 0 || a2 >= 1) continue;
      ctx.strokeStyle = L.rgba(HOT, 0.85 * (1 - a2) * s * k); ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(px, py, Math.max(0, 12 + 150 * L.ease.outCubic(a2)), 0, Math.PI * 2); ctx.stroke();
    }
    ctx.restore();
  }
  if (lt >= -0.05) {
    const sn = L.ease.outBack(L.prog(lt, 0, 0.45), 2.2);
    const half = L.lerp(70, 26, sn), bl = 11;
    ctx.save();
    ctx.globalAlpha *= k * L.clamp(lt * 6 + 0.3);
    ctx.strokeStyle = L.rgba(L.mix(HOT, ACCENT, L.clamp(lt * 2)), 0.95);
    ctx.lineWidth = 3;
    ctx.beginPath();
    for (const [sx, sy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
      const cx = px + sx * half, cy = py + sy * half;
      ctx.moveTo(cx, cy - sy * bl); ctx.lineTo(cx, cy); ctx.lineTo(cx - sx * bl, cy);
    }
    ctx.stroke();
    ctx.restore();
  }
}

export default {
  beat: 10,
  chapter: { num: '10', title: 'One satellite', sub: 'a sphere' },
  captions: true,
  layer: 3,
  cues() {
    const g = TRI.grow[1];
    return [
      { t: g.mark, name: 'blip', gain: 0.16, pitch: 1.3 },
      { t: g.t0 - 0.05, name: 'swell', gain: 0.26, pitch: 1.1 },
      { t: g.t1, name: 'ping', gain: 0.36, pitch: 1.1 },
      { t: g.t1 + 0.05, name: 'shimmer', gain: 0.16, pitch: 1.3 },
    ];
  },
  drawWorld(ctx, v) {
    drawSystem(ctx, v);
  },
  drawOverlay(ctx, v) {
    // the delay becomes a distance: the counter runs with the growing radius
    const g = TRI.grow[1];
    const gk = growK(v, 1);
    const k = v.k * L.enter(v.t, g.t0 + 0.1, 0.5);
    const km = HERO[1].range / 1000 * gk;
    L.bigLabel(ctx, {
      x: 1000, y: 500, big: `${L.fmt(Math.round(km))} km`, small: '0.068 s × speed of light',
      k, accent: ACCENT, align: 'right', size: 96,
    });
  },
};
