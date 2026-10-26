// Beat 0 — "What if all the ice on Earth melted?"
// A single 3 cm ice cube, true size, on a dark slate table, seen from above with a slight 3/4 view (the camera sits a
// little to the south-east, so the cube shows its top plus its south and east faces). Light from the upper left:
// a soft contact shadow and a bright refracted caustic fall to the lower right; a meltwater puddle creeps out
// slowly with a meniscus highlight and two drip ripples. Inside the ice: a frosted core, trapped bubbles, cracks
// (one new crack runs across with a creak), specular edges and slowly rounding corners.
// Everything is world space at the face centre (0, R_EARTH) = the South Pole, so the pull-back in beat 1 starts
// here: the table is a finite slab that shrinks and fades into s01's ice field (mpp 0.002-0.03); the cube then
// survives as a glint until it is sub-pixel.
// The headline is drawn in drawWorld (overlays are gated by the beat fade-in; the first frame must already read).
import * as L from '../../../../engine/runtime/lib.js';
import { ACCENT, R_EARTH } from '../env.js';

const { W, H } = L;
const TAU = Math.PI * 2;
const CUBE = 0.03;                       // 3 cm
const TABLE = { x0: -0.62, x1: 0.98, y0: -0.44, y1: 0.5, r: 0.035 };   // metres from the cube centre (cube off-centre on the table)

// ------------------------------------------------------------------ slate texture (seamless, built once)
const SN = 1024;
let slateC = null, slatePat = null;
function buildSlate() {
  slateC = new OffscreenCanvas(SN, SN);
  const c = slateC.getContext('2d');
  const r = L.rng(1400);
  c.fillStyle = 'rgb(36,40,45)';
  c.fillRect(0, 0, SN, SN);
  const wrap = (fn) => { for (const ox of [-SN, 0, SN]) for (const oy of [-SN, 0, SN]) { c.save(); c.translate(ox, oy); fn(); c.restore(); } };
  // cloudy mineral variation
  for (let i = 0; i < 70; i++) {
    const x = r() * SN, y = r() * SN, rad = 80 + r() * 300, lit = r() > 0.55;
    const a = 0.025 + r() * 0.05;
    wrap(() => {
      const g = c.createRadialGradient(x, y, 0, x, y, rad);
      g.addColorStop(0, lit ? `rgba(120,132,140,${a})` : `rgba(8,10,14,${a * 1.4})`);
      g.addColorStop(1, 'rgba(0,0,0,0)');
      c.fillStyle = g;
      c.fillRect(x - rad, y - rad, rad * 2, rad * 2);
    });
  }
  // cleavage: long, faint, nearly parallel laminations
  c.lineCap = 'round';
  for (let i = 0; i < 46; i++) {
    const y = r() * SN, a = 0.02 + r() * 0.05, wd = 0.6 + r() * 2.2, amp = 4 + r() * 14, ph = r() * TAU;
    const lit = r() > 0.4;
    wrap(() => {
      c.strokeStyle = lit ? `rgba(150,160,168,${a})` : `rgba(0,0,0,${a * 1.6})`;
      c.lineWidth = wd;
      c.beginPath();
      for (let x = -20; x <= SN + 20; x += 16) {
        const yy = y + 0.12 * x + amp * Math.sin(x * 0.006 + ph);
        if (x < 0) c.moveTo(x, yy); else c.lineTo(x, yy);
      }
      c.stroke();
    });
  }
  // fine grain + mica flecks
  const img = c.getImageData(0, 0, SN, SN), d = img.data;
  for (let i = 0; i < SN * SN; i++) {
    const n = (r() + r() - 1) * 9;
    const o = i * 4;
    d[o] += n; d[o + 1] += n; d[o + 2] += n * 1.1;
    if (r() > 0.9993) { d[o] += 40; d[o + 1] += 44; d[o + 2] += 48; }
  }
  c.putImageData(img, 0, 0);
}

// ------------------------------------------------------------------ cube details (unit square coordinates, -0.5..0.5)
const R = L.rng(1402);
const BUBBLES = Array.from({ length: 46 }, () => {
  const a = R() * TAU, d = Math.pow(R(), 1.6) * 0.32;
  return { x: Math.cos(a) * d, y: Math.sin(a) * d * 0.9, r: 0.004 + R() * R() * 0.016, a: 0.35 + R() * 0.5 };
});
const crack = (x0, y0, ang, len, seed) => {
  const r = L.rng(seed), pts = [[x0, y0]];
  let x = x0, y = y0, a = ang;
  const n = 9;
  for (let i = 0; i < n; i++) { a += (r() - 0.5) * 0.7; x += Math.cos(a) * len / n; y += Math.sin(a) * len / n; pts.push([x, y]); }
  return pts;
};
const CRACKS = [crack(-0.3, 0.12, -0.5, 0.36, 7), crack(0.18, -0.28, 2.2, 0.28, 8), crack(0.05, 0.22, 0.25, 0.2, 9)];
const NEW_CRACK = crack(-0.34, -0.2, 0.42, 0.66, 11);
// frosted core: feathery white rays (the last water to freeze traps the air)
const CLOUD = Array.from({ length: 9 }, () => ({ x: (R() - 0.5) * 0.24, y: (R() - 0.5) * 0.22, r: 0.1 + R() * 0.12, a: 0.25 + R() * 0.3 }));
const RAYS = Array.from({ length: 12 }, (_, i) => ({ a: (i / 12) * TAU + R() * 0.4, len: 0.1 + R() * 0.12, w: 0.01 + R() * 0.015 }));

