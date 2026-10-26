// Builder A: a small painting kit for pre-rendered sprites drawn in WORLD units (metres).
// A Painter owns a canvas covering a world rectangle at `ppm` px per metre; every path is a Path2D in metres, every blur
// radius is given in metres, so the same painting code produces identical pictures at any resolution.
import * as L from '../../../../engine/runtime/lib.js';

export const mk = (w, h = w) => { const c = new OffscreenCanvas(Math.max(1, w), Math.max(1, h)); return [c, c.getContext('2d')]; };
/** CPU-backed canvas for heavy build-time painting (reliable filters/compositing, no GPU context loss). */
export const mkCpu = (w, h = w) => { const c = new OffscreenCanvas(Math.max(1, w), Math.max(1, h)); return [c, c.getContext('2d', { willReadFrequently: true })]; };

// ------------------------------------------------------------------ geometry
/** Signed area (screen axes). */
export function area(pts) {
  let a = 0;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) a += (pts[j][0] - pts[i][0]) * (pts[j][1] + pts[i][1]);
  return a / 2;
}
/** Same orientation for every outline (so nonzero unions never punch holes). */
export const orient = (pts) => (area(pts) < 0 ? pts.slice().reverse() : pts);

/** Smooth closed Path2D through points (Catmull-Rom -> cubic Bezier). */
export function smooth(pts, closed = true, tension = 1, path = new Path2D()) {
  const n = pts.length;
  const P = (i) => (closed ? pts[(i + n) % n] : pts[L.clamp(i, 0, n - 1)]);
  path.moveTo(pts[0][0], pts[0][1]);
  const last = closed ? n : n - 1;
  for (let i = 0; i < last; i++) {
    const p0 = P(i - 1), p1 = P(i), p2 = P(i + 1), p3 = P(i + 2);
    path.bezierCurveTo(p1[0] + (p2[0] - p0[0]) / 6 * tension, p1[1] + (p2[1] - p0[1]) / 6 * tension,
      p2[0] - (p3[0] - p1[0]) / 6 * tension, p2[1] - (p3[1] - p1[1]) / 6 * tension, p2[0], p2[1]);
  }
  if (closed) path.closePath();
  const b = bbox(pts);
  path.bb = path.bb ? { x0: Math.min(path.bb.x0, b.x0), y0: Math.min(path.bb.y0, b.y0), x1: Math.max(path.bb.x1, b.x1), y1: Math.max(path.bb.y1, b.y1) } : b;
  return path;
}
export const poly = (pts, path = new Path2D()) => {
  path.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) path.lineTo(pts[i][0], pts[i][1]);
  path.closePath();
  path.bb = bbox(pts);
  return path;
};
/** Catmull-Rom sample of an open polyline of [x, y, w...] control points. */
export function spline(ctrl, per = 8) {
  const out = [], n = ctrl.length;
  const P = (i) => ctrl[L.clamp(i, 0, n - 1)];
  for (let i = 0; i < n - 1; i++) {
    const p0 = P(i - 1), p1 = P(i), p2 = P(i + 1), p3 = P(i + 2);
    for (let k = 0; k < per; k++) {
      const t = k / per, t2 = t * t, t3 = t2 * t;
      out.push(p1.map((_, d) => 0.5 * ((2 * p1[d]) + (-p0[d] + p2[d]) * t + (2 * p0[d] - 5 * p1[d] + 4 * p2[d] - p3[d]) * t2 + (-p0[d] + 3 * p1[d] - 3 * p2[d] + p3[d]) * t3)));
    }
  }
  out.push(ctrl[n - 1].slice());
  return out;
}
/**
 * Tube outline around a centre line: ctrl = [[x, y, width], ...]. capEnd / capStart: round caps.
 * Returns {pts (closed outline), left, right, centre}.
 */
