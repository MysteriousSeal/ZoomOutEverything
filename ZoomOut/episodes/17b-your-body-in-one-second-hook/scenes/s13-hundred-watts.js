// Beat 13 — "And your body runs on about a hundred watts, | like a bright old light bulb."
// The camera settles on the whole body. A thermal glow rises from the core outward (clipped to env.bodyPath): a warm
// trunk and head, cooler limbs, with a faint convection plume above the head and shoulders. On phrase 2 a refined
// filament bulb fades in beside the body (≈ 790, 600) and warms up with a flicker; the body pulses in sympathy.
// The label sits under the bulb: "≈ 100 W" / "≈ 2,000 kcal a day". The glow fades out early in beat 14.
import * as L from '../../../../engine/runtime/lib.js';
import { ACCENT, bodyPath, bodyOnScreen } from '../env.js';

const { W, H } = L;
const BX = 790, BY = 600, BR = 78;     // bulb (screen space): glass radius
const LABEL = 2.05, BULB_IN = 3.15, LIT = 3.7;

// offscreen buffers for the thermal layer (reused; the drawing is a pure function of the view)
let OBUF = null, OC = null, QBUF = null, QC = null;
function buffers() {
  if (OBUF) return;
  OBUF = new OffscreenCanvas(W, H); OC = OBUF.getContext('2d');
  QBUF = new OffscreenCanvas(W / 4, H / 4); QC = QBUF.getContext('2d');
}

const litK = (t) => {
  const p = L.prog(t, LIT, 0.35);
  if (p <= 0) return 0;
  const flick = p < 1 ? 0.55 + 0.45 * Math.abs(Math.sin(p * 23)) : 1;
  return L.ease.outCubic(p) * flick;
};

function thermalK(v) {
  const s = v.tl.scenes;
  const inK = L.ease.inOutCubic(L.prog(v.gt, s[13].start + 0.25, 1.7));
  const out = 1 - L.ease.inOutCubic(L.prog(v.gt, s[14].start + 0.2, 1.3));
  return inK * out;
}

