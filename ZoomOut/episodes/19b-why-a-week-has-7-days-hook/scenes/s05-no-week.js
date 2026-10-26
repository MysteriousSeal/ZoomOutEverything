// Beat 5 — "But nothing up there takes a week. | And twice, whole countries tried to abolish it."
// Hold on the orrery. A clean "cycle ruler" draws itself low in the frame: a day axis with the three sky clocks
// pinned on it (the Earth's spin at 1 day, the Moon at 29.5, the Sun at 365¼ past an axis break). A gold 7-day
// bracket grows from 0 and looks for a body above its end: the slot stays empty and shakes, "nothing up there".
// Phrase 2 (the open loop): two ghosted rubber-stamp years, 1793 and 1929, press in, flicker and fade away (a tease
// for beats 16-17), while the ruler dims.
import * as L from '../../../../engine/runtime/lib.js';
import { ACCENT, PAPER } from '../env.js';

const TL = ((t) => (t.preroll ? { ...t, scenes: t.scenes.slice(1), lines: t.lines.slice(1) } : t))(await (await fetch(new URL('../build/timeline.json', import.meta.url))).json());   // 19b: the MAIN timeline (preroll line dropped, as main.js does)
const B = 5;
const T0 = TL.scenes[B].start;
const PH2 = (TL.lines[B].phrases?.[1]?.start ?? T0 + 2.2) - T0;   // "And twice, whole countries…"

// ruler geometry (screen px)
const AX_Y = 1168, X0 = 110, PPD = 22;            // px per day
const dx = (d) => X0 + d * PPD;
const X_BREAK = 812, X_YEAR = 880, X_END = 908;
const ICON_Y = 1104;

// timing (beat-relative s)
const T_AXIS = 0.15, T_ICONS = 0.45, T_WEEK = 0.95, T_SLOT = 1.35, T_SHAKE = 1.6, T_LABEL = 0.35;
const T_ST1 = PH2 + 0.28, T_ST2 = PH2 + 0.62, ST_LEN = 1.45;

const EARTH_C = [96, 150, 190], MOON_C = [214, 216, 222], SUN_C = [255, 206, 120];
const INK_DIM = [205, 212, 225];

function icon(c, kind, x, y, r, k) {
  if (k <= 0) return;
  c.save();
  c.globalAlpha *= k;
  if (kind === 'sun') {
    L.lightBlob(c, x, y, r * 3.2, SUN_C, 0.45);
    const g = c.createRadialGradient(x - r * 0.3, y - r * 0.3, 0, x, y, r);
    g.addColorStop(0, '#fff6e0'); g.addColorStop(0.6, '#ffd890'); g.addColorStop(1, '#f0a24c');
    c.fillStyle = g;
    c.beginPath(); c.arc(x, y, Math.max(0, r), 0, Math.PI * 2); c.fill();
  } else {
    const col = kind === 'earth' ? EARTH_C : MOON_C;
    c.beginPath(); c.arc(x, y, Math.max(0, r), 0, Math.PI * 2);
    c.fillStyle = L.rgba(L.mix(col, [10, 14, 24], 0.78)); c.fill();
    c.save(); c.clip();
    const g = c.createRadialGradient(x + r * 0.5, y + r * 0.35, r * 0.1, x + r * 0.3, y + r * 0.2, r * 1.3);
    g.addColorStop(0, L.rgba(L.mix(col, [255, 255, 255], 0.3))); g.addColorStop(0.6, L.rgba(col, 0.85)); g.addColorStop(1, L.rgba(col, 0));
    c.fillStyle = g; c.fillRect(x - r, y - r, r * 2, r * 2);
    if (kind === 'earth') {   // a hint of land
      c.fillStyle = 'rgba(150,140,100,0.45)';
      c.beginPath(); c.ellipse(x - r * 0.15, y - r * 0.1, r * 0.35, r * 0.22, 0.5, 0, Math.PI * 2); c.fill();
    }
    c.restore();
    c.strokeStyle = L.rgba(col, 0.5); c.lineWidth = 1.2;
    c.beginPath(); c.arc(x, y, Math.max(0, r), 0, Math.PI * 2); c.stroke();
  }
  c.restore();
}

