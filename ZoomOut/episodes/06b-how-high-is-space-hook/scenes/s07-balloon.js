// Beat 7 — the balloon jump from 39 km that broke the sound barrier (2012).
// A stratospheric balloon (a 3 px glint at true scale) rises to 39 km on a faint ascent track. A loupe opens on
// it showing the whole balloon, then zooms down the flight train to the capsule, where a tiny figure steps off and
// drops out of the lens. In the main view the jumper becomes a bright falling point with a speed streak; on
// "sound barrier" a shock ring pulses out and a Mach cone opens behind the jumper.
import * as L from '../../../../engine/runtime/lib.js';
import { ALT } from '../camera.js';
import { skyColor } from '../env.js';
import { loupe } from './s05-jets.js';

const { W, H } = L;
const TOP = ALT.balloon;                  // 39,000 m
const BX = 15100;                         // balloon x (world): right of frame centre, clear of the label
const RISE = [-0.7, 2.5];                 // balloon rises from 33.5 km to 39 km
const T_LOUPE = 0.85;
const T_LABEL = 1.05;                     // on "thirty-nine"
const ZOOM = [1.55, 0.85];                // lens zooms from the whole balloon down to the capsule
const T_JUMP = 2.5;                       // on "…from a balloon"
const T_BOOM = 4.8;                       // on "sound barrier"
const T_FOLLOW = 3.05;                    // the lens starts tracking the falling jumper (capsule streams away)
const T_CLOSE = 4.0;                      // ...then closes, handing over to the main-view target ring
const ACC = 1290;                         // time-compressed fall: m/s² until the boom, then ~constant speed

const balloonAlt = (t) => L.lerp(TOP - 5500, TOP, L.ease.outCubic(L.prog(t, RISE[0], RISE[1])));
function diverAlt(t) {
  const a = t - T_JUMP;
  if (a <= 0) return TOP;
  const tb = T_BOOM - T_JUMP;
  if (a < tb) return TOP - 0.5 * ACC * a * a;
  const vb = ACC * tb;
  return TOP - 0.5 * ACC * tb * tb - vb * (a - tb) * (1 - 0.08 * (a - tb));
}
const diverSpeed = (t) => (diverAlt(t - 0.02) - diverAlt(t + 0.02)) / 0.04;

// ------------------------------------------------------------------ the lens content (local metres, capsule at 0,0)
// a tall translucent teardrop (the partly inflated polyethylene envelope): bottom 60 m above the capsule, 170 m tall
const ENV_B = -60, ENV_H = 170, ENV_W = 52;
const ENV = [[0, 0.03], [0.1, 0.1], [0.3, 0.3], [0.5, 0.53], [0.65, 0.73], [0.78, 0.89], [0.87, 0.98], [0.93, 0.97], [0.97, 0.8], [0.995, 0.4], [1, 0]];
const halfW = (u) => { for (let i = 1; i < ENV.length; i++) if (u <= ENV[i][0]) return ENV_W * L.lerp(ENV[i - 1][1], ENV[i][1], L.invLerp(ENV[i - 1][0], ENV[i][0], u)); return 0; };
const smooth = (u) => { const n = 4; let s = 0; for (let k = -n; k <= n; k++) s += halfW(L.clamp(u + k * 0.012)); return s / (2 * n + 1); };

function envelopePath(c) {
  c.beginPath();
  const N = 40;
  for (let i = 0; i <= N; i++) { const u = i / N; c.lineTo(smooth(u), ENV_B - u * ENV_H); }
  for (let i = N; i >= 0; i--) { const u = i / N; c.lineTo(-smooth(u), ENV_B - u * ENV_H); }
  c.closePath();
}

