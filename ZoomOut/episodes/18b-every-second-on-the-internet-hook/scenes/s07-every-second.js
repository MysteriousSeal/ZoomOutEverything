// Beat 7 — "Not every minute. | Every second."
// "Not every minute": a 60-second clock ring (60 ticks, a slow second hand and its elapsed arc, "60 s" at the centre)
// draws itself around HOME (the phone's apartment) and is struck through; the ring drains to grey.
// "Every second": the ring collapses into a single bright point at HOME, which fires one pulse wave across the whole
// city (additive, world space, so it rides the camera and motion blur). Label "every second" / "8 hours of new video".
import * as L from '../../../../engine/runtime/lib.js';
import { ACCENT, homeAt, planK } from '../env.js';

const ACC = ACCENT;
const STRIKE = [255, 104, 88];
const R = 222;               // ring radius (px)
const TAU = Math.PI * 2;

function times(tl) {
  const s = tl.scenes[7].start, a = tl.lines[7].phrases[0], b = tl.lines[7].phrases[1];
  return {
    s,
    ring0: a.start - 0.08,                  // ring draws on with "Not"
    strike0: a.start + (a.end - a.start) * 0.55,   // on "minute"
    collapse0: b.start - 0.2,
    collapse1: b.start + 0.22,
    pulse: b.start + 0.24,                  // the flash, landing on "second"
    label: b.start - 0.12,
  };
}

/** Screen position of HOME (the ring centre). */
function centre(v) { const h = homeAt(v); return [v.wx(h.x), v.wy(h.y)]; }

