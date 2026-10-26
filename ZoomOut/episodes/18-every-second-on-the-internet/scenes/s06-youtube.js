// Beat 6 — "Meanwhile, about eight hours of new video land on YouTube."
// The camera pulls out from the block to the city of screens. Over it, one refined, generic video timeline (a glass
// panel: play glyph, timecode, eight hour segments) fills to 8:00:00 in about a second, synced to "eight hours".
// Uploads stream in from the lit screens across the city as light motes that curve into the playhead.
// Label "8 hours" / "of new video every second".
import * as L from '../../../../engine/runtime/lib.js';
import { ACCENT, SCREEN, WARM } from '../env.js';

const ACC = ACCENT;
const BX0 = 168, BX1 = 912, BY = 968;          // track
const PX0 = 120, PX1 = 952, PY0 = 846, PY1 = 1010;   // glass panel
const HOURS = 8;

function times(tl) {
  const s = tl.scenes[6].start, ph = tl.lines[6].phrases[0];
  const at = (f) => ph.start + (ph.end - ph.start) * f;
  const eight = at(0.296), hours = at(0.39);   // "eight", "hours"
  return { s, end: tl.scenes[6].end, panel: s + 0.62, fill0: eight - 0.22, fill1: hours + 0.32, label: hours - 0.02 };
}
const fillAt = (gt, T) => L.ease.inOutCubic(L.prog(gt, T.fill0, T.fill1 - T.fill0));
const headX = (f) => L.lerp(BX0, BX1, f);

function timecode(hrs) {
  const s = Math.round(hrs * 3600);
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), ss = s % 60;
  return `${h}:${String(m).padStart(2, '0')}:${String(ss).padStart(2, '0')}`;
}

// upload motes: deterministic start points over the city, launch times, flight durations
const MOTES = (() => {
  const r = L.rng(606), out = [];
  for (let i = 0; i < 90; i++) {
    let x, y;
    // anywhere over the city, but not under the label, the panel or the caption band
    do { x = 40 + r() * 1000; y = 660 + r() * 860; } while ((y > PY0 - 60 && y < PY1 + 60 && x > PX0 - 40 && x < PX1 + 40) || (y > 1250 && y < 1420));
    const late = i >= 60;
    out.push({ x, y, launch: late ? 1.1 + r() * 2.0 : r() * 1.1, dur: 0.75 + r() * 0.35, bend: (r() - 0.5) * 300, warm: r() < 0.35, sz: 1.6 + r() * 1.3 });
  }
  return out;
})();

/** 0 inside the caption band (y 1265-1405), easing back to 1 by 1240 / 1430. */
const capK = (y) => Math.max(L.clamp((1265 - y) / 25), L.clamp((y - 1405) / 25));
const bez = (a, b, c2, t) => (1 - t) * (1 - t) * a + 2 * (1 - t) * t * b + t * t * c2;

