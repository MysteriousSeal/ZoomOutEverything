// Beat 8 — "All of it has to live somewhere: | in vast warehouses of computers called data centers."
// The data-centre campus on DC_PLAN (plan frame, Secaucus NJ): four long data halls with rows of rooftop cooling fans,
// generator yards, water tanks, a substation (beat 9's power lines land there), a parking lot, perimeter lights.
//   * "All of it has to live somewhere": as the camera glides west, light streams leave the city along the streets,
//     cross the Hudson and race ahead of the camera into the campus.
//   * "vast warehouses": the halls light up one by one (a light sweep over each roof) and the fans spin up.
//   * "of computers": the roofs turn to glass, revealing rows of server racks with blinking status lights.
//   * "data centers": label "data centers" / "warehouses of computers".
// The campus is a pure function of time and is drawn whenever it is on screen (LOD by mpp), so it also reads in
// beat 9's climb and in beat 17's dive home.
import * as L from '../../../../engine/runtime/lib.js';
import { ACCENT, SCREEN, WARM, DC_PLAN, DC, withPlan, planToScreen, planK, toWorld } from '../env.js';

const ACC = ACCENT;
const P = DC_PLAN;
const TAU = Math.PI * 2;

// ------------------------------------------------------------------ campus layout (PLAN metres)
export const HALLS = [0, 1, 2, 3].map((i) => ({ x0: P.x0 + 205, x1: P.x0 + 765, y0: P.y0 + 52 + i * 124, y1: P.y0 + 142 + i * 124 }));
export const SUB = { x0: P.x0 + 26, x1: P.x0 + 158, y0: P.y0 + 440, y1: P.y0 + 588 };
export const SUB_PLAN = { x: (SUB.x0 + SUB.x1) / 2, y: (SUB.y0 + SUB.y1) / 2 };
/** The substation in WORLD metres (local to HOME): beat 9's power lines converge here. */
export const SUB_WORLD = toWorld(SUB_PLAN.x, SUB_PLAN.y);
export { DC };
const TANKS = [[P.x0 + 62, P.y0 + 92], [P.x0 + 122, P.y0 + 92], [P.x0 + 62, P.y0 + 160], [P.x0 + 122, P.y0 + 160]];
const LOT = { x0: P.x0 + 230, x1: P.x0 + 740, y0: P.y0 + 538, y1: P.y0 + 594 };
const OFFICE = { x0: P.x0 + 772, x1: P.x0 + 836, y0: P.y0 + 520, y1: P.y0 + 592 };
const FAN_R = 4.4, FAN_STEP = 12.5;

const hash = (a, b, c = 0) => { let h = Math.imul(a + 7, 374761393) ^ Math.imul(b + 11, 668265263) ^ Math.imul(c + 3, 2147483647); h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };

// ------------------------------------------------------------------ timing (global seconds, from the timeline)
export function dcTimes(tl) {
  const s = tl.scenes[8].start, a = tl.lines[8].phrases[0], b = tl.lines[8].phrases[1];
  const at = (f) => b.start + (b.end - b.start) * f;
  return {
    s, end: tl.scenes[8].end,
    glide: a.start - 0.1,
    light: at(0.06),          // "vast"
    xray: at(0.38),           // "computers"
    label: at(0.71),          // "data centers"
    streamsOut: tl.scenes[9].start + 0.15,
  };
}
const hallLight = (gt, T, i) => L.ease.inOutCubic(L.prog(gt, T.light + i * 0.13, 0.7));
const hallXray = (gt, T, i) => L.ease.inOutCubic(L.prog(gt, T.xray + i * 0.11, 0.65));
function spin(gt, t0, ramp) {   // integral of a 0 -> 1 ramp (rad / unit speed)
  const t = gt - t0;
  if (t <= 0) return 0;
  return t < ramp ? (t * t) / (2 * ramp) : ramp / 2 + t - ramp;
}

