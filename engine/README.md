# Motion Engine

Code-rendered motion graphics for every channel in this repo: **Canvas 2D drawn in headless Chrome → PNG frames → ffmpeg**, with an ElevenLabs voiceover (Brittney by default; older episodes pin a Kokoro voice) and a numpy-synthesized soundtrack. There's no editor, no stock footage and no video model. It replaces the older Pillow renderer used for The Short Answer 01–02.

Design rules for every video: [`../MOTION-PRINCIPLES.md`](../MOTION-PRINCIPLES.md).

## Pipeline

```sh
EP=ZoomOut/episodes/03-how-deep-is-the-ocean
PY=TheShortAnswer/.venv/bin/python

$PY engine/py/voice.py   $EP          # ElevenLabs (default) or Kokoro VO -> build/vo.wav + build/timeline.json (beat timing)
node engine/node/cues.mjs $EP         # every scene's sound cues -> build/cues.json
$PY engine/py/audio.py   $EP          # sfx + score + ducking -> build/mix.wav
node engine/node/render.mjs $EP --sub 4 --workers 6   # frames (motion blur x4) -> out/<slug>.mp4 + out/cover.png  (frames deleted after encode; --keep retains them)
node engine/node/thumb.mjs $EP        # <ep>/thumbnail.json -> out/thumbnail.png (clean frame + headline + stat; --probe t1,t2 --to dir for clean candidates)
node engine/node/srt.mjs $EP          # long-form: subtitles from the voice timeline -> out/<slug>.en.srt
```

Review tools:

```sh
node engine/node/shots.mjs $EP --name me_check --beats 3 --per 4   # stills + labelled contact sheet in build/shots/
node engine/node/shots.mjs $EP --name me_t --times 11.2,12.0       # specific times
node engine/node/bench.mjs $EP --sub 4                              # ms per frame
```

Use a **unique `--name`** per person or agent so screenshots never collide.

## Landscape (regular YouTube videos)

Set `"format": "landscape"` in episode.json to render **1920×1080** instead of the 1080×1920 Shorts default. `node/common.mjs` passes `?fmt=landscape` to the page, and `lib.js` exports `LANDSCAPE` and the matching `W`/`H`. Everything else adapts:
- **HUD:** `kit.js` `topBar` and `scaleBar` hug the top edge.
- **Chapter card:** sits in the lower-left third (override with `"chapterPos": {x, y}`).
- **Captions:** sit at y ≈ 930 with a 1500 px max width.
- **Vignette:** widens for 16:9.
- **Thumbnail:** `thumb.mjs` uses a landscape layout with a left-aligned headline (`headX`, `maxW`) over a left-to-right shade. Convert it to JPEG under 2 MB before uploading.
- **Contact sheets:** `shots.mjs` tiles them at 480×270.

Long-form extras:
- `"captions": false` turns off burned-in captions. Ship subtitles instead with `node engine/node/srt.mjs <ep>`, which writes `out/<slug>.en.srt` from the voice timeline.
- Voice config:
  - `"holds": {"<line index>": seconds}` adds a pause after a line.
  - `{shown~spoken}` inside a line gives the subtitle text and the TTS text separately (e.g. `{Laniakea~Lahnia-Kayah}`). Check the result with Kokoro's `tokenizer.phonemize`.
- Music preset `"vast"`: an 8-chord progression for multi-minute films.

Example: `ZoomOut/long/01-from-your-hand-to-the-edge-of-the-universe` (one continuous 28-decade zoom). Its world is a stack of scale layers drawn from env.js, and the camera is driven by a monotone spline in log(field of view).

## Episode folder

```
episode.json     slug, channel, accent, music preset, voice settings, the 7 lines, scene file list (index = beat)
camera.js        at(gt, tl) -> {x, y, mpp, anchor, scroll}   (orchestrator-owned)
env.js           drawBackground / drawForeground / drawHud / cues + world helpers (orchestrator-owned)
scenes/*.js      one file per beat (builder-owned)
build/           timeline.json, cues.json, vo.wav, mix.wav, frames/, shots/
out/             <slug>.mp4, cover.png
```

## Frame composition (`runtime/main.js`)

Motion-blurred part: `env.drawBackground` → every scene's `drawWorld` (sorted by `layer`) → `env.drawForeground` → `drawOverlay` of each scene whose beat is visible.
Crisp part: `env.drawHud` → chapter card (from `scene.chapter`) → word-by-word captions → vignette + grain.

## Scene contract

```js
import * as L from '../../../../engine/runtime/lib.js';

export default {
  beat: 2,                                   // index in the timeline (matches episode.json order)
  chapter: { num: '02', title: 'Scuba record', sub: 'Ahmed Gabr, 2014' },   // or null (no card)
  captions: true,                            // false = no captions during this beat (e.g. hook headline)
  chapterUntil(d) { return 0.3 * d; },       // optional: hide the chapter card early (seconds into the beat)
  overlayIn: false,                          // optional: overlay at full strength from the beat's first frame (default: 0.45 s fade-in)
  layer: 0,                                  // drawWorld order (higher = in front)
  cues(d) { return [{ t: 0.4, name: 'sonar', gain: 0.35, pitch: 1 }]; },   // t relative to beat start; d = beat duration
  drawWorld(ctx, v) {},    // EVERY frame: your subject in world space (cull when off-screen)
  drawOverlay(ctx, v) {},  // only around your beat: labels/callouts in screen space; multiply alpha by v.k
};
```

