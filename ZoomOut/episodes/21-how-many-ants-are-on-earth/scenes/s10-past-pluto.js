// Beat 10 (ep 21) — "The line leaves Earth, | passes Neptune, | then Pluto."  (also the preroll's picture)
// The column of ants (s09) becomes one thin glowing amber line, from the ant's spot (0, 0) straight up to tip(v), and it
// shoots off Earth while the camera pulls out through the Solar System. Light packets race up the line; a bright head
// with a short trail leads it. As the head crosses an orbit, the orbit lights up along an arc around the crossing (a ring
// flash at the crossing point) and its name is set ALONG the orbit: "NEPTUNE'S ORBIT" on the left, "PLUTO'S ORBIT" on
// the right. The labels are drawn in drawWorld (they must survive into beat 11's pull-out and play in the preroll) and
// fade once the orbits shrink too small for curved type.
// s10 owns the line itself for all later time; s11 only labels it.
import * as L from '../../../../engine/runtime/lib.js';
import { tip, tipAt, lineK, band, AU, SUN, PLUTO_ORBIT, CROSS, PLANETS } from '../env.js';

const { W, H, ease, clamp, prog } = L;
const NEPTUNE = PLANETS.find((p) => p.name === 'Neptune');
const LINE_CORE = [255, 238, 205], LINE_GLOW = [235, 160, 60];

/** film time at which the tip reaches altitude `alt` (binary search on the monotonic tipAt), cached per timeline */
const crossCache = new WeakMap();
export function crossTimes(tl) {
  let c = crossCache.get(tl);
  if (c) return c;
  const find = (alt) => {
    let a = tl.scenes[10].start, b = tl.scenes[12].start;
    for (let i = 0; i < 48; i++) { const m = (a + b) / 2; if (tipAt(m, tl) < alt) a = m; else b = m; }
    return (a + b) / 2;
  };
  c = { neptune: find(CROSS.neptune), pluto: find(CROSS.pluto), voyager: find(CROSS.voyager), end: find(0.999 * 1e14) };
  crossCache.set(tl, c);
  return c;
}

// ---- orbit geometry (world metres, y down). u = angle parameter.
const ORBITS = {
  neptune: {
    pt: (u) => ({ x: SUN.x + NEPTUNE.a * AU * Math.cos(u), y: SUN.y + NEPTUNE.a * AU * Math.sin(u) }),
    u0: Math.atan2(-CROSS.neptune - SUN.y, 0 - SUN.x),
    rAvg: NEPTUNE.a * AU,
    col: [140, 170, 255],
    name: "NEPTUNE'S ORBIT", side: -1,
  },
  pluto: {
    pt: (u) => ({ x: PLUTO_ORBIT.cx + PLUTO_ORBIT.a * Math.cos(u), y: PLUTO_ORBIT.cy + PLUTO_ORBIT.b * Math.sin(u) }),
    u0: -Math.acos((0 - PLUTO_ORBIT.cx) / PLUTO_ORBIT.a),
    rAvg: PLUTO_ORBIT.a,
    col: [225, 200, 180],
    name: "PLUTO'S ORBIT", side: 1,
  },
};

/** screen point + outward normal + tangent of orbit o at parameter u */
function frame(v, o, u) {
  const p = o.pt(u), q = o.pt(u + 1e-4);
  const x = v.wx(p.x), y = v.wy(p.y), tx = v.wx(q.x) - x, ty = v.wy(q.y) - y, tl = Math.hypot(tx, ty) || 1;
  // outward normal: away from the Sun
  let nx = ty / tl, ny = -tx / tl;
  const sx = v.wx(SUN.x), sy = v.wy(SUN.y);
  if ((x - sx) * nx + (y - sy) * ny < 0) { nx = -nx; ny = -ny; }
  return { x, y, tx: tx / tl, ty: ty / tl, nx, ny };
}

/** lit arc of the orbit around the crossing: brightest at the crossing, fading along the orbit */
function litArc(ctx, v, o, k, spread) {
  if (k <= 0) return;
  const n = 36;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.lineCap = 'round';
  for (let i = -n; i < n; i++) {
    const u1 = o.u0 + (spread * i) / n, u2 = o.u0 + (spread * (i + 1)) / n;
    const f = 1 - Math.abs(i + 0.5) / n;
    const p1 = o.pt(u1), p2 = o.pt(u2);
    ctx.strokeStyle = L.rgba(L.mix(o.col, [255, 220, 160], 0.5), k * f * f);
    ctx.lineWidth = 2.2;
    ctx.beginPath(); ctx.moveTo(v.wx(p1.x), v.wy(p1.y)); ctx.lineTo(v.wx(p2.x), v.wy(p2.y)); ctx.stroke();
  }
  ctx.restore();
}

