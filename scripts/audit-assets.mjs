import { readdirSync, readFileSync, statSync, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
const root=resolve('.');let count=0;
for(const file of readdirSync('src/design').filter(f=>f.endsWith('.tsx'))){
 const code=readFileSync(join('src/design',file),'utf8');
 for(const match of code.matchAll(/"(\/assets\/[^"\n]+)"/g)){
  const path=join(root,'public',match[1]);if(!existsSync(path)||statSync(path).size===0)throw new Error(`Missing asset: ${file}: ${match[1]}`);count++;
 }
}
const manifest=JSON.parse(readFileSync('public/puzzles.json'));
for(const asset of manifest.assets) for(const key of ['svg','png']) if(!existsSync(join('public',asset[key]))||!statSync(join('public',asset[key])).size)throw new Error(`Missing clue: ${asset.id}`);
for(const p of manifest.puzzles)for(const c of p.components)if(!manifest.assets.some(a=>a.id===(c.assetId||c.content.assetId)))throw new Error(`Unresolved clue in ${p.id}`);
console.log(`Verified ${count} Figma asset references, ${manifest.assets.length} bank assets and ${manifest.puzzles.length} puzzle layouts.`);
