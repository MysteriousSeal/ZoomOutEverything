// Preroll (10b) — cold-open hook: "Squeeze the whole universe into one year, | and all of recorded history fits in the last
// twelve seconds." The engine replays the film's payoff (episode.json preroll.from, beat 9 after the dive has landed):
// 23:59 on Dec 31 as sixty second cells, the last twelve (11:59:48 PM to midnight) lit. Scene overlays are off
// (preroll.overlays = false).
//
// This layer RE-DRAWS the world with its own framing, on top of the engine's replay:
//  - every scene's world layer except beat 9's (no Columbus ship / sea line / 1.2 s bracket: the headline is about
//    recorded history, not Columbus);
//  - a slow push-in on 23:59 (grid right edge pinned at x = 930, Shorts-safe; it grows down into the lower third);
//  - a soft light sweep over the twelve lit seconds, so the hold never reads as a freeze-frame.
// Then the date kicker and the 2-line headline, fully on screen from frame 1, in the dark band above the grid.
import * as L from '../../../../engine/runtime/lib.js';
import * as env from '../env.js';
import { minuteRect, secondRect } from '../camera.js';
import s00 from './s00-hook.js';
import s01 from './s01-big-bang.js';
import s02 from './s02-one-day.js';
import s03 from './s03-sun.js';
import s04 from './s04-first-life.js';
import s05 from './s05-microbes.js';
import s06 from './s06-dinosaurs.js';
import s07 from './s07-humans.js';
import s08 from './s08-history.js';
import s10 from './s10-you.js';
import s11 from './s11-fifth-second.js';
import s12 from './s12-arrived.js';
import s13 from './s13-question.js';

const { W } = L;
const MAXW = 940;   // 70 px side margins
const KICK_Y = 196; // kicker baseline
const Y1 = 312;     // first headline baseline
const INK = 'rgb(240,234,246)';

// world layers to replay (episode order, beat 9 = s09-columbus left out on purpose)
const WORLD = [s00, s01, s02, s03, s04, s05, s06, s07, s08, null, s10, s11, s12, s13];

// framing of 23:59 (10 x 6 second cells): right edge pinned, top under the headline, width eased up over the preroll
const M59 = minuteRect(59);
const RIGHT = 930, TOP = 474, W0 = 830, W1 = 900;   // at W1 the grid spans y 474–1474 (bottom 18% stays clear)
const LIT0 = 48;
const CASCADE = 5.55;   // real time of "last twelve seconds" in 10b's cold-open line (phrase 2: 3.35–6.80 s; 1.24 s before its end, as in 10c)

/** a view of the film world (film time) with this preroll's own framing */
function framed(v) {
  const fgt = v.filmGt;
  const u = 0.5 - 0.5 * Math.cos(Math.PI * L.clamp(v.t / Math.max(0.1, v.d)));
  const k = L.lerp(W0, W1, u) / M59.w;               // px per world unit
  const x0 = RIGHT - M59.w * k;
  const fv = {
    ...v, gt: fgt,
    t: fgt - v.tl.scenes[v.beat].start, d: v.tl.scenes[v.beat].end - v.tl.scenes[v.beat].start,
    cam: { ...v.cam, mpp: 1 / k },
    wx: (x) => x0 + (x - M59.x) * k,
    wy: (y) => TOP + (y - M59.y) * k,
    ws: (m) => m * k,
  };
  fv.visibleY = (y0, y1, pad = 200) => fv.wy(y1) > -pad && fv.wy(y0) < L.H + pad;
  return fv;
}

/** centred line, parts = [[text, colour], ...]; one shared size `s` */
function line(ctx, parts, y, s) {
  const text = parts.map((p) => p[0]).join('');
  ctx.font = L.font(s, 800, L.FONT.display);
  let x = W / 2 - ctx.measureText(text).width / 2;
  ctx.textAlign = 'left';
  for (const [t, c] of parts) { ctx.fillStyle = c; ctx.fillText(t, x, y); x += ctx.measureText(t).width; }
}

const L1 = 'ALL OF RECORDED HISTORY', L2A = 'FITS IN THE ', L2B = 'LAST 12 SECONDS';
const KICK = 'DEC 31  ·  11:59:48 PM TO MIDNIGHT';

