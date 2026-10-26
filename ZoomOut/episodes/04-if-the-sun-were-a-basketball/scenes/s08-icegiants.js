// Beat 8 — Uranus (495 m) and Neptune (776 m): the town-scale rings.
// As the camera pulls back from Saturn to the whole system, two accent rings sweep around the Sun, each ending
// on its planet with a flash. A reticle locks onto the (invisible) true-size body, a leader draws out and a
// magnifier inset opens: the ice giant rendered large, lit from the Sun's side, with a roasted coffee bean
// beside it at the same scale. On the second phrase a dashed radius draws from the Sun to each planet and the
// distance lands on it ("495 m" on "half a kilometer", "776 m" on "nearly eight hundred meters").
// The rings, body markers and helpers (exported) are reused by s09-system.js.
import * as L from '../../../../engine/runtime/lib.js';
import { PLANETS, pos } from '../camera.js';
import { orbitRing, ACCENT } from '../env.js';

const DEG = Math.PI / 180;
const WARM = [255, 225, 190];
const TAU = Math.PI * 2;

// --------------------------------------------------------------- timing (seconds from this beat's start)
// Times are authored against the VO phrases as first generated, then re-mapped linearly into each phrase of the
// live timeline, so word cues stay in sync if the VO is regenerated (offsets scale with the phrase length).
const TL = await fetch(new URL('../build/timeline.json', import.meta.url)).then((r) => r.json()).catch(() => null);

/**
 * Returns f(x, i): a time x authored inside phrase i of `authored` ([[start, end], ...], beat-local seconds),
 * re-mapped into the same phrase of the live timeline. Falls back to identity if the timeline is unavailable.
 */
export function voClock(beat, authored) {
  const sc = TL?.scenes?.[beat], ph = TL?.lines?.[beat]?.phrases;
  return (x, i) => {
    const p = ph?.[i];
    if (!sc || !p) return x;
    const [a0, a1] = authored[i];
    return p.start - sc.start + (x - a0) * ((p.end - p.start) / (a1 - a0));
  };
}
// phrase 0 "Uranus and Neptune, two coffee beans," 0.150–2.643 · phrase 1 "half a kilometer and nearly eight
// hundred meters away." 3.243–6.294 (as authored; beat 8 started at 32.093 s)
const at = voClock(8, [[0.15, 2.643], [3.243, 6.294]]);
export const ICE = {
  uranus: {
    name: 'URANUS', size: '8.7 mm', dist: '495 m', ft: '1,620 FT',
    ring: [Math.max(0, at(0.05, 0)), 1.4], open: at(1.42, 0), bean: at(1.85, 0), measure: at(3.2, 1),
    inset: { x: 850, y: 770 }, beanRot: 24 * DEG, seed: 11, closeDelay: 0.12,
    body: [178, 228, 232], dark: [40, 92, 108], glow: [150, 225, 235],
  },
  neptune: {
    name: 'NEPTUNE', size: '8.5 mm', dist: '776 m', ft: '2,550 FT',
    ring: [at(0.55, 0), 1.4], open: at(2.12, 0), bean: at(2.45, 0), measure: at(4.35, 1),
    inset: { x: 232, y: 770 }, beanRot: -28 * DEG, seed: 23, closeDelay: 0.06,
    body: [86, 128, 230], dark: [14, 26, 82], glow: [110, 150, 255],
  },
};
// everything retracts once the line has been spoken: tags first, then Neptune's lens, then Uranus's
const CLOSE = { start: at(6.294, 1) + 0.01, dur: 0.45 };
const closeK = (t, delay = 0) => L.prog(t, CLOSE.start + delay, CLOSE.dur);
// the lenses step back (dimmer, smaller, labels off) when the first distance starts drawing
const pushK = (t) => L.ease.inOutCubic(L.prog(t, ICE.uranus.measure - 0.05, 0.55));
const INSET_R = 128;
const MM = 10;                // px per mm inside the insets (planet and bean share it)
const BEAN = { len: 10.5, wid: 7.4 };   // a roasted arabica bean, mm

