// Environment for "How deep is the ocean": water, surface, light, terrain, particles, HUD.
// Owned by the orchestrator — scene builders: read, don't edit. Use the exported helpers.
import * as L from '../../../engine/runtime/lib.js';
import { KEYS, REVEAL_TIMES, scrollPx } from './camera.js';

const { W, H } = L;
export const ACCENT = [70, 205, 215];
export const TRENCH_FLOOR = 10935;
export const PLAIN = 3800;

// ------------------------------------------------------------------ colour by depth
const WATER = [
  [0, [38, 160, 196]], [40, [22, 112, 160]], [120, [12, 66, 118]], [200, [8, 40, 84]],
  [500, [5, 22, 50]], [1000, [3, 12, 30]], [3000, [2, 7, 18]], [11000, [1, 3, 9]],
];
export const waterColor = (depth) => L.ramp(WATER, depth);
const SKY = [[-1e9, [120, 175, 220]], [-3, [175, 214, 236]], [0, [214, 236, 246]]];

/** Light level 0..1 at a depth (for scenes that want to dim their subject with depth). */
export const lightAt = (depth) => L.clamp(Math.exp(-Math.max(0, depth) / 70));

// ------------------------------------------------------------------ terrain (world metres)
/** Seafloor depth at world x. Plain at 3,800 m for x > −300; a wide trench to the left
 *  (wall −300 → −2300, flat floor −2300 → −8300, so Everest stands free on it). */
export function floorY(x) {
  if (x > -300) return PLAIN + 6 * L.noise1(x / 40, 3) + 14 * L.noise1(x / 400, 4);
  if (x > -2300) return L.lerp(PLAIN, TRENCH_FLOOR, L.smoothstep((-300 - x) / 2000)) + 40 * L.noise1(x / 90, 5) * Math.sin(Math.PI * (-300 - x) / 2000);
  if (x > -8300) return TRENCH_FLOOR + 8 * L.noise1(x / 60, 6);
  if (x > -10300) return L.lerp(TRENCH_FLOOR, 6200, L.smoothstep((-8300 - x) / 2000)) + 50 * L.noise1(x / 110, 7);
  return 6200 + 40 * L.noise1(x / 300, 8);
}

function drawTerrain(c, v) {
  const { cam } = v;
  const x0 = cam.x - (W / 2 + 40) * cam.mpp, x1 = cam.x + (W / 2 + 40) * cam.mpp;
  const minY = Math.min(...[0, 0.25, 0.5, 0.75, 1].map((f) => floorY(L.lerp(x0, x1, f))));
  if (!v.visibleY(minY - 200, TRENCH_FLOOR + 200, 400)) return;
  const n = 160;
  c.beginPath();
  for (let i = 0; i <= n; i++) {
    const x = L.lerp(x0, x1, i / n);
    const sx = v.wx(x), sy = v.wy(floorY(x));
    i ? c.lineTo(sx, sy) : c.moveTo(sx, sy);
  }
  c.lineTo(W + 50, H + 50);
  c.lineTo(-50, H + 50);
  c.closePath();
  const g = c.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, '#0b1018');
  g.addColorStop(1, '#05070b');
  c.fillStyle = g;
  c.fill();
  // rim light along the floor (brighter when zoomed out, so the trench reads during the pull-back)
  const far = L.clamp((cam.mpp - 0.6) / 2.5);
  c.save();
  c.strokeStyle = L.rgba([110, 170, 190], 0.35 + 0.3 * far);
  c.lineWidth = 2 + far;
  c.shadowColor = `rgba(110,190,210,${0.5 * far})`;
  c.shadowBlur = 10 * far;
  c.beginPath();
  for (let i = 0; i <= n; i++) {
    const x = L.lerp(x0, x1, i / n);
    i ? c.lineTo(v.wx(x), v.wy(floorY(x))) : c.moveTo(v.wx(x), v.wy(floorY(x)));
  }
  c.stroke();
  c.restore();
}