`v` (view): `gt` global seconds · `t` seconds since **this scene's** beat start (may be negative or > d in drawWorld) · `d` beat duration · `k` overlay visibility 0..1 (fades in at the beat start, out at its end) · `active` · `beat` (currently playing beat) · `cam {x, y, mpp, scroll}` · `wx(x)`, `wy(y)` world→screen · `ws(m)` metres→pixels · `visibleY(y0, y1)` · `accent` · `tl` timeline · `ep` episode.json.

Rules:
- **Pure function of time.** Frames render out of order in parallel browsers. No `Math.random()`, no state between frames. Use `L.rng(seed)` and `L.noise1`.
- Lines in `episode.json` may contain `|` to insert a deliberate pause (`voice.phraseGap`, default 0.8 s); the timeline then carries `phrases` and captions follow them.
- **Draw in world space** with `v.wx/v.wy/v.ws` so the camera, zoom and motion blur just work. Use screen space only for overlays.
- Never use negative radii in `arc()` (guard with `Math.max(0, r)`), and never draw text wider than ~900 px.
- Keep text out of the bottom 20% (y > 1500), the right 120 px below y = 1100, and the top HUD band (y < 300 except the chapter card).
- Captions sit at y ≈ 1335. Keep big labels clear of 1280–1390.

## Sound cue names (`engine/py/audio.py`)

`impact deep whoosh swish dive shimmer blip tick ping sonar bubbles whale creak riser swell bloom count splash` · gain 0.1–0.7 · pitch ~0.5–2.

## Library (`runtime/lib.js`)

Easing (`ease.*`, `enter`, `prog`), maths (`clamp lerp invLerp smoothstep rng noise1`), colour (`rgba mix ramp`), type (`FONT font trackedText fitSize`), shapes (`roundRect lightBlob glow`), and standard components:
- `bigLabel(ctx, {x, y, big, small, k, accent, align, size})`: the house "big number" style
- `leader()`: a callout line that draws itself in
- `dimension()`: a bracket with a label, for measurements

Fonts: Avenir Next Condensed (display), Avenir Next (body), DIN Condensed (HUD numerals), Menlo.

## Real Earth (`runtime/earth.js`)

One shared renderer for every globe: true coastlines, continents, relief, ocean depth, ice caps, terminator, city lights and atmosphere, ray-cast from NOAA ETOPO1 (`engine/assets/etopo6.bin`, 0.1° grid, ice-surface elevations; coarser mips are built automatically for small globes). **Never draw invented blob continents again.**

```js
import { drawEarth, project, unproject, geoPath, elevation, isLand, isIce } from '../../../../engine/runtime/earth.js'; // scenes/sNN-*.js
import { drawEarth, project } from '../../../engine/runtime/earth.js';                                                   // env.js, camera.js

drawEarth(c, {
  cx: 540, cy: 800, r: 400,          // screen centre + radius (px; follows the canvas transform)
  lon0: 15, lat0: 20,                // point at the disc centre (deg)
  rot: 0,                            // spin about the poles (deg, + = Earth's real spin, features move right)
  tilt: 0,                           // clockwise screen roll (deg)
  style: 'day',                      // 'day' Blue-Marble | 'night' dark land + city lights | 'frozen' snowball | 'flat' graphic
  sun: { lon: -30, lat: 10 },        // optional: subsolar point, or [x, y, z] screen-space light (x right, y up, z to viewer)
  lights: true,                      // optional: city lights on the night side (0..1; default on for 'night')
  ocean: [r,g,b], land: [r,g,b], ice: [r,g,b],   // optional colour overrides
  seaLevel: 0, seaIce: 1, iceLine: [79, -68],     // optional: bathtub sea level (m), pack-ice amount, pack-ice latitudes
  relief: 1, coast: [r,g,b],         // optional: hillshade multiplier, coastline line colour
  atmosphere: true,                  // or false / 0..1
  alpha: 1,
});
const p = project(48.86, 2.35, view);   // view = {cx, cy, r, lon0, lat0, rot, tilt} -> {x, y, z, visible}
```

- Rendered per pixel into a raster covering only the on-screen part of the disc (cap `maxPixels`, default 1.1 M), then `drawImage`d. ~30–45 ms at r = 400 uncached, ~0 when the same view repeats (LRU cache, orientation quantised to < 0.3 px).
- Pure function of its options, so it is safe for parallel, out-of-order frames. Animate `rot`/`lon0`/`sun` from `v.t`.
- Places: pass real lat/lon to `project()` for pins and labels; `geoPath()` traces lat/lon polygons on the globe (`beginPath()` first), and `unproject()` maps screen → lat/lon.
- `warm()` pre-builds the lazy tables (biome colours, city lights, mips; ~0.5 s once per page) if a first frame must be fast.
