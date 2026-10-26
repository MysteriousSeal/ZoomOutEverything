// Beat 0 — "What if the Sun suddenly became a black hole?"
// A calm, sunlit city street (env draws the facades, road and sky). This scene owns, for beats 0-3:
//   - the SKY SUN: screen-anchored at (250, 470) (the Sun is at infinity), clipped behind the buildings, with a warm
//     bloom, slow rays, faint lens ghosts and a warm wash over the street;
//   - street life: pedestrians (refined silhouettes with a warm rim light and long shadows to the right), a car on
//     the far lane, a bus in beat 2, a small flock of birds;
//   - the hook: on "became a black hole" the Sun shrinks to a brilliant point and blinks out (violet glint), the sky
//     dims a touch. It is a flash-forward: beat 1 REWINDS it, so everything runs on STORY TIME storyT(gt), which
//     runs backwards during the rewind (people and cars walk backwards, the Sun re-inflates).
//   - the sky Sun survives the fly-out (beat 3) and settles onto the true SUN position as a fading ghost.
// The headline is drawn in drawWorld (overlays fade in at the beat start; frame 0 must already read).
import * as L from '../../../../engine/runtime/lib.js';
import { ACCENT, BUILDINGS, dayK, streetFade } from '../env.js';
import { SUN } from '../camera.js';

const { W, H } = L;
const TAU = Math.PI * 2;
export const SKY_SUN = { x: 250, y: 470, r: 46 };
const WARM = [255, 226, 176];

// ------------------------------------------------------------------ story time (the rewind)
export const RW0 = 4.15, RW1 = 5.15, RW_TO = 0.9;
/** Story time: = gt, except the rewind (RW0..RW1) scrubs it back from RW0 to RW_TO, then it runs on. */
export function storyT(gt) {
  if (gt <= RW0) return gt;
  if (gt < RW1) return L.lerp(RW0, RW_TO, L.ease.inOutCubic(L.prog(gt, RW0, RW1 - RW0)));
  return RW_TO + (gt - RW1);
}
// the collapse in the flash-forward (story seconds)
const SH0 = 1.6, SH1 = 2.32, BLINK = 2.55;
/** Sun state in the street sky: {r (px), I (brightness), gone 0..1, glint 0..1}. */
export function skySunState(gt) {
  // the collapse only happens in the flash-forward: after the rewind the Sun shines on (its light is still coming)
  const s = gt >= RW1 ? Math.min(storyT(gt), SH0) : storyT(gt);
  const sh = L.ease.inCubic(L.prog(s, SH0, SH1 - SH0));
  let r = L.lerp(SKY_SUN.r, 2.6, sh);
  const I = 1 + 0.9 * L.smoothstep(L.prog(s, SH0 + 0.3, SH1 - SH0));
  const gone = L.prog(s, BLINK, 0.07);
  r *= 1 - gone;
  const glint = s >= BLINK ? Math.pow(1 - L.prog(s, BLINK, 0.75), 1.6) : 0;
  const dim = L.ease.outCubic(L.prog(s, BLINK, 0.7));
  return { r, I: I * (1 - gone), gone, glint, dim, shrink: sh };
}

// ------------------------------------------------------------------ label helper (house bigLabel, staged)
/** bigLabel with separate entrances for the big line (kb) and the small line (ks), and an exit (ko 0..1). */
export function label2(c, { x, y, big, small, kb = 1, ks = 1, ko = 0, align = 'left', size = 110, accent = ACCENT, backing = 0 }) {
  if (kb <= 0 || ko >= 1) return;
  const e = L.ease.outCubic(L.clamp(kb)), es = L.ease.outCubic(L.clamp(ks));
  const out = L.ease.inCubic(L.clamp(ko));
  c.save();
  c.globalAlpha *= 1 - out;
  c.translate(0, -out * 14);
  c.textBaseline = 'alphabetic';
  if (backing > 0) {
    const bx = align === 'right' ? x - 260 : align === 'center' ? x : x + 260;
    const g = c.createRadialGradient(bx, y - size * 0.3, 20, bx, y - size * 0.3, 520);
    g.addColorStop(0, `rgba(3,5,12,${backing * L.clamp(kb * 1.5)})`);
    g.addColorStop(1, 'rgba(3,5,12,0)');
    c.fillStyle = g;
    c.fillRect(bx - 560, y - size * 0.3 - 560, 1120, 1120);
  }
  c.globalAlpha *= L.clamp(kb * 1.4);
  const ruleW = 90 * e;
  c.fillStyle = L.rgba(accent, 0.9);
  const rx = align === 'right' ? x - ruleW : align === 'center' ? x - ruleW / 2 : x;
  c.fillRect(rx, y - size * 0.92 - 26, ruleW, 4);
  // the big line rises out of a mask
  c.save();
  c.beginPath(); c.rect(0, y - size * 1.05, W, size * 1.32); c.clip();
  c.font = L.font(size, 800, L.FONT.display);
  c.fillStyle = L.rgba(accent);
  c.shadowColor = 'rgba(0,0,0,0.6)';
  c.shadowBlur = 20;
  L.trackedText(c, big, x, y + (1 - e) * size * 0.9, -1, align);
  c.restore();
  if (small && ks > 0) {
    c.globalAlpha *= L.clamp(ks * 1.5);
    c.shadowColor = 'rgba(0,0,0,0.7)';
    c.shadowBlur = 10;
    c.font = L.font(30, 600, L.FONT.body);
    c.fillStyle = 'rgba(214,222,236,0.96)';
    L.trackedText(c, small.toUpperCase(), x, y + 52 + (1 - es) * 16, 3, align);
  }
  c.restore();
}

