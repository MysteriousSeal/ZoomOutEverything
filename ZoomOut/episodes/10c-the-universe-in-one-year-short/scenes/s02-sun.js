// Beat 2 (10c; beat 3 in 10b) — the Sun ignites in early September. While the camera flies from January to September,
// a wash of light fills the days in order (eight months of a universe without our Sun), its bright
// front landing on Sept 2 exactly as the Sun ignites there: bloom, warm sparks, a disc that swells
// in with a slowly turning corona. The sun stays in its cell for the rest of the film.
//
// The "elapsed time" wash is drawn here. 10c cut first life and the microbe months: as the dinosaurs' beat (3) opens and
// the camera flies to December, the front sweeps on from Sept 2 to Christmas Eve in ~1.25 s, then the wash fades.
// Also here (moved from 10b's s05-microbes): the spotlight that dims the months around the focal block
// (January for beat 1, September for beat 2).
import * as L from '../../../../engine/runtime/lib.js';
import { centre, dayOfYear, monthRect } from '../camera.js';
import { ACCENT, ALL_DAYS, HOT, SUNC, dayCell, eventLabel, glowCell, ring, sparks, toScreen } from './s00-hook.js';

const { W, H } = L;
export const SUN_DOY = dayOfYear(4.57e9);          // 244.1 → Sept 2
export const LIFE_DOY = 263.5;                     // Sept 21, per the brief (Sagan; dayOfYear(3.8e9) ≈ 264.5)
export const MICROBE_END = 357.99;                 // through Dec 24 (dinosaurs take over at Christmas)
const CELL = dayCell(SUN_DOY);
const C = centre(CELL);
export const T_SUN = 1.15;                         // beat time of ignition ("…doesn't IGNITE")
const SWEEP = 1.25;                                // 10c: beat-3 seconds for the front to run Sept 3 → Dec 24 (camera travel 1.6)

/** Where the wash front is (fractional day-of-year), as a function of global time. */
export function washFront(v) {
  const sc = v.tl.scenes, gt = v.gt;
  const b2 = sc[2].start, b3 = sc[3].start;
  if (gt < b2) return 0;
  if (gt < b3) return L.lerp(0.5, Math.floor(SUN_DOY) + 1, L.ease.inOutCubic(L.prog(gt - b2, 0.0, T_SUN)));
  return L.lerp(Math.floor(SUN_DOY) + 1, MICROBE_END, L.ease.inOutCubic(L.prog(gt - b3, 0.0, SWEEP)));
}
/** Global fade of the wash once the December story starts (after the sweep has reached Christmas Eve). */
export function washFade(v) {
  const b3 = v.tl.scenes[3].start;
  return 1 - L.ease.inOutCubic(L.prog(v.gt, b3 + 1.0, 1.4));
}

// ------------------------------------------------------------------ spotlight (beats 1–2)
const pad = (r, p = 0.4, top = 1.05) => ({ x: r.x - p, y: r.y - top, w: r.w + 2 * p, h: r.h + top + p });
const SPOT = [null, [pad(monthRect(0)), 2.3], [pad(monthRect(8)), 1.95]];   // [hole, fade-in delay]; both fade out at their beat's end
const DIM = 0.45;
function spotlight(c, v) {
  const b = v.beat;
  if (b < 1 || b > 2) return;
  const [rect, delay] = SPOT[b];
  const t = v.gt - v.tl.scenes[b].start, d = v.tl.scenes[b].end - v.tl.scenes[b].start;
  const kin = L.ease.inOutCubic(L.prog(t, delay, 0.9));
  const kout = 1 - L.ease.inCubic(L.prog(t, d - 0.55, 0.45));
  const k = kin * kout;
  const bk = b === 2 ? k : 0;                       // a calm field under the HUD / chapter card for the lower-framed Sun beat
  if (k <= 0.001) return;
  const s = toScreen(v, rect);
  c.save();
  c.fillStyle = `rgba(5,3,8,${DIM * k})`;
  c.beginPath();
  c.rect(0, 0, W, H);
  c.rect(s.x, s.y, s.w, s.h);                       // the hole (even-odd)
  c.fill('evenodd');
  if (bk > 0.001) {
    const tg = c.createLinearGradient(0, 0, 0, 430);
    tg.addColorStop(0, `rgba(5,3,8,${0.75 * bk})`);
    tg.addColorStop(0.75, `rgba(5,3,8,${0.75 * bk})`);
    tg.addColorStop(1, 'rgba(5,3,8,0)');
    c.fillStyle = tg;
    c.fillRect(0, 0, W, 430);
  }
  c.restore();
}

