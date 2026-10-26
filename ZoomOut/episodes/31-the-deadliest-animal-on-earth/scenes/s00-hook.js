// Beat 0 — "The deadliest animal on Earth isn't a shark. | It's not even close."
// The big shark silhouette (env hero HOOK_SHARK, centred ≈ y 845, 1000 px wide) under the headline THE DEADLIEST
// ANIMAL / ISN’T A SHARK, readable on FRAME 1 (overlayIn: false, no captions). Phrase 1: a red stamp NOT EVEN CLOSE
// slams in under the shark at y ≈ 1300–1380 (impact in the gap before "It's"): opaque plate, scale-in only. Headline + stamp fade just before the cut while the shark rises into beat 1.
import * as L from '../../../../engine/runtime/lib.js';
import { RED, PH, B } from '../env.js';

const { W } = L;
const MAXW = 940, TOP = 372;
const L1 = [['THE ', null], ['DEADLIEST', 'acc'], [' ANIMAL', null]];
const L2 = [['ISN’T A SHARK', null]];
const txt = (p) => p.map((q) => q[0]).join('');
const STAMP = 'NOT EVEN CLOSE';
const STAMP_Y = 1340;

export default {
  beat: 0,
  chapter: null,
  captions: false,
  overlayIn: false,
  layer: 5,
  drawOverlay(c, v) {
    const tl = v.tl;
    const end = B(tl, 1);
    const kk = 1 - L.ease.inCubic(L.prog(v.gt, end - 0.32, 0.3));
    if (kk <= 0) return;
    c.save();
    c.globalAlpha = kk;
    // soft scrim behind the headline
    const sg = c.createRadialGradient(0, 0, 0, 0, 0, 600);
    sg.addColorStop(0, 'rgba(4,5,8,0.55)'); sg.addColorStop(0.6, 'rgba(4,5,8,0.3)'); sg.addColorStop(1, 'rgba(4,5,8,0)');
    c.save(); c.translate(W / 2, 480); c.scale(1, 0.42); c.fillStyle = sg; c.fillRect(-600, -600, 1200, 1200); c.restore();
    const size = Math.min(L.fitSize(c, txt(L1), MAXW, 128, 800, L.FONT.display, 50), L.fitSize(c, txt(L2), MAXW, 128, 800, L.FONT.display, 50));
    const b1 = TOP + size * 0.74, b2 = b1 + size * 1.0;
    c.textBaseline = 'alphabetic';
    c.font = L.font(size, 800, L.FONT.display);
    const draw = (parts, y) => {
      let x = W / 2 - c.measureText(txt(parts)).width / 2;
      c.textAlign = 'left';
      for (const [t, col] of parts) {
        c.shadowColor = col ? 'rgba(120,10,14,0.55)' : 'rgba(0,0,0,0.75)';
        c.shadowBlur = col ? 30 : 18;
        c.fillStyle = col ? L.rgba(RED) : '#fff';
        c.fillText(t, x, y);
        x += c.measureText(t).width;
      }
      c.shadowBlur = 0;
    };
    draw(L1, b1);
    draw(L2, b2);
    // phrase 1: the stamp slams in under the shark
    const p1 = PH(tl, 0, 1) - B(tl, 0);
    const sk = L.prog(v.t, p1 - 0.38, 0.32);
    if (sk > 0) {
      const e = L.ease.outBack(sk, 2.4);
      const s = L.lerp(1.5, 1, L.clamp(e));
      const ts = L.fitSize(c, STAMP, 640, 64, 800, L.FONT.display, 30);
      c.font = L.font(ts, 800, L.FONT.display);
      c.letterSpacing = '4px';
      const tw = c.measureText(STAMP).width - 4;
      c.letterSpacing = '0px';
      const pw = tw + 76, ph = ts + 34;
      c.save();
      c.translate(W / 2, STAMP_Y);
      c.rotate(-0.035);
      c.scale(s, s);
      c.globalAlpha = kk;
      // plate opaque at its first frame (scale-in, no fade of the plate itself)
      c.shadowColor = 'rgba(0,0,0,0.55)'; c.shadowBlur = 24;
      c.fillStyle = L.rgba(RED);
      L.roundRect(c, -pw / 2, -ph / 2, pw, ph, 10); c.fill();
      c.shadowBlur = 0;
      c.strokeStyle = 'rgba(16,6,8,0.55)'; c.lineWidth = 2;
      L.roundRect(c, -pw / 2 + 7, -ph / 2 + 7, pw - 14, ph - 14, 6); c.stroke();
      c.fillStyle = 'rgb(16,8,10)';
      c.textAlign = 'left';
      c.letterSpacing = '4px';
      c.fillText(STAMP, -tw / 2, ts * 0.36);
      c.letterSpacing = '0px';
      c.restore();
      // one bloom on landing
      const fl = L.prog(v.t, p1 - 0.12, 0.6);
      if (fl > 0 && fl < 1) L.lightBlob(c, W / 2, STAMP_Y, 260 + 200 * fl, RED, 0.22 * (1 - fl) * kk);
    }
    c.restore();
  },
};
