// Environment for "The Universe in One Year": draws the nested calendar at every zoom. Owned by the orchestrator.
// Builders: use the layout exports from camera.js (monthRect, dayRect, hourRect, minuteRect, secondRect, dayOfYear).
import * as L from '../../../engine/runtime/lib.js';
import { beatCues, stars, topBar } from '../../../engine/runtime/kit.js';
import { DAYS_IN, MONTHS, at, dayRect, hourRect, minuteRect, monthRect, secondRect } from './camera.js';

const { W, H } = L;
export const ACCENT = [240, 120, 220];
const INK = [235, 228, 240];

function cell(c, v, r, { fill = 'rgba(255,255,255,0.035)', stroke = 'rgba(235,228,240,0.16)', pad = 0.06, a = 1 } = {}) {
  const x = v.wx(r.x + r.w * pad / 2), y = v.wy(r.y + r.h * pad / 2), w = v.ws(r.w * (1 - pad)), h = v.ws(r.h * (1 - pad));
  if (x > W || y > H || x + w < 0 || y + h < 0 || w < 0.6) return null;
  if (a <= 0.003) return { x, y, w, h, hidden: true };
  const ga = c.globalAlpha;
  c.globalAlpha = ga * a;
  c.fillStyle = fill; c.fillRect(x, y, w, h);
  if (w > 6) { c.strokeStyle = stroke; c.lineWidth = 1; c.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1); }
  c.globalAlpha = ga;
  return { x, y, w, h };
}
/** world labels fade out under the HUD band (y < 300) so they never collide with the top bar / chapter card */
const hudFade = (y) => L.smoothstep(L.clamp((y - 250) / 70));

// ------------------------------------------------------------------ caption + motion awareness (set once per sub-frame)
const CAP_Y = 1450;   // 10b: matches episode.json captionY (lowered captions)
/** 0..1: is a caption on screen? (line 0 is the hook headline, line 9 the question card: captions off) */
const QUESTION = 9;    // 10c: the appended question beat draws its own card (s09-question.js, captions: false)
export function captionK(gt, tl) {
  let k = 0;
  tl.lines.forEach((ln, i) => {
    if (i === 0 || i === QUESTION) return;
    for (const ph of ln.phrases ?? [ln]) {
      const a = L.smoothstep(L.clamp((gt - ph.start + 0.15) / 0.25)) * (1 - L.smoothstep(L.clamp((gt - ph.end - 0.5) / 0.35)));
      k = Math.max(k, a);
    }
  });
  return k;
}
/** 0..1 text visibility from camera speed: fast dives fade grid text instead of smearing it into ghosted glyphs */
export function speedTextK(gt, tl) {
  const a = at(gt - 0.02, tl), b = at(gt + 0.02, tl);
  const z = Math.abs(Math.log(b.mpp / a.mpp)) / 0.04;
  const pan = Math.hypot(b.x - a.x, b.y - a.y) / a.mpp / 0.04;
  return L.lerp(1, 0.06, L.smoothstep(L.clamp((pan + 500 * z - 450) / 1000)));
}
let capK = 0, spdK = 1;
/** grid labels step out of the caption band while a caption is up */
const capFade = (y, size) => {
  if (capK <= 0) return 1;
  const d = Math.abs(y + size * 0.5 - CAP_Y);
  return L.lerp(1, L.smoothstep(L.clamp((d - 70) / 70)), capK);
};
const label = (c, s, x, y, size, alpha = 0.75, weight = 600, align = 'left') => {
  const a = alpha * hudFade(y) * capFade(y, size) * spdK;
  if (a <= 0.003) return;
  c.font = L.font(size, weight, L.FONT.body); c.fillStyle = L.rgba(INK, a); c.textAlign = align; c.textBaseline = 'top'; c.fillText(s, x, y);
};
// Nested levels crossfade: as a child level (k 0→1) appears, its PARENT cell's fill, stroke and label fade out first
// (gone by k = 0.5) and the child's labels fade in after (from k = 0.35), so only one border set and one label ever show.
const parentA = (k) => 1 - L.smoothstep(L.clamp(k / 0.5));
const childLabelA = (k) => L.smoothstep(L.clamp((k - 0.35) / 0.5));

