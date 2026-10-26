// Beat 9 — Some bronze statues might keep their shape for millions of years.
// The region at 140 m/px, the city long gone under forest. A warm glint marks the old plaza (Bowling Green); a
// leader draws up from it and a loupe opens. Inside: the Charging Bull in a 3/4 oblique view, still standing on its
// granite plinth in a forest clearing, its shadow cast from the hooves along the ground. While the clock races to
// 1,000,000 YEARS the sun wheels round like a sundial; it settles just as the clock locks. A CHARGING BULL tag.
// The loupe closes before the pull-back to the planet.
import * as L from '../../../../engine/runtime/lib.js';
import { PLAZA } from '../camera.js';
import { glowDot } from '../env.js';

const LENS = { x: 690, y: 728, r: 212 };
const T_MARK = 1.0, T_LEAD = 1.2, T_OPEN = 1.5, T_LOCK = 2.6;   // beat time (camera settles ~1.5)
const K0 = 37;                                                  // px per metre inside the loupe (at full open)
const S_FINAL = 0.55;                                           // shadow direction at the lock (bull-local ground: front-right)
const PLINTH = { l: 5.6, w: 2.0, h: 0.35 };
const XC = 2.25;                                                // body x of the plinth centre (profile/plan x runs rump 0 to nose ~4.65)
const BRONZE_HI = [236, 190, 120], BRONZE = [128, 86, 46], BRONZE_LO = [42, 28, 18];
const PATINA = [84, 168, 138], PATINA_LO = [30, 70, 60];

// side profile of a charging bull (x from rump to nose, z up), metres: head down, arched back, legs driving
const PROFILE = [[0.2, 1.75], [0.8, 1.85], [1.6, 1.8], [2.4, 1.95], [3.0, 2.25], [3.4, 2.2], [3.8, 1.85], [4.15, 1.45],
  [4.4, 1.15], [4.65, 0.75], [4.75, 0.5], [4.6, 0.38], [4.3, 0.5], [4.0, 0.62],
  [3.85, 0.55], [4.05, 0.2], [4.2, 0.0], [3.98, 0.0], [3.78, 0.3], [3.6, 0.55],                 // near foreleg reaching forward
  [3.45, 0.55], [3.38, 0.0], [3.18, 0.0], [3.2, 0.6],                                           // far foreleg planted
  [2.8, 0.75], [2.0, 0.8], [1.4, 0.82],                                                         // belly
  [1.2, 0.78], [0.9, 0.4], [0.55, 0.0], [0.32, 0.0], [0.6, 0.45], [0.55, 0.8],                  // near hind leg driving back
  [0.4, 0.8], [0.15, 0.35], [-0.05, 0.0], [-0.25, 0.0], [-0.05, 0.5], [0.0, 1.1], [0.1, 1.5]];  // far hind leg, rump
const HORN = [[4.1, 1.4], [4.2, 1.65], [4.4, 1.8], [4.65, 1.85], [4.85, 1.75]];   // curving forward and up
const TAIL = [[0.1, 1.6], [-0.2, 1.85], [-0.35, 2.2], [-0.2, 2.5], [0.05, 2.55]];   // whipped up in an S
// forest around the clearing (local metres from the statue) + paving stones
const TREES = (() => {
  const r = L.rng(919), out = [];
  const clear = (a, d) => Math.abs(Math.atan2(Math.sin(a - S_FINAL), Math.cos(a - S_FINAL))) < 0.95 && d < 11;
  for (let i = 0; i < 30; i++) {
    const a = (i / 30) * Math.PI * 2 + r() * 0.2, d = 6.6 + r() * 3.4;
    if (clear(a, d)) continue;   // the shadow falls across an open, sunlit clearing
    out.push({ x: Math.cos(a) * d, y: Math.sin(a) * d, s: 2.0 + r() * 1.6, ph: r() * 9, n: 5 + Math.floor(r() * 4), tone: r() });
  }
  for (let i = 0; i < 5; i++) {   // saplings pushing into the clearing
    const a = r() * Math.PI * 2, d = 4.6 + r() * 1.4;
    if (clear(a, d)) continue;
    out.push({ x: Math.cos(a) * d, y: Math.sin(a) * d, s: 0.7 + r() * 0.6, ph: r() * 9, n: 4, tone: r() });
  }
  return out;
})();
const STONES = (() => {
  const r = L.rng(313), out = [];
  for (let i = -6; i <= 6; i++) for (let j = -6; j <= 6; j++) {
    const x = i * 1.15, y = j * 1.15, d = Math.hypot(x, y);
    if (d > 6.2 || r() > L.clamp(1.25 - d / 6.5)) continue;
    out.push({ x, y, tone: r(), tilt: (r() - 0.5) * 0.1 });
  }
  return out;
})();

