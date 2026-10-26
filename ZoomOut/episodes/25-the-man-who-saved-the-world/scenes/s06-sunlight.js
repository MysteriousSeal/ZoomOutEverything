// Beat 6 — "He was right. | Sunlight on high clouds had fooled the satellites. | The story stayed secret for fifteen
//          years."   (52.50–61.18 with the v4 voice; every time below is derived from the timeline / env.moments)
// Camera 'orbit' (2.2 s): globe r 150 at (420, 1130); 'secret' drifts it to r 135 at (470, 1190) on phrase 2. env draws
// the Sun's glow (off-screen lower left, sunK) and the real terminator. This file draws (drawWorld, world-anchored):
//   · the Molniya ellipse (env.traceOrbit), drawing itself on from beat + 0.3 s as the camera pulls out;
//   · the Oko satellite near apogee (env.satPos): gold-foil bus, telescope + sunshade aimed at the Earth, two
//     solar-cell wings on a boom, a dish and whip antennas — drawn, not a box. Its sensor flashes red when the glints
//     arrive;
//   · phrase 1: five sunbeams from the Sun reach five high clouds over the US plains (env.GLINTS), the clouds
//     sparkle, and the reflections travel up to the satellite's sensor (env.glintRay).
// Overlay (opaque plates; positions clear of the orbit line, the rays and the caption band):
//   SUNLIGHT ON / HIGH CLOUDS  (right of the globe, leader to the clouds)          phrase 1 + 0.4, out before phrase 2
//   WHAT THE SATELLITE SAW / 5 LAUNCHES (top right, leader down to the satellite)       phrase 1 + 0.88, out before phrase 2
//   phrase 2 (moments.secret): a CLASSIFIED file card, top (y 400–≈700): СЕКРЕТНО · CLASSIFIED / SECRET UNTIL 1998 and
//     a 15-tick year rule 1983 → 1998 that fills over "for fifteen years" (moments.years; integer ticks: frame-stable).
// Beat 7: the satellite and rays fade out with this beat's end (the question card arrives opaque); the orbit stays as
// a faint line around the small globe under the card.
import * as L from '../../../../engine/runtime/lib.js';
import { ACCENT, AMBER, COLD, cyr, moments, globeView, traceOrbit, satPos, glintRay, GLINTS, sunK, sunDot } from '../env.js';

/** Stroke a sunbeam A→B in short pieces, each piece's alpha × (caption band y 1380–1520: 0.3) × (over the globe disc:
 *  0.22, feathered at the limb), so the incoming light never cuts the caption letters or reads as a line through the Earth. */
function beam(c, view, ax, ay, bx, by, col, a, width) {
  const n = 36;
  c.lineWidth = width;
  for (let k = 0; k < n; k++) {
    const u0 = k / n, u1 = (k + 1) / n, um = (u0 + u1) / 2;
    const mx = L.lerp(ax, bx, um), my = L.lerp(ay, by, um);
    const band = 1 - 0.7 * L.smoothstep(L.clamp((my - 1350) / 30)) * (1 - L.smoothstep(L.clamp((my - 1520) / 30)));
    const dr = Math.hypot(mx - view.cx, my - view.cy) / Math.max(1, view.r);
    const disc = L.lerp(0.22, 1, L.smoothstep(L.clamp((dr - 0.96) / 0.1)));
    const ka = a * band * disc;
    if (ka <= 0.002) continue;
    c.strokeStyle = L.rgba(col, ka);
    c.beginPath(); c.moveTo(L.lerp(ax, bx, u0), L.lerp(ay, by, u0)); c.lineTo(L.lerp(ax, bx, u1), L.lerp(ay, by, u1)); c.stroke();
  }
}

