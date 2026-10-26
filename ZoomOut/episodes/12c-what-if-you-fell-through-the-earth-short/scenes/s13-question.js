// Beat 10 (12c) — the closing question, over the held London–New York chord: "Through the Moon instead, |
// would the trip be shorter or longer? | Tell me in the comments." Two choices, each lit on its spoken word.
// Built on 09b's card: OPAQUE from its first frame (only scale + lift animate, timed on the output frame), landing
// after the held globe has dimmed (0.1-0.35 s; s12's tags and trip clock fade with the overlay by ~0.25 s), with the
// choices readable but dimmed from the start, each lit on its spoken word. Layout computed top-down from text metrics;
// every line fitted to its box. (Answer for youtube.md: longer, ~54 min; the trip time depends only on density.)
import * as L from '../../../../engine/runtime/lib.js';

const { W, ease, clamp, prog } = L;
const CARD = { x: 80, w: 840, pad: 56, top: 620 };       // Shorts-safe: right edge 920 (< 940); ~640 px tall → bottom ≈ 1260 (< 1300)
const INNER = CARD.w - 2 * CARD.pad;                      // 728 px of text width
const PILL = { h: 76, gap: 16, disc: 26, textX: 86, right: 30 };
const CHOICES = [
  { key: 'A', name: 'SHORTER', phrase: 1, at: 0.47 },   // "would the trip be | shorter | or longer?" (character share)
  { key: 'B', name: 'LONGER', phrase: 1, at: 0.79 },
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
  beat: 10,
  chapter: null,
  captions: false,
  overlayIn: false,     // the card owns its own entrance (v.k = 1 from the first frame: no translucent fade)
  layer: 12,
  cues(d) {
    return [
      { t: 0.12, name: 'bloom', gain: 0.3, pitch: 1.1 },
      { t: 3.15, name: 'blip', gain: 0.22, pitch: 1.0 },
      { t: 3.55, name: 'blip', gain: 0.22, pitch: 1.18 },
      { t: 4.6, name: 'ping', gain: 0.25, pitch: 1.0 },
    ];
  },
  drawOverlay(ctx, v) {
    // timed on the output frame (not the motion-blur sub-frame), so no frame blends "card" with "no card"
    const tf = Math.round(v.gt * 30) / 30 - v.tl.scenes[v.index].start;
    // 1) the held globe dims first (0.1-0.35 s, as s12's labels finish fading), 2) then the card lands OPAQUE on its
    // first frame, scaling 0.94 -> 1 (and lifting 24 px) over 5 frames
    // f12cc: dim 0.0-0.15 s and land at 0.12 s, on the first spoken word (was 0.35 s: a dark empty beat under "Through")
    const dk = ease.inOutCubic(prog(tf, 0, 0.15));
    if (dk <= 0) return;
    const LAND = 0.12;
    const ck = tf >= LAND - 1e-6 ? ease.outCubic(prog(tf, LAND, 5 / 30)) : -1;
    const { x, w, pad } = CARD;
    const lift = (1 - Math.max(0, ck)) * 24, sc = 0.94 + 0.06 * Math.max(0, ck);
    const white = '#fff', acc = L.rgba(v.accent);
    // the spoken question: "Through the Moon instead, would the trip be shorter or longer?"
    const H1 = 'THROUGH THE MOON INSTEAD:', H2 = 'SHORTER OR LONGER?';
    // two tiers: the set-up line, then the question itself, larger (each fitted to the text column)
    const hs1 = L.fitSize(ctx, H1, INNER, 66, 800, L.FONT.display, 40);
    const hs = L.fitSize(ctx, H2, INNER, 92, 800, L.FONT.display, 40);
    // ---- layout (top-down, one even gap G between blocks; cap heights from the type sizes)
    const G = 50;
    const y0 = CARD.top;
    const kickY = y0 + pad + 19;                       // kicker baseline (26 px caps ≈ 19 px tall)
    const h1Y = kickY + G + Math.round(hs1 * 0.72);    // headline line 1 baseline
    const h2Y = h1Y + Math.round(hs1 * 0.36 + hs * 0.86);   // headline line 2 (its cap height + a 0.36-line gap)
    const pillsY = h2Y + G;                            // first pill top
    const promptY = pillsY + CHOICES.length * PILL.h + (CHOICES.length - 1) * PILL.gap + 78;   // prompt baseline
    const bottom = promptY + pad - 6;                  // card bottom
    const cy = (y0 + bottom) / 2;
    ctx.save();
    // dim the held globe almost fully: the card owns the frame, nothing behind reads as an accidental crop
    ctx.globalAlpha = dk * 0.86;
    ctx.fillStyle = '#02060c';
    ctx.fillRect(0, 0, W, L.H);
    ctx.globalAlpha = 1;
    if (ck < 0) { ctx.restore(); return; }
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
    fitted(ctx, [['THROUGH THE ', white], ['MOON', acc], [' INSTEAD:', white]], x + pad, h1Y, INNER, hs1);
    fitted(ctx, [[H2, white]], x + pad, h2Y, INNER, hs);
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
        ctx.save();
        ctx.globalAlpha = k;
        const pop = ease.outBack(k);
        ctx.fillStyle = acc;
        ctx.beginPath(); ctx.arc(dcx, dcy, PILL.disc * (0.6 + 0.4 * pop), 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#04121c';
        ctx.fillText(c.key, dcx, dcy + 11);
        ctx.restore();
      }
      // the choice is readable (dimmed) from the start and lights up on its spoken word
      ctx.textAlign = 'left';
      ctx.fillStyle = `rgba(255,255,255,${(0.34 + 0.66 * k).toFixed(3)})`;
      ctx.font = L.font(ns, 800, L.FONT.display);
      ctx.fillText(c.name, x + pad + PILL.textX + 6 * (1 - ease.outCubic(k)), dcy + ns * 0.36);
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
