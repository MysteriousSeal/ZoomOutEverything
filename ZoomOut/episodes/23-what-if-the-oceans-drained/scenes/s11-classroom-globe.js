// Beat 11 — "On a classroom globe, | all that ocean is about as thin as a coat of paint."
// The dry planet shrinks onto a classroom-globe STAND (camera shot `classroom`: r 260 at (540, 640), axis rolled 23.4°).
//
// WORLD (drawWorld, attached to the live globe disc so it tracks the camera and its drift):
//   * a brass HALF-MERIDIAN ring: an ellipse of radius 1.075 r in the plane of the polar axis, foreshortened exactly like
//     the axis (its axis-direction semi-axis uses the projected north pole), spanning pole to pole around the right side
//     and the bottom, with engraved 10° ticks; axis pins run from each pole out to the ring (the south pin is hidden
//     where it passes behind the globe);
//   * the ring's lowest point carries a bracket and a short stem down to a turned walnut pedestal and base
//     (≈ y 919–1013 at the held framing). Everything is in units of r, so it scales with the shrinking globe.
//   * The stand draws on as the globe settles (ring from the bracket out to both pins, the base rising) and fades out in
//     the first 0.6 s of beat 12 while the camera moves in.
//
// OVERLAY (screen space, fitted text):
//   * "30 cm" diameter bracket left of the globe (on "classroom globe");
//   * a magnifier ring over the dry Pacific floor (lower-left) with two hairlines down to the CROSS-SECTION inset (x 80–940,
//     y 1040–1340, opaque card): two strips drawn to ONE scale (260 px per mm):
//       row 1: the globe's surface with the ocean layer 0.087 mm thick (22.6 px). The globe is still dry in this beat, so
//              the layer starts as a dashed ghost and fills with blue on "all that ocean"; label ≈ 0.09 mm (accent);
//       row 2: a wall with ONE COAT OF PAINT ≈ 0.1 mm (26 px), brushed on on "as thin as a coat of paint".
//   FACT-CHECK: mean depth 3,682 m / 12,742 km × 300 mm = 0.087 mm; a wet coat of paint ≈ 0.1 mm.
import * as L from '../../../../engine/runtime/lib.js';
import { globeDisc, project } from '../env.js';

const { ease, clamp, prog, smoothstep } = L;
const RING = 1.075;                    // meridian radius / globe radius
const CARD = { x: 80, y: 1040, w: 860, h: 300, pad: 28 };
const MM = 260;                        // inset scale, px per mm
const OCEAN_MM = 0.087, PAINT_MM = 0.1;
const STRIP = { x0: 108, x1: 548 };    // both strips share x and scale
const ROW1 = 1172, ROW2 = 1292;        // y of each substrate's top surface
const LABEL_X = 588, LABEL_R = 912;    // label column
const MAG = { ang: 125, at: 0.6, r: 0.1 };   // magnifier over the dry Pacific floor: angle (deg, screen, y down), radius fraction, size (× r)
const BRASS = ['rgb(92,66,30)', 'rgb(214,176,104)', 'rgb(150,112,52)', 'rgb(240,214,150)', 'rgb(110,80,36)'];

/** phrase i of this beat's line, in beat-relative seconds */
function phrase(v, i) {
  const ln = v.tl.lines[v.index], s0 = v.tl.scenes[v.index].start, ph = ln.phrases ?? [ln];
  const p = ph[Math.min(i, ph.length - 1)];
  return { start: p.start - s0, end: p.end - s0 };
}

/** The stand's geometry from the live disc + projected north pole. */
function standGeom(v) {
  const D = globeDisc(v);
  const np = project(v, 90, 0);
  const A = { x: (np.x - D.x) / D.r, y: (np.y - D.y) / D.r };       // projected axis (length cos(view lat))
  const al = Math.hypot(A.x, A.y) || 1;
  const P = { x: -A.y / al, y: A.x / al };                           // in-screen perpendicular (right/down side)
  const Rr = RING * D.r;
  const at = (th, rad = Rr) => ({ x: D.x + rad * (Math.cos(th) * A.x + Math.sin(th) * P.x), y: D.y + rad * (Math.cos(th) * A.y + Math.sin(th) * P.y) });
  const thB = clamp(Math.atan2(P.y, A.y), 0.2, Math.PI - 0.05);     // the ring's lowest point
  return { D, A, al, P, Rr, at, thB, B: at(thB) };
}