function smallText(c, str, x, y, col, a, size = 22, align = 'center', weight = 600, fam = L.FONT.body, track = 2.5) {
  c.font = L.font(size, weight, fam);
  c.fillStyle = L.rgba(col, a);
  L.trackedText(c, str, x, y, track, align);
}

/** A rubber-stamp year: double frame, DIN numerals, ink speckle; pressed in (scale 1.18 → 1) with a flicker. */
function stamp(c, str, x, y, rot, t0, t, seed) {
  const lt = t - t0;
  if (lt < 0 || lt > ST_LEN) return;
  const kin = L.ease.outCubic(L.prog(lt, 0, 0.16));
  const kout = L.ease.inCubic(L.prog(lt, ST_LEN - 0.35, 0.35));
  // projector-like flicker on the way in and out (deterministic)
  const fl = lt < 0.3 || lt > ST_LEN - 0.4 ? 0.6 + 0.4 * Math.abs(Math.sin(lt * 61 + seed)) : 0.92 + 0.08 * Math.sin(lt * 23 + seed);
  const a = kin * (1 - kout) * fl;
  if (a <= 0.01) return;
  const sc = L.lerp(1.18, 1, L.ease.outBack(L.prog(lt, 0, 0.22), 1.4));
  const ink = L.mix([196, 92, 70], PAPER, 0.25);
  c.save();
  c.translate(x, y); c.rotate(rot); c.scale(sc, sc);
  c.globalAlpha *= a;
  // dark soft backing so it reads over the Sun's glow
  c.fillStyle = 'rgba(4,6,14,0.45)';
  L.roundRect(c, -170, -84, 340, 168, 18); c.fill();
  c.strokeStyle = L.rgba(ink, 0.85); c.lineWidth = 6;
  L.roundRect(c, -150, -66, 300, 132, 12); c.stroke();
  c.lineWidth = 2;
  L.roundRect(c, -138, -54, 276, 108, 8); c.stroke();
  c.font = L.font(112, 700, L.FONT.din);
  c.fillStyle = L.rgba(ink, 0.9);
  c.textBaseline = 'middle';
  L.trackedText(c, str, 0, 8, 6, 'center');
  // worn ink: knock out speckles
  c.globalCompositeOperation = 'destination-out';
  const r = L.rng(seed);
  for (let i = 0; i < 70; i++) {
    const px = -150 + r() * 300, py = -66 + r() * 132, pr = 0.6 + r() * 2.4;
    c.fillStyle = `rgba(0,0,0,${0.5 + r() * 0.5})`;
    c.beginPath(); c.arc(px, py, pr, 0, Math.PI * 2); c.fill();
  }
  c.restore();
}

