// Beat 3 — "Stop the planet suddenly, | and anything not bolted down keeps going east, at that speed."
// Before the stop the shared east vectors come back on the loose things (cars, people, you). At stopTime the
// ground freezes (env jolts the camera and drops the HUD to 0 km/h) and everything loose keeps its 1,670 km/h:
// cars, people, café chairs, bins, crates, leaves and the fountain's water leave as long eased streaks. Things
// from further west keep pouring through along the open boulevard for ~7 s (a dense stream, then a sparse
// tail, so streaks still cross the frame through "at that speed"); plaza objects cross the street on the
// plaza's east side and end in dust against the facades of the next block (documentary, never gory: abstract
// silhouettes and light trails). Skid marks and dust stay behind and fade slowly.
import * as L from '../../../../engine/runtime/lib.js';
import { FOUNTAIN, PLAZA, V, YOU, block, drawLoose, drawVector, looseAt, scrim, stopAt, streetTrees, windK } from './s01-equator.js';

const { W, H } = L;
const TAU = Math.PI * 2;
const TAU_TRAIL = 0.5;              // trail length in seconds of flight

let FROZEN = null;
function frozen(tl) {
  const s = stopAt(tl);
  if (!FROZEN || FROZEN.s !== s) FROZEN = { s, items: looseAt(s) };
  return FROZEN.items;
}
/** metres travelled u s after launch at speed vv: a short 0.06 s take-up, then constant speed */
function dist(u, vv = V) {
  if (u <= 0) return 0;
  if (u < 0.06) return (vv * u * u) / 0.12;
  return vv * (u - 0.03);
}
const delayOf = (o) => 0.012 + 0.075 * (o.seed ?? 0.5);

// plaza things fly across the street east of the plaza and stop against the next block's west facades
const WALL = (() => {
  const b = block(1, 1);
  return (b?.blds ?? []).map((q) => ({ x: q.x0, y0: q.y0, y1: q.y1 }));
})();
/** x where a plaza object at y hits something: the facade east of the plaza (or that block's kerb) */
function wallX(y) {
  let x = Infinity;
  for (const w of WALL) if (y > w.y0 - 0.5 && y < w.y1 + 0.5) x = Math.min(x, w.x);
  return x === Infinity ? PLAZA.x1 + 18 : x - 0.3;
}

// debris pouring in from the west along the boulevard corridor
const STREAM = (() => {
  const r = L.rng(3131);
  const cols = [[228, 228, 224], [182, 186, 190], [72, 76, 82], [150, 44, 40], [40, 60, 98], [224, 178, 44], [204, 204, 200]];
  return Array.from({ length: 44 }, (_, k) => {
    // continuous spread across the boulevard (no shared lane rows, so trails never stack into one band)
    const y = (r() * 2 - 1) * 19.5;
    // 32 dense (to -1,900 m: the first ~4 s), then a sparse tail to -3,300 m (through the end of the line)
    const x = k < 32 ? -105 - Math.pow(r(), 1.15) * 1800 : -1900 - r() * 1400;
    const car = Math.abs(y) < 15 && r() < 0.55;
    const kinds = ['bin', 'crate', 'chair', 'crate'];
    const person = !car && Math.abs(y) > 15 && r() < 0.5;
    if (person) return { stream: true, kind: 'person', x, y, ang: 0, col: cols[Math.floor(r() * cols.length)], seed: r(), vx: 0, ph: r() * 10, spin: (r() - 0.5) * 2 };
    return car
      ? { stream: true, kind: 'car', x, y, ang: r() < 0.5 ? 0 : Math.PI, l: 4.2 + r() * 0.6, w: 1.8, col: cols[Math.floor(r() * cols.length)], seed: r(), vx: 0, spin: (r() - 0.5) * 3 }
      : { stream: true, kind: kinds[Math.floor(r() * 4)], x, y, ang: 0, r: 0.35 + r() * 0.2, col: [[58, 64, 62], [150, 120, 84], [200, 196, 188]][Math.floor(r() * 3)], seed: r(), vx: 0, spin: (r() - 0.5) * 30 };
  });
})();

const STREAM_SORTED = [...STREAM].sort((a, b) => (a.kind === 'person' ? 0 : a.kind === 'car' ? 2 : 1) - (b.kind === 'person' ? 0 : b.kind === 'car' ? 2 : 1));

function screenRangeX(v) { return [v.cam.x - (W / 2) * v.cam.mpp - 40, v.cam.x + (W / 2) * v.cam.mpp + 40]; }

