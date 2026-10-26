// Beat 5 — "They constantly broadcast where they are, | and the exact time."
// Satellite B rises in frame and its L-band array starts to transmit: green rings fall from the antenna inside the
// real beam (±21° around the nadir, aimed at the Earth's centre), each carrying a dashed "bit" band. A telemetry
// strip below decodes what every ring carries: POSITION (B's real orbit fix) on "where they are", then TIME with
// the nanosecond digits rolling on "the exact time".
//
// SHARED: ringsAt(v) / drawRings(ctx, v) — the broadcast keeps falling through beat 6's pull-back to the planet
// (s06 uses ringsAt for the phone's receive pulses); it stops at the start of beat 7 (one pulse).
import * as L from '../../../../engine/runtime/lib.js';
import { ACCENT, CLOCK, R_EARTH, SAT_B, VIEW, GPS_ALT, beatStart } from '../env.js';
import { antennaPoint, clockAt, fmtClock, wordT } from './s04-atomic-clocks.js';

const { W, H } = L;
const DEG = Math.PI / 180;
export const RING = { period: 0.62, speed: 420, maxR: 1700, half: 21 * DEG };

/** Ring emission window (global seconds). */
function windowOf(tl) {
  return { t0: beatStart(tl, 5) + 0.55, t1: beatStart(tl, 7) - 0.35, fade: beatStart(tl, 7) - 0.15 };
}
/** Live rings at this instant: [{r (px), a (0..1), born (gt)}], plus the source point and the beam axis. */
export function ringsAt(v) {
  const w = windowOf(v.tl);
  const src = antennaPoint(v);
  const axis = Math.atan2(v.wy(R_EARTH) - src.y, v.wx(0) - src.x);
  const out = [];
  const g = 1 - L.ease.inOutCubic(L.prog(v.gt, w.fade, 0.8));
  if (g <= 0 || v.gt < w.t0) return { src, axis, rings: out, g };
  const nMax = Math.floor((Math.min(v.gt, w.t1) - w.t0) / RING.period);
  for (let i = nMax; i >= 0; i--) {
    const born = w.t0 + i * RING.period;
    const age = v.gt - born;
    const r = age * RING.speed;
    if (r > RING.maxR) break;
    const a = L.smoothstep(L.clamp(r / 40)) * (1 - L.smoothstep(L.clamp(r / RING.maxR))) * g;
    out.push({ r, a, born, i });
  }
  return { src, axis, rings: out, g };
}

