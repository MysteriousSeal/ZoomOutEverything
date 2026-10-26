// Preroll (13c) — cold-open hook: "If Earth stopped spinning, | winds would blow at over 1,000 km/h."
// The engine replays the film's air-ripping-east payoff (episode.json preroll.from: the winds beat (13c: beat 3), 1.2 s in, the camera
// finishing its pull-out over the equator district at ~3 m/px with the gale at full strength) at 0.35x (13c). Scene overlays
// are off (preroll.overlays = false), so the film's "> 1,000 km/h" label does not clash with the headline.
//
// This layer RE-DRAWS the world on top of the engine's replay (same camera, same film time), with one change: beat 4's
// streamlines and dust sheets run on a REAL-TIME wind clock and a little brighter (s04 reads v.windClock /
// v.windBoost), so the gale visibly tears east across the city while the camera and the city move in slow motion.
// The film's own east vector (s01 drawVector) runs under the headline, its chevrons streaming east.
// Over the last ~0.4 s the city dissolves into the film's first frame (13b), so the cut lands on the hook's globe.
// Headline: two lines, fully on screen from frame 1 (v.k only), on a soft dark band at the top (the HUD is off).
import * as L from '../../../../engine/runtime/lib.js';
import * as env from '../env.js';
import { at as cameraAt } from '../camera.js';
import { drawVector } from './s01-equator.js';
import s00 from './s00-hook.js';
import s01 from './s01-equator.js';
import s03 from './s03-stop.js';
import s04 from './s04-winds.js';
import s06 from './s06-bulge.js';
import s08 from './s08-one-continent.js';
import s09 from './s09-day-is-a-year.js';
import s10 from './s10-slowing-down.js';
import s11 from './s11-400-days.js';
import s13 from './s13-question.js';

const { W, H } = L;
// 13c: the same modules, in the same order, as episode.json scenes[] (index = beat)
const WORLD = [s00, s01, s03, s04, s06, s08, s09, s10, s11, s13];
const MAXW = 940;      // 70 px side margins
const Y1 = 330;        // line-1 baseline; the block spans y ≈ 270-470, the vector runs at y ≈ 560
const VEC_Y = 566;
const L1 = 'IF EARTH STOPPED SPINNING', L2A = 'WINDS OF ', L2B = '1,000+ KM/H';

/** the engine's overlay strength curve (main.js overlayK), for scenes whose world layer reads v.k */
function overlayK(tl, i, gt) {
  const s = tl.scenes[i], last = i === tl.scenes.length - 1;
  const kin = L.ease.outCubic(L.prog(gt, s.start, 0.45));
  const kout = last ? 1 : 1 - L.ease.inCubic(L.prog(gt, s.end - 0.1, 0.35));
  return Math.min(kin, kout);
}

/** The film's first frame (world layers only: space, the hook globe and its spin ring, the lighting), rendered
 *  off-screen once per frame for the dissolve out of the cold open. */
let FF = null;
function filmFirstFrame(tl, v) {
  if (!FF) FF = new OffscreenCanvas(W, H);
  const c = FF.getContext('2d');
  c.setTransform(1, 0, 0, 1, 0, 0);
  c.globalAlpha = 1;
  c.globalCompositeOperation = 'source-over';
  c.clearRect(0, 0, W, H);
  const s0 = tl.scenes[0], gt = Math.ceil(s0.start * 30 - 1e-6) / 30;   // the first film frame
  const cam = cameraAt(gt, tl);
  const an = cam.anchor ?? 0.5;
  const fv = {
    ...v, gt, cam, beat: 0, t: gt - s0.start, d: s0.end - s0.start,
    wx: (x) => W / 2 + (x - cam.x) / cam.mpp, wy: (y) => H * an + (y - cam.y) / cam.mpp, ws: (m) => m / cam.mpp,
  };
  env.drawBackground(c, fv);
  const order = WORLD.map((sc, i) => [sc.layer ?? 0, i]).sort((a, b) => a[0] - b[0]);
  for (const [, i] of order) {
    const sc = WORLD[i], s = tl.scenes[i];
    if (!sc.drawWorld) continue;
    c.save();
    sc.drawWorld(c, { ...fv, t: gt - s.start, d: s.end - s.start, k: overlayK(tl, i, gt), index: i, active: i === 0 });
    c.restore();
  }
  env.drawForeground?.(c, fv);
  return FF;
}

