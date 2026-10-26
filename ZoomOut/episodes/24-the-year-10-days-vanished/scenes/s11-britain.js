// Beat 11 — "Britain held out until 1752, | and had to skip eleven days."
// UPPER: an engraved map medallion at P_UK — a real-coastline map of Britain (earth.js 'flat', parchment land on an
// aged-sepia sea, ink coastline) rendered into its own small raster and CLIPPED to a circular plate with a graduated
// parchment rim, a graticule and a north mark. Phrase 0: a London pin, "Britain · 1752" and, across the Channel,
// "France · 1582" (Catholic Europe had switched 170 years earlier).
// LOWER: the September 1752 page (left) — printed Julian at first (Sep 1 = Tuesday, 30 days); on phrase 1 (62.55)
// days 3–13 lift out as one strip that settles askew in the empty bottom rows, and 14–30 slide back so 14 lands on
// THURSDAY right after Wednesday 2 (red seam). RIGHT: −11 / DAYS lands with the tear.
// Layout (camera 'uk', mpp 1.30 → 1.26): medallion y ≈ 360–830, page x ≈ 96–576 / y ≈ 870–1335, label x ≈ 616–930.
import * as L from '../../../../engine/runtime/lib.js';
import { drawEarth, project, geoPath } from '../../../../engine/runtime/earth.js';
import {
  P_UK, P_SEP, ACCENT, PARCH, PARCH_DK, INKC, RUBRIC, drawMonthPage, pageLayout, dayNumeral, monthDays, SEP_1752, deskK, serif,
} from '../env.js';

const TAU = Math.PI * 2;
// ---- the map medallion (world u)
const MED = { x: P_UK.x, y: P_UK.y - 33, r: 300 };          // map disc radius (u)
const RIM = 40;                                               // parchment rim width (u)
const VIEW = { lat0: 54.0, lon0: -1.6, deg: 8.0 };            // the disc spans ±deg of arc around (lat0, lon0)
const SEA = [178, 158, 116], LAND = [238, 226, 196], COAST = [70, 48, 28];
// ---- the September 1752 page (world u)
const PG = { x: P_SEP.x - 262, y: P_SEP.y - 212, w: 616, h: 592 };
const SLIDE = 262;                                            // the page starts centred and slides left to make room for −11
const JUL = new Map(monthDays(30, 2).map((d) => [d.d, d]));   // Julian September: Sep 1 = Tuesday, 30 days
const GRE = new Map(SEP_1752.map((d) => [d.d, d]));          // 1, 2, then 14–30 (14 = Thursday)
const GONE = (d) => d >= 3 && d <= 13;
// beat-relative times (beat 11 starts 59.29; phrase 1 "and had to skip eleven days" 62.55 = +3.26)
const T = { slide: 2.2, pin: 0.9, brit: 1.15, fr: 1.7, pre: 2.5, tear0: 3.15, tear1: 4.45, reflow0: 3.5, reflow1: 4.2, label: 3.35 };
const GOLD_INK = [160, 112, 34];

/** strip slot of a deleted day: 11 small cells resting askew across the empty rows 3–4 */
function stripPos(LAY, d) {
  const i = d - 3, cw = (7 * LAY.cw) / 11.8;
  const mx = LAY.gx0 + 3.5 * LAY.cw, my = LAY.gy0 + LAY.ch * 3.95, rot = -0.05;
  const lx = (i - 5) * cw;
  return { x: mx + lx * Math.cos(rot), y: my + lx * Math.sin(rot), rot, cw };
}
function pageState(v) {
  const b11 = v.tl.scenes[11].start, t = v.gt - b11;
  if (v.gt < b11 - 3) return { slide: 1, pre: 1, tear: 1, reflow: 1 };     // far from this beat: end state (never on screen)
  return {
    slide: L.ease.inOutCubic(L.prog(t, T.slide, 0.8)),
    pre: L.ease.inOutCubic(L.prog(t, T.pre, 0.6)),
    tear: L.ease.inOutCubic(L.prog(t, T.tear0, T.tear1 - T.tear0)),
    reflow: L.ease.inOutCubic(L.prog(t, T.reflow0, T.reflow1 - T.reflow0)),
  };
}