/** Bronze-statue lens (screen space): the Charging Bull in a 3/4 oblique view, standing on its weathered granite
 *  plinth in a forest clearing. Its shadow is the true projection of the statue along the sun (it starts at the
 *  hooves and lies along the ground), and it sweeps like a sundial while the clock races, settling at the lock. */
const YAW = 0.38;                    // the bull turned ~22° toward the viewer (head to the right and forward)
const ELEV = 0.52;                   // camera elevation (rad, ~30°): ground depth x sin, heights x cos
function drawLens(ctx, v, cx, cy, r, sc, t) {
  const K = 40 * sc;
  const se = Math.sin(ELEV), ce = Math.cos(ELEV), cy0 = Math.cos(YAW), sy0 = Math.sin(YAW);
  const ox = cx - 6 * sc, oy = cy + 34 * sc;                  // plinth centre (ground level) in the lens
  // bull-local (x: rump -> nose, y: + toward the viewer's side, z: up) -> screen
  const proj = (x, y, z) => {
    const gx = x * cy0 - y * sy0, gy = x * sy0 + y * cy0;
    return [ox + gx * K, oy + gy * K * se - z * K * ce];
  };
  const sway = (ph, f = 1) => L.noise1(v.gt * 0.6 * f + ph, 7) * 0.08;
  // sun: the shadow direction on the ground (bull-local), sweeping while the clock races, settling at the lock
  const sw = 1 - L.ease.outCubic(L.prog(t, T_OPEN - 0.2, T_LOCK - T_OPEN + 0.2));
  const sa = 0.55 - 2.2 * sw;                                    // final: toward the lower right (front-right)
  const S = { x: Math.cos(sa), y: Math.sin(sa) };
  const cot = 1.25;                                              // sun ~39° up
  const shadowOf = (x, y, z, base) => proj(x + S.x * (z - base) * cot, y + S.y * (z - base) * cot, base);

  ctx.save();
  ctx.beginPath(); ctx.arc(cx, cy, Math.max(0, r), 0, Math.PI * 2); ctx.clip();
  // the clearing floor, receding: warm near, darker toward the trees behind
  const fg = ctx.createLinearGradient(0, cy - r, 0, cy + r);
  fg.addColorStop(0, '#18211a'); fg.addColorStop(0.45, '#3a4430'); fg.addColorStop(1, '#55553f');
  ctx.fillStyle = fg; ctx.fillRect(cx - r, cy - r, 2 * r, 2 * r);
  // old plaza paving (cracked, mossy), foreshortened
  for (const st of STONES) {
    const [x, y] = [ox + st.x * K, oy + st.y * K * se];
    const w = 1.05 * K;
    ctx.fillStyle = L.rgba(L.mix([96, 94, 82], [124, 120, 104], st.tone), 0.16 + 0.18 * st.tone);
    ctx.fillRect(x - w / 2, y - (w * se) / 2, w * 0.96, w * se * 0.9);
  }
  const gr = L.rng(717);
  for (let i = 0; i < 120; i++) {
    const x = ox + (gr() - 0.5) * 15 * K, y = oy + (gr() - 0.5) * 15 * K * se, rr = (0.05 + gr() * 0.09) * K;
    ctx.fillStyle = gr() < 0.65 ? `rgba(120,140,70,${0.1 + gr() * 0.12})` : `rgba(170,120,66,${0.08 + gr() * 0.12})`;
    ctx.beginPath(); ctx.ellipse(x, y, Math.max(0, rr * 1.6), Math.max(0, rr * 0.7), 0, 0, Math.PI * 2); ctx.fill();
  }
  // trees: those behind the statue first
  const drawTree = (tr) => {
    const grow = tr.s < 1.5 ? L.ease.outCubic(L.prog(t, T_OPEN, 1.4)) : 1;
    if (grow <= 0.01) return;
    const [bx, by] = [ox + (tr.x + sway(tr.ph)) * K, oy + tr.y * K * se];
    const top = by - tr.s * 1.7 * K * ce * grow;
    ctx.fillStyle = 'rgba(6,12,10,0.25)';                       // ground shadow
    ctx.beginPath(); ctx.ellipse(bx + S.x * tr.s * K * 0.8, by + S.y * tr.s * K * se * 0.8, Math.max(0, tr.s * K * 0.8), Math.max(0, tr.s * K * 0.35), 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = 'rgba(30,24,18,0.9)'; ctx.lineWidth = Math.max(1, 0.18 * K * grow);
    ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(bx, top + tr.s * 0.4 * K); ctx.stroke();
    const rr = L.rng(Math.floor(tr.ph * 1000));
    const base = L.mix([24, 52, 30], [38, 70, 36], tr.tone);
    for (const [col, off, sz] of [[L.mix(base, [6, 14, 10], 0.45), 0, 1.08], [base, -0.12, 0.9], [L.mix(base, [196, 190, 110], 0.38), -0.36, 0.45]]) {
      ctx.fillStyle = L.rgba(col);
      const r2 = L.rng(Math.floor(tr.ph * 1000));
      for (let q = 0; q < 6 + tr.n; q++) {
        const a = r2() * 6.283, d = Math.sqrt(r2()) * tr.s * 0.6, s2 = tr.s * (0.3 + r2() * 0.22) * grow;
        const x = bx + Math.cos(a) * d * K + S.x * off * s2 * K * -1, y = top + Math.sin(a) * d * K * 0.75 - S.y * off * s2 * K;
        ctx.beginPath(); ctx.arc(x, y, Math.max(0, s2 * K * sz), 0, Math.PI * 2); ctx.fill();
      }
    }
    void rr;
  };
  const back = TREES.filter((tr) => tr.y < 1.2).sort((p, q) => p.y - q.y), front = TREES.filter((tr) => tr.y >= 1.2 && Math.abs(tr.x) > 6.5);
  back.forEach(drawTree);
  // shadows: the plinth onto the ground, then (over the plinth) the bull, cast from its hooves along the sun
  const SL = shadowLayer(), half = SL.width / 2, g = SL.getContext('2d');
  const PL = PLINTH.l / 2, PW = PLINTH.w / 2, PH = PLINTH.h;
  const box = [[-PL, -PW], [PL, -PW], [PL, PW], [-PL, PW]];
  const layer = (paint) => {
    g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, SL.width, SL.height);
    g.setTransform(1, 0, 0, 1, half - cx, half - cy);
    g.fillStyle = 'rgb(8,12,18)'; g.strokeStyle = 'rgb(8,12,18)';
    paint();
    ctx.save();
    ctx.globalAlpha *= 0.6;
    ctx.filter = `blur(${(0.8 * sc).toFixed(2)}px)`;
    ctx.drawImage(SL, cx - half, cy - half);
    ctx.restore();
  };
  layer(() => {
    const hp = [];
    for (const [x, y] of box) hp.push(proj(x, y, 0), shadowOf(x, y, PH, 0));
    g.beginPath(); hull(hp).forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.fill();
  });
  // plinth: a granite block (top lit, front face shaded, the visible end face darker), lichen
  const faces = [
    { pts: [[-PL, -PW, PH], [PL, -PW, PH], [PL, PW, PH], [-PL, PW, PH]], col: '#a3a096' },
    { pts: [[-PL, PW, PH], [PL, PW, PH], [PL, PW, 0], [-PL, PW, 0]], col: '#6c6a63' },
    { pts: [[PL, -PW, PH], [PL, PW, PH], [PL, PW, 0], [PL, -PW, 0]], col: '#57564f' },
  ];
  for (const f of faces.slice(1).concat(faces[0])) {
    ctx.beginPath(); f.pts.forEach(([x, y, z], i) => { const [px, py] = proj(x, y, z); i ? ctx.lineTo(px, py) : ctx.moveTo(px, py); }); ctx.closePath();
    ctx.fillStyle = f.col; ctx.fill();
    ctx.strokeStyle = 'rgba(20,20,18,0.5)'; ctx.lineWidth = 1; ctx.stroke();
  }
  const lr = L.rng(51);
  for (let i = 0; i < 8; i++) {
    const [lx, ly] = proj((lr() - 0.5) * PLINTH.l * 0.9, PW, PH * (0.2 + 0.6 * lr()));
    ctx.fillStyle = `rgba(${lr() < 0.5 ? '96,128,70' : '150,150,110'},${0.25 + lr() * 0.3})`;
    ctx.beginPath(); ctx.ellipse(lx, ly, Math.max(0, (0.2 + lr() * 0.4) * K), Math.max(0, 0.06 * K), 0, 0, Math.PI * 2); ctx.fill();
  }
  layer(() => {
    g.beginPath();
    PROFILE.forEach(([x, z], i) => { const [px, py] = shadowOf(x - XC, 0, z + PH, PH); i ? g.lineTo(px, py) : g.moveTo(px, py); });
    g.closePath(); g.fill();
    g.lineCap = 'round'; g.lineJoin = 'round';
    for (const [line, w0, w1] of [[HORN, 0.17, 0.05], [TAIL, 0.1, 0.05]]) {
      for (let i = 0; i < line.length - 1; i++) {
        g.lineWidth = Math.max(0.6, L.lerp(w0, w1, i / (line.length - 1)) * K * se);
        const [a1, b1] = shadowOf(line[i][0] - XC, 0, line[i][1] + PH, PH), [a2, b2] = shadowOf(line[i + 1][0] - XC, 0, line[i + 1][1] + PH, PH);
        g.beginPath(); g.moveTo(a1, b1); g.lineTo(a2, b2); g.stroke();
      }
    }
  });
  // the bull itself, standing on the plinth
  drawBullSide(ctx, proj, K, S, t, PH);
  front.forEach(drawTree);
  // low golden light from the sun side, cool shade opposite; inner lens vignette
  const lg = ctx.createLinearGradient(cx - S.x * r, cy - S.y * r, cx + S.x * r, cy + S.y * r);
  lg.addColorStop(0, 'rgba(255,196,120,0.14)'); lg.addColorStop(0.5, 'rgba(255,196,120,0)'); lg.addColorStop(1, 'rgba(20,34,60,0.2)');
  ctx.fillStyle = lg; ctx.fillRect(cx - r, cy - r, 2 * r, 2 * r);
  const vg = ctx.createRadialGradient(cx, cy, r * 0.6, cx, cy, r);
  vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(2,6,10,0.42)');
  ctx.fillStyle = vg; ctx.fillRect(cx - r, cy - r, 2 * r, 2 * r);
  // name tag: CHARGING BULL (bronze, Bowling Green)
  const bk = L.ease.outCubic(L.prog(t, T_OPEN + 0.55, 0.45));
  if (bk > 0) {
    ctx.save();
    ctx.globalAlpha *= bk;
    ctx.font = L.font(17, 700, L.FONT.body);
    ctx.letterSpacing = '3px';
    const w = ctx.measureText('CHARGING BULL').width;
    ctx.letterSpacing = '0px';
    const tx = cx - w / 2, ty = cy + 150 * sc;
    ctx.fillStyle = 'rgba(8,10,12,0.8)';
    L.roundRect(ctx, tx - 12, ty - 15, w + 22, 30, 6); ctx.fill();
    ctx.strokeStyle = L.rgba(BRONZE_HI, 0.7); ctx.lineWidth = 1; ctx.stroke();
    ctx.fillStyle = L.rgba([246, 214, 160]);
    ctx.textBaseline = 'middle';
    L.trackedText(ctx, 'CHARGING BULL', tx, ty + 1, 3, 'left');
    ctx.restore();
  }
  // glass reflection
  const rg = ctx.createLinearGradient(cx - r, cy - r, cx, cy);
  rg.addColorStop(0, 'rgba(255,255,255,0.10)'); rg.addColorStop(0.5, 'rgba(255,255,255,0.02)'); rg.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = rg;
  ctx.beginPath(); ctx.arc(cx, cy, r * 0.93, Math.PI * 0.95, Math.PI * 1.55); ctx.arc(cx + r * 0.12, cy + r * 0.12, r * 0.86, Math.PI * 1.55, Math.PI * 0.95, true); ctx.fill();
  ctx.restore();
}

