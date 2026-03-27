import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'mathe_star_leaderboard_v1';
const MAX_ENTRIES = 200;

/**
 * Einen neuen Eintrag speichern.
 * @param {object} entry
 */
export async function saveEntry(entry) {
  const all = await loadAllEntries();
  const updated = [...all, entry].slice(-MAX_ENTRIES);
  await AsyncStorage.setItem(KEY, JSON.stringify(updated));
}

/**
 * Alle Einträge laden.
 */
export async function loadAllEntries() {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

/**
 * Top-Einträge für eine Schwierigkeit (oder alle).
 * Sortiert nach avgTime aufsteigend (schneller = besser).
 */
export async function getTopEntries(difficultyKey = null, limit = 50) {
  const all = await loadAllEntries();
  return all
    .filter((e) => e.correct > 0)
    .filter((e) => !difficultyKey || e.difficultyKey === difficultyKey)
    .sort((a, b) => a.avgTime - b.avgTime)
    .slice(0, limit);
}

/**
 * Persönliche Bestzeit für eine Schwierigkeit.
 */
export async function getPersonalBest(difficultyKey) {
  const top = await getTopEntries(difficultyKey, 1);
  return top[0] ?? null;
}

/**
 * Alle Einträge löschen (für Tests).
 */
export async function clearAll() {
  await AsyncStorage.removeItem(KEY);
}

/**
 * Hilfsfunktion: avgTime als lesbaren String formatieren.
 * z.B. 4.166... → "4,2 Sek"
 */
export function formatAvgTime(avgTime) {
  if (!avgTime || !isFinite(avgTime)) return '—';
  return avgTime.toFixed(1).replace('.', ',') + ' Sek';
}
