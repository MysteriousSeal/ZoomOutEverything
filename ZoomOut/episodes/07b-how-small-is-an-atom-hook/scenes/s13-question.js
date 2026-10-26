// Beat 13 (07b) — the closing question: "Does knowing you're mostly empty space | change how you see yourself? |
// Tell me in the comments." Two choices (easy to answer).
// The final image stays: s12 steps the whole figure (crown glint and all) up into a full-length frame above the card
// (s12 FRAME13). The card is OPAQUE from its first frame (only scale + lift animate) and its entrance is timed on the
// output frame, so no motion-blur sub-frame mixes "card" and "no card". Layout is computed top-down from text metrics:
// every line fitted to its box (tracking included), explicit gaps. All labels (kicker, sub-kicker, footer) share one
// system: Avenir body, 700, tracked caps.
import * as L from '../../../../engine/runtime/lib.js';
import { FRAME13 } from './s12-you.js';

const { W, ease, clamp, prog } = L;
const CARD = { x: 80, w: 840, pad: 56, top: FRAME13.feet + 60 };    // Shorts-safe: right edge 920 (< 940); under the figure
const INNER = CARD.w - 2 * CARD.pad;                       // 728 px of text width
const PILL = { h: 74, gap: 14, disc: 25, textX: 84, right: 30 };
const CHOICES = [
  { key: 'A', name: 'YES, COMPLETELY', at: 0.05 },
  { key: 'B', name: 'I ALREADY KNEW', at: 0.55 },
];
const LABEL_W = 700;                                       // the shared label weight (kicker, sub-kicker, footer)

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
/** a tracked caps label fitted (tracking included) to maxW */
function label(ctx, text, x, y, maxW, size, tr, col) {
  const s = L.fitSize(ctx, text, maxW - tr * (text.length - 1), size, LABEL_W, L.FONT.body, 18);
  ctx.font = L.font(s, LABEL_W, L.FONT.body);
  ctx.fillStyle = col;
  L.trackedText(ctx, text, x, y, tr);
}

