// Beat 0 — the hook. Macro, ground level: ONE real-anatomy worker ant (5 mm) walks right across bare soil, antennae
// tapping, feet planted (gait phase driven by distance), with a soft contact shadow and a warm back-light rim.
// Headline HOW MANY / [ANTS] ON EARTH? is fully readable on the beat's first frame (no fade-in), in the clear meadow
// band y 330–620, and rises out of its own window at the end of the beat.
// The hero ant stays in the world: in beat 1 it hurries to the stone colony's entrance (s01) and stops there,
// antennae to antennae with the guard; it is culled once it is smaller than ~1 px (beat 2).
import * as L from '../../../../engine/runtime/lib.js';
import { drawAnt, gaitPhase } from '../ant.js';
import { ANT_LEN } from '../env.js';

const { W } = L;
const INK = [16, 22, 14];
export const HERO_COL = [38, 22, 14];
/** Where the hero stops (x of the point under its mesosoma): just left of the colony entrance at the stone's edge. */
export const HERO_STOP = 0.0722;
const X0 = -0.0036;          // start of beat 0
const V0 = 0.0021;           // m/s while exploring in beat 0 (≈ 1.4 strides/s)
/** Hero ant x (m) at film time gt: slow walk in beat 0, then a smooth Hermite run (peak ≈ 3.5 cm/s, a real Lasius
 *  pace) to HERO_STOP, arriving ~1.3 s before the colony label lands. */
export function heroX(gt, tl) {
  const tA = tl.scenes[0].start, tB = tl.scenes[1].start + 0.1, tC = tl.scenes[1].start + 3.0;
  if (gt <= tA) return X0;
  if (gt <= tB) return X0 + V0 * (gt - tA);
  const xB = X0 + V0 * (tB - tA);
  if (gt >= tC) return HERO_STOP;
  const D = tC - tB, s = (gt - tB) / D, s2 = s * s, s3 = s2 * s;
  const h10 = s3 - 2 * s2 + s, h01 = -2 * s3 + 3 * s2, h00 = 2 * s3 - 3 * s2 + 1;
  return h00 * xB + h10 * D * V0 + h01 * HERO_STOP;
}
/** stride amplitude: walking until it reaches the stop, then the legs settle */
function heroWalk(gt, tl) {
  const tC = tl.scenes[1].start + 3.0;
  return 1 - L.smoothstep(L.clamp(L.invLerp(tC - 0.35, tC + 0.1, gt)));
}

/** Draw the hero ant (world-anchored). Exported so other scenes could reuse the exact same hero if needed. */
export function drawHero(ctx, v) {
  const end = v.tl.scenes[3].start;
  if (v.gt > end || v.gt < v.tl.scenes[0].start - 0.2) return;
  const len = ANT_LEN / v.cam.mpp;
  if (len < 0.8) return;
  const xw = heroX(v.gt, v.tl);
  const sx = v.wx(xw), sy = v.wy(0);
  if (sx < -len * 1.2 || sx > W + len * 1.2 || sy < -len || sy > L.H + len) return;
  const walk = heroWalk(v.gt, v.tl);
  const o = { x: sx, y: sy, len, phase: gaitPhase(xw - X0), walk, t: v.gt * 1.15, col: HERO_COL };
  if (len > 6) {
    // contact shadow: a soft ellipse under the body, darker under the legs
    const g = ctx.createRadialGradient(sx, sy, 0, sx, sy, len * 0.55);
    g.addColorStop(0, 'rgba(10,6,3,0.42)');
    g.addColorStop(0.6, 'rgba(10,6,3,0.16)');
    g.addColorStop(1, 'rgba(10,6,3,0)');
    ctx.save();
    ctx.translate(sx - len * 0.02, sy + len * 0.004);
    ctx.scale(1, 0.085);
    ctx.translate(-sx, -sy);
    ctx.fillStyle = g;
    ctx.fillRect(sx - len * 0.6, sy - len * 0.6, len * 1.2, len * 1.2);
    ctx.restore();
  }
  if (len > 30) {
    // warm back-light rim (sun upper right): the same ant, lit, offset toward the light, under the real one
    const off = Math.min(2.2, len * 0.008);
    drawAnt(ctx, { ...o, x: sx + off, y: sy - off, col: [235, 190, 130], alpha: 0.55, detail: 0 });
  }
  drawAnt(ctx, o);
}

/** A soft, borderless dark scrim behind a left-aligned label block (keeps amber + grey type readable over a bright
 *  meadow or sky). x, y = label baseline; w, h = block size. */
export function labelScrim(ctx, x, y, w, h, k, a = 0.5) {
  if (k <= 0) return;
  const cx = x + w * 0.42, cy = y - h * 0.35;
  ctx.save();
  ctx.globalAlpha *= k;
  ctx.translate(cx, cy);
  ctx.scale(1, h / w);
  const g = ctx.createRadialGradient(0, 0, 0, 0, 0, w * 0.75);
  g.addColorStop(0, `rgba(8,12,10,${a})`);
  g.addColorStop(0.55, `rgba(8,12,10,${a * 0.6})`);
  g.addColorStop(1, 'rgba(8,12,10,0)');
  ctx.fillStyle = g;
  ctx.fillRect(-w * 0.8, -w * 0.8, w * 1.6, w * 1.6);
  ctx.restore();
}

