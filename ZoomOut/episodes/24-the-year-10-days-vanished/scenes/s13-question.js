// Beat 13 (ep 24) — the closing question, over the October 1582 page (s08, end state; the 'home' shot settles on it):
// "If ten days vanished from this year, | which ten would you skip? | Tell me in the comments."
// Modelled on 22's s13-question.js. Opaque card fades in 0.4 s into the beat (no ghosting) with a fine engraved gold
// double rule; kicker YOUR TURN; headline WHICH 10 DAYS / WOULD YOU SKIP? (one shared fitted size) with the card;
// SKIP gets a red rubric underline on phrase 1 (72.00), when the A/B/C choices stagger in; TELL ME IN THE COMMENTS + a
// bobbing arrow on phrase 2 (73.68). Layout top-down from text metrics; card x 80–940, y 360–≈1075 (the page's lower
// rows with the torn strip stay visible below; captions are off in this beat).
import * as L from '../../../../engine/runtime/lib.js';

const { W, ease, clamp, prog } = L;
const CARD = { x: 80, w: 860, pad: 56, top: 360 };       // Shorts-safe: x 80–940; bottom ≈ 1090; the page's lower rows stay visible below
const INNER = CARD.w - 2 * CARD.pad;                      // 748 px of text width
const PILL = { h: 76, gap: 16, disc: 26, textX: 86, right: 30 };
const CHOICES = [
  { key: 'A', name: 'THE COLDEST 10', at: 0.0 },
  { key: 'B', name: 'THE 10 BEFORE PAYDAY', at: 0.28 },
  { key: 'C', name: "I'D KEEP THEM ALL", at: 0.56 },
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
      // relative to the beat start (69.53): card 0.4; phrase 1 (72.00 = +2.47): SKIP underline + choices 2.42 / 2.70 /
      // 2.98; phrase 2 (73.68 = +4.15): prompt
      { t: 0.42, name: 'bloom', gain: 0.3, pitch: 1.1 },
      { t: 2.42, name: 'blip', gain: 0.22, pitch: 1.0 },
      { t: 2.70, name: 'blip', gain: 0.22, pitch: 1.12 },
      { t: 2.98, name: 'blip', gain: 0.22, pitch: 1.24 },
      { t: 4.12, name: 'ping', gain: 0.25, pitch: 1.0 },
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
    const h1Y = kickY + 114;                // headline line 1 baseline (≤ 100 px type)
    const h2Y = h1Y + 102;                  // headline line 2
    const pillsY = h2Y + 54;                // first pill top (clears the SKIP underline)
    const promptY = pillsY + CHOICES.length * PILL.h + (CHOICES.length - 1) * PILL.gap + 70;   // prompt baseline: 70 px below the last pill
    const bottom = promptY + 48;            // card bottom: 48 px under the prompt
    ctx.save();
    // dim the scene so the card owns the frame
    ctx.globalAlpha = ck * 0.45;
    ctx.fillStyle = '#02060c';
    ctx.fillRect(0, 0, W, L.H);
    // card
    ctx.globalAlpha = ck;
    ctx.fillStyle = 'rgb(8,13,28)';   // fully opaque: the ending's world tags must not ghost through
    L.roundRect(ctx, x, y0, w, bottom - y0, 30);
    ctx.fill();
    ctx.strokeStyle = L.rgba(v.accent, 0.5);
    ctx.lineWidth = 2;
    ctx.stroke();
    // engraved inner hairline + corner diamonds (the film's manuscript language)
    ctx.strokeStyle = L.rgba(v.accent, 0.22);
    ctx.lineWidth = 1;
    L.roundRect(ctx, x + 12, y0 + 12, w - 24, bottom - y0 - 24, 20);
    ctx.stroke();
    ctx.fillStyle = L.rgba(v.accent, 0.6);
    for (const [dx, dy] of [[x + w / 2, y0], [x + w / 2, bottom]]) {
      ctx.beginPath(); ctx.moveTo(dx, dy - 7); ctx.lineTo(dx + 9, dy); ctx.lineTo(dx, dy + 7); ctx.lineTo(dx - 9, dy); ctx.closePath(); ctx.fill();
    }
    ctx.textBaseline = 'alphabetic';
    ctx.textAlign = 'left';
    // kicker
    ctx.fillStyle = acc;
    ctx.fillRect(x + pad, kickY - 10, 48, 6);
    ctx.font = L.font(26, 700, L.FONT.body);
    ctx.fillStyle = 'rgba(225,230,238,0.9)';
    L.trackedText(ctx, 'YOUR TURN', x + pad + 66, kickY, 5);
    // headline: both lines with the card (phrase 0 sets up the question); SKIP underlined on phrase 1
    const p1 = phrase(v, 1), p2 = phrase(v, 2);
    const H1 = [['WHICH ', white], ['10 DAYS', acc]];
    const H2 = [['WOULD YOU ', white], ['SKIP', acc], ['?', white]];
    const hs = Math.min(
      L.fitSize(ctx, H1.map((q) => q[0]).join(''), INNER, 100, 800, L.FONT.display, 50),
      L.fitSize(ctx, H2.map((q) => q[0]).join(''), INNER, 100, 800, L.FONT.display, 50));
    const hk = L.enter(v.t, 0.5, 0.45);
    ctx.globalAlpha = ck * hk;
    fitted(ctx, H1, x + pad, h1Y + (1 - hk) * 14, INNER, hs);
    fitted(ctx, H2, x + pad, h2Y + (1 - hk) * 14, INNER, hs);
    const uk = L.ease.inOutCubic(L.prog(v.t, p1.start - 0.1, 0.35));
    if (uk > 0) {
      ctx.font = L.font(hs, 800, L.FONT.display);
      const sx = x + pad + ctx.measureText('WOULD YOU ').width, sw = ctx.measureText('SKIP').width;
      ctx.strokeStyle = 'rgb(214,92,70)';
      ctx.lineWidth = 6;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(sx, h2Y + 14); ctx.quadraticCurveTo(sx + sw * 0.5 * uk, h2Y + 20, sx + sw * uk, h2Y + 12);
      ctx.stroke();
    }
    // choices, entering on their words; names share one fitted size
    const nameMax = INNER - PILL.textX - PILL.right + 8;
    const ns = Math.min(...CHOICES.map((c) => L.fitSize(ctx, c.name, nameMax, 42, 800, L.FONT.display, 26)));
    CHOICES.forEach((c, i) => {
      const k = L.enter(v.t, p1.start - 0.05 + c.at, 0.4, ease.outBack);
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
      ctx.fillStyle = '#0a0f20';
      ctx.font = L.font(30, 800, L.FONT.display);
      ctx.textAlign = 'center';
      ctx.fillText(c.key, dcx, dcy + 11);
      ctx.textAlign = 'left';
      ctx.fillStyle = white;
      ctx.font = L.font(ns, 800, L.FONT.display);
      ctx.fillText(c.name, x + pad - 8 + PILL.textX, dcy + ns * 0.36);
      ctx.restore();
    });
    // comment prompt + arrow, on "Tell me in the comments"
    const fk = L.enter(v.t, p2.start - 0.05, 0.45);
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
