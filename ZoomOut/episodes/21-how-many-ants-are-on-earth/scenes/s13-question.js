// Beat 13 (ep 21) — the closing question, over the held final frame (one ant beside a shoe): "Be honest: | when you find
// an ant in your kitchen, | do you let it live? | Tell me in the comments." Modelled on 06b's s13-question.js.
// Opaque card fades in 0.4 s into the beat (no ghosting), kicker YOUR TURN; headline line 1 on phrase 1, line 2 on
// phrase 2; choices A/B pop in on "live?"; TELL ME IN THE COMMENTS + bobbing arrow on phrase 3. Layout computed top-down
// from text metrics, every line fitted to its box; card x 80–940, y 400–≈1020 (clear of the captions; the ant stays
// visible below it).
import * as L from '../../../../engine/runtime/lib.js';

const { W, ease, clamp, prog } = L;
const CARD = { x: 80, w: 860, pad: 56, top: 400 };       // Shorts-safe: x 80–940; bottom ≈ 1020 keeps the ant (ground y ≈ 1150) in view
const INNER = CARD.w - 2 * CARD.pad;                      // 748 px of text width
const PILL = { h: 76, gap: 16, disc: 26, textX: 86, right: 30 };
const CHOICES = [
  { key: 'A', name: 'LET IT LIVE', at: 0.15 },
  { key: 'B', name: "IT'S GONE", at: 0.65 },
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
  layer: 12,
  cues(d) {
    return [
      // relative to 67.293: card 0.4, line 1 at 1.35, line 2 at 3.6, choices 4.25 / 4.6, prompt 5.25
      { t: 0.4, name: 'bloom', gain: 0.3, pitch: 1.1 },
      { t: 1.35, name: 'swish', gain: 0.14, pitch: 1.2 },
      { t: 3.6, name: 'swish', gain: 0.14, pitch: 1.3 },
      { t: 4.25, name: 'blip', gain: 0.22, pitch: 1.0 },
      { t: 4.6, name: 'blip', gain: 0.22, pitch: 1.12 },
      { t: 5.25, name: 'ping', gain: 0.25, pitch: 1.0 },
    ];
  },
  drawOverlay(ctx, v) {
    const ck = ease.outCubic(prog(v.t, 0.4, 0.45)) * v.k;   // after the ending's labels have faded (no ghosting)
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
    // headline: line 1 on "when you find an ant in your kitchen", line 2 on "do you let it live?"; one shared size
    const p1 = phrase(v, 1), p2 = phrase(v, 2), p3 = phrase(v, 3);
    const H1 = [['ANT', acc], [' IN YOUR KITCHEN:', white]];
    const H2 = [['DO YOU LET IT ', white], ['LIVE', acc], ['?', white]];
    const hs = Math.min(
      L.fitSize(ctx, H1.map((q) => q[0]).join(''), INNER, 96, 800, L.FONT.display, 50),
      L.fitSize(ctx, H2.map((q) => q[0]).join(''), INNER, 96, 800, L.FONT.display, 50));
    const hk1 = L.enter(v.t, Math.max(0.45, p1.start - 0.1), 0.45);
    const hk2 = L.enter(v.t, p2.start - 0.1, 0.45);
    ctx.globalAlpha = ck * hk1;
    fitted(ctx, H1, x + pad, h1Y + (1 - hk1) * 14, INNER, hs);
    ctx.globalAlpha = ck * hk2;
    fitted(ctx, H2, x + pad, h2Y + (1 - hk2) * 14, INNER, hs);
    // choices, entering on their words; names share one fitted size
    const nameMax = INNER - PILL.textX - PILL.right + 8;
    const ns = Math.min(...CHOICES.map((c) => L.fitSize(ctx, c.name, nameMax, 42, 800, L.FONT.display, 26)));
    CHOICES.forEach((c, i) => {
      const k = L.enter(v.t, p2.start + 0.45 + c.at * 0.7, 0.4, ease.outBack);
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
      ctx.restore();
    });
    // comment prompt + arrow, on "Comment your guess"
    const fk = L.enter(v.t, p3.start - 0.05, 0.45);
    if (fk > 0) {
      ctx.globalAlpha = ck * fk;
      ctx.font = L.font(34, 800, L.FONT.display);
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
