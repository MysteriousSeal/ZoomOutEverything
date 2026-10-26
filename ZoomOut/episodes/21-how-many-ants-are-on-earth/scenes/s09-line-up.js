// Beat 9 (ep 21) — "Now line them all up, | end to end, at half a centimeter each."
// A procession of workers walks in along the soil from the left (from the amber), turns up at x = 0 and climbs into a
// single-file column, head to tail, heads UP. The train keeps a 25 % gap that closes as each ant locks into its slot, so
// the column assembles from the top down (16 ants = COL_TOP = 8.1 cm, the top at screen y ≈ 400) and is complete on
// "end to end". A "0.5 cm EACH" bracket then measures one ant. Late in the beat an amber light sweeps up the column:
// the ants are about to BECOME the glowing line that s10 launches off Earth.
//
// s09 owns the macro ants of the line for ALL later time: only the on-screen ones up to tip(v) are drawn, culled below
// 1.5 px and crossfaded out as s10's glowing line crossfades in. Exports `antSlotY` and `glowK` for the other 21C scenes.
import * as L from '../../../../engine/runtime/lib.js';
import { drawAnt } from '../ant.js';
import { ANT_LEN, tip, lineK, band } from '../env.js';

const { W, H, ease, clamp, prog } = L;
const AL = ANT_LEN;
const N = 16;                          // ants in the macro column (16 × 5 mm = COL_TOP)
const XW = 0.2 * AL;                   // anchor x of a climbing ant (its feet line); its body is centred on x = 0
const RR = 0.5 * AL;                   // radius of the ground → column turn
const ARC = RR * Math.PI / 2;
const LH = 0.06;                       // ground run before the turn (m)
const GAP = 1.25 * AL;                 // spacing along the path while marching
const T0 = 48.5, T1 = 51.0;            // train: start (off camera) → last ant locked (film s)
const BASE = LH + ARC + (N - 1) * AL;  // path length of the top ant
const FEND = BASE + (N - 1) * (GAP - AL) + 1e-4;
const BRACKET_SLOT = 6;                // the ant the "0.5 cm" bracket measures
const SWEEP = [52.35, 0.55];           // amber light sweep up the column (start, duration)

/** centre y (m, y down) of slot s */
export const antSlotY = (s) => -(s + 0.5) * AL;
/** train head progress (m along the path) */
const train = (gt) => FEND * (1 - (1 - prog(gt, T0, T1 - T0)) ** 2);
/** film time at which ant n locks into its slot */
export function lockTime(n) {
  const f = (BASE + n * (GAP - AL)) / FEND;
  return T0 + (T1 - T0) * (1 - Math.sqrt(Math.max(0, 1 - f)));
}
/** 0..1: how much the column has turned into glowing amber (late beat 9 → the line) */
export const glowK = (gt) => ease.inOutCubic(prog(gt, SWEEP[0], SWEEP[1] + 0.3));

/** anchor (m), angle for an ant at path position p */
function pose(p) {
  if (p < LH) return { x: XW - RR - (LH - p), y: 0, a: 0 };
  if (p < LH + ARC) {
    const th = (p - LH) / RR;
    return { x: XW - RR + RR * Math.sin(th), y: -RR + RR * Math.cos(th), a: -th };
  }
  return { x: XW, y: -RR - (p - LH - ARC), a: -Math.PI / 2 };
}

const ANT_COL = [34, 21, 14], AMBER_COL = [120, 62, 16];