let OFF = null;
function offscreen(n) {
  if (!OFF || OFF.width < n || OFF.height < n || OFF.width > n * 1.5) OFF = new OffscreenCanvas(n, n);
  return OFF;
}

function medallion(c, v, dk) {
  const s = 1 / v.cam.mpp;
  const cx = v.wx(MED.x), cy = v.wy(MED.y), rm = MED.r * s, rr = (MED.r + RIM) * s;
  if (cx + rr < 0 || cx - rr > L.W || cy + rr < 0 || cy - rr > L.H) return;
  const t = v.t;
  c.save();
  c.globalAlpha *= dk;
  // parchment rim plate with a soft drop shadow
  c.shadowColor = 'rgba(0,0,0,0.55)';
  c.shadowBlur = 30 * s;
  c.shadowOffsetY = 10 * s;
  const g = c.createRadialGradient(cx - rr * 0.3, cy - rr * 0.3, rr * 0.2, cx, cy, rr);
  g.addColorStop(0, L.rgba(L.mix(PARCH, [250, 242, 222], 0.4)));
  g.addColorStop(0.8, L.rgba(PARCH));
  g.addColorStop(1, L.rgba(PARCH_DK));
  c.fillStyle = g;
  c.beginPath(); c.arc(cx, cy, Math.max(0, rr), 0, TAU); c.fill();
  c.shadowColor = 'transparent';
  // the map: rendered into a small raster the size of the disc, then clipped to it
  const R = rm / Math.sin(VIEW.deg * Math.PI / 180);
  const n = Math.ceil(2 * rm + 4);
  if (n > 8) {
    const off = offscreen(n), oc = off.getContext('2d');
    oc.setTransform(1, 0, 0, 1, 0, 0);
    oc.clearRect(0, 0, off.width, off.height);
    const ox = cx - n / 2, oy = cy - n / 2;
    drawEarth(oc, {
      cx: cx - ox, cy: cy - oy, r: R, lat0: VIEW.lat0, lon0: VIEW.lon0, style: 'flat', land: LAND, ocean: SEA, coast: COAST,
      relief: 0.55, atmosphere: false, maxPixels: 6e5,
    });
    c.save();
    c.beginPath(); c.arc(cx, cy, Math.max(0, rm), 0, TAU); c.clip();
    c.drawImage(off, 0, 0, n, n, ox, oy, n, n);
    // engraved sea hatching (very faint horizontal hairlines) + graticule
    const view = { cx, cy, r: R, lat0: VIEW.lat0, lon0: VIEW.lon0 };
    c.strokeStyle = L.rgba(INKC, 0.22);
    c.lineWidth = Math.max(0.5, 1 * s);
    c.setLineDash([4 * s, 4 * s]);
    for (let lat = 46; lat <= 62; lat += 2) { c.beginPath(); geoPath(c, view, [[lat, -14], [lat, -6], [lat, 2], [lat, 10]], false); c.stroke(); }
    for (let lon = -12; lon <= 10; lon += 4) { c.beginPath(); geoPath(c, view, [[44, lon], [53, lon], [64, lon]], false); c.stroke(); }
    c.setLineDash([]);
    // vignette inside the disc (aged plate)
    const vg = c.createRadialGradient(cx, cy, rm * 0.55, cx, cy, rm);
    vg.addColorStop(0, 'rgba(60,40,20,0)');
    vg.addColorStop(1, 'rgba(60,40,20,0.28)');
    c.fillStyle = vg;
    c.fillRect(cx - rm, cy - rm, 2 * rm, 2 * rm);
    // ---- labels on the map (period lettering)
    const lon = project(51.507, -0.128, view);
    const pk = L.ease.outBack(L.prog(t, T.pin, 0.45));
    if (pk > 0) {
      const pr = 9 * s * pk;
      c.fillStyle = L.rgba(RUBRIC);
      c.strokeStyle = L.rgba([250, 240, 220]);
      c.lineWidth = Math.max(1, 2.4 * s);
      c.beginPath(); c.arc(lon.x, lon.y, Math.max(0, pr), 0, TAU); c.fill(); c.stroke();
      const pulse = L.prog((t - T.pin) % 1.6, 0, 1.2);
      c.strokeStyle = L.rgba(RUBRIC, 0.6 * (1 - pulse) * L.clamp(pk));
      c.beginPath(); c.arc(lon.x, lon.y, Math.max(0, pr + 24 * s * pulse), 0, TAU); c.stroke();
      c.globalAlpha *= L.clamp(pk);
      c.fillStyle = L.rgba(INKC);
      c.font = serif(Math.max(1, 22 * s), 600, 'italic');
      c.textAlign = 'right';
      c.textBaseline = 'middle';
      c.fillText('London', lon.x - 16 * s, lon.y + 2 * s);
      c.globalAlpha /= Math.max(1e-6, L.clamp(pk));
    }
    const lab = (text, lat, lng, at, col, size, align = 'left') => {
      const k = L.enter(t, at, 0.5);
      if (k <= 0) return;
      const p = project(lat, lng, view);
      c.save();
      c.globalAlpha *= k;
      c.fillStyle = L.rgba(col);
      c.font = serif(Math.max(1, size * s), 700, 'italic');
      c.textAlign = align;
      c.textBaseline = 'alphabetic';
      c.shadowColor = 'rgba(250,240,215,0.9)';
      c.shadowBlur = 6 * s;
      c.fillText(text, p.x, p.y + (1 - k) * 8 * s);
      c.restore();
    };
    lab('Britain', 56.9, 0.6, T.brit, RUBRIC, 32);
    lab('1752', 55.6, 0.9, T.brit + 0.12, RUBRIC, 38);
    lab('France · 1582', 48.9, 2.2, T.fr, INKC, 27, 'center');
    c.restore();
  }
  // engraved rings + graduated rim
  c.strokeStyle = L.rgba(INKC, 0.85);
  c.lineWidth = Math.max(1, 2.4 * s);
  c.beginPath(); c.arc(cx, cy, Math.max(0, rm), 0, TAU); c.stroke();
  c.lineWidth = Math.max(0.5, 1.1 * s);
  c.beginPath(); c.arc(cx, cy, Math.max(0, rr - 8 * s), 0, TAU); c.stroke();
  c.beginPath(); c.arc(cx, cy, Math.max(0, rr - 12 * s), 0, TAU); c.stroke();
  c.beginPath();
  for (let i = 0; i < 120; i++) {
    const a = (i / 120) * TAU, l = i % 10 === 0 ? 16 : i % 5 === 0 ? 11 : 6;
    c.moveTo(cx + Math.cos(a) * (rm + 3 * s), cy + Math.sin(a) * (rm + 3 * s));
    c.lineTo(cx + Math.cos(a) * (rm + (3 + l) * s), cy + Math.sin(a) * (rm + (3 + l) * s));
  }
  c.stroke();
  // north mark: a small engraved fleur (diamond) at the top of the rim
  c.fillStyle = L.rgba(RUBRIC, 0.9);
  const ny = cy - rm - 22 * s;
  c.beginPath();
  c.moveTo(cx, ny - 13 * s); c.lineTo(cx + 7 * s, ny); c.lineTo(cx, ny + 9 * s); c.lineTo(cx - 7 * s, ny); c.closePath(); c.fill();
  c.restore();
}

