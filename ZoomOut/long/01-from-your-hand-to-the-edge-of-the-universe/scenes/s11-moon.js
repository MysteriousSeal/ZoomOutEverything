// Beat 11: The Moon, | three hundred eighty-four thousand kilometers away. | Light makes the trip in just over a second.
// Builder B. Earth and Moon at true size and true distance (layers/earth.js). This scene adds a magnifier on the Moon
// (its real near side, lit like the Earth), the distance, and a pulse of light that crosses from the Earth to the Moon
// in real time (1.28 s) as the voice says it, with a running timer.
import * as L from '../../../../engine/runtime/lib.js';
import { ACCENT, INK } from '../world.js';
import { R_EARTH, MOON_POS, C } from '../camera.js';
import { R_MOON, LIGHT } from '../layers/earth.js';
import { moonSprite } from '../layers/b-moon.js';
import { phrase, enter, text, place } from '../layers/b-label.js';

const B = 11;
const DIST = Math.hypot(MOON_POS.x, MOON_POS.y);
const LT = (DIST - R_EARTH - R_MOON) / C;       // surface to surface: 1.26 s; centre to centre 1.28 s
const TRIP = DIST / C;                         // 1.282 s (the timer shows this)
const pulseStart = () => phrase(B, 2) + 0.15;

/** The magnifier: a lens next to the true-size Moon, joined to it by two tangent lines. Shared with beat 12. */
export function moonLens(c, v, k, { dx = 20, dy = 235, R = 86 } = {}) {
  if (k <= 0) return;
  const mx = v.wx(MOON_POS.x), my = v.wy(MOON_POS.y), mr = Math.max(1.5, v.ws(R_MOON));
  const lx = mx + dx, ly = my + dy;
  const e = L.ease.outCubic(L.clamp(k));
  const R2 = R * (0.6 + 0.4 * e);
  c.save();
  c.globalAlpha *= L.clamp(k * 1.4);
  // tangent lines from the little Moon to the lens
  const d = Math.hypot(dx, dy), ux = dx / d, uy = dy / d, nx = -uy, ny = ux;
  c.strokeStyle = L.rgba(INK, 0.35); c.lineWidth = 1.3;
  c.beginPath();
  c.moveTo(mx + nx * (mr + 3), my + ny * (mr + 3)); c.lineTo(lx + nx * R2, ly + ny * R2);
  c.moveTo(mx - nx * (mr + 3), my - ny * (mr + 3)); c.lineTo(lx - nx * R2, ly - ny * R2);
  c.stroke();
  c.strokeStyle = L.rgba(INK, 0.6); c.lineWidth = 1.4;
  c.beginPath(); c.arc(mx, my, mr + 3, 0, Math.PI * 2); c.stroke();
  // the lens: dark glass + the Moon filling it
  c.fillStyle = 'rgba(3,5,10,0.92)';
  c.beginPath(); c.arc(lx, ly, R2 + 6, 0, Math.PI * 2); c.fill();
  c.drawImage(moonSprite(384, LIGHT), lx - R2, ly - R2, R2 * 2, R2 * 2);
  c.strokeStyle = L.rgba(INK, 0.55); c.lineWidth = 1.5;
  c.beginPath(); c.arc(lx, ly, R2 + 6, 0, Math.PI * 2); c.stroke();
  c.restore();
  const mag = Math.round(R / mr / 5) * 5;
  text(c, `MAGNIFIED ×${mag}`, lx, ly + R + 26, { size: 16, alpha: L.clamp(k * 2 - 1) * 0.85, align: 'center', color: [190, 205, 220], track: 3, weight: 600 });
  return { lx, ly, R };
}