// ------------------------------------------------------------------ street fade (matches env's street fade)
export const streetK = (mpp, gt) => streetFade(mpp, gt);

/** Clip to the sky: everything except the building blocks on screen (even-odd holes). */
function clipSky(c, v) {
  const mpp = v.cam.mpp;
  if (mpp > 4) return;
  const xL = v.cam.x - (W / 2 + 40) * mpp, xR = v.cam.x + (W / 2 + 40) * mpp;
  const gy = v.wy(0);
  c.beginPath();
  c.rect(-50, -50, W + 100, H + 100);
  for (const b of BUILDINGS) {
    if (b.x1 < xL || b.x0 > xR) continue;
    const X0 = v.wx(b.x0), X1 = v.wx(b.x1), top = v.wy(-b.h) - 0.5 / mpp;
    c.rect(X0, top, X1 - X0 + 0.6, gy - top + 2);
  }
  c.clip('evenodd');
}

// ------------------------------------------------------------------ the sky Sun
/** Screen position / size / visibility of the sky Sun (also through the fly-out of beat 3). */
export function sunPose(v) {
  const mpp = v.cam.mpp;
  // the bright sky image never moves: it fades out IN PLACE as the camera climbs out of the air (keyed to scale,
  // gone by ~14.3 s, before the space clock and the black hole read). The dashed ghost of the old disc is a separate
  // mark drawn only at the true SUN screen position, once the system view has settled and only while it is on screen.
  const fade = L.smoothstep(L.clamp(L.invLerp(Math.log(150), Math.log(4e4), Math.log(mpp))));
  const sx = v.wx(SUN.x), sy = v.wy(SUN.y);
  const onScreen = sx > -60 && sx < W + 60 && sy > -60 && sy < H + 60 ? 1 : 0;
  const ghostIn = L.ease.outCubic(L.prog(v.gt, 15.0, 0.4)) * onScreen * (mpp > 3e7 ? 1 : 0);
  const vanish = L.ease.inCubic(L.prog(v.gt, 15.6, 1.0));
  return { x: SKY_SUN.x, y: SKY_SUN.y, fade, gx: sx, gy: sy, ghostIn, vanish };
}

function drawRays(c, x, y, r, a, gt) {
  if (a <= 0.003) return;
  c.save();
  c.globalCompositeOperation = 'lighter';
  const n = 14;
  for (let i = 0; i < n; i++) {
    const ang = (i / n) * TAU + gt * 0.025 + L.noise1(i * 1.7, 4) * 0.2;
    const len = 300 + 260 * (0.5 + 0.5 * L.noise1(i * 2.3 + gt * 0.15, 5));
    const spread = 0.035 + 0.02 * ((i * 7) % 3);
    const g = c.createRadialGradient(x, y, r, x, y, len);
    g.addColorStop(0, L.rgba(WARM, a * (0.5 + 0.5 * ((i * 5) % 4) / 3)));
    g.addColorStop(1, L.rgba(WARM, 0));
    c.fillStyle = g;
    c.beginPath();
    c.moveTo(x, y);
    c.arc(x, y, len, ang - spread, ang + spread);
    c.closePath();
    c.fill();
  }
  c.restore();
}

