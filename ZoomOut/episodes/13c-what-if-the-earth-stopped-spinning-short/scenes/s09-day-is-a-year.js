// 13c beat 6 (BEAT.day; 13b's beat 9) — "One day would last a whole year: | six months of daylight, six months of night."
// The camera pulls out to Earth's orbit. A thin orbit ring draws itself out of Earth (both ways round, meeting
// behind the Sun). Earth becomes a not-to-scale glyph seen from above the North Pole, with one city marker held
// fixed to the stars (it never turns). On "six months of daylight" Earth sweeps the top half of the orbit with the
// city in sunlight (the trail paints gold); on "six months of night" it sweeps the bottom half in darkness (the
// trail paints indigo). Ghost Earths stay behind at the quarter points: the marker always points the same way.
//
// This file also owns the EARTH GLYPH for beats 9–12 (one draw, no doubles): it is still in beat 10 (the real Earth
// spins again and slows), spins faster in beat 11 (shorter days) and fades into the true globe on beat 12's dive.
import * as L from '../../../../engine/runtime/lib.js';
import { drawEarth } from '../../../../engine/runtime/earth.js';
import { AU, BEAT, R_EARTH, SUN, wordTime } from '../env.js';

const CITY_LON = -78.5, DEG_R = Math.PI / 180;

const { W, ease, clamp, prog, rgba } = L;
const TAU = Math.PI * 2;
export const GLYPH_R = 30;                       // px: the Earth glyph (not to scale)
export const DAY_COL = [255, 200, 128];
export const NIGHT_COL = [118, 128, 236];
const OCEAN_LIT = [44, 112, 176], OCEAN_HI = [96, 168, 220], LANDC = [118, 132, 92];

// ------------------------------------------------------------------ timing (global seconds, from the timeline)
const ph = (tl, i) => tl.lines[i].phrases ?? [tl.lines[i]];
export function times(tl) {
  // 13c: s9..s11 = the day / slowing / 400-days beats (BEAT); 13b's s12 was the coral dive, where the orbit, the
  // tick ring and the glyph faded. 13c has no dive: the orbit view is held under the question card, so s12 = never.
  const s9 = tl.scenes[BEAT.day].start, s10 = tl.scenes[BEAT.slowing].start, s11 = tl.scenes[BEAT.days400].start, s12 = Infinity;
  const o0 = ph(tl, BEAT.day)[1].start - 0.1;   // 13c: (was − 0.2) with the shorter orbit below, Earth sets off on "six months of daylight"
  return {
    s9, s10, s11, s12,
    ring0: s9 + 0.8, ringDur: 1.4,                // the orbit ring draws itself during the pull-out
    year: wordTime(tl, BEAT.day, /^year/),              // "...a whole YEAR"
    o0, o1: o0 + 2.6,   // 13c: 2.6 s (13b 3.0): the day beat is shorter, and the night label needs ≥ 1 s before the slowing beat; sunset lands ~0.2 s before the second "six"
    spinUp: s10 + 0.2,                           // beat 10: the real Earth spins again
    slow: wordTime(tl, BEAT.slowing, /^Earth/),           // 13c: "Strangely, EARTH really is slowing down" (one phrase)
    rew0: ph(tl, BEAT.days400)[0].start - 0.05,            // beat 11: rewind 400 million years
    rew1: wordTime(tl, BEAT.days400, /^a$/) + 0.05,   // 13c: one phrase; the rewind ends on "(ago,) a year…"
  };
}

/** Orbit angle (rad, counter-clockwise on screen; 0 = Earth's true place, right of the Sun) at global gt. */
export function orbitAngle(T, gt) {
  const p = prog(gt, T.o0, T.o1 - T.o0);
  return p >= 1 ? 0 : TAU * (1 - Math.cos(Math.PI * p)) / 2;
}
/** World position of Earth on its orbit for angle th. */
export const orbitPos = (th) => ({ x: SUN.x + AU * Math.cos(th), y: SUN.y - AU * Math.sin(th) });