/** dive levels: Dec 31 → hours (hk), 23:00 → minutes (mk), 23:59 → seconds (sk) */
const levels = (mpp) => ({
  hk: L.clamp(L.invLerp(0.006, 0.0025, mpp)),
  mk: L.clamp(L.invLerp(0.0009, 0.0004, mpp)),
  sk: L.clamp(L.invLerp(0.00009, 0.00004, mpp)),
});

export function drawBackground(c, v) {
  const g = c.createRadialGradient(W / 2, H * 0.45, 40, W / 2, H * 0.5, H * 0.85);
  g.addColorStop(0, '#120c16'); g.addColorStop(1, '#040306');
  c.fillStyle = g;
  c.fillRect(0, 0, W, H);
  stars(c, v, 0.35, 120, 5);
  capK = captionK(v.gt, v.tl);
  spdK = speedTextK(v.gt, v.tl);
  const { hk, mk, sk } = levels(v.cam.mpp);
  c.save();
  // months + days
  for (let m = 0; m < 12; m++) {
    const mr = monthRect(m);
    const tx = v.wx(mr.x), ty = v.wy(mr.y - 0.85);
    const ts = L.clamp(v.ws(0.5), 10, 60);
    if (v.ws(7) > 60) label(c, MONTHS[m].toUpperCase(), tx, ty, ts, 0.8, 700);
    for (let d = 0; d < DAYS_IN[m]; d++) {
      const pa = m === 11 && d === 30 ? parentA(hk) : 1;
      const r = cell(c, v, dayRect(m, d), { a: pa });
      if (r && r.w > 34) label(c, String(d + 1), r.x + 5, r.y + 4, L.clamp(r.w * 0.22, 10, 40), 0.55 * pa);
    }
  }
  if (hk > 0) {
    c.globalAlpha = hk;
    const la = childLabelA(hk);
    const fa = 1 - 0.75 * mk;                                    // sibling hours' accent fill recedes once minutes show
    for (let h = 0; h < 24; h++) {
      const pa = h === 23 ? parentA(mk) : 1;
      const r = cell(c, v, hourRect(h), { fill: `rgba(240,120,220,${0.04 * fa})`, a: pa });
      if (r && r.w > 50) label(c, `${String(h).padStart(2, '0')}:00`, r.x + 5, r.y + 4, L.clamp(r.w * 0.16, 10, 34), 0.6 * la * pa);
    }
  }
  if (mk > 0) {
    c.globalAlpha = mk;
    const la = childLabelA(mk);
    for (let mi = 0; mi < 60; mi++) {
      const pa = mi === 59 ? parentA(sk) : 1;
      const r = cell(c, v, minuteRect(mi), { fill: `rgba(240,120,220,${0.05 * (1 - 0.75 * sk)})`, a: pa });
      if (r && r.w > 50) label(c, `23:${String(mi).padStart(2, '0')}`, r.x + 4, r.y + 4, L.clamp(r.w * 0.18, 10, 30), 0.6 * la * pa);
    }
  }
  if (sk > 0) {
    c.globalAlpha = sk;
    const la = childLabelA(sk);
    for (let s = 0; s < 60; s++) {
      const r = cell(c, v, secondRect(s), { fill: 'rgba(240,120,220,0.06)' });
      if (r && r.w > 50) label(c, `:${String(s).padStart(2, '0')}`, r.x + 4, r.y + 4, L.clamp(r.w * 0.2, 10, 30), 0.6 * la);
    }
  }
  c.restore();
}
/** World-only dimming under the HUD band (y < 300): drawn after every scene's world layer and before the overlays,
 *  so calendar cells, lit days and icons scrolled up there (September above December in beat 3 (10c), the rows above
 *  the zoomed months in beats 1–2, …) never sit behind the top bar, chapter chip or "1 PX ≈" readout. The scene
 *  labels and the HUD itself draw on top and stay crisp. Uses the env background colour, so it reads as empty space. */