function drawGhosts(c, x, y, a) {
  if (a <= 0.003) return;
  // lens ghosts along the line from the Sun through the frame centre
  const dx = W / 2 - x, dy = H * 0.5 - y;
  const G = [[0.5, 16, [255, 210, 150], 0.07], [1.15, 40, [170, 200, 255], 0.045], [1.45, 12, [255, 230, 200], 0.07]];
  c.save();
  c.globalCompositeOperation = 'lighter';
  for (const [t, r, col, al] of G) {
    const gx = x + dx * t, gy = y + dy * t;
    const g = c.createRadialGradient(gx, gy, r * 0.5, gx, gy, r);
    g.addColorStop(0, L.rgba(col, al * a * 0.6));
    g.addColorStop(0.85, L.rgba(col, al * a));
    g.addColorStop(1, L.rgba(col, 0));
    c.fillStyle = g;
    c.beginPath();
    for (let i = 0; i < 6; i++) { const q = (i / 6) * TAU + 0.3; c.lineTo(gx + Math.cos(q) * r, gy + Math.sin(q) * r); }
    c.closePath();
    c.fill();
  }
  c.restore();
}

/** The Sun in the street sky (and its image through the fly-out). */
function drawSkySun(c, v) {
  if (v.gt > 16.6) return;
  const st = skySunState(v.gt);
  const pose = sunPose(v);
  const { x, y } = pose;
  const mpp = v.cam.mpp;
  const street = streetK(mpp, v.gt);
  const bright = Math.pow(1 - pose.fade, 1.6);
  const gt = v.gt;
  // the warm wash over the street and the long atmospheric glow (unclipped: glare over the facades)
  if (st.I > 0.01 && bright > 0.01) {
    const skyA = L.clamp(1 - L.invLerp(Math.log(300), Math.log(8000), Math.log(mpp)));   // the air's glow (fades in space)
    L.lightBlob(c, x, y, 1400, [255, 206, 150], 0.045 * st.I * bright * skyA * (1 - st.shrink * 0.8));
    L.lightBlob(c, x, y, 380 + 200 * st.shrink, [255, 214, 165], 0.2 * Math.min(1.3, st.I) * bright * (0.4 + 0.6 * skyA));
  }
  c.save();
  if (street > 0.01) clipSky(c, v);
  if (st.r > 0.05 && bright > 0.01) {
    const r = st.r, I = st.I * bright;
    drawRays(c, x, y, r, 0.075 * I * (1 - st.shrink) * (0.3 + 0.7 * street), gt);
    // the disc first (white-hot, soft limb), then the corona added on top: no limb can darken against the glow
    const g = c.createRadialGradient(x, y, 0, x, y, r * 1.1);
    g.addColorStop(0, `rgba(255,255,255,${Math.min(1, I)})`);
    g.addColorStop(0.88, `rgba(255,253,246,${Math.min(1, I)})`);
    g.addColorStop(1, 'rgba(255,248,232,0)');
    c.fillStyle = g;
    c.beginPath(); c.arc(x, y, Math.max(0, r * 1.1), 0, TAU); c.fill();
    L.lightBlob(c, x, y, r * 3.6 + 30, [255, 226, 186], 0.26 * Math.min(1.4, I) * (1 - 0.6 * st.shrink));
    L.lightBlob(c, x, y, r * 1.6 + 8, [255, 244, 222], 0.22 * Math.min(1.4, I));
  }
  c.restore();
  // lens ghosts (only in the open-air street shots)
  if (st.r > 0.05) {
    // ghosts live in the sky only (never on the ground below the horizon)
    c.save();
    c.beginPath(); c.rect(-10, -10, W + 20, Math.max(0, v.wy(0) + 10)); c.clip();
    drawGhosts(c, x, y, Math.min(1, st.I) * street * (1 - st.shrink));
    c.restore();
  }
  // the ghost of the old disc at the true SUN (system view): a faint warm disc + dashed rim that fades, leaving the hole
  const gk = pose.ghostIn * (1 - pose.vanish);
  if (gk > 0.003) {
    const gr = 22, gx = pose.gx, gy = pose.gy;
    c.save();
    c.globalCompositeOperation = 'lighter';
    L.lightBlob(c, gx, gy, gr * 3.2, [255, 214, 160], 0.22 * gk);
    c.fillStyle = `rgba(255,226,180,${0.10 * gk})`;
    c.beginPath(); c.arc(gx, gy, Math.max(0, gr), 0, TAU); c.fill();
    c.strokeStyle = `rgba(255,232,196,${0.55 * gk})`;
    c.lineWidth = 1.5;
    c.setLineDash([4, 5]);
    c.beginPath(); c.arc(gx, gy, Math.max(0, gr), 0, TAU); c.stroke();
    c.restore();
  }
}
/** The collapse itself (drawn over the dim): the brilliant point, its spikes and streak, then the violet blink. */
function drawSparks(c, v) {
  if (v.gt > RW1 + 0.2) return;
  const st = skySunState(v.gt);
  const { x, y } = SKY_SUN;
  const street = streetK(v.cam.mpp, v.gt);
  if (st.shrink > 0.02 && st.I > 0.01) {
    const k = L.smoothstep(st.shrink) * Math.min(1.6, st.I) * street;
    c.save();
    c.globalCompositeOperation = 'lighter';
    L.lightBlob(c, x, y, 50, [255, 244, 226], 0.32 * k);
    L.lightBlob(c, x, y, 13, [255, 255, 255], 1.0 * k);
    c.fillStyle = `rgba(255,255,255,${Math.min(1, k)})`;
    c.beginPath(); c.arc(x, y, Math.max(0, 6.5 * Math.min(1, k)), 0, TAU); c.fill();
    const sw = 260 * k;
    const hg = c.createLinearGradient(x - sw, 0, x + sw, 0);
    hg.addColorStop(0, 'rgba(255,240,220,0)'); hg.addColorStop(0.5, `rgba(255,250,240,${0.6 * k})`); hg.addColorStop(1, 'rgba(255,240,220,0)');
    c.fillStyle = hg;
    c.fillRect(x - sw, y - 1.2, sw * 2, 2.4);
    c.fillStyle = `rgba(255,255,255,${0.85 * k})`;
    const a = 58 * k;
    c.beginPath(); c.moveTo(x, y - a); c.lineTo(x + 1.5, y); c.lineTo(x, y + a); c.lineTo(x - 1.5, y); c.closePath(); c.fill();
    c.restore();
    // the shrinking disc itself stays white-hot over the dimmed sky
    c.fillStyle = `rgba(255,255,255,${Math.min(1, st.I) * street})`;
    c.beginPath(); c.arc(x, y, Math.max(0, Math.max(st.r, 3.2)), 0, TAU); c.fill();
  }
  // the blink-out: a violet glint and a thin ring
  if (st.glint > 0.003) {
    const k = st.glint, p = 1 - k;
    c.save();
    c.globalCompositeOperation = 'lighter';
    L.lightBlob(c, x, y, 150, ACCENT, 0.7 * k);
    L.lightBlob(c, x, y, 40, [235, 220, 255], 0.9 * k);
    c.strokeStyle = L.rgba(L.mix(ACCENT, [255, 255, 255], 0.35), 0.8 * k);
    c.lineWidth = 1.5 + 2 * k;
    c.beginPath(); c.arc(x, y, Math.max(0, 8 + 120 * L.ease.outCubic(p)), 0, TAU); c.stroke();
    c.fillStyle = `rgba(240,228,255,${0.9 * k})`;
    const a = 110 * k + 20;
    c.beginPath(); c.moveTo(x - a, y); c.lineTo(x, y - 1.4); c.lineTo(x + a, y); c.lineTo(x, y + 1.4); c.closePath(); c.fill();
    c.beginPath(); c.moveTo(x, y - a * 0.6); c.lineTo(x + 1.4, y); c.lineTo(x, y + a * 0.6); c.lineTo(x - 1.4, y); c.closePath(); c.fill();
    c.restore();
  }
}
/** The sky dims a touch once the Sun has gone (flash-forward only). */
function drawDim(c, v) {
  const st = skySunState(v.gt), street = streetK(v.cam.mpp, v.gt);
  const d = Math.max(st.dim, 0.75 * L.smoothstep(st.shrink) * (v.gt < RW1 + 0.2 ? 1 : 0));
  if (d > 0.003 && street > 0.01) {
    c.fillStyle = `rgba(8,12,30,${0.32 * d * street})`;
    c.fillRect(0, 0, W, H);
  }
}