export default {
  beat: 13,
  chapter: null,
  captions: false,
  layer: 12,
  cues() {
    return [
      { t: 0.25, name: 'bloom', gain: 0.3, pitch: 1.1 },
      { t: 2.75, name: 'blip', gain: 0.22, pitch: 1.0 },     // choices on "change how you see yourself?"
      { t: 3.55, name: 'blip', gain: 0.22, pitch: 1.12 },
      { t: 4.7, name: 'ping', gain: 0.25, pitch: 1.0 },      // "Tell me in the comments"
    ];
  },
  drawOverlay(ctx, v) {
    // entrance timed on the output frame (30 fps), not the motion-blur sub-frame
    const tf = Math.round(v.gt * 30) / 30 - v.tl.scenes[v.index].start;
    const ck = ease.outCubic(prog(tf, 0.3, 0.4)) * v.k;
    if (ck <= 0) return;
    const { x, w, pad } = CARD;
    const lift = (1 - ck) * 30, sc = 0.94 + 0.06 * ck;
    const white = '#fff', acc = L.rgba(v.accent);
    const H1 = 'DOES IT CHANGE HOW', H2 = 'YOU SEE YOURSELF?';
    const hs = Math.min(L.fitSize(ctx, H1, INNER, 92, 800, L.FONT.display, 50), L.fitSize(ctx, H2, INNER, 92, 800, L.FONT.display, 50));
    // ---- layout (top-down, explicit gaps; cap heights from the type sizes)
    const y0 = CARD.top;
    const kickY = y0 + pad + 19;                       // kicker baseline (26 px caps ≈ 19 px tall)
    const subY = kickY + 54;                           // sub-kicker baseline (≤ 32 px type)
    const h1Y = subY + 30 + Math.round(hs * 0.72);     // headline line 1 baseline
    const h2Y = h1Y + Math.round(hs * 1.05);           // headline line 2
    const pillsY = h2Y + 44;                           // first pill top
    const promptY = pillsY + CHOICES.length * PILL.h + (CHOICES.length - 1) * PILL.gap + 62;   // footer baseline
    const bottom = promptY + pad - 10;                 // card bottom (≈ even with the top padding: caps sit on it)
    const cy = (y0 + bottom) / 2;
    ctx.save();
    // dim the scene so the card owns the frame; lighter over the figure above it
    const dg = ctx.createLinearGradient(0, 0, 0, L.H);
    dg.addColorStop(0, 'rgba(2,6,12,0.22)');
    dg.addColorStop(0.36, 'rgba(2,6,12,0.22)');
    dg.addColorStop(0.5, 'rgba(2,6,12,0.5)');
    dg.addColorStop(1, 'rgba(2,6,12,0.5)');
    ctx.globalAlpha = ck;
    ctx.fillStyle = dg;
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
    label(ctx, 'YOUR TURN', x + pad + 66, kickY, INNER - 66, 26, 5, 'rgba(225,230,238,0.9)');
    const p0 = phrase(v, 0), p1 = phrase(v, 1), p2 = phrase(v, 2);
    // sub-kicker: the narration's premise, on "Does knowing you're mostly empty space"
    const sk = L.enter(v.t, Math.max(0.45, p0.start - 0.05), 0.45);
    if (sk > 0) {
      ctx.globalAlpha = sk;
      label(ctx, "YOU'RE MOSTLY EMPTY SPACE", x + pad, subY + (1 - sk) * 8, INNER, 32, 3, acc);
    }
    // headline: a faint placeholder from the start, lit as the sentence turns into the question
    const hk = L.enter(v.t, Math.max(0.6, p0.start + 0.9), 0.45);
    ctx.globalAlpha = 0.13 + 0.87 * hk;
    fitted(ctx, [[H1, white]], x + pad, h1Y, INNER, hs);
    fitted(ctx, [['YOU SEE ', white], ['YOURSELF', hk > 0 ? acc : white], ['?', white]], x + pad, h2Y, INNER, hs);
    ctx.globalAlpha = 1;
    // choices: faint placeholder pills from the start (on the text column), each lit on its word
    const nameMax = INNER - PILL.textX - PILL.right;
    const ns = Math.min(...CHOICES.map((c) => L.fitSize(ctx, c.name, nameMax, 42, 800, L.FONT.display, 26)));
    CHOICES.forEach((c, i) => {
      const k = clamp(L.enter(v.t, p1.start + c.at * (p1.end - p1.start) - 0.05, 0.4));
      const ry = pillsY + i * (PILL.h + PILL.gap);
      const dcx = x + pad + PILL.h / 2, dcy = ry + PILL.h / 2;
      ctx.save();
      ctx.fillStyle = `rgba(255,255,255,${0.03 + 0.035 * k})`;
      L.roundRect(ctx, x + pad, ry, INNER, PILL.h, PILL.h / 2);
      ctx.fill();
      ctx.strokeStyle = `rgba(255,255,255,${0.09 + 0.06 * k})`;
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,0.12)';
      ctx.beginPath(); ctx.arc(dcx, dcy, PILL.disc, 0, Math.PI * 2); ctx.fill();
      ctx.font = L.font(30, 800, L.FONT.display);
      ctx.textAlign = 'center';
      ctx.fillStyle = 'rgba(255,255,255,0.35)';
      ctx.fillText(c.key, dcx, dcy + 11);
      if (k > 0) {
        ctx.globalAlpha = k;
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
    // footer, in the kicker's label style, aligned with the choice names; the arrow sits on the disc column
    const fk = L.enter(v.t, p2.start - 0.05, 0.45);
    if (fk > 0) {
      ctx.globalAlpha = fk;
      ctx.textAlign = 'left';
      label(ctx, 'TELL ME IN THE COMMENTS', x + pad + PILL.textX, promptY + (1 - fk) * 10, nameMax, 30, 5, acc);
      const bob = Math.sin(v.t * 4) * 2;
      const ax = x + pad + PILL.h / 2, ay = promptY - 11 + bob;
      ctx.strokeStyle = acc;
      ctx.lineWidth = 4;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath(); ctx.moveTo(ax, ay - 18); ctx.lineTo(ax, ay + 11); ctx.moveTo(ax - 11, ay); ctx.lineTo(ax, ay + 11); ctx.lineTo(ax + 11, ay); ctx.stroke();
    }
    ctx.restore();
  },
};
