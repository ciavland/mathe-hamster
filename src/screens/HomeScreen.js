import React, { useRef, useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  Animated, ScrollView, StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { COLORS, DIFFICULTY } from '../utils/theme';
import { getPersonalBest, formatAvgTime } from '../utils/leaderboard';
import { getStreakInfo } from '../utils/streaks';
import { getWeakCount, getWeakProblems } from '../utils/weakProblems';
import { toggleMute, isMuted } from '../utils/sounds';

const DECO_EMOJIS = ['🌰', '⭐', '🌰', '🐿️', '🌰', '⭐', '🌰', '🌰'];
const STAR_COUNT = DECO_EMOJIS.length;
const WEEKDAYS = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];

export default function HomeScreen({ navigation }) {
  const starAnims = useRef(
    Array.from({ length: STAR_COUNT }, () => ({
      opacity: new Animated.Value(0),
      translateY: new Animated.Value(0),
    })),
  ).current;
  const titleScale = useRef(new Animated.Value(0.8)).current;

  // Dynamic data
  const [streakInfo, setStreakInfo] = useState({ currentStreak: 0, last7: [], todayPlayed: false });
  const [personalBests, setPersonalBests] = useState({});
  const [weakCount, setWeakCount] = useState(0);
  const [muted, setMuted] = useState(isMuted());

  // Reload data when screen gets focus
  useFocusEffect(
    useCallback(() => {
      async function load() {
        const [si, wc, bestEasy, bestMed, bestHard] = await Promise.all([
          getStreakInfo(),
          getWeakCount(),
          getPersonalBest('EASY'),
          getPersonalBest('MEDIUM'),
          getPersonalBest('HARD'),
        ]);
        setStreakInfo(si);
        setWeakCount(wc);
        setPersonalBests({
          EASY: bestEasy,
          MEDIUM: bestMed,
          HARD: bestHard,
        });
      }
      load();
    }, []),
  );

  useEffect(() => {
    Animated.spring(titleScale, {
      toValue: 1, tension: 60, friction: 8, useNativeDriver: true,
    }).start();

    starAnims.forEach((anim, i) => {
      Animated.loop(
        Animated.sequence([
          Animated.delay(i * 300),
          Animated.parallel([
            Animated.timing(anim.opacity,    { toValue: 1,  duration: 600, useNativeDriver: true }),
            Animated.timing(anim.translateY, { toValue: -8, duration: 600, useNativeDriver: true }),
          ]),
          Animated.parallel([
            Animated.timing(anim.opacity,    { toValue: 0.3, duration: 600, useNativeDriver: true }),
            Animated.timing(anim.translateY, { toValue: 0,   duration: 600, useNativeDriver: true }),
          ]),
        ]),
      ).start();
    });
  }, []);

  const starPositions = [
    { top: 60, left: 20 }, { top: 40, left: 100 }, { top: 80, right: 30 },
    { top: 30, right: 80 }, { top: 120, left: 50 }, { top: 100, right: 50 },
    { top: 55, left: 200 }, { top: 90, left: 280 },
  ];

  const handleMuteToggle = async () => {
    const newMuted = await toggleMute();
    setMuted(newMuted);
  };

  const handlePractice = async () => {
    const problems = await getWeakProblems();
    if (problems.length === 0) return;
    navigation.navigate('Game', {
      difficulty: { ...DIFFICULTY.MEDIUM, key: 'PRACTICE', label: 'Übung', timeSeconds: 999 },
      practiceProblems: problems.slice(0, 15), // Max 15 Aufgaben
    });
  };

  // Wochentag-Index für die 7-Tage-Anzeige (0=Mo)
  const todayDow = (new Date().getDay() + 6) % 7; // JS: 0=So → wir brauchen 0=Mo

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.background} />

      {/* Dekorative Sterne */}
      <View style={styles.starsContainer} pointerEvents="none">
        {starAnims.map((anim, i) => (
          <Animated.Text
            key={i}
            style={[
              styles.decorStar, starPositions[i],
              { opacity: anim.opacity, transform: [{ translateY: anim.translateY }] },
            ]}
          >
            {DECO_EMOJIS[i]}
          </Animated.Text>
        ))}
      </View>

      {/* Mute Toggle */}
      <TouchableOpacity style={styles.muteBtn} onPress={handleMuteToggle}>
        <Text style={styles.muteEmoji}>{muted ? '🔇' : '🔊'}</Text>
      </TouchableOpacity>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* Titel */}
        <Animated.View style={{ transform: [{ scale: titleScale }] }}>
          <Text style={styles.emoji}>🐹</Text>
          <Text style={styles.title}>Mathe{'\n'}Hamster</Text>
          <Text style={styles.tagline}>Hamstern mit Köpfchen!</Text>
        </Animated.View>

        {/* ── Tages-Streak ── */}
        {streakInfo.currentStreak > 0 && (
          <View style={styles.streakCard}>
            <Text style={styles.streakFire}>
              🔥 {streakInfo.currentStreak} {streakInfo.currentStreak === 1 ? 'Tag' : 'Tage'} in Folge!
            </Text>
            <View style={styles.weekRow}>
              {streakInfo.last7.map((played, i) => (
                <View key={i} style={styles.dayCol}>
                  <View style={[styles.dayDot, played && styles.dayDotActive,
                    i === 6 && styles.dayDotToday]} />
                  <Text style={[styles.dayLabel, i === 6 && styles.dayLabelToday]}>
                    {WEEKDAYS[(todayDow - 6 + i + 7) % 7]}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* ── Schwierigkeitswahl ── */}
        <View style={styles.difficultyContainer}>
          <Text style={styles.sectionTitle}>Wähle dein Level:</Text>

          {Object.values(DIFFICULTY).map((diff) => {
            const best = personalBests[diff.key];
            return (
              <TouchableOpacity
                key={diff.key}
                style={[styles.diffButton, { borderColor: diff.color }]}
                onPress={() => navigation.navigate('Game', { difficulty: diff })}
                activeOpacity={0.85}
              >
                <View style={[styles.diffBadge, { backgroundColor: diff.color }]}>
                  <Text style={styles.diffEmoji}>{diff.emoji}</Text>
                </View>
                <View style={styles.diffInfo}>
                  <Text style={styles.diffLabel}>{diff.label}</Text>
                  <Text style={styles.diffDesc}>{diff.description}</Text>
                  {best && (
                    <Text style={styles.diffBest}>🏆 {formatAvgTime(best.avgTime)}</Text>
                  )}
                </View>
                <Text style={styles.diffArrow}>›</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* ── Schwächen-Training ── */}
        {weakCount > 0 && (
          <TouchableOpacity style={styles.practiceBtn} onPress={handlePractice} activeOpacity={0.85}>
            <View style={styles.practiceBadge}>
              <Text style={styles.practiceEmoji}>🎯</Text>
            </View>
            <View style={styles.practiceInfo}>
              <Text style={styles.practiceLabel}>Noch üben</Text>
              <Text style={styles.practiceDesc}>
                {weakCount} {weakCount === 1 ? 'Aufgabe' : 'Aufgaben'} wiederholen
              </Text>
            </View>
            <View style={styles.practiceCount}>
              <Text style={styles.practiceCountText}>{weakCount}</Text>
            </View>
          </TouchableOpacity>
        )}

        {/* ── Bestenliste ── */}
        <TouchableOpacity
          style={styles.leaderboardBtn}
          onPress={() => navigation.navigate('Leaderboard')}
          activeOpacity={0.85}
        >
          <Text style={styles.leaderboardBtnText}>🏆 Bestenliste</Text>
        </TouchableOpacity>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  starsContainer: { ...StyleSheet.absoluteFillObject, zIndex: 0 },
  decorStar: { position: 'absolute', fontSize: 20 },

  muteBtn: {
    position: 'absolute', top: 52, right: 16, zIndex: 10,
    width: 36, height: 36, alignItems: 'center', justifyContent: 'center',
  },
  muteEmoji: { fontSize: 20 },

  scroll: { padding: 24, paddingTop: 32, alignItems: 'center' },

  emoji: { fontSize: 64, textAlign: 'center', marginBottom: 4 },
  title: {
    fontSize: 52, fontWeight: '900', color: COLORS.primary,
    textAlign: 'center', lineHeight: 56, letterSpacing: -1,
  },
  tagline: {
    fontSize: 16, color: COLORS.textSecondary, textAlign: 'center',
    marginTop: 6, marginBottom: 22, fontWeight: '700',
    fontStyle: 'italic', letterSpacing: 0.3,
  },

  /* Streak */
  streakCard: {
    width: '100%', backgroundColor: '#FFF8E1', borderRadius: 18,
    padding: 14, marginBottom: 20,
    borderWidth: 1.5, borderColor: '#FFE082',
  },
  streakFire: {
    fontSize: 16, fontWeight: '800', color: '#E65100', textAlign: 'center', marginBottom: 10,
  },
  weekRow: {
    flexDirection: 'row', justifyContent: 'space-around',
  },
  dayCol: { alignItems: 'center', gap: 4 },
  dayDot: {
    width: 20, height: 20, borderRadius: 10,
    backgroundColor: '#E0E0E0',
  },
  dayDotActive: { backgroundColor: '#FF9800' },
  dayDotToday: { borderWidth: 2, borderColor: COLORS.primary },
  dayLabel: { fontSize: 10, fontWeight: '700', color: COLORS.textSecondary },
  dayLabelToday: { color: COLORS.primary, fontWeight: '900' },

  /* Difficulty */
  sectionTitle: {
    fontSize: 18, fontWeight: '700', color: COLORS.text,
    marginBottom: 14, alignSelf: 'flex-start',
  },
  difficultyContainer: { width: '100%', gap: 12 },
  diffButton: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: COLORS.white, borderRadius: 18, borderWidth: 2.5,
    padding: 14,
    elevation: 3, shadowColor: '#000', shadowOpacity: 0.08,
    shadowRadius: 8, shadowOffset: { width: 0, height: 3 },
  },
  diffBadge: {
    width: 48, height: 48, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center', marginRight: 14,
  },
  diffEmoji: { fontSize: 24 },
  diffInfo: { flex: 1 },
  diffLabel: { fontSize: 18, fontWeight: '800', color: COLORS.text },
  diffDesc: { fontSize: 13, color: COLORS.textSecondary, marginTop: 2 },
  diffBest: { fontSize: 12, fontWeight: '700', color: COLORS.primary, marginTop: 3 },
  diffArrow: { fontSize: 28, color: COLORS.textSecondary, fontWeight: '300' },

  /* Practice */
  practiceBtn: {
    flexDirection: 'row', alignItems: 'center', width: '100%',
    backgroundColor: '#FFF3E0', borderRadius: 18, borderWidth: 2,
    borderColor: '#FFB74D', padding: 14, marginTop: 16,
    elevation: 2, shadowColor: '#000', shadowOpacity: 0.06,
    shadowRadius: 4, shadowOffset: { width: 0, height: 2 },
  },
  practiceBadge: {
    width: 48, height: 48, borderRadius: 14,
    backgroundColor: '#FF9800', alignItems: 'center', justifyContent: 'center',
    marginRight: 14,
  },
  practiceEmoji: { fontSize: 24 },
  practiceInfo: { flex: 1 },
  practiceLabel: { fontSize: 18, fontWeight: '800', color: '#E65100' },
  practiceDesc: { fontSize: 13, color: '#BF360C', marginTop: 2 },
  practiceCount: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: '#FF9800', alignItems: 'center', justifyContent: 'center',
  },
  practiceCountText: { fontSize: 15, fontWeight: '900', color: '#fff' },

  /* Leaderboard */
  leaderboardBtn: {
    marginTop: 20, width: '100%',
    backgroundColor: COLORS.white, borderRadius: 18, paddingVertical: 13,
    alignItems: 'center', borderWidth: 2, borderColor: COLORS.primary,
  },
  leaderboardBtnText: { fontSize: 15, fontWeight: '700', color: COLORS.primary },
});
