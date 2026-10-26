// Beat 0 — "What if the Earth suddenly stopped spinning?"
// env spins the globe east and brakes it (BRAKE0 → BRAKE1) to a dead stop with Ecuador facing us. This scene adds
// the craft on top: a ghosted meridian graticule whose motion echoes stretch with the spin speed; an equatorial
// SPIN RING (seen slightly from above) whose ticks and comet heads travel with the surface and brake with it;
// at BRAKE1 the ring snaps, a shock pulse and rim flash shudder the planet, and the ring flattens into the
// equator line (env draws that line from 2.5 s), which the dive in beat 1 follows down to the street.
// Headline "WHAT IF EARTH" / "STOPPED SPINNING?" above the globe; line 2 spins in from the left with the planet.
import * as L from '../../../../engine/runtime/lib.js';
import { BRAKE0, BRAKE1, FILM_START, OFF, SPIN0 } from '../camera.js';
import { globeGeom, lonAt } from '../env.js';

const { W } = L;
const TAU = Math.PI * 2;
const DEG = Math.PI / 180;
const LINE1 = { txt: 'WHAT IF EARTH', y: 402, size: 100 };
const LINE2 = { txt: 'STOPPED SPINNING?', y: 530, max: 132 };

// 13b: every time in this scene is FILM time (gt - OFF, the original timeline); lonAt takes global time.
/** angular speed of the surface (rad/s) at film time gt (0 after the stop) */
function omega(gt) { const h = 1 / 240; return Math.max(0, (lonAt(gt + OFF - h) - lonAt(gt + OFF + h)) / (2 * h)); }
const wrapPi = (a) => { a = (a + Math.PI) % TAU; if (a < 0) a += TAU; return a - Math.PI; };

/** after the stop: elastic settle of the ring ticks (a little overshoot, the "jolt") */
function settle(gt) {
  const u = gt - BRAKE1;
  if (u <= 0) return 0;
  return 2.2 * DEG * Math.exp(-u * 7) * Math.sin(u * 26);
}

function drawGraticule(c, g, gt, k) {
  if (k <= 0) return;
  const om = omega(gt), sp = om / SPIN0;
  c.save();
  c.beginPath(); c.arc(g.cx, g.cy, Math.max(0, g.r), 0, TAU); c.clip();
  c.lineWidth = 1.3;
  const E = 7;
  for (let mer = 0; mer < 12; mer++) {
    const lo = mer * 30 * DEG;
    for (let e = E; e >= 0; e--) {
      if (e > 0 && sp < 0.02) continue;
      const dl = wrapPi(lo - g.lon0 - e * om * 0.028);
      if (Math.abs(dl) > Math.PI / 2) continue;
      const sn = Math.sin(dl);
      const a = e === 0 ? 0.2 + 0.12 * sp : 0.16 * sp * (1 - e / (E + 1));
      c.strokeStyle = L.rgba([150, 230, 245], a * k);
      c.beginPath();
      c.ellipse(g.cx, g.cy, Math.max(0, g.r * Math.abs(sn)), Math.max(0, g.r), 0, -Math.PI / 2, Math.PI / 2, sn < 0);
      c.stroke();
    }
  }
  // a few latitude chords (static: the planet turns about its axis)
  c.strokeStyle = L.rgba([150, 230, 245], 0.1 * k);
  for (const la of [-60, -30, 30, 60]) {
    const y = g.cy - g.r * Math.sin(la * DEG), hw = g.r * Math.cos(la * DEG);
    c.beginPath(); c.moveTo(g.cx - hw, y); c.lineTo(g.cx + hw, y); c.stroke();
  }
  c.restore();
}

