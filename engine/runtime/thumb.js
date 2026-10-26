// Thumbnail design layer (1080x1920 Shorts cover, or a 1920x1080 video thumbnail in landscape), drawn over a clean
// engine frame by window.__thumb. Landscape: headline left-aligned on the left half (x = headX, default 110), stat under it.
// spec: {
//   zoom, fx, fy, tx, ty   reframe the clean frame: point (fx,fy) (0..1 of the frame) lands at (tx,ty) (0..1), scaled by zoom
//   lines: ['HOW HIGH', 'IS *SPACE?*']   headline; *word* = accent colour
//   stat: { big: '100 km', small: 'STRAIGHT UP', x: 540, y: 1180, align: 'center' }   optional hero callout
//   exposure: 1.4         optional brightness lift for dark frames
//   shade: 0..1            strength of the dark gradient behind the headline (default 0.85)
//   shadeEnd: px           where that gradient fades out (default 980)
// }
import * as L from './lib.js';

const { W, H } = L;

function parse(line) {
  return line.split(/(\*[^*]+\*)/).filter(Boolean).map((t) => (t.startsWith('*') ? [t.slice(1, -1), true] : [t, false]));
}

function lineWidth(c, parts) {
  return parts.reduce((a, [t]) => a + c.measureText(t).width, 0);
}

export async function drawThumb(c, canvas, spec, ep) {
  const accent = spec.accent || ep.accent;
  const src = new OffscreenCanvas(W, H);
  src.getContext('2d').drawImage(canvas, 0, 0);

  // 1. reframe the clean frame
  const z = spec.zoom ?? 1, fx = (spec.fx ?? 0.5) * W, fy = (spec.fy ?? 0.5) * H;
  const tx = (spec.tx ?? spec.fx ?? 0.5) * W, ty = (spec.ty ?? spec.fy ?? 0.5) * H;
  c.save();
  c.setTransform(1, 0, 0, 1, 0, 0);
  c.fillStyle = '#000';
  c.fillRect(0, 0, W, H);
  c.imageSmoothingQuality = 'high';
  if (spec.exposure) c.filter = `brightness(${spec.exposure}) saturate(1.1)`;
  c.drawImage(src, tx - fx * z, ty - fy * z, W * z, H * z);
  c.filter = 'none';

  if (L.LANDSCAPE) { drawLandscape(c, spec, ep, accent); c.restore(); return; }

  // 2. shade: dark top for the headline, soft floor for the Shorts UI
  const sh = spec.shade ?? 0.85;
  const se = spec.shadeEnd ?? 980;
  let g = c.createLinearGradient(0, 0, 0, se);
  g.addColorStop(0, `rgba(2,4,10,${sh})`);
  g.addColorStop(0.55, `rgba(2,4,10,${sh * 0.55})`);
  g.addColorStop(1, 'rgba(2,4,10,0)');
  c.fillStyle = g;
  c.fillRect(0, 0, W, se);
  g = c.createLinearGradient(0, H - 520, 0, H);
  g.addColorStop(0, 'rgba(2,4,10,0)');
  g.addColorStop(1, 'rgba(2,4,10,0.75)');
  c.fillStyle = g;
  c.fillRect(0, H - 520, W, 520);

  // 3. kicker: accent rule + channel + episode
  c.textBaseline = 'alphabetic';
  c.textAlign = 'left';
  const ky = 226;
  const kick = `${ep.channel}  ·  ${ep.episodeLabel ?? ep.title.toUpperCase()}`;
  let kpx = 30;
  for (; kpx > 20; kpx--) { c.font = L.font(kpx, 700, L.FONT.body); if (c.measureText(kick).width + kick.length * 5 + 76 <= 960) break; }
  c.font = L.font(kpx, 700, L.FONT.body);
  const kw = c.measureText(kick).width + kick.length * 5;
  const kx = W / 2 - (kw + 76) / 2;
  c.fillStyle = L.rgba(accent);
  c.fillRect(kx, ky - 13, 56, 6);
  c.fillStyle = 'rgba(235,232,225,0.92)';
  L.trackedText(c, kick, kx + 76, ky, 5);

  // 4. headline: auto-fit, centred, accent words, soft shadow
  const lines = spec.lines.map(parse);
  let size = spec.size ?? 200;
  for (;;) {
    c.font = L.font(size, 800, L.FONT.display);
    if (Math.max(...lines.map((p) => lineWidth(c, p))) <= 960 || size <= 90) break;
    size -= 4;
  }
  const lh = size * 0.98;
  let y = (spec.headY ?? 300) + size * 0.8;
  c.shadowColor = 'rgba(0,0,0,0.6)';
  c.shadowBlur = 30;
  c.shadowOffsetY = 6;
  for (const parts of lines) {
    let x = W / 2 - lineWidth(c, parts) / 2;
    for (const [t, acc] of parts) {
      c.fillStyle = acc ? L.rgba(accent) : '#fff';
      c.fillText(t, x, y);
      x += c.measureText(t).width;
    }
    y += lh;
  }
  c.shadowColor = 'transparent';

  // 5. hero stat callout on a dark glass plate
  const st = spec.stat;
  if (st) {
    c.font = L.font(st.size ?? 120, 800, L.FONT.display);
    const bw = c.measureText(st.big).width;
    c.font = L.font(30, 700, L.FONT.body);
    const sw = st.small ? c.measureText(st.small).width + st.small.length * 3 : 0;
    const fs = st.size ?? 120;
    const pw = Math.max(bw, sw) + 80;
    const base = 58 + fs * 0.74;                       // number baseline, from the plate top (clear of the accent rule)
    const ph = base + (st.small ? 62 : 34);
    const al = st.align ?? 'center';
    const px = al === 'center' ? st.x - pw / 2 : al === 'left' ? st.x : st.x - pw;
    const py = st.y - ph / 2;
    c.fillStyle = 'rgba(4,8,16,1)';   // opaque: cells must not show through the stat card
    L.roundRect(c, px, py, pw, ph, 22);
    c.fill();
    c.strokeStyle = L.rgba(accent, 0.55);
    c.lineWidth = 2;
    c.stroke();
    c.fillStyle = L.rgba(accent);
    c.fillRect(px + 40, py + 24, 48, 6);
    c.font = L.font(fs, 800, L.FONT.display);
    c.fillText(st.big, px + 40, py + base);
    if (st.small) {
      c.font = L.font(30, 700, L.FONT.body);
      c.fillStyle = 'rgba(235,232,225,0.9)';
      L.trackedText(c, st.small, px + 40, py + base + 46, 3);
    }
  }
  c.restore();
}

