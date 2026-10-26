// Beat 11 — "Each one lives about a hundred and twenty days, | then it's recycled."
// The red cell we watched being born in beat 10 (s10's hero) lifts out of the stream toward the lens while the marrow
// dims behind it. A 120-day timeline fills (DAY 0 → 120) and the cell ages: duller, smaller, stiffer, crenated. On
// "then it's recycled" a macrophage reaches out and engulfs it; its iron sparks drift back to the erythroblastic
// island, where new cells are made (the loop closes).
import * as L from '../../../../engine/runtime/lib.js';
import { ACCENT, P } from '../env.js';
import { ISLAND, births, birthState, drawMacrophage, lx, ly, tex } from './s10-cell-factory.js';

const { W, H } = L;
const UM = 1e-6;
const PP = { u: 20 * UM, w: -19 * UM };      // presentation point (local): ≈ (540, 750) on screen, clear of the sinusoid
const HERO_SC = 4.2;                         // lifted hero ≈ 220 px across (it shrinks a little as it ages)
const LIFT = 1.0, AGE0 = 0.55, AGE1 = 2.95, ENG = 3.45, CRUMB = 4.05;   // beat-relative times

const dayOf = (t) => 120 * L.ease.inOutCubic(L.prog(t, AGE0, AGE1 - AGE0));

/** Hero position (local m), scale and lift amount at beat time t. */
function hero(v) {
  const s = birthState(births(v.tl)[0], v.gt);
  const e = L.ease.inOutCubic(L.prog(v.t, 0.05, LIFT + 0.2));
  const x = L.lerp(s ? s.x : PP.u, PP.u, e), y = L.lerp(s ? s.y : PP.w, PP.w, e);
  const bob = L.noise1(v.gt * 0.6, 3) * 0.6 * UM;
  return { x, y: y + bob * e, sc: L.lerp(1, HERO_SC, e), e };
}

function agedCell(c, v, x, y, r, age, ang) {
  // age 0..1: bright → dull brown-red, biconcave → spherical, smooth → crenated, shrinking a little
  const rr = r * (1 - 0.12 * age);
  const n = 16, amp = rr * 0.11 * Math.pow(age, 1.4);
  c.save();
  c.translate(x, y); c.rotate(ang);
  const squash = L.lerp(0.62 + 0.3 * Math.abs(Math.cos(v.gt * 0.9)), 0.9, age);   // stiffer: tumbles less
  c.scale(1, squash);
  c.beginPath();
  for (let i = 0; i <= 96; i++) {
    const a = (i / 96) * Math.PI * 2;
    const d = rr + amp * Math.pow(Math.max(0, Math.cos(a * n / 2)), 6) * 1.6 - amp * 0.4;
    i ? c.lineTo(Math.cos(a) * d, Math.sin(a) * d) : c.moveTo(Math.cos(a) * d, Math.sin(a) * d);
  }
  c.closePath();
  const bright = L.mix([214, 92, 96], [150, 92, 84], age), mid = L.mix([158, 18, 36], [112, 46, 46], age), rim = L.mix([222, 84, 88], [150, 80, 70], age);
  const g = c.createRadialGradient(-rr * 0.1, -rr * 0.12, 0, 0, 0, rr);
  g.addColorStop(0, L.rgba(L.mix(bright, mid, age * 0.8))); g.addColorStop(0.35, L.rgba(L.mix(bright, mid, 0.4 + age * 0.4)));
  g.addColorStop(0.68, L.rgba(mid)); g.addColorStop(0.92, L.rgba(rim)); g.addColorStop(1, L.rgba(mid));
  c.fillStyle = g; c.fill();
  c.lineWidth = Math.max(1, rr * 0.03); c.strokeStyle = L.rgba(L.mix([255, 170, 160], [200, 150, 130], age), 0.55); c.stroke();
  c.globalCompositeOperation = 'lighter';
  c.strokeStyle = `rgba(255,200,190,${0.28 * (1 - age * 0.6)})`; c.lineWidth = rr * 0.07;
  c.beginPath(); c.arc(0, 0, Math.max(0, rr * 0.82), Math.PI * 1.05, Math.PI * 1.6); c.stroke();
  c.restore();
}

