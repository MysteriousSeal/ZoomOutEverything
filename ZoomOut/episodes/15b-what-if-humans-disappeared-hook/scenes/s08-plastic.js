// Beat 8 — Plastic could outlast them, perhaps for a thousand years or more.
// As the camera pulls back from the fallen bridges to the harbour mouth, glinting plastic specks spark on
// along every shore (river banks, the bay). On "perhaps for a thousand years" they peel off the banks and
// ride the current down the rivers, squeeze through the Narrows and fan out into the Atlantic as a slow,
// glittering plume that stays in the world (still faintly visible at the bottom of the region in beat 9).
// Paths are precomputed once (deterministic), so every frame is a pure function of time.
import * as L from '../../../../engine/runtime/lib.js';
import { NARROWS } from '../camera.js';
import { LANDS, onLand, glowDot, worldRect } from '../env.js';

const { W, H } = L;
const REL0 = 0.8, REL1 = 2.0;             // drifters leave the banks between these beat times
const BBOX = { x0: -4200, x1: 4600, y0: -9500, y1: 12600 };
const SPACING = 42;                       // metres between shore specks
const T_LABEL = 1.0;                      // label waits until the glittering banks have read
const LBOX = { x0: 44, x1: 540, y0: 400, y1: 612 };   // screen box of the label block (specks dim inside it)

// ------------------------------------------------------------------ river centre lines (metres)
// (real channels: the Hudson, the East River, the Upper Bay down to the Verrazzano Narrows and the Lower Bay)
const HUDSON = [[-2600, -9500], [-2600, -6000], [-1830, -3000], [-1220, -1000], [-900, 600], [-600, 2000]];
const EASTR = [[1410, -9000], [1370, -6000], [1900, -4200], [2440, -3000], [1900, -1800], [1370, -1000], [1000, 0], [700, 1200], [300, 2400]];
const BAY = [[-200, 3000], [100, 4500], [0, 6500], [700, 8500], [1600, 9800], [NARROWS.x, NARROWS.y], [4500, 13500]];

const dist2Seg = (px, py, [ax, ay], [bx, by]) => {
  const dx = bx - ax, dy = by - ay, l = dx * dx + dy * dy;
  const u = L.clamp(((px - ax) * dx + (py - ay) * dy) / l);
  return [(px - ax - u * dx) ** 2 + (py - ay - u * dy) ** 2, u];
};
function nearestOn(line, x, y) {
  let best = [Infinity, 0, 0];
  for (let i = 0; i < line.length - 1; i++) {
    const [d, u] = dist2Seg(x, y, line[i], line[i + 1]);
    if (d < best[0]) best = [d, i, u];
  }
  return best;
}
// Catmull-Rom densify
function spline(pts, per = 6) {
  const out = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(pts.length - 1, i + 2)];
    for (let k = 0; k < per; k++) {
      const t = k / per, t2 = t * t, t3 = t2 * t;
      out.push([0, 1].map((j) => 0.5 * (2 * p1[j] + (-p0[j] + p2[j]) * t + (2 * p0[j] - 5 * p1[j] + 4 * p2[j] - p3[j]) * t2 + (-p0[j] + 3 * p1[j] - 3 * p2[j] + p3[j]) * t3)));
    }
  }
  out.push(pts[pts.length - 1]);
  return out;
}
function withLengths(pts) {
  const cum = [0];
  for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
  return { pts, cum, len: cum[cum.length - 1] };
}
function along(path, s) {
  const { pts, cum, len } = path;
  if (s <= 0) return pts[0];
  if (s >= len) return pts[pts.length - 1];
  let lo = 0, hi = cum.length - 1;
  while (hi - lo > 1) { const m = (lo + hi) >> 1; if (cum[m] <= s) lo = m; else hi = m; }
  const u = (s - cum[lo]) / Math.max(1e-6, cum[lo + 1] - cum[lo]);
  return [L.lerp(pts[lo][0], pts[lo + 1][0], u), L.lerp(pts[lo][1], pts[lo + 1][1], u)];
}

// 15b: matte, sun-faded consumer plastic (bottle white, faded blue, red caps, yellow, green, black film, clear PET)
const PLASTIC = [[[222, 222, 214], 0.30], [[96, 140, 196], 0.18], [[196, 84, 70], 0.12], [[214, 186, 92], 0.1],
  [[110, 160, 120], 0.08], [[58, 60, 64], 0.08], [[176, 196, 204], 0.14]];
