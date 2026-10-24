import { mkdirSync, cpSync, readFileSync, writeFileSync, existsSync, readdirSync, rmSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
const root=resolve('.'), release=join(root,'release'), out=join(release,'Password-Challenge-Windows');
rmSync(out,{recursive:true,force:true});mkdirSync(out,{recursive:true});
for(const item of ['dist','server','private','config.json','package.json'])cpSync(join(root,item),join(out,item),{recursive:true});
// The server reads the question manifest but exposes only compiled dist to the browser.
mkdirSync(join(out,'public'),{recursive:true});cpSync('public/puzzles.json',join(out,'public/puzzles.json'));
for(const file of readdirSync('windows'))cpSync(join('windows',file),join(out,file));
cpSync('README.md',join(out,'READ-ME-FIRST.md'));
const version='v22.23.3',base=`https://nodejs.org/dist/${version}/`,name=`node-${version}-win-x64.zip`,archive=join(release,name);
if(!existsSync(archive))execFileSync('curl',['-fsSL','--retry','2',base+name,'-o',archive],{stdio:'inherit'});
const sums=execFileSync('curl',['-fsSL',base+'SHASUMS256.txt'],{encoding:'utf8'});
const expected=sums.split('\n').find(l=>l.endsWith(' '+name))?.split(/\s+/)[0];
const actual=createHash('sha256').update(readFileSync(archive)).digest('hex');
if(!expected||expected!==actual)throw new Error('Node runtime checksum verification failed.');
mkdirSync(join(out,'runtime'),{recursive:true});
execFileSync('python3',['-c',`import zipfile,pathlib,sys
with zipfile.ZipFile(sys.argv[1]) as z:
 for name in ['node.exe','LICENSE']:
  m=next(n for n in z.namelist() if n.endswith('/'+name))
  pathlib.Path(sys.argv[2],name).write_bytes(z.read(m))`,archive,join(out,'runtime')]);
const zip=join(release,'Password-Challenge-Windows.zip');
execFileSync('python3',['-c',`import zipfile,pathlib,sys
root=pathlib.Path(sys.argv[1])
with zipfile.ZipFile(sys.argv[2],'w',zipfile.ZIP_DEFLATED,compresslevel=6) as z:
 for p in root.rglob('*'):
  if p.is_file():z.write(p,p.relative_to(root.parent))`,out,zip]);
const sha=createHash('sha256').update(readFileSync(zip)).digest('hex');writeFileSync(zip+'.sha256',sha+'  Password-Challenge-Windows.zip\n');
console.log(`Windows package ready: ${zip}\nRuntime checksum verified. No player data included.`);
