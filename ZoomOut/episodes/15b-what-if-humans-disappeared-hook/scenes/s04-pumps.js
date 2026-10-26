// Beat 4 — "Beneath New York, pumps keep the subway dry."
// The dark city goes x-ray: a scan line sweeps up Manhattan and reveals the subway (cool-white trunk lines that
// follow the avenues, two crosstown lines and three river tubes, stations as rings). On "pumps" eight pump nodes
// spin up and push water out along discharge pipes into the rivers. Late in the beat the pumps stop one by one
// (the last ones die on "Without them" in beat 5). The network geometry is exported for s05 (the flood).
// Persists: the dry network fades out early in beat 6 (s05's flooded lines stay a little longer).
import * as L from '../../../../engine/runtime/lib.js';
import { onLand, addLand, cityState } from '../env.js';

export const B = (v, b) => v.tl.scenes[b].start;
export const XRAY = [196, 220, 255];
export const WATER = [34, 140, 178];
export const FOAM = [170, 236, 255];

// ------------------------------------------------------------------ network (metres; first point = flood source)
// fl: [from, to] fraction of the flood clock (s05) during which this line fills. tube: runs under a river.
// Real lines (projected from the stations' lat/lon): the 1 (Broadway-7th Av), the A/C/E (8th Av), the F (6th Av), the
// 4/5/6 (Lexington), the Q (2nd Av), and the river tubes: L (14th St to Williamsburg), N/W (60th St to Queens),
// 7 (Steinway tunnel), 4/5 (Joralemon St), 2/3 (Clark St) and PATH (to Jersey City).
const RAW = [
  { id: 'west', pts: [[148, 283], [-167, -216], [-307, -1181], [-800, -3184], [-817, -3734], [-817, -5959], [-1130, -7426], [-1686, -8427], [-1792, -10301], [-1954, -13836]], fl: [0.02, 0.92] },
  { id: '8th', pts: [[-195, -875], [-303, -1870], [-1105, -3854], [-1124, -6043], [-1130, -7426], [-1346, -11337]], fl: [0.0, 0.86] },
  { id: '6th', pts: [[130, -2670], [-551, -3169], [-561, -3863], [-573, -6005], [-547, -7190]], fl: [0.08, 0.7] },
  { id: 'lex', pts: [[-68, 84], [-29, -662], [206, -1161], [199, -1869], [321, -3246], [-29, -3929], [119, -6059], [218, -7461], [204, -9603], [179, -12769]], fl: [0.0, 0.95] },
  { id: '2nd', pts: [[222, -7731], [604, -8414], [567, -10389]], fl: [0.3, 1.0] },
  { id: 'L14', pts: [[3485, -3501], [907, -3788], [473, -3788], [38, -3827], [-569, -3808], [-1118, -3809]], fl: [0.1, 0.62], tube: [0.14, 0.4] },
  { id: 'Q60', pts: [[2874, -7448], [1494, -7712], [218, -7461], [-272, -7406], [-853, -7134]], fl: [0.3, 0.88], tube: [0.22, 0.47] },
  { id: 'bkT', pts: [[2336, 214], [-68, 84]], fl: [0.0, 0.3], tube: [0, 1] },
  { id: 'path', pts: [[-2082, -299], [-222, -733]], fl: [0.04, 0.34], tube: [0, 1] },
  { id: 'bkT2', pts: [[1858, -93], [177, -344]], fl: [0.0, 0.26], tube: [0, 1] },
  { id: 'flush', pts: [[2705, -6261], [2335, -6093], [119, -6059], [-300, -6068], [-817, -5959]], fl: [0.18, 0.8], tube: [0.24, 0.45] },
];

