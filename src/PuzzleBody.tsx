import type { CSSProperties } from 'react';
import type { Puzzle, Box } from './types';
const icon = (id: string) => `/assets/${/^(digit-|symbol-|operator-)/.test(id) ? 'characters' : 'icons'}/svg/${id}.svg`;
const place = (box: Box): CSSProperties => ({ position: 'absolute', left: box.x, top: box.y, width: box.width, height: box.height });
export function PuzzleBody({ puzzle }: { puzzle: Puzzle }) {
 return <div className="puzzle-body" role="group" aria-label={puzzle.title}>
  {puzzle.countFrame && <div style={{ ...place(puzzle.countFrame), border: '2px solid #89e8f8b3', borderRadius: 42, background: '#061d47b8' }} />}
  {puzzle.components?.map((p, i) => p.component === 'clue-tile' ? <div key={i} style={place(p)}>
   <img src="/assets/ui/glass-card.svg" alt="" className="tile-glass" />
   <img src={icon(p.content!.assetId)} alt={p.content!.type === 'character' ? p.content!.value : p.content!.assetId} className={p.content!.type === 'character' ? 'tile-clue tile-character' : 'tile-clue'} />
  </div> : <img key={i} src={icon(p.assetId!)} alt={p.assetId} style={{ ...place(p), objectFit: 'contain' }} />)}
  {puzzle.operators?.map((p, i) => <img key={i} alt="plus" src={icon('operator-plus')} style={place({x:p.x+p.width*.175,y:p.y+p.height*.175,width:p.width*.65,height:p.height*.65})} />)}
  {puzzle.legend && <><span className="legend-label">ENTRY ORDER</span><div className="puzzle-legend" style={place(puzzle.legend)}>
   {puzzle.legend.order.map(id => <span key={id} className="legend-pair"><img src={icon(id)} alt={id}/><img src={icon('operator-arrow')} alt="then"/></span>)}
   <img src={icon(({ '#': 'symbol-hash', '!': 'symbol-exclamation', '@': 'symbol-at' } as Record<string,string>)[puzzle.legend.suffix])} alt={puzzle.legend.suffix}/>
  </div></>}
 </div>;
}
