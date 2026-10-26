// Beat 13 (11b) — the closing question, over the held fingernail comparison: "How long until the Moon is too far away
// for total solar eclipses? | About 6,000 years, or about 600 million years? | Tell me in the comments."
// Two choices, each lit on its spoken word. Built on 09b's card: OPAQUE from its first frame (only scale + lift
// animate, timed on the output frame), with faint placeholder pills from the start so it never sits half-empty.
// Entrance: s12's labels are already gone (they fade over its last 0.4 s); here the finger, nail and ruler fade to
// black over the first 0.25 s while the frame dims, and the card lands at 0.2 s with a 4-frame scale-in from 0.97,
// so nothing of the comparison pokes out around it. A very slow push-in keeps the 13 s hold alive.
// Layout computed top-down from text metrics; every line fitted to its box.
import * as L from '../../../../engine/runtime/lib.js';
import { drawComparison } from './s12-fingernails.js';

const { W, ease, clamp, prog } = L;
const CARD = { x: 80, w: 840, pad: 56, top: 590 };       // Shorts-safe: right edge 920 (< 940); ~690 px tall → bottom ≈ 1280 (above the caption band)
const INNER = CARD.w - 2 * CARD.pad;                      // 728 px of text width
const PILL = { h: 76, gap: 16, disc: 26, textX: 86, right: 30 };
// `at`: fraction of phrase 1 ("About six thousand years, | or about six hundred million years?") where the choice is said
const CHOICES = [
  { key: 'A', name: 'ABOUT 6,000 YEARS', phrase: 1, at: 0.0 },
  { key: 'B', name: 'ABOUT 600 MILLION YEARS', phrase: 1, at: 0.47 },
];
const HEAD = ['HOW LONG UNTIL THE MOON', 'IS TOO FAR AWAY FOR', 'TOTAL SOLAR ECLIPSES?'];

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
      { t: 0.2, name: 'bloom', gain: 0.3, pitch: 1.1 },
      { t: 4.62, name: 'blip', gain: 0.22, pitch: 1.0 },
      { t: 6.31, name: 'blip', gain: 0.22, pitch: 1.18 },
      { t: 8.81, name: 'ping', gain: 0.25, pitch: 1.0 },
    ];
  },
  drawOverlay(ctx, v) {
    // the film's final image (s12 hands over exactly at this beat's start; the motion-blur sub-frames just before
    // it are still s12's own), fading to black: labels already off, the subject out over 0.25 s
    const s12 = v.tl.scenes[v.index - 1];
    const sk = 1 - ease.inOutCubic(prog(v.t, 0.0, 0.25));
    if (v.gt >= s12.end) {
      ctx.save();
      drawComparison(ctx, { ...v, index: v.index - 1, t: v.gt - s12.start, d: s12.end - s12.start, k: 1, labelK: 0, subjectK: sk });
      ctx.restore();
    }
    // the frame dims to near-black over the first 0.3 s, under the card
    const dk = ease.inOutCubic(prog(v.t, 0.0, 0.3));
    if (dk > 0) {
      ctx.save();
      ctx.globalAlpha = 0.86 * dk;
      ctx.fillStyle = '#02060c';
      ctx.fillRect(0, 0, W, L.H);
      ctx.restore();
    }
    // timed on the output frame (not the motion-blur sub-frame), so no frame blends "card" with "no card"
    const tf = Math.round(v.gt * 30) / 30 - v.tl.scenes[v.index].start;
    if (tf < 0.2) return;
    const ck = ease.outCubic(prog(tf, 0.2, 4 / 30));
    const { x, w, pad } = CARD;
    const hold = ease.inOutCubic(prog(tf, 0.5, v.d - 0.5));
    const lift = (1 - ck) * 12, sc = (0.97 + 0.03 * ck) * (1 + 0.012 * hold);
    const white = '#fff', acc = L.rgba(v.accent);
    const hs = Math.min(...HEAD.map((h) => L.fitSize(ctx, h, INNER, 80, 800, L.FONT.display, 40)));
    // ---- layout (top-down, one even gap G between blocks; cap heights from the type sizes)
    const G = 50;
    const y0 = CARD.top;
    const kickY = y0 + pad + 19;                       // kicker baseline (26 px caps ≈ 19 px tall)
    const h1Y = kickY + G + Math.round(hs * 0.72);     // headline line 1 baseline
    const h2Y = h1Y + Math.round(hs * 1.05);           // headline line 2
    const h3Y = h2Y + Math.round(hs * 1.05);           // headline line 3
    const pillsY = h3Y + G;                            // first pill top
    const NC = CHOICES.length;
    const promptY = pillsY + NC * PILL.h + (NC - 1) * PILL.gap + 78;   // prompt baseline
    const bottom = promptY + pad - 6;                  // card bottom
    const cy = (y0 + bottom) / 2;
    ctx.save();
    ctx.translate(x + w / 2, cy + lift);
    ctx.scale(sc, sc);
    ctx.translate(-(x + w / 2), -cy);
    // card (opaque from its first frame)
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
    // headline: on with the card (the question is spoken 0.15 s into the beat)
    const p1 = phrase(v, 1), p2 = phrase(v, 2);
    fitted(ctx, [[HEAD[0], white]], x + pad, h1Y, INNER, hs);
    fitted(ctx, [[HEAD[1], white]], x + pad, h2Y, INNER, hs);
    fitted(ctx, [['TOTAL SOLAR ECLIPSES', acc], ['?', white]], x + pad, h3Y, INNER, hs);
    // choices: faint placeholder pills from the start, each lit on its word; aligned to the text column
    const nameMax = INNER - PILL.textX - PILL.right;
    const ns = Math.min(...CHOICES.map((c) => L.fitSize(ctx, c.name, nameMax, 42, 800, L.FONT.display, 26)));
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
    const fk = L.enter(v.t, p2.start - 0.05, 0.45);
    if (fk > 0) {
      ctx.globalAlpha = fk;
      ctx.textAlign = 'left';
      ctx.font = L.font(L.fitSize(ctx, 'TELL ME IN THE COMMENTS', nameMax, 34, 800, L.FONT.display, 24), 800, L.FONT.display);
      ctx.fillStyle = acc;
      L.trackedText(ctx, 'TELL ME IN THE COMMENTS', x + pad + PILL.textX, promptY + (1 - fk) * 10, 3);
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