function drawBulb(c, kIn, lit, gt) {
  if (kIn <= 0) return;
  const R = BR, x = BX, y = BY + (1 - L.ease.outCubic(kIn)) * 26;
  c.save();
  c.globalAlpha = kIn;
  // bloom behind
  if (lit > 0) {
    L.lightBlob(c, x, y, R * 4.2, [255, 170, 90], 0.5 * lit);
    L.lightBlob(c, x, y, R * 1.9, [255, 226, 170], 0.55 * lit);
  }
  // glass envelope (A-shape): globe + neck
  const nx = R * 0.4, ny = R * 1.36, a0 = Math.PI * 0.3;
  c.beginPath();
  c.arc(x, y, R, Math.PI - a0, a0 + Math.PI * 2, false);
  c.bezierCurveTo(x + Math.cos(a0) * R - R * 0.08, y + Math.sin(a0) * R + R * 0.25, x + nx, y + ny - R * 0.25, x + nx, y + ny);
  c.lineTo(x - nx, y + ny);
  c.bezierCurveTo(x - nx, y + ny - R * 0.25, x - Math.cos(a0) * R + R * 0.08, y + Math.sin(a0) * R + R * 0.25, x - Math.cos(a0) * R, y + Math.sin(a0) * R);
  c.closePath();
  const gg = c.createRadialGradient(x - R * 0.35, y - R * 0.4, R * 0.1, x, y, R * 1.3);
  gg.addColorStop(0, `rgba(255,${235 - 30 * lit},${210 - 80 * lit},${0.08 + 0.3 * lit})`);
  gg.addColorStop(1, `rgba(${120 + 135 * lit},${140 + 40 * lit},${180 - 80 * lit},${0.05 + 0.12 * lit})`);
  c.fillStyle = gg; c.fill();
  c.strokeStyle = `rgba(225,232,245,${0.55 + 0.3 * lit})`; c.lineWidth = 2.2; c.stroke();
  // specular highlight
  c.strokeStyle = 'rgba(255,255,255,0.55)'; c.lineWidth = 3; c.lineCap = 'round';
  c.beginPath(); c.arc(x, y, R * 0.8, Math.PI * 1.1, Math.PI * 1.38); c.stroke();
  // stem + lead wires
  c.strokeStyle = `rgba(200,210,225,${0.6})`; c.lineWidth = 1.5;
  c.beginPath();
  c.moveTo(x - R * 0.12, y + ny); c.lineTo(x - R * 0.1, y + R * 0.55); c.lineTo(x + R * 0.1, y + R * 0.55); c.lineTo(x + R * 0.12, y + ny);
  c.moveTo(x - R * 0.06, y + R * 0.55); c.lineTo(x - R * 0.28, y + R * 0.02);
  c.moveTo(x + R * 0.06, y + R * 0.55); c.lineTo(x + R * 0.28, y + R * 0.02);
  c.moveTo(x, y + R * 0.55); c.lineTo(x, y + R * 0.18);
  c.stroke();
  // the coiled filament between the lead tips (a helix in projection)
  const fil = () => {
    c.beginPath();
    const n = 120;
    for (let i = 0; i <= n; i++) {
      const f = i / n, px = L.lerp(-R * 0.28, R * 0.28, f), sag = Math.sin(f * Math.PI) * R * 0.12;
      const ph = f * Math.PI * 2 * 11;
      const X = x + px + Math.cos(ph) * R * 0.018, Y = y + R * 0.02 - sag + Math.sin(ph) * R * 0.05;
      i ? c.lineTo(X, Y) : c.moveTo(X, Y);
    }
  };
  fil();
  c.strokeStyle = L.rgba(L.mix([120, 84, 60], [255, 244, 214], lit)); c.lineWidth = 1.6; c.stroke();
  if (lit > 0) {
    c.save();
    c.globalCompositeOperation = 'lighter';
    c.shadowColor = 'rgba(255,190,110,1)'; c.shadowBlur = 24 * lit;
    fil(); c.strokeStyle = `rgba(255,220,160,${0.9 * lit})`; c.lineWidth = 3; c.stroke();
    c.restore();
    L.lightBlob(c, x, y + R * 0.02 - R * 0.08, R * 0.7, [255, 236, 200], 0.8 * lit);
  }
  // screw base: collar, threads, insulator, contact
  const bw = nx * 1.02, b0 = y + ny, b1 = b0 + R * 0.62;
  const mg = c.createLinearGradient(x - bw, 0, x + bw, 0);
  mg.addColorStop(0, '#5d6470'); mg.addColorStop(0.35, '#d9dee6'); mg.addColorStop(0.6, '#9aa2ae'); mg.addColorStop(1, '#4a505a');
  c.fillStyle = mg;
  L.roundRect(c, x - bw, b0, bw * 2, b1 - b0, 4); c.fill();
  c.strokeStyle = 'rgba(30,34,42,0.55)'; c.lineWidth = 1.5;
  for (let i = 1; i < 5; i++) {
    const ty = b0 + (b1 - b0) * i / 5;
    c.beginPath(); c.moveTo(x - bw, ty - 3); c.quadraticCurveTo(x, ty + 5, x + bw, ty - 1); c.stroke();
  }
  c.fillStyle = '#1b1e24';
  c.beginPath(); c.moveTo(x - bw * 0.8, b1); c.lineTo(x + bw * 0.8, b1); c.lineTo(x + bw * 0.4, b1 + R * 0.16); c.lineTo(x - bw * 0.4, b1 + R * 0.16); c.closePath(); c.fill();
  c.fillStyle = '#b8bec8';
  c.beginPath(); c.ellipse(x, b1 + R * 0.19, Math.max(0, bw * 0.28), Math.max(0, R * 0.05), 0, 0, Math.PI * 2); c.fill();
  c.restore();
  void gt;
}

