// Builder A: the hero's surroundings up to ~250 m (lf 0.9 → 2.4): paths, trees (with long afternoon shadows),
// the other sunbathers on the Sheep Meadow and the walkers / runners on the paths. All positions from park-data.js, so
// builder B's meadow (lf 1.6 up) matches exactly. Light from the lower left; shadows to the upper right (0.9 x height).
import * as L from '../../../../engine/runtime/lib.js';
import { PAL, PATHS, TREES, PEOPLE, moversAt, toWorld, E_LONG, E_CROSS, SHADOW_LEN } from './park-data.js';

const { W, H } = L;
const SUN = { x: -0.6, y: 0.8 }, SH = { x: 0.6, y: -0.8 };
const mk = (w, h = w) => { const c = new OffscreenCanvas(w, h); return [c, c.getContext('2d', { willReadFrequently: true })]; };
const rgb = L.rgba;

// ------------------------------------------------------------------ tree crowns (pre-rendered, a few variants)
const CROWN_PX = 720;
let CROWNS = null;
function mipChain(cv) {
  const out = [cv];
  let c = cv;
  while (c.width > 24) { const [n, g] = mk(c.width >> 1, c.height >> 1); g.imageSmoothingQuality = 'high'; g.drawImage(c, 0, 0, n.width, n.height); out.push(n); c = n; }
  return out;
}
function crownSprite(seed, tone, elm) {
  const N = CROWN_PX, R = N * 0.47, r = L.rng(seed);
  const [cv, g] = mk(N);
  const [sh, sg] = mk(N);
  const cx = N / 2, cy = N / 2;
  // leaf clumps: positions inside an irregular disc, heights higher toward the middle
  const clumps = [];
  const n = elm ? 150 : 110;
  for (let i = 0; i < n; i++) {
    const a = r() * Math.PI * 2, d = Math.sqrt(r()) * (0.88 + 0.12 * L.noise1(a * 2.3, seed));
    const rad = R * (elm ? 0.1 + r() * 0.12 : 0.12 + r() * 0.14) * (1 - d * 0.35);
    clumps.push({ x: cx + Math.cos(a) * d * R * 0.82, y: cy + Math.sin(a) * d * R * 0.82, r: rad, h: 1 - d * d + r() * 0.15 });
  }
  clumps.sort((p, q) => p.h - q.h);
  const base = PAL.canopy[tone], light = L.mix(PAL.canopyLight, [190, 210, 120], 0.25), dark = L.mix(base, [14, 30, 12], 0.5);
  // silhouette (for the cast shadow) + a deep base so the gaps between clumps read as depth
  for (const q of clumps) {
    sg.fillStyle = '#000'; sg.beginPath(); sg.arc(q.x, q.y, q.r * 1.02, 0, Math.PI * 2); sg.fill();
    g.fillStyle = rgb(dark); g.beginPath(); g.arc(q.x, q.y, q.r * 0.95, 0, Math.PI * 2); g.fill();
  }
  for (const q of clumps) {
    // the clump's own shadow on what is below it (upper right)
    g.save();
    g.filter = `blur(${q.r * 0.25}px)`;
    g.fillStyle = 'rgba(8,20,6,0.35)';
    g.beginPath(); g.arc(q.x + SH.x * q.r * 0.45, q.y + SH.y * q.r * 0.45, q.r, 0, Math.PI * 2); g.fill();
    g.restore();
    // the clump: lit on its lower-left, deep on its upper-right; brighter the higher it is
    const k = 0.75 + 0.35 * q.h;
    const gr = g.createRadialGradient(q.x + SUN.x * q.r * 0.45, q.y + SUN.y * q.r * 0.45, q.r * 0.1, q.x, q.y, q.r * 1.05);
    gr.addColorStop(0, rgb(L.mix(base, light, Math.min(1, 0.95 * k))));
    gr.addColorStop(0.5, rgb(L.mix(base, light, 0.3 * k)));
    gr.addColorStop(1, rgb(L.mix(base, dark, 0.45)));
    g.fillStyle = gr;
    g.beginPath();
    // lumpy clump outline
    const m = 9;
    for (let j = 0; j <= m; j++) {
      const a = j / m * Math.PI * 2, rr = q.r * (0.86 + 0.18 * L.noise1(j * 1.7 + q.x * 0.1, seed + 3));
      j ? g.lineTo(q.x + Math.cos(a) * rr, q.y + Math.sin(a) * rr) : g.moveTo(q.x + Math.cos(a) * rr, q.y + Math.sin(a) * rr);
    }
    g.closePath(); g.fill();
  }
  // leaf texture: tiny light and dark specks, more light on the sunlit side
  for (let i = 0; i < (elm ? 16000 : 13000); i++) {
    const a = r() * Math.PI * 2, d = Math.sqrt(r()) * R * 0.95, x = cx + Math.cos(a) * d, y = cy + Math.sin(a) * d;
    const lit = (Math.cos(a) * SUN.x + Math.sin(a) * SUN.y) * (d / R);
    g.fillStyle = r() < 0.5 + lit * 0.4 ? `rgba(${light.join(',')},${0.12 + r() * 0.2})` : `rgba(10,24,8,${0.1 + r() * 0.2})`;
    g.beginPath(); g.ellipse(x, y, 0.8 + r() * 1.3, 0.5 + r() * 0.8, r() * 3, 0, Math.PI * 2); g.fill();
  }
  // keep the texture inside the crown silhouette
  g.globalCompositeOperation = 'destination-in';
  g.drawImage(sh, 0, 0);
  g.globalCompositeOperation = 'source-over';
  // shadow sprite: the silhouette, softened
  const [ss, sgg] = mk(N);
  sgg.filter = `blur(${N * 0.012}px)`;
  sgg.drawImage(sh, 0, 0);
  return { crown: mipChain(cv), shadow: mipChain(ss), R: R / N };
}
function crowns() {
  if (CROWNS) return CROWNS;
  CROWNS = { tree: [0, 1, 2, 3].map((t) => crownSprite(100 + t, t, false)), elm: [0, 1, 2, 3].map((t) => crownSprite(200 + t, t, true)) };
  return CROWNS;
}
function pickMip(m, px) { let i = 0; while (i < m.length - 1 && m[i].width > px * 1.6) i++; return m[i]; }