// ------------------------------------------------------------------ background
export function drawBackground(c, v) {
  const { cam } = v;
  const depthAt = (sy) => cam.y + (sy - H * cam.anchor) * cam.mpp;
  const g = c.createLinearGradient(0, 0, 0, H);
  for (let i = 0; i <= 16; i++) {
    const d = depthAt((H * i) / 16);
    g.addColorStop(i / 16, L.rgba(d < 0 ? L.ramp(SKY, d) : waterColor(d)));
  }
  c.fillStyle = g;
  c.fillRect(0, 0, W, H);

  const sy = v.wy(0);
  // god rays from the surface, fading with depth
  const rayK = L.clamp(1 - depthAt(H * 0.5) / 320);
  if (rayK > 0 && sy < H) {
    c.save();
    c.globalCompositeOperation = 'lighter';
    const rows = [[-0.9, 0.5], [-0.45, 0.8], [-0.05, 0.6], [0.35, 0.9], [0.8, 0.5], [1.2, 0.7]];
    rows.forEach(([ox, a], i) => {
      const sway = L.noise1(v.gt * 0.25 + i, 9) * 0.12;
      const topX = W * (0.5 + ox * 0.6 + sway), len = Math.max(0, 260 / cam.mpp);
      const spread = 0.18 + i * 0.02;
      const rg = c.createLinearGradient(0, Math.max(sy, -10), 0, sy + len);
      rg.addColorStop(0, 'rgba(200,240,255,0)');
      rg.addColorStop(L.clamp(90 / Math.max(1, len)), `rgba(200,240,255,${0.16 * a * rayK})`);
      rg.addColorStop(1, 'rgba(200,240,255,0)');
      c.fillStyle = rg;
      c.beginPath();
      c.moveTo(topX - 30, sy);
      c.lineTo(topX + 30, sy);
      c.lineTo(topX + 30 + len * spread, sy + len);
      c.lineTo(topX - 30 + len * spread * 0.4, sy + len);
      c.closePath();
      c.fill();
    });
    c.restore();
  }

  // surface line + caustic shimmer
  if (sy > -200 && sy < H + 200) {
    const amp = L.clamp(0.25 / cam.mpp, 0, 22);
    c.save();
    c.beginPath();
    for (let x = -20; x <= W + 20; x += 8) {
      const y = sy + Math.sin(x * 0.012 + v.gt * 2.2) * amp + Math.sin(x * 0.031 - v.gt * 1.4) * amp * 0.4;
      x === -20 ? c.moveTo(x, y) : c.lineTo(x, y);
    }
    c.strokeStyle = 'rgba(235,250,255,0.9)';
    c.lineWidth = L.clamp(0.04 / cam.mpp, 1.5, 6);
    c.stroke();
    c.lineTo(W + 20, sy + 60 * amp);
    c.lineTo(-20, sy + 60 * amp);
    c.closePath();
    const sg = c.createLinearGradient(0, sy, 0, sy + 60 * amp);
    sg.addColorStop(0, 'rgba(160,230,250,0.35)');
    sg.addColorStop(1, 'rgba(160,230,250,0)');
    c.fillStyle = sg;
    c.fill();
    c.restore();
  }
  drawTerrain(c, v);
  drawParticles(c, v, 0);
}

// ------------------------------------------------------------------ particles ("marine snow")
const LAYERS = [
  { n: 70, size: [1, 2.2], factor: 0.35, alpha: 0.35, seed: 11 },
  { n: 45, size: [2, 3.5], factor: 0.7, alpha: 0.45, seed: 12 },
  { n: 14, size: [5, 9], factor: 1.5, alpha: 0.25, seed: 13 },   // foreground, drawn in drawForeground
];
const PART = LAYERS.map((l) => { const r = L.rng(l.seed); return Array.from({ length: l.n }, () => [r() * W, r() * H * 1.4, r(), r()]); });

function drawParticles(c, v, which) {
  const surfaceY = v.wy(0);
  // camera speed in px/s -> particles streak during travel so every dive reads as fast
  const vel = (v.cam.scroll - scrollPx(Math.max(0, v.gt - 1 / 30), v.tl)) * 30;
  // the final pull-back is a zoom-out, not a dive: no speed streaks there
  const s6 = v.tl.scenes[6], u6 = (v.gt - s6.start) / (s6.end - s6.start);
  const calm = 1 - L.clamp(Math.min((u6 - REVEAL_TIMES.start + 0.04) / 0.04, (REVEAL_TIMES.end + 0.06 - u6) / 0.04));
  const idxs = which === 0 ? [0, 1] : [2];
  c.save();
  for (const li of idxs) {
    const l = LAYERS[li];
    for (const [px, py, s, ph] of PART[li]) {
      const span = H * 1.4;
      const y = (((py - v.cam.scroll * l.factor - v.gt * 12 * l.factor) % span) + span) % span - H * 0.2;
      if (y < surfaceY) continue;
      const x = px + L.noise1(v.gt * 0.4 + ph * 10, li) * 18;
      const r = L.lerp(l.size[0], l.size[1], s);
      const streak = L.clamp(Math.abs(vel) * 0.02 * l.factor, 0, 160) * calm;
      if (streak > 3) {
        c.strokeStyle = `rgba(200,225,235,${l.alpha * (0.5 + 0.5 * s) * 0.8})`;
        c.lineWidth = r * 1.6;
        c.lineCap = 'round';
        c.beginPath();
        c.moveTo(x, y);
        c.lineTo(x, y + Math.sign(vel) * streak);
        c.stroke();
      } else {
        c.fillStyle = `rgba(200,225,235,${l.alpha * (0.5 + 0.5 * s)})`;
        c.beginPath();
        c.arc(x, y, r, 0, Math.PI * 2);
        c.fill();
      }
    }
  }
  c.restore();
}

