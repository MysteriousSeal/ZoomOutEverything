// Beat 7 — "Would you know where to go? | Tell me in the comments."
// Times (current 60.06 s timeline, beat 54.33–60.06; phrase 0 54.48, phrase 1 56.37). Modelled on ep 24 s13-question.js,
// in the series' civil-defence language. overlayIn false: the OPAQUE card (and the 45 % scene dim) is there from the
// beat's first frame, settling from 1.03× scale over 0.4 s (no fade, so nothing from beat 6 ghosts through).
//   card x 80–940, top y 400, bottom ≈ 1150 (layout top-down from the text metrics), hazard-stripe band along its top.
//   kicker: a mini yellow STEP-style tile with "?" + YOUR TURN · headline WOULD YOU KNOW / WHERE TO GO? (one shared
//   fitted size, on from frame 1 with the card) · pills A) YES, I HAVE A PLAN and B) NO IDEA slide in on phrase 0
//   (+0.75 / +0.95 s) and light up in turn (A ≈ 55.4–56.2, B ≈ 56.0–56.8), then rest at a neutral glow ·
//   TELL ME IN THE COMMENTS + a drawn, bobbing arrow on phrase 1. Holds to the end (60.06).
import * as L from '../../../../engine/runtime/lib.js';
import { CD, TEXT } from '../env.js';

const { W, ease, clamp } = L;
const CARD = { x: 80, w: 860, pad: 56, top: 560 };   // the building + street stay framed under it (y ≈ 1300–1560)
const INNER = CARD.w - 2 * CARD.pad;
const PILL = { h: 86, gap: 18, disc: 28, textX: 94 };
const CHOICES = [{ key: 'A', name: 'YES, I HAVE A PLAN', in: 0.25, lit: 1.0 }, { key: 'B', name: 'NO IDEA', in: 0.45, lit: 1.6 }];   // in: beat-local s
const ph = (v, j) => v.tl.lines[v.index].phrases[j].start - v.tl.scenes[v.index].start;