// ------------------------------------------------------------------ street life (world space, story time)
const PEOPLE = (() => {
  const r = L.rng(1600), out = [];
  for (let i = 0; i < 16; i++) {
    const dir = r() < 0.55 ? 1 : -1;
    out.push({
      x0: -34 + i * 5.2 + r() * 3.5, dir, v: 1.05 + r() * 0.45, h: 1.62 + r() * 0.3, ph: r() * TAU,
      coat: r() < 0.4, bag: r() < 0.3, pack: r() < 0.2, tone: r(), lane: r() * 0.25,
    });
  }
  return out;
})();
const BIRDS = (() => { const r = L.rng(1611); return Array.from({ length: 6 }, (_, i) => ({ dx: i * 1.1 + r() * 0.8, dy: (i % 2 ? 1 : -1) * (i * 0.55) + r() * 0.8, ph: r() * TAU, f: 6 + r() * 1.5 })); })();

function sunVis(gt) { const st = skySunState(gt); return Math.min(1, st.I) * (1 - st.dim); }

/** One walker in side view; feet at (x, y) px, s = px per metre, facing dir, walk phase ph. */
function walker(c, x, y, s, p, ph, col) {
  const h = p.h * s, dir = p.dir;
  const hip = y - 0.53 * h, sh = y - 0.82 * h;
  const sw = Math.sin(ph), sw2 = Math.sin(ph + Math.PI);
  const leg = (a, lift) => {
    const kx = x + dir * Math.sin(a) * 0.26 * h, ky = hip + Math.cos(a) * 0.26 * h;
    const fa = a - Math.max(0, lift) * 0.5;
    const fx = kx + dir * Math.sin(fa) * 0.26 * h, fy = Math.min(y, ky + Math.cos(fa) * 0.26 * h);
    c.beginPath(); c.moveTo(x, hip); c.lineTo(kx, ky); c.lineTo(fx, fy); c.stroke();
    c.beginPath(); c.moveTo(fx, fy); c.lineTo(fx + dir * 0.07 * h, fy); c.stroke();
  };
  c.strokeStyle = col; c.fillStyle = col;
  c.lineCap = 'round'; c.lineJoin = 'round';
  c.lineWidth = Math.max(1, 0.068 * h);
  leg(0.42 * sw, Math.cos(ph));
  leg(0.42 * sw2, Math.cos(ph + Math.PI));
  // torso (slight forward lean), coat skirt
  const lean = dir * 0.04 * h;
  c.beginPath();
  c.moveTo(x - dir * 0.07 * h, hip + 0.02 * h);
  c.lineTo(x + lean - dir * 0.085 * h, sh);
  c.quadraticCurveTo(x + lean, sh - 0.035 * h, x + lean + dir * 0.08 * h, sh + 0.01 * h);
  c.lineTo(x + dir * 0.075 * h, hip + 0.02 * h);
  c.closePath(); c.fill();
  if (p.coat) {
    c.beginPath();
    c.moveTo(x - dir * 0.08 * h, hip - 0.04 * h); c.lineTo(x + dir * 0.08 * h, hip - 0.04 * h);
    c.lineTo(x + dir * (0.11 + 0.03 * sw) * h, y - 0.3 * h); c.lineTo(x - dir * (0.11 - 0.03 * sw) * h, y - 0.3 * h);
    c.closePath(); c.fill();
  }
  if (p.pack) { c.beginPath(); c.ellipse(x + lean - dir * 0.11 * h, sh + 0.1 * h, 0.05 * h, 0.09 * h, 0, 0, TAU); c.fill(); }
  // neck + head
  c.lineWidth = Math.max(1, 0.05 * h);
  c.beginPath(); c.moveTo(x + lean, sh); c.lineTo(x + lean + dir * 0.012 * h, sh - 0.05 * h); c.stroke();
  c.beginPath(); c.ellipse(x + lean + dir * 0.02 * h, sh - 0.105 * h, Math.max(0, 0.062 * h), Math.max(0, 0.072 * h), 0, 0, TAU); c.fill();
  // arms (swing opposite the legs)
  c.lineWidth = Math.max(1, 0.05 * h);
  for (const a of [-0.38 * sw, -0.38 * sw2]) {
    const ex = x + lean + dir * Math.sin(a) * 0.17 * h, ey = sh + 0.02 * h + Math.cos(a) * 0.17 * h;
    const hx = ex + dir * Math.sin(a * 1.3 + 0.25) * 0.16 * h, hy = ey + Math.cos(a * 1.3 + 0.25) * 0.16 * h;
    c.beginPath(); c.moveTo(x + lean, sh + 0.02 * h); c.lineTo(ex, ey); c.lineTo(hx, hy); c.stroke();
  }
  if (p.bag) {
    const hx = x + lean + dir * Math.sin(-0.38 * sw) * 0.3 * h, hy = sh + 0.35 * h;
    c.fillRect(hx - 0.05 * h, hy, 0.1 * h, 0.12 * h);
  }
}

