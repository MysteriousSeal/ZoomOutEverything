// Beat 7 — "Today, Guinness no longer accepts this record. | It's too dangerous."
// The night stage dims under a scrim and a cream record card (opaque from its first frame; it slides up 26 px and
// settles) lands on "Guinness": GUINNESS WORLD RECORDS / SLEEP-DEPRIVATION RECORDS / the status line NO LONGER
// ACCEPTED (typed on, on "longer") over CATEGORY CLOSED · 1997, and the case line CASE: RANDY GARDNER · 264 H · 1964
// (his attempt, not a record Guinness holds: it was beaten within weeks before the category closed). Just before
// "too", a red rubber stamp TOO DANGEROUS slams onto the card (scale 1.6 → 1, one bloom), well inside its edges.
import * as L from '../../../../engine/runtime/lib.js';
import { VIOLET, INKP, STAMP, B, BE, PH, Wd, paperCard, tfont } from '../env.js';

const BOX = { x: 110, y: 492, w: 860, h: 708 };   // bottom 1200
const SX = BOX.x + BOX.w / 2 + 70, SY = BOX.y + BOX.h - 112;   // the stamp's centre

export default {
  beat: 7,
  chapter: null,
  captions: true,
  overlayIn: false,
  layer: 8,
  drawOverlay(c, v) {
    const tl = v.tl, gt = v.gt;
    const k = L.ease.outCubic(L.prog(gt, Wd(tl, 'guinness', -0.3), 0.45));
    const out = 0;   // no exit: beat 8's opaque card covers it on the cut (no luminance dip)
    if (k <= 0) return;
    // scrim over the stage (eases on, never a sudden drop)
    c.save();
    c.fillStyle = `rgba(4,6,14,${0.45 * k * (1 - out)})`;
    c.fillRect(0, 440, L.W, 1000);
    c.restore();
    c.save();
    c.globalAlpha = 1 - out;
    paperCard(c, BOX, k, (g) => {
      const x = BOX.x + 96;
      g.textBaseline = 'alphabetic';
      g.font = L.font(24, 700, L.FONT.body);
      g.fillStyle = L.rgba(VIOLET.map((q) => q * 0.6));
      L.trackedText(g, 'GUINNESS WORLD RECORDS', x, BOX.y + 76, 4);
      const ts = L.fitSize(g, 'SLEEP-DEPRIVATION RECORDS', BOX.w - 150, 64, 800, L.FONT.display, 30);
      g.font = L.font(ts, 800, L.FONT.display);
      g.fillStyle = L.rgba(INKP);
      g.fillText('SLEEP-DEPRIVATION RECORDS', x, BOX.y + 152);
      g.fillStyle = L.rgba(INKP, 0.25); g.fillRect(x, BOX.y + 184, BOX.w - 150, 2);
      const stk = L.ease.outCubic(L.prog(gt, Wd(tl, 'guinness', 0.3), 0.3));
      g.save();
      g.globalAlpha *= stk;
      g.font = L.font(22, 700, L.FONT.body);
      g.fillStyle = L.rgba(INKP, 0.62);
      L.trackedText(g, 'STATUS', x, BOX.y + 248, 4);
      const st = 'NO LONGER ACCEPTED';
      const ss = L.fitSize(g, st, BOX.w - 150, 54, 700, '"American Typewriter"', 24);
      g.font = tfont(ss, 700);
      g.fillStyle = L.rgba(INKP);
      const n = Math.round(st.length * L.clamp(L.prog(gt, Wd(tl, 'guinness', 0.3), Wd(tl, 'accepts', 0.1) - Wd(tl, 'guinness', 0.3))));
      g.fillText(st.slice(0, Math.max(1, n)), x, BOX.y + 312);
      // the closure date, under the status, once the status has typed on
      const ck = L.ease.outCubic(L.prog(gt, Wd(tl, 'accepts', 0.15), 0.35));
      if (ck > 0) {
        g.globalAlpha *= ck;
        g.font = L.font(26, 700, L.FONT.body);
        g.fillStyle = L.rgba(VIOLET.map((q) => q * 0.6));
        L.trackedText(g, 'CATEGORY CLOSED  ·  1997', x + (1 - ck) * 10, BOX.y + 362, 4);
      }
      g.restore();
      g.fillStyle = L.rgba(INKP, 0.25); g.fillRect(x, BOX.y + 404, BOX.w - 150, 2);
      g.font = L.font(22, 700, L.FONT.body);
      g.fillStyle = L.rgba(INKP, 0.62);
      L.trackedText(g, 'CASE', x, BOX.y + 456, 4);
      const cs = L.fitSize(g, 'RANDY GARDNER · 264 H · 1964', BOX.w - 150, 34, 700, '"American Typewriter"', 20);
      g.font = tfont(cs, 700);
      g.fillStyle = L.rgba(INKP, 0.85);
      g.fillText('RANDY GARDNER · 264 H · 1964', x, BOX.y + 504);
    });
    // the stamp
    const sk = L.prog(gt, Wd(tl, 'too', -0.14), 0.24);
    if (sk > 0) {
      const e = L.ease.outBack(L.clamp(sk), 2.0);
      const s = L.lerp(1.6, 1, L.clamp(e));
      const txt = 'TOO DANGEROUS';
      c.save();
      c.translate(SX, SY);
      c.rotate(-0.12);
      c.scale(s, s);
      c.font = L.font(58, 800, L.FONT.display);
      c.letterSpacing = '4px';
      const tw = c.measureText(txt).width - 4;
      c.letterSpacing = '0px';
      const pw = tw + 56, ph = 94;
      c.globalAlpha = 0.9 * (1 - out);
      c.strokeStyle = L.rgba(STAMP); c.lineWidth = 6;
      L.roundRect(c, -pw / 2, -ph / 2, pw, ph, 10); c.stroke();
      c.lineWidth = 2;
      L.roundRect(c, -pw / 2 + 9, -ph / 2 + 9, pw - 18, ph - 18, 6); c.stroke();
      c.fillStyle = L.rgba(STAMP);
      c.letterSpacing = '4px';
      c.fillText(txt, -tw / 2, 20);
      c.letterSpacing = '0px';
      c.restore();
      const fl = L.prog(gt, Wd(tl, 'too', 0.08), 0.6);
      if (fl > 0 && fl < 1) L.lightBlob(c, SX, SY, 200 + 160 * fl, STAMP, 0.18 * (1 - fl));
    }
  },
};