export default {
  beat: 11,
  chapter: { num: '06', title: "The Moon", sub: "384,400 km away" },
  cues() {
    return [
      { t: phrase(B, 0) + 0.1, name: 'deep', gain: 0.2, pitch: 0.9 },
      { t: phrase(B, 1) + 0.4, name: 'shimmer', gain: 0.12, pitch: 1.0 },
      { t: pulseStart(), name: 'blip', gain: 0.18, pitch: 1.3 },
      { t: pulseStart() + TRIP, name: 'ping', gain: 0.2, pitch: 1.15 },
    ];
  },
  drawOverlay(c, v) {
    const lf = v.cam.lf;
    const zk = L.clamp(L.invLerp(8.8, 8.95, lf));
    const ex = v.wx(0), ey = v.wy(0), mx = v.wx(MOON_POS.x), my = v.wy(MOON_POS.y);
    const er = v.ws(R_EARTH), mr = v.ws(R_MOON);
    const ux = (mx - ex) / Math.hypot(mx - ex, my - ey), uy = (my - ey) / Math.hypot(mx - ex, my - ey);
    // the Moon: a magnifier with its name
    const kM = enter(v, Math.max(phrase(B, 0), 2.6), 0.9) * zk;
    const lens = moonLens(c, v, kM);
    if (lens) {
      text(c, 'THE MOON', lens.lx + lens.R + 22, lens.ly - 12, { size: 22, alpha: L.clamp(kM * 2 - 1) });
      text(c, '3,474 KM ACROSS', lens.lx + lens.R + 22, lens.ly + 16, { size: 16, weight: 600, alpha: L.clamp(kM * 2 - 1) * 0.9, color: [190, 205, 220], track: 2 });
    }
    // Earth's name
    const kE = enter(v, 2.8, 0.7) * zk;
    text(c, 'EARTH', ex - er - 14, ey + 2, { size: 18, alpha: kE, align: 'right' });
    // the distance line (surface to surface), dashed, with the number above it
    const kD = enter(v, phrase(B, 1) + 0.1, 1.0) * zk;
    const a = { x: ex + ux * (er + 6), y: ey + uy * (er + 6) }, b = { x: mx - ux * (mr + 7), y: my - uy * (mr + 7) };
    if (kD > 0) {
      const e = L.ease.inOutCubic(kD);
      c.save();
      c.setLineDash([6, 8]);
      c.strokeStyle = L.rgba(INK, 0.45); c.lineWidth = 1.5;
      c.beginPath(); c.moveTo(a.x, a.y); c.lineTo(L.lerp(a.x, b.x, e), L.lerp(a.y, b.y, e)); c.stroke();
      c.restore();
      const midx = (a.x + b.x) / 2, midy = (a.y + b.y) / 2, ang = Math.atan2(uy, ux);
      c.save(); c.translate(midx + uy * 26, midy - ux * 26); c.rotate(ang);
      text(c, '384,400 KM', 0, 0, { size: 22, alpha: L.clamp(kD * 2 - 1), align: 'center' });
      c.restore();
      c.save(); c.translate(midx - uy * 24, midy + ux * 24); c.rotate(ang);
      text(c, '30 EARTHS SIDE BY SIDE', 0, 0, { size: 16, weight: 600, alpha: L.clamp(kD * 2 - 1) * 0.85, align: 'center', color: [190, 205, 220], track: 2 });
      c.restore();
    }
    // the light pulse, in real time
    const t0 = pulseStart(), tt = v.t - t0;
    const kP = L.clamp(L.invLerp(-0.3, 0, tt)) * v.k * zk;
    if (kP > 0) {
      const f = L.clamp(tt / TRIP);
      const px = L.lerp(ex + ux * er, mx - ux * mr, f), py = L.lerp(ey + uy * er, my - uy * mr, f);
      const arrived = tt >= TRIP;
      // trail
      c.save();
      c.globalCompositeOperation = 'lighter';
      const tl = 160;
      const tx = px - ux * Math.min(tl, f * Math.hypot(b.x - a.x, b.y - a.y)), ty = py - uy * Math.min(tl, f * Math.hypot(b.x - a.x, b.y - a.y));
      const gr = c.createLinearGradient(tx, ty, px, py);
      gr.addColorStop(0, 'rgba(255,240,200,0)'); gr.addColorStop(1, `rgba(255,240,200,${0.8 * kP * (arrived ? L.clamp(1 - (tt - TRIP) / 0.6) : 1)})`);
      c.strokeStyle = gr; c.lineWidth = 3; c.lineCap = 'round';
      c.beginPath(); c.moveTo(tx, ty); c.lineTo(px, py); c.stroke();
      if (!arrived || tt < TRIP + 0.8) {
        const flash = arrived ? L.clamp(1 - (tt - TRIP) / 0.8) : 1;
        const rad = arrived ? 10 + 40 * (1 - flash) : 9;
        const g2 = c.createRadialGradient(px, py, 0, px, py, rad * 2.2);
        g2.addColorStop(0, `rgba(255,248,225,${kP * flash})`); g2.addColorStop(0.35, `rgba(255,220,160,${0.5 * kP * flash})`); g2.addColorStop(1, 'rgba(255,200,120,0)');
        c.fillStyle = g2; c.beginPath(); c.arc(px, py, rad * 2.2, 0, Math.PI * 2); c.fill();
      }
      c.restore();
      // the timer (below the line's middle)
      const shown = Math.min(TRIP, Math.max(0, tt));
      const midx = (a.x + b.x) / 2, midy = (a.y + b.y) / 2;
      const kx = L.clamp(L.invLerp(-0.3, 0.1, tt)) * v.k;
      const bx0 = midx - 90, by0 = midy + 150;
      c.save(); c.globalAlpha *= kx;
      c.font = L.font(64, 800, L.FONT.display); c.textBaseline = 'alphabetic';
      c.fillStyle = L.rgba(arrived ? ACCENT : [255, 236, 200]);
      c.shadowColor = 'rgba(2,6,12,0.85)'; c.shadowBlur = 16;
      c.fillText(`${shown.toFixed(2)} S`, bx0, by0);
      c.restore();
      text(c, 'LIGHT, EARTH → MOON', bx0 + 2, by0 + 26, { size: 16, weight: 600, alpha: kx * 0.9, color: [200, 212, 226], track: 2.5 });
    }
    void LT; void place;
  },
};