// ------------------------------------------------------------------ headline
const LINES = [
  { parts: [['HOW MANY', false]], y: 470, size: 156 },
  { parts: [['ANTS', true], [' ON EARTH?', false]], y: 640, size: 148 },
];
const MAXW = 940;

export default {
  beat: 0,
  chapter: null,
  captions: false,          // the headline IS the line; captions return in beat 1
  overlayIn: false,         // readable on frame 1
  layer: 6,
  cues(d) {
    return [
      { t: 0.0, name: 'swell', gain: 0.22, pitch: 0.9 },
      { t: 0.05, name: 'tick', gain: 0.22, pitch: 1.3 },
      { t: 0.9, name: 'blip', gain: 0.16, pitch: 1.5 },
      { t: 1.6, name: 'blip', gain: 0.14, pitch: 1.7 },
      { t: d - 0.45, name: 'swish', gain: 0.26, pitch: 1.0 },
    ];
  },
  drawWorld(ctx, v) {
    drawHero(ctx, v);
  },
  drawOverlay(ctx, v) {
    const t = v.t, d = v.d;
    if (t > d + 0.2) return;
    ctx.save();
    ctx.textBaseline = 'alphabetic';
    // fit both lines to the same box; line 2 carries the accent bar padding
    const sizes = LINES.map((ln) => {
      const s = ln.parts.map((p) => p[0]).join('');
      return L.fitSize(ctx, s, MAXW - (ln.parts.some((p) => p[1]) ? 60 : 0), ln.size, 800, L.FONT.display, 60);
    });
    // a thin accent rule above the headline (on from frame 1, retracts on exit)
    const rk = 1 - L.enter(t, d - 0.55, 0.3, L.ease.inCubic);
    if (rk > 0) {
      ctx.fillStyle = L.rgba(INK, 0.85);
      ctx.fillRect(W / 2 - 60 * rk, 316, 120 * rk, 5);
    }
    LINES.forEach((ln, i) => {
      const size = sizes[i];
      const kout = L.enter(t, d - 0.5 + i * 0.06, 0.32, L.ease.inCubic);
      if (kout >= 1) return;
      // a gentle settle: tracking eases from +3 px to −1 px over the first 1.2 s (never unreadable)
      const settle = L.ease.outCubic(L.prog(t, 0, 1.2));
      const track = L.lerp(3, -1, settle);
      ctx.font = L.font(size, 800, L.FONT.display);
      ctx.letterSpacing = `${track}px`;
      const widths = ln.parts.map(([s]) => ctx.measureText(s).width);
      ctx.letterSpacing = '0px';
      const total = widths.reduce((a, b) => a + b, 0);
      let x = W / 2 - total / 2 + (ln.parts[0][1] ? 10 : 0);
      const top = ln.y - size * 0.78, bot = ln.y + size * 0.08;
      const lift = -kout * (size * 1.05 + 60);
      ln.parts.forEach(([s, acc], j) => {
        const w = widths[j];
        ctx.save();
        ctx.beginPath(); ctx.rect(0, top - 22, W, bot - top + 44); ctx.clip();
        ctx.translate(0, lift);
        if (acc) {
          const bx = x - 22, bw = w + 34;
          ctx.shadowColor = 'rgba(30,20,6,0.35)'; ctx.shadowBlur = 26; ctx.shadowOffsetY = 8;
          ctx.fillStyle = L.rgba(v.accent);
          ctx.fillRect(bx, top - 16, bw, bot - top + 32);
          ctx.shadowColor = 'transparent';
          // one soft light sweep across the bar
          const sw = L.prog(t, 0.35, 1.0);
          if (sw > 0 && sw < 1) {
            const gx = L.lerp(bx - 120, bx + bw + 120, L.ease.inOutCubic(sw));
            const g = ctx.createLinearGradient(gx - 90, 0, gx + 90, 0);
            g.addColorStop(0, 'rgba(255,255,255,0)');
            g.addColorStop(0.5, 'rgba(255,250,235,0.38)');
            g.addColorStop(1, 'rgba(255,255,255,0)');
            ctx.fillStyle = g;
            ctx.fillRect(bx, top - 16, bw, bot - top + 32);
          }
          ctx.fillStyle = L.rgba([22, 14, 6]);
        } else {
          ctx.shadowColor = 'rgba(235,240,220,0.35)';
          ctx.shadowBlur = 20;
          ctx.fillStyle = L.rgba(INK);
        }
        L.trackedText(ctx, s, x + (acc ? -6 : 0), ln.y, track, 'left');
        ctx.restore();
        x += w;
      });
    });
    ctx.restore();
  },
};