/** Chaikin-smooth the corners, then resample every ~30 m with cumulative length. */
function build(raw) {
  let p = raw.pts.map(([x, y]) => [x, y]);
  for (let it = 0; it < 3; it++) {
    const q = [p[0]];
    for (let i = 0; i < p.length - 1; i++) {
      const [ax, ay] = p[i], [bx, by] = p[i + 1];
      q.push([ax * 0.75 + bx * 0.25, ay * 0.75 + by * 0.25], [ax * 0.25 + bx * 0.75, ay * 0.25 + by * 0.75]);
    }
    q.push(p[p.length - 1]);
    p = q;
  }
  const out = [[p[0][0], p[0][1], 0]];
  let acc = 0;
  for (let i = 1; i < p.length; i++) {
    const [ax, ay] = p[i - 1], [bx, by] = p[i];
    const seg = Math.hypot(bx - ax, by - ay), n = Math.max(1, Math.ceil(seg / 30));
    for (let k = 1; k <= n; k++) out.push([ax + ((bx - ax) * k) / n, ay + ((by - ay) * k) / n, acc + (seg * k) / n]);
    acc += seg;
  }
  const len = acc;
  // stations every ~850 m on land (not in the tubes), skipping the very ends
  const stations = [];
  for (let s = 380; s < len - 150; s += 850) { const [x, y] = pointAt({ pts: out }, s); if (onLand(x, y)) stations.push([x, y, s]); }
  return { ...raw, pts: out, len, stations };
}
export function pointAt(line, s) {
  const P = line.pts;
  if (s <= 0) return [P[0][0], P[0][1]];
  let lo = 0, hi = P.length - 1;
  if (s >= P[hi][2]) return [P[hi][0], P[hi][1]];
  while (hi - lo > 1) { const m = (lo + hi) >> 1; if (P[m][2] <= s) lo = m; else hi = m; }
  const a = P[lo], b = P[hi], u = (s - a[2]) / Math.max(1e-6, b[2] - a[2]);
  return [L.lerp(a[0], b[0], u), L.lerp(a[1], b[1], u)];
}
export const LINES = RAW.map(build);

/** Path of a line from arc length s0 to s1 (screen space). */
export function linePath(c, v, line, s0 = 0, s1 = line.len) {
  const P = line.pts;
  c.beginPath();
  const [x0, y0] = pointAt(line, s0);
  c.moveTo(v.wx(x0), v.wy(y0));
  for (const p of P) if (p[2] > s0 && p[2] < s1) c.lineTo(v.wx(p[0]), v.wy(p[1]));
  const [x1, y1] = pointAt(line, s1);
  c.lineTo(v.wx(x1), v.wy(y1));
}

// ------------------------------------------------------------------ pumps
// pumps: low points on the trunk lines (world points snapped to their line), framed between screen y ~770 and ~1190
// at the beat-4 camera (clear of the label above and the captions / YouTube UI below)
const PUMP_PTS = [[3, 190, -3500], [1, -1124, -5600], [0, -817, -4600], [5, 1200, -3788], [10, 1000, -6070], [2, -565, -4300], [1, -1110, -3950], [3, 87, -5600]];
const nearestS = (line, x, y) => { let best = 0, bd = Infinity; for (const p of line.pts) { const d = (p[0] - x) ** 2 + (p[1] - y) ** 2; if (d < bd) { bd = d; best = p[2]; } } return best; };
const PUMP_AT = PUMP_PTS.map(([li, x, y]) => [li, nearestS(LINES[li], x, y)]);
function outlet(x, y) {   // nearest river, looking east / west along the street
  for (let d = 40; d < 3000; d += 40) {
    if (!onLand(x + d, y)) return [x + d + 120, y];
    if (!onLand(x - d, y)) return [x - d - 120, y];
  }
  return [x + 400, y];
}
export const PUMPS = PUMP_AT.map(([li, s], i) => {
  const [x, y] = pointAt(LINES[li], s);
  const [ox, oy] = outlet(x, y);
  return { x, y, ox, oy, i, stop5: 0.14 + i * 0.11 };   // stop5: seconds after the BEAT-5 start (all die on "Without them")
});
const T_SCAN = [0.0, 1.6];      // x-ray scan sweeps up the island (starts with the beat, after beat 3's label has gone)
const T_PUMPS = 1.12;           // pumps spin up on "pumps"
const T_LABEL = 1.3;