const T_CRACK = 1.85;                    // beat-relative time the new crack runs (creak cue)
const DRIPS = [1.15, 2.55];

// ------------------------------------------------------------------ drawing
function drawTable(c, v, a) {
  if (!slateC) { buildSlate(); slatePat = c.createPattern(slateC, 'repeat'); }
  const cx = v.wx(0), cy = v.wy(R_EARTH);
  const s = v.ws(1);                                       // px per metre
  const x0 = cx + TABLE.x0 * s, y0 = cy + TABLE.y0 * s, w = (TABLE.x1 - TABLE.x0) * s, h = (TABLE.y1 - TABLE.y0) * s;
  c.save();
  c.globalAlpha = a;
  // a physical slab from the first moment its edges come on screen: a soft drop shadow on the snow, then the
  // slab's front (south) and east sides, seen from the camera a little to the south-east
  const lipX = Math.min(9, 0.012 * s), lipY = Math.min(15, 0.02 * s);
  if (w < W * 6) {
    // ambient occlusion all round (so even the first straight edge on screen casts onto the snow), then the
    // directional drop shadow
    c.fillStyle = 'rgba(20,38,56,0.3)';
    c.filter = `blur(${Math.max(3, Math.min(44, 0.05 * s))}px)`;
    L.roundRect(c, x0 - 4, y0 - 4, w + 8, h + 8, TABLE.r * s);
    c.fill();
    c.fillStyle = 'rgba(20,38,56,0.42)';
    c.filter = `blur(${Math.max(2, Math.min(34, 0.035 * s))}px)`;
    L.roundRect(c, x0 + Math.min(16, 0.02 * s), y0 + Math.min(26, 0.03 * s), w, h, TABLE.r * s);
    c.fill();
    c.filter = 'none';
    L.roundRect(c, x0 + lipX, y0 + lipY, w, h, TABLE.r * s);
    const sg = c.createLinearGradient(0, y0 + h, 0, y0 + h + lipY);
    sg.addColorStop(0, 'rgb(14,16,20)');
    sg.addColorStop(1, 'rgb(30,34,40)');
    c.fillStyle = sg;
    c.fill();
  }
  // the slab
  const clipX0 = Math.max(-10, x0), clipY0 = Math.max(-10, y0), clipX1 = Math.min(W + 10, x0 + w), clipY1 = Math.min(H + 10, y0 + h);
  if (clipX1 <= clipX0 || clipY1 <= clipY0) { c.restore(); return; }
  L.roundRect(c, x0, y0, w, h, TABLE.r * s);
  c.save();
  c.clip();
  const tile = 0.1 * s;                                     // one texture tile = 10 cm of slate
  slatePat.setTransform(new DOMMatrix().translateSelf(cx, cy).scaleSelf(tile / SN));
  c.fillStyle = slatePat;
  c.fillRect(clipX0, clipY0, clipX1 - clipX0, clipY1 - clipY0);
  // a second, larger octave breaks up the repeat once the tile gets small
  if (tile < 400) {
    slatePat.setTransform(new DOMMatrix().translateSelf(cx + 0.37 * s, cy + 0.21 * s).rotateSelf(23).scaleSelf(tile * 7.3 / SN));
    c.globalAlpha = a * 0.5 * L.clamp((400 - tile) / 300);
    c.fillRect(clipX0, clipY0, clipX1 - clipX0, clipY1 - clipY0);
    c.globalAlpha = a;
  }
  // a pool of window light, up-left of the cube (world space), and falloff into the dark
  const lx = cx - 0.035 * s, ly = cy - 0.05 * s;
  const lg = c.createRadialGradient(lx, ly, 0, lx, ly, 0.16 * s);
  lg.addColorStop(0, 'rgba(170,190,205,0.20)');
  lg.addColorStop(0.45, 'rgba(120,140,155,0.08)');
  lg.addColorStop(1, 'rgba(0,0,0,0)');
  c.fillStyle = lg;
  c.fillRect(clipX0, clipY0, clipX1 - clipX0, clipY1 - clipY0);
  const dk = c.createRadialGradient(lx, ly, 0.06 * s, lx, ly, 0.5 * s);
  dk.addColorStop(0, 'rgba(0,0,0,0)');
  dk.addColorStop(1, 'rgba(0,0,0,0.45)');
  c.fillStyle = dk;
  c.fillRect(clipX0, clipY0, clipX1 - clipX0, clipY1 - clipY0);
  // bevel inside the edges: the lit top/left arris, a shaded bottom/right one (feathers the hard edge)
  const bw = Math.max(6, Math.min(30, 0.03 * s));
  const band = (gx0, gy0, gx1, gy1, col, rx, ry, rw, rh) => {
    const g = c.createLinearGradient(gx0, gy0, gx1, gy1);
    g.addColorStop(0, col);
    g.addColorStop(1, 'rgba(0,0,0,0)');
    c.fillStyle = g;
    c.fillRect(rx, ry, rw, rh);
  };
  band(0, y0, 0, y0 + bw, 'rgba(190,205,220,0.2)', clipX0, y0, clipX1 - clipX0, bw);
  band(x0, 0, x0 + bw, 0, 'rgba(190,205,220,0.10)', x0, clipY0, bw, clipY1 - clipY0);
  band(0, y0 + h, 0, y0 + h - bw, 'rgba(0,0,0,0.38)', clipX0, y0 + h - bw, clipX1 - clipX0, bw);
  band(x0 + w, 0, x0 + w - bw, 0, 'rgba(0,0,0,0.3)', x0 + w - bw, clipY0, bw, clipY1 - clipY0);
  c.restore();
  // crisp arrises: a bright one on the lit (top, left) edges, a faint one elsewhere
  c.strokeStyle = 'rgba(150,165,180,0.22)';
  c.lineWidth = Math.max(1, Math.min(2, 0.003 * s));
  L.roundRect(c, x0, y0, w, h, TABLE.r * s);
  c.stroke();
  const lg2 = c.createLinearGradient(x0, y0, x0 + w * 0.6, y0 + h * 0.6);
  lg2.addColorStop(0, 'rgba(215,228,240,0.6)');
  lg2.addColorStop(1, 'rgba(215,228,240,0)');
  c.strokeStyle = lg2;
  c.lineWidth = Math.max(1, Math.min(2.5, 0.004 * s));
  const rr = TABLE.r * s;
  c.beginPath();
  c.moveTo(x0, y0 + h - rr); c.lineTo(x0, y0 + rr); c.quadraticCurveTo(x0, y0, x0 + rr, y0); c.lineTo(x0 + w - rr, y0);
  c.stroke();
  c.restore();
}

