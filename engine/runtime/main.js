// Compositor: assembles every frame from the episode's camera, environment and scene files.
// Owned by the orchestrator — scene builders: do not edit.
//
// Frame = [motion-blurred part]  env.drawBackground → scene.drawWorld (all) → env.drawForeground
//                                → scene.drawOverlay (scenes whose beat is visible)
//         [crisp part]           env.drawHud → chapter card → captions → vignette + grain
import * as L from './lib.js';

const { W, H, FPS } = L;
const params = new URLSearchParams(location.search);
const EP = params.get('ep');  // e.g. /ZoomOut/episodes/03-how-deep-is-the-ocean

const main = document.getElementById('c');
main.width = W; main.height = H;   // 1080x1920 portrait, or 1920x1080 when ?fmt=landscape (lib.js)
const ctx = main.getContext('2d');
const layer = new OffscreenCanvas(W, H);
const lctx = layer.getContext('2d');

let ep, tl, camera, env, scenes, groups, grain;
// Preroll (episode.json "preroll": {line, scene, from, rate, overlays}): a cold-open hook BEFORE the film. Its voice line
// is the timeline's first line; `tl` below is the MAIN timeline (that line removed, absolute times kept), so every
// existing camera/env/scene index is unchanged. During the preroll the world (camera, background, every scene's
// drawWorld, and their overlays if `overlays`) is rendered at film time `from` s after the main start, advancing at
// `rate`, under the preroll scene's own headline; HUD, chapter cards and captions are off.
let pre = null;
let clean = null;   // thumbnails: 'world' = world layers only, 'overlay' = + scene overlays; both skip HUD/chapter/captions

async function init() {
  ep = await (await fetch(`${EP}/episode.json`)).json();
  tl = await (await fetch(`${EP}/build/timeline.json`)).json();
  if (ep.preroll) {
    pre = { rate: 0.25, overlays: true, ...ep.preroll, scene: (await import(`${EP}/${ep.preroll.scene}`)).default };
    tl = { ...tl, scenes: tl.scenes.slice(1), lines: tl.lines.slice(1) };
    pre.end = tl.scenes[0].start;
  }
  camera = await import(`${EP}/camera.js`);
  env = await import(`${EP}/env.js`);
  scenes = [];
  for (const s of ep.scenes) scenes.push((await import(`${EP}/${s}`)).default);
  groups = captionGroups(tl);
  grain = makeGrain();
  await Promise.all([
    document.fonts.load(L.font(80, 800, L.FONT.display)),
    document.fonts.load(L.font(80, 700, L.FONT.display)),
    document.fonts.load(L.font(80, 600, L.FONT.display)),
    document.fonts.load(L.font(40, 600, L.FONT.body)),
    document.fonts.load(L.font(40, 700, L.FONT.body)),
    document.fonts.load(L.font(40, 700, L.FONT.din)),
    document.fonts.load(L.font(40, 400, L.FONT.mono)),
  ]);
  return { total: tl.total, frames: Math.ceil(tl.total * FPS), scenes: scenes.length };
}

// ------------------------------------------------------------------ timing
function beatAt(gt) {
  let b = 0;
  tl.scenes.forEach((s, i) => { if (s.start <= gt + 1e-9) b = i; });
  return b;
}

/** Visibility of a scene's overlay: fades in at its start, out just after its end. */
function overlayK(i, gt) {
  const s = tl.scenes[i];
  const last = i === tl.scenes.length - 1;
  // scene.overlayIn === false: on at full strength from the beat's first frame (cold-open hooks)
  const kin = scenes[i].overlayIn === false ? (gt >= s.start - 0.05 ? 1 : 0)   /* 0.05 s: motion-blur sub-frames reach slightly before the start */ : L.ease.outCubic(L.prog(gt, s.start, 0.45));
  const kout = last ? 1 : 1 - L.ease.inCubic(L.prog(gt, s.end - 0.3, 0.3));   // gone by the beat end: no label ghosts into the next beat
  return Math.min(kin, kout);
}

