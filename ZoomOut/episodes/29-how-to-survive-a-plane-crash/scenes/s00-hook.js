// Beat 0 — "Most plane crashes are survivable. | What you do in the next ninety seconds decides if you walk away."
// No captions, no chapter, overlayIn false: frame 1 is complete. Camera 'hook': the airliner (cut-away cabin, warm
// light) on the departure runway at dusk, ground at screen y ≈ 1010, slow pull-out.
//   0.00   headline MOST CRASHES / ARE SURVIVABLE (one shared fitted size, band y ≈ 300–560), static from frame 1.
//   frame 1: a stopwatch dial at rest under the aircraft (centre (540, 1290), r 112); on "ninety seconds" (phrase 1 + ≈ 1.45 s) it flashes and starts:
//          THE NEXT / 90 / SECONDS, an outer ring of 18 ticks (one per 5 s) and a yellow progress arc that advances in
//          real time, one whole second per tick (honest: ≈ 3 s of 90 are gone by the cut).
//   exit   everything leaves with the beat's overlay fade (the dial shrinks away first, at d − 0.55).
import * as L from '../../../../engine/runtime/lib.js';
import { TEXT, CD } from '../env.js';

const { W } = L;
const TAU = Math.PI * 2;
const MAXW = 940, TOP = 300, L1 = 'MOST CRASHES', L2 = 'ARE SURVIVABLE';
const ph = (v, j) => v.tl.lines[v.index].phrases[j].start - v.tl.scenes[v.index].start;
export const DIAL = { x: 540, y: 772, r: 124 };   // in the sky between the headline and the aircraft

/** the stopwatch dial (screen space). k = entrance 0..1, prog = 0..1 of the 90 s, label = centre texts */
export function dial(c, x, y, r, k, prog, { col = CD.yellow, top = 'THE NEXT', big = '90', small = 'SECONDS', done = 0 } = {}) {
  if (k <= 0) return;
  const s = L.ease.outBack(L.clamp(k), 1.4);
  c.save();
  c.translate(x, y); c.scale(Math.max(0.001, s), Math.max(0.001, s));
  // opaque face from the first frame (it scales in; it never fades through)
  c.shadowColor = 'rgba(0,0,0,0.55)'; c.shadowBlur = 26; c.shadowOffsetY = 6;
  c.fillStyle = 'rgb(14,14,17)';
  c.beginPath(); c.arc(0, 0, r + 18, 0, TAU); c.fill();
  c.shadowColor = 'transparent';
  c.strokeStyle = L.rgba(col, 0.35); c.lineWidth = 1.5;
  c.beginPath(); c.arc(0, 0, r + 18, 0, TAU); c.stroke();
  // crown button
  c.fillStyle = 'rgb(14,14,17)'; L.roundRect(c, -16, -r - 36, 32, 16, 4); c.fill();
  c.strokeStyle = L.rgba(col, 0.35); c.stroke();
  // track + ticks
  c.strokeStyle = 'rgba(255,255,255,0.14)'; c.lineWidth = 9;
  c.beginPath(); c.arc(0, 0, r, 0, TAU); c.stroke();
  c.lineCap = 'butt';
  for (let i = 0; i < 18; i++) {
    const a = -Math.PI / 2 + (i / 18) * TAU;
    c.strokeStyle = i / 18 <= prog + 1e-6 ? L.rgba(L.mix(col, [255, 255, 255], 0.2), 0.9) : 'rgba(255,255,255,0.32)';
    c.lineWidth = i % 3 === 0 ? 3 : 2;
    c.beginPath(); c.moveTo(Math.cos(a) * (r - 14), Math.sin(a) * (r - 14)); c.lineTo(Math.cos(a) * (r - (i % 3 === 0 ? 26 : 22)), Math.sin(a) * (r - (i % 3 === 0 ? 26 : 22))); c.stroke();
  }
  // progress arc
  if (prog > 0.0005) {
    c.strokeStyle = L.rgba(col); c.lineWidth = 9; c.lineCap = 'round';
    c.beginPath(); c.arc(0, 0, r, -Math.PI / 2, -Math.PI / 2 + TAU * L.clamp(prog)); c.stroke();
    const a = -Math.PI / 2 + TAU * L.clamp(prog);
    c.fillStyle = '#fff'; c.beginPath(); c.arc(Math.cos(a) * r, Math.sin(a) * r, 6.5, 0, TAU); c.fill();
  }
  // centre texts
  c.textAlign = 'center'; c.textBaseline = 'alphabetic';
  if (top) {   // ≥ 20 px, fitted inside the tick ring (the chord at the text's cap line)
    const maxW = 2 * Math.sqrt(Math.max(0, (r - 28) ** 2 - 58 ** 2));
    let fs = 23, tr = 2;
    for (; fs > 20; fs--) { c.font = L.font(fs, 700, L.FONT.body); c.letterSpacing = `${tr}px`; const w = c.measureText(top).width; c.letterSpacing = '0px'; if (w <= maxW) break; }
    c.font = L.font(fs, 700, L.FONT.body); c.fillStyle = 'rgba(232,234,240,0.92)'; L.trackedText(c, top, 0, -40, tr, 'center');
  }
  c.font = L.font(80, 700, L.FONT.din); c.fillStyle = L.rgba(L.mix(col, [255, 255, 255], 0.1));
  c.fillText(big, 0, 28);
  if (small) { c.font = L.font(21, 700, L.FONT.body); c.fillStyle = 'rgba(232,234,240,0.92)'; L.trackedText(c, small, 0, 64, 3, 'center'); }
  if (done > 0) {   // a check mark badge on the ring
    c.save();
    c.globalAlpha *= L.clamp(done);
    c.fillStyle = L.rgba(col);
    const cx = r * 0.74, cy = r * 0.74;   // on the ring, lower right (clear of the crown and the texts)
    c.beginPath(); c.arc(cx, cy, 24 * L.ease.outBack(L.clamp(done), 2), 0, TAU); c.fill();
    c.strokeStyle = 'rgb(10,12,14)'; c.lineWidth = 5; c.lineCap = 'round'; c.lineJoin = 'round';
    c.beginPath(); c.moveTo(cx - 10, cy + 1); c.lineTo(cx - 3, cy + 8); c.lineTo(cx + 10, cy - 7); c.stroke();
    c.restore();
  }
  c.restore();
}

