// Beat 6 — "And total solar eclipses would be gone, forever."
// A ghost Moon (illustrative position and size) glides in on the Sun side, lower-left, back-lit with a thin
// bright rim. Its shadow falls on the day side: a soft penumbra with a small dark umbra dot, joined to the Moon by
// a faint shadow cone, and it sweeps across the lit hemisphere as the Moon moves. On "gone" the Moon dissolves
// into drifting dust, the shadow fades out and an after-image ring widens. Only once both have gone does the label
// "0" · "TOTAL SOLAR ECLIPSES · GONE FOREVER" land (never "zero eclipses" over a picture of one).
import * as L from '../../../../engine/runtime/lib.js';
import { globePx, SUN_DIR } from '../env.js';
import { wordAt, globeOk, SUNC, tag } from './s04-tides.js';

const TAU = Math.PI * 2;
const P = { x: -SUN_DIR.y, y: SUN_DIR.x };      // perpendicular to the Sun line (upper-left on screen)
const MOON_D = 1.22, MOON_R = 0.16;               // ghost Moon: distance toward the Sun and radius, in Earth radii
const DEPTH = 0.68;                              // the Moon's track passes this far in front of the disc centre (× r)
const S0 = -0.25, S1 = 0.56;                     // track along P (× r): from lower-centre up to the left

export function eclipseTimes(v) {
  const tl = v.tl, s = tl.scenes[4].start;
  return {
    total: wordAt(tl, 4, /^total/) - s,
    gone: wordAt(tl, 4, /^gone/) - s,
    label: wordAt(tl, 4, /^gone/) - s + 0.32,     // lands only once the Moon and its shadow have left
  };
}

/** Moon offset along P (× r) at beat time t, and visibility. */
function track(v, t) {
  const T = eclipseTimes(v);
  const u = L.prog(t, 0.1, T.gone + 0.6);
  const s = L.lerp(S0, S1, L.ease.inOutCubic(u) * 0.85 + 0.15 * u);
  const kin = L.ease.outCubic(L.prog(t, 0.3, 0.6));
  const dis = L.ease.inOutCubic(L.prog(t, T.gone - 0.4, 0.42));
  return { s, kin, dis };
}