/** Spin rate (rev/s, a stylised day) from beat 10 on: spins up, slows on "slowing down", faster in the past. */
function spinRate(T, g) {
  return 0.95 * ease.inOutCubic(prog(g, T.spinUp, 1.0))
    - 0.4 * ease.inOutCubic(prog(g, T.slow + 0.1, 1.5))
    + 0.55 * ease.inOutCubic(prog(g, T.rew0 + 0.3, 1.6));
}
/** Spin angle (rad) accumulated since beat 10 started (midpoint integration: pure function of time). */
export function spinAngle(T, gt) {
  if (gt <= T.spinUp) return 0;
  const n = Math.ceil((gt - T.spinUp) / 0.02), h = (gt - T.spinUp) / n;
  let a = 0;
  for (let i = 0; i < n; i++) a += spinRate(T, T.spinUp + (i + 0.5) * h);
  return a * h * TAU;
}

// ------------------------------------------------------------------ the Earth glyph (top-down, north pole at centre)
/**
 * Draws the glyph. sunAng: screen angle from Earth towards the Sun. marker: screen angle of the city.
 * opts: alpha, spin (0..1 shows a curved spin arrow), ghost (simplified, faint).
 */
export function drawEarthGlyph(ctx, x, y, r, sunAng, marker, { alpha = 1, spin = 0, ghost = false, accent = [90, 220, 235] } = {}) {
  if (alpha <= 0.002 || r <= 0) return;
  if (ghost) {          // a ghost: just the outline, the lit limb and the city pin (always pointing the same way)
    ctx.save();
    ctx.globalAlpha *= alpha;
    ctx.strokeStyle = 'rgba(170,200,235,0.7)';
    ctx.lineWidth = 1.4;
    ctx.setLineDash([3, 4]);
    ctx.beginPath(); ctx.arc(x, y, Math.max(0, r), 0, TAU); ctx.stroke();
    ctx.setLineDash([]);
    ctx.strokeStyle = 'rgba(190,225,255,0.9)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(x, y, Math.max(0, r), sunAng - 1.4, sunAng + 1.4); ctx.stroke();
    const mx = Math.cos(marker), my = Math.sin(marker);
    ctx.strokeStyle = rgba(accent, 0.9);
    ctx.beginPath(); ctx.moveTo(x + mx * r * 0.6, y + my * r * 0.6); ctx.lineTo(x + mx * r * 1.45, y + my * r * 1.45); ctx.stroke();
    ctx.fillStyle = rgba(accent);
    ctx.beginPath(); ctx.arc(x + mx * r * 1.6, y + my * r * 1.6, 3.5, 0, TAU); ctx.fill();
    ctx.restore();
    return;
  }
  const ux = Math.cos(sunAng), uy = Math.sin(sunAng);
  ctx.save();
  ctx.globalAlpha *= alpha;
  if (!ghost) L.lightBlob(ctx, x + ux * r * 0.4, y + uy * r * 0.4, r * 3.4, [80, 150, 255], 0.22);
  // surface: ocean + continents that turn with the city marker (so a spin is visible), lit fully
  ctx.save();
  ctx.beginPath(); ctx.arc(x, y, Math.max(0, r), 0, TAU); ctx.clip();
  // the real Earth seen from above the North Pole, turned so the city (0°, 78.5°W) sits under its pin
  drawEarth(ctx, { cx: x, cy: y, r, lat0: 90, lon0: CITY_LON - 90 + marker / DEG_R, style: 'day', atmosphere: false });
  // night half: a soft terminator perpendicular to the sunlight
  const ng = ctx.createLinearGradient(x - ux * r, y - uy * r, x + ux * r, y + uy * r);
  ng.addColorStop(0, 'rgba(3,6,16,0.9)');
  ng.addColorStop(0.44, 'rgba(3,6,16,0.86)');
  ng.addColorStop(0.56, 'rgba(3,6,16,0)');
  ng.addColorStop(1, 'rgba(3,6,16,0)');
  ctx.fillStyle = ng;
  ctx.fillRect(x - r, y - r, 2 * r, 2 * r);
  ctx.restore();
  // atmosphere rim on the lit side
  ctx.lineCap = 'round';
  ctx.strokeStyle = 'rgba(150,205,255,0.7)';
  ctx.lineWidth = 1.6;
  ctx.beginPath(); ctx.arc(x, y, Math.max(0, r + 0.8), sunAng - 1.35, sunAng + 1.35); ctx.stroke();
  // the city: a pin on the rim, warm when it is in daylight
  const mx = Math.cos(marker), my = Math.sin(marker);
  const lit = clamp((mx * ux + my * uy) * 3 + 0.5);
  const px = x + mx * r * 1.5, py = y + my * r * 1.5;     // the pin head sits on its stalk
  ctx.strokeStyle = rgba(L.mix(accent, DAY_COL, lit), 0.9);
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(x + mx * r * 0.82, y + my * r * 0.82); ctx.lineTo(x + mx * r * 1.45, y + my * r * 1.45); ctx.stroke();
  ctx.fillStyle = rgba(L.mix(accent, [255, 236, 200], lit));
  ctx.beginPath(); ctx.arc(px, py, ghost ? 3.5 : 5, 0, TAU); ctx.fill();
  ctx.fillStyle = rgba(L.mix(accent, DAY_COL, lit), 0.95);
  ctx.beginPath(); ctx.arc(x + mx * r * 0.82, y + my * r * 0.82, 2.4, 0, TAU); ctx.fill();
  // spin arrow: a thin arc with a drawn arrowhead (counter-clockwise, seen from above the North Pole)
  if (spin > 0) {
    const R2 = r * 2.05, a1 = -0.5, a0 = a1 + 1.9 * ease.outCubic(spin);
    ctx.globalAlpha *= clamp(spin * 1.5);
    ctx.strokeStyle = rgba(accent, 0.8);
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(x, y, R2, a0, a1, true); ctx.stroke();
    const hx = x + R2 * Math.cos(a1), hy = y + R2 * Math.sin(a1), tx = Math.sin(a1), ty = -Math.cos(a1);
    ctx.fillStyle = rgba(accent, 0.9);
    ctx.beginPath();
    ctx.moveTo(hx + tx * 9, hy + ty * 9);
    ctx.lineTo(hx - tx * 2 + Math.cos(a1) * 6, hy - ty * 2 + Math.sin(a1) * 6);
    ctx.lineTo(hx - tx * 2 - Math.cos(a1) * 6, hy - ty * 2 - Math.sin(a1) * 6);
    ctx.closePath(); ctx.fill();
  }
  ctx.restore();
}

