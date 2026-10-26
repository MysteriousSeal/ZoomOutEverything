import fs from 'fs';
const src = fs.readFileSync(new URL('../engine/runtime/main.js', import.meta.url), 'utf8');
const m = src.match(/function captionGroups\(tl\) \{[\s\S]*?\n\}\n/)[0];
const captionGroups = new Function(m + '; return captionGroups;')();
const tl = JSON.parse(fs.readFileSync(process.argv[2],'utf8'));
for (const g of captionGroups(tl)) console.log(g.start.toFixed(2), (g.end-g.start).toFixed(2), g.words.map(w=>w[1]).join(' '));