function brassGrad(ctx, x0, y0, x1, y1, a = 1) {
  const g = ctx.createLinearGradient(x0, y0, x1, y1);
  BRASS.forEach((c, i) => g.addColorStop(i / (BRASS.length - 1), c));
  return g;
}

/** turned-wood horizontal gradient centred on cx, half-width hw */
function woodGrad(ctx, cx, hw) {
  const g = ctx.createLinearGradient(cx - hw, 0, cx + hw, 0);
  g.addColorStop(0, 'rgb(22,14,9)');
  g.addColorStop(0.3, 'rgb(104,68,42)');
  g.addColorStop(0.42, 'rgb(128,86,54)');
  g.addColorStop(0.7, 'rgb(58,37,23)');
  g.addColorStop(1, 'rgb(18,11,7)');
  return g;
}

function drawStand(ctx, v, kDraw, kAlpha) {
  const G = standGeom(v);
  const { D, A, al, Rr, at, thB, B } = G;
  const r = D.r;
  ctx.save();
  ctx.globalAlpha *= kAlpha;
  ctx.lineCap = 'round';
  // ---------------------------------------------------------------- pedestal + base (below the ring's lowest point)
  const rise = (1 - ease.outCubic(clamp(kDraw * 1.6))) * 0.12 * r;
  const cx = B.x, y0 = B.y + rise;
  ctx.save();
  ctx.globalAlpha *= smoothstep(clamp(ease.inOutCubic(clamp(kDraw)) * 4));   // the base arrives with the ring, never floating alone
  // profile: [dy, half-width] in units of r (stem, collar, trumpet, base plinth)
  const prof = [[0.02, 0.022], [0.055, 0.022], [0.062, 0.046], [0.08, 0.046], [0.09, 0.028], [0.15, 0.04], [0.19, 0.085], [0.215, 0.13], [0.235, 0.13]];
  ctx.beginPath();
  prof.forEach(([dy, hw], i) => { const x = cx - hw * r, y = y0 + dy * r; if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y); });
  for (let i = prof.length - 1; i >= 0; i--) ctx.lineTo(cx + prof[i][1] * r, y0 + prof[i][0] * r);
  ctx.closePath();
  ctx.fillStyle = woodGrad(ctx, cx, 0.13 * r);
  ctx.fill();
  // base disc: side band + top ellipse (seen from just above)
  const bw = 0.5 * r, bry = 0.055 * r, bTop = y0 + 0.255 * r, bH = 0.07 * r;
  ctx.beginPath();
  ctx.ellipse(cx, bTop + bH, bw, bry, 0, 0, Math.PI);
  ctx.lineTo(cx - bw, bTop);
  ctx.ellipse(cx, bTop, bw, bry, 0, Math.PI, 0, true);
  ctx.closePath();
  ctx.fillStyle = woodGrad(ctx, cx, bw);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(cx, bTop, bw, bry, 0, 0, Math.PI * 2);
  const tg = ctx.createLinearGradient(cx - bw, bTop - bry, cx + bw * 0.6, bTop + bry);
  tg.addColorStop(0, 'rgb(122,82,52)');
  tg.addColorStop(0.5, 'rgb(84,55,34)');
  tg.addColorStop(1, 'rgb(40,26,16)');
  ctx.fillStyle = tg;
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,220,170,0.28)';
  ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.ellipse(cx, bTop, bw, bry, 0, Math.PI * 1.05, Math.PI * 1.7); ctx.stroke();
  // the plinth meets the base: a small contact shadow on the base top
  ctx.fillStyle = 'rgba(10,6,4,0.45)';
  ctx.beginPath(); ctx.ellipse(cx, bTop - 0.004 * r, 0.15 * r, 0.022 * r, 0, 0, Math.PI * 2); ctx.fill();
  // brass ferrule where the stem meets the ring bracket
  ctx.fillStyle = brassGrad(ctx, cx - 0.03 * r, 0, cx + 0.03 * r, 0);
  ctx.fillRect(cx - 0.03 * r, y0 + 0.0 * r, 0.06 * r, 0.03 * r);
  ctx.restore();
  // ---------------------------------------------------------------- the meridian ring (draws out from the bracket)
  const e = ease.inOutCubic(clamp(kDraw));
  const thA = thB - (thB + 0.04) * e, thZ = thB + (Math.PI + 0.04 - thB) * e;
  const W0 = 0.042 * r;
  const ringPath = () => {
    ctx.beginPath();
    const n = 64;
    for (let i = 0; i <= n; i++) { const p = at(L.lerp(thA, thZ, i / n)); if (i) ctx.lineTo(p.x, p.y); else ctx.moveTo(p.x, p.y); }
  };
  // axis pins first (under the ring ends): north from the pole on the surface, south only outside the disc
  if (e > 0.98) {
    const pk = clamp((e - 0.98) / 0.02);
    ctx.lineWidth = Math.max(1.5, 0.014 * r);
    ctx.strokeStyle = `rgba(226,196,130,${0.95 * pk})`;
    const pin = (u0, u1) => { ctx.beginPath(); ctx.moveTo(D.x + A.x * u0, D.y + A.y * u0); ctx.lineTo(D.x + A.x * u1, D.y + A.y * u1); ctx.stroke(); };
    pin(r, Rr);                                   // north: pole (on the visible surface) → ring
    pin(-Rr, -Math.max(r, r / al) * 1.003);       // south: ring → the limb (the rest is behind the globe)
    // pole cap (a small brass nut where the pin enters the globe)
    ctx.fillStyle = brassGrad(ctx, D.x + A.x * r - 6, 0, D.x + A.x * r + 6, 0);
    ctx.beginPath(); ctx.arc(D.x + A.x * r, D.y + A.y * r, Math.max(0, 0.022 * r * pk), 0, Math.PI * 2); ctx.fill();
  }
  ringPath();
  ctx.strokeStyle = 'rgba(20,12,4,0.85)';
  ctx.lineWidth = W0 + 3;
  ctx.stroke();
  ringPath();
  const bb = { x0: D.x - Rr, y0: D.y - Rr, x1: D.x + Rr, y1: D.y + Rr };
  ctx.strokeStyle = brassGrad(ctx, bb.x0, bb.y0, bb.x1, bb.y1);
  ctx.lineWidth = W0;
  ctx.stroke();
  // inner highlight + engraved 10° ticks
  ctx.beginPath();
  for (let i = 0; i <= 48; i++) { const p = at(L.lerp(thA, thZ, i / 48), Rr - W0 * 0.28); if (i) ctx.lineTo(p.x, p.y); else ctx.moveTo(p.x, p.y); }
  ctx.strokeStyle = 'rgba(255,240,200,0.55)';
  ctx.lineWidth = Math.max(1, 0.006 * r);
  ctx.stroke();
  ctx.strokeStyle = 'rgba(40,26,8,0.55)';
  ctx.lineWidth = 1.2;
  for (let deg = 0; deg <= 180; deg += 10) {
    const th = (deg * Math.PI) / 180;
    if (th < thA || th > thZ) continue;
    const a = at(th, Rr - W0 * 0.5), b = at(th, Rr + W0 * (deg % 30 ? 0.05 : 0.45));
    ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
  }
  // ring-end knobs
  if (e > 0.98) for (const th of [0, Math.PI]) {
    const p = at(th);
    ctx.fillStyle = brassGrad(ctx, p.x - 8, p.y - 8, p.x + 8, p.y + 8);
    ctx.beginPath(); ctx.arc(p.x, p.y, Math.max(0, 0.03 * r), 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = 'rgba(20,12,4,0.7)'; ctx.lineWidth = 1; ctx.stroke();
  }
  // the bracket clamping the ring to the stem
  ctx.fillStyle = brassGrad(ctx, B.x - 0.05 * r, B.y, B.x + 0.05 * r, B.y);
  L.roundRect(ctx, B.x - 0.05 * r, B.y - 0.03 * r, 0.1 * r, 0.055 * r, 0.012 * r);
  ctx.fill();
  ctx.strokeStyle = 'rgba(20,12,4,0.7)'; ctx.lineWidth = 1; ctx.stroke();
  ctx.restore();
}

