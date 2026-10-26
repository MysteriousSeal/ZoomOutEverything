// Beat 6 — "One theory: each of the Moon's four phases lasts a little over seven days."
// Back at the Moon's orbit (env moves the Moon: new moon, then four quarter steps on moonStepTimes). The orbit is a
// hairline cut into four quarters by gold ticks. As the Moon steps through each quarter, that arc lights gold behind
// it and a "7.4 days" chip lands at the arc's middle; a phase icon (as seen from the Earth) lights at each quarter
// point: new, first quarter, full, last quarter. The fourth step closes the ring (a soft pulse = 29.5 days).
// A small "ONE THEORY" tag frames it as a hypothesis.
import * as L from '../../../../engine/runtime/lib.js';
import { ACCENT, EARTH, MOON_ORBIT, SUN, moonAngle, moonStepTimes } from '../env.js';

const TL = ((t) => (t.preroll ? { ...t, scenes: t.scenes.slice(1), lines: t.lines.slice(1) } : t))(await (await fetch(new URL('../build/timeline.json', import.meta.url))).json());   // 19b: the MAIN timeline (preroll line dropped, as main.js does)
const B = 6;
const T0 = TL.scenes[B].start;
const STEPS = moonStepTimes(TL).map((g) => g - T0);   // beat-relative step starts (each lasts 0.6 s)
const STEP_D = 0.6;
const A_NEW = Math.atan2(SUN.y - EARTH.y, SUN.x - EARTH.x);
const QA = (q) => A_NEW + q * Math.PI / 2;
const TAU = Math.PI * 2;
const T_TAG = 0.35, T_RING = 0.7, T_LABEL = STEPS[0] + 0.75;
const PHASE = ['NEW', 'FIRST QUARTER', 'FULL', 'LAST QUARTER'];

/** Moon phase icon as seen from the Earth. f: 0 new, 0.25 first quarter (right lit), 0.5 full, 0.75 last quarter. */
export function drawPhase(c, x, y, r, f, k = 1) {
  if (k <= 0 || r <= 0) return;
  c.save();
  c.globalAlpha *= k;
  // dark disc + earthshine rim
  c.beginPath(); c.arc(x, y, Math.max(0, r), 0, TAU);
  c.fillStyle = '#15181f'; c.fill();
  c.strokeStyle = 'rgba(200,205,215,0.28)'; c.lineWidth = 1.2; c.stroke();
  f = ((f % 1) + 1) % 1;
  const right = f <= 0.5;
  const g = right ? f : 1 - f;                      // 0..0.5
  const rx = r * Math.cos(g * TAU);                 // terminator half-width (+: crescent, −: gibbous)
  if (g > 0.002) {
    const sgn = right ? 1 : -1;
    c.beginPath();
    const N = 36;
    for (let i = 0; i <= N; i++) { const s = -Math.PI / 2 + Math.PI * i / N; c.lineTo(x + sgn * r * Math.cos(s), y + r * Math.sin(s)); }
    for (let i = 0; i <= N; i++) { const s = Math.PI / 2 - Math.PI * i / N; c.lineTo(x + sgn * rx * Math.cos(s), y + r * Math.sin(s)); }
    c.closePath();
    const lg = c.createRadialGradient(x - r * 0.25, y - r * 0.3, r * 0.1, x, y, r * 1.1);
    lg.addColorStop(0, '#f4f1ea'); lg.addColorStop(1, '#b9b5ab');
    c.fillStyle = lg; c.fill();
    // maria
    c.save(); c.clip();
    c.fillStyle = 'rgba(80,82,90,0.22)';
    for (const [mx, my, mr] of [[-0.3, -0.25, 0.28], [0.18, -0.12, 0.22], [0.05, 0.3, 0.18], [-0.35, 0.22, 0.13]]) {
      c.beginPath(); c.arc(x + mx * r, y + my * r, Math.max(0, mr * r), 0, TAU); c.fill();
    }
    c.restore();
  }
  c.restore();
}

/** Arc progress 0..1 of quarter q at beat time t (0 before its step starts, 1 once the Moon arrived). */
const qProg = (q, t) => L.ease.inOutCubic(L.prog(t, STEPS[q], STEP_D));

