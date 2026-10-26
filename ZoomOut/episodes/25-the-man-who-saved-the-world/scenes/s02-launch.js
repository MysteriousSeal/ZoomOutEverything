// Beat 2 — "The alarm goes off: a US missile launch. | Then another. | Five in total. | The computer rates it: high
//          reliability."   (19.92–30.09 with the v4 voice; every time below is derived from the timeline)
//
// The camera ('map') pushes into the wall map; env crossfades it into the real Earth (env CUT, shotStart('map') + 0.64).
// drawWorld (every frame, beats 2–5): THE 5 DETECTED LAUNCHES, state from env.launchState (never re-timed here):
//   each one reads in 3D from straight above the pole: a ground SHADOW offset with altitude, a faint curtain + stilts
//   between path and shadow, a tapered glowing TRAIL, a white-hot HEAD with a dashed plumb line, a launch PING at t0.
//   Grey + dim from the FALSE ALARM stamp (env grey/alpha), gone by beat 6 + 0.6.
// drawOverlay:
//   · the chapter card is DELAYED: `chapter` is null so the engine draws nothing during the push; this file draws
//     the same house card (02 THE ALARM / Oko early-warning satellite) from just after the cut.
//   · the counter "N / 5 · LAUNCHES DETECTED" + 5 pips, top right under env's MOSCOW clock, from the first
//     detection: whole digits from env.detections (frame-stable), a short pop on each new detection.
//   · phrase 3 (camera 'rely' lifts the globe to r 300 at y 640): THE RELIABILITY PANEL, y 1000–1330, a big replica
//     of the board's strip: ДОСТОВЕРНОСТЬ plate + the ВЫСОКАЯ window, which snaps on and blazes amber on "high"
//     (moments.relyLit), with RELIABILITY: HIGH under it.
import * as L from '../../../../engine/runtime/lib.js';
import { ACCENT, AMBER, COLD, cyr, moments, ARC_ALT, globeView, earth3, path3, LAUNCH, TARGET, launchState, launchTimes, detections, roomK, cutWindow } from '../env.js';

const { W } = L;
const TAU = Math.PI * 2;
const R = 1016;
const CH = { num: '02', title: 'The alarm', sub: 'Oko early-warning satellite' };
const N = 44;

// Seen from straight above, a ballistic path toward the pole only shifts ALONG its track (its altitude pushes it
// radially outward), so height alone barely reads. The path itself stays exact (env.path3 = env.arcPt, so other
// scenes can ring the heads); its SHADOW falls on the ground offset to the east (away from the low
// late-afternoon Sun in the west), by an amount proportional to altitude: the gap between the bright path and its
// dark shadow, with faint stilts between them, is what makes the flight read as up in the air.
const SH_DIR = (() => { const x = 1, y = -0.06, n = Math.hypot(x, y); return { x: x / n, y: y / n }; })();
const SH_K = 0.95;                      // shadow offset = altitude (Earth radii) × r × SH_K  (≈ 67 px at apogee, r 430)
function shadowPt(view, P, alt) {
  const n = Math.hypot(P[0], P[1], P[2]);
  const g = earth3(view, [P[0] / n, P[1] / n, P[2] / n]);
  const d = alt * view.r * SH_K;
  return { x: g.x + SH_DIR.x * d, y: g.y + SH_DIR.y * d };
}

