// Builder E: the edge of the observable universe — the cosmic microwave background as a thin glowing, Planck-mottled
// ring at R_OBS around us, with a faint warm afterglow just inside it. Pure function of the camera.
import * as L from '../../../../engine/runtime/lib.js';

const { W, H } = L;
const N = 900, BANDS = 4;
let COLS = null;
// Planck-like temperature palette: cold blue → pale → orange → red
const RAMP = [[0, [40, 60, 160]], [0.25, [95, 140, 220]], [0.45, [210, 215, 220]], [0.6, [245, 190, 120]], [0.8, [240, 120, 55]], [1, [190, 50, 35]]];
function build() {
  if (COLS) return COLS;
  const r = L.rng(2718);
  const field = (scale) => {
    const raw = Array.from({ length: N }, () => r() * 2 - 1), out = new Float32Array(N);
    for (let i = 0; i < N; i++) {
      let s = 0, ws = 0;
      for (let k = -Math.ceil(scale * 2); k <= Math.ceil(scale * 2); k++) { const w = Math.exp(-(k * k) / (scale * scale)); s += raw[(i + k + N) % N] * w; ws += w; }
      out[i] = s / Math.sqrt(ws);
    }
    let sd = 0; for (let i = 0; i < N; i++) sd += out[i] * out[i];
    sd = Math.sqrt(sd / N);
    for (let i = 0; i < N; i++) out[i] /= sd;
    return out;
  };
  COLS = [];
  const big = field(9), mid = field(3.5);
  for (let b = 0; b < BANDS; b++) {
    const own = field(2.2), sh = b * 3;
    const row = [];
    for (let i = 0; i < N; i++) {
      const v = 0.55 * big[(i + sh) % N] + 0.6 * mid[(i + sh * 2) % N] + 0.5 * own[i];
      const t = L.clamp(0.5 + v * 0.2);
      row.push(L.rgba(L.ramp(RAMP, t), 1));
    }
    COLS.push(row);
  }
  return COLS;
}

/**
 * Draw the CMB shell. cx, cy: screen centre of the universe; r: its radius in px. k: visibility. glow: 0..1 emphasis.
 */
export function drawCMB(c, cx, cy, r, k, glow = 0) {
  if (k <= 0 || r < 4) return;
  // fully off-screen (the frame lies inside the ring, or the ring is far away)?
  const dxm = Math.max(Math.abs(cx - 0), Math.abs(cx - W)), dym = Math.max(Math.abs(cy - 0), Math.abs(cy - H));
  if (Math.hypot(dxm, dym) < r * 0.93) return;
  if (r > 60000) return;
  const cols = build();
  const th = Math.max(3.5, r * 0.022);
  c.save();
  c.globalCompositeOperation = 'lighter';
  // warm afterglow just inside the edge
  if (r < 5000) {
    const g = c.createRadialGradient(cx, cy, r * 0.8, cx, cy, r);
    g.addColorStop(0, 'rgba(255,140,80,0)');
    g.addColorStop(0.75, `rgba(255,140,80,${0.028 * k * (1 + glow)})`);
    g.addColorStop(1, `rgba(255,150,90,${0.10 * k * (1 + glow)})`);
    c.fillStyle = g;
    c.beginPath(); c.arc(cx, cy, r, 0, Math.PI * 2); c.arc(cx, cy, r * 0.8, 0, Math.PI * 2, true); c.fill();
    // outer soft halo
    c.strokeStyle = `rgba(255,140,90,${0.07 * k * (1 + glow)})`;
    c.lineWidth = th * 3.2;
    c.beginPath(); c.arc(cx, cy, r - th * 0.5, 0, Math.PI * 2); c.stroke();
  }
  // mottled band, in N segments × BANDS sub-rings
  c.globalCompositeOperation = 'source-over';
  const bw = th / BANDS;
  c.lineWidth = bw + 0.6;
  c.lineCap = 'butt';
  const da = (Math.PI * 2) / N;
  // cull segments far off-screen when the ring is large
  const big = r > 1400;
  for (let b = 0; b < BANDS; b++) {
    const rb = r - th + bw * (b + 0.5);
    c.globalAlpha = k * (b === 0 || b === BANDS - 1 ? 0.6 : 0.88) * (0.85 + 0.15 * glow);
    const row = cols[b];
    for (let i = 0; i < N; i++) {
      const a0 = i * da;
      if (big) {
        const am = a0 + da / 2, mx = cx + rb * Math.cos(am), my = cy + rb * Math.sin(am);
        if (mx < -40 || mx > W + 40 || my < -40 || my > H + 40) continue;
      }
      c.strokeStyle = row[i];
      c.beginPath(); c.arc(cx, cy, rb, a0, a0 + da + 0.002); c.stroke();
    }
  }
  c.restore();
}