function makeView(gt) {
  const cam = camera.at(gt, tl);
  const beat = beatAt(gt);
  const sc = tl.scenes[beat];
  const ws = (m) => m / cam.mpp;
  return {
    gt, cam, beat, tl, ep,
    t: gt - sc.start, d: sc.end - sc.start,
    accent: ep.accent,
    wx: (x) => W / 2 + (x - cam.x) / cam.mpp,
    wy: (y) => H * (cam.anchor ?? 0.5) + (y - cam.y) / cam.mpp,
    ws,
    visibleY: (y0, y1, pad = 200) => {   // is world range [y0,y1] on screen?
      const a = H * (cam.anchor ?? 0.5) + (y0 - cam.y) / cam.mpp, b = H * (cam.anchor ?? 0.5) + (y1 - cam.y) / cam.mpp;
      return b > -pad && a < H + pad;
    },
  };
}

function sceneView(v, i) {
  const s = tl.scenes[i];
  return { ...v, t: v.gt - s.start, d: s.end - s.start, k: overlayK(i, v.gt), index: i, active: i === v.beat };
}

// ------------------------------------------------------------------ frame
const inPre = (gt) => !!pre && gt < pre.end;
/** film time shown at real time gt (the preroll replays a later moment, slowed down) */
const worldGt = (gt) => (inPre(gt) ? pre.end + pre.from + pre.rate * Math.max(0, gt) : gt);

function drawBlurred(c, gt) {
  const real = gt, pr = inPre(real);
  gt = worldGt(real);
  const v = makeView(gt);
  c.save();
  env.drawBackground(c, v);
  const order = scenes.map((s, i) => [s.layer ?? 0, i]).sort((a, b) => a[0] - b[0]);
  for (const [, i] of order) {
    if (scenes[i].drawWorld) { c.save(); scenes[i].drawWorld(c, sceneView(v, i)); c.restore(); }
  }
  env.drawForeground?.(c, v);
  for (let i = 0; i < scenes.length; i++) {
    const s = tl.scenes[i];
    if (clean === 'world' || (pr && !pre.overlays)) break;
    if (scenes[i].drawOverlay && gt >= s.start - 0.01 && gt <= s.end + 0.5) {
      const sv = sceneView(v, i);
      if (sv.k > 0.001) { c.save(); scenes[i].drawOverlay(c, sv); c.restore(); }
    }
  }
  if (pr) {   // the preroll's own layer: real time, the replayed camera
    const k = real < pre.end ? 1 : 0;   // the headline holds at full strength to the cut (any fade window caught the last frame)
    const pv = { ...v, gt: real, t: real, d: pre.end, k, active: true, filmGt: gt };
    if (pre.scene.drawWorld) { c.save(); pre.scene.drawWorld(c, pv); c.restore(); }
    if (pre.scene.drawOverlay && clean !== 'world') { c.save(); pre.scene.drawOverlay(c, pv); c.restore(); }
  }
  c.restore();
}

function renderFrame(frame, sub = 1, shutter = 0.5) {
  const gt = frame / FPS;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = 'source-over';
  if (sub <= 1) {
    ctx.clearRect(0, 0, W, H);
    drawBlurred(ctx, gt);
  } else {
    // motion blur: average `sub` sub-frames spread over the shutter interval
    for (let k = 0; k < sub; k++) {
      lctx.setTransform(1, 0, 0, 1, 0, 0);
      lctx.globalAlpha = 1;
      lctx.clearRect(0, 0, W, H);
      let st = gt + ((k + 0.5) / sub - 0.5) * shutter / FPS;
      if (inPre(st) !== inPre(gt)) st = inPre(gt) ? pre.end - 1e-4 : pre.end;   // never blend the cold open into the film across the cut
      drawBlurred(lctx, st);
      ctx.globalAlpha = 1 / (k + 1);
      ctx.drawImage(layer, 0, 0);
    }
    ctx.globalAlpha = 1;
  }
  const v = makeView(gt);
  if (!clean && !inPre(gt)) {
    ctx.save();
    if (pre) ctx.globalAlpha = L.ease.outCubic(L.prog(gt, pre.end, 0.35));   // the HUD eases on after the cold open, never pops
    env.drawHud?.(ctx, v);
    ctx.restore();
    drawChapter(ctx, v);
    drawCaptions(ctx, v);
  }
  drawFinish(ctx, frame);
  return main.toDataURL('image/png');
}