/** Puddle outline (px), around the cube base, growing with g (0..1): a smooth, slightly lobed film. */
function puddlePath(c, x, y, s, g, gt) {
  const n = 96;
  c.beginPath();
  for (let i = 0; i <= n; i++) {
    const a = (i / n) * TAU;
    const lobe = 0.07 * Math.sin(2 * a + 1.1) + 0.05 * Math.sin(3 * a + 2.3) + 0.035 * Math.sin(5 * a + 0.4) + 0.006 * Math.sin(7 * a + gt * 0.8);
    const rr = s * (0.7 + 0.22 * g) * (1 + lobe);
    // the water runs further to the lower right (the table is not quite level)
    const bias = 1 + (0.12 + 0.2 * g) * Math.max(0, Math.cos(a - 0.85)) ** 2;
    const px = x + 0.06 * s + Math.cos(a) * rr * bias, py = y + 0.08 * s + Math.sin(a) * rr * 0.96 * bias;
    if (i === 0) c.moveTo(px, py); else c.lineTo(px, py);
  }
  c.closePath();
}

function drawCube(c, v, a) {
  const x = v.wx(0), y = v.wy(R_EARTH), s = v.ws(CUBE);
  if (s < 0.5) return;
  const gt = v.gt;
  const melt = L.clamp((gt - v.tl.scenes[0].start) / 9);   // 14b: beat-relative (the film starts after the preroll);
  // corners round, puddle spreads (keeps going in beat 1)
  c.save();
  c.globalAlpha = a;
  // ---- puddle: a glossy film of meltwater (darkened wet slate, a soft meniscus highlight on the edge that faces
  // the light, a faint refraction of the cube near its base); no outline
  puddlePath(c, x, y, s, melt, gt);
  c.save();
  c.filter = `blur(${Math.max(0.5, 0.015 * s)}px)`;
  c.fillStyle = 'rgba(4,7,12,0.42)';
  c.fill();
  c.filter = 'none';
  c.restore();
  c.save();
  puddlePath(c, x, y, s, melt, gt);
  c.clip();
  const pg = c.createLinearGradient(x - s, y - s, x + s, y + s);
  pg.addColorStop(0, 'rgba(150,190,215,0.08)');
  pg.addColorStop(0.6, 'rgba(120,160,190,0.015)');
  pg.addColorStop(1, 'rgba(150,190,215,0.06)');
  c.fillStyle = pg;
  c.fillRect(x - 2 * s, y - 2 * s, 4 * s, 4 * s);
  // meniscus: a blurred bright rim, only where the edge faces the light (upper left / far side)
  c.globalCompositeOperation = 'lighter';
  c.filter = `blur(${Math.max(0.6, 0.03 * s)}px)`;
  const mg = c.createLinearGradient(x - 0.9 * s, y - 0.9 * s, x + 0.4 * s, y + 0.4 * s);
  mg.addColorStop(0, 'rgba(200,228,245,0.34)');
  mg.addColorStop(0.45, 'rgba(200,228,245,0.08)');
  mg.addColorStop(1, 'rgba(200,228,245,0)');
  c.strokeStyle = mg;
  c.lineWidth = Math.max(1, 0.07 * s);
  puddlePath(c, x, y, s, melt, gt);
  c.stroke();
  // lower-right edge: a much fainter sheen where the film thins out
  const mg2 = c.createLinearGradient(x + 0.2 * s, y + 0.2 * s, x + 1.1 * s, y + 1.1 * s);
  mg2.addColorStop(0, 'rgba(200,228,245,0)');
  mg2.addColorStop(1, 'rgba(200,228,245,0.12)');
  c.strokeStyle = mg2;
  c.lineWidth = Math.max(1, 0.04 * s);
  c.stroke();
  c.filter = 'none';
  // the cube refracted in the film just past its base
  L.lightBlob(c, x + 0.62 * s, y + 0.55 * s, 0.22 * s, [190, 228, 248], 0.1);
  c.globalCompositeOperation = 'source-over';
  // drip ripples (a drop falls from the lower-right edge): soft, fading as they spread
  for (const t0 of DRIPS) {
    const p = L.prog(v.t, t0, 1.8);
    if (p <= 0 || p >= 1 || v.beat > 1) continue;
    const rx = x + 0.66 * s, ry = y + 0.62 * s;
    for (const k of [0, 0.16, 0.3]) {
      const q = L.clamp((p - k) / (1 - k));
      if (q <= 0) continue;
      const e = L.ease.outCubic(q);
      const fade = Math.pow(1 - e, 1.6) * (1 - k);
      c.strokeStyle = `rgba(200,230,245,${0.34 * fade})`;
      c.lineWidth = Math.max(0.6, 0.008 * s * (1 - 0.5 * e));
      c.beginPath(); c.ellipse(rx, ry, Math.max(0, 0.36 * s * e), Math.max(0, 0.27 * s * e), 0.35, 0, TAU); c.stroke();
    }
  }
  c.restore();

  // ---- contact shadow and caustic (light from the upper left, falling to the lower right)
  // f14v1: a real 3/4 view of a cube: the top face sits up-left of the base by (dx, dy), so the south and east side
  // faces show as two clearly shaded walls (before, a 0.1-cube offset made it read as a flat rounded tile).
  const h = s / 2;
  const rad = s * (0.075 + 0.09 * melt);                     // melting corners
  const dx = 0.2 * s, dy = 0.27 * s;                          // base → top offset on screen (camera up and to the SE)
  const tx = x - dx / 2, ty = y - dy / 2;                     // top face centre
  const bx = x + dx / 2, by = y + dy / 2, bh = h * 0.97;      // base centre / half size (a hint of perspective)
  c.save();
  c.filter = `blur(${Math.max(0.5, 0.07 * s)}px)`;
  c.fillStyle = 'rgba(0,0,0,0.6)';
  L.roundRect(c, bx - bh - 0.02 * s, by - bh + 0.05 * s, 2 * bh + 0.12 * s, 2 * bh + 0.06 * s, rad * 1.4);
  c.fill();
  c.filter = 'none';
  c.restore();
  // the cube focuses the light into a soft bright patch inside its own shadow
  L.lightBlob(c, bx + 0.34 * s, by + 0.38 * s, 0.34 * s, [140, 200, 230], 0.2);
  L.lightBlob(c, bx + 0.4 * s, by + 0.44 * s, 0.12 * s, [220, 245, 255], 0.22);

  // ---- body: the exact swept silhouette (the rounded square moved from the base up to the top face), one fill
  const N = Math.max(8, Math.ceil(Math.hypot(dx, dy) / 2));
  const hull = () => {
    c.beginPath();
    for (let i = 0; i <= N; i++) {
      const k = i / N, cx2 = L.lerp(bx, tx, k), cy2 = L.lerp(by, ty, k), hh = L.lerp(bh, h, k);
      c.roundRect(cx2 - hh, cy2 - hh, hh * 2, hh * 2, rad);
    }
  };
  hull();
  c.fillStyle = 'rgba(84,126,156,0.94)';
  c.fill();
  c.save();
  hull();
  c.clip();
  const sx = tx + h, sy = ty + h;                            // the top face's south-east corner (the near vertical edge)
  const BIG = 4 * s;
  // east wall (faces right, away from the light): cool and darker towards the base
  let gw = c.createLinearGradient(sx, ty - h, sx + dx, ty - h + dy);
  gw.addColorStop(0, 'rgba(118,166,196,0.95)');
  gw.addColorStop(1, 'rgba(58,94,124,0.96)');
  c.fillStyle = gw;
  c.beginPath(); c.moveTo(sx, ty - h - BIG); c.lineTo(sx + BIG, ty - h - BIG); c.lineTo(sx + dx * 6, sy + dy * 6); c.lineTo(sx, sy); c.closePath();
  c.fill();
  // south wall (faces the camera): a little brighter, light gathered along its foot
  gw = c.createLinearGradient(tx - h, sy, tx - h + dx, sy + dy);
  gw.addColorStop(0, 'rgba(140,186,212,0.95)');
  gw.addColorStop(1, 'rgba(80,120,150,0.96)');
  c.fillStyle = gw;
  c.beginPath(); c.moveTo(tx - h - BIG, sy); c.lineTo(sx, sy); c.lineTo(sx + dx * 6, sy + dy * 6); c.lineTo(tx - h - BIG, sy + BIG); c.closePath();
  c.fill();
  // inside the walls: the frosted core glows through, and refracted light pools along the foot of each wall
  L.lightBlob(c, x + 0.02 * s, y + 0.18 * s, 0.32 * s, [225, 240, 250], 0.16);
  c.globalCompositeOperation = 'lighter';
  c.filter = `blur(${Math.max(0.5, 0.025 * s)}px)`;
  c.strokeStyle = 'rgba(170,220,245,0.32)';
  c.lineWidth = Math.max(1, 0.03 * s);
  c.beginPath();
  c.moveTo(bx - bh + rad, by + bh - 0.03 * s); c.lineTo(bx + bh - rad, by + bh - 0.03 * s);
  c.quadraticCurveTo(bx + bh - 0.03 * s, by + bh - 0.03 * s, bx + bh - 0.03 * s, by + bh - rad);
  c.lineTo(bx + bh - 0.03 * s, by - bh + rad);
  c.stroke();
  // the rounded near vertical edge catches a soft specular streak
  c.strokeStyle = 'rgba(215,240,255,0.42)';
  c.lineWidth = Math.max(1, 0.035 * s);
  c.beginPath(); c.moveTo(sx - rad * 0.3, sy - rad * 0.3); c.lineTo(bx + bh - rad * 0.3, by + bh - rad * 0.3); c.stroke();
  c.filter = 'none';
  c.restore();
  // crisp silhouette: a fine bright rim where the walls meet the slate
  c.save();
  c.globalCompositeOperation = 'lighter';
  c.strokeStyle = 'rgba(190,230,250,0.3)';
  c.lineWidth = Math.max(0.6, 0.008 * s);
  c.beginPath();
  c.moveTo(bx - bh + rad, by + bh); c.lineTo(bx + bh - rad, by + bh);
  c.quadraticCurveTo(bx + bh, by + bh, bx + bh, by + bh - rad);
  c.lineTo(bx + bh, by - bh + rad);
  c.stroke();
  c.restore();

  // ---- top face: clear ice (the dark slate shows through), bright total-internal-reflection rim, frosted core
  const TL = [tx - h, ty - h];
  const face = () => L.roundRect(c, TL[0], TL[1], s, s, rad);
  face();
  let g = c.createLinearGradient(TL[0], TL[1], TL[0] + s, TL[1] + s);
  g.addColorStop(0, 'rgba(150,190,212,0.93)');
  g.addColorStop(0.5, 'rgba(96,132,158,0.94)');
  g.addColorStop(1, 'rgba(74,108,135,0.95)');
  c.fillStyle = g;
  c.fill();
  c.save();
  face();
  c.clip();
  // inner rim: edges light up (stacked strokes clipped to the face)
  c.filter = `blur(${Math.max(0.5, 0.06 * s)}px)`;
  c.strokeStyle = 'rgba(220,240,252,0.55)';
  c.lineWidth = 0.16 * s;
  face();
  c.stroke();
  c.filter = 'none';
  c.strokeStyle = 'rgba(225,244,255,0.35)';
  c.lineWidth = 0.035 * s;
  face();
  c.stroke();
  if (s > 12) {
    // frosted core: soft cloudy white, feathered towards the faces' centres
    const fx = tx + 0.03 * s, fy = ty + 0.02 * s;
    for (const cl of CLOUD) {
      const cx3 = fx + cl.x * s, cy3 = fy + cl.y * s, rr = cl.r * s;
      const cg = c.createRadialGradient(cx3, cy3, 0, cx3, cy3, rr);
      cg.addColorStop(0, `rgba(250,253,255,${cl.a})`);
      cg.addColorStop(0.55, `rgba(232,244,252,${cl.a * 0.4})`);
      cg.addColorStop(1, 'rgba(232,244,252,0)');
      c.fillStyle = cg;
      c.fillRect(cx3 - rr, cy3 - rr, rr * 2, rr * 2);
    }
    c.lineCap = 'round';
    for (const ry of RAYS) {
      const sx = fx + Math.cos(ry.a) * 0.06 * s, sy = fy + Math.sin(ry.a) * 0.06 * s;
      const ex = fx + Math.cos(ry.a) * ry.len * s, ey = fy + Math.sin(ry.a) * ry.len * s;
      const lg = c.createLinearGradient(sx, sy, ex, ey);
      lg.addColorStop(0, 'rgba(255,255,255,0.16)');
      lg.addColorStop(1, 'rgba(255,255,255,0)');
      c.strokeStyle = lg;
      c.lineWidth = Math.max(0.5, ry.w * s * 1.6);
      c.beginPath(); c.moveTo(sx, sy); c.lineTo(ex, ey); c.stroke();
    }
  }
  if (s > 40) {
    // bubbles: a dark rim and a pin-point highlight each
    for (const b of BUBBLES) {
      const bx2 = tx + b.x * s, by2 = ty + b.y * s, br = Math.max(0.5, b.r * s * 0.8);
      c.strokeStyle = `rgba(40,70,95,${0.4 * b.a})`;
      c.lineWidth = Math.max(0.5, br * 0.3);
      c.beginPath(); c.arc(bx2, by2, br, 0, TAU); c.stroke();
      c.fillStyle = `rgba(255,255,255,${0.9 * b.a})`;
      c.beginPath(); c.arc(bx2 - br * 0.35, by2 - br * 0.35, Math.max(0, br * 0.35), 0, TAU); c.fill();
    }
    // cracks: a bright fracture plane with a faint dark side
    const drawCrack = (pts, k) => {
      const n = Math.max(1, Math.round((pts.length - 1) * k));
      for (const [col, wd, ox] of [['rgba(20,40,60,0.35)', 0.007, 0.004], ['rgba(240,250,255,0.7)', 0.0045, 0]]) {
        c.strokeStyle = col;
        c.lineWidth = Math.max(0.5, wd * s);
        c.beginPath();
        for (let i = 0; i <= n; i++) {
          const f = (pts.length - 1) * k - (n - 1);
          const p = i < n ? pts[i] : [L.lerp(pts[n - 1][0], pts[n][0], L.clamp(f)), L.lerp(pts[n - 1][1], pts[n][1], L.clamp(f))];
          const px = tx + (p[0] + ox) * s, py = ty + (p[1] + ox) * s;
          if (i === 0) c.moveTo(px, py); else c.lineTo(px, py);
        }
        c.stroke();
      }
    };
    for (const ck of CRACKS) drawCrack(ck, 1);
    const kcrack = v.beat === 0 ? L.ease.outCubic(L.prog(v.t, T_CRACK, 0.35)) : 1;
    if (kcrack > 0) {
      drawCrack(NEW_CRACK, kcrack);
      const fl = (v.beat === 0 ? 1 : 0) * Math.sin(Math.PI * L.prog(v.t, T_CRACK, 0.6));
      if (fl > 0.01) {
        const mid = NEW_CRACK[Math.min(NEW_CRACK.length - 1, Math.round((NEW_CRACK.length - 1) * kcrack))];
        L.lightBlob(c, tx + mid[0] * s, ty + mid[1] * s, 0.25 * s, [220, 245, 255], 0.45 * fl);
      }
    }
  }
  // window reflection: a soft diagonal sheen that drifts slowly with the camera
  const sh = 0.5 + 0.5 * Math.sin(gt * 0.7);
  c.save();
  c.globalCompositeOperation = 'lighter';
  const wx0 = TL[0] + (0.05 + 0.1 * sh) * s;
  const sg = c.createLinearGradient(wx0, TL[1], wx0 + 0.5 * s, TL[1] + 0.5 * s);
  sg.addColorStop(0, 'rgba(255,255,255,0)');
  sg.addColorStop(0.35, 'rgba(255,255,255,0.13)');
  sg.addColorStop(0.5, 'rgba(255,255,255,0.03)');
  sg.addColorStop(0.62, 'rgba(255,255,255,0.08)');
  sg.addColorStop(1, 'rgba(255,255,255,0)');
  c.fillStyle = sg;
  c.fillRect(TL[0], TL[1], s, s);
  c.restore();
  c.restore();
  // edges: crisp specular on the lit (top-left) edges, a fine rim elsewhere
  face();
  c.strokeStyle = 'rgba(225,244,255,0.5)';
  c.lineWidth = Math.max(0.6, 0.008 * s);
  c.stroke();
  c.save();
  c.globalCompositeOperation = 'lighter';
  c.lineCap = 'round';
  const e = 0.015 * s;
  // tapered specular strokes: strongest at the top-left corner, fading along each edge
  const edge = (alpha, wd) => {
    c.lineWidth = Math.max(0.6, wd * s);
    let g2 = c.createLinearGradient(0, TL[1], 0, TL[1] + 0.8 * s);
    g2.addColorStop(0, `rgba(255,255,255,${alpha})`);
    g2.addColorStop(1, 'rgba(255,255,255,0)');
    c.strokeStyle = g2;
    c.beginPath(); c.moveTo(TL[0] + e, TL[1] + 0.8 * s); c.lineTo(TL[0] + e, TL[1] + rad); c.quadraticCurveTo(TL[0] + e, TL[1] + e, TL[0] + rad, TL[1] + e); c.stroke();
    g2 = c.createLinearGradient(TL[0], 0, TL[0] + 0.85 * s, 0);
    g2.addColorStop(0, `rgba(255,255,255,${alpha})`);
    g2.addColorStop(1, 'rgba(255,255,255,0)');
    c.strokeStyle = g2;
    c.beginPath(); c.moveTo(TL[0] + rad, TL[1] + e); c.lineTo(TL[0] + 0.85 * s, TL[1] + e); c.stroke();
  };
  edge(0.22, 0.045);
  edge(0.8, 0.011);
  // the far edges seen THROUGH the ice: faint bright internal reflections inset along the bottom and right
  c.strokeStyle = 'rgba(220,242,255,0.13)';
  c.lineWidth = Math.max(0.6, 0.012 * s);
  const ins = 0.09 * s;
  c.beginPath();
  c.moveTo(TL[0] + 0.2 * s, TL[1] + s - ins);
  c.lineTo(TL[0] + s - ins - rad * 0.6, TL[1] + s - ins);
  c.quadraticCurveTo(TL[0] + s - ins, TL[1] + s - ins, TL[0] + s - ins, TL[1] + s - ins - rad * 0.6);
  c.lineTo(TL[0] + s - ins, TL[1] + 0.2 * s);
  c.stroke();
  // a sharp glint that slides along the top edge
  const sp = 0.2 + 0.55 * (0.5 + 0.5 * Math.sin(gt * 0.9));
  L.lightBlob(c, TL[0] + sp * s, TL[1] + e, 0.07 * s, [255, 255, 255], 0.8);
  L.lightBlob(c, TL[0] + rad * 0.55, TL[1] + rad * 0.55, 0.1 * s, [255, 255, 255], 0.55);
  c.restore();
  c.restore();
}