// ------------------------------------------------------------------ asphalt texture
let ASPH = null;
function asphalt() {
  if (ASPH) return ASPH;
  const N = 512, r = L.rng(12);
  const [c, g] = mk(N);
  const im = g.createImageData(N, N), d = im.data;
  for (let i = 0; i < N * N; i++) { const k = 0.9 + (r() - 0.5) * 0.22; d[i * 4] = PAL.path[0] * k; d[i * 4 + 1] = PAL.path[1] * k; d[i * 4 + 2] = PAL.path[2] * k; d[i * 4 + 3] = 255; }
  g.putImageData(im, 0, 0);
  for (let i = 0; i < 260; i++) { g.fillStyle = `rgba(${r() < 0.5 ? '90,86,80' : '210,204,190'},${0.15 + r() * 0.2})`; g.beginPath(); g.arc(r() * N, r() * N, 1 + r() * 3, 0, 7); g.fill(); }
  ASPH = c;
  return c;
}

// ------------------------------------------------------------------ helpers
const toS = (v, x, y) => [W / 2 + (x - v.cam.x) / v.cam.mpp, H / 2 + (y - v.cam.y) / v.cam.mpp];
function onScr(v, x, y, rM, pad = 60) {
  const [sx, sy] = toS(v, x, y), r = rM / v.cam.mpp;
  return sx + r > -pad && sx - r < W + pad && sy + r > -pad && sy - r < H + pad;
}
const parkAng = Math.atan2(E_LONG.y, E_LONG.x);

