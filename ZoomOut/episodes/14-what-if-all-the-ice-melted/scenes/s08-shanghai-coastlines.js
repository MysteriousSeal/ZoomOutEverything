// Beat 8 — "Shanghai, too. | Every coastline on Earth would have to be redrawn."
// Phrase 1: the camera settles on the drowned Yangtze delta; a Shanghai pin lands (one pulse) with a hairline leader
// to the label "Shanghai / about 25 million people".
// Phrase 2: as the camera pulls back to the whole globe and env lights every coastline, a "redraw" wavefront
// expands from Shanghai across the planet: a geodesic circle (true small circle on the sphere) with a soft trailing
// band, so the glow reads as spreading outward from the place we were just looking at.
// Also exports small on-globe helpers (geo stroke with far-side culling, the house pin) used by beats 9-12.
import * as L from '../../../../engine/runtime/lib.js';
import { ACCENT, PLACES, project, viewOf, worldOf, globeDisc } from '../env.js';

const { W } = L;
const DEG = Math.PI / 180;
const ph = (tl, i, j, edge = 'start') => tl.lines[i].phrases[j][edge];

// ------------------------------------------------------------------ shared helpers (also used by s09-s12)
/**
 * Stroke/trace a lat/lon polyline on the visible hemisphere only: segments whose points face away (z < zMin)
 * are skipped (no clamping to the limb). Calls c.moveTo/lineTo; the caller strokes. Returns the number of points kept.
 */
export function traceGeo(c, v, pts, close = false, zMin = 0.02) {
  const vw = viewOf(v);
  let pen = false, kept = 0;
  const n = pts.length, last = close ? n : n - 1;
  const put = (lat, lon) => {
    const p = worldOf(vw, lat, lon);
    if (p.z < zMin) { pen = false; return; }
    const x = v.wx(p.x), y = v.wy(p.y);
    if (pen) c.lineTo(x, y); else { c.moveTo(x, y); pen = true; }
    kept++;
  };
  for (let i = 0; i < last; i++) {
    const [a0, b0] = pts[i], [a1, b1] = pts[(i + 1) % n];
    let db = b1 - b0; if (db > 180) db -= 360; if (db < -180) db += 360;
    const k = Math.max(1, Math.ceil(Math.max(Math.abs(a1 - a0), Math.abs(db)) / 1.0));
    for (let s = 0; s < k; s++) put(a0 + (a1 - a0) * (s / k), b0 + db * (s / k));
  }
  if (!close) put(pts[n - 1][0], pts[n - 1][1]);
  else put(pts[0][0], pts[0][1]);
  return kept;
}

/** Points of the small circle at angular radius rad (degrees) around (lat0, lon0). */
export function smallCircle(lat0, lon0, rad, n = 120) {
  const p0 = lat0 * DEG, l0 = lon0 * DEG, d = rad * DEG;
  const out = [];
  for (let i = 0; i <= n; i++) {
    const b = (i / n) * Math.PI * 2;
    const lat = Math.asin(Math.sin(p0) * Math.cos(d) + Math.cos(p0) * Math.sin(d) * Math.cos(b));
    const lon = l0 + Math.atan2(Math.sin(b) * Math.sin(d) * Math.cos(p0), Math.cos(d) - Math.sin(p0) * Math.sin(lat));
    out.push([lat / DEG, ((lon / DEG + 540) % 360) - 180]);
  }
  return out;
}

/** The house city pin: a soft dark halo, a thin ring and a dot; `pulse` 0..1 sends one expanding ring. */
export function drawPin(c, x, y, k, pulse = -1, col = ACCENT) {
  if (k <= 0) return;
  const e = L.ease.outBack(L.clamp(k), 2.2);
  c.save();
  c.globalAlpha *= L.clamp(k * 2);
  const g = c.createRadialGradient(x, y, 0, x, y, 30);
  g.addColorStop(0, 'rgba(2,8,16,0.55)');
  g.addColorStop(1, 'rgba(2,8,16,0)');
  c.fillStyle = g;
  c.fillRect(x - 30, y - 30, 60, 60);
  c.strokeStyle = L.rgba(col, 0.95);
  c.lineWidth = 2.5;
  c.beginPath(); c.arc(x, y, Math.max(0, 13 * e), 0, Math.PI * 2); c.stroke();
  c.fillStyle = 'rgba(245,252,250,0.98)';
  c.beginPath(); c.arc(x, y, Math.max(0, 4.5 * e), 0, Math.PI * 2); c.fill();
  if (pulse > 0 && pulse < 1) {
    c.strokeStyle = L.rgba(col, 0.6 * (1 - pulse));
    c.lineWidth = 2;
    c.beginPath(); c.arc(x, y, Math.max(0, 13 + 46 * L.ease.outCubic(pulse)), 0, Math.PI * 2); c.stroke();
  }
  c.restore();
}