function plasticCol(u) {
  for (const [c, w] of PLASTIC) { if (u < w) return c; u -= w; }
  return PLASTIC[0][0];
}

// ------------------------------------------------------------------ specks along every shore (+ drifter routes)
const SPECKS = (() => {
  const r = L.rng(808), out = [];
  for (const poly of LANDS) {
    for (let i = 0; i < poly.length; i++) {
      const [ax, ay] = poly[i], [bx, by] = poly[(i + 1) % poly.length];
      const len = Math.hypot(bx - ax, by - ay);
      if (len > 30000) continue;
      const nx = -(by - ay) / len, ny = (bx - ax) / len;
      for (let s = r() * SPACING; s < len; s += SPACING * (0.6 + 0.8 * r())) {
        const px = ax + ((bx - ax) * s) / len, py = ay + ((by - ay) * s) / len;
        if (px < BBOX.x0 || px > BBOX.x1 || py < BBOX.y0 || py > BBOX.y1) continue;
        const side = onLand(px + nx * 50, py + ny * 50) ? -1 : 1;
        const off = 12 + r() * 70;
        const x = px + nx * side * off, y = py + ny * side * off;
        if (onLand(x, y)) continue;
        const tint = r();
        out.push({
          x, y, rank: r(), ta: r(), ph: r() * 40, gl: r(), sz: 0.8 + r() * r() * 1.6,
          col: plasticCol(tint), rot: r() * Math.PI,
          drift: r() < 0.62,
        });
      }
    }
  }
  return out;
})();

// ocean targets: the plume leaves the Narrows and fans out (mostly south, some hugging the Jersey shore)
function oceanTail(r, lat) {
  for (let tries = 0; tries < 30; tries++) {
    const th = L.lerp(-0.95, 1.35, Math.pow(r(), 0.85)) + 0.2 * (r() - 0.5);  // radians from "down", + = east
    const d = 4000 + 14500 * Math.pow(r(), 0.7);
    const T = [NARROWS.x + Math.sin(th) * d, NARROWS.y + 2200 + Math.cos(th) * d];
    const curl = (0.15 + r() * 0.45) * d * (th > 0.2 ? -1 : 1);
    const mid = [NARROWS.x + Math.sin(th) * d * 0.5 + Math.cos(th) * curl, NARROWS.y + 2200 + Math.cos(th) * d * 0.55 - Math.sin(th) * curl];
    const P = [[NARROWS.x + lat, NARROWS.y + 1800], mid, T];
    const pts = spline([[NARROWS.x + lat * 0.4, NARROWS.y], ...P], 5);
    if (pts.every(([x, y]) => !onLand(x, y))) return { pts: P, dir: [Math.sin(th), Math.cos(th)] };
  }
  return { pts: [[NARROWS.x + lat, NARROWS.y + 3000], [NARROWS.x + lat, NARROWS.y + 9000]], dir: [0, 1] };
}

const DRIFT = (() => {
  const r = L.rng(4242), out = [];
  const lines = [HUDSON, EASTR, BAY];
  for (const sp of SPECKS) {
    if (!sp.drift) continue;
    let best = null;
    lines.forEach((ln, li) => { const [d, i, u] = nearestOn(ln, sp.x, sp.y); if (!best || d < best.d) best = { d, li, i, u }; });
    const ln = lines[best.li];
    const jit = () => [(r() - 0.5) * 420, (r() - 0.5) * 260];
    const pts = [[sp.x, sp.y]];
    const startI = best.i + 1;
    const lat = (r() - 0.5) * 380;
    for (let i = startI; i < ln.length; i++) { const j = jit(); pts.push([ln[i][0] + j[0], ln[i][1] + j[1]]); }
    if (best.li < 2) for (const p of BAY) { const j = jit(); pts.push([p[0] + j[0] * 0.7, p[1] + j[1]]); }
    else pts.pop();   // BAY's own tail is replaced by the ocean fan
    // through the Narrows tightly, then fan out
    const tail = oceanTail(r, lat);
    pts.push([NARROWS.x + lat * 0.35, NARROWS.y], ...tail.pts);
    const path = withLengths(spline(pts, 5));
    const rel = L.lerp(REL0, REL1, Math.pow(r(), 1.1)) + (best.li === 2 ? 0.25 : 0);
    const dur = 2.1 + r() * 1.2;
    out.push({ sp, path, rel, dur, dir: tail.dir, ph: r() * 6.28, sw: 0.4 + r() * 0.8 });
  }
  return out;
})();
const DRIFT_OF = new Map(DRIFT.map((d) => [d.sp, d]));

