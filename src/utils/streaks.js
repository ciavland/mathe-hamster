/**
 * Tages-Streak-Tracking für Mathe-Star.
 * Speichert welche Tage gespielt wurden und berechnet den aktuellen Streak.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'mathe_star_daily_streak';

function todayISO() {
  return new Date().toISOString().slice(0, 10); // "2026-03-25"
}

function yesterdayISO() {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().slice(0, 10);
}

/**
 * Laden der gespeicherten Streak-Daten.
 */
async function loadData() {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : { dates: [], currentStreak: 0 };
  } catch {
    return { dates: [], currentStreak: 0 };
  }
}

/**
 * Heutigen Tag als gespielt markieren.
 * Wird nach jedem abgeschlossenen Spiel aufgerufen.
 */
export async function markTodayPlayed() {
  const data = await loadData();
  const today = todayISO();

  if (data.dates.includes(today)) return data; // Schon markiert

  const yesterday = yesterdayISO();
  const hadYesterday = data.dates.includes(yesterday);

  data.dates.push(today);
  // Nur letzte 30 Tage behalten
  if (data.dates.length > 30) {
    data.dates = data.dates.slice(-30);
  }

  // Streak berechnen
  if (hadYesterday) {
    data.currentStreak += 1;
  } else {
    data.currentStreak = 1; // Streak bricht oder startet neu
  }

  await AsyncStorage.setItem(KEY, JSON.stringify(data));
  return data;
}

/**
 * Streak-Info für die Anzeige laden.
 * @returns {{ currentStreak: number, last7: boolean[], todayPlayed: boolean }}
 */
export async function getStreakInfo() {
  const data = await loadData();
  const today = todayISO();
  const yesterday = yesterdayISO();

  // Wenn heute noch nicht gespielt und gestern auch nicht → Streak = 0
  const todayPlayed = data.dates.includes(today);
  let currentStreak = data.currentStreak;

  if (!todayPlayed && !data.dates.includes(yesterday)) {
    currentStreak = 0;
  }

  // Letzte 7 Tage als boolean Array (heute = Index 6)
  const last7 = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    last7.push(data.dates.includes(d.toISOString().slice(0, 10)));
  }

  return { currentStreak, last7, todayPlayed };
}
