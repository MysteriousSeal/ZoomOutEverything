// 17c beat 13 (17 legacy beat 19) — the closing question, over the held whole-body frame: "How many times will your
// heart beat in a lifetime? | About three million, or about three billion? | Tell me in the comments." Two choices,
// each lit on its spoken number ("three million" / "three billion", word times from the timeline). Built on 15c's
// card: OPAQUE from its first visible frame (only scale 0.94 -> 1 and a 24 px lift animate, timed on the output frame),
// landing at 0.4 s, after a short dim (0.1-0.35 s) that hides s18's fading counter and env's scale bar. The choices
// are readable but dimmed from the start. A slow, faint light drifts over the dimmed body (the renewal sparks keep
// blinking under the dim), so the frame never reads as a freeze. Layout computed top-down from text metrics, every
// line fitted to its box, the card's bottom pinned at 1290 (above the caption band; nothing at x > 920).
// The answer (B, about 3 billion) is never shown in the film; see youtube.md "Real answers".
import * as L from '../../../../engine/runtime/lib.js';
import { adapt, wordTime, TL } from '../legacy.js';

const { W, ease, clamp, prog } = L;
const CARD = { x: 80, w: 840, pad: 56, bottom: 1290 };   // Shorts-safe: right edge 920 (< 940); bottom above the captions band
const INNER = CARD.w - 2 * CARD.pad;                      // 728 px of text width
const PILL = { h: 76, gap: 16, disc: 26, textX: 86, right: 30 };
const HEAD = [[['HOW MANY TIMES', 'w']], [['WILL YOUR ', 'w'], ['HEART', 'a']], [['BEAT IN A LIFETIME?', 'w']]];
const CHOICES = [
  { key: 'A', name: 'ABOUT 3 MILLION', word: 0 },   // lights on the first "three" ("About three million,")
  { key: 'B', name: 'ABOUT 3 BILLION', word: 1 },   // …and on the second ("or about three billion?")
];
const LAND = 0.4;
const QL = TL.lines.length - 1, Q = (t) => t - TL.scenes[QL].start;   // cue times on the spoken words

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