// ------------------------------------------------------------------ paths
export function drawPaths(c, v) {
  const mpp = v.cam.mpp;
  c.save();
  c.lineCap = 'round'; c.lineJoin = 'round';
  for (const p of PATHS) {
    const pts = p.pts.map(([u, w]) => toS(v, toWorld(u, w).x, toWorld(u, w).y));
    // cull: any segment near the screen?
    const wpx = p.w / mpp;
    let vis = false;
    for (const [x, y] of pts) if (x > -W && x < 2 * W && y > -H && y < 2 * H) vis = true;
    if (!vis && pts.length === 2) {
      // a long segment can cross the screen with both ends far away
      const [a, b] = pts, dx = b[0] - a[0], dy = b[1] - a[1], l2 = dx * dx + dy * dy || 1;
      const t = L.clamp(((W / 2 - a[0]) * dx + (H / 2 - a[1]) * dy) / l2), qx = a[0] + dx * t - W / 2, qy = a[1] + dy * t - H / 2;
      vis = Math.hypot(qx, qy) < Math.hypot(W, H) / 2 + wpx;
    }
    if (!vis) continue;
    const trace = () => { c.beginPath(); pts.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y))); };
    if (p.kind === 'plaza') {
      trace(); c.strokeStyle = rgb(PAL.stone); c.lineWidth = wpx; c.lineCap = 'butt'; c.stroke(); c.lineCap = 'round';
      continue;
    }
    const col = p.kind === 'road' ? PAL.road : p.kind === 'mall' ? L.mix(PAL.path, PAL.stone, 0.5) : PAL.path;
    // worn, slightly browned grass verge
    trace(); c.strokeStyle = rgb(PAL.grassWorn, 0.55); c.lineWidth = wpx + Math.max(1.5, 0.9 / mpp); c.stroke();
    // kerb / edge
    trace(); c.strokeStyle = rgb(PAL.pathEdge); c.lineWidth = wpx + Math.max(1, 0.18 / mpp); c.stroke();
    trace();
    if (p.kind !== 'road' && wpx > 30) {
      const pat = c.createPattern(asphalt(), 'repeat');
      const s = 0.012 / mpp;   // 512 px = 6 m
      pat.setTransform(new DOMMatrix([s, 0, 0, s, ((W / 2 - v.cam.x / mpp) % (512 * s)), ((H / 2 - v.cam.y / mpp) % (512 * s))]));
      c.strokeStyle = pat;
    } else c.strokeStyle = rgb(col);
    c.lineWidth = wpx; c.stroke();
    if (p.kind === 'road' && wpx > 6) {
      trace(); c.setLineDash([3 / mpp, 6 / mpp]); c.strokeStyle = rgb(PAL.roadLine, 0.85); c.lineWidth = Math.max(1, 0.12 / mpp); c.stroke(); c.setLineDash([]);
    }
  }
  c.restore();
}

// ------------------------------------------------------------------ trees
const treeH = (t) => t.h;
function visibleTrees(v) {
  const out = [];
  for (const t of TREES) {
    const off = treeH(t) * SHADOW_LEN;
    if (onScr(v, t.x, t.y, t.r + off, 80)) out.push(t);
  }
  return out;
}
export function drawTreeShadows(c, v, trees) {
  const C = crowns(), mpp = v.cam.mpp;
  c.save();
  for (const t of trees) {
    const set = t.elm ? C.elm : C.tree, sp = set[t.tone % 4];
    const h = treeH(t), ch = h * 0.66;   // crown centre height
    const [bx, by] = toS(v, t.x, t.y);
    const ox = SH.x * ch * SHADOW_LEN / mpp, oy = SH.y * ch * SHADOW_LEN / mpp;
    const sz = 2 * t.r / sp.R / mpp * 0.5;   // sprite px covering the crown
    // trunk shadow: from the base to the crown's shadow
    c.strokeStyle = 'rgba(10,24,8,0.42)';
    c.lineWidth = Math.max(1, 0.45 / mpp); c.lineCap = 'round';
    c.beginPath(); c.moveTo(bx, by); c.lineTo(bx + ox * 0.62, by + oy * 0.62); c.stroke();
    c.globalAlpha = 0.5;
    const img = pickMip(sp.shadow, sz);
    // the crown shadow is the crown projected along the sun: slightly elongated along SHADOW
    c.save();
    c.translate(bx + ox, by + oy);
    c.rotate(Math.atan2(SH.y, SH.x));
    c.scale(1.12, 1);
    c.drawImage(img, -sz / 2, -sz / 2, sz, sz);
    c.restore();
    c.globalAlpha = 1;
  }
  c.restore();
}
export function drawTreeCrowns(c, v, trees) {
  const C = crowns(), mpp = v.cam.mpp;
  c.save();
  c.imageSmoothingQuality = 'high';
  for (const t of trees) {
    const set = t.elm ? C.elm : C.tree, sp = set[t.tone % 4];
    const [bx, by] = toS(v, t.x, t.y);
    const sz = 2 * t.r / sp.R / mpp * 0.5;
    if (bx + sz < -40 || bx - sz > W + 40 || by + sz < -40 || by - sz > H + 40) continue;
    const img = pickMip(sp.crown, sz);
    c.save();
    c.translate(bx, by);
    c.rotate((t.u * 0.37 + t.w * 0.11) % (Math.PI * 2));   // vary the same sprite per tree (the light baked in rotates a little: keep small)
    c.rotate(-((t.u * 0.37 + t.w * 0.11) % (Math.PI * 2)) + ((t.u * 13 + t.w * 7) % 1 - 0.5) * 0.5);
    c.drawImage(img, -sz / 2, -sz / 2, sz, sz);
    c.restore();
  }
  c.restore();
}

