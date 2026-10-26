// Beat 5 — "Then, | the sky would go dark."
// The camera has pushed in to the globe (r ≈ 187 px). env sweeps the light front across it (22.4–23.2 s); this
// scene makes that the moment:
//   * an anticipation wash from the Sun's side as the last light closes in,
//   * the sunlit atmosphere rim (a blue crescent on the sunward limb) that the front eats away,
//   * a fine white-gold terminator spark along the front's chord on the disc, flaring where it grazes the limb,
//   * a last glint on the far limb as the light leaves, then the night side's real city lights (env, earth.js) show and stay.
// The label "Lights out / the last sunlight has passed" lands as the sweep completes (the HUD clock shows 8:20).
//
// This file also owns the LABEL TRACK shared by beats 5–9 (one bigLabel at a time, each with its own global-time
// window, drawn by whichever of s05–s09 is active, so a label can outlive its beat without blinking), and `tag()`.
import * as L from '../../../../engine/runtime/lib.js';
import { EARTH, R_EARTH, SUN_DIR, filmScene } from '../camera.js';
import { T, frontPoint, lightR } from '../env.js';

const { W, H } = L;
export const ACC = [190, 140, 255];
const WARM = [255, 228, 180];

// ------------------------------------------------------------------ the label track (global seconds)
export const LABELS = [
  // 16b audit: every label is fully gone (b + 0.3 s fade) by the START of the next beat (film: beat 6 24.275,
  // beat 7 27.055, beat 8 32.225, beat 9 37.305, beat 10 39.905), so none ghosts over the next beat's chapter/line
  { a: 22.90, b: 23.95, big: 'Lights out', small: 'the last sunlight has passed' },   // lands as the wipe ends (23.2)
  { a: 25.05, b: 26.75, big: 'Still in orbit', small: 'no slingshot into space' },     // on the crossed-out fly-off path
  { a: 29.25, b: 31.90, big: '150 million km', small: '93 million mi · same orbit' },
  { a: 34.55, b: 37.00, big: 'Same pull', small: 'same mass, same distance' },
  { a: 37.80, b: 39.55, big: 'Mass + distance', small: 'nothing else matters' },
];
/** Visibility (0..1) of whichever label is on screen at global time gt (same envelope as drawLabels). */
export function labelVis(gt) {
  let m = 0;
  for (const l of LABELS) {
    if (gt < l.a || gt > l.b + 0.35) continue;
    m = Math.max(m, L.clamp(L.prog(gt, l.a, 0.6) * 2) * (1 - L.ease.inCubic(L.prog(gt, l.b, 0.3))));
  }
  return m;
}
/** Draw the label track. Each of s05–s09 calls this from drawOverlay; only the active one (or the outgoing one in the
 *  first 20 ms of the next beat, when the incoming overlay is still at k ≈ 0) actually draws. */
export function drawLabels(c, v) {
  const mine = (v.active && v.t >= 0.02) || (v.t >= v.d && v.t < v.d + 0.02);
  if (!mine) return;
  const gt = v.gt;
  for (const l of LABELS) {
    if (gt < l.a || gt > l.b + 0.35) continue;
    const kin = L.prog(gt, l.a, 0.6);
    const kout = 1 - L.ease.inCubic(L.prog(gt, l.b, 0.3));
    if (kout <= 0) continue;
    c.save();
    c.globalAlpha = kout;
    // a soft dark plate so the label reads over the orbit ring and the stars
    c.save();
    // 16b audit: near-opaque over the text block so the orbit ring (beats 6-9) never shows through the type
    c.translate(360, 495);
    c.scale(1, 0.36);
    const pk = L.clamp(kin * 2);
    const pg = c.createRadialGradient(0, 0, 0, 0, 0, 560);
    pg.addColorStop(0, `rgba(3,3,9,${0.96 * pk})`); pg.addColorStop(0.62, `rgba(3,3,9,${0.94 * pk})`); pg.addColorStop(0.84, `rgba(3,3,9,${0.5 * pk})`); pg.addColorStop(1, 'rgba(3,3,9,0)');
    c.fillStyle = pg;
    c.fillRect(-560, -560, 1120, 1120);
    c.restore();
    L.bigLabel(c, { x: 90, y: 520, big: l.big, small: l.small, k: kin, accent: ACC, size: 96 });
    c.restore();
  }
}

