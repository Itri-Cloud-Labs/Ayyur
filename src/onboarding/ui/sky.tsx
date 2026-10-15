import { useEffect, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
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

// A fixed scatter (seeded, so the sky is the same every time), denser towards the top.
function stars() {
  let seed = 7;
  const random = () => {
    seed = (seed * 16807) % 2147483647;
    return seed / 2147483647;
  };
  return Array.from({ length: COUNT }, (_, i) => ({
    x: random() * 100,
    y: Math.pow(random(), 1.6) * 92,
    size: 2 + random() * 2.5,
    glow: 0.45 + random() * 0.55,
    twinkles: i % 5 === 0,
    // Gold stars are rare, like the moon's own colour scattered once or twice.
    gold: i % 11 === 3,
  }));
}

function Star({ star, lit, index }: { star: ReturnType<typeof stars>[number]; lit: boolean; index: number }) {
  const reduceMotion = useReducedMotion();
  const on = useSharedValue(lit ? 1 : 0);
  const twinkle = useSharedValue(1);

  useEffect(() => {
    on.value = withTiming(lit ? 1 : 0, { duration: reduceMotion ? 0 : 600, easing: Easing.out(Easing.quad) });
  }, [lit, on, reduceMotion]);

  useEffect(() => {
    if (!star.twinkles || reduceMotion) return;
    twinkle.value = withDelay(
      index * 170,
      withRepeat(withSequence(withTiming(0.35, { duration: 1400 }), withTiming(1, { duration: 1400 })), -1),
    );
  }, [index, reduceMotion, star.twinkles, twinkle]);

  const style = useAnimatedStyle(() => ({ opacity: on.value * twinkle.value * star.glow }));

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
          backgroundColor: star.gold ? '#fdce3e' : '#f0f3fc',
        },
      ]}
    />
  );
}

/**
 * The night behind onboarding. Stars come out as the user goes: `progress` from 0 to 1 lights them
 * one by one, so the sky is full when the plan is ready.
 */
export function Sky({ progress }: { progress: number }) {
  const field = useMemo(() => stars(), []);
  // A few stars are out from the start, so the first screen is already a night sky.
  const lit = Math.round(8 + progress * (COUNT - 8));

  return (
    <View style={[StyleSheet.absoluteFill, { pointerEvents: 'none' }]} className="bg-canvas">
      {field.map((star, i) => (
        <Star key={i} star={star} index={i} lit={i < lit} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  star: { position: 'absolute', borderRadius: 9999 },
});
