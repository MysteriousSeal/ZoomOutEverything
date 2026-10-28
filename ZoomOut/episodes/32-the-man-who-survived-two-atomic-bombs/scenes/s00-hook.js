// Beat 0 — "He survived the atomic bomb on Hiroshima. | Three days later, he was in Nagasaki."
// Headline HE SURVIVED / HIROSHIMA. on FRAME 1 (overlayIn false, no captions), over the map of western Japan with
// both cities marked (env). Phrase 1: THEN NAGASAKI. rises in as line 3, the Nagasaki pin lights, and a dashed arc
// draws from Hiroshima to Nagasaki tagged 3 DAYS LATER. Everything fades out just before the beat ends.
import * as L from '../../../../engine/runtime/lib.js';
import { ACC, IVORY, PLATE, geo, HIRO, NAGA, moments, B, tw, txt } from '../env.js';

const { W } = L;
const MAXW = 940, TOP = 340;
const L1 = [['HE SURVIVED', null]];
const L2 = [['HIROSHIMA.', 'acc']];
const L3 = [['THEN ', null], ['NAGASAKI.', 'acc']];
const s = (p) => p.map((q) => q[0]).join('');

export default {
  beat: 0,
  chapter: null,
  captions: false,
  overlayIn: false,
  layer: 5,
  cues() { return []; },
  drawOverlay(c, v) {
    const tl = v.tl, m = moments(tl);
    const kk = 1 - L.ease.inCubic(L.prog(v.gt, B(tl, 1) - 0.34, 0.3));
    if (kk <= 0) return;
    c.save();
    c.globalAlpha = kk;
    // scrim behind the headline band
    const g = c.createLinearGradient(0, 0, 0, 900);
    g.addColorStop(0, 'rgba(6,10,20,0.5)'); g.addColorStop(0.35, 'rgba(6,10,20,0.55)'); g.addColorStop(0.7, 'rgba(6,10,20,0.32)'); g.addColorStop(1, 'rgba(6,10,20,0)');
    c.fillStyle = g; c.fillRect(0, 0, W, 900);
    const size = Math.min(...[L1, L2, L3].map((p) => L.fitSize(c, s(p), MAXW, 150, 800, L.FONT.display, 60)));
    const b1 = TOP + size * 0.76, b2 = b1 + size * 0.98, b3 = b2 + size * 0.98;
    c.font = L.font(size, 800, L.FONT.display);
    c.textBaseline = 'alphabetic';
    const draw = (parts, y, a = 1, dy = 0) => {
      let x = W / 2 - c.measureText(s(parts)).width / 2;
      c.save();
      c.globalAlpha *= a;
      for (const [t, col] of parts) {
        c.shadowColor = 'rgba(0,0,0,0.7)'; c.shadowBlur = 22;
        c.fillStyle = col ? L.rgba(ACC) : L.rgba(IVORY);
        c.fillText(t, x, y + dy);
        x += c.measureText(t).width;
      }
      c.restore();
    };
    draw(L1, b1);
    draw(L2, b2);
    const k3 = L.ease.outCubic(L.prog(v.gt, m.hookCity2 - 0.05, 0.4));
    if (k3 > 0) draw(L3, b3, k3, (1 - k3) * 26);

    // the arc Hiroshima → Nagasaki, 3 DAYS LATER
    const ak = L.ease.inOutCubic(L.prog(v.gt, m.hookCity2, 0.9));
    if (ak > 0) {
      const a = geo(v, HIRO.lat, HIRO.lon), b = geo(v, NAGA.lat, NAGA.lon);
      const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
      const nx = -(b.y - a.y), ny = b.x - a.x, nl = Math.hypot(nx, ny);
      const bend = 0.22 * Math.hypot(b.x - a.x, b.y - a.y);
      const cx = mx + (nx / nl) * bend, cy = my + (ny / nl) * bend;
      const q = (t) => ({ x: (1 - t) ** 2 * a.x + 2 * (1 - t) * t * cx + t * t * b.x, y: (1 - t) ** 2 * a.y + 2 * (1 - t) * t * cy + t * t * b.y });
      c.save();
      c.strokeStyle = L.rgba(ACC, 0.9); c.lineWidth = 3; c.setLineDash([10, 9]); c.lineCap = 'round';
      c.beginPath();
      const n = 40;
      for (let i = 0; i <= n * ak; i++) { const p = q(i / n); if (i === 0) c.moveTo(p.x, p.y); else c.lineTo(p.x, p.y); }
      const pe = q(ak); c.lineTo(pe.x, pe.y);
      c.stroke();
      c.setLineDash([]);
      // the travelling head
      L.lightBlob(c, pe.x, pe.y, 30, ACC, 0.6 * (1 - L.prog(ak, 0.95, 0.05)));
      c.restore();
      // tag at the arc's middle
      const tk = L.ease.outBack(L.prog(v.gt, m.hookCity2 + 0.45, 0.4), 1.4);
      if (tk > 0) {
        const p = q(0.5);
        const label = '3 DAYS LATER', f = L.font(30, 700, L.FONT.display);
        const w = tw(c, label, f, 3) + 40, h = 50;
        c.save();
        c.translate(p.x, p.y - 4);
        c.scale(L.lerp(0.7, 1, L.clamp(tk)), L.lerp(0.7, 1, L.clamp(tk)));
        c.globalAlpha *= L.clamp(tk * 4);
        c.shadowColor = 'rgba(0,0,0,0.5)'; c.shadowBlur = 16;
        c.fillStyle = L.rgba(PLATE);
        L.roundRect(c, -w / 2, -h / 2, w, h, h / 2); c.fill();
        c.shadowBlur = 0;
        c.strokeStyle = L.rgba(ACC, 0.8); c.lineWidth = 2; c.stroke();
        txt(c, label, 0, 2, f, IVORY, { track: 3, align: 'center', base: 'middle' });
        c.restore();
      }
    }
    c.restore();
  },
};