/** Draw the beam + rings (screen space around the moving source; the Earth's disc is clipped out). */
export function drawRings(ctx, v) {
  const st = ringsAt(v);
  if (st.g <= 0 || !st.rings.length && v.gt < windowOf(v.tl).t0) return;
  const { src, axis } = st;
  const a0 = axis - RING.half, a1 = axis + RING.half;
  const born = L.ease.outCubic(L.prog(v.gt, windowOf(v.tl).t0 - 0.2, 0.8));
  ctx.save();
  // clip out the Earth (rings stop at the ground)
  const er = v.ws(R_EARTH);
  if (er < 2e5) {
    ctx.beginPath();
    ctx.rect(-50, -50, W + 100, H + 100);
    ctx.arc(v.wx(0), v.wy(R_EARTH), Math.max(0, er), 0, Math.PI * 2);
    ctx.clip('evenodd');
  }
  ctx.globalCompositeOperation = 'lighter';
  // the beam: a faint feathered wedge
  const cg = ctx.createConicGradient(a0 - 0.15, src.x, src.y);
  const span = (a1 - a0 + 0.3) / (Math.PI * 2);
  const ba = 0.07 * st.g * born;
  cg.addColorStop(0, L.rgba(ACCENT, 0));
  cg.addColorStop(span * 0.25, L.rgba(ACCENT, ba));
  cg.addColorStop(span * 0.5, L.rgba(ACCENT, ba * 1.3));
  cg.addColorStop(span * 0.75, L.rgba(ACCENT, ba));
  cg.addColorStop(span, L.rgba(ACCENT, 0));
  cg.addColorStop(1, L.rgba(ACCENT, 0));
  ctx.fillStyle = cg;
  ctx.beginPath(); ctx.moveTo(src.x, src.y); ctx.arc(src.x, src.y, 2400, a0 - 0.15, a1 + 0.15); ctx.closePath(); ctx.fill();
  // rings: soft glow + crisp core + a dashed bit band, all feathered at the beam edges
  const SEG = 14;
  for (const ring of st.rings) {
    if (ring.a <= 0.003) continue;
    for (let s = 0; s < SEG; s++) {
      const u0 = s / SEG, u1 = (s + 1) / SEG, um = (u0 + u1) / 2;
      const edge = Math.sin(Math.PI * um);
      const ea = ring.a * Math.pow(edge, 0.8);
      const b0 = L.lerp(a0, a1, u0), b1 = L.lerp(a0, a1, u1) + 0.002;
      ctx.lineWidth = 14; ctx.strokeStyle = L.rgba(ACCENT, 0.14 * ea);
      ctx.beginPath(); ctx.arc(src.x, src.y, Math.max(0, ring.r), b0, b1); ctx.stroke();
      ctx.lineWidth = 2.6; ctx.strokeStyle = L.rgba([200, 255, 210], 0.95 * ea);
      ctx.beginPath(); ctx.arc(src.x, src.y, Math.max(0, ring.r), b0, b1); ctx.stroke();
    }
    // the bits: a dashed band riding just behind each front (a fixed pattern per ring)
    const r = L.rng(ring.i * 31 + 7), dash = [];
    for (let j = 0; j < 10; j++) dash.push(2 + Math.floor(r() * 3) * 5, 5);
    ctx.setLineDash(dash);
    ctx.lineDashOffset = -ring.r * 0.4;
    ctx.lineWidth = 3;
    ctx.strokeStyle = L.rgba(ACCENT, 0.32 * ring.a);
    ctx.beginPath(); ctx.arc(src.x, src.y, Math.max(0, ring.r - 9), a0 + 0.12, a1 - 0.12); ctx.stroke();
    ctx.setLineDash([]);
  }
  // the antenna glows on each emission
  const w = windowOf(v.tl);
  if (v.gt > w.t0 - 0.1 && v.gt < w.t1 + 0.3) {
    const ph = ((v.gt - w.t0) % RING.period + RING.period) % RING.period;
    L.lightBlob(ctx, src.x, src.y, 40 + 30 * Math.exp(-ph * 6), ACCENT, (0.25 + 0.45 * Math.exp(-ph * 6)) * st.g * born);
  }
  ctx.restore();
}

// B's sub-satellite point (honest): the direction of its resting position, Earth-fixed at spin 0 (= after the day)
const SUB = (() => {
  const th = Math.atan2(SAT_B.x, R_EARTH - SAT_B.y);
  const X = Math.sin(th), Y = Math.cos(th);
  const p = [0, 1, 2].map((j) => X * VIEW.r[j] + Y * VIEW.u[j]);
  return { lat: Math.asin(p[2]) / DEG, lon: Math.atan2(p[1], p[0]) / DEG };
})();
const POS_TXT = `${Math.abs(SUB.lat).toFixed(1)}° ${SUB.lat >= 0 ? 'N' : 'S'}  ${Math.abs(SUB.lon).toFixed(1)}° ${SUB.lon >= 0 ? 'E' : 'W'}  ·  ${L.fmt(Math.round(GPS_ALT / 1e5) * 100)} KM`;

/** One telemetry row: a tracked label, then the value typing on behind a cursor. */
function row(ctx, x, y, label, value, k, t, valColor) {
  if (k <= 0) return;
  ctx.save();
  ctx.globalAlpha *= L.clamp(k * 3);
  ctx.font = L.font(20, 700, L.FONT.body);
  ctx.fillStyle = 'rgba(170,190,210,0.85)';
  L.trackedText(ctx, label, x, y - 2, 3.5);
  const n = Math.floor(value.length * L.clamp(k));
  const shown = value.slice(0, n);
  ctx.font = L.font(46, 700, L.FONT.din);
  ctx.fillStyle = L.rgba(valColor);
  ctx.shadowColor = 'rgba(0,0,0,0.5)'; ctx.shadowBlur = 10;
  const vx = x + 178;
  ctx.fillText(shown, vx, y + 6);
  if (k < 1.0) {
    const cw = ctx.measureText(shown).width;
    ctx.fillStyle = L.rgba(ACCENT, 0.9);
    ctx.fillRect(vx + cw + 4, y - 30, 14, 38);
  }
  ctx.restore();
}

