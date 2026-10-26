// Beat 9 — "The last water pools in the Mariana Trench, | eleven kilometers down."
// The camera flies from Hawaii to the Mariana arc (`mariana`, mpp 1900) and then pushes onto the Challenger Deep cell
// (`deep`, 56.12 → 57.6, mpp 1400). The sea falls −6,000 → −10,800 m (53.97–57.02), then to −10,935 m (→ 58.29) as the
// last data cell runs dry. This scene adds:
//   * glints on the pools left along the trench axis (traced from the data's deepest cells, 11 N 141 E → 21.5 N 146.8 E):
//     each shrinks with the water above it and winks out when its cell runs dry (dataSea vs elevation), so the
//     pools go out one by one from the north and the south toward the Challenger Deep;
//   * the LAST glint at the Challenger cell (11.35 N 142.45 E, the deepest cell in the grid): a soft light + a slowly
//     turning four-point sparkle, shrinking with the last ~120 m and winking out with a final flash at ≈ 58.29;
//   * a tag (fixed screen box, hairline leader to the glint): MARIANA TRENCH on "Mariana Trench", extended with
//     "· 10,935 m" on "eleven kilometers down".
import * as L from '../../../../engine/runtime/lib.js';
import { ACCENT, PLACES, SEA, dataSea, elevation, project, seaAt, seaLevel } from '../env.js';
import { wordAt } from './s06-ridge.js';

const AXIS = [[10.95, 141.0], [11.05, 141.5], [11.25, 142.0], [11.35, 142.45], [11.45, 143.0], [11.5, 143.5], [11.75, 144.0],
  [12.05, 144.5], [12.15, 145.0], [12.5, 145.55], [13.0, 146.25], [13.5, 146.75], [14.0, 147.15], [14.5, 147.35], [15.0, 147.55],
  [15.5, 147.75], [16.5, 147.85], [17.5, 147.85], [18.5, 147.7], [19.5, 147.5], [20.5, 147.1], [21.5, 146.75]];
// samples every ≈ 0.12° along the axis, each at its deepest cell within ±0.15° (so the glint sits on the pool)
const POOLS = [];
for (let i = 0; i < AXIS.length - 1; i++) {
  const [a0, b0] = AXIS[i], [a1, b1] = AXIS[i + 1];
  const n = Math.max(1, Math.round(Math.hypot(a1 - a0, b1 - b0) / 0.12));
  for (let j = 0; j < n; j++) {
    const la = a0 + (a1 - a0) * j / n, lo = b0 + (b1 - b0) * j / n;
    let best = [la, lo, elevation(la, lo)];
    for (let da = -0.15; da <= 0.151; da += 0.05) for (let db = -0.15; db <= 0.151; db += 0.05) {
      const e = elevation(la + da, lo + db);
      if (e < best[2]) best = [la + da, lo + db, e];
    }
    if (Math.hypot(best[0] - PLACES.challenger.lat, best[1] - PLACES.challenger.lon) > 0.3) POOLS.push({ lat: best[0], lon: best[1], e: best[2], seed: POOLS.length * 1.7 });
  }
}
const CH = { ...PLACES.challenger, e: elevation(PLACES.challenger.lat, PLACES.challenger.lon) };   // −10,460 m (the grid's deepest)
const TAG = { x: 80, y: 600, h: 64 };

/** global time the last cell runs dry (the display level reaches −10,935 m) */
let cTl = null, cDry = 0;
function dryTime(tl) {
  if (cTl === tl) return cDry;
  let t = tl.scenes[9].start;
  for (; t < tl.scenes[10].start + 1; t += 1 / 240) if (dataSea(seaAt(t, tl)) <= CH.e) break;
  cTl = tl; cDry = t;
  return t;
}

function sparkle(c, x, y, r, rot, a, col) {
  if (r <= 0.5 || a <= 0.01) return;
  c.save();
  c.globalCompositeOperation = 'lighter';
  c.translate(x, y); c.rotate(rot);
  c.fillStyle = L.rgba(col, a);
  for (let i = 0; i < 4; i++) {
    const len = i % 2 ? r * 0.62 : r;
    c.beginPath(); c.moveTo(0, -len); c.lineTo(r * 0.09, 0); c.lineTo(0, len); c.lineTo(-r * 0.09, 0); c.closePath(); c.fill();
    c.rotate(Math.PI / 2);
  }
  c.restore();
}