function drawPeople(c, v, a) {
  const s = 1 / v.cam.mpp, S = storyT(v.gt), sun = sunVis(v.gt);
  const xL = v.cam.x - (W / 2 + 60) * v.cam.mpp, xR = v.cam.x + (W / 2 + 60) * v.cam.mpp;
  const ink = L.mix([30, 30, 38], [20, 22, 30], 0);
  for (const p of PEOPLE) {
    const x = p.x0 + p.dir * p.v * S;
    if (x < xL || x > xR) continue;
    const ph = p.ph + (p.v * S) / 0.72 * Math.PI;
    const sx = v.wx(x), sy = v.wy(0.28 + p.lane);
    const bob = Math.abs(Math.cos(ph)) * 0.02 * s;
    c.save();
    c.globalAlpha = a;
    // long soft shadow to the right (sun from the upper-left)
    if (sun > 0.01) {
      const len = 2.6 * p.h * s, th = 0.16 * s;
      const g = c.createLinearGradient(sx, 0, sx + len, 0);
      g.addColorStop(0, `rgba(10,10,18,${0.38 * sun})`); g.addColorStop(1, 'rgba(10,10,18,0)');
      c.fillStyle = g;
      c.beginPath();
      c.moveTo(sx - 0.1 * s, sy - th * 0.2); c.lineTo(sx + len, sy + th * 0.4); c.lineTo(sx + len * 0.95, sy + th); c.lineTo(sx + 0.1 * s, sy + th * 0.5);
      c.closePath(); c.fill();
    }
    // warm rim (light from the upper-left), then the silhouette
    const tone = L.mix([34, 32, 40], [62, 52, 50], p.tone * 0.6);
    if (sun > 0.01) { c.save(); c.translate(-0.045 * s, -0.03 * s); walker(c, sx, sy - bob, s, p, ph, L.rgba([255, 214, 160], 0.55 * sun)); c.restore(); }
    walker(c, sx, sy - bob, s, p, ph, L.rgba(tone));
    c.restore();
  }
}