/** Ring style for the ice giants: accent while they are new (beat 8), settling to faint warm in beat 9. */
export function settle(v) {
  return L.ease.inOutCubic(L.prog(v.gt, v.tl.scenes[9].start + 0.1, 1.2));
}

// local time of beat 8 regardless of which scene is asking
const t8 = (v) => v.gt - v.tl.scenes[8].start;

function sweep(name, v) {
  const [a, dur] = ICE[name].ring;
  return L.ease.inOutCubic(L.prog(t8(v), a, dur));
}

// --------------------------------------------------------------- world: rings + markers
function drawRing(ctx, v, name) {
  const k = sweep(name, v);
  if (k <= 0) return;
  const [r, ang] = PLANETS[name];
  const rr = v.ws(r);
  if (rr < 2) return;
  const s = settle(v);
  const col = L.mix(ACCENT, WARM, s);
  const a0 = ang - 360;            // the sweep ends on the planet
  // the ring fades out with the pull to the globe (s10): rr shrinks to a point
  const fade = L.clamp(L.invLerp(4, 30, rr));
  orbitRing(ctx, v, r, k, a0, L.lerp(0.78, 0.34, s) * fade, col);
  // the sweeping head: a bright comet tail + glow while drawing
  if (k < 1) {
    const head = (a0 + 360 * k) * DEG;
    const cx = v.wx(0), cy = v.wy(0);
    const hx = cx + rr * Math.cos(head), hy = cy + rr * Math.sin(head);
    // the head ducks out while it passes behind the HUD band (or off-frame), so it never glows next to HUD text
    const ss = (a, b, x) => L.smoothstep(L.clamp(L.invLerp(a, b, x)));
    const vis = ss(250, 360, hy) * ss(-40, 40, hx) * (1 - ss(L.W - 40, L.W + 40, hx));
    if (vis > 0.01) {
      ctx.save();
      ctx.lineCap = 'round';
      for (let i = 0; i < 10; i++) {
        const a1 = head - i * 2.6 * DEG, a2 = head - (i + 1) * 2.6 * DEG;
        ctx.strokeStyle = L.rgba([255, 214, 160], 0.85 * vis * (1 - i / 10) ** 1.6);
        ctx.lineWidth = 3.4 - i * 0.2;
        ctx.beginPath(); ctx.arc(cx, cy, rr, Math.min(a1, a2), Math.max(a1, a2)); ctx.stroke();
      }
      ctx.restore();
      L.lightBlob(ctx, hx, hy, 34, ACCENT, 0.7 * vis);
    }
  }
  // arrival flash on the planet
  const fl = L.prog(t8(v), ICE[name].ring[0] + ICE[name].ring[1] - 0.05, 0.7);
  if (fl > 0 && fl < 1) {
    const p = pos(name);
    L.lightBlob(ctx, v.wx(p.x), v.wy(p.y), 26 + 40 * L.ease.outCubic(fl), ACCENT, 0.9 * (1 - fl) ** 2);
  }
}

/** Tiny glowing marker at the body's true position (the body itself is ~0.005 px here). */
export function bodyMarker(ctx, v, p, color, a = 1, r = 2.6) {
  if (a <= 0) return;
  const x = v.wx(p.x), y = v.wy(p.y);
  if (x < -40 || x > L.W + 40 || y < -40 || y > L.H + 40) return;
  L.lightBlob(ctx, x, y, 13, color, 0.55 * a);
  ctx.save();
  ctx.fillStyle = L.rgba(L.mix(color, [255, 255, 255], 0.55), a);
  ctx.beginPath(); ctx.arc(x, y, Math.max(0, r), 0, TAU); ctx.fill();
  ctx.restore();
}

