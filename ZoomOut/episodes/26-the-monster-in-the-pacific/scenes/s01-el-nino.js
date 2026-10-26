// Beat 1 — "It's called El Niño: | when the trade winds weaken, | a giant pool of warm water spreads east across the
// ocean."  (6.23–14.61; phrases 6.38 / 8.18 / 10.15, all read from the timeline)
// Shot 'pacific': pull out to the whole Pacific (disc centre (540, 880), r 430→447, arrives ≈ 8.43).
// env spreads the warm tongue east to South America between ≈ 8.4 s and 14.0 s (fieldState). Chapter card EL NIÑO.
//
// Sequence (one focal point at a time):
//   phrase 0 (≈ 6.2–8.1)  NAME CARD: big EL NIÑO (Ñ) centred at y ≈ 360–470 over the pull-out, accent rule wipes in
//                         (enters at the beat start, cross-fading with the hook headline).
//   phrase 1 (≈ 8.1–10.6) TRADE WINDS: six streamlines ON the globe (alt 0.02) at ±2.5/7/12°, east → west, with
//                         travelling comets + drawn arrowheads; one-line label "TRADE WINDS · WEAKENING" (second half on
//                         "weaken") above the arrows (y ≈ 690); the legend wipes in at the phrase start (≈ 8.2). They slacken (slower, shorter, dimmer) from ≈ 9.2 and are gone ≈ 10.45 (label out ≈ 9.95–10.25).
//   phrase 2 (≈ 10.1–14.6) THE SPREAD (legend stays, y ≈ 344–430): a drawn eastward arrow rides the equator from 165°E to the tongue's leading edge (env front),
//                         with warm comets surging east inside the tongue and a soft glow on the front; when the front
//                         reaches Ecuador a ripple ring marks the coast (clipped inside the limb). Holds to the beat end.
import * as L from '../../../../engine/runtime/lib.js';
import { ACCENT, INKW, drawLegend, geo, globe, fieldState, frontLon, phrase } from '../env.js';

const { W } = L;
const NAME = 'EL NIÑO';
// streamlines: start latitude (east end), comet phase, relative speed
const WINDS = [[12, 0.0, 1.0], [7, 0.55, 0.92], [2.5, 0.23, 1.06], [-2.5, 0.81, 0.96], [-7, 0.4, 1.08], [-12, 0.68, 0.94]];   // lat, phase, speed
const LON_E = -96, LON_W = 168;                       // east / west ends (signed lon; the west end wraps past 180)
const SPAN = (LON_E + 360) - LON_W;                   // degrees covered east → west (≈ 96)
/** point along a streamline: u 0 (east end) … 1 (west end) */
function windPt(lat0, u) {
  const lonE = LON_E + 360;
  let lon = lonE - SPAN * u; if (lon > 180) lon -= 360;
  // trades converge gently towards the ITCZ (~5°N) as they cross the basin
  const lat = lat0 + (4.5 - lat0) * 0.22 * u;
  return [lat, lon];
}
/** wind strength 0..1 over the beat (t relative) */
function windW(t, p1, weak) {
  return L.ease.outCubic(L.prog(t, p1 - 0.15, 0.5)) * (1 - L.ease.inOutCubic(L.prog(t, weak, 1.25)));
}
/** distance travelled (in u) by the comets: ∫ speed dt, speed ∝ strength (pure function of t, fixed steps) */
function windTravel(t, p1, weak) {
  const t0 = p1 - 0.2, n = 48;
  if (t <= t0) return 0;
  const dt = (t - t0) / n;
  let s = 0;
  for (let i = 0; i < n; i++) {
    const tt = t0 + (i + 0.5) * dt;
    const w = L.ease.outCubic(L.prog(tt, p1 - 0.15, 0.5)) * (1 - 0.88 * L.ease.inOutCubic(L.prog(tt, weak, 1.4)));
    s += w * dt;
  }
  return s * 0.32;   // u per second at full strength (≈ 31°/s on the globe)
}
/** filled arrowhead at (x, y) pointing along (dx, dy) */
function head(c, x, y, dx, dy, s) {
  const n = Math.hypot(dx, dy) || 1, ux = dx / n, uy = dy / n;
  c.beginPath();
  c.moveTo(x + ux * s, y + uy * s);
  c.lineTo(x - ux * s * 0.6 - uy * s * 0.62, y - uy * s * 0.6 + ux * s * 0.62);
  c.lineTo(x - ux * s * 0.25, y - uy * s * 0.25);
  c.lineTo(x - ux * s * 0.6 + uy * s * 0.62, y - uy * s * 0.6 - ux * s * 0.62);
  c.closePath();
  c.fill();
}
/** film time when the arrow head (front − 6°) first reaches the coast (east-lon 276.5): scanned, cached per timeline */
let hitTl = null, hitT = 0;
function hitTime(tl) {
  if (hitTl === tl) return hitT;
  hitTl = tl; hitT = tl.lines[1].end;
  for (let gt = tl.scenes[1].start; gt < tl.scenes[2].start; gt += 1 / 60) {
    if (frontLon(0, fieldState(gt, tl).front) - 6 >= 276.5) { hitT = gt; break; }
  }
  return hitT;
}
const signed = (x) => (x > 180 ? x - 360 : x);

