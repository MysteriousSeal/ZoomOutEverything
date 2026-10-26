// Beat 2 — "The culprit: Julius Caesar's calendar, sixteen centuries old."
// A Julius Caesar coin medallion lying on the desk at P_COIN (r = 280 u, ≈ 590 px across at mpp 0.95), in the style of a
// Roman denarius struck in gold: a raised rim, a beaded border, the legend CAESAR · DICT · PERPETVO round the field,
// and a dignified laureate profile facing right, in relief (cast shadow, rim highlight, inner shading, engraved
// detail: brow, eye, ear, the lined neck, combed hair, a laurel wreath tied at the nape). A light sweep crosses the
// metal as the camera settles. Tag "46 BC" (house style, on navy) above the coin.
// LOD: below ~70 px radius the coin simplifies to a gold disc with its rim and silhouette, so it still reads as a
// small gold coin while the beat-3 pull-out shrinks it away (its own fade, slightly later than deskK).
import * as L from '../../../../engine/runtime/lib.js';
import { P_COIN, ACCENT, band, serif } from '../env.js';

const R_U = 280;                                     // coin radius (world u)
const TAU = Math.PI * 2;
// the coin outlives the paper props a little (a bright disc) during beat 3's pull-out; never in the orbit beats 4–7
const coinK = (v) => (v.gt < v.tl.scenes[4].start || v.gt > v.tl.scenes[8].start + 1.4 ? 1 : 0) * (1 - band(v.cam.mpp, 2.2, 6.0));

// ------------------------------------------------------------------ the portrait (coin units: radius 100, y down, facing right)
const PROFILE = [
  [-4, -58], [10, -56], [20, -51], [27, -44], [31, -36], [33, -30], [34.5, -26.5], [33.2, -23.6], [32.2, -21.8],
  [33.5, -19], [36.5, -14.2], [38.6, -11.4], [41, -7], [44, -2.6], [44.6, -0.6], [42, 0.8], [38.6, 1.3], [37.6, 2.6],
  [38.6, 4.8], [36.6, 6.2], [37.9, 8.3], [34.8, 11], [35.6, 14], [36.6, 17.5], [34.6, 21.5], [29, 24], [21, 25.5],
  [18, 30], [19.5, 38], [17.5, 46], [19.5, 57],
  [9, 61.5], [-8, 62.5], [-22, 59.5],
  [-21.5, 50], [-24, 38], [-29, 27], [-36, 17], [-41, 4], [-43, -12], [-40.5, -30], [-32, -46], [-19, -55.5],
];
function smoothPath(c, P, closed = true) {
  const n = P.length;
  const m = (i) => { const a = P[i % n], b = P[(i + 1) % n]; return [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2]; };
  const s = m(0);
  c.moveTo(s[0], s[1]);
  for (let i = 1; i <= (closed ? n : n - 2); i++) { const p = P[i % n], e = m(i); c.quadraticCurveTo(p[0], p[1], e[0], e[1]); }
  if (closed) c.closePath();
}
const headPath = (c) => { c.beginPath(); smoothPath(c, PROFILE); };

// the laurel wreath: a spine hugging the skull from above the brow to the tie behind the head
const SPINE = [[25, -45], [14, -52.5], [0, -55.5], [-14, -53.5], [-26, -46], [-35, -35], [-40.5, -22], [-42.5, -10]];
function spineAt(f) {
  const n = SPINE.length - 1, x = L.clamp(f) * n, i = Math.min(n - 1, Math.floor(x)), t = x - i;
  const a = SPINE[i], b = SPINE[i + 1];
  return { x: L.lerp(a[0], b[0], t), y: L.lerp(a[1], b[1], t), tx: b[0] - a[0], ty: b[1] - a[1] };
}