/** a strip: substrate block with a top surface at y (slight globe curvature), plus the layer of thickness th (px) */
function strip(ctx, y, th, sub, layer, kFill, dashedGhost, acc) {
  const { x0, x1 } = STRIP, sag = 5;
  const top = (x) => y + sag * Math.pow((x - (x0 + x1) / 2) / ((x1 - x0) / 2), 2);
  const curve = (dy) => { ctx.moveTo(x0, top(x0) + dy); for (let x = x0 + 10; x <= x1; x += 10) ctx.lineTo(x, top(x) + dy); };
  // substrate, fading out downwards (it continues)
  ctx.save();
  ctx.beginPath(); curve(0); ctx.lineTo(x1, y + 44); ctx.lineTo(x0, y + 44); ctx.closePath();
  const g = ctx.createLinearGradient(0, y, 0, y + 44);
  g.addColorStop(0, L.rgba(sub[0])); g.addColorStop(1, L.rgba(sub[1], 0));
  ctx.fillStyle = g; ctx.fill();
  ctx.restore();
  // ghost outline of the layer
  if (dashedGhost > 0) {
    ctx.save();
    ctx.globalAlpha *= dashedGhost;
    ctx.setLineDash([6, 5]);
    ctx.strokeStyle = L.rgba(acc, 0.8);
    ctx.lineWidth = 1.5;
    ctx.beginPath(); curve(-th); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x0, top(x0) - th); ctx.lineTo(x0, top(x0)); ctx.moveTo(x1, top(x1) - th); ctx.lineTo(x1, top(x1)); ctx.stroke();
    ctx.restore();
  }
  // the layer itself, filling left → right
  if (kFill > 0) {
    const xe = L.lerp(x0, x1, kFill);
    ctx.save();
    ctx.beginPath(); ctx.rect(x0 - 2, y - th - 20, xe - x0 + 2, th + 40); ctx.clip();
    ctx.beginPath(); curve(-th);
    for (let x = x1; x >= x0; x -= 10) ctx.lineTo(x, top(x));
    ctx.lineTo(x0, top(x0)); ctx.closePath();
    const lg = ctx.createLinearGradient(0, y - th, 0, y);
    lg.addColorStop(0, L.rgba(layer[0])); lg.addColorStop(1, L.rgba(layer[1]));
    ctx.fillStyle = lg; ctx.fill();
    ctx.beginPath(); curve(-th);
    ctx.strokeStyle = L.rgba(layer[2]); ctx.lineWidth = 1.5; ctx.stroke();
    ctx.restore();
    // a bright leading edge while filling
    if (kFill < 1) { L.lightBlob(ctx, xe, top(xe) - th / 2, 26, layer[2], 0.55); }
  }
}

