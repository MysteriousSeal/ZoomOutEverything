// Export every scene's sound cues (absolute times) to build/cues.json for the audio mixer.
//   node engine/node/cues.mjs <episodeDir>
import fs from 'node:fs';
import path from 'node:path';
import { args, closeAll, episodePaths, openPages, serve } from './common.mjs';

const a = args();
const { dir, url } = episodePaths(a._[0]);
const { server, port } = await serve();
const [p] = await openPages(url, 1, port);
const cues = await p.page.evaluate(() => window.__cues());
await closeAll([p], server);
fs.writeFileSync(path.join(dir, 'build/cues.json'), JSON.stringify(cues, null, 1));
console.log(`${cues.length} cues -> build/cues.json`);

// puppeteer can leave handles open after browser.close(); exit explicitly once work is done
process.exit(0);
