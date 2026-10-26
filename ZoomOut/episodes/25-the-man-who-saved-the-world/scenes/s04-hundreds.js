// Beat 4 — "But a real attack would be hundreds of missiles, not five. | And the ground radar sees nothing."
//          (38.36–45.18 with the v4 voice; every time below is derived from the timeline / env.moments)
// Camera 'hundreds': globe r 330 at y 830 (spans y 500–1160); 'radar' pushes in (r 370 at y 800) on phrase 1.
// The real five arcs stay bright red (drawn by s02).
//   Phrase 0: env.GHOSTS (300 deterministic paths) launch in a staggered wave from moments.ghosts (≈ 1.6 s spread,
//     landing on "hundreds") as a pale, cold sheaf of thin trails with tiny heads: what a real first strike looks like.
//     Under the globe, a two-column comparison (legend swatches = the same strokes as on the globe):
//       A REAL ATTACK / HUNDREDS (pale, after the wave starts)   |   DETECTED / 5 (alarm red, on "not five")
//   Phrase 1: the ghosts and the comparison clear (ease-in, 0.3 s); six Soviet ground-radar fans (env.RADARS,
//     radarFan: range capped at 42 % of the way to the pole, so they never knot there) open in a stagger and sweep
//     (phosphor green, range rings, beam with afterglow) and find nothing: GROUND RADAR / NOTHING (phosphor), in the
//     same band. Everything is gone by the beat end (no ghosting into s05).
import * as L from '../../../../engine/runtime/lib.js';
import { ACCENT, COLD, PHOSPHOR, moments, PT, globeView, GHOSTS, traceGhost, ghostPt, RADARS, radarFan, launchState, arcPt } from '../env.js';

const GHOST = [196, 210, 226];
const X0 = 80, X1 = 940;

/** phrase j of line 4, beat-relative seconds */
const ph = (v, j) => v.tl.lines[4].phrases[j].start - v.tl.scenes[4].start;

/** ghost wave: flight fraction of path for ghost g, `t` = seconds since moments.ghosts */
const ghostP = (g, t) => L.ease.outCubic(L.prog(t, g.d * 1.6, 1.5)) * g.fly;
/** seconds since the ghost wave starts, for beat-relative t */
const sinceG = (v) => v.gt - moments(v.tl).ghosts;

function drawRadar(c, f, t, k, i) {
  const len = f.len * L.ease.outCubic(L.clamp(k));
  if (len <= 1) return;
  const a0 = f.ang - f.spread, a1 = f.ang + f.spread;
  c.save();
  c.globalCompositeOperation = 'lighter';
  // the fan: radial phosphor fill
  const g = c.createRadialGradient(f.x, f.y, 0, f.x, f.y, len);
  g.addColorStop(0, L.rgba(PHOSPHOR, 0.2 * k));
  g.addColorStop(0.75, L.rgba(PHOSPHOR, 0.09 * k));
  g.addColorStop(1, L.rgba(PHOSPHOR, 0.0));
  c.fillStyle = g;
  c.beginPath(); c.moveTo(f.x, f.y); c.arc(f.x, f.y, len, a0, a1); c.closePath(); c.fill();
  // range rings (no hard edge lines: overlapping fans stay clean)
  c.lineWidth = 1.2;
  for (const q of [0.5, 1]) {
    c.strokeStyle = L.rgba(PHOSPHOR, (q === 1 ? 0.45 : 0.16) * k);
    c.beginPath(); c.arc(f.x, f.y, Math.max(0, len * q), a0, a1); c.stroke();
  }
  // the sweep: a beam that scans across the fan and back (ping-pong), with an afterglow wedge behind it
  const period = 1.9, ph0 = (t / period + i * 0.37) % 2;
  const s = ph0 < 1 ? L.ease.inOutCubic(ph0) : L.ease.inOutCubic(2 - ph0);
  const dir = ph0 < 1 ? 1 : -1;
  const ab = L.lerp(a0, a1, s);
  const trail = 0.32;
  const at0 = dir > 0 ? Math.max(a0, ab - trail) : ab, at1 = dir > 0 ? ab : Math.min(a1, ab + trail);
  if (at1 > at0) {
    const steps = 8;
    for (let j = 0; j < steps; j++) {
      const u0 = L.lerp(at0, at1, j / steps), u1 = L.lerp(at0, at1, (j + 1) / steps);
      const near = dir > 0 ? (j + 1) / steps : 1 - j / steps;          // brighter next to the beam
      c.fillStyle = L.rgba(PHOSPHOR, 0.13 * k * near * near);
      c.beginPath(); c.moveTo(f.x, f.y); c.arc(f.x, f.y, len, u0, u1); c.closePath(); c.fill();
    }
  }
  c.strokeStyle = L.rgba([190, 255, 215], 0.5 * k);
  c.lineWidth = 1.5;
  c.beginPath(); c.moveTo(f.x, f.y); c.lineTo(f.x + Math.cos(ab) * len, f.y + Math.sin(ab) * len); c.stroke();
  c.restore();
  // the site
  c.save();
  c.globalAlpha = k;
  L.lightBlob(c, f.x, f.y, 18, PHOSPHOR, 0.6);
  c.fillStyle = 'rgb(210,255,225)';
  c.beginPath(); c.arc(f.x, f.y, 3.5, 0, Math.PI * 2); c.fill();
  c.restore();
}

