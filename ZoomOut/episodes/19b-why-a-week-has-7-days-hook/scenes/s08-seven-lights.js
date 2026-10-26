// Beat 8 — "The Sun, the Moon, Mercury, Venus, Mars, Jupiter and Saturn."
// env raises the seven lights on their spoken names (lightRise) along the ecliptic arc (skyPos). This scene adds:
//   * a faint ecliptic hairline (dashed, an ellipse through skyPos) that draws itself left → right with the risings;
//   * each light's NAME above it (small tracked caps in the light's colour) on a fine leader, attached to lightPos.
//     The newest name is the focal point (bright, rises in); older names relax to a quieter level.
// Both are drawn from drawWorld with their own timing, so they carry on (dimmed) under beat 9's "7" and fade out
// as beat 10 begins.
import * as L from '../../../../engine/runtime/lib.js';
import { LIGHTS, skyPos, lightPos, lightRise, lightSize } from '../env.js';

const TL = ((t) => (t.preroll ? { ...t, scenes: t.scenes.slice(1), lines: t.lines.slice(1) } : t))(await (await fetch(new URL('../build/timeline.json', import.meta.url))).json());   // 19b: the MAIN timeline (preroll line dropped, as main.js does)
const B = 8;
const T0 = TL.scenes[B].start;
const T9 = TL.scenes[9].start, T10 = TL.scenes[10].start;
const RISES = LIGHTS.map((_, i) => lightRise(i, TL));          // global s
const BY_SKY = LIGHTS.map((_, i) => i).sort((a, b) => LIGHTS[a].sky - LIGHTS[b].sky);
const TH = (sky) => (160 - sky * (140 / 6)) * Math.PI / 180;   // skyPos angle
const ARC = { cx: 0, cy: -263.5, rx: 7.0, ry: 8.0 };
const LABEL_IN = 0.5;                                          // after the rise starts (light ~90 % risen: names never cross while climbing)

/** Global time when the ecliptic hairline has reached angle th (degrees along 172° → 8°). */
function arcHead(gt) {
  // the head runs a little ahead of the newest risen light
  let th = 175;
  for (const i of BY_SKY) {
    const k = L.ease.inOutCubic(L.prog(gt, RISES[i] - 0.15, 0.6));
    const target = 160 - LIGHTS[i].sky * (140 / 6) - 14;
    if (k > 0) th = L.lerp(th, Math.max(5, target), k);
  }
  return th;
}

/** Shared fade of the beat-8 dressing: full through beat 8, dims under beat 9's "7", gone early in beat 10. */
export function namesK(gt) {
  const dim = L.lerp(1, 0.42, L.ease.inOutCubic(L.prog(gt, T9 + 0.55, 0.6)));
  const out = 1 - L.ease.inCubic(L.prog(gt, T10 - 0.15, 0.45));
  return { dim, out };
}

export default {
  beat: B,
  chapter: { num: '08', title: 'Seven lights', sub: 'Visible to the naked eye' },
  captions: true,
  layer: 2,
  cues(d) {
    return LIGHTS.map((Lt, i) => ({ t: RISES[i] - T0 + 0.05, name: Lt.key === 'sun' ? 'bloom' : 'ping', gain: Lt.key === 'sun' ? 0.24 : 0.17, pitch: 0.8 + Lt.sky * 0.09 }))
      .concat([{ t: 0.1, name: 'riser', gain: 0.1, pitch: 0.9 }]);
  },
  drawWorld(c, v) {
    const gt = v.gt;
    if (gt < RISES[0] - 0.3 || gt > T10 + 0.4) return;
    if (v.cam.mpp > 0.05) return;
    const { dim, out } = namesK(gt);
    if (out <= 0) return;
    c.save();
    c.lineCap = 'round';

    // ---------- ecliptic hairline
    const head = arcHead(gt);
    if (head < 172) {
      const cx = v.wx(ARC.cx), cy = v.wy(ARC.cy), rx = v.ws(ARC.rx), ry = v.ws(ARC.ry);
      const a0 = 172, a1 = head;
      c.save();
      c.globalAlpha = out * L.lerp(1, 0.7, 1 - dim);
      c.setLineDash([2, 9]);
      c.lineWidth = 1.5;
      c.strokeStyle = 'rgba(225,215,190,0.32)';
      c.beginPath();
      const N = 80;
      for (let j = 0; j <= N; j++) {
        const th = L.lerp(a0, a1, j / N) * Math.PI / 180;
        const x = cx + rx * Math.cos(th), y = cy - ry * Math.sin(th);
        j ? c.lineTo(x, y) : c.moveTo(x, y);
      }
      c.stroke();
      c.setLineDash([]);
      // a soft travelling bead at the head while it draws
      const moving = gt < RISES[BY_SKY[6]] + 0.6;
      if (moving) {
        const th = a1 * Math.PI / 180;
        L.lightBlob(c, cx + rx * Math.cos(th), cy - ry * Math.sin(th), 16, [235, 215, 170], 0.35);
      }
      c.restore();
    }

    // ---------- names
    const newest = BY_SKY.reduce((m, i) => (gt >= RISES[i] ? i : m), -1);
    const placed = [];   // labels already drawn: a newer name that would collide slides up, continuously
    for (const i of BY_SKY) {
      const Lt = LIGHTS[i];
      const kin = L.ease.outCubic(L.prog(gt, RISES[i] + LABEL_IN, 0.5));
      if (kin <= 0) continue;
      const p = lightPos(i, gt, v.tl);
      const x = v.wx(p.x), y = v.wy(p.y);
      const size = lightSize(i, v);
      // focus: newest bright; older settle to 0.62 once the next one arrives
      const nextSky = Lt.sky + 1;
      const nextI = BY_SKY[nextSky];
      const settle = nextI == null ? 0 : L.ease.inOutCubic(L.prog(gt, RISES[nextI] + 0.25, 0.5));
      const focus = L.lerp(1, 0.62, settle) * dim * out;
      const gap = Math.max(18, size * 2.2 + 12);
      const lead = 26 * kin;
      let ly = y - gap - lead - 10 + (1 - kin) * 10;
      let lx = x;
      c.save();
      c.globalAlpha = kin * focus;
      // leader: a fine vertical hairline from the light's halo up to the name
      c.strokeStyle = L.rgba(Lt.col, 0.55);
      c.lineWidth = 1.2;
      c.beginPath(); c.moveTo(x, y - gap); c.lineTo(x, y - gap - lead); c.stroke();
      // name: tracked caps in the light's colour, over a soft dark halo
      c.font = L.font(i === newest && settle === 0 ? 27 : 26, 700, L.FONT.body);
      c.letterSpacing = '5px';
      const w = c.measureText(Lt.name).width - 5;
      c.letterSpacing = '0px';
      lx = L.clamp(lx, 60 + w / 2, 940 - w / 2);
      for (const o of placed) {
        const ox = (w + o.w) / 2 + 16 - Math.abs(lx - o.x);
        if (ox > 0 && Math.abs(ly - o.y) < 34) ly = Math.min(ly, o.y - 34 * L.ease.inOutCubic(L.clamp(ox / 12)));   // full line clearance once they overlap
      }
      placed.push({ x: lx, y: ly, w });
      c.shadowColor = 'rgba(2,4,14,0.9)'; c.shadowBlur = 12;
      c.fillStyle = L.rgba(L.mix(Lt.col, [255, 255, 255], 0.25));
      c.textBaseline = 'alphabetic';
      L.trackedText(c, Lt.name, lx, ly, 5, 'center');
      c.restore();
    }
    c.restore();
  },
  drawOverlay() {},
};