/** the equatorial spin ring: back half behind the globe (outside the disc only), front half across its face */
function drawRing(c, g, gt, acc) {
  const kin = L.ease.outCubic(L.prog(gt, 0.05, 0.7));
  const flat = L.ease.inOutCubic(L.prog(gt, BRAKE1 + 0.35, 0.55));      // collapses into the equator line
  const kout = 1 - L.ease.inCubic(L.prog(gt, BRAKE1 + 0.6, 0.45));
  const k = kin * kout;
  if (k <= 0) return;
  // 13b: the ring (and its comet glows) stays inside the frame while the opening globe is at its largest
  const rx0 = Math.max(g.r * 1.02, Math.min(g.r * 1.17, W / 2 - 78));
  const rx = L.lerp(rx0, g.r, flat);
  const ry = g.r * L.lerp(0.19, 0.0, flat);
  const om = omega(gt), sp = om / SPIN0;
  const phase = -(g.lon0) + settle(gt);                                   // ticks ride with the surface
  const pt = (th) => [g.cx + rx * Math.sin(th), g.cy + ry * Math.cos(th)];
  const front = (th) => Math.cos(th) > 0;
  c.save();
  // the ring itself: hairline, brighter on the front
  for (const half of [0, 1]) {
    c.save();
    if (half === 0) {          // back half: hide where the globe covers it
      c.beginPath(); c.rect(0, 0, W, 1920); c.arc(g.cx, g.cy, Math.max(0, g.r), 0, TAU, true); c.clip('evenodd');
    }
    c.strokeStyle = L.rgba(acc, (half ? 0.7 : 0.32) * k);
    c.lineWidth = half ? 2.5 : 1.5;
    c.beginPath();
    c.ellipse(g.cx, g.cy, Math.max(0, rx), Math.max(0, ry), 0, half ? 0 : Math.PI, half ? Math.PI : TAU);
    c.stroke();
    c.restore();
  }
  // ticks every 10°
  for (let q = 0; q < 36; q++) {
    const th = wrapPi(q * 10 * DEG + phase);
    const [x, y] = pt(th);
    const fr = front(th);
    if (!fr && Math.hypot(x - g.cx, y - g.cy) < g.r) continue;
    const big = q % 3 === 0;
    c.strokeStyle = L.rgba(acc, (fr ? 0.8 : 0.35) * k);
    c.lineWidth = big ? 2 : 1.2;
    const tl = (big ? 9 : 5) * (1 - flat);
    c.beginPath(); c.moveTo(x, y - tl); c.lineTo(x, y + tl); c.stroke();
  }
  // three comet heads with trails that shrink as the planet brakes
  c.globalCompositeOperation = 'lighter';
  for (let q = 0; q < 3; q++) {
    const th0 = q * (TAU / 3) + phase;
    const span = Math.min(1.6, om * 0.55);
    const N = 26;
    for (let i = 0; i < N; i++) {
      const a0 = th0 - span * (i / N), a1 = th0 - span * ((i + 1) / N);
      const m = wrapPi((a0 + a1) / 2);
      const [x0, y0] = pt(a0), [x1, y1] = pt(a1);
      const fr = front(m);
      if (!fr && Math.hypot((x0 + x1) / 2 - g.cx, (y0 + y1) / 2 - g.cy) < g.r) continue;
      const f = 1 - i / N;
      c.strokeStyle = L.rgba(acc, f * f * (fr ? 0.85 : 0.35) * k * Math.min(1, sp * 1.4));
      c.lineWidth = 5 * (0.5 + 0.5 * f);
      c.beginPath(); c.moveTo(x0, y0); c.lineTo(x1, y1); c.stroke();
    }
    const [hx, hy] = pt(wrapPi(th0));
    const fr = front(wrapPi(th0));
    if (fr || Math.hypot(hx - g.cx, hy - g.cy) >= g.r) {
      L.lightBlob(c, hx, hy, 40, acc, 0.6 * k * (fr ? 1 : 0.5));
      c.fillStyle = L.rgba([230, 252, 255], 0.95 * k * (fr ? 1 : 0.5));
      c.beginPath(); c.arc(hx, hy, Math.max(0, 5), 0, TAU); c.fill();
    }
  }
  c.restore();
}

