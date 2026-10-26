// Beat 8 — The Earth itself formed 4.54 billion years ago. The Hadean Earth, not today's: a slowly turning
// magma-ocean world with a thin dark cooling crust, glowing fracture lines that pulse, impact glints, and a
// faint ring of Moon-forming debris from the Theia impact. No continents (too young; earth.js not used).
// It coalesces from a glowing point as the camera lands, then collapses to a small ruler landmark in beat 9.
import * as L from '../../../../engine/runtime/lib.js';
import { AGE } from '../camera.js';
import { tx, rulerY, timelineK, ACCENT } from '../env.js';
import { GROUND, bigK, nearNow, label, tag } from './s05-dinosaurs.js';

const MAGMA = [255, 132, 52], HOT = [255, 214, 150];

// crack network on the sphere: random walks in (lon, lat), with occasional forks (generated once)
const CRACKS = (() => {
  const r = L.rng(4540), out = [];
  const walk = (lon, lat, dir, n, w) => {
    const pts = [[lon, lat]];
    for (let i = 0; i < n; i++) {
      dir += (r() - 0.5) * 0.9;
      lon += Math.cos(dir) * 0.13 / Math.max(0.3, Math.cos(lat));
      lat = L.clamp(lat + Math.sin(dir) * 0.13, -1.45, 1.45);
      pts.push([lon, lat]);
      if (r() < 0.12 && n > 3) out.push({ pts: [[lon, lat]], ...walk(lon, lat, dir + (r() < 0.5 ? 1 : -1) * 1.1, Math.floor(n / 2), w * 0.6) });
    }
    return { pts, w, ph: r() * 6.28 };
  };
  for (let i = 0; i < 46; i++) {
    const lon = r() * Math.PI * 2, lat = Math.asin(r() * 2 - 1) * 0.95;
    out.push(walk(lon, lat, r() * 6.28, 5 + Math.floor(r() * 8), 0.6 + r() * 0.9));
  }
  return out;
})();
// magma lakes and impact sites
const POOLS = (() => { const r = L.rng(4541), out = []; for (let i = 0; i < 16; i++) out.push({ lon: r() * 6.28, lat: Math.asin(r() * 2 - 1), s: 0.05 + r() * 0.1, ph: r() * 6.28, imp: i < 5 }); return out; })();
const DEBRIS = (() => { const r = L.rng(4542), out = []; for (let i = 0; i < 70; i++) out.push({ a: r() * 6.28, d: 1.55 + r() * 0.5, s: 0.4 + r() * 1.2, b: r() }); return out; })();

function proj(lon, lat, rot, tilt) {
  const cl = Math.cos(lat), x0 = cl * Math.sin(lon + rot), y0 = -Math.sin(lat), z0 = cl * Math.cos(lon + rot);
  // tilt the spin axis (rotate about the view axis)
  const ct = Math.cos(tilt), st = Math.sin(tilt);
  return [x0 * ct - y0 * st, x0 * st + y0 * ct, z0];
}

