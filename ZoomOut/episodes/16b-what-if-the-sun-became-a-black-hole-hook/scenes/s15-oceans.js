// Beat 15 — "The oceans would freeze over from the top, | but under the ice, | the deep water could stay liquid for a
// very long time."
// The camera glides from the frozen street out over the quay into the ocean cross-section (env: sea body, seabed).
// An ICE LID grows down from the sea surface: snow-capped top with low pressure ridges, crystalline growth layers that
// stay where they formed (a new band every half second, like tree rings), a few cracks, a jagged skeletal underside
// with a faint shimmering freezing front. Thickness is exaggerated so it reads (footnote). Below: liquid water with
// slow currents and drifting particles, and on "the deep water could stay liquid" a faint warm glow from vents on the
// seabed (Earth's internal heat) as the camera sinks toward them.
import * as L from '../../../../engine/runtime/lib.js';
import { COAST, SEA_Y, filmScene } from '../camera.js';
import { seabedDepth } from '../env.js';

const { W, H } = L;
const TAU = Math.PI * 2;
const ICE_MAX = 420;          // m drawn (about 15x a few decades of real growth: exaggerated, see footnote)
const ICE = [214, 230, 246], ICE_DEEP = [120, 160, 200], FROST = [236, 244, 255];

const b15 = (v) => v.tl.scenes[15].start;
/** Drawn ice thickness (m) at global time gt (0 before this beat). */
function iceH(v, gt) {
  const t = gt - b15(v);
  if (t < 0.2) return 0;
  // front-loaded: about 80% by "Ice on top" (+2.3 s), full before the camera sinks (+4.2 s)
  const k = 0.35 * L.ease.outCubic(L.prog(t, 0.2, 1.2)) + 0.65 * L.ease.inOutCubic(L.prog(t, 0.8, 2.6));
  // melts away after the twist (it is off-screen by then; keeps the world consistent)
  const melt = 1 - L.ease.inOutCubic(L.prog(gt, v.tl.scenes[17].start, 3));
  return ICE_MAX * k * melt;
}
const growth = (v) => (iceH(v, v.gt + 0.05) - iceH(v, v.gt - 0.05)) / 0.1;   // m/s

// deterministic features
const CRACKS = (() => {
  const r = L.rng(1515), out = [];
  for (let i = 0; i < 26; i++) out.push({ x: 800 + r() * 14000, at: 0.25 + r() * 0.7, seed: (r() * 1e4) | 0, lean: (r() - 0.5) * 60 });
  return out;
})();
const SNOW = (() => {
  const r = L.rng(808), out = [];
  for (let i = 0; i < 220; i++) out.push({ x: 4500 + r() * 9500, d: 200 + r() * 4300, ph: r(), s: 0.6 + r() * 1.2, sp: 0.6 + r() * 0.8 });
  return out;
})();
const VENTS = [{ x: 8930, s: 1.0 }, { x: 9560, s: 0.7 }, { x: 10180, s: 0.85 }];
const STREAMS = [700, 1150, 1600, 2100, 2650, 3200];