// Landscape (1920x1080): left-to-right shade, kicker, big left-aligned headline, stat plate under it.
function drawLandscape(c, spec, ep, accent) {
  const sh = spec.shade ?? 0.85, se = spec.shadeEnd ?? 1250;
  const g = c.createLinearGradient(0, 0, se, 0);
  g.addColorStop(0, `rgba(2,4,10,${sh})`);
  g.addColorStop(0.5, `rgba(2,4,10,${sh * 0.6})`);
  g.addColorStop(1, 'rgba(2,4,10,0)');
  c.fillStyle = g;
  c.fillRect(0, 0, se, H);
  const x0 = spec.headX ?? 110;
  c.textBaseline = 'alphabetic';
  c.textAlign = 'left';
  // headline: auto-fit to maxW
  const lines = spec.lines.map(parse);
  const maxW = spec.maxW ?? 1000;
  let size = spec.size ?? 190;
  for (;;) {
    c.font = L.font(size, 800, L.FONT.display);
    if (Math.max(...lines.map((p) => lineWidth(c, p))) <= maxW || size <= 80) break;
    size -= 4;
  }
  const lh = size * 0.98;
  const st = spec.stat;
  const fs = st ? (st.size ?? 110) : 0;
  const block = lines.length * lh + (st ? fs + 110 : 0);
  let y = (spec.headY ?? (H - block) / 2) + size * 0.8;
  // kicker above the headline
  c.font = L.font(30, 700, L.FONT.body);
  c.fillStyle = L.rgba(accent);
  c.fillRect(x0, y - size * 0.8 - 52, 56, 6);
  c.fillStyle = 'rgba(235,232,225,0.92)';
  L.trackedText(c, `${ep.channel}`, x0 + 76, y - size * 0.8 - 40, 5);
  c.shadowColor = 'rgba(0,0,0,0.6)';
  c.shadowBlur = 30;
  c.shadowOffsetY = 6;
  c.font = L.font(size, 800, L.FONT.display);
  for (const parts of lines) {
    let x = x0;
    for (const [t, acc] of parts) {
      c.fillStyle = acc ? L.rgba(accent) : '#fff';
      c.fillText(t, x, y);
      x += c.measureText(t).width;
    }
    y += lh;
  }
  c.shadowColor = 'transparent';
  if (st) {
    c.font = L.font(fs, 800, L.FONT.display);
    const bw = c.measureText(st.big).width;
    c.font = L.font(30, 700, L.FONT.body);
    const sw = st.small ? c.measureText(st.small).width + st.small.length * 3 : 0;
    const pw = Math.max(bw, sw) + 80, base = 44 + fs * 0.74, ph = base + (st.small ? 62 : 34);
    const px = st.x ?? x0, py = st.y ?? y - lh + size * 0.2 + 40;
    c.fillStyle = 'rgba(4,8,16,1)';   // opaque: cells must not show through the stat card
    L.roundRect(c, px, py, pw, ph, 22);
    c.fill();
    c.strokeStyle = L.rgba(accent, 0.55);
    c.lineWidth = 2;
    c.stroke();
    c.fillStyle = L.rgba(accent);
    c.fillRect(px + 40, py + 24, 48, 6);
    c.font = L.font(fs, 800, L.FONT.display);
    c.fillText(st.big, px + 40, py + base);
    if (st.small) {
      c.font = L.font(30, 700, L.FONT.body);
      c.fillStyle = 'rgba(235,232,225,0.9)';
      L.trackedText(c, st.small, px + 40, py + base + 46, 3);
    }
  }
}
