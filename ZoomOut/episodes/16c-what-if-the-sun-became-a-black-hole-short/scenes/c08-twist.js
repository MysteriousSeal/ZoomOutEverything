// 16c beat 8 — "But here's the twist: | the Sun can never do this." (16 beat 16)
// 16c audit: the 1 AU flight from the frozen globe back to the hole left ~1 s of near-empty frames (both bodies sub-
// pixel). A course line now streams from Earth to a violet beacon on the hole (the mirror of s13's flight back, same
// language), riding the edge of the safe area while the hole is off-screen, and leaves before the Sun re-inflates.
import * as L from '../../../../engine/runtime/lib.js';
import { at as camAt, EARTH, R_EARTH, SUN } from '../camera.js';
import { ACCENT } from '../env.js';
import { TL } from '../remap.js';
import { beat } from './cut.js';
import s16 from './s16-twist.js';

const TAU = Math.PI * 2;
const COOL = [150, 205, 255];
const SAFE = { x0: 110, x1: 900, y0: 380, y1: 1110 };

/** The point of segment a->b nearest b that lies inside SAFE (Liang-Barsky), or b clamped. */
function clip(ax, ay, bx, by) {
  const dx = bx - ax, dy = by - ay;
  let t0 = 0, t1 = 1;
  for (const [p, q] of [[-dx, ax - SAFE.x0], [dx, SAFE.x1 - ax], [-dy, ay - SAFE.y0], [dy, SAFE.y1 - ay]]) {
    if (p === 0) { if (q < 0) { t1 = -1; break; } continue; }
    const r = q / p;
    if (p < 0) t0 = Math.max(t0, r); else t1 = Math.min(t1, r);
  }
  if (t1 < t0) return [L.clamp(bx, SAFE.x0, SAFE.x1), L.clamp(by, SAFE.y0, SAFE.y1)];
  return [ax + dx * t1, ay + dy * t1];
}
function scr(cam, p) { return [(p.x - cam.x) / cam.mpp + L.W / 2, (p.y - cam.y) / cam.mpp + L.H / 2]; }
function beaconAt(cam) { const [ex, ey] = scr(cam, EARTH), [hx, hy] = scr(cam, SUN); return clip(ex, ey, hx, hy); }

function courseBeacon(c, v) {
  const gt = Math.round(v.gt * 30) / 30;
  const b0 = TL.scenes[8].start;
  // in just after the beat starts (s14's labels are gone), out before the Sun re-inflates (16 T.restore = 16c 37.56 s)
  const k = L.enter(gt, b0 + 0.08, 0.35) * (1 - L.smoothstep(L.invLerp(b0 + 1.2, b0 + 1.5, gt)));
  if (k <= 0.002) return;
  const cam = v.cam;
  const [ex, ey] = scr(cam, EARTH), [hx, hy] = scr(cam, SUN);
  const [bx, by] = clip(ex, ey, hx, hy);
  const rE = R_EARTH / cam.mpp;
  // course line: from just outside Earth's limb to the beacon
  const dx = bx - ex, dy = by - ey, dl = Math.hypot(dx, dy);
  if (dl > 40) {
    const ux = dx / dl, uy = dy / dl;
    const r0 = Math.min(dl - 30, rE + 14);
    const len = Math.min(dl - r0, 1400);
    const sx = bx - ux * len, sy = by - uy * len;
    if (len > 20 && r0 >= 0) {
      c.save();
      c.globalCompositeOperation = 'lighter';
      const g = c.createLinearGradient(sx, sy, bx - ux * 14, by - uy * 14);
      g.addColorStop(0, L.rgba(COOL, 0));
      g.addColorStop(0.5, L.rgba(L.mix(COOL, ACCENT, 0.5), 0.22 * k));
      g.addColorStop(1, L.rgba(ACCENT, 0.6 * k));
      c.strokeStyle = g;
      c.lineWidth = 1.5;
      c.beginPath(); c.moveTo(sx, sy); c.lineTo(bx - ux * 14, by - uy * 14); c.stroke();
      c.lineWidth = 2.5;
      c.lineCap = 'round';
      for (let i = 0; i < 4; i++) {
        const f = (gt * 0.9 + i / 4) % 1;
        const px = sx + (bx - sx) * f, py = sy + (by - sy) * f;
        c.strokeStyle = L.rgba(L.mix(COOL, ACCENT, f), k * Math.sin(Math.PI * f) * 0.7);
        c.beginPath(); c.moveTo(px - ux * 18, py - uy * 18); c.lineTo(px, py); c.stroke();
      }
      c.restore();
    }
  }
  // the beacon: a violet point with a breathing glow (the hole itself is sub-pixel at these scales)
  const br = 0.85 + 0.15 * Math.sin(gt * 5);
  L.lightBlob(c, bx, by, 46 * br, ACCENT, 0.45 * k);
  c.save();
  c.fillStyle = L.rgba([240, 230, 255], 0.95 * k);
  c.beginPath(); c.arc(bx, by, Math.max(0, 3.5), 0, TAU); c.fill();
  // closing reticle, only while the beacon is steady (it would strobe while it streaks)
  const h = 0.04;
  const [x0, y0] = beaconAt(camAt(gt - h, TL)), [x1, y1] = beaconAt(camAt(gt + h, TL));
  const ks = 1 - L.smoothstep(L.invLerp(150, 600, Math.hypot(x1 - x0, y1 - y0) / (2 * h)));
  const s = L.lerp(84, 30, L.ease.outCubic(L.prog(gt, b0 + 0.1, 1.3))) + 2 * Math.sin(gt * 3);
  c.translate(bx, by);
  c.strokeStyle = L.rgba(L.mix(ACCENT, [255, 255, 255], 0.3), 0.85 * k * ks);
  c.lineWidth = 2;
  c.lineCap = 'round';
  if (ks > 0.002) for (let i = 0; i < 4; i++) {
    c.rotate(Math.PI / 2);
    c.beginPath(); c.moveTo(s, s - 16); c.lineTo(s, s); c.lineTo(s - 16, s); c.stroke();
  }
  c.restore();
}

const B = beat(8, { chapter: { num: '08', title: 'The twist', sub: 'the Sun can never do this' }, parts: [[s16, 16]] });
const drawBase = B.drawOverlay;
B.drawOverlay = (c, v) => {
  drawBase(c, v);
  c.save();
  courseBeacon(c, v);
  c.restore();
};
export default B;
