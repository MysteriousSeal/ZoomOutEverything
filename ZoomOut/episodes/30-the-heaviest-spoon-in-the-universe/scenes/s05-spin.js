// Beat 5 — "And some of them spin over seven hundred times a second."
// The camera pulls out of the spoon back to the star (r ≈ 220 px): it spins FAST — the beams drawn as a swept
// hourglass with motion trails and the surface smeared into streaks (env.drawStar fast mode, no strobe: a 716 Hz
// spin cannot be shown literally). An opaque plate at the top counts 0 → 716 in whole, frame-quantised steps from
// the plate's arrival to "seven hundred": SPINS EVERY SECOND · PSR J1748−2446ad, the fastest known pulsar.
import * as L from '../../../../engine/runtime/lib.js';
import { ACCENT, wordGt, chapterGate } from '../env.js';

const { W, ease, clamp, prog } = L;
const P = { x: 120, w: 840, y: 372, h: 280 };
const CH = { num: '05', title: 'Spin', sub: 'The fastest known pulsar' };

export default {
  beat: 5,
  get chapter() { return chapterGate(5, 0.24) ? CH : null; },   // fresh card (beat 4's left early): no empty tile
  layer: 12,
  overlayIn: false,
  cues(d) {
    void d;
    return [{ t: -0.35, name: 'shimmer', gain: 0.16, pitch: 1.4 }];
  },
  drawOverlay(c, v) {
    const gt = v.gt, tl = v.tl, sc = tl.scenes[5];
    const tSpin = wordGt(tl, 5, 0, 4);
    const tIn = tSpin - 0.3;                                   // the plate is in for "spin"
    const kin = ease.outCubic(prog(gt, tIn, 0.25));
    if (kin <= 0) return;
    // exit: digits and lines fade (0.15 s), then the plate scales down a touch and fades (0.15 s)
    const tOut = sc.end - 0.12;
    const cOut = 1 - ease.inCubic(prog(gt, tOut - 0.3, 0.15));
    const pOut = 1 - prog(gt, tOut - 0.22, 0.12);
    if (pOut <= 0) return;
    const { x, w, y, h } = P;
    c.save();
    const s = L.lerp(0.92, 1, kin) * L.lerp(0.94, 1, ease.outCubic(pOut)), cx = x + w / 2, cy = y + h / 2;
    c.translate(cx, cy); c.scale(s, s); c.translate(-cx, -cy);
    c.globalAlpha = pOut;
    c.shadowColor = 'rgba(0,0,0,0.55)'; c.shadowBlur = 36; c.shadowOffsetY = 10;
    c.fillStyle = 'rgb(7,12,28)';
    L.roundRect(c, x, y, w, h, 26); c.fill();
    c.shadowColor = 'transparent'; c.shadowBlur = 0; c.shadowOffsetY = 0;
    c.strokeStyle = L.rgba(ACCENT, 0.6); c.lineWidth = 2;
    L.roundRect(c, x, y, w, h, 26); c.stroke();
    c.globalAlpha = pOut * cOut * clamp(prog(gt, tIn + 0.03, 0.15));
    // count up from the plate's arrival, landing 716 on "seven hundred" (whole, frame-quantised steps; sub-frames of
    // one frame show the same digits); nothing shows until the first increment
    const tq = Math.round(gt * 30) / 30;
    const t0 = tIn + 0.2, t1 = wordGt(tl, 5, 0, 7);
    const n = Math.round(716 * ease.outCubic(prog(tq, t0, t1 - t0)));
    c.textBaseline = 'alphabetic'; c.textAlign = 'center';
    if (n > 0) {
      c.font = L.font(150, 800, L.FONT.display);
      c.fillStyle = L.rgba(ACCENT);
      c.shadowColor = L.rgba([80, 150, 255], 0.7); c.shadowBlur = 24;
      // fixed-width digits: draw each digit centred in its own cell so the number never jitters
      const str = String(n), cell = c.measureText('0').width * 1.02;
      const total = cell * str.length;
      for (let i = 0; i < str.length; i++) c.fillText(str[i], W / 2 - total / 2 + cell * (i + 0.5), y + 166);
      c.shadowBlur = 0;
    }
    c.font = L.font(28, 700, L.FONT.body);
    c.fillStyle = 'rgba(230,236,246,0.95)';
    L.trackedText(c, 'SPINS EVERY SECOND', W / 2, y + 210, 5, 'center');
    c.font = L.font(23, 500, L.FONT.body);
    c.fillStyle = 'rgba(175,188,210,0.92)';
    L.trackedText(c, 'PSR J1748−2446ad · fastest known pulsar', W / 2, y + 244, 0.5, 'center');
    c.restore();
  },
};