export default {
  beat: 9,
  chapter: { num: '08', title: 'The line', sub: 'Every ant, head to tail' },
  layer: 9,
  cues(d) {
    // lock-in ticks (every other ant, rising), the bracket, then the amber charge-up
    const s = 48.292;
    const out = [];
    for (let n = 0; n < N; n += 2) out.push({ t: lockTime(n) - s, name: 'tick', gain: 0.1 + 0.006 * n, pitch: 0.9 + 0.05 * n });
    out.push({ t: 51.3 - s, name: 'blip', gain: 0.22, pitch: 1.2 });
    out.push({ t: SWEEP[0] - s, name: 'shimmer', gain: 0.28, pitch: 1.1 });
    out.push({ t: d - 0.55, name: 'riser', gain: 0.24, pitch: 1.3 });
    return out;
  },
  drawWorld(ctx, v) {
    const mpp = v.cam.mpp, len = AL / mpp;
    const k = lineK(v) * (1 - band(mpp, 6e-4, 2.5e-3));
    if (len < 1.5 || k <= 0 || v.gt < T0) return;
    const gk = glowK(v.gt);
    const col = L.mix(ANT_COL, AMBER_COL, 0.55 * gk);
    const yTop = v.cam.y - (v.cam.anchor * H + 40) * mpp, yBot = v.cam.y + ((1 - v.cam.anchor) * H + 40) * mpp;
    const xL = v.cam.x - (W / 2 + 60) * mpp, xR = v.cam.x + (W / 2 + 60) * mpp;
    if (XW < xL - LH - 0.12 || XW - LH - 0.12 > xR) return;
    ctx.save();
    if (v.gt < T1 + 0.05) {
      // ---- the procession: ant n heads for slot N-1-n
      const F = train(v.gt);
      for (let n = N - 1; n >= 0; n--) {
        const P = LH + ARC + (N - 1 - n) * AL;
        const p = Math.min(P, F - n * GAP);
        const q = pose(p);
        if (q.x < xL || q.x > xR || q.y < yTop || q.y > yBot) continue;
        const walk = clamp((P - p) / (0.6 * AL));
        const sx = v.wx(q.x), sy = v.wy(q.y);
        if (q.a === 0 && len > 7) {   // soft contact shadow on the soil
          const g = ctx.createRadialGradient(sx, sy, 0, sx, sy, len * 0.55);
          g.addColorStop(0, `rgba(10,6,3,${0.35 * k})`); g.addColorStop(1, 'rgba(10,6,3,0)');
          ctx.fillStyle = g;
          ctx.save(); ctx.translate(sx, sy); ctx.scale(1, 0.18); ctx.translate(-sx, -sy);
          ctx.fillRect(sx - len * 0.6, sy - len * 0.6, len * 1.2, len * 1.2);
          ctx.restore();
        }
        drawAnt(ctx, {
          x: sx, y: sy, len: len * 0.98, angle: q.a, walk, phase: (p / (0.3 * AL)) * 0.32 + n * 0.37,
          t: v.gt + n * 1.3, col, alpha: k,
        });
      }
    } else {
      // ---- the finished column (beat 9 end → the line's launch): only the on-screen ants, up to the tip
      const top = tip(v), n = Math.max(N, Math.floor(top / AL));
      const i0 = Math.max(0, Math.floor(-yBot / AL)), i1 = Math.min(n - 1, Math.ceil(-yTop / AL));
      for (let i = i0; i <= i1 && i - i0 < 1400; i++) {
        drawAnt(ctx, {
          x: v.wx(XW), y: v.wy(antSlotY(i)), len: len * 0.98, angle: -Math.PI / 2, walk: 0,
          t: v.gt + i * 1.3, col, alpha: k, detail: 1 - gk * 0.5,
        });
      }
    }
    // ---- the amber charge-up: a light sweep climbs the column and leaves it glowing
    if (gk > 0 || v.gt > SWEEP[0]) {
      const x = v.wx(0), y0 = v.wy(0), yT = v.wy(-tip(v));
      const sp = prog(v.gt, SWEEP[0], SWEEP[1]);
      const head = L.lerp(y0, yT, ease.inOutCubic(sp));
      ctx.globalCompositeOperation = 'lighter';
      // residual glow along the swept part
      const lg = ctx.createLinearGradient(0, y0, 0, yT);
      lg.addColorStop(0, L.rgba([255, 170, 70], 0.0));
      lg.addColorStop(0.05, L.rgba([255, 170, 70], 0.32 * gk * k));
      lg.addColorStop(1, L.rgba([255, 190, 90], 0.32 * gk * k));
      ctx.fillStyle = lg;
      const wGlow = Math.max(10, len * 0.55);
      ctx.save();
      ctx.beginPath(); ctx.rect(0, head, W, Math.max(0, y0 - head)); ctx.clip();
      ctx.filter = 'blur(10px)';
      ctx.fillRect(x - wGlow / 2, Math.min(yT, y0), wGlow, Math.abs(y0 - yT));
      ctx.filter = 'none';
      ctx.restore();
      if (sp > 0 && sp < 1) {
        L.lightBlob(ctx, x, head, 70, [255, 200, 120], 0.6 * k * Math.sin(Math.PI * sp));
        L.lightBlob(ctx, x, head, 16, [255, 245, 220], 0.9 * k * Math.sin(Math.PI * sp));
      }
      ctx.globalCompositeOperation = 'source-over';
    }
    ctx.restore();
  },
  drawOverlay(ctx, v) {
    // "0.5 cm EACH": a bracket on one ant, on "half a centimeter" (≈ 51.0 s)
    const t0 = 51.3 - v.tl.scenes[9].start;
    const bk = L.enter(v.t, t0, 0.5);
    if (bk <= 0 || v.k <= 0) return;
    const yC = v.wy(antSlotY(BRACKET_SLOT)), half = v.ws(AL) / 2;
    const xB = v.wx(0) - 26;
    ctx.save();
    ctx.globalAlpha = v.k;
    // the measured ant gets a soft halo so the eye finds it
    L.lightBlob(ctx, v.wx(0), yC, half * 1.6, [255, 220, 160], 0.18 * bk);
    const acc = v.accent;
    const e = ease.outCubic(bk);
    const a = L.lerp(yC, yC - half, e), b = L.lerp(yC, yC + half, e);
    ctx.strokeStyle = L.rgba(acc, 1);
    ctx.shadowColor = 'rgba(0,0,0,0.55)';
    ctx.shadowBlur = 8;
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(xB + 14, a); ctx.lineTo(xB, a); ctx.lineTo(xB, b); ctx.lineTo(xB + 14, b);
    ctx.stroke();
    // label, right-aligned left of the bracket: big "0.5 cm" + small "EACH"
    const tk = L.enter(v.t, t0 + 0.12, 0.45);
    ctx.globalAlpha = v.k * tk;
    ctx.textBaseline = 'alphabetic';
    ctx.shadowColor = 'rgba(0,0,0,0.6)';
    ctx.shadowBlur = 16;
    const xr = xB - 22, maxW = xr - 90;
    const big = '0.5 cm';
    const bs = L.fitSize(ctx, big, maxW, 104, 800, L.FONT.display, 50);
    ctx.font = L.font(bs, 800, L.FONT.display);
    ctx.fillStyle = L.rgba(acc);
    L.trackedText(ctx, big, xr + (1 - tk) * -16, yC + bs * 0.18, -1, 'right');
    ctx.shadowBlur = 8;
    ctx.font = L.font(30, 600, L.FONT.body);
    ctx.fillStyle = 'rgba(232,228,218,0.95)';
    L.trackedText(ctx, 'EACH', xr + (1 - tk) * -16, yC + bs * 0.18 + 46, 6, 'right');
    // leader tick from label to bracket
    ctx.shadowBlur = 0;
    ctx.restore();
  },
};
