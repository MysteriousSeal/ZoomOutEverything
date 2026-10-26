// Beat 9 — "Seven wanderers, | and seven became a sacred number."
// Against the fixed stars, each light traces a short time-lapse path that ends at its present position (drawn in
// world space behind env's lights): the five planets make a looping retrograde track, the Sun and the Moon a
// smooth drift (the Moon's the longest). Then the hero: a large accent "7" above the arc with "planētēs" /
// "Greek: wanderers". On phrase 2 ("sacred number") a fine seven-pointed star {7/3} draws itself around the 7 and
// glows once. The rooftop sky-watcher (s07) stays below.
import * as L from '../../../../engine/runtime/lib.js';
import { ACCENT, LIGHTS, lightPos, skyPos } from '../env.js';

const TL = ((t) => (t.preroll ? { ...t, scenes: t.scenes.slice(1), lines: t.lines.slice(1) } : t))(await (await fetch(new URL('../build/timeline.json', import.meta.url))).json());   // 19b: the MAIN timeline (preroll line dropped, as main.js does)
const B = 9;
const T0 = TL.scenes[B].start;
const T10 = TL.scenes[10].start;
const ph = TL.lines[B].phrases || [];
const PH2 = (ph[1]?.start ?? T0 + 1.6) - T0;
const lineText = TL.lines[B].text.toLowerCase();
const wordAt = (w) => TL.lines[B].start + (lineText.indexOf(w) / lineText.length) * (TL.lines[B].end - TL.lines[B].start) - T0;
const T_PATH = 0.05, PATH_D = 1.25, PATH_STAG = 0.08;
const T_SEVEN = Math.max(0.6, wordAt('wanderers') - 0.05);
const T_GREEK = T_SEVEN + 0.3;
const T_STAR = PH2 + 0.05, STAR_D = 1.0;
const T_SACRED = Math.max(T_STAR + 0.6, wordAt('sacred'));
const TAU = Math.PI * 2;

// path shape per light (world units): length behind the light, loop size (0 = smooth), perpendicular bow
const SHAPE = {
  sun: { len: 1.0, b: 0, c: 0.05 },
  moon: { len: 1.0, b: 0, c: -0.3 },
  // planets: an epicycle-style retrograde loop in the middle of the track, bowed inward (into the empty sky
  // inside the arc, away from the name labels)
  mercury: { len: 2.1, b: 0.78, c: -1.1 },
  venus: { len: 2.3, b: 0.86, c: -1.2 },
  mars: { len: 2.4, b: 0.9, c: -1.25 },
  jupiter: { len: 2.0, b: 0.75, c: -1.05 },
  saturn: { len: 1.8, b: 0.68, c: -0.95 },
};

/** Point s ∈ [0,1] on light i's wandering path (s = 1 at the light), world units. */
function pathPt(i, s, end) {
  const Lt = LIGHTS[i], sh = SHAPE[Lt.key];
  const th = (160 - Lt.sky * (140 / 6)) * Math.PI / 180;
  // tangent of the ecliptic ellipse (pointing "east" = left → right) and the up-normal
  let tx = 7 * Math.sin(th), ty = 8 * Math.cos(th);
  const n = Math.hypot(tx, ty); tx /= n; ty /= n;
  const nx = ty, ny = -tx;                         // rotate: normal pointing up-out of the arc
  const along = -sh.len * (1 - s) + sh.b * Math.sin(TAU * s);
  const perp = sh.c * (1 - Math.cos(TAU * s)) / 2 + (sh.b ? 0 : sh.c * Math.sin(Math.PI * s) * 0.5);
  return { x: end.x + tx * along + nx * perp, y: end.y + ty * along + ny * perp };
}

function heptagram(c, x, y, r, k, rot) {
  // {7/3} star: connect every 3rd vertex, drawn progressively
  const pts = Array.from({ length: 8 }, (_, j) => { const a = rot + ((j * 3) % 7) * TAU / 7; return [x + r * Math.cos(a), y + r * Math.sin(a)]; });
  const total = 7 * k;
  c.beginPath();
  c.moveTo(pts[0][0], pts[0][1]);
  for (let j = 1; j <= 7; j++) {
    const f = L.clamp(total - (j - 1));
    if (f <= 0) break;
    c.lineTo(L.lerp(pts[j - 1][0], pts[j][0], f), L.lerp(pts[j - 1][1], pts[j][1], f));
  }
  c.stroke();
}

