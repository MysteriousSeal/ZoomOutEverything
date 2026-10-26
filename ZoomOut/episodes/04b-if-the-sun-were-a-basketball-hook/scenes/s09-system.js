// Beat 9 — "That's the whole solar system: a basketball, a few crumbs, and a lot of nothing."
// The insets have closed; the camera eases back to frame the whole town-sized system. A dimension draws across
// Neptune's orbit ("1.6 km"). On "a basketball" the Sun sends out a soft pulse; on "a few crumbs" every planet
// lights up in turn, inner to outer, as a tiny glowing crumb. On "a lot of nothing" the measurement retracts, the
// town dims away around the rings, and the words A LOT OF NOTHING settle into the empty sky above the system.
import * as L from '../../../../engine/runtime/lib.js';
import { PLANETS, pos } from '../camera.js';
import { ACCENT, globeK } from '../env.js';
import { bodyMarker, voClock } from './s08-icegiants.js';

const TAU = Math.PI * 2;
const R_NEP = PLANETS.neptune[0];

// timing (seconds from this beat's start), authored against the first VO: phrase 0 0.150–1.708 · phrase 1
// 2.308–5.182, word starts in phrase 1: basketball 2.43 · few 3.23 · crumbs 3.44 · and 3.93 · lot 4.26 · nothing 4.64.
// voClock re-maps each time into its phrase of the live timeline, so the cues follow a regenerated VO.
const at = voClock(10, [[0.15, 1.708], [2.308, 5.182]]);
const T = {
  dim: at(0.45, 0), dimLabel: at(0.85, 0),
  sun: at(2.4, 1), crumbs: at(3.2, 1), dimOut: at(3.85, 1), dark: at(3.95, 1), words: at(4.08, 1),
};

