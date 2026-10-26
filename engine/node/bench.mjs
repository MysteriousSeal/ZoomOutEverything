// ms per frame for one browser, at a given motion-blur sub-sample count.
//   node engine/node/bench.mjs <episodeDir> [--sub 4] [--n 20]
import { args, closeAll, episodePaths, info, openPages, renderPng, serve } from './common.mjs';

const a = args();
const { url } = episodePaths(a._[0]);
const sub = +(a.sub || 4), n = +(a.n || 20);
const { server, port } = await serve();
const [p] = await openPages(url, 1, port);
const { frames } = await info(p);
await renderPng(p, 0, sub);  // warm-up
const t0 = performance.now();
for (let i = 0; i < n; i++) await renderPng(p, Math.floor((i + 0.5) * frames / n), sub);
const ms = (performance.now() - t0) / n;
await closeAll([p], server);
console.log(JSON.stringify({ sub, frames: n, msPerFrame: Math.round(ms), estFullRenderSec6Workers: Math.round(ms * frames / 1000 / 6) }));

// puppeteer can leave handles open after browser.close(); exit explicitly once work is done
process.exit(0);