/** Earth glyph state at view v (beats 9–12): world position, marker angle, glyph radius and alpha. */
export function earthState(v, T = times(v.tl)) {
  const gt = v.gt, th = orbitAngle(T, gt), p = orbitPos(th);
  const rTrue = v.ws(R_EARTH);
  const r = Math.max(GLYPH_R, rTrue);
  // the glyph replaces the true globe once it is smaller than the glyph (pull-out), and hands back on the dive
  const alpha = 1 - L.smoothstep(L.invLerp(GLYPH_R * 0.9, GLYPH_R * 2.4, rTrue));
  const marker = Math.PI / 2 - spinAngle(T, gt);   // points down (fixed to the stars) until the spin returns
  const sx = v.wx(p.x), sy = v.wy(p.y);
  const sunAng = Math.atan2(v.wy(SUN.y) - sy, v.wx(SUN.x) - sx);
  return { th, p, x: sx, y: sy, r, alpha, marker, sunAng: rTrue > GLYPH_R * 2 ? Math.PI * 1.1 : sunAng };
}

// ------------------------------------------------------------------ arc text (shared with s10)
/** Text set along a circle, centred on angle `mid`. bottom=true sets it upright along the bottom of the circle. */
export function arcText(ctx, str, cx, cy, rad, mid, tracking, bottom = false) {
  ctx.letterSpacing = '0px';
  const chars = [...str], widths = chars.map((ch) => ctx.measureText(ch).width + tracking);
  const total = widths.reduce((a, b) => a + b, 0) - tracking;
  const dir = bottom ? -1 : 1;
  let a = mid - dir * total / rad / 2;
  chars.forEach((ch, i) => {
    const w = widths[i] - tracking, ang = a + dir * w / 2 / rad;
    ctx.save();
    ctx.translate(cx + rad * Math.cos(ang), cy + rad * Math.sin(ang));
    ctx.rotate(bottom ? ang - Math.PI / 2 : ang + Math.PI / 2);
    ctx.fillText(ch, -w / 2, 0);
    ctx.restore();
    a += dir * widths[i] / rad;
  });
}

