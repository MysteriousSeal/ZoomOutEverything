// Beat 0 — the hook. The whole year assembles cell by cell in a diagonal wave (the env grid is
// masked with the exact background gradient until each cell's turn), then the headline
// THE UNIVERSE / IN ONE YEAR rises in. At the end a tiny spark wakes up in the Jan 1 cell.
//
// This file also exports the small helper kit shared by beats 0–5 (builder 10A files only).
import * as L from '../../../../engine/runtime/lib.js';
import { DAYS_IN, dayRect, monthRect, YEAR_RECT } from '../camera.js';

const { W, H } = L;

// ------------------------------------------------------------------ shared helpers (beats 0–5)
export const ACCENT = [240, 120, 220];
export const HOT = [255, 236, 250];            // white-hot core
export const SUNC = [255, 196, 120];           // warm sun gold
export const LIFE = [140, 235, 205];           // pale mint: living things
export const MONTH_START = DAYS_IN.reduce((a, n, i) => (a.push(i ? a[i - 1] + DAYS_IN[i - 1] : 0), a), []);

/** Day cell rect for a 0-based day-of-year index. */
export function dayCell(doy) {
  const i = L.clamp(Math.floor(doy), 0, 364);
  let m = 11;
  while (MONTH_START[m] > i) m--;
  return dayRect(m, i - MONTH_START[m]);
}
/** Every day cell of the year, in order (computed once). */
export const ALL_DAYS = Array.from({ length: 365 }, (_, i) => dayCell(i));

/** World rect to screen rect. */
export const toScreen = (v, r) => ({ x: v.wx(r.x), y: v.wy(r.y), w: v.ws(r.w), h: v.ws(r.h) });
export const offScreen = (s, m = 60) => s.x > W + m || s.y > H + m || s.x + s.w < -m || s.y + s.h < -m;

/** Soft glowing cell (accent tint, edge light, halo). a: 0..1 intensity. */
export function glowCell(c, v, r, a, color = ACCENT, halo = 1) {
  if (a <= 0.002) return;
  const s = toScreen(v, r);
  if (offScreen(s, s.w * 2)) return;
  const p = s.w * 0.03;
  c.save();
  c.globalCompositeOperation = 'lighter';
  const g = c.createLinearGradient(s.x, s.y, s.x, s.y + s.h);
  g.addColorStop(0, L.rgba(color, 0.30 * a));
  g.addColorStop(1, L.rgba(color, 0.12 * a));
  c.fillStyle = g;
  c.fillRect(s.x + p, s.y + p, s.w - 2 * p, s.h - 2 * p);
  if (s.w > 5) {
    c.strokeStyle = L.rgba(color, 0.85 * a);
    c.lineWidth = Math.max(1, s.w * 0.018);
    c.strokeRect(s.x + p, s.y + p, s.w - 2 * p, s.h - 2 * p);
  }
  c.restore();
  if (halo > 0) L.lightBlob(c, s.x + s.w / 2, s.y + s.h / 2, s.w * 1.25, color, 0.16 * a * halo);
}

/** Deterministic spark burst in world space: streaks that decelerate and fade. */
export function sparks(c, v, cx, cy, dt, { n = 120, seed = 7, speed = 6, life = 1.4, color = ACCENT, width = 2 } = {}) {
  if (dt < 0 || dt > life * 1.6) return;
  const r = L.rng(seed);
  const drag = 2.6;
  const at = (sp, a, tt) => { const d = (sp * (1 - Math.exp(-drag * tt))) / drag; return [cx + Math.cos(a) * d, cy + Math.sin(a) * d]; };
  c.save();
  c.globalCompositeOperation = 'lighter';
  c.lineCap = 'round';
  for (let i = 0; i < n; i++) {
    const a = r() * Math.PI * 2, sp = speed * (0.25 + r() * r() * 1.1), lf = life * (0.45 + r() * 0.75), hot = r();
    if (dt > lf) continue;
    const k = 1 - dt / lf;
    const [x1, y1] = at(sp, a, dt), [x0, y0] = at(sp, a, Math.max(0, dt - 0.07));
    c.strokeStyle = L.rgba(L.mix(color, HOT, hot * k), 0.9 * k * k);
    c.lineWidth = width * (0.6 + hot * 0.8);
    c.beginPath(); c.moveTo(v.wx(x0), v.wy(y0)); c.lineTo(v.wx(x1) + 0.01, v.wy(y1)); c.stroke();
  }
  c.restore();
}