/** A car / bus side profile, wheels' contact at (x, y) world, length along +x, facing dir. */
function vehicle(c, v, xw, yw, dir, kind, col, sun, a) {
  const s = 1 / v.cam.mpp;
  const len = kind === 'bus' ? 12 : 4.5;
  const X = (u) => v.wx(xw + dir * (u - len / 2)), Y = (h) => v.wy(yw - h);
  c.save();
  c.globalAlpha = a;
  // ground shadow (under + to the right)
  const g = c.createLinearGradient(X(0), 0, X(len) + 2 * s, 0);
  c.fillStyle = 'rgba(6,6,12,0.45)';
  c.beginPath(); c.ellipse(v.wx(xw) + 0.15 * s * sun, Y(0) - 0.05 * s, Math.max(0, (len / 2 + 0.15) * s), Math.max(0, 0.2 * s), 0, 0, TAU); c.fill();
  void g;
  const shape = kind === 'bus'
    ? [[0.05, 0.35], [0, 0.6], [0, 2.9], [0.25, 3.15], [11.6, 3.15], [11.95, 2.85], [12, 0.6], [11.95, 0.35]]
    : [[0, 0.38], [0, 0.88], [0.25, 1.0], [1.25, 1.06], [1.75, 1.44], [2.95, 1.46], [3.55, 1.05], [4.35, 0.92], [4.5, 0.62], [4.42, 0.38]];
  const body = c.createLinearGradient(0, Y(kind === 'bus' ? 3.15 : 1.46), 0, Y(0.35));
  body.addColorStop(0, L.rgba(L.mix(col, [255, 236, 210], 0.28 * sun)));
  body.addColorStop(0.45, L.rgba(col));
  body.addColorStop(1, L.rgba(L.mix(col, [8, 8, 14], 0.55)));
  c.fillStyle = body;
  c.beginPath(); shape.forEach(([u, h], i) => (i ? c.lineTo(X(u), Y(h)) : c.moveTo(X(u), Y(h)))); c.closePath(); c.fill();
  // glass
  const glass = kind === 'bus' ? [[0.6, 1.45], [0.6, 2.75], [11.4, 2.75], [11.4, 1.45]] : [[1.38, 1.02], [1.82, 1.38], [2.9, 1.39], [3.4, 1.02]];
  c.fillStyle = 'rgba(28,36,52,0.92)';
  c.beginPath(); glass.forEach(([u, h], i) => (i ? c.lineTo(X(u), Y(h)) : c.moveTo(X(u), Y(h)))); c.closePath(); c.fill();
  // a sky reflection sweeping the glass
  c.save();
  c.clip();
  c.globalCompositeOperation = 'lighter';
  const rx = X(len * (0.2 + 0.6 * (0.5 + 0.5 * Math.sin(v.gt * 0.6))));
  const rg = c.createLinearGradient(rx - 1.2 * s, 0, rx + 1.2 * s, 0);
  rg.addColorStop(0, 'rgba(200,220,255,0)'); rg.addColorStop(0.5, `rgba(220,232,255,${0.25 * (0.4 + 0.6 * sun)})`); rg.addColorStop(1, 'rgba(200,220,255,0)');
  c.fillStyle = rg; c.fillRect(rx - 1.2 * s, Y(3.2), 2.4 * s, 3.2 * s);
  c.restore();
  if (kind === 'bus') {   // window mullions + door
    c.fillStyle = L.rgba(col);
    for (let u = 2.2; u < 11.4; u += 1.8) c.fillRect(X(u) - 0.06 * s, Y(2.75), 0.12 * s, 1.3 * s);
    c.fillStyle = 'rgba(20,26,38,0.9)';
    c.fillRect(Math.min(X(9.6), X(10.6)), Y(2.6), 1.0 * s, 2.2 * s);
  }
  // roof highlight (sunlit edge)
  c.strokeStyle = `rgba(255,236,210,${0.35 * sun + 0.08})`;
  c.lineWidth = Math.max(1, 0.05 * s);
  c.beginPath(); shape.slice(1, kind === 'bus' ? 5 : 7).forEach(([u, h], i) => (i ? c.lineTo(X(u), Y(h)) : c.moveTo(X(u), Y(h)))); c.stroke();
  // wheels
  const wr = kind === 'bus' ? 0.5 : 0.34;
  for (const u of kind === 'bus' ? [2.3, 9.6] : [0.88, 3.6]) {
    const wx = X(u), wy = Y(wr);
    c.fillStyle = '#0c0c10';
    c.beginPath(); c.arc(wx, wy, Math.max(0, wr * s), 0, TAU); c.fill();
    c.fillStyle = 'rgba(150,150,160,0.75)';
    c.beginPath(); c.arc(wx, wy, Math.max(0, wr * 0.48 * s), 0, TAU); c.fill();
  }
  // head / tail lights
  c.fillStyle = 'rgba(255,240,210,0.9)';
  c.fillRect(X(len - 0.12) - 0.08 * s, Y(kind === 'bus' ? 0.8 : 0.78), 0.16 * s, 0.12 * s);
  c.fillStyle = 'rgba(220,40,40,0.9)';
  c.fillRect(X(0.06) - 0.08 * s, Y(kind === 'bus' ? 0.8 : 0.8), 0.16 * s, 0.14 * s);
  c.restore();
}

