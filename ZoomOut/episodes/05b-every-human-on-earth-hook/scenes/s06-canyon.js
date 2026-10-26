// Beat 6 — drop the cube into the Grand Canyon. Also owns the side-view ground for beats 4–6:
// a diorama slab of layered rock (top surface tilts in with the cube, front face shows the strata).
// In beat 6 the view flattens to a pure cross-section, the canyon erodes open under the cube (rim to
// rim ≈ 16 km, floor at y = +1800), the cube falls to the floor (s04 draws it + dust), and the
// camera pulls out until the block is a speck.
import * as L from '../../../../engine/runtime/lib.js';
import { pitchAt, FLOOR, LAND, SIDE, smallLine, labelOut } from './s04-cube.js';

const ZF = 2600;                    // slab half-depth (m): front face at Z = +ZF (a deep ground plane in front of the cube)
const OPEN = [0.06, 1.15];          // canyon erosion (beat 6): the inner gorge cuts first, then it widens to the rims
const sOf = (tl, i) => tl.scenes[i].start;

// Grand Canyon strata (top depth in m, colour), muted to sit under the coral cube.
const STRATA = [
  [0, [214, 192, 164]],      // Kaibab limestone
  [90, [196, 160, 128]],     // Toroweap
  [170, [232, 206, 166]],    // Coconino sandstone (pale cliff)
  [270, [196, 100, 74]],     // Hermit shale
  [360, [184, 104, 78]],     // Supai group
  [660, [200, 128, 100]],    // Redwall limestone (iron-stained)
  [900, [146, 136, 114]],    // Muav / Bright Angel shale
  [1250, [160, 112, 84]],    // Tapeats sandstone
  [1330, [92, 66, 66]],      // Vishnu schist (dark, warm: no lilac slab under the floor)
  [2400, [56, 42, 46]],      // basement
]

// Cross-section profile (x, depth) from the south rim to the north rim, ~16 km. Stepped walls: cliffs in the hard
// layers (Kaibab/Coconino, Redwall, the inner gorge's two steps), benches and slopes in the shales between them, the
// broad Tonto platform, and a flat floor (≈ 2 km wide here) where the cube comes to rest with room around it.
const PROFILE = [
  [-8000, 0], [-7820, 70], [-7700, 250], [-7250, 300], [-6650, 560], [-6420, 640], [-6300, 900],
  [-5500, 975], [-4750, 1100], [-3500, 1175], [-2000, 1225], [-1720, 1290], [-1560, 1540], [-1330, 1585],
  [-1200, 1785], [-1080, FLOOR], [1120, FLOOR], [1240, 1785], [1380, 1590], [1590, 1545], [1760, 1295],
  [2050, 1235], [3600, 1185], [4850, 1080], [5550, 965], [5760, 700], [6320, 640], [6900, 400],
  [7420, 300], [7680, 250], [7850, 70], [8000, 0],
];
// farther walls seen through the cut (the canyon bends away: hazy, a little shallower and narrower, so they
// fill the gap behind the front section instead of hiding behind it)
const FAR = PROFILE.map(([x, d], i) => [x * 0.8, d * 0.9 + (i % 3) * 25]);

/** Raw erosion progress (0..1) for beat 6. */
function openRaw(gt, tl) {
  return L.prog(gt - sOf(tl, 6), OPEN[0], OPEN[1]);
}
/** Local erosion at world x: the gorge under the cube opens first, the cut then widens out to the rims,
 *  so at close zoom the opening always shows walls instead of a uniform shallow dish. */
const openX = (x, r) => (r <= 0 ? 0 : L.ease.inOutCubic(L.prog(r, 0.55 * L.clamp(Math.abs(x) / 8000), 0.45)));