/** a slow, faint drifting light over the dimmed background (the frame behind the card keeps breathing) */
function living(ctx, t, acc, k) {
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const blobs = [
    { x: 260 + 120 * Math.sin(t * 0.31), y: 520 + 90 * Math.cos(t * 0.23), r: 520, c: acc, a: 0.07 },
    { x: 820 + 110 * Math.cos(t * 0.27 + 1), y: 1180 + 80 * Math.sin(t * 0.35), r: 560, c: [255, 190, 196], a: 0.045 },
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

export const SCENE = {
  beat: 19,
  chapter: null,
  captions: false,
  overlayIn: false,     // the card owns its own entrance (v.k = 1 from the first frame: no translucent fade)
  layer: 12,
  cues(d) {
    return [
      { t: LAND, name: 'bloom', gain: 0.3, pitch: 1.1 },
      { t: Q(wordTime(TL, QL, /^three$/, 0)), name: 'blip', gain: 0.22, pitch: 1.0 },
      { t: Q(wordTime(TL, QL, /^three$/, 1)), name: 'blip', gain: 0.22, pitch: 1.18 },
      { t: Q(TL.lines[QL].phrases[2].start), name: 'ping', gain: 0.25, pitch: 1.0 },
    ];
  },
  drawOverlay(ctx, v) {
    // timed on the output frame (not the motion-blur sub-frame), so no frame blends "card" with "no card"
    const s0 = v.tl.scenes[v.index].start;
    const tf = Math.round(v.gt * 30) / 30 - s0;
    const dk = ease.inOutCubic(prog(tf, 0.1, 0.25));
    if (dk <= 0) return;
    const ck = tf >= LAND - 1e-6 ? ease.outCubic(prog(tf, LAND, 5 / 30)) : -1;
    const { x, w, pad } = CARD;
    const lift = (1 - Math.max(0, ck)) * 24, sc = 0.94 + 0.06 * Math.max(0, ck);
    const white = '#fff', acc = L.rgba(v.accent);
    const hs = Math.min(...HEAD.map((ln) => L.fitSize(ctx, ln.map((p) => p[0]).join(''), INNER, 84, 800, L.FONT.display, 44)));
    // ---- layout (top-down offsets, one even gap G between blocks; cap heights from the type sizes), pinned to the bottom
    const G = 50;
    const kickH = pad + 19;                              // kicker baseline (26 px caps ≈ 19 px tall)
    const h1H = kickH + G + Math.round(hs * 0.72);       // headline line 1 baseline
    const hLastH = h1H + (HEAD.length - 1) * Math.round(hs * 1.05);
    const pillsH = hLastH + G;                           // first pill top
    const promptH = pillsH + CHOICES.length * PILL.h + (CHOICES.length - 1) * PILL.gap + 78;   // prompt baseline
    const height = promptH + pad - 6;
    const bottom = CARD.bottom, y0 = bottom - height;
    const kickY = y0 + kickH, h1Y = y0 + h1H, pillsY = y0 + pillsH, promptY = y0 + promptH;
    const cy = (y0 + bottom) / 2;
    ctx.save();
    // dim the held body almost fully: the card owns the frame
    ctx.globalAlpha = dk * 0.86;
    ctx.fillStyle = '#05030a';
    ctx.fillRect(0, 0, W, L.H);
    ctx.globalAlpha = 1;
    living(ctx, v.t, v.accent, dk);
    if (ck < 0) { ctx.restore(); return; }
    ctx.translate(x + w / 2, cy + lift);
    ctx.scale(sc, sc);
    ctx.translate(-(x + w / 2), -cy);
    // card (opaque from its first frame)
    ctx.fillStyle = 'rgb(14,6,12)';
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
    ctx.fillStyle = 'rgba(232,226,230,0.9)';
    L.trackedText(ctx, 'YOUR TURN', x + pad + 66, kickY, 5);
    // headline: on with the card (the question is spoken from 0.15 s)
    HEAD.forEach((ln, i) => parts(ctx, ln.map(([t, c]) => [t, c === 'a' ? acc : white]), x + pad, h1Y + i * Math.round(hs * 1.05), hs));
    // choices: faint placeholder pills from the start, each lit on its spoken number; aligned to the text column
    const nameMax = INNER - PILL.textX - PILL.right;
    const ns = Math.min(...CHOICES.map((c) => L.fitSize(ctx, c.name, nameMax, 42, 800, L.FONT.display, 26)));
    const tl = v.tl.__tl ?? v.tl, li = tl.lines.length - 1;
    CHOICES.forEach((c, i) => {
      const at = wordTime(tl, li, /^three$/, c.word) - s0;
      const k = clamp(L.enter(v.t, at - 0.05, 0.4));
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
        ctx.fillStyle = '#1a0408';
        ctx.fillText(c.key, dcx, dcy + 11);
        ctx.restore();
      }
      // the choice is readable (dimmed) from the start and lights up on its spoken number
      ctx.textAlign = 'left';
      ctx.fillStyle = `rgba(255,255,255,${(0.34 + 0.66 * k).toFixed(3)})`;
      ctx.font = L.font(ns, 800, L.FONT.display);
      ctx.fillText(c.name, x + pad + PILL.textX + 6 * (1 - ease.outCubic(k)), dcy + ns * 0.36);
      ctx.restore();
    });
    // comment prompt, aligned with the choice names; the arrow sits on the disc column under the pills
    const p2 = phrase(v, 2);
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
// 17c: plays as 17c beat 13 on the legacy timeline (legacy beat 19; the camera holds 17's last shot, KEYS[18])
export default adapt(SCENE, 19);