function septPage(c, v, dk) {
  const s = 1 / v.cam.mpp;
  const sx = (x) => v.wx(x), sy = (y) => v.wy(y);
  const LAY0 = pageLayout(PG, PG.w, PG.h, 5);
  if (sx(LAY0.x0 + SLIDE) > L.W + 50 || sx(LAY0.x1) < -50 || sy(LAY0.y0) > L.H + 50 || sy(LAY0.y1) < -50) return;
  const st = pageState(v);
  const P = { x: PG.x + SLIDE * (1 - st.slide), y: PG.y };
  const LAY = pageLayout(P, PG.w, PG.h, 5);
  drawMonthPage(c, v, { P, w: PG.w, h: PG.h, rows: 5, title: 'SEPTEMBER', sub: 'Anno Domini MDCCLII · 1752', days: [], alpha: dk, seed: 31 });
  c.save();
  c.globalAlpha *= dk;
  const cellPx = LAY.ch * s;
  // the days that stay: Julian slot → Gregorian slot
  for (const [d, j] of JUL) {
    if (GONE(d)) continue;
    const g = GRE.get(d);
    const a = LAY.cell(j.r, j.col), b = LAY.cell(g.r, g.col);
    const x = L.lerp(a.x, b.x, st.reflow), y = L.lerp(a.y, b.y, st.reflow);
    const col = L.lerp(j.col, g.col, st.reflow) < 0.5 ? RUBRIC : (st.reflow > 0.6 && (d === 2 || d === 14)) ? RUBRIC : INKC;
    dayNumeral(c, sx(x), sy(y), cellPx, d, { color: col });
  }
  // the ragged red seam between Wednesday 2 and Thursday 14
  if (st.reflow > 0.55) {
    const k = L.prog(st.reflow, 0.55, 0.45);
    const xs = LAY.gx0 + 4 * LAY.cw, y0 = LAY.gy0, y1 = LAY.gy0 + LAY.ch;
    c.strokeStyle = L.rgba(RUBRIC, 0.9 * k);
    c.lineWidth = Math.max(1, 3 * s);
    c.beginPath();
    for (let i = 0; i <= 12; i++) {
      const f = i / 12, y = L.lerp(y0, y0 + (y1 - y0) * k, f);
      const x = xs + (i % 2 ? 5 : -5);
      if (i) c.lineTo(sx(x), sy(y)); else c.moveTo(sx(x), sy(y));
    }
    c.stroke();
  }
  // the eleven deleted days: tinted (pre), lifted with a shadow, then flown into the strip
  const cells = [];
  for (let d = 3; d <= 13; d++) {
    const j = JUL.get(d), a = LAY.cell(j.r, j.col), b = stripPos(LAY, d);
    const i = d - 3, dl = i * 0.025;
    const k = L.ease.inOutCubic(L.clamp((st.tear - dl) / (1 - 0.25)));
    const lift = Math.sin(Math.PI * Math.min(1, k * 1.15)) * 70 + st.pre * 6;   // up and hover while 14–30 slide back, then settle
    cells.push({ d, x: L.lerp(a.x, b.x, k), y: L.lerp(a.y, b.y, k) - lift, w: L.lerp(LAY.cw, b.cw, k), h: L.lerp(LAY.ch, LAY.ch * 0.62, k), rot: b.rot * k + Math.sin(Math.PI * k) * 0.08 * (i % 2 ? 1 : -1), lift, k });
  }
  for (const q of cells) {
    const cx = sx(q.x), cy = sy(q.y), w = q.w * s, h = q.h * s;
    c.save();
    c.translate(cx, cy);
    c.rotate(q.rot);
    if (st.pre > 0) {
      c.shadowColor = `rgba(40,20,5,${0.35 * Math.min(1, st.pre + q.k)})`;
      c.shadowBlur = (6 + q.lift * 0.4) * s;
      c.shadowOffsetY = (2 + q.lift * 0.25) * s;
      c.fillStyle = L.rgba(L.mix(PARCH, [246, 234, 208], 0.5));
      c.fillRect(-w / 2, -h / 2, w, h);
      c.shadowColor = 'transparent';
      c.fillStyle = L.rgba(RUBRIC, 0.1 * st.pre);
      c.fillRect(-w / 2, -h / 2, w, h);
      c.strokeStyle = L.rgba(INKC, 0.45);
      c.lineWidth = Math.max(0.5, 1 * s);
      c.strokeRect(-w / 2, -h / 2, w, h);
    }
    dayNumeral(c, 0, 0, h, q.d, { color: L.mix(INKC, RUBRIC, st.pre * 0.8), scale: q.k > 0.5 ? 1.05 : 1 });
    c.restore();
  }
  c.restore();
}

