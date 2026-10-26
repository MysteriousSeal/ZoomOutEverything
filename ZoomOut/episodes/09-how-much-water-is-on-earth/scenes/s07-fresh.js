// Beat 7 — "Now keep only the liquid fresh water: | the lakes, the rivers, the swamps, the groundwater."
// A bright core of liquid fresh water (273 km, true scale) gathers inside the ALL ball, then pulls free and
// glides to FRESH. The rest of the ball (salt water and ice) drains away, leaving a glass ghost. On each
// named source a droplet lands in the fresh ball with a ripple.
// Owns ALL from beat 7 to the end of the film (drained ghost; refilled for the beat-12 recap), and the
// fresh core until beat 8 (s08 takes over the FRESH ball there).
import * as L from '../../../../engine/runtime/lib.js';
import { ALL, FRESH } from '../camera.js';
import { B, DEEP, FRESHC, waterBall } from './s04-1385-km.js';

const T_CORE = [1.15, 0.8];     // core gathers ("liquid fresh")
const T_MOVE = [2.0, 1.3];      // core pulls free to FRESH
const T_DRAIN = [2.25, 2.6];    // the rest drains
const WORDS = [3.16, 3.78, 4.44, 5.1];   // lakes, rivers, swamps, groundwater (from the caption weights)
const DROPS = [[-2.4, 0.9], [-0.6, 1.1], [0.5, 0.9], [2.1, 1.2]];   // approach angle, arc bend

const DRIP = (() => { const r = L.rng(7071); return Array.from({ length: 22 }, () => [r(), r(), r(), r()]); })();

/** Where the fresh core is at beat-7 time t (world), plus a stretch for its motion. */
function corePos(t) {
  const k = L.prog(t, T_MOVE[0], T_MOVE[1]);
  const e = L.ease.inOutCubic(k);
  const mx = (ALL.x + FRESH.x) / 2, my = Math.min(ALL.y, FRESH.y) - 0.28e6;   // arc control point (above)
  const q = (a, b, c2, u) => (1 - u) * (1 - u) * a + 2 * (1 - u) * u * b + u * u * c2;
  const x = q(ALL.x, mx, FRESH.x, e), y = q(ALL.y, my, FRESH.y, e);
  const e2 = L.ease.inOutCubic(L.clamp(k + 0.02));
  const dx = q(ALL.x, mx, FRESH.x, e2) - x, dy = q(ALL.y, my, FRESH.y, e2) - y;
  const sp = Math.hypot(dx, dy) / 0.03e6;
  return { x, y, ang: Math.atan2(dy, dx), s: 1 + 0.16 * L.clamp(sp) };
}

/** Fresh-ball surface wobble at global time (landing splash, then a ripple per named source). */
export function freshWob(v) {
  const t = v.gt - B(v, 7);
  let w = 0.006;
  const land = t - (T_MOVE[0] + T_MOVE[1]);
  if (land > 0) w += 0.05 * Math.exp(-land / 0.55);
  for (const s of WORDS) { const a = t - s - 0.32; if (a > 0) w += 0.025 * Math.exp(-a / 0.4); }
  return w;
}

/** ALL-ball state at global time: level (fill) and shell visibility. */
function allState(v) {
  const t = v.gt - B(v, 7);
  let level = 1 - L.ease.inOutCubic(L.prog(t, T_DRAIN[0], T_DRAIN[1]));
  let shell = L.lerp(0.55, 0.3, L.prog(v.gt, B(v, 8), 1.5));
  let alpha = 1 - 0.18 * L.ease.inOutCubic(L.prog(t, T_CORE[0], T_CORE[1]));
  // beat 12 recap: the full ball returns beside Earth with the two smaller ones
  // refilled while it is still far off-screen (camera on the 56 km drop in beat 11), so it enters the recap already full
  const back = L.ease.inOutCubic(L.prog(v.gt, B(v, 12) - 0.9, 1.0));
  level = Math.max(level, back);
  shell = L.lerp(shell, 1, back);
  alpha = L.lerp(alpha, 0.9, back);
  return { level, shell, alpha };
}