export default {
  beat: 11,
  chapter: { num: '11', title: 'Lifespan', sub: 'then recycled by macrophages' },
  captions: true,
  layer: 5,
  cues() {
    return [
      { t: 0.2, name: 'swish', gain: 0.16, pitch: 0.8 },
      { t: AGE0, name: 'count', gain: 0.24, pitch: 1.0 },
      { t: AGE1, name: 'tick', gain: 0.3, pitch: 0.9 },
      { t: ENG - 0.45, name: 'swish', gain: 0.2, pitch: 0.6 },
      { t: ENG + 0.35, name: 'bubbles', gain: 0.24, pitch: 0.7 },
      { t: CRUMB, name: 'shimmer', gain: 0.2, pitch: 1.2 },
    ];
  },
  drawWorld(c, v) {
    if (v.t < 0 || v.t > v.d + 1.5 || v.cam.mpp > 1.2e-6) return;
    const T = tex();
    // dim the marrow behind the hero (focus pull), restored before the pull-out
    const kd = L.ease.inOutCubic(L.prog(v.t, 0.3, 0.9)) * (1 - L.ease.inOutCubic(L.prog(v.t, v.d - 0.7, 0.8)));
    if (kd > 0) {
      c.save();
      c.fillStyle = `rgba(16,2,8,${0.68 * kd})`; c.fillRect(0, 0, W, H);
      c.restore();
    }
    const h = hero(v);
    const x = lx(v, h.x), y = ly(v, h.y), r = v.ws(3.9 * UM) * h.sc;
    const age = dayOf(v.t) / 120;
    // the hero (until it is digested)
    const gone = L.ease.inCubic(L.prog(v.t, ENG + 0.3, CRUMB - ENG - 0.1));
    if (gone < 1) {
      c.save();
      c.globalAlpha = 1 - gone;
      L.lightBlob(c, x, y, r * 2.6, ACCENT, 0.16 * h.e * (1 - age));
      // contact shadow on the plane behind (it is lifted toward us)
      c.fillStyle = `rgba(10,0,4,${0.35 * h.e})`;
      c.beginPath(); c.ellipse(x + r * 0.25, y + r * 0.45, Math.max(0, r * 1.05), Math.max(0, r * 0.7), 0, 0, Math.PI * 2); c.fill();
      agedCell(c, v, x, y, r * (1 - 0.25 * gone), age, 0.5 + v.gt * 0.25 * (1 - age));
      c.restore();
    }
    // the macrophage: slides in from the upper right (tissue side, above the vessel wall), reaches with a pseudopod,
    // closes around the cell
    const km = L.ease.outCubic(L.prog(v.t, ENG - 0.6, 0.5)) * (1 - L.ease.inCubic(L.prog(v.t, v.d - 0.3, 0.8)));
    if (km > 0) {
      const app = L.ease.inOutCubic(L.prog(v.t, ENG - 0.6, 1.1));
      const mx = L.lerp(h.x + 62 * UM, h.x + 4 * UM, app), my = L.lerp(h.y - 10 * UM, h.y - 2 * UM, app);
      const MX = lx(v, mx), MY = ly(v, my), MR = r * 1.45;
      const ang = Math.atan2(y - MY, x - MX);
      const reach = { ang, len: Math.max(0, Math.hypot(x - MX, y - MY) - MR * 0.6) * (1 - app * 0.8) };
      drawMacrophage(c, v, MX, MY, MR, km * 0.95, 11, reach);
    }
    // iron sparks drift back to the island (recycled into new cells)
    if (v.t > CRUMB - 0.2) {
      const q = L.rng(1111);
      c.save();
      c.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 16; i++) {
        const d0 = q() * 0.5, p = L.prog(v.t, CRUMB - 0.2 + d0, 1.5 + q() * 0.4);
        if (p <= 0 || p >= 1) continue;
        const e = L.ease.inOutCubic(p);
        const sx0 = h.x + (q() - 0.5) * 8 * UM, sy0 = h.y + (q() - 0.5) * 8 * UM;
        const cx = L.lerp(sx0, ISLAND.u + (q() - 0.5) * 16 * UM, e) + Math.sin(p * 3 + i) * 3 * UM * (1 - e);
        const cy = L.lerp(sy0, ISLAND.w + (q() - 0.5) * 16 * UM, e) - Math.sin(p * Math.PI) * 10 * UM;
        const a = Math.sin(Math.PI * p);
        L.lightBlob(c, lx(v, cx), ly(v, cy), v.ws(2.6 * UM), [255, 196, 110], 0.7 * a);
        c.fillStyle = `rgba(255,236,190,${0.9 * a})`;
        c.beginPath(); c.arc(lx(v, cx), ly(v, cy), Math.max(0, v.ws(0.45 * UM)), 0, Math.PI * 2); c.fill();
      }
      c.restore();
    }
    void P; void T;
  },
  drawOverlay(c, v) {
    const k = v.k * L.ease.outCubic(L.prog(v.t, AGE0 - 0.15, 0.45));
    if (k <= 0) return;
    const day = Math.round(dayOf(v.t));
    // backing for legibility over the dimmed marrow
    c.save();
    c.globalAlpha = L.clamp(k * 1.3);
    c.translate(540, 450); c.scale(1, 0.45);
    const g = c.createRadialGradient(0, 0, 20, 0, 0, 540);
    g.addColorStop(0, 'rgba(14,2,6,0.55)'); g.addColorStop(1, 'rgba(14,2,6,0)');
    c.fillStyle = g; c.fillRect(-540, -560, W, 1120);
    c.restore();
    const recycled = L.prog(v.t, ENG - 0.05, 0.3);
    L.bigLabel(c, { x: 540, y: 440, big: `${day} DAYS`, small: '', k, accent: ACCENT, align: 'center', size: 110 });
    // small line: "a red cell's life" → "then recycled" (cross-fade)
    c.save();
    c.font = L.font(30, 600, L.FONT.body);
    c.shadowColor = 'rgba(0,0,0,0.55)'; c.shadowBlur = 8;
    c.globalAlpha = k * (1 - recycled);
    c.fillStyle = L.rgba([205, 215, 230], 0.95);
    L.trackedText(c, "A RED CELL'S LIFE", 540, 492, 3, 'center');
    c.globalAlpha = k * recycled;
    c.fillStyle = L.rgba([255, 214, 160], 0.95);
    L.trackedText(c, 'THEN RECYCLED', 540, 492 + (1 - L.ease.outCubic(recycled)) * 12, 3, 'center');
    c.restore();
    // the 120-day track
    const x0 = 250, x1 = 830, ty = 548, f = dayOf(v.t) / 120;
    const kt = k * L.ease.outCubic(L.prog(v.t, AGE0, 0.5));
    c.save();
    c.globalAlpha = kt;
    c.fillStyle = 'rgba(235,230,222,0.22)'; c.fillRect(x0, ty - 1.5, (x1 - x0) * L.ease.outCubic(L.prog(v.t, AGE0, 0.6)), 3);
    for (let i = 0; i <= 4; i++) {
      const tx = L.lerp(x0, x1, i / 4);
      c.fillStyle = i / 4 <= f + 1e-6 ? L.rgba(ACCENT, 0.95) : 'rgba(235,230,222,0.4)';
      c.fillRect(tx - 1, ty - (i % 4 === 0 ? 10 : 6), 2, i % 4 === 0 ? 20 : 12);
    }
    c.fillStyle = L.rgba(ACCENT); c.fillRect(x0, ty - 2, (x1 - x0) * f, 4);
    const hx = L.lerp(x0, x1, f);
    L.lightBlob(c, hx, ty, 26, ACCENT, 0.6);
    c.fillStyle = '#fff'; c.beginPath(); c.arc(hx, ty, 6, 0, Math.PI * 2); c.fill();
    c.restore();
  },
};