function drawTraffic(c, v, a) {
  const S = storyT(v.gt), sun = sunVis(v.gt);
  const xL = v.cam.x - (W / 2) * v.cam.mpp - 14, xR = v.cam.x + (W / 2) * v.cam.mpp + 14;
  // vehicles in real lanes (lanes at y ≈ 2.1, 3.7 and 7.3 m), all in FRONT of the far-pavement walkers;
  // drawn back to front (far lane first) so nearer vehicles overlap farther ones
  const list = [];
  const bus = 64 - 11 * (S - 4.4);                  // beat 2: a bus, right to left (far lane)
  if (S > 4.4) list.push({ x: bus, y: 2.1, dir: -1, kind: 'bus', col: [36, 88, 98] });
  const van = 40 - 9.5 * S;                         // a pale hatchback, right to left (far lane)
  list.push({ x: van, y: 2.05, dir: -1, kind: 'car', col: [196, 198, 200] });
  const car = -30 + 13.5 * S;                       // the red car, left to right (near lane; reverses during the rewind)
  list.push({ x: car, y: 3.7, dir: 1, kind: 'car', col: [128, 30, 36] });
  const car2 = -62 + 11.5 * S;                      // a dark-blue car trailing it
  list.push({ x: car2, y: 7.3, dir: 1, kind: 'car', col: [40, 58, 92] });
  list.sort((p, q) => p.y - q.y);
  for (const o of list) if (o.x > xL && o.x < xR) vehicle(c, v, o.x, o.y, o.dir, o.kind, o.col, sun, a);
}

function drawBirds(c, v, a) {
  const S = storyT(v.gt), s = 1 / v.cam.mpp;
  // the flock is already right of the Sun (> 200 px clear) through the collapse (story 1.4-3.0): one focal point
  // in beat 2 the flock banks away up-right and thins out, clear of the "8 min 20 s" label
  const lv = L.ease.inCubic(L.prog(v.gt, v.tl.scenes[2].start - 0.2, 1.6));
  const fx = -2 + 5.0 * S + 26 * lv, fy = -27.5 - 0.25 * S - 9 * lv;
  // the flock thins out and leaves before beat 2's "8 min 20 s" label (it would fly through it)
  a *= 1 - L.smoothstep(L.prog(v.gt, v.tl.scenes[2].start + 0.2, 1.0));
  if (a <= 0.003) return;
  c.save();
  c.globalAlpha = a;
  c.strokeStyle = 'rgba(26,28,36,0.85)';
  c.lineCap = 'round';
  for (const b of BIRDS) {
    const x = v.wx(fx - b.dx), y = v.wy(fy + b.dy + 0.25 * Math.sin(S * 1.3 + b.ph));
    if (x < -40 || x > W + 40) continue;
    const flap = Math.sin(S * b.f + b.ph), span = 0.5 * s;
    c.lineWidth = Math.max(1, 0.07 * s);
    c.beginPath();
    c.moveTo(x - span, y - flap * 0.32 * s);
    c.quadraticCurveTo(x - span * 0.4, y - (0.1 + flap * 0.18) * s, x, y);
    c.quadraticCurveTo(x + span * 0.4, y - (0.1 + flap * 0.18) * s, x + span, y - flap * 0.32 * s);
    c.stroke();
  }
  c.restore();
}

