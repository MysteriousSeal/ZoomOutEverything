// Beat 13 (08b) — the closing question, over the held deep field + horizon ring: "Starlight is a time machine. | Which
// era would you look back at? | Tell me in the comments." Three choices. Layout computed top-down from text metrics: every line
// fitted to its box, explicit gaps. The card is OPAQUE from its first frame (only scale + lift animate), and shows the
// faint headline and placeholder pills from the start so it never sits as an empty box (the 04b fix).
import * as L from '../../../../engine/runtime/lib.js';

const { W, ease, clamp, prog } = L;
const CARD = { x: 80, w: 840, pad: 56, top: 470 };       // Shorts-safe: right edge 920 (< 940), bottom < 1300 (clear of the captions)
const INNER = CARD.w - 2 * CARD.pad;                      // 728 px of text width
const PILL = { h: 76, gap: 16, disc: 26, textX: 86, right: 30 };
const CHOICES = [
  { key: 'A', name: 'THE DINOSAURS', at: 0.15 },
  { key: 'B', name: 'THE PYRAMIDS', at: 0.45 },
  { key: 'C', name: 'THE BIG BANG', at: 0.75 },
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
      { t: 0.05, name: 'bloom', gain: 0.3, pitch: 1.1 },
      { t: 2.58, name: 'blip', gain: 0.22, pitch: 1.0 },    // choices A/B/C on "Which era would you look back at?"
      { t: 3.07, name: 'blip', gain: 0.22, pitch: 1.12 },
      { t: 3.56, name: 'blip', gain: 0.22, pitch: 1.24 },
      { t: 4.57, name: 'ping', gain: 0.25, pitch: 1.0 },    // "Tell me in the comments"
    ];
  },
  drawOverlay(ctx, v) {
    // in at 0.3 s (s12's world labels are already under v.k fade), opaque from its first frame. The card's entrance is
    // timed on the output frame (not the motion-blur sub-frame), so no frame blends "card" with "no card".
    const tf = Math.round(v.gt * 30) / 30 - v.tl.scenes[v.index].start;
    const ck = ease.outCubic(prog(tf, 0.3, 0.4)) * v.k;
    if (ck <= 0) return;
    const { x, w, pad } = CARD;
    const lift = (1 - ck) * 30, sc = 0.94 + 0.06 * ck;
    const white = '#fff', acc = L.rgba(v.accent);
    const hs = Math.min(
      L.fitSize(ctx, 'WHICH ERA WOULD YOU', INNER, 96, 800, L.FONT.display, 50),
      L.fitSize(ctx, 'LOOK BACK AT?', INNER, 96, 800, L.FONT.display, 50));
    // ---- layout (top-down, explicit gaps; cap heights from the type sizes)
    const y0 = CARD.top;
    const kickY = y0 + pad + 19;                       // kicker baseline (26 px caps ≈ 19 px tall)
    const subY = kickY + 56;                           // sub-kicker baseline (≤ 32 px type)
    const h1Y = subY + 30 + Math.round(hs * 0.72);     // headline line 1 baseline
    const h2Y = h1Y + Math.round(hs * 1.05);           // headline line 2
    const pillsY = h2Y + 46;                           // first pill top
    const promptY = pillsY + CHOICES.length * PILL.h + (CHOICES.length - 1) * PILL.gap + 70;   // prompt baseline
    const bottom = promptY + pad - 8;                  // card bottom
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
    L.trackedText(ctx, 'YOUR TURN', x + pad + 66, kickY, 5);
    const p0 = phrase(v, 0), p1 = phrase(v, 1), p3 = phrase(v, 2);
    // sub-kicker on "Starlight is a time machine" (tracked: fitted with its tracking included)
    const sk = L.enter(v.t, Math.max(0.45, p0.start - 0.05), 0.45);
    if (sk > 0) {
      ctx.globalAlpha = sk;
      const SUB = 'STARLIGHT IS A TIME MACHINE', TR = 3;
      const ss = L.fitSize(ctx, SUB, INNER - TR * (SUB.length - 1), 32, 700, L.FONT.body, 20);
      ctx.font = L.font(ss, 700, L.FONT.body);
      ctx.fillStyle = acc;
      L.trackedText(ctx, SUB, x + pad, subY + (1 - sk) * 8, TR);
    }
    // headline: a faint placeholder from the start, lit on "Which era would you look back at?"
    const hk = L.enter(v.t, Math.max(0.45, p1.start - 0.1), 0.45);
    ctx.globalAlpha = 0.13 + 0.87 * hk;
    fitted(ctx, [['WHICH ', white], ['ERA', hk > 0 ? acc : white], [' WOULD YOU', white]], x + pad, h1Y, INNER, hs);
    fitted(ctx, [['LOOK BACK AT?', white]], x + pad, h2Y, INNER, hs);
    ctx.globalAlpha = 1;
    // choices: faint placeholder pills from the start (aligned to the text column), each lit on its word
    const nameMax = INNER - PILL.textX - PILL.right;
    const ns = Math.min(...CHOICES.map((c) => L.fitSize(ctx, c.name, nameMax, 42, 800, L.FONT.display, 26)));
    const pk = L.enter(v.t, 0.4, 0.4);
    CHOICES.forEach((c, i) => {
      const k = clamp(L.enter(v.t, p1.start + c.at * (p1.end - p1.start) - 0.05, 0.4));
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
      const PROMPT = 'TELL ME IN THE COMMENTS', TR = 3;
      ctx.font = L.font(L.fitSize(ctx, PROMPT, nameMax - TR * (PROMPT.length - 1), 34, 800, L.FONT.display, 24), 800, L.FONT.display);
      ctx.fillStyle = acc;
      L.trackedText(ctx, PROMPT, x + pad + PILL.textX, promptY + (1 - fk) * 10, TR);
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