// --------------------------------------------------------------- inset renders
function sunDir(v, name) {
  const p = pos(name);
  const m = Math.hypot(p.x, p.y);
  return { x: -p.x / m, y: -p.y / m };     // unit vector toward the Sun (screen axes = world axes)
}

function drawUranus(ctx, r, L0, t) {
  const c = ICE.uranus;
  // rings (tilted ~98°: nearly edge-on vertical ellipses) — back half
  const ringPath = (front) => {
    for (const [rx, ry, al] of [[r * 0.26, r * 1.62, 0.32], [r * 0.3, r * 1.85, 0.5]]) {
      ctx.strokeStyle = L.rgba([215, 235, 240], al);
      ctx.lineWidth = rx > r * 0.28 ? 1.6 : 1;
      ctx.beginPath();
      ctx.ellipse(0, 0, rx, ry, 0.13, front ? -Math.PI / 2 : Math.PI / 2, front ? Math.PI / 2 : Math.PI * 1.5);
      ctx.stroke();
    }
  };
  ringPath(false);
  sphere(ctx, r, L0, c.body, c.dark);
  // faint banding (Uranus is almost featureless)
  ctx.save();
  ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.clip();
  ctx.rotate(0.13);
  for (let i = -3; i <= 3; i++) {
    ctx.fillStyle = `rgba(255,255,255,${0.035 + 0.02 * Math.sin(i * 1.7 + t * 0.3)})`;
    ctx.fillRect(-r, i * r * 0.26 - r * 0.07, 2 * r, r * 0.11);
  }
  ctx.restore();
  ringPath(true);
}

function drawNeptune(ctx, r, L0, t) {
  const c = ICE.neptune;
  sphere(ctx, r, L0, c.body, c.dark);
  ctx.save();
  ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.clip();
  // bands
  for (let i = -3; i <= 3; i++) {
    ctx.fillStyle = `rgba(20,40,120,${0.12 + 0.05 * Math.sin(i * 2.3)})`;
    ctx.fillRect(-r, i * r * 0.28 - r * 0.05, 2 * r, r * 0.1);
  }
  // great dark spot + its bright companion cloud, drifting slowly with the rotation
  const dx = ((t * 0.06) % 1) * 0.5 - 0.15;
  ctx.fillStyle = 'rgba(12,22,70,0.65)';
  ctx.beginPath(); ctx.ellipse(r * dx - r * 0.1, r * 0.3, r * 0.22, r * 0.12, -0.15, 0, TAU); ctx.fill();
  ctx.fillStyle = 'rgba(235,245,255,0.55)';
  ctx.beginPath(); ctx.ellipse(r * dx - r * 0.04, r * 0.47, r * 0.15, r * 0.035, -0.1, 0, TAU); ctx.fill();
  // cirrus streaks
  ctx.strokeStyle = 'rgba(240,248,255,0.45)';
  ctx.lineWidth = 1.6;
  ctx.lineCap = 'round';
  for (const [y, x0, x1] of [[-0.42, -0.3, 0.25], [-0.36, 0.05, 0.42], [0.1, 0.25, 0.6]]) {
    ctx.beginPath(); ctx.moveTo(r * (x0 + dx * 0.5), r * y); ctx.lineTo(r * (x1 + dx * 0.5), r * (y - 0.02)); ctx.stroke();
  }
  ctx.restore();
  // re-shade the night side over the features
  shade(ctx, r, L0, 0.75);
}

function shade(ctx, r, L0, a) {
  const g = ctx.createRadialGradient(L0.x * r * 0.5, L0.y * r * 0.5, r * 0.3, L0.x * r * 0.2, L0.y * r * 0.2, r * 1.15);
  g.addColorStop(0, 'rgba(0,0,0,0)');
  g.addColorStop(0.6, `rgba(2,4,14,${0.25 * a})`);
  g.addColorStop(1, `rgba(2,4,14,${0.9 * a})`);
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.arc(0, 0, Math.max(0, r), 0, TAU); ctx.fill();
}