/** text set along the orbit, starting `gap` px from the crossing on side o.side, `lift` px outside the orbit */
function curvedLabel(ctx, v, o, text, k, size, gap, lift) {
  if (k <= 0) return;
  const rpx = o.rAvg / v.cam.mpp;
  ctx.save();
  ctx.font = L.font(size, 700, L.FONT.body);
  ctx.textBaseline = 'alphabetic';
  ctx.textAlign = 'center';
  const track = size * 0.22;
  const widths = [...text].map((ch) => ctx.measureText(ch).width + track);
  const total = widths.reduce((a, b) => a + b, 0) - track;
  // walk along the orbit in parameter space: du per pixel ≈ 1 / rpx (good enough near the crossing)
  const du = 1 / rpx;
  // reading left → right on screen: on the left side the text ends `gap` px before the line, on the right it starts there
  let s = o.side < 0 ? -(gap + total) : gap;
  // screen-left is decreasing u? decide by the tangent direction at the crossing
  const f0 = frame(v, o, o.u0);
  const dir = f0.tx >= 0 ? 1 : -1;       // +u moves right on screen when tx > 0
  ctx.globalAlpha *= k;
  ctx.shadowColor = 'rgba(0,0,0,0.85)';
  ctx.shadowBlur = 10;
  [...text].forEach((ch, i) => {
    const mid = s + widths[i] / 2 - track / 2;
    s += widths[i];
    const fr = frame(v, o, o.u0 + dir * mid * du);
    const ang = Math.atan2(fr.ty * dir, fr.tx * dir);
    ctx.save();
    ctx.translate(fr.x + fr.nx * lift, fr.y + fr.ny * lift);
    ctx.rotate(ang);
    ctx.fillText(ch, 0, 0);
    ctx.restore();
  });
  ctx.restore();
}

