// Beat 29: Every point of light here is a galaxy.
// Builder E. A circular magnifier on one point of the web, opening onto a spiral galaxy.
import * as L from '../../../../engine/runtime/lib.js';
import { level, MLY } from '../layers/e-model.js';
import { toScreen } from '../layers/e-laniakea.js';
import { kin, text, INK, SUB } from '../layers/e-ui.js';

const { W, H } = L;
const INSET = { x: 1390, y: 318, r: 128 };

// the chosen point: the brightest galaxy-point near a fixed spot of the web (deterministic)
let PICK = null;
function pick() {
  if (PICK) return PICK;
  const o = level(2), T = [2050, -1250];   // L1 level (the points drawn at this scale)
  let best = -1, bi = 0;
  for (let i = 0; i < o.n; i++) {
    const dx = o.X[i] - T[0], dy = o.Y[i] - T[1];
    if (dx * dx + dy * dy > 220 * 220) continue;
    if (o.Wt[i] > best) { best = o.Wt[i]; bi = i; }
  }
  PICK = [o.X[bi], o.Y[bi]];
  return PICK;
}

// a detailed spiral (rendered once): two log-spiral arms of stars and pink HII knots, dust lanes, a warm bulge
let SPIRAL = null;
function spiral() {
  if (SPIRAL) return SPIRAL;
  const S = 360, cv = new OffscreenCanvas(S, S), c = cv.getContext('2d'), r = L.rng(808);
  c.translate(S / 2, S / 2);
  c.globalCompositeOperation = 'lighter';
  const blob = (x, y, rad, col, a) => {
    const g = c.createRadialGradient(x, y, 0, x, y, rad);
    g.addColorStop(0, L.rgba(col, a)); g.addColorStop(1, L.rgba(col, 0));
    c.fillStyle = g; c.fillRect(x - rad, y - rad, rad * 2, rad * 2);
  };
  blob(0, 0, 165, [150, 170, 230], 0.12);
  for (let arm = 0; arm < 2; arm++) {
    for (let i = 0; i < 2600; i++) {
      const f = Math.pow(r(), 0.8), th = arm * Math.PI + f * 3.3 * Math.PI * 0.5 * 1.9;
      const rad = 18 + 150 * f;
      const sp = (0.06 + 0.12 * f) * rad;
      const x = rad * Math.cos(th) + (r() - 0.5) * sp * 2, y = rad * Math.sin(th) + (r() - 0.5) * sp * 2;
      const u = r();
      if (u < 0.06) blob(x, y, 2.6, [255, 140, 190], 0.55);
      else blob(x, y, 1.4 + r() * 1.6, u < 0.5 ? [190, 210, 255] : [235, 235, 250], 0.32 * (1 - f * 0.5));
    }
  }
  for (let i = 0; i < 1600; i++) {   // disc haze
    const rr = 160 * Math.sqrt(r()), th = r() * Math.PI * 2;
    blob(rr * Math.cos(th), rr * Math.sin(th), 1.6, [210, 220, 255], 0.12);
  }
  blob(0, 0, 60, [255, 220, 170], 0.5);
  blob(0, 0, 26, [255, 236, 200], 0.9);
  blob(0, 0, 9, [255, 250, 240], 1);
  // dust lanes (darken along the inner edge of the arms)
  c.globalCompositeOperation = 'source-over';
  for (let arm = 0; arm < 2; arm++) {
    for (let i = 0; i < 700; i++) {
      const f = Math.pow(r(), 0.9), th = arm * Math.PI + f * 3.135 - 0.22;
      const rad = 22 + 130 * f;
      const x = rad * Math.cos(th) + (r() - 0.5) * 4, y = rad * Math.sin(th) + (r() - 0.5) * 4;
      c.fillStyle = `rgba(20,10,8,${0.12 * (1 - f)})`;
      c.beginPath(); c.arc(x, y, 2.5 + 3 * r(), 0, Math.PI * 2); c.fill();
    }
  }
  SPIRAL = cv;
  return cv;
}

function drawOverlay(c, v) {
  const t = v.t;
  const k = kin(t, 0.35, 0.7) * v.k;
  if (k <= 0) return;
  const [px, py] = toScreen(v, pick());
  const { x, y, r } = INSET;
  const e = L.ease.outCubic(k);
  c.save();
  // the picked point: a small ring
  c.globalAlpha = Math.min(1, k * 1.5);
  c.strokeStyle = 'rgba(0,0,0,0.6)'; c.lineWidth = 3.5;
  c.beginPath(); c.arc(px, py, 9, 0, Math.PI * 2); c.stroke();
  c.strokeStyle = L.rgba(INK, 0.95); c.lineWidth = 1.6;
  c.beginPath(); c.arc(px, py, 9, 0, Math.PI * 2); c.stroke();
  // two tangent lines from the point's ring to the inset (a magnifier cone)
  const dx = x - px, dy = y - py, d = Math.hypot(dx, dy), a = Math.atan2(dy, dx);
  const rr = r * e;
  const off = Math.asin(Math.min(0.99, (rr - 9) / d));
  c.strokeStyle = L.rgba(INK, 0.45); c.lineWidth = 1.4;
  for (const sgn of [-1, 1]) {
    const b = a + sgn * (Math.PI / 2 + off);
    c.beginPath();
    c.moveTo(px + 9 * Math.cos(b), py + 9 * Math.sin(b));
    c.lineTo(px + dx * e + rr * Math.cos(b), py + dy * e + rr * Math.sin(b));
    c.stroke();
  }
  // the inset
  const cx = px + dx * e, cy = py + dy * e;
  c.save();
  c.beginPath(); c.arc(cx, cy, rr, 0, Math.PI * 2); c.clip();
  c.fillStyle = 'rgba(3,5,10,0.96)'; c.fillRect(cx - rr, cy - rr, rr * 2, rr * 2);
  const sp = spiral(), s = (rr * 1.55) / sp.width;
  c.translate(cx, cy); c.rotate(-0.5 + t * 0.03); c.scale(s, s * 0.78);
  c.globalAlpha = Math.min(1, k * 1.2);
  c.drawImage(sp, -sp.width / 2, -sp.height / 2);
  c.restore();
  c.strokeStyle = 'rgba(0,0,0,0.6)'; c.lineWidth = 4;
  c.beginPath(); c.arc(cx, cy, rr, 0, Math.PI * 2); c.stroke();
  c.strokeStyle = L.rgba(INK, 0.9); c.lineWidth = 2;
  c.beginPath(); c.arc(cx, cy, rr, 0, Math.PI * 2); c.stroke();
  c.restore();
  const tk = L.clamp((k - 0.5) / 0.5);
  text(c, 'A SPIRAL GALAXY', x, y + r + 34, { size: 20, align: 'center', alpha: tk });
  text(c, '~100,000 LIGHT-YEARS ACROSS', x, y + r + 60, { size: 16, weight: 600, color: SUB, track: 2, align: 'center', alpha: tk });
}

export default {
  beat: 29,
  chapter: null,
  cues() {
    return [
      { t: 0.35, name: 'ping', gain: 0.18, pitch: 1.0 },
      { t: 0.45, name: 'bloom', gain: 0.16, pitch: 0.9 },
    ];
  },
  drawOverlay,
};