/** a light trail from (tx, y) to (hx, y), world metres; width in metres */
function trail(c, v, tx, hx, y, wm, col, a, soft = false) {
  if (a <= 0 || hx - tx < 0.2) return;
  let sx0 = v.wx(tx), sx1 = v.wx(hx);
  const sy = v.wy(y);
  if (sx1 < -20 || sx0 > W + 20 || sy < -40 || sy > H + 40) return;
  const full = sx1 - sx0;
  const c0 = Math.max(-40, sx0), c1 = Math.min(W + 40, sx1);
  const f0 = (c0 - sx0) / full, f1 = (c1 - sx0) / full;
  const wpx = Math.max(2, wm / v.cam.mpp);
  // soft: the trail ends against a wall, so it tapers off over its last few metres instead of a hard cut
  const sk = soft ? L.clamp(1 - Math.min(full, 4 / v.cam.mpp) / Math.max(1, c1 - c0)) : 1;
  const g = c.createLinearGradient(c0, 0, c1, 0);
  g.addColorStop(0, L.rgba(col, a * 0.5 * f0 * f0));
  if (soft) { g.addColorStop(sk, L.rgba(col, a * 0.5 * f1 * f1 * 0.9)); g.addColorStop(1, L.rgba(col, 0)); }
  else g.addColorStop(1, L.rgba(col, a * 0.5 * f1 * f1));
  c.fillStyle = g;
  c.beginPath(); c.moveTo(c0, sy - wpx * 0.5 * f0); c.lineTo(c1, sy - wpx * 0.5 * f1); c.lineTo(c1, sy + wpx * 0.5 * f1); c.lineTo(c0, sy + wpx * 0.5 * f0); c.closePath(); c.fill();
  const g2 = c.createLinearGradient(c0, 0, c1, 0);
  g2.addColorStop(0, `rgba(255,252,244,${a * 0.85 * f0 * f0 * f0})`);
  if (soft) { g2.addColorStop(sk, `rgba(255,252,244,${a * 0.7 * f1 * f1 * f1})`); g2.addColorStop(1, 'rgba(255,252,244,0)'); }
  else g2.addColorStop(1, `rgba(255,252,244,${a * 0.7 * f1 * f1 * f1})`);
  c.strokeStyle = g2;
  c.lineWidth = Math.max(1.6, wpx * 0.28);
  c.beginPath(); c.moveTo(c0, sy); c.lineTo(c1, sy); c.stroke();
  // additive light trail: the moving things are the brightest marks in the frame
  const g3 = c.createLinearGradient(c0, 0, c1, 0);
  g3.addColorStop(0, L.rgba(L.mix(col, [255, 250, 236], 0.5), 0));
  g3.addColorStop(soft ? sk : 1, L.rgba(L.mix(col, [255, 250, 236], 0.5), a * 0.15 * f1 * f1));
  if (soft) g3.addColorStop(1, L.rgba(L.mix(col, [255, 250, 236], 0.5), 0));
  c.save();
  c.globalCompositeOperation = 'lighter';
  c.strokeStyle = g3;
  c.lineCap = 'round';
  c.lineWidth = Math.max(3, wpx * 1.1);
  c.beginPath(); c.moveTo(c0, sy); c.lineTo(c1, sy); c.stroke();
  c.restore();
}

const widthOf = (o) => (o.kind === 'car' ? o.w : o.kind === 'person' ? 0.7 : (o.r ?? 0.4) * 2);
const tintOf = (o) => L.mix(o.col ?? [200, 200, 200], [255, 246, 228], 0.45);

/** a flying object: trail + the object at its head; xmax = where it ends (plaza edge), else free */
function flyer(c, v, o, u, xmax, vv, keep = false) {
  const uu = u - delayOf(o);
  if (uu <= 0) { drawLoose(c, v, o, o.x, o.y); return; }
  const hx = o.x + dist(uu, vv), tx = o.x + dist(Math.max(0, uu - TAU_TRAIL), vv);
  const fade = keep ? 1 : 1 - L.prog(uu, 0.45, 0.5);
  const end = xmax ?? Infinity;
  const hxc = Math.min(hx, end), txc = Math.min(tx, end);
  const endA = xmax != null ? 1 - L.prog(hx - end, 0, 80) : 1;
  trail(c, v, txc, hxc, o.y, widthOf(o), tintOf(o), fade * endA * (o.stream ? 0.6 : 1), xmax != null && hx > end - 1);
  if (hx < end) {
    const a = xmax != null ? 1 - L.prog(hx, end - 3, 3) : 1;
    drawLoose(c, v, o, hx, o.y, a, o.ang + (o.kind === 'car' ? 0.12 * Math.sin(uu * 9 + o.seed * 6) : uu * (o.spin ?? 14)), uu * (o.spin ?? 12));
  }
}