function sphere(ctx, r, L0, body, dark) {
  const g = ctx.createRadialGradient(L0.x * r * 0.45, L0.y * r * 0.45, r * 0.05, L0.x * r * 0.2, L0.y * r * 0.2, r * 1.2);
  g.addColorStop(0, L.rgba(L.mix(body, [255, 255, 255], 0.35)));
  g.addColorStop(0.45, L.rgba(body));
  g.addColorStop(1, L.rgba(dark));
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.arc(0, 0, Math.max(0, r), 0, TAU); ctx.fill();
  shade(ctx, r, L0, 0.6);
  // thin atmosphere rim on the lit limb
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const rim = ctx.createRadialGradient(0, 0, r * 0.86, 0, 0, r * 1.06);
  rim.addColorStop(0, 'rgba(0,0,0,0)');
  rim.addColorStop(0.7, L.rgba(L.mix(body, [255, 255, 255], 0.3), 0.35));
  rim.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = rim;
  const ang = Math.atan2(L0.y, L0.x);
  ctx.beginPath(); ctx.arc(0, 0, r * 1.06, ang - 1.4, ang + 1.4); ctx.arc(0, 0, r * 0.8, ang + 1.4, ang - 1.4, true); ctx.fill();
  ctx.restore();
}

function drawBean(ctx, L0, rot) {
  const a = (BEAN.len * MM) / 2, b = (BEAN.wid * MM) / 2;
  // light direction in the bean's rotated frame
  const lx = L0.x * Math.cos(-rot) - L0.y * Math.sin(-rot), ly = L0.x * Math.sin(-rot) + L0.y * Math.cos(-rot);
  ctx.save();
  // contact shadow, away from the light
  ctx.fillStyle = 'rgba(0,0,0,0.45)';
  ctx.beginPath(); ctx.ellipse(-L0.x * 6, -L0.y * 6, b * 1.05, a * 1.02, rot, 0, TAU);
  ctx.filter = 'blur(6px)'; ctx.fill(); ctx.filter = 'none';
  ctx.rotate(rot);
  const g = ctx.createRadialGradient(lx * b * 0.5, ly * a * 0.45, 2, lx * b * 0.2, ly * a * 0.2, a * 1.15);
  g.addColorStop(0, 'rgb(150,92,54)');
  g.addColorStop(0.45, 'rgb(104,58,32)');
  g.addColorStop(1, 'rgb(36,18,10)');
  ctx.fillStyle = g;
  // slightly egg-shaped outline
  ctx.beginPath();
  ctx.moveTo(0, -a);
  ctx.bezierCurveTo(b * 1.05, -a, b * 1.08, a * 0.9, 0, a);
  ctx.bezierCurveTo(-b * 1.12, a * 0.95, -b * 1.02, -a, 0, -a);
  ctx.fill();
  // the centre cut (an S-curve), dark groove + lit lip
  const crease = () => {
    ctx.beginPath();
    ctx.moveTo(b * 0.08, -a * 0.86);
    ctx.bezierCurveTo(-b * 0.42, -a * 0.32, b * 0.42, a * 0.3, -b * 0.06, a * 0.86);
  };
  ctx.lineCap = 'round';
  ctx.strokeStyle = 'rgba(28,12,6,0.95)';
  ctx.lineWidth = 4.2;
  crease(); ctx.stroke();
  ctx.translate(lx * 1.6, ly * 1.6);
  ctx.strokeStyle = 'rgba(214,160,112,0.35)';
  ctx.lineWidth = 1.2;
  crease(); ctx.stroke();
  ctx.translate(-lx * 1.6, -ly * 1.6);
  // oily roast sheen
  ctx.globalCompositeOperation = 'lighter';
  const sh = ctx.createRadialGradient(lx * b * 0.55, ly * a * 0.5, 0, lx * b * 0.55, ly * a * 0.5, b * 0.7);
  sh.addColorStop(0, 'rgba(255,220,180,0.22)');
  sh.addColorStop(1, 'rgba(255,220,180,0)');
  ctx.fillStyle = sh;
  ctx.fillRect(-b * 1.2, -a * 1.1, b * 2.4, a * 2.2);
  ctx.restore();
}