export default {
  beat: 6,
  chapter: { num: '06', title: 'New video', sub: 'Uploaded to YouTube' },
  captions: true,
  layer: 0,
  cues(d) {
    return [
      { t: 0.6, name: 'shimmer', gain: 0.14, pitch: 0.9 },
      { t: 0.95, name: 'riser', gain: 0.14, pitch: 1.3 },
      { t: 1.08, name: 'count', gain: 0.2, pitch: 1.0 },
      { t: 1.44, name: 'ping', gain: 0.24, pitch: 1.05 },
      { t: 1.82, name: 'impact', gain: 0.2, pitch: 1.25 },
      { t: 1.86, name: 'bloom', gain: 0.16, pitch: 1.0 },
    ];
  },

  drawOverlay(c, v) {
    const T = times(v.tl);
    const gt = v.gt;
    const pk = v.k * L.ease.outCubic(L.prog(gt, T.panel, 0.5));
    if (pk <= 0.001) return;
    const f = fillAt(gt, T);
    const done = L.prog(gt, T.fill1, 0.01);
    const hx = headX(f);
    const lift = (1 - L.ease.outCubic(L.prog(gt, T.panel, 0.55))) * 26;

    // ---- upload motes (behind the panel), from the city's screens into the playhead
    c.save();
    c.globalCompositeOperation = 'lighter';
    c.lineCap = 'round';
    for (const m of MOTES) {
      const t0 = T.fill0 - 0.75 + m.launch;
      const u = L.prog(gt, t0, m.dur);
      if (u <= 0 || u >= 1) continue;
      const arrive = t0 + m.dur;
      const tx = headX(fillAt(arrive, T)), ty = BY;
      const cx = (m.x + tx) / 2 + m.bend, cy = (m.y + ty) / 2 + (m.y < ty ? -40 : 40);
      const a = pk * L.clamp(u * 5) * L.clamp((1 - u) * 6);
      const col = m.warm ? WARM : SCREEN;
      const e = L.ease.inOutCubic(u);
      const tail = 0.16;
      c.lineWidth = m.sz;
      // trail, segment by segment, so any stretch crossing the caption band fades out
      let px = 0, py = 0;
      for (let q = 0; q <= 8; q++) {
        const tt = Math.max(0, e - tail * (1 - q / 8));
        const x = bez(m.x, cx, tx, tt), y = bez(m.y, cy, ty, tt);
        if (q) {
          const sa = 0.75 * a * capK((y + py) / 2);
          if (sa > 0.01) {
            c.strokeStyle = L.rgba(col, sa);
            c.beginPath(); c.moveTo(px, py); c.lineTo(x, y); c.stroke();
          }
        }
        px = x; py = y;
      }
      const x = bez(m.x, cx, tx, e), y = bez(m.y, cy, ty, e);
      c.fillStyle = L.rgba([235, 245, 255], 0.9 * a * capK(y));
      c.beginPath(); c.arc(x, y, Math.max(0, m.sz * 1.3), 0, Math.PI * 2); c.fill();
      // the source screen flares as it sends
      if (u < 0.3) L.lightBlob(c, m.x, m.y, 16, col, 0.6 * a * (1 - u / 0.3));
    }
    c.restore();

    c.save();
    c.translate(0, lift);
    c.globalAlpha = pk;

    // ---- glass panel
    c.save();
    c.shadowColor = 'rgba(0,0,0,0.6)';
    c.shadowBlur = 40;
    c.fillStyle = 'rgba(6,10,19,0.72)';
    L.roundRect(c, PX0, PY0, PX1 - PX0, PY1 - PY0, 20);
    c.fill();
    c.restore();
    const pg = c.createLinearGradient(0, PY0, 0, PY1);
    pg.addColorStop(0, 'rgba(255,255,255,0.13)');
    pg.addColorStop(1, 'rgba(255,255,255,0.03)');
    c.strokeStyle = pg;
    c.lineWidth = 1.5;
    L.roundRect(c, PX0 + 0.5, PY0 + 0.5, PX1 - PX0 - 1, PY1 - PY0 - 1, 20);
    c.stroke();

    // ---- play glyph (a drawn triangle) + timecode
    const gy = 902;
    c.fillStyle = L.rgba([235, 242, 252], 0.95);
    c.beginPath();
    c.moveTo(BX0 + 2, gy - 17); c.lineTo(BX0 + 30, gy); c.lineTo(BX0 + 2, gy + 17); c.closePath();
    c.fill();
    c.font = L.font(50, 700, L.FONT.din);
    c.textBaseline = 'alphabetic';
    c.fillStyle = done > 0 ? L.rgba(L.mix([255, 255, 255], [150, 205, 255], done)) : '#fff';
    c.textAlign = 'right';
    c.fillText(timecode(f * HOURS), BX1, gy + 18);
    c.textAlign = 'left';

    // ---- track, buffer, hour segments
    const tw = BX1 - BX0;
    c.fillStyle = 'rgba(255,255,255,0.12)';
    L.roundRect(c, BX0, BY - 4, tw, 8, 4); c.fill();
    const buf = Math.min(1, f + 0.09 * (1 - done));
    c.fillStyle = 'rgba(255,255,255,0.16)';
    if (buf > 0) { L.roundRect(c, BX0, BY - 4, tw * buf, 8, 4); c.fill(); }
    if (f > 0) {
      const fg = c.createLinearGradient(BX0, 0, hx, 0);
      fg.addColorStop(0, L.rgba([40, 110, 210]));
      fg.addColorStop(1, L.rgba([140, 205, 255]));
      c.fillStyle = fg;
      L.roundRect(c, BX0, BY - 4, Math.max(8, tw * f), 8, 4); c.fill();
    }
    // hour ticks (light up as the fill passes) + segment gaps
    for (let i = 0; i <= HOURS; i++) {
      const x = L.lerp(BX0, BX1, i / HOURS);
      const passed = L.clamp((f * HOURS - i + 0.15) / 0.3);
      c.fillStyle = L.rgba(L.mix([120, 132, 150], [200, 230, 255], passed), 0.55 + 0.45 * passed);
      const th = i % HOURS === 0 ? 16 : 11;
      c.fillRect(x - 1, BY - 12 - th, 2, th);
      if (i > 0 && i < HOURS) { c.fillStyle = 'rgba(6,10,19,0.9)'; c.fillRect(x - 1.5, BY - 4, 3, 8); }
    }
    // the playhead
    c.save();
    L.lightBlob(c, hx, BY, 46 + 26 * done * (1 - L.prog(gt, T.fill1, 0.8)), ACC, 0.75);
    c.fillStyle = '#fff';
    c.shadowColor = L.rgba(ACC, 1);
    c.shadowBlur = 14;
    c.beginPath(); c.arc(hx, BY, 10 + 2 * Math.sin(Math.max(0, gt - T.fill1) * 5) * done, 0, Math.PI * 2); c.fill();
    c.restore();
    // completion sweep: one light pass over the full bar
    const sw = L.prog(gt, T.fill1 + 0.05, 0.7);
    if (sw > 0 && sw < 1) {
      const sx = L.lerp(BX0 - 80, BX1 + 80, L.ease.inOutCubic(sw));
      const g = c.createLinearGradient(sx - 80, 0, sx + 80, 0);
      g.addColorStop(0, 'rgba(255,255,255,0)');
      g.addColorStop(0.5, 'rgba(255,255,255,0.55)');
      g.addColorStop(1, 'rgba(255,255,255,0)');
      c.save();
      c.globalCompositeOperation = 'lighter';
      c.fillStyle = g;
      L.roundRect(c, BX0, BY - 4, tw, 8, 4); c.fill();
      c.restore();
    }
    c.restore();

    // ---- label
    const lk = v.k * L.prog(gt, T.label, 0.45);
    if (lk > 0) {
      c.save();
      const g = c.createRadialGradient(270, 470, 20, 270, 470, 340);
      g.addColorStop(0, 'rgba(3,6,12,0.6)');
      g.addColorStop(1, 'rgba(3,6,12,0)');
      c.globalAlpha = L.clamp(lk);
      c.fillStyle = g;
      c.fillRect(0, 130, 720, 680);
      c.restore();
      L.bigLabel(c, { x: 96, y: 520, big: '8 hours', small: 'of new video every second', k: lk, accent: ACC });
    }
  },
};
