// Beat 7 — "Would you sail to Point Nemo? | Tell me in the comments."
// Shot 'question': globe low (top y ≈ 1000), slow spin, the Nemo pin still pulsing: background only.
// Opaque card from its FIRST frame (overlayIn: false; only settles 14 px / scale 0.985 → 1), x 80–940, y 360–≈ 990:
// kicker YOUR TURN; headline WOULD YOU SAIL / TO POINT NEMO? (POINT NEMO? in the accent); pills A) YES, I’D GO and
// B) NEVER slide in during phrase 0 and are LIT IN TURN; TELL ME IN THE COMMENTS + a bobbing drawn arrow on phrase 1.
// Captions off (the card says it).
import * as L from '../../../../engine/runtime/lib.js';
import { phrase, word } from '../env.js';

const { W, H, ease, clamp, prog } = L;
const CARD = { x: 80, w: 860, pad: 56, top: 360 };
const INNER = CARD.w - 2 * CARD.pad;                       // 748 px of text width
const PILL = { h: 78, gap: 18, disc: 26, textX: 88, right: 30 };
const CHOICES = [
  { key: 'A', name: 'YES, I’D GO' },
  { key: 'B', name: 'NEVER' },
];

/** draw `parts` ([[text, colour], ...]) left-aligned at (x, y) at font size s */
function parts(ctx, ps, x, y, s) {
  ctx.font = L.font(s, 800, L.FONT.display);
  for (const [t, col] of ps) { ctx.fillStyle = col; ctx.fillText(t, x, y); x += ctx.measureText(t).width; }
}

