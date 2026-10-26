// Beat 1 — "Here's what would happen. | The strangest part comes last."
// The REWIND: story time (s00 storyT) scrubs back from 4.15 s to 0.9 s, so the point re-inflates into the Sun, the
// shadows swing back, people and the car walk backwards. This scene adds the scrub itself: a few thin horizontal
// tape-shear bands, soft streak lines and a cool flicker, peaking mid-rewind (subtle; no glyphs).
// On "comes LAST" a TEASER: a tiny white-hot point (the white dwarf of the ending) glints in the sky for 0.55 s.
// The clock (env HUD) arms at 0:00 in this beat.
import * as L from '../../../../engine/runtime/lib.js';
import { RW0, RW1, streetK } from './s00-hook.js';

const { W, H } = L;
const TAU = Math.PI * 2;
const TEASE = { t0: 7.36, dur: 0.56, x: 790, y: 470 };

function drawScrub(c, v) {
  const p = L.prog(v.gt, RW0 - 0.05, RW1 - RW0 + 0.1);
  if (p <= 0 || p >= 1) return;
  const env = Math.sin(Math.PI * p) ** 1.5;
  const r = L.rng(4100 + Math.floor(v.gt * 30));
  // tape shear: a few bands displaced sideways (copies of what is already drawn)
  const canvas = c.canvas;
  for (let i = 0; i < 4; i++) {
    const y = 360 + r() * 1100, h = 6 + r() * 34, dx = (r() < 0.5 ? -1 : 1) * (6 + r() * 22) * env;
    try { c.drawImage(canvas, 0, y, W, h, dx, y, W, h); } catch (e) { /* ignore */ }
  }
  c.save();
  c.globalCompositeOperation = 'lighter';
  // streak lines sweeping down the frame
  for (let i = 0; i < 9; i++) {
    const y = ((i * 211 + v.gt * 2600) % (H - 500)) + 320;
    const a = 0.10 * env * (0.4 + 0.6 * ((i * 7) % 5) / 4);
    const g = c.createLinearGradient(0, 0, W, 0);
    g.addColorStop(0, 'rgba(220,230,255,0)'); g.addColorStop(0.3 + 0.4 * ((i * 3) % 4) / 3, `rgba(230,236,255,${a})`); g.addColorStop(1, 'rgba(220,230,255,0)');
    c.fillStyle = g;
    c.fillRect(0, y, W, 1.5 + (i % 3));
  }
  c.restore();
  // a cool, slightly lifted grade during the scrub
  c.fillStyle = `rgba(120,140,190,${0.07 * env})`;
  c.fillRect(0, 0, W, H);
}

function drawTease(c, v) {
  const p = L.prog(v.gt, TEASE.t0, TEASE.dur);
  if (p <= 0 || p >= 1) return;
  const k = Math.sin(Math.PI * p) ** 0.8 * streetK(v.cam.mpp, v.gt);
  const tw = 0.85 + 0.15 * Math.sin(v.gt * 40);
  const { x, y } = TEASE;
  c.save();
  c.globalCompositeOperation = 'lighter';
  L.lightBlob(c, x, y, 70, [190, 210, 255], 0.55 * k);
  L.lightBlob(c, x, y, 16, [235, 244, 255], 1.0 * k);
  c.fillStyle = `rgba(245,250,255,${k * tw})`;
  const a = 64 * k * tw, b = 30 * k * tw;
  c.beginPath(); c.moveTo(x - a, y); c.lineTo(x, y - 1.3); c.lineTo(x + a, y); c.lineTo(x, y + 1.3); c.closePath(); c.fill();
  c.beginPath(); c.moveTo(x, y - b); c.lineTo(x + 1.3, y); c.lineTo(x, y + b); c.lineTo(x - 1.3, y); c.closePath(); c.fill();
  c.fillStyle = `rgba(255,255,255,${k})`;
  c.beginPath(); c.arc(x, y, Math.max(0, 2.6 * k), 0, TAU); c.fill();
  c.restore();
}

export default {
  beat: 1,
  chapter: { num: '01', title: 'The countdown', sub: 'the clock starts at the collapse' },
  layer: 1,
  cues() {
    return [
      { t: RW0 - 4.031 + 0.0, name: 'swish', gain: 0.32, pitch: 0.55 },
      { t: RW0 - 4.031 + 0.45, name: 'whoosh', gain: 0.22, pitch: 0.6 },
      { t: RW1 - 4.031 - 0.1, name: 'bloom', gain: 0.3, pitch: 0.9 },
      { t: TEASE.t0 - 4.031, name: 'ping', gain: 0.22, pitch: 1.7 },
      { t: TEASE.t0 - 4.031 + 0.02, name: 'shimmer', gain: 0.16, pitch: 1.4 },
    ];
  },
  drawWorld(c, v) {
    if (v.gt < RW0 - 0.1 || v.gt > 8.2) return;
    drawTease(c, v);
  },
  drawOverlay(c, v) {
    drawScrub(c, v);
  },
};
