# Password Challenge

An offline kiosk game built from **Password Challenge • 4K Portrait** (2160 × 3840) in the approved Figma file. It includes name/email registration, instructions, ten rounds, empty-answer validation, a result screen, and a persistent top-five leaderboard.

## Repository and downloads

The repository includes the application source and the production browser build in `dist/`. Download the ready-to-run **Password-Challenge-Windows.zip** and its SHA-256 checksum from [GitHub Releases](https://github.com/idagcc/password-challenge/releases). The Windows ZIP includes the local server and bundled Node.js runtime. Player databases, operator keys and exported results are excluded from the repository and release.

## Run on the Windows touchscreen

1. Extract **Password-Challenge-Windows.zip** into a permanent writable folder, for example `C:\PasswordChallenge`. Extract the entire folder before launching; do not run inside the ZIP or put it in Program Files.
2. In Windows Display settings, select the 65-inch screen, set **Portrait**, resolution **2160 × 3840**, and scale **100%**. Make it the primary display. In Windows touch calibration, associate the touchscreen with this display.
3. Double-click **Start-Password-Challenge.cmd**. The package includes its own verified Node.js runtime and opens Microsoft Edge in full-screen kiosk mode. Microsoft Edge must already be installed. Internet access and npm installation are unnecessary.
4. Optional: run **Install-Autostart.cmd** to open the game when this Windows user signs in. Remove `Password Challenge.lnk` from the user's Startup folder to undo it. Windows sign-in itself remains a venue setup choice.
5. Use **Alt+F4** to close Edge. Run **Stop-Password-Challenge.cmd** to stop the local game server.

Set Windows sleep/screensaver to Never for the event session. Check that the touchscreen orientation, touch mapping and scaling are correct on the actual hardware before the event. The layout fits other window sizes proportionally with side bars; the approved composition is preserved.

To update an existing kiosk, close Edge and run **Stop-Password-Challenge.cmd** first. Back up **data/**, then copy the new package's contents into the existing installation, replacing application files while retaining **data/** and **exports/**. Run **Start-Password-Challenge.cmd** again to load the update. The ZIP contains no player data or operator keys.

## Playing and scores

- The idle screen shows real completed games. It is empty until the first player finishes; example names from Figma are not seeded.
- Require a name and valid email, then show instructions. The timer begins only on **Next** into round one.
- One nonempty submission per round. Both correct and incorrect answers advance; correct answers add one. Empty submissions show the approved validation screen and return to the same round. Spaces and letter case are normalized; digits and punctuation must match.
- After submission, the entered answer turns green for a correct answer or red for an incorrect answer, with a matching text label. The feedback stays visible for one second before the next round or final result; further edits and submissions are disabled during that pause.
- Default ranking is **correct answers descending, then total elapsed time ascending**. Each answer's correctness, response time and submitted answer are stored, so the final scoring model can be recalculated later.
- Every player gets ten rounds: **picture → picture → counting**, repeated three times, then the approved vault maze in round ten. Six picture puzzles and three counting puzzles are randomly selected from their respective 25-question banks without repeats within a game, including for the first player. The single supplied maze remains the same for everyone. Each player's selection is saved when they register and survives server restarts.
- The supplied Catch the Phish keyboard is used with its original Noto Kufi Arabic Regular 400 font, key sizes, spacing and colours. It has QWERTY letters, a number row, Shift, Space and Backspace. Email adds @, . and .com; answer entry adds !, # and @. Done closes the keyboard; submit using the approved game button. While answering, the game lifts enough to keep the live answer field visible above the keyboard. A physical keyboard also works. Answers are visible as shown in Figma.
- Inactivity during registration, instructions or an unfinished game returns to the home screen after 30 seconds. Touching the screen or pressing a key restarts this timer. Games have a ten-minute maximum. Results return automatically after 25 seconds. Unfinished games are retained for export but excluded from the leaderboard.

## Background, motion and sound

The supplied **DGE_BG_Potrite.mp4** runs behind every screen as a continuous muted 4K portrait loop. The original neon panels stay in place with a slow glow pulse; page and round changes use a short crossfade, slide and light sweep. Opening the keyboard also has a short slide. Reduced-motion settings stop the video on a still frame and disable decorative animation.

The included original **Neon Circuit** score is a 38.4-second electronic instrumental loop. Touch keys, main actions, screen changes, validation, correct/incorrect answers and the final result have separate synthesized sound cues. The score and video continue across screen changes rather than restarting each round. Media pauses while the browser tab is hidden.

In an ordinary browser, sound starts with the first interaction if autoplay is restricted. The Windows Edge launcher includes the kiosk autoplay flag so the idle screen can play its score on launch. Use the event PC's speakers and normal Windows volume control to set the booth level.

Open **http://127.0.0.1:4173/operator** for music/effects volume sliders and mute. These controls apply to other game tabs in the same browser profile. **M** outside a text field also toggles mute; typing M into a name or answer does not mute the game. Default music volume is 24%; effects volume is 55%.

The video uses the original supplied file without re-encoding. `scripts/compose-score.mjs` can regenerate the original score using Node and ffmpeg on the development machine; neither ffmpeg nor an internet connection is needed on the kiosk.

## Event data and export

Data is saved on this computer in **data/password-challenge.sqlite**, outside the browser. It survives browser restarts, PC restarts and internet outages. Keep this folder when updating the app. Do not clear it during an event.

While the server is running, double-click **Export-Results.cmd**. The timestamped CSV appears in **exports/** with names, emails, completed and incomplete sessions, individual answers, per-round times and totals. Alternatively, open `http://127.0.0.1:4173/operator` and enter the key from `data/operator-key.txt` to download a CSV. The player screen never shows email addresses or answer keys.

A dated database snapshot is created on the first launch each UTC day; the server also checks hourly for a new day. These are recovery snapshots, not real-time replicas. For a final event backup, stop the server and copy the entire **data/** folder to the event backup drive. Keep exports and backups under the event team's normal access controls.

The server listens only on this PC (`127.0.0.1`). The private answer key is stored in **private/answers.json** and is never served as a browser asset. No analytics, external fonts, network assets or online services are needed at runtime. The supplied DGE portrait MP4 and the original music score are included as local files.

## Configuration

Edit **config.json**, stop the server and relaunch to apply changes.

| Setting | Default | Purpose |
| --- | --- | --- |
| `port` | 4173 | Local server port; launcher and export scripts read it |
| `idleTimeoutSeconds` | 30 | Inactivity reset |
| `resultTimeoutSeconds` | 25 | Automatic Finish |
| `maxGameSeconds` | 600 | Maximum total game duration |
| `scoring.mode` | `correct-then-time` | Provisional ranking; `weighted` enables the formula below |
| `scoring.correctWeight` | 1000 | Points per correct answer in weighted mode |
| `scoring.speedWeight` | 100 | Maximum speed bonus |
| `scoring.speedWindowSeconds` | 240 | Time window for the speed bonus |

Weighted formula: `correct × correctWeight + round(speedWeight × max(0, 1 − elapsedSeconds / speedWindowSeconds) × correct / totalRounds)`. The player screen shows correct answers out of ten. Existing four-round sessions retain their original length and scoring denominator. Changing scoring settings recalculates leaderboard ranking from stored raw results. Final weighting is awaiting your decision.

## Local development

Use Node.js 22.13+ (tested with 22.23.3).

```sh
npm install
npm run dev
```

Open `http://127.0.0.1:4173`. `npm run build` checks TypeScript and creates the production app; `npm start` serves it. `npm test` runs game/persistence tests. `node scripts/audit-assets.mjs` verifies Figma and bank assets. `npm run package:windows` rebuilds the production app, creates the Windows bundle and verifies the official runtime's SHA-256 checksum. Packaging requires Python 3 and curl on the build machine.

Figma source: https://www.figma.com/design/I4RLsJTWCjKWqFiTlUN2YX/Password-Challenge---UI-Flow?node-id=6101-1562

Question bank: supplied **DGE Password Components v3** developer pack. Original materials are retained in `source-material/`; approved design references are in `design-reference/`. Native screen components are in `src/design/`, with local copies of all artwork. No screenshot is used as a whole-screen UI.

The application and browser game flow have been checked locally. The Windows launcher is prepared for Windows x64; final hardware validation is required on the event PC. Node's bundled SQLite API is documented at https://nodejs.org/download/release/v22.23.3/docs/api/sqlite.html.