function drawBalloonSystem(c, z, t, jumped) {
  const px = 1 / z;
  // envelope: thin polyethylene, sunlit from the right
  envelopePath(c);
  const g = c.createLinearGradient(-ENV_W, 0, ENV_W, 0);
  g.addColorStop(0, 'rgba(175,190,225,0.62)');
  g.addColorStop(0.55, 'rgba(232,238,250,0.72)');
  g.addColorStop(1, 'rgba(255,253,245,0.86)');
  c.fillStyle = g;
  c.fill();
  // gores (meridians) + soft form shading
  c.save();
  envelopePath(c);
  c.clip();
  c.strokeStyle = 'rgba(120,135,175,0.5)';
  c.lineWidth = Math.max(0.9 * px, 0.25);
  for (let k = -5; k <= 5; k++) {
    const s = Math.sin((k / 6) * Math.PI / 2);
    c.beginPath();
    for (let i = 0; i <= 30; i++) { const u = i / 30; const x = smooth(u) * s; i ? c.lineTo(x, ENV_B - u * ENV_H) : c.moveTo(x, ENV_B - u * ENV_H); }
    c.stroke();
  }
  const sg = c.createRadialGradient(ENV_W * 0.35, ENV_B - ENV_H * 0.7, 2, 0, ENV_B - ENV_H * 0.55, ENV_W * 1.3);
  sg.addColorStop(0, 'rgba(255,255,255,0.35)');
  sg.addColorStop(1, 'rgba(40,50,90,0.25)');
  c.fillStyle = sg;
  c.fillRect(-ENV_W, ENV_B - ENV_H, ENV_W * 2, ENV_H);
  c.restore();
  // flight train: load line, packed parachute, ladder to the capsule
  c.strokeStyle = 'rgba(225,230,245,0.9)';
  c.lineWidth = Math.max(1.2 * px, 0.12);
  c.beginPath(); c.moveTo(0, ENV_B + 0.5); c.lineTo(0, -6); c.stroke();
  c.fillStyle = 'rgba(240,120,80,0.95)';
  c.beginPath(); c.ellipse(0, -36, 1.5, 4.5, 0, 0, Math.PI * 2); c.fill();     // packed parachute
  c.strokeStyle = 'rgba(225,230,245,0.8)';
  c.lineWidth = Math.max(1 * px, 0.06);
  c.beginPath(); c.moveTo(0, -6); c.lineTo(-1.6, -1.2); c.moveTo(0, -6); c.lineTo(1.6, -1.2); c.stroke();
  // capsule: a pressurised sphere on a crush pad, door open on the right with a small step
  const cg = c.createLinearGradient(-2, -2, 2, 2);
  cg.addColorStop(0, 'rgb(240,242,248)');
  cg.addColorStop(1, 'rgb(150,160,182)');
  c.fillStyle = 'rgb(60,66,84)';
  L.roundRect(c, -1.45, 1.3, 2.9, 0.62, 0.15); c.fill();                      // crush pad
  c.fillStyle = cg;
  c.beginPath(); c.arc(0, 0, 1.75, 0, Math.PI * 2); c.fill();
  c.fillStyle = 'rgb(28,32,46)';
  L.roundRect(c, 0.55, -1.15, 0.95, 1.95, 0.25); c.fill();                     // open hatch
  c.fillStyle = 'rgb(200,205,220)';
  c.fillRect(1.4, 0.8, 1.15, 0.16);                                            // step
  c.fillStyle = 'rgba(255,190,120,0.9)';
  c.beginPath(); c.arc(1.0, -0.2, 0.18, 0, Math.PI * 2); c.fill();             // warm cabin light
  // the jumper: on the step, then a deliberate lean and drop (real g inside the lens)
  if (!jumped || t < T_JUMP + 2.4) {
    const a = Math.max(0, t - T_JUMP);
    const lean = L.ease.inOutCubic(L.prog(t, T_JUMP - 0.35, 0.35));
    const fall = 0.5 * 9.81 * a * a;
    const dx = 1.95 + 0.5 * lean + 0.6 * a;
    const dy = -0.1 + fall;
    const rot = 0.5 * lean + 0.9 * L.clamp(a / 1.2);
    diverFigure(c, dx, dy, rot, z);
  }
}