/** The Charging Bull, side-on (3/4): head low, back arched, tail whipped up; polished bronze with a green patina. */
function drawBullSide(ctx, proj, K, S, t, base) {
  const Q = (x, z, y = 0) => proj(x - XC, y, z + base);
  const tube = (line, w0, w1, col, y = 0) => {
    ctx.strokeStyle = col;
    for (let i = 0; i < line.length - 1; i++) {
      ctx.lineWidth = Math.max(0.8, L.lerp(w0, w1, i / (line.length - 1)) * K);
      const [a1, b1] = Q(line[i][0], line[i][1], y), [a2, b2] = Q(line[i + 1][0], line[i + 1][1], y);
      ctx.beginPath(); ctx.moveTo(a1, b1); ctx.lineTo(a2, b2); ctx.stroke();
    }
  };
  ctx.save();
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  // far horn + tail (behind the body, darker)
  tube(HORN, 0.2, 0.06, L.rgba(L.mix(BRONZE, BRONZE_LO, 0.5)), -0.45);
  tube(TAIL, 0.11, 0.06, L.rgba(L.mix(BRONZE, BRONZE_LO, 0.4)));
  // body silhouette (the profile is a closed outline incl. all four legs)
  const path = () => { ctx.beginPath(); PROFILE.forEach(([x, z], i) => { const [px, py] = Q(x, z); i ? ctx.lineTo(px, py) : ctx.moveTo(px, py); }); ctx.closePath(); };
  path();
  const [tx, ty] = Q(2.3, 2.1), [bx, by] = Q(2.3, 0.3);
  const bg = ctx.createLinearGradient(tx, ty, bx, by);
  bg.addColorStop(0, L.rgba(BRONZE_HI)); bg.addColorStop(0.28, L.rgba(L.mix(BRONZE_HI, BRONZE, 0.6)));
  bg.addColorStop(0.65, L.rgba(BRONZE)); bg.addColorStop(1, L.rgba(BRONZE_LO));
  ctx.fillStyle = bg; ctx.fill();
  ctx.save();
  ctx.clip();
  // verdigris in the recesses and a lit shoulder / rump (the sun is opposite the shadow)
  const r = L.rng(77);
  for (let i = 0; i < 14; i++) {
    const x = 0.2 + r() * 4.2, z = 0.5 + r() * 1.3;
    const [px, py] = Q(x, z), R = Math.max(0, (0.18 + r() * 0.25) * K);
    const gg = ctx.createRadialGradient(px, py, 0, px, py, R);
    gg.addColorStop(0, L.rgba(L.mix(PATINA, [150, 220, 190], 0.25), 0.55)); gg.addColorStop(1, L.rgba(PATINA, 0));
    ctx.fillStyle = gg; ctx.fillRect(px - R, py - R, 2 * R, 2 * R);
  }
  for (const [x, z, R0, al] of [[3.0, 1.85, 0.8, 0.75], [0.7, 1.5, 0.55, 0.5], [4.3, 1.05, 0.35, 0.6]]) {
    const [px, py] = Q(x - S.x * 0.15, z);
    const R = Math.max(0, R0 * K);
    const gg = ctx.createRadialGradient(px, py, 0, px, py, R);
    gg.addColorStop(0, L.rgba([255, 228, 176], al)); gg.addColorStop(0.4, L.rgba(BRONZE_HI, al * 0.4)); gg.addColorStop(1, L.rgba(BRONZE_HI, 0));
    ctx.fillStyle = gg; ctx.fillRect(px - R, py - R, 2 * R, 2 * R);
  }
  // the far legs read darker (simple depth cue): a dark band low on the body
  const lg2 = ctx.createLinearGradient(0, Q(0, 0.9)[1], 0, Q(0, 0)[1]);
  lg2.addColorStop(0, 'rgba(20,14,8,0)'); lg2.addColorStop(1, 'rgba(20,14,8,0.35)');
  ctx.fillStyle = lg2; ctx.fillRect(Q(-0.5, 2)[0] - 10, Q(0, 1)[1], (5.6) * K + 20, 2 * K);
  // a slow glint travelling along the spine on the lock
  const gk = L.prog(t, T_LOCK - 0.1, 0.9);
  if (gk > 0 && gk < 1) {
    const gx = L.lerp(0.2, 4.4, L.ease.inOutCubic(gk));
    const [px, py] = Q(gx, 1.85);
    L.lightBlob(ctx, px, py, 0.7 * K, [255, 232, 180], 0.55 * Math.sin(Math.PI * gk));
  }
  ctx.restore();
  path();
  ctx.strokeStyle = 'rgba(16,12,8,0.8)'; ctx.lineWidth = 1.3; ctx.stroke();
  // near horn (polished) + eye + nostril
  tube(HORN, 0.24, 0.07, 'rgba(18,12,8,0.85)');
  tube(HORN, 0.17, 0.05, L.rgba(L.mix(BRONZE_HI, BRONZE, 0.15)));
  tube(HORN.slice(1, 4), 0.06, 0.03, 'rgba(255,240,206,0.7)');
  tube(TAIL, 0.08, 0.04, L.rgba(L.mix(BRONZE, PATINA_LO, 0.3)));
  { const [ex, ey] = Q(4.3, 1.05); ctx.fillStyle = 'rgba(14,10,6,0.9)'; ctx.beginPath(); ctx.arc(ex, ey, Math.max(0, 0.05 * K), 0, Math.PI * 2); ctx.fill(); }
  ctx.restore();
}