const ORDER = ['mercury', 'venus', 'earth', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune'];
const COLORS = {
  mercury: [200, 195, 190], venus: [255, 226, 170], earth: [120, 175, 255], mars: [235, 120, 80],
  jupiter: [235, 200, 160], saturn: [240, 215, 150], uranus: [150, 225, 235], neptune: [110, 150, 255],
};

// ---------------------------------------------------------------- the dimension across Neptune's orbit
function drawDimension(ctx, v) {
  const kin = L.prog(v.t, T.dim, 0.85);
  const kout = L.ease.inCubic(L.prog(v.t, T.dimOut, 0.35));
  if (kin <= 0 || kout >= 1) return;
  const e = L.ease.inOutCubic(kin);
  const cx = v.wx(0), cy = v.wy(0);
  const x0 = v.wx(-R_NEP), x1 = v.wx(R_NEP);
  const y = v.wy(-R_NEP) - 42;
  const a = 1 - kout;
  ctx.save();
  ctx.globalAlpha *= a;
  // extension lines from the orbit's extremes up to the dimension line (dashed, faint)
  const ke = L.ease.outCubic(L.prog(v.t, T.dim + 0.45, 0.5));
  ctx.strokeStyle = 'rgba(255,236,214,0.35)';
  ctx.lineWidth = 1.4;
  ctx.setLineDash([4, 6]);
  for (const x of [x0, x1]) {
    ctx.beginPath(); ctx.moveTo(x, y - 12); ctx.lineTo(x, L.lerp(y - 12, cy, ke)); ctx.stroke();
  }
  ctx.setLineDash([]);
  // the main line grows out from the centre
  const hx = (x1 - x0) / 2 * e;
  ctx.strokeStyle = L.rgba(ACCENT, 0.95);
  ctx.lineWidth = 2.6;
  ctx.beginPath(); ctx.moveTo(cx - hx, y); ctx.lineTo(cx + hx, y); ctx.stroke();
  // end ticks + arrowheads (drawn, not glyphs)
  if (e > 0.97) {
    const k2 = L.ease.outBack(L.prog(v.t, T.dim + 0.8, 0.3));
    for (const [x, s] of [[x0, 1], [x1, -1]]) {
      ctx.beginPath(); ctx.moveTo(x, y - 14 * k2); ctx.lineTo(x, y + 14 * k2); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(x + s * 16 * k2, y - 7 * k2); ctx.lineTo(x + 2 * s, y); ctx.lineTo(x + s * 16 * k2, y + 7 * k2); ctx.stroke();
    }
  }
  // the label sits above the line
  const kl = L.prog(v.t, T.dimLabel, 0.6);
  if (kl > 0) {
    const le = L.ease.outCubic(kl);
    ctx.globalAlpha *= L.clamp(kl * 1.5);
    ctx.textBaseline = 'alphabetic';
    ctx.shadowColor = 'rgba(0,0,0,0.6)';
    ctx.shadowBlur = 16;
    // clear a gap in the line behind the number
    ctx.font = L.font(96, 800, L.FONT.display);
    ctx.fillStyle = L.rgba(ACCENT);
    L.trackedText(ctx, '1.6 km', cx, y - 60 + (1 - le) * 24, -1, 'center');
    ctx.shadowBlur = 8;
    ctx.font = L.font(23, 600, L.FONT.body);
    ctx.fillStyle = 'rgba(210,214,224,0.92)';
    L.trackedText(ctx, 'ABOUT ONE MILE, EDGE TO EDGE', cx, y - 26 + (1 - le) * 12, 3, 'center');
  }
  ctx.restore();
}

// ---------------------------------------------------------------- the basketball pulse + the crumbs
function drawSunPulse(ctx, v) {
  const x = v.wx(0), y = v.wy(0);
  for (const [dt, a] of [[0, 1], [0.22, 0.6]]) {
    const k = L.prog(v.t, T.sun + dt, 1.1);
    if (k <= 0 || k >= 1) continue;
    const e = L.ease.outCubic(k);
    ctx.save();
    ctx.strokeStyle = L.rgba(ACCENT, 0.8 * a * (1 - k) ** 1.5);
    ctx.lineWidth = 2.4 * (1 - k) + 0.6;
    ctx.beginPath(); ctx.arc(x, y, Math.max(0, 8 + 80 * e), 0, TAU); ctx.stroke();
    ctx.restore();
  }
  const kb = L.prog(v.t, T.sun, 1.2);
  if (kb > 0 && kb < 1) L.lightBlob(ctx, x, y, 70, ACCENT, 0.55 * Math.sin(Math.PI * kb) ** 0.7);
}

function drawCrumbs(ctx, v) {
  const settle = L.ease.inOutCubic(L.prog(v.t, T.dark, 1.0));
  ORDER.forEach((n, i) => {
    const tc = T.crumbs + i * 0.085;
    const p = pos(n);
    const x = v.wx(p.x), y = v.wy(p.y);
    const k = L.prog(v.t, tc, 0.9);
    // persistent crumb from its ping on (it brightens a little as the town goes dark)
    const a = L.ease.outCubic(L.prog(v.t, tc, 0.25));
    if (a > 0) {
      bodyMarker(ctx, v, p, COLORS[n], a * L.lerp(0.75, 1, settle), 2.2);
    }
    if (k > 0 && k < 1) {
      // pings scale with the crumb's distance from the Sun so the inner four stay distinct crumbs instead of
      // stacking into one blob on the Sun's glow
      const dist = Math.hypot(x - v.wx(0), y - v.wy(0));
      const room = L.clamp(L.invLerp(10, 70, dist));
      const e = L.ease.outCubic(k);
      const rMax = Math.min(22, 0.5 * dist);
      L.lightBlob(ctx, x, y, Math.min(16 + 22 * e, 4 + rMax), COLORS[n], L.lerp(0.35, 0.85, room) * (1 - k) ** 2);
      ctx.save();
      ctx.strokeStyle = L.rgba(COLORS[n], L.lerp(0.55, 0.75, room) * (1 - k) ** 1.5);
      ctx.lineWidth = L.lerp(1.1, 1.6, room);
      ctx.beginPath(); ctx.arc(x, y, Math.max(0, 3 + rMax * e), 0, TAU); ctx.stroke();
      ctx.restore();
    }
  });
}

// ---------------------------------------------------------------- "a lot of nothing"
function drawNothing(ctx, v) {
  const k1 = L.prog(v.t, T.words, 0.6);
  if (k1 <= 0) return;
  const k2 = L.prog(v.t, T.words + 0.22, 0.9);
  const cx = v.wx(0);
  const y = v.wy(-R_NEP) - 52;
  // its own soft exit (~0.45 s) ahead of the beat-end overlay cut, so it doesn't pop out in 3 frames
  const out = 1 - L.smoothstep(L.prog(v.t, v.d - 0.22, 0.45));
  if (out <= 0) return;
  ctx.save();
  const base = ctx.globalAlpha * out;
  ctx.textBaseline = 'alphabetic';
  ctx.shadowColor = 'rgba(0,0,0,0.6)';
  ctx.shadowBlur = 14;
  // small lead-in line
  const e1 = L.ease.outCubic(k1);
  ctx.globalAlpha = base * L.clamp(k1 * 1.5);
  ctx.font = L.font(26, 600, L.FONT.body);
  ctx.fillStyle = 'rgba(205,212,225,0.9)';
  L.trackedText(ctx, 'A LOT OF', cx, y - 104 + (1 - e1) * 14, 8, 'center');
  // the word, slowly opening its tracking (breathing room made visible)
  const e2 = L.ease.outCubic(k2);
  const track = L.lerp(4, 18, e2) + 6 * L.ease.inOutCubic(L.prog(v.t, T.words + 1.1, 2.0));
  ctx.globalAlpha = base * L.clamp(k2 * 1.4);
  ctx.font = L.font(104, 600, L.FONT.display);
  ctx.fillStyle = 'rgba(242,238,232,0.96)';
  L.trackedText(ctx, 'NOTHING', cx, y + (1 - e2) * 18, track, 'center');
  ctx.restore();
}

export default {
  beat: 10,
  chapter: { num: '09', title: 'The whole system', sub: "Neptune's orbit, edge to edge" },
  captions: true,
  layer: -1,      // drawWorld runs before the other scenes so the dimming sits under every ring and the Sun
  cues(d) {
    return [
      { t: T.dim, name: 'swell', gain: 0.22, pitch: 0.9 },
      { t: T.dim + 0.8, name: 'tick', gain: 0.3, pitch: 1.1 },
      { t: T.dimLabel, name: 'count', gain: 0.26, pitch: 0.8 },
      { t: T.sun, name: 'bloom', gain: 0.3, pitch: 0.9 },
      ...ORDER.map((n, i) => ({ t: T.crumbs + i * 0.085, name: 'tick', gain: 0.12 + 0.02 * i, pitch: 1.9 - i * 0.12 })),
      { t: T.dimOut, name: 'swish', gain: 0.14, pitch: 0.8 },
      { t: T.dark, name: 'deep', gain: 0.32, pitch: 0.6 },
    ];
  },
  drawWorld(ctx, v) {
    // the town dims away ("a lot of nothing"), handing over cleanly to the globe in beat 10
    const k = L.ease.inOutCubic(L.prog(v.t, T.dark, 1.2)) * (1 - globeK(v)) * (1 - L.ease.inOutCubic(L.prog(v.t, v.d + 0.2, 1.4)));
    if (k <= 0.001) return;
    const g = ctx.createRadialGradient(v.wx(0), v.wy(0), v.ws(R_NEP) * 0.2, v.wx(0), v.wy(0), L.H * 0.75);
    g.addColorStop(0, `rgba(3,4,8,${0.55 * k})`);
    g.addColorStop(1, `rgba(3,4,8,${0.82 * k})`);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, L.W, L.H);
  },
  drawOverlay(ctx, v) {
    const k = L.clamp(v.k * 1.2);
    if (k <= 0) return;
    ctx.globalAlpha = k;
    drawDimension(ctx, v);
    drawSunPulse(ctx, v);
    drawCrumbs(ctx, v);
    drawNothing(ctx, v);
  },
};