/** Small tracked caps tag with a short stem (dy > 0: below the point, dy < 0: above). */
export function tag(c, x, y, text, k, dy = 30, col = [225, 232, 242]) {
  if (k <= 0) return;
  c.save();
  c.globalAlpha *= L.clamp(k);
  c.strokeStyle = L.rgba(col, 0.45);
  c.lineWidth = 1.5;
  const d0 = Math.sign(dy) * 14;
  c.beginPath(); c.moveTo(x, y + d0); c.lineTo(x, y + d0 + (dy - d0) * L.ease.outCubic(L.clamp(k))); c.stroke();
  c.font = L.font(22, 600, L.FONT.body);
  c.fillStyle = L.rgba(col, 0.95);
  c.shadowColor = 'rgba(0,0,0,0.8)'; c.shadowBlur = 10;
  c.textBaseline = dy > 0 ? 'top' : 'alphabetic';
  L.trackedText(c, text, x, y + dy + Math.sign(dy) * (10 + (1 - L.clamp(k)) * 8), 4, 'center');
  c.restore();
}

const AX = -SUN_DIR.x, AY = -SUN_DIR.y;      // Sun -> Earth (the direction the front travels)
const PX = -AY, PY = AX;                      // along the front

/** Globe geometry + the front's signed offset from the centre (px, + = front is past the centre). */
function globe(v) {
  const cx = v.wx(EARTH.x), cy = v.wy(EARTH.y), r = v.ws(R_EARTH);
  const R = lightR(v.gt);
  const { fx, fy } = frontPoint(v, R);
  const s = (fx - cx) * AX + (fy - cy) * AY;  // where the front plane crosses the Sun→Earth axis, relative to the centre
  return { cx, cy, r, s, fx, fy };
}

