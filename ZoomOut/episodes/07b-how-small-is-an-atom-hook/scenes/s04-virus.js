// Beat 4 — a virus (100 nm) at P.virus, just off the bacterium's front cap. A slowly turning spiky
// capsid: a shaded sphere tiled with capsomere bumps, a crown of stalked spikes (back ones behind
// the body, front ones over it). Already a faint speck in beat 3; it brightens with a soft bloom
// during this hold, gets a 100 nm bracket and its label.
import * as L from '../../../../engine/runtime/lib.js';
import { P } from '../camera.js';

const { W, H } = L;
const RB = 40e-9;            // capsid radius
const SPIKE = 10e-9;         // spike length → 100 nm overall
const BODY = [150, 96, 205];
const HEAD = [255, 168, 136];

// Fibonacci sphere points
const fib = (n) => Array.from({ length: n }, (_, i) => {
  const y = 1 - (2 * (i + 0.5)) / n, r = Math.sqrt(1 - y * y), a = i * 2.399963;
  return [Math.cos(a) * r, y, Math.sin(a) * r];
});
const SPIKES = fib(42);
const BUMPS = fib(160);

function rot(p, a, b) {
  // spin about the y axis by a, then tilt about x by b
  const ca = Math.cos(a), sa = Math.sin(a), cb = Math.cos(b), sb = Math.sin(b);
  const x = p[0] * ca + p[2] * sa, z = -p[0] * sa + p[2] * ca;
  return [x, p[1] * cb - z * sb, p[1] * sb + z * cb];
}

export function virusVis(v) {
  const sc = v.tl.scenes;
  const a = 0.65 * L.ease.inOutCubic(L.prog(v.gt, sc[3].start + 2.3, 1.0));
  const b = 0.35 * L.ease.inOutCubic(L.prog(v.gt, sc[4].start + 0.85, 0.7));
  return { a: a + b, lit: b / 0.35 };
}