export default {
  beat: B,
  chapter: { num: '09', title: 'Wanderers', sub: 'Greek planētēs' },
  captions: true,
  layer: 2,
  cues(d) {
    return [
      { t: T_PATH + 0.05, name: 'swish', gain: 0.16, pitch: 0.8 },
      { t: T_PATH + 0.4, name: 'shimmer', gain: 0.12, pitch: 1.3 },
      { t: T_SEVEN, name: 'impact', gain: 0.32, pitch: 0.85 },
      { t: T_GREEK, name: 'tick', gain: 0.14, pitch: 1.2 },
      { t: T_STAR, name: 'riser', gain: 0.12, pitch: 1.0 },
      { t: T_SACRED, name: 'swell', gain: 0.24, pitch: 1.0 },
    ];
  },
  drawWorld(c, v) {
    const gt = v.gt, t = v.t;
    if (t < 0 || gt > T10 + 0.6 || v.cam.mpp > 0.05) return;
    const out = 1 - L.ease.inCubic(L.prog(gt, T10 - 0.2, 0.6));
    if (out <= 0) return;
    c.save();
    c.lineCap = 'round'; c.lineJoin = 'round';
    for (let i = 0; i < LIGHTS.length; i++) {
      const Lt = LIGHTS[i];
      const t0 = T_PATH + Lt.sky * PATH_STAG;
      const p = L.ease.inOutCubic(L.prog(t, t0, PATH_D));
      if (p <= 0) continue;
      const end = lightPos(i, gt, v.tl);
      const N = 72;
      const s0 = 0;                    // the path is revealed from its start toward the light
      const sN = p;
      // hairline
      c.strokeStyle = L.rgba(Lt.col, 0.32 * out);
      c.lineWidth = 1.3;
      c.beginPath();
      for (let j = 0; j <= N; j++) {
        const s = L.lerp(s0, sN, j / N);
        const q = pathPt(i, s, end);
        const x = v.wx(q.x), y = v.wy(q.y);
        j ? c.lineTo(x, y) : c.moveTo(x, y);
      }
      c.stroke();
      // time-lapse dots (one per "night"), brighter toward the head
      const D = 22;
      for (let j = 0; j <= D; j++) {
        const s = j / D;
        if (s > sN) break;
        const q = pathPt(i, s, end);
        const a = (0.25 + 0.6 * s) * out;
        c.fillStyle = L.rgba(L.mix(Lt.col, [255, 255, 255], 0.3), a);
        c.beginPath(); c.arc(v.wx(q.x), v.wy(q.y), Math.max(0, 1.6 + 1.4 * s), 0, TAU); c.fill();
      }
      // a moving bead while drawing
      if (p < 1) {
        const q = pathPt(i, sN, end);
        L.lightBlob(c, v.wx(q.x), v.wy(q.y), 18, Lt.col, 0.55 * out);
      }
    }
    c.restore();
  },
  drawOverlay(c, v) {
    const t = v.t;
    // exit (faster than the entrance) so the frame is clean when beat 10's tiles arrive
    const k = v.k * (1 - L.ease.inCubic(L.prog(t, v.d - 0.4, 0.35)));
    if (k <= 0.001) return;
    // the hero 7 sits above the arc's apex
    const top = skyPos(3);
    const apexY = v.wy(top.y);
    const cx = 540, by = Math.min(515, apexY - 240);
    const k7 = L.prog(t, T_SEVEN, 0.6);
    if (k7 <= 0) return;
    const e = L.ease.outBack(k7, 1.3);
    c.save();
    c.globalAlpha = k;
    // the sacred seven-pointed star behind the 7
    const ks = L.ease.inOutCubic(L.prog(t, T_STAR, STAR_D));
    const pulse = Math.exp(-Math.pow((t - T_SACRED - 0.15) / 0.35, 2));
    if (ks > 0) {
      const sy = by - 78, r = 112;
      c.save();
      c.strokeStyle = L.rgba(ACCENT, 0.28 + 0.4 * pulse);
      c.lineWidth = 1.4 + pulse;
      heptagram(c, cx, sy, r, ks, -Math.PI / 2 + 0.05 * Math.sin(v.gt * 0.3));
      // seven vertex points
      for (let j = 0; j < 7; j++) {
        const kj = L.ease.outBack(L.prog(t, T_STAR + j * 0.1, 0.35), 2);
        if (kj <= 0) continue;
        const a = -Math.PI / 2 + 0.05 * Math.sin(v.gt * 0.3) + j * TAU / 7;
        const px = cx + r * Math.cos(a), py = sy + r * Math.sin(a);
        c.fillStyle = L.rgba(LIGHTS.find((Lt) => Lt.sky === j).col, 0.9);
        c.beginPath(); c.arc(px, py, Math.max(0, 3.5 * kj), 0, TAU); c.fill();
        L.lightBlob(c, px, py, 16 * kj, LIGHTS.find((Lt) => Lt.sky === j).col, 0.3 + 0.3 * pulse);
      }
      c.restore();
    }
    if (pulse > 0.01) L.lightBlob(c, cx, by - 78, 220, ACCENT, 0.18 * pulse);
    // the 7
    c.save();
    const sc = L.lerp(1.25, 1, e);
    c.translate(cx, by); c.scale(sc, sc);
    c.globalAlpha *= L.clamp(k7 * 2);
    c.font = L.font(250, 800, L.FONT.display);
    c.textAlign = 'center'; c.textBaseline = 'alphabetic';
    c.shadowColor = 'rgba(0,0,0,0.6)'; c.shadowBlur = 30;
    const g = c.createLinearGradient(0, -185, 0, 0);
    g.addColorStop(0, L.rgba(L.mix(ACCENT, [255, 255, 255], 0.35)));
    g.addColorStop(1, L.rgba(ACCENT));
    c.fillStyle = g;
    c.fillText('7', 0, 0);
    c.restore();
    // planētēs / Greek: wanderers
    const kg = L.ease.outCubic(L.prog(t, T_GREEK, 0.5));
    if (kg > 0) {
      c.save();
      c.globalAlpha = k * kg;
      c.textAlign = 'center';
      c.shadowColor = 'rgba(2,4,14,0.9)'; c.shadowBlur = 12;
      c.font = L.font(46, 500, L.FONT.body);
      c.fillStyle = '#f2ece0';
      c.fillText('planētēs', cx, by + 78 + (1 - kg) * 12);
      c.font = L.font(22, 600, L.FONT.body);
      c.fillStyle = 'rgba(205,215,230,0.9)';
      L.trackedText(c, 'GREEK: “WANDERERS”', cx, by + 112 + (1 - kg) * 14, 4, 'center');
      c.restore();
    }
    c.restore();
  },
};
