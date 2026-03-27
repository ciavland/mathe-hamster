/**
 * Fisher-Yates shuffle (in-place, returns array).
 */
function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * Erzeugt ein gemischtes Deck aller möglichen Aufgaben.
 * Jede Kombination (a×b) kommt genau einmal vor.
 * @param {number}   maxFactor
 * @param {number[]} [allowedFactors]
 */
export function buildProblemDeck(maxFactor, allowedFactors) {
  const factors = allowedFactors
    ? allowedFactors
    : Array.from({ length: maxFactor }, (_, i) => i + 1);

  const deck = [];
  for (const a of factors) {
    for (const b of factors) {
      deck.push({ a, b, answer: a * b });
    }
  }
  return shuffle(deck);
}

/**
 * Generiert eine einzelne zufällige Aufgabe (Fallback / Praxis-Modus).
 */
export function generateProblem(maxFactor, allowedFactors) {
  const factors = allowedFactors
    ? allowedFactors
    : Array.from({ length: maxFactor }, (_, i) => i + 1);
  const a = factors[Math.floor(Math.random() * factors.length)];
  const b = factors[Math.floor(Math.random() * factors.length)];
  return { a, b, answer: a * b };
}

/**
 * Berechnet Sterne (1-3) basierend auf Trefferquote.
 */
export function calcStars(correct, total) {
  if (total === 0) return 0;
  const ratio = correct / total;
  if (ratio >= 0.9) return 3;
  if (ratio >= 0.7) return 2;
  if (ratio >= 0.4) return 1;
  return 0;
}

/**
 * Erstellt eine motivierende Nachricht basierend auf Sternen.
 */
export function getResultMessage(stars, name = 'Mathe-Star') {
  switch (stars) {
    case 3:
      return `Fantastisch, ${name}! 🎉\nDu bist ein echter Mathe-Star!`;
    case 2:
      return `Super gemacht! ⭐\nNoch ein bisschen üben, dann schaffst du 3 Sterne!`;
    case 1:
      return `Gut versucht! 💪\nMach weiter – du wirst besser!`;
    default:
      return `Nicht aufgeben! 🌱\nÜben macht den Meister!`;
  }
}

/**
 * Berechnet Bonus-Punkte für schnelle Antworten.
 */
export function calcScore(correct, total, timeLeftPercent) {
  const base = correct * 10;
  const speedBonus = Math.floor(timeLeftPercent * 0.2 * correct);
  return base + speedBonus;
}