export function drawForeground(c, v) {
  drawParticles(c, v, 1);
}

// ------------------------------------------------------------------ HUD (crisp, not motion-blurred)
const NICE = [1, 2, 5];
function tickStep(mpp) {
  const target = mpp * 220;  // ~1 tick per 220 px
  const p = Math.pow(10, Math.floor(Math.log10(target)));
  for (const n of NICE) if (n * p >= target) return n * p;
  return 10 * p;
}

// subject depth per beat (what the callout says) and when the counter settles on it (s into the beat)
const SUBJECT = [null, { d: 200, at: 1.2, dur: 0.6 }, { d: 332 }, { d: 828, at: 1.55, dur: 0.5 }, { d: 2992 }, { d: 3800 }, { d: 10935 }];
const offsetOf = (b) => (SUBJECT[b] ? SUBJECT[b].d - KEYS[b].y : 0);
/** metres to add to the camera depth so the counter reads the subject's depth (eased between beats) */
function subjectOffset(v) {
  const b = v.beat, sc = v.tl.scenes[b];
  if (!b || !sc) return 0;
  const t = v.gt - sc.start, s = SUBJECT[b];
  const k = L.ease.inOutCubic(s.at != null ? L.prog(t, s.at, s.dur) : L.prog(t, -0.05, KEYS[b].travel));
  return L.lerp(offsetOf(b - 1), offsetOf(b), k);
}

