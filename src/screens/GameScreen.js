/**
 * GameScreen – Haupt-Spielbildschirm
 *
 * Features:
 *   - Timer (Kreis-Progress + Pulsieren unter 10s)
 *   - Streak-Zähler mit Flammen-Eskalation
 *   - Hamster-Maskottchen mit Emotionen
 *   - Sound-Effekte (correct/wrong/streak/tick)
 *   - "+1" Float-Animation bei richtiger Antwort
 *   - Konfetti-Trigger im WebView
 */
import React, {
  useState, useRef, useCallback, useEffect,
} from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  Animated, StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';

import DrawingWebView from '../components/DrawingWebView';
import Mascot from '../components/Mascot';
import { generateProblem } from '../utils/gameLogic';
import { playSound } from '../utils/sounds';
import { COLORS } from '../utils/theme';

const FEEDBACK_DURATION = 1000;

export default function GameScreen({ route, navigation }) {
  const { difficulty, practiceProblems } = route.params;
  const isPractice = !!practiceProblems;
  const totalTime = isPractice ? 999 : difficulty.timeSeconds; // Übungsmodus: kein echtes Zeitlimit

  // ── Spielzustand ──
  const [problem, setProblem] = useState(() =>
    isPractice
      ? practiceProblems[0]
      : generateProblem(difficulty.maxFactor, difficulty.allowedFactors),
  );
  const [timeLeft, setTimeLeft]       = useState(isPractice ? 0 : totalTime);
  const [feedbackType, setFeedbackType] = useState(null);
  const [streak, setStreak]           = useState(0);
  const [mascotMood, setMascotMood]   = useState('idle');

  // Stats
  const statsRef = useRef({ correct: 0, wrong: 0, total: 0, history: [] });
  const [statsDisplay, setStatsDisplay] = useState(statsRef.current);

  // Übungsmodus: Index ins practiceProblems Array
  const practiceIdxRef = useRef(0);

  // ── Refs ──
  const drawingRef = useRef(null);
  const timerRef   = useRef(null);
  const blockedRef = useRef(false);
  const streakRef  = useRef(0); // Mirror für Timer-Closure

  // ── Animationen ──
  const feedbackOpacity = useRef(new Animated.Value(0)).current;
  const problemScale    = useRef(new Animated.Value(1)).current;
  const plusOneOpacity  = useRef(new Animated.Value(0)).current;
  const plusOneY        = useRef(new Animated.Value(0)).current;
  const streakScale     = useRef(new Animated.Value(1)).current;

  // ── Timer (nur im normalen Modus) ──
  useEffect(() => {
    if (isPractice) return; // Kein Timer im Übungsmodus

    timerRef.current = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          clearInterval(timerRef.current);
          navigation.replace('Results', {
            stats: statsRef.current,
            difficulty,
            timeUsed: difficulty.timeSeconds,
          });
          return 0;
        }
        // Tick-Sound unter 10 Sekunden
        if (t <= 11 && t > 1) {
          playSound('tick');
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, []);

  // Mascot nervös bei wenig Zeit
  useEffect(() => {
    if (!isPractice && timeLeft <= 10 && timeLeft > 0 && feedbackType === null) {
      setMascotMood('nervous');
    }
  }, [timeLeft, feedbackType]);

  const timerColor =
    timeLeft > 20 ? COLORS.timerHigh :
    timeLeft > 10 ? COLORS.timerMed  :
                    COLORS.timerLow;

  // ── Neue Aufgabe ──
  const nextProblem = useCallback(() => {
    blockedRef.current = false;
    setFeedbackType(null);
    setMascotMood('idle');

    let next;
    if (isPractice) {
      practiceIdxRef.current += 1;
      if (practiceIdxRef.current >= practiceProblems.length) {
        // Übungsmodus fertig — zurück zu Results
        navigation.replace('Results', {
          stats: statsRef.current,
          difficulty,
          timeUsed: Math.round(statsRef.current.total * 5), // geschätzt
          isPractice: true,
        });
        return;
      }
      next = practiceProblems[practiceIdxRef.current];
    } else {
      next = generateProblem(difficulty.maxFactor, difficulty.allowedFactors);
    }

    setProblem(next);
    drawingRef.current?.reset(next.answer >= 10);

    // Pop-Animation
    Animated.sequence([
      Animated.timing(problemScale, { toValue: 0.88, duration: 70, useNativeDriver: true }),
      Animated.spring(problemScale, { toValue: 1, tension: 110, friction: 6, useNativeDriver: true }),
    ]).start();
  }, [difficulty, isPractice, practiceProblems]);

  // ── "+1" Float-Animation ──
  const showPlusOne = useCallback(() => {
    plusOneOpacity.setValue(1);
    plusOneY.setValue(0);
    Animated.parallel([
      Animated.timing(plusOneY, { toValue: -40, duration: 600, useNativeDriver: true }),
      Animated.timing(plusOneOpacity, { toValue: 0, duration: 600, useNativeDriver: true }),
    ]).start();
  }, []);

  // ── Streak-Bounce ──
  const bounceStreak = useCallback(() => {
    streakScale.setValue(1.4);
    Animated.spring(streakScale, { toValue: 1, tension: 150, friction: 5, useNativeDriver: true }).start();
  }, []);

  // ── Antwort verarbeiten ──
  const handleAnswer = useCallback((givenAnswer) => {
    if (blockedRef.current) return;
    blockedRef.current = true;

    const correct = givenAnswer === problem.answer;
    const type    = correct ? 'correct' : 'wrong';

    // Streak
    let newStreak;
    if (correct) {
      newStreak = streakRef.current + 1;
    } else {
      newStreak = 0;
    }
    streakRef.current = newStreak;
    setStreak(newStreak);

    // Stats
    const updated = {
      correct:  statsRef.current.correct + (correct ? 1 : 0),
      wrong:    statsRef.current.wrong   + (correct ? 0 : 1),
      total:    statsRef.current.total   + 1,
      history:  [...statsRef.current.history, { ...problem, given: givenAnswer, correct }],
    };
    statsRef.current = updated;
    setStatsDisplay({ ...updated });

    // Sound
    if (correct) {
      playSound('correct');
      // Streak-Meilenstein-Sound
      if (newStreak === 3 || newStreak === 5 || newStreak === 7 || newStreak === 10 || newStreak === 15) {
        setTimeout(() => playSound('streak'), 150);
      }
    } else {
      playSound('wrong');
    }

    // Haptics
    Haptics.notificationAsync(
      correct
        ? Haptics.NotificationFeedbackType.Success
        : Haptics.NotificationFeedbackType.Error,
    );

    // Mascot + visuelle Effekte
    if (correct) {
      setMascotMood(newStreak >= 3 ? 'excited' : 'happy');
      showPlusOne();
      if (newStreak >= 3) bounceStreak();
      // Konfetti im WebView
      drawingRef.current?.celebrate?.(newStreak);
    } else {
      setMascotMood('sad');
    }

    // Feedback-Flash
    setFeedbackType(type);
    Animated.sequence([
      Animated.timing(feedbackOpacity, { toValue: 1, duration: 180, useNativeDriver: true }),
      Animated.delay(FEEDBACK_DURATION - 360),
      Animated.timing(feedbackOpacity, { toValue: 0, duration: 180, useNativeDriver: true }),
    ]).start(() => nextProblem());
  }, [problem, nextProblem, showPlusOne, bounceStreak]);

  const handleSkip = useCallback(() => {
    if (blockedRef.current) return;
    nextProblem();
  }, [nextProblem]);

  // ── Render ──
  const feedbackBgColor = feedbackOpacity.interpolate({
    inputRange:  [0, 1],
    outputRange: [
      'rgba(0,0,0,0)',
      feedbackType === 'correct'
        ? 'rgba(76,175,80,0.18)'
        : 'rgba(244,67,54,0.18)',
    ],
  });

  // Timer-Fortschritt (0-1)
  const timerProgress = isPractice ? 1 : timeLeft / totalTime;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />

      {/* ── Header ── */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => {
            clearInterval(timerRef.current);
            navigation.goBack();
          }}
        >
          <Text style={styles.backText}>‹</Text>
        </TouchableOpacity>

        {/* Timer */}
        {!isPractice ? (
          <View style={styles.timerWrap}>
            <View style={[styles.timerCircle, { borderColor: timerColor }]}>
              <Text style={[styles.timerText, { color: timerColor }]}>
                {timeLeft}
              </Text>
            </View>
          </View>
        ) : (
          <View style={styles.practiceLabel}>
            <Text style={styles.practiceLabelText}>🎯 Übung</Text>
          </View>
        )}

        {/* Score + "+1" Animation */}
        <View style={styles.scoreBox}>
          <Animated.Text
            style={[
              styles.plusOne,
              { opacity: plusOneOpacity, transform: [{ translateY: plusOneY }] },
            ]}
          >
            +1
          </Animated.Text>
          <Text style={styles.scoreLabel}>✓</Text>
          <Text style={styles.scoreValue}>{statsDisplay.correct}</Text>
        </View>
      </View>

      {/* ── Fortschrittsbalken ── */}
      {!isPractice && (
        <View style={styles.progressBg}>
          <View
            style={[
              styles.progressFill,
              {
                width: `${timerProgress * 100}%`,
                backgroundColor: timerColor,
              },
            ]}
          />
        </View>
      )}

      {/* ── Streak-Anzeige ── */}
      {streak >= 3 && (
        <Animated.View style={[styles.streakBar, { transform: [{ scale: streakScale }] }]}>
          <Text style={styles.streakText}>
            {streak >= 10 ? '💥 ' : '🔥 '}
            {streak}er Serie!
            {streak >= 10 ? ' 💥' : streak >= 5 ? ' 🔥🔥' : ' 🔥'}
          </Text>
        </Animated.View>
      )}

      {/* ── Aufgabe ── */}
      <Animated.View
        style={[styles.problemWrap, { transform: [{ scale: problemScale }] }]}
      >
        <Text style={styles.problemText}>
          {problem.a} × {problem.b} = ?
        </Text>
      </Animated.View>

      {/* ── Maskottchen ── */}
      <Mascot mood={mascotMood} streak={streak} />

      {/* ── Numpad (WebView) ── */}
      <DrawingWebView
        ref={drawingRef}
        style={styles.webView}
        onAnswer={handleAnswer}
        onSkip={handleSkip}
        onModelReady={() => drawingRef.current?.reset(problem.answer >= 10)}
      />

      {/* ── Feedback-Flash-Overlay ── */}
      <Animated.View
        style={[styles.feedbackOverlay, { backgroundColor: feedbackBgColor }]}
        pointerEvents="none"
      >
        {feedbackType === 'correct' && (
          <Text style={styles.feedbackIcon}>✓</Text>
        )}
        {feedbackType === 'wrong' && (
          <>
            <Text style={styles.feedbackIcon}>✗</Text>
            <View style={styles.correctionBubble}>
              <Text style={styles.correctionText}>
                {problem.a} × {problem.b} = {problem.answer}
              </Text>
            </View>
          </>
        )}
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },

  /* Header */
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 6,
    paddingBottom: 2,
  },
  backBtn: {
    width: 40, height: 40,
    alignItems: 'center', justifyContent: 'center',
  },
  backText: {
    fontSize: 30, color: COLORS.primary, fontWeight: '300', lineHeight: 34,
  },

  /* Timer */
  timerWrap: {
    alignItems: 'center',
  },
  timerCircle: {
    width: 56, height: 56,
    borderRadius: 28,
    borderWidth: 3.5,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: COLORS.white,
  },
  timerText: {
    fontSize: 20, fontWeight: '900',
  },

  /* Übungsmodus-Label */
  practiceLabel: {
    backgroundColor: COLORS.accent,
    borderRadius: 16,
    paddingHorizontal: 14, paddingVertical: 6,
  },
  practiceLabelText: {
    fontSize: 14, fontWeight: '800', color: COLORS.text,
  },

  /* Score */
  scoreBox: {
    width: 44, alignItems: 'center',
  },
  scoreLabel: {
    fontSize: 13, color: COLORS.success, fontWeight: '800',
  },
  scoreValue: {
    fontSize: 24, fontWeight: '900', color: COLORS.primary, lineHeight: 26,
  },
  plusOne: {
    position: 'absolute', top: -20,
    fontSize: 18, fontWeight: '900', color: COLORS.success,
  },

  /* Fortschrittsbalken */
  progressBg: {
    height: 5, backgroundColor: '#E0E0E0',
    marginHorizontal: 16, borderRadius: 3,
    overflow: 'hidden', marginBottom: 4,
  },
  progressFill: {
    height: 5, borderRadius: 3,
  },

  /* Streak */
  streakBar: {
    alignSelf: 'center',
    backgroundColor: '#FFF3E0',
    borderRadius: 16,
    paddingHorizontal: 14, paddingVertical: 4,
    borderWidth: 1.5, borderColor: '#FFB74D',
    marginBottom: 2,
  },
  streakText: {
    fontSize: 14, fontWeight: '800', color: '#E65100',
    textAlign: 'center',
  },

  /* Aufgabe */
  problemWrap: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  problemText: {
    fontSize: 56, fontWeight: '900', color: COLORS.text, letterSpacing: -2,
  },

  /* WebView */
  webView: {
    flex: 1,
  },

  /* Feedback-Overlay */
  feedbackOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 20,
    alignItems: 'center', justifyContent: 'center',
    pointerEvents: 'none',
  },
  feedbackIcon: {
    fontSize: 110, opacity: 0.55,
  },
  correctionBubble: {
    backgroundColor: COLORS.error,
    borderRadius: 20,
    paddingHorizontal: 22, paddingVertical: 10,
    marginTop: 8,
  },
  correctionText: {
    color: COLORS.white, fontSize: 18, fontWeight: '800',
  },
});