// ------------------------------------------------------------------ light streams: city -> campus (PLAN metres)
const STREAMS = [
  [120, -200, 0, -16], [-220, 40, 0, 16], [300, 120, 1, -12], [-60, -360, 1, 14],
  [-380, 280, 2, -14], [200, 360, 2, 12], [-160, 200, 3, -12], [40, -40, 3, 14],
].map(([xs, ys0, hall, off], i) => {
  const ys = Math.round((ys0 - 40) / 80) * 80 + 40;           // run down a street
  const H = HALLS[hall], yt = (H.y0 + H.y1) / 2 + off;
  const pts = [[xs, ys], [-1350 - i * 40, ys], [-3150 - i * 30, yt], [P.x1, yt], [H.x1, yt], [H.x0 + 40, yt]];
  const acc = [0];
  for (let q = 1; q < pts.length; q++) acc.push(acc[q - 1] + Math.hypot(pts[q][0] - pts[q - 1][0], pts[q][1] - pts[q - 1][1]));
  return { pts, acc, len: acc[acc.length - 1], inside: acc[4], hall, i };
});
function pointAt(S, s) {
  let q = 1;
  while (q < S.acc.length - 1 && S.acc[q] < s) q++;
  const f = L.clamp((s - S.acc[q - 1]) / Math.max(1e-6, S.acc[q] - S.acc[q - 1]));
  return [L.lerp(S.pts[q - 1][0], S.pts[q][0], f), L.lerp(S.pts[q - 1][1], S.pts[q][1], f)];
}
function tracePart(c, S, s0, s1) {
  if (s1 <= s0) return;
  const a = pointAt(S, s0);
  c.moveTo(a[0], a[1]);
  for (let q = 1; q < S.pts.length; q++) if (S.acc[q] > s0 && S.acc[q] < s1) c.lineTo(S.pts[q][0], S.pts[q][1]);
  const b = pointAt(S, s1);
  c.lineTo(b[0], b[1]);
}

function drawStreams(c, v, T) {
  const gt = v.gt;
  const k = L.ease.outCubic(L.prog(gt, T.glide, 0.5)) * (1 - L.ease.inCubic(L.prog(gt, T.streamsOut, 0.7)));
  if (k <= 0) return;
  const mpp = v.cam.mpp;
  const boost = 1 + 0.8 * L.clamp((mpp - 1.5) / 3);   // brighter while the camera is lifted mid-glide
  withPlan(c, v, (c) => {
    c.globalCompositeOperation = 'lighter';
    c.lineCap = 'round';
    c.lineJoin = 'round';
    for (const S of STREAMS) {
      const head = S.len * L.ease.inOutCubic(L.prog(gt, T.glide + 0.05 + S.i * 0.05, 1.95));
      if (head <= 0) continue;
      const xr = hallXray(gt, T, S.hall);
      const outEnd = Math.min(head, S.inside);
      // the path (outside the hall)
      c.beginPath(); tracePart(c, S, 0, outEnd);
      c.strokeStyle = L.rgba(ACC, 0.09 * k); c.lineWidth = 7 * mpp; c.stroke();
      c.strokeStyle = L.rgba(ACC, Math.min(0.7, 0.32 * k * boost)); c.lineWidth = 1.4 * mpp; c.stroke();
      if (head > S.inside && xr > 0) {
        c.beginPath(); tracePart(c, S, S.inside, head);
        c.strokeStyle = L.rgba(ACC, 0.4 * k * xr); c.lineWidth = 1.6 * mpp; c.stroke();
      }
      // the source in the city
      const p0 = S.pts[0];
      c.fillStyle = L.rgba([210, 235, 255], 0.8 * k);
      c.beginPath(); c.arc(p0[0], p0[1], 2.6 * mpp, 0, TAU); c.fill();
      // the head: a bright bead racing ahead of the camera
      if (head < S.len - 1) {
        const h = pointAt(S, head);
        const hk = head > S.inside ? xr : 1;
        L.lightBlob(c, h[0], h[1], 26 * mpp, ACC, 0.8 * k * hk);
        c.fillStyle = L.rgba([235, 245, 255], 0.95 * k * hk);
        c.beginPath(); c.arc(h[0], h[1], 2.8 * mpp, 0, TAU); c.fill();
      }
      // data pulses flowing toward the campus
      const SP = 650, GAP = Math.max(300, 40 * mpp), plen = Math.min(GAP * 0.4, Math.max(45, 26 * mpp));
      const off = (gt * SP + S.i * 113) % GAP;
      const pathO = new Path2D(), pathI = new Path2D();
      let nI = 0;
      for (let s = off; s < head; s += GAP) {
        const s0 = Math.max(0, s - plen);
        const inside = s > S.inside;
        const pp = inside ? pathI : pathO;
        const a = pointAt(S, s0), b = pointAt(S, s);
        pp.moveTo(a[0], a[1]);
        if (s0 < S.inside && s > S.inside) { const m = pointAt(S, S.inside); pp.lineTo(m[0], m[1]); }
        pp.lineTo(b[0], b[1]);
        if (inside) nI++;
      }
      c.strokeStyle = L.rgba(ACC, 0.3 * k); c.lineWidth = 6 * mpp; c.stroke(pathO);
      c.strokeStyle = L.rgba([200, 232, 255], 0.95 * k); c.lineWidth = 2.2 * mpp; c.stroke(pathO);
      if (nI && xr > 0) {
        c.strokeStyle = L.rgba(ACC, 0.35 * k * xr); c.lineWidth = 6 * mpp; c.stroke(pathI);
        c.strokeStyle = L.rgba([200, 232, 255], 0.95 * k * xr); c.lineWidth = 2.2 * mpp; c.stroke(pathI);
      }
    }
  });
}

