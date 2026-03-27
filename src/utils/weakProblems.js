/**
 * Schwächen-Tracking: Merkt sich welche Aufgaben oft falsch beantwortet werden.
 * Nach 3x richtig im Übungsmodus wird ein Problem als "gemeistert" markiert.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'mathe_star_weak_problems';

/**
 * @typedef {Object} ProblemRecord
 * @property {number} a
 * @property {number} b
 * @property {number} wrongCount  - Wie oft falsch beantwortet
 * @property {number} practiceOk  - Wie oft im Übungsmodus richtig
 */

async function loadData() {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

async function saveData(data) {
  await AsyncStorage.setItem(KEY, JSON.stringify(data));
}

function makeKey(a, b) {
  // Normalisiere: 3x7 und 7x3 sind dasselbe Problem
  const min = Math.min(a, b);
  const max = Math.max(a, b);
  return `${min}x${max}`;
}

/**
 * Falsche Antwort registrieren.
 */
export async function addMistake(a, b) {
  const data = await loadData();
  const key = makeKey(a, b);

  if (!data[key]) {
    data[key] = { a: Math.min(a, b), b: Math.max(a, b), wrongCount: 0, practiceOk: 0 };
  }
  data[key].wrongCount += 1;
  // Wenn schon gemeistert war, zurücksetzen
  data[key].practiceOk = Math.max(0, data[key].practiceOk - 1);

  await saveData(data);
}

/**
 * Richtige Antwort im Übungsmodus registrieren.
 * Entfernt das Problem wenn practiceOk >= 3.
 */
export async function markPracticeCorrect(a, b) {
  const data = await loadData();
  const key = makeKey(a, b);

  if (!data[key]) return;
  data[key].practiceOk += 1;

  if (data[key].practiceOk >= 3) {
    delete data[key]; // Gemeistert!
  }

  await saveData(data);
}

/**
 * Alle schwachen Probleme laden, sortiert nach Häufigkeit.
 * @returns {Array<{a: number, b: number, answer: number, wrongCount: number}>}
 */
export async function getWeakProblems() {
  const data = await loadData();
  return Object.values(data)
    .filter((p) => p.practiceOk < 3)
    .sort((a, b) => b.wrongCount - a.wrongCount)
    .map((p) => ({ a: p.a, b: p.b, answer: p.a * p.b, wrongCount: p.wrongCount }));
}

/**
 * Anzahl der noch zu übenden Probleme.
 */
export async function getWeakCount() {
  const problems = await getWeakProblems();
  return problems.length;
}