function drawLaunch(c, view, i, s, gt, pass) {
  const sc = view.r / 430;
  const grey = s.grey;
  const col = L.mix(ACCENT, [150, 154, 156], grey);
  const hot = L.mix([255, 214, 190], [215, 218, 220], grey);
  const A = LAUNCH[i], B = TARGET[i];
  const air = [], shd = [], alt = [];
  for (let k = 0; k <= N; k++) {
    const u = (s.p * k) / N;
    const P = path3(A, B, u);
    const h = Math.hypot(P[0], P[1], P[2]) - 1;            // altitude in Earth radii (0 → ≈ 0.17)
    air.push(earth3(view, P));
    shd.push(shadowPt(view, P, h));
    alt.push(h);
  }
  const head = air[N], hs = shd[N], ha = alt[N] / ARC_ALT;
  c.save();
  c.globalAlpha *= s.alpha;
  c.lineJoin = 'round'; c.lineCap = 'round';
  if (pass === 0) {   // ---- ground pass (all five before any trail: no shadow ever crosses a bright path)
    // the shadow on the ground: dark, soft, widening with altitude (the clearest "it is up in the air" cue from above)
    c.save();
    c.filter = `blur(${(1.5 * sc).toFixed(2)}px)`;
    c.strokeStyle = `rgba(0,0,0,${0.62 * (1 - 0.5 * grey)})`;
    c.lineWidth = Math.max(1, 3.6 * sc);
    c.beginPath();
    shd.forEach((p, k) => (k ? c.lineTo(p.x, p.y) : c.moveTo(p.x, p.y)));
    c.stroke();
    c.fillStyle = `rgba(0,0,0,${0.5 * (1 - 0.5 * grey)})`;
    c.beginPath(); c.ellipse(hs.x, hs.y, (4 + 3 * ha) * sc, (3 + 2 * ha) * sc, 0, 0, TAU); c.fill();
    c.restore();
    // stilts: faint vertical lines from the path down to its shadow (a translucent curtain)
    c.beginPath();
    air.forEach((p, k) => (k ? c.lineTo(p.x, p.y) : c.moveTo(p.x, p.y)));
    for (let k = N; k >= 0; k--) c.lineTo(shd[k].x, shd[k].y);
    c.closePath();
    c.fillStyle = L.rgba(col, 0.1);
    c.fill();
    c.strokeStyle = L.rgba(col, 0.2);
    c.lineWidth = Math.max(0.6, 0.9 * sc);
    c.beginPath();
    for (let k = 5; k < N; k += 5) { c.moveTo(air[k].x, air[k].y); c.lineTo(shd[k].x, shd[k].y); }
    c.stroke();
    // head → its shadow: a dashed plumb line
    c.setLineDash([3 * sc, 4 * sc]);
    c.strokeStyle = L.rgba(hot, 0.5);
    c.lineWidth = Math.max(0.8, 1.2 * sc);
    c.beginPath(); c.moveTo(head.x, head.y); c.lineTo(hs.x, hs.y); c.stroke();
    c.setLineDash([]);
    c.restore();
    return;
  }
  // ---- air pass (butt caps: overlapping round caps would bead the trail once it dims)
  c.lineCap = 'butt';
  // trail: glow pass, then the tapered core (alpha + width grow toward the head and with altitude: nearer the eye)
  c.save();
  c.globalCompositeOperation = 'lighter';
  for (let k = 0; k < N; k++) {
    const f = (k + 1) / N, a = 1 + 1.3 * alt[k + 1];
    c.strokeStyle = L.rgba(col, 0.2 * f * f);
    c.lineWidth = (4 + 9 * f) * sc * a;
    c.beginPath(); c.moveTo(air[k].x, air[k].y); c.lineTo(air[k + 1].x, air[k + 1].y); c.stroke();
  }
  c.restore();
  for (let k = 0; k < N; k++) {
    const f = (k + 1) / N, a = 1 + 1.3 * alt[k + 1];
    c.strokeStyle = L.rgba(L.mix(col, hot, f * f * 0.7), 0.25 + 0.75 * f);
    c.lineWidth = (1.2 + 2.4 * f) * sc * a;
    c.beginPath(); c.moveTo(air[k].x, air[k].y); c.lineTo(air[k + 1].x, air[k + 1].y); c.stroke();
  }
  // head: bloom + white-hot core (dims when it turns grey)
  const hk = 1 - 0.85 * grey, hz = 1 + 0.35 * ha;
  L.lightBlob(c, head.x, head.y, 34 * sc * hz, L.mix([255, 90, 60], [200, 200, 205], grey), 0.85 * hk);
  L.lightBlob(c, head.x, head.y, 12 * sc * hz, hot, 0.9 * hk);
  c.fillStyle = L.rgba(L.mix([255, 250, 245], [220, 222, 224], grey));
  c.beginPath(); c.arc(head.x, head.y, Math.max(0, 3.4 * sc * hz), 0, TAU); c.fill();
  // launch site + one ping ring at t0
  const g0 = shd[0];
  c.fillStyle = L.rgba(col, 0.95);
  c.beginPath(); c.arc(g0.x, g0.y, Math.max(0, 3.2 * sc), 0, TAU); c.fill();
  const pk = L.prog(gt - s.t0, 0, 1.0);
  if (pk > 0 && pk < 1) {
    const e = L.ease.outCubic(pk);
    c.strokeStyle = L.rgba(L.mix([255, 120, 90], col, grey), 0.9 * (1 - pk));
    c.lineWidth = Math.max(0.5, 2.5 * sc * (1 - pk * 0.6));
    c.beginPath(); c.arc(g0.x, g0.y, Math.max(0, (5 + 42 * e) * sc), 0, TAU); c.stroke();
  }
  c.restore();
}