/** centred line at size s, parts = [[text, colour], ...] */
function line(ctx, parts, y, s) {
  const text = parts.map((p) => p[0]).join('');
  ctx.font = L.font(s, 800, L.FONT.display);
  let x = W / 2 - ctx.measureText(text).width / 2;
  ctx.textAlign = 'left';
  for (const [t, c] of parts) { ctx.fillStyle = c; ctx.fillText(t, x, y); x += ctx.measureText(t).width; }
}

export default {
  cues(d) {
    return [
      { t: 0.0, name: 'riser', gain: 0.3, pitch: 0.8 },
      { t: 0.05, name: 'whoosh', gain: 0.4, pitch: 0.6 },
      { t: 1.4, name: 'swish', gain: 0.24, pitch: 0.7 },
      { t: 2.05, name: 'whoosh', gain: 0.34, pitch: 0.7 },  // "winds…" (13c VO: 2.14 s)
      { t: 3.65, name: 'ping', gain: 0.26, pitch: 0.9 },    // "…a thousand kilometers an hour" (13c VO: 3.72 s)
      { t: d - 0.15, name: 'whoosh', gain: 0.35, pitch: 1.2 },
    ];
  },
  drawWorld(ctx, v) {
    const fgt = v.filmGt, tl = v.tl;
    const fv = {
      ...v, gt: fgt, t: fgt - tl.scenes[v.beat].start, d: tl.scenes[v.beat].end - tl.scenes[v.beat].start,
      windClock: fgt + v.t * (1 - v.ep.preroll.rate),   // advances 1 s per real second (the replay advances `rate`)
      windBoost: 1.45,
    };
    env.drawBackground(ctx, fv);
    const order = WORLD.map((s, i) => [s.layer ?? 0, i]).sort((a, b) => a[0] - b[0]);
    for (const [, i] of order) {
      const sc = WORLD[i], s = tl.scenes[i];
      if (!sc.drawWorld) continue;
      ctx.save();
      sc.drawWorld(ctx, { ...fv, t: fgt - s.start, d: s.end - s.start, k: overlayK(tl, i, fgt), index: i, active: i === fv.beat });
      ctx.restore();
    }
    env.drawForeground?.(ctx, fv);
    // 13b: the city dissolves straight into the film's first frame (the hook globe in space) over the last ~0.4 s,
    // so the cut never passes through black and the globe never pops on
    const out = L.ease.inOutCubic(L.prog(v.t, v.d - 0.42, 0.38));
    if (out > 0) {
      ctx.save();
      ctx.globalAlpha = out;
      ctx.drawImage(filmFirstFrame(tl, v), 0, 0);
      ctx.restore();
    }
  },
  drawOverlay(ctx, v) {
    if (v.k <= 0) return;
    ctx.save();
    ctx.globalAlpha = v.k;
    ctx.textBaseline = 'alphabetic';
    // two tiers, each fitted to MAXW: the setup line smaller, the payoff big
    const s2 = L.fitSize(ctx, L2A + L2B, MAXW, 124, 800, L.FONT.display, 40);
    const s1 = Math.min(L.fitSize(ctx, L1, MAXW, 90, 800, L.FONT.display, 40), Math.round(s2 * 0.7));
    const y2 = Y1 + Math.round(s2 * 1.12);
    // soft dark band behind the block (the dusty city is mid-grey)
    const top = Y1 - s1 - 70, bot = VEC_Y + 70;
    const g = ctx.createLinearGradient(0, top, 0, bot);
    g.addColorStop(0, 'rgba(4,8,14,0)');
    g.addColorStop(0.22, 'rgba(4,8,14,0.72)');
    g.addColorStop(0.78, 'rgba(4,8,14,0.72)');
    g.addColorStop(1, 'rgba(4,8,14,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, top, W, bot - top);
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.8)';
    ctx.shadowBlur = 14;
    ctx.shadowOffsetY = 2;
    line(ctx, [[L1, 'rgb(240,242,246)']], Y1, s1);
    line(ctx, [[L2A, 'rgb(240,242,246)'], [L2B, L.rgba(v.accent)]], y2, s2);
    ctx.restore();
    // the air's vector: east, chevrons streaming, full from frame 1
    drawVector(ctx, 140, VEC_Y, 800, 1, { w: 10, flow: v.t * 1.6, alpha: 1 });
    ctx.restore();
  },
};