// ------------------------------------------------------------------ HUD: chapter card
function drawChapter(c, v) {
  const sc = scenes[v.beat];
  if (!sc.chapter) return;
  const t = v.t;
  // consecutive chapters hand over in place (tile stays, titles crossfade) instead of fading to an empty tile
  const prev = v.beat > 0 ? scenes[v.beat - 1] : null, next = scenes[v.beat + 1];
  const prevD = v.beat > 0 ? tl.scenes[v.beat - 1].end - tl.scenes[v.beat - 1].start : 0;
  const prevEarly = prev?.chapterUntil?.(prevD) != null;
  const handIn = !!(prev?.chapter && !prevEarly);
  const until = sc.chapterUntil?.(v.d);   // optional: scene hides its card early (e.g. for a clean reveal)
  const handOut = !!(next?.chapter && until == null);
  const kin = handIn ? 1 : L.prog(t, 0.05, 0.6);
  let kout = v.beat < scenes.length - 1 && !handOut ? L.prog(t, v.d - 0.3, 0.3) : 0;
  if (until != null) kout = Math.max(kout, L.prog(t, until, 0.4));
  const k = L.ease.outCubic(kin) * (1 - L.ease.inCubic(kout));
  if (k <= 0) return;
  // portrait: under the top bar · landscape: lower-third, bottom left (or ep.chapterPos = {x, y})
  const pos = ep.chapterPos ?? (L.LANDSCAPE ? { x: 96, y: H - 128 } : { x: 64, y: 238 });
  const x = pos.x, y = pos.y;
  // sequential, not overlapping: the old title lifts out (0–0.18 s), then the new one settles in (0.16–0.42 s)
  const xo = handIn ? L.ease.inCubic(L.prog(t, 0, 0.18)) : 1, xf = handIn ? L.ease.outCubic(L.prog(t, 0.18, 0.26)) : 1;   // new title starts exactly as the old one is gone: no double exposure
  c.save();
  c.globalAlpha = k;
  // number tile
  c.fillStyle = L.rgba(ep.accent);
  L.roundRect(c, x, y - 32, 64 * (handIn ? 1 : L.ease.outBack(Math.min(1, kin * 1.3))), 64, 10);
  c.fill();
  c.fillStyle = L.rgba(L.INK);
  c.font = L.font(36, 700, L.FONT.din);
  c.textBaseline = 'middle';
  c.textAlign = 'center';
  if (handIn) {
    c.globalAlpha = k * (1 - xo); c.fillText(prev.chapter.num, x + 32, y + 3 - 10 * xo);
    c.globalAlpha = k * xf; c.fillText(sc.chapter.num, x + 32, y + 3 + 10 * (1 - xf));
    c.globalAlpha = k;
  } else if (kin > 0.3) c.fillText(sc.chapter.num, x + 32, y + 3);
  const text = (ch, a, dy) => {
    c.globalAlpha = k * a;
    c.textAlign = 'left';
    // soft dark halo keeps the card readable over bright skies / busy grids
    c.shadowColor = 'rgba(2,6,14,0.85)';
    c.shadowBlur = 14;
    c.fillStyle = L.rgba(L.WHITE);
    c.font = L.font(40, 700, L.FONT.display);
    c.textBaseline = 'alphabetic';
    L.trackedText(c, ch.title.toUpperCase(), x + 94, y + 2 + dy, 4);
    if (ch.sub) {
      c.fillStyle = L.rgba([175, 190, 210], 0.95);
      c.font = L.font(25, 500, L.FONT.body);
      L.trackedText(c, ch.sub, x + 94, y + 34 + dy, 0.5);
      L.trackedText(c, ch.sub, x + 94, y + 34 + dy, 0.5);   // second pass doubles the halo
    }
  };
  c.save();
  if (handIn) {
    if (xo < 1) text(prev.chapter, 1 - xo, -8 * xo);
    text(sc.chapter, xf, 8 * (1 - xf));
  } else {
    // title + subtitle wipe in
    c.beginPath();
    c.rect(x + 76, y - 60, 900 * L.ease.outCubic(L.prog(t, 0.15, 0.6)), 120);
    c.clip();
    text(sc.chapter, 1, 0);
  }
  c.restore();
  c.restore();
}