export default {
  beat: B,
  chapter: { num: '05', title: 'One week?', sub: 'Nothing in the sky' },
  captions: true,
  layer: 0,
  cues(d) {
    return [
      { t: T_AXIS, name: 'swish', gain: 0.18, pitch: 1.1 },
      { t: T_LABEL + 0.05, name: 'ping', gain: 0.2, pitch: 0.95 },
      { t: T_ICONS, name: 'tick', gain: 0.16, pitch: 1.3 },
      { t: T_ICONS + 0.14, name: 'tick', gain: 0.16, pitch: 1.1 },
      { t: T_ICONS + 0.28, name: 'tick', gain: 0.16, pitch: 0.9 },
      { t: T_WEEK, name: 'riser', gain: 0.12, pitch: 1.2 },
      { t: T_SHAKE, name: 'blip', gain: 0.22, pitch: 0.6 },
      { t: T_ST1, name: 'impact', gain: 0.3, pitch: 1.05 },
      { t: T_ST2, name: 'impact', gain: 0.3, pitch: 0.9 },
      { t: T_ST2 + ST_LEN - 0.3, name: 'swish', gain: 0.12, pitch: 0.7 },
    ];
  },
  drawOverlay(c, v) {
    const t = v.t;
    const k = v.k;
    if (k <= 0.001) return;
    const kDim = 1 - 0.62 * L.ease.inOutCubic(L.prog(t, PH2 + 0.05, 0.5));
    c.save();
    c.lineCap = 'round';

    // ---------- the ruler: a soft dark backing, then the axis
    const ka = L.ease.inOutCubic(L.prog(t, T_AXIS, 0.75));
    c.save();
    c.globalAlpha = k * kDim;
    const bg = c.createLinearGradient(0, ICON_Y - 90, 0, AX_Y + 80);
    bg.addColorStop(0, 'rgba(3,5,12,0)'); bg.addColorStop(0.35, 'rgba(3,5,12,0.55)'); bg.addColorStop(0.8, 'rgba(3,5,12,0.55)'); bg.addColorStop(1, 'rgba(3,5,12,0)');
    c.fillStyle = bg;
    c.fillRect(0, ICON_Y - 90, L.W, AX_Y + 80 - (ICON_Y - 90));
    if (ka > 0) {
      const xe = L.lerp(X0, X_END, ka);
      c.strokeStyle = L.rgba(INK_DIM, 0.55); c.lineWidth = 2;
      c.beginPath(); c.moveTo(X0, AX_Y); c.lineTo(Math.min(xe, X_BREAK - 8), AX_Y);
      if (xe > X_BREAK + 8) { c.moveTo(X_BREAK + 8, AX_Y); c.lineTo(xe, AX_Y); }
      c.stroke();
      // day ticks (minor every day, major every 10)
      for (let d = 0; d <= 31; d++) {
        const x = dx(d);
        if (x > xe) break;
        const major = d % 10 === 0;
        c.strokeStyle = L.rgba(INK_DIM, major ? 0.55 : 0.22); c.lineWidth = major ? 2 : 1;
        c.beginPath(); c.moveTo(x, AX_Y - (major ? 9 : 5)); c.lineTo(x, AX_Y); c.stroke();
      }
      // axis break: two slanted strokes
      if (xe > X_BREAK) {
        c.strokeStyle = L.rgba(INK_DIM, 0.6); c.lineWidth = 2;
        for (const o of [-6, 6]) { c.beginPath(); c.moveTo(X_BREAK + o - 5, AX_Y + 10); c.lineTo(X_BREAK + o + 5, AX_Y - 10); c.stroke(); }
      }
    }
    // ---------- the three sky clocks
    const bodies = [
      { d: 1, x: dx(1), kind: 'earth', label: '1 DAY', name: 'SPIN' },
      { d: 29.5, x: dx(29.5), kind: 'moon', label: '29.5', name: 'MOON' },
      { d: 365.25, x: X_YEAR, kind: 'sun', label: '365¼', name: 'SUN' },
    ];
    bodies.forEach((b, i) => {
      const ki = L.ease.outBack(L.prog(t, T_ICONS + i * 0.14, 0.45), 1.6);
      const kf = L.clamp(ki);
      if (kf <= 0) return;
      // stem
      c.strokeStyle = L.rgba(INK_DIM, 0.4 * kf); c.lineWidth = 1.2;
      c.beginPath(); c.moveTo(b.x, AX_Y - 2); c.lineTo(b.x, L.lerp(AX_Y - 2, ICON_Y + 18, kf)); c.stroke();
      c.fillStyle = L.rgba(INK_DIM, 0.9 * kf);
      c.beginPath(); c.arc(b.x, AX_Y, 4, 0, Math.PI * 2); c.fill();
      const bob = 2 * Math.sin(v.gt * 1.6 + i * 2);
      icon(c, b.kind, b.x, ICON_Y + bob - (1 - kf) * 14, 17 * Math.max(0, ki), kf);
      smallText(c, b.label, b.x, AX_Y + 40, [235, 230, 222], 0.92 * kf, 30, 'center', 700, L.FONT.din, 1.5);
    });
    c.restore();

    // ---------- the week: a gold bracket grows 0 → 7, then an empty slot above its end
    c.save();
    c.globalAlpha = k * L.lerp(1, 0.55, 1 - kDim);
    const kw = L.ease.inOutCubic(L.prog(t, T_WEEK, 0.5));
    if (kw > 0) {
      const xe = L.lerp(X0, dx(7), kw);
      L.glow(c, ACCENT, 10, () => {
        c.strokeStyle = L.rgba(ACCENT, 0.95); c.lineWidth = 5;
        c.beginPath(); c.moveTo(X0, AX_Y); c.lineTo(xe, AX_Y); c.stroke();
      });
      c.fillStyle = L.rgba(ACCENT);
      for (const x of [X0, xe]) { c.fillRect(x - 1.5, AX_Y - 11, 3, 22); }
      // seven day pips along the bracket
      for (let d = 1; d <= 7; d++) {
        const kp = L.ease.outBack(L.prog(t, T_WEEK + 0.05 + d * 0.05, 0.25), 2);
        if (kp <= 0) continue;
        c.fillStyle = L.rgba(ACCENT, 0.95);
        c.beginPath(); c.arc(dx(d - 0.5), AX_Y - 15, Math.max(0, 2.8 * kp), 0, Math.PI * 2); c.fill();
      }
      smallText(c, '7', dx(7), AX_Y + 40, ACCENT, kw, 30, 'center', 700, L.FONT.din, 0);
    }
    const ks = L.ease.outCubic(L.prog(t, T_SLOT, 0.4));
    if (ks > 0) {
      // damped shake on "a week": the slot finds nothing
      const st = t - T_SHAKE;
      const shake = st > 0 ? Math.sin(st * 42) * 7 * Math.exp(-st * 5.5) : 0;
      const sx = dx(7) + shake, sy = ICON_Y;
      const failed = L.ease.inOutCubic(L.prog(t, T_SHAKE + 0.2, 0.5));
      const col = L.mix(ACCENT, [150, 140, 125], failed * 0.6);
      c.strokeStyle = L.rgba(col, 0.7 * ks); c.lineWidth = 1.2;
      c.setLineDash([4, 5]);
      c.beginPath(); c.moveTo(dx(7), AX_Y - 20); c.lineTo(sx, L.lerp(AX_Y - 20, sy + 22, ks)); c.stroke();
      c.lineWidth = 2;
      c.lineDashOffset = -v.gt * 12;
      c.beginPath(); c.arc(sx, sy, Math.max(0, 19 * ks), 0, Math.PI * 2); c.stroke();
      c.setLineDash([]);
      c.font = L.font(26, 700, L.FONT.display);
      c.fillStyle = L.rgba(col, 0.9 * ks);
      c.textAlign = 'center'; c.textBaseline = 'middle';
      c.fillText('?', sx, sy + 1);
    }
    c.restore();

    // ---------- the label (top right: the Earth sits top left at this framing)
    const kl = k * L.enter(t, T_LABEL, 0.55) * L.lerp(1, 0.7, 1 - kDim);
    if (kl > 0) {
      // soft dark halo so the orbit hairline does not cut through the label
      c.save();
      c.globalAlpha = L.clamp(kl * 1.4);
      c.translate(720, 460); c.scale(1.85, 1);
      const hg = c.createRadialGradient(0, 0, 0, 0, 0, 190);
      hg.addColorStop(0, 'rgba(3,5,12,0.92)'); hg.addColorStop(0.55, 'rgba(3,5,12,0.82)'); hg.addColorStop(1, 'rgba(3,5,12,0)');
      c.fillStyle = hg;
      c.beginPath(); c.arc(0, 0, 190, 0, Math.PI * 2); c.fill();
      c.restore();
    }
    L.bigLabel(c, { x: 960, y: 470, big: '7 DAYS?', small: 'matches nothing in the sky', k: kl, accent: ACCENT, align: 'right', size: 104 });

    // ---------- the open loop: two ghost stamps
    c.globalAlpha = k;
    stamp(c, '1793', 330, 735, -0.12, T_ST1, t, 17);
    stamp(c, '1929', 735, 945, 0.09, T_ST2, t, 29);
    c.restore();
  },
};
