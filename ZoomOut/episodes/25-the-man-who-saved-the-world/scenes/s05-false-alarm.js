// Beat 5 — "He calls it a false alarm. | And waits. | Twenty-three minutes later, nothing has happened."
//          (45.18–52.50 with the v4 voice; every time below is derived from env.moments)
//
// Camera 'false': globe r 390 at y 840; 'wait' pulls back slowly (r 340 at y 800) from "And waits". The five arcs turn
// grey + dim from the stamp (env.launchState.grey); env's red edge pulse dies with it.
//   THE VERDICT (moments.stampFall → stampHit, on "false alarm"): an official stamp drops onto the night side of the
//   globe, over the USSR (y ≈ 650, clear of the greyed arcs): accelerating in (scale 1.32 → 1, ease-in, no bounce), a
//   short dampened compression on contact, a pressure ring off its edges and a brief darkening of the world under it.
//   Opaque plate, double rule, FALSE ALARM (fitted ≤ 560 px) + ЛОЖНАЯ ТРЕВОГА small (env CYR font), −3°.
//   AND WAITS (phrase 1): a minute dial rings the globe; an amber sweep runs from minute 15 to env.storyClock's minute
//   (the same count as the HUD clock: 00:15 → 00:38 = 23 minutes, landing on "Twenty-three minutes") with a "+N MIN"
//   readout riding its head. The stamp steps back (dims) so the dial is the one focus.
//   THE OUTCOME (moments.nothing, on "nothing"): under the dial (y 1175–1290): 00:38 · MOSCOW TIME (amber kicker) /
//   NO MISSILES ARRIVED (big, cold white) — adds to the caption instead of repeating it.
import * as L from '../../../../engine/runtime/lib.js';
import { AMBER, COLD, cyr, globeView, storyClock, moments } from '../env.js';

const { W, H } = L;
const TAU = Math.PI * 2;
const SX = 540, SY = 652, ROT = -0.052;
const BIG = 'FALSE ALARM', SMALL = 'ЛОЖНАЯ ТРЕВОГА';
// worn ink: a few deterministic gaps in the outer rule
const WEAR = (() => { const r = L.rng(2609), out = []; for (let i = 0; i < 46; i++) out.push([r(), r(), 1.5 + r() * 2.5]); return out; })();

const ph = (v, j) => v.tl.lines[5].phrases[j].start - v.tl.scenes[5].start;

function stamp(c, a, ink = 1) {
  c.font = L.font(118, 800, L.FONT.display);
  const size = L.fitSize(c, BIG, 560, 118, 800, L.FONT.display, 60);
  c.font = L.font(size, 800, L.FONT.display);
  const tw = c.measureText(BIG).width;
  const w = tw + 84, h = size + 92;
  const x = -w / 2, y = -h / 2;
  // plate
  c.fillStyle = `rgba(5,7,9,${0.92 * a})`;
  L.roundRect(c, x, y, w, h, 6); c.fill();
  c.shadowColor = 'transparent';   // only the plate casts the drop shadow
  // double rule
  c.strokeStyle = L.rgba(COLD, 0.95 * a * ink);
  c.lineWidth = 5;
  L.roundRect(c, x + 10, y + 10, w - 20, h - 20, 4); c.stroke();
  c.lineWidth = 1.5;
  L.roundRect(c, x + 20, y + 20, w - 40, h - 40, 3); c.stroke();
  // worn specks on the outer rule only (fixed, so frame-stable)
  c.fillStyle = `rgba(5,7,9,${0.85 * a})`;
  for (const [u, s, r] of WEAR) {
    const per = 2 * (w - 20) + 2 * (h - 20), d = u * per;
    let px, py;
    if (d < w - 20) { px = x + 10 + d; py = y + 10; }
    else if (d < w - 20 + h - 20) { px = x + w - 10; py = y + 10 + d - (w - 20); }
    else if (d < 2 * (w - 20) + h - 20) { px = x + w - 10 - (d - (w - 20) - (h - 20)); py = y + h - 10; }
    else { px = x + 10; py = y + h - 10 - (d - 2 * (w - 20) - (h - 20)); }
    c.beginPath(); c.arc(px + (s - 0.5) * 3, py + (s - 0.5) * 3, Math.max(0, r * 0.6), 0, TAU); c.fill();
  }
  // type
  c.fillStyle = L.rgba(COLD, a * ink);
  c.textAlign = 'center';
  c.textBaseline = 'alphabetic';
  L.trackedText(c, BIG, 0, y + 30 + size * 0.86, 1, 'center');
  c.font = cyr(30, 700);
  c.fillStyle = L.rgba(COLD, 0.72 * a * ink);
  L.trackedText(c, SMALL, 0, y + h - 32, 9, 'center');
  return { w, h };
}