export default {
  beat: 1,
  chapter: { num: '01', title: 'El Niño', sub: 'Warm water spreading east' },
  captions: true,
  layer: 1,
  cues(d) {
    return [
      { t: 0.0, name: 'whoosh', gain: 0.3, pitch: 0.8 },
      { t: 0.2, name: 'impact', gain: 0.22, pitch: 0.75 },   // the name card
      { t: 1.85, name: 'swish', gain: 0.22, pitch: 0.7 },    // the trade winds
      { t: 3.9, name: 'swell', gain: 0.28, pitch: 0.85 },    // the spread
    ];
  },
  drawOverlay(c, v) {
    const t = v.t;
    const p0 = phrase(v, 0), p1 = phrase(v, 1), p1e = phrase(v, 1, 'end'), p2 = phrase(v, 2);
    const weak = p1e - 0.6;                                 // "…winds weaken": slacken from ≈ 9.2
    c.save();
    c.globalAlpha = v.k;
    c.textBaseline = 'alphabetic';

    // ---------------------------------------------------------------- name card
    const nIn = L.enter(t, -0.02, 0.5, L.ease.outQuint), nOut = L.ease.inCubic(L.prog(t, p1 - 0.25, 0.3));
    const nk = nIn * (1 - nOut);
    if (nk > 0.001) {
      c.save();
      c.globalAlpha = v.k * nk;
      const size = L.fitSize(c, NAME, 760, 168, 800, L.FONT.display, 60);
      c.font = L.font(size, 800, L.FONT.display);
      c.letterSpacing = '6px';
      const tw = c.measureText(NAME).width - 6;
      c.letterSpacing = '0px';
      const by = 470 - (1 - nIn) * 26 - nOut * 18;
      c.shadowColor = 'rgba(0,0,0,0.7)'; c.shadowBlur = 24;
      c.fillStyle = '#fff';
      L.trackedText(c, NAME, W / 2, by, 6, 'center');
      c.shadowBlur = 0;
      // accent rule under the name, wiping out from the centre
      const rw = (tw + 40) * L.ease.outCubic(L.prog(t, p0 + 0.1, 0.6));
      c.fillStyle = L.rgba(ACCENT);
      c.fillRect(W / 2 - rw / 2, by + 26, rw, 6);
      c.restore();
    }

    // ---------------------------------------------------------------- trade winds
    const w = windW(t, p1, weak);
    if (w > 0.002) {
      const trav = windTravel(t, p1, weak);
      const slack = L.ease.inOutCubic(L.prog(t, weak, 1.4));
      c.save();
      c.lineCap = 'round'; c.lineJoin = 'round';
      for (const [lat0, phs, spd] of WINDS) {
        // faint guide path
        c.globalAlpha = v.k * w * 0.16;
        c.strokeStyle = L.rgba(INKW);
        c.lineWidth = 1.5;
        c.beginPath();
        let pen = false;
        for (let i = 0; i <= 40; i++) {
          const [la, lo] = windPt(lat0, i / 40), p = geo(v, la, lo, 0.02);
          if (p.z < 0.08) { pen = false; continue; }
          if (pen) c.lineTo(p.x, p.y); else c.moveTo(p.x, p.y); pen = true;
        }
        c.stroke();
        // comets: 3 per line, staggered per line, travelling west; length shrinks as the winds slacken
        const len = L.lerp(0.2, 0.09, slack);
        for (let j = 0; j < 3; j++) {
          const u = (trav * spd + j / 3 + phs) % 1;
          const uh = u, ut = Math.max(0, u - len);
          const edge = L.clamp(uh / 0.06) * L.clamp((1 - uh) / 0.1);
          if (edge <= 0) continue;
          const N = 10;
          let prev = null;
          for (let s = 0; s <= N; s++) {
            const uu = L.lerp(ut, uh, s / N);
            const [la, lo] = windPt(lat0, uu), p = geo(v, la, lo, 0.02);
            if (p.z < 0.08) { prev = null; continue; }
            if (prev) {
              c.globalAlpha = v.k * w * edge * (0.15 + 0.85 * s / N) * 0.95;
              c.strokeStyle = L.rgba(INKW);
              c.lineWidth = 2 + 2.2 * (s / N);
              c.beginPath(); c.moveTo(prev.x, prev.y); c.lineTo(p.x, p.y); c.stroke();
            }
            prev = p;
          }
          // arrowhead at the head
          const [la1, lo1] = windPt(lat0, uh), [la0, lo0] = windPt(lat0, Math.max(0, uh - 0.01));
          const ph = geo(v, la1, lo1, 0.02), pt = geo(v, la0, lo0, 0.02);
          if (ph.z > 0.08) {
            c.globalAlpha = v.k * w * edge;
            c.fillStyle = L.rgba(INKW);
            head(c, ph.x, ph.y, ph.x - pt.x, ph.y - pt.y, 12);
          }
        }
      }
      c.restore();
      // label: TRADE WINDS (+ WEAKENING on "weaken"), north-east of the arrows
      const lk = L.enter(t, p1 + 0.05, 0.45) * (1 - L.ease.inCubic(L.prog(t, weak + 0.75, 0.3)));
      if (lk > 0.001) {
        const a = geo(v, 17, -128, 0.02);
        const x = Math.min(900, a.x), y = a.y;
        c.save();
        c.globalAlpha = v.k * lk;
        c.shadowColor = 'rgba(0,0,0,0.75)'; c.shadowBlur = 12;
        // one baseline: "TRADE WINDS · WEAKENING" (the second half wipes in on "weaken"), right edge at x, above the arrows
        c.font = L.font(36, 800, L.FONT.display);
        c.letterSpacing = '3px';
        const wA = c.measureText('TRADE WINDS').width, WK = ' · WEAKENING', wB = c.measureText(WK).width;
        c.letterSpacing = '0px';
        const x0 = x - wA - wB, by = y - 12 + (1 - lk) * 10;
        c.fillStyle = L.rgba(INKW);
        L.trackedText(c, 'TRADE WINDS', x0, by, 3, 'left');
        const wk = L.enter(t, weak - 0.05, 0.4);
        if (wk > 0.001) {
          c.globalAlpha = v.k * lk * wk;
          c.fillStyle = L.rgba(ACCENT);
          L.trackedText(c, WK, x0 + wA + (1 - wk) * 12, by, 3, 'left');
        }
        c.restore();
      }
    }

    // ---------------------------------------------------------------- legend
    drawLegend(c, { x: 330, y: 344, w: 420, k: v.k * L.prog(t, p1 + 0.05, 0.9) });

    // ---------------------------------------------------------------- the spread
    const st = fieldState(v.gt, v.tl);
    const ak = L.enter(t, p2 - 0.3, 0.5);
    if (ak > 0.001 && st.front > 0.02) {
      const frontX = frontLon(0, st.front);              // east-lon where env's front mask is 0.5 (on the equator)
      const headX = Math.min(frontX - 6, 276.5);          // stop at the coast of Ecuador
      const tailX = 166;
      c.save();
      // warm comets surging east inside the tongue
      c.globalCompositeOperation = 'lighter';
      for (let j = 0; j < 7; j++) {
        const lat = [-1, 1.5, -3, 0.4, 2.6, -2, -0.2][j];
        const sp = 0.55 + 0.1 * (j % 3);
        const u = ((t * sp + j * 0.37) % 1);
        const x = L.lerp(tailX, headX, u);
        const life = Math.sin(Math.PI * u);
        const pts = [];
        for (let s = 0; s <= 8; s++) { const p = geo(v, lat, signed(x - 9 * (1 - s / 8)), 0.004); if (p.z > 0.08) pts.push(p); }
        if (pts.length < 2) continue;
        const g = c.createLinearGradient(pts[0].x, pts[0].y, pts[pts.length - 1].x, pts[pts.length - 1].y);
        g.addColorStop(0, 'rgba(255,220,170,0)');
        g.addColorStop(1, `rgba(255,226,180,${0.5 * life * ak})`);
        c.strokeStyle = g; c.lineWidth = 2.6; c.lineCap = 'round';
        c.beginPath(); pts.forEach((p, i) => (i ? c.lineTo(p.x, p.y) : c.moveTo(p.x, p.y))); c.stroke();
      }
      // the leading edge: a soft warm glow riding the front (while it moves)
      const moving = 1 - L.smoothstep(L.prog(st.front, 0.93, 0.07));
      const pf = geo(v, -1, signed(headX + 2), 0.004);
      if (pf.z > 0.08) L.lightBlob(c, pf.x, pf.y, Math.max(0, 54), [255, 150, 70], 0.4 * ak * moving);
      c.globalCompositeOperation = 'source-over';
      // the eastward arrow along the equator (drawn shapes, above the field)
      const pts = [];
      for (let x = tailX; x <= headX; x += 2) { const p = geo(v, 0.5, signed(x), 0.025); if (p.z > 0.08) pts.push(p); }
      { const p = geo(v, 0.5, signed(headX), 0.025); if (p.z > 0.08) pts.push(p); }
      if (pts.length >= 2) {
        const a0 = pts[0], a1 = pts[pts.length - 1], a2 = pts[pts.length - 2];
        c.shadowColor = 'rgba(0,0,0,0.55)'; c.shadowBlur = 10;
        const g = c.createLinearGradient(a0.x, a0.y, a1.x, a1.y);
        g.addColorStop(0, `rgba(255,255,255,0)`);
        g.addColorStop(0.35, `rgba(255,255,255,${0.75 * ak})`);
        g.addColorStop(1, `rgba(255,255,255,${0.95 * ak})`);
        c.strokeStyle = g; c.lineWidth = 5; c.lineCap = 'round';
        c.beginPath(); pts.slice(0, -1).forEach((p, i) => (i ? c.lineTo(p.x, p.y) : c.moveTo(p.x, p.y))); c.stroke();
        c.fillStyle = `rgba(255,255,255,${0.95 * ak})`;
        head(c, a1.x, a1.y, a1.x - a2.x, a1.y - a2.y, 22);
        c.shadowBlur = 0;
      }
      // ripple when the warm water reaches the coast
      const tHit = hitTime(v.tl) - v.tl.scenes[1].start;   // when the arrow head reaches Ecuador
      const rp = L.prog(t, tHit, 1.3);
      if (rp > 0 && rp < 1) {
        const pc = geo(v, -2, -81, 0.01), gg = globe(v);
        if (pc.z > 0.08) {
          c.save(); c.beginPath(); c.arc(gg.cx, gg.cy, Math.max(0, gg.r - 2), 0, Math.PI * 2); c.clip();   // inside the limb
          for (const dd of [0, 0.25]) {
            const q = L.clamp(rp - dd) / (1 - dd);
            if (q <= 0 || q >= 1) continue;
            c.strokeStyle = `rgba(255,214,160,${0.85 * (1 - q) * ak})`;
            c.lineWidth = 3 * (1 - q) + 1;
            c.beginPath(); c.arc(pc.x, pc.y, Math.max(0, 8 + 46 * L.ease.outCubic(q)), 0, Math.PI * 2); c.stroke();
          }
          c.restore();
        }
      }
      c.restore();
    }
    c.restore();
  },
};