function drawVirus(ctx, v, alpha, lit) {
  const s = 1 / v.cam.mpp;
  const rb = RB * s, rs = (RB + SPIKE) * s;
  if (rs < 0.6) return;
  const cx = v.wx(P.virus.x + L.noise1(v.gt * 0.3, 51) * 1.2e-9), cy = v.wy(P.virus.y + L.noise1(v.gt * 0.27, 52) * 1.2e-9);
  if (cx + rs * 3 < 0 || cx - rs * 3 > W || cy + rs * 3 < 0 || cy - rs * 3 > H) return;
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.translate(cx, cy);
  if (rs < 4) {
    L.lightBlob(ctx, 0, 0, rs * 3, BODY, 0.5);
    ctx.fillStyle = L.rgba(L.mix(BODY, HEAD, 0.3));
    ctx.beginPath(); ctx.arc(0, 0, Math.max(0.6, rs), 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    return;
  }
  // bloom halo (stronger while it is the subject)
  L.lightBlob(ctx, 0, 0, rs * 2.6, [170, 110, 230], 0.2 + 0.4 * lit);
  const spin = v.gt * 0.22, tilt = 0.35;
  const P3 = SPIKES.map((p) => rot(p, spin, tilt));
  const detail = rs > 14;
  const spikes = (front) => {
    if (!detail) return;
    ctx.lineCap = 'round';
    for (const p of P3) {
      if ((p[2] >= 0) !== front) continue;
      const shade = front ? 0.75 + 0.25 * p[2] : 0.35 + 0.3 * (1 + p[2]);
      const bx = p[0] * rb * 0.96, by = p[1] * rb * 0.96, tx = p[0] * rs, ty = p[1] * rs;
      ctx.strokeStyle = L.rgba(L.mix([120, 70, 150], HEAD, 0.35 * shade), 0.9);
      ctx.lineWidth = Math.max(1, 0.03 * rs);
      ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(tx, ty); ctx.stroke();
      const hr = Math.max(1, 0.075 * rs) * (0.75 + 0.25 * Math.abs(p[2]));
      const hg = ctx.createRadialGradient(tx - hr * 0.3, ty - hr * 0.3, 0, tx, ty, hr);
      hg.addColorStop(0, L.rgba(L.mix(HEAD, [255, 235, 220], 0.4), shade));
      hg.addColorStop(1, L.rgba(L.mix(HEAD, [120, 50, 70], 0.5), shade));
      ctx.fillStyle = hg;
      ctx.beginPath(); ctx.arc(tx, ty, hr, 0, Math.PI * 2); ctx.fill();
    }
  };
  spikes(false);
  // capsid sphere, key light from the upper left
  const g = ctx.createRadialGradient(-rb * 0.38, -rb * 0.42, rb * 0.05, 0, 0, rb);
  g.addColorStop(0, L.rgba(L.mix(BODY, [240, 220, 255], 0.55)));
  g.addColorStop(0.45, L.rgba(BODY));
  g.addColorStop(0.85, L.rgba(L.mix(BODY, [30, 10, 50], 0.55)));
  g.addColorStop(1, L.rgba(L.mix(BODY, [20, 5, 40], 0.75)));
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.arc(0, 0, Math.max(0, rb), 0, Math.PI * 2); ctx.fill();
  // capsomere bumps
  if (rb > 18) {
    const br = rb * 0.085;
    for (const p0 of BUMPS) {
      const p = rot(p0, spin, tilt);
      if (p[2] < 0.08) continue;
      const x = p[0] * rb * 0.97, y = p[1] * rb * 0.97;
      const light = L.clamp(0.5 + (-p[0] * 0.5 - p[1] * 0.55 + p[2] * 0.6) * 0.6);
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(Math.atan2(p[1], p[0]));
      ctx.scale(Math.max(0.15, p[2]), 1);
      ctx.fillStyle = L.rgba(L.mix([60, 25, 100], [235, 210, 255], light), 0.35 * p[2]);
      ctx.beginPath(); ctx.arc(0, 0, br, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }
  }
  // cool rim (lower right) — the same rim light as the hair and cells
  const rg = ctx.createLinearGradient(-rb, -rb, rb, rb);
  rg.addColorStop(0.55, 'rgba(150,215,255,0)');
  rg.addColorStop(1, `rgba(150,215,255,${0.45 + 0.2 * lit})`);
  ctx.strokeStyle = rg;
  ctx.lineWidth = Math.max(1, rb * 0.05);
  ctx.beginPath(); ctx.arc(0, 0, Math.max(0, rb * 0.97), 0, Math.PI * 2); ctx.stroke();
  spikes(true);
  ctx.restore();
}

export default {
  beat: 4,
  chapter: { num: '04', title: 'A virus', sub: 'Not even a cell' },
  chapterUntil() { return 1.8; },
  captions: true,
  layer: -1,
  cues(d) {
    return [
      { t: 0.05, name: 'dive', gain: 0.3, pitch: 1.2 },
      { t: 0.9, name: 'bloom', gain: 0.24, pitch: 1.2 },
      { t: 1.25, name: 'tick', gain: 0.3, pitch: 1.3 },
      { t: 1.4, name: 'ping', gain: 0.26, pitch: 1.1 },
    ];
  },
  drawWorld(ctx, v) {
    const vis = virusVis(v);
    if (vis.a <= 0.002) return;
    drawVirus(ctx, v, vis.a, L.clamp(vis.lit));
  },
  drawOverlay(ctx, v) {
    const t = v.t, d = v.d;
    const kout = 1 - L.ease.inCubic(L.prog(t, d - 0.3, 0.26));
    focusRing(ctx, v.wx(P.virus.x), v.wy(P.virus.y), v.ws(RB + SPIKE), L.prog(t, 0.85, 1.1), v.accent);
    const bk = Math.min(v.k, L.prog(t, 1.2, 0.5)) * kout;
    const x1 = v.wx(P.virus.x - RB - SPIKE), x2 = v.wx(P.virus.x + RB + SPIKE);
    if (bk > 0 && x2 - x1 > 16) {
      const y = v.wy(P.virus.y - RB - SPIKE) - 22;
      const e = L.ease.outCubic(bk), mid = (x1 + x2) / 2;
      const a = L.lerp(mid, x1, e), b = L.lerp(mid, x2, e);
      const cap = 12 * L.ease.outCubic(L.prog(bk, 0.5, 0.5));
      const stroke = () => {
        ctx.beginPath();
        ctx.moveTo(a, y); ctx.lineTo(b, y);
        if (cap > 0) { ctx.moveTo(x1, y - cap); ctx.lineTo(x1, y + cap); ctx.moveTo(x2, y - cap); ctx.lineTo(x2, y + cap); }
        ctx.stroke();
      };
      ctx.save();
      ctx.lineCap = 'round';
      ctx.strokeStyle = 'rgba(2,8,10,0.55)'; ctx.lineWidth = 8; stroke();
      ctx.shadowColor = L.rgba(v.accent, 0.6); ctx.shadowBlur = 10;
      ctx.strokeStyle = L.rgba(v.accent, 0.98); ctx.lineWidth = 3.5; stroke();
      ctx.restore();
    }
    const k = Math.min(v.k, L.prog(t, 1.35, 0.5)) * kout;
    L.bigLabel(ctx, { x: 930, y: 720, big: '≈ 100 nm', small: '10× smaller still', k, accent: v.accent, align: 'right', size: 108 });
  },
};

/** a soft ring that expands once around a newly lit subject (draws the eye to a small thing) */
export function focusRing(ctx, x, y, r, p, color) {
  if (p <= 0 || p >= 1) return;
  const e = L.ease.outCubic(p);
  ctx.save();
  ctx.strokeStyle = L.rgba(color, 0.55 * (1 - p) * Math.min(1, p * 6));
  ctx.lineWidth = 2.5;
  ctx.beginPath(); ctx.arc(x, y, Math.max(0, r * (1.3 + 1.6 * e) + 10), 0, Math.PI * 2); ctx.stroke();
  ctx.restore();
}
