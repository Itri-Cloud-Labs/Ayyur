import { memo, type ReactNode, useEffect, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import { night } from '@/theme/palette';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

const COUNT = 46;

// A fixed scatter (seeded, so the sky is the same every time). Stars keep to the top band and the
// outer gutters, so none land beside text where they could read as punctuation or diacritics.
function stars() {
  let seed = 7;
  const random = () => {
    seed = (seed * 16807) % 2147483647;
    return seed / 2147483647;
  };
  return Array.from({ length: COUNT }, (_, i) => {
    // Two side bands: the outer fifth of the screen at the top, where only Ayyur is, and the outer
    // edge further down, where the content has its margin.
    const high = i % 2 === 0;
    const side = random() < 0.5;
    const x = high ? (side ? random() * 18 : 82 + random() * 18) : side ? random() * 4 : 96 + random() * 4;
    const y = high ? 7 + random() * 12 : 20 + random() * 74;
    return {
      x,
      y,
      size: 2 + random() * 2.5,
      glow: 0.45 + random() * 0.55,
      twinkles: i % 5 === 0,
    };
  });
}

// Twinkling stars share three slow clocks, one per group, rather than an animation each: fewer views
// change every frame, which is what costs on slower phones.
const GROUPS = 3;

const Star = memo(function Star({ star, lit }: { star: ReturnType<typeof stars>[number]; lit: boolean }) {
  const reduceMotion = useReducedMotion();
  const on = useSharedValue(lit ? 1 : 0);

  useEffect(() => {
    on.value = withTiming(lit ? 1 : 0, {
      duration: reduceMotion ? 0 : 600,
      easing: Easing.out(Easing.quad),
    });
  }, [lit, on, reduceMotion]);

  const style = useAnimatedStyle(() => ({ opacity: on.value * star.glow }));

  return (
    <Animated.View
      style={[
        styles.star,
        style,
        {
          left: `${star.x}%`,
          top: `${star.y}%`,
          width: star.size,
          height: star.size,
          backgroundColor: night.ink,
        },
      ]}
    />
  );
});

function Twinkle({ group, children }: { group: number; children: ReactNode }) {
  const reduceMotion = useReducedMotion();
  const twinkle = useSharedValue(1);
  useEffect(() => {
    if (reduceMotion) return;
    twinkle.value = withDelay(
      group * 930,
      withRepeat(withSequence(withTiming(0.35, { duration: 1400 }), withTiming(1, { duration: 1400 })), -1),
    );
  }, [group, reduceMotion, twinkle]);
  const style = useAnimatedStyle(() => ({ opacity: twinkle.value }));
  return <Animated.View style={[StyleSheet.absoluteFill, style]}>{children}</Animated.View>;
}

/**
 * The night behind onboarding. Stars come out as the user goes: `progress` (0 to 1, never decreasing)
 * lights them one by one, so the sky is full when the plan is ready.
 */
export const Sky = memo(function Sky({ progress }: { progress: number }) {
  const field = useMemo(() => stars(), []);
  // A few stars are out from the start, so the first screen is already a night sky.
  const lit = Math.round(8 + progress * (COUNT - 8));
  const star = (i: number) => <Star key={i} star={field[i]} lit={i < lit} />;
  const indexes = field.map((_, i) => i);

  return (
    <View style={[StyleSheet.absoluteFill, { pointerEvents: 'none' }]} className="bg-canvas">
      {indexes.filter((i) => !field[i].twinkles).map(star)}
      {Array.from({ length: GROUPS }, (_, g) => (
        <Twinkle key={`t${g}`} group={g}>
          {indexes.filter((i) => field[i].twinkles && i % GROUPS === g).map(star)}
        </Twinkle>
      ))}
    </View>
  );
});

const styles = StyleSheet.create({
  star: { position: 'absolute', borderRadius: 9999 },
});