// ------------------------------------------------------------------ sunbathers on the meadow
const SKINS = [[226, 180, 150], [198, 146, 112], [150, 104, 76], [96, 66, 48], [236, 196, 170]];
const HAIRS = [[40, 28, 20], [70, 48, 30], [150, 110, 60], [20, 16, 14], [190, 160, 110]];
// soft-shaded primitives in a figure's local frame; (lx, ly) = direction toward the sun in that frame
function capsule(c, x0, y0, x1, y1, r, col, lx, ly) {
  const dx = x1 - x0, dy = y1 - y0, l = Math.hypot(dx, dy) || 1e-6, nx = -dy / l, ny = dx / l;
  const s = Math.sign(nx * lx + ny * ly) || 1;
  const mx = (x0 + x1) / 2, my = (y0 + y1) / 2;
  const gr = c.createLinearGradient(mx + nx * r * s, my + ny * r * s, mx - nx * r * s, my - ny * r * s);
  gr.addColorStop(0, rgb(L.mix(col, [255, 250, 240], 0.22)));
  gr.addColorStop(0.45, rgb(col));
  gr.addColorStop(1, rgb(L.mix(col, [10, 14, 20], 0.38)));
  c.strokeStyle = gr; c.lineWidth = 2 * r; c.lineCap = 'round';
  c.beginPath(); c.moveTo(x0, y0); c.lineTo(x1, y1); c.stroke();
}
function ball(c, x, y, rx, ry, col, lx, ly) {
  const gr = c.createRadialGradient(x + lx * rx * 0.4, y + ly * ry * 0.4, rx * 0.1, x, y, Math.max(rx, ry));
  gr.addColorStop(0, rgb(L.mix(col, [255, 250, 240], 0.25)));
  gr.addColorStop(0.6, rgb(col));
  gr.addColorStop(1, rgb(L.mix(col, [10, 14, 20], 0.4)));
  c.fillStyle = gr;
  c.beginPath(); c.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); c.fill();
}
function drawFigureLying(c, lx, ly, skin, hair, shirt, shorts, legs) {
  // on the back, head at +x; 1.7 m long
  capsule(c, -0.82, 0.085, -0.3, 0.075, 0.055, legs, lx, ly);
  capsule(c, -0.82, -0.095, -0.3, -0.075, 0.055, legs, lx, ly);
  capsule(c, -0.3, 0.085, -0.12, 0.08, 0.07, shorts, lx, ly);
  capsule(c, -0.3, -0.085, -0.12, -0.08, 0.07, shorts, lx, ly);
  capsule(c, 0.38, 0.2, 0.05, 0.26, 0.038, skin, lx, ly);       // arms along the body
  capsule(c, 0.38, -0.2, 0.05, -0.26, 0.038, skin, lx, ly);
  capsule(c, -0.06, 0, 0.36, 0, 0.17, shirt, lx, ly);           // torso
  ball(c, 0.53, 0, 0.1, 0.08, skin, lx, ly);
  c.fillStyle = rgb(hair);
  c.beginPath(); c.ellipse(0.57, 0, 0.085, 0.088, 0, -Math.PI / 2, Math.PI / 2); c.fill();
}
function drawFigureSitting(c, lx, ly, skin, hair, shirt, shorts, legs) {
  // sitting, knees up, facing +x: legs forward, torso, head on top
  capsule(c, 0.05, 0.08, 0.48, 0.1, 0.055, legs, lx, ly);
  capsule(c, 0.05, -0.08, 0.48, -0.1, 0.055, legs, lx, ly);
  capsule(c, -0.08, 0, 0.1, 0, 0.14, shorts, lx, ly);
  capsule(c, 0.0, 0.21, 0.24, 0.13, 0.035, skin, lx, ly);       // arms around the knees
  capsule(c, 0.0, -0.21, 0.24, -0.13, 0.035, skin, lx, ly);
  ball(c, -0.07, 0, 0.13, 0.22, shirt, lx, ly);
  ball(c, -0.05, 0, 0.095, 0.095, hair, lx, ly);
}
export function drawPeople(c, v) {
  const mpp = v.cam.mpp, px = 1 / mpp;
  if (px < 1.2) return;
  c.save();
  for (let i = 0; i < PEOPLE.length; i++) {
    const p = PEOPLE[i];
    if (!onScr(v, p.x, p.y, 2.5, 40)) continue;
    const [sx, sy] = toS(v, p.x, p.y), r = L.rng(1000 + i);
    const skin = SKINS[(r() * SKINS.length) | 0], hair = HAIRS[(r() * HAIRS.length) | 0];
    const shorts = r() < 0.5 ? [50, 60, 84] : r() < 0.5 ? [180, 170, 150] : [40, 40, 44];
    c.save();
    c.translate(sx, sy);
    c.scale(px, px);
    // shadow of the figure (lying ~0.2 m high, sitting ~0.85 m), elongated toward the upper right
    const hgt = p.pose === 'lying' ? 0.2 : 0.85, sl = hgt * SHADOW_LEN;
    c.save();
    c.rotate(Math.atan2(SH.y, SH.x));
    c.fillStyle = 'rgba(8,20,8,0.32)';
    c.beginPath();
    if (p.pose === 'lying') c.ellipse(sl * 0.6, 0, 0.85 + sl * 0.3, 0.32, 0, 0, Math.PI * 2);
    else c.ellipse(sl * 0.55, 0, 0.3 + sl * 0.5, 0.27, 0, 0, Math.PI * 2);
    c.fill();
    c.restore();
    c.rotate(p.ang);
    if (p.blanket) {
      const bc = L.mix(p.blanket, [120, 120, 110], 0.18);
      c.fillStyle = 'rgba(10,24,8,0.25)';
      c.beginPath(); c.roundRect(-p.bw / 2 + 0.03, -p.bh / 2 - 0.04, p.bw, p.bh, 0.08); c.fill();
      c.fillStyle = rgb(bc); c.beginPath(); c.roundRect(-p.bw / 2, -p.bh / 2, p.bw, p.bh, 0.08); c.fill();
      c.strokeStyle = rgb(L.mix(bc, [255, 255, 255], 0.22), 0.8); c.lineWidth = 0.04; c.strokeRect(-p.bw / 2 + 0.07, -p.bh / 2 + 0.07, p.bw - 0.14, p.bh - 0.14);
    }
    const lx = SUN.x * Math.cos(-p.ang) - SUN.y * Math.sin(-p.ang), ly = SUN.x * Math.sin(-p.ang) + SUN.y * Math.cos(-p.ang);
    const legs = r() < 0.6 ? skin : shorts;
    if (p.pose === 'lying') drawFigureLying(c, lx, ly, skin, hair, p.shirt, shorts, legs);
    else drawFigureSitting(c, lx, ly, skin, hair, p.shirt, shorts, legs);
    if (p.group) {   // a friend sitting beside them on the same blanket, facing them
      c.translate(0.1, p.bh * 0.3);
      c.rotate(-Math.PI * 0.5);
      const a2 = p.ang - Math.PI * 0.5;
      const lx2 = SUN.x * Math.cos(-a2) - SUN.y * Math.sin(-a2), ly2 = SUN.x * Math.sin(-a2) + SUN.y * Math.cos(-a2);
      const sk2 = SKINS[(r() * SKINS.length) | 0];
      drawFigureSitting(c, lx2, ly2, sk2, HAIRS[(r() * HAIRS.length) | 0], [[230, 230, 225], [70, 140, 120], [190, 60, 60]][(r() * 3) | 0], shorts, sk2);
    }
    c.restore();
  }
  c.restore();
}