/** The young Earth at (cx, cy), radius r. `heat` 0..1 boosts the glow (the formation flash). */
export function drawYoungEarth(ctx, cx, cy, r, { gt = 0, heat = 0, alpha = 1, debris = 1 } = {}) {
  if (r <= 0.5 || alpha <= 0) return;
  ctx.save();
  ctx.globalAlpha *= alpha;
  const rot = gt * 0.16, tilt = 0.4;
  // outer glow (heat haze)
  L.lightBlob(ctx, cx, cy, r * (1.7 + 0.4 * heat), MAGMA, 0.22 + 0.4 * heat);
  // Moon-forming debris ring (behind half)
  const ring = (front) => {
    if (debris <= 0 || r < 30) return;
    ctx.save();
    for (const p of DEBRIS) {
      const a = p.a + gt * 0.05 / p.d;
      const ex = Math.cos(a) * p.d * r, ey = Math.sin(a) * p.d * r * 0.16, dz = Math.sin(a);
      if ((dz > 0) !== front) continue;
      const ct = Math.cos(-0.32), st = Math.sin(-0.32);
      const x = cx + ex * ct - ey * st, y = cy + ex * st + ey * ct;
      ctx.fillStyle = `rgba(255,${190 + p.b * 50},${150 + p.b * 60},${(0.25 + 0.4 * p.b) * debris})`;
      ctx.beginPath(); ctx.arc(x, y, Math.max(0, p.s * r / 150), 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
  };
  ring(false);
  // the sphere: dark basaltic crust, lit from the upper left
  const g = ctx.createRadialGradient(cx - r * 0.38, cy - r * 0.42, r * 0.05, cx, cy, r);
  g.addColorStop(0, 'rgb(122,66,46)');
  g.addColorStop(0.45, 'rgb(70,36,28)');
  g.addColorStop(0.85, 'rgb(34,18,18)');
  g.addColorStop(1, 'rgb(22,12,14)');
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.arc(cx, cy, Math.max(0, r), 0, Math.PI * 2); ctx.fill();
  ctx.save();
  ctx.beginPath(); ctx.arc(cx, cy, Math.max(0, r), 0, Math.PI * 2); ctx.clip();
  ctx.globalCompositeOperation = 'lighter';
  // magma pools (soft, emissive)
  for (const p of POOLS) {
    const [x, y, z] = proj(p.lon, p.lat, rot, tilt);
    if (z <= 0.02) continue;
    const pulse = 0.65 + 0.35 * Math.sin(gt * 2.1 + p.ph);
    const rr = p.s * r * (0.4 + 0.6 * z);
    L.lightBlob(ctx, cx + x * r, cy + y * r, rr * 2.2, MAGMA, 0.45 * pulse * z);
    if (p.imp) {
      const fl = Math.pow(Math.max(0, Math.sin(gt * 0.9 + p.ph * 3)), 18);   // occasional impact glint
      if (fl > 0.02) L.lightBlob(ctx, cx + x * r, cy + y * r, rr * 3.2, HOT, 0.9 * fl * z);
    }
  }
  // glowing fracture lines
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  for (const c of CRACKS) {
    const pulse = 0.6 + 0.4 * Math.sin(gt * 1.6 + c.ph);
    for (const pass of [0, 1]) {
      ctx.strokeStyle = pass ? L.rgba(HOT, 0.75 * pulse) : L.rgba(MAGMA, 0.32 * pulse);
      ctx.lineWidth = Math.max(0.6, (pass ? 1.0 : 3.6) * c.w * r / 150);
      ctx.beginPath();
      let pen = false;
      for (const [lon, lat] of c.pts) {
        const [x, y, z] = proj(lon, lat, rot, tilt);
        if (z < 0.05) { pen = false; continue; }
        if (pen) ctx.lineTo(cx + x * r, cy + y * r); else ctx.moveTo(cx + x * r, cy + y * r);
        pen = true;
      }
      ctx.stroke();
    }
  }
  ctx.restore();
  // limb: darkening toward the edge, and a hot rim of glowing atmosphere
  const lg = ctx.createRadialGradient(cx, cy, r * 0.6, cx, cy, r);
  lg.addColorStop(0, 'rgba(10,4,6,0)'); lg.addColorStop(1, 'rgba(10,4,6,0.55)');
  ctx.fillStyle = lg;
  ctx.beginPath(); ctx.arc(cx, cy, Math.max(0, r), 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = L.rgba(MAGMA, 0.45);
  ctx.lineWidth = Math.max(1, r * 0.018);
  ctx.beginPath(); ctx.arc(cx, cy, Math.max(0, r + r * 0.008), 0, Math.PI * 2); ctx.stroke();
  // the crescent of sunlight from the upper left (the young Sun)
  ctx.save();
  ctx.beginPath(); ctx.arc(cx, cy, Math.max(0, r), 0, Math.PI * 2); ctx.clip();
  ctx.globalCompositeOperation = 'lighter';
  const sg = ctx.createRadialGradient(cx - r * 0.9, cy - r * 0.9, r * 0.4, cx - r * 0.9, cy - r * 0.9, r * 1.5);
  sg.addColorStop(0, 'rgba(255,220,190,0.22)'); sg.addColorStop(1, 'rgba(255,220,190,0)');
  ctx.fillStyle = sg;
  ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
  ctx.restore();
  if (heat > 0) L.lightBlob(ctx, cx, cy, r * 1.1, HOT, 0.6 * heat);
  ring(true);
  ctx.restore();
}

const FORM = 0.95, LBL = 1.55;   // beat-local: the Earth coalesces · "four and a half billion"
const R = 150;

export default {
  beat: 8,
  chapter: { num: '08', title: 'The Earth', sub: 'a molten world takes shape' },
  layer: 8,
  cues(d) {
    return [
      { t: FORM - 0.1, name: 'swell', gain: 0.3, pitch: 0.8 },
      { t: FORM + 0.55, name: 'deep', gain: 0.3, pitch: 0.75 },
      { t: LBL + 0.05, name: 'tick', gain: 0.18, pitch: 0.9 },
    ];
  },
  drawWorld(ctx, v) {
    const lk = timelineK(v);
    if (lk <= 0 || v.t < 0.3) return;
    const ry = rulerY(v), x = tx(v, AGE.earth);
    if (x < -260 || x > L.W + 200) return;
    const big = bigK(v, 9, 1.2);
    const form = L.ease.outCubic(L.prog(v.t, FORM, 0.9));
    if (form <= 0) return;
    const heat = Math.exp(-Math.max(0, v.t - FORM) * 2.2) * L.clamp((v.t - FORM) / 0.15);
    const r = L.lerp(14, R, big) * L.lerp(0.08, 1, form);
    const cy = ry - GROUND - r - L.lerp(4, 18, big);
    const nk = nearNow(v, x, 24, 50);
    ctx.save();
    ctx.globalAlpha = lk * nk * L.clamp(form * 3);
    // the pin from the ruler up to the disc
    ctx.strokeStyle = L.rgba(ACCENT, 0.7);
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(x, ry); ctx.lineTo(x, cy + r); ctx.stroke();
    ctx.fillStyle = L.rgba(ACCENT);
    ctx.beginPath(); ctx.arc(x, ry, 5.5, 0, Math.PI * 2); ctx.fill();
    drawYoungEarth(ctx, x, cy, r, { gt: v.gt, heat, debris: big * form });
    // once small: a landmark tag
    tag(ctx, 'EARTH FORMS', x, cy - r - 16, (1 - big) * nk, { size: 20, maxW: 220, color: [236, 214, 196] });
    ctx.restore();
  },
  drawOverlay(ctx, v) {
    label(ctx, v, '4.54 BILLION', 'years ago · the Earth forms', v.k * L.ease.outCubic(L.prog(v.t, LBL, 0.5)));
  },
};