export function tube(ctrl, { per = 10, capEnd = true, capStart = false } = {}) {
  const c = spline(ctrl, per), left = [], right = [], nrm = [];
  for (let i = 0; i < c.length; i++) {
    const a = c[Math.max(0, i - 1)], b = c[Math.min(c.length - 1, i + 1)];
    let tx = b[0] - a[0], ty = b[1] - a[1];
    const l = Math.hypot(tx, ty) || 1; tx /= l; ty /= l;
    const hw = c[i][2] / 2;
    nrm.push([-ty, tx]);
    left.push([c[i][0] - ty * hw, c[i][1] + tx * hw]);
    right.push([c[i][0] + ty * hw, c[i][1] - tx * hw]);
  }
  const pts = [...left];
  const cap = (i, dir) => {
    const p = c[i], hw = p[2] / 2, [nx, ny] = nrm[i], tx = ny * dir, ty = -nx * dir;
    // semicircle from left to right around the end
    for (let k = 1; k < 10; k++) {
      const a = Math.PI * k / 10, ca = Math.cos(a), sa = Math.sin(a);
      pts.push([p[0] + (nx * ca + tx * sa) * hw * dir, p[1] + (ny * ca + ty * sa) * hw * dir]);
    }
  };
  if (capEnd) cap(c.length - 1, 1);
  for (let i = right.length - 1; i >= 0; i--) pts.push(right[i]);
  if (capStart) cap(0, -1);
  return { pts: orient(pts), left, right, centre: c };
}
export function bbox(pts, pad = 0) {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const [x, y] of pts) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); }
  return { x0: x0 - pad, y0: y0 - pad, x1: x1 + pad, y1: y1 + pad };
}