/** Expanding shock ring in world space. */
export function ring(c, v, cx, cy, dt, { reach = 6, dur = 1.6, color = ACCENT, width = 3, alpha = 0.8 } = {}) {
  if (dt < 0 || dt > dur) return;
  const e = L.ease.outCubic(dt / dur);
  const rad = v.ws(reach * e);
  const a = alpha * (1 - e) * L.clamp(dt * 12);
  c.save();
  c.globalCompositeOperation = 'lighter';
  c.strokeStyle = L.rgba(color, a);
  c.lineWidth = width * (1 + 2 * (1 - e));
  c.beginPath(); c.arc(v.wx(cx), v.wy(cy), Math.max(0, rad), 0, Math.PI * 2); c.stroke();
  c.strokeStyle = L.rgba(HOT, a * 0.6);
  c.lineWidth = 1;
  c.beginPath(); c.arc(v.wx(cx), v.wy(cy), Math.max(0, rad * 0.985), 0, Math.PI * 2); c.stroke();
  c.restore();
}

/** Darkening band behind the top-left event label, so it reads over the grid. */
export function labelScrim(c, k, y0 = 300, y1 = 640) {
  if (k <= 0) return;
  const g = c.createLinearGradient(0, y0, 0, y1);
  g.addColorStop(0, 'rgba(6,4,9,0)');
  g.addColorStop(0.22, `rgba(6,4,9,${0.82 * k})`);
  g.addColorStop(0.8, `rgba(6,4,9,${0.82 * k})`);
  g.addColorStop(1, 'rgba(6,4,9,0)');
  c.fillStyle = g;
  c.fillRect(0, y0, W, y1 - y0);
}

/** House event label (top-left): big date in accent, small context line. */
export function eventLabel(c, v, { big, small, t0, x = 104, y = 502, size = 128, scrim = [300, 640] }) {
  const kin = L.prog(v.t, t0, 0.75);
  const k = Math.min(kin, v.k);
  if (k <= 0) return;
  labelScrim(c, L.ease.outCubic(k), scrim[0], scrim[1]);
  L.bigLabel(c, { x, y, big, small, k, accent: v.accent, size });
}

// ------------------------------------------------------------------ the hook
const CELL_KEY = (() => {
  const max = YEAR_RECT.w + YEAR_RECT.h * 0.75;
  return ALL_DAYS.map((r) => (r.x + r.y * 0.75) / max);
})();
const WAVE0 = -0.42, WAVE = 1.6, FADE = 0.5;          // starts 'early': frame 0 already shows the first diagonal
const revealAt = (t, key) => L.prog(t, WAVE0 + WAVE * key, FADE);

/** The env's background gradient, rebuilt to mask cells that have not appeared yet. */
function bgFill(c) {
  const g = c.createRadialGradient(W / 2, H * 0.45, 40, W / 2, H * 0.5, H * 0.85);
  g.addColorStop(0, '#120c16'); g.addColorStop(1, '#040306');
  return g;
}