/** Once the cube is a few pixels wide: a star-shaped glint, until it is sub-pixel. */
function drawGlint(c, v) {
  const s = v.ws(CUBE);
  const k = L.clamp(L.invLerp(10, 3, s)) * L.clamp(L.invLerp(0.25, 0.9, s));
  if (k <= 0.01) return;
  const x = v.wx(0), y = v.wy(R_EARTH);
  const tw = 0.75 + 0.25 * Math.sin(v.gt * 9);
  c.save();
  c.globalCompositeOperation = 'lighter';
  L.lightBlob(c, x, y, 16, [210, 240, 255], 0.6 * k);
  c.globalAlpha = k * tw;
  c.fillStyle = '#fff';
  const a = 12 * tw;
  c.beginPath(); c.moveTo(x - a, y); c.lineTo(x, y - 1.2); c.lineTo(x + a, y); c.lineTo(x, y + 1.2); c.closePath(); c.fill();
  c.beginPath(); c.moveTo(x, y - a); c.lineTo(x + 1.2, y); c.lineTo(x, y + a); c.lineTo(x - 1.2, y); c.closePath(); c.fill();
  c.restore();
}

// ------------------------------------------------------------------ headline
function drawHeadline(c, v) {
  const t = v.t;
  const kout = L.ease.inCubic(L.prog(t, v.d - 0.15, 0.3));   // f14v1: holds until the first caption arrives (no empty beat)
  if (kout >= 1) return;
  const size = 104, lh = 112;
  const yb2 = 578;                                         // second line baseline; first line at 466 (y 380-600 band)
  c.save();
  c.textBaseline = 'alphabetic';
  // soft dark backing so the type sits off the table's light pool
  const bg = c.createRadialGradient(W / 2, yb2 - lh * 0.55, 30, W / 2, yb2 - lh * 0.55, 560);
  bg.addColorStop(0, `rgba(2,5,10,${0.42 * (1 - kout)})`);
  bg.addColorStop(1, 'rgba(2,5,10,0)');
  c.fillStyle = bg;
  c.fillRect(0, yb2 - lh * 0.55 - 560, W, 1120);
  const lines = [[['WHAT', 0], ['IF', 0], ['ALL', 0], ['THE', 0]], [['ICE', 1], ['MELTED?', 1]]];
  c.font = L.font(size, 800, L.FONT.display);
  const sp = 24;
  lines.forEach((words, li) => {
    const ws = words.map(([w]) => c.measureText(w).width);
    const total = ws.reduce((a, b) => a + b, 0) + sp * (words.length - 1);
    let x = W / 2 - total / 2;
    const yb = yb2 - (1 - li) * lh;
    words.forEach(([w, acc], wi) => {
      const st = -0.3 + li * 0.34 + wi * 0.07;              // frame 0: line 1 already rising in
      const e = L.ease.outQuint(L.prog(t, st, 0.75));
      if (e > 0) {
        c.save();
        c.beginPath(); c.rect(x - 12, yb - size * 1.05, ws[wi] + 24, size * 1.32); c.clip();
        c.globalAlpha = L.clamp(e * 1.6) * (1 - kout);
        c.fillStyle = acc ? L.rgba(ACCENT) : 'rgb(242,246,250)';
        c.shadowColor = 'rgba(0,0,0,0.6)';
        c.shadowBlur = 22;
        const dy = (1 - e) * size * 0.95 - kout * 26;
        c.fillText(w, x, yb + dy);
        if (acc) {
          // a cold glint runs through "ICE MELTED?" once it has landed
          const gp = L.prog(t, 0.95 + wi * 0.12, 0.85);
          if (gp > 0 && gp < 1) {
            c.globalCompositeOperation = 'lighter';
            const gx = x - 90 + (ws[wi] + 180) * L.ease.inOutCubic(gp);
            const gg = c.createLinearGradient(gx - 70, 0, gx + 70, 0);
            gg.addColorStop(0, 'rgba(255,255,255,0)');
            gg.addColorStop(0.5, 'rgba(225,250,255,0.8)');
            gg.addColorStop(1, 'rgba(255,255,255,0)');
            c.fillStyle = gg;
            c.shadowBlur = 0;
            c.fillText(w, x, yb + dy);
          }
        }
        c.restore();
      }
      x += ws[wi] + sp;
    });
  });
  // accent rule under the headline, wiping out from the centre
  const re = L.ease.outCubic(L.prog(t, 0.55, 0.7)) * (1 - kout);
  if (re > 0) {
    c.fillStyle = L.rgba(ACCENT, 0.9 * re);
    c.fillRect(W / 2 - 70 * re, yb2 + 32, 140 * re, 4);
  }
  c.restore();
}