export default {
  beat: 0,
  chapter: null,
  captions: false,
  overlayIn: false,
  layer: 5,
  cues() { return [{ t: 0.0, name: 'swell', gain: 0.22, pitch: 0.8 }, { t: 2.78, name: 'tick', gain: 0.18, pitch: 1.0 }]; },
  drawOverlay(c, v) {
    c.save();
    // own fade (not the engine's): the headline holds to d − 0.2 and cross-fades with the next beat's ≈ 70%
    c.globalAlpha = 1 - L.smoothstep(L.prog(v.t, v.d - 0.2, 0.19));
    // ---- headline on a soft scrim
    const size = Math.min(L.fitSize(c, L1, MAXW, 150, 800, L.FONT.display, 60), L.fitSize(c, L2, MAXW, 150, 800, L.FONT.display, 60));
    const b1 = TOP + size * 0.72, b2 = b1 + size * 0.98;
    const sg = c.createLinearGradient(0, TOP - 70, 0, b2 + 70);
    sg.addColorStop(0, 'rgba(4,6,12,0)'); sg.addColorStop(0.3, 'rgba(4,6,12,0.4)'); sg.addColorStop(0.75, 'rgba(4,6,12,0.4)'); sg.addColorStop(1, 'rgba(4,6,12,0)');
    c.fillStyle = sg; c.fillRect(0, TOP - 70, W, b2 + 140 - TOP);
    c.textAlign = 'center';
    c.textBaseline = 'alphabetic';
    c.shadowColor = 'rgba(0,0,0,0.8)'; c.shadowBlur = 24;
    c.font = L.font(size, 800, L.FONT.display);
    c.fillStyle = L.rgba(TEXT); c.fillText(L1, W / 2, b1);
    c.fillStyle = L.rgba(v.accent); c.fillText(L2, W / 2, b2);
    c.shadowBlur = 0; c.shadowColor = 'transparent';
    // ---- the 90-second dial (on "ninety seconds"); advances one whole second at a time, in real time
    const t0 = ph(v, 1) + 1.4;
    // on from frame 1 (complete, at rest); on "ninety seconds" it flashes once and starts to run
    c.globalAlpha = 1;
    const kout = L.ease.inCubic(L.prog(v.t, v.d - 0.4, 0.25));
    const secs = Math.max(0, Math.floor(v.t - t0 + 1));
    const fl = L.prog(v.t, t0 - 0.05, 0.7);
    if (fl > 0 && fl < 1) {
      c.save();
      c.strokeStyle = L.rgba(CD.yellow, 0.7 * (1 - fl)); c.lineWidth = 3;
      c.beginPath(); c.arc(DIAL.x, DIAL.y, DIAL.r + 22 + 40 * L.ease.outCubic(fl), 0, TAU); c.stroke();
      c.restore();
    }
    dial(c, DIAL.x, DIAL.y, DIAL.r, 1 - kout, v.t >= t0 ? secs / 90 : 0);
    c.restore();
  },
};
