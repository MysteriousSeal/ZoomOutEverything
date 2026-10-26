// Beat 3 — "Atoms are crushed so hard | that protons and electrons merge into neutrons, packed shoulder to shoulder."
// The camera dives into the star; an opaque "inside" backdrop takes over (layer 10, screen space) and a clean particle
// diagram plays on it:
//   phrase 0: an ATOM (nucleus of 6 protons + 6 neutrons in an electron cloud) appears; on "crushed" chevrons press
//             in and the cloud shrinks.
//   phrase 1: each electron spirals into a proton, which flashes and turns into a neutron (equation PROTON +
//             ELECTRON → NEUTRON, drawn arrow); on "packed" the field fills with neutrons packed shoulder to shoulder
//             (hex lattice, spacing → LAT_END). At the beat end the lattice is exactly the one inside the spoon's
//             dollop (beat 4 pulls out of it).
import * as L from '../../../../engine/runtime/lib.js';
import { ACCENT, PROTON, ELECTRON, GAP, LAT_END, drawLattice, particle, dollopScreen, phraseGt, wordGt } from '../env.js';
import { DOLLOP_SCREEN } from '../camera.js';
import { LAT_O3 } from './s00-hook.js';

const { W, H, ease, clamp, prog } = L;
const SN = 44;                 // nucleus spacing (px)
const RC0 = 340;               // electron cloud radius
const site = (i, j, sp, ox, oy) => ({ x: ox + i * sp + ((j & 1) ? sp / 2 : 0), y: oy + j * sp * 0.8660254 });
// the 12 lattice sites nearest the centre (row 0 is even)
const NUC = (() => {
  const all = [];
  for (let j = -3; j <= 3; j++) for (let i = -3; i <= 3; i++) {
    const p = site(i, j, 1, 0, 0);
    all.push({ i, j, d: Math.hypot(p.x, p.y), a: Math.atan2(p.y, p.x) });
  }
  all.sort((p, q) => p.d - q.d || p.a - q.a);
  return all.slice(0, 12).map((s, k) => ({ ...s, p: k % 2 === 1 }));
})();
const PROTONS = NUC.filter((s) => s.p);
const NUCSET = new Set(NUC.map((s) => `${s.i},${s.j}`));
const ORB = [   // electron orbits: [radius factor, ellipse ratio, tilt, speed, phase]
  [0.55, 0.38, 0.5, 1.6, 0], [0.55, 0.38, 0.5, 1.6, Math.PI],
  [0.82, 0.42, -0.6, 1.1, 1], [0.82, 0.42, -0.6, 1.1, 1 + Math.PI],
  [0.95, 0.3, 1.6, 0.9, 2.2], [0.95, 0.3, 1.6, 0.9, 2.2 + Math.PI],
];

function times(tl) {
  const b3 = tl.scenes[3].start, b4 = tl.scenes[4].start;
  return {
    b3, b4,
    p0: phraseGt(tl, 3, 0), p1: phraseGt(tl, 3, 1),
    crush: wordGt(tl, 3, 0, 2),
    merge: wordGt(tl, 3, 1, 4),
    packed: wordGt(tl, 3, 1, 7),
    cut: b3 + 1.6,
    dis: b3 - 0.03,   // dissolve start (the dive camera starts at b3 − 0.3)
  };
}
const arrive = (T, n) => T.p1 + 0.25 + n * 0.22 + 0.9;   // electron n reaches its proton

function arrow(c, x0, y, x1, col) {
  c.strokeStyle = col; c.lineWidth = 5; c.lineCap = 'round'; c.lineJoin = 'round';
  c.beginPath(); c.moveTo(x0, y); c.lineTo(x1, y); c.moveTo(x1 - 14, y - 12); c.lineTo(x1, y); c.lineTo(x1 - 14, y + 12); c.stroke();
}