/** Deterministic puff layout of each glint's high-cloud deck: [dx, dy, r, a] in units of the deck size. */
const PUFFS = (() => { const r = L.rng(2609), out = []; for (let i = 0; i < GLINTS.length; i++) { const p = []; for (let j = 0; j < 7; j++) p.push([(r() - 0.5) * 2.2, (r() - 0.5) * 0.9, 0.35 + r() * 0.45, 0.55 + r() * 0.45]); out.push(p); } return out; })();
/** A high-cloud deck: soft, feathered puffs (no hard edge), peak opacity ≈ 0.75, lit by the Sun at that spot. */
function cloudDeck(c, x, y, size, i, k, lit) {
  if (k <= 0 || size <= 0) return;
  const col = L.mix([70, 78, 92], [246, 240, 228], lit);
  c.save();
  c.translate(x, y);
  c.rotate(-0.4);
  for (const [dx, dy, r, a] of PUFFS[i]) {
    const R = Math.max(0.5, r * size);
    const g = c.createRadialGradient(dx * size, dy * size, 0, dx * size, dy * size, R);
    g.addColorStop(0, L.rgba(col, 0.42 * a * k));
    g.addColorStop(0.5, L.rgba(col, 0.24 * a * k));
    g.addColorStop(1, L.rgba(col, 0));
    c.fillStyle = g;
    c.fillRect(dx * size - R, dy * size - R, 2 * R, 2 * R);
  }
  c.restore();
}

const TAU = Math.PI * 2;
const SUNLIGHT = [255, 236, 196];
const SAT_S = 1.45;                       // satellite drawing scale (≈ 190 px wing to wing)

/** beat-relative time of phrase j of line 6 */
const ph = (v, j) => v.tl.lines[6].phrases[j].start - v.tl.scenes[6].start;
/** timing (beat-relative, from phrase 1) */
const T = (v) => {
  const p1 = ph(v, 1);
  return { beam: p1 - 0.1, cloud: p1 + 0.35, refl: p1 + 0.45, hit: p1 + 0.95, labA: p1 + 0.4, labB: p1 + 0.88 };
};