export default {
  beat: 11,
  chapter: { num: '10', title: 'Britain, 1752', sub: 'and its American colonies' },
  layer: 1,
  cues(d) {
    return [
      { t: T.pin, name: 'blip', gain: 0.2, pitch: 1.1 },
      { t: T.brit, name: 'tick', gain: 0.18, pitch: 1.0 },
      { t: T.pre, name: 'creak', gain: 0.18, pitch: 1.1 },
      { t: T.tear0 + 0.05, name: 'swish', gain: 0.28, pitch: 0.75 },
      { t: T.label, name: 'impact', gain: 0.28, pitch: 0.95 },
      { t: T.reflow0 + 0.3, name: 'tick', gain: 0.2, pitch: 1.2 },
    ];
  },
  drawWorld(c, v) {
    // arriving: hidden until the beat-11 travel is half way, then in over 0.6 s (the outgoing February pages are gone by then)
    const dk = deskK(v) * L.ease.outCubic(L.prog(v.gt, v.tl.scenes[11].start + 0.45, 0.6));
    if (dk <= 0) return;
    medallion(c, v, dk);
    septPage(c, v, dk);
  },
  drawOverlay(c, v) {
    const k = v.k * L.enter(v.t, T.label, 0.5);
    if (k <= 0) return;
    const s = 1 / v.cam.mpp;
    const x = v.wx(PG.x + PG.w / 2) + 40, xr = Math.min(930, L.W - 150);   // right column, x ≤ 930
    const maxW = xr - x;
    const cy = v.wy(PG.y) + 10 * s;
    const e = L.ease.outCubic(L.clamp(k));
    c.save();
    c.globalAlpha = L.clamp(k * 1.4);
    c.textAlign = 'left';
    c.textBaseline = 'alphabetic';
    c.shadowColor = 'rgba(0,0,0,0.55)';
    c.shadowBlur = 18;
    const bs = L.fitSize(c, '−11', maxW, 190, 800, L.FONT.display, 80);
    c.fillStyle = L.rgba(ACCENT, 0.9);
    c.fillRect(x + 4, cy - bs * 0.72 - 34, 90 * e, 4);
    c.font = L.font(bs, 800, L.FONT.display);
    c.fillStyle = L.rgba(ACCENT);
    L.trackedText(c, '−11', x, cy + (1 - e) * 30, -2);
    const ds = L.fitSize(c, 'DAYS', maxW, 76, 800, L.FONT.display, 40);
    c.font = L.font(ds, 800, L.FONT.display);
    L.trackedText(c, 'DAYS', x + 4, cy + ds * 0.95 + 8 + (1 - e) * 22, 4);
    c.shadowBlur = 8;
    c.fillStyle = 'rgba(214,220,232,0.95)';
    const sm = 'SEPT 2, THEN SEPT 14';
    c.font = L.font(L.fitSize(c, sm, maxW - 6, 24, 600, L.FONT.body, 14), 600, L.FONT.body);
    L.trackedText(c, sm, x + 6, cy + ds * 0.95 + 58 + (1 - e) * 14, 2);
    c.restore();
  },
};