// --------------------------------------------------------------- inset
function insetGeom(v, name) {
  const c = ICE[name];
  const p = pos(name);
  const bx = v.wx(p.x), by = v.wy(p.y);
  const dx = bx - c.inset.x, dy = by - c.inset.y, m = Math.hypot(dx, dy) || 1;
  return { bx, by, cx: c.inset.x, cy: c.inset.y, ux: dx / m, uy: dy / m, m };
}

function drawInset(ctx, v, name, kAll) {
  const c = ICE[name];
  const t = t8(v);
  const g = insetGeom(v, name);
  const kRet = L.prog(t, Math.max(c.open - 0.4, c.ring[0] + c.ring[1] - 0.06), 0.4);
  const kLead = L.prog(t, c.open - 0.25, 0.35);
  let kOpen = L.prog(t, c.open, 0.6);
  // close right after the VO line: contents fade first, the lens then shrinks away (eased from the first frame)
  const cl = closeK(t, c.closeDelay);
  if (kRet <= 0 || cl >= 1) return;
  const kClose = L.ease.inCubic(cl);
  const fadeOut = 1 - L.ease.outCubic(L.clamp(cl * 1.7));      // content alpha leads the scale
  const push = pushK(t);
  ctx.save();
  ctx.globalAlpha *= kAll * L.lerp(1, 0.45, push);

  // reticle on the true position
  const rs = 18 * (1 + 0.6 * (1 - L.ease.outCubic(kRet))) * (1 - 0.4 * kClose);
  ctx.strokeStyle = L.rgba([255, 236, 214], 0.85 * L.ease.outCubic(kRet) * fadeOut);
  ctx.lineWidth = 1.6;
  ctx.beginPath(); ctx.arc(g.bx, g.by, Math.max(0, rs), 0, TAU); ctx.stroke();
  for (let i = 0; i < 4; i++) {
    const a = i * Math.PI / 2 + t * 0.4;
    ctx.beginPath();
    ctx.moveTo(g.bx + Math.cos(a) * (rs + 3), g.by + Math.sin(a) * (rs + 3));
    ctx.lineTo(g.bx + Math.cos(a) * (rs + 9), g.by + Math.sin(a) * (rs + 9));
    ctx.stroke();
  }
  // leader: reticle edge -> inset rim
  if (kLead > 0) {
    const sx = g.bx - g.ux * (rs + 2), sy = g.by - g.uy * (rs + 2);
    const lr = INSET_R * L.lerp(1, 0.86, push) * (1 - kClose) + 4;
    const ex = g.cx + g.ux * lr, ey = g.cy + g.uy * lr;
    // retracts from the reticle end toward the lens
    const e = L.ease.outCubic(kLead), r = kClose;
    ctx.strokeStyle = L.rgba([255, 236, 214], 0.7 * fadeOut);
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.moveTo(L.lerp(sx, ex, r), L.lerp(sy, ey, r)); ctx.lineTo(L.lerp(sx, ex, e), L.lerp(sy, ey, e));
    ctx.stroke();
    // anchor dot on the reticle so the leader clearly starts at the body
    ctx.fillStyle = L.rgba([255, 236, 214], 0.95 * L.ease.outCubic(kLead) * fadeOut);
    ctx.beginPath(); ctx.arc(sx, sy, 3.2, 0, TAU); ctx.fill();
  }
  if (kOpen <= 0) { ctx.restore(); return; }

  const s = L.ease.outBack(kOpen, 1.4) * (1 - kClose) * L.lerp(1, 0.86, push);
  if (s <= 0.001) { ctx.restore(); return; }
  ctx.translate(g.cx, g.cy);
  ctx.scale(s, s);
  ctx.globalAlpha *= 1 - L.ease.outCubic(L.clamp(cl * 1.15));   // the lens itself trails its contents out
  // drop shadow + backing disc
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.7)';
  ctx.shadowBlur = 40;
  const bg = ctx.createRadialGradient(0, -30, 10, 0, 0, INSET_R);
  bg.addColorStop(0, 'rgb(26,28,34)');
  bg.addColorStop(1, 'rgb(9,10,13)');
  ctx.fillStyle = bg;
  ctx.beginPath(); ctx.arc(0, 0, INSET_R, 0, TAU); ctx.fill();
  ctx.restore();

  // contents
  const kc = L.ease.outCubic(L.prog(t, c.open + 0.12, 0.45)) * fadeOut;
  const L0 = sunDir(v, name);
  ctx.save();
  ctx.beginPath(); ctx.arc(0, 0, INSET_R - 1, 0, TAU); ctx.clip();
  // faint sunlight wash from the Sun's side
  const sw = ctx.createRadialGradient(L0.x * INSET_R, L0.y * INSET_R, 0, L0.x * INSET_R, L0.y * INSET_R, INSET_R * 1.6);
  sw.addColorStop(0, L.rgba(ACCENT, 0.13 * kc));
  sw.addColorStop(1, L.rgba(ACCENT, 0));
  ctx.fillStyle = sw;
  ctx.fillRect(-INSET_R, -INSET_R, INSET_R * 2, INSET_R * 2);
  // millimetre grid
  ctx.strokeStyle = `rgba(255,240,220,${0.045 * kc})`;
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let i = -12; i <= 12; i++) {
    ctx.moveTo(i * MM * 1, -INSET_R); ctx.lineTo(i * MM * 1, INSET_R);
    ctx.moveTo(-INSET_R, i * MM * 1); ctx.lineTo(INSET_R, i * MM * 1);
  }
  ctx.stroke();

  const pr = (parseFloat(c.size) * MM) / 2;
  const kb = L.ease.outBack(L.prog(t, c.bean, 0.55), 1.2) * fadeOut;
  const slide = L.ease.outCubic(L.prog(t, c.bean, 0.55));
  // planet: centred until the bean arrives, then makes room
  const px = L.lerp(0, -46, slide), py = 6;
  ctx.save();
  ctx.globalAlpha *= kc;
  ctx.translate(px, py + (1 - kc) * 10);
  L.lightBlob(ctx, 0, 0, pr * 1.9, c.glow, 0.18);
  (name === 'uranus' ? drawUranus : drawNeptune)(ctx, pr, L0, v.gt);
  ctx.restore();
  // coffee bean, sliding in from the side
  if (kb > 0) {
    ctx.save();
    ctx.globalAlpha *= L.clamp(kb * 1.5);
    const wob = 0.04 * Math.sin(v.gt * 0.9 + c.seed);
    ctx.translate(L.lerp(110, 54, slide), py + 2);
    ctx.scale(kb, kb);
    drawBean(ctx, L0, c.beanRot + wob);
    ctx.restore();
  }
  ctx.restore();

  // rim + bezel ticks (slowly turning) + accent arc
  ctx.strokeStyle = 'rgba(255,238,220,0.78)';
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(0, 0, INSET_R, 0, TAU); ctx.stroke();
  ctx.strokeStyle = 'rgba(255,238,220,0.28)';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  for (let i = 0; i < 48; i++) {
    const a = i * TAU / 48 + v.gt * 0.05 + c.seed;
    const l = i % 4 === 0 ? 9 : 5;
    ctx.moveTo(Math.cos(a) * (INSET_R + 6), Math.sin(a) * (INSET_R + 6));
    ctx.lineTo(Math.cos(a) * (INSET_R + 6 + l), Math.sin(a) * (INSET_R + 6 + l));
  }
  ctx.stroke();
  const aa = -Math.PI / 2 - 0.9 + v.gt * 0.12;
  ctx.strokeStyle = L.rgba(ACCENT, 0.9);
  ctx.lineWidth = 3.5;
  ctx.lineCap = 'round';
  ctx.beginPath(); ctx.arc(0, 0, INSET_R + 1, aa, aa + 0.9 * L.ease.outCubic(kOpen)); ctx.stroke();

  // labels inside the lens: name on top, true size below
  const kt = L.ease.outCubic(L.prog(t, c.open + 0.3, 0.45)) * fadeOut * (1 - L.clamp(push * 1.6));
  if (kt > 0) {
    ctx.textBaseline = 'alphabetic';
    ctx.globalAlpha *= kt;
    ctx.font = L.font(21, 700, L.FONT.body);
    ctx.fillStyle = 'rgba(240,236,230,0.95)';
    L.trackedText(ctx, c.name, 0, -INSET_R + 44 - (1 - kt) * 8, 5, 'center');
    ctx.font = L.font(36, 700, L.FONT.display);
    ctx.fillStyle = L.rgba(ACCENT);
    L.trackedText(ctx, c.size, 0, INSET_R - 22 + (1 - kt) * 8, 0.5, 'center');
  }
  ctx.restore();
}

