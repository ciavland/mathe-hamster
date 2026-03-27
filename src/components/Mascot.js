/**
 * Hamster-Maskottchen 🐹
 * Reagiert auf Spielereignisse mit Emoji + Animation.
 *
 * Stimmungen:
 *   idle     – neutraler Hamster
 *   happy    – Stern-Augen, springt
 *   sad      – kurz traurig, erholt sich
 *   excited  – schnelles Hüpfen (Streak!)
 *   nervous  – zittert (Timer knapp)
 */
import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View, Text } from 'react-native';

const FACES = {
  idle:    '🐹',
  happy:   '🐹',
  sad:     '🐹',
  excited: '🐹',
  nervous: '🐹',
};

const SPEECH = {
  happy:   ['Super!', 'Toll!', 'Richtig!', 'Klasse!', 'Yeah!', 'Weiter so!'],
  sad:     ['Hmm...', 'Fast!', 'Nächstes Mal!', 'Nicht schlimm!'],
  excited: ['MEGA!', 'WOW!', 'Feuer!', 'Unstoppbar!', 'BOOM!'],
  nervous: ['Schnell!', 'Tick tack!', 'Beeil dich!', 'Los los!'],
};

function randomPick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

export default function Mascot({ mood = 'idle', streak = 0 }) {
  const bounceY   = useRef(new Animated.Value(0)).current;
  const scale     = useRef(new Animated.Value(1)).current;
  const rotate    = useRef(new Animated.Value(0)).current;
  const speechOp  = useRef(new Animated.Value(0)).current;
  const speechRef = useRef('');

  useEffect(() => {
    // Reset
    bounceY.setValue(0);
    scale.setValue(1);
    rotate.setValue(0);

    if (mood === 'happy') {
      speechRef.current = randomPick(SPEECH.happy);
      Animated.parallel([
        Animated.sequence([
          Animated.spring(bounceY, { toValue: -14, tension: 180, friction: 4, useNativeDriver: true }),
          Animated.spring(bounceY, { toValue: 0, tension: 100, friction: 6, useNativeDriver: true }),
        ]),
        Animated.sequence([
          Animated.spring(scale, { toValue: 1.25, tension: 200, friction: 5, useNativeDriver: true }),
          Animated.spring(scale, { toValue: 1, tension: 100, friction: 8, useNativeDriver: true }),
        ]),
        Animated.sequence([
          Animated.timing(speechOp, { toValue: 1, duration: 100, useNativeDriver: true }),
          Animated.delay(600),
          Animated.timing(speechOp, { toValue: 0, duration: 200, useNativeDriver: true }),
        ]),
      ]).start();
    } else if (mood === 'sad') {
      speechRef.current = randomPick(SPEECH.sad);
      Animated.parallel([
        Animated.sequence([
          Animated.timing(bounceY, { toValue: 6, duration: 120, useNativeDriver: true }),
          Animated.spring(bounceY, { toValue: 0, tension: 60, friction: 8, useNativeDriver: true }),
        ]),
        Animated.sequence([
          Animated.timing(scale, { toValue: 0.9, duration: 120, useNativeDriver: true }),
          Animated.spring(scale, { toValue: 1, tension: 80, friction: 8, useNativeDriver: true }),
        ]),
        Animated.sequence([
          Animated.timing(speechOp, { toValue: 1, duration: 100, useNativeDriver: true }),
          Animated.delay(500),
          Animated.timing(speechOp, { toValue: 0, duration: 200, useNativeDriver: true }),
        ]),
      ]).start();
    } else if (mood === 'excited') {
      speechRef.current = randomPick(SPEECH.excited);
      // Schnelles Auf-und-Ab-Hüpfen
      Animated.parallel([
        Animated.loop(
          Animated.sequence([
            Animated.timing(bounceY, { toValue: -10, duration: 80, useNativeDriver: true }),
            Animated.timing(bounceY, { toValue: 0,   duration: 80, useNativeDriver: true }),
          ]),
          { iterations: 4 },
        ),
        Animated.sequence([
          Animated.spring(scale, { toValue: 1.35, tension: 200, friction: 4, useNativeDriver: true }),
          Animated.spring(scale, { toValue: 1, tension: 100, friction: 8, useNativeDriver: true }),
        ]),
        Animated.sequence([
          Animated.timing(speechOp, { toValue: 1, duration: 80, useNativeDriver: true }),
          Animated.delay(700),
          Animated.timing(speechOp, { toValue: 0, duration: 200, useNativeDriver: true }),
        ]),
      ]).start();
    } else if (mood === 'nervous') {
      speechRef.current = randomPick(SPEECH.nervous);
      // Zittern
      Animated.parallel([
        Animated.loop(
          Animated.sequence([
            Animated.timing(rotate, { toValue: 1,  duration: 50, useNativeDriver: true }),
            Animated.timing(rotate, { toValue: -1, duration: 50, useNativeDriver: true }),
            Animated.timing(rotate, { toValue: 0,  duration: 50, useNativeDriver: true }),
          ]),
          { iterations: 6 },
        ),
        Animated.sequence([
          Animated.timing(speechOp, { toValue: 1, duration: 100, useNativeDriver: true }),
          Animated.delay(600),
          Animated.timing(speechOp, { toValue: 0, duration: 200, useNativeDriver: true }),
        ]),
      ]).start();
    }
  }, [mood]);

  const rotateInterp = rotate.interpolate({
    inputRange: [-1, 0, 1],
    outputRange: ['-8deg', '0deg', '8deg'],
  });

  return (
    <View style={styles.container}>
      {/* Sprechblase */}
      <Animated.View style={[styles.speechBubble, { opacity: speechOp }]}>
        <Text style={styles.speechText}>{speechRef.current}</Text>
        <View style={styles.speechArrow} />
      </Animated.View>

      {/* Hamster */}
      <Animated.Text
        style={[
          styles.emoji,
          {
            transform: [
              { translateY: bounceY },
              { scale },
              { rotate: rotateInterp },
            ],
          },
        ]}
      >
        🐹
      </Animated.Text>

      {/* Streak-Flammen neben dem Hamster */}
      {streak >= 3 && (
        <Animated.Text style={[styles.streakFire, { transform: [{ scale }] }]}>
          {streak >= 10 ? '💥' : streak >= 7 ? '🔥🔥🔥' : streak >= 5 ? '🔥🔥' : '🔥'}
        </Animated.Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 2,
    gap: 4,
  },
  emoji: {
    fontSize: 40,
  },
  streakFire: {
    fontSize: 22,
  },
  speechBubble: {
    position: 'absolute',
    top: -30,
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
    zIndex: 10,
  },
  speechText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#6C3CE1',
  },
  speechArrow: {
    position: 'absolute',
    bottom: -6,
    left: '50%',
    marginLeft: -6,
    width: 0,
    height: 0,
    borderLeftWidth: 6,
    borderRightWidth: 6,
    borderTopWidth: 6,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: '#fff',
  },
});