// a few streamlines that show the current (dashes slide toward the sea)
const STREAMS = (() => {
  const r = L.rng(99), out = [];
  for (const base of [HUDSON.slice(2), EASTR.slice(5)]) {
    for (let k = 0; k < 2; k++) {
      const off = (k - 0.5) * 260;
      const pts = [...base.map(([x, y]) => [x + off, y]), ...BAY.slice(0, 4).map(([x, y]) => [x + off * 0.8, y]), [NARROWS.x + off * 0.3, NARROWS.y]];
      const t = oceanTail(r, off);
      out.push(withLengths(spline([...pts, ...t.pts], 6)));
    }
  }
  for (let k = 0; k < 5; k++) {
    const t = oceanTail(r, (r() - 0.5) * 300);
    out.push(withLengths(spline([[NARROWS.x, NARROWS.y - 1500], [NARROWS.x, NARROWS.y], ...t.pts], 8)));
  }
  return out;
})();

// ease that starts gently, cruises, and lands softly (the plume keeps creeping afterwards)
const travel = (u) => (u <= 0 ? 0 : u >= 1 ? 1 : L.ease.inOutCubic(u) * 0.75 + L.smoothstep(u) * 0.25);

/** Where a drifter is at beat time t (metres). Returns [x, y, speed m/s]. */
function drifterAt(dr, t, gt) {
  const u = (t - dr.rel) / dr.dur;
  let s = dr.path.len * travel(u);
  let [x, y] = along(dr.path, s);
  let spd = 0;
  if (u > 0 && u < 1) {
    const s2 = dr.path.len * travel(u + 0.03);
    spd = (s2 - s) / (0.03 * dr.dur);
  }
  if (u > 1) {   // after landing: the plume keeps spreading slowly with the current, and swirls
    const a = t - dr.rel - dr.dur;
    const creep = 220 * a * dr.sw, sw = 520 * L.clamp(a / 1.5);
    x += dr.dir[0] * creep + dr.dir[1] * creep * 0.6 + sw * L.noise1(gt * 0.3 + dr.ph, 3);
    y += dr.dir[1] * creep - dr.dir[0] * creep * 0.6 + sw * L.noise1(gt * 0.27 + dr.ph, 5);
  }
  return [x, y, spd];
}

function drawStreams(ctx, v, k) {
  if (k <= 0.01) return;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.lineWidth = 1.3;
  ctx.setLineDash([10, 22]);
  ctx.lineDashOffset = -v.gt * 46;
  ctx.strokeStyle = `rgba(150,195,230,${0.13 * k})`;
  for (const p of STREAMS) {
    ctx.beginPath();
    p.pts.forEach(([x, y], i) => (i ? ctx.lineTo(v.wx(x), v.wy(y)) : ctx.moveTo(v.wx(x), v.wy(y))));
    ctx.stroke();
  }
  ctx.restore();
}

/** 1 outside the label block, down to ~0.3 inside it (+20 px soft edge), so glints never flicker through the number. */
function labelDim(x, y, k) {
  if (k <= 0) return 1;
  const dx = Math.max(LBOX.x0 - x, 0, x - LBOX.x1), dy = Math.max(LBOX.y0 - y, 0, y - LBOX.y1);
  return 1 - 0.7 * k * L.clamp(1 - Math.hypot(dx, dy) / 20);
}

/** One floating fragment of plastic: a small matte, slightly irregular flake in its own faded colour (a bottle, a cap,
 *  a scrap of film), with a dark waterline edge. A glint only lifts its colour a little (a soft sheen, never a star). */
