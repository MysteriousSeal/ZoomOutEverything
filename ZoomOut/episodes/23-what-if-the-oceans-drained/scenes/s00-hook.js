// Beat 0 — the hook: "What if all the oceans drained away?" The blue planet (the Pacific, today's sea level) under the
// headline WHAT IF THE OCEANS / DRAINED?, fully readable on the beat's FIRST frame (overlayIn: false: the preroll hands
// straight over to it). No captions, no chapter card.
// Typography: a white set-up line over a bigger accent DRAINED? whose fill DRAINS — a waterline sinks through the
// letters (the part above it keeps a crisp accent outline over a faint tint, so the word always reads), with a thin
// bright meniscus at the level. Exit: the two lines lift and fade, staggered, in the beat's last ~0.5 s.
// Band: baselines 352 / 500, every line fitted ≤ 900 px; the globe's top limb is at y ≈ 525 on frame 1.
import * as L from '../../../../engine/runtime/lib.js';

const { W } = L;
const MAXW = 900;
const INK = 'rgb(242,245,248)';
const L1 = { text: 'WHAT IF THE OCEANS', y: 352, size: 112 };
const L2 = { text: 'DRAINED?', y: 500, size: 168 };

/** Fit + measure a centred line: {s, x, w, cap}. */
function lay(ctx, text, size) {
  const s = L.fitSize(ctx, text, MAXW, size, 800, L.FONT.display, 40);
  ctx.font = L.font(s, 800, L.FONT.display);
  const m = ctx.measureText(text);
  return { s, x: W / 2 - m.width / 2, w: m.width, cap: m.actualBoundingBoxAscent };
}

export default {
  beat: 0,
  chapter: null,
  captions: false,
  overlayIn: false,
  layer: 0,
  cues(d) {
    return [
      { t: 0.0, name: 'impact', gain: 0.3, pitch: 0.8 },
      { t: 0.35, name: 'bubbles', gain: 0.12, pitch: 0.8 },    // the fill starts to drain out of DRAINED?
      { t: d - 0.5, name: 'swish', gain: 0.18, pitch: 1.1 },   // the headline lifts away
    ];
  },
  drawOverlay(ctx, v) {
    if (v.k <= 0) return;
    const acc = v.accent;
    // exit: line 1 leads, line 2 follows 70 ms later
    const ex1 = L.ease.inCubic(L.prog(v.t, v.d - 0.6, 0.42));
    const ex2 = L.ease.inCubic(L.prog(v.t, v.d - 0.53, 0.42));
    ctx.save();
    ctx.globalAlpha = v.k;
    ctx.textBaseline = 'alphabetic';
    ctx.textAlign = 'left';
    // soft dark band behind the type (stars + the bright limb)
    const g = ctx.createLinearGradient(0, 190, 0, 560);
    g.addColorStop(0, 'rgba(2,6,14,0)');
    g.addColorStop(0.4, 'rgba(2,6,14,0.42)');
    g.addColorStop(1, 'rgba(2,6,14,0)');
    ctx.globalAlpha = v.k * (1 - ex2);
    ctx.fillStyle = g;
    ctx.fillRect(0, 190, W, 370);

    // line 1
    const a = lay(ctx, L1.text, L1.size);
    ctx.save();
    ctx.globalAlpha = v.k * (1 - ex1);
    ctx.shadowColor = 'rgba(0,0,0,0.75)';
    ctx.shadowBlur = 18;
    ctx.fillStyle = INK;
    ctx.fillText(L1.text, a.x, L1.y - 34 * ex1);
    ctx.restore();

    // line 2: DRAINED? with a sinking waterline
    const b = lay(ctx, L2.text, L2.size);
    const y2 = L2.y - 34 * ex2;
    const top = y2 - b.cap - 4, bot = y2 + 2;
    const drain = L.ease.inOutCubic(L.prog(v.t, 0.35, 2.1));
    const wob = Math.sin(v.t * 5.2) * 1.6 * drain * (1 - drain) * 4;
    const level = L.lerp(top, L.lerp(top, bot, 0.58), drain);     // the water surface inside the letters
    ctx.save();
    ctx.globalAlpha = v.k * (1 - ex2);
    // shadow pass (whole word) so the outline half still separates from the stars
    ctx.shadowColor = 'rgba(0,0,0,0.7)';
    ctx.shadowBlur = 18;
    ctx.fillStyle = L.rgba(acc, 0.16);
    ctx.fillText(L2.text, b.x, y2);
    ctx.shadowBlur = 0;
    // the empty part: crisp accent outline
    ctx.lineJoin = 'round';
    ctx.lineWidth = 3;
    ctx.strokeStyle = L.rgba(L.mix(acc, [255, 255, 255], 0.15), 0.95);
    ctx.strokeText(L2.text, b.x, y2);
    // the water: solid accent below the (slightly wavy) level
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(b.x - 10, bot + 20);
    const n = 24;
    for (let i = 0; i <= n; i++) {
      const x = b.x - 10 + (b.w + 20) * i / n;
      ctx.lineTo(x, level + wob * Math.sin(i * 0.9 + v.t * 3.1));
    }
    ctx.lineTo(b.x + b.w + 10, bot + 20);
    ctx.closePath();
    ctx.clip();
    const wg = ctx.createLinearGradient(0, top, 0, bot);
    wg.addColorStop(0, L.rgba(L.mix(acc, [255, 255, 255], 0.25)));
    wg.addColorStop(1, L.rgba(L.mix(acc, [10, 60, 140], 0.35)));
    ctx.fillStyle = wg;
    ctx.fillText(L2.text, b.x, y2);
    ctx.restore();
    // meniscus: a thin bright line at the level, only inside the letters
    if (drain > 0.02) {
      ctx.save();
      ctx.beginPath();
      ctx.rect(b.x - 10, level - 3 + wob, b.w + 20, 6);
      ctx.clip();
      ctx.fillStyle = 'rgba(235,248,255,0.85)';
      ctx.fillText(L2.text, b.x, y2);
      ctx.restore();
    }
    ctx.restore();
    ctx.restore();
  },
};