export default {
  beat: 13,
  chapter: { num: '13', title: 'Body heat', sub: 'the power you run on' },
  captions: true,
  layer: 0,
  cues() {
    return [
      { t: 0.3, name: 'swell', gain: 0.24, pitch: 0.75 },
      { t: LABEL, name: 'tick', gain: 0.3, pitch: 1.0 },
      { t: BULB_IN, name: 'swish', gain: 0.16, pitch: 1.1 },
      { t: LIT - 0.02, name: 'tick', gain: 0.22, pitch: 1.6 },
      { t: LIT, name: 'bloom', gain: 0.34, pitch: 1.0 },
      { t: LIT + 0.1, name: 'shimmer', gain: 0.16, pitch: 0.9 },
    ];
  },
  drawWorld(c, v) {
    const k = thermalK(v);
    if (k <= 0 || v.cam.mpp < 4e-4 || !bodyOnScreen(v)) return;
    const X = (x) => v.wx(x), Y = (h) => v.wy(-h), S = (m) => v.ws(m);
    const sym = 0.12 * litK(v.t) * Math.max(0, Math.sin((v.t - LIT) * 2.6)) ;   // sympathy pulse with the bulb
    const grow = L.lerp(0.25, 1, L.ease.outCubic(L.prog(v.t, 0.25, 1.9)));
    // thermal image: a core-to-limb ramp drawn offscreen, then masked by a blurred body mask applied TWICE
    // (alpha × mask²): full strength in the trunk, falling off at every edge, so env's glass rim stays visible and
    // the thin limbs read cooler, as on a real thermal camera
    buffers();
    const blurPx = L.clamp(0.02 / v.cam.mpp, 4, 40);
    QC.setTransform(1, 0, 0, 1, 0, 0); QC.clearRect(0, 0, W / 4, H / 4);
    QC.filter = `blur(${(blurPx / 4).toFixed(2)}px)`;
    QC.setTransform(0.25, 0, 0, 0.25, 0, 0);
    QC.fillStyle = '#fff'; QC.beginPath(); bodyPath(QC, v); QC.fill();
    QC.filter = 'none';
    QC.setTransform(1, 0, 0, 1, 0, 0);
    OC.setTransform(1, 0, 0, 1, 0, 0);
    OC.globalCompositeOperation = 'source-over';
    OC.clearRect(0, 0, W, H);
    const wob = 1 + 0.04 * L.noise1(v.gt * 0.8, 7);
    const ka = L.clamp(k * (1 + sym));
    // trunk-centred ellipse: pale gold core → orange → red → magenta → cool violet at the hands and feet
    const tx = X(0), ty = Y(1.12), TR = S(0.62 * grow * wob);
    OC.save();
    OC.translate(tx, ty); OC.scale(1, 1.55);
    const g = OC.createRadialGradient(0, 0, 0, 0, 0, Math.max(1, TR));
    [[0, [255, 214, 150], 0.62], [0.2, [255, 156, 74], 0.56], [0.4, [232, 76, 70], 0.46], [0.62, [160, 40, 104], 0.32], [0.85, [80, 34, 128], 0.2], [1, [50, 30, 110], 0.12]]
      .forEach(([p, col, al]) => g.addColorStop(p, L.rgba(col, al * ka)));
    OC.fillStyle = g; OC.fillRect(-TR, -TR, TR * 2, TR * 2);
    OC.restore();
    // outside the ellipse: a faint cool floor so the extremities are violet, not empty
    OC.globalCompositeOperation = 'destination-over';
    OC.fillStyle = L.rgba([50, 30, 110], 0.12 * ka); OC.fillRect(0, 0, W, H);
    OC.globalCompositeOperation = 'source-over';
    // the head runs warm (brain + face)
    const hx = X(0), hy = Y(1.64), HR = S(0.13 * grow * wob);
    const hg = OC.createRadialGradient(hx, hy, 0, hx, hy, Math.max(1, HR));
    hg.addColorStop(0, L.rgba([255, 196, 120], 0.42 * ka)); hg.addColorStop(0.6, L.rgba([240, 100, 72], 0.22 * ka)); hg.addColorStop(1, L.rgba([160, 40, 100], 0));
    OC.fillStyle = hg; OC.fillRect(hx - HR, hy - HR, HR * 2, HR * 2);
    OC.globalCompositeOperation = 'destination-in';
    OC.drawImage(QBUF, 0, 0, W, H);
    OC.drawImage(QBUF, 0, 0, W, H);
    OC.globalCompositeOperation = 'source-over';
    c.save();
    c.beginPath(); bodyPath(c, v); c.clip();
    c.globalCompositeOperation = 'lighter';
    c.drawImage(OBUF, 0, 0);
    c.restore();
    // rising heat: a soft plume + a few large, very faint warm blobs drifting up off the head and shoulders
    c.save();
    c.globalCompositeOperation = 'lighter';
    const px = X(0), py = Y(1.86), pr = S(0.2);
    c.translate(px, py); c.scale(0.62, 1);
    const pg = c.createRadialGradient(0, pr * 0.35, 0, 0, 0, Math.max(1, pr));
    pg.addColorStop(0, `rgba(255,150,100,${0.07 * k})`); pg.addColorStop(1, 'rgba(255,150,100,0)');
    c.fillStyle = pg; c.fillRect(-pr, -pr, pr * 2, pr * 2);
    c.restore();
    c.save();
    for (let i = 0; i < 3; i++) {
      const ph = (v.gt * 0.28 + i / 3) % 1;
      const x0 = [0, -0.11, 0.11][i] + 0.03 * L.noise1(v.gt * 0.5 + i * 7, 3);
      const h0 = (i === 0 ? 1.72 : 1.48) + ph * 0.26;
      const al = Math.sin(Math.PI * ph) * 0.09 * k;
      if (al > 0.005) L.lightBlob(c, X(x0), Y(h0), S(0.06 + 0.07 * ph), [255, 156, 104], al);
    }
    c.restore();
  },
  drawOverlay(c, v) {
    const kIn = v.k * L.ease.outCubic(L.prog(v.t, BULB_IN, 0.5));
    drawBulb(c, kIn, litK(v.t) * v.k, v.gt);
    const k = v.k * L.prog(v.t, LABEL, 0.5);
    L.bigLabel(c, { x: 772, y: 1050, big: '≈ 100 W', small: '≈ 2,000 kcal a day', k, accent: ACCENT, align: 'center', size: 96 });   // ends at x ≈ 940 (clear of the YouTube UI)
  },
};
