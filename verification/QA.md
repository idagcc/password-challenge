# Password Challenge verification

## Answer colors · 25 October 2026

- Submitted answers remain visible for one second with green text, a green field and “Correct answer” when accepted, or red text, a red field and “Incorrect answer” otherwise. Correctness comes from the server response.
- Browser checks confirmed both computed text colors, read-only input and disabled Submit during feedback, then a blank neutral input on the next round. Repeated Enter during feedback did not skip or duplicate a round.
- A complete ten-round browser game with one correct answer and nine incorrect answers showed feedback on the final maze before the expected 1 / 10 result. No browser console errors were recorded.
- Final screenshots: `correct-answer-green.png` and `incorrect-answer-red.png`. The matching feedback label sits next to the password heading without overlapping the score or panel border.
- All 12 existing automated tests and the TypeScript/production build passed. Browser tests used a separate temporary database on port 4176.

## Random selection and ten rounds · 25 October 2026

- All 12 automated tests and the TypeScript/production build passed.
- Every new registration randomly selects six different picture puzzles and three different counting puzzles, including the first registration. Tests exercise fresh draws before either player starts, all 50 bank questions, and saved selections across a new server connection.
- Round order is picture → picture → counting three times, then the supplied vault maze in round ten. Games stay active through round nine and complete only after the tenth submission. Final-answer retries remain idempotent.
- Instructions, round counters, correct-answer totals, results and weighted speed bonuses use the game's total round count. Existing four-round sessions still finish and retain their original scoring denominator.
- Browser play-through completed all ten questions correctly: randomly selected puzzles 013, 004, 031, 006, 005, 030, 019, 002 and 047 from the bank, followed by the maze. The UI showed ROUND 10 / 10, CORRECT 9 / 10, then a 10 / 10 result and a saved leaderboard score of 10. No browser console errors were recorded.
- The 10 / 10 result text fits its widened container without overflow. Screenshots: `ten-round-maze.png` and `ten-round-result.png`.
- Browser verification used an isolated temporary database on port 4176. The live event database was not used for test registrations.

## Original four-round verification

- Production build and TypeScript: passed.
- Nine automated tests: passed, covering answer normalization, registration validation, server-authoritative four-round scoring, timing, duplicate submissions, persisted leaderboard, accuracy/time ordering, all 50 puzzles, timeout rejection, CSV export, private-route protection and the HTTP game flow.
- Approved Figma play-through in the browser: registration → instructions → four correct answers → 4/4 result → Finish → persisted leaderboard. Empty-answer validation and Back also passed.
- Rotating-bank browser play-through: picture puzzles 005 and 006, counting puzzle 027 and the vault maze all accepted their canonical answers and produced 4/4.
- Approved idle, registration, instructions, picture, counting, maze, validation and result screens were visually checked against the returned Figma renders. The implementation uses native text and inputs, with the original local artwork, not a full-screen screenshot.
- All 195 Figma asset callsites and all 50 bank layouts resolved. Byte-identical assets were deduplicated without changing their artwork.
- Packaged production server: all 205 unique artwork/font paths loaded successfully. Private answer, data and server routes returned 404.
- Windows archive integrity and the official Node runtime SHA-256 checksum passed. No player data is included in the archive.
- Synthetic browser test data was moved out of the live data folder; the delivered preview has an empty leaderboard.

The Windows x64 launch scripts are supplied but were not executed on Windows in this macOS environment. The final venue check is launch, 2160 × 3840 portrait display, touch mapping, keyboard and power/sleep settings on the actual 65-inch touchscreen PC.

## Supplied Catch the Phish keyboard update

- Imported the supplied keyboard layout and its exact Regular 400 font. The supplied font is byte-identical to the existing Noto Kufi Arabic 400 asset.
- Browser-computed values matched all requested specifications: 174 × 116 standard keys; 130 minimum bottom keys; 360 Space; 18 gaps; 16 radius; 50 key text; 48 header; weight 400; requested colours, border, padding and shadow.
- Actual key clicks verified Shift, auto-shift release, Space, Backspace, email @ and .com, answer !/#/@, preserved native-input focus, Done and submission.
- The answer field remained above the keyboard with an 80-design-pixel gap. Every key remained inside the 2160-pixel keyboard.
- Correct first-round entry advanced to round two and incremented the score. This browser check used a separate data directory; no test registration was written to the live event database.
- TypeScript/production build and all nine existing automated tests passed after the keyboard update.

## Video, animation and audio update

- Copied the supplied DGE_BG_Potrite.mp4 without modification: H.264, 2160 × 3840, 30 fps, ten seconds, no audio track. It is one persistent looping video behind the original neon artwork.
- Added a 38.4-second original stereo electronic score and distinct synthesized touch, navigation, validation, correct, incorrect and completion cues. Audio peak analysis found a -5.0 dB maximum in the encoded music file, with no clipping.
- Added crossfades, short panel slides, a neon sweep, slow glow breathing, button feedback and keyboard entrance motion. Reduced-motion preferences disable decorative motion and pause the video on a still frame.
- Added local operator mute/music/effects controls, a typing-safe M mute shortcut, hidden-tab pause/resume, and Edge kiosk autoplay support.
- Added HTTP MP4/M4A MIME types, byte-range playback/seeking, suffix ranges and HEAD responses. Automated HTTP tests verify real media bytes, headers, suffix reads and invalid-range rejection.
- Production/TypeScript build and all nine automated tests passed.
- Native Safari browser verification: supplied video visible and moving behind the neon panel; browser's audio-active indicator appeared after interaction. Registration, live keyboard, validation, four animated rounds and the result all worked. The play-through deliberately submitted one incorrect answer and finished with the expected 3/4. Automatic Finish returned to the saved leaderboard. M muted audio; unmute state and music/effects controls were verified through the operator page, including real music-slider interaction.
- Browser testing used verification/presentation-qa-data on port 4175, separate from the live event database.

The integrated in-app browser control connection was unavailable during this check, so the visual play-through used native Safari instead. Windows launch, 4K frame pacing, speakers and the physical touchscreen still require the final event-PC check.