// ------------------------------------------------------------------ captions
function captionGroups(tl) {
  const out = [];
  for (const [li, ln] of tl.lines.flatMap((l, i) => (l.phrases ?? [l]).map((ph) => [i, ph]))) {
    const words = ln.text.toUpperCase().split(/\s+/);
    // a word's time share follows its SPOKEN length: "95%" is "ninety-five percent", "2027" is "twenty twenty-seven"
    const spokenLen = (w) => {
      const d = (w.match(/\d/g) || []).join('');
      if (!d) return /^KM\W*$/.test(w) ? 10 : w.replace(/\W/g, '').length;
      const core = d.replace(/0{3,}$/, ''), z = d.length - core.length;
      return core.length * 4 + (z >= 3 ? 8 : 0) + (w.includes('%') ? 7 : 0);
    };
    const weights = words.map((w) => spokenLen(w) + 1.5 + (/[,.?!:]$/.test(w.replace(/\/$/, '')) ? 3 : 0));
    const total = weights.reduce((a, b) => a + b, 0);
    let acc = 0;
    const timed = words.map((w, i) => { const st = ln.start + (ln.end - ln.start) * acc / total; acc += weights[i]; return [st, w.replace(/\/$/, '').replace(/[,.:]$/, '')]; });   // "{history/~history}" = caption-only break after the word
    let chunk = [];
    const mine = [];
    timed.forEach(([st, w], i) => {
      chunk.push([st, w]);
      // never split inside a spoken number ("A HUNDRED AND | THIRTY" would read as 30): joiner/number words extend the chunk
      const joiner = /^(A|AN|AND|THE|EL|LA|YOUR|MY|HIS|HER|OUR|THEIR|ITS|OF|ON|IN|AT|TO|BY|FOR|FROM|WITH|INTO|OUT|THAN|AS|ONE|TWO|THREE|FOUR|FIVE|SIX|SEVEN|EIGHT|NINE|TEN|ELEVEN|TWELVE|TWENTY|THIRTY|FORTY|FIFTY|SIXTY|SEVENTY|EIGHTY|NINETY|HUNDRED|HUNDREDS|THOUSAND|THOUSANDS|MILLION|BILLION|HALF|QUARTER|TENS|NEW|DOESNT|DONT|DIDNT|WOULD|COULD|WILL|JANUARY|FEBRUARY|MARCH|APRIL|MAY|JUNE|JULY|AUGUST|SEPTEMBER|OCTOBER|NOVEMBER|DECEMBER)$/.test(w.replace(/[^A-Z]/g, ''))
        || (chunk.length < 5 && [1, 2].some((o) => /\/$/.test(words[i + o] ?? '')))   // a caption break marker just ahead wins
        || /\d/.test(w)                                      // a numeral keeps its unit: "38 | MILLION YEARS", "11:48 | P.M."
        || (((/\d/.test(timed[i + 1]?.[1] ?? '') && chunk.length < 5) || /^(OUT|UP|OFF|DOWN|AWAY|BACK)$/.test(timed[i + 1]?.[1] ?? '')
          || (/^(YOU|IT|THEM|US|ME)$/.test(timed[i + 1]?.[1] ?? '') && /^(OUT|UP|OFF|DOWN|AWAY|BACK)\W*$/.test(timed[i + 2]?.[1] ?? ''))) && chunk.length < 6);   // …and phrasal verbs: "WIPED | OUT"    // …and its lead-in: "DECEMBER | 30" must not split
      if ((chunk.length >= 3 && !joiner) || chunk.length === 7 || /[,.?!:/]$/.test(words[i]) || i === timed.length - 1) {
        mine.push({ words: chunk, start: chunk[0][0], lineEnd: ln.end, beat: li, stop: /[.?!:]$/.test(words[i]) });   // stop: ends a sentence
        chunk = [];
      }
    });
    // no lone-word groups ("…A HUNDRED TIMES | DARKER", "THEN, | FOR MONTHS"): a single word joins its neighbour
    // (a 6-word result is re-broken by the splitter below), never across a sentence end ("…A PASSENGER JET. | TENSION IS…")
    for (let k = 0; k < mine.length; k++) {
      if (mine.length < 2 || mine[k].words.length !== 1) continue;
      const g = mine[k], nx = mine[k + 1], pv = mine[k - 1];
      const toNx = nx && nx.words.length <= 5 && !g.stop, toPv = pv && pv.words.length <= 5 && !pv.stop;
      if (toNx) { nx.words.unshift(...g.words); nx.start = g.start; mine.splice(k--, 1); }
      else if (toPv || (pv && pv.words.length <= 5)) { pv.words.push(...g.words); pv.stop = g.stop; mine.splice(k--, 1); }
    }
    // long groups shrink the type: split anything over 6 words at the most natural point (never after an article,
    // preposition or number word, never before a numeral), keeping at least 2 words a side
    const HARD = /^(A|AN|THE|OF|ON|IN|AT|TO|BY|FOR|FROM|WITH|INTO|THAN|AS|AND|ONE|TWO|THREE|FOUR|FIVE|SIX|SEVEN|EIGHT|NINE|TEN|ELEVEN|TWELVE|TWENTY|THIRTY|FORTY|FIFTY|SIXTY|SEVENTY|EIGHTY|NINETY|HUNDRED|THOUSAND|MILLION|BILLION|NEW)$/;
    for (let k = 0; k < mine.length; k++) {
      const g = mine[k], n = g.words.length;
      const chars = g.words.reduce((a, w) => a + w[1].length + 1, -1);
      if (n < 7 && (chars <= 24 || n < 4)) continue;   // also split lines too wide to set at full size
      let best = -1, bestP = Infinity;
      for (let j = 2; j <= n - 2; j++) {   // break before word j
        const a = g.words[j - 1][1].replace(/[^A-Z]/g, ''), b = g.words[j][1];
        let p = Math.abs(n - 2 * j) + (HARD.test(a) ? 10 : 0) + (/\d/.test(b) ? 10 : 0) + (/^(OUT|UP|OFF|DOWN|AWAY|BACK)$/.test(b) ? 6 : 0) + (/^(IS|ARE|WAS|WERE)$/.test(b) ? 3 : 0) + (/\d/.test(g.words[j - 1][1]) ? 6 : 1);
        if (Math.min(g.words[j][0] - g.words[0][0], g.lineEnd - g.words[j][0]) < 0.8) p += 8;   // each half must stay up long enough to read
        if (p < bestP) { bestP = p; best = j; }
      }
      if (bestP >= 8) continue;   // no clean break: a slightly smaller line beats a bad split
      const tail = { ...g, words: g.words.slice(best), start: g.words[best][0] };
      g.words = g.words.slice(0, best);
      g.stop = false;
      mine.splice(k + 1, 0, tail);
    }
    // a group up under 0.8 s can't be read: it joins its neighbour if the line stays short (≤ 6 words, ≤ 28 chars)
    const len = (ws) => ws.reduce((a, w) => a + w[1].length + 1, -1);
    for (let k = 0; k < mine.length; k++) {
      const g = mine[k], nx = mine[k + 1], pv = mine[k - 1];
      if ((nx ? nx.start : ln.end) - g.start >= 0.8) continue;
      if (nx && !g.stop && g.words.length + nx.words.length <= 6 && len([...g.words, ...nx.words]) <= 28) { nx.words.unshift(...g.words); nx.start = g.start; mine.splice(k--, 1); }
      else if (pv && !pv.stop && pv.words.length + g.words.length <= 6 && len([...pv.words, ...g.words]) <= 28) { pv.words.push(...g.words); pv.stop = g.stop; mine.splice(k--, 1); }
    }
    out.push(...mine);
  }
  out.forEach((g, i) => { const n = out[i + 1]; g.end = n ? Math.min(n.start, g.lineEnd + 0.35) : g.lineEnd + 0.9; g.tail = !n || n.start > g.end + 1e-6; });
  return out;
}

