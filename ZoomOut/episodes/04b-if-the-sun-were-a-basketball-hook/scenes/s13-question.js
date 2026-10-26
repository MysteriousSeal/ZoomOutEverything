// Beat 14 (04b) — the closing question, over the held final frame: "Now guess: at this scale, how far is the center of
// our galaxy? Across the world, the Moon, or a hundred times farther? Comment your guess."
// Answer (for the pinned reply, NOT shown): C. 26,000 ly / 5.8 billion ≈ 42 million km ≈ 110× the Earth–Moon distance.
// Layout is computed top-down from real text metrics: every line is fitted to its box and every gap is explicit,
// so nothing can overflow the card or collide (the 03b lesson).
import * as L from '../../../../engine/runtime/lib.js';

const { W, ease, clamp, prog } = L;
const CARD = { x: 80, w: 840, pad: 56, top: 470 };       // Shorts-safe: right edge 920 (< 940), bottom kept < 1400
const INNER = CARD.w - 2 * CARD.pad;                      // 728 px of text width
const PILL = { h: 76, gap: 16, disc: 26, textX: 86, right: 30 };
const CHOICES = [
  { key: 'A', name: 'ACROSS THE WORLD', phrase: 1, at: 0.0 },
  { key: 'B', name: 'THE MOON', phrase: 1, at: 0.62 },
  { key: 'C', name: '100× FARTHER THAN THE MOON', phrase: 2, at: 0.1 },
];

/** phrase i of this beat's line, in beat-relative seconds */
function phrase(v, i) {
  const ln = v.tl.lines[v.index], s0 = v.tl.scenes[v.index].start, ph = ln.phrases ?? [ln];
  const p = ph[Math.min(i, ph.length - 1)];
  return { start: p.start - s0, end: p.end - s0 };
}

/** draw `parts` ([[text, colour], ...]) left-aligned at (x, y) with one shared font size fitted to maxW */
function fitted(ctx, parts, x, y, maxW, size, weight = 800, family = L.FONT.display, min = 40) {
  const text = parts.map((p) => p[0]).join('');
  const s = L.fitSize(ctx, text, maxW, size, weight, family, min);
  ctx.font = L.font(s, weight, family);
  for (const [t, col] of parts) { ctx.fillStyle = col; ctx.fillText(t, x, y); x += ctx.measureText(t).width; }
  return s;
}