export default {
  beat: 0,
  chapter: null,
  captions: false,
  layer: 0,
  cues(d) {
    return [
      { t: 0.05, name: 'shimmer', gain: 0.32, pitch: 0.9 },
      { t: 0.3, name: 'swish', gain: 0.22, pitch: 1.1 },
      { t: 0.78, name: 'impact', gain: 0.32, pitch: 0.75 },
      { t: 2.78, name: 'tick', gain: 0.3, pitch: 1.2 },
      { t: d - 1.2, name: 'riser', gain: 0.26, pitch: 0.9 },
    ];
  },
  drawWorld(c, v) {
    const t = v.t;
    if (v.gt > WAVE0 + WAVE + FADE + 0.05 || t < 0) return;
    // mask the env grid until the diagonal wave reaches each cell
    const fill = bgFill(c);
    c.save();
    for (let i = 0; i < 365; i++) {
      const k = revealAt(t, CELL_KEY[i]);
      if (k >= 1) continue;
      const s = toScreen(v, ALL_DAYS[i]);
      c.globalAlpha = 1 - L.ease.outCubic(k);
      c.fillStyle = fill;
      c.fillRect(s.x - 1, s.y - 1, s.w + 2, s.h + 2);
    }
    for (let m = 0; m < 12; m++) {
      const mr = monthRect(m);
      const k = revealAt(t, CELL_KEY[MONTH_START[m]] - 0.02);
      if (k >= 1) continue;
      c.globalAlpha = 1 - L.ease.outCubic(k);
      c.fillStyle = fill;
      c.fillRect(v.wx(mr.x) - 2, v.wy(mr.y - 0.9), v.ws(7), v.ws(0.85));
    }
    c.restore();
    // the wave front: each cell flashes accent as it arrives
    c.save();
    c.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 365; i++) {
      const k = revealAt(t, CELL_KEY[i]);
      if (k <= 0 || k >= 1) continue;
      const f = Math.sin(Math.PI * k) * (1 - k * 0.4);
      const s = toScreen(v, ALL_DAYS[i]);
      c.fillStyle = L.rgba(ACCENT, 0.42 * f);
      c.fillRect(s.x + 1, s.y + 1, s.w - 2, s.h - 2);
    }
    c.restore();
  },
  drawOverlay(c, v) {
    const t = v.t, d = v.d;
    // a soft dark lens behind the headline keeps it clean over the grid
    const sk = L.enter(t, 0, 0.6) * v.k;
    if (sk > 0) {
      c.save();
      c.translate(W / 2, 930);
      c.scale(1, 0.34);
      const g = c.createRadialGradient(0, 0, 0, 0, 0, 640);
      g.addColorStop(0, `rgba(5,3,8,${0.7 * sk})`);
      g.addColorStop(0.6, `rgba(5,3,8,${0.45 * sk})`);
      g.addColorStop(1, 'rgba(5,3,8,0)');
      c.fillStyle = g;
      c.fillRect(-640, -640, 1280, 1280);
      c.restore();
    }
    const lines = [
      { parts: [['THE UNIVERSE', false]], y: 890, size: 158, t0: 0.04 },
      { parts: [['IN ', false], ['ONE YEAR', true]], y: 1046, size: 158, t0: 0.5 },
    ];
    lines.forEach((ln, i) => {
      const kin = L.enter(t, ln.t0, 0.7, L.ease.outExpo);
      const kout = L.enter(t, d - 0.42 + i * 0.05, 0.32, L.ease.inCubic);
      if (kin <= 0 || kout >= 1) return;
      c.save();
      c.font = L.font(ln.size, 800, L.FONT.display);
      c.letterSpacing = '-1px';
      const widths = ln.parts.map(([s]) => c.measureText(s).width);
      c.letterSpacing = '0px';
      const total = widths.reduce((a, b) => a + b, 0);
      const top = ln.y - ln.size * 0.82, bot = ln.y + ln.size * 0.14;
      c.beginPath(); c.rect(0, top, W, bot - top); c.clip();
      const dy = (1 - kin) * ln.size * 1.0 - kout * ln.size * 1.0;
      let x = W / 2 - total / 2;
      c.textBaseline = 'alphabetic';
      ln.parts.forEach(([s, acc], j) => {
        c.fillStyle = acc ? L.rgba(v.accent) : L.rgba([246, 240, 248]);
        c.shadowColor = acc ? L.rgba(v.accent, 0.45) : 'rgba(0,0,0,0)';
        c.shadowBlur = acc ? 28 : 0;
        L.trackedText(c, s, x, ln.y + dy, -1, 'left');
        x += widths[j];
      });
      c.restore();
      // an accent rule draws under "ONE YEAR" as the narrator says it (outside the clip)
      ln.parts.forEach(([s, acc], j) => {
        if (!acc) return;
        const rk = L.enter(t, 2.72, 0.55, L.ease.outExpo) * (1 - kout);
        if (rk <= 0) return;
        const x0 = W / 2 - total / 2 + widths.slice(0, j).reduce((a, b) => a + b, 0);
        c.fillStyle = L.rgba(v.accent, 0.95);
        c.fillRect(x0 + 4, ln.y + 22, (widths[j] - 12) * rk, 6);
      });
    });
    // one small explainer line
    const sk2 = Math.min(L.enter(t, 1.5, 0.6), 1 - L.enter(t, d - 0.35, 0.3, L.ease.inCubic));
    if (sk2 > 0) {
      c.save();
      c.globalAlpha = sk2;
      c.font = L.font(30, 600, L.FONT.body);
      c.fillStyle = 'rgba(214,204,224,0.92)';
      c.textBaseline = 'alphabetic';
      L.trackedText(c, '13.8 BILLION YEARS  ·  365 DAYS', W / 2, 1128 + (1 - sk2) * 14, 4, 'center');
      c.restore();
    }
  },
};