/** The house chapter card (same look as the engine's), drawn late: k 0..1 entrance, t = seconds since it started. */
function chapterCard(c, k, t) {
  if (k <= 0) return;
  const x = 64, y = 238;
  c.save();
  c.globalAlpha = k;
  const kin = L.clamp(t / 0.6);
  c.fillStyle = L.rgba(ACCENT);
  L.roundRect(c, x, y - 32, 64 * L.ease.outBack(Math.min(1, kin * 1.3)), 64, 10);
  c.fill();
  if (kin > 0.3) {
    c.fillStyle = L.rgba(L.INK);
    c.font = L.font(36, 700, L.FONT.din);
    c.textBaseline = 'middle'; c.textAlign = 'center';
    c.fillText(CH.num, x + 32, y + 3);
  }
  c.beginPath();
  c.rect(x + 76, y - 60, 900 * L.ease.outCubic(L.prog(t, 0.08, 0.55)), 120);
  c.clip();
  c.textAlign = 'left';
  c.shadowColor = 'rgba(2,6,14,0.85)';
  c.shadowBlur = 14;
  c.fillStyle = L.rgba(L.WHITE);
  c.font = L.font(40, 700, L.FONT.display);
  c.textBaseline = 'alphabetic';
  L.trackedText(c, CH.title.toUpperCase(), x + 94, y + 2, 4);
  c.fillStyle = L.rgba([175, 190, 210], 0.95);
  c.font = L.font(25, 500, L.FONT.body);
  L.trackedText(c, CH.sub, x + 94, y + 34, 0.5);
  L.trackedText(c, CH.sub, x + 94, y + 34, 0.5);
  c.restore();
}