function drawCaptions(c, v) {
  if (ep.captions === false) return;   // e.g. long-form videos ship subtitles as an .srt instead (node/srt.mjs)
  if (scenes[v.beat].captions === false) return;
  const g = groups.find((g) => g.start <= v.gt && v.gt < g.end);
  if (!g || scenes[g.beat]?.captions === false) return;
  let active = 0;
  g.words.forEach(([st], i) => { if (st <= v.gt) active = i; });
  const gOut = g.tail ? 1 - L.prog(v.gt, g.end - 0.12, 0.12) : 1;   // last chunk before a pause eases out instead of vanishing on one frame
  if (gOut <= 0) return;
  const age = v.gt - g.start;
  const y = L.LANDSCAPE ? H - 150 : (ep.captionY ?? 1335);   // episode.json captionY moves Shorts captions (keep ≤ ~1460: YouTube's title overlay)
  const maxW = L.LANDSCAPE ? 1500 : 800;   // Shorts: centred, so the right edge stays left of the UI column (x ≤ 940)
  let size = L.LANDSCAPE ? 72 : 78;
  c.save();
  c.textBaseline = 'middle';
  const sp = () => c.measureText(' ').width + 4;
  for (;;) {
    c.font = L.font(size, 800, L.FONT.display);
    const w = g.words.reduce((a, [, wd]) => a + c.measureText(wd).width, 0) + sp() * (g.words.length - 1);
    if (w <= maxW || size <= 48) break;
    size -= 4;
  }
  const widths = g.words.map(([, wd]) => c.measureText(wd).width);
  const total = widths.reduce((a, b) => a + b, 0) + sp() * (g.words.length - 1);
  let x = W / 2 - total / 2;
  g.words.forEach(([st, wd], i) => {
    const wk = L.ease.outBack(L.prog(v.gt, st - 0.05, 0.22), 2.2);
    const lift = (1 - L.clamp(wk)) * 6;   // a small rise: bigger offsets read as misaligned baselines
    c.globalAlpha = L.clamp(0.6 + wk) * gOut;   // upcoming words stay legible over bright scenes
    c.lineJoin = 'round';
    c.lineWidth = 10;
    c.strokeStyle = 'rgba(2,6,14,0.75)';
    c.strokeText(wd, x, y + lift);
    c.fillStyle = i === active ? L.rgba(ep.accent) : '#fff';
    c.fillText(wd, x, y + lift);
    x += widths[i] + sp();
  });
  c.restore();
  void age;
}