/** Visibility of the whole side-view world (0 before the tilt, fades as the globe takes over). */
function worldK(v, p) {
  if (v.gt < sOf(v.tl, 4)) return 0;
  const tiltK = L.clamp((Math.cos(p) - 0.45) / 0.4);
  const far = v.gt > sOf(v.tl, 7) ? 1 - L.invLerp(120, 700, v.cam.mpp) : 1;
  return tiltK * far;
}

function profilePath(c, v, prof, r, yTop, co, x0, x1) {
  c.moveTo(x0, yTop);
  for (const [x, d] of prof) c.lineTo(v.wx(x), v.wy(d * openX(x, r) * co) + (yTop - v.wy(0)));
  c.lineTo(x1, yTop);
}

/** Horizontal strata bands from yTop down, mixed toward `toward` by (1 - dim). */
function strataBands(c, yTop, co, mpp, x0, x1, dim, toward, lines) {
  for (let i = 0; i < STRATA.length; i++) {
    const ya = yTop + (STRATA[i][0] * co) / mpp;
    const yb = i + 1 < STRATA.length ? yTop + (STRATA[i + 1][0] * co) / mpp : L.H + 20;
    if (yb < 0 || ya > L.H + 20) continue;
    c.fillStyle = L.rgba(L.mix(toward, STRATA[i][1], dim));
    c.fillRect(x0, ya, x1 - x0, yb - ya + 1);
    const th = yb - ya;
    if (lines && th > 14 && i < STRATA.length - 1) {
      c.strokeStyle = 'rgba(0,0,0,0.12)';
      c.lineWidth = 1;
      c.beginPath();
      const n = Math.min(6, Math.floor(th / 8));
      for (let j = 1; j < n; j++) { const y = ya + (th * j) / n; c.moveTo(x0, y); c.lineTo(x1, y); }
      c.stroke();
    }
    c.fillStyle = `rgba(255,235,215,${lines ? 0.06 : 0.03})`;
    c.fillRect(x0, ya, x1 - x0, 1);
  }
}

// Below the canyon's strata: the crystalline basement (Vishnu schist, Zoroaster granite) in soft warm
// bands with granite veins, so the section reads as solid rock all the way down instead of a void.
const BASEMENT = [[2400, [98, 68, 64]], [3300, [80, 57, 58]], [4400, [104, 74, 66]], [5200, [72, 51, 54]], [7000, [60, 43, 47]], [10000, [44, 32, 36]]];
function deepRock(c, v, yTop, co, mpp, x0, x1) {
  const y0 = yTop + (BASEMENT[0][0] * co) / mpp;
  if (y0 > L.H) return;
  const g = c.createLinearGradient(0, y0, 0, yTop + (BASEMENT[BASEMENT.length - 1][0] * co) / mpp);
  const span = BASEMENT[BASEMENT.length - 1][0] - BASEMENT[0][0];
  for (const [d, col] of BASEMENT) g.addColorStop((d - BASEMENT[0][0]) / span, L.rgba(col));
  c.fillStyle = g;
  c.fillRect(x0, y0, x1 - x0, L.H - y0 + 20);
}

