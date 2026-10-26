// Beat 4 — "Because the fallout is coming: | radioactive dust, deadliest in the first hours."
// Camera 'fallout' pulls back up over the city; env draws the plume, the falling dust (falloutK) and the ash settling on
// roofs (settleK); the core + basement keep their green glow (safeK).
//   phrase 0  a few larger "hot" dust motes with a faint glow drift down through the frame (the dust made visible);
//             the shelter's core + basement get a soft breathing green outline ("still protected").
//   phrase 1  WARNING card in the STEP-badge slot (env stepBadge, icon tile): yellow tile with a drawn radiation trefoil
//             + RADIOACTIVE DUST, then the series sub chip DEADLIEST IN THE FIRST HOURS (FIRST HOURS in red).
import * as L from '../../../../engine/runtime/lib.js';
import { stepBadge, falloutK, safeK, toScreen, RECTS, BLD, CD, SAFE, DANGER, ASH, TEXT } from '../env.js';

const ph = (v, j) => v.tl.lines[v.index].phrases[j].start - v.tl.scenes[v.index].start;
const TAU = Math.PI * 2;

/** radiation trefoil (ISO 361 proportions, simplified) centred at (x, y), outer radius r */
function trefoil(c, x, y, r, col) {
  c.save();
  c.fillStyle = L.rgba(col);
  c.beginPath(); c.arc(x, y, Math.max(0, r * 0.2), 0, TAU); c.fill();
  for (let i = 0; i < 3; i++) {
    const a0 = -Math.PI / 2 + i * (TAU / 3) - Math.PI / 6, a1 = a0 + Math.PI / 3;
    c.beginPath();
    c.arc(x, y, Math.max(0, r), a0, a1);
    c.arc(x, y, Math.max(0, r * 0.3), a1, a0, true);
    c.closePath(); c.fill();
  }
  c.restore();
}

// deterministic "hot" motes
const MOTES = (() => { const r = L.rng(4404); return Array.from({ length: 22 }, () => ({ x: r(), y: r(), s: r(), ph: r() * TAU })); })();

export default {
  beat: 4,
  chapter: null,
  captions: true,
  layer: 5,
  cues() { return []; },

  drawWorld(c, v) {
    if (v.t < -0.2 || v.t > v.d + 0.6) return;
    const vis = L.enter(v.t, 0.2, 0.8) * (1 - L.enter(v.t, v.d - 0.3, 0.3, L.ease.inOutCubic));
    if (vis <= 0) return;
    c.save();
    // ---- the shelter keeps glowing: soft breathing outline on the basement + core
    const sk = safeK(v.gt, v.tl) * vis;
    if (sk > 0) {
      const br = 0.6 + 0.4 * Math.sin((v.gt - 34) * 2.4);
      const b = toScreen(v, RECTS.basement), co = toScreen(v, { x0: BLD.core.x0, y0: BLD.roof, x1: BLD.core.x1, y1: 0 });
      L.lightBlob(c, b.cx, b.cy, b.w * 0.6, SAFE, 0.18 * sk * br);
      L.lightBlob(c, co.cx, co.cy, co.h * 0.45, SAFE, 0.1 * sk * br);
      c.strokeStyle = L.rgba(SAFE, 0.55 * sk * br);
      c.lineWidth = 2.5;
      c.shadowColor = L.rgba(SAFE, 0.9); c.shadowBlur = 12;
      c.strokeRect(co.x0, co.y0, co.w, co.h);
      c.strokeRect(b.x0, b.y0, b.w, b.h);
      c.shadowColor = 'transparent';
    }
    // ---- hot dust motes (screen space), only above the street
    const fk = falloutK(v.gt, v.tl) * vis;
    if (fk > 0.01) {
      const gy = v.wy(0) - 4, bx0 = v.wx(BLD.x0) - 6, bx1 = v.wx(BLD.x1) + 6, by = v.wy(BLD.roof) - 4;
      for (const m of MOTES) {
        const sp = 70 + 60 * m.s, span = 1500;
        let y = (m.y * span + v.t * sp) % span; y += 380;
        const x = 70 + ((((m.x * 860 - v.t * (16 + 14 * m.s)) % 860) + 860) % 860) + L.noise1(v.gt * 0.5 + m.ph, 7) * 26;   // drifting toward the city (left)
        if (y > gy || (x > bx0 && x < bx1 && y > by)) continue;   // never inside the shelter
        const a = fk * (0.55 + 0.45 * Math.sin(v.gt * 3 + m.ph)) * L.clamp((gy - y) / 60) * L.clamp((x - 70) / 80) * L.clamp((930 - x) / 80);
        const r = 2.4 + 2.2 * m.s;
        L.lightBlob(c, x, y, r * 3.2, [236, 206, 160], 0.1 * a);
        c.fillStyle = L.rgba([196, 182, 160], 0.9 * a);
        c.beginPath(); c.arc(x, y, Math.max(0, r), 0, TAU); c.fill();

      }
    }
    c.restore();
  },

  drawOverlay(c, v) {
    const p1 = ph(v, 1);
    const k = L.enter(v.t, 0.28, 0.7);   // on "fallout" (≈ 34.5): the card names it as the word lands
    if (k <= 0) return;
    c.save();
    c.globalAlpha = v.k;
    // the series slot card (env stepBadge) as a WARNING: yellow tile with a drawn radiation trefoil, + the sub chip
    stepBadge(c, v, null, 'RADIOACTIVE DUST', {
      k, icon: (cc) => trefoil(cc, 0, 0, 38, CD.ink),
      // the caption says "deadliest in the first hours": the chip adds where it comes from instead of repeating it
      sub: [{ t: 'IT FALLS FOR HOURS, ' }, { t: 'DOWNWIND', col: L.mix(DANGER, [255, 255, 255], 0.18) }],
      subK: L.enter(v.t, p1 + 0.35, 0.5),
    });
    c.restore();
  },
};