// ------------------------------------------------------------------ scene
/** Table opacity: the slab dissolves into the ice field before its silhouette can read (mpp 0.0007-0.003). */
// f14v1: a short uniform dissolve (mpp 3.6e-4 → 5.2e-4, ≈ 4 frames, gone before the slab's far edge enters the frame) over snow that is already fully drawn under it
const tableK = (mpp) => 1 - L.smoothstep(L.clamp(L.invLerp(Math.log10(0.00036), Math.log10(0.00052), Math.log10(mpp))));
/** Radial feather strength: from mpp 0.0003 (the slab still overfills the frame) the table melts into the snow
 *  from its edges inward, so its rectangular silhouette and drop shadow never show. */
// f14v1: off (the radial feather left a dark disc round the cube that muddied the hand-over)
const featherK = () => 0;
let featherC = null;
function drawTableFeathered(c, v, a) {
  const m = featherK(v.cam.mpp);
  if (m <= 0.001) { drawTable(c, v, a); return; }
  if (!featherC) featherC = new OffscreenCanvas(W, H);
  const fc = featherC.getContext('2d');
  fc.setTransform(1, 0, 0, 1, 0, 0);
  fc.globalCompositeOperation = 'source-over';
  fc.globalAlpha = 1;
  fc.clearRect(0, 0, W, H);
  drawTable(fc, v, 1);
  // soft radial mask around the cube: opaque core, long feather that ends inside the slab's nearest edge (0.44 m)
  const cx = v.wx(0), cy = v.wy(R_EARTH), s = v.ws(1);
  const ri = 0.08 * s, ro = 0.40 * s;
  const g = fc.createRadialGradient(cx, cy, Math.max(0, ri), cx, cy, Math.max(ri + 1, ro));
  for (let i = 0; i <= 8; i++) {
    const u = i / 8;
    g.addColorStop(u, `rgba(0,0,0,${1 - m * L.smoothstep(u)})`);
  }
  fc.globalCompositeOperation = 'destination-in';
  fc.fillStyle = g;
  fc.fillRect(0, 0, W, H);
  fc.globalCompositeOperation = 'source-over';
  c.save();
  c.globalAlpha = a;
  c.drawImage(featherC, 0, 0);
  c.restore();
}