export default {
  beat: B,
  chapter: { num: '06', title: 'Moon phases', sub: 'One theory' },
  captions: true,
  layer: 0,
  cues(d) {
    const out = [
      { t: T_TAG, name: 'tick', gain: 0.18, pitch: 1.4 },
      { t: T_RING, name: 'swish', gain: 0.14, pitch: 1.2 },
      { t: T_LABEL + 0.05, name: 'ping', gain: 0.2, pitch: 1.0 },
    ];
    STEPS.forEach((s, q) => {
      out.push({ t: s, name: 'swish', gain: 0.1, pitch: 1.3 + q * 0.05 });
      out.push({ t: s + STEP_D, name: 'blip', gain: 0.2, pitch: 1.0 + q * 0.12 });
    });
    out.push({ t: STEPS[3] + STEP_D + 0.05, name: 'shimmer', gain: 0.18, pitch: 1.0 });
    return out;
  },
  drawOverlay(c, v) {
    const t = v.t, k = v.k;
    if (k <= 0.001) return;
    const cx = v.wx(EARTH.x), cy = v.wy(EARTH.y), R = v.ws(MOON_ORBIT);
    if (R < 30) return;
    c.save();
    c.lineCap = 'round';
    c.globalAlpha = k;

    // ---------- orbit hairline (draws round from new moon as the camera lands)
    const kr = L.ease.inOutCubic(L.prog(t, T_RING, 0.9));
    if (kr > 0) {
      c.strokeStyle = 'rgba(205,212,225,0.32)'; c.lineWidth = 1.4;
      c.beginPath(); c.arc(cx, cy, Math.max(0, R), A_NEW, A_NEW + TAU * kr); c.stroke();
      // quarter ticks
      for (let q = 0; q < 4; q++) {
        const kt = L.ease.outBack(L.prog(t, T_RING + 0.25 + q * 0.12, 0.4), 2);
        if (kt <= 0) continue;
        const a = QA(q), len = 15 * kt;
        c.strokeStyle = L.rgba(ACCENT, 0.9); c.lineWidth = 2.5;
        c.beginPath();
        c.moveTo(cx + Math.cos(a) * (R - len), cy + Math.sin(a) * (R - len));
        c.lineTo(cx + Math.cos(a) * (R + len), cy + Math.sin(a) * (R + len));
        c.stroke();
      }
    }

    // ---------- lit quarter arcs + 7.4-day chips
    const full = L.ease.outCubic(L.prog(t, STEPS[3] + STEP_D, 0.9));
    for (let q = 0; q < 4; q++) {
      const p = qProg(q, t);
      if (p <= 0) continue;
      const current = t < STEPS[q] + STEP_D + 0.5;
      const a0 = QA(q), a1 = QA(q) + (Math.PI / 2) * p;
      L.glow(c, ACCENT, current ? 14 : 6, () => {
        c.strokeStyle = L.rgba(ACCENT, current ? 0.95 : 0.6);
        c.lineWidth = current ? 4 : 3;
        c.beginPath(); c.arc(cx, cy, Math.max(0, R), a0 + 0.04, Math.max(a0 + 0.04, a1 - 0.02)); c.stroke();
      });
      // chip at the arc's middle, inside the ring
      const kc = L.ease.outBack(L.prog(t, STEPS[q] + STEP_D - 0.05, 0.45), 1.8);
      if (kc > 0) {
        const am = QA(q) + Math.PI / 4, rr = R - 66;
        const x = cx + Math.cos(am) * rr, y = cy + Math.sin(am) * rr;
        const latest = q === 3 ? 1 : 1 - L.prog(t, STEPS[q + 1] + 0.2, 0.4);
        const a = L.clamp(kc) * L.lerp(0.35, 1, latest);
        c.save();
        c.translate(x, y); c.scale(L.lerp(0.7, 1, kc), L.lerp(0.7, 1, kc));
        c.shadowColor = 'rgba(2,4,12,0.9)'; c.shadowBlur = 10;
        c.textAlign = 'center'; c.textBaseline = 'alphabetic';
        c.font = L.font(36, 700, L.FONT.din);
        c.fillStyle = L.rgba(ACCENT, a);
        c.fillText('7.4', 0, 12);
        c.restore();
      }
    }

    // ---------- phase icons at the quarter points (inside the ring)
    for (let q = 0; q < 4; q++) {
      const tOn = q === 0 ? 0.9 : STEPS[q - 1] + STEP_D - 0.1;
      const ki = L.ease.outBack(L.prog(t, tOn, 0.45), 1.6);
      if (ki <= 0) continue;
      const a = QA(q), rr = R - 70;
      const x = cx + Math.cos(a) * rr, y = cy + Math.sin(a) * rr;
      // the Moon is "here" now: highlight ring
      const here = q === 0 ? (t < STEPS[0] + 0.1 ? 1 : 0) + L.prog(t, STEPS[3] + STEP_D - 0.1, 0.3) * (1 - L.prog(t, STEPS[3] + STEP_D + 0.9, 0.5))
        : L.prog(t, STEPS[q - 1] + STEP_D - 0.1, 0.25) * (1 - L.prog(t, STEPS[q] + 0.1, 0.3));
      const rad = 25 * Math.max(0, ki);
      if (here > 0) {
        c.strokeStyle = L.rgba(ACCENT, 0.85 * L.clamp(here)); c.lineWidth = 2;
        c.beginPath(); c.arc(x, y, Math.max(0, rad + 7), 0, TAU); c.stroke();
      }
      drawPhase(c, x, y, rad, q * 0.25, L.clamp(ki) * L.lerp(0.75, 1, L.clamp(here)));
      // phase name (tiny), on the Earth side of the icon
      c.save();
      c.shadowColor = 'rgba(2,4,12,0.9)'; c.shadowBlur = 8;
      c.font = L.font(14, 700, L.FONT.body);
      // only the phase the Moon is at (or arriving at) keeps its name; the others fade so the eye stays on the arc
      const kn = L.clamp(ki) * (1 - L.prog(t, (q === 3 ? STEPS[3] + STEP_D + 0.4 : STEPS[q] + 0.3), 0.4));
      c.fillStyle = L.rgba([205, 212, 225], 0.8 * kn);
      c.textBaseline = 'middle';
      const nx = x + (Math.sin(a) > 0 ? 0 : Math.sign(Math.cos(a)) * 22);
      L.trackedText(c, PHASE[q], nx, y + (Math.sin(a) > 0 ? -rad - 18 : rad + 18), 2, 'center');
      c.restore();
    }

    // ---------- the ring closes: one soft pulse round the whole orbit (29.5 days)
    if (full > 0 && full < 1) {
      c.strokeStyle = L.rgba(ACCENT, 0.5 * (1 - full)); c.lineWidth = 2 + 10 * full;
      c.beginPath(); c.arc(cx, cy, Math.max(0, R + 18 * full), 0, TAU); c.stroke();
    }

    // ---------- "ONE THEORY" tag + label
    const kt = L.enter(t, T_TAG, 0.45);
    if (kt > 0) {
      c.save();
      c.globalAlpha = k * kt;
      const y = 362;
      c.font = L.font(19, 700, L.FONT.body);
      c.letterSpacing = '4px';
      const w = c.measureText('ONE THEORY').width + 28;
      c.letterSpacing = '0px';
      const x = 540 - w / 2;
      c.fillStyle = 'rgba(4,6,14,0.55)';
      L.roundRect(c, x, y - 17, w * L.ease.outCubic(kt), 34, 17); c.fill();
      c.strokeStyle = L.rgba(ACCENT, 0.8); c.lineWidth = 1.5;
      L.roundRect(c, x, y - 17, w * L.ease.outCubic(kt), 34, 17); c.stroke();
      c.fillStyle = L.rgba(ACCENT);
      c.textBaseline = 'middle';
      if (kt > 0.4) L.trackedText(c, 'ONE THEORY', x + 15, y + 1, 4);
      c.restore();
    }
    // the label sits inside the ring, above the Earth (the ring is the diagram; the number is its centre)
    const lx = cx, ly = Math.min(cy - 150, 650);
    L.bigLabel(c, { x: lx, y: ly, big: '≈ 7.4 DAYS', small: '29.5 ÷ 4, per phase', k: k * L.enter(t, T_LABEL, 0.55), accent: ACCENT, align: 'center', size: 70 });
    c.restore();
  },
};