export default {
  beat: 14,
  chapter: null,
  captions: false,
  layer: 12,
  cues(d) {
    return [
      { t: 0.05, name: 'bloom', gain: 0.3, pitch: 1.1 },
      { t: 4.7, name: 'blip', gain: 0.22, pitch: 1.0 },
      { t: 5.55, name: 'blip', gain: 0.22, pitch: 1.12 },
      { t: 6.8, name: 'blip', gain: 0.22, pitch: 1.25 },
      { t: 8.75, name: 'ping', gain: 0.25, pitch: 1.0 },
    ];
  },
  drawOverlay(ctx, v) {
    // the card is OPAQUE from its first frame: only scale + lift animate (04b review: a translucent card let the
    // ending's labels garble the headline). s12 has already faded its labels out by ~64.8 s.
    const ck = ease.outCubic(prog(v.t, 0.0, 0.4)) * v.k;
    if (ck <= 0) return;
    const { x, w, pad } = CARD;
    const lift = (1 - ck) * 30, sc = 0.94 + 0.06 * ck;
    const white = '#fff', acc = L.rgba(v.accent);
    const hs = Math.min(
      L.fitSize(ctx, 'HOW FAR IS THE', INNER, 96, 800, L.FONT.display, 50),
      L.fitSize(ctx, 'CENTER OF OUR GALAXY?', INNER, 96, 800, L.FONT.display, 50));
    // ---- layout (top-down, one even gap G between blocks; cap heights from the type sizes)
    const G = 50;
    const y0 = CARD.top;
    const kickY = y0 + pad + 19;                       // kicker baseline (26 px caps ≈ 19 px tall)
    const h1Y = kickY + G + Math.round(hs * 0.72);     // headline line 1 baseline
    const h2Y = h1Y + Math.round(hs * 1.05);           // headline line 2
    const pillsY = h2Y + G;                            // first pill top
    const promptY = pillsY + 3 * PILL.h + 2 * PILL.gap + 78;   // prompt baseline
    const bottom = promptY + pad - 6;                  // card bottom
    const cy = (y0 + bottom) / 2;
    ctx.save();
    // dim the scene so the card owns the frame
    ctx.globalAlpha = ck * 0.45;
    ctx.fillStyle = '#02060c';
    ctx.fillRect(0, 0, W, L.H);
    ctx.globalAlpha = 1;
    ctx.translate(x + w / 2, cy + lift);
    ctx.scale(sc, sc);
    ctx.translate(-(x + w / 2), -cy);
    // card
    ctx.fillStyle = 'rgb(4,10,20)';
    L.roundRect(ctx, x, y0, w, bottom - y0, 30);
    ctx.fill();
    ctx.strokeStyle = L.rgba(v.accent, 0.5);
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.textBaseline = 'alphabetic';
    ctx.textAlign = 'left';
    // kicker
    ctx.fillStyle = acc;
    ctx.fillRect(x + pad, kickY - 10, 48, 6);
    ctx.font = L.font(26, 700, L.FONT.body);
    ctx.fillStyle = 'rgba(225,230,238,0.9)';
    L.trackedText(ctx, 'QUICK GUESS · AT THIS SCALE', x + pad + 66, kickY, 4);
    // headline: waits until the card is fully in
    const p0 = phrase(v, 0), p1 = phrase(v, 1), p2 = phrase(v, 2), p3 = phrase(v, 3);
    const hk = L.enter(v.t, Math.max(0.42, p0.start - 0.1), 0.45);
    if (hk > 0) {
      ctx.globalAlpha = hk;
      fitted(ctx, [['HOW FAR IS THE', white]], x + pad, h1Y + (1 - hk) * 14, INNER, hs);
      fitted(ctx, [['CENTER OF OUR ', white], ['GALAXY', acc], ['?', white]], x + pad, h2Y + (1 - hk) * 14, INNER, hs);
    }
    // choices: faint placeholder pills from the start, each lit on its word
    const nameMax = INNER - PILL.textX - PILL.right;
    const ns = Math.min(...CHOICES.map((c) => L.fitSize(ctx, c.name, nameMax, 42, 800, L.FONT.display, 26)));
    const pk = L.enter(v.t, 0.3, 0.4);
    CHOICES.forEach((c, i) => {
      const ph = c.phrase === 1 ? p1 : p2;
      const k = clamp(L.enter(v.t, ph.start + c.at * (ph.end - ph.start) - 0.05, 0.4));
      const ry = pillsY + i * (PILL.h + PILL.gap);
      const dcx = x + pad + PILL.h / 2, dcy = ry + PILL.h / 2;
      ctx.save();
      ctx.globalAlpha = pk;
      ctx.fillStyle = `rgba(255,255,255,${0.025 + 0.035 * k})`;
      L.roundRect(ctx, x + pad, ry, INNER, PILL.h, PILL.h / 2);
      ctx.fill();
      ctx.strokeStyle = `rgba(255,255,255,${0.08 + 0.06 * k})`;
      ctx.lineWidth = 1.5;
      ctx.stroke();
      // disc: grey placeholder -> accent
      ctx.fillStyle = 'rgba(255,255,255,0.12)';
      ctx.beginPath(); ctx.arc(dcx, dcy, PILL.disc, 0, Math.PI * 2); ctx.fill();
      ctx.font = L.font(30, 800, L.FONT.display);
      ctx.textAlign = 'center';
      ctx.fillStyle = 'rgba(255,255,255,0.35)';
      ctx.fillText(c.key, dcx, dcy + 11);
      if (k > 0) {
        ctx.globalAlpha = pk * k;
        const pop = ease.outBack(k);
        ctx.fillStyle = acc;
        ctx.beginPath(); ctx.arc(dcx, dcy, PILL.disc * (0.6 + 0.4 * pop), 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#04121c';
        ctx.fillText(c.key, dcx, dcy + 11);
        ctx.textAlign = 'left';
        ctx.fillStyle = white;
        ctx.font = L.font(ns, 800, L.FONT.display);
        ctx.fillText(c.name, x + pad + PILL.textX + (1 - k) * -16, dcy + ns * 0.36);
      }
      ctx.restore();
    });
    // comment prompt, aligned with the choice names; the arrow sits on the disc column under the pills
    const fk = L.enter(v.t, p3.start - 0.05, 0.45);
    if (fk > 0) {
      ctx.globalAlpha = fk;
      ctx.textAlign = 'left';
      ctx.font = L.font(L.fitSize(ctx, 'COMMENT YOUR GUESS', nameMax, 34, 800, L.FONT.display, 24), 800, L.FONT.display);
      ctx.fillStyle = acc;
      L.trackedText(ctx, 'COMMENT YOUR GUESS', x + pad + PILL.textX, promptY + (1 - fk) * 10, 3);
      const bob = Math.sin(v.t * 4) * 2;
      const ax = x + pad + PILL.h / 2, ay = promptY - 12 + bob;
      ctx.strokeStyle = acc;
      ctx.lineWidth = 5;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath(); ctx.moveTo(ax, ay - 20); ctx.lineTo(ax, ay + 12); ctx.moveTo(ax - 12, ay); ctx.lineTo(ax, ay + 12); ctx.lineTo(ax + 12, ay); ctx.stroke();
    }
    ctx.restore();
  },
};