// Exposure shading for the cross-section (beat 6 on): the rock is lit only where it is exposed. A soft
// band hugging the canyon profile keeps its strata colour (so the layers read as the stacked faces of
// the walls, following every slope), while the rock deeper inside the section sinks into shadow.
// Built at quarter resolution in a scratch canvas (re-drawn from scratch every frame: no state).
const MS = 4;
let MASK = null;
function exposureShade(c, v, r, yF, co, band, a) {
  if (a <= 0) return;
  if (!MASK) MASK = new OffscreenCanvas(Math.ceil(L.W / MS), Math.ceil(L.H / MS));
  const m = MASK.getContext('2d');
  m.setTransform(1, 0, 0, 1, 0, 0);
  m.globalCompositeOperation = 'source-over';
  m.filter = 'none';
  m.clearRect(0, 0, MASK.width, MASK.height);
  m.fillStyle = 'rgb(12,8,11)';
  m.fillRect(0, 0, MASK.width, MASK.height);
  // erase the air and a band below the exposed surface (soft edge from the blur)
  m.setTransform(1 / MS, 0, 0, 1 / MS, 0, 0);
  m.globalCompositeOperation = 'destination-out';
  m.filter = `blur(${(band * 0.42 / MS).toFixed(1)}px)`;
  m.beginPath();
  m.moveTo(-400, -400);
  m.lineTo(-400, yF);
  if (r > 0) for (const [x, d] of PROFILE) m.lineTo(v.wx(x), v.wy(d * openX(x, r) * co) + (yF - v.wy(0)));
  m.lineTo(L.W + 400, yF);
  m.lineTo(L.W + 400, -400);
  m.closePath();
  m.fill();
  m.lineJoin = 'round';
  m.lineWidth = band;
  m.strokeStyle = '#000';
  m.stroke();
  m.filter = 'none';
  c.save();
  c.globalAlpha *= a;
  c.drawImage(MASK, 0, 0, MASK.width * MS, MASK.height * MS);
  c.restore();
}