export default {
  beat: 7,
  chapter: { num: '07', title: 'Every second', sub: 'Not every minute' },
  captions: true,
  layer: 2,
  cues(d) {
    // beat-relative from the timeline would need tl; times are stable offsets from the phrases (see times())
    return [
      { t: 0.1, name: 'tick', gain: 0.16, pitch: 1.1 },
      { t: 0.75, name: 'swish', gain: 0.26, pitch: 1.3 },
      { t: 1.68, name: 'riser', gain: 0.16, pitch: 1.5 },
      { t: 2.03, name: 'impact', gain: 0.4, pitch: 1.0 },
      { t: 2.05, name: 'bloom', gain: 0.28, pitch: 0.9 },
    ];
  },

  drawWorld(c, v) {
    // the pulse wave across the city
    const T = times(v.tl);
    const u = L.prog(v.gt, T.pulse, 2.0);
    if (u <= 0 || u >= 1) return;
    const pk = planK(v);
    if (pk <= 0) return;
    const [cx, cy] = centre(v);
    const e = 1 - Math.pow(1 - u, 2.2);
    const rr = v.ws(60 + 2600 * e);
    const a = Math.pow(1 - u, 1.3) * pk;
    c.save();
    c.globalCompositeOperation = 'lighter';
    // the whole city flashes once
    c.fillStyle = L.rgba([120, 180, 255], 0.12 * Math.pow(1 - L.prog(u, 0, 0.3), 2) * pk);
    c.fillRect(0, 0, L.W, L.H);
    // the wave front (a soft annulus) and a fainter echo behind it
    for (const [rf, af] of [[1, 1]]) {
      const r1 = Math.max(1, rr * rf), r0 = Math.max(0, r1 - Math.max(26, r1 * 0.1));
      const g = c.createRadialGradient(cx, cy, r0, cx, cy, r1);
      g.addColorStop(0, L.rgba(ACC, 0));
      g.addColorStop(0.6, L.rgba([150, 205, 255], 0.38 * a * af));
      g.addColorStop(0.93, L.rgba([225, 240, 255], 0.55 * a * af));
      g.addColorStop(1, L.rgba(ACC, 0));
      c.fillStyle = g;
      c.beginPath(); c.arc(cx, cy, r1, 0, TAU); c.fill();
    }
    // hot core
    L.lightBlob(c, cx, cy, 160, [220, 238, 255], 0.9 * Math.pow(1 - L.prog(u, 0, 0.4), 2) * pk);
    c.restore();
  },

  drawOverlay(c, v) {
    const T = times(v.tl);
    const gt = v.gt;
    const [cx, cy] = centre(v);
    const ok = v.k;
    if (ok <= 0) return;
    const coll = L.ease.inCubic(L.prog(gt, T.collapse0, T.collapse1 - T.collapse0));
    const ringK = 1 - L.prog(gt, T.collapse1 - 0.02, 0.06);
    const grey = L.ease.inOutCubic(L.prog(gt, T.strike0 + 0.15, 0.45));
    const sc = 1 - coll;                                   // everything scales into the centre
    const rot = coll * 0.9;                                 // and twists a little as it goes
    const col = L.mix([215, 232, 255], [120, 128, 142], grey);
    if (ringK > 0 && gt >= T.ring0 - 0.05) {
      c.save();
      c.globalAlpha = ok * ringK;
      c.translate(cx, cy);
      c.rotate(rot);
      c.scale(Math.max(0.001, sc), Math.max(0.001, sc));
      // dark disc so the ring reads over the lights
      // a clean glass disc: solid to R*1.15, then a short fade to R*1.3, with a hairline rim at the solid edge
      const bg = c.createRadialGradient(0, 0, 0, 0, 0, R * 1.3);
      bg.addColorStop(0, 'rgba(4,8,16,0.94)');
      bg.addColorStop(1.15 / 1.3, 'rgba(4,8,16,0.94)');
      bg.addColorStop(1, 'rgba(4,8,16,0)');
      c.fillStyle = bg;
      const dk = L.ease.outCubic(L.prog(gt, T.ring0, 0.4));
      c.globalAlpha = ok * ringK * dk;
      c.beginPath(); c.arc(0, 0, R * 1.3, 0, TAU); c.fill();
      c.strokeStyle = 'rgba(200,220,245,0.16)';
      c.lineWidth = 1;
      c.beginPath(); c.arc(0, 0, R * 1.15, 0, TAU); c.stroke();
      c.globalAlpha = ok * ringK;
      // 60 ticks, drawn on clockwise from 12 o'clock
      for (let j = 0; j < 60; j++) {
        const tk = L.ease.outCubic(L.prog(gt, T.ring0 + j * 0.008, 0.2));
        if (tk <= 0) continue;
        const a = -Math.PI / 2 + (j / 60) * TAU;
        const major = j % 5 === 0;
        const r0 = R - (major ? 22 : 12) * tk, r1 = R;
        c.strokeStyle = L.rgba(col, (major ? 0.95 : 0.55) * tk);
        c.lineWidth = major ? 3.2 : 1.8;
        c.beginPath();
        c.moveTo(Math.cos(a) * r0, Math.sin(a) * r0);
        c.lineTo(Math.cos(a) * r1, Math.sin(a) * r1);
        c.stroke();
      }
      // outer hairline
      const rk = L.ease.inOutCubic(L.prog(gt, T.ring0, 0.55));
      c.strokeStyle = L.rgba(col, 0.35);
      c.lineWidth = 1.5;
      c.beginPath(); c.arc(0, 0, R + 10, -Math.PI / 2, -Math.PI / 2 + TAU * rk); c.stroke();
      // the second hand: real seconds since the ring appeared, plus its elapsed arc
      const secs = Math.max(0, gt - T.ring0) * L.ease.outCubic(L.prog(gt, T.ring0, 0.5));
      const ha = -Math.PI / 2 + (secs / 60) * TAU;
      c.strokeStyle = L.rgba(L.mix(ACC, [120, 128, 142], grey), 0.85);
      c.lineWidth = 8;
      c.lineCap = 'butt';
      c.beginPath(); c.arc(0, 0, R + 10, -Math.PI / 2, ha); c.stroke();
      c.lineCap = 'round';
      c.strokeStyle = L.rgba(L.mix([235, 245, 255], [140, 148, 160], grey), 0.9 * rk);
      c.lineWidth = 2.5;
      c.beginPath(); c.moveTo(0, 0); c.lineTo(Math.cos(ha) * (R - 30), Math.sin(ha) * (R - 30)); c.stroke();
      c.fillStyle = L.rgba(L.mix(ACC, [140, 148, 160], grey));
      c.beginPath(); c.arc(0, 0, 6, 0, TAU); c.fill();
      // "60 s" at the centre
      const tk = L.ease.outCubic(L.prog(gt, T.ring0 + 0.15, 0.4));
      c.globalAlpha = ok * ringK * tk * (1 - L.prog(coll, 0, 0.5));
      c.fillStyle = L.rgba(col);
      c.font = L.font(84, 700, L.FONT.din);
      c.textAlign = 'center';
      c.textBaseline = 'alphabetic';
      c.shadowColor = 'rgba(0,0,0,0.6)';
      c.shadowBlur = 12;
      c.fillText('60 s', 0, 92 + (1 - tk) * 14);
      c.shadowBlur = 0;
      c.globalAlpha = ok * ringK;
      // the strike: lower left to upper right, with a dark keyline
      const sk = L.ease.outCubic(L.prog(gt, T.strike0, 0.3));
      if (sk > 0) {
        const x0 = -R * 0.95, y0 = R * 0.95, x1 = L.lerp(x0, R * 0.95, sk), y1 = L.lerp(y0, -R * 0.95, sk);
        c.lineCap = 'round';
        c.strokeStyle = 'rgba(4,8,16,0.8)';
        c.lineWidth = 15;
        c.beginPath(); c.moveTo(x0, y0); c.lineTo(x1, y1); c.stroke();
        c.strokeStyle = L.rgba(STRIKE, 0.95);
        c.lineWidth = 7;
        c.beginPath(); c.moveTo(x0, y0); c.lineTo(x1, y1); c.stroke();
      }
      c.restore();
    }
    // the collapse leaves one bright point (one second) that fires the pulse
    const dotK = L.prog(gt, T.collapse0 + 0.15, 0.2) * (1 - L.prog(gt, T.pulse + 0.05, 0.5));
    if (dotK > 0) {
      c.save();
      c.globalAlpha = ok;
      L.lightBlob(c, cx, cy, 70, ACC, 0.9 * dotK);
      c.fillStyle = L.rgba([235, 245, 255], dotK);
      c.beginPath(); c.arc(cx, cy, Math.max(0, 7 * dotK + 3 * L.prog(gt, T.collapse1 - 0.1, 0.25)), 0, TAU); c.fill();
      c.restore();
    }

    // ---- label
    const lk = ok * L.prog(gt, T.label, 0.45);
    if (lk > 0) {
      c.save();
      const g = c.createRadialGradient(280, 470, 20, 280, 470, 350);
      g.addColorStop(0, 'rgba(3,6,12,0.6)');
      g.addColorStop(1, 'rgba(3,6,12,0)');
      c.globalAlpha = L.clamp(lk);
      c.fillStyle = g;
      c.fillRect(0, 120, 730, 700);
      c.restore();
      L.bigLabel(c, { x: 96, y: 520, big: 'every second', small: '8 hours of new video', k: lk, accent: ACC });
    }
  },
};
