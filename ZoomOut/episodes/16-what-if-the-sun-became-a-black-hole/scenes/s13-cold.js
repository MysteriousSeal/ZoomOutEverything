// Beat 13 — "Back on Earth, | the cold would set in fast."
// The camera flies 1 AU back to the dark globe. env draws the real night Earth (earth.js) and fades in its frozen
// style (snow-covered land, sea ice creeping from both poles to iceLat) and dims the city lights. This scene traces the
// advancing ice edge on the sphere with a faint glint, sparkles crystals behind it, and tightens a cold-blue atmosphere. The ice keeps
// spreading through the dive to the street in beat 14. Label "No sunlight" / "the cold sets in".
import * as L from '../../../../engine/runtime/lib.js';
import { at as camAt, EARTH, R_EARTH, RS, SUN } from '../camera.js';
import { ACCENT, freezeK, globeView, iceLat } from '../env.js';
import { project } from '../../../../engine/runtime/earth.js';
import { labelBacking } from './s11-six-km.js';

const TAU = Math.PI * 2;
const T_LABEL = 2.2;                 // beat-relative (globe readable from ~54.5 s)
const G0 = 53.4, G1 = 58.2;          // global gate (the globe is on screen)

// sparkles: frost crystals glinting along the advancing sea-ice edge (real lat/lon, projected on the real globe)
const SPARK = (() => { const r = L.rng(1313); return Array.from({ length: 170 }, () => ({ lon: r() * 360 - 180, d: r(), ph: r() * TAU, s: 0.6 + r() * 1.2, north: r() < 0.55 })); })();