/** a column of the comparison: small caps label + big word + a legend swatch */
function column(c, x, y, small, big, col, k, swatch) {
  if (k <= 0) return;
  const e = L.ease.outCubic(L.clamp(k));
  c.save();
  c.globalAlpha *= L.clamp(k * 1.4);
  c.textBaseline = 'alphabetic';
  c.textAlign = 'left';
  swatch(x, y - 9);
  c.font = L.font(24, 700, L.FONT.body);
  c.fillStyle = L.rgba([205, 215, 225], 0.95);
  c.shadowColor = 'rgba(0,0,0,0.8)'; c.shadowBlur = 10;
  L.trackedText(c, small, x + 58, y, 4, 'left');
  c.font = L.font(big.size, 800, L.FONT.display);
  c.fillStyle = L.rgba(col);
  c.shadowBlur = 18;
  c.fillText(big.text, x - 4, y + 18 + big.size * 0.82 + (1 - e) * 22);
  c.restore();
}

export default {
  beat: 4,
  chapter: null,
  layer: 2,
  cues() {
    return [];   // every cue here is tied to a word: env.cues(tl) from env.moments (ghost wave, radars)
  },
  drawWorld(c, v) {
    if (v.t < -0.1 || v.t > v.d + 0.3) return;
    const view = globeView(v);
    const p1 = ph(v, 1);
    // ---- the ghost first strike
    const gk = 1 - L.ease.inCubic(L.prog(v.t, p1 - 0.25, 0.45));
    const tg = sinceG(v);
    if (gk > 0 && tg > 0) {
      c.save();
      c.lineCap = 'round';
      c.strokeStyle = L.rgba(GHOST, 0.2 * gk);
      c.lineWidth = 1.1;
      c.beginPath();
      for (const g of GHOSTS) {
        const p = ghostP(g, tg);
        if (p > 0.005) traceGhost(c, view, g, Math.max(0, p - 0.35), p);   // trails: the last 35 % of the path
      }
      c.stroke();
      // heads
      c.fillStyle = L.rgba([235, 242, 250], 0.75 * gk);
      for (const g of GHOSTS) {
        const p = ghostP(g, tg);
        if (p <= 0.005) continue;
        const h = ghostPt(view, g, p);
        c.fillRect(h.x - 1.3, h.y - 1.3, 2.6, 2.6);
      }
      c.restore();
    }
    // ---- the real five: marked with red rings while DETECTED: 5 is on screen
    const tB = PT(v.tl, 4, 0, 0.8) - v.tl.scenes[4].start;          // "not five"
    const mk = L.enter(v.t, tB, 0.45, L.ease.outBack) * (1 - L.ease.inCubic(L.prog(v.t, p1 - 0.3, 0.3)));
    if (mk > 0) {
      const st = launchState(v.gt, v.tl);
      c.save();
      c.strokeStyle = L.rgba([255, 110, 90], 0.9);
      c.lineWidth = 2;
      st.forEach((s, i) => {
        if (!s.on || s.p <= 0.01) return;
        const h = arcPt(view, i, s.p);
        c.globalAlpha = L.clamp(mk) * s.alpha;
        c.beginPath(); c.arc(h.x, h.y, Math.max(0, 15 * mk), 0, Math.PI * 2); c.stroke();
      });
      c.restore();
    }
    // ---- the ground radars
    const rk = L.prog(v.t, p1 - 0.1, 0.01) * (1 - L.ease.inCubic(L.prog(v.t, v.d - 0.45, 0.4)));
    if (rk > 0) {
      RADARS.forEach((_, i) => {
        const k = rk * L.prog(v.t, p1 - 0.1 + i * 0.08, 0.6);
        if (k > 0) drawRadar(c, radarFan(view, i), v.t, k, i);
      });
    }
  },
  drawOverlay(c, v) {
    const p1 = ph(v, 1);
    const y = 1214;
    // ---- comparison (phrase 0), out on phrase 1
    const out = 1 - L.ease.inCubic(L.prog(v.t, p1 - 0.3, 0.3));
    const tA = moments(v.tl).ghosts + 0.9 - v.tl.scenes[4].start, tB = PT(v.tl, 4, 0, 0.8) - v.tl.scenes[4].start;
    const kA = v.k * L.enter(v.t, tA, 0.5) * out;
    const kB = v.k * L.enter(v.t, tB, 0.5) * out;
    if (kA > 0 || kB > 0) {
      c.save();
      const mid = 560;
      column(c, X0, y, 'A REAL ATTACK', { text: 'HUNDREDS', size: 92 }, [226, 234, 244], kA, (x, yy) => {
        c.save(); c.strokeStyle = L.rgba(GHOST, 0.85); c.lineWidth = 1.2;
        c.beginPath();
        for (let j = 0; j < 7; j++) { c.moveTo(x + j * 2, yy + 8 - j * 2.2); c.quadraticCurveTo(x + 18 + j * 3, yy - 14 + j, x + 40, yy - 8 + j * 2.6); }
        c.stroke(); c.restore();
      });
      // divider
      if (kB > 0) {
        c.save();
        c.globalAlpha = L.clamp(kB);
        c.fillStyle = L.rgba(COLD, 0.25);
        c.fillRect(mid - 44, y - 26, 1.5, 136 * L.ease.outCubic(L.clamp(kB)));
        c.restore();
      }
      column(c, mid, y, 'DETECTED', { text: '5', size: 92 }, ACCENT, kB, (x, yy) => {
        c.save(); c.strokeStyle = L.rgba(ACCENT); c.lineWidth = 3.5; c.lineCap = 'round';
        c.beginPath(); c.moveTo(x, yy + 6); c.quadraticCurveTo(x + 20, yy - 14, x + 36, yy - 6); c.stroke();
        L.lightBlob(c, x + 37, yy - 6, 12, [255, 140, 110], 0.9);
        c.restore();
      });
      c.restore();
    }
    // ---- ground radar (phrase 1)
    const kR = v.k * L.enter(v.t, PT(v.tl, 4, 1, 0.6) - 0.12 - v.tl.scenes[4].start, 0.45);   // lands on "sees nothing"
    if (kR > 0) {
      column(c, X0, y, 'GROUND RADAR', { text: 'NOTHING', size: 92 }, PHOSPHOR, kR, (x, yy) => {
        c.save(); c.strokeStyle = L.rgba(PHOSPHOR, 0.9); c.fillStyle = L.rgba(PHOSPHOR, 0.22); c.lineWidth = 1.6;
        c.beginPath(); c.moveTo(x + 20, yy + 10); c.arc(x + 20, yy + 10, 30, -Math.PI / 2 - 0.5, -Math.PI / 2 + 0.5); c.closePath(); c.fill(); c.stroke();
        c.restore();
      });
    }
  },
};