/** right-hand bracket + two-line label (big number, small tracked caption), fitted to the label column */
function rowLabel(ctx, yTop, yBot, big, small, col, k) {
  if (k <= 0) return;
  ctx.save();
  ctx.globalAlpha *= clamp(k);
  const bx = STRIP.x1 + 16;
  ctx.strokeStyle = 'rgba(235,240,246,0.85)';
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(bx - 7, yTop); ctx.lineTo(bx, yTop); ctx.lineTo(bx, yBot); ctx.lineTo(bx - 7, yBot); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(bx, (yTop + yBot) / 2); ctx.lineTo(LABEL_X - 10, (yTop + yBot) / 2); ctx.stroke();
  const maxW = LABEL_R - LABEL_X;
  const mid = (yTop + yBot) / 2;
  const s = L.fitSize(ctx, big, maxW, 58, 800, L.FONT.display, 30);
  ctx.font = L.font(s, 800, L.FONT.display);
  ctx.fillStyle = col;
  ctx.textBaseline = 'alphabetic';
  ctx.fillText(big, LABEL_X + (1 - ease.outCubic(clamp(k))) * 16, mid + s * 0.2);
  ctx.font = L.font(L.fitSize(ctx, small, maxW - 30, 19, 600, L.FONT.body, 14), 600, L.FONT.body);
  ctx.fillStyle = 'rgba(205,215,230,0.92)';
  L.trackedText(ctx, small, LABEL_X, mid + s * 0.2 + 30, 2.5);
  ctx.restore();
}