export default {
  beat: 5,
  chapter: { num: '05', title: 'Broadcast', sub: 'position + exact time' },
  captions: true,
  layer: 3,
  cues(d) {
    const out = [{ t: 0.5, name: 'sonar', gain: 0.3, pitch: 1.1 }];
    for (let i = 1; i < 6; i++) out.push({ t: 0.55 + i * RING.period, name: 'blip', gain: 0.07, pitch: 1.3 });
    out.push({ t: 1.35, name: 'swish', gain: 0.18, pitch: 1.3 });
    out.push({ t: 2.95, name: 'swish', gain: 0.18, pitch: 1.5 });
    out.push({ t: 3.2, name: 'count', gain: 0.16, pitch: 1.4 });
    return out;
  },
  drawWorld(ctx, v) {
    // rings live from beat 5 through beat 6 (and fade at the start of beat 7)
    if (v.t < 0 || v.t > v.d + 5.5) return;
    drawRings(ctx, v);
  },
  drawOverlay(ctx, v) {
    const t = v.t;
    const tPos = wordT(v.tl, 5, 0, 3) - 0.05;            // "where"
    const tTime = wordT(v.tl, 5, 1, 2) - 0.1;            // "exact"
    const k = v.k * L.enter(t, tPos - 0.35, 0.5);
    if (k <= 0) return;
    const x0 = 96, y0 = 960, w = 856, h = 196;          // ends at x 952: clear of the YouTube UI column
    ctx.save();
    const e = L.ease.outCubic(L.clamp(k));
    ctx.globalAlpha = L.clamp(k * 1.3);
    // glass panel that unfolds from its top rule
    const hh = h * e;
    ctx.fillStyle = 'rgba(4,10,18,0.72)';
    L.roundRect(ctx, x0, y0, w, Math.max(2, hh), 14); ctx.fill();
    ctx.strokeStyle = 'rgba(160,190,220,0.18)'; ctx.lineWidth = 1.5;
    L.roundRect(ctx, x0, y0, w, Math.max(2, hh), 14); ctx.stroke();
    ctx.fillStyle = L.rgba(ACCENT, 0.95);
    ctx.fillRect(x0 + 14, y0, (w - 28) * e, 3);
    // ring crossings: a faint green sweep runs over the panel each time a ring front reaches it
    const st = ringsAt(v);
    ctx.save();
    L.roundRect(ctx, x0, y0, w, Math.max(2, hh), 14); ctx.clip();
    ctx.globalCompositeOperation = 'lighter';
    for (const r of st.rings) {
      const dy = st.src.y + r.r - (y0 + h / 2);
      if (Math.abs(dy) > 140) continue;
      const a = (1 - Math.abs(dy) / 140) * 0.1 * r.a;
      const g = ctx.createLinearGradient(0, y0 + h / 2 + dy - 50, 0, y0 + h / 2 + dy + 50);
      g.addColorStop(0, L.rgba(ACCENT, 0)); g.addColorStop(0.5, L.rgba(ACCENT, a)); g.addColorStop(1, L.rgba(ACCENT, 0));
      ctx.fillStyle = g; ctx.fillRect(x0, y0 + h / 2 + dy - 50, w, 100);
    }
    ctx.restore();
    // header tag
    ctx.font = L.font(18, 700, L.FONT.body);
    ctx.fillStyle = L.rgba(ACCENT, 0.9 * e);
    L.trackedText(ctx, 'SIGNAL FROM SATELLITE B', x0 + 32, y0 + 38, 3);
    // rows
    row(ctx, x0 + 32, y0 + 98, 'POSITION', POS_TXT, L.prog(t, tPos, 0.7), t, [235, 240, 248]);
    const tk = L.prog(t, tTime, 0.55);
    if (tk > 0) {
      const c = fmtClock(clockAt(v.gt, v.tl), v.gt);
      row(ctx, x0 + 32, y0 + 160, 'TIME', `${c.hms}.${c.ms} ${c.us} ${c.ns}`, tk, t, CLOCK);
    }
    ctx.restore();
  },
};