// --------------------------------------------------------------- distance radius + tag
function drawMeasure(ctx, v, name, kAll) {
  const c = ICE[name];
  const t = t8(v);
  const k = L.prog(t, c.measure, 0.7);
  if (k <= 0) return;
  const p = pos(name);
  const sx = v.wx(0), sy = v.wy(0), bx = v.wx(p.x), by = v.wy(p.y);
  const len = Math.hypot(bx - sx, by - sy), ux = (bx - sx) / len, uy = (by - sy) / len;
  const e = L.ease.inOutCubic(k);
  const r0 = 16, r1 = len - 22;
  // retracts first in the close (before the lenses); alpha leads the retraction
  const cl = closeK(t, 0);
  if (cl >= 1) return;
  const kClose = L.ease.inCubic(cl);
  const fadeOut = 1 - L.ease.outCubic(L.clamp(cl * 1.5));
  // only the distance being spoken is at full accent: Uranus's steps back when Neptune's lands
  const dim = name === 'uranus' ? 1 - 0.5 * L.ease.inOutCubic(L.prog(t, ICE.neptune.measure + 0.25, 0.45)) : 1;
  ctx.save();
  ctx.globalAlpha *= kAll * fadeOut * dim;
  ctx.strokeStyle = L.rgba(ACCENT, 0.9);
  ctx.lineWidth = 2;
  ctx.setLineDash([7, 7]);
  ctx.lineDashOffset = -v.gt * 14;
  ctx.beginPath();
  ctx.moveTo(sx + ux * r0, sy + uy * r0);
  const rEnd = L.lerp(L.lerp(r0, r1, e), r0, kClose);
  ctx.lineTo(sx + ux * rEnd, sy + uy * rEnd);
  ctx.stroke();
  ctx.setLineDash([]);
  // end caps
  const cap = (d, a) => {
    ctx.globalAlpha *= a;
    ctx.beginPath();
    ctx.moveTo(sx + ux * d - uy * 9, sy + uy * d + ux * 9);
    ctx.lineTo(sx + ux * d + uy * 9, sy + uy * d - ux * 9);
    ctx.stroke();
    ctx.globalAlpha /= a;
  };
  ctx.lineWidth = 2.4;
  cap(r0, 1);
  if (e > 0.98) cap(rEnd, L.prog(t, c.measure + 0.65, 0.15));

  // tag
  const kt = L.prog(t, c.measure + 0.25, 0.5);
  if (kt > 0) {
    const f = name === 'uranus' ? 0.62 : 0.6;
    const off = name === 'uranus' ? 58 : 112;     // below the Uranus radius, right of the Neptune one
    const tx = sx + ux * len * f - uy * off, ty = sy + uy * len * f + ux * off;
    const te = L.ease.outCubic(kt);
    ctx.globalAlpha *= L.clamp(kt * 1.6);
    // shrink a little toward its centre while closing
    const ts = 1 - 0.3 * kClose;
    ctx.translate(tx, ty); ctx.scale(ts, ts); ctx.translate(-tx, -ty);
    // soft dark backing
    const bg = ctx.createRadialGradient(tx, ty - 6, 0, tx, ty - 6, 120);
    bg.addColorStop(0, 'rgba(8,8,10,0.72)');
    bg.addColorStop(1, 'rgba(8,8,10,0)');
    ctx.fillStyle = bg;
    ctx.fillRect(tx - 130, ty - 120, 260, 230);
    ctx.textBaseline = 'alphabetic';
    ctx.shadowColor = 'rgba(0,0,0,0.6)';
    ctx.shadowBlur = 12;
    ctx.font = L.font(64, 800, L.FONT.display);
    ctx.fillStyle = L.rgba(ACCENT);
    L.trackedText(ctx, c.dist, tx, ty + 10 + (1 - te) * 18, -0.5, 'center');
    ctx.font = L.font(21, 600, L.FONT.body);
    ctx.fillStyle = 'rgba(210,214,224,0.92)';
    L.trackedText(ctx, c.ft, tx, ty + 44 + (1 - te) * 12, 2.5, 'center');
  }
  ctx.restore();
}