export default {
  beat: 9,
  chapter: { num: '08', title: 'Mariana Trench' },
  layer: 9,
  cues(d) {
    // beat starts 53.42: tag on "Mariana" (55.08 → +1.6), "· 10,935 m" on "eleven" (56.47 → +3.05), the last glint
    // winks out ≈ 58.29 (→ +4.87)
    return [
      { t: 0.6, name: 'bubbles', gain: 0.16, pitch: 0.8 },
      { t: 1.6, name: 'sonar', gain: 0.26, pitch: 0.9 },
      { t: 3.05, name: 'tick', gain: 0.3, pitch: 1.0 },
      { t: 3.3, name: 'shimmer', gain: 0.22, pitch: 1.3 },
      { t: 4.86, name: 'ping', gain: 0.24, pitch: 1.6 },
    ];
  },
  drawWorld(c, v) {
    const sc = v.tl.scenes;
    if (v.gt < sc[9].start + 0.3 || v.gt > sc[10].start + 0.6) return;
    const ds = dataSea(seaLevel(v));
    const kIn = L.smoothstep(L.prog(v.gt, sc[9].start + 1.0, 1.0));
    const col = L.mix(ACCENT, [255, 255, 255], 0.55);
    // the shrinking pools along the axis
    for (const q of POOLS) {
      const w = ds - q.e;                                   // m of water over this cell
      if (w <= 0) continue;
      const p = project(v, q.lat, q.lon);
      if (p.z < 0.3 || p.x < -40 || p.x > L.W + 40 || p.y < -40 || p.y > L.H + 40) continue;
      const s = L.clamp(w / 1500);
      const tw = 0.8 + 0.2 * Math.sin(v.gt * 4.3 + q.seed);
      L.lightBlob(c, p.x, p.y, 5 + 13 * Math.sqrt(s), col, kIn * (0.25 + 0.4 * Math.sqrt(s)) * tw);
    }
    // the last pool: the Challenger cell
    const p = project(v, CH.lat, CH.lon);
    if (p.z < 0.3) return;
    const w = ds - CH.e, tDry = dryTime(v.tl);
    const rot = v.gt * 0.6;
    if (w > 0) {
      const s = Math.sqrt(L.clamp(w / 160));                // the last ≈ 160 m: shrinks to nothing
      const big = L.smoothstep(L.prog(v.gt, sc[9].start + 2.2, 1.2));   // grows into the hero glint on the push-in
      const tw = 0.85 + 0.15 * Math.sin(v.gt * 5.1);
      L.lightBlob(c, p.x, p.y, (14 + 46 * big) * (0.35 + 0.65 * s), col, (0.55 + 0.35 * big) * kIn * tw);
      L.lightBlob(c, p.x, p.y, (5 + 9 * big) * (0.4 + 0.6 * s), [255, 255, 255], 0.9 * kIn);
      sparkle(c, p.x, p.y, (16 + 34 * big) * (0.3 + 0.7 * s), rot, 0.85 * kIn * big, [235, 248, 255]);
    }
    // the wink-out: one last flash and a thin ring
    const fo = v.gt - tDry;
    if (fo > -0.02 && fo < 0.7) {
      const f = L.clamp(fo / 0.7);
      L.lightBlob(c, p.x, p.y, 40 + 30 * f, col, 0.7 * (1 - f) * (1 - f));
      c.save();
      c.strokeStyle = L.rgba(ACCENT, 0.7 * (1 - f));
      c.lineWidth = 2;
      c.beginPath(); c.arc(p.x, p.y, Math.max(0, 8 + 60 * L.ease.outCubic(f)), 0, Math.PI * 2); c.stroke();
      c.restore();
    }
  },
  drawOverlay(c, v) {
    const mar = wordAt(v.tl, 9, 'mariana'), elv = wordAt(v.tl, 9, 'eleven');
    const tk = v.k * L.ease.outCubic(L.prog(v.gt, (mar?.start ?? v.tl.scenes[9].start + 1.6) - 0.15, 0.5));
    if (tk <= 0) return;
    const nk = L.ease.inOutCubic(L.prog(v.gt, (elv?.start ?? v.tl.scenes[9].start + 3) - 0.05, 0.5));
    const p = project(v, CH.lat, CH.lon);
    c.save();
    c.globalAlpha *= tk;
    c.textBaseline = 'middle';
    // text metrics (fitted to the box: ≤ 820 px)
    const A = 'MARIANA TRENCH', SEP = '  ·  ', B = `${L.fmt(-SEA.mariana)} m`;
    let fs = 40;
    for (;;) {
      c.letterSpacing = '3px'; c.font = L.font(fs, 700, L.FONT.body);
      const wa = c.measureText(A).width; c.letterSpacing = '0px';
      c.font = L.font(fs * 1.12, 800, L.FONT.display);
      const wb = c.measureText(SEP + B).width;
      if (wa + wb + 48 <= 820 || fs <= 22) break;
      fs -= 2;
    }
    c.letterSpacing = '3px'; c.font = L.font(fs, 700, L.FONT.body);
    const wa = c.measureText(A).width - 3; c.letterSpacing = '0px';
    c.font = L.font(fs * 1.12, 800, L.FONT.display);
    const wSep = c.measureText(SEP).width, wB = c.measureText(B).width;
    const boxW = 48 + wa + (wSep + wB) * nk;
    const x0 = TAG.x, y0 = TAG.y + (1 - tk) * 16, h = TAG.h;
    // leader: from the box's bottom edge (above the glint) down to the glint
    if (p.z > 0.3) {
      const lx = L.clamp(p.x, x0 + 30, x0 + boxW - 30), ly = y0 + h;
      const e = L.ease.outCubic(L.prog(v.gt, (mar?.start ?? 0) - 0.05, 0.6));
      const ang = Math.atan2(p.y - ly, p.x - lx), gap = 16;
      const ex = p.x - Math.cos(ang) * gap, ey = p.y - Math.sin(ang) * gap;
      c.save();
      c.strokeStyle = 'rgba(235,242,248,0.8)'; c.lineWidth = 1.6;
      c.shadowColor = 'rgba(0,0,0,0.6)'; c.shadowBlur = 6;
      c.beginPath(); c.moveTo(lx, ly); c.lineTo(L.lerp(lx, ex, e), L.lerp(ly, ey, e)); c.stroke();
      c.restore();
    }
    // the box (opaque pill)
    c.save();
    c.shadowColor = 'rgba(0,0,0,0.45)'; c.shadowBlur = 18;
    L.roundRect(c, x0, y0, boxW, h, 12);
    c.fillStyle = 'rgba(6,10,19,0.86)'; c.fill();
    c.restore();
    L.roundRect(c, x0 + 0.5, y0 + 0.5, boxW - 1, h - 1, 12);
    c.strokeStyle = 'rgba(255,255,255,0.14)'; c.lineWidth = 1; c.stroke();
    c.fillStyle = L.rgba(ACCENT); c.fillRect(x0, y0 + 12, 3, h - 24);
    c.save();
    L.roundRect(c, x0, y0, boxW, h, 12); c.clip();
    c.letterSpacing = '3px'; c.font = L.font(fs, 700, L.FONT.body);
    c.fillStyle = 'rgba(242,246,250,0.98)';
    c.fillText(A, x0 + 24, y0 + h / 2 + 1);
    c.letterSpacing = '0px';
    if (nk > 0) {
      c.globalAlpha *= L.clamp(nk * 1.5 - 0.3);
      c.font = L.font(fs * 1.12, 800, L.FONT.display);
      c.fillStyle = 'rgba(160,175,195,0.9)';
      c.fillText(SEP, x0 + 24 + wa, y0 + h / 2 + 2);
      c.fillStyle = L.rgba(ACCENT);
      c.fillText(B, x0 + 24 + wa + wSep + (1 - nk) * 20, y0 + h / 2 + 2);
    }
    c.restore();
    c.restore();
  },
};