function drawWash(c, v) {
  const f = washFront(v), fade = washFade(v);
  if (f <= 0 || fade <= 0) return;
  c.save();
  c.globalCompositeOperation = 'lighter';
  const n = Math.min(365, Math.ceil(f));
  const skip = [Math.floor(SUN_DOY), -1];                     // the Sun's cell keeps its own light
  for (let i = 1; i < n; i++) {
    if (i === skip[0] || i === skip[1]) continue;
    const s = toScreen(v, ALL_DAYS[i]);
    if (s.x > W || s.y > H || s.x + s.w < 0 || s.y + s.h < 0) continue;
    const behind = f - i;                       // days behind the front
    const part = L.clamp(behind);               // the front cell fills left to right
    const a = (0.07 + 0.32 * Math.exp(-behind / 4.5)) * fade;
    const p = s.w * 0.03;
    c.fillStyle = L.rgba(ACCENT, a);
    c.fillRect(s.x + p, s.y + p, (s.w - 2 * p) * part, s.h - 2 * p);
    if (behind < 6 && s.w > 6) {
      c.strokeStyle = L.rgba(ACCENT, 0.6 * Math.exp(-behind / 2) * fade);
      c.lineWidth = 1.2;
      c.strokeRect(s.x + p, s.y + p, s.w - 2 * p, s.h - 2 * p);
    }
  }
  c.restore();
}

/** A refined sun: limb-darkened disc, turning corona rays, warm halo. (x, y) centre, s cell px. */
export function sunGlyph(c, x, y, s, k, rot, swell = 1) {
  if (k <= 0 || s < 2) return;
  const R = s * 0.17 * swell;
  c.save();
  L.lightBlob(c, x, y, s * 1.5 * swell, ACCENT, 0.22 * k);
  L.lightBlob(c, x, y, s * 0.85 * swell, SUNC, 0.55 * k);
  c.globalCompositeOperation = 'lighter';
  c.translate(x, y);
  c.rotate(rot);
  if (s > 10) {
    c.lineCap = 'round';
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * Math.PI * 2;
      const r0 = R * 1.35, r1 = R * (i % 2 ? 1.85 : 2.25);
      const g = c.createLinearGradient(Math.cos(a) * r0, Math.sin(a) * r0, Math.cos(a) * r1, Math.sin(a) * r1);
      g.addColorStop(0, L.rgba(SUNC, 0.9 * k));
      g.addColorStop(1, L.rgba(SUNC, 0));
      c.strokeStyle = g;
      c.lineWidth = Math.max(1, s * 0.016);
      c.beginPath(); c.moveTo(Math.cos(a) * r0, Math.sin(a) * r0); c.lineTo(Math.cos(a) * r1, Math.sin(a) * r1); c.stroke();
    }
  }
  c.globalCompositeOperation = 'source-over';
  c.globalAlpha = L.clamp(k * 1.5);
  const dg = c.createRadialGradient(-R * 0.25, -R * 0.25, 0, 0, 0, Math.max(0.01, R));
  dg.addColorStop(0, L.rgba(HOT));
  dg.addColorStop(0.55, L.rgba([255, 214, 140]));
  dg.addColorStop(1, L.rgba([255, 150, 92]));
  c.fillStyle = dg;
  c.beginPath(); c.arc(0, 0, Math.max(0, R), 0, Math.PI * 2); c.fill();
  c.restore();
}

const SCENE = {
  beat: 2,
  chapter: { num: '02', title: 'The Sun', sub: 'Early September' },
  captions: true,
  layer: 3,
  cues(d) {
    return [
      { t: 0.05, name: 'count', gain: 0.22, pitch: 1.1 },
      { t: T_SUN - 0.03, name: 'impact', gain: 0.4, pitch: 1.0 },
      { t: T_SUN, name: 'bloom', gain: 0.5, pitch: 0.85 },
      { t: T_SUN + 0.1, name: 'swell', gain: 0.3, pitch: 1.0 },
      { t: 1.85, name: 'tick', gain: 0.24, pitch: 1.1 },
    ];
  },
  drawWorld(c, v) {
    drawWash(c, v);
    SCENE.sun(c, v);
    spotlight(c, v);
  },
  sun(c, v) {
    const dt = v.t - T_SUN;
    if (dt < 0) return;
    const s = toScreen(v, CELL);
    const cx = s.x + s.w / 2, cy = s.y + s.h / 2;
    if (cx < -s.w * 8 || cx > W + s.w * 8 || cy < -s.w * 8 || cy > H + s.w * 8) return;
    // ignition
    if (dt < 2.4) {
      const fb = Math.exp(-dt / 0.3);
      L.lightBlob(c, cx, cy, s.w * (1.2 + 3.5 * L.ease.outCubic(L.clamp(dt / 1))), SUNC, 0.9 * fb);
      L.lightBlob(c, cx, cy, s.w * 0.9, HOT, Math.exp(-dt / 0.18));
      ring(c, v, C.x, C.y, dt, { reach: 3.2, dur: 1.3, color: SUNC, width: 2, alpha: 0.75 });
      sparks(c, v, C.x, C.y, dt, { n: 90, seed: 303, speed: 3.6, life: 1.3, color: SUNC, width: 2 });
    }
    const k = L.ease.outCubic(L.clamp(dt / 0.45)) * L.lerp(1, 0.75, L.ease.inOutCubic(L.prog(dt, 3, 4)));
    glowCell(c, v, CELL, k, SUNC, 0.8);
    const swell = L.ease.outBack(L.clamp(dt / 0.7), 2.2) * (1 + 0.04 * Math.sin(v.gt * 2.1));
    sunGlyph(c, cx, cy, s.w, k, v.gt * 0.15, swell);
  },
  drawOverlay(c, v) {
    eventLabel(c, v, { big: 'SEPT 2', small: 'The Sun forms  ·  4.6 billion years ago', t0: 1.85 });
  },
};
export default SCENE;