/** The Oko (US-K) satellite, drawn in local px (scale s), its telescope (+x) aimed along `ang`. */
function drawOko(c, x, y, s, ang, flash) {
  c.save();
  c.translate(x, y);
  c.rotate(ang);
  c.scale(s, s);
  c.lineJoin = 'round';
  // ---- solar wings on a boom, perpendicular to the bus axis
  c.strokeStyle = 'rgb(150,156,160)'; c.lineWidth = 1.6;
  c.beginPath(); c.moveTo(-6, -12); c.lineTo(-6, -24); c.moveTo(-6, 12); c.lineTo(-6, 24); c.stroke();
  for (const sg of [-1, 1]) {
    const y0 = sg < 0 ? -24 - 44 : 24, wx = -17, ww = 22, wh = 44;
    const g = c.createLinearGradient(wx, y0, wx + ww, y0 + wh);
    g.addColorStop(0, 'rgb(38,58,112)'); g.addColorStop(0.5, 'rgb(64,92,160)'); g.addColorStop(1, 'rgb(28,42,86)');
    c.fillStyle = g;
    c.fillRect(wx, y0, ww, wh);
    c.strokeStyle = 'rgba(200,215,240,0.55)'; c.lineWidth = 0.6;
    c.beginPath();
    for (let i = 1; i < 4; i++) { c.moveTo(wx + (ww * i) / 4, y0); c.lineTo(wx + (ww * i) / 4, y0 + wh); }
    for (let j = 1; j < 8; j++) { c.moveTo(wx, y0 + (wh * j) / 8); c.lineTo(wx + ww, y0 + (wh * j) / 8); }
    c.stroke();
    c.strokeStyle = 'rgb(176,184,190)'; c.lineWidth = 1.2;
    c.strokeRect(wx, y0, ww, wh);
    // sun glint on the cells
    c.fillStyle = 'rgba(255,240,210,0.28)';
    c.fillRect(wx + 1, y0 + (sg < 0 ? wh * 0.55 : 2), ww - 2, wh * 0.18);
  }
  // ---- bus: gold-foil cylinder (seen side-on) with band rings
  const bg = c.createLinearGradient(0, -12, 0, 12);
  bg.addColorStop(0, 'rgb(250,214,130)'); bg.addColorStop(0.35, 'rgb(214,160,62)'); bg.addColorStop(0.7, 'rgb(150,100,34)'); bg.addColorStop(1, 'rgb(96,62,22)');
  c.fillStyle = bg;
  L.roundRect(c, -26, -12, 30, 24, 3); c.fill();
  c.strokeStyle = 'rgba(70,44,12,0.7)'; c.lineWidth = 0.8;
  c.beginPath();
  for (const bx of [-18, -10, -2]) { c.moveTo(bx, -12); c.lineTo(bx, 12); }
  c.stroke();
  // foil crinkle highlights (fixed pattern)
  c.strokeStyle = 'rgba(255,240,190,0.55)'; c.lineWidth = 0.7;
  c.beginPath(); c.moveTo(-24, -7); c.lineTo(-19, -9); c.lineTo(-14, -6); c.moveTo(-8, -8); c.lineTo(-3, -6); c.stroke();
  // aft radiator + dish (points away from the Earth)
  c.fillStyle = 'rgb(206,210,212)';
  c.fillRect(-32, -9, 6, 18);
  c.fillStyle = 'rgb(230,232,234)';
  c.beginPath(); c.ellipse(-37, 0, 3, 8, 0, 0, TAU); c.fill();
  c.strokeStyle = 'rgb(120,124,128)'; c.lineWidth = 0.8; c.stroke();
  c.strokeStyle = 'rgb(200,204,206)'; c.lineWidth = 0.9;
  c.beginPath(); c.moveTo(-37, 0); c.lineTo(-43, 0); c.moveTo(-20, 12); c.lineTo(-24, 21); c.moveTo(-16, -12); c.lineTo(-12, -22); c.stroke();
  // ---- telescope: collar, tube, flared sunshade, dark aperture
  c.fillStyle = 'rgb(120,126,130)';
  c.fillRect(4, -8, 4, 16);
  const tg = c.createLinearGradient(0, -7, 0, 7);
  tg.addColorStop(0, 'rgb(236,238,240)'); tg.addColorStop(0.5, 'rgb(190,194,198)'); tg.addColorStop(1, 'rgb(110,114,118)');
  c.fillStyle = tg;
  c.beginPath(); c.moveTo(8, -6.5); c.lineTo(30, -6.5); c.lineTo(38, -9.5); c.lineTo(38, 9.5); c.lineTo(30, 6.5); c.lineTo(8, 6.5); c.closePath(); c.fill();
  c.strokeStyle = 'rgba(60,64,68,0.8)'; c.lineWidth = 0.6;
  c.beginPath(); c.moveTo(16, -6.5); c.lineTo(16, 6.5); c.moveTo(24, -6.5); c.lineTo(24, 6.5); c.moveTo(30, -6.5); c.lineTo(30, 6.5); c.stroke();
  c.fillStyle = 'rgb(12,14,18)';
  c.beginPath(); c.ellipse(38, 0, 2.2, 9, 0, 0, TAU); c.fill();
  c.restore();
  // the sensor's red flash (screen space, at the aperture)
  if (flash > 0) {
    const ax = x + Math.cos(ang) * 38 * s, ay = y + Math.sin(ang) * 38 * s;
    L.lightBlob(c, ax, ay, 40 * s, [255, 70, 50], flash);
    L.lightBlob(c, ax, ay, 14 * s, [255, 220, 200], flash);
  }
}

/** a 4-point glint star */
function sparkle(c, x, y, r, a) {
  if (a <= 0 || r <= 0) return;
  L.lightBlob(c, x, y, r * 1.4, [255, 246, 220], 0.85 * a);
  c.save();
  c.globalCompositeOperation = 'lighter';
  c.fillStyle = L.rgba([255, 250, 236], a);
  for (const [dx, dy] of [[1, 0], [0, 1]]) {
    c.beginPath();
    c.moveTo(x - dx * r, y - dy * r); c.lineTo(x + dy * r * 0.08, y - dx * r * 0.08);
    c.lineTo(x + dx * r, y + dy * r); c.lineTo(x - dy * r * 0.08, y + dx * r * 0.08); c.closePath(); c.fill();
  }
  c.restore();
}