/** hair locks: a jittered grid inside the skull, below the wreath, off the face and the ear (deterministic) */
const LOCKS = (() => {
  const out = [], r = L.rng(46);
  const inHead = (x, y) => {   // ray-cast point-in-polygon on the profile
    let inside = false;
    for (let i = 0, j = PROFILE.length - 1; i < PROFILE.length; j = i++) {
      const [xi, yi] = PROFILE[i], [xj, yj] = PROFILE[j];
      if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
    }
    return inside;
  };
  for (let y = -50; y <= 26; y += 5.2) {
    for (let x = -44; x <= 22; x += 6.4) {
      const jx = x + (r() - 0.5) * 2.4 + ((Math.round(y / 5.2) % 2) * 3.2), jy = y + (r() - 0.5) * 1.8;
      if (!inHead(jx - 3, jy) || !inHead(jx + 3, jy) || !inHead(jx, jy - 3) || !inHead(jx, jy + 3)) continue;
      if (jx > 21 - Math.max(0, jy + 40) * 0.25) continue;            // the forehead and face stay bare
      if (jx > -19 && jy > -17) continue;                              // ear, cheek, neck
      if (jy > 22 - (jx + 44) * 0.2) continue;                         // nape line
      // under the wreath only: stay on the inner side of the spine
      let near = 1e9, side = 0;
      for (let k = 0; k <= 40; k++) {
        const p = spineAt(k / 40), d = Math.hypot(jx - p.x, jy - p.y);
        if (d < near) { near = d; side = (jx - p.x) * p.ty - (jy - p.y) * p.tx; }
      }
      if (near < 6 || side < 0) continue;
      const a = (jy < -30 ? 0.25 : jy < 0 ? 0.6 : 1.0) + (r() - 0.5) * 0.3;
      out.push({ x: jx, y: jy, a, l: 6.2 + r() * 1.6, w: 2.3 + r() * 0.5 });
    }
  }
  return out;
})();

function leaf(c, x, y, ang, len, wid) {
  c.save();
  c.translate(x, y);
  c.rotate(ang);
  c.beginPath();
  c.moveTo(0, 0);
  c.quadraticCurveTo(len * 0.45, -wid, len, 0);
  c.quadraticCurveTo(len * 0.45, wid, 0, 0);
  c.closePath();
  c.fill();
  c.stroke();
  c.beginPath(); c.moveTo(len * 0.1, 0); c.lineTo(len * 0.82, 0);
  c.globalAlpha *= 0.7;
  c.stroke();
  c.restore();
}

/** a set of engraved strokes: dark line + a faint highlight just above-left (struck metal) */
function engrave(c, paths, w = 1.1, dark = 'rgba(92,58,20,0.75)', hi = 'rgba(255,236,190,0.55)') {
  c.lineCap = 'round';
  c.lineJoin = 'round';
  for (const [col, dx, dy, lw] of [[hi, -0.55, -0.6, w * 0.8], [dark, 0, 0, w]]) {
    c.strokeStyle = col;
    c.lineWidth = lw;
    c.beginPath();
    for (const p of paths) {
      c.moveTo(p[0][0] + dx, p[0][1] + dy);
      if (p.length === 3) c.quadraticCurveTo(p[1][0] + dx, p[1][1] + dy, p[2][0] + dx, p[2][1] + dy);
      else for (let i = 1; i < p.length; i++) c.lineTo(p[i][0] + dx, p[i][1] + dy);
    }
    c.stroke();
  }
}