function drawIce(c, v, alpha) {
  const h = iceH(v, v.gt);
  if (h <= 0.2) return;
  const mpp = v.cam.mpp;
  const seaX0 = v.wx(COAST);
  if (seaX0 > W + 12) return;
  const x0 = Math.max(-12, seaX0);
  const top = SEA_Y - 0.1 * h, bot = SEA_Y + 0.9 * h;
  const yt = v.wy(top), yb = v.wy(bot);
  if (yb < -40 || yt - 60 > H) return;
  const step = 6, wxOf = (sx) => v.cam.x + (sx - W / 2) * mpp;
  const cols = [];
  for (let sx = x0; sx <= W + 12; sx += step) cols.push(sx);
  const hpx = (yb - yt);
  // ridged top (snow) and skeletal underside, in metres scaled with thickness
  const topAt = (x) => yt - Math.max(0, L.noise1(x / 900, 11)) * 0.12 * hpx - Math.max(0, L.noise1(x / 160, 12)) * 0.05 * hpx;
  // grounded on the shallow shelf near the quay: the lid never reaches below the seabed (no floating slab at the coast)
  const botAt = (x) => Math.min(yb + (0.06 * L.noise1(x / 420, 13) + 0.04 * Math.abs(L.noise1(x / 55, 14))) * hpx,
    Math.max(yt + 2, v.wy(seabedDepth(x) - 2)));
  c.save();
  c.globalAlpha = alpha;
  // body
  c.beginPath();
  cols.forEach((sx, i) => { const y = topAt(wxOf(sx)); if (i) c.lineTo(sx, y); else c.moveTo(sx, y); });
  for (let i = cols.length - 1; i >= 0; i--) c.lineTo(cols[i], botAt(wxOf(cols[i])));
  c.closePath();
  const g = c.createLinearGradient(0, yt, 0, yb + 0.1 * hpx);
  g.addColorStop(0, L.rgba(FROST, 0.97));
  g.addColorStop(0.12, L.rgba(ICE, 0.93));
  g.addColorStop(0.7, L.rgba(L.mix(ICE, ICE_DEEP, 0.55), 0.88));
  g.addColorStop(1, L.rgba(ICE_DEEP, 0.78));
  c.fillStyle = g;
  c.fill();
  c.save();
  c.clip();
  // growth layers: each band sits at the depth the ice had reached when it formed
  const b = b15(v);
  if (hpx > 10) {
    c.lineWidth = 1;
    for (let tt = b + 0.5; tt < v.gt; tt += 0.45) {
      const hh = iceH(v, tt);
      if (hh < 3) continue;
      const y = v.wy(top + hh);
      if (y > yb - 1.5) break;
      c.strokeStyle = `rgba(150,185,220,${0.38})`;
      c.beginPath();
      cols.forEach((sx, i) => { const yy = y + L.noise1(wxOf(sx) / 700 + tt, 15) * 2.5; if (i) c.lineTo(sx, yy); else c.moveTo(sx, yy); });
      c.stroke();
    }
  }
  // cracks
  const fk = h / ICE_MAX;
  c.lineCap = 'round';
  for (const cr of CRACKS) {
    const sx = v.wx(cr.x);
    if (sx < x0 - 40 || sx > W + 40) continue;
    const ck = L.clamp((fk - cr.at) / 0.15);
    if (ck <= 0) continue;
    const r = L.rng(cr.seed);
    c.beginPath();
    let px = sx, py = yt - 4;
    c.moveTo(px, py);
    const n = 6, len = (yb - yt + 10) * ck;
    for (let i = 1; i <= n; i++) {
      py = yt - 4 + (len * i) / n;
      px = sx + (cr.lean / mpp) * 0.02 * i + (r() - 0.5) * 0.12 * hpx;
      c.lineTo(px, py);
    }
    c.strokeStyle = 'rgba(90,120,160,0.55)'; c.lineWidth = 1.6; c.stroke();
    c.strokeStyle = 'rgba(255,255,255,0.5)'; c.lineWidth = 0.7; c.stroke();
  }
  // crystalline glints near the top
  const r = L.rng(707);
  for (let i = 0; i < 70; i++) {
    const wx = r() * 16000, dep = r(), ph = r();
    const sx = v.wx(wx);
    if (sx < x0 || sx > W) continue;
    const sy = L.lerp(yt, yb, 0.08 + dep * 0.8);
    const tw = Math.pow(Math.max(0, Math.sin(TAU * (v.gt * 0.5 + ph))), 10);
    if (tw < 0.05) continue;
    L.lightBlob(c, sx, sy, 6 + 6 * tw, [240, 250, 255], 0.6 * tw);
  }
  // keep the HUD band readable: a dark scrim over the ice where it rises under the top bar
  if (yt < 450) {
    const sg = c.createLinearGradient(0, 340, 0, 450);
    sg.addColorStop(0, 'rgba(6,10,22,0.82)'); sg.addColorStop(1, 'rgba(6,10,22,0)');
    c.fillStyle = sg; c.fillRect(0, 0, W, 450);
  }
  c.restore();
  // snow line on the top edge
  c.strokeStyle = L.rgba([250, 252, 255], 0.85 * L.clamp((yt - 330) / 140, 0.12, 1));   // dims under the HUD
  c.lineWidth = Math.max(1.2, Math.min(3, hpx * 0.03));
  c.beginPath();
  cols.forEach((sx, i) => { const y = topAt(wxOf(sx)); if (i) c.lineTo(sx, y); else c.moveTo(sx, y); });
  c.stroke();
  // the freezing front: a faint shimmering line on the underside while the ice is still growing
  const gr = L.clamp(growth(v) / 120);
  if (gr > 0.02) {
    c.globalCompositeOperation = 'lighter';
    c.strokeStyle = `rgba(190,225,255,${0.45 * gr})`;
    c.lineWidth = 2;
    c.beginPath();
    cols.forEach((sx, i) => { const y = botAt(wxOf(sx)) + 1; if (i) c.lineTo(sx, y); else c.moveTo(sx, y); });
    c.stroke();
    // skeletal crystals hanging from the underside
    c.strokeStyle = `rgba(210,235,255,${0.35 * gr})`;
    c.lineWidth = 1;
    c.beginPath();
    for (let i = 0; i < cols.length; i += 2) {
      const sx = cols[i], x = wxOf(sx), y = botAt(x);
      const len = (4 + 10 * Math.abs(L.noise1(x / 37, 16))) * Math.min(1, hpx / 40);
      c.moveTo(sx, y); c.lineTo(sx + L.noise1(x / 19, 17) * 3, y + len);
    }
    c.stroke();
  }
  c.restore();
  return { yb, hpx };
}