function drawDark(c, v) {
  const gt = v.gt;
  if (gt < 20.6 || gt > 26.5) return;
  const { cx, cy, r, s, fx, fy } = globe(v);
  if (r < 20 || cx + r < -200 || cx - r > W + 200 || cy + r < -200 || cy - r > H + 200) return;
  const ang = Math.atan2(SUN_DIR.y, SUN_DIR.x);
  const swept = gt < T.collapse ? -1 : L.clamp((s + r) / (2 * r));   // 0 = untouched, 1 = fully dark
  const before = gt < T.dark0 + 0.2 ? 1 : 0;

  c.save();
  c.globalCompositeOperation = 'lighter';
  // 1. anticipation: a warm wash from the Sun's side, growing as the front closes in (it is off-screen until ~22.3 s)
  const dist = -s - r;                                              // px between the front and the sunward limb
  const ant = L.ease.inOutCubic(L.prog(gt, 21.2, 1.0)) * (dist > 0 ? Math.exp(-dist / 2600) * 0.6 + 0.4 : L.clamp(1 + dist / 90)) * before;
  if (ant > 0.01) {
    const ex = cx + SUN_DIR.x * r * 3.2, ey = cy + SUN_DIR.y * r * 3.2;
    L.lightBlob(c, ex, ey, r * 3.6, [255, 200, 140], 0.16 * ant);
    L.lightBlob(c, cx + SUN_DIR.x * r * 1.05, cy + SUN_DIR.y * r * 1.05, r * 0.9, [255, 226, 180], 0.14 * ant);
  }

  // 2. the sunlit atmosphere: a blue-white crescent on the sunward limb, eaten by the front
  const rimK = L.ease.outCubic(L.prog(gt, 20.9, 0.8)) * (swept < 0 ? 1 : 1);
  if (rimK > 0 && swept < 1) {
    c.save();
    // keep only the part still in sunlight (beyond the front)
    if (swept >= 0) {
      const BIG = 4000;
      c.beginPath();
      c.moveTo(fx + PX * BIG, fy + PY * BIG); c.lineTo(fx - PX * BIG, fy - PY * BIG);
      c.lineTo(fx - PX * BIG + AX * BIG, fy - PY * BIG + AY * BIG); c.lineTo(fx + PX * BIG + AX * BIG, fy + PY * BIG + AY * BIG);
      c.closePath(); c.clip();
    }
    const breathe = 1 + 0.04 * Math.sin(gt * 2.3);
    for (let i = 0; i < 3; i++) {
      const w = [r * 0.11, r * 0.05, r * 0.018][i] * breathe;
      const a = [0.10, 0.22, 0.55][i] * rimK;
      c.strokeStyle = L.rgba(i === 2 ? [225, 240, 255] : [110, 170, 255], a);
      c.lineWidth = Math.max(1, w);
      c.lineCap = 'round';
      c.beginPath(); c.arc(cx, cy, Math.max(0, r + w * 0.25), ang - 1.75, ang + 1.75); c.stroke();
    }
    c.restore();
  }

  // 3. the terminator spark: a fine bright chord where the front crosses the disc, flaring at the limb
  if (swept > 0 && swept < 1) {
    const h = Math.sqrt(Math.max(0, r * r - s * s));
    const mx = cx + AX * s, my = cy + AY * s;
    const ax = mx + PX * h, ay = my + PY * h, bx = mx - PX * h, by = my - PY * h;
    const life = Math.sin(Math.PI * swept);
    const g = c.createLinearGradient(ax, ay, bx, by);
    g.addColorStop(0, L.rgba(WARM, 0.95)); g.addColorStop(0.5, L.rgba([255, 250, 240], 0.75)); g.addColorStop(1, L.rgba(WARM, 0.95));
    c.save();
    c.shadowColor = L.rgba([255, 220, 170], 1);
    c.shadowBlur = 18;
    c.strokeStyle = g;
    c.lineWidth = 2.2;
    c.beginPath(); c.moveTo(ax, ay); c.lineTo(bx, by); c.stroke();
    c.restore();
    // a thin haze band just behind the line (the last light on the ground)
    const hz = c.createLinearGradient(mx, my, mx - AX * 46, my - AY * 46);
    hz.addColorStop(0, L.rgba([255, 214, 160], 0.22 * life)); hz.addColorStop(1, 'rgba(255,214,160,0)');
    c.save();
    c.beginPath(); c.arc(cx, cy, Math.max(0, r), 0, Math.PI * 2); c.clip();
    c.fillStyle = hz;
    c.beginPath();
    c.moveTo(ax, ay); c.lineTo(bx, by); c.lineTo(bx - AX * 46, by - AY * 46); c.lineTo(ax - AX * 46, ay - AY * 46); c.closePath(); c.fill();
    c.restore();
    // limb flares + anamorphic streaks along the front
    for (const [x, y, sd] of [[ax, ay, 1], [bx, by, 2]]) {
      const fl = (0.7 + 0.3 * L.noise1(gt * 9, sd)) * (0.6 + 0.4 * life);
      L.lightBlob(c, x, y, 46 * fl, [255, 236, 200], 0.75 * fl);
      L.lightBlob(c, x, y, 14, [255, 255, 255], 0.9);
      const sw = 90 * fl;
      const sg = c.createLinearGradient(x - PX * sw, y - PY * sw, x + PX * sw, y + PY * sw);
      sg.addColorStop(0, 'rgba(255,230,190,0)'); sg.addColorStop(0.5, `rgba(255,240,215,${0.5 * fl})`); sg.addColorStop(1, 'rgba(255,230,190,0)');
      c.strokeStyle = sg; c.lineWidth = 1.6;
      c.beginPath(); c.moveTo(x - PX * sw, y - PY * sw); c.lineTo(x + PX * sw, y + PY * sw); c.stroke();
    }
  }

  // 4. the last glint: where the light leaves the far limb
  const lg = gt - T.dark1;
  if (lg > -0.05 && lg < 1.0) {
    const k = Math.exp(-Math.max(0, lg) * 3.2) * L.clamp((lg + 0.05) / 0.08);
    const x = cx + AX * r, y = cy + AY * r;
    L.lightBlob(c, x, y, 90 + 140 * Math.max(0, lg), [255, 236, 205], 0.55 * k);
    L.lightBlob(c, x, y, 18, [255, 255, 255], k);
    const sw = 160 + 220 * Math.max(0, lg);
    const sg = c.createLinearGradient(x - PX * sw, y - PY * sw, x + PX * sw, y + PY * sw);
    sg.addColorStop(0, 'rgba(255,230,190,0)'); sg.addColorStop(0.5, `rgba(255,244,225,${0.6 * k})`); sg.addColorStop(1, 'rgba(255,230,190,0)');
    c.strokeStyle = sg; c.lineWidth = 2;
    c.beginPath(); c.moveTo(x - PX * sw, y - PY * sw); c.lineTo(x + PX * sw, y + PY * sw); c.stroke();
  }

  // 5. the city lights: env draws the real night Earth (earth.js) under the front, so they appear as it passes
  c.restore();
}

export default filmScene({
  beat: 5,
  chapter: { num: '05', title: 'Darkness', sub: 'the last sunlight sweeps past Earth' },
  captions: true,
  layer: 1,
  cues() {
    // beat starts 20.954 s; the wipe runs 22.4-23.2
    return [
      { t: 0.55, name: 'riser', gain: 0.22, pitch: 0.9 },
      { t: 1.40, name: 'shimmer', gain: 0.32, pitch: 1.1 },
      { t: 1.46, name: 'swish', gain: 0.26, pitch: 0.7 },
      { t: 2.25, name: 'deep', gain: 0.5, pitch: 0.8 },
      { t: 2.27, name: 'ping', gain: 0.18, pitch: 1.6 },
      { t: 2.36, name: 'tick', gain: 0.3, pitch: 1.0 },
      { t: 2.6, name: 'bloom', gain: 0.16, pitch: 0.9 },
    ];
  },
  drawWorld(c, v) { drawDark(c, v); },
  drawOverlay(c, v) { drawLabels(c, v); },
});
