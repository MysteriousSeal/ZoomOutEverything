// Beat 13 (13b) — the closing question, over the held fossil-coral close-up: "At today's rate, how long until a day
// lasts 25 hours? | About 20,000 years, | or about 200 million years? | Tell me in the comments." Two choices, each lit
// on its spoken phrase. Built on 12b's card: OPAQUE from its first frame (only scale 0.94 -> 1 and a 24 px lift animate, timed
// on the output frame), landing at 0.15 s, on "At today's rate", after a short dim
// (0-0.13 s) that hides s12's fading label and env's scale bar. The choices are readable but dimmed from the start, each lit on its phrase.
// A slow, faint light drifts across the dimmed coral so the frame behind the card never reads as a freeze.
// Layout computed top-down from text metrics; every line fitted to its box; the card's bottom is pinned above 1290.
// (Answer for youtube.md: B. 1 h = 3,600,000 ms at ~1.8 ms per century ≈ 2 million centuries ≈ 200 million years.)
import * as L from '../../../../engine/runtime/lib.js';

const { W, H, ease, clamp, prog } = L;
const CARD = { x: 80, w: 840, pad: 56, bottom: 1290 };   // Shorts-safe: right edge 920 (< 940); bottom above the captions band
const INNER = CARD.w - 2 * CARD.pad;                      // 728 px of text width
const PILL = { h: 76, gap: 16, disc: 26, textX: 86, right: 30 };
const HEAD = [['HOW LONG UNTIL'], ['A DAY LASTS'], ['25 HOURS?', true]];   // [text, accent]
const CHOICES = [
  { key: 'A', name: 'ABOUT 20,000 YEARS', phrase: 1, at: 0.3 },        // "About | twenty thousand years," (lights on the number)
  { key: 'B', name: 'ABOUT 200 MILLION YEARS', phrase: 2, at: 0.3 },   // "or about | two hundred million years?"
];

/** phrase i of this beat's line, in beat-relative seconds */
function phrase(v, i) {
  const ln = v.tl.lines[v.index], s0 = v.tl.scenes[v.index].start, ph = ln.phrases ?? [ln];
  const p = ph[Math.min(i, ph.length - 1)];
  return { start: p.start - s0, end: p.end - s0 };
}

/** a slow, faint drifting light over the dimmed background (the frame behind the card keeps breathing) */
function living(ctx, t, acc, k) {
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const blobs = [
    { x: 260 + 120 * Math.sin(t * 0.31), y: 520 + 90 * Math.cos(t * 0.23), r: 520, c: acc, a: 0.07 },
    { x: 820 + 110 * Math.cos(t * 0.27 + 1), y: 1180 + 80 * Math.sin(t * 0.35), r: 560, c: [230, 205, 160], a: 0.05 },
  ];
  for (const b of blobs) {
    const g = ctx.createRadialGradient(b.x, b.y, 0, b.x, b.y, b.r);
    g.addColorStop(0, L.rgba(b.c, b.a * k));
    g.addColorStop(1, L.rgba(b.c, 0));
    ctx.fillStyle = g;
    ctx.fillRect(b.x - b.r, b.y - b.r, b.r * 2, b.r * 2);
  }
  ctx.restore();
}