// ------------------------------------------------------------------ the campus
function campusOnScreen(v) {
  const pts = [[P.x0, P.y0], [P.x1, P.y0], [P.x0, P.y1], [P.x1, P.y1]].map(([x, y]) => planToScreen(v, x, y));
  const xs = pts.map((p) => p.x), ys = pts.map((p) => p.y);
  return { x0: Math.min(...xs), x1: Math.max(...xs), y0: Math.min(...ys), y1: Math.max(...ys) };
}

function drawCampus(c, v, T, pk) {
  const gt = v.gt, mpp = v.cam.mpp;
  const bb = campusOnScreen(v);
  if (bb.x1 < -40 || bb.x0 > L.W + 40 || bb.y1 < -40 || bb.y0 > L.H + 40) return;
  const lit = [0, 1, 2, 3].map((i) => hallLight(gt, T, i));
  const xr = [0, 1, 2, 3].map((i) => hallXray(gt, T, i));
  const anyLit = Math.max(...lit);
  // far away: a single node of light
  if (mpp > 12) {
    const p = planToScreen(v, (P.x0 + P.x1) / 2, (P.y0 + P.y1) / 2);
    c.save();
    c.globalAlpha = pk;
    c.fillStyle = 'rgba(40,46,58,0.9)';
    c.fillRect(p.x - 1.5, p.y - 1.5, 3, 3);
    if (anyLit > 0) L.lightBlob(c, p.x, p.y, Math.max(10, 900 / mpp), ACC, 0.55 * anyLit);
    c.restore();
    return;
  }
  const detail = 1 - L.clamp((mpp - 2.5) / 2.5);   // fans, racks, cars fade out by ~5 m/px
  const px = (n) => n * mpp;
  withPlan(c, v, (c) => {
    c.globalAlpha = pk;
    // ---- site: fence, roads, yard lights
    c.fillStyle = '#121419';
    c.fillRect(P.x0 + 14, P.y0 + 14, P.x1 - P.x0 - 28, P.y1 - P.y0 - 28);
    c.fillStyle = '#0d0f13';                  // ring road
    c.fillRect(P.x0 + 14, P.y0 + 14, P.x1 - P.x0 - 28, 22);
    c.fillRect(P.x0 + 14, P.y1 - 36, P.x1 - P.x0 - 28, 22);
    c.fillRect(P.x0 + 176, P.y0 + 14, 18, P.y1 - P.y0 - 28);
    c.fillRect(P.x1 - 64, P.y0 + 14, 22, P.y1 - P.y0 - 28);
    c.strokeStyle = 'rgba(150,160,180,0.35)';
    c.lineWidth = px(1);
    c.setLineDash([px(3), px(3)]);
    c.strokeRect(P.x0 + 6, P.y0 + 6, P.x1 - P.x0 - 12, P.y1 - P.y0 - 12);
    c.setLineDash([]);
    // ---- parking lot
    if (detail > 0) {
      c.strokeStyle = `rgba(90,98,112,${0.35 * detail})`;
      c.lineWidth = px(0.8);
      c.beginPath();
      for (let x = LOT.x0; x <= LOT.x1; x += 2.6) { c.moveTo(x, LOT.y0); c.lineTo(x, LOT.y0 + 5); c.moveTo(x, LOT.y1 - 5); c.lineTo(x, LOT.y1); }
      c.stroke();
      for (let x = LOT.x0 + 1.3, q = 0; x < LOT.x1; x += 2.6, q++) {
        for (const [y, row] of [[LOT.y0 + 0.4, 0], [LOT.y1 - 4.9, 1]]) {
          const h = hash(q, row, 4);
          if (h > 0.62) continue;
          c.fillStyle = L.rgba(L.mix([38, 42, 50], [70, 76, 88], hash(q, row, 9)), detail);
          c.fillRect(x - 0.9, y + 0.3, 1.8, 4.2);
        }
      }
    }
    // ---- office / security
    c.fillStyle = '#23272f';
    c.fillRect(OFFICE.x0, OFFICE.y0, OFFICE.x1 - OFFICE.x0, OFFICE.y1 - OFFICE.y0);
    c.fillStyle = L.rgba(WARM, 0.35);
    c.fillRect(OFFICE.x0 + 4, OFFICE.y0 + 4, OFFICE.x1 - OFFICE.x0 - 8, 3);
    // ---- water tanks
    for (const [tx, ty] of TANKS) {
      c.fillStyle = '#20242c';
      c.beginPath(); c.arc(tx, ty, 24, 0, TAU); c.fill();
      c.strokeStyle = 'rgba(110,120,138,0.5)';
      c.lineWidth = px(1.2);
      c.beginPath(); c.arc(tx, ty, 24, 0, TAU); c.stroke();
      c.beginPath(); c.arc(tx, ty, 16, 0, TAU); c.stroke();
    }
    // ---- substation: fenced yard, transformer grid, bus bars
    c.fillStyle = '#16191f';
    c.fillRect(SUB.x0, SUB.y0, SUB.x1 - SUB.x0, SUB.y1 - SUB.y0);
    c.strokeStyle = 'rgba(150,160,180,0.45)';
    c.lineWidth = px(1);
    c.strokeRect(SUB.x0, SUB.y0, SUB.x1 - SUB.x0, SUB.y1 - SUB.y0);
    c.strokeStyle = 'rgba(120,130,150,0.55)';
    c.beginPath();
    for (let q = 0; q < 4; q++) { const y = SUB.y0 + 22 + q * 34; c.moveTo(SUB.x0 + 10, y); c.lineTo(SUB.x1 - 10, y); }
    c.stroke();
    for (let q = 0; q < 4; q++) {
      for (let r = 0; r < 5; r++) {
        const x = SUB.x0 + 16 + r * 24, y = SUB.y0 + 30 + q * 34;
        c.fillStyle = '#2b3039';
        c.fillRect(x, y, 12, 14);
        c.fillStyle = L.rgba(ACC, 0.25 + 0.5 * anyLit * (0.5 + 0.5 * Math.sin(gt * 3 + q + r * 1.7)));
        c.fillRect(x + 4.5, y + 5, 3, 3);
      }
    }
    // ---- generator yards (beside each hall)
    for (let i = 0; i < 4; i++) {
      const H = HALLS[i];
      for (let q = 0; q < 6; q++) {
        const y = H.y0 + 6 + q * 13.5;
        c.fillStyle = '#262a32';
        c.fillRect(H.x0 - 34, y, 22, 9);
        c.fillStyle = L.rgba(WARM, 0.45 + 0.4 * (L.noise1(gt * 0.7 + q * 3 + i * 11, 5) > 0.3 ? 1 : 0));
        c.fillRect(H.x0 - 15, y + 3.5, 2, 2);
      }
    }
    // ---- data halls
    for (let i = 0; i < 4; i++) {
      const H = HALLS[i], w = H.x1 - H.x0, h = H.y1 - H.y0;
      const lk = lit[i], xk = xr[i] * detail;
      // shadow
      c.fillStyle = 'rgba(0,0,0,0.45)';
      c.fillRect(H.x0 + 3, H.y0 + 4, w, h);
      // interior (seen once the roof turns to glass): floor, rack rows, status lights
      const in0 = H.y0 + 15, in1 = H.y1 - 15;
      if (xk > 0) {
        c.fillStyle = '#070b13';
        c.fillRect(H.x0, in0, w, in1 - in0);
        c.fillStyle = `rgba(40,58,86,${xk})`;
        for (let x = H.x0 + 8; x < H.x1 - 8; x += 5) c.fillRect(x, in0 + 5, 2.4, in1 - in0 - 10);
        // cold-aisle glow
        const ag = c.createLinearGradient(0, in0, 0, in1);
        ag.addColorStop(0, L.rgba(ACC, 0)); ag.addColorStop(0.5, L.rgba(ACC, 0.16 * xk)); ag.addColorStop(1, L.rgba(ACC, 0));
        c.fillStyle = ag;
        c.fillRect(H.x0, in0, w, in1 - in0);
      }
      // roof (fades to glass with the x-ray)
      const ra = 1 - 0.82 * xk;
      c.fillStyle = `rgba(38,42,51,${ra})`;
      c.fillRect(H.x0, in0, w, in1 - in0);
      if (ra > 0.3) {
        c.strokeStyle = `rgba(60,66,78,${0.6 * ra})`;
        c.lineWidth = px(0.8);
        c.beginPath();
        for (let x = H.x0 + 40; x < H.x1; x += 40) { c.moveTo(x, in0); c.lineTo(x, in1); }
        c.moveTo(H.x0, (in0 + in1) / 2); c.lineTo(H.x1, (in0 + in1) / 2);
        c.stroke();
      }
      // fan strips along both long edges
      c.fillStyle = '#2c3039';
      c.fillRect(H.x0, H.y0, w, 15);
      c.fillRect(H.x0, H.y1 - 15, w, 15);
      // roof outline + edge highlight
      c.strokeStyle = 'rgba(120,130,148,0.55)';
      c.lineWidth = px(1);
      c.strokeRect(H.x0, H.y0, w, h);
      // light-up: edge light lines + a sweep over the roof
      if (lk > 0) {
        c.save();
        c.globalCompositeOperation = 'lighter';
        c.fillStyle = L.rgba(SCREEN, 0.5 * lk);
        c.fillRect(H.x0, in0 - 0.8, w, 1.6);
        c.fillRect(H.x0, in1 - 0.8, w, 1.6);
        for (const [e, a] of [[5, 0.07], [14, 0.045], [30, 0.025]]) {
          c.fillStyle = L.rgba(ACC, a * lk);
          c.fillRect(H.x0 - e, H.y0 - e, w + 2 * e, h + 2 * e);
        }
        const sw = L.prog(gt, T.light + i * 0.13, 0.9);
        if (sw > 0 && sw < 1) {
          const sx = L.lerp(H.x1 + 80, H.x0 - 80, L.ease.inOutCubic(sw));
          const g = c.createLinearGradient(sx - 70, 0, sx + 70, 0);
          g.addColorStop(0, 'rgba(160,210,255,0)'); g.addColorStop(0.5, 'rgba(160,210,255,0.35)'); g.addColorStop(1, 'rgba(160,210,255,0)');
          c.fillStyle = g;
          c.fillRect(H.x0, H.y0, w, h);
        }
        c.restore();
      }
      // rack status lights (additive, above the glass)
      if (xk > 0.02) {
        c.save();
        c.globalCompositeOperation = 'lighter';
        const s = Math.max(1.0, 1.5 * mpp);
        let q = 0;
        for (let x = H.x0 + 9.2; x < H.x1 - 8; x += 5, q++) {
          for (let m = 0; m < 5; m++) {
            const hh = hash(i, q, m);
            const y = L.lerp(in0 + 7, in1 - 7, (m + hh * 0.8) / 5);
            const on = L.noise1(gt * (0.6 + hh * 1.5) + hh * 40, 3) > -0.1;
            if (!on) continue;
            c.fillStyle = L.rgba(hh < 0.75 ? [150, 205, 255] : [120, 255, 190], 0.85 * xk);
            c.fillRect(x - s / 2, y - s / 2, s, s);
          }
        }
        c.restore();
      }
    }
    // ---- rooftop fans (spinning). Housings in one path, blades in another.
    if (detail > 0.02) {
      const hous = new Path2D(), rings = new Path2D(), blades = new Path2D();
      for (let i = 0; i < 4; i++) {
        const H = HALLS[i];
        const ang0 = spin(gt, T.light + i * 0.13, 0.9) * 10.0;
        let q = 0;
        for (const y of [H.y0 + 7.5, H.y1 - 7.5]) {
          for (let x = H.x0 + 8; x <= H.x1 - 6; x += FAN_STEP, q++) {
            const hh = hash(i, q, 77);
            hous.moveTo(x + FAN_R, y); hous.arc(x, y, FAN_R, 0, TAU);
            rings.moveTo(x + FAN_R, y); rings.arc(x, y, FAN_R, 0, TAU);
            const a = ang0 * (0.85 + 0.3 * hh) + hh * TAU + gt * 0.6;
            for (let b = 0; b < 3; b++) {
              const ab = a + (b * TAU) / 3;
              blades.moveTo(x, y);
              blades.lineTo(x + Math.cos(ab) * FAN_R * 0.82, y + Math.sin(ab) * FAN_R * 0.82);
            }
          }
        }
      }
      c.globalAlpha = pk * detail;
      c.fillStyle = '#15181d';
      c.fill(hous);
      c.strokeStyle = 'rgba(105,114,130,0.75)';
      c.lineWidth = px(1);
      c.stroke(rings);
      c.strokeStyle = L.rgba(L.mix([120, 128, 140], [175, 210, 245], anyLit), 0.85);
      c.lineWidth = Math.max(px(1.2), 0.9);
      c.lineCap = 'round';
      c.stroke(blades);
      c.globalAlpha = pk;
    }
    // ---- perimeter + yard lights (warm), hall corner beacons (red, slow blink)
    c.save();
    c.globalCompositeOperation = 'lighter';
    const ls = Math.max(1.6, 2.4 * mpp);
    for (let x = P.x0 + 20; x < P.x1 - 10; x += 42) {
      for (const y of [P.y0 + 10, P.y1 - 10]) { c.fillStyle = L.rgba(WARM, 0.8); c.fillRect(x - ls / 2, y - ls / 2, ls, ls); }
    }
    for (let y = P.y0 + 52; y < P.y1 - 10; y += 42) {
      for (const x of [P.x0 + 10, P.x1 - 10]) { c.fillStyle = L.rgba(WARM, 0.8); c.fillRect(x - ls / 2, y - ls / 2, ls, ls); }
    }
    const blink = Math.pow(Math.max(0, Math.sin(gt * 3.2)), 8);
    for (const H of HALLS) {
      for (const [x, y] of [[H.x0 + 2, H.y0 + 2], [H.x1 - 2, H.y0 + 2]]) {
        c.fillStyle = `rgba(255,60,50,${0.25 + 0.75 * blink})`;
        c.fillRect(x - ls / 2, y - ls / 2, ls, ls);
      }
    }
    c.restore();
  });
}

