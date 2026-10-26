// Beat 13 (10b) — the closing question, over the held whole-year calendar (s12's pull-back, story cells lit):
// "On this calendar, when were the pyramids built? | Ten seconds to midnight, or ten minutes? | Tell me in the comments."
// Copied from 09b: the card is OPAQUE from its first frame (only scale + lift animate, timed on the output frame) and
// lands 0.3–0.6 s into the beat, after s12's YOU ARE HERE tag has faded (gone by +0.25 s), so nothing ghosts through it.
// Two choices, faint placeholder pills from the start, each lit on its spoken words. Layout top-down from text metrics;
// every line fitted to its box. Card x 80–920, bottom ≈ 1240 (< 1300, clear of the caption band 1380–1520).
import * as L from '../../../../engine/runtime/lib.js';

const { W, ease, clamp, prog } = L;
const CARD = { x: 80, w: 840, pad: 56, top: 600 };       // Shorts-safe: right edge 920 (< 940); ~640 px tall → bottom ≈ 1240
const INNER = CARD.w - 2 * CARD.pad;                      // 728 px of text width
const PILL = { h: 76, gap: 16, disc: 26, textX: 86, right: 30 };
const CHOICES = [
  { key: 'A', name: 'ABOUT 10 SECONDS TO MIDNIGHT', phrase: 1, at: 0.0 },    // "Ten seconds to midnight,"
  { key: 'B', name: 'ABOUT 10 MINUTES TO MIDNIGHT', phrase: 1, at: 0.66 },   // "or ten minutes?"
];
const H1 = 'WHEN WERE THE', H2A = 'PYRAMIDS', H2B = ' BUILT?';

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
  overlayIn: false,     // the card owns its own entrance (v.k = 1 from the first frame: no translucent fade)
  layer: 12,
  cues(d) {
    return [
      { t: 0.32, name: 'bloom', gain: 0.3, pitch: 1.1 },
      { t: 3.4, name: 'blip', gain: 0.22, pitch: 1.0 },
      { t: 4.9, name: 'blip', gain: 0.22, pitch: 1.12 },
      { t: 6.5, name: 'ping', gain: 0.25, pitch: 1.0 },
    ];
  },
  drawOverlay(ctx, v) {
    // timed on the output frame (not the motion-blur sub-frame), so no frame blends "card" with "no card"
    const tf = Math.round(v.gt * 30) / 30 - v.tl.scenes[v.index].start;
    // the calendar dims in over ~5 frames just before the card (s12's tag is out by +0.25 s)
    const dk = ease.outCubic(prog(tf, 0.15, 0.2));
    if (dk <= 0) return;
    // f10cb: then the last 8 % fade out too, so no calendar residue sits around the card for the whole hold
    const dim = dk * (0.92 + 0.08 * ease.inOutCubic(prog(tf, 0.4, 0.6)));
    if (tf < 0.3) {
      ctx.save(); ctx.globalAlpha = dim; ctx.fillStyle = '#060308'; ctx.fillRect(0, 0, W, L.H); ctx.restore();
      return;
    }
    const ck = ease.outCubic(prog(tf, 0.3, 0.12));   // opaque from its first frame; a 4-frame settle from 0.97 + lift
    const { x, w, pad } = CARD;
    const lift = (1 - ck) * 14, sc = 0.97 + 0.03 * ck;
    const white = '#fff', acc = L.rgba(v.accent);
    const hs = Math.min(
      L.fitSize(ctx, H1, INNER, 96, 800, L.FONT.display, 50),
      L.fitSize(ctx, H2A + H2B, INNER, 96, 800, L.FONT.display, 50));
    // ---- layout (top-down, one even gap G between blocks; cap heights from the type sizes)
    const G = 50;
    const y0 = CARD.top;
    const kickY = y0 + pad + 19;                       // kicker baseline (26 px caps ≈ 19 px tall)
    const h1Y = kickY + G + Math.round(hs * 0.72);     // headline line 1 baseline
    const h2Y = h1Y + Math.round(hs * 1.05);           // headline line 2
    const pillsY = h2Y + G;                            // first pill top
    const promptY = pillsY + CHOICES.length * PILL.h + (CHOICES.length - 1) * PILL.gap + 78;   // prompt baseline
    const bottom = promptY + pad - 6;                  // card bottom
    const cy = (y0 + bottom) / 2;
    ctx.save();
    // dim the held calendar almost fully: the card owns the frame, nothing behind reads as an accidental crop
    ctx.globalAlpha = dim;
    ctx.fillStyle = '#060308';
    ctx.fillRect(0, 0, W, L.H);
    ctx.globalAlpha = 1;
    ctx.translate(x + w / 2, cy + lift);
    ctx.scale(sc, sc);
    ctx.translate(-(x + w / 2), -cy);
    // card (opaque from its first frame)
    ctx.fillStyle = 'rgb(16,9,18)';
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
    const KICK = 'YOUR TURN  ·  ON THIS CALENDAR';
    ctx.font = L.font(L.fitSize(ctx, KICK, INNER - 66 - 5 * KICK.length, 26, 700, L.FONT.body, 18), 700, L.FONT.body);   // fitted incl. tracking
    ctx.fillStyle = 'rgba(232,226,238,0.9)';
    L.trackedText(ctx, KICK, x + pad + 66, kickY, 5);
    // headline: on with the card (the question is spoken 0.15 s into the beat)
    const p1 = phrase(v, 1), p2 = phrase(v, 2);
    fitted(ctx, [[H1, white]], x + pad, h1Y, INNER, hs);
    fitted(ctx, [[H2A, acc], [H2B, white]], x + pad, h2Y, INNER, hs);
    // choices: faint placeholder pills from the start, each lit on its word; aligned to the text column
    const nameMax = INNER - PILL.textX - PILL.right;
    const ns = Math.min(...CHOICES.map((c) => L.fitSize(ctx, c.name, nameMax, 42, 800, L.FONT.display, 24)));
    CHOICES.forEach((c, i) => {
      const k = clamp(L.enter(v.t, p1.start + c.at * (p1.end - p1.start) - 0.05, 0.4));
      const ry = pillsY + i * (PILL.h + PILL.gap);
      const dcx = x + pad + PILL.h / 2, dcy = ry + PILL.h / 2;
      ctx.save();
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
        ctx.globalAlpha = k;
        const pop = ease.outBack(k);
        ctx.fillStyle = acc;
        ctx.beginPath(); ctx.arc(dcx, dcy, PILL.disc * (0.6 + 0.4 * pop), 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#1a0818';
        ctx.fillText(c.key, dcx, dcy + 11);
        ctx.textAlign = 'left';
        ctx.fillStyle = white;
        ctx.font = L.font(ns, 800, L.FONT.display);
        ctx.fillText(c.name, x + pad + PILL.textX + (1 - k) * -16, dcy + ns * 0.36);
      }
      ctx.restore();
    });
    // comment prompt, aligned with the choice names; the arrow sits on the disc column under the pills
    // the prompt waits as a faint placeholder (no empty band under the pills), then lights on its words
    const fk = L.enter(v.t, p2.start - 0.05, 0.45);
    {
      ctx.globalAlpha = 0.22 + 0.78 * fk;
      ctx.textAlign = 'left';
      ctx.font = L.font(L.fitSize(ctx, 'TELL ME IN THE COMMENTS', nameMax, 34, 800, L.FONT.display, 24), 800, L.FONT.display);
      ctx.fillStyle = acc;
      L.trackedText(ctx, 'TELL ME IN THE COMMENTS', x + pad + PILL.textX, promptY, 3);
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