export default {
  beat: 11,
  chapter: { num: '09', title: 'To scale', sub: 'a 30 cm classroom globe' },
  layer: 11,
  cues(d) {
    // beat 60.45: phrase 0 "On a classroom globe" 60.60; phrase 1 "all that ocean…" 62.24 (t 1.79)
    return [
      { t: 0.75, name: 'creak', gain: 0.12, pitch: 1.4 },      // the stand assembles under the globe
      { t: 1.25, name: 'tick', gain: 0.18, pitch: 1.1 },       // 30 cm bracket
      { t: 1.55, name: 'swish', gain: 0.18, pitch: 1.2 },      // the magnifier + inset open
      { t: 1.85, name: 'bubbles', gain: 0.14, pitch: 1.3 },    // the ocean layer pours in
      { t: 2.55, name: 'ping', gain: 0.24, pitch: 1.25 },      // ≈ 0.09 mm
      { t: 3.35, name: 'swish', gain: 0.14, pitch: 0.9 },      // the paint is brushed on
      { t: 3.75, name: 'blip', gain: 0.18, pitch: 1.0 },       // coat of paint ≈ 0.1 mm
    ];
  },
  drawWorld(ctx, v) {
    // from the pull-back until the camera has moved in on beat 12
    if (v.t < 0.3 || v.t > v.d + 0.7) return;
    const kDraw = ease.outCubic(prog(v.t, 0.8, 1.4));   // the ring grows out of its bracket as the globe settles
    const kA = smoothstep(prog(v.t, 0.75, 0.4)) * (1 - smoothstep(prog(v.t, v.d, 0.6)));
    if (kA <= 0) return;
    const D = globeDisc(v);
    if (D.r < 60 || D.r > 900) return;
    drawStand(ctx, v, kDraw, kA);
  },
  drawOverlay(ctx, v) {
    if (v.k <= 0) return;
    const acc = L.rgba(v.accent);
    const D = globeDisc(v);
    const p1 = phrase(v, 1);
    ctx.save();
    ctx.globalAlpha = v.k;
    ctx.textBaseline = 'alphabetic';
    // ---------------------------------------------------------------- 30 cm diameter bracket (left of the globe)
    const kd = ease.outCubic(prog(v.t, 1.15, 0.6));
    if (kd > 0) {
      const bx = Math.max(214, D.x - D.r - 48);
      const y1 = D.y - D.r, y2 = D.y + D.r, mid = D.y;
      const a = L.lerp(mid, y1, kd), b = L.lerp(mid, y2, kd);
      ctx.strokeStyle = 'rgba(235,240,246,0.8)';
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(bx + 12, a); ctx.lineTo(bx, a); ctx.lineTo(bx, b); ctx.lineTo(bx + 12, b); ctx.stroke();
      ctx.setLineDash([3, 6]);
      ctx.strokeStyle = 'rgba(235,240,246,0.3)';
      ctx.beginPath(); ctx.moveTo(bx + 12, a); ctx.lineTo(D.x, a); ctx.stroke();   // top tangent only (the bottom would cross the leaders)
      ctx.setLineDash([]);
      ctx.globalAlpha = v.k * clamp(kd * 1.5 - 0.3);
      const s = L.fitSize(ctx, '30 cm', bx - 18 - 80, 52, 800, L.FONT.display, 28);
      ctx.font = L.font(s, 800, L.FONT.display);
      ctx.fillStyle = '#fff';
      ctx.textAlign = 'right';
      ctx.fillText('30 cm', bx - 16, mid + s * 0.18);
      ctx.font = L.font(L.fitSize(ctx, 'ACROSS', bx - 18 - 80, 17, 600, L.FONT.body, 12), 600, L.FONT.body);
      ctx.fillStyle = 'rgba(205,215,230,0.85)';
      L.trackedText(ctx, 'ACROSS', bx - 16, mid + s * 0.18 + 26, 2.5, 'right');
      ctx.textAlign = 'left';
      ctx.globalAlpha = v.k;
    }
    // ---------------------------------------------------------------- magnifier + inset card
    const kc = ease.outCubic(prog(v.t, 1.5, 0.55));
    if (kc > 0) {
      const ang = (MAG.ang * Math.PI) / 180;
      const mx = D.x + Math.cos(ang) * D.r * MAG.at, my = D.y + Math.sin(ang) * D.r * MAG.at, mr = Math.max(14, D.r * MAG.r);
      // the magnifier ring
      ctx.strokeStyle = acc;
      ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.arc(mx, my, Math.max(0, mr * ease.outBack(clamp(kc))), 0, Math.PI * 2); ctx.stroke();
      // hairlines from the ring's sides to the card's top edge
      const tA = { x: 150, y: CARD.y }, tB = { x: 300, y: CARD.y };
      const kl = ease.outCubic(prog(v.t, 1.62, 0.4));
      ctx.strokeStyle = L.rgba(v.accent, 0.6);
      ctx.lineWidth = 1.5;
      // sources on the ring's lower-left rim; the right line stays clear of the ring's south knob and the base
      for (const [ang2, tgt] of [[Math.PI * 0.95, tA], [Math.PI * 0.4, tB]]) {
        const sx = mx + Math.cos(ang2) * mr, sy = my + Math.sin(ang2) * mr;
        ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(L.lerp(sx, tgt.x, kl), L.lerp(sy, tgt.y, kl)); ctx.stroke();
      }
      // card (opens downward from its top edge)
      const hh = CARD.h * ease.outCubic(prog(v.t, 1.7, 0.5));
      if (hh > 1) {
        ctx.save();
        ctx.fillStyle = 'rgba(4,10,20,0.94)';
        L.roundRect(ctx, CARD.x, CARD.y, CARD.w, hh, 22);
        ctx.fill();
        ctx.strokeStyle = L.rgba(v.accent, 0.4);
        ctx.lineWidth = 1.5;
        ctx.stroke();
        ctx.clip();
        const kt = clamp(prog(v.t, 1.78, 0.35));
        ctx.globalAlpha = v.k * kt;
        // kicker
        ctx.fillStyle = acc;
        ctx.fillRect(CARD.x + CARD.pad, CARD.y + 34, 36, 4);
        ctx.font = L.font(L.fitSize(ctx, 'CROSS-SECTION, MAGNIFIED', 470, 20, 700, L.FONT.body, 14), 700, L.FONT.body);
        ctx.fillStyle = 'rgba(225,230,238,0.9)';
        L.trackedText(ctx, 'CROSS-SECTION, MAGNIFIED', CARD.x + CARD.pad + 50, CARD.y + 42, 3.5);
        ctx.font = L.font(17, 600, L.FONT.body);
        ctx.fillStyle = 'rgba(205,215,230,0.6)';
        L.trackedText(ctx, 'SAME SCALE', LABEL_R, CARD.y + 42, 2.5, 'right');
        // row 1: the ocean layer on the globe's surface
        const tO = OCEAN_MM * MM, tP = PAINT_MM * MM;
        const fillO = ease.inOutCubic(prog(v.t, p1.start + 0.05, 0.9));
        strip(ctx, ROW1, tO, [[150, 112, 76], [90, 64, 42]], [[120, 205, 255], [38, 120, 210], [170, 225, 255]],
          fillO, kt * (1 - fillO * 0.6), v.accent);
        ctx.font = L.font(15, 600, L.FONT.body);
        ctx.fillStyle = 'rgba(30,20,12,0.85)';
        L.trackedText(ctx, 'GLOBE', STRIP.x0 + 10, ROW1 + 22, 2.5);
        rowLabel(ctx, ROW1 - tO, ROW1, '≈ 0.09 mm', 'ALL OF THE OCEAN', acc, ease.outCubic(prog(v.t, p1.start + 0.7, 0.5)));
        // row 2: one coat of paint on a wall, at the same scale
        const kP = ease.inOutCubic(prog(v.t, p1.start + 1.45, 0.7));
        strip(ctx, ROW2, tP, [[128, 130, 136], [80, 82, 88]], [[244, 240, 230], [214, 208, 196], [255, 252, 244]],
          kP, kt * smoothstep(prog(v.t, p1.start + 1.2, 0.3)) * (1 - kP * 0.6), [235, 235, 235]);
        ctx.font = L.font(15, 600, L.FONT.body);
        ctx.fillStyle = 'rgba(20,22,26,0.85)';
        ctx.globalAlpha = v.k * kt * smoothstep(prog(v.t, p1.start + 1.2, 0.3));
        L.trackedText(ctx, 'WALL', STRIP.x0 + 10, ROW2 + 22, 2.5);
        ctx.globalAlpha = v.k * kt;
        rowLabel(ctx, ROW2 - tP, ROW2, '≈ 0.1 mm', 'ONE COAT OF PAINT', 'rgb(240,242,245)', ease.outCubic(prog(v.t, p1.start + 1.75, 0.5)));
        ctx.restore();
      }
    }
    ctx.restore();
  },
};