export default {
  beat: 3,
  chapter: { num: '03', title: 'Neutron matter', sub: 'Atoms crushed into neutrons' },
  layer: 10,
  cues(d) {
    void d;
    return [];
  },
  drawWorld(c, v) {
    const gt = v.gt, tl = v.tl;
    const T = times(tl);
    if (gt < T.dis - 0.01 || gt >= T.b4) return;
    // the inside backdrop + atom cross-dissolve in while the swelling star still covers ≈ 50–80 % of the frame
    const bk = L.smoothstep(prog(gt, T.dis, 0.2));
    if (bk <= 0) return;
    const off = { x: 0, y: 0 };
    const ok = L.smoothstep(prog(gt, T.cut + 0.05, 1.0));
    if (ok > 0) { const D = dollopScreen(v); off.x = (D.x - DOLLOP_SCREEN.x) * ok; off.y = (D.y - DOLLOP_SCREEN.y) * ok; }
    const C = { x: LAT_O3.x + off.x, y: LAT_O3.y + off.y };
    const packK = ease.inOutCubic(prog(gt, T.packed - 0.15, T.b4 - T.packed + 0.15));
    c.save();
    c.globalAlpha = bk;
    c.fillStyle = L.rgba(GAP);
    c.fillRect(-10, -10, W + 20, H + 20);
    // inner glow (fades as the lattice takes over)
    const glowK = 1 - packK;
    if (glowK > 0) {
      const g = c.createRadialGradient(C.x, C.y, 40, C.x, C.y, 950);
      g.addColorStop(0, `rgba(40,80,170,${0.45 * glowK})`); g.addColorStop(0.6, `rgba(20,40,100,${0.25 * glowK})`); g.addColorStop(1, 'rgba(7,14,36,0)');
      c.fillStyle = g; c.fillRect(0, 0, W, H);
    }
    c.restore();
    // ---------------- atom (dissolves in with the backdrop)
    const aK = ease.outCubic(prog(gt, T.dis + 0.02, 0.4));
    if (aK <= 0) return;
    const scale = L.lerp(0.72, 1, aK);
    const sq = ease.inOutCubic(prog(gt, T.crush - 0.05, 1.4));
    const RC = L.lerp(RC0, 150, sq) * scale;
    const cloudK = aK * (1 - L.smoothstep(prog(gt, T.merge - 0.3, 1.0)));
    c.save();
    c.globalAlpha = aK;
    if (cloudK > 0) {
      const g = c.createRadialGradient(C.x, C.y, 0, C.x, C.y, RC);
      g.addColorStop(0, `rgba(120,215,240,${0.2 * cloudK})`); g.addColorStop(0.65, `rgba(90,190,230,${0.12 * cloudK})`); g.addColorStop(1, 'rgba(80,170,220,0)');
      c.fillStyle = g; c.beginPath(); c.arc(C.x, C.y, RC, 0, Math.PI * 2); c.fill();
      c.strokeStyle = `rgba(150,230,240,${0.16 * cloudK})`; c.lineWidth = 1.5;
      for (const [rf, er, tilt] of ORB.filter((_, i) => i % 2 === 0)) {
        c.beginPath(); c.ellipse(C.x, C.y, Math.max(0, RC * rf), Math.max(0, RC * rf * er), tilt, 0, Math.PI * 2); c.stroke();
      }
    }
    // squeeze chevrons
    const chK = Math.sin(Math.PI * clamp(prog(gt, T.crush - 0.15, T.p1 + 0.3 - T.crush))) * aK;
    if (chK > 0.01) {
      for (const q of [0, 2]) {   // left + right only (top/bottom would cross the title and legend)
        const a = (q * Math.PI) / 2;
        const d = RC + 70 + 30 * (1 - sq);
        c.save();
        c.translate(C.x + Math.cos(a) * d, C.y + Math.sin(a) * d); c.rotate(a + Math.PI);
        c.strokeStyle = L.rgba([230, 240, 255], 0.85 * chK); c.lineWidth = 6; c.lineCap = 'round'; c.lineJoin = 'round';
        for (let m = 0; m < 2; m++) {
          c.beginPath(); c.moveTo(-14 + m * 22, -22); c.lineTo(8 + m * 22, 0); c.lineTo(-14 + m * 22, 22); c.stroke();
        }
        c.restore();
      }
    }
    // nucleus (until the lattice takes over) + conversions
    const jig = (k, s) => L.noise1(gt * 2.2 + k * 3.1, s) * 2.2 * (1 - sq * 0.5);
    if (gt < T.packed - 0.15) {
      const sp = SN * scale;
      NUC.forEach((s, k) => {
        const p = site(s.i, s.j, sp, C.x, C.y);
        let toN = 1;
        if (s.p) {
          const n = PROTONS.indexOf(s);
          toN = ease.inOutCubic(prog(gt, arrive(T, n), 0.35));
        }
        particle(c, p.x + jig(k, 1), p.y + jig(k, 2), sp * 0.98, toN, 1);
      });
      // flashes on conversion
      c.save(); c.globalCompositeOperation = 'lighter';
      PROTONS.forEach((s, n) => {
        const ta = arrive(T, n), f = prog(gt, ta - 0.05, 0.6);
        if (f <= 0 || f >= 1) return;
        const p = site(s.i, s.j, sp, C.x, C.y);
        L.lightBlob(c, p.x, p.y, 70 + 40 * f, [210, 235, 255], 0.75 * (1 - f));
      });
      c.restore();
    }
    // electrons: orbit, then spiral into their protons
    ORB.forEach(([rf, er, tilt, w, ph], n) => {
      const ta = arrive(T, n), t0 = ta - 0.9;
      if (gt > ta) return;
      const ang = ph + gt * w * 2.2;
      const ex = RC * rf * Math.cos(ang), ey = RC * rf * er * Math.sin(ang);
      const ox = C.x + ex * Math.cos(tilt) - ey * Math.sin(tilt), oy = C.y + ex * Math.sin(tilt) + ey * Math.cos(tilt);
      const tgt = site(PROTONS[n].i, PROTONS[n].j, SN * scale, C.x, C.y);
      const m = ease.inCubic(prog(gt, t0, 0.9));
      const x = L.lerp(ox, tgt.x, m), y = L.lerp(oy, tgt.y, m);
      c.save(); c.globalCompositeOperation = 'lighter';
      L.lightBlob(c, x, y, 34, ELECTRON, 0.75);
      c.restore();
      c.fillStyle = L.rgba([235, 255, 252]);
      c.beginPath(); c.arc(x, y, 8, 0, Math.PI * 2); c.fill();
    });
    c.restore();
    // ---------------- packed lattice
    if (packK > 0 || gt >= T.packed - 0.15) {
      const sp = L.lerp(SN * scale, LAT_END, packK);
      const tp = T.packed - 0.15;
      drawLattice(c, C.x, C.y, sp, {
        fn: (i, j, x, y) => {
          const d = Math.hypot(x - C.x, y - C.y) / sp;
          if (NUCSET.has(`${i},${j}`)) return 1;   // the nucleus sites hand over in place
          return ease.outCubic(prog(gt, tp + 0.08 * d, 0.35));
        },
      });
    }
  },
  drawOverlay(c, v) {
    const gt = v.gt, T = times(v.tl);
    const kOut = 1 - ease.inCubic(prog(gt, T.b4 - 0.4, 0.3));
    if (kOut <= 0) return;
    c.save();
    c.globalAlpha = kOut;
    c.textBaseline = 'alphabetic';
    // a feathered dark band keeps the title slot readable over the lattice
    const band = ease.outCubic(prog(gt, T.packed - 0.35, 0.3));
    if (band > 0) {
      const bg = c.createLinearGradient(0, 320, 0, 620);
      bg.addColorStop(0, 'rgba(4,8,22,0)'); bg.addColorStop(0.25, `rgba(4,8,22,${0.88 * band})`); bg.addColorStop(0.75, `rgba(4,8,22,${0.88 * band})`); bg.addColorStop(1, 'rgba(4,8,22,0)');
      c.fillStyle = bg; c.fillRect(0, 320, W, 300);
    }
    // title slot: A atom → B equation → C packed
    const A = ease.outCubic(prog(gt, T.p0, 0.45)) * (1 - ease.inCubic(prog(gt, T.p1 - 0.2, 0.25)));
    const Bk = ease.outCubic(prog(gt, T.p1 + 0.05, 0.45)) * (1 - ease.inCubic(prog(gt, T.packed - 0.3, 0.2)));
    const Ck = ease.outCubic(prog(gt, T.packed - 0.1, 0.25));
    if (A > 0) L.bigLabel(c, { x: W / 2, y: 500, big: 'AN ATOM', small: 'nucleus + electron cloud · not to scale', k: A, accent: ACCENT, align: 'center', size: 96 });
    if (Bk > 0) {
      // PROTON + ELECTRON → NEUTRON, each in its particle colour; the arrow is drawn
      const parts = [['PROTON', PROTON], [' + ', [235, 240, 248]], ['ELECTRON', ELECTRON], [null], ['NEUTRON', ACCENT]];
      let size = 64;
      const AW = 70;
      for (;;) {
        c.font = L.font(size, 800, L.FONT.display);
        const w = parts.reduce((a, [t]) => a + (t ? c.measureText(t).width : AW + 24), 0);
        if (w <= 900 || size <= 30) break;
        size -= 2;
      }
      c.font = L.font(size, 800, L.FONT.display);
      const total = parts.reduce((a, [t]) => a + (t ? c.measureText(t).width : AW + 24), 0);
      let x = W / 2 - total / 2;
      const y = 470 + (1 - Bk) * 16;
      c.save();
      c.globalAlpha *= Bk;
      c.shadowColor = 'rgba(0,0,0,0.6)'; c.shadowBlur = 14;
      for (const [t, col] of parts) {
        if (!t) { arrow(c, x + 12, y - size * 0.34, x + 12 + AW, 'rgb(235,240,248)'); x += AW + 24; continue; }
        c.fillStyle = L.rgba(col); c.fillText(t, x, y); x += c.measureText(t).width;
      }
      c.font = L.font(28, 600, L.FONT.body);
      c.fillStyle = 'rgba(200,210,226,0.92)';
      L.trackedText(c, '(+ A NEUTRINO, WHICH FLIES OFF)', W / 2, y + 52, 3, 'center');
      c.restore();
    }
    if (Ck > 0) {   // a clean, crisp fade (no slide: the overlay layer is motion-blurred)
      c.save(); c.globalAlpha *= Ck;
      L.bigLabel(c, { x: W / 2, y: 500, big: 'PACKED SOLID', small: 'neutron against neutron · no empty space', k: 1, accent: ACCENT, align: 'center', size: 96 });
      c.restore();
    }
    // legend (every particle colour on screen)
    const lk = ease.outCubic(prog(gt, T.p0 + 0.2, 0.4)) * (1 - ease.inCubic(prog(gt, T.packed - 0.1, 0.3)));
    if (lk > 0) {
      c.save();
      c.globalAlpha *= lk;
      const items = [['PROTON', 'p'], ['NEUTRON', 'n'], ['ELECTRON', 'e']];
      c.font = L.font(26, 700, L.FONT.body);
      c.letterSpacing = '3px';
      const ws = items.map(([t]) => c.measureText(t).width);
      c.letterSpacing = '0px';
      const gap = 56, dot = 30;
      const total = ws.reduce((a, b) => a + b + dot + 14, 0) + gap * (items.length - 1);
      let x = W / 2 - total / 2;
      const y = 1300;
      // plate
      c.fillStyle = 'rgba(4,9,24,0.85)';
      L.roundRect(c, x - 28, y - 34, total + 56, 68, 34); c.fill();
      items.forEach(([t, kind], i) => {
        if (kind === 'e') {
          c.save(); c.globalCompositeOperation = 'lighter'; L.lightBlob(c, x + dot / 2, y, 22, ELECTRON, 0.7); c.restore();
          c.fillStyle = 'rgb(235,255,252)'; c.beginPath(); c.arc(x + dot / 2, y, 7, 0, Math.PI * 2); c.fill();
        } else particle(c, x + dot / 2, y, dot, kind === 'n' ? 1 : 0, 1);
        c.fillStyle = 'rgba(230,236,246,0.95)';
        L.trackedText(c, t, x + dot + 14, y + 9, 3);
        x += dot + 14 + ws[i] + gap;
      });
      c.restore();
    }
    c.restore();
  },
};
