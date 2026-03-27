import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  Animated, ScrollView, TextInput, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { COLORS } from '../utils/theme';
import { calcStars, getResultMessage } from '../utils/gameLogic';
import { saveEntry, getPersonalBest, formatAvgTime } from '../utils/leaderboard';
import { markTodayPlayed } from '../utils/streaks';
import { addMistake, markPracticeCorrect } from '../utils/weakProblems';
import { playSound } from '../utils/sounds';

const NAME_KEY = 'mathe_star_player_name';

function Star({ filled, delay }) {
  const scale = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.sequence([
      Animated.delay(delay),
      Animated.spring(scale, { toValue: 1, tension: 80, friction: 5, useNativeDriver: true }),
    ]).start();
  }, []);
  return (
    <Animated.Text style={[styles.star, { transform: [{ scale }] }]}>
      {filled ? '⭐' : '☆'}
    </Animated.Text>
  );
}

// Hochzähl-Animation Hook
function useCountUp(target, duration = 800) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (target === 0) { setValue(0); return; }
    const steps = Math.min(target, 20);
    const interval = duration / steps;
    let current = 0;
    const id = setInterval(() => {
      current += Math.ceil(target / steps);
      if (current >= target) {
        current = target;
        clearInterval(id);
      }
      setValue(current);
    }, interval);
    return () => clearInterval(id);
  }, [target]);
  return value;
}

