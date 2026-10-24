/** Validation helper for event puzzle codes, not account passwords. */
export function normalizePuzzleAnswer(value) {
  return String(value ?? "").trim().replace(/\s+/g, "").toUpperCase();
}

export function isCorrectPuzzleAnswer(puzzleId, userInput, answerData) {
  const row = answerData.puzzles.find(p => p.id === puzzleId);
  if (!row) return false;
  const value = normalizePuzzleAnswer(userInput);
  return row.acceptedAnswers.some(answer => normalizePuzzleAnswer(answer) === value);
}
