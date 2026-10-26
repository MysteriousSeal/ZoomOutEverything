// Preroll (17c) — cold-open hook: "Right now, your body is replacing almost four million cells, every second." (worded as 17b)
// The engine replays the film's renewal payoff in slow motion (episode.json preroll.from: 17c beat 10 / 17 beat 15,
// just after "…three hundred thirty BILLION": the whole glass body full of renewal sparks at their peak, the lock's
// warm flash still decaying), with scene overlays off (preroll.overlays = false), so the film's "330 BILLION" label
// never clashes with the headline. The cell-replacement visual (the sparks) is on screen from frame 1.
// This layer adds the two-line headline, fully on screen from frame 1 (no fade-in), in the clear band above the head
// (head top ≈ y 560 at this framing; the HUD is off during the preroll), on a soft dark backing (no hard band).
// The headline holds to the cut (engine: v.k drops only in the last 0.12 s).
import * as L from '../../../../engine/runtime/lib.js';
import { ACCENT, P, SIZE } from '../env.js';

const { W } = L;
const MAXW = 940;   // 70 px side margins
const Y1 = 366;     // first baseline: the block spans y ≈ 290-475, above the head (≈ 545 after the x1.5 reframe)
const Z = 1.5, SX = 540 - 540 / 1.5, SY = 240;   // preroll reframe (ported from 17b): source rect origin (film px) and scale
const L1A = 'YOU REPLACE ', L1B = '4 MILLION', L1C = ' CELLS', L2 = 'EVERY SECOND';

/** centred line at size `s`, parts = [[text, colour], ...] */
function line(ctx, parts, y, s) {
  const text = parts.map((p) => p[0]).join('');
  ctx.font = L.font(s, 800, L.FONT.display);
  let x = W / 2 - ctx.measureText(text).width / 2;
  ctx.textAlign = 'left';
  for (const [t, c] of parts) { ctx.fillStyle = c; ctx.fillText(t, x, y); x += ctx.measureText(t).width; }
}

export default {
  cues(d) {
    const out = [
      { t: 0.0, name: 'swell', gain: 0.3, pitch: 0.8 },
      { t: 0.05, name: 'shimmer', gain: 0.2, pitch: 1.0 },
      { t: d - 0.15, name: 'whoosh', gain: 0.32, pitch: 1.2 },
    ];
    // a soft tick on every real second ("every second")
    for (let s = 0; s < d - 0.4; s += 1) out.push({ t: s + 0.02, name: 'tick', gain: s === 0 ? 0.2 : 0.14, pitch: 1.3 });
    return out;
  },
  // ported from 17b: frame the replay tighter (x1.5 about the body). The film's whole-body framing left the figure small
  // with the lower third of the frame empty; the world layers are already drawn, so re-draw them enlarged in place.
  drawWorld(ctx, v) {
    const cv = ctx.canvas, f = cv.width / W;
    const sw = W / Z, sh = L.H / Z;
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
    ctx.filter = 'none';
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(cv, SX * f, SY * f, sw * f, sh * f, 0, 0, cv.width, cv.height);
    ctx.restore();
    // the real-time second: a ring opens out of the stopwatch on every whole second of the preroll (from frame 1),
    // drawn crisp AFTER the enlargement, at the stopwatch's enlarged position
    const tf = Math.round(v.t * 30) / 30;
    const ph = tf % 1;
    const x = (v.wx(P.watch.x) - SX) * Z, y = (v.wy(P.watch.y) - SY) * Z, R = Math.max(10, v.ws(SIZE.watchR) * 1.25 * Z);
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const pr = R * (1 + 2.6 * L.ease.outCubic(ph));
    const a = (1 - ph) * (1 - ph);
    ctx.strokeStyle = L.rgba(ACCENT, 0.85 * a); ctx.lineWidth = 3;
    ctx.shadowColor = L.rgba(ACCENT, 1); ctx.shadowBlur = 12;
    ctx.beginPath(); ctx.arc(x, y, Math.max(0, pr), 0, Math.PI * 2); ctx.stroke();
    ctx.restore();
    L.lightBlob(ctx, x, y, R * 2.4, ACCENT, 0.22 * Math.exp(-ph * 5));
  },
  drawOverlay(ctx, v) {
    if (v.k <= 0) return;
    ctx.save();
    ctx.globalAlpha = v.k;
    ctx.textBaseline = 'alphabetic';
    const s = Math.min(
      L.fitSize(ctx, L1A + L1B + L1C, MAXW, 84, 800, L.FONT.display, 40),
      L.fitSize(ctx, L2, MAXW, 84, 800, L.FONT.display, 40));
    const y2 = Y1 + Math.round(s * 1.18);
    // soft backing so the type never sits on a bright spark or the glowing body (no hard band)
    const g = ctx.createLinearGradient(0, Y1 - s * 1.6, 0, y2 + s * 0.9);
    g.addColorStop(0, 'rgba(2,4,10,0)'); g.addColorStop(0.3, 'rgba(2,4,10,0.55)');
    g.addColorStop(0.7, 'rgba(2,4,10,0.55)'); g.addColorStop(1, 'rgba(2,4,10,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, Y1 - s * 1.6, W, y2 - Y1 + s * 2.5);
    ctx.shadowColor = 'rgba(0,0,0,0.85)';
    ctx.shadowBlur = 10;
    ctx.shadowOffsetY = 2;
    const white = 'rgb(246,242,236)';
    line(ctx, [[L1A, white], [L1B, L.rgba(v.accent)], [L1C, white]], Y1, s);
    line(ctx, [[L2, white]], y2, s);
    ctx.restore();
  },
};
