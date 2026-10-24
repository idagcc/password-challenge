/** Render a puzzle body from individual assets. No screen, answer field, or validation UI is added. */
export function renderPasswordPuzzle(container, puzzle, { assetBaseUrl = './public/', assets = [] } = {}) {
  const catalog = new Map(assets.map(asset => [asset.id, asset]));
  const root = document.createElement('div');
  root.className = 'dge-puzzle-body';
  root.style.cssText = 'position:relative;width:100%;aspect-ratio:1460/1793;container-type:inline-size;color:white;';
  root.setAttribute('role', 'group');
  root.setAttribute('aria-label', puzzle.title);
  const place = (node, box) => {
    node.style.position = 'absolute';
    for (const [key, value, total] of [['left',box.x,1460],['top',box.y,1793],['width',box.width,1460],['height',box.height,1793]]) node.style[key] = `${value / total * 100}%`;
    root.append(node);
    return node;
  };
  const image = (assetId, label = '') => {
    const asset = catalog.get(assetId);
    if (!asset) throw new Error(`Unknown puzzle asset: ${assetId}`);
    const img = document.createElement('img');
    img.src = new URL(asset.svg, new URL(assetBaseUrl, document.baseURI)).href;
    img.alt = label;
    img.draggable = false;
    img.style.objectFit = 'contain';
    return img;
  };
  if (puzzle.countFrame) {
    const frame = place(document.createElement('div'), puzzle.countFrame);
    frame.style.cssText += 'box-sizing:border-box;border:1px solid #89e8f8b3;border-radius:2.88cqw;background:#061d47b8;';
  }
  for (const piece of puzzle.components) {
    if (piece.component === 'clue-tile') {
      const tile = place(document.createElement('div'), piece);
      const glass = document.createElement('img');
      glass.alt = ''; glass.draggable = false;
      glass.src = new URL('assets/ui/glass-card.svg', new URL(assetBaseUrl, document.baseURI)).href;
      glass.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;';
      const content = image(piece.content.assetId, piece.content.type === 'icon' ? piece.content.assetId : piece.content.value);
      content.style.cssText += 'position:absolute;width:78%;height:64%;left:11%;top:18%;';
      tile.append(glass, content);
    } else if (piece.component === 'security-icon') {
      place(image(piece.assetId), piece);
    }
  }
  for (const operator of puzzle.operators || []) place(image('operator-plus', '+'), operator);
  if (puzzle.legend) {
    const label = document.createElement('span'); label.textContent = 'ENTRY ORDER';
    place(label,{x:0,y:1598,width:1460,height:62});
    label.style.cssText += 'font:700 2.33cqw/1.8 "Noto Sans",Arial,sans-serif;color:#b8d8f1;';
    const legend = place(document.createElement('div'),puzzle.legend);
    legend.style.cssText += 'display:flex;align-items:center;justify-content:space-evenly;box-sizing:border-box;border:1px solid #28485e;border-radius:1.5cqw;background:#132b3e;';
    for (const assetId of puzzle.legend.order) {
      const icon = image(assetId,assetId); icon.style.cssText += 'position:static;width:6.3%;height:78%;'; legend.append(icon);
      const arrow = image('operator-arrow','then');arrow.style.cssText += 'position:static;width:4%;height:55%;';legend.append(arrow);
    }
    const suffixId = {'!':'symbol-exclamation','#':'symbol-hash','@':'symbol-at'}[puzzle.legend.suffix];
    const suffix = image(suffixId,puzzle.legend.suffix);suffix.style.cssText += 'position:static;width:5.5%;height:72%;';legend.append(suffix);
  }
  container.replaceChildren(root);
  return root;
}

export async function loadPasswordPuzzles(manifestUrl) {
  const response = await fetch(manifestUrl);
  if (!response.ok) throw new Error(`Could not load puzzle manifest (${response.status})`);
  return response.json();
}
