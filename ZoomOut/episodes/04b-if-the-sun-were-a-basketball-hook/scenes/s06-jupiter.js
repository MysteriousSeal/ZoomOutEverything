// Beat 6 — Jupiter: a grape, 134 m from the basketball Sun. The plaza gives way to a park.
// Same grammar as Mars (shared kit in s05-mars.js): the ring sweeps open from the planet, a glowing marker pings,
// and the magnifier opens on "grape" with a banded, slowly turning Jupiter beside a green grape at the same scale.
import * as L from '../../../../engine/runtime/lib.js';
import { pos } from '../camera.js';
import { drawOrbit, drawBody, drawInset, stagger, shadeSphere, rimLight, grape, labelScrim, labelOut } from './s05-mars.js';

const NAME = 'jupiter';
const COL = [230, 190, 150];
const T_OPEN = 0.9;          // "a grape" (lands on the word)
const T_LABEL = 1.5;         // "a hundred and thirty meters away"
const INSET = [318, 738];
const R_IN = 138;

// belts: [top, bottom] as fractions of the radius (-1 north … 1 south), colour, edge wobble phase
const BELTS = [
  [-0.9, -0.72, [190, 162, 132], 0.4],
  [-0.58, -0.4, [184, 140, 104], 1.7],
  [-0.14, 0.0, [222, 204, 178], 2.2],
  [0.12, 0.34, [178, 126, 90], 3.1],
  [0.5, 0.6, [196, 160, 124], 4.4],
  [0.76, 0.9, [186, 158, 130], 5.2],
];
const STREAKS = (() => { const r = L.rng(606); return Array.from({ length: 16 }, () => [r() * 1.8 - 0.9, r() * 6.28, 0.2 + r() * 0.4, r()]); })();

export function drawJupiter(ctx, x, y, r, la, t) {
  const tilt = 0.05;
  ctx.save();
  ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.clip();
  ctx.fillStyle = '#e6d7bd';
  ctx.fillRect(x - r, y - r, 2 * r, 2 * r);
  ctx.save();
  ctx.translate(x, y); ctx.rotate(tilt);
  const rot = t * 0.3;
  // belts with turbulent, slowly drifting edges
  for (const [a, b, col, ph] of BELTS) {
    ctx.fillStyle = L.rgba(col, 0.85);
    ctx.filter = `blur(${(r * 0.025).toFixed(1)}px)`;
    ctx.beginPath();
    const n = 30;
    for (let i = 0; i <= n; i++) {
      const u = -1.25 + (2.5 * i) / n;
      const yy = a * r + Math.sin(u * 7 + rot * 2 + ph) * r * 0.018;
      i ? ctx.lineTo(u * r, yy) : ctx.moveTo(u * r, yy);
    }
    for (let i = n; i >= 0; i--) {
      const u = -1.25 + (2.5 * i) / n;
      ctx.lineTo(u * r, b * r + Math.sin(u * 6 - rot * 1.5 + ph * 1.3) * r * 0.02);
    }
    ctx.closePath();
    ctx.fill();
  }
  ctx.filter = 'none';
  // fine streaks (festoons) that travel with the rotation
  ctx.lineCap = 'round';
  for (const [lat, lon, len, c] of STREAKS) {
    const l = lon + rot;
    const cs = Math.cos(l);
    if (cs < 0.05) continue;
    const px = r * Math.sqrt(1 - lat * lat) * Math.sin(l);
    ctx.strokeStyle = c < 0.5 ? `rgba(250,240,225,${0.35 * cs})` : `rgba(120,75,50,${0.3 * cs})`;
    ctx.lineWidth = Math.max(1, r * 0.03);
    ctx.beginPath(); ctx.moveTo(px - len * r * 0.3 * cs, lat * r); ctx.lineTo(px + len * r * 0.3 * cs, lat * r + r * 0.02); ctx.stroke();
  }
  // Great Red Spot, foreshortened as it turns (t is beat-local: it crosses the front face while the inset is open)
  const gl = -0.6 + t * 0.25, gc = Math.cos(gl);
  if (gc > 0) {
    const gx = r * Math.sqrt(1 - 0.4 * 0.4) * Math.sin(gl), gy = r * 0.4;
    // soft-edged storm: a pale collar that melts into the belt, then the red oval with a feathered rim (no outline)
    ctx.save();
    ctx.translate(gx, gy);
    ctx.scale(Math.max(0.01, gc), 0.55);
    const collar = ctx.createRadialGradient(0, 0, 0, 0, 0, r * 0.25);
    collar.addColorStop(0, `rgba(226,206,180,${0.5 * gc})`);
    collar.addColorStop(1, 'rgba(226,206,180,0)');
    ctx.fillStyle = collar;
    ctx.beginPath(); ctx.arc(0, 0, r * 0.25, 0, Math.PI * 2); ctx.fill();
    const spot = ctx.createRadialGradient(-r * 0.02, -r * 0.01, 0, 0, 0, r * 0.18);
    spot.addColorStop(0, `rgba(184,86,54,${0.95 * gc})`);
    spot.addColorStop(0.6, `rgba(196,100,64,${0.85 * gc})`);
    spot.addColorStop(1, 'rgba(204,120,80,0)');
    ctx.fillStyle = spot;
    ctx.beginPath(); ctx.arc(0, 0, r * 0.18, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }
  ctx.restore();
  shadeSphere(ctx, x, y, r, la, { night: 0.86, sheen: 0.14 });
  ctx.restore();
  rimLight(ctx, x, y, r, la, [255, 225, 190], 0.4);
}

const GREEN = { base: [150, 182, 82], dark: [58, 82, 30], light: [214, 232, 150], bloom: [[230, 240, 220], 0.07] };

export default {
  beat: 7,
  chapter: { num: '06', title: 'Jupiter', sub: 'The largest planet' },
  captions: true,
  layer: 0,
  cues(d) {
    return [
      { t: 0.2, name: 'riser', gain: 0.14, pitch: 0.95 },
      { t: 0.65, name: 'ping', gain: 0.22, pitch: 1.0 },
      { t: T_OPEN, name: 'bloom', gain: 0.28, pitch: 0.95 },
      { t: T_LABEL, name: 'tick', gain: 0.24, pitch: 1.0 },
    ];
  },
  drawWorld(ctx, v) {
    drawOrbit(ctx, v, NAME, 0.15, 1.4);
    drawBody(ctx, v, NAME, COL, -0.2);   // marked as it comes into frame, before its name
  },
  drawOverlay(ctx, v) {
    const p = pos(NAME);
    drawInset(ctx, v, {
      body: [v.wx(p.x), v.wy(p.y)], c: INSET, R: R_IN, tOpen: T_OPEN,
      tags: [['JUPITER', -58, 58], ['GRAPE', 60, 58]],
      scale: { dy: 90, len: 1, px: 41.7, minor: 0.1, tag: '1 CM' },   // Jupiter 100 px = 2.4 cm → 41.7 px per cm
      content(c, cx, cy, R, la, kc) {
        stagger(c, kc, 0, () => drawJupiter(c, cx - 58, cy - 22, 50, la, v.t));
        stagger(c, kc, 1, () => grape(c, cx + 60, cy - 16, 41, 45, la, GREEN));
      },
    });
    const k = Math.min(v.k, L.prog(v.t, T_LABEL, 0.55)) * labelOut(v);
    labelScrim(ctx, k, '2.4 cm', '134 m · 440 ft from the Sun');
    L.bigLabel(ctx, { x: 80, y: 480, big: '2.4 cm', small: '134 m · 440 ft from the Sun', k, accent: v.accent });
  },
};
