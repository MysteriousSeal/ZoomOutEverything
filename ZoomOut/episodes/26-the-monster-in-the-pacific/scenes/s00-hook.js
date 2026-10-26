// Beat 0 — "Something is waking up in the Pacific. | And it could break the world's heat record."  (0.00–6.23; phrase 1 at 3.06)
// Shot 'hook': a lit, data-led close-up of the equatorial Pacific (limb at the top behind the HUD, equator y ≈ 950,
// deep-blue ocean below). The warm tongue is env's real anomaly field (amp ≈ 0.9, ±5 % breath, isotherms) with its
// irregular leading edge in view.
//
// drawWorld: grading only (edge vignette, fades over the beat-1 pull-out).
// drawOverlay: headline SOMETHING IS WAKING UP / IN THE PACIFIC (PACIFIC accent, a warm breathing glow) readable on
//   FRAME 1 (overlayIn: false), fitted ≤ 940 px, top y 360 over a soft scrim; phrase 1 (3.06): the alert tag
//   "WORLD HEAT RECORD AT RISK" wipes in under it; the colour legend sits in the lower third (y ≈ 1420) from frame 1.
//   Held to 0.14 s before the cut (cross-fades with the EL NIÑO name card). No captions, no chapter card.
import * as L from '../../../../engine/runtime/lib.js';
import { ACCENT, drawLegend, phrase } from '../env.js';

const { W } = L;
const MAXW = 940, TOP = 360;
const L1 = [['SOMETHING IS WAKING UP', null]];
const L2 = [['IN THE ', null], ['PACIFIC', 'acc']];
const txt = (p) => p.map((q) => q[0]).join('');
const TAG = 'WORLD HEAT RECORD AT RISK';

export default {
  beat: 0,
  chapter: null,
  captions: false,
  overlayIn: false,
  layer: 5,
  cues() {
    return [{ t: 0.0, name: 'deep', gain: 0.4, pitch: 0.7 }, { t: 2.7, name: 'impact', gain: 0.25, pitch: 0.8 }]   // in the 2.57 → 2.92 s gap, before "And" (timeline 62.49 s);
  },
  drawWorld(c, v) {
    // GRADING ONLY (the data itself is env's real anomaly field, amp ≈ 0.9 with a ±5 % breath): an ominous edge
    // vignette + a faint cool-dark wash on the upper ocean, fading out over the beat-1 pull-out. Nothing turns black.
    const gt = v.gt, tl = v.tl;
    const fade = 1 - L.smoothstep(L.prog(gt, tl.scenes[1].start, 1.6));
    if (fade <= 0.002) return;
    c.save();
    const vg = c.createRadialGradient(W / 2, 1050, 300, W / 2, 1050, 1250);
    vg.addColorStop(0, 'rgba(4,8,22,0)');
    vg.addColorStop(0.7, `rgba(4,8,22,${0.28 * fade})`);
    vg.addColorStop(1, `rgba(2,4,12,${0.55 * fade})`);
    c.fillStyle = vg; c.fillRect(0, 0, W, L.H);
    c.restore();
  },
  drawOverlay(c, v) {
    // own fade: hold full strength to 0.12 s before the cut, then out (the EL NIÑO name card fades in under it)
    const end = v.tl.scenes[0].end;
    const kk = 1 - L.ease.inCubic(L.prog(v.gt, end - 0.14, 0.14));
    if (kk <= 0) return;
    c.save();
    c.globalAlpha = kk;
    // legend in the lower third: it reads as a temperature map from frame 1 (captions are off in the hook)
    drawLegend(c, { x: 330, y: 1420, w: 420, k: 1 });
    // soft scrim behind the headline (calms the lit limb; no hard edge)
    const sg = c.createRadialGradient(0, 0, 0, 0, 0, 600);
    sg.addColorStop(0, 'rgba(2,6,16,0.5)');
    sg.addColorStop(0.6, 'rgba(2,6,16,0.28)');
    sg.addColorStop(1, 'rgba(2,6,16,0)');
    c.save(); c.translate(W / 2, 500); c.scale(1, 0.5); c.fillStyle = sg; c.fillRect(-600, -600, 1200, 1200); c.restore();
    // headline: one shared fitted size
    const size = Math.min(L.fitSize(c, txt(L1), MAXW, 124, 800, L.FONT.display, 50), L.fitSize(c, txt(L2), MAXW, 124, 800, L.FONT.display, 50));
    const b1 = TOP + size * 0.72, b2 = b1 + size * 0.98;
    c.textBaseline = 'alphabetic';
    c.font = L.font(size, 800, L.FONT.display);
    const breath = 0.5 + 0.5 * Math.cos(v.gt * 2 * Math.PI / 1.7);
    const draw = (parts, y) => {
      let x = W / 2 - c.measureText(txt(parts)).width / 2;
      c.textAlign = 'left';
      for (const [t, col] of parts) {
        const w = c.measureText(t).width;
        if (col) {
          // the accent word glows warm, breathing with the thing under the water
          c.save();
          c.shadowColor = L.rgba([255, 90, 20], 0.55 + 0.35 * breath);
          c.shadowBlur = 26 + 18 * breath;
          c.fillStyle = L.rgba(ACCENT);
          c.fillText(t, x, y);
          c.restore();
        } else {
          c.shadowColor = 'rgba(0,0,0,0.75)';
          c.shadowBlur = 18;
          c.fillStyle = '#fff';
          c.fillText(t, x, y);
          c.shadowBlur = 0;
        }
        x += w;
      }
    };
    draw(L1, b1);
    draw(L2, b2);
    // phrase 1: alert tag (wipes in left → right)
    const p1 = phrase(v, 1);
    const tk = L.enter(v.t, p1 - 0.22, 0.45, L.ease.outQuint);   // with the impact, in the gap before "And"
    if (tk > 0) {
      c.shadowBlur = 0;
      const ts = L.fitSize(c, TAG, 640, 40, 800, L.FONT.display, 24);
      c.font = L.font(ts, 800, L.FONT.display);
      c.letterSpacing = '2px';
      const tw = c.measureText(TAG).width;
      c.letterSpacing = '0px';
      const dotW = 34, padX = 22, h = 58;
      const bw = tw + dotW + padX * 2, bx = W / 2 - bw / 2, by = b2 + 44;
      c.save();
      c.beginPath(); c.rect(bx - 4, by - 10, (bw + 8) * tk, h + 20); c.clip();
      c.globalAlpha = kk * L.clamp(tk * 2);
      c.shadowColor = 'rgba(0,0,0,0.5)'; c.shadowBlur = 16;
      c.fillStyle = L.rgba(ACCENT);
      L.roundRect(c, bx, by, bw, h, 8); c.fill();
      c.shadowBlur = 0;
      // live dot: a dark core with a pulsing ring
      const dx = bx + padX + 8, dy = by + h / 2;
      const pu = (v.t * 1.4) % 1;
      c.fillStyle = '#0a0f20';
      c.beginPath(); c.arc(dx, dy, 7, 0, Math.PI * 2); c.fill();
      c.strokeStyle = `rgba(10,15,32,${0.7 * (1 - pu)})`;
      c.lineWidth = 2.5;
      c.beginPath(); c.arc(dx, dy, Math.max(0, 7 + 9 * pu), 0, Math.PI * 2); c.stroke();
      c.fillStyle = '#0a0f20';
      c.textAlign = 'left';
      c.letterSpacing = '2px';
      c.fillText(TAG, bx + padX + dotW, by + h / 2 + ts * 0.36);
      c.letterSpacing = '0px';
      c.restore();
    }
    c.restore();
  },
};