export default function ResultsScreen({ route, navigation }) {
  const { stats, difficulty, timeUsed = difficulty.timeSeconds, isPractice } = route.params;

  const stars   = calcStars(stats.correct, stats.total);
  const message = getResultMessage(stars);
  const avgTime = stats.correct > 0 ? timeUsed / stats.correct : null;

  // Hochzähl-Werte
  const animCorrect = useCountUp(stats.correct);
  const animWrong   = useCountUp(stats.wrong);
  const animTotal   = useCountUp(stats.total);

  const [playerName,   setPlayerName]   = useState('');
  const [personalBest, setPersonalBest] = useState(null);
  const [isNewBest,    setIsNewBest]    = useState(false);
  const savedRef = useRef(false);

  const containerAnim = useRef(new Animated.Value(0)).current;
  const metricScale   = useRef(new Animated.Value(0)).current;

  // Initialisierung
  useEffect(() => {
    AsyncStorage.getItem(NAME_KEY).then((n) => {
      if (n) setPlayerName(n);
    });

    // Bestzeit laden
    if (stats.correct > 0 && !isPractice) {
      getPersonalBest(difficulty.key).then((prev) => {
        if (!prev || avgTime < prev.avgTime) setIsNewBest(true);
        setPersonalBest(prev);
      });
    }

    // Fehler in Schwächen-DB speichern
    (async () => {
      for (const h of stats.history) {
        if (!h.correct) {
          await addMistake(h.a, h.b);
        } else if (isPractice) {
          await markPracticeCorrect(h.a, h.b);
        }
      }
    })();

    // Tag als gespielt markieren
    markTodayPlayed();

    // Animations
    Animated.parallel([
      Animated.timing(containerAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
      Animated.spring(metricScale, { toValue: 1, tension: 60, friction: 7, delay: 300, useNativeDriver: true }),
    ]).start();

    // Celebration Sound bei 3 Sternen
    if (stars === 3) {
      setTimeout(() => playSound('levelup'), 500);
    }
  }, []);

  // Eintrag speichern
  const saveResult = useCallback(async (name) => {
    if (savedRef.current || stats.correct === 0 || isPractice) return;
    savedRef.current = true;

    const trimmed = name.trim();
    if (trimmed) await AsyncStorage.setItem(NAME_KEY, trimmed);

    const entry = {
      id:              Date.now(),
      date:            new Date().toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: '2-digit' }),
      playerName:      trimmed || '—',
      difficultyKey:   difficulty.key,
      difficultyLabel: difficulty.label,
      correct:         stats.correct,
      total:           stats.total,
      timeSeconds:     timeUsed,
      avgTime,
    };

    await saveEntry(entry);

    const best = await getPersonalBest(difficulty.key);
    setPersonalBest(best);
  }, [avgTime, difficulty, stats, timeUsed, isPractice]);

  const goTo = useCallback(async (action) => {
    await saveResult(playerName);
    action();
  }, [playerName, saveResult]);

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <Animated.View style={[styles.content, { opacity: containerAnim }]}>
          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

            {/* Sterne */}
            <View style={styles.starsRow}>
              {[1, 2, 3].map((n) => <Star key={n} filled={n <= stars} delay={n * 250} />)}
            </View>

            <Text style={styles.message}>{message}</Text>

            {/* Hauptmetrik */}
            {!isPractice && avgTime && (
              <Animated.View style={[styles.metricCard, { transform: [{ scale: metricScale }] }]}>
                {isNewBest && (
                  <View style={styles.newBestBadge}>
                    <Text style={styles.newBestText}>🎉 Neue Bestzeit!</Text>
                  </View>
                )}
                <Text style={styles.metricLabel}>Ø Zeit pro Aufgabe</Text>
                <Text style={styles.metricValue}>{formatAvgTime(avgTime)}</Text>
                <Text style={styles.metricSub}>
                  {stats.correct} richtig in {timeUsed} Sekunden
                </Text>
                {personalBest && (
                  <View style={styles.bestRow}>
                    <Text style={styles.bestLabel}>🏆 Beste:</Text>
                    <Text style={styles.bestValue}>{formatAvgTime(personalBest.avgTime)}</Text>
                  </View>
                )}
              </Animated.View>
            )}

            {/* Übungsmodus: Fortschrittskarte */}
            {isPractice && (
              <View style={styles.practiceCard}>
                <Text style={styles.practiceTitle}>🎯 Übungs-Ergebnis</Text>
                <Text style={styles.practiceResult}>
                  {stats.correct} von {stats.total} richtig
                </Text>
              </View>
            )}

            {/* Namenseingabe */}
            {stats.correct > 0 && !isPractice && (
              <View style={styles.nameBox}>
                <Text style={styles.nameLabel}>Dein Name für die Bestenliste:</Text>
                <TextInput
                  style={styles.nameInput}
                  value={playerName}
                  onChangeText={setPlayerName}
                  placeholder="Name eingeben…"
                  placeholderTextColor={COLORS.textSecondary}
                  maxLength={20}
                  returnKeyType="done"
                  autoCorrect={false}
                />
              </View>
            )}

            {/* Stats mit Hochzähl-Animation */}
            <View style={styles.statsRow}>
              <View style={[styles.statBox, { borderColor: COLORS.success }]}>
                <Text style={[styles.statNumber, { color: COLORS.success }]}>{animCorrect}</Text>
                <Text style={styles.statLabel}>Richtig ✓</Text>
              </View>
              <View style={[styles.statBox, { borderColor: COLORS.error }]}>
                <Text style={[styles.statNumber, { color: COLORS.error }]}>{animWrong}</Text>
                <Text style={styles.statLabel}>Falsch ✗</Text>
              </View>
              <View style={[styles.statBox, { borderColor: COLORS.primary }]}>
                <Text style={[styles.statNumber, { color: COLORS.primary }]}>{animTotal}</Text>
                <Text style={styles.statLabel}>Gesamt</Text>
              </View>
            </View>

            {/* Falsche Aufgaben */}
            {stats.history.filter((h) => !h.correct).length > 0 && (
              <View style={styles.mistakesBox}>
                <Text style={styles.mistakesTitle}>Noch üben:</Text>
                {stats.history.filter((h) => !h.correct).map((h, i) => (
                  <View key={i} style={styles.mistakeItem}>
                    <Text style={styles.mistakeText}>
                      {h.a} × {h.b} = <Text style={styles.mistakeAnswer}>{h.answer}</Text>
                      {'  '}<Text style={styles.mistakeGiven}>(du: {h.given ?? '?'})</Text>
                    </Text>
                  </View>
                ))}
              </View>
            )}

            {/* Buttons */}
            <TouchableOpacity style={styles.btnPrimary}
              onPress={() => goTo(() => {
                if (isPractice) {
                  navigation.navigate('Home');
                } else {
                  navigation.replace('Game', { difficulty });
                }
              })}>
              <Text style={styles.btnPrimaryText}>
                {isPractice ? '🏠 Zurück' : '▶ Nochmal spielen'}
              </Text>
            </TouchableOpacity>

            {!isPractice && (
              <>
                <TouchableOpacity style={styles.btnSecondary}
                  onPress={() => goTo(() => navigation.navigate('Leaderboard'))}>
                  <Text style={styles.btnSecondaryText}>🏆 Bestenliste</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.btnSecondary}
                  onPress={() => goTo(() => navigation.navigate('Home'))}>
                  <Text style={styles.btnSecondaryText}>🏠 Hauptmenü</Text>
                </TouchableOpacity>
              </>
            )}

          </ScrollView>
        </Animated.View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content:   { flex: 1, padding: 20 },

  starsRow: { flexDirection: 'row', justifyContent: 'center', gap: 8, marginTop: 12, marginBottom: 8 },
  star:     { fontSize: 48 },

  message: { fontSize: 20, fontWeight: '800', color: COLORS.text, textAlign: 'center', lineHeight: 28, marginBottom: 16 },

  /* Hauptmetrik */
  metricCard: {
    backgroundColor: COLORS.primary, borderRadius: 24,
    padding: 20, alignItems: 'center', marginBottom: 16,
    elevation: 4, shadowColor: COLORS.primary, shadowOpacity: .3,
    shadowRadius: 8, shadowOffset: { width: 0, height: 4 },
  },
  newBestBadge: {
    backgroundColor: COLORS.accent, borderRadius: 20,
    paddingHorizontal: 14, paddingVertical: 4, marginBottom: 8,
  },
  newBestText:  { fontSize: 13, fontWeight: '800', color: '#1A1A2E' },
  metricLabel:  { fontSize: 13, color: 'rgba(255,255,255,.75)', fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase' },
  metricValue:  { fontSize: 52, fontWeight: '900', color: COLORS.white, marginTop: 2 },
  metricSub:    { fontSize: 13, color: 'rgba(255,255,255,.7)', marginTop: 2 },
  bestRow:      { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10,
                  backgroundColor: 'rgba(255,255,255,.15)', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 6 },
  bestLabel:    { fontSize: 13, color: 'rgba(255,255,255,.85)', fontWeight: '700' },
  bestValue:    { fontSize: 18, fontWeight: '900', color: COLORS.white },

  /* Übungs-Karte */
  practiceCard: {
    backgroundColor: '#FFF3E0', borderRadius: 20, padding: 18,
    alignItems: 'center', marginBottom: 16,
    borderWidth: 1.5, borderColor: '#FFB74D',
  },
  practiceTitle:  { fontSize: 16, fontWeight: '800', color: '#E65100', marginBottom: 4 },
  practiceResult: { fontSize: 28, fontWeight: '900', color: '#BF360C' },

  /* Name */
  nameBox: {
    backgroundColor: COLORS.white, borderRadius: 16, padding: 14,
    marginBottom: 16, borderWidth: 1.5, borderColor: COLORS.primary + '40',
  },
  nameLabel: { fontSize: 13, fontWeight: '700', color: COLORS.textSecondary, marginBottom: 8 },
  nameInput: {
    backgroundColor: COLORS.background, borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 10,
    fontSize: 17, fontWeight: '700', color: COLORS.text,
    borderWidth: 1.5, borderColor: COLORS.primary,
  },

  /* Stats */
  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  statBox: {
    flex: 1, backgroundColor: COLORS.white, borderRadius: 16,
    borderWidth: 2.5, padding: 12, alignItems: 'center',
    elevation: 2, shadowColor: '#000', shadowOpacity: .06, shadowRadius: 4, shadowOffset: { width: 0, height: 2 },
  },
  statNumber: { fontSize: 30, fontWeight: '900' },
  statLabel:  { fontSize: 12, color: COLORS.textSecondary, fontWeight: '600', marginTop: 2 },

  /* Fehler */
  mistakesBox: {
    backgroundColor: '#FFF3F3', borderRadius: 16, padding: 14,
    marginBottom: 16, borderWidth: 1.5, borderColor: '#FFCCCC',
  },
  mistakesTitle: { fontSize: 14, fontWeight: '800', color: COLORS.error, marginBottom: 8 },
  mistakeItem:   { backgroundColor: COLORS.white, borderRadius: 10, paddingVertical: 6, paddingHorizontal: 12, marginBottom: 4 },
  mistakeText:   { fontSize: 15, color: COLORS.text },
  mistakeAnswer: { fontWeight: '900', color: COLORS.success },
  mistakeGiven:  { color: COLORS.error, fontWeight: '600', fontSize: 13 },

  /* Buttons */
  btnPrimary: {
    backgroundColor: COLORS.primary, borderRadius: 18, paddingVertical: 15,
    alignItems: 'center', marginBottom: 10,
    elevation: 3, shadowColor: COLORS.primary, shadowOpacity: .3, shadowRadius: 6, shadowOffset: { width: 0, height: 3 },
  },
  btnPrimaryText:   { fontSize: 17, fontWeight: '800', color: COLORS.white },
  btnSecondary:     { backgroundColor: COLORS.white, borderRadius: 18, paddingVertical: 13, alignItems: 'center', borderWidth: 2, borderColor: COLORS.primary, marginBottom: 10 },
  btnSecondaryText: { fontSize: 15, fontWeight: '700', color: COLORS.primary },
});