/** Phrase 3: the board's reliability strip, big. Lit from the frame index (a 4-frame snap-on, then steady). */
function relyPanel(c, v) {
  const m = moments(v.tl);
  const kin = v.k * L.ease.outCubic(L.prog(v.gt, m.relyIn, 0.45));
  if (kin <= 0) return;
  const f = Math.round(v.gt * 30) - Math.round(m.relyLit * 30);
  const lit = L.ease.outCubic(L.clamp(f / 4));                         // snaps on over 4 frames (no flicker: no dark frames)
  const glow = f < 0 ? 0 : 0.85 + 0.15 * Math.sin(v.gt * TAU * 0.7);
  const x = 154, w = 772, y = 1000 + (1 - kin) * 16, h = 150, pw = 300;   // housing x 140–940
  c.save();
  c.globalAlpha = L.clamp(kin * 1.3);
  // housing
  c.shadowColor = 'rgba(0,0,0,0.6)'; c.shadowBlur = 30;
  c.fillStyle = 'rgb(30,35,36)';
  L.roundRect(c, x - 14, y - 14, w + 28, h + 28, 12); c.fill();
  c.shadowBlur = 0;
  c.strokeStyle = 'rgba(160,175,170,0.25)'; c.lineWidth = 1.5;
  L.roundRect(c, x - 13, y - 13, w + 26, h + 26, 12); c.stroke();
  // engraved plate
  const pg = c.createLinearGradient(0, y, 0, y + h);
  pg.addColorStop(0, 'rgb(24,26,26)'); pg.addColorStop(1, 'rgb(10,11,11)');
  c.fillStyle = pg;
  L.roundRect(c, x, y, pw, h, 8); c.fill();
  c.textAlign = 'center'; c.textBaseline = 'middle';
  c.font = cyr(L.fitSize(c, 'ДОСТОВЕРНОСТЬ', pw - 36, 46, 700, '"PT Sans Narrow", "PT Sans", sans-serif', 20), 700);
  c.fillStyle = 'rgb(214,218,210)';
  c.fillText('ДОСТОВЕРНОСТЬ', x + pw / 2, y + h / 2 + 2);
  // the amber window
  const ax = x + pw + 18, aw = w - pw - 18;
  c.fillStyle = 'rgb(8,9,9)';
  L.roundRect(c, ax - 6, y - 6, aw + 12, h + 12, 10); c.fill();
  const ag = c.createRadialGradient(ax + aw / 2, y + h / 2, 10, ax + aw / 2, y + h / 2, aw * 0.6);
  ag.addColorStop(0, L.rgba(L.mix([70, 46, 18], [255, 220, 130], lit)));
  ag.addColorStop(1, L.rgba(L.mix([44, 30, 12], [236, 150, 40], lit)));
  c.fillStyle = ag;
  c.fillRect(ax, y, aw, h);
  c.fillStyle = `rgba(0,0,0,${0.08 + 0.05 * lit})`;
  for (let yy = y + 3; yy < y + h; yy += 9) c.fillRect(ax, yy, aw, 3);
  if (lit > 0.5) L.lightBlob(c, ax + aw / 2, y + h / 2, aw * 0.75, AMBER, 0.5 * glow);
  c.font = cyr(Math.min(110, L.fitSize(c, 'ВЫСОКАЯ', aw - 60, 110, 700, '"PT Sans Narrow", "PT Sans", sans-serif', 40)), 700);
  c.fillStyle = L.rgba(L.mix([96, 72, 40], [48, 20, 4], lit));
  L.trackedText(c, 'ВЫСОКАЯ', ax + aw / 2, y + h / 2 + 4, 6, 'center');
  // a gloss, not a repeat of the caption: ВЫСОКАЯ = HIGH (small, under the window)
  const ek = L.ease.outCubic(L.prog(f / 30, 0.05, 0.4));
  if (ek > 0) {
    c.globalAlpha = L.clamp(kin * 1.3) * ek;
    c.textAlign = 'left'; c.textBaseline = 'alphabetic';
    const fs = 40, ty = y + h + 34 + fs * 0.8 + (1 - ek) * 8;
    c.shadowColor = 'rgba(0,0,0,0.8)'; c.shadowBlur = 12;
    c.font = cyr(fs, 700);
    const A = 'ВЫСОКАЯ', aw = c.measureText(A).width;
    c.font = L.font(fs * 0.9, 800, L.FONT.display);
    const E = '  =  ', ew = c.measureText(E).width, Bw = 'HIGH', bw = c.measureText(Bw).width;
    const tx = x + w / 2 - (aw + ew + bw) / 2;
    c.font = cyr(fs, 700);
    c.fillStyle = L.rgba(AMBER, 0.95);
    c.fillText(A, tx, ty);
    c.font = L.font(fs * 0.9, 800, L.FONT.display);
    c.fillStyle = L.rgba(COLD, 0.75);
    c.fillText(E, tx + aw, ty);
    c.fillStyle = L.rgba(COLD);
    c.fillText(Bw, tx + aw + ew, ty);
  }
  c.restore();
}