export default {
  beat: 7,
  chapter: { num: '07', title: 'Only liquid fresh water', sub: 'No salt water, no ice' },
  captions: true,
  layer: 2,
  cues(d) {
    return [
      { t: T_CORE[0], name: 'bloom', gain: 0.3, pitch: 1.0 },
      { t: T_MOVE[0] + 0.05, name: 'swish', gain: 0.28, pitch: 0.9 },
      { t: T_DRAIN[0], name: 'bubbles', gain: 0.28, pitch: 0.6 },
      { t: T_DRAIN[0] + 0.1, name: 'deep', gain: 0.22, pitch: 0.8 },
      { t: T_MOVE[0] + T_MOVE[1] - 0.05, name: 'splash', gain: 0.26, pitch: 1.3 },
      ...WORDS.map((s, i) => ({ t: s + 0.3, name: 'blip', gain: 0.2, pitch: 1.1 + i * 0.1 })),
    ];
  },

  drawWorld(ctx, v) {
    if (v.gt < B(v, 7)) return;
    const t = v.t;
    const st = allState(v);
    waterBall(ctx, v, ALL.x, ALL.y, ALL.d, { base: DEEP, alpha: st.alpha, level: st.level, shell: st.shell, wob: 0.006 + 0.01 * L.clamp(1 - Math.abs(t - 3) / 1.5), seed: 1.3, glow: 0.2 * Math.max(st.level, 0.2) });
    // drips peel off the bottom while it drains
    const cx = v.wx(ALL.x), cy = v.wy(ALL.y), r = v.ws(ALL.d / 2);
    if (t > T_DRAIN[0] && t < T_DRAIN[0] + T_DRAIN[1] + 2.5 && r > 20) {
      ctx.save();
      for (const [a, b, c2, dd] of DRIP) {
        const t0 = T_DRAIN[0] + a * T_DRAIN[1];
        const u = t - t0;
        if (u <= 0 || u > 1.1) continue;
        const th = Math.PI / 2 + (b - 0.5) * 1.1;
        const x = cx + Math.cos(th) * r * 0.98 + (b - 0.5) * 30 * u;
        const y = cy + Math.sin(th) * r * 0.98 + 25 * u + 45 * u * u;
        const al = 0.5 * L.clamp(u / 0.15) * (1 - u / 1.1);
        ctx.fillStyle = L.rgba(L.mix(DEEP, [140, 200, 255], 0.3 + 0.4 * c2), al);
        ctx.beginPath(); ctx.ellipse(x, y, Math.max(0, 2 + dd * 4), Math.max(0, (2 + dd * 4) * (1.2 + u * 0.6)), 0, 0, Math.PI * 2); ctx.fill();
      }
      ctx.restore();
    }
    // the fresh-water core (until s08 takes over)
    if (v.gt >= B(v, 8) || t < T_CORE[0]) return;
    const ck = L.prog(t, T_CORE[0], T_CORE[1]);
    const p = corePos(t);
    const grow = L.ease.outBack(ck, 1.4);
    L.lightBlob(ctx, v.wx(p.x), v.wy(p.y), v.ws(FRESH.d) * (1.2 + 0.8 * (1 - ck)), [120, 220, 255], 0.35 * Math.sin(Math.PI * L.clamp(ck * 1.2)) + 0.1);
    waterBall(ctx, v, p.x, p.y, FRESH.d * Math.max(0.05, grow), {
      base: FRESHC, alpha: L.clamp(ck * 2.5), wob: freshWob(v), seed: 4.1, glow: 0.3,
      stretch: p.s > 1.001 ? { ang: p.ang, s: p.s } : null,
    });
    // droplets from the named sources land in the fresh ball
    const fx = v.wx(FRESH.x), fy = v.wy(FRESH.y), fr = v.ws(FRESH.d / 2);
    WORDS.forEach((s, i) => {
      const u = L.prog(t, s - 0.05, 0.4);
      if (u <= 0) return;
      const [ang, bend] = DROPS[i];
      const dist = fr + 150;
      if (u < 1) {
        const e = L.ease.inCubic(u);
        const rr = L.lerp(dist, fr * 0.9, e);
        const aa = ang + bend * (1 - e) * 0.6;
        const x = fx + Math.cos(aa) * rr, y = fy + Math.sin(aa) * rr;
        L.lightBlob(ctx, x, y, 34, [150, 225, 255], 0.55);
        ctx.fillStyle = 'rgba(210,245,255,0.95)';
        ctx.beginPath(); ctx.arc(x, y, 6, 0, Math.PI * 2); ctx.fill();
      }
      const rp = L.prog(t, s + 0.32, 0.9);
      if (rp > 0 && rp < 1) {
        ctx.save();
        ctx.strokeStyle = L.rgba([170, 230, 255], 0.6 * (1 - rp));
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(fx, fy, Math.max(0, fr * (1.02 + 0.45 * L.ease.outCubic(rp))), 0, Math.PI * 2); ctx.stroke();
        ctx.restore();
      }
    });
  },

  drawOverlay(ctx, v) {
    const cx = v.wx(ALL.x), cy = v.wy(ALL.y), r = v.ws(ALL.d / 2);
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.6)';
    ctx.shadowBlur = 8;
    ctx.textBaseline = 'alphabetic';
    // the part that goes: under the draining ball
    const sk = L.enter(v.t, T_DRAIN[0] + 0.1, 0.5) * (1 - L.ease.inCubic(L.prog(v.t, 5.0, 0.6))) * v.k;
    if (sk > 0) {
      ctx.globalAlpha = sk * 0.85;
      ctx.font = L.font(26, 600, L.FONT.body);
      ctx.fillStyle = 'rgba(190,200,215,0.95)';
      L.trackedText(ctx, 'SALT WATER & ICE', cx, Math.min(cy + r + 58, 1230) + (1 - sk) * 10, 3, 'center');
    }
    // the part that stays
    const fk = L.enter(v.t, T_MOVE[0] + T_MOVE[1] + 0.15, 0.5) * v.k;
    if (fk > 0) {
      const fx = v.wx(FRESH.x), fy = v.wy(FRESH.y), fr = v.ws(FRESH.d / 2);
      ctx.globalAlpha = fk;
      ctx.font = L.font(25, 700, L.FONT.body);
      ctx.fillStyle = L.rgba(v.accent);
      L.trackedText(ctx, 'LIQUID FRESH WATER', Math.min(fx + 40, 790), fy + fr + 120 + (1 - fk) * 10, 2.5, 'center');
    }
    ctx.restore();
  },
};
