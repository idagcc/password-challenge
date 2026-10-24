"""Translate the approved Figma reference JSX to plain project CSS. No Tailwind runtime."""
import pathlib,re,json
root=pathlib.Path(__file__).resolve().parent.parent
classes={}; rules={}
def class_rule(value):
 if value in classes:return classes[value]
 name='figma-'+str(len(classes)); classes[value]=name
 d={};tx=ty=rot=sy=None
 base={'absolute':('position','absolute'),'relative':('position','relative'),'block':('display','block'),'contents':('display','contents'),'flex':('display','flex'),'flex-col':('flex-direction','column'),'flex-none':('flex','none'),'items-center':('align-items','center'),'justify-center':('justify-content','center'),'max-w-none':('max-width','none'),'not-italic':('font-style','normal'),'text-center':('text-align','center'),'text-right':('text-align','right'),'text-white':('color','#fff'),'bg-white':('background','#fff'),'object-cover':('object-fit','cover'),'pointer-events-none':('pointer-events','none'),'overflow-clip':('overflow','clip'),'whitespace-nowrap':('white-space','nowrap'),'cursor-pointer':('cursor','pointer'),'border-solid':('border-style','solid'),'[word-break:break-word]':('word-break','break-word')}
 for c in value.split():
  if c in base:k,v=base[c];d[k]=v
  elif c=='size-full':d['width']='100%';d['height']='100%'
  elif c=='-translate-x-1/2':tx='-50%'
  elif c=='-translate-y-1/2':ty='-50%'
  elif c=='-rotate-90':rot='-90deg'
  elif c=='rotate-180':rot='180deg'
  elif c=='-scale-y-100':sy='-1'
  elif c.startswith('opacity-'):d['opacity']=str(int(c[8:])/100)
  elif c.startswith('font-'):d['font-weight']='700' if ':Bold' in c else '500' if ':Medium' in c else '400'
  elif m:=re.match(r'^(w|h|left|right|top|bottom|inset)-(0|1/4|3/4)$',c):
   d[{'w':'width','h':'height'}.get(m[1],m[1])]={'0':'0','1/4':'25%','3/4':'75%'}[m[2]]
  elif m:=re.match(r'^(w|h|left|right|top|bottom|inset|rounded|blur|border|text|leading|bg)-\[(.*)\]$',c):
   k,v=m.groups();v=v.replace('_',' ')
   if k=='text':k='color' if v.startswith('#') else 'font-size'
   elif k=='border':k='border-color' if v.startswith('#') else 'border-width'
   elif k=='blur':k='filter';v='blur('+v+')'
   else:k={'w':'width','h':'height','rounded':'border-radius','leading':'line-height','bg':'background'}.get(k,k)
   d[k]=v
  else:raise Exception('Unknown Figma style '+c)
 if tx or ty or rot or sy:d['transform']=' '.join(x for x in [f'translate({tx or "0"},{ty or "0"})' if tx or ty else '',f'rotate({rot})' if rot else '',f'scaleY({sy})' if sy else ''] if x)
 rules[name]=';'.join(k+':'+v for k,v in d.items())
 return name
names={'idle':'Idle','6101-7165':'Registration','6101-6441':'Instructions','6101-6352':'PictureOne','6101-6506':'PictureTwo','6101-6595':'Counting','6101-6743':'Maze','6101-7118':'Result','6101-7127':'Validation'}
exports=[]
asset_paths={(a['screen'],a['name']):a.get('localPath') for a in json.loads((root/'design-reference/assets.json').read_text())}
texts={}
for stem,name in names.items():
 s=(root/'design-reference'/(stem+'.txt')).read_text()
 s=s[:s.rfind('\n}')+2]
 s=re.sub(r'const (\w+) = "(https://www.figma.com/api/mcp/asset/[^\"]+)";',lambda m:f'const {m[1]} = "{asset_paths.get((stem,m[1])) or ("/assets/figma/"+stem+"-"+m[1]+pathlib.Path(m[2]).suffix)}";',s)
 s=re.sub(r'className="([^"]*)"',lambda m:'className="'+class_rule(m[1])+'"',s)
 s=re.sub(r'className \|\| "([^"]*)"',lambda m:'className || "'+class_rule(m[1])+'"',s)
 s=re.sub(r'export default function \w+\(\)',f'export default function {name}({{ values = {{}}, onNext, disabled }}: DesignProps)',s)
 s=re.sub(r'(<p\b[^>]*data-node-id="([^"]+)"[^>]*>)([\s\S]*?)(</p>)',lambda m:m[1]+'{values['+json.dumps(m[2])+'] ?? '+json.dumps(m[3].strip())+'}'+m[4] if '<' not in m[3] else m[0],s)
 texts[name]={m[2]:m[3].strip() for m in re.finditer(r'(<p\b[^>]*data-node-id="([^"]+)"[^>]*>)([^<]*)(</p>)',(root/'design-reference'/(stem+'.txt')).read_text())}
 s=s.replace('<a ','<button type="button" onClick={onNext} disabled={disabled} ').replace('</a>','</button>')
 if name=='Registration':
  s=s.replace('<div className="figma-101" data-node-id="6101:4237"','<button type="button" onClick={onNext} disabled={disabled} className="figma-101" data-node-id="6101:4237"').replace('<p className="figma-50">Register</p>\n          </div>\n        </div>','<p className="figma-50">Register</p>\n          </div>\n        </button>')
 s=s.replace('<button className=', '<button type="button" onClick={onNext} disabled={disabled} className=')
 s=re.sub(r'<button[^>]*data-name="Answer input"[^>]*>(.*?)</button>',lambda m:re.sub(r'^<button type="button" onClick=\{onNext\} disabled=\{disabled\}', '<div aria-hidden="true"',m[0]).replace('</button>','</div>'),s,flags=re.S)
 if name in ['PictureOne','PictureTwo','Counting']:
  ps=list(re.finditer(r'<p\b[^>]*>.*?</p>',s,re.S))
  last=next(m for m in ps if ('Add the number and symbol.' in m[0] if name!='Counting' else 'Use the entry order below' in m[0]))
  pwd=next(m for m in ps if 'YOUR PASSWORD' in m[0])
  s=s[:last.end()]+'\n<div className="puzzle-static">'+s[last.end():pwd.start()]+'</div>\n'+s[pwd.start():]
 s='import type { DesignProps } from "./types";\n'+s
 (root/'src/design'/(name+'.tsx')).write_text(s+'\n')
 exports.append(f'export {{ default as {name} }} from "./{name}";')
(root/'src/design/textNodes.ts').write_text('export const textNodes = '+json.dumps(texts,indent=2)+' as const;\n')
(root/'src/design/index.ts').write_text('\n'.join(exports)+'\n')
(root/'src/design/figma.css').write_text('/* Generated from the approved 2160 × 3840 Figma node geometry. */\n'+ '\n'.join('.'+n+'{'+v+'}' for n,v in rules.items())+'\n')
print('Imported',len(names),'screens and',len(classes),'CSS rules')