// ------------------------------------------------------------------ the destination beacon (1 AU flight back)
// While Earth is still sub-pixel (or off-screen) a cool-blue beacon marks where we are heading, with a closing
// reticle (s10's language) and a course line streaming from the receding hole. Off-screen, the beacon rides the
// course line at the edge of the safe area, so it is continuous when Earth itself comes into frame.
const COOL = [150, 205, 255];
const SAFE = { x0: 90, x1: 900, y0: 360, y1: 1110 };
function clampToSafe(hx, hy, ex, ey) {
  // the point of the hole-to-Earth course line nearest Earth that lies inside the safe area (Liang-Barsky clip)
  const dx = ex - hx, dy = ey - hy;
  let t0 = 0, t1 = 1;
  const edges = [[-dx, hx - SAFE.x0], [dx, SAFE.x1 - hx], [-dy, hy - SAFE.y0], [dy, SAFE.y1 - hy]];
  for (const [p, q] of edges) {
    if (p === 0) { if (q < 0) { t1 = -1; break; } continue; }
    const r = q / p;
    if (p < 0) t0 = Math.max(t0, r); else t1 = Math.min(t1, r);
  }
  if (t1 < t0) return [L.clamp(ex, SAFE.x0, SAFE.x1), L.clamp(ey, SAFE.y0, SAFE.y1)];
  return [hx + dx * t1, hy + dy * t1];
}
/** Beacon screen position for a camera state (same maths as beacon()). */
function beaconAt(cam) {
  const wx = (x) => (x - cam.x) / cam.mpp + L.W / 2, wy = (y) => (y - cam.y) / cam.mpp + L.H / 2;
  return clampToSafe(wx(SUN.x), wy(SUN.y), wx(EARTH.x), wy(EARTH.y));
}
/** 1 while the beacon is steady on screen, 0 while it streaks (motion blur would strobe the tag and brackets). */
function steadyK(v) {
  const h = 0.04;
  const [x0, y0] = beaconAt(camAt(v.gt - h, v.tl)), [x1, y1] = beaconAt(camAt(v.gt + h, v.tl));
  const sp = Math.hypot(x1 - x0, y1 - y0) / (2 * h);
  return 1 - L.smoothstep(L.invLerp(150, 600, sp));
}
function beacon(c, v) {
  const rE = v.ws(R_EARTH);
  // out as the globe itself grows past ~40 px (only once Earth is the camera's target: early in the flight
  // Earth is far off-screen yet already "large" in pixels at the hole's fine scale)
  const kOut = v.gt > 53.85 ? 1 - L.smoothstep(L.invLerp(8, 40, rE)) : 1;
  const k = v.k * L.enter(v.gt - 52.9, 0, 0.35) * kOut;
  if (k <= 0.002) return;
  const ex = v.wx(EARTH.x), ey = v.wy(EARTH.y), hx = v.wx(SUN.x), hy = v.wy(SUN.y);
  const [bx, by] = clampToSafe(hx, hy, ex, ey);
  const rg = v.gt > 53.85 ? Math.min(rE, 40) : 0;     // the globe's own size, once it is the one on screen
  // course line from the hole's photon ring to the beacon (start clamped to a sane distance)
  const dx = bx - hx, dy = by - hy, dl = Math.hypot(dx, dy);
  if (dl > 30) {
    const ux = dx / dl, uy = dy / dl;
    const r0 = Math.min(dl - 30, 1.5 * RS / v.cam.mpp + 16);
    const len = Math.min(dl - r0, 1400);
    const sx = bx - ux * len, sy = by - uy * len;
    if (len > 20 && r0 >= 0) {
      c.save();
      c.globalCompositeOperation = 'lighter';
      const g = c.createLinearGradient(sx, sy, bx - ux * 14, by - uy * 14);
      g.addColorStop(0, L.rgba(ACCENT, 0));
      g.addColorStop(0.5, L.rgba(L.mix(ACCENT, COOL, 0.5), 0.22 * k));
      g.addColorStop(1, L.rgba(COOL, 0.55 * k));
      c.strokeStyle = g;
      c.lineWidth = 1.5;
      c.beginPath(); c.moveTo(sx, sy); c.lineTo(bx - ux * 14, by - uy * 14); c.stroke();
      // travel pulses streaming toward Earth
      c.lineWidth = 2.5;
      c.lineCap = 'round';
      for (let i = 0; i < 4; i++) {
        const f = ((v.gt * 0.9 + i / 4) % 1);
        const px = sx + (bx - sx) * f, py = sy + (by - sy) * f;
        const a = k * Math.sin(Math.PI * f) * 0.7;
        c.strokeStyle = L.rgba(L.mix(ACCENT, COOL, f), a);
        c.beginPath(); c.moveTo(px - ux * 18, py - uy * 18); c.lineTo(px, py); c.stroke();
      }
      c.restore();
    }
  }
  // the beacon: a cool point with a breathing glow
  const br = 0.85 + 0.15 * Math.sin(v.gt * 5);
  L.lightBlob(c, bx, by, 46 * br, COOL, 0.45 * k);
  c.save();
  c.fillStyle = L.rgba([235, 245, 255], 0.95 * k);
  c.beginPath(); c.arc(bx, by, Math.max(0, 3.5 + rg * 0.3), 0, TAU); c.fill();
  const ks = steadyK(v);
  // closing reticle: four square corners
  const s = L.lerp(84, 30, L.ease.outCubic(L.prog(v.gt, 53.0, 1.0))) + 2 * Math.sin(v.gt * 3) + rg * 1.1;
  c.translate(bx, by);
  c.strokeStyle = L.rgba(L.mix(COOL, [255, 255, 255], 0.3), 0.85 * k * ks);
  c.lineWidth = 2;
  c.lineCap = 'round';
  if (ks > 0.002) for (let i = 0; i < 4; i++) {
    c.rotate(Math.PI / 2);
    c.beginPath(); c.moveTo(s, s - 16); c.lineTo(s, s); c.lineTo(s - 16, s); c.stroke();
  }
  c.restore();
  // (no text tag: the beacon is only steady for ~0.3 s before the globe itself takes over, too short to read)
}

