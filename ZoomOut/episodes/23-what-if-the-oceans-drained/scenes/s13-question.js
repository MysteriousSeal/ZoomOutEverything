// Beat 13 — the closing question, over the held blue planet: "If the seas dropped tonight, | where would you walk first? |
// Tell me in the comments." Adapted from 06b / 22.
// An opaque card (fades in 0.4 s after the beat starts, so beat 12's labels never ghost through), kicker YOUR TURN, a
// fitted 2-line headline WHERE WOULD YOU / WALK FIRST? (on phrase 1), three choices A/B/C staggered on "where would you
// walk first?" (71.95) — each with the sea-level drop that walk needs (−50 m / −60 m / −10,935 m, the film's
// numbers, right-aligned in DIN) — and TELL ME IN THE COMMENTS with a bobbing arrow on phrase 3 (73.63). The card spans x 80–940
// and its bottom stays < 1300 (captions are off in this beat). The held blue planet stays behind it.
import * as L from '../../../../engine/runtime/lib.js';

const { W, ease, clamp, prog } = L;
const CARD = { x: 80, w: 860, pad: 56, top: 470 };       // Shorts-safe: x ≤ 940, bottom kept < 1400
const INNER = CARD.w - 2 * CARD.pad;                      // 748 px of text width
const PILL = { h: 76, gap: 16, disc: 26, textX: 86, right: 30 };
const CHOICES = [
  { key: 'A', name: 'ALASKA TO RUSSIA', depth: '−50 m', at: 0.0 },
  { key: 'B', name: 'BRITAIN TO FRANCE', depth: '−60 m', at: 0.28 },
  { key: 'C', name: 'INTO THE MARIANA TRENCH', depth: '−10,935 m', at: 0.56 },
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
  beat: 13,
  chapter: null,
  captions: false,
  layer: 13,
  cues(d) {
    return [
      // beat starts 69.88: card 0.4 s, choices on phrase 2 (71.95 → +2.07 s, staggered 0.28 s), prompt on phrase 3 (73.63)
      { t: 0.42, name: 'bloom', gain: 0.3, pitch: 1.1 },
      { t: 2.02, name: 'blip', gain: 0.22, pitch: 1.0 },
      { t: 2.30, name: 'blip', gain: 0.22, pitch: 1.12 },
      { t: 2.58, name: 'blip', gain: 0.22, pitch: 1.25 },
      { t: 3.72, name: 'ping', gain: 0.25, pitch: 1.0 },
    ];
  },
  drawOverlay(ctx, v) {
    const ck = ease.outCubic(prog(v.t, 0.4, 0.45)) * v.k;    // after beat 12's tags have faded (no ghosting)
    if (ck <= 0) return;
    const { x, w, pad } = CARD;
    const lift = (1 - ck) * 30;
    const white = '#fff', acc = L.rgba(v.accent);
    // ---- layout (top-down, explicit gaps)
    const y0 = CARD.top + lift;
    const kickY = y0 + 74;                  // kicker baseline
    const h1Y = kickY + 112;                // headline line 1 baseline (≤ 96 px type)
    const h2Y = h1Y + 98;                   // headline line 2
    const pillsY = h2Y + 52;                // first pill top
    const promptY = pillsY + CHOICES.length * PILL.h + (CHOICES.length - 1) * PILL.gap + 70;   // prompt baseline: 70 px below the last pill
    const bottom = promptY + 48;            // card bottom: 48 px under the prompt
    ctx.save();
    // dim the scene so the card owns the frame
    ctx.globalAlpha = ck * 0.45;
    ctx.fillStyle = '#02060c';
    ctx.fillRect(0, 0, W, L.H);
    // card
    ctx.globalAlpha = ck;
    ctx.fillStyle = 'rgb(4,10,20)';   // fully opaque: the ending's world tags must not ghost through
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
    L.trackedText(ctx, 'YOUR TURN', x + pad + 66, kickY, 5);
    // headline (two lines, one shared size so they read as a block)
    const p0 = phrase(v, 0), p1 = phrase(v, 1), p3 = phrase(v, 2);
    const hk = L.enter(v.t, Math.max(0, p0.start - 0.1), 0.45);
    ctx.globalAlpha = ck * hk;
    const hs = Math.min(
      L.fitSize(ctx, 'WHERE WOULD YOU', INNER, 96, 800, L.FONT.display, 50),
      L.fitSize(ctx, 'WALK FIRST?', INNER, 96, 800, L.FONT.display, 50));
    fitted(ctx, [['WHERE WOULD YOU', white]], x + pad, h1Y + (1 - hk) * 14, INNER, hs);
    fitted(ctx, [['WALK', acc], [' FIRST?', white]], x + pad, h2Y + (1 - hk) * 14, INNER, hs);
    // choices, entering on their words; names share one fitted size
    // depth tags (the sea level each walk needs, from the film) right-aligned in the pill; names fit what is left
    ctx.font = L.font(30, 700, L.FONT.din);
    const tagW = Math.max(...CHOICES.map((c) => ctx.measureText(c.depth).width));
    const nameMax = INNER - PILL.textX - PILL.right + 8 - tagW - 24;
    const ns = Math.min(...CHOICES.map((c) => L.fitSize(ctx, c.name, nameMax, 42, 800, L.FONT.display, 26)));
    CHOICES.forEach((c, i) => {
      const ph = p1;
      const k = L.enter(v.t, ph.start + c.at - 0.05, 0.4, ease.outBack);
      if (k <= 0) return;
      const ry = pillsY + i * (PILL.h + PILL.gap);
      ctx.save();
      ctx.globalAlpha = ck * clamp(k);
      ctx.translate((1 - clamp(k)) * -30, 0);
      ctx.fillStyle = 'rgba(255,255,255,0.06)';
      L.roundRect(ctx, x + pad - 8, ry, INNER + 16, PILL.h, PILL.h / 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.14)';
      ctx.lineWidth = 1.5;
      ctx.stroke();
      const dcx = x + pad - 8 + PILL.h / 2, dcy = ry + PILL.h / 2;
      ctx.fillStyle = acc;
      ctx.beginPath(); ctx.arc(dcx, dcy, PILL.disc, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#04121c';
      ctx.font = L.font(30, 800, L.FONT.display);
      ctx.textAlign = 'center';
      ctx.fillText(c.key, dcx, dcy + 11);
      ctx.textAlign = 'left';
      ctx.fillStyle = white;
      ctx.font = L.font(ns, 800, L.FONT.display);
      ctx.fillText(c.name, x + pad - 8 + PILL.textX, dcy + ns * 0.36);
      ctx.font = L.font(30, 700, L.FONT.din);
      ctx.fillStyle = L.rgba(v.accent, 0.9);
      ctx.textAlign = 'right';
      ctx.fillText(c.depth, x + pad - 8 + INNER + 16 - PILL.right, dcy + 11);
      ctx.textAlign = 'left';
      ctx.restore();
    });
    // comment prompt + arrow, on "Tell me in the comments"
    const fk = L.enter(v.t, p3.start - 0.05, 0.45);
    if (fk > 0) {
      ctx.globalAlpha = ck * fk;
      ctx.letterSpacing = '3px';
      ctx.font = L.font(L.fitSize(ctx, 'TELL ME IN THE COMMENTS', INNER - 70, 34, 800, L.FONT.display, 24), 800, L.FONT.display);
      ctx.letterSpacing = '0px';
      ctx.fillStyle = acc;
      L.trackedText(ctx, 'TELL ME IN THE COMMENTS', x + pad, promptY + (1 - fk) * 10, 3);
      const bob = Math.sin(v.t * 6) * 4;
      const ax = x + w - pad - 14, ay = promptY - 14 + bob;
      ctx.strokeStyle = acc;
      ctx.lineWidth = 5;
      ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(ax, ay - 22); ctx.lineTo(ax, ay + 14); ctx.moveTo(ax - 14, ay); ctx.lineTo(ax, ay + 14); ctx.lineTo(ax + 14, ay); ctx.stroke();
    }
    ctx.restore();
  },
};