export default {
  beat: 13,
  chapter: null,
  captions: false,
  overlayIn: false,     // the card owns its own entrance (v.k = 1 from the first frame: no translucent fade)
  layer: 12,
  cues(d) {
    return [
      { t: 0.15, name: 'bloom', gain: 0.3, pitch: 1.1 },
      { t: 4.75, name: 'blip', gain: 0.22, pitch: 1.0 },
      { t: 6.88, name: 'blip', gain: 0.22, pitch: 1.18 },
      { t: 8.7, name: 'ping', gain: 0.25, pitch: 1.0 },
    ];
  },
  drawOverlay(ctx, v) {
    // timed on the output frame (not the motion-blur sub-frame), so no frame blends "card" with "no card"
    const tf = Math.round(v.gt * 30) / 30 - v.tl.scenes[v.index].start;
    // 1) the held coral dims first (0-0.13 s, a short dim), 2) then the card lands OPAQUE at 0.15 s on its
    // first frame, scaling 0.94 -> 1 (and lifting 24 px) over 5 frames
    const dk = ease.inOutCubic(prog(tf, 0, 0.13));
    if (dk <= 0) return;
    const LAND = 0.15;   // on "At today's rate" (the voice starts 0.15 s into the beat)
    const ck = tf >= LAND - 1e-6 ? ease.outCubic(prog(tf, LAND, 5 / 30)) : -1;
    const { x, w, pad } = CARD;
    const lift = (1 - Math.max(0, ck)) * 24, sc = 0.94 + 0.06 * Math.max(0, ck);
    const white = '#fff', acc = L.rgba(v.accent);
    const hs = Math.min(...HEAD.map(([t]) => L.fitSize(ctx, t, INNER, 96, 800, L.FONT.display, 50)));
    // ---- layout (top-down, one even gap G between blocks; cap heights from the type sizes), then pinned to the bottom
    const G = 50;
    const kickH = pad + 19;                                             // kicker baseline from the card top (26 px caps ≈ 19 px)
    const h1 = kickH + G + Math.round(hs * 0.72);                       // headline line 1 baseline
    const lineH = Math.round(hs * 1.05);
    const pillsH = h1 + (HEAD.length - 1) * lineH + G;                  // first pill top
    const promptH = pillsH + CHOICES.length * PILL.h + (CHOICES.length - 1) * PILL.gap + 78;   // prompt baseline
    const cardH = promptH + pad - 6;
    const y0 = CARD.bottom - cardH, bottom = CARD.bottom;
    const cy = (y0 + bottom) / 2;
    ctx.save();
    // dim the held coral almost fully: the card owns the frame; a faint drifting light keeps it alive
    ctx.globalAlpha = dk * 0.86;
    ctx.fillStyle = '#02060c';
    ctx.fillRect(0, 0, W, H);
    ctx.globalAlpha = 1;
    living(ctx, v.t, v.accent, dk);
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
    const kickY = y0 + kickH;
    ctx.fillStyle = acc;
    ctx.fillRect(x + pad, kickY - 10, 48, 6);
    ctx.font = L.font(26, 700, L.FONT.body);
    ctx.fillStyle = 'rgba(225,230,238,0.9)';
    L.trackedText(ctx, 'YOUR TURN  ·  AT TODAY\'S RATE', x + pad + 66, kickY, 4);   // the spoken qualifier, kept on the card
    // headline: on with the card (the question is spoken 0.15 s into the beat); one shared size
    ctx.font = L.font(hs, 800, L.FONT.display);
    HEAD.forEach(([t, a], i) => { ctx.fillStyle = a ? acc : white; ctx.fillText(t, x + pad, y0 + h1 + i * lineH); });
    // choices: dimmed (readable) from the start, each lit on its phrase; aligned to the text column
    const pillsY = y0 + pillsH;
    const nameMax = INNER - PILL.textX - PILL.right;
    const ns = Math.min(...CHOICES.map((c) => L.fitSize(ctx, c.name, nameMax, 42, 800, L.FONT.display, 26)));
    CHOICES.forEach((c, i) => {
      const p = phrase(v, c.phrase);
      const k = clamp(L.enter(v.t, p.start + c.at * (p.end - p.start) - 0.05, 0.4));
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
      ctx.textAlign = 'left';
      ctx.fillStyle = `rgba(255,255,255,${(0.34 + 0.66 * k).toFixed(3)})`;
      ctx.font = L.font(ns, 800, L.FONT.display);
      ctx.fillText(c.name, x + pad + PILL.textX + 6 * (1 - ease.outCubic(k)), dcy + ns * 0.36);
      ctx.restore();
    });
    // comment prompt, aligned with the choice names; the arrow sits on the disc column under the pills
    const promptY = y0 + promptH;
    const p3 = phrase(v, 3);
    const fk = L.enter(v.t, p3.start - 0.05, 0.45);
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