export default {
  beat: 8,
  chapter: { num: '08', title: 'Uranus & Neptune', sub: 'The ice giants' },
  captions: true,
  layer: 0,
  cues(d) {
    const U = ICE.uranus, N = ICE.neptune;
    return [
      { t: U.ring[0] + 0.05, name: 'shimmer', gain: 0.18, pitch: 0.9 },
      { t: N.ring[0] + 0.05, name: 'shimmer', gain: 0.16, pitch: 0.75 },
      { t: U.open - 0.25, name: 'blip', gain: 0.22, pitch: 1.3 },
      { t: U.open, name: 'ping', gain: 0.32, pitch: 1.0 },
      { t: N.open - 0.25, name: 'blip', gain: 0.22, pitch: 1.15 },
      { t: N.open, name: 'ping', gain: 0.32, pitch: 0.85 },
      { t: U.bean, name: 'tick', gain: 0.3, pitch: 1.2 },
      { t: N.bean, name: 'tick', gain: 0.3, pitch: 1.0 },
      { t: U.measure, name: 'swish', gain: 0.2, pitch: 1.2 },
      { t: U.measure + 0.6, name: 'count', gain: 0.28, pitch: 1.0 },
      { t: N.measure, name: 'swish', gain: 0.2, pitch: 1.0 },
      { t: N.measure + 0.6, name: 'count', gain: 0.3, pitch: 0.85 },
      { t: CLOSE.start, name: 'swish', gain: 0.14, pitch: 1.4 },
    ];
  },
  drawWorld(ctx, v) {
    if (t8(v) < 0) return;
    if (v.cam.mpp > 400) return;          // the system is a single point by now (s10 owns it)
    for (const n of ['uranus', 'neptune']) drawRing(ctx, v, n);
    // body markers appear as each sweep lands, and stay (dimmer) for the rest of the film
    const s = settle(v);
    for (const n of ['uranus', 'neptune']) {
      const a = L.prog(t8(v), ICE[n].ring[0] + ICE[n].ring[1] - 0.1, 0.3);
      bodyMarker(ctx, v, pos(n), ICE[n].glow, a * L.lerp(1, 0.75, s));
    }
  },
  drawOverlay(ctx, v) {
    const k = L.clamp(v.k * 1.2);
    if (k <= 0) return;
    for (const n of ['uranus', 'neptune']) drawMeasure(ctx, v, n, k);
    for (const n of ['uranus', 'neptune']) drawInset(ctx, v, n, k);
  },
};