function portrait(c, sc, detail) {
  // cast shadow (lower right) and rim light (upper left) of the raised relief
  c.save();
  c.shadowColor = 'rgba(54,30,8,0.65)'; c.shadowBlur = 3.5 * sc; c.shadowOffsetX = 2.2 * sc; c.shadowOffsetY = 2.6 * sc;
  headPath(c); c.fillStyle = 'rgb(150,104,44)'; c.fill();
  c.restore();
  c.save(); c.translate(-1.1, -1.3); headPath(c); c.fillStyle = 'rgba(255,240,200,0.9)'; c.fill(); c.restore();
  // body of the relief: lit from the upper left
  headPath(c);
  const g = c.createRadialGradient(-6, -26, 6, 4, 4, 78);
  g.addColorStop(0, 'rgb(246,218,150)');
  g.addColorStop(0.55, 'rgb(220,176,98)');
  g.addColorStop(1, 'rgb(170,124,58)');
  c.fillStyle = g;
  c.fill();
  // inner volume: shade the lower-right edge of the relief, brighten the upper-left edge
  c.save();
  headPath(c); c.clip();
  c.shadowColor = 'rgba(96,60,20,0.75)'; c.shadowBlur = 7 * sc; c.shadowOffsetX = -3.2 * sc; c.shadowOffsetY = -3.2 * sc;
  c.beginPath(); c.rect(-200, -200, 400, 400); smoothPath(c, PROFILE); c.fillStyle = 'rgb(0,0,0)'; c.fill('evenodd');
  c.shadowColor = 'rgba(255,240,200,0.6)'; c.shadowBlur = 4 * sc; c.shadowOffsetX = 1.6 * sc; c.shadowOffsetY = 1.6 * sc;
  c.beginPath(); c.rect(-200, -200, 400, 400); smoothPath(c, PROFILE); c.fill('evenodd');
  c.restore();
  if (!detail) return;

  c.save();
  headPath(c); c.clip();
  // modelled relief: soft shadows (sockets, hollows, under the jaw) and soft highlights (forehead, cheekbone, crown)
  const soft = (col, blur, fn) => { c.save(); c.filter = `blur(${Math.max(0.5, blur * sc).toFixed(2)}px)`; c.fillStyle = col; c.strokeStyle = col; fn(); c.restore(); };
  const ell = (x, y, rx, ry, rot = 0) => { c.beginPath(); c.ellipse(x, y, rx, ry, rot, 0, TAU); c.fill(); };
  soft('rgba(255,242,206,0.45)', 3, () => { ell(14, -40, 13, 8, -0.4); ell(-14, -40, 16, 10, 0.3); ell(17, -9, 7, 4.5, 0.4); ell(38, -12, 2.5, 6, -0.5); });
  soft('rgba(104,64,20,0.5)', 2.2, () => { ell(25, -20.5, 6.5, 3.6, 0.15); });
  soft('rgba(104,64,20,0.32)', 3.2, () => { ell(11, -23, 5, 7, 0.2); ell(25, 4, 4.5, 8, -0.35); ell(-12, -2, 8, 10, 0); });
  soft('rgba(96,58,18,0.38)', 2.6, () => {
    c.lineWidth = 3.6; c.lineCap = 'round';
    c.beginPath(); c.moveTo(-6, 15); c.quadraticCurveTo(12, 29, 29, 26.5); c.stroke();
  });
  // hair: short comma-shaped locks in relief, combed forward under the wreath (coin-engraver style)
  for (const lk of LOCKS) {
    c.save();
    c.translate(lk.x, lk.y);
    c.rotate(lk.a);
    const lock = () => { c.beginPath(); c.moveTo(-lk.l / 2, 0); c.quadraticCurveTo(0, -lk.w, lk.l / 2, -lk.w * 0.2); c.quadraticCurveTo(lk.l * 0.1, lk.w * 0.55, -lk.l / 2, 0); c.closePath(); };
    c.translate(0.5, 0.6); lock(); c.fillStyle = 'rgba(104,64,20,0.7)'; c.fill();
    c.translate(-0.9, -1.0); lock(); c.fillStyle = 'rgba(255,240,204,0.55)'; c.fill();
    c.translate(0.45, 0.45); lock(); c.fillStyle = 'rgb(226,184,108)'; c.fill();
    c.restore();
  }
  // ear: helix, antihelix and lobe
  engrave(c, [
    [[-6, -11], [-16, -11.5], [-14.5, -1]], [[-14.5, -1], [-13, 6.5], [-6.5, 5]], [[-8.5, -7.5], [-12, -3.5], [-9.5, 0.5]],
    [[-12, -7], [-10, -8.5], [-8, -7]], [[-5.5, -2], [-4.5, 0], [-5.5, 2]],
  ], 1.15);
  // brow ridge, the eye in profile (lids + iris), nose wing, mouth, chin crease, crow's feet
  engrave(c, [
    [[16, -26.5], [25, -29.8], [32.4, -26.2]],
    [[20.5, -20.3], [25.6, -23], [29.6, -19.4]], [[22, -17.6], [26, -16.4], [29.3, -18.4]],
    [[40.8, -4.2], [37.2, -5.6], [36.7, -1.4]],
    [[37.4, 6.2], [35, 6.9], [32.6, 6.1]],
    [[35, 11.4], [33, 12.4], [31.4, 11.5]],
    [[16.5, -19.5], [14.6, -17.6], [14.2, -15.2]],
  ], 1.05);
  c.fillStyle = 'rgba(96,60,20,0.8)';
  c.beginPath(); c.ellipse(28.1, -19.2, 1.05, 1.6, 0, 0, TAU); c.fill();
  // the lined neck and the gaunt cheek fold
  engrave(c, [
    [[35, -6.5], [30.5, 0], [31.8, 7.5]],
    [[4, 29], [9, 34], [13, 41]], [[-1, 34], [4, 41], [8, 49]], [[-7, 39], [-3, 47], [0, 55]],
  ], 0.95, 'rgba(110,70,26,0.55)');
  c.restore();

  // laurel wreath (on top of the relief): two rows of leaves pointing forward, tied at the nape with ribbons
  c.save();
  c.strokeStyle = 'rgba(96,60,20,0.85)';
  c.lineWidth = 0.7;
  const N = 11;
  for (let row = 0; row < 2; row++) {
    for (let i = 0; i < N; i++) {
      const f = (i + (row ? 0.5 : 0)) / N;
      const p = spineAt(f), ang = Math.atan2(-p.ty, -p.tx);    // point toward the front (the start of the spine)
      const side = row ? 1 : -1;
      const lg = c.createLinearGradient(p.x - 6, p.y - 6, p.x + 6, p.y + 6);
      lg.addColorStop(0, 'rgb(252,232,176)'); lg.addColorStop(1, 'rgb(200,152,74)');
      c.fillStyle = lg;
      c.shadowColor = 'rgba(60,34,10,0.55)'; c.shadowBlur = 1.5 * sc; c.shadowOffsetX = 0.9 * sc; c.shadowOffsetY = 1.1 * sc;
      leaf(c, p.x, p.y, ang + side * 0.42, 12.5 - row * 1.5, 3.6);
    }
  }
  c.shadowColor = 'transparent';
  // ribbons and the tie
  const ribbon = (pts) => {
    c.beginPath(); c.moveTo(...pts[0]); c.bezierCurveTo(...pts[1], ...pts[2], ...pts[3]);
    c.strokeStyle = 'rgba(80,48,16,0.8)'; c.lineWidth = 3.4; c.stroke();
    c.strokeStyle = 'rgb(236,200,128)'; c.lineWidth = 2.0; c.stroke();
  };
  ribbon([[-42, -10], [-52, -2], [-46, 10], [-55, 22]]);
  ribbon([[-42, -10], [-48, 0], [-40, 12], [-47, 26]]);
  c.fillStyle = 'rgb(226,186,110)';
  c.strokeStyle = 'rgba(80,48,16,0.8)';
  c.lineWidth = 0.8;
  c.beginPath(); c.ellipse(-42.5, -10, 3.4, 2.6, -0.5, 0, TAU); c.fill(); c.stroke();
  c.restore();
}