// ------------------------------------------------------------------ finish: vignette + grain
function makeGrain() {
  const n = 256, g = new OffscreenCanvas(n, n), gc = g.getContext('2d');
  const img = gc.createImageData(n, n), r = L.rng(7);
  for (let i = 0; i < n * n; i++) {
    const v = 128 + (r() + r() + r() - 1.5) * 90;
    img.data[i * 4] = img.data[i * 4 + 1] = img.data[i * 4 + 2] = v;
    img.data[i * 4 + 3] = 255;
  }
  gc.putImageData(img, 0, 0);
  return g;
}

function drawFinish(c, frame) {
  const vg = L.LANDSCAPE
    ? c.createRadialGradient(W / 2, H * 0.5, H * 0.42, W / 2, H * 0.5, W * 0.62)
    : c.createRadialGradient(W / 2, H * 0.48, H * 0.25, W / 2, H * 0.5, H * 0.75);
  vg.addColorStop(0, 'rgba(0,0,0,0)');
  vg.addColorStop(1, 'rgba(0,0,0,0.55)');
  c.fillStyle = vg;
  c.fillRect(0, 0, W, H);
  c.save();
  c.globalCompositeOperation = 'overlay';
  c.globalAlpha = 0.07;
  const pat = c.createPattern(grain, 'repeat');
  const r = L.rng(frame + 1);
  c.translate(-r() * 256, -r() * 256);
  c.fillStyle = pat;
  c.fillRect(0, 0, W + 256, H + 256);
  c.restore();
}

window.__init = init;
window.renderFrame = renderFrame;
/** Thumbnail: render a clean frame (mode 'world' | 'overlay'), then lay the thumbnail design over it. */
window.__thumb = async (frame, mode, spec, sub = 4) => {
  clean = mode;
  renderFrame(frame, sub);
  clean = null;
  if (spec) {
    const { drawThumb } = await import('./thumb.js');
    await drawThumb(ctx, main, spec, ep);
  }
  return main.toDataURL('image/png');
};
window.__cues = () => {
  const out = [];
  scenes.forEach((s, i) => {
    const sc = tl.scenes[i];
    for (const q of s.cues?.(sc.end - sc.start) ?? []) out.push({ ...q, t: sc.start + q.t, scene: i });
  });
  for (const q of env.cues?.(tl) ?? []) out.push({ ...q, scene: 'env' });
  if (pre) for (const q of pre.scene.cues?.(pre.end) ?? []) out.push({ ...q, scene: 'preroll' });
  return out.sort((a, b) => a.t - b.t);
};