function speck(ctx, x, y, sz, col, a, glint, rot = 0) {
  sz = Math.max(2.4, sz);                         // never thinner than ~2 px: survives motion blur during the pull-back
  a = Math.min(1, a);
  if (a <= 0.01) return;
  const c = Math.cos(rot), s = Math.sin(rot), hw = sz * 0.62, hh = sz * 0.36;
  const pt = (u, w) => [x + u * c - w * s, y + u * s + w * c];
  ctx.fillStyle = `rgba(6,10,16,${0.35 * a})`;    // the dark waterline under each piece
  ctx.beginPath();
  for (const [u, w] of [[-hw, -hh], [hw * 0.9, -hh * 1.1], [hw, hh], [-hw * 0.8, hh * 1.2]]) { const [px, py] = pt(u + 0.6, w + 0.7); ctx.lineTo(px, py); }
  ctx.fill();
  ctx.fillStyle = L.rgba(L.mix(col, [255, 250, 240], 0.12 + 0.35 * glint), a);
  ctx.beginPath();
  for (const [u, w] of [[-hw, -hh], [hw * 0.9, -hh * 1.1], [hw, hh], [-hw * 0.8, hh * 1.2]]) { const [px, py] = pt(u, w); ctx.lineTo(px, py); }
  ctx.fill();
}