/** legend along the inside of the beaded border, letters upright (tops outward), centred on the top */
function legend(c, text, r, size) {
  c.save();
  c.font = serif(size, 700);
  c.textAlign = 'center';
  c.textBaseline = 'alphabetic';
  const track = size * 0.22;
  const ws = [...text].map((ch) => c.measureText(ch).width + track);
  const total = ws.reduce((a, b) => a + b, 0) - track;
  let a = -Math.PI / 2 - total / r / 2;
  for (let i = 0; i < ws.length; i++) {
    const w = ws[i] - (i === ws.length - 1 ? track : 0);
    const an = a + (ws[i] - track) / 2 / r;
    c.save();
    c.rotate(an + Math.PI / 2);
    // struck lettering: dark cut + light lip
    c.fillStyle = 'rgba(255,238,196,0.7)'; c.fillText(text[i], -0.5, -r - 0.6);
    c.fillStyle = 'rgba(96,60,20,0.85)'; c.fillText(text[i], 0, -r);
    c.restore();
    a += ws[i] / r;
    void w;
  }
  c.restore();
}

function drawCoin(c, x, y, r, a, gt, sweep) {
  if (a <= 0 || r <= 0.5) return;
  const sc = r / 100, detail = r > 70;
  c.save();
  c.globalAlpha *= a;
  c.translate(x, y);
  // shadow on the desk + a warm halo
  L.lightBlob(c, 0, 0, r * 1.9, [255, 200, 120], 0.1);
  c.save();
  c.shadowColor = 'rgba(0,0,0,0.6)'; c.shadowBlur = 24 * sc; c.shadowOffsetX = 5 * sc; c.shadowOffsetY = 9 * sc;
  c.fillStyle = 'rgb(120,86,40)';
  c.beginPath(); c.arc(0, 0, Math.max(0, r), 0, TAU); c.fill();
  c.restore();
  c.scale(sc, sc);
  // the raised rim: metal lit from the upper left
  const rim = c.createLinearGradient(-80, -80, 80, 80);
  rim.addColorStop(0, 'rgb(255,234,176)'); rim.addColorStop(0.45, 'rgb(214,168,88)'); rim.addColorStop(1, 'rgb(118,82,36)');
  c.fillStyle = rim;
  c.beginPath(); c.arc(0, 0, 100, 0, TAU); c.fill();
  // the field (slightly recessed, opposite light)
  const fg = c.createRadialGradient(-22, -30, 8, 0, 0, 92);
  fg.addColorStop(0, 'rgb(236,204,138)'); fg.addColorStop(0.6, 'rgb(204,160,86)'); fg.addColorStop(1, 'rgb(150,108,50)');
  c.fillStyle = fg;
  c.beginPath(); c.arc(0, 0, 92, 0, TAU); c.fill();
  // the inner bevel of the rim: dark on the upper left, light on the lower right
  const bv = c.createLinearGradient(-70, -70, 70, 70);
  bv.addColorStop(0, 'rgba(90,56,18,0.7)'); bv.addColorStop(1, 'rgba(255,236,186,0.8)');
  c.strokeStyle = bv; c.lineWidth = 1.8;
  c.beginPath(); c.arc(0, 0, 92, 0, TAU); c.stroke();
  // fine circular lathe sheen on the field
  if (detail) {
    c.strokeStyle = 'rgba(255,236,190,0.06)';
    c.lineWidth = 0.6;
    for (let rr = 10; rr < 90; rr += 3.2) { c.beginPath(); c.arc(0, 0, rr, 0, TAU); c.stroke(); }
  }
  // beaded border
  const nb = detail ? 84 : 48;
  for (let i = 0; i < nb; i++) {
    const an = (i / nb) * TAU, bx = Math.cos(an) * 87.5, by = Math.sin(an) * 87.5;
    c.fillStyle = 'rgba(84,52,18,0.55)';
    c.beginPath(); c.arc(bx + 0.7, by + 0.8, 1.9, 0, TAU); c.fill();
    c.fillStyle = 'rgb(232,194,120)';
    c.beginPath(); c.arc(bx, by, 1.8, 0, TAU); c.fill();
    if (detail) { c.fillStyle = 'rgba(255,246,214,0.9)'; c.beginPath(); c.arc(bx - 0.5, by - 0.6, 0.7, 0, TAU); c.fill(); }
  }
  // engraved hairline inside the beads
  c.strokeStyle = 'rgba(96,60,20,0.5)'; c.lineWidth = 0.6;
  c.beginPath(); c.arc(0, 0, 84.4, 0, TAU); c.stroke();
  if (detail) legend(c, 'CAESAR · DICT · PERPETVO', 74.5, 10.5);
  // the portrait, nudged down a touch inside the field
  c.save();
  c.translate(0, 2);
  c.scale(1.03, 1.03);
  portrait(c, sc * 1.03, detail);
  c.restore();
  // specular light on the metal + the travelling sweep (clipped to the coin)
  c.save();
  c.beginPath(); c.arc(0, 0, 100, 0, TAU); c.clip();
  c.globalCompositeOperation = 'lighter';
  const sp = c.createRadialGradient(-42, -48, 0, -42, -48, 70);
  sp.addColorStop(0, 'rgba(255,236,190,0.16)'); sp.addColorStop(1, 'rgba(255,236,190,0)');
  c.fillStyle = sp; c.fillRect(-100, -100, 200, 200);
  if (sweep > 0 && sweep < 1) {
    const sx = L.lerp(-170, 170, L.ease.inOutCubic(sweep));
    c.rotate(-0.6);
    const sg = c.createLinearGradient(sx - 34, 0, sx + 34, 0);
    sg.addColorStop(0, 'rgba(255,240,200,0)'); sg.addColorStop(0.5, `rgba(255,244,214,${0.32 * Math.sin(Math.PI * sweep)})`); sg.addColorStop(1, 'rgba(255,240,200,0)');
    c.fillStyle = sg; c.fillRect(-200, -200, 400, 400);
  }
  c.restore();
  // outer edge line
  c.strokeStyle = 'rgba(70,44,14,0.8)'; c.lineWidth = 1;
  c.beginPath(); c.arc(0, 0, 99.6, 0, TAU); c.stroke();
  c.restore();
}