function drawWater(c, v, alpha) {
  const t = v.t, mpp = v.cam.mpp;
  const h = iceH(v, v.gt);
  const iceBot = SEA_Y + 0.9 * h;
  const step = 8, wxOf = (sx) => v.cam.x + (sx - W / 2) * mpp;
  const seaX0 = v.wx(COAST);
  const k = alpha * L.ease.inOutCubic(L.prog(t, 1.2, 1.8));
  if (k <= 0.01) return;
  c.save();
  c.globalCompositeOperation = 'lighter';
  // slow currents: thin streamlines that drift, broken where they would cross rock or ice
  c.setLineDash([26, 18]);
  c.lineCap = 'round';
  STREAMS.forEach((d0, j) => {
    c.lineDashOffset = -(v.gt * (14 + j * 3)) * (j % 2 ? -1 : 1);
    c.strokeStyle = `rgba(110,180,225,${0.16 * k})`;
    c.lineWidth = 1.6;
    c.beginPath();
    let open = false;
    for (let sx = Math.max(-12, seaX0); sx <= W + 12; sx += step) {
      const x = wxOf(sx);
      const d = d0 + 90 * Math.sin(x / 1400 + j * 1.7 + v.gt * 0.25) + 40 * L.noise1(x / 500 + j, 21);
      const ok = d > iceBot + 60 && d < seabedDepth(x) - 80;
      const y = v.wy(d);
      if (!ok) { open = false; continue; }
      if (open) c.lineTo(sx, y); else { c.moveTo(sx, y); open = true; }
    }
    c.stroke();
  });
  c.setLineDash([]);
  // drifting particles (marine snow)
  for (const p of SNOW) {
    const d = p.d + ((v.gt * 6 * p.sp) % 400) - 200 + 30 * Math.sin(v.gt * 0.4 + p.ph * TAU);
    const x = p.x + 60 * Math.sin(v.gt * 0.2 + p.ph * 9);
    if (d < iceBot + 20 || d > seabedDepth(x) - 10) continue;
    const sx = v.wx(x), sy = v.wy(d);
    if (sx < -4 || sx > W + 4 || sy < -4 || sy > H + 4) continue;
    c.fillStyle = `rgba(190,220,240,${0.35 * k * (0.5 + 0.5 * Math.sin(v.gt + p.ph * 20))})`;
    c.beginPath(); c.arc(sx, sy, Math.max(0, 1.2 * p.s), 0, TAU); c.fill();
  }
  c.restore();
}

function drawVents(c, v, alpha) {
  const k = alpha * L.ease.inOutCubic(L.prog(v.t, 4.4, 1.6));
  if (k <= 0.01) return;
  c.save();
  c.globalCompositeOperation = 'lighter';
  // a faint warmth along the deep seabed
  const step = 10, wxOf = (sx) => v.cam.x + (sx - W / 2) * v.cam.mpp;
  c.lineWidth = 10;
  c.strokeStyle = `rgba(255,130,60,${0.08 * k})`;
  c.beginPath();
  let open = false;
  for (let sx = -10; sx <= W + 10; sx += step) {
    const x = wxOf(sx);
    if (x < 6000) { open = false; continue; }
    const y = v.wy(seabedDepth(x)) - 3;
    if (open) c.lineTo(sx, y); else { c.moveTo(sx, y); open = true; }
  }
  c.stroke();
  for (const vt of VENTS) {
    const sx = v.wx(vt.x), sy = v.wy(seabedDepth(vt.x));
    if (sx < -200 || sx > W + 200 || sy < -200 || sy > H + 200) continue;
    const s = vt.s / v.cam.mpp;   // per-metre scale
    L.lightBlob(c, sx, sy, 520 * s * (1 + 0.06 * Math.sin(v.gt * 1.3 + vt.x)), [255, 120, 50], 0.38 * k);
    L.lightBlob(c, sx, sy, 140 * s, [255, 200, 120], 0.42 * k);
    // shimmering plume: soft rising blobs
    for (let i = 0; i < 7; i++) {
      const u = (v.gt * 0.18 + i / 7 + vt.x * 0.001) % 1;
      const px = sx + L.noise1(u * 3 + i, vt.x) * 50 * s, py = sy - u * 520 * s;
      L.lightBlob(c, px, py, (50 + 110 * u) * s, [255, 150, 90], 0.2 * k * Math.sin(Math.PI * u));
    }
  }
  c.restore();
}