// ------------------------------------------------------------------ painter
export class Painter {
  constructor(x0, y0, x1, y1, ppm) {
    Object.assign(this, { x0, y0, x1, y1, ppm });
    this.w = Math.ceil((x1 - x0) * ppm); this.h = Math.ceil((y1 - y0) * ppm);
    [this.cv, this.g] = mkCpu(this.w, this.h);
    [this.t1, this.g1] = mkCpu(this.w, this.h);
    [this.t2, this.g2] = mkCpu(this.w, this.h);
    this.world(this.g);
  }
  world(g) { g.setTransform(this.ppm, 0, 0, this.ppm, -this.x0 * this.ppm, -this.y0 * this.ppm); }
  id(g) { g.setTransform(1, 0, 0, 1, 0, 0); }
  hits(b) { return b.x1 > this.x0 && b.x0 < this.x1 && b.y1 > this.y0 && b.y0 < this.y1; }
  px(m) { return m * this.ppm; }
  blur(m) { return `blur(${Math.max(0, m * this.ppm).toFixed(2)}px)`; }
  /** A 'mask' is just the list of paths (vector; no raster memory). */
  mask(paths) { return [].concat(paths); }
  /** Fill a shape (Path2D list or a raster canvas) in white, shifted by (dx, dy) metres (source-over / destination-out only). */
  fillShape(g, shape, dx = 0, dy = 0, style = '#fff') {
    if (shape instanceof OffscreenCanvas) { this.id(g); g.drawImage(shape, dx * this.ppm, dy * this.ppm); return; }
    g.setTransform(this.ppm, 0, 0, this.ppm, (dx - this.x0) * this.ppm, (dy - this.y0) * this.ppm);
    g.fillStyle = style;
    for (const p of [].concat(shape)) g.fill(p);
    this.id(g);
  }
  /** Pixel rect covering a shape's bbox (+ pad metres, + a shifted copy), clamped; null when off-canvas. */
  rectOf(shape, padM = 0, dx = 0, dy = 0) {
    let b = null;
    for (const p of [].concat(shape)) {
      if (!p || !p.bb) return { x: 0, y: 0, w: this.w, h: this.h };
      b = b ? { x0: Math.min(b.x0, p.bb.x0), y0: Math.min(b.y0, p.bb.y0), x1: Math.max(b.x1, p.bb.x1), y1: Math.max(b.y1, p.bb.y1) } : { ...p.bb };
    }
    if (!b) return null;
    const x0 = (Math.min(b.x0, b.x0 + dx) - padM - this.x0) * this.ppm, x1 = (Math.max(b.x1, b.x1 + dx) + padM - this.x0) * this.ppm;
    const y0 = (Math.min(b.y0, b.y0 + dy) - padM - this.y0) * this.ppm, y1 = (Math.max(b.y1, b.y1 + dy) + padM - this.y0) * this.ppm;
    const X0 = Math.max(0, Math.floor(x0)), Y0 = Math.max(0, Math.floor(y0)), X1 = Math.min(this.w, Math.ceil(x1)), Y1 = Math.min(this.h, Math.ceil(y1));
    if (X1 <= X0 || Y1 <= Y0) return null;
    return { x: X0, y: Y0, w: X1 - X0, h: Y1 - Y0 };
  }
  bound(g, R) { this.id(g); g.save(); g.beginPath(); g.rect(R.x, R.y, R.w, R.h); g.clip(); }
  /** t3 = src ∩ shape (union of its paths), inside R. */
  clipTo(src, shape, R) {
    if (!this.t3) [this.t3, this.g3] = mkCpu(this.w, this.h);
    const g3 = this.g3;
    this.bound(g3, R);
    g3.globalCompositeOperation = 'source-over'; g3.globalAlpha = 1; g3.filter = 'none';
    g3.clearRect(R.x, R.y, R.w, R.h);
    this.fillShape(g3, shape);
    g3.globalCompositeOperation = 'source-in';
    g3.drawImage(src, R.x, R.y, R.w, R.h, R.x, R.y, R.w, R.h);
    g3.globalCompositeOperation = 'source-over';
    g3.restore();
    return this.t3;
  }
  /** Draw fn(g) (world coords) into a scratch layer, keep only what lies inside `clip`, composite. */
  within(clip, fn, alpha = 1, comp = 'source-over') {
    const R = clip ? this.rectOf(clip, 0.001) : { x: 0, y: 0, w: this.w, h: this.h };
    if (!R) return;
    const g = this.g1;
    this.bound(g, R);
    g.globalCompositeOperation = 'source-over'; g.globalAlpha = 1; g.filter = 'none';
    g.clearRect(R.x, R.y, R.w, R.h);
    this.world(g);
    g.save(); fn(g); g.restore();
    g.restore();
    this.id(g);
    this.comp(clip ? this.clipTo(this.t1, clip, R) : this.t1, alpha, comp, R);
  }
  comp(src, alpha = 1, comp = 'source-over', R = null) {
    const g = this.g;
    g.save(); this.id(g);
    g.globalAlpha = alpha; g.globalCompositeOperation = comp;
    if (R) g.drawImage(src, R.x, R.y, R.w, R.h, R.x, R.y, R.w, R.h); else g.drawImage(src, 0, 0);
    g.restore();
  }
  /**
   * Inner shading: colour fills the part of the shape NOT covered by the shape shifted by (dx, dy) metres, blurred.
   * Shift toward the light -> a soft terminator on the far side; no shift -> an even rim.
   */
  inner(mask, dx, dy, blurM, color, alpha = 1, comp = 'source-over') {
    const R = this.rectOf(mask, blurM * 3 + Math.hypot(dx, dy) + 0.001);
    if (!R) return;
    const g2 = this.g2, g1 = this.g1;
    this.bound(g2, R);
    g2.globalCompositeOperation = 'source-over'; g2.filter = 'none'; g2.globalAlpha = 1;
    g2.fillStyle = L.rgba(color);
    g2.clearRect(R.x, R.y, R.w, R.h);
    g2.fillRect(R.x, R.y, R.w, R.h);
    g2.globalCompositeOperation = 'destination-out';
    this.fillShape(g2, mask, dx, dy);
    g2.globalCompositeOperation = 'source-over';
    g2.restore();
    this.bound(g1, R);
    g1.globalCompositeOperation = 'source-over'; g1.globalAlpha = 1;
    g1.clearRect(R.x, R.y, R.w, R.h);
    g1.filter = this.blur(blurM);
    g1.drawImage(this.t2, R.x, R.y, R.w, R.h, R.x, R.y, R.w, R.h);
    g1.filter = 'none';
    g1.restore();
    this.comp(this.clipTo(this.t1, mask, R), alpha, comp, R);
  }
  /** Drop shadow of shapes: swept from 0 to (dx, dy) (an object of some height), blurred, composited at alpha. */
  castShadow(items, alpha, blurM, color = [8, 18, 20]) {
    let R = null;
    for (const it of items) {
      const r = this.rectOf(it.paths, blurM * 3 + 0.002, it.dx, it.dy);
      if (!r) continue;
      R = R ? (() => { const x = Math.min(R.x, r.x), y = Math.min(R.y, r.y); return { x, y, w: Math.max(R.x + R.w, r.x + r.w) - x, h: Math.max(R.y + R.h, r.y + r.h) - y }; })() : r;
    }
    if (!R) return;
    const g1 = this.g1;
    this.bound(g1, R);
    g1.globalCompositeOperation = 'source-over'; g1.globalAlpha = 1; g1.filter = 'none';
    g1.clearRect(R.x, R.y, R.w, R.h);
    g1.fillStyle = `rgb(${color.join(',')})`;
    for (const it of items) {
      const steps = it.steps ?? 6;
      for (let k = 0; k <= steps; k++) {
        const ox = it.dx * k / steps, oy = it.dy * k / steps;
        g1.setTransform(this.ppm, 0, 0, this.ppm, (ox - this.x0) * this.ppm, (oy - this.y0) * this.ppm);
        for (const p of [].concat(it.paths)) g1.fill(p);
      }
    }
    g1.restore();
    const g2 = this.g2;
    this.bound(g2, R);
    g2.clearRect(R.x, R.y, R.w, R.h);
    g2.filter = this.blur(blurM);
    g2.drawImage(this.t1, R.x, R.y, R.w, R.h, R.x, R.y, R.w, R.h);
    g2.filter = 'none';
    g2.restore();
    this.comp(this.t2, alpha, 'source-over', R);
  }
  free() { this.t1 = this.t2 = this.t3 = this.g1 = this.g2 = this.g3 = null; }
}