export function drawHud(c, v) {
  const { cam } = v;
  const reveal = v.beat === 6 ? L.ease.inOutCubic(L.prog(v.t / v.d, REVEAL_TIMES.start - 0.03, 0.08)) : 0;
  const floorHold = v.beat === 6 ? L.ease.inOutCubic(L.prog(v.t, 1.2, 0.4)) : 0;   // label owns the depth number on the floor
  // dark backing behind the top HUD while bright sky/surface is behind it (any zoom; leaves for the reveal)
  const skyK = L.clamp((v.wy(0) - 100) / 160) * (1 - reveal);
  if (skyK > 0) {
    const bg = c.createLinearGradient(0, 0, 0, 380);
    bg.addColorStop(0, `rgba(4,20,36,${0.5 * skyK})`);
    bg.addColorStop(0.55, `rgba(4,20,36,${0.42 * skyK})`);
    bg.addColorStop(1, 'rgba(4,20,36,0)');
    c.fillStyle = bg;
    c.fillRect(0, 0, W, 380);
  }
  // ---- depth gauge (left edge)
  const gx = 40;
  const depthAt = (sy) => cam.y + (sy - H * cam.anchor) * cam.mpp;
  const top = 330, bot = 1200;
  const gk = L.ease.outCubic(L.prog(v.gt, 1.4, 0.8)) * (1 - reveal);
  if (gk > 0) {
    c.save();
    c.globalAlpha = gk;
    c.strokeStyle = 'rgba(220,235,245,0.5)';
    c.lineWidth = 2;
    c.beginPath(); c.moveTo(gx, top); c.lineTo(gx, bot); c.stroke();
    const step = tickStep(cam.mpp);
    const d0 = Math.ceil(depthAt(top) / step) * step;
    c.font = L.font(22, 600, L.FONT.body);
    c.textBaseline = 'middle';
    for (let d = d0; d <= depthAt(bot); d += step) {
      const y = v.wy(d);
      const fade = L.clamp(Math.min(y - top, bot - y) / 60);
      if (d < 0) continue;
      c.globalAlpha = gk * fade;
      c.fillStyle = 'rgba(220,235,245,0.8)';
      c.fillRect(gx, y - 1, 16, 2);
      c.fillText(`${L.fmt(d, step < 1 ? 1 : 0)} m`, gx + 24, y);
    }
    // depth readout: the camera depth, eased onto the beat's subject depth so it always agrees with the callout
    const cur = Math.max(0, cam.y - L.noise1(v.gt * 0.3, 2) * 5 * cam.mpp + subjectOffset(v));   // minus camera.js handheld drift
    const y = L.clamp(v.wy(cur), top + 8, bot - 8);
    c.globalAlpha = gk;
    c.fillStyle = L.rgba(ACCENT);
    c.beginPath(); c.moveTo(gx - 4, y); c.lineTo(gx + 14, y - 10); c.lineTo(gx + 14, y + 10); c.closePath(); c.fill();
    c.restore();
    // depth counter, top right
    c.save();
    c.globalAlpha = gk * (1 - floorHold);
    c.textAlign = 'right';
    c.textBaseline = 'alphabetic';
    c.font = L.font(64, 700, L.FONT.din);
    c.fillStyle = '#fff';
    const curM = Math.round(cur);
    c.fillText(`${L.fmt(curM)} m`, W - 150, 268);
    c.font = L.font(22, 600, L.FONT.body);
    c.fillStyle = 'rgba(200,215,230,0.85)';
    L.trackedText(c, `${L.fmt(curM ? Math.round(L.mToFt(cur)) : 0)} FT  ·  DEPTH`, W - 150, 302, 2, 'right');
    c.restore();
  }
  // ---- mini-map: full 0–11,000 m column, right side
  const mk = L.ease.outCubic(L.prog(v.gt, 3.0, 0.8)) * (1 - reveal);
  if (mk > 0) {
    const mx = W - 92, my0 = 360, my1 = 1000;
    const my = (d) => L.lerp(my0, my1, L.clamp(d / 11000));
    c.save();
    c.globalAlpha = mk;
    c.strokeStyle = 'rgba(220,235,245,0.35)';
    c.lineWidth = 6;
    c.lineCap = 'round';
    c.beginPath(); c.moveTo(mx, my0); c.lineTo(mx, my1); c.stroke();
    const visTop = Math.max(0, depthAt(0)), visBot = Math.max(0, depthAt(H));
    c.strokeStyle = L.rgba(ACCENT);
    c.beginPath(); c.moveTo(mx, my(visTop)); c.lineTo(mx, Math.max(my(visTop) + 2, my(visBot))); c.stroke();
    c.font = L.font(18, 600, L.FONT.body);
    c.fillStyle = 'rgba(200,215,230,0.7)';
    c.textAlign = 'center';
    c.fillText('0', mx, my0 - 16);
    c.fillText('11 km', mx, my1 + 26);
    c.restore();
  }
  // ---- top bar (leaves for the final reveal so the 2 km gap is clean water)
  c.save();
  c.globalAlpha = 1 - reveal;
  c.font = L.font(20, 600, L.FONT.body);
  c.fillStyle = 'rgba(225,235,245,0.75)';
  c.textBaseline = 'middle';
  L.trackedText(c, `${v.ep.channel}  ·  ${v.ep.episodeLabel}`, 64, 160, 4);
  const s = Math.floor(v.gt), f = Math.floor((v.gt - s) * 30);
  c.font = L.font(20, 400, L.FONT.mono);
  c.textAlign = 'right';
  c.fillText(`00:${String(s).padStart(2, '0')}:${String(f).padStart(2, '0')}`, W - 64, 160);
  c.fillStyle = 'rgba(225,235,245,0.18)';
  c.fillRect(64, 182, W - 128, 2);
  c.fillStyle = L.rgba(ACCENT, 0.9);
  c.fillRect(64, 182, (W - 128) * L.clamp(v.gt / v.tl.total), 2);
  c.restore();
}

// ------------------------------------------------------------------ shared cues
export function cues(tl) {
  const out = [{ t: 0.05, name: 'splash', gain: 0.35, pitch: 1 }, { t: 0.4, name: 'bubbles', gain: 0.25, pitch: 1 }];
  tl.scenes.forEach((s, i) => { if (i > 0) out.push({ t: s.start - 0.05, name: 'dive', gain: i >= 4 ? 0.4 : 0.28, pitch: i >= 4 ? 0.7 : 1 }); });
  return out;
}