export default filmScene({
  beat: 15,
  chapter: { num: '15', title: 'Ice on top', sub: 'liquid water underneath' },
  captions: true,
  layer: 1,
  cues() {
    // beat starts 62.21: P1 0.15–2.42, P2 3.02–4.10, P3 4.70–7.71; camera sinks at +4.2
    return [
      { t: 0.35, name: 'creak', gain: 0.3, pitch: 0.8 },       // the sea skins over
      { t: 1.2, name: 'shimmer', gain: 0.2, pitch: 1.5 },      // crystals
      { t: 2.1, name: 'creak', gain: 0.24, pitch: 0.65 },      // the lid thickens; "Ice on top" lands
      { t: 2.3, name: 'tick', gain: 0.2, pitch: 1.0 },
      { t: 3.1, name: 'bubbles', gain: 0.22, pitch: 0.8 },     // "under the ice": the water moves
      { t: 4.25, name: 'dive', gain: 0.24, pitch: 0.7 },       // the camera sinks
      { t: 4.9, name: 'deep', gain: 0.3, pitch: 0.8 },         // the deep, warm vents
      { t: 6.0, name: 'sonar', gain: 0.14, pitch: 0.8 },
    ];
  },
  drawWorld(c, v) {
    const mpp = v.cam.mpp;
    if (mpp > 140 || v.gt < b15(v)) return;
    if (Math.hypot(v.cam.x, v.cam.y) > 5e6) return;
    const alpha = 1 - L.clamp(L.invLerp(Math.log(40), Math.log(140), Math.log(mpp)));
    if (alpha <= 0.01) return;
    if (mpp > 1) { drawVents(c, v, alpha); drawWater(c, v, alpha); }
    drawIce(c, v, alpha);
  },
  drawOverlay(c, v) {
    // the warm seabed glow, named so it does not read as fire: "Earth's inner heat" over the middle vent
    {
      const vt = VENTS[1];
      const sx = v.wx(vt.x), sy = v.wy(seabedDepth(vt.x));
      const tk = v.k * L.enter(v.t, 5.0, 0.5) * (v.cam.mpp > 1 && v.cam.mpp < 40 ? 1 : 0);
      const ty = Math.min(sy - 150, 1180);
      if (tk > 0.01 && sx > 120 && sx < 860 && ty > 420) {
        c.save();
        c.globalAlpha = tk;
        c.strokeStyle = 'rgba(255,196,150,0.55)';
        c.lineWidth = 1.5;
        c.beginPath(); c.moveTo(sx, sy - 40); c.lineTo(sx, ty + 14 + (1 - L.clamp(tk)) * 30); c.stroke();
        c.font = L.font(22, 600, L.FONT.body);
        c.fillStyle = 'rgba(255,222,196,0.95)';
        c.shadowColor = 'rgba(0,0,0,0.8)'; c.shadowBlur = 10;
        c.textBaseline = 'alphabetic';
        L.trackedText(c, "EARTH'S INNER HEAT", sx, ty, 4, 'center');
        c.restore();
      }
    }
    const lk = L.enter(v.t, 2.1, 0.55) * v.k;
    // the label sits in the liquid water just under the ice lid, so it follows the lid as the camera sinks
    const ly = L.clamp(v.wy(SEA_Y + 0.9 * iceH(v, v.gt)) + 175, 700, 900);
    L.bigLabel(c, { x: 90, y: ly, big: 'Ice on top', small: 'liquid water below', k: lk, accent: v.accent, size: 96 });
    // footnote: the ice is drawn thicker than it would be
    const h = iceH(v, v.gt);
    if (h > 20 && v.cam.mpp > 1 && v.cam.mpp < 40) {
      const yb = v.wy(SEA_Y + 0.9 * h) + 40;
      const fk = v.k * L.enter(v.t, 2.6, 0.5) * L.clamp(L.invLerp(560, 640, yb)) * (1 - L.clamp(L.invLerp(1150, 1240, yb)));
      if (fk > 0.01) {
        c.save();
        c.globalAlpha = fk;
        c.font = L.font(19, 600, L.FONT.body);
        c.fillStyle = 'rgba(200,215,235,0.75)';
        c.shadowColor = 'rgba(0,0,0,0.6)'; c.shadowBlur = 6;
        L.trackedText(c, 'ICE THICKNESS EXAGGERATED', 930, yb, 2.5, 'right');
        c.restore();
      }
    }
  },
});