function diverFigure(c, x, y, rot, z) {
  // a pressure-suited figure, ~1.8 m: helmet with gold visor, chest pack, arms slightly out
  c.save();
  c.translate(x, y + 0.85);
  c.rotate(rot);
  const suit = c.createLinearGradient(-0.3, 0, 0.3, 0);
  suit.addColorStop(0, 'rgb(200,206,222)');
  suit.addColorStop(1, 'rgb(250,251,255)');
  c.fillStyle = suit;
  c.strokeStyle = suit;
  c.lineCap = 'round';
  c.lineJoin = 'round';
  // legs
  c.lineWidth = 0.2;
  c.beginPath(); c.moveTo(-0.08, -0.8); c.lineTo(-0.12, -0.02); c.moveTo(0.08, -0.8); c.lineTo(0.14, -0.02); c.stroke();
  // boots
  c.fillStyle = 'rgb(70,76,96)';
  c.fillRect(-0.24, -0.08, 0.2, 0.09); c.fillRect(0.06, -0.08, 0.22, 0.09);
  // torso
  c.fillStyle = suit;
  L.roundRect(c, -0.2, -1.42, 0.4, 0.7, 0.12); c.fill();
  // chest pack + harness
  c.fillStyle = 'rgb(90,98,122)';
  L.roundRect(c, 0.05, -1.3, 0.2, 0.32, 0.05); c.fill();
  // arms
  c.lineWidth = 0.14;
  c.beginPath(); c.moveTo(0.15, -1.32); c.lineTo(0.42, -1.0); c.lineTo(0.5, -0.82); c.moveTo(-0.15, -1.32); c.lineTo(-0.38, -1.02); c.lineTo(-0.44, -0.84); c.stroke();
  // helmet + visor
  c.fillStyle = 'rgb(250,251,255)';
  c.beginPath(); c.arc(0.02, -1.63, 0.2, 0, Math.PI * 2); c.fill();
  c.fillStyle = 'rgb(232,170,70)';
  c.beginPath(); c.ellipse(0.1, -1.63, 0.1, 0.12, 0, 0, Math.PI * 2); c.fill();
  c.restore();
}

// jumper's offset from the step inside the lens (metres, real g)
const lensFall = (t) => { const a = Math.max(0, t - T_JUMP); return 0.5 * 9.81 * a * a; };

function lensContent(c, t) {
  const zk = L.ease.inOutCubic(L.prog(t, ZOOM[0], ZOOM[1]));
  const z = Math.exp(L.lerp(Math.log(0.74), Math.log(42), zk));     // px per metre: whole system ~190 px -> capsule ~150 px
  // the capsule's on-lens offset moves linearly in screen space while z grows exponentially, so the capsule is
  // always in view and grows smoothly (no empty lens mid-zoom)
  const cy = L.lerp(88, 0, zk);
  const follow = L.ease.inOutCubic(L.prog(t, T_FOLLOW, 0.45));
  const fy = -cy / z + follow * Math.max(0, lensFall(t) - 0.4);     // then the lens rides down with the jumper
  const fx = L.lerp(0, 0.45, zk) + follow * 0.6 * Math.max(0, t - T_JUMP);
  // faint stratospheric streaks drifting down past the lens (the whole system is rising)
  c.save();
  c.strokeStyle = 'rgba(200,215,255,0.08)';
  c.lineWidth = 1;
  for (let i = 0; i < 7; i++) {
    const x = -110 + i * 37 + L.noise1(i, 3) * 10;
    const y = (((t * 30 + i * 53 - lensFall(t) * 24 * follow * 0.6) % 260) + 260) % 260 - 130;
    c.beginPath(); c.moveTo(x, y); c.lineTo(x, y + 18); c.stroke();
  }
  c.restore();
  c.save();
  c.scale(z, z);
  c.translate(-fx, -fy);
  drawBalloonSystem(c, z, t, true);
  c.restore();
}

// ------------------------------------------------------------------ world
function drawBalloon(c, v, t) {
  const h = balloonAlt(t);
  const x = v.wx(BX), y = v.wy(-h - 120);
  if (y < -60 || y > H + 60) return;
  const s = 1 / v.cam.mpp;
  const fade = (1 - L.prog(v.cam.mpp, 300, 400)) * L.lerp(1, 0.35, L.ease.inOutCubic(L.prog(t, v.d, 1.5)));
  if (fade <= 0) return;
  // ascent track: a faint dotted line falling away below the balloon
  const tr = L.ease.outCubic(L.prog(t, -0.6, 1.2)) * (1 - L.prog(t, v.d + 0.5, 1.5));
  if (tr > 0) {
    const g = c.createLinearGradient(0, y, 0, y + 420);
    g.addColorStop(0, L.rgba([230, 238, 255], 0.55 * tr * fade));
    g.addColorStop(1, L.rgba([230, 238, 255], 0));
    c.save();
    c.strokeStyle = g;
    c.lineWidth = 2;
    c.setLineDash([3, 9]);
    c.lineDashOffset = t * 30;
    c.beginPath(); c.moveTo(x, y + 14); c.lineTo(x, y + 420); c.stroke();
    c.restore();
  }
  // the balloon: sunlit glint, true size (≈ 130 m) with a minimum so it never vanishes
  const r = Math.max(2.4, 64 * s);
  L.lightBlob(c, x, y, 34, [255, 248, 230], 0.45 * fade);
  c.save();
  c.globalAlpha *= fade;
  c.fillStyle = 'rgb(250,250,255)';
  c.beginPath();
  c.moveTo(x, y + r * 1.35);
  c.bezierCurveTo(x + r * 1.25, y + r * 0.2, x + r * 1.1, y - r * 1.1, x, y - r * 1.05);
  c.bezierCurveTo(x - r * 1.1, y - r * 1.1, x - r * 1.25, y + r * 0.2, x, y + r * 1.35);
  c.fill();
  c.restore();
}

