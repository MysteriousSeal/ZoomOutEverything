// Thumbnails: a clean engine frame (no HUD/chapter/captions) + the design layer in runtime/thumb.js.
//   node engine/node/thumb.mjs <episodeDir>                         reads <ep>/thumbnail.json -> out/thumbnail.png
//   node engine/node/thumb.mjs <episodeDir> --probe 3.5,20,41 [--mode world|overlay] --to <dir>
//                                                                   clean frames only (no design) for picking a background
// thumbnail.json: { "time": 41.2, "mode": "world", ...spec }  (spec fields documented in runtime/thumb.js)
import fs from 'node:fs';
import path from 'node:path';
import { args, closeAll, episodePaths, openPages, serve } from './common.mjs';

const a = args();
const { dir, url } = episodePaths(a._[0]);
const FPS = 30;
const { server, port } = await serve();
const [p] = await openPages(url, 1, port);
const png = (u) => Buffer.from(u.slice(u.indexOf(',') + 1), 'base64');

try {
  if (a.probe) {
    const to = path.resolve(a.to || path.join(dir, 'build/shots'));
    fs.mkdirSync(to, { recursive: true });
    for (const t of String(a.probe).split(',').map(Number)) {
      const u = await p.page.evaluate((f, m) => window.__thumb(f, m, null, 1), Math.round(t * FPS), a.mode || 'world');
      const f = path.join(to, `${path.basename(dir).slice(0, 2)}_${a.mode || 'world'}_${t.toFixed(2)}.png`);
      fs.writeFileSync(f, png(u));
      console.log(f);
    }
  } else {
    const spec = JSON.parse(fs.readFileSync(path.join(dir, 'thumbnail.json'), 'utf8'));
    const u = await p.page.evaluate((f, m, s) => window.__thumb(f, m, s, 8), Math.round(spec.time * FPS), spec.mode || 'world', spec);
    fs.mkdirSync(path.join(dir, 'out'), { recursive: true });
    const out = path.join(dir, 'out', 'thumbnail.png');
    fs.writeFileSync(out, png(u));
    console.log(`done -> ${out}`);
  }
} catch (e) {
  console.error(e.message, p.errors.join('\n'));
  process.exitCode = 1;
}
await closeAll([p], server);
process.exit(process.exitCode ?? 0);