let SHADOW_LAYER = null;
function shadowLayer() { return SHADOW_LAYER || (SHADOW_LAYER = new OffscreenCanvas(620, 620)); }

// convex hull (monotone chain) for the plinth's shadow
function hull(pts) {
  const p = [...pts].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const cr = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lo = [], up = [];
  for (const q of p) { while (lo.length >= 2 && cr(lo[lo.length - 2], lo[lo.length - 1], q) <= 0) lo.pop(); lo.push(q); }
  for (const q of p.reverse()) { while (up.length >= 2 && cr(up[up.length - 2], up[up.length - 1], q) <= 0) up.pop(); up.push(q); }
  return [...lo.slice(0, -1), ...up.slice(0, -1)];
}

function drawFrame(ctx, cx, cy, r, k, gt, accent) {
  if (r < 2) return;
  ctx.save();
  // drop shadow + bezel
  ctx.shadowColor = 'rgba(0,0,0,0.6)'; ctx.shadowBlur = 28;
  ctx.strokeStyle = 'rgba(14,16,22,0.95)'; ctx.lineWidth = 9;
  ctx.beginPath(); ctx.arc(cx, cy, r + 4, 0, Math.PI * 2); ctx.stroke();
  ctx.shadowBlur = 0;
  ctx.strokeStyle = L.rgba(accent, 0.9 * k); ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(cx, cy, r + 1, 0, Math.PI * 2); ctx.stroke();
  ctx.strokeStyle = `rgba(255,255,255,${0.22 * k})`; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.arc(cx, cy, Math.max(0, r - 6), 0, Math.PI * 2); ctx.stroke();
  // bezel ticks (slowly turning: secondary motion)
  ctx.strokeStyle = `rgba(235,230,222,${0.38 * k})`;
  ctx.lineWidth = 1.2;
  const rot = gt * 0.04;
  ctx.beginPath();
  for (let i = 0; i < 72; i++) {
    const a = rot + (i / 72) * Math.PI * 2, major = i % 6 === 0;
    const r0 = r + 11, r1 = r + (major ? 22 : 16);
    ctx.moveTo(cx + Math.cos(a) * r0, cy + Math.sin(a) * r0); ctx.lineTo(cx + Math.cos(a) * r1, cy + Math.sin(a) * r1);
  }
  ctx.stroke();
  ctx.restore();
}

