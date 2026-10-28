// Beat 8 — "What's the longest you've ever stayed awake? | Tell me in the comments."
// A cream notebook card, opaque from its FIRST frame (overlayIn false; it only settles 14 px / scale 0.985 → 1), under
// the log strip, y 470 → ≈ 1390 (captions are off here): kicker YOUR TURN; headline WHAT'S THE LONGEST / YOU'VE EVER /
// STAYED AWAKE? (the voice's words; one fitted size, AWAKE? in violet); three ink pills A) UNDER 24 H · B) 1 – 2 DAYS ·
// C) LONGER, each with a small drawn icon (a clock, a two-day
// calendar, a stack of pages), sliding in from the card's first frame and lighting in turn; TELL ME IN THE COMMENTS + a
// drawn arrow on phrase 1. Captions off.
import * as L from '../../../../engine/runtime/lib.js';
import { VIOLET, PAPER, INKP, B, PH, Wd } from '../env.js';

const { ease, clamp, prog } = L;
const TAU = Math.PI * 2;
const CARD = { x: 80, w: 920, pad: 64, top: 470 };
const INNER = CARD.w - 2 * CARD.pad;
const PILL = { h: 100, gap: 26, disc: 32, textX: 104 };
const CHOICES = [
  { key: 'A', name: 'UNDER 24 H', icon: 'clock' },
  { key: 'B', name: '1 – 2 DAYS', icon: 'cal' },
  { key: 'C', name: 'LONGER', icon: 'stack' },
];
function icon(c, kind, x, y, col) {
  c.save();
  c.strokeStyle = col; c.fillStyle = col; c.lineWidth = 4; c.lineCap = 'round'; c.lineJoin = 'round';
  if (kind === 'clock') {
    c.beginPath(); c.arc(x, y, 22, 0, TAU); c.stroke();
    c.beginPath(); c.moveTo(x, y); c.lineTo(x, y - 13); c.moveTo(x, y); c.lineTo(x + 10, y + 5); c.stroke();
  } else if (kind === 'cal') {
    for (const dx of [-14, 14]) {
      L.roundRect(c, x + dx - 13, y - 17, 26, 34, 4); c.stroke();
      c.fillRect(x + dx - 13, y - 17, 26, 9);
    }
  } else {
    for (let i = 0; i < 4; i++) { L.roundRect(c, x - 22 + i * 4, y - 18 + i * 9, 36, 10, 2); c.stroke(); }
  }
  c.restore();
}
function parts(ctx, ps, x, y, s) {
  ctx.font = L.font(s, 800, L.FONT.display);
  for (const [t, col] of ps) { ctx.fillStyle = col; ctx.fillText(t, x, y); x += ctx.measureText(t).width; }
}

