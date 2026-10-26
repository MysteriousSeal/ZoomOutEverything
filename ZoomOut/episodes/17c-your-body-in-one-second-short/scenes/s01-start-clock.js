// 17c: CUT as a beat (not in episode.json); s00 draws its click flash + rings (drawWorld) at legacy marks.cs.
// Beat 1 — "Start the clock. | The strangest part comes last."
// The thumb (drawn by s00) lifts, then presses the crown at clockStart (≈ 4.79 s): a crisp click, two accent rings
// ripple out from the crown, a light sweep crosses the crystal (s00) and the sweep hand starts. Every whole second the
// tick the hand passes flashes (s00). Tension, no label: only a small running readout above the watch.
import * as L from '../../../../engine/runtime/lib.js';
import { ACCENT, P, SIZE, clockStart, clockTime } from '../env.js';

const { W } = L;

export const SCENE = {
  beat: 1,
  chapter: { num: '01', title: 'Start the clock', sub: 'one second, inside you' },
  captions: true,
  layer: 2,
  cues(d) {
    // times relative to the beat start; the click lands on clockStart
    return [
      { t: 0.39, name: 'tick', gain: 0.55, pitch: 1.0 },
      { t: 0.4, name: 'ping', gain: 0.22, pitch: 1.6 },
      { t: 1.4, name: 'tick', gain: 0.16, pitch: 1.25 },
      { t: 2.4, name: 'tick', gain: 0.16, pitch: 1.25 },
      { t: 3.4, name: 'tick', gain: 0.18, pitch: 1.25 },
      { t: 1.75, name: 'riser', gain: 0.12, pitch: 0.8 },
    ];
  },
  drawWorld(c, v) {
    const cs = clockStart(v.tl);
    const dt = v.gt - cs;
    if (dt < -0.05 || dt > 1.4 || v.cam.mpp < 3e-6) return;
    const x = v.wx(P.crown.x), y = v.wy(P.crown.y - 0.002);
    const mpp = v.cam.mpp;
    c.save();
    c.globalCompositeOperation = 'lighter';
    // flash at the crown
    const fk = Math.exp(-Math.max(0, dt) * 7) * L.smoothstep(L.prog(dt, -0.05, 0.05));
    L.lightBlob(c, x, y, 0.02 / mpp, [255, 190, 190], 0.55 * fk);
    // two rings rippling out (world size, so they ride the camera push)
    for (const [delay, amp] of [[0, 1], [0.14, 0.55]]) {
      const p = L.prog(dt, delay, 1.0);
      if (p <= 0 || p >= 1) continue;
      const rr = L.lerp(0.004, 0.075, L.ease.outCubic(p)) / mpp;
      c.beginPath(); c.arc(x, y, Math.max(0, rr), 0, Math.PI * 2);
      c.strokeStyle = L.rgba(ACCENT, 0.7 * amp * (1 - p) * (1 - p));
      c.lineWidth = Math.max(1, (0.0016 / mpp) * (1 - p * 0.6));
      c.stroke();
    }
    c.restore();
  },
  drawOverlay(c, v) {
    // the readout: 0.00 s, running from the click (kept small: the dial is the focal point)
    const cs = clockStart(v.tl);
    const k = v.k * L.enter(v.gt, cs - 0.35, 0.45) * (1 - L.enter(v.t, v.d - 0.55, 0.35, L.ease.inCubic));
    if (k <= 0) return;
    const ct = clockTime(v.gt, v.tl);
    const y = 492 + (1 - L.ease.outCubic(L.clamp(k))) * 14;
    c.save();
    c.globalAlpha = k;
    c.textBaseline = 'alphabetic';
    c.shadowColor = 'rgba(0,0,0,0.55)'; c.shadowBlur = 14;
    const num = ct.toFixed(2);
    c.font = L.font(92, 700, L.FONT.din);
    const nw = c.measureText('00.00').width;
    c.font = L.font(40, 700, L.FONT.din);
    const uw = c.measureText(' s').width;
    const x0 = W / 2 - (nw + uw) / 2;
    c.font = L.font(92, 700, L.FONT.din);
    c.fillStyle = ct > 0 ? '#f6f1ea' : 'rgba(246,241,234,0.75)';
    c.textAlign = 'right';
    c.fillText(num, x0 + nw, y);
    c.font = L.font(40, 700, L.FONT.din);
    c.fillStyle = L.rgba(ACCENT);
    c.textAlign = 'left';
    c.fillText(' s', x0 + nw, y);
    // a hairline under the readout that fills with each second
    c.shadowBlur = 0;
    const lw = nw + uw;
    c.fillStyle = 'rgba(246,241,234,0.18)';
    c.fillRect(x0, y + 22, lw, 2);
    c.fillStyle = L.rgba(ACCENT, 0.9);
    c.fillRect(x0, y + 22, lw * (ct % 1), 2);
    c.restore();
  },
};
export default SCENE;