// ------------------------------------------------------------------ walkers and runners (animated)
export function drawMovers(c, v) {
  const mpp = v.cam.mpp, px = 1 / mpp;
  if (px < 1.2) return;
  const list = moversAt(v.gt);
  c.save();
  list.forEach((m, i) => {
    if (m.kind === 'bike' && px < 2) return;
    if (!onScr(v, m.x, m.y, 2.5, 40)) return;
    const r = L.rng(5000 + i);
    const skin = SKINS[(r() * SKINS.length) | 0], hair = HAIRS[(r() * HAIRS.length) | 0], legs = r() < 0.5 ? [44, 52, 74] : r() < 0.6 ? [30, 30, 34] : skin;
    const run = m.kind === 'run', bike = m.kind === 'bike';
    const cyc = v.gt * (run ? 1.45 : 0.9) + r() * 10;          // gait cycles per second (no foot sliding at these speeds)
    const sw = Math.sin(cyc * Math.PI * 2);
    const [sx, sy] = toS(v, m.x, m.y);
    c.save();
    c.translate(sx, sy);
    c.scale(px, px);
    // the long afternoon shadow of a standing figure (1.7 m tall -> ~1.5 m toward the upper right), legs scissoring
    c.save();
    const sa = Math.atan2(SH.y, SH.x);
    c.rotate(sa);
    c.fillStyle = 'rgba(8,20,8,0.42)';
    const L_ = 1.7 * SHADOW_LEN;
    c.beginPath(); c.ellipse(L_ * 0.62, 0, L_ * 0.36, 0.2, 0, 0, Math.PI * 2); c.fill();          // body + head
    c.beginPath(); c.ellipse(L_ * 0.86, 0, 0.1, 0.09, 0, 0, Math.PI * 2); c.fill();
    const ls = bike ? 0 : sw * 0.12;
    c.lineCap = 'round'; c.strokeStyle = 'rgba(8,20,8,0.42)'; c.lineWidth = 0.12;
    c.beginPath(); c.moveTo(0, 0.04); c.lineTo(L_ * 0.4, 0.06 + ls); c.moveTo(0, -0.04); c.lineTo(L_ * 0.4, -0.06 - ls); c.stroke();
    c.restore();
    c.rotate(m.ang);
    if (bike) {
      c.fillStyle = 'rgb(30,30,32)';
      c.fillRect(-0.85, -0.03, 1.7, 0.06);
      c.beginPath(); c.roundRect(0.55, -0.3, 0.06, 0.6, 0.03); c.fill();
    }
    // legs (seen from above they swing forward/back along the direction of travel)
    const stride = (run ? 0.42 : 0.3) * (bike ? 0.2 : 1);
    c.fillStyle = rgb(legs);
    c.beginPath(); c.roundRect(-0.05 + sw * stride - 0.07, 0.03, 0.16, 0.08, 0.04); c.fill();
    c.beginPath(); c.roundRect(-0.05 - sw * stride - 0.07, -0.11, 0.16, 0.08, 0.04); c.fill();
    // arms swing opposite to the legs
    c.fillStyle = rgb(skin);
    c.beginPath(); c.roundRect(-sw * stride * 0.8 - 0.08, 0.2, 0.18, 0.07, 0.035); c.fill();
    c.beginPath(); c.roundRect(sw * stride * 0.8 - 0.08, -0.27, 0.18, 0.07, 0.035); c.fill();
    // shoulders (shirt), head
    const lx = SUN.x * Math.cos(-m.ang) - SUN.y * Math.sin(-m.ang), ly = SUN.x * Math.sin(-m.ang) + SUN.y * Math.cos(-m.ang);
    ball(c, 0, 0, 0.13, 0.23, m.shirt, lx, ly);
    ball(c, 0.01, 0, 0.1, 0.1, hair, lx, ly);
    c.restore();
  });
  c.restore();
}

/** Everything around the hero, in order. `k` = this group's opacity (fades in as the view widens). */
export function drawPark(c, v, stage) {
  const trees = visibleTrees(v);
  if (stage === 'ground') { drawPaths(c, v); drawTreeShadows(c, v, trees); drawPeople(c, v); drawMovers(c, v); }
  else drawTreeCrowns(c, v, trees);
}
export function warmPark() { crowns(); asphalt(); }
void E_CROSS; void parkAng;