export default {
  beat: 9,
  chapter: { num: '09', title: 'Bronze', sub: 'millions of years' },
  captions: true,
  layer: 2,
  cues(d) {
    return [
      { t: T_MARK, name: 'blip', gain: 0.22, pitch: 1.1 },
      { t: T_LEAD + 0.05, name: 'swish', gain: 0.18, pitch: 1.2 },
      { t: T_OPEN, name: 'bloom', gain: 0.26, pitch: 0.9 },
      { t: T_OPEN + 0.2, name: 'creak', gain: 0.1, pitch: 0.8 },
      { t: T_LOCK, name: 'tick', gain: 0.34, pitch: 0.9 },
      { t: T_LOCK + 0.02, name: 'deep', gain: 0.24, pitch: 0.8 },
      { t: d - 0.62, name: 'swish', gain: 0.14, pitch: 0.9 },
    ];
  },
  drawWorld(ctx, v) {
    // a warm glint where the plaza was: the bronze still there under the forest
    const t = v.t;
    const k = L.ease.outCubic(L.prog(t, T_MARK - 0.2, 0.5)) * (1 - L.prog(t, v.d + 0.4, 1.2));
    if (k <= 0 || v.cam.mpp > 2000) return;
    const x = v.wx(PLAZA.x), y = v.wy(PLAZA.y);
    glowDot(ctx, x, y, 22, [255, 200, 130], 0.45 * k);
    ctx.fillStyle = `rgba(255,230,190,${0.95 * k})`;
    ctx.beginPath(); ctx.arc(x, y, 2.4, 0, Math.PI * 2); ctx.fill();
  },
  drawOverlay(ctx, v) {
    const t = v.t;
    const px = v.wx(PLAZA.x), py = v.wy(PLAZA.y);
    // marker ring at the plaza
    const mk = L.ease.outBack(L.prog(t, T_MARK, 0.45)) * v.k;
    if (mk > 0) {
      ctx.save();
      ctx.strokeStyle = L.rgba(v.accent, 0.85 * Math.min(1, mk));
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(px, py, Math.max(0, 13 * mk), 0, Math.PI * 2); ctx.stroke();
      const pulse = ((t - T_MARK) % 1.4) / 1.4;
      if (t > T_MARK) {
        ctx.strokeStyle = L.rgba(v.accent, 0.5 * (1 - pulse) * v.k);
        ctx.beginPath(); ctx.arc(px, py, Math.max(0, 13 + 26 * L.ease.outCubic(pulse)), 0, Math.PI * 2); ctx.stroke();
      }
      ctx.restore();
    }
    // leader from the plaza to the lens edge
    const dx = px - LENS.x, dy = py - LENS.y, dl = Math.hypot(dx, dy);
    const qx = LENS.x + (dx / dl) * (LENS.r + 4), qy = LENS.y + (dy / dl) * (LENS.r + 4);
    const close = L.ease.inCubic(L.prog(t, v.d - 0.62, 0.36));
    const lk = L.prog(t, T_LEAD, 0.35) * (1 - L.prog(t, v.d - 0.3, 0.2));
    if (lk > 0) {
      const e = L.ease.outCubic(lk);
      ctx.save();
      ctx.strokeStyle = L.rgba(v.accent, 0.8 * v.k);
      ctx.lineWidth = 2;
      const sx = px + (dx / dl) * -15, sy = py + (dy / dl) * -15;
      ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(L.lerp(sx, qx, e), L.lerp(sy, qy, e)); ctx.stroke();
      ctx.restore();
    }
    // label
    L.bigLabel(ctx, { x: 64, y: 474, big: 'MILLIONS OF YEARS', small: 'bronze keeps its shape', k: v.k * L.enter(t, 0.3, 0.6), accent: v.accent, size: 76 });
    // the loupe: inflates from the leader tip, closes back into it
    const open = L.ease.outCubic(L.prog(t, T_OPEN, 0.6)) * (1 - close);
    if (open <= 0.001) return;
    const r = LENS.r * L.ease.outBack(Math.min(1, open), 1.1);
    const cx = L.lerp(qx, LENS.x, open), cy = L.lerp(qy, LENS.y, open);
    ctx.save();
    ctx.globalAlpha *= v.k * L.clamp(open * 3);
    drawLens(ctx, v, cx, cy, Math.max(0, r), L.lerp(0.6, 1, open) * (1 + 0.025 * L.prog(t, T_OPEN, v.d - T_OPEN)), t);
    drawFrame(ctx, cx, cy, Math.max(0, r), open, v.gt, v.accent);
    ctx.restore();
  },
};