function dial(c, view, k, min, gt) {
  const cx = view.cx, cy = view.cy, R = view.r + 24;
  const ang = (m) => -Math.PI / 2 + (m / 60) * TAU;
  c.save();
  c.globalAlpha = k;
  // the 60 minute ticks (majors every 5)
  c.strokeStyle = L.rgba(COLD, 0.35);
  c.lineWidth = 1.5;
  c.beginPath();
  for (let m = 0; m < 60; m++) {
    const a = ang(m), l = m % 5 ? 7 : 14;
    c.moveTo(cx + Math.cos(a) * R, cy + Math.sin(a) * R);
    c.lineTo(cx + Math.cos(a) * (R + l), cy + Math.sin(a) * (R + l));
  }
  c.stroke();
  // the sweep: minute 15 → now
  const a0 = ang(15), a1 = ang(min);
  if (min > 15) {
    c.strokeStyle = L.rgba(AMBER, 0.25);
    c.lineWidth = 12;
    c.beginPath(); c.arc(cx, cy, R + 6, a0, a1); c.stroke();
    c.strokeStyle = L.rgba(AMBER, 0.95);
    c.lineWidth = 3;
    c.beginPath(); c.arc(cx, cy, R + 6, a0, a1); c.stroke();
  }
  // start mark (00:15, the call) + the moving head
  c.fillStyle = L.rgba(COLD, 0.8);
  c.beginPath(); c.arc(cx + Math.cos(a0) * (R + 6), cy + Math.sin(a0) * (R + 6), 4, 0, TAU); c.fill();
  const hx = cx + Math.cos(a1) * (R + 6), hy = cy + Math.sin(a1) * (R + 6);
  L.lightBlob(c, hx, hy, 26, AMBER, 0.5 * k);
  c.fillStyle = L.rgba(AMBER);
  c.beginPath(); c.arc(hx, hy, 5.5, 0, TAU); c.fill();
  // readout riding the head, outside the ring (kept inside x 64–940)
  const txt = `+${min - 15} MIN`;
  c.font = L.font(40, 700, L.FONT.din);
  const tw = c.measureText(txt).width;
  const ox = cx + Math.cos(a1) * (R + 58), oy = cy + Math.sin(a1) * (R + 58);
  const tx = L.clamp(ox - tw / 2, 64, 940 - tw), ty = L.clamp(oy + 14, 380, 1330);
  c.shadowColor = 'rgba(2,6,10,0.9)'; c.shadowBlur = 12;
  c.fillStyle = L.rgba(AMBER);
  c.textAlign = 'left'; c.textBaseline = 'alphabetic';
  c.fillText(txt, tx, ty);
  c.restore();
  void gt;
}

export default {
  beat: 5,
  chapter: null,
  layer: 6,
  cues() {
    return [];   // stamp / wait / nothing cues are tied to words: env.cues(tl) from env.moments
  },
  drawOverlay(c, v) {
    if (v.k <= 0) return;
    const m = moments(v.tl), b0 = v.tl.scenes[5].start;
    const t0 = m.stampFall - b0, tc = m.stampHit - b0, p1 = ph(v, 1), tn = m.nothing - b0;
    const view = globeView(v);
    // ---- the world darkens a touch on contact (the stamp lands "on" it), then holds a quiet dim
    const hit = v.t >= tc ? Math.exp(-(v.t - tc) * 5) : 0;
    const dim = (0.26 * hit + 0.14 * L.ease.outCubic(L.prog(v.t, tc, 0.5))) * v.k;
    if (dim > 0) { c.fillStyle = `rgba(2,4,8,${dim})`; c.fillRect(0, 0, W, H); }
    // ---- And waits: the minute dial (under the stamp)
    const kd = v.k * L.ease.outCubic(L.prog(v.t, p1 - 0.12, 0.4));
    if (kd > 0) dial(c, view, kd, storyClock(v.gt, v.tl).min, v.gt);
    // ---- the outcome (adds to the caption, never repeats it): 00:38 · MOSCOW TIME / NO MISSILES ARRIVED, on "nothing"
    const kn = v.k * L.ease.outCubic(L.prog(v.t, tn - 0.12, 0.45));
    if (kn > 0) {
      c.save();
      c.globalAlpha = kn;
      c.textAlign = 'center'; c.textBaseline = 'alphabetic';
      c.shadowColor = 'rgba(2,6,10,0.9)'; c.shadowBlur = 16;
      c.font = L.font(26, 700, L.FONT.body);
      c.fillStyle = L.rgba(AMBER);
      L.trackedText(c, '00:38 · MOSCOW TIME', 540, 1200 + (1 - kn) * 10, 6, 'center');
      const fs = L.fitSize(c, 'NO MISSILES ARRIVED', 840, 84, 800, L.FONT.display, 50);
      c.font = L.font(fs, 800, L.FONT.display);
      c.fillStyle = L.rgba(COLD);
      c.fillText('NO MISSILES ARRIVED', 540, 1216 + fs * 0.82 + (1 - kn) * 14);
      c.restore();
    }
    // ---- the stamp
    if (v.t < t0) return;
    const fall = L.prog(v.t, t0, tc - t0);
    let s = L.lerp(1.32, 1, L.ease.inCubic(fall));
    if (v.t >= tc) s = 1 - 0.022 * Math.exp(-(v.t - tc) * 18) * Math.sin(Math.PI * L.clamp((v.t - tc) / 0.14));
    const a = L.clamp(fall / 0.45) * v.k;
    const ink = L.lerp(1, 0.72, L.ease.inOutCubic(L.prog(v.t, p1 - 0.1, 0.5)));   // steps back for the dial
    c.save();
    c.translate(SX, SY);
    c.rotate(L.lerp(ROT * 1.8, ROT, L.ease.inCubic(fall)));
    // soft drop shadow grows as it nears the surface
    c.shadowColor = `rgba(0,0,0,${0.55 * a})`;
    c.shadowBlur = L.lerp(40, 14, fall);
    c.shadowOffsetY = L.lerp(18, 4, fall);
    c.scale(s, s);
    const { w, h } = stamp(c, a, ink);
    c.shadowColor = 'transparent';
    // pressure ring off the edges at contact
    if (v.t >= tc && v.t < tc + 0.45) {
      const e = L.ease.outCubic(L.prog(v.t, tc, 0.45));
      const g = 8 + 34 * e;
      c.strokeStyle = L.rgba(COLD, 0.45 * (1 - e) * v.k);
      c.lineWidth = 2;
      L.roundRect(c, -w / 2 - g, -h / 2 - g, w + 2 * g, h + 2 * g, 8 + g * 0.3); c.stroke();
    }
    c.restore();
  },
};
