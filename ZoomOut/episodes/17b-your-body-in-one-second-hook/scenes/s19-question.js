// Beat 19 (17b) — the closing question, over the held final shot (the whole glass body, the stopwatch ring still
// pulsing): "How many times will your heart beat in a lifetime? | About three million, | or about three billion? |
// Tell me in the comments." Two choices, each lit on its spoken number. Built on 13b's / 15b's card: OPAQUE from its
// first frame (only scale 0.94 -> 1 and a 24 px lift animate, timed on the output frame), landing at 0.4 s, after a
// short dim (0.05-0.3 s; s18's counter, closing line and sign-off have already faded out by the end of beat 18, so
// nothing ghosts through). The choices are readable but dimmed from the start, each lit on its phrase. Behind the card
// a faint heartbeat (lub-dub, ~70 a minute) glows at the heart's true place in the held body and, since the card
// covers it, in two soft glows above and below the card, so the frame never freezes. Layout computed top-down from text metrics; every line fitted to its box; the card's bottom is pinned at 1290.
// (Answer, for youtube.md ONLY, never on screen: B. ~70 beats/min x 60 x 24 x 365.25 x ~80 years ≈ 2.9 billion.)
import * as L from '../../../../engine/runtime/lib.js';
import { P } from '../env.js';

const { W, H, ease, clamp, prog } = L;
const CARD = { x: 80, w: 840, pad: 56, bottom: 1290 };   // Shorts-safe: right edge 920 (< 940); bottom above the captions band
const INNER = CARD.w - 2 * CARD.pad;                      // 728 px of text width
const PILL = { h: 76, gap: 16, disc: 26, textX: 86, right: 30 };
const HEAD = [[['HOW MANY TIMES', 'w']], [['WILL YOUR ', 'w'], ['HEART', 'a']], [['BEAT IN A LIFETIME?', 'w']]];
const CHOICES = [
  { key: 'A', name: 'ABOUT 3 MILLION', phrase: 1, at: 0.35 },   // "About | three million," (lights on the number)
  { key: 'B', name: 'ABOUT 3 BILLION', phrase: 2, at: 0.42 },   // "or about | three billion?"
];

/** phrase i of this beat's line, in beat-relative seconds */
function phrase(v, i) {
  const ln = v.tl.lines[v.index], s0 = v.tl.scenes[v.index].start, ph = ln.phrases ?? [ln];
  const p = ph[Math.min(i, ph.length - 1)];
  return { start: p.start - s0, end: p.end - s0 };
}

/** draw `parts` ([[text, colour], ...]) left-aligned at (x, y) at size s */
function parts(ctx, ps, x, y, s) {
  ctx.font = L.font(s, 800, L.FONT.display);
  for (const [t, col] of ps) { ctx.fillStyle = col; ctx.fillText(t, x, y); x += ctx.measureText(t).width; }
}

/** a faint heartbeat at the heart's place in the held body (lub-dub, ~70 a minute) */
function heartbeat(ctx, v, k) {
  const x = v.wx(P.heart.x), y = v.wy(P.heart.y);
  const ph = (v.t * 70 / 60) % 1;
  const e = Math.exp(-ph * 9) + 0.6 * Math.exp(-Math.max(0, ph - 0.16) * 11) * (ph > 0.16 ? 1 : 0);
  L.lightBlob(ctx, x, y, 150 + 40 * e, v.accent, (0.05 + 0.16 * e) * k);
  // the heart sits behind the card: the same lub-dub also breathes in two soft glows above and below it
  L.lightBlob(ctx, 540, 400, 460 + 30 * e, v.accent, (0.03 + 0.07 * e) * k);
  L.lightBlob(ctx, 540, 1540, 520 + 30 * e, v.accent, (0.025 + 0.06 * e) * k);
}

export default {
  beat: 19,
  chapter: null,
  captions: false,
  overlayIn: false,     // the card owns its own entrance (v.k = 1 from the first frame: no translucent fade)
  layer: 12,
  cues(d) {
    return [
      { t: 0.4, name: 'bloom', gain: 0.3, pitch: 1.1 },
      { t: 3.6, name: 'blip', gain: 0.22, pitch: 1.0 },
      { t: 5.5, name: 'blip', gain: 0.22, pitch: 1.18 },
      { t: 6.9, name: 'ping', gain: 0.25, pitch: 1.0 },
    ];
  },
  drawOverlay(ctx, v) {
    // timed on the output frame (not the motion-blur sub-frame), so no frame blends "card" with "no card"
    const tf = Math.round(v.gt * 30) / 30 - v.tl.scenes[v.index].start;
    // 1) the held body dims first (0.05-0.3 s), 2) then the card lands OPAQUE at 0.4 s on its first frame, scaling
    // 0.94 -> 1 (and lifting 24 px) over 5 frames
    const dk = ease.inOutCubic(prog(tf, 0.05, 0.25));
    if (dk <= 0) return;
    const LAND = 0.4;
    const ck = tf >= LAND - 1e-6 ? ease.outCubic(prog(tf, LAND, 5 / 30)) : -1;
    const { x, w, pad } = CARD;
    const lift = (1 - Math.max(0, ck)) * 24, sc = 0.94 + 0.06 * Math.max(0, ck);
    const white = '#fff', acc = L.rgba(v.accent);
    const hs = Math.min(...HEAD.map((ln) => L.fitSize(ctx, ln.map((p) => p[0]).join(''), INNER, 92, 800, L.FONT.display, 48)));
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
    // dim the held body almost fully: the card owns the frame; a faint heartbeat keeps it alive
    ctx.globalAlpha = dk * 0.86;
    ctx.fillStyle = '#02060c';
    ctx.fillRect(0, 0, W, H);
    ctx.globalAlpha = 1;
    heartbeat(ctx, v, dk);
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
    L.trackedText(ctx, 'YOUR TURN', x + pad + 66, kickY, 5);
    // headline: on with the card (the question is spoken 0.15 s into the beat); one shared size
    HEAD.forEach((ln, i) => parts(ctx, ln.map(([t, c]) => [t, c === 'a' ? acc : white]), x + pad, y0 + h1 + i * lineH, hs));
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
        ctx.beginPath(); ctx.arc(dcx, dcy, Math.max(0, PILL.disc * (0.6 + 0.4 * pop)), 0, Math.PI * 2); ctx.fill();
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
