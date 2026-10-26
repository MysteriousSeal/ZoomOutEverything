// Beat 2 — leafcutter nests hold millions. An Atta texana nest at X.nest (central Texas is Atta texana country):
//   * on the surface: a low, ≈ 5 m wide mound of pale excavated subsoil with crater-shaped entrance turrets,
//   * below: a cross-section of fungus-garden chambers (pale, spongy) hanging off wandering shafts down to ≈ 4.6 m,
//     with a few dark refuse chambers at the bottom (A. texana dumps waste deep),
//   * traffic: workers stream along every shaft (drawAnt; dots at this scale) — millions implied,
//   * a foraging trail on the surface from the right edge up into a crater: leaf carriers (drawAnt with `leaf` when
//     large enough; green flecks over the drawAnt dot otherwise) and returning foragers in a separate lane.
// Static geometry is seeded at module load (deterministic); motion is a pure function of time.
import * as L from '../../../../engine/runtime/lib.js';
import { drawAnt, gaitPhase } from '../ant.js';
import { X } from '../env.js';
import { labelScrim } from './s00-hook.js';

const { W, H } = L;
const NX = X.nest;              // 3.2
const HALF = 2.5;               // mound half-width (m)
const CRATERS = [-1.75, -1.05, -0.35, 0.3, 0.95, 1.6].map((d, i) => ({ x: NX + d, h: [0.09, 0.13, 0.15, 0.16, 0.12, 0.1][i], w: [0.32, 0.36, 0.4, 0.38, 0.34, 0.3][i] }));
/** mound height above the ground line (m) at x */
function moundH(x) {
  const u = (x - NX) / HALF;
  if (Math.abs(u) >= 1) return 0;
  let h = 0.26 * Math.pow(1 - u * u, 1.8);
  for (const c of CRATERS) {
    const d = Math.abs(x - c.x);
    if (d < c.w) h += c.h * Math.pow(1 - d / c.w, 1.6) - c.h * 0.9 * Math.pow(Math.max(0, 1 - d / (c.w * 0.22)), 2);
  }
  return h + 0.012 * (L.noise1(x * 9, 4) - 0.5) * Math.pow(1 - u * u, 0.5);
}
const surfY = (x) => -moundH(x);