function drawEclipse(c, v) {
  const g = globePx(v);
  if (!globeOk(g)) return;
  const { cx, cy, r } = g, t = v.t;
  const { s, kin, dis } = track(v, t);
  const k = kin * (1 - dis);
  const mx = cx + SUN_DIR.x * r * MOON_D + P.x * s * r, my = cy + SUN_DIR.y * r * MOON_D + P.y * s * r, mr = r * MOON_R;
  // where the shadow axis meets the sphere (on the day side, in front of the limb)
  const ss = s * r, zz = DEPTH * r, h = Math.sqrt(Math.max(0, r * r - ss * ss - zz * zz));
  const sx = cx + P.x * ss + SUN_DIR.x * h, sy = cy + P.y * ss + SUN_DIR.y * h;
  const rad = Math.atan2(sy - cy, sx - cx), squash = L.clamp(DEPTH * 0.9 + 0.1, 0.3, 1);
  const pen = r * 0.36 * (1 - 0.25 * dis), umb = r * 0.045 * (1 - 0.6 * dis);
  // sunlight from the lower-left: a soft warm wash beyond the Moon
  L.lightBlob(c, cx + SUN_DIR.x * r * 2.1, cy + SUN_DIR.y * r * 2.1, r * 1.1, SUNC, 0.1 * kin * (1 - dis));   // leaves with the Moon
  if (k > 0.001) {
    // shadow cone from the Moon to the globe (penumbra fan + umbra core lines)
    c.save();
    c.globalAlpha *= k;
    c.beginPath(); c.rect(-50, -50, L.W + 100, L.H + 100); c.arc(cx, cy, Math.max(0, r + 3), 0, TAU, true);
    c.clip('evenodd');
    const nx = P.x, ny = P.y;
    const cg = c.createLinearGradient(mx, my, sx, sy);
    cg.addColorStop(0, 'rgba(0,2,8,0.0)'); cg.addColorStop(0.5, 'rgba(0,2,8,0.22)'); cg.addColorStop(1, 'rgba(0,2,8,0.35)');
    c.fillStyle = cg;
    c.beginPath();
    c.moveTo(mx + nx * mr, my + ny * mr); c.lineTo(sx + nx * pen * 0.85, sy + ny * pen * 0.85);
    c.lineTo(sx - nx * pen * 0.85, sy - ny * pen * 0.85); c.lineTo(mx - nx * mr, my - ny * mr); c.closePath(); c.fill();
    c.strokeStyle = 'rgba(190,205,240,0.18)';
    c.lineWidth = 1;
    c.setLineDash([3, 6]);
    for (const sg of [-1, 1]) {
      c.beginPath(); c.moveTo(mx + nx * mr * sg, my + ny * mr * sg); c.lineTo(sx + nx * umb * sg, sy + ny * umb * sg); c.stroke();
    }
    c.restore();
  }
  // the shadow on the planet: clipped to the disc, foreshortened toward the limb
  const sk = kin * (1 - L.ease.inCubic(L.prog(t, eclipseTimes(v).gone - 0.4, 0.38)));
  if (sk > 0.001) {
    c.save();
    c.beginPath(); c.arc(cx, cy, Math.max(0, r), 0, TAU); c.clip();
    c.translate(sx, sy); c.rotate(rad); c.scale(squash, 1);
    const pg = c.createRadialGradient(0, 0, 0, 0, 0, Math.max(1, pen));
    pg.addColorStop(0, `rgba(0,2,10,${0.8 * sk})`); pg.addColorStop(0.3, `rgba(0,2,10,${0.6 * sk})`); pg.addColorStop(0.7, `rgba(0,2,10,${0.22 * sk})`); pg.addColorStop(1, 'rgba(0,2,10,0)');
    c.fillStyle = pg;
    c.beginPath(); c.arc(0, 0, Math.max(0, pen), 0, TAU); c.fill();
    // the umbra: a small, soft dark core (no outline: it is a shadow, not a hole)
    const ug = c.createRadialGradient(0, 0, 0, 0, 0, Math.max(1, umb * 2.2));
    ug.addColorStop(0, `rgba(0,0,4,${0.85 * sk})`); ug.addColorStop(0.4, `rgba(0,0,4,${0.6 * sk})`); ug.addColorStop(1, 'rgba(0,0,4,0)');
    c.fillStyle = ug;
    c.beginPath(); c.arc(0, 0, Math.max(0, umb * 2.2), 0, TAU); c.fill();
    c.restore();
  }
  // the ghost Moon, back-lit: dark face toward us, a thin bright rim on the Sun side
  if (k > 0.001) {
    c.save();
    c.globalAlpha *= k;
    L.lightBlob(c, mx + SUN_DIR.x * mr * 0.6, my + SUN_DIR.y * mr * 0.6, mr * 2.6, [255, 230, 190], 0.18);
    const bg = c.createRadialGradient(mx - SUN_DIR.x * mr * 0.3, my - SUN_DIR.y * mr * 0.3, 0, mx, my, mr);
    bg.addColorStop(0, 'rgba(18,22,34,0.96)'); bg.addColorStop(1, 'rgba(36,42,58,0.96)');
    c.fillStyle = bg;
    c.beginPath(); c.arc(mx, my, Math.max(0, mr), 0, TAU); c.fill();
    const a0 = Math.atan2(SUN_DIR.y, SUN_DIR.x);
    L.glow(c, SUNC, 12, () => {
      c.strokeStyle = 'rgba(255,236,205,0.85)'; c.lineWidth = 2.2;
      c.beginPath(); c.arc(mx, my, Math.max(0, mr), a0 - 1.25, a0 + 1.25); c.stroke();
    });
    c.setLineDash([5, 6]);
    c.lineDashOffset = -v.gt * 6;
    c.strokeStyle = 'rgba(210,222,255,0.6)';
    c.lineWidth = 1.5;
    c.beginPath(); c.arc(mx, my, Math.max(0, mr + 8), 0, TAU); c.stroke();
    c.restore();
  }
  // dissolve: dust drifting off, and an after-image ring
  if (dis > 0 && dis < 1) {
    const rnd = L.rng(66);
    c.save();
    for (let i = 0; i < 46; i++) {
      const a = rnd() * TAU, rr = Math.sqrt(rnd()) * mr, sp = 0.5 + rnd();
      const drift = dis * mr * 1.6 * sp;
      const x = mx + Math.cos(a) * (rr + drift) - P.x * drift * 0.4, y = my + Math.sin(a) * (rr + drift) - P.y * drift * 0.4;
      const al = Math.sin(Math.PI * Math.min(1, dis * 1.2)) * (0.35 + 0.5 * rnd());
      c.fillStyle = `rgba(215,225,250,${al})`;
      const sz = 1 + rnd() * 2;
      c.fillRect(x - sz / 2, y - sz / 2, sz, sz);
    }
    c.strokeStyle = `rgba(200,215,255,${0.5 * (1 - dis)})`;
    c.lineWidth = 1.5;
    c.beginPath(); c.arc(mx, my, Math.max(0, mr * (1 + 1.2 * L.ease.outCubic(dis))), 0, TAU); c.stroke();
    c.restore();
  }
}