/** the brake: a rim flash and a shock pulse at BRAKE1, a faint warm brake glow on the limb during braking */
function drawBrake(c, g, gt, acc) {
  const b = L.prog(gt, BRAKE0, BRAKE1 - BRAKE0);
  c.save();
  c.globalCompositeOperation = 'lighter';
  if (b > 0 && b < 1) {
    const a = Math.sin(Math.PI * b) * 0.22;
    c.strokeStyle = `rgba(255,190,140,${a})`;
    c.lineWidth = 6;
    c.beginPath(); c.arc(g.cx, g.cy, Math.max(0, g.r + 3), -0.55 * Math.PI, 0.55 * Math.PI); c.stroke();
  }
  const u = gt - BRAKE1;
  if (u > -0.02 && u < 1.2) {
    const f = Math.exp(-Math.max(0, u) * 5);
    c.strokeStyle = L.rgba([200, 245, 255], 0.75 * f);
    c.lineWidth = 3 + 6 * f;
    c.beginPath(); c.arc(g.cx, g.cy, Math.max(0, g.r + 1), 0, TAU); c.stroke();
    const pr = g.r * (1.02 + 0.55 * L.ease.outCubic(L.clamp(u / 0.9)));
    c.strokeStyle = L.rgba(acc, 0.45 * (1 - L.clamp(u / 0.9)));
    c.lineWidth = 2;
    c.beginPath(); c.arc(g.cx, g.cy, Math.max(0, pr), 0, TAU); c.stroke();
    const fl = c.createRadialGradient(g.cx, g.cy, g.r * 0.2, g.cx, g.cy, g.r);
    fl.addColorStop(0, `rgba(160,220,255,${0.0})`);
    fl.addColorStop(1, `rgba(160,220,255,${0.22 * f})`);
    c.fillStyle = fl;
    c.beginPath(); c.arc(g.cx, g.cy, Math.max(0, g.r), 0, TAU); c.fill();
  }
  c.restore();
}

function lineWords(ctx, ln, size) {
  ctx.font = L.font(size, 800, L.FONT.display);
  ctx.letterSpacing = '-1px';
  const words = ln.txt.split(' ');
  const sp = ctx.measureText(' ').width;
  const ws = words.map((w) => ctx.measureText(w).width);
  ctx.letterSpacing = '0px';
  const total = ws.reduce((a, b) => a + b, 0) + sp * (words.length - 1);
  return { words, ws, sp, total };
}

