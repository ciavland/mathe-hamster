/**
 * Sound-Effekte für Mathe-Star.
 * Preload beim App-Start, dann playSound('correct') usw.
 */
import { Audio } from 'expo-av';
import AsyncStorage from '@react-native-async-storage/async-storage';

const MUTE_KEY = 'mathe_star_muted';

const SOUND_FILES = {
  correct: require('../../assets/sounds/correct.wav'),
  wrong:   require('../../assets/sounds/wrong.wav'),
  streak:  require('../../assets/sounds/streak.wav'),
  tick:    require('../../assets/sounds/tick.wav'),
  levelup: require('../../assets/sounds/levelup.wav'),
};

const loaded = {};
let muted = false;

/**
 * Sounds vorladen + Mute-Status lesen.
 * Einmal beim App-Start aufrufen.
 */
export async function preloadSounds() {
  try {
    await Audio.setAudioModeAsync({
      playsInSilentModeIOS: true,
      shouldDuckAndroid: true,
    });

    const m = await AsyncStorage.getItem(MUTE_KEY);
    muted = m === 'true';

    const entries = Object.entries(SOUND_FILES);
    await Promise.all(
      entries.map(async ([key, file]) => {
        const { sound } = await Audio.Sound.createAsync(file, { shouldPlay: false });
        loaded[key] = sound;
      }),
    );
  } catch (e) {
    console.warn('Sound preload failed:', e);
  }
}

/**
 * Sound abspielen.
 * @param {'correct'|'wrong'|'streak'|'tick'|'levelup'} name
 */
export async function playSound(name) {
  if (muted || !loaded[name]) return;
  try {
    await loaded[name].setPositionAsync(0);
    await loaded[name].playAsync();
  } catch (_) {}
}

/**
 * Stummschalten umschalten.
 */
export async function toggleMute() {
  muted = !muted;
  await AsyncStorage.setItem(MUTE_KEY, String(muted));
  return muted;
}

/**
 * Aktueller Mute-Status.
 */
export function isMuted() {
  return muted;
}