// ------------------------------------------------------------------ the orbit (beat 9 look)
function glowArc(ctx, x, y, R, a0, a1, col, al) {
  if (al <= 0 || Math.abs(a1 - a0) < 1e-4) return;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.lineCap = 'round';
  for (const [w, a] of [[12, 0.06], [5, 0.16], [2, 0.85]]) {
    ctx.strokeStyle = rgba(col, a * al);
    ctx.lineWidth = w;
    ctx.beginPath(); ctx.arc(x, y, Math.max(0, R), a0, a1, a1 < a0); ctx.stroke();
  }
  ctx.restore();
}

function drawOrbit(ctx, v, T, es) {
  const gt = v.gt, R = v.ws(AU);
  if (R > 30000 || R < 50) return;
  const sx = v.wx(SUN.x), sy = v.wy(SUN.y);
  const vis = clamp(L.invLerp(20000, 8000, R)) * (1 - ease.inCubic(prog(gt, T.s12, 0.5)));
  if (vis <= 0) return;
  // base ring: draws itself out of Earth, both ways round, meeting behind the Sun
  const dk = ease.inOutCubic(prog(gt, T.ring0, T.ringDur));
  // after beat 9 the tick ring (s10) takes over the base line
  const baseA = 0.32 * vis * (1 - 0.6 * ease.inOutCubic(prog(gt, T.s10 + 0.2, 1.0)));
  if (dk > 0) {
    ctx.save();
    ctx.strokeStyle = `rgba(200,214,236,${baseA})`;
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(sx, sy, R, 0, -Math.PI * dk, true); ctx.stroke();
    ctx.beginPath(); ctx.arc(sx, sy, R, 0, Math.PI * dk, false); ctx.stroke();
    ctx.restore();
    if (dk < 1) {
      const s = Math.sin(Math.PI * dk);
      L.lightBlob(ctx, sx + R * Math.cos(Math.PI * dk), sy - R * Math.sin(Math.PI * dk), 30, [220, 235, 255], 0.6 * s * vis);
      L.lightBlob(ctx, sx + R * Math.cos(Math.PI * dk), sy + R * Math.sin(Math.PI * dk), 30, [220, 235, 255], 0.6 * s * vis);
    }
  }
  // the painted trail: gold while the city is in daylight (top half), indigo through the night (bottom half)
  const fade = vis * (1 - ease.inCubic(prog(gt, T.s10 - 0.2, 0.5)));   // 13b fix (13c: − 0.2): gone as "Strangely," starts
  const th = gt >= T.o1 ? TAU : es.th;
  if (fade > 0 && gt > T.o0) {
    glowArc(ctx, sx, sy, R, 0, -Math.min(th, Math.PI), DAY_COL, 0.9 * fade);
    if (th > Math.PI) glowArc(ctx, sx, sy, R, -Math.PI, -th, NIGHT_COL, 0.95 * fade);
  }
  // arc labels (inside the ring)
  // each label is set on a stretch Earth has already passed, so the glyph never crosses it
  const kd = ease.outCubic(prog(th, 1.65, 0.6)) * fade, kn = ease.outCubic(prog(th, 4.4, 0.5)) * fade;   // 13c: 4.4 (was 4.75): the label at 2.3 rad is already passed
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.8)'; ctx.shadowBlur = 8;
  ctx.font = L.font(26, 700, L.FONT.body);   // 13b: ≥ 26 px
  if (kd > 0) {
    ctx.fillStyle = rgba(DAY_COL, 0.95 * kd);
    // 13b fix: centred lower than the top so the label clears the ghost Earth at the top quarter point
    arcText(ctx, '6 MONTHS OF DAYLIGHT', sx, sy, R - 30 - (1 - kd) * 8, -0.74, 4);
  }
  if (kn > 0) {
    ctx.fillStyle = rgba(L.mix(NIGHT_COL, [255, 255, 255], 0.3), 0.95 * kn);
    // 13b fix: between the bottom and left ghosts, clear of both
    arcText(ctx, '6 MONTHS OF NIGHT', sx, sy, R - 16 + (1 - kn) * 8, 2.3, 4, true);
  }
  ctx.restore();
  // (no Sun→city beam: at this size it read as a stray line beside the Earth)
}

