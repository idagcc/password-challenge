# Use the individual puzzle pieces

Copy `public/` to a static asset directory. The renderer uses normal image elements and percentage positions; no framework is required. It renders the puzzle body only and leaves application controls to the host app.

```js
import { loadPasswordPuzzles, renderPasswordPuzzle } from './password-puzzle.js';

const bank = await loadPasswordPuzzles('/password-puzzles/puzzles.json');
const puzzle = bank.puzzles.find(p => p.id === 'puzzle-001');

renderPasswordPuzzle(document.querySelector('#puzzle-body'), puzzle, {
  assetBaseUrl: '/password-puzzles/',
  assets: bank.assets,
});
```

The host element controls the width. The body preserves a 1460:1793 aspect ratio. To fit the original 2160 x 3840 screen, place the body at x=350, y=1010, width=1460. The original glass tile, source photo, diffusion layer and neon panel are included separately if the app needs them.

For React, Vue, Flutter or another renderer, use the same data instead of this DOM module. Look up each `assetId` in `assets`. Use its `svg` or `png` path, and map each record's coordinates into the body canvas. No whole-screen puzzle images are required.

Each picture-password record contains four `clues`, four `clue-tile` components and three separate operators. Each security-count record contains one component per countable object, plus a separate frame and entry-order legend. Count only the objects in `components`; the legend icons are instructions and do not contribute to the answer.

`private/answers.json` retains the original 50 puzzle IDs and accepted answers. Keep it server-side. The provided validation helper accepts puzzle ID, submitted value and answer data; the app decides when to display a success message. The renderer does not collect account passwords or send submissions anywhere.

Native text may replace the outlined digit/punctuation assets if desired. Use the sizes and colours in `design-tokens.json` as the original 4K reference, then scale with the screen.

`review/component-inventory.jpg` is a visual inventory for review, not an app asset.