export default {
  beat: 6,
  chapter: { num: '06', title: 'Grand Canyon', sub: 'Arizona · ≈ 16 km rim to rim' },
  captions: true,
  layer: 0,
  cues(d) {
    return [
      { t: OPEN[0], name: 'creak', gain: 0.34, pitch: 0.5 },
      { t: OPEN[0] + 0.05, name: 'deep', gain: 0.3, pitch: 0.7 },
      { t: 0.55, name: 'whoosh', gain: 0.3, pitch: 0.6 },
      { t: LAND - 0.02, name: 'impact', gain: 0.6, pitch: 0.55 },
      { t: LAND + 0.05, name: 'deep', gain: 0.35, pitch: 0.6 },
      { t: 1.65, name: 'tick', gain: 0.22, pitch: 1.1 },
      { t: 1.85, name: 'sonar', gain: 0.26, pitch: 1.2 },
      { t: 2.75, name: 'blip', gain: 0.2, pitch: 1.3 },
    ];
  },

  drawWorld(ctx, v) {
    const p = pitchAt(v.gt, v.tl);
    const k = worldK(v, p);
    if (k <= 0) return;
    const s = Math.sin(p), co = Math.cos(p), mpp = v.cam.mpp;
    const r = openRaw(v.gt, v.tl);
    const o = openX(0, r);                // the gorge under the cube
    const x0 = -20, x1 = L.W + 20;
    const yF = v.wy(ZF * s);              // top edge of the front face
    const yB = v.wy(-ZF * s);             // back edge of the top surface
    const inBeat6 = v.gt >= sOf(v.tl, 6);
    const t6 = v.gt - sOf(v.tl, 6);
    ctx.save();
    ctx.globalAlpha *= k;

    // horizon glow behind the rim: a low warm sky
    L.lightBlob(ctx, v.wx(0), v.wy(0), Math.min(1600, 9000 / mpp + 300), [255, 150, 120], inBeat6 ? 0.16 : 0.10);
    if (inBeat6) {
      const sk = L.prog(t6, 0.2, 1.2);
      const sg = ctx.createLinearGradient(0, yF - 520, 0, yF);
      sg.addColorStop(0, 'rgba(255,150,110,0)');
      sg.addColorStop(1, `rgba(255,160,120,${0.16 * sk})`);
      ctx.fillStyle = sg;
      ctx.fillRect(x0, yF - 520, x1 - x0, 520);
    }

    // far canyon walls seen through the cut: the same strata, hazed by distance (shallower, wider)
    if (r > 0) {
      ctx.save();
      ctx.globalAlpha *= L.clamp(r * 6);
      ctx.beginPath();
      profilePath(ctx, v, FAR, r, yF, co, x0, x1);
      ctx.lineTo(x1, L.H + 20); ctx.lineTo(x0, L.H + 20); ctx.closePath();
      ctx.clip();
      strataBands(ctx, yF, co, mpp, x0, x1, 0.78, [66, 44, 46], true);
      // aerial haze: palest at the far rim, sinking into shade lower down
      const hg = ctx.createLinearGradient(0, yF, 0, yF + 1900 * co / mpp);
      hg.addColorStop(0, 'rgba(170,120,104,0.30)');
      hg.addColorStop(1, 'rgba(30,20,24,0.30)');
      ctx.fillStyle = hg;
      ctx.fillRect(x0, yF, x1 - x0, L.H - yF + 20);
      ctx.restore();
      // far rim edge: a soft sunlit line
      ctx.save();
      ctx.globalAlpha *= L.clamp(r * 6);
      ctx.beginPath();
      profilePath(ctx, v, FAR, r, yF, co, x0, x1);
      ctx.strokeStyle = 'rgba(255,206,180,0.4)';
      ctx.lineWidth = 1.2;
      ctx.stroke();
      ctx.restore();
    }

    // top surface of the slab (gone before the cut opens / as the view flattens)
    const topK = L.clamp((yF - yB) / 30) * (1 - L.ease.inOutCubic(L.prog(t6, 0, 0.2)));
    if (topK > 0) {
      const g = ctx.createLinearGradient(0, yB, 0, yF);
      g.addColorStop(0, 'rgba(70,50,50,0)');
      g.addColorStop(0.5, 'rgba(84,62,58,0.55)');
      g.addColorStop(1, 'rgba(112,84,74,0.75)');
      ctx.save();
      ctx.globalAlpha *= topK;
      ctx.fillStyle = g;
      ctx.fillRect(x0, yB, x1 - x0, yF - yB);
      // floor grid, fading with distance from the cube
      ctx.lineWidth = 1;
      const step = 200;
      for (let z = -ZF + step; z < ZF; z += step) {
        const y = v.wy(z * s);
        const a = 0.18 * (0.35 + 0.65 * L.invLerp(-ZF, ZF, z));
        const gl = ctx.createLinearGradient(v.wx(-4000), 0, v.wx(4000), 0);
        gl.addColorStop(0, 'rgba(255,200,180,0)');
        gl.addColorStop(0.5, `rgba(255,200,180,${a})`);
        gl.addColorStop(1, 'rgba(255,200,180,0)');
        ctx.strokeStyle = gl;
        ctx.beginPath(); ctx.moveTo(v.wx(-4000), y); ctx.lineTo(v.wx(4000), y); ctx.stroke();
      }
      ctx.beginPath();
      for (let x = -4000; x <= 4000; x += step) {
        if (Math.abs(x) < SIDE / 2 + 1) continue;
        ctx.moveTo(v.wx(x), yB); ctx.lineTo(v.wx(x), yF);
      }
      const gv = ctx.createLinearGradient(v.wx(-4000), 0, v.wx(4000), 0);
      gv.addColorStop(0, 'rgba(255,200,180,0)');
      gv.addColorStop(0.5, 'rgba(255,200,180,0.12)');
      gv.addColorStop(1, 'rgba(255,200,180,0)');
      ctx.strokeStyle = gv;
      ctx.stroke();
      ctx.restore();
    }

    // front face: the rock cross-section, with the canyon carved out of it
    ctx.save();
    ctx.beginPath();
    if (r > 0) profilePath(ctx, v, PROFILE, r, yF, co, x0, x1);
    else { ctx.moveTo(x0, yF); ctx.lineTo(x1, yF); }
    ctx.lineTo(x1, L.H + 20); ctx.lineTo(x0, L.H + 20); ctx.closePath();
    ctx.clip();
    const dim = inBeat6 ? L.lerp(0.2, 0.86, L.prog(t6, 0, 1)) : 0.2;
    // before the cut opens, the slab's front is a calm earth gradient (no hard bands); the strata of the
    // cross-section fade in as the canyon erodes open
    const strataK = inBeat6 ? L.ease.inOutCubic(L.prog(t6, 0.0, 0.6)) : 0;
    const eg = ctx.createLinearGradient(0, yF, 0, L.H);
    eg.addColorStop(0, 'rgb(74,54,52)');
    eg.addColorStop(0.25, 'rgb(46,33,34)');
    eg.addColorStop(1, 'rgb(22,15,18)');
    ctx.fillStyle = eg;
    ctx.fillRect(x0, yF, x1 - x0, L.H - yF + 20);
    if (strataK > 0) {
      ctx.save();
      ctx.globalAlpha *= strataK;
      strataBands(ctx, yF, co, mpp, x0, x1, dim, [20, 14, 18], false);
      deepRock(ctx, v, yF, co, mpp, x0, x1);
      ctx.restore();
    }
    // (no foliation hatching in the basement: it read as diagonal scratches over the ground)
    // depth shading: the rock darkens gently with depth, under a soft light from above
    const dg = ctx.createLinearGradient(0, yF, 0, Math.min(L.H, yF + 4000 / mpp));
    dg.addColorStop(0, 'rgba(255,220,190,0.06)');
    dg.addColorStop(1, 'rgba(8,5,7,0.3)');
    ctx.fillStyle = dg;
    ctx.fillRect(x0, yF, x1 - x0, L.H - yF + 20);
    const yD = yF + 2400 * co / mpp;
    if (yD < L.H) {
      const dd = ctx.createLinearGradient(0, yD, 0, L.H);
      dd.addColorStop(0, 'rgba(8,5,7,0)');
      dd.addColorStop(1, 'rgba(8,5,7,0.25)');
      ctx.fillStyle = dd;
      ctx.fillRect(x0, yD, x1 - x0, L.H - yD + 20);
    }
    if (inBeat6) {
      const ek = L.ease.inOutCubic(L.prog(t6, 0.05, 0.9));
      // walls: light on the upper faces near the rims, the inner gorge sinking into shade
      const yFl = v.wy(FLOOR * co * o) + (yF - v.wy(0));
      if (yFl > yF + 4) {
        const wg = ctx.createLinearGradient(0, yF, 0, yFl);
        wg.addColorStop(0, `rgba(255,226,196,${0.10 * ek})`);
        wg.addColorStop(0.45, 'rgba(255,226,196,0)');
        wg.addColorStop(1, `rgba(16,10,14,${0.38 * ek})`);
        ctx.fillStyle = wg;
        ctx.fillRect(x0, yF, x1 - x0, yFl - yF);
      }
      // deep rock behind the exposed faces goes dark, so the eye stays on the walls and the cube
      exposureShade(ctx, v, r, yF, co, Math.max(48, Math.min(110, 850 / mpp)), 0.38 * ek);
    }
    // keep the caption band calm while the slab sits behind it (beats 4–5)
    const scrimK = inBeat6 ? 1 - L.prog(t6, 0.1, 0.9) : 1;
    if (scrimK > 0) {
      const cg = ctx.createLinearGradient(0, 1220, 0, 1450);
      cg.addColorStop(0, 'rgba(12,8,10,0)');
      cg.addColorStop(0.5, `rgba(12,8,10,${0.42 * scrimK})`);
      cg.addColorStop(1, 'rgba(12,8,10,0)');
      ctx.fillStyle = cg;
      ctx.fillRect(x0, 1220, x1 - x0, 230);
    }
    ctx.restore();

    // sunlit rim line along the cut (fades where it would cross the caption band)
    const rimA = 0.45 * L.clamp((Math.abs(yF - 1335) - 55) / 45);
    if (rimA > 0) {
      ctx.save();
      ctx.beginPath();
      if (r > 0) profilePath(ctx, v, PROFILE, r, yF, co, x0, x1);
      else { ctx.moveTo(x0, yF); ctx.lineTo(x1, yF); }
      ctx.strokeStyle = `rgba(255,214,188,${rimA})`;
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.restore();
    }

    // dashed rim level across the gap while the cube falls: how far it drops
    const lk = inBeat6 ? L.prog(t6, 0.35, 0.4) * (1 - L.ease.inCubic(L.prog(t6, 3.1, 0.5))) : 0;
    if (lk > 0) {
      ctx.save();
      ctx.setLineDash([6, 8]);
      ctx.strokeStyle = `rgba(255,214,188,${0.42 * lk})`;
      ctx.lineWidth = 1.5;
      const xa = v.wx(-8000), xb = v.wx(8000);
      ctx.beginPath(); ctx.moveTo(Math.max(x0, xa), yF); ctx.lineTo(Math.min(x1, xb), yF); ctx.stroke();
      ctx.setLineDash([]);
      ctx.font = L.font(24, 700, L.FONT.body);
      ctx.textBaseline = 'alphabetic';
      ctx.shadowColor = 'rgba(0,0,0,0.7)';
      ctx.shadowBlur = 6;
      ctx.fillStyle = `rgba(255,228,212,${0.9 * lk})`;
      L.trackedText(ctx, 'RIM LEVEL', L.W - 64, yF - 12, 3, 'right');
      ctx.restore();
    }

    // the Colorado River, a thin glint on the floor
    if (o > 0.9) {
      const rx0 = v.wx(-200), rx1 = v.wx(260), ry = v.wy(FLOOR * co) - 1;
      ctx.fillStyle = `rgba(120,190,215,${0.7 * (o - 0.9) * 10})`;
      ctx.fillRect(rx0, ry, rx1 - rx0, 2);
    }
    ctx.restore();
  },

  drawOverlay(ctx, v) {
    const co = Math.cos(pitchAt(v.gt, v.tl));
    // every label of this beat is gone by the boundary (no ghost over beat 7)
    const out = labelOut(v);
    if (out <= 0) return;
    ctx.save();
    ctx.globalAlpha *= out;
    // depth bracket left of the gorge, labelled, clear of the reticle
    const dk = L.enter(v.t, 1.55, 0.7) * v.k;
    if (dk > 0) L.dimension(ctx, v.wx(-1250) - 12, v.wy(0), v.wy(FLOOR * co), dk, v.accent, '1.8 km', 'left');
    // viewfinder brackets hunting for the block: "you'd barely find it". They sweep in from off target,
    // overshoot, and settle (damped), turning coral when they lock.
    const e = L.prog(v.t, 1.8, 1.3);
    if (e > 0 && v.k > 0) {
      const spring = (u, w) => 1 - Math.exp(-5 * u) * Math.cos(w * u);
      const sr = spring(e, 8);
      // locked on the block every frame; only the frame size hunts (overshoots and settles)
      const cx = v.wx(0), cy = v.wy(FLOOR * co - SIDE / 2);
      const rr = L.lerp(200, 56, sr), arm = 16;
      const lock = L.prog(e, 0.7, 0.25);
      ctx.save();
      ctx.globalAlpha *= L.clamp(e * 5) * v.k;
      ctx.strokeStyle = L.rgba(L.mix([255, 236, 226], v.accent, lock), 0.92);
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      for (const [px, py] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
        ctx.moveTo(cx + px * rr, cy + py * (rr - arm));
        ctx.lineTo(cx + px * rr, cy + py * rr);
        ctx.lineTo(cx + px * (rr - arm), cy + py * rr);
      }
      ctx.stroke();
      ctx.restore();
    }
    const k = L.enter(v.t, 1.45, 0.5);
    L.bigLabel(ctx, { x: 120, y: 600, big: '1.8 km deep', k, accent: v.accent });
    smallLine(ctx, '≈ 16 km WIDE · 446 km LONG', 120, 600, k);
    ctx.restore();
  },
};