export default {
  beat: 13,
  chapter: { num: '13', title: 'The cold', sub: 'no sunlight anywhere on Earth' },
  captions: true,
  layer: 0,
  cues() {
    return [
      { t: 1.75, name: 'creak', gain: 0.18, pitch: 1.15 },
      { t: 2.25, name: 'shimmer', gain: 0.2, pitch: 1.1 },
    ];
  },
  drawWorld(c, v) {
    if (v.gt < G0 || v.gt > G1) return;
    const mpp = v.cam.mpp;
    const gk = L.clamp(L.invLerp(Math.log(40), Math.log(140), Math.log(mpp)));   // env's globe crossfade
    const cx = v.wx(EARTH.x), cy = v.wy(EARTH.y), r = v.ws(R_EARTH);
    if (r < 6 || gk <= 0.002) return;
    if (cx + r < -50 || cx - r > L.W + 50 || cy + r < -50 || cy - r > L.H + 50) return;
    const k = gk * L.smoothstep(L.invLerp(6, 40, r)) * (1 - L.smoothstep(L.invLerp(600, 1400, r))) * L.clamp(freezeK(v.gt) * 8);
    if (k <= 0.002) return;
    c.save();
    // thin cold atmosphere tightening around the planet
    c.save();
    c.globalCompositeOperation = 'lighter';
    const ag = c.createRadialGradient(cx, cy, r * 0.97, cx, cy, r * 1.09);
    ag.addColorStop(0, 'rgba(150,200,255,0)');
    ag.addColorStop(0.3, L.rgba([150, 205, 255], 0.28 * k));
    ag.addColorStop(1, 'rgba(150,200,255,0)');
    c.fillStyle = ag;
    c.beginPath(); c.arc(cx, cy, r * 1.09, 0, TAU); c.arc(cx, cy, Math.max(0, r * 0.97), 0, TAU, true); c.fill();
    c.restore();
    // the ice edge: env's frozen Earth (earth.js) carries the real sea ice down from both poles to iceLat(gt);
    // here a faint glinting line traces that edge and crystals sparkle just poleward of it
    const view = globeView(v), il = iceLat(v.gt);
    const kl = k * (1 - L.smoothstep(L.invLerp(380, 820, r)));   // the edge glint leaves before the dive smears it
    c.beginPath(); c.arc(cx, cy, Math.max(0, r), 0, TAU); c.clip();
    c.globalCompositeOperation = 'lighter';
    for (const sg of [1, -1]) {
      c.beginPath();
      let pen = false;
      for (let lon = -180; lon <= 180; lon += 2) {
        const p = project(sg * il, lon, view);
        if (p.z < 0.05) { pen = false; continue; }
        if (!pen) { c.moveTo(p.x, p.y); pen = true; } else c.lineTo(p.x, p.y);
      }
      c.strokeStyle = L.rgba([170, 210, 255], 0.22 * kl);
      c.lineWidth = Math.max(2, r * 0.02);
      c.stroke();
      c.strokeStyle = L.rgba([240, 248, 255], 0.4 * kl);
      c.lineWidth = Math.max(1, r * 0.004);
      c.stroke();
    }
    for (const s of SPARK) {
      const sg = s.north ? 1 : -1;
      const lat = sg * (il + Math.pow(s.d, 1.6) * (90 - il) * 0.7);
      const p = project(lat, s.lon, view);
      if (p.z < 0.1) continue;
      const tw = Math.max(0, Math.sin(v.gt * 3.1 + s.ph * 5));
      const a = kl * 0.75 * tw * tw * p.z;
      if (a < 0.02) continue;
      L.lightBlob(c, p.x, p.y, Math.max(2, r * 0.02) * s.s, [235, 245, 255], a);
    }
    // keep the caption band (screen y ≈ 1260-1400) dark where the globe crosses it
    // (a wide, smooth falloff: a short ramp read as a hard dark stripe across the globe during the dive)
    if (cy + r > 1120 && cy - r < 1560) {
      c.globalCompositeOperation = 'source-over';
      const bg = c.createLinearGradient(0, 1110, 0, 1570);
      bg.addColorStop(0, 'rgba(4,8,18,0)'); bg.addColorStop(0.25, `rgba(4,8,18,${0.12 * k})`);
      bg.addColorStop(0.5, `rgba(4,8,18,${0.3 * k})`); bg.addColorStop(0.75, `rgba(4,8,18,${0.12 * k})`);
      bg.addColorStop(1, 'rgba(4,8,18,0)');
      c.fillStyle = bg; c.fillRect(cx - r, 1110, 2 * r, 460);
    }
    c.restore();
    // crisp cold rim
    c.save();
    c.strokeStyle = L.rgba([190, 225, 255], 0.5 * k);
    c.lineWidth = Math.max(1.2, r * 0.006);
    c.beginPath(); c.arc(cx, cy, Math.max(0, r * 1.004), 0, TAU); c.stroke();
    c.restore();
  },
  drawOverlay(c, v) {
    beacon(c, v);
    const kl = v.k * L.enter(v.t, T_LABEL, 0.6);
    if (kl <= 0.002) return;
    labelBacking(c, 70, 330, 640, 200, 0.3 * kl);
    L.bigLabel(c, { x: 96, y: 460, big: 'No sunlight', small: 'the cold sets in', k: kl, accent: ACCENT, size: 100 });
  },
};