/** X-ray visibility (0..1) at global time: in with the scan, out early in beat 6. */
export function xrayK(v) {
  const t4 = v.gt - B(v, 4), t6 = v.gt - B(v, 6);
  return L.ease.outCubic(L.prog(t4, T_SCAN[0], 0.6)) * (1 - L.ease.inOutCubic(L.prog(t6, 0.1, 1.3)));
}
/** World y of the scan front (everything south of it is revealed). */
function scanY(v) {
  const k = L.ease.inOutCubic(L.prog(v.gt - B(v, 4), T_SCAN[0], T_SCAN[1]));
  return L.lerp(1200, -15500, k);
}
function pumpAngle(t, stop) {   // impeller angle: constant speed, then spins down (tau 0.4 s)
  const w = 7, tau = 0.4;
  if (t < stop) return w * t;
  return w * (stop + tau * (1 - Math.exp(-(t - stop) / tau)));
}

function drawPump(c, v, p, t4, k) {
  const x = v.wx(p.x), y = v.wy(p.y);
  const stop = p.stop5 + B(v, 5) - B(v, 4);   // in beat-4 seconds
  if (x < -60 || x > L.W + 60 || y < -60 || y > L.H + 60) return;
  const on = L.ease.outBack(L.prog(t4, T_PUMPS + p.i * 0.05, 0.45), 2.0);
  if (on <= 0) return;
  const run = 1 - L.ease.inCubic(L.prog(t4, stop, 0.45));        // pumping power
  const dead = L.prog(t4, stop, 0.25);
  const flash = Math.exp(-Math.max(0, t4 - stop) / 0.35) * (t4 > stop ? 1 : 0);
  const R = 13 * on;
  const live = L.mix([110, 200, 240], [120, 128, 140], dead);
  // discharge pipe to the river with water pulses running out
  const ox = v.wx(p.ox), oy = v.wy(p.oy);
  const pk = L.clamp(L.prog(t4, T_PUMPS + 0.15 + p.i * 0.05, 0.5)) * k;
  if (pk > 0) {
    c.save();
    c.strokeStyle = L.rgba(XRAY, 0.28 * pk);
    c.lineWidth = 1.4;
    c.beginPath(); c.moveTo(x, y); c.lineTo(ox, oy); c.stroke();
    const len = Math.hypot(ox - x, oy - y);
    const n = Math.max(2, Math.round(len / 34));
    for (let j = 0; j < n; j++) {
      const u = (((t4 * 0.9 + j / n) % 1) + 1) % 1;
      const fa = run * pk * Math.sin(Math.PI * u);
      if (fa < 0.02) continue;
      c.fillStyle = L.rgba(FOAM, 0.85 * fa);
      c.beginPath(); c.arc(L.lerp(x, ox, u), L.lerp(y, oy, u), 2.2, 0, Math.PI * 2); c.fill();
    }
    // outflow into the river: soft rings
    for (let j = 0; j < 2; j++) {
      const u = ((t4 * 0.8 + j * 0.5) % 1 + 1) % 1;
      c.strokeStyle = L.rgba(FOAM, 0.24 * run * pk * (1 - u));   // faint river ripples (not a node)
      c.lineWidth = 1.2;
      c.beginPath(); c.ellipse(ox, oy, Math.max(0, 3 + 13 * L.ease.outCubic(u)), Math.max(0, 2 + 8 * L.ease.outCubic(u)), 0, 0, Math.PI * 2); c.stroke();
    }
    c.restore();
  }
  c.save();
  c.globalAlpha = k;
  // running pulse ring
  if (run > 0.02) {
    const u = ((t4 - T_PUMPS) * 1.1 + p.i * 0.37) % 1;
    c.strokeStyle = L.rgba(live, 0.5 * run * (1 - u));
    c.lineWidth = 1.5;
    c.beginPath(); c.arc(x, y, Math.max(0, R * (1.2 + 1.8 * u)), 0, Math.PI * 2); c.stroke();
  }
  // body
  c.fillStyle = 'rgba(6,12,24,0.95)';
  c.beginPath(); c.arc(x, y, Math.max(0, R), 0, Math.PI * 2); c.fill();
  c.strokeStyle = L.rgba(live, 0.95);
  c.lineWidth = 2;
  c.stroke();
  // impeller
  const a0 = pumpAngle(t4 - T_PUMPS, stop - T_PUMPS) + p.i;
  c.strokeStyle = L.rgba(live, 0.9);
  c.lineWidth = 1.6;
  c.lineCap = 'round';
  c.beginPath();
  for (let b = 0; b < 3; b++) {
    const a = a0 + (b * Math.PI * 2) / 3;
    c.moveTo(x, y);
    c.quadraticCurveTo(x + Math.cos(a + 0.6) * R * 0.5, y + Math.sin(a + 0.6) * R * 0.5, x + Math.cos(a) * R * 0.68, y + Math.sin(a) * R * 0.68);
  }
  c.stroke();
  if (run > 0.02) L.lightBlob(c, x, y, R * 3, [90, 190, 240], 0.25 * run);
  // stop: a brief red flash
  if (flash > 0.01) {
    c.strokeStyle = L.rgba([255, 96, 74], 0.9 * flash);
    c.lineWidth = 2.5;
    c.beginPath(); c.arc(x, y, Math.max(0, R + 3 + 10 * (1 - flash)), 0, Math.PI * 2); c.stroke();
    L.lightBlob(c, x, y, R * 3.2, [255, 80, 60], 0.35 * flash);
  }
  c.restore();
}

