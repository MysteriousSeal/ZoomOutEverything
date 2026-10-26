// Beat 2 — 7.5 laps around Earth in exactly 1.0 s. The parked photon charges, then runs the limb at
// true speed. Each lap leaves a faint ring a little wider than the last, so after the run the frame
// itself shows the count: seven full rings and a half. The readout runs 0.0 -> 7.5 laps while a
// one-second bar fills beneath it, then an "IN 1 SECOND" stamp lands.
import * as L from '../../../../engine/runtime/lib.js';
import { R_EARTH } from '../camera.js';
import { CLOCK_Y, drawClock, drawPhoton, PHOTON_GOLD, R_PARK } from './s01-one-second.js';

const { W } = L;
const RUN0 = 1.70, RUN1 = RUN0 + 1.0;  // the run: exactly one second (beat-local)
const LAPS = 7.5;
const DR = 0.95e5;                     // metres of outward drift per lap (ring spacing)

const runP = (t) => L.prog(t, RUN0, RUN1 - RUN0);        // linear: light doesn't ease
const ang = (p) => -Math.PI / 2 + 2 * Math.PI * LAPS * p;
const rad = (p) => R_PARK + LAPS * p * DR;
const posAt = (p) => [Math.cos(ang(p)) * rad(p), Math.sin(ang(p)) * rad(p)];

function strokeSpiral(ctx, v, p0, p1) {
  const n = Math.max(2, Math.ceil((p1 - p0) * 1100));
  ctx.beginPath();
  for (let i = 0; i <= n; i++) {
    const [x, y] = posAt(L.lerp(p0, p1, i / n));
    i ? ctx.lineTo(v.wx(x), v.wy(y)) : ctx.moveTo(v.wx(x), v.wy(y));
  }
  ctx.stroke();
}