export default {
  beat: 8,
  chapter: { num: '08', title: 'Data centers', sub: 'Where it all lives' },
  captions: true,
  layer: 1,
  cues(d) {
    // offsets from the beat start (34.45): glide 0.05, "vast" 2.56, "computers" 3.65, "data centers" 4.83
    return [
      { t: 0.15, name: 'shimmer', gain: 0.16, pitch: 0.8 },
      { t: 1.85, name: 'whoosh', gain: 0.18, pitch: 0.7 },
      { t: 2.52, name: 'blip', gain: 0.14, pitch: 0.9 },
      { t: 2.65, name: 'blip', gain: 0.13, pitch: 1.0 },
      { t: 2.78, name: 'blip', gain: 0.12, pitch: 1.1 },
      { t: 2.91, name: 'blip', gain: 0.11, pitch: 1.2 },
      { t: 2.6, name: 'swell', gain: 0.14, pitch: 0.8 },
      { t: 3.66, name: 'shimmer', gain: 0.2, pitch: 1.2 },
      { t: 4.84, name: 'ping', gain: 0.24, pitch: 0.95 },
    ];
  },

  drawWorld(c, v) {
    const pk = planK(v);
    if (pk <= 0) return;
    const T = dcTimes(v.tl);
    c.save();
    drawCampus(c, v, T, pk);
    c.restore();
    if (v.gt > T.glide - 0.1 && v.gt < T.streamsOut + 0.8) {
      c.save();
      drawStreams(c, v, T);
      c.restore();
    }
  },

  drawOverlay(c, v) {
    const T = dcTimes(v.tl);
    const lk = v.k * L.prog(v.gt, T.label, 0.45);
    if (lk <= 0) return;
    c.save();
    const g = c.createRadialGradient(290, 430, 20, 290, 430, 380);
    g.addColorStop(0, 'rgba(3,6,12,0.72)');
    g.addColorStop(0.6, 'rgba(3,6,12,0.45)');
    g.addColorStop(1, 'rgba(3,6,12,0)');
    c.globalAlpha = L.clamp(lk);
    c.fillStyle = g;
    c.fillRect(0, 90, 760, 760);
    c.restore();
    L.bigLabel(c, { x: 96, y: 470, big: 'data centers', small: 'warehouses of computers', k: lk, accent: ACC });
  },
};
