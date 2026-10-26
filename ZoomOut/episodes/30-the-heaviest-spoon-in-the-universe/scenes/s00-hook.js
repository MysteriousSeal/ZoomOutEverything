// Beat 0 — "One teaspoon of this weighs more than every human on Earth. | Combined."
// drawWorld (whole film): the polished steel teaspoon with its glowing dollop, at true scale in the world (2.6 km above
//   the star). It is the hook's subject, shrinks to a point in the beat-1 pull-out, and returns in beat 4, when the
//   packed neutrons of beat 3 shrink into its dollop (the lattice is drawn inside the dollop clip).
// drawOverlay: headline ONE TEASPOON / WEIGHS MORE THAN / EVERY HUMAN ON EARTH, fitted ≤ 940 px, on frame 1;
//   "COMBINED." tag on phrase 1. Captions off.
import * as L from '../../../../engine/runtime/lib.js';
import { ACCENT, GAP, LAT_END, SPOON, drawSpoon, drawLattice, dollopScreen, phrase } from '../env.js';
import { MPP_CUT, DOLLOP_SCREEN } from '../camera.js';

const { W } = L;
const MAXW = 940, TOP = 372;
const LINES = [[['ONE TEASPOON', 'acc']], [['WEIGHS MORE THAN', null]], [['EVERY HUMAN ON EARTH', null]]];
const txt = (p) => p.map((q) => q[0]).join('');
export const LAT_O3 = { x: 540, y: 880 };   // beat-3 lattice origin (before the drift offset)

export default {
  beat: 0,
  chapter: null,
  captions: false,
  overlayIn: false,
  layer: 2,
  cues() {
    return [
      { t: 0.0, name: 'deep', gain: 0.4, pitch: 0.7 },
      { t: 0.0, name: 'shimmer', gain: 0.12, pitch: 1.2 },
      { t: 4.2, name: 'impact', gain: 0.24, pitch: 0.7 },   // in the 4.09 → 4.54 gap, before "Combined."
    ];
  },
  drawWorld(c, v) {
    const gt = v.gt, tl = v.tl, sc = tl.scenes;
    const s = 1 / v.cam.mpp;                               // px per metre
    const sx = v.wx(SPOON.x), sy = v.wy(SPOON.y);
    const len = 0.14 * s;
    // visible: beats 0–1 (until the star is in) and beats 4–5 (until the star is back)
    const visA = 1 - L.smoothstep(L.prog(gt, sc[1].start + 2.2, 0.8));
    const visB = L.prog(gt, sc[4].start - 0.001, 0.001) * (1 - L.smoothstep(L.prog(gt, sc[5].start + 1.2, 0.6)));
    const vis = Math.max(visA, visB);
    if (vis <= 0) return;
    if (len < 1.5) {
      // a point of light where the spoon was
      const d = dollopScreen(v);
      c.save(); c.globalCompositeOperation = 'lighter';
      L.lightBlob(c, d.x, d.y, 16, [210, 230, 255], 0.9 * vis);
      L.lightBlob(c, d.x, d.y, 5, [255, 255, 255], 0.9 * vis);
      c.restore();
      return;
    }
    // beat 4: the dollop is the lattice of beat 3, shrinking with the pull-out
    let innerK = 0, inner = null;
    if (gt >= sc[4].start - 1e-6 && gt < sc[5].start) {
      const scale = MPP_CUT / v.cam.mpp;
      const sp = LAT_END * scale;
      innerK = L.clamp((sp - 2.5) / 5);   // below ≈ 7 px the lattice is already its average colour (env.drawLattice)
      const D = dollopScreen(v);
      const ox = D.x + (LAT_O3.x - DOLLOP_SCREEN.x) * scale, oy = D.y + (LAT_O3.y - DOLLOP_SCREEN.y) * scale;
      inner = (cc) => {
        cc.fillStyle = L.rgba(GAP, innerK);
        cc.fillRect(-20, -20, W + 40, L.H + 40);
        drawLattice(cc, ox, oy, sp, { alpha: innerK });
      };
    }
    drawSpoon(c, sx, sy, s, { alpha: vis, gt, innerK, inner });
  },
  drawOverlay(c, v) {
    const end = v.tl.scenes[0].end;
    const kk = 1 - L.ease.inCubic(L.prog(v.gt, end - 0.45, 0.3));
    if (kk <= 0) return;
    c.save();
    c.globalAlpha = kk;
    // soft scrim behind the headline
    const sg = c.createRadialGradient(0, 0, 0, 0, 0, 620);
    sg.addColorStop(0, 'rgba(2,6,16,0.55)'); sg.addColorStop(0.6, 'rgba(2,6,16,0.3)'); sg.addColorStop(1, 'rgba(2,6,16,0)');
    c.save(); c.translate(W / 2, 560); c.scale(1, 0.55); c.fillStyle = sg; c.fillRect(-640, -640, 1280, 1280); c.restore();
    const size = Math.min(...LINES.map((p) => L.fitSize(c, txt(p), MAXW, 120, 800, L.FONT.display, 50)));
    c.textBaseline = 'alphabetic';
    c.font = L.font(size, 800, L.FONT.display);
    let y = TOP + size * 0.74;
    for (const parts of LINES) {
      let x = W / 2 - c.measureText(txt(parts)).width / 2;
      for (const [t, col] of parts) {
        c.save();
        if (col) {
          c.shadowColor = L.rgba([90, 160, 255], 0.85); c.shadowBlur = 30;
          c.fillStyle = L.rgba(ACCENT);
        } else {
          c.shadowColor = 'rgba(0,0,0,0.8)'; c.shadowBlur = 18;
          c.fillStyle = '#fff';
        }
        c.fillText(t, x, y);
        c.restore();
        x += c.measureText(t).width;
      }
      y += size * 0.98;
    }
    // phrase 1: COMBINED. (accent plate wipes in)
    const tk = L.enter(v.t, phrase(v, 1) - 0.03, 0.35, L.ease.outQuint);   // on "Combined"
    if (tk > 0) {
      const TAG = 'COMBINED.';
      c.font = L.font(54, 800, L.FONT.display);
      c.letterSpacing = '6px';
      const tw = c.measureText(TAG).width - 6;
      c.letterSpacing = '0px';
      const padX = 30, h = 76, bw = tw + padX * 2, bx = W / 2 - bw / 2, by = y - size * 0.98 + 40;
      c.save();
      c.beginPath(); c.rect(bx - 6, by - 10, (bw + 12) * tk, h + 20); c.clip();
      c.shadowColor = 'rgba(0,0,0,0.5)'; c.shadowBlur = 18;
      c.fillStyle = L.rgba(ACCENT);
      L.roundRect(c, bx, by, bw, h, 10); c.fill();
      c.shadowBlur = 0;
      c.fillStyle = '#071024';
      L.trackedText(c, TAG, W / 2, by + h / 2 + 20, 6, 'center');
      c.restore();
    }
    c.restore();
  },
};