function dust(c, v, x, y, u, big) {
  if (u <= 0) return;
  const wk = windK(v.gt, v.tl);
  const dx = 6 * u + 16 * u * u * (0.4 + wk);
  const rr = (big ? 3 : 1.8) + (big ? 7 : 4.5) * (1 - Math.exp(-u * 1.6));
  const a = (big ? 0.42 : 0.3) * Math.exp(-u / 3.6) * L.clamp(u / 0.08);
  const sx = v.wx(x + dx), sy = v.wy(y), r = rr / v.cam.mpp;
  if (sx + r * 1.6 < 0 || sx - r * 1.6 > W || a < 0.01) return;
  const g = c.createRadialGradient(sx, sy, 0, sx, sy, r * 1.4);
  g.addColorStop(0, `rgba(200,182,150,${a})`);
  g.addColorStop(0.5, `rgba(196,178,146,${a * 0.55})`);
  g.addColorStop(1, 'rgba(196,178,146,0)');
  c.fillStyle = g;
  c.beginPath(); c.ellipse(sx, sy, Math.max(0, r * 1.4 * (1 + 0.4 * u)), Math.max(0, r * 1.4), 0, 0, TAU); c.fill();
}

function skid(c, v, o, u) {
  const uu = u - delayOf(o);
  if (uu <= 0 || o.kind !== 'car') return;
  const len = Math.min(dist(uu), 26 + 10 * o.seed);
  const s = 1 / v.cam.mpp;
    for (const side of [-0.34, 0.34]) {
    const g = c.createLinearGradient(v.wx(o.x), 0, v.wx(o.x + len), 0);
    const ka = 0.5 * (1 - 0.45 * L.clamp(uu / 6));
    g.addColorStop(0, `rgba(14,14,16,${ka})`); g.addColorStop(1, 'rgba(14,14,16,0)');
    c.fillStyle = g;
    c.fillRect(v.wx(o.x - o.l * 0.3), v.wy(o.y + side * o.w) - 0.13 * s, (len + o.l * 0.3) * s, 0.26 * s);
  }
}

