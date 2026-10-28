// Beat 1 — "August sixth, 1945. | Tsutomu Yamaguchi, an engineer, is on a business trip to Hiroshima."
// Phrase 0: the tear-off calendar page (env.calendar): AUGUST + 6 arrive together just before "sixth", the 1945 ink
// stamp lands on "nineteen"; then it shrinks into the date chip (top left) as phrase 1 starts.
// Phrase 1: the engineer's ID card (paper, no portrait: a briefcase pictogram sits in the photo slot). The name types
// in on "Tsutomu", the occupation ENGINEER · MITSUBISHI on "engineer", his seal stamps after it. Meanwhile (env) his
// marker travels the railway from Nagasaki to Hiroshima, landing on "Hiroshima".
import * as L from '../../../../engine/runtime/lib.js';
import { ACC, EMBER, IVORY, PAPER, INKP, MUTED, KANJI, kfont, moments, calendar, life, lifeXf, txt, tw, BE, W } from '../env.js';

const CARD = { x: 100, y: 372, w: 880, h: 336 };
const SLOT = { x: 140, y: 448, w: 190, h: 222 };
const FX = 372;   // field column

/** briefcase pictogram centred at (x, y), width s */
export function briefcase(c, x, y, s, col) {
  c.save();
  c.translate(x, y);
  const w = s, h = s * 0.68;
  c.fillStyle = L.rgba(col);
  c.strokeStyle = L.rgba(col);
  c.lineWidth = s * 0.07;
  // handle
  L.roundRect(c, -w * 0.18, -h / 2 - s * 0.17, w * 0.36, s * 0.22, s * 0.06); c.stroke();
  // body
  L.roundRect(c, -w / 2, -h / 2, w, h, s * 0.08); c.fill();
  // seam + latch (cut out in the slot colour)
  c.globalCompositeOperation = 'destination-out';
  c.fillRect(-w / 2, -h * 0.12, w, s * 0.045);
  c.globalCompositeOperation = 'source-over';
  c.fillStyle = L.rgba(col);
  L.roundRect(c, -s * 0.07, -h * 0.2, s * 0.14, s * 0.13, s * 0.025); c.fill();
  c.restore();
}

/** text revealed character by character (typewriter) from t0 over dur, with a caret while typing */
function typed(c, str, x, y, f, col, t, t0, dur, track = 1) {
  const n = Math.floor(str.length * L.clamp((t - t0) / dur) + 1e-6);
  if (t < t0) return;
  const shown = str.slice(0, Math.max(0, n));
  const w = txt(c, shown, x, y, f, col, { track });
  if (n < str.length) {
    c.fillStyle = L.rgba(col, 0.8);
    c.fillRect(x + w + 6, y - 40, 4, 46);
  }
}

export default {
  beat: 1,
  chapter: null,
  captions: true,
  overlayIn: false,
  layer: 5,
  drawOverlay(c, v) {
    const tl = v.tl, m = moments(tl), gt = v.gt;
    // ---- the calendar (phrase 0)
    calendar(c, v, { day: '6', tIn: m.sixth - 0.3, tStamp: m.y1945, tDock: m.dock1 });

    // ---- the ID card (phrase 1)
    const lf = life(gt, m.name - 0.12, BE(tl, 1, -0.02));
    if (!lf.on) return;
    const { x, y, w, h } = CARD;
    c.save();
    lifeXf(c, lf, x + w / 2, y + h / 2);
    c.shadowColor = 'rgba(0,0,0,0.55)'; c.shadowBlur = 40; c.shadowOffsetY = 10;
    c.fillStyle = L.rgba(PAPER);
    L.roundRect(c, x, y, w, h, 20); c.fill();
    c.shadowColor = 'transparent';
    // header band
    c.save();
    L.roundRect(c, x, y, w, h, 20); c.clip();
    c.fillStyle = 'rgb(34,40,56)';
    c.fillRect(x, y, w, 52);
    c.fillStyle = L.rgba(EMBER);
    c.fillRect(x, y + 52, w, 4);
    c.restore();
    c.globalAlpha *= lf.ck;
    txt(c, '身分証明書', x + 40, y + 27, kfont(24, 600), IVORY, { base: 'middle', track: 6 });
    // guilloche-ish hairlines on the right of the header
    c.strokeStyle = 'rgba(242,234,216,0.25)'; c.lineWidth = 1;
    for (let i = 0; i < 5; i++) { c.beginPath(); c.moveTo(x + w - 260, y + 14 + i * 6); c.lineTo(x + w - 40, y + 14 + i * 6); c.stroke(); }
    // photo slot with the briefcase (no portrait)
    c.fillStyle = 'rgb(206,196,174)';
    L.roundRect(c, SLOT.x, SLOT.y, SLOT.w, SLOT.h, 10); c.fill();
    c.strokeStyle = 'rgba(30,28,34,0.35)'; c.lineWidth = 2; c.stroke();
    briefcase(c, SLOT.x + SLOT.w / 2, SLOT.y + SLOT.h / 2 + 10, 112, [52, 50, 58]);
    // fields
    const lab = L.font(20, 700, L.FONT.body);
    txt(c, 'NAME', FX, SLOT.y + 22, lab, MUTED.map((q) => q * 0.6), { track: 4 });
    const nf = L.font(L.fitSize(c, 'TSUTOMU YAMAGUCHI', x + w - FX - 40, 64, 800, L.FONT.display, 30), 800, L.FONT.display);
    typed(c, 'TSUTOMU YAMAGUCHI', FX, SLOT.y + 86, nf, INKP, gt, m.name, 0.55, 1);
    // kanji name under it
    const kk = L.ease.outCubic(L.prog(gt, m.name + 0.5, 0.35));
    if (kk > 0) { c.save(); c.globalAlpha *= kk; txt(c, '山口 彊', FX, SLOT.y + 124, kfont(26, 600), [80, 74, 70]); c.restore(); }
    // rule
    c.fillStyle = 'rgba(30,28,34,0.18)';
    c.fillRect(FX, SLOT.y + 146, x + w - FX - 40, 2);
    txt(c, 'OCCUPATION', FX, SLOT.y + 180, lab, MUTED.map((q) => q * 0.6), { track: 4 });
    const of = L.font(L.fitSize(c, 'ENGINEER · MITSUBISHI', x + w - FX - 170, 48, 800, L.FONT.display, 26), 800, L.FONT.display);
    typed(c, 'ENGINEER · MITSUBISHI', FX, SLOT.y + 222, of, INKP, gt, m.engineer - 0.04, 0.5, 1);
    // his seal (hanko) stamps after the occupation
    const sk = L.prog(gt, m.engineer + 0.62, 0.3);
    if (sk > 0) {
      const e = L.ease.outBack(sk, 2);
      c.save();
      c.translate(x + w - 66, y + h - 74);
      c.rotate(0.08);
      const s2 = L.lerp(1.6, 1, L.clamp(e));
      c.scale(s2, s2);
      c.globalAlpha *= L.clamp(sk * 3) * 0.9;
      c.strokeStyle = L.rgba(EMBER); c.lineWidth = 4;
      c.beginPath(); c.arc(0, 0, 40, 0, Math.PI * 2); c.stroke();
      c.font = kfont(28, 700); c.fillStyle = L.rgba(EMBER); c.textAlign = 'center'; c.textBaseline = 'middle';
      c.fillText('山', 0, -13); c.fillText('口', 0, 16);
      c.restore();
    }
    c.restore();
    void ACC; void KANJI; void tw; void W;
  },
};
