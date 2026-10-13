import { CheckIcon } from 'phosphor-react-native/src/icons/Check';
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withTiming } from 'react-native-reanimated';

import { ON_COLOR } from '@/theme/colors';
import { TONES, type Tone } from '@/theme/tones';

export type MarkState = 'done' | 'pending' | 'unrecorded';

const SIZE = 28;

/**
 * The mark at the end of a row. Each state has its own shape, so they read without colour:
 * a filled disc with a check, a solid ring, or a dashed ring for something left unrecorded.
 */
export function StatusMark({ state, tone }: { state: MarkState; tone: Tone }) {
  const reduceMotion = useReducedMotion();
  const done = state === 'done';
  const progress = useSharedValue(done ? 1 : 0);

  useEffect(() => {
    progress.value = withTiming(done ? 1 : 0, {
      duration: reduceMotion ? 0 : done ? 200 : 120,
      easing: Easing.bezier(0.25, 1, 0.5, 1),
    });
  }, [done, progress, reduceMotion]);

  const disc = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [{ scale: 0.6 + 0.4 * progress.value }],
  }));

  return (
    <View style={styles.box}>
      <View
        className={`h-full w-full rounded-full border-2 ${
          state === 'unrecorded' ? 'border-dashed border-ink-subtle' : 'border-line'
        }`}
      />
      <Animated.View style={[StyleSheet.absoluteFill, disc]}>
        <View className={`flex-1 items-center justify-center rounded-full ${TONES[tone].fill}`}>
          <CheckIcon size={16} weight="bold" color={ON_COLOR} />
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  box: { width: SIZE, height: SIZE },
});