export default {
  beat: 3,
  chapter: { num: '03', title: 'Sudden stop' },
  captions: true,
  layer: 2,
  // beat 3 starts at 12.57; the stop is at 14.20 (t 1.63); "and anything…" 14.70; "east" 17.00
  cues(d) {
    const s = 1.634;
    return [
      { t: 0.45, name: 'riser', gain: 0.22, pitch: 0.8 },
      { t: 0.9, name: 'tick', gain: 0.14, pitch: 1.2 },
      { t: s - 0.02, name: 'impact', gain: 0.7, pitch: 0.7 },
      { t: s, name: 'deep', gain: 0.55, pitch: 0.6 },
      { t: s + 0.03, name: 'creak', gain: 0.3, pitch: 1.3 },
      { t: s + 0.05, name: 'whoosh', gain: 0.5, pitch: 1.6 },
      { t: s + 0.35, name: 'swish', gain: 0.32, pitch: 1.4 },
      { t: s + 0.25, name: 'splash', gain: 0.22, pitch: 1.2 },
      { t: s + 0.75, name: 'whoosh', gain: 0.3, pitch: 1.2 },
      { t: 2.2, name: 'ping', gain: 0.24, pitch: 0.9 },    // label
      { t: s + 1.6, name: 'swish', gain: 0.24, pitch: 1.5 },
      { t: s + 2.4, name: 'whoosh', gain: 0.2, pitch: 1.1 },
      { t: s + 3.3, name: 'swish', gain: 0.16, pitch: 1.3 },
    ];
  },
  drawWorld(ctx, v) {
    const st = stopAt(v.tl), u = v.gt - st;
    if (u <= 0 || v.cam.mpp > 1.2 || u > 9) return;
    const [xa, xb] = screenRangeX(v);
    const items = frozen(v.tl);
    // people under props under cars: a car is never painted beneath a person it overlaps
    const ORD = { person: 0, car: 2 };
    const near = items.filter((o) => o.x > xa - 40 && o.x < xb).sort((a, b) => (ORD[a.kind] ?? 1) - (ORD[b.kind] ?? 1));
    ctx.save();
    // ground traces: skid marks and dust where things were
    for (const o of near) skid(ctx, v, o, u);
    for (const o of near) {
      if (o.kind === 'car') dust(ctx, v, o.x + 2, o.y, u - delayOf(o), true);
    }
    // plaza impacts: dust where the plaza things hit the facades across the street
    for (const o of near) {
      if (!o.plaza) continue;
      const wx = wallX(o.y);
      const tHit = (wx - o.x) / V + 0.03 + delayOf(o);
      dust(ctx, v, wx, o.y, u - tHit, o.kind === 'umbrella');
    }
    // flyers: things in frame at the stop
    ctx.globalCompositeOperation = 'source-over';
    for (const o of near) flyer(ctx, v, o, u, o.plaza ? wallX(o.y) : null, V + o.vx);
    // the stream from the west (open corridor)
    for (const o of STREAM_SORTED) {
      const uu = u - delayOf(o);
      const hx = o.x + dist(uu);
      if (hx < xa - 10 || o.x + dist(Math.max(0, uu - TAU_TRAIL)) > xb) continue;
      flyer(ctx, v, o, u, null, V, true);
    }
    // leaves stripped from the street trees, the fountain's water
    const B = { x0: xa, x1: xb, y0: v.cam.y - 900 * v.cam.mpp, y1: v.cam.y + 1200 * v.cam.mpp };
    for (const t of streetTrees(B)) {
      for (let q = 0; q < 5; q++) {
        const sd = (t.s * 97 + q * 13.7) % 1;
        const lu = u - 0.03 - sd * 0.35;
        if (lu <= 0) continue;
        const lx = t.x + Math.cos(q * 2.4) * t.r * 0.6, ly = t.y + Math.sin(q * 2.4) * t.r * 0.6;
        const hx = lx + dist(lu, V * (0.7 + 0.3 * sd)), tx = lx + dist(Math.max(0, lu - 0.12), V * (0.7 + 0.3 * sd));
        const lim = t.y > 22 && t.y < 103 ? wallX(ly) : null;
        if (lim != null && tx > lim) continue;
        trail(ctx, v, tx, lim != null ? Math.min(hx, lim) : hx, ly, 0.35, [130, 170, 90], 0.9);
      }
    }
    if (FOUNTAIN.x > xa - 20 && FOUNTAIN.x < xb) {
      for (let q = 0; q < 26; q++) {
        const a = q * 2.399, rr = Math.sqrt((q + 0.5) / 26) * (FOUNTAIN.r - 0.8);
        const wx = FOUNTAIN.x + Math.cos(a) * rr, wy = FOUNTAIN.y + Math.sin(a) * rr;
        const lu = u - 0.02 - (q % 7) * 0.012;
        if (lu <= 0) continue;
        const wl = wallX(wy);
        const hx = Math.min(wl, wx + dist(lu)), tx = Math.min(wl, wx + dist(Math.max(0, lu - 0.2)));
        trail(ctx, v, tx, hx, wy, 0.5, [150, 220, 240], 1 - L.prog(lu, 0.25, 0.5));
      }
      dust(ctx, v, wallX(FOUNTAIN.y), FOUNTAIN.y, u - 0.12, true);
    }
    ctx.restore();
  },
  drawOverlay(ctx, v) {
    const gt = v.gt, acc = v.accent, st = stopAt(v.tl), u = gt - st;
    // 1) before the stop: the shared vectors come back on the loose things (and on you)
    const kv = L.ease.outCubic(L.prog(gt, st - 0.85, 0.5)) * (u < 0 ? 1 : 0);
    if (kv > 0) {
      const items = looseAt(gt);
      const cx = v.cam.x;
      const sel = items.filter((o) => (o.kind === 'car' || o.you) && Math.abs(o.x - cx) < 70 && Math.abs(o.y) < 16)
        .sort((a, b) => (a.you ? -1 : b.you ? 1 : Math.abs(a.x - cx + a.y) - Math.abs(b.x - cx + b.y))).slice(0, 7);
      sel.forEach((o, i) => {
        const k = L.prog(gt, st - 0.85 + i * 0.06, 0.45);
        const sx = v.wx(o.x), sy = v.wy(o.y);
        if (sx > W - 220) return;
        drawVector(ctx, sx + 10, sy, 96, k, { w: 5, alpha: v.k, flow: gt, glowA: 0.5 });
      });
    }
    // 2) the stop: a cold flash across the frame
    if (u > -0.02 && u < 0.6) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.fillStyle = `rgba(150,200,230,${0.2 * Math.exp(-Math.max(0, u) * 7)})`;
      ctx.fillRect(0, 0, W, H);
      ctx.restore();
    }
    // 3) the label: still 1,670 km/h, still heading east
    const kl = L.prog(gt, st + 0.5, 0.6) * v.k;
    if (kl > 0) {
      const ly = 600, lane = v.wy(-9.7);
      scrim(ctx, 64, ly - 130, 680, 230, kl);
      L.bigLabel(ctx, { x: 96, y: ly, big: '1,670 km/h', small: '1,040 mph · still heading east', k: kl, accent: acc, size: 112 });
      // leader: from under the label down onto the streaking lane
      if (lane > ly + 100) {
        const kd = L.prog(gt, st + 0.75, 0.5) * v.k;
        L.leader(ctx, 110, ly + 70, 110, lane, kd, [235, 240, 248], 0.8);
        if (kd > 0.9) {
          ctx.save();
          ctx.globalAlpha *= v.k;
          ctx.fillStyle = L.rgba(acc);
          ctx.beginPath(); ctx.arc(110, lane, 5, 0, TAU); ctx.fill();
          ctx.restore();
        }
      }
    }
  },
};