/** A hairline elbow leader from (x1, y1) (anchor end) to (x2, y2), drawn in by k. */
export function elbow(c, x1, y1, x2, y2, k, col = [220, 235, 240], alpha = 0.7) {
  if (k <= 0) return;
  const e = L.ease.outCubic(L.clamp(k));
  const mx = x1, my = y2;          // vertical first, then across
  const l1 = Math.abs(my - y1), l2 = Math.abs(x2 - mx), tot = l1 + l2 || 1;
  const s = e * tot;
  c.save();
  c.strokeStyle = L.rgba(col, alpha);
  c.lineWidth = 1.6;
  c.beginPath();
  c.moveTo(x1, y1);
  if (s <= l1) c.lineTo(x1, y1 + Math.sign(my - y1) * s);
  else { c.lineTo(mx, my); c.lineTo(mx + Math.sign(x2 - mx) * (s - l1), my); }
  c.stroke();
  c.restore();
}

// ------------------------------------------------------------------ timing
const T = (tl) => {
  const s = tl.scenes[8].start;
  const p2 = ph(tl, 8, 1);
  return {
    pin: ph(tl, 8, 0) + 0.12,          // Shanghai is on screen as the camera descends onto the delta
    lblIn: ph(tl, 8, 0) + 0.18,         // lands by ~34.0, on 'Shanghai, too.'
    lblOut: p2 + 0.3,                  // ≥ 1.7 s on screen, gone as the wavefront spreads
    wave0: p2 - 0.05, waveDur: 2.7,
    end: tl.scenes[8].end, s,
  };
};

const SH = PLACES.shanghai;

export default {
  beat: 8,
  chapter: { num: '08', title: 'Shanghai', sub: 'and every coastline' },
  captions: true,
  layer: 3,
  cues(d) {
    // beat starts 33.32: pin lands ~33.6 (t 0.3); phrase 2 "Every coastline" at 35.05 (t 1.73)
    return [
      { t: 0.32, name: 'ping', gain: 0.24, pitch: 1.1 },
      { t: 0.5, name: 'tick', gain: 0.14, pitch: 1.3 },
      { t: 1.68, name: 'riser', gain: 0.16, pitch: 0.9 },
      { t: 1.75, name: 'shimmer', gain: 0.3, pitch: 0.9 },
      { t: 2.6, name: 'bloom', gain: 0.2, pitch: 0.8 },
    ];
  },
  drawWorld(ctx, v) {
    const tm = T(v.tl);
    if (v.gt < tm.pin - 0.2 || v.gt > tm.end + 0.6) return;
    // ---- the redraw wavefront (phrase 2)
    const wp = L.prog(v.gt, tm.wave0, tm.waveDur);
    if (wp > 0 && wp < 1) {
      // the front tracks the pull-back: always a fraction of the angular half-width currently on screen, so it is
      // seen expanding across the frame instead of racing off it
      const half = Math.asin(L.clamp((W / 2) * v.cam.mpp / 6.371e6)) / DEG;
      const rad = Math.min(86, Math.max(0.8, half * (0.18 + 0.95 * L.ease.inOutCubic(wp))));
      const fade = L.clamp(wp * 6) * (1 - L.ease.inCubic(wp));
      ctx.save();
      ctx.lineJoin = 'round';
      ctx.globalCompositeOperation = 'lighter';
      // trailing soft band (a few rings behind the front)
      for (let i = 3; i >= 1; i--) {
        ctx.strokeStyle = L.rgba(ACCENT, 0.07 * fade * (4 - i) / 3);
        ctx.lineWidth = 10 + i * 8;
        ctx.beginPath();
        traceGeo(ctx, v, smallCircle(SH.lat, SH.lon, Math.max(0.5, rad - i * 3.2)), false);
        ctx.stroke();
      }
      ctx.shadowColor = L.rgba(ACCENT, 0.9);
      ctx.shadowBlur = 14;
      ctx.strokeStyle = L.rgba(L.mix(ACCENT, [255, 255, 255], 0.45), 0.85 * fade);
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      traceGeo(ctx, v, smallCircle(SH.lat, SH.lon, rad), false);
      ctx.stroke();
      ctx.restore();
    }
    // ---- the Shanghai pin (rides the globe; fades as the planet shrinks under it)
    const p = project(v, SH.lat, SH.lon);
    if (p.z <= 0.05) return;
    const kin = L.prog(v.gt, tm.pin, 0.5);
    const kout = 1 - L.ease.inCubic(L.prog(v.gt, tm.wave0 + 1.3, 0.9));
    const k = Math.min(kin, kout) * L.clamp((p.z - 0.05) * 5);
    drawPin(ctx, p.x, p.y, k, L.prog(v.gt, tm.pin + 0.2, 1.1));
  },
  drawOverlay(ctx, v) {
    const tm = T(v.tl);
    const kin = L.prog(v.gt, tm.lblIn, 0.45);
    const kout = L.ease.inCubic(L.prog(v.gt, tm.lblOut, 0.4));
    const k = Math.min(kin * (1 - kout), v.k);
    if (k <= 0) return;
    const p = project(v, SH.lat, SH.lon);
    const LX = 96, LY = 560;
    // hairline leader: pin -> up -> under the label
    if (p.z > 0.05) elbow(ctx, p.x, p.y - 18, LX + 330, LY + 80, L.prog(v.gt, tm.lblIn + 0.1, 0.6) * (1 - kout), [215, 235, 235], 0.6);
    L.bigLabel(ctx, { x: LX, y: LY, big: 'Shanghai', small: 'about 25 million people', k, accent: ACCENT });
  },
};