export default {
  beat: 8,
  chapter: { num: '08', title: 'Plastic', sub: '1,000+ years' },
  captions: true,
  layer: 1,
  cues(d) {
    return [
      { t: 0.25, name: 'shimmer', gain: 0.2, pitch: 1.2 },
      { t: 0.75, name: 'shimmer', gain: 0.14, pitch: 1.5 },
      { t: REL0 - 0.05, name: 'swish', gain: 0.2, pitch: 0.8 },
      { t: 1.7, name: 'tick', gain: 0.32, pitch: 1.0 },
      { t: 2.05, name: 'bubbles', gain: 0.14, pitch: 0.9 },
      { t: 3.1, name: 'shimmer', gain: 0.18, pitch: 0.9 },
    ];
  },
  drawWorld(ctx, v) {
    const t = v.t, m = v.cam.mpp;
    if (t < 0) return;
    // the plume stays in the world until the region dissolves into the planet
    const far = 1 - L.clamp(L.invLerp(Math.log(170), Math.log(420), Math.log(m)));
    if (far <= 0) return;
    const R = worldRect(v, 30);
    drawStreams(ctx, v, L.prog(t, REL0 - 0.3, 0.8) * (1 - L.prog(t, v.d - 0.4, 0.8)) * far);
    // shore specks: LOD keeps ~7 px between them on screen
    const keep = Math.min(1, SPACING / (10 * m));
    const sizeK = L.clamp(L.invLerp(60, 4, m)) + 2.4 * L.clamp(L.invLerp(9, 2, m));   // larger up close: the litter on the banks reads on "Plastic" 
    const zoomK = 1 - L.clamp(L.invLerp(22, 34, m)); // during the pull-back (m < 30): brighter, always haloed, so the banks glitter
    const lk = L.prog(t, T_LABEL - 0.1, 0.5) * (1 - L.prog(t, v.d, 0.4));
    ctx.save();
    // trails first (one path), then the specks on top
    ctx.lineCap = 'round';
    const trailA = 0.06 * far * (m > 90 ? 0.4 : 1);   // 15b: faint matte wakes (the additive trails read as a glowing laser line)
    ctx.lineWidth = 1.1;
    const under = new Path2D();   // trails that pass behind the label are stroked dimmer
    ctx.beginPath();
    const live = [];
    for (const dr of DRIFT) {
      const [x, y, spd] = drifterAt(dr, t, v.gt);
      if (x < R.x0 || x > R.x1 || y < R.y0 || y > R.y1) continue;
      live.push([dr, x, y]);
      if (spd > 0) {
        const lag = Math.min(spd * 0.1, 600);
        const u = (t - dr.rel) / dr.dur;
        const sNow = dr.path.len * travel(u);
        const [bx, by] = along(dr.path, sNow - lag);
        const x0 = v.wx(bx), y0 = v.wy(by), x1 = v.wx(x), y1 = v.wy(y);
        const tgt = labelDim((x0 + x1) / 2, (y0 + y1) / 2, lk) < 0.95 ? under : ctx;
        tgt.moveTo(x0, y0); tgt.lineTo(x1, y1);
      }
    }
    ctx.strokeStyle = `rgba(190,200,205,${trailA})`;
    ctx.stroke();
    ctx.strokeStyle = `rgba(190,200,205,${trailA * (1 - 0.7 * lk)})`;
    ctx.stroke(under);
    ctx.globalCompositeOperation = 'source-over';
    for (const sp of SPECKS) {
      const dr = DRIFT_OF.get(sp);
      let x = sp.x, y = sp.y, a;
      const appear = L.prog(t, 0.02 + sp.ta * 0.3, 0.25);   // 15b: the banks fill on "Plastic"
      if (appear <= 0) continue;
      if (dr) {
        if (t < dr.rel) { if (sp.rank > keep && m > 6) continue; }
        else continue;   // drawn below as a live drifter
        a = appear;
      } else {
        if (sp.rank > keep) continue;
        a = appear * (1 - 0.45 * L.prog(t, REL1, 1.2));   // the banks thin out as the plastic leaves
      }
      if (x < R.x0 || x > R.x1 || y < R.y0 || y > R.y1) continue;
      const flash = Math.exp(-(((t - 0.02 - sp.ta * 0.3) * 6) ** 2)) * 0.6;   // a sheen on arrival
      const tw = Math.pow(0.5 + 0.5 * Math.sin(v.gt * (2.2 + sp.gl * 2.5) + sp.ph), 14);
      const farDim = 1 - 0.4 * L.clamp(L.invLerp(10, 30, m));      // the banks recede as the plume takes focus
      const sx = v.wx(x), sy = v.wy(y);
      const al = a * far * farDim * (0.5 + 0.4 * sp.gl) * (1 + 1.0 * zoomK) * labelDim(sx, sy, lk);
      speck(ctx, sx, sy, sp.sz * (1.25 + 0.8 * sizeK), sp.col, al * 1.15, Math.max(flash, tw * (sp.gl > (m > 12 ? 0.85 : 0.55) ? 1 : 0)) * 0.6, sp.rot);
      if (m < 8) {   // up close the litter lies in small drifts: a few more pieces around each one
        const ck = L.clamp(L.invLerp(8, 4, m));
        for (let q = 0; q < 3; q++) {
          const ang = sp.rot * 7 + q * 2.1, dd = (4 + 7 * ((sp.ph * (q + 1)) % 1)) / m;
          speck(ctx, sx + Math.cos(ang) * dd * 2.2, sy + Math.sin(ang) * dd * 2.2, sp.sz * (0.8 + 0.8 * sizeK), plasticCol(((sp.ph * 0.37 + q * 0.29) % 1)), al * ck, 0, sp.rot + q);
        }
      }
    }
    for (const [dr, x, y] of live) {
      const sp = dr.sp;
      if (t < dr.rel) continue;
      const moving = (t - dr.rel) / dr.dur < 0.8;   // packed in the narrow channels: less halo, so the jet never blows out
      const tw = Math.pow(0.5 + 0.5 * Math.sin(v.gt * (2.6 + sp.gl * 3) + sp.ph), 12);
      const dimFar = 1 - 0.9 * L.clamp(L.invLerp(42, 110, m));   // quieter in the region view (bronze is the focus): no white blob
      const sx = v.wx(x), sy = v.wy(y);
      const a = far * dimFar * 0.9 * (0.55 + 0.45 * sp.gl) * (1 + 0.4 * zoomK) * labelDim(sx, sy, lk);
      speck(ctx, sx, sy, sp.sz * (1.25 + 0.8 * sizeK) * (m > 90 ? 0.8 : 1), sp.col, a * (moving ? 0.85 : 1), tw * (sp.gl > 0.7 ? 0.6 : 0) * (1 - L.clamp(L.invLerp(60, 100, m))), sp.rot + v.gt * 0.4 * (sp.gl - 0.5));
    }
    ctx.restore();
  },
  drawOverlay(ctx, v) {
    const k = v.k * L.enter(v.t, T_LABEL, 0.6);
    if (k > 0) {   // soft dark backing so the moving jet never flickers through the number
      const g = ctx.createRadialGradient(270, 515, 0, 270, 515, 330);
      g.addColorStop(0, `rgba(4,8,14,${0.4 * k})`); g.addColorStop(0.6, `rgba(4,8,14,${0.22 * k})`); g.addColorStop(1, 'rgba(4,8,14,0)');
      ctx.fillStyle = g; ctx.fillRect(0, 185, 600, 660);
    }
    L.bigLabel(ctx, { x: 64, y: 560, big: '1,000+ YEARS', small: 'plastic lingers', k, accent: v.accent, size: 92 });
  },
};