export default {
  beat: 8,
  chapter: null,
  captions: false,
  overlayIn: false,
  layer: 12,
  drawOverlay(ctx, v) {
    const t = v.t, tl = v.tl;
    const p1 = PH(tl, 8, 1) - B(tl, 8);
    const settle = ease.outCubic(prog(t, 0, 0.5));
    const { x, w, pad } = CARD;
    const ink = L.rgba(INKP), acc = L.rgba(VIOLET.map((q) => q * 0.82));
    ctx.save();
    const y0 = CARD.top + (1 - settle) * 14;
    const kickY = y0 + 76;
    const h1Y = kickY + 104;
    const h2Y = h1Y + 98;
    const h3Y = h2Y + 98;
    const pillsY = h3Y + 54;
    const promptY = pillsY + CHOICES.length * PILL.h + (CHOICES.length - 1) * PILL.gap + 80;
    const bottom = promptY + 56;
    const sc = L.lerp(0.985, 1, settle), cx = x + w / 2, cy = (y0 + bottom) / 2;
    ctx.translate(cx, cy); ctx.scale(sc, sc); ctx.translate(-cx, -cy);
    ctx.shadowColor = 'rgba(0,0,0,0.6)'; ctx.shadowBlur = 40; ctx.shadowOffsetY = 12;
    ctx.fillStyle = L.rgba(PAPER);
    L.roundRect(ctx, x, y0, w, bottom - y0, 10); ctx.fill();
    ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0; ctx.shadowOffsetY = 0;
    // ruling + margin, like the other notebook cards
    ctx.save();
    L.roundRect(ctx, x, y0, w, bottom - y0, 10); ctx.clip();
    ctx.fillStyle = 'rgba(120,150,200,0.2)';
    for (let ry = y0 + 62; ry < bottom - 10; ry += 44) ctx.fillRect(x, ry, w, 1.5);
    ctx.fillStyle = 'rgba(214,96,104,0.5)'; ctx.fillRect(x + 40, y0, 2, bottom - y0);
    ctx.restore();
    ctx.textBaseline = 'alphabetic'; ctx.textAlign = 'left';
    // kicker
    ctx.fillStyle = acc;
    ctx.fillRect(x + pad, kickY - 10, 48, 6);
    ctx.font = L.font(26, 700, L.FONT.body);
    ctx.fillStyle = L.rgba(INKP, 0.85);
    L.trackedText(ctx, 'YOUR TURN', x + pad + 66, kickY, 5);
    // headline
    const HL = ['WHAT’S THE LONGEST', 'YOU’VE EVER', 'STAYED AWAKE?'];
    const hs = Math.min(...HL.map((t) => L.fitSize(ctx, t, INNER - 20, 104, 800, L.FONT.display, 50)));
    parts(ctx, [[HL[0], ink]], x + pad, h1Y, hs);
    parts(ctx, [[HL[1], ink]], x + pad, h2Y, hs);
    parts(ctx, [['STAYED ', ink], ['AWAKE?', acc]], x + pad, h3Y, hs);
    // pills
    const span = Math.max(1.2, p1 - 0.5);
    const ns = Math.min(...CHOICES.map((c) => L.fitSize(ctx, c.name, INNER - PILL.textX - 120, 50, 800, L.FONT.display, 26)));
    CHOICES.forEach((ch, i) => {
      const tin = i * 0.2;
      const k = L.enter(t, tin - 0.06, 0.4, ease.outBack);
      if (k <= 0) return;
      const litAt = 0.75 + i * span / 3;
      const lit = ease.outCubic(prog(t, litAt, 0.22)) * (1 - ease.inOutCubic(prog(t, litAt + span / 3 - 0.15, 0.3)));
      const ry = pillsY + i * (PILL.h + PILL.gap);
      const px = x + pad - 8, pw = INNER + 16;
      ctx.save();
      ctx.globalAlpha = clamp(k * 3);
      ctx.translate((1 - clamp(k)) * -30, 0);
      ctx.fillStyle = L.rgba(L.mix(INKP, [60, 40, 110], lit));
      L.roundRect(ctx, px, ry, pw, PILL.h, PILL.h / 2); ctx.fill();
      if (lit > 0.01) { ctx.strokeStyle = L.rgba(VIOLET, 0.9 * lit); ctx.lineWidth = 3; L.roundRect(ctx, px, ry, pw, PILL.h, PILL.h / 2); ctx.stroke(); }
      const dcx = px + PILL.h / 2, dcy = ry + PILL.h / 2;
      ctx.fillStyle = L.rgba(VIOLET);
      ctx.beginPath(); ctx.arc(dcx, dcy, Math.max(0, PILL.disc * (1 + 0.08 * lit)), 0, TAU); ctx.fill();
      ctx.fillStyle = 'rgb(18,10,34)';
      ctx.font = L.font(36, 800, L.FONT.display);
      ctx.textAlign = 'center';
      ctx.fillText(ch.key, dcx, dcy + 13);
      ctx.textAlign = 'left';
      ctx.fillStyle = L.rgba(PAPER);
      ctx.font = L.font(ns, 800, L.FONT.display);
      ctx.fillText(ch.name, px + PILL.textX, dcy + ns * 0.36);
      icon(ctx, ch.icon, px + pw - 70, dcy, L.rgba(PAPER, 0.7));
      ctx.restore();
    });
    // prompt
    const fk = L.enter(t, p1 - 0.25, 0.45);
    if (fk > 0) {
      ctx.save();
      ctx.globalAlpha = fk;
      const ps = L.fitSize(ctx, 'TELL ME IN THE COMMENTS', INNER - 90, 46, 800, L.FONT.display, 24);
      ctx.font = L.font(ps, 800, L.FONT.display);
      ctx.fillStyle = acc;
      L.trackedText(ctx, 'TELL ME IN THE COMMENTS', x + pad, promptY + (1 - fk) * 10, 3);
      const bob = Math.sin(t * 6) * 4;
      const ax = x + w - pad - 14, ay = promptY - 14 + bob;
      ctx.strokeStyle = acc; ctx.lineWidth = 5; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      ctx.beginPath(); ctx.moveTo(ax, ay - 22); ctx.lineTo(ax, ay + 14); ctx.moveTo(ax - 14, ay); ctx.lineTo(ax, ay + 14); ctx.lineTo(ax + 14, ay); ctx.stroke();
      ctx.restore();
    }
    ctx.restore();
  },
};