export default {
  beat: 0,
  chapter: null,
  captions: false,
  layer: 0,
  cues(d) {
    return [
      { t: 0.0, name: 'swell', gain: 0.28, pitch: 0.7 },
      { t: 0.04, name: 'swish', gain: 0.22, pitch: 0.95 },
      { t: 0.36, name: 'swish', gain: 0.2, pitch: 1.15 },
      { t: 0.98, name: 'shimmer', gain: 0.2, pitch: 1.2 },
      { t: DRIPS[0], name: 'blip', gain: 0.1, pitch: 1.6 },
      { t: T_CRACK, name: 'creak', gain: 0.26, pitch: 1.1 },
      { t: DRIPS[1], name: 'blip', gain: 0.09, pitch: 1.45 },
      { t: d - 0.65, name: 'riser', gain: 0.16, pitch: 1.0 },
    ];
  },
  drawWorld(ctx, v) {
    const mpp = v.cam.mpp;
    if (mpp > 0.5 || v.gt > v.tl.scenes[2].start) return;  // the cube and the table are long gone (and the dive
                                                             // in beat 4 reaches small mpp again, far from here)
    const ka = tableK(mpp);
    if (ka > 0.001) drawTableFeathered(ctx, v, ka);
    // f14v1: the eye adapting from the dim room to polar daylight: a brief bright veil over the dissolve
    const bloom = Math.sin(Math.PI * L.clamp(L.invLerp(Math.log10(0.00032), Math.log10(0.0006), Math.log10(mpp))));
    if (bloom > 0.01) { ctx.save(); ctx.fillStyle = `rgba(238,244,248,${0.62 * bloom})`; ctx.fillRect(0, 0, W, H); ctx.restore(); }
    // the cube outlives the table a little, then hands over to the glint
    const kc = 1 - L.smoothstep(L.clamp(L.invLerp(Math.log10(0.006), Math.log10(0.012), Math.log10(mpp))));
    if (kc > 0.001) drawCube(ctx, v, kc);
    drawGlint(ctx, v);
    if (v.t < v.d + 0.2) { ctx.save(); drawHeadline(ctx, v); ctx.restore(); }
  },
};