export default {
  beat: 7,
  chapter: null,
  captions: false,
  overlayIn: false,
  layer: 12,
  cues(d, tl) {
    const st = tl.scenes[7].start, w = (j, k) => tl.lines[7].phrases[j].words[k][0] - st;
    return [
      { t: -0.15, name: 'bloom', gain: 0.15, pitch: 1.1 },               // in the gap before "Would"
      { t: w(0, 2) + 0.12, name: 'blip', gain: 0.12, pitch: 1.0 },       // pill A lit (after "sail" onset)
      { t: w(0, 4) + 0.12, name: 'blip', gain: 0.13, pitch: 1.12 },      // pill B lit
      { t: w(1, 0) - 0.3, name: 'ping', gain: 0.18, pitch: 1.0 },        // the prompt, in the gap before "Tell"
    ];
  },
  drawOverlay(ctx, v) {
    const t = v.t;
    const p1 = phrase(v, 1);
    const settle = ease.outCubic(prog(t, 0, 0.5));
    const { x, w, pad } = CARD;
    const white = '#fff', acc = L.rgba(v.accent);
    ctx.save();
    // keep the bottom of the frame quiet (the globe stays as background)
    const bg = ctx.createLinearGradient(0, 1480, 0, H);
    bg.addColorStop(0, 'rgba(3,6,14,0)'); bg.addColorStop(0.45, 'rgba(3,6,14,0.45)'); bg.addColorStop(1, 'rgba(3,6,14,0.8)');
    ctx.fillStyle = bg; ctx.fillRect(0, 1480, W, H - 1480);
    // ---- layout (top-down, explicit gaps)
    const y0 = CARD.top + (1 - settle) * 14;
    const kickY = y0 + 74;
    const h1Y = kickY + 112;
    const h2Y = h1Y + 100;
    const pillsY = h2Y + 52;
    const promptY = pillsY + CHOICES.length * PILL.h + (CHOICES.length - 1) * PILL.gap + 76;
    const bottom = promptY + 50;
    // card (opaque from frame 1; a tiny scale settle about its centre)
    const sc = L.lerp(0.985, 1, settle), cx = x + w / 2, cy = (y0 + bottom) / 2;
    ctx.translate(cx, cy); ctx.scale(sc, sc); ctx.translate(-cx, -cy);
    ctx.shadowColor = 'rgba(0,0,0,0.55)'; ctx.shadowBlur = 40; ctx.shadowOffsetY = 12;
    ctx.fillStyle = 'rgb(8,13,28)';
    L.roundRect(ctx, x, y0, w, bottom - y0, 30);
    ctx.fill();
    ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0; ctx.shadowOffsetY = 0;
    // a faint warm wash from the top-left corner (the film's cold light), then the borders
    const wash = ctx.createRadialGradient(x, y0, 0, x, y0, 620);
    wash.addColorStop(0, L.rgba(v.accent, 0.1)); wash.addColorStop(1, L.rgba(v.accent, 0));
    ctx.fillStyle = wash;
    L.roundRect(ctx, x, y0, w, bottom - y0, 30); ctx.fill();
    ctx.strokeStyle = L.rgba(v.accent, 0.55);
    ctx.lineWidth = 2;
    L.roundRect(ctx, x, y0, w, bottom - y0, 30); ctx.stroke();
    ctx.strokeStyle = L.rgba(v.accent, 0.18);
    ctx.lineWidth = 1;
    L.roundRect(ctx, x + 12, y0 + 12, w - 24, bottom - y0 - 24, 20); ctx.stroke();
    ctx.textBaseline = 'alphabetic';
    ctx.textAlign = 'left';
    // kicker
    ctx.fillStyle = acc;
    ctx.fillRect(x + pad, kickY - 10, 48, 6);
    ctx.font = L.font(26, 700, L.FONT.body);
    ctx.fillStyle = 'rgba(225,230,238,0.9)';
    L.trackedText(ctx, 'YOUR TURN', x + pad + 66, kickY, 5);
    // headline (on the card from frame 1)
    const H1 = [['WOULD YOU SAIL', white]];
    const H2 = [['TO ', white], ['POINT NEMO?', acc]];
    const hs = Math.min(
      L.fitSize(ctx, 'WOULD YOU SAIL', INNER, 100, 800, L.FONT.display, 50),
      L.fitSize(ctx, 'TO POINT NEMO?', INNER, 100, 800, L.FONT.display, 50));
    parts(ctx, H1, x + pad, h1Y, hs);
    parts(ctx, H2, x + pad, h2Y, hs);
    // pills: slide in, then lit in turn (A, then B), then both settle to neutral before the prompt
    const nameMax = INNER + 16 - PILL.textX - PILL.right;
    const ns = Math.min(...CHOICES.map((c) => L.fitSize(ctx, c.name, nameMax, 42, 800, L.FONT.display, 26)));
    CHOICES.forEach((c, i) => {
      const tin = 0.04 + i * 0.12;   // pills arrive with the card: never an empty card
      const k = L.enter(t, tin, 0.42, ease.outBack);
      if (k <= 0) return;
      const litAt = word(v, 0, i ? 4 : 2, 0.12);
      const lit = ease.outCubic(prog(t, litAt, 0.25)) * (1 - ease.inOutCubic(prog(t, litAt + 0.85, 0.35)));
      const ry = pillsY + i * (PILL.h + PILL.gap);
      const px = x + pad - 8, pw = INNER + 16;
      ctx.save();
      ctx.globalAlpha = clamp(k);
      ctx.translate((1 - clamp(k)) * -30, 0);
      ctx.fillStyle = `rgba(255,255,255,${0.06 + 0.05 * lit})`;
      L.roundRect(ctx, px, ry, pw, PILL.h, PILL.h / 2);
      ctx.fill();
      if (lit > 0.01) {
        ctx.fillStyle = L.rgba(v.accent, 0.12 * lit);
        L.roundRect(ctx, px, ry, pw, PILL.h, PILL.h / 2); ctx.fill();
      }
      ctx.strokeStyle = lit > 0.01 ? L.rgba(L.mix([255, 255, 255], v.accent, lit), 0.14 + 0.76 * lit) : 'rgba(255,255,255,0.14)';
      ctx.lineWidth = 1.5 + 1.5 * lit;
      L.roundRect(ctx, px, ry, pw, PILL.h, PILL.h / 2);
      ctx.stroke();
      const dcx = px + PILL.h / 2, dcy = ry + PILL.h / 2;
      if (lit > 0.01) L.lightBlob(ctx, dcx, dcy, Math.max(0, 70), v.accent, 0.35 * lit);
      ctx.fillStyle = acc;
      ctx.beginPath(); ctx.arc(dcx, dcy, Math.max(0, PILL.disc * (1 + 0.08 * lit)), 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#0a0f20';
      ctx.font = L.font(30, 800, L.FONT.display);
      ctx.textAlign = 'center';
      ctx.fillText(c.key, dcx, dcy + 11);
      ctx.textAlign = 'left';
      ctx.fillStyle = white;
      ctx.font = L.font(ns, 800, L.FONT.display);
      ctx.fillText(c.name, px + PILL.textX, dcy + ns * 0.36);
      ctx.restore();
    });
    // comment prompt + bobbing arrow, on "Tell me in the comments"
    const fk = L.enter(t, p1 - 0.25, 0.45);   // with the ping, in the gap before "Tell"
    if (fk > 0) {
      ctx.save();
      ctx.globalAlpha = fk;
      const ps = L.fitSize(ctx, 'TELL ME IN THE COMMENTS', INNER - 80, 36, 800, L.FONT.display, 24);
      ctx.font = L.font(ps, 800, L.FONT.display);
      ctx.fillStyle = acc;
      L.trackedText(ctx, 'TELL ME IN THE COMMENTS', x + pad, promptY + (1 - fk) * 10, 3);
      const bob = Math.sin(t * 6) * 4;
      const ax = x + w - pad - 14, ay = promptY - 14 + bob;
      ctx.strokeStyle = acc;
      ctx.lineWidth = 5;
      ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      ctx.beginPath(); ctx.moveTo(ax, ay - 22); ctx.lineTo(ax, ay + 14); ctx.moveTo(ax - 14, ay); ctx.lineTo(ax, ay + 14); ctx.lineTo(ax + 14, ay); ctx.stroke();
      ctx.restore();
    }
    ctx.restore();
  },
};