export default {
  beat: 4,
  chapter: { num: '04', title: 'Eclipses', sub: 'no more total solar eclipses' },
  captions: true,
  layer: 2,
  cues(d) {
    // "total" ≈ 0.4 s, "gone" ≈ 1.94 s: the Moon dissolves just before it, the "0" lands ~0.3 s after
    return [
      { t: 0.1, name: 'shimmer', gain: 0.16, pitch: 0.8 },
      { t: 0.35, name: 'swish', gain: 0.2, pitch: 0.55 },
      { t: 1.6, name: 'deep', gain: 0.4, pitch: 0.7 },
      { t: 1.75, name: 'swish', gain: 0.14, pitch: 1.4 },
      { t: 2.3, name: 'ping', gain: 0.24, pitch: 0.85 },
    ];
  },
  drawWorld(ctx, v) {
    if (v.t < -0.1 || v.t > v.d + 0.2) return;
    drawEclipse(ctx, v);
  },
  drawOverlay(ctx, v) {
    const T = eclipseTimes(v);
    // (audit fix) the ghost Moon is drawn close and small for the diagram: say so, under the Moon, while it is in
    const g = globePx(v);
    if (globeOk(g) && v.t <= v.d) {
      const { s, kin, dis } = track(v, v.t);
      const mx = g.cx + SUN_DIR.x * g.r * MOON_D + P.x * s * g.r, my = g.cy + SUN_DIR.y * g.r * MOON_D + P.y * s * g.r;
      const a = v.k * L.ease.outCubic(L.prog(v.t, 0.4, 0.4)) * (1 - L.ease.inOutCubic(L.prog(v.t, T.gone - 0.5, 0.3)));
      tag(ctx, mx, my + g.r * MOON_R + 34, 'NOT TO SCALE', a * kin, { size: 15, bg: 0.5, color: [185, 198, 225] });
    }
    // hold the label into beat 7 (quick ease-in exit; the engine stops calling overlays at k = 0, ~d + 0.25 s)
    // so it reads for >= 1.5 s
    const hold = v.t < v.d * 0.5 ? v.k : 1 - L.ease.inCubic(L.prog(v.t, v.d - 0.02, 0.26));
    L.bigLabel(ctx, { x: 920, y: 1212, big: '0', small: 'total solar eclipses · gone forever', k: L.enter(v.t, T.label, 0.55) * hold, accent: v.accent, align: 'right', size: 100 });
  },
};