/** Ghost Earths left at the quarter points: the city marker still points the same way. */
function drawGhosts(ctx, v, T, es) {
  const R = v.ws(AU);
  if (R < 200 || R > 3000) return;
  const fadeOut = 1 - ease.inCubic(prog(v.gt, T.s10 - 0.1, 0.7));
  if (fadeOut <= 0) return;
  for (let q = 1; q <= 3; q++) {
    const pq = Math.acos(1 - q / 2) / Math.PI;               // inverse of the orbit easing
    const tq = T.o0 + pq * (T.o1 - T.o0);
    const k = ease.outCubic(prog(v.gt, tq + 0.05, 0.4)) * fadeOut;
    if (k <= 0) continue;
    const p = orbitPos((q * Math.PI) / 2), x = v.wx(p.x), y = v.wy(p.y);
    const sunAng = Math.atan2(v.wy(SUN.y) - y, v.wx(SUN.x) - x);
    drawEarthGlyph(ctx, x, y, GLYPH_R * 0.72, sunAng, Math.PI / 2, { alpha: 0.6 * k, ghost: true, accent: v.accent });
  }
}

/** Hide env's static Earth point while the glyph is away on its orbit (soft space-coloured cover). */
function coverHome(ctx, v, es) {
  const hx = v.wx(0), hy = v.wy(0), d = Math.hypot(es.x - hx, es.y - hy);
  const k = clamp((d - 20) / 30);
  if (k <= 0) return;
  const g = ctx.createRadialGradient(hx, hy, 0, hx, hy, 24);
  g.addColorStop(0, `rgba(7,11,17,${k})`); g.addColorStop(0.6, `rgba(7,11,17,${0.9 * k})`); g.addColorStop(1, 'rgba(7,11,17,0)');
  ctx.fillStyle = g;
  ctx.fillRect(hx - 24, hy - 24, 48, 48);
}

/** "Not to scale" note under the Sun (beats 9–11). */
function scaleNote(ctx, v, T) {
  const R = v.ws(AU);
  const k = ease.outCubic(prog(v.gt, T.ring0 + T.ringDur, 0.6)) * (1 - ease.inCubic(prog(v.gt, T.s12 - 0.35, 0.3))) * clamp(L.invLerp(2500, 1200, R));
  if (k <= 0) return;
  ctx.save();
  ctx.globalAlpha = 0.85 * k;
  ctx.font = L.font(26, 600, L.FONT.body);   // 13b: ≥ 26 px
  ctx.fillStyle = 'rgb(200,210,226)';
  ctx.shadowColor = 'rgba(0,0,0,0.8)'; ctx.shadowBlur = 6;
  L.trackedText(ctx, 'SUN AND EARTH NOT TO SCALE', v.wx(SUN.x), v.wy(SUN.y) + 196, 2, 'center');
  ctx.restore();
}

