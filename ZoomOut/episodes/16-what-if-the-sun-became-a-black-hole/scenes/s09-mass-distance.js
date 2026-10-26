// Beat 9 — "Only mass and distance matter."
// Back to the whole orbit: a clean two-symbol diagram. Everything else dims (the orbit trace, the pull vectors and
// the star twin fade out). On "mass" a violet ring closes around the black hole and an "M" sets beside it; on
// "distance" the radius bracket from beat 7 brightens again and takes a "d". All of it clears as the dive begins.
import * as L from '../../../../engine/runtime/lib.js';
import { ACC, drawLabels } from './s05-dark.js';
import { drawOrbitTags, orbitGeom } from './s06-no-fly-off.js';
import { radiusGeom } from './s07-same-orbit.js';

const T_M = 37.75, T_D = 38.35, T_OUT = 39.55;

function glyph(c, text, x, y, k, size, italic) {
  if (k <= 0) return;
  c.save();
  c.globalAlpha *= L.clamp(k * 1.3);
  c.font = `${italic ? 'italic ' : ''}${L.font(size, italic ? 600 : 800, italic ? L.FONT.body : L.FONT.display)}`;
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  c.shadowColor = 'rgba(0,0,0,0.7)'; c.shadowBlur = 14;
  c.fillStyle = L.rgba(L.mix(ACC, [255, 255, 255], 0.15));
  c.translate(x, y + (1 - L.ease.outCubic(L.clamp(k))) * 14);
  const s = 0.85 + 0.15 * L.ease.outBack(L.clamp(k));
  c.scale(s, s);
  c.fillText(text, 0, 0);
  c.restore();
}

function drawDiagram(c, v) {
  const gt = v.gt;
  if (gt < T_M - 0.1 || gt > T_OUT + 0.5) return;
  const g = orbitGeom(v);
  if (g.R < 60 || g.R > 4000) return;
  const out = 1 - L.ease.inCubic(L.prog(gt, T_OUT, 0.4));
  // M: a ring closes around the black hole, the letter sets to its left
  const km = L.ease.outCubic(L.prog(gt, T_M, 0.6)) * out;
  if (km > 0) {
    c.save();
    c.strokeStyle = L.rgba(L.mix(ACC, [255, 255, 255], 0.25), 0.9 * out);
    c.lineWidth = 2.4;
    c.lineCap = 'round';
    const a0 = -Math.PI / 2;
    c.beginPath(); c.arc(g.cx, g.cy, 30, a0, a0 + Math.PI * 2 * km); c.stroke();
    const fl = gt - T_M;
    if (fl > 0 && fl < 0.9) { c.globalCompositeOperation = 'lighter'; L.lightBlob(c, g.cx, g.cy, 80, ACC, 0.45 * (1 - fl / 0.9)); }
    c.restore();
    glyph(c, 'M', g.cx - 78, g.cy + 4, L.prog(gt, T_M + 0.1, 0.5) * out, 72, false);
  }
  // d: on the radius bracket (s07 brightens it at 38.3)
  const kd = L.prog(gt, T_D, 0.5) * out;
  if (kd > 0) {
    const { A, B, o } = radiusGeom(v);
    const mx = (A.x + B.x) / 2 + o.x * 40, my = (A.y + B.y) / 2 + o.y * 40;
    glyph(c, 'd', mx, my, kd, 76, true);
  }
}

export default {
  beat: 9,
  chapter: { num: '09', title: 'Mass and distance', sub: 'all that gravity cares about' },
  captions: true,
  layer: 2,
  cues() {
    // beat starts 37.307 s
    const s = 37.307;
    return [
      { t: T_M - s, name: 'impact', gain: 0.3, pitch: 1.1 },
      { t: T_M - s + 0.05, name: 'tick', gain: 0.3, pitch: 0.9 },
      { t: T_D - s, name: 'tick', gain: 0.32, pitch: 1.2 },
      { t: T_D - s + 0.04, name: 'swish', gain: 0.18, pitch: 1.4 },
    ];
  },
  drawWorld(c, v) {
    drawDiagram(c, v);
  },
  drawOverlay(c, v) {
    drawLabels(c, v);
    drawOrbitTags(c, v);
  },
};