// ------------------------------------------------------------------ headline
function drawHeadline(c, v) {
  const t = v.t;
  const kout = L.ease.inCubic(L.prog(t, 3.42, 0.4));
  if (kout >= 1) return;
  const size = 100, cx = W / 2;
  const base = [690, 792, 912];
  c.save();
  c.textBaseline = 'alphabetic';
  const bg = c.createRadialGradient(cx, 790, 40, cx, 790, 560);
  bg.addColorStop(0, `rgba(3,6,14,${0.5 * (1 - kout)})`);
  bg.addColorStop(1, 'rgba(3,6,14,0)');
  c.fillStyle = bg;
  c.fillRect(0, 230, W, 1120);
  const lines = [['WHAT', 'IF', 'THE', 'SUN'], ['BECAME', 'A'], ['BLACK', 'HOLE?']];
  const sp = 22;
  lines.forEach((words, li) => {
    const sz = li === 2 ? 118 : size;
    c.font = L.font(sz, 800, L.FONT.display);
    const ws = words.map((w) => c.measureText(w).width);
    const total = ws.reduce((p, q) => p + q, 0) + sp * (words.length - 1);
    const yb = base[li];
    let x = cx - total / 2;
    // the accent bar behind BLACK HOLE? wipes in from the left
    if (li === 2) {
      const be = L.ease.outQuint(L.prog(t, 0.22, 0.55));
      if (be > 0) {
        c.fillStyle = L.rgba(ACCENT, 0.96 * (1 - kout));
        const bx = x - 26, bw = (total + 52) * be;
        c.fillRect(bx, yb - sz * 0.86, bw, sz * 1.0);
      }
    }
    words.forEach((w, wi) => {
      const st = li === 2 ? 0.5 + wi * 0.08 : -0.25 + li * 0.32 + wi * 0.07;
      const e = L.ease.outQuint(L.prog(t, st, 0.75));
      if (e > 0) {
        c.save();
        c.beginPath(); c.rect(x - 14, yb - sz * 1.0, ws[wi] + 28, sz * 1.2); c.clip();
        c.globalAlpha = L.clamp(e * 1.6) * (1 - kout);
        const dy = (1 - e) * sz * 0.95 - kout * 22;
        if (li === 2) { c.fillStyle = 'rgb(14,8,26)'; c.shadowBlur = 0; }
        else { c.fillStyle = 'rgb(244,246,250)'; c.shadowColor = 'rgba(0,0,0,0.65)'; c.shadowBlur = 22; }
        c.fillText(w, x, yb + dy);
        c.restore();
      }
      x += ws[wi] + sp;
    });
  });
  c.restore();
}

// ------------------------------------------------------------------ scene
export default {
  beat: 0,
  chapter: null,
  captions: false,
  layer: 0,
  cues() {
    return [
      { t: 0.0, name: 'swell', gain: 0.26, pitch: 0.8 },
      { t: 0.05, name: 'swish', gain: 0.2, pitch: 1.0 },
      { t: 0.78, name: 'swish', gain: 0.18, pitch: 1.25 },
      { t: SH0 - 0.1, name: 'riser', gain: 0.22, pitch: 1.1 },
      { t: BLINK, name: 'deep', gain: 0.55, pitch: 0.8 },
      { t: BLINK + 0.02, name: 'shimmer', gain: 0.2, pitch: 0.65 },
    ];
  },
  drawWorld(c, v) {
    if (v.gt > 16.6) return;                       // the street reappears at night in beat 14: none of this belongs there
    const a = streetK(v.cam.mpp, v.gt);
    c.save(); drawSkySun(c, v); c.restore();
    if (a > 0.01) {
      drawBirds(c, v, a);
      drawPeople(c, v, a);                         // the far pavement first (y ≈ 0.3-0.5 m) ...
      drawTraffic(c, v, a);                        // ... then the road, which is nearer the viewer
    }
    drawDim(c, v);
    drawSparks(c, v);
    if (v.beat === 0) { c.save(); drawHeadline(c, v); c.restore(); }
  },
};
