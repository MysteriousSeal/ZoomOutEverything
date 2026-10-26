// Beat 31: The universe is thirteen point eight billion years old, | but space has been stretching the whole time, | so the farthest light we see came from places that are now much farther away.
// Builder E. A light ray heads for us from a distant source while the source drifts outward with the expanding
// space, ending on the edge: both numbers shown, honestly (travel time 13.8 billion years; distance now 46.5 Gly).
import * as L from '../../../../engine/runtime/lib.js';
import { ph, since, kin, decoK, text, INK, SUB, GOLD } from '../layers/e-ui.js';
import { uni } from './s30-observable.js';

const ANG = Math.PI - 0.27;           // the ray comes in from the left, slightly below
const F0 = 0.3;                       // where the source starts (schematic)
const T_GO = 0.5, T_ARR = 8.6;        // photon departs / arrives (seconds into the beat)

/** Ray state at beat-time t: source fraction of R and photon fraction of R. */
function state(t) {
  const q = L.prog(t, T_GO, T_ARR - T_GO);
  const src = F0 + (1 - F0) * L.ease.inOutCubic(L.prog(t, T_GO + 0.6, 6.4));
  const pho = F0 * (1 - q);
  return { src, pho, q };
}

function drawWorld(c, v) {
  const s = since(v, 31);
  if (s < -0.1) return;
  const fade = kin(s, 0, 0.5) * (1 - L.ease.inCubic(L.prog(s, v.tl.scenes[32].start - v.tl.scenes[31].start + 1.2, 0.8))) * decoK(v);
  if (fade <= 0) return;
  const { x, y, r } = uni(v);
  const ux = Math.cos(ANG), uy = Math.sin(ANG);
  const st = state(s);
  const sx = x + ux * r * st.src, sy = y + uy * r * st.src;
  const px = x + ux * r * st.pho, py = y + uy * r * st.pho;
  c.save();
  c.globalAlpha = fade;
  c.globalCompositeOperation = 'lighter';
  c.lineCap = 'round';
  // the light's path so far (source → photon), with ticks that spread apart as space stretches
  if (s > T_GO) {
    c.strokeStyle = L.rgba(GOLD, 0.12); c.lineWidth = 7;
    c.beginPath(); c.moveTo(sx, sy); c.lineTo(px, py); c.stroke();
    c.strokeStyle = L.rgba(GOLD, 0.7); c.lineWidth = 1.8;
    c.beginPath(); c.moveTo(sx, sy); c.lineTo(px, py); c.stroke();
    const n = 9, len = Math.hypot(sx - px, sy - py);
    for (let i = 1; i < n; i++) {
      const f = i / n, tx = px + (sx - px) * f, ty = py + (sy - py) * f;
      c.strokeStyle = L.rgba(GOLD, 0.55); c.lineWidth = 1.4;
      c.beginPath(); c.moveTo(tx - uy * 5, ty + ux * 5); c.lineTo(tx + uy * 5, ty - ux * 5); c.stroke();
    }
    // photon head
    if (st.q < 1) {
      L.lightBlob(c, px, py, 22, [255, 236, 190], 0.8);
      c.fillStyle = 'rgba(255,250,235,1)'; c.beginPath(); c.arc(px, py, 3, 0, Math.PI * 2); c.fill();
    }
  }
  // the source (a small warm galaxy glyph)
  L.lightBlob(c, sx, sy, 20, [255, 190, 130], 0.7);
  c.fillStyle = 'rgba(255,230,200,1)'; c.beginPath(); c.arc(sx, sy, 3.2, 0, Math.PI * 2); c.fill();
  // arrival flash at us
  const a = L.prog(s, T_ARR, 0.9);
  if (a > 0 && a < 1) {
    L.lightBlob(c, x, y, 20 + 60 * L.ease.outCubic(a), [255, 225, 160], 0.7 * (1 - a));
  }
  c.restore();
}

function drawOverlay(c, v) {
  const t = v.t, p = [0, 1, 2].map((i) => ph(v, 31, i));
  const { x, y, r } = uni(v);
  const ux = Math.cos(ANG), uy = Math.sin(ANG);
  const st = state(t);
  // travel time: above the ray, inside the sphere
  const k1 = kin(t, p[0] + 0.9, 0.6) * v.k;
  if (k1 > 0) {
    const mx = x + ux * r * 0.5, my = y + uy * r * 0.5;
    text(c, 'LIGHT TRAVEL TIME', mx + 30, my + 62, { size: 17, weight: 600, color: SUB, track: 2.5, align: 'center', alpha: k1 });
    text(c, '13.8 BILLION YEARS', mx + 30, my + 90, { size: 24, weight: 700, color: GOLD, track: 2.5, align: 'center', alpha: k1 });
  }
  // the source now sits on the edge
  const k2 = kin(t, Math.max(p[2] + 0.2, 6.9), 0.7) * v.k;
  if (k2 > 0) {
    const sx = x + ux * r * st.src, sy = y + uy * r * st.src;
    const lx = Math.min(sx - 34, 500), ly = sy + 46;
    c.save(); c.globalAlpha = k2;
    c.strokeStyle = 'rgba(0,0,0,0.5)'; c.lineWidth = 4;
    c.beginPath(); c.moveTo(sx - 6, sy + 6); c.lineTo(lx + 6, ly - 22); c.stroke();
    c.strokeStyle = L.rgba(INK, 0.8); c.lineWidth = 1.6;
    c.beginPath(); c.moveTo(sx - 6, sy + 6); c.lineTo(lx + 6, ly - 22); c.stroke();
    c.restore();
    text(c, 'THAT PLACE IS NOW', lx, ly, { size: 18, weight: 600, color: SUB, track: 2.5, align: 'right', alpha: k2 });
    text(c, '46.5 BILLION', lx, ly + 34, { size: 30, weight: 800, family: L.FONT.display, track: 0.5, align: 'right', alpha: k2 });
    text(c, 'LIGHT-YEARS AWAY', lx, ly + 60, { size: 18, weight: 600, color: SUB, track: 2.5, align: 'right', alpha: k2 });
  }
}

export default {
  beat: 31,
  chapter: null,
  layer: 2,
  cues() {
    return [
      { t: T_GO, name: 'blip', gain: 0.14, pitch: 0.8 },
      { t: 2.3, name: 'swell', gain: 0.2, pitch: 0.55 },
      { t: 7.0, name: 'ping', gain: 0.14, pitch: 0.7 },
      { t: T_ARR, name: 'bloom', gain: 0.18, pitch: 1.0 },
    ];
  },
  drawWorld,
  drawOverlay,
};