/** label plate: small caps line + big line; returns the plate rect */
function plate(c, x, y, small, big, bigCol, k, { size = 56, w = null, right = false } = {}) {
  c.save();
  c.font = L.font(size, 800, L.FONT.display);
  const bw = c.measureText(big).width;
  c.font = L.font(22, 700, L.FONT.body);
  c.letterSpacing = '4px';
  const sw = c.measureText(small).width;
  c.letterSpacing = '0px';
  const W0 = w ?? Math.max(bw, sw) + 44, H0 = size + 62;
  if (right) x -= W0;   // x = the plate's right edge
  const e = L.ease.outCubic(L.clamp(k));
  c.globalAlpha = L.clamp(k * 1.4);
  c.translate(0, (1 - e) * 14);
  c.fillStyle = 'rgba(5,9,14,0.9)';
  L.roundRect(c, x, y, W0, H0, 10); c.fill();
  c.fillStyle = L.rgba(bigCol);
  c.fillRect(x, y + 12, 4, H0 - 24);
  c.textBaseline = 'alphabetic'; c.textAlign = 'left';
  c.font = L.font(22, 700, L.FONT.body);
  c.fillStyle = 'rgba(214,222,232,0.95)';
  L.trackedText(c, small, x + 22, y + 36, 4, 'left');
  c.font = L.font(size, 800, L.FONT.display);
  c.fillStyle = L.rgba(bigCol);
  c.fillText(big, x + 20, y + 36 + 14 + size * 0.8);
  c.restore();
  return { x, y, w: W0, h: H0 };
}

/** Phrase 2: the classified file card (screen space, top band). */
function secretCard(c, v, m, tS) {
  const kOut = 1 - L.ease.inCubic(L.prog(v.t, v.d - 0.42, 0.36));     // gone 0.06 s before beat 7's opaque card
  const k = Math.min(v.k, kOut) * L.ease.outCubic(L.prog(v.t, tS, 0.45));
  if (k <= 0) return;
  const x = 80, w = 860, y = 400 + (1 - k) * 16, pad = 40, h = 300;
  c.save();
  c.globalAlpha = L.clamp(k * 1.3);
  c.shadowColor = 'rgba(0,0,0,0.6)'; c.shadowBlur = 36;
  c.fillStyle = 'rgb(10,13,15)';
  L.roundRect(c, x, y, w, h, 14); c.fill();
  c.shadowBlur = 0;
  c.strokeStyle = L.rgba(ACCENT, 0.55); c.lineWidth = 1.5;
  L.roundRect(c, x + 0.75, y + 0.75, w - 1.5, h - 1.5, 14); c.stroke();
  // kicker: СЕКРЕТНО (stamped red box) · CLASSIFIED
  c.textBaseline = 'middle'; c.textAlign = 'left';
  c.font = cyr(30, 700);
  const kw = c.measureText('СЕКРЕТНО').width + 7 * 3 + 30;
  c.strokeStyle = L.rgba([255, 96, 80]); c.lineWidth = 3;
  c.strokeRect(x + pad, y + 32, kw, 44);
  c.fillStyle = L.rgba([255, 96, 80]);
  L.trackedText(c, 'СЕКРЕТНО', x + pad + 14, y + 55, 3, 'left');
  c.font = L.font(24, 700, L.FONT.body);
  c.fillStyle = 'rgba(214,222,232,0.9)';
  L.trackedText(c, 'CLASSIFIED', x + pad + kw + 22, y + 55, 5, 'left');
  // headline
  c.textBaseline = 'alphabetic';
  const A = 'SECRET UNTIL ', Bw = '1998';
  const fs = L.fitSize(c, A + Bw, w - 2 * pad, 92, 800, L.FONT.display, 50);
  c.font = L.font(fs, 800, L.FONT.display);
  c.fillStyle = L.rgba(COLD);
  const hy = y + 96 + fs * 0.82;
  c.fillText(A, x + pad, hy);
  c.fillStyle = L.rgba(AMBER);
  c.fillText(Bw, x + pad + c.measureText(A).width, hy);
  // the year rule: 15 ticks, 1983 → 1998, filling over "for fifteen years"
  const ry = y + h - 52, rx0 = x + pad + 108, rx1 = x + w - pad - 108;
  const f = Math.round(v.gt * 30), f0 = Math.round(m.years[0] * 30), f1 = Math.round(m.years[1] * 30);
  const n = f < f0 ? 0 : Math.min(15, Math.floor((15 * (f - f0)) / Math.max(1, f1 - f0)) + 1);
  c.font = L.font(34, 700, L.FONT.din);
  c.fillStyle = L.rgba(COLD, 0.92);
  c.textAlign = 'left';
  c.fillText('1983', x + pad, ry + 12);
  c.textAlign = 'right';
  c.fillStyle = L.rgba(n >= 15 ? AMBER : [150, 156, 160]);
  c.fillText('1998', x + w - pad, ry + 12);
  const step = (rx1 - rx0) / 15;
  c.fillStyle = 'rgba(214,222,232,0.18)';
  c.fillRect(rx0, ry - 1, rx1 - rx0, 2);
  for (let i = 0; i < 15; i++) {
    const on = i < n;
    c.fillStyle = on ? L.rgba(L.mix([255, 96, 80], AMBER, i / 14)) : 'rgba(214,222,232,0.16)';
    c.fillRect(rx0 + i * step + 3, ry - 12, step - 6, 24);
  }
  c.restore();
}

