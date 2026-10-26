// Beat 13 (09b) — the closing question, over the held blue planet and its three water beads: "Did you think there was
// more water? | Way more, about this, or less? | Tell me in the comments." Three choices, each lit on its word.
// Built on the 04b/08b pattern: the card is OPAQUE from its first frame (only scale + lift animate, timed on the output
// frame), lands 0.1 s into the beat so the question is readable as it is spoken, and shows faint placeholder pills from
// the start so it never sits half-empty. Layout computed top-down from text metrics; every line fitted to its box.
import * as L from '../../../../engine/runtime/lib.js';

const { W, ease, clamp, prog } = L;
const CARD = { x: 80, w: 840, pad: 56, top: 630 };       // Shorts-safe: right edge 920 (< 940); ~730 px tall → bottom ≈ 1360 (captions are off)
const INNER = CARD.w - 2 * CARD.pad;                      // 728 px of text width
const PILL = { h: 76, gap: 16, disc: 26, textX: 86, right: 30 };
const CHOICES = [
  { key: 'A', name: 'WAY MORE', phrase: 1, at: 0.0 },
  { key: 'B', name: 'ABOUT THIS', phrase: 1, at: 0.31 },   // ElevenLabs VO: "about" ~+2.91 s, after a pause
  { key: 'C', name: 'LESS', phrase: 1, at: 0.82 },   // "less" ~+4.07 s, after a pause
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
  overlayIn: false,     // the card owns its own entrance (v.k = 1 from the first frame: no translucent fade)
  layer: 12,
  cues(d) {
    return [
      { t: 0.12, name: 'bloom', gain: 0.3, pitch: 1.1 },
      { t: 2.2, name: 'blip', gain: 0.22, pitch: 1.0 },     // A lights at +2.20 ("Way", phrase 1 at +2.25)
      { t: 2.9, name: 'blip', gain: 0.22, pitch: 1.12 },    // B lights at +2.90 ("about" ~+2.91)
      { t: 4.06, name: 'blip', gain: 0.22, pitch: 1.24 },   // C lights at +4.06 ("less" ~+4.07)
      { t: 5.16, name: 'ping', gain: 0.25, pitch: 1.0 },    // "Tell me in the comments" at +5.21
    ];
  },
  drawOverlay(ctx, v) {
    // timed on the output frame (not the motion-blur sub-frame), so no frame blends "card" with "no card"
    const tf = Math.round(v.gt * 30) / 30 - v.tl.scenes[v.index].start;
    const ck = ease.outCubic(prog(tf, 0.1, 0.3));
    if (ck <= 0) return;
    const { x, w, pad } = CARD;
    const lift = (1 - ck) * 30, sc = 0.94 + 0.06 * ck;
    const white = '#fff', acc = L.rgba(v.accent);
    const hs = Math.min(
      L.fitSize(ctx, 'DID YOU THINK THERE', INNER, 96, 800, L.FONT.display, 50),
      L.fitSize(ctx, 'WAS MORE WATER?', INNER, 96, 800, L.FONT.display, 50));
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
    // dim the held planet almost fully: the card owns the frame, nothing behind reads as an accidental crop
    ctx.globalAlpha = ck * 0.86;
    ctx.fillStyle = '#02060c';
    ctx.fillRect(0, 0, W, L.H);
    ctx.globalAlpha = 1;
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
    fitted(ctx, [['DID YOU THINK THERE', white]], x + pad, h1Y, INNER, hs);
    fitted(ctx, [['WAS MORE ', white], ['WATER', acc], ['?', white]], x + pad, h2Y, INNER, hs);
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