export default {
  beat: 0,
  chapter: null,
  captions: false,
  layer: 5,
  cues(d) {
    // 13b: the beat starts at film time FILM_START (0.2 s), and cue times are beat-relative
    return [
      { t: 0.02, name: 'whoosh', gain: 0.32, pitch: 0.7 },     // the planet already turning
      { t: 0.14, name: 'tick', gain: 0.2, pitch: 1.1 },        // line 1
      { t: 0.5, name: 'swish', gain: 0.3, pitch: 1.2 },        // line 2 spins in
      { t: BRAKE0 - 0.05, name: 'creak', gain: 0.34, pitch: 0.75 },   // the brake bites
      { t: BRAKE0 + 0.2, name: 'riser', gain: 0.16, pitch: 0.7 },
      { t: BRAKE1 - 0.01, name: 'impact', gain: 0.6, pitch: 0.8 },    // dead stop
      { t: BRAKE1, name: 'deep', gain: 0.45, pitch: 0.7 },
    ].filter((q) => q.t >= FILM_START - 0.1)   // the opening whoosh already played under the preroll's own cut whoosh
      .map((q) => ({ ...q, t: Math.max(0, q.t - FILM_START) })).concat([
      { t: d - 0.32, name: 'swish', gain: 0.2, pitch: 0.9 },   // headline exits
    ]);
  },
  drawWorld(ctx, v) {
    const gt = v.gt - OFF;
    if (gt > BRAKE1 + 1.4) return;
    const g = globeGeom(v);
    const kg = L.ease.outCubic(L.prog(gt, 0, 0.5)) * (1 - L.ease.inOutCubic(L.prog(gt, BRAKE1 + 0.15, 0.8)));
    drawGraticule(ctx, g, gt, kg);
    drawBrake(ctx, g, gt, v.accent);
    drawRing(ctx, g, gt, v.accent);
  },
  drawOverlay(ctx, v) {
    // film time; d = the film time of the beat's end (as in the original, where the beat started at 0)
    const t = v.gt - OFF, d = v.tl.scenes[0].end - OFF, acc = v.accent;
    if (v.gt > v.tl.scenes[1].start + 0.3) return;
    // ---------------- line 1: words rise into a mask, staggered
    {
      const ln = LINE1, m = lineWords(ctx, ln, ln.size);
      ctx.save();
      ctx.font = L.font(ln.size, 800, L.FONT.display);
      ctx.fillStyle = 'rgb(238,236,230)';
      ctx.shadowColor = 'rgba(0,0,0,0.5)'; ctx.shadowBlur = 20;
      let x = W / 2 - m.total / 2;
      m.words.forEach((w, i) => {
        // 13b: whole words fade up from 28 px below (no mask: a mask sliced the glyphs in half on the first frames
        // after the cut); they start after the film's first frame, so nothing pops on at the cut
        const kin = L.enter(t, 0.27 + i * 0.08, 0.55, L.ease.outCubic);
        const kout = L.enter(t, d - 0.52 + i * 0.04, 0.3, L.ease.inCubic);   // fully gone ~0.1 s before beat 1
        // exit: a fade with a small upward drift (≤ 40 px), so the headline never crosses into the HUD band
        const dy = (1 - kin) * 28 - kout * 36;
        ctx.globalAlpha = L.clamp(kin * 1.4) * (1 - kout);
        if (kin > 0 && kout < 1) L.trackedText(ctx, w, x, ln.y + dy, -1, 'left');
        ctx.globalAlpha = 1;
        x += m.ws[i] + m.sp;
      });
      ctx.restore();
    }
    // ---------------- line 2: spins in from the left like the surface, settles, shudders at the stop
    {
      const ln = LINE2;
      ctx.save();
      const size = L.fitSize(ctx, ln.txt, 900, ln.max, 800, L.FONT.display);
      const m = lineWords(ctx, ln, size);
      // 13b: a short eased slide (~110 px) with a fade: it reads as spinning in, without a frame-wide smear
      const kin = L.enter(t, 0.45, 0.8, L.ease.outCubic);
      const kout = L.enter(t, d - 0.46, 0.3, L.ease.inCubic);
      const u = t - BRAKE1;
      const shud = u > 0 ? 14 * Math.exp(-u * 9) * Math.sin(u * 46) : 0;
      const slide = (1 - kin) * -110;
      const x0 = W / 2 - m.total / 2 + slide + shud;
      ctx.font = L.font(size, 800, L.FONT.display);
      const dy = -kout * 36;
      ctx.globalAlpha = L.clamp(kin * 1.6) * (1 - kout);
      // speed echoes while it slides
      const vel = (1 - kin);
      if (vel > 0.01) {
        for (let e = 1; e <= 5; e++) {
          ctx.fillStyle = L.rgba(acc, 0.1 * vel * (1 - e / 6));
          L.trackedText(ctx, ln.txt, x0 - e * 22 * vel, ln.y + dy, -1, 'left');
        }
      }
      ctx.shadowColor = 'rgba(0,0,0,0.5)'; ctx.shadowBlur = 20;
      ctx.fillStyle = L.rgba(acc);
      L.trackedText(ctx, ln.txt, x0, ln.y + dy, -1, 'left');
      // the stop: a brief white flash through the letters
      if (u > -0.02 && u < 0.5) {
        ctx.shadowBlur = 0;
        ctx.fillStyle = `rgba(255,255,255,${0.75 * Math.exp(-Math.max(0, u) * 9)})`;
        L.trackedText(ctx, ln.txt, x0, ln.y + dy, -1, 'left');
      }
      ctx.restore();
    }
  },
};