function drawDiver(c, v, t) {
  const a = t - T_JUMP;
  if (a < 0.05 || t > v.d + 0.6) return;
  const end = 1 - L.prog(t, v.d + 0.1, 0.5);
  const h = diverAlt(t);
  const x = v.wx(BX + 40 + 6 * a), y = v.wy(-h);
  const sp = diverSpeed(t);
  const born = L.ease.outCubic(L.prog(a, 0.05, 0.4)) * end;
  c.save();
  c.globalCompositeOperation = 'lighter';
  // speed streak (above the jumper), length grows with speed
  const len = Math.min(110, 6 + sp * 0.022);
  const sg = c.createLinearGradient(x, y - len, x, y);
  sg.addColorStop(0, 'rgba(255,240,215,0)');
  sg.addColorStop(1, `rgba(255,240,215,${0.75 * born})`);
  c.strokeStyle = sg;
  c.lineWidth = 3;
  c.lineCap = 'round';
  c.beginPath(); c.moveTo(x, y - len); c.lineTo(x, y); c.stroke();
  // Mach cone: opens behind (above) the jumper after the boom; half-angle asin(1/1.25) ≈ 53°
  const mk = L.ease.outCubic(L.prog(t, T_BOOM, 0.45)) * end;
  if (mk > 0) {
    const ha = Math.asin(1 / 1.25);
    const cl = 150 * mk;
    for (const sgn of [-1, 1]) {
      const ex = x + sgn * Math.sin(ha) * cl, ey = y - Math.cos(ha) * cl;
      const g = c.createLinearGradient(x, y, ex, ey);
      g.addColorStop(0, L.rgba(L.mix(v.accent, [255, 255, 255], 0.5), 0.85 * mk));
      g.addColorStop(1, L.rgba(v.accent, 0));
      c.strokeStyle = g;
      c.lineWidth = 2.5;
      c.beginPath(); c.moveTo(x, y); c.lineTo(ex, ey); c.stroke();
    }
    // the cone's faint fill (vapour)
    const vf = c.createRadialGradient(x, y, 0, x, y, 120);
    vf.addColorStop(0, L.rgba(v.accent, 0.22 * mk));
    vf.addColorStop(1, L.rgba(v.accent, 0));
    c.fillStyle = vf;
    c.beginPath(); c.moveTo(x, y);
    c.lineTo(x - Math.sin(ha) * 120, y - Math.cos(ha) * 120);
    c.arc(x, y, 120, -Math.PI / 2 - ha, -Math.PI / 2 + ha);
    c.closePath(); c.fill();
  }
  // shock rings at the boom
  for (let i = 0; i < 3; i++) {
    const b = t - T_BOOM - i * 0.16;
    if (b < 0 || b > 1.6) continue;
    const k = b / 1.6;
    const r = 8 + L.ease.outCubic(k) * (175 - i * 40);
    c.strokeStyle = L.rgba(L.mix(v.accent, [255, 255, 255], 0.55), 0.8 * Math.pow(1 - k, 1.6) * end);
    c.lineWidth = 3.2 * (1 - k) + 0.8;
    c.shadowColor = L.rgba(v.accent, 0.9);
    c.shadowBlur = 14;
    c.beginPath(); c.arc(x, y, Math.max(0, r), 0, Math.PI * 2); c.stroke();
  }
  c.shadowBlur = 0;
  const flash = Math.exp(-Math.max(0, t - T_BOOM) * 4) * (t >= T_BOOM ? 1 : 0);
  L.lightBlob(c, x, y, 26 + 90 * flash, [255, 245, 225], (0.5 + 0.5 * flash) * born);
  c.fillStyle = `rgba(255,255,255,${born})`;
  c.beginPath(); c.arc(x, y, 2.6, 0, Math.PI * 2); c.fill();
  c.restore();
}

