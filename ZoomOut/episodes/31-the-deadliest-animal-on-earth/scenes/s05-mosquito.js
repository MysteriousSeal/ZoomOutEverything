// Beat 5 — "But number one is tiny. | The mosquito. | It also spreads dengue, Zika and yellow fever."
// Phrase 0: the board opens an empty #1 slot (env) holding a pulsing speck; a huge "#1 ?" fills the hero zone.
// On "tiny" the camera DIVES into the speck (camera.js, z 1 → 24): the speck is a mosquito, now at macro scale.
// Phrase 1: "#1" lands under it with DEADLIEST ANIMAL ON EARTH. Phrase 2: three small tags arrive ON their words:
// DENGUE · ZIKA · YELLOW FEVER. Tags exit content-first, plates last, before the pull-back.
import * as L from '../../../../engine/runtime/lib.js';
import { RED, INKW, GREYT, PH, B, BE, W8 } from '../env.js';

const { W } = L;
const TAGS = [['DENGUE', 'dengue'], ['ZIKA', 'zika'], ['YELLOW FEVER', 'yellow']];

export default {
  beat: 5,
  chapter: null,
  captions: true,
  layer: 5,
  drawOverlay(c, v) {
    const tl = v.tl, gt = v.gt;
    c.save();
    // ---- a soft scrim behind the captions while the dive streams dust and the macro bokeh fills the frame
    const sk = L.ease.inOutCubic(L.prog(gt, W8(tl, 'tiny', -0.35), 0.35)) * (1 - L.ease.inOutCubic(L.prog(gt, BE(tl, 5, -0.2), 0.5)));
    if (sk > 0) {
      const g = c.createLinearGradient(0, 1330, 0, 1570);
      g.addColorStop(0, 'rgba(5,5,8,0)'); g.addColorStop(0.3, `rgba(5,5,8,${0.62 * sk})`); g.addColorStop(0.7, `rgba(5,5,8,${0.62 * sk})`); g.addColorStop(1, 'rgba(5,5,8,0)');
      c.fillStyle = g; c.fillRect(0, 1330, W, 240);
    }
    // ---- phase 0: "#1 ?" in the hero zone, gone as the dive starts
    const a0 = L.ease.outCubic(L.prog(gt, B(tl, 5, 0.25), 0.5)) * (1 - L.ease.inCubic(L.prog(gt, W8(tl, 'tiny', -0.1), 0.35)));
    if (a0 > 0) {
      c.save();
      c.globalAlpha = a0;
      c.textBaseline = 'alphabetic';
      c.font = L.font(300, 800, L.FONT.display);
      const w1 = c.measureText('#1').width;
      c.font = L.font(200, 800, L.FONT.display);
      const wq = c.measureText('?').width;
      const x0 = W / 2 - (w1 + 30 + wq) / 2, y = 700 + (1 - a0) * 16;
      c.font = L.font(300, 800, L.FONT.display);
      c.shadowColor = 'rgba(150,20,24,0.6)'; c.shadowBlur = 50;
      c.fillStyle = L.rgba(RED);
      c.fillText('#1', x0, y);
      c.shadowBlur = 0;
      const pu = 0.55 + 0.45 * Math.sin(gt * 4.5);
      c.font = L.font(200, 800, L.FONT.display);
      c.fillStyle = L.rgba(GREYT, 0.5 + 0.4 * pu);
      c.fillText('?', x0 + w1 + 30, y);
      c.restore();
    }
    // ---- phrase 1: #1 under the macro mosquito
    const end = BE(tl, 5);
    // exit before the pull-back: text first, the chip plates right after (no outline outlives its word)
    const cOut = 1 - L.ease.inCubic(L.prog(gt, end - 0.6, 0.16));
    const pOut = 1 - L.ease.inCubic(L.prog(gt, end - 0.58, 0.15));
    const p1 = PH(tl, 5, 1, 'start');
    const nk = L.prog(gt, p1 - 0.08, 0.38);
    if (nk > 0) {
      const e = L.ease.outBack(nk, 2.2);
      c.save();
      c.globalAlpha = L.clamp(nk * 3) * cOut;
      c.translate(W / 2, 1130);
      const s = L.lerp(1.35, 1, L.clamp(e));
      c.scale(s, s);
      c.textAlign = 'center'; c.textBaseline = 'alphabetic';
      c.font = L.font(170, 800, L.FONT.display);
      c.shadowColor = 'rgba(150,20,24,0.65)'; c.shadowBlur = 40;
      c.fillStyle = L.rgba(RED);
      c.fillText('#1', 0, 0);
      c.restore();
      const fl = L.prog(gt, p1 - 0.02, 0.6);
      if (fl > 0 && fl < 1) L.lightBlob(c, W / 2, 1070, 220 + 220 * fl, RED, 0.2 * (1 - fl));
      c.save();
      c.globalAlpha = L.clamp(nk * 2 - 0.4) * cOut;
      c.font = L.font(26, 600, L.FONT.body);
      c.fillStyle = L.rgba(INKW, 0.92);
      c.shadowColor = 'rgba(0,0,0,0.7)'; c.shadowBlur = 10;
      L.trackedText(c, 'DEADLIEST ANIMAL ON EARTH', W / 2, 1180, 5, 'center');
      c.restore();
    }
    // ---- phrase 2: tags on their words
    c.font = L.font(32, 800, L.FONT.display);
    c.letterSpacing = '3px';
    const ws = TAGS.map(([t]) => c.measureText(t).width - 3);
    c.letterSpacing = '0px';
    const padX = 26, gap = 22, h = 58;
    const total = ws.reduce((a, b) => a + b + 2 * padX, 0) + gap * (TAGS.length - 1);
    let x = W / 2 - total / 2;
    TAGS.forEach(([txt, word], i) => {
      const k = L.prog(gt, W8(tl, word, -0.12), 0.32);
      const pw = ws[i] + 2 * padX;
      if (k > 0 && pOut > 0) {
        const e = L.ease.outBack(k, 2);
        c.save();
        c.translate(x + pw / 2, 1262 + (1 - L.clamp(e)) * 14);
        const so = L.lerp(0.85, 1, pOut);
        c.scale(L.lerp(0.7, 1, L.clamp(e)) * so, L.lerp(0.7, 1, L.clamp(e)) * so);
        c.globalAlpha = pOut;
        // plate: full alpha from the first frame (scaled in); on exit it fades with its text (gone together)
        c.fillStyle = 'rgb(24,12,14)';
        L.roundRect(c, -pw / 2, -h / 2, pw, h, h / 2); c.fill();
        c.strokeStyle = L.rgba(RED, 0.9); c.lineWidth = 2.5;
        L.roundRect(c, -pw / 2, -h / 2, pw, h, h / 2); c.stroke();
        c.globalAlpha = L.clamp(k * 2.5) * cOut * pOut;
        c.fillStyle = L.rgba(INKW);
        c.font = L.font(32, 800, L.FONT.display);
        c.textBaseline = 'middle';
        c.letterSpacing = '3px';
        c.fillText(txt, -ws[i] / 2, 2);
        c.letterSpacing = '0px';
        c.restore();
      }
      x += pw + gap;
    });
    c.restore();
  },
};