// ------------------------------------------------------------------ underground: shafts + chambers (seeded)
// Atta nests: a few meandering vertical shafts from the crater mouths; oval chambers of very different sizes hang off
// them on short curved side tunnels, densest 0.6–2.6 m down; the deepest few are refuse dumps.
const SHAFTS = [], CHAMBERS = [], LINKS = [];
(() => {
  const r = L.rng(2131);
  CRATERS.forEach((c, i) => {
    const deep = [3.2, 4.2, 4.6, 4.4, 3.8, 2.9][i];
    const pts = [[c.x, surfY(c.x) + 0.02]];
    for (let y = 0.06; y <= deep; y += 0.06) {
      // smooth meander (two noise octaves) plus a slow drift toward the nest's axis
      const sway = 0.32 * L.noise1(y * 0.8 + i * 5.3, 11) + 0.1 * L.noise1(y * 3.1 + i * 2.1, 12);
      pts.push([c.x + sway + (NX - c.x) * 0.22 * Math.min(1, y / 3), y]);
    }
    SHAFTS.push(pts);
  });
  const shaftX = (s, y) => { for (let k = 1; k < s.length; k++) if (s[k][1] >= y) return s[k][0]; return s[s.length - 1][0]; };
  const clear = (cx, cy, a, h) => CHAMBERS.every((o) => {
    const dx = (cx - o.x) / (a + o.a + 0.07), dy = (cy - o.y) / ((h + o.h) / 2 + 0.07);
    return dx * dx + dy * dy > 1;
  }) && SHAFTS.every((s) => s.every(([sx, sy]) => Math.abs(sx - cx) > a + 0.05 || Math.abs(sy - cy) > h / 2 + 0.05));
  let garden = 0, refuse = 0;
  for (let tries = 0; tries < 900 && (garden < 14 || refuse < 3); tries++) {
    const isRef = garden >= 14 || (refuse < 3 && r() < 0.15);
    const si = Math.floor(r() * SHAFTS.length), s = SHAFTS[si];
    const maxD = s[s.length - 1][1];
    const cy = isRef ? L.lerp(Math.max(3.2, maxD - 0.9), maxD - 0.1, r()) : 0.5 + (maxD - 1.2) * Math.pow(r(), 1.3);
    if (isRef && maxD < 3.6) continue;
    const a = isRef ? L.lerp(0.22, 0.36, r()) : L.lerp(0.13, 0.36, Math.pow(r(), 1.1));   // half-width: 26–72 cm chambers
    const h = a * 2 * L.lerp(0.68, 0.92, r());
    const side = r() < 0.5 ? -1 : 1, sx = shaftX(s, cy);
    const cx = sx + side * (a + L.lerp(0.05, 0.3, r()));
    if (cx - a < NX - HALF + 0.3 || cx + a > NX + HALF - 0.3 || !clear(cx, cy, a, h)) continue;
    const ch = { x: cx, y: cy, a, h, refuse: isRef, seed: r() * 100, tilt: (r() - 0.5) * 0.25 };
    CHAMBERS.push(ch);
    isRef ? refuse++ : garden++;
    const ex = cx - side * a * 0.92, ey = cy + h * 0.18;
    LINKS.push([[sx, cy - 0.05 - r() * 0.12], [L.lerp(sx, ex, 0.5) + (r() - 0.5) * 0.06, L.lerp(cy, ey, 0.5) - 0.06 - r() * 0.06], [ex, ey]]);
  }
})();
// shaft arclength tables for the traffic
const SH = SHAFTS.map((pts) => {
  const acc = [0];
  for (let i = 1; i < pts.length; i++) acc.push(acc[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
  return { pts, acc, len: acc[acc.length - 1] };
});
function along(t, s) {
  s = L.clamp(s, 0, t.len);
  let i = 1;
  while (i < t.acc.length - 1 && t.acc[i] < s) i++;
  const a = t.pts[i - 1], b = t.pts[i], k = (s - t.acc[i - 1]) / Math.max(1e-9, t.acc[i] - t.acc[i - 1]);
  return [L.lerp(a[0], b[0], k), L.lerp(a[1], b[1], k), b[0] - a[0], b[1] - a[1]];
}
// fungus-garden texture per chamber (seeded): spongy pits of mixed sizes, pale hyphal flecks, an irregular outline
for (const c of CHAMBERS) {
  const r = L.rng(Math.floor(c.seed * 1000));
  const nP = Math.round(30 + 140 * c.a);
  c.pits = Array.from({ length: nP }, () => { const th = r() * 6.28, d = Math.sqrt(r()); return [Math.cos(th) * d, Math.sin(th) * d, L.lerp(0.004, 0.016, r() * r()), r()]; });
  c.flecks = Array.from({ length: Math.round(nP * 0.6) }, () => { const th = r() * 6.28, d = Math.sqrt(r()); return [Math.cos(th) * d, Math.sin(th) * d, L.lerp(0.003, 0.008, r())]; });
  c.noise = Array.from({ length: 18 }, () => r() - 0.5);
  c.top = Array.from({ length: 9 }, () => r());
  c.specks = Array.from({ length: Math.max(3, Math.round(c.a * 22)) }, () => [L.lerp(-0.7, 0.7, r()), r(), r()]);
}
const MOUND_COL = [176, 136, 92];
const TRAIL_END = CRATERS[5].x;     // the trail climbs into the rightmost crater
const TRAIL_FAR = NX + 6.0;          // and runs off-screen to the right

export default {
  beat: 2,
  chapter: { num: '02', title: 'Leafcutters', sub: 'Atta nests: millions of workers' },
  layer: 2,
  cues(d) {
    return [
      { t: 0.9, name: 'swish', gain: 0.18, pitch: 0.8 },
      { t: 1.4, name: 'impact', gain: 0.3, pitch: 1.2 },
      { t: 1.45, name: 'bloom', gain: 0.2, pitch: 1.0 },
    ];
  },
  drawWorld(ctx, v) {
    const mpp = v.cam.mpp;
    if (v.gt > v.tl.scenes[4].start || v.gt < v.tl.scenes[1].start) return;
    const x0 = v.wx(NX - HALF - 0.1), x1 = v.wx(TRAIL_FAR), y0 = v.wy(-0.5), y1 = v.wy(4.9);
    if (x1 < -20 || x0 > W + 20 || y1 < -20 || y0 > H + 20 || (v.wx(NX + HALF) - x0) < 2) return;
    const wpx = (2 * HALF) / mpp;
    const kLod = 1 - L.smoothstep(L.clamp(L.invLerp(Math.log(0.03), Math.log(0.12), Math.log(mpp))));   // env turns the cut-away into aerial land
    if (kLod <= 0) return;
    const detail = L.clamp(L.invLerp(150, 500, wpx));
    const t = v.gt;
    ctx.save();
    ctx.globalAlpha = kLod;
    ctx.translate(v.wx(0), v.wy(0));
    ctx.scale(1 / mpp, 1 / mpp);
    const px = mpp;   // one pixel in metres
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    // ---- shafts + links (dark bores, a lighter core where the floor catches light)
    const bore = Math.max(0.04, 1.2 * px);
    ctx.strokeStyle = 'rgb(30,20,13)';
    ctx.lineWidth = bore + 2 * px;
    for (const s of SHAFTS) { ctx.beginPath(); s.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.stroke(); }
    for (const [a, b, c] of LINKS) { ctx.beginPath(); ctx.moveTo(...a); ctx.quadraticCurveTo(...b, ...c); ctx.stroke(); }
    if (detail > 0) {
      ctx.strokeStyle = `rgba(110,80,54,${0.35 * detail})`;
      ctx.lineWidth = bore * 0.6;
      for (const s of SHAFTS) { ctx.beginPath(); s.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.stroke(); }
      for (const [a, b, c] of LINKS) { ctx.beginPath(); ctx.moveTo(...a); ctx.quadraticCurveTo(...b, ...c); ctx.stroke(); }
    }
    // ---- chambers: an irregular oval cavity; a spongy grey-white fungus garden fills it to just under the vault
    const cpath = (c, grow) => {
      ctx.beginPath();
      const n = c.noise.length;
      for (let i = 0; i <= n; i++) {
        const th = (i / n) * Math.PI * 2, j = i % n;
        const wob = 1 + 0.07 * c.noise[j] + 0.035 * c.noise[(j * 7) % n];
        const flat = Math.sin(th) > 0 ? 0.88 : 1;   // a slightly flatter floor than vault
        const ex = Math.cos(th) * (c.a + grow) * wob, ey = Math.sin(th) * (c.h / 2 + grow) * wob * flat;
        const x = c.x + ex * Math.cos(c.tilt) - ey * Math.sin(c.tilt), y = c.y + ex * Math.sin(c.tilt) + ey * Math.cos(c.tilt);
        i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
      }
      ctx.closePath();
    };
    for (const c of CHAMBERS) {
      // compacted wall: a slightly darker, smoother rind around the cavity
      cpath(c, 0.03); ctx.fillStyle = 'rgba(52,36,24,0.55)'; ctx.fill();
      cpath(c, 2 * px); ctx.fillStyle = 'rgb(20,13,8)'; ctx.fill();
      ctx.save();
      cpath(c, 0); ctx.clip();
      const top = c.y - c.h * 0.5, bot = c.y + c.h * 0.5;
      // garden surface: lumpy, sitting 12–22% of the height under the vault (a dark crescent of air above)
      const surf = (u) => top + c.h * (0.13 + 0.09 * c.top[Math.min(8, Math.floor((u + 1) * 4.5))] * (0.6 + 0.4 * Math.sin(u * 7 + c.seed)));
      ctx.beginPath();
      ctx.moveTo(c.x - c.a * 1.3, bot + 0.05);
      for (let i = 0; i <= 24; i++) { const u = -1.15 + (2.3 * i) / 24; ctx.lineTo(c.x + u * c.a, c.refuse ? top + c.h * (0.45 + 0.1 * Math.sin(u * 4 + c.seed)) : surf(u)); }
      ctx.lineTo(c.x + c.a * 1.3, bot + 0.05);
      ctx.closePath();
      const g = ctx.createLinearGradient(0, top, 0, bot);
      if (c.refuse) { g.addColorStop(0, 'rgb(104,92,76)'); g.addColorStop(1, 'rgb(62,52,42)'); }
      else { g.addColorStop(0, 'rgb(226,222,208)'); g.addColorStop(0.5, 'rgb(196,190,174)'); g.addColorStop(1, 'rgb(138,128,108)'); }
      ctx.fillStyle = g;
      ctx.fill();
      if (detail > 0.02) {
        ctx.save(); ctx.clip();
        // sponge: pits of mixed sizes (dark cells) and pale hyphal flecks over the whole garden
        for (const [u, w, sz, tone] of c.pits) {
          ctx.fillStyle = c.refuse ? `rgba(40,32,24,${0.5 * detail})` : `rgba(${80 + tone * 30},${74 + tone * 26},${62 + tone * 20},${(0.35 + 0.35 * tone) * detail})`;
          ctx.beginPath(); ctx.ellipse(c.x + u * c.a, c.y + w * c.h * 0.5, sz, sz * (0.6 + 0.3 * tone), tone * 3, 0, Math.PI * 2); ctx.fill();
        }
        if (!c.refuse) {
          ctx.fillStyle = `rgba(250,248,240,${0.55 * detail})`;
          for (const [u, w, sz] of c.flecks) { ctx.beginPath(); ctx.arc(c.x + u * c.a, c.y + w * c.h * 0.5, sz, 0, Math.PI * 2); ctx.fill(); }
        }
        ctx.restore();
      }
      // soft shading: the cavity's lower side and edges fall into shadow
      const sg = ctx.createRadialGradient(c.x - c.a * 0.25, c.y - c.h * 0.1, c.a * 0.55, c.x, c.y, c.a * 1.15);
      sg.addColorStop(0, 'rgba(0,0,0,0)'); sg.addColorStop(1, 'rgba(10,6,3,0.28)');
      ctx.fillStyle = sg; ctx.fillRect(c.x - c.a * 1.2, top - 0.05, c.a * 2.4, c.h + 0.1);
      ctx.restore();
    }
    // ---- the mound of excavated soil (over the ground line)
    ctx.beginPath();
    ctx.moveTo(NX - HALF, 0.004);
    for (let x = NX - HALF; x <= NX + HALF; x += Math.max(0.01, 2 * px)) ctx.lineTo(x, surfY(x));
    ctx.lineTo(NX + HALF, 0.004);
    ctx.closePath();
    const mg = ctx.createLinearGradient(0, -0.45, 0, 0.01);
    mg.addColorStop(0, L.rgba(L.mix(MOUND_COL, [236, 210, 170], 0.3))); mg.addColorStop(1, L.rgba(L.mix(MOUND_COL, [90, 64, 42], 0.35)));
    ctx.fillStyle = mg;
    ctx.fill();
    if (detail > 0) {
      ctx.save(); ctx.clip();
      const r = L.rng(2123);
      ctx.globalAlpha = detail;
      for (let i = 0; i < 380; i++) {
        const x = L.lerp(NX - HALF, NX + HALF, r()), y = -r() * 0.42, s = L.lerp(0.006, 0.02, r());
        ctx.fillStyle = r() < 0.5 ? 'rgba(110,80,52,0.5)' : 'rgba(232,206,166,0.45)';
        ctx.beginPath(); ctx.ellipse(x, y, s, s * 0.6, 0, 0, Math.PI * 2); ctx.fill();
      }
      ctx.restore();
    }
    // crater mouths: a dark hole in each turret
    for (const c of CRATERS) {
      ctx.fillStyle = 'rgb(28,18,12)';
      ctx.beginPath(); ctx.ellipse(c.x, surfY(c.x) + 0.012, 0.045, 0.022, 0, 0, Math.PI * 2); ctx.fill();
    }
    // sunlit rim along the mound top
    ctx.strokeStyle = 'rgba(255,240,210,0.5)';
    ctx.lineWidth = 1.6 * px;
    ctx.beginPath();
    for (let x = NX - HALF * 0.95; x <= NX + HALF * 0.95; x += Math.max(0.01, 2 * px)) x === NX - HALF * 0.95 ? ctx.moveTo(x, surfY(x)) : ctx.lineTo(x, surfY(x));
    ctx.stroke();
    ctx.restore();

    // ---- traffic in the shafts (drawAnt; dots at this scale). Same speed per lane → no overlaps.
    const antLen = 0.011 / mpp;
    if (antLen < 0.25) return;
    ctx.globalAlpha = kLod;
    const col = [70, 32, 16];   // Atta: rusty red-brown, dark against the lit bores
    SH.forEach((s, si) => {
      const sp = 0.09, speed = 0.03;
      const n = Math.floor(s.len / sp);
      for (let lane = 0; lane < 2; lane++) {
        for (let i = 0; i < n; i++) {
          let d = (i * sp + speed * t + si * 0.031 + lane * sp * 0.5) % s.len;
          if (lane) d = s.len - d;   // the other lane walks back up
          const r = L.rng(si * 977 + i * 31 + lane * 7);
          if (r() < 0.25) continue;
          const [x, y, tx, ty] = along(s, d);
          const sx = v.wx(x + (lane ? 0.009 : -0.009)), sy = v.wy(y);
          if (sx < -4 || sx > W + 4 || sy < -4 || sy > H + 4) continue;
          const up = lane === 1;
          drawAnt(ctx, { x: sx, y: sy, len: antLen * L.lerp(0.7, 1.2, r()), dir: 1, angle: Math.atan2(up ? -ty : ty, up ? -tx : tx), col, walk: 1, phase: gaitPhase(d, 0.008) });
        }
      }
    });
    // ---- gardeners: workers on every fungus garden (slow drift along the garden's surface)
    for (const c of CHAMBERS) {
      if (c.refuse) continue;
      for (const [u0, ph, sp] of c.specks) {
        const u = u0 + 0.12 * Math.sin(t * (0.3 + sp * 0.5) + ph * 6.28);
        const sx = v.wx(c.x + u * c.a), sy = v.wy(c.y - c.h * 0.32 + c.h * 0.25 * u * u);
        if (sx < -4 || sx > W + 4 || sy < -4 || sy > H + 4) continue;
        drawAnt(ctx, { x: sx, y: sy, len: antLen * L.lerp(0.6, 1.0, sp), dir: sp < 0.5 ? 1 : -1, col, walk: 0.5, phase: u * 5 });
      }
    }
    // ---- the foraging trail: leaf carriers walk LEFT into the crater, foragers walk RIGHT (farther lane)
    const trailLen = TRAIL_FAR - TRAIL_END;
    for (let lane = 1; lane >= 0; lane--) {
      const sp = lane ? 0.09 : 0.05, speed = lane ? 0.045 : 0.03;
      const n = Math.floor(trailLen / sp);
      for (let i = 0; i < n; i++) {
        const r = L.rng(5000 + i * 13 + lane * 100000);
        if (r() < (lane ? 0.4 : 0.15)) continue;
        const d = (i * sp + speed * t) % trailLen;
        const x = lane ? TRAIL_END + d : TRAIL_FAR - d;
        const sx = v.wx(x);
        if (sx < -6 || sx > W + 6) continue;
        const y = surfY(x) - (lane ? 0.006 : 0);
        const len = L.lerp(0.007, 0.011, r()) / mpp;
        const sl = (surfY(x + 0.02) - surfY(x - 0.02)) / 0.04;
        const sy = v.wy(y);
        const leafCol = L.mix([96, 168, 60], [168, 196, 80], r());
        const carry = !lane;
        drawAnt(ctx, {
          x: sx, y: sy, len, dir: lane ? 1 : -1, angle: Math.atan(sl), col: L.mix(col, [60, 40, 30], lane ? 0.4 : 0), walk: 1,
          phase: gaitPhase(d, 0.009), t: t + i, leaf: carry && len >= 7 ? { col: leafCol, size: 0.9 } : null,
        });
        if (carry && len < 7) {   // the leaf fragment, held up over the head (a green fleck at this scale)
          const ls = Math.max(2.3, len * 0.9);
          ctx.fillStyle = L.rgba(leafCol);
          ctx.beginPath(); ctx.ellipse(sx - len * 0.3, sy - len * 0.55 - ls * 0.5, ls * 0.75, ls * 0.6, 0.4, 0, Math.PI * 2); ctx.fill();
        }
      }
    }
  },
  drawOverlay(ctx, v) {
    const ph = v.tl.lines[2].phrases[0];
    const t0 = ph.start + 0.62 * (ph.end - ph.start) - v.tl.scenes[2].start;   // ≈ on "millions"
    const kin = L.prog(v.t, t0 - 0.15, 0.6);
    if (kin <= 0) return;
    ctx.save();
    ctx.globalAlpha = v.k;
    const size = L.fitSize(ctx, 'MILLIONS', 900, 138, 800, L.FONT.display, 60);
    ctx.font = L.font(30, 600, L.FONT.body);
    L.bigLabel(ctx, { x: 64, y: 482, big: 'MILLIONS', small: null, k: kin, accent: v.accent, size });
    // the context line in deep ink: the sky here is bright
    const e = L.ease.outCubic(kin);
    let fs = 32;
    const small = 'OF WORKERS IN ONE LEAFCUTTER NEST';
    ctx.font = L.font(fs, 700, L.FONT.body);
    while (fs > 18 && ctx.measureText(small).width + small.length * 3 > 900) { fs -= 1; ctx.font = L.font(fs, 700, L.FONT.body); }
    ctx.globalAlpha = v.k * Math.min(1, kin * 1.4);
    ctx.fillStyle = 'rgb(18,30,48)';
    ctx.shadowColor = 'rgba(255,255,255,0.35)';
    ctx.shadowBlur = 10;
    L.trackedText(ctx, small, 64, 482 + 54 + (1 - e) * 18, 3, 'left');
    ctx.restore();
  },
};