export default {
  beat: 7,
  chapter: { num: '07', title: 'Balloon jump', sub: 'Felix Baumgartner, 2012' },
  captions: true,
  layer: 1,
  cues(d) {
    return [
      { t: 0.1, name: 'swell', gain: 0.24, pitch: 0.8 },
      { t: T_LOUPE + 0.15, name: 'blip', gain: 0.22, pitch: 1.1 },
      { t: T_LABEL, name: 'ping', gain: 0.22, pitch: 0.95 },
      { t: ZOOM[0] + 0.1, name: 'riser', gain: 0.16, pitch: 1.3 },
      { t: T_JUMP, name: 'swish', gain: 0.3, pitch: 0.9 },
      { t: T_JUMP + 0.4, name: 'whoosh', gain: 0.26, pitch: 0.55 },
      { t: T_BOOM - 0.02, name: 'impact', gain: 0.6, pitch: 0.7 },
      { t: T_BOOM, name: 'deep', gain: 0.4, pitch: 0.8 },
    ];
  },
  drawWorld(ctx, v) {
    const t = v.t;
    if (t < -1.0 || v.cam.mpp > 700) return;
    const appear = L.ease.outCubic(L.prog(t, -0.9, 0.9));
    ctx.save();
    ctx.globalAlpha *= appear;
    drawBalloon(ctx, v, t);
    ctx.restore();
    drawDiver(ctx, v, t);
  },
  drawOverlay(ctx, v) {
    const t = v.t;
    const out = 1 - L.ease.inCubic(L.prog(t, v.d - 0.4, 0.3));
    const bx = v.wx(BX), by = v.wy(-balloonAlt(t) - 120);
    // lens: opens on the balloon, zooms to the capsule, closes after the jumper drops out
    // the jumper in the main view (the lens target follows it once the lens tracks the fall)
    const ja = Math.max(0, t - T_JUMP);
    const jx = v.wx(BX + 40 + 6 * ja), jy = v.wy(-diverAlt(t));
    const follow = L.ease.inOutCubic(L.prog(t, T_FOLLOW, 0.45));
    // dashed altitude marker from the balloon, carrying the label (as s04 does for the summit)
    const mk = L.enter(t, T_LABEL - 0.25, 0.7) * out * v.k;
    if (mk > 0) {
      const x1 = L.lerp(bx - 22, 150, mk);
      ctx.save();
      ctx.globalAlpha = mk;
      ctx.strokeStyle = L.rgba(v.accent, 0.9);
      ctx.lineWidth = 2;
      ctx.setLineDash([10, 8]);
      ctx.lineDashOffset = v.t * 12;
      ctx.beginPath(); ctx.moveTo(bx - 22, by); ctx.lineTo(x1, by); ctx.stroke();
      ctx.restore();
    }
    // lens: opens on the balloon, zooms to the capsule, rides down with the jumper, then closes
    const lk = L.prog(t, T_LOUPE, 0.6) * (1 - L.ease.inCubic(L.prog(t, T_CLOSE, 0.35))) * v.k;
    loupe(ctx, {
      x: bx - 230, y: by + 330, r: 125, tx: L.lerp(bx, jx, follow), ty: L.lerp(by, jy, follow), k: lk, t,
      accent: v.accent, sky: skyColor(TOP), draw: (c) => lensContent(c, t),
    });
    // hand-over: a target ring stays on the falling jumper from the lens closing until the boom
    const rk = L.ease.outCubic(L.prog(t, T_CLOSE + 0.1, 0.3)) * (1 - L.ease.inCubic(L.prog(t, T_BOOM - 0.05, 0.25))) * v.k;
    if (rk > 0) {
      ctx.save();
      ctx.globalAlpha = rk;
      ctx.strokeStyle = 'rgba(240,246,255,0.85)';
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(jx, jy, 15 + 2.5 * Math.sin(t * 9), 0, Math.PI * 2); ctx.stroke();
      ctx.strokeStyle = L.rgba(v.accent, 0.8);
      for (let i = 0; i < 4; i++) {
        const a = i * Math.PI / 2 + Math.PI / 4;
        ctx.beginPath();
        ctx.moveTo(jx + Math.cos(a) * 23, jy + Math.sin(a) * 23);
        ctx.lineTo(jx + Math.cos(a) * 33, jy + Math.sin(a) * 33);
        ctx.stroke();
      }
      ctx.restore();
    }
    // label tied to the balloon's altitude: its rule (y − size·0.92 − 26) lands on the marker
    const k = L.enter(t, T_LABEL, 0.5) * out * v.k;
    L.bigLabel(ctx, { x: 150, y: by + 118, big: '39 km', small: 'broke the sound barrier, 2012', k, accent: v.accent, size: 100 });
  },
};