export default {
  beat: 10,
  chapter: null,
  layer: 10,
  cues(d) {
    // times relative to the beat start (52.995): launch, Neptune crossing (55.92), Pluto crossing (56.97)
    return [
      { t: 0.12, name: 'riser', gain: 0.3, pitch: 1.1 },
      { t: 0.55, name: 'whoosh', gain: 0.4, pitch: 0.8 },
      { t: 2.45, name: 'swish', gain: 0.25, pitch: 1.0 },
      { t: 2.93, name: 'ping', gain: 0.32, pitch: 1.2 },
      { t: 2.95, name: 'shimmer', gain: 0.18, pitch: 1.0 },
      { t: 3.98, name: 'ping', gain: 0.36, pitch: 1.5 },
      { t: 4.0, name: 'shimmer', gain: 0.22, pitch: 1.2 },
    ];
  },
  drawWorld(ctx, v) {
    const s10 = v.tl.scenes[10].start;
    if (v.gt < s10 - 0.02) return;
    const k = lineK(v) * band(v.cam.mpp, 2e-4, 2e-3);
    const ct = crossTimes(v.tl);
    const x = v.wx(0), yb = v.wy(0), top = tip(v), yt = v.wy(-top);
    const y0 = Math.min(yb, H + 60), y1 = Math.max(yt, -60);
    ctx.save();
    if (k > 0 && y0 > y1) {
      ctx.globalAlpha = k;
      // outer haze, glow, then a hot core
      ctx.globalCompositeOperation = 'lighter';
      const hz = ctx.createLinearGradient(x - 16, 0, x + 16, 0);
      hz.addColorStop(0, L.rgba(LINE_GLOW, 0)); hz.addColorStop(0.5, L.rgba(LINE_GLOW, 0.16)); hz.addColorStop(1, L.rgba(LINE_GLOW, 0));
      ctx.fillStyle = hz;
      ctx.fillRect(x - 16, y1, 32, y0 - y1);
      ctx.globalCompositeOperation = 'source-over';
      L.glow(ctx, LINE_GLOW, 16, () => {
        ctx.strokeStyle = L.rgba(LINE_GLOW, 0.95); ctx.lineWidth = 3;
        ctx.beginPath(); ctx.moveTo(x, y0); ctx.lineTo(x, y1); ctx.stroke();
      });
      ctx.strokeStyle = L.rgba(LINE_CORE, 0.95); ctx.lineWidth = 1.3;
      ctx.beginPath(); ctx.moveTo(x, y0); ctx.lineTo(x, y1); ctx.stroke();
      // light packets racing up the line (screen speed; only while it grows)
      const grow = 1 - prog(v.gt, ct.end + 0.6, 1.2);
      if (grow > 0) {
        ctx.globalCompositeOperation = 'lighter';
        const sp = 260, speed = 1100;
        for (let j = 0; j < 12; j++) {
          const yy = y0 - (((v.gt * speed + j * sp) % (sp * 12)) / (sp * 12)) * (sp * 12);
          if (yy < y1 || yy > y0) continue;
          const g = ctx.createLinearGradient(0, yy + 70, 0, yy);
          g.addColorStop(0, L.rgba([255, 210, 140], 0)); g.addColorStop(1, L.rgba([255, 240, 210], 0.75 * grow));
          ctx.fillStyle = g;
          ctx.fillRect(x - 1.6, yy, 3.2, Math.min(70, y0 - yy));
        }
        ctx.globalCompositeOperation = 'source-over';
      }
      // the head: bright core + trail (fades into a steady end cap once the line is complete)
      if (yt > -80 && yt < H + 80) {
        const hk = 1 - 0.55 * prog(v.gt, ct.end, 0.8);
        ctx.globalCompositeOperation = 'lighter';
        const tr = ctx.createLinearGradient(0, yt + 190, 0, yt);
        tr.addColorStop(0, 'rgba(255,200,120,0)'); tr.addColorStop(1, `rgba(255,236,200,${0.55 * hk})`);
        ctx.fillStyle = tr;
        ctx.fillRect(x - 4, yt, 8, 190);
        L.lightBlob(ctx, x, yt, 90, [255, 190, 100], 0.45 * hk);
        L.lightBlob(ctx, x, yt, 26, [255, 245, 225], 0.95 * hk);
        ctx.globalCompositeOperation = 'source-over';
        ctx.fillStyle = 'rgb(255,252,240)';
        ctx.beginPath(); ctx.arc(x, yt, Math.max(0, 3.2), 0, Math.PI * 2); ctx.fill();
      }
      // launch flare where the line leaves the ground (Earth's limb), early in the beat
      const lk = prog(v.gt, s10 + 0.55, 1.1);
      if (lk > 0 && lk < 1 && yb < H + 40) {
        const e = ease.outCubic(lk);
        ctx.strokeStyle = L.rgba([255, 210, 140], 0.6 * (1 - lk));
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.ellipse(x, yb, Math.max(0, 20 + 120 * e), Math.max(0, 6 + 30 * e), 0, 0, Math.PI * 2); ctx.stroke();
        L.lightBlob(ctx, x, yb, 80, [255, 200, 120], 0.5 * (1 - lk));
      }
    }
    ctx.globalAlpha = 1;
    // ---- orbit crossings: lit arc + ring flash + curved name (in world space, fades as the orbit gets small)
    for (const [key, o] of Object.entries(ORBITS)) {
      const tc = ct[key];
      const rpx = o.rAvg / v.cam.mpp;
      const fit = clamp(L.invLerp(330, 470, rpx));                            // type needs a big enough orbit
      const onScreen = clamp(L.invLerp(2400, 1500, rpx));
      const kLab = Math.min(L.enter(v.gt, tc - 0.42, 0.45), onScreen) * fit * lineK(v);
      const flash = prog(v.gt, tc, 1.4);
      if (flash > 0 && flash < 1) {
        const p = o.pt(o.u0), fx = v.wx(p.x), fy = v.wy(p.y);
        const e = ease.outCubic(flash);
        ctx.save();
        ctx.strokeStyle = L.rgba([255, 225, 170], 0.85 * (1 - flash));
        ctx.lineWidth = 2.5;
        ctx.beginPath(); ctx.arc(fx, fy, Math.max(0, 8 + 70 * e), 0, Math.PI * 2); ctx.stroke();
        ctx.restore();
        L.lightBlob(ctx, fx, fy, 70, [255, 215, 150], 0.7 * (1 - flash));
      }
      // the orbit stays gently lit after the crossing
      const lit = (1 - 0.65 * ease.outCubic(prog(v.gt, tc + 0.2, 1.2))) * prog(v.gt, tc - 0.05, 0.1);
      litArc(ctx, v, o, lit * fit * 0.9 * lineK(v), 0.32);
      curvedLabel(ctx, v, o, o.name, kLab, 27, 62, 16);
    }
    ctx.restore();
  },
  drawOverlay() {},
};
