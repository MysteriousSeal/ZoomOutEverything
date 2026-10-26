// Beat 0 (03b) — cold open: the ending's payoff as the first frame. The whole water column, Everest already falling
// on frame 1 (slow motion), plunging through the surface and vanishing into the Mariana Trench, with ~2 km of water
// left above its summit. The headline is fully on screen from frame 1 (no type-on), so the first second already asks
// the question. Replays the trench scene's drop (s6-trench.js `parts`) on its own clock.
import * as L from '../../../../engine/runtime/lib.js';
import { COLD } from '../camera.js';
import { parts } from './s6-trench.js';

const { W, ease, clamp, prog } = L;
const { times, everestY, splashT, drawDust, drawEverest, drawSplash, drawImpact, drawBracket, FX, EV_H, BRACKET_DX } = parts;
const TRENCH_FLOOR = 10935;
const INK = [10, 30, 52];   // the title card's navy (s0-surface.js)

const d7 = (v) => v.tl.scenes[7].end - v.tl.scenes[7].start;   // the trench beat's duration drives its timeline
/** cold-open time -> the trench scene's clock: slow-motion fall, then real time from the landing on */
function trenchT(t, T) {
  return t < COLD.land ? T.drop + COLD.skip + Math.max(0, t) * COLD.slow : T.land + (t - COLD.land);
}
/** cold-open time of a trench-clock moment during the fall */
const coldT = (tt, T) => (tt - T.drop - COLD.skip) / COLD.slow;

function view(v) {
  const d = d7(v), T = times(d);
  // overlay visibility: on from frame 1 (no fade-in), out over the last 0.3 s before the cut to the title
  const k = 1 - ease.inCubic(prog(v.t, v.d - 0.32, 0.3));
  return { T, w: { ...v, t: trenchT(v.t, T), d, k } };
}

/** text with a soft dark halo (sky and water behind it) */
function halo(ctx, fn) {
  ctx.save();
  ctx.shadowColor = 'rgba(2,10,20,0.75)';
  ctx.shadowBlur = 18;
  fn();
  ctx.restore();
}

export default {
  beat: 0,
  chapter: null,
  captions: false,
  overlayIn: false,   // the hook headline is fully readable on frame 1
  layer: 2,
  cues(d) {
    // fixed trench timeline offsets (s6-trench: FALL 0.72 s; splash when the summit crosses the surface)
    const fall = 0.72, land = COLD.land;
    const T = { drop: 0, land: fall };
    const sp = coldT(splashT(T), T);
    return [
      { t: 0.0, name: 'whoosh', gain: 0.45, pitch: 0.55 },
      { t: 0.02, name: 'riser', gain: 0.2, pitch: 0.7 },
      { t: Math.max(0.05, sp), name: 'splash', gain: 0.5, pitch: 0.55 },
      { t: land, name: 'impact', gain: 0.65, pitch: 0.6 },
      { t: land + 0.02, name: 'deep', gain: 0.55, pitch: 0.6 },
      { t: land + 0.25, name: 'bubbles', gain: 0.18, pitch: 0.7 },
      { t: land + 0.35, name: 'swish', gain: 0.22, pitch: 0.9 },
      { t: land + 0.7, name: 'bloom', gain: 0.28, pitch: 1 },
      { t: d - 0.12, name: 'swish', gain: 0.3, pitch: 1.1 },
    ];
  },

  drawWorld(ctx, v) {
    if (!v.active) return;
    const { T, w } = view(v);
    drawDust(ctx, w, T);
    drawEverest(ctx, w, T);
    drawSplash(ctx, w, T);
    drawImpact(ctx, w, T);
    drawBracket(ctx, w, T);
  },

  drawOverlay(ctx, v) {
    if (!v.active) return;
    const { T, w } = view(v);
    const k = w.k;
    if (k <= 0) return;
    ctx.save();
    ctx.globalAlpha = k;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    // 1. headline, on screen from frame 1, in the title card's style (navy ink on the bright sky, accent block):
    //    DROP [EVEREST] / INTO THE DEEPEST OCEAN
    {
      ctx.font = L.font(118, 800, L.FONT.display);
      const a = 'DROP ', b = 'EVEREST';
      const wa = ctx.measureText(a).width, wb = ctx.measureText(b).width;
      const x = W / 2 - (wa + wb + 24) / 2;
      ctx.textAlign = 'left';
      ctx.fillStyle = L.rgba(INK);
      ctx.fillText(a, x, 345);
      ctx.fillStyle = L.rgba(v.accent, 0.95);
      ctx.fillRect(x + wa - 8, 345 - 104, wb + 40, 124);
      ctx.fillStyle = L.rgba([4, 22, 34]);
      ctx.fillText(b, x + wa + 12, 345);
      ctx.textAlign = 'center';
      ctx.fillStyle = L.rgba(INK);
      ctx.font = L.font(L.fitSize(ctx, 'INTO THE DEEPEST OCEAN', 900, 76, 800, L.FONT.display, 40), 800, L.FONT.display);
      ctx.fillText('INTO THE DEEPEST OCEAN', W / 2, 452);
    }
    // 2. after the landing: the payoff tag beside the bracket (surface → summit)
    const pk = L.enter(v.t, COLD.land + 0.55, 0.5);
    if (pk > 0) {
      const off = everestY(w.t, T) || 0;
      const peakY = v.wy(TRENCH_FLOOR + off - EV_H), surfY = v.wy(0);
      const x = v.wx(FX) + BRACKET_DX + 34, y = (peakY + surfY) / 2 + 16;
      ctx.globalAlpha = k * pk;
      ctx.textAlign = 'left';
      halo(ctx, () => {
        ctx.font = L.font(70, 800, L.FONT.display);
        ctx.fillStyle = L.rgba(v.accent);
        ctx.fillText('≈ 2 km', x, y + (1 - pk) * 12);
        ctx.font = L.font(22, 700, L.FONT.body);
        ctx.fillStyle = 'rgba(220,232,242,0.95)';
        L.trackedText(ctx, 'OF WATER STILL ABOVE IT', x + 2, y + 34 + (1 - pk) * 12, 2.5);
      });
      // Everest name tag on the rock
      const ey = v.wy(TRENCH_FLOOR + off - EV_H * 0.42);
      halo(ctx, () => {
        ctx.textAlign = 'center';
        ctx.font = L.font(40, 700, L.FONT.display);
        ctx.fillStyle = '#fff';
        L.trackedText(ctx, 'EVEREST', v.wx(FX), ey, 6, 'center');
        ctx.font = L.font(24, 700, L.FONT.din);
        ctx.fillStyle = 'rgba(205,215,230,0.9)';
        L.trackedText(ctx, '8,849 m', v.wx(FX), ey + 32, 2, 'center');
      });
    }
    // 3. the floor: where it landed
    const fk = L.enter(v.t, COLD.land + 0.9, 0.5);
    if (fk > 0) {
      ctx.globalAlpha = k * fk;
      halo(ctx, () => {
        ctx.textAlign = 'left';
        ctx.font = L.font(22, 700, L.FONT.body);
        ctx.fillStyle = 'rgba(220,232,242,0.9)';
        const fy = v.wy(TRENCH_FLOOR) - 18;
        L.trackedText(ctx, 'MARIANA TRENCH · 10,935 m', v.wx(-2250) + 14, Math.min(fy, 1440), 2);
      });
    }
    ctx.restore();
    void clamp;
  },
};