export default {
  beat: 2,
  chapter: { num: '02', title: 'Around Earth', sub: 'One second of light' },
  captions: true,
  layer: 3,
  chapterUntil(d) { return RUN0 - 0.2; },
  cues(d) {
    const out = [
      { t: RUN0 - 0.85, name: 'riser', gain: 0.24, pitch: 1.2 },
      { t: RUN0 - 0.02, name: 'whoosh', gain: 0.4, pitch: 1.4 },
    ];
    for (let i = 1; i <= 7; i++) out.push({ t: RUN0 + i / LAPS, name: 'tick', gain: 0.16 + i * 0.012, pitch: 1.0 + i * 0.06 });
    out.push({ t: RUN1, name: 'impact', gain: 0.34, pitch: 1.2 });
    out.push({ t: RUN1 + 0.12, name: 'ping', gain: 0.3, pitch: 1.1 });
    return out;
  },

  drawWorld(ctx, v) {
    const t = v.t;
    if (t < 0 || t > v.d + 1.0) return;
    const r = v.ws(R_EARTH);
    if (r < 20) return;
    const p = runP(t);
    // the ring record: dims after the run, gone as the camera leaves for the Moon
    const rec = (1 - 0.45 * L.ease.inOutCubic(L.prog(t, RUN1 + 0.3, 1.2))) * (1 - L.ease.inCubic(L.prog(t, v.d - 0.05, 0.5)));
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    if (p > 0 && rec > 0) {
      ctx.strokeStyle = L.rgba(PHOTON_GOLD, 0.10 * rec);
      ctx.lineWidth = 7;
      strokeSpiral(ctx, v, 0, p);
      ctx.strokeStyle = L.rgba(PHOTON_GOLD, 0.55 * rec);
      ctx.lineWidth = 1.6;
      strokeSpiral(ctx, v, 0, p);
    }
    // hot trail: the last ~140 degrees behind the head, brightest at the head
    if (p > 0 && p < 1 + 0.06) {
      const seg = 0.05, steps = 14;
      const fade = 1 - L.prog(p, 1, 0.06);
      for (let i = 0; i < steps; i++) {
        const a0 = Math.max(0, Math.min(1, p) - seg * (1 - i / steps)), a1 = Math.max(0, Math.min(1, p) - seg * (1 - (i + 1) / steps));
        if (a1 <= a0) continue;
        const k = (i + 1) / steps;
        ctx.lineCap = 'butt';
        ctx.strokeStyle = L.rgba([255, 236, 190], 0.9 * k * k * fade);
        ctx.lineWidth = 1.5 + 6 * k;
        strokeSpiral(ctx, v, a0, a1);
      }
    }
    ctx.restore();

    // the photon: parked (charging) -> running -> resting at the far side of Earth
    const [hx, hy] = posAt(Math.min(1, p));
    const sx = v.wx(hx), sy = v.wy(hy);
    const charge = L.ease.inOutCubic(L.prog(t, RUN0 - 0.9, 0.9)) * (1 - L.prog(t, RUN0, 0.05));
    const rest = 1 - L.ease.inCubic(L.prog(t, v.d - 0.1, 0.45));
    const breathe = 1 + 0.08 * Math.sin(v.gt * 3.2);
    const s = (p <= 0 ? 0.62 * breathe + 0.25 * charge : p < 1 ? 0.95 : 0.62 * breathe);
    drawPhoton(ctx, sx, sy, { s, a: rest, rot: 0.35 + v.gt * 0.15 });
    if (charge > 0) {
      // charging: a ring that tightens onto the photon
      ctx.save();
      ctx.strokeStyle = L.rgba(PHOTON_GOLD, 0.6 * charge);
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(sx, sy, Math.max(0, 70 * (1 - charge) + 10), 0, Math.PI * 2); ctx.stroke();
      ctx.restore();
    }
    // finish: a compact burst where the run ends (it ends at Earth's bottom limb, just above the
    // caption band, so the ring stays small and the bloom tight)
    const fb = L.prog(t, RUN1, 0.9);
    if (fb > 0 && fb < 1) {
      L.lightBlob(ctx, sx, sy, 40 + 60 * fb, [255, 210, 130], 0.6 * (1 - fb));
      ctx.save();
      ctx.strokeStyle = L.rgba(PHOTON_GOLD, 0.7 * (1 - fb));
      ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.arc(sx, sy, Math.max(0, 8 + 30 * L.ease.outCubic(fb)), 0, Math.PI * 2); ctx.stroke();
      ctx.restore();
    }
  },

  drawOverlay(ctx, v) {
    const t = v.t, p = runP(t);
    drawClock(ctx, v, {
      segs: [{ n: (LAPS * p).toFixed(1), u: 'LAPS' }],
      label: 'AROUND THE EARTH', lockAt: RUN1,
    });
    // the one-second bar under the readout, then the stamp
    const k = (t > v.d * 0.5 ? L.clamp((v.k - 0.85) / 0.15) : v.k) * L.enter(t, 0.35, 0.5);
    if (k <= 0) return;
    const y = CLOCK_Y + 58, bw = 340, x0 = W / 2 - bw / 2;
    ctx.save();
    ctx.globalAlpha *= k;
    ctx.fillStyle = 'rgba(220,228,240,0.18)';
    ctx.fillRect(x0, y - 1.5, bw, 3);
    for (const f of [0, 0.5, 1]) { ctx.fillStyle = 'rgba(220,228,240,0.5)'; ctx.fillRect(x0 + bw * f - 1, y - (f === 0.5 ? 5 : 8), 2, f === 0.5 ? 10 : 16); }
    if (p > 0) {
      ctx.fillStyle = L.rgba(v.accent);
      ctx.fillRect(x0, y - 2, bw * p, 4);
      L.lightBlob(ctx, x0 + bw * p, y, 26, [255, 220, 150], 0.6 * (1 - L.prog(t, RUN1, 0.3)));
    }
    // stamp: slams in with a slight rotation, then settles
    const sk = L.prog(t, RUN1 + 0.08, 0.38);
    if (sk > 0) {
      const e = L.ease.outBack(sk, 2.2);
      const sc = L.lerp(1.6, 1, e);
      ctx.translate(W / 2, y + 52);
      ctx.rotate((1 - e) * -0.12 - 0.035);
      ctx.scale(sc, sc);
      ctx.globalAlpha *= L.clamp(sk * 3);
      ctx.font = L.font(30, 800, L.FONT.display);
      const txt = 'IN ONE SECOND';
      ctx.letterSpacing = '3px';
      const tw = ctx.measureText(txt).width;
      ctx.letterSpacing = '0px';
      ctx.shadowColor = 'rgba(0,0,0,0.5)'; ctx.shadowBlur = 18;
      ctx.fillStyle = L.rgba(v.accent);
      L.roundRect(ctx, -tw / 2 - 20, -24, tw + 40, 48, 8);
      ctx.fill();
      ctx.shadowColor = 'transparent';
      ctx.fillStyle = L.rgba(L.INK);
      ctx.textBaseline = 'middle';
      L.trackedText(ctx, txt, 0, 2, 3, 'center');
    }
    ctx.restore();
  },
};