export function drawForeground(c, v) {
  if (v.gt < v.tl.scenes[0].start) return;   // the cold open has no HUD (p-cold frames its own shot)
  const g = c.createLinearGradient(0, 0, 0, 340);
  g.addColorStop(0, 'rgba(7,5,10,0.97)');
  g.addColorStop(0.8, 'rgba(7,5,10,0.95)');   // f10ca: stronger and lower, so no cell edges read under the chip at y 250–300
  g.addColorStop(1, 'rgba(7,5,10,0)');
  c.save();
  c.fillStyle = g;
  c.fillRect(0, 0, W, 340);
  c.restore();
}

/** HUD: top bar + a "1 calendar day = …" style zoom readout. */
export function drawHud(c, v) {
  // soft dark scrim behind the top bar, chapter card and zoom readout: the world never overprints the HUD
  const sg = c.createLinearGradient(0, 0, 0, 330);
  sg.addColorStop(0, 'rgba(5,3,7,0.82)'); sg.addColorStop(0.62, 'rgba(5,3,7,0.6)'); sg.addColorStop(1, 'rgba(5,3,7,0)');
  c.fillStyle = sg; c.fillRect(0, 0, W, 330);
  // feathered dark backing under the caption, so calendar cells and titles never stack with the words
  const ck = captionK(v.gt, v.tl);
  if (ck > 0.003) {
    c.save();
    c.translate(W / 2, CAP_Y);
    c.scale(1, 0.24);
    const cg = c.createRadialGradient(0, 0, 0, 0, 0, 560);
    cg.addColorStop(0, `rgba(5,3,7,${0.78 * ck})`);
    cg.addColorStop(0.6, `rgba(5,3,7,${0.62 * ck})`);
    cg.addColorStop(1, 'rgba(5,3,7,0)');
    c.fillStyle = cg;
    c.fillRect(-W / 2, -560, W, 1120);
    c.restore();
  }
  topBar(c, v, ACCENT);
  const qs = v.tl.scenes[QUESTION]?.start ?? Infinity;   // f10cb: no scale readout over the question card (it measured nothing there)
  const k = L.ease.outCubic(L.prog(v.gt, v.tl.scenes[0].start + 1.2, 0.6)) * (1 - L.ease.inOutCubic(L.prog(v.gt, qs + 0.1, 0.3)));   // 10b: relative to the film start (after the preroll)
  if (k <= 0) return;
  // world unit = one day cell; each nested level packs 6x more time per unit width
  // (hour cell 1/4 wide = 1/24 day, minute 1/10 as wide = 1/60 hour, second likewise), so scale by 6^(levels shown)
  const { hk, mk, sk } = levels(v.cam.mpp);
  const yearsPerPx = 37.8e6 * v.cam.mpp / Math.pow(6, hk + mk + sk);
  const txt = yearsPerPx >= 1e6 ? `${L.fmt(yearsPerPx / 1e6, 1)} MILLION YEARS` : yearsPerPx >= 1000 ? `${L.fmt(yearsPerPx / 1000, 1)} THOUSAND YEARS` : `${L.fmt(yearsPerPx, yearsPerPx < 10 ? 1 : 0)} YEARS`;
  c.save();
  c.globalAlpha = k;
  c.font = L.font(22, 600, L.FONT.body);
  c.fillStyle = 'rgba(235,228,240,0.7)';
  L.trackedText(c, `1 PX ≈ ${txt}`, W - 64, 236, 2, 'right');
  c.restore();
}
export const cues = (tl) => beatCues(tl, { gain: 0.18, pitch: 1.0 });