/** Mip chain of a sprite canvas (halving to ~32 px). */
export function mipChain(cv) {
  const out = [cv];
  let c = cv;
  while (c.width > 48 && c.height > 48) {
    const [n, g] = mk(Math.max(1, c.width >> 1), Math.max(1, c.height >> 1));
    g.imageSmoothingQuality = 'high';
    g.drawImage(c, 0, 0, n.width, n.height);
    out.push(n);
    c = n;
  }
  return out;
}
/** Draw a world-placed sprite {mips, x0, y0, ppm} with the right mip for the camera. */
export function drawSprite(c, v, s, alpha = 1) {
  if (alpha <= 0.002) return;
  const mpp = v.cam.mpp;
  const sx = L.W / 2 + (s.x0 - v.cam.x) / mpp, sy = L.H / 2 + (s.y0 - v.cam.y) / mpp;
  const sw = s.mips[0].width / s.ppm / mpp, sh = s.mips[0].height / s.ppm / mpp;
  if (sx > L.W || sy > L.H || sx + sw < 0 || sy + sh < 0) return;
  let m = 0, ratio = s.mips[0].width / sw;
  while (ratio > 1.5 && m < s.mips.length - 1) { ratio /= 2; m++; }
  c.save();
  c.globalAlpha *= alpha;
  c.imageSmoothingEnabled = true;
  c.imageSmoothingQuality = 'high';
  c.drawImage(s.mips[m], sx, sy, sw, sh);
  c.restore();
}