export default {
  beat: 7,
  chapter: null,
  captions: false,
  overlayIn: false,
  layer: 12,
  cues(d) {
    return [
      { t: 0.02, name: 'bloom', gain: 0.25, pitch: 1.1 },
      { t: 1.0, name: 'blip', gain: 0.2, pitch: 1.0 },
      { t: 1.6, name: 'blip', gain: 0.2, pitch: 1.2 },
      { t: 2.0, name: 'ping', gain: 0.22, pitch: 1.0 },
    ];
  },
  drawOverlay(c, v) {
    const ck = v.k;
    const { x, w, pad } = CARD;
    const p0 = ph(v, 0), p1 = ph(v, 1);
    const y0 = CARD.top, kickY = y0 + 92, h1Y = kickY + 118, h2Y = h1Y + 104, pillsY = h2Y + 56;
    const promptY = pillsY + CHOICES.length * (PILL.h + PILL.gap) + 58, bottom = promptY + 52;
    const acc = L.rgba(CD.yellow);
    c.save();
    // the scene dims behind the card (from frame 1)
    c.globalAlpha = ck * 0.45; c.fillStyle = '#02060c'; c.fillRect(0, 0, W, L.H);
    c.globalAlpha = ck;
    // settle: 1.03 → 1 around the card centre
    const st = 1 + 0.03 * (1 - ease.outCubic(L.prog(v.t, 0, 0.4)));
    const cy = (y0 + bottom) / 2;
    c.translate(W / 2, cy); c.scale(st, st); c.translate(-W / 2, -cy);
    // card: fully opaque
    c.shadowColor = 'rgba(0,0,0,0.6)'; c.shadowBlur = 40; c.shadowOffsetY = 10;
    c.fillStyle = 'rgb(12,12,15)';
    L.roundRect(c, x, y0, w, bottom - y0, 26); c.fill();
    c.shadowColor = 'transparent';
    // hazard band along the top (clipped to the card's rounded top)
    c.save();
    L.roundRect(c, x, y0, w, bottom - y0, 26); c.clip();
    const bh = 12;
    c.fillStyle = acc; c.fillRect(x, y0, w, bh);
    c.fillStyle = L.rgba(CD.black);
    c.beginPath();
    for (let sx = x - bh; sx < x + w + bh; sx += 32) { c.moveTo(sx, y0 + bh); c.lineTo(sx + 16, y0 + bh); c.lineTo(sx + 16 + bh, y0); c.lineTo(sx + bh, y0); c.closePath(); }
    c.fill();
    c.restore();
    c.strokeStyle = L.rgba(CD.yellow, 0.5); c.lineWidth = 2;
    L.roundRect(c, x, y0, w, bottom - y0, 26); c.stroke();
    c.strokeStyle = L.rgba(CD.yellow, 0.18); c.lineWidth = 1;
    L.roundRect(c, x + 12, y0 + 24, w - 24, bottom - y0 - 36, 18); c.stroke();
    c.textBaseline = 'alphabetic';
    c.textAlign = 'left';
    // kicker: mini "?" tile + YOUR TURN
    const ts = 46, tx = x + pad, ty = kickY - 34;
    c.fillStyle = acc; L.roundRect(c, tx, ty, ts, ts, 7); c.fill();
    c.fillStyle = L.rgba(CD.ink); c.font = L.font(38, 700, L.FONT.din); c.textAlign = 'center';
    c.fillText('?', tx + ts / 2, ty + ts - 9);
    c.textAlign = 'left';
    c.font = L.font(26, 700, L.FONT.body); c.fillStyle = 'rgba(225,230,238,0.9)';
    L.trackedText(c, 'YOUR TURN', tx + ts + 18, kickY, 5);
    // headline (with the card from frame 1)
    const H1 = 'WOULD YOU KNOW', H2 = 'WHERE TO GO?';
    const hs = Math.min(L.fitSize(c, H1, INNER, 108, 800, L.FONT.display, 50), L.fitSize(c, H2, INNER, 108, 800, L.FONT.display, 50));
    c.font = L.font(hs, 800, L.FONT.display);
    c.fillStyle = L.rgba(TEXT); c.fillText(H1, x + pad, h1Y);
    c.fillStyle = acc; c.fillText(H2, x + pad, h2Y);
    // pills: slide in on phrase 0, light up in turn, then rest
    const ns = Math.min(...CHOICES.map((q) => L.fitSize(c, q.name, INNER - PILL.textX - 30, 46, 800, L.FONT.display, 26)));
    CHOICES.forEach((q, i) => {
      const k = L.enter(v.t, q.in - 0.1, 0.4, ease.outBack);
      if (k <= 0) return;
      const lit = L.smoothstep(L.prog(v.t, p0 + q.lit - 0.15, 0.2)) * (1 - L.smoothstep(L.prog(v.t, p0 + q.lit + 0.55, 0.3)));
      const ry = pillsY + i * (PILL.h + PILL.gap);
      c.save();
      c.globalAlpha = ck * clamp(k);
      c.translate((1 - clamp(k)) * -30, 0);
      const px = x + pad - 8, pw = INNER + 16;
      c.fillStyle = `rgba(255,204,0,${0.07 + 0.2 * lit})`;
      L.roundRect(c, px, ry, pw, PILL.h, PILL.h / 2); c.fill();
      c.strokeStyle = `rgba(255,204,0,${0.22 + 0.6 * lit})`; c.lineWidth = 2;
      c.stroke();
      const dx = px + PILL.h / 2, dy = ry + PILL.h / 2;
      c.fillStyle = acc; c.beginPath(); c.arc(dx, dy, Math.max(0, PILL.disc * (1 + 0.12 * lit)), 0, Math.PI * 2); c.fill();
      c.fillStyle = L.rgba(CD.ink); c.font = L.font(32, 800, L.FONT.display); c.textAlign = 'center'; c.fillText(q.key, dx, dy + 11);
      c.textAlign = 'left'; c.fillStyle = L.rgba(L.mix([236, 236, 232], [255, 255, 255], lit)); c.font = L.font(ns, 800, L.FONT.display);
      c.fillText(q.name, px + PILL.textX, dy + ns * 0.36);
      c.restore();
    });
    // TELL ME IN THE COMMENTS + drawn arrow (phrase 1)
    const fk = L.enter(v.t, p1 - 0.05, 0.45);
    if (fk > 0) {
      c.save();
      c.globalAlpha = ck * fk;
      const txt = 'TELL ME IN THE COMMENTS';
      c.letterSpacing = '3px';
      const fs = L.fitSize(c, txt, INNER - 80, 40, 800, L.FONT.display, 24);
      c.letterSpacing = '0px';
      c.font = L.font(fs, 800, L.FONT.display); c.fillStyle = acc;
      L.trackedText(c, txt, x + pad, promptY + (1 - fk) * 10, 3);
      const bob = Math.sin((v.t - p1) * 5) * 5;
      const ax = x + w - pad - 18, ay = promptY - 16 + bob;
      c.strokeStyle = acc; c.lineWidth = 5; c.lineCap = 'round'; c.lineJoin = 'round';
      c.beginPath(); c.moveTo(ax, ay - 24); c.lineTo(ax, ay + 14); c.moveTo(ax - 14, ay); c.lineTo(ax, ay + 14); c.lineTo(ax + 14, ay); c.stroke();
      c.restore();
    }
    c.restore();
  },
};