export default {
  cues(d) {
    return [
      { t: 0.0, name: 'riser', gain: 0.3, pitch: 0.9 },
      { t: 0.25, name: 'bloom', gain: 0.24, pitch: 1.0 },
      { t: 5.9, name: 'ping', gain: 0.26, pitch: 1.2 },
      { t: d - 0.15, name: 'whoosh', gain: 0.35, pitch: 1.2 },
    ];
  },
  drawWorld(ctx, v) {
    const fv = framed(v);
    // the background + calendar (no caption-aware label fading: the preroll has no captions)
    env.drawBackground(ctx, { ...fv, tl: { ...fv.tl, lines: [] } });
    const order = WORLD.map((s, i) => [s?.layer ?? 0, i]).sort((a, b) => a[0] - b[0]);
    for (const [, i] of order) {
      const sc = WORLD[i], s = fv.tl.scenes[i];
      if (!sc?.drawWorld || !s) continue;
      ctx.save();
      sc.drawWorld(ctx, { ...fv, t: fv.gt - s.start, d: s.end - s.start, k: 1, index: i, active: i === fv.beat });
      ctx.restore();
    }
    // fade the neighbouring minute cells' outlines (23:49 above, 23:58 left) so only 23:59's grid reads
    const gx = fv.wx(M59.x), gy = fv.wy(M59.y), gw = fv.ws(M59.w), gh = fv.ws(M59.h), m = 10;
    const bg = ctx.createRadialGradient(W / 2, L.H * 0.45, 40, W / 2, L.H * 0.5, L.H * 0.85);
    bg.addColorStop(0, '#120c16'); bg.addColorStop(1, '#040306');
    ctx.save();
    ctx.globalAlpha = 0.9;
    ctx.fillStyle = bg;
    ctx.beginPath();
    ctx.rect(0, 0, W, L.H);
    ctx.rect(gx - m, gy - m, gw + 2 * m, gh + 2 * m);
    ctx.fill('evenodd');
    ctx.restore();
    // a soft light sweep across the twelve lit seconds (one pass every 2.7 s)
    const P = 2.7, u = ((v.t + 1.2) % P) / P;
    const a = fv.wx(secondRect(LIT0).x), b = fv.wx(secondRect(59).x + secondRect(59).w);
    const bw = 300, cx = L.lerp(a - bw, b + bw, u);
    const g = ctx.createLinearGradient(cx - bw, 0, cx + bw, 0);
    g.addColorStop(0, 'rgba(255,225,250,0)');
    g.addColorStop(0.5, 'rgba(255,225,250,0.16)');
    g.addColorStop(1, 'rgba(255,225,250,0)');
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = g;
    for (let s = LIT0; s < 60; s++) {
      const r = secondRect(s), p = r.w * 0.03;
      ctx.fillRect(fv.wx(r.x + p), fv.wy(r.y + p), fv.ws(r.w - 2 * p), fv.ws(r.h - 2 * p));
    }
    ctx.restore();
    // "…the last twelve seconds": the twelve lit seconds ignite one after another on the words (a visible event in the hold)
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (let s = LIT0; s < 60; s++) {
      const age = v.t - (CASCADE + (s - LIT0) * 0.06);
      if (age < 0) continue;
      const f = L.ease.outCubic(L.clamp(age / 0.08)) * Math.exp(-age / 0.45);
      if (f < 0.004) continue;
      const r = secondRect(s), p = r.w * 0.03;
      const x = fv.wx(r.x + p), y = fv.wy(r.y + p), w = fv.ws(r.w - 2 * p), h = fv.ws(r.h - 2 * p);
      ctx.fillStyle = `rgba(255,215,248,${0.3 * f})`;
      ctx.fillRect(x, y, w, h);
      ctx.strokeStyle = `rgba(255,235,252,${0.85 * f})`;
      ctx.lineWidth = 2;
      ctx.strokeRect(x + 1, y + 1, w - 2, h - 2);
    }
    ctx.restore();
    // the grid steps back into the background over the last 0.3 s (with the headline), so the cut lands on the hook's dark opening frame
    const out = L.ease.inOutCubic(L.prog(v.t, v.d - 0.32, 0.29));
    if (out > 0) {
      ctx.save();
      ctx.globalAlpha = out;
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, W, L.H);
      ctx.restore();
    }
  },
  drawOverlay(ctx, v) {
    if (v.k <= 0) return;
    ctx.save();
    ctx.globalAlpha = v.k;
    ctx.textBaseline = 'alphabetic';
    // one shared size so the two lines read as a block; both fitted to MAXW
    const s = Math.min(
      L.fitSize(ctx, L1, MAXW, 100, 800, L.FONT.display, 40),
      L.fitSize(ctx, L2A + L2B, MAXW, 100, 800, L.FONT.display, 40));
    const y2 = Y1 + Math.round(s * 1.1);
    // soft dark backing over the whole band (flattened so it stops just above the grid's top row)
    const my = (KICK_Y - 20 + y2) / 2;
    ctx.save();
    ctx.translate(W / 2, my);
    ctx.scale(1, 0.3);
    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, 640);
    g.addColorStop(0, 'rgba(6,3,8,0.86)');
    g.addColorStop(0.6, 'rgba(6,3,8,0.7)');
    g.addColorStop(1, 'rgba(6,3,8,0)');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(0, 0, 640, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    // kicker: where on the year clock we are
    const ks = L.fitSize(ctx, KICK, 700, 28, 700, L.FONT.body, 18);
    ctx.font = L.font(ks, 700, L.FONT.body);
    ctx.fillStyle = L.rgba(v.accent, 0.95);
    L.trackedText(ctx, KICK, W / 2, KICK_Y, 4, 'center');
    ctx.shadowColor = 'rgba(0,0,0,0.7)';
    ctx.shadowBlur = 18;
    line(ctx, [[L1, INK]], Y1, s);
    line(ctx, [[L2A, INK], [L2B, L.rgba(v.accent)]], y2, s);
    ctx.restore();
  },
};
