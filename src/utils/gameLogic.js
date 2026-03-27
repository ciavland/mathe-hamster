/**
 * Generiert eine zufällige Multiplikationsaufgabe.
 * @param {number}   maxFactor      – Maximaler Faktor (1..maxFactor)
 * @param {number[]} [allowedFactors] – Falls angegeben, werden Faktoren nur aus dieser Liste gewählt
 */
export function generateProblem(maxFactor, allowedFactors) {
  const pick = allowedFactors
    ? () => allowedFactors[Math.floor(Math.random() * allowedFactors.length)]
    : () => Math.floor(Math.random() * maxFactor) + 1;
  const a = pick();
  const b = pick();
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