export default {
  beat: BEAT.day,
  chapter: { num: '06', title: 'One long day', sub: 'A planet that never turns' },
  captions: true,
  layer: 3,
  cues(d) {
    return [
      { t: 0.05, name: 'deep', gain: 0.3, pitch: 0.7 },          // the pull-out to the orbit
      { t: 0.6, name: 'shimmer', gain: 0.2, pitch: 0.8 },        // the orbit ring draws itself
      { t: 1.4, name: 'ping', gain: 0.32, pitch: 0.9 },         // "1 day = 1 year" lands on "year"
      { t: 2.0, name: 'swell', gain: 0.22, pitch: 1.0 },         // Earth sets off: six months of daylight
      { t: 3.33, name: 'tick', gain: 0.24, pitch: 0.8 },         // sunset, half-way round
      { t: 3.38, name: 'deep', gain: 0.2, pitch: 0.55 },          // six months of night
      { t: 4.63, name: 'tick', gain: 0.2, pitch: 1.1 },           // back to sunrise
    ];
  },
  drawWorld(ctx, v) {
    if (v.gt < v.tl.scenes[BEAT.day].start - 0.05) return;
    const T = times(v.tl);
    if (v.gt > T.s12 + 3) return;
    const es = earthState(v, T);
    if (v.gt < T.s10 + 1) {
      coverHome(ctx, v, es);
      drawOrbit(ctx, v, T, es);
      drawGhosts(ctx, v, T, es);
    }
    scaleNote(ctx, v, T);
    // the Earth glyph (beats 9–12)
    const spin = ease.outCubic(prog(v.gt, T.spinUp, 0.8)) * (1 - ease.inCubic(prog(v.gt, T.s12, 0.4)));
    drawEarthGlyph(ctx, es.x, es.y, es.r, es.sunAng, es.marker, { alpha: es.alpha, spin, accent: v.accent });
  },
  drawOverlay(ctx, v) {
    const T = times(v.tl);
    // "YOUR CITY" tag riding along beside the pin for the first leg of the orbit
    const ck = v.k * ease.outCubic(prog(v.gt, T.ring0 - 0.2, 0.5)) * (1 - ease.inCubic(prog(v.gt, T.o0 - 0.35, 0.35)));   // gone before the Earth sets off
    if (ck > 0) {
      const es = earthState(v, T);   // set just above the glyph, outside the label's column
      ctx.save();
      ctx.globalAlpha *= ck;
      ctx.font = L.font(26, 700, L.FONT.body);   // 13b: ≥ 26 px
      ctx.fillStyle = rgba(v.accent);
      // 13b fix: beside the pin head it names (the pin hangs below the glyph), on an opaque plate, left of the orbit ring
      ctx.letterSpacing = '3px';
      const tw = ctx.measureText('YOUR CITY').width - 3;
      ctx.letterSpacing = '0px';
      const px = es.x + Math.cos(es.marker) * es.r * 1.5, py = es.y + Math.sin(es.marker) * es.r * 1.5;
      const tx = Math.min(W - 70, px - 22), ty = py + 9;
      ctx.fillStyle = 'rgba(4,8,16,0.88)';
      L.roundRect(ctx, tx - tw - 12, ty - 27, tw + 24, 38, 8); ctx.fill();
      ctx.fillStyle = rgba(v.accent);
      L.trackedText(ctx, 'YOUR CITY', tx, ty, 3, 'right');
      ctx.restore();
    }
    const k = v.k * prog(v.gt, T.year - 0.15, 0.55);
    L.bigLabel(ctx, { x: W / 2, y: 632, big: '1 day = 1 year', small: 'one sunrise, one sunset a year', k, accent: v.accent, align: 'center', size: 80 });
  },
};