/** Soft dark radial scrim behind a big label (screen space, ~520 x 200 px). */
export function labelScrim(c, x, y, k) {
  c.save();
  c.translate(x, y); c.scale(1, 200 / 520);
  const g = c.createRadialGradient(0, 0, 0, 0, 0, 290);
  g.addColorStop(0, `rgba(3,8,20,${0.55 * k})`); g.addColorStop(0.6, `rgba(3,8,20,${0.38 * k})`); g.addColorStop(1, 'rgba(3,8,20,0)');
  c.fillStyle = g;
  c.beginPath(); c.arc(0, 0, 290, 0, Math.PI * 2); c.fill();
  c.restore();
}

export default {
  beat: 4,
  chapter: { num: '04', title: 'The pumps', sub: 'Beneath New York' },
  captions: true,
  layer: 1,
  cues(d) {
    return [
      { t: 0.05, name: 'sonar', gain: 0.32, pitch: 0.8 },
      { t: 0.25, name: 'shimmer', gain: 0.2, pitch: 1.1 },
      { t: T_PUMPS, name: 'blip', gain: 0.24, pitch: 1.0 },
      { t: T_PUMPS + 0.2, name: 'blip', gain: 0.2, pitch: 1.2 },
      { t: T_PUMPS + 0.3, name: 'bubbles', gain: 0.24, pitch: 0.9 },
    ];
  },

  drawWorld(ctx, v) {
    const xk = xrayK(v);
    if (xk <= 0.002) return;
    const m = v.cam.mpp;
    if (m > 40) return;
    const t4 = v.gt - B(v, 4);
    const sy = v.wy(scanY(v));
    ctx.save();
    // x-ray tint: the whole frame stays a night x-ray even through env's day sweep (the water dims a little,
    // every land mass much more, so land always reads darker than the rivers). The tint ramps in over ~220 px
    // ahead of the scan front (feathered: no hard horizontal seam), the network itself is revealed at the front.
    const FE = 220;
    const ramp = (a) => {
      const g = ctx.createLinearGradient(0, sy - FE, 0, sy + 30);
      g.addColorStop(0, `rgba(3,8,20,0)`); g.addColorStop(0.55, `rgba(3,8,20,${0.55 * a})`); g.addColorStop(1, `rgba(3,8,20,${a})`);
      return g;
    };
    const top = Math.max(-20, sy - FE);
    const day = cityState(v).day;
    if (day > 0.01) { ctx.fillStyle = ramp(0.45 * day * xk); ctx.fillRect(-20, top, L.W + 40, L.H + 40 - top); }
    ctx.beginPath();
    addLand(ctx, v);
    ctx.fillStyle = ramp((0.6 + 0.12 * day) * xk);
    ctx.fill('nonzero');
    // everything south of the scan front shows the network
    ctx.beginPath(); ctx.rect(-20, sy, L.W + 40, L.H + 40 - sy); ctx.clip();
    // the dry network
    const lw = L.clamp(8.5 / m, 0.6, 1.6);
    ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    for (const ln of LINES) {
      linePath(ctx, v, ln);
      ctx.strokeStyle = L.rgba(XRAY, 0.1 * xk);
      ctx.lineWidth = 7 * lw;
      ctx.stroke();
      ctx.strokeStyle = L.rgba(XRAY, (ln.tube ? 0.55 : 0.8) * xk);
      ctx.lineWidth = 1.9 * lw;
      if (ln.tube) ctx.setLineDash([6, 5]);
      ctx.stroke();
      ctx.setLineDash([]);
    }
    for (const ln of LINES) {
      for (const [x, y] of ln.stations) {
        const X = v.wx(x), Y = v.wy(y);
        if (X < -10 || X > L.W + 10 || Y < -10 || Y > L.H + 10) continue;
        ctx.fillStyle = 'rgba(6,12,24,0.95)';
        ctx.strokeStyle = L.rgba(XRAY, 0.85 * xk);
        ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.arc(X, Y, 3.6 * lw, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      }
    }
    ctx.restore();
    // the scan front: a soft cool band with a crisp core
    const sk = L.prog(t4, T_SCAN[0], T_SCAN[1]);
    if (sk > 0 && sk < 1) {
      const a = Math.sin(Math.PI * sk);
      const g = ctx.createLinearGradient(0, sy - 70, 0, sy + 90);
      g.addColorStop(0, 'rgba(150,200,255,0)'); g.addColorStop(0.44, L.rgba([150, 200, 255], 0.1 * a)); g.addColorStop(1, 'rgba(150,200,255,0)');
      ctx.fillStyle = g; ctx.fillRect(0, sy - 70, L.W, 160);
      // the front itself: a thin line that fades out toward both frame edges (never a full-width seam)
      const lg = ctx.createLinearGradient(0, 0, L.W, 0);
      lg.addColorStop(0, 'rgba(200,230,255,0)'); lg.addColorStop(0.5, L.rgba([200, 230, 255], 0.38 * a)); lg.addColorStop(1, 'rgba(200,230,255,0)');
      ctx.fillStyle = lg;
      ctx.fillRect(0, sy - 0.75, L.W, 1.5);
    }
    // pumps (hidden by s05 once their lines are flooded deep into beat 6)
    if (t4 > T_PUMPS - 0.1) for (const p of PUMPS) drawPump(ctx, v, p, t4, xk);
  },

  drawOverlay(ctx, v) {
    const k = L.enter(v.t, T_LABEL, 0.55) * v.k * (1 - L.ease.inCubic(L.prog(v.t, v.d - 0.4, 0.35)));   // out by the beat end
    if (k <= 0) return;
    // an opaque plate: the subway network never runs through the type
    const big = '≈ 50 MILLION LITRES', small = 'pumped out every day · 13 M US gal';
    const size = Math.min(84, L.fitSize(ctx, big, 860, 84, 800, L.FONT.display, 48));
    ctx.save();
    ctx.font = L.font(size, 800, L.FONT.display);
    const bw = ctx.measureText(big).width;
    ctx.font = L.font(30, 600, L.FONT.body);
    ctx.letterSpacing = '3px';
    const swt = ctx.measureText(small.toUpperCase()).width;
    ctx.letterSpacing = '0px';
    const px0 = 40, py0 = 560 - size * 0.92 - 52, px1 = 64 + Math.max(bw, swt) + 30, py1 = 560 + 52 + 26;
    ctx.globalAlpha = L.clamp(k * 1.4);
    ctx.fillStyle = 'rgba(5,10,22,0.96)';
    L.roundRect(ctx, px0, py0, px1 - px0, py1 - py0, 14); ctx.fill();
    ctx.strokeStyle = 'rgba(150,190,240,0.18)'; ctx.lineWidth = 1.2; ctx.stroke();
    ctx.restore();
    L.bigLabel(ctx, { x: 64, y: 560, big, small, k, accent: v.accent, size });
  },
};