export default {
  beat: 6,
  chapter: { num: '04', title: 'The cause', sub: 'Oko satellite · Molniya orbit' },
  layer: 3,
  cues() {
    return [];   // glint + secret cues are tied to words: env.cues(tl) from env.moments
  },
  drawWorld(c, v) {
    const ok = sunK(v.gt, v.tl);
    if (ok <= 0) return;
    const view = globeView(v);
    const tm = T(v);
    const endK = v.t > v.d - 0.4 ? 1 - L.ease.inCubic(L.prog(v.t, v.d - 0.4, 0.4)) : 1;   // satellite + rays leave with beat 6
    // ---- the orbit: draws itself on, then stays (faint in beat 7)
    const draw = L.ease.inOutCubic(L.prog(v.t, 0.3, 1.6));
    if (draw > 0) {
      c.save();
      c.beginPath();
      // reveal by angle around the globe centre, starting from the satellite (clip wedge)
      const s0 = satPos(view, v.gt, v.tl);
      const a0 = Math.atan2(s0.y - view.cy, s0.x - view.cx);
      c.moveTo(view.cx, view.cy);
      c.arc(view.cx, view.cy, 4000, a0 - draw * Math.PI - 0.01, a0 + draw * Math.PI + 0.01);
      c.closePath();
      c.clip();
      const beat7 = v.t > v.d ? L.lerp(1, 0.45, L.prog(v.t, v.d, 0.6)) : 1;
      c.strokeStyle = L.rgba([200, 216, 232], 0.5 * ok * beat7);
      c.lineWidth = 1.6;
      c.setLineDash([7, 7]);
      c.beginPath(); traceOrbit(c, view); c.stroke();
      c.setLineDash([]);
      c.restore();
    }
    if (endK <= 0) return;
    // ---- sunbeams → clouds → satellite
    const sat = satPos(view, v.gt, v.tl);
    const bk = L.prog(v.t, tm.beam, 0.5);
    if (bk > 0) {
      c.save();
      c.globalCompositeOperation = 'lighter';
      c.lineCap = 'round';
      GLINTS.forEach((_, i) => {
        const g = glintRay(view, i, v.gt, v.tl);
        const st = L.ease.outCubic(L.prog(v.t, tm.beam + i * 0.05, 0.5));
        if (st <= 0) return;
        const hx = L.lerp(g.sun.x, g.cloud.x, st), hy = L.lerp(g.sun.y, g.cloud.y, st);
        // incoming sunlight: soft wide beam + fine core (faded over the caption band and over the globe disc)
        c.lineCap = 'butt';
        beam(c, view, g.sun.x, g.sun.y, hx, hy, SUNLIGHT, 0.05 * endK, 16);
        beam(c, view, g.sun.x, g.sun.y, hx, hy, SUNLIGHT, 0.4 * endK, 1.2);
        c.lineCap = 'round';
        // the reflection up to the sensor: a bright pulse with a fading tail
        const rk = L.prog(v.t, tm.refl + i * 0.07, 0.55);
        if (rk > 0) {
          const e = L.ease.inOutCubic(rk);
          const px = L.lerp(g.cloud.x, sat.x, e), py = L.lerp(g.cloud.y, sat.y, e);
          const grad = c.createLinearGradient(g.cloud.x, g.cloud.y, px, py);
          grad.addColorStop(0, L.rgba([255, 214, 150], 0.25 * endK));
          grad.addColorStop(1, L.rgba([255, 240, 210], 0.85 * endK));
          c.strokeStyle = grad;
          c.lineWidth = 1.6;
          c.beginPath(); c.moveTo(g.cloud.x, g.cloud.y); c.lineTo(px, py); c.stroke();
          if (rk < 1) L.lightBlob(c, px, py, 12, [255, 236, 200], 0.9 * endK);
        }
      });
      c.restore();
      // high clouds + their glints
      GLINTS.forEach((_, i) => {
        const g = glintRay(view, i, v.gt, v.tl);
        const ck = L.ease.inOutCubic(L.prog(v.t, tm.beam - 0.3, 0.6)) * endK;
        const lit = L.smoothstep(L.clamp((sunDot(GLINTS[i].lat, GLINTS[i].lon) + 0.05) / 0.35));
        cloudDeck(c, g.cloud.x + 2, g.cloud.y, Math.max(3, view.r * 0.05), i, ck, lit);
        const sk = L.prog(v.t, tm.cloud + i * 0.06, 0.25) * endK;
        const tw = 0.8 + 0.2 * Math.sin(v.t * TAU * 1.1 + i * 1.7);
        sparkle(c, g.cloud.x, g.cloud.y, 9 * tw * L.ease.outBack(L.clamp(sk)), L.clamp(sk));
      });
    }
    // ---- the satellite: aimed at the glint clouds
    const sk = L.ease.outCubic(L.prog(v.t, 0.35, 0.7)) * ok * endK;
    if (sk > 0) {
      const tgt = glintRay(view, 0, v.gt, v.tl).cloud;
      const ang = Math.atan2(tgt.y - sat.y, tgt.x - sat.x);
      const flash = L.prog(v.t, tm.hit, 0.12) * (0.55 + 0.45 * Math.cos((v.t - tm.hit) * TAU * 0.9)) * endK;
      c.save();
      c.globalAlpha = sk;
      L.lightBlob(c, sat.x, sat.y, 80, [200, 220, 255], 0.12);
      drawOko(c, sat.x, sat.y, SAT_S, ang, v.t > tm.hit ? flash : 0);
      c.restore();
    }
  },
  drawOverlay(c, v) {
    const view = globeView(v);
    const tm = T(v);
    const m = moments(v.tl), tS = m.secret - v.tl.scenes[6].start;
    const lout = 1 - L.ease.inCubic(L.prog(v.t, tS - 0.45, 0.3));          // phrase-1 labels leave before the file card
    // ---- SUNLIGHT ON HIGH CLOUDS: inside the ellipse, right of the globe
    const kA = v.k * L.enter(v.t, tm.labA, 0.5) * lout;
    if (kA > 0) {
      const g = glintRay(view, 2, v.gt, v.tl).cloud;
      const r = plate(c, 598, 1092, 'SUNLIGHT ON', 'HIGH CLOUDS', SUNLIGHT, kA, { size: 46 });
      L.leader(c, g.x + 10, g.y + 4, r.x, r.y + r.h - 22, kA, SUNLIGHT, 0.7);
    }
    // ---- WHAT THE SATELLITE SAW: 5 LAUNCHES: top left, leader to the satellite
    const kB = v.k * L.enter(v.t, tm.labB, 0.5) * lout;
    if (kB > 0) {
      const s = satPos(view, v.gt, v.tl);
      const r = plate(c, 940, 390, 'WHAT THE SATELLITE SAW', '5 LAUNCHES', [255, 92, 72], kB, { size: 64, right: true });
      L.leader(c, s.x, s.y - 30, r.x + r.w - 60, r.y + r.h, kB, [255, 150, 130], 0.7);
    }
    secretCard(c, v, m, tS);
  },
};