export default {
  beat: 2,
  chapter: { num: '02', title: "Caesar's calendar", sub: 'The Julian calendar, 46 BC' },
  layer: 1,
  cues() {
    return [
      { t: 0.05, name: 'whoosh', gain: 0.22, pitch: 1.1 },
      { t: 1.35, name: 'shimmer', gain: 0.22, pitch: 0.9 },
      { t: 1.5, name: 'tick', gain: 0.22, pitch: 0.8 },
    ];
  },
  drawWorld(c, v) {
    const ck = coinK(v);
    if (ck <= 0) return;
    const x = v.wx(P_COIN.x), y = v.wy(P_COIN.y), r = R_U / v.cam.mpp;
    if (x < -r * 1.5 || x > L.W + r * 1.5 || y < -r * 1.5 || y > L.H + r * 1.5) return;
    drawCoin(c, x, y, r, ck, v.gt, L.prog(v.t, 1.25, 1.3));
  },
  drawOverlay(c, v) {
    const k = v.k * L.prog(v.t, 1.2, 0.6);
    if (k <= 0) return;
    // tag above the coin, in the clear band between the chapter card and the coin's rim
    const top = v.wy(P_COIN.y) - R_U / v.cam.mpp;
    const y = Math.min(520, top - 92);
    c.save();
    const sz = L.fitSize(c, '46 BC', 600, 104, 800, L.FONT.display, 40);
    L.bigLabel(c, { x: 540, y, big: '46 BC', small: 'Julius Caesar reforms the calendar', k, accent: ACCENT, size: sz, align: 'center' });
    c.restore();
  },
};
