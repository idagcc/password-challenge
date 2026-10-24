"""Reuse byte-identical Figma exports without modifying artwork or geometry."""
from pathlib import Path
import hashlib,json
root=Path(__file__).resolve().parent.parent
folder=root/'public/assets/figma';groups={};aliases={}
for p in sorted(folder.iterdir()):
 if p.is_file():groups.setdefault(hashlib.sha256(p.read_bytes()).hexdigest(),[]).append(p)
for group in groups.values():
 canonical=group[0]
 for p in group[1:]:
  aliases['/assets/figma/'+p.name]='/assets/figma/'+canonical.name
  p.unlink()
for p in (root/'src/design').glob('*.tsx'):
 s=p.read_text()
 for old,new in aliases.items():s=s.replace('"'+old+'"','"'+new+'"')
 p.write_text(s)
manifest=root/'design-reference/assets.json';items=json.loads(manifest.read_text())
for a in items:
 original='/assets/figma/'+a['screen']+'-'+a['name']+Path(a['url']).suffix
 a['localPath']=aliases.get(a.get('localPath',original),a.get('localPath',original))
manifest.write_text(json.dumps(items,indent=2)+'\n')
print('Reused',len(aliases),'byte-identical asset files')