export default {
  beat: 2,
  chapter: null,            // drawn late by this file (chapterCard): the HUD band stays clean through the push
  layer: 3,
  cues() {
    // beat-relative only; the detection blips + the panel are tied to words: env.cues(tl) from env.moments
    return [{ t: 0.2, name: 'impact', gain: 0.35, pitch: 0.8 }];
  },
  drawWorld(c, v) {
    const st = launchState(v.gt, v.tl);
    if (!st.some((s) => s.on && s.alpha > 0.002 && s.p > 0.001)) return;
    const view = globeView(v);
    if (view.r < 8) return;
    for (const pass of [0, 1]) st.forEach((s, i) => { if (s.on && s.alpha > 0.002 && s.p > 0.001) drawLaunch(c, view, i, s, v.gt, pass); });
  },
  drawOverlay(c, v) {
    const gt = v.gt, tl = v.tl;
    // (the top scrim during the push now lives in env.drawForeground: it spans beats 1–2 without a seam)
    // ---- the delayed chapter card
    const t0 = cutWindow(tl).t1 - 0.25;   // overlaps the end of the cut: no dead beat with an empty chip
    if (gt >= t0) chapterCard(c, v.k * L.ease.outCubic(L.prog(gt, t0, 0.6)), gt - t0);

    relyPanel(c, v);
    // ---- the detection counter
    const n = detections(gt, tl);
    if (n <= 0) return;
    const ts = launchTimes(tl);
    const f = Math.round(gt * 30);
    const tFirst = ts[0], tLast = ts[n - 1];
    const kin = L.ease.outCubic(L.clamp((f - Math.round(tFirst * 30)) / 9));
    const pop = 1 - L.clamp((f - Math.round(tLast * 30)) / 9);
    c.save();
    c.globalAlpha = v.k * kin;
    c.textBaseline = 'alphabetic';
    c.shadowColor = 'rgba(2,6,10,0.85)';
    c.shadowBlur = 12;
    c.font = L.font(46, 700, L.FONT.din);
    c.fillStyle = L.rgba(COLD, 0.7);
    c.textAlign = 'right';
    c.fillText('/ 5', R, 452);
    const sw = c.measureText('/ 5').width;
    c.save();
    const nx = R - sw - 12, ny = 452;
    const s = 1 + 0.22 * pop * pop;
    c.translate(nx, ny); c.scale(s, s);
    c.font = L.font(88, 700, L.FONT.din);
    c.fillStyle = L.rgba(L.mix(ACCENT, [255, 170, 150], pop * 0.8));
    c.fillText(String(n), 0, 0);
    c.restore();
    if (pop > 0) L.lightBlob(c, nx - 24, ny - 30, 70, ACCENT, 0.45 * pop * v.k);
    c.font = L.font(18, 700, L.FONT.body);
    c.fillStyle = L.rgba(COLD, 0.85);
    L.trackedText(c, 'LAUNCHES DETECTED', R, 482, 3, 'right');
    c.shadowBlur = 0;
    // five pips
    const pw = 24, ph = 8, gap = 7;
    for (let i = 0; i < 5; i++) {
      const x = R - (5 - i) * pw - (4 - i) * gap, y = 498;
      c.strokeStyle = L.rgba(COLD, 0.35); c.lineWidth = 1.5;
      c.strokeRect(x + 0.75, y + 0.75, pw - 1.5, ph - 1.5);
      if (i < n) {
        const fk = L.clamp((f - Math.round(ts[i] * 30)) / 4);
        c.fillStyle = L.rgba(ACCENT);
        c.fillRect(x, y, pw * fk, ph);
      }
    }
    c.restore();
  },
};
