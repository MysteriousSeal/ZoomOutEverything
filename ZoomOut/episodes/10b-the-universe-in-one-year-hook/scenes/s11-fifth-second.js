// Beat 11 — "Less than a fifth of a second."
// Held inside the last second (s10 draws the lit sliver + figure). The answer lands: "0.18 s" / an 80-year
// life on the left, joined to the pillar by a fine leader. On "fifth" a grey bracket spans the last 0.2 s
// of the ruler, just wider than the glowing sliver beneath it: a fifth of a second, and the life fits
// inside it with room to spare.
import * as L from '../../../../engine/runtime/lib.js';
import { ACCENT, HOT, RULER_Y, SEC, SLIVER } from './s10-you.js';

const BEAT = 11;
const T_LABEL = 0.18, T_FIFTH = 0.7;
const INK = [235, 228, 240];

/** "1/5 SECOND" bracket over the ruler (screen space, from world anchors). */
function fifthBracket(c, v, k) {
  if (k <= 0) return;
  const e = L.ease.outCubic(k);
  const x0 = v.wx(SEC.x + SEC.w * 0.8), x1 = v.wx(SEC.x + SEC.w);
  const yr = v.wy(RULER_Y), y = yr - 50;
  const mid = (x0 + x1) / 2;
  const a = L.lerp(mid, x0, e), b = L.lerp(mid, x1, e);
  c.save();
  c.strokeStyle = L.rgba(INK, 0.8);
  c.lineWidth = 2;
  c.beginPath();
  c.moveTo(a, y + 14 * e); c.lineTo(a, y); c.lineTo(b, y); c.lineTo(b, y + 14 * e);
  c.stroke();
  // dashed drop lines to the ruler
  c.setLineDash([3, 5]);
  c.strokeStyle = L.rgba(INK, 0.6 * L.clamp(k * 2 - 1));   // the bracket is 0.2 s on the ruler: its drop lines say so
  c.beginPath(); c.moveTo(x0, y + 18); c.lineTo(x0, yr - 4); c.moveTo(x1, y + 18); c.lineTo(x1, yr - 4); c.stroke();
  c.setLineDash([]);
  const ta = L.clamp(k * 2 - 0.6);
  if (ta > 0) {
    c.globalAlpha *= ta;
    c.font = L.font(32, 700, L.FONT.body);
    c.fillStyle = L.rgba(INK, 0.95);
    c.textBaseline = 'alphabetic';
    c.shadowColor = 'rgba(0,0,0,0.8)'; c.shadowBlur = 10;
    const tw = c.measureText('1/5 SECOND').width + 4 * 9;               // + tracking
    const tx = Math.min(mid, 900 - tw / 2), ty = yr - 66 + (1 - ta) * 8;
    // dark feathered backing: the sliver's edge line must not run through the text
    c.save();
    c.shadowColor = 'transparent';
    const g = c.createLinearGradient(tx - tw / 2 - 30, 0, tx + tw / 2 + 30, 0);
    g.addColorStop(0, 'rgba(20,10,22,0)'); g.addColorStop(0.15, 'rgba(20,10,22,0.9)');
    g.addColorStop(0.85, 'rgba(20,10,22,0.9)'); g.addColorStop(1, 'rgba(20,10,22,0)');
    c.fillStyle = g;
    c.fillRect(tx - tw / 2 - 30, ty - 34, tw + 60, 46);
    c.restore();
    L.trackedText(c, '1/5 SECOND', tx, ty, 4, 'center');
  }
  c.restore();
}

export default {
  beat: BEAT,
  chapter: { num: '11', title: 'A fifth of a second', sub: '' },
  captions: true,
  layer: 7,
  cues(d) {
    return [
      { t: T_LABEL - 0.03, name: 'impact', gain: 0.4, pitch: 0.9 },
      { t: T_LABEL + 0.02, name: 'tick', gain: 0.24, pitch: 1.1 },
      { t: T_FIFTH, name: 'swish', gain: 0.2, pitch: 1.3 },
      { t: T_FIFTH + 0.18, name: 'ping', gain: 0.2, pitch: 1.25 },
      { t: 1.9, name: 'shimmer', gain: 0.18, pitch: 1.1 },
    ];
  },
  drawWorld() {},
  drawOverlay(c, v) {
    // gone before beat 12's pull-back starts (the engine's own overlay fade lands too late)
    const out = 1 - L.ease.inCubic(L.prog(v.t, v.d - 0.45, 0.35));
    if (out <= 0) return;
    c.save();
    c.globalAlpha *= out;
    drawLabel(c, v);
    c.restore();
  },
};

function drawLabel(c, v) {
    const lk = Math.min(v.k, L.prog(v.t, T_LABEL, 0.6));
    if (lk <= 0) return;
    const sx0 = v.wx(SLIVER.x);
    const top = v.wy(SEC.y), h = v.ws(SEC.h);
    const ly = L.clamp(top + h * 0.48, 760, 900);              // label baseline
    // big label (left)
    const lx = Math.max(104, v.wx(SEC.x) + 40);              // inside the second's cell, clear of its border
    L.bigLabel(c, { x: lx, y: ly, big: '0.18 s', small: 'an 80-year life', k: lk, accent: v.accent, size: 150 });
    // leader from the label to the pillar
    c.save();
    c.font = L.font(150, 800, L.FONT.display);
    c.letterSpacing = '-1px';
    const bw = c.measureText('0.18 s').width;
    c.letterSpacing = '0px';
    c.restore();
    const lx0 = lx + bw + 26, lx1 = sx0 + 10, yy = ly - 52;   // the dot lands just inside the sliver
    const k2 = Math.min(v.k, L.prog(v.t, T_LABEL + 0.25, 0.6));
    if (k2 > 0 && lx1 > lx0 + 30) {
      const e = L.ease.outCubic(k2);
      c.save();
      c.strokeStyle = L.rgba(ACCENT, 0.75);
      c.lineWidth = 2;
      c.beginPath(); c.moveTo(lx0, yy); c.lineTo(L.lerp(lx0, lx1, e), yy); c.stroke();
      c.fillStyle = L.rgba(HOT, 0.95);
      c.beginPath(); c.arc(L.lerp(lx0, lx1, e), yy, Math.max(0, 4.5 * e), 0, Math.PI * 2); c.fill();
      c.restore();
    }
    // the fifth-of-a-second bracket
    fifthBracket(c, v, Math.min(v.k, L.prog(v.t, T_FIFTH, 0.7)));
}
