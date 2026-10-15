import { useEffect, useRef, useState } from 'react';
import { Image, Pressable, StyleSheet } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { BLINKS, body, type Expression, layers, TILTS } from './layers';

type LiveAyyurProps = {
  expression: Expression;
  size: number;
  /** Shifts his gaze: -1 left, 1 right. */
  look?: -1 | 0 | 1;
  /** Gentle hovering. Off for still moments. */
  float?: boolean;
  onPress?: () => void;
  accessibilityLabel?: string;
  /** Hide him from screen readers, for screens where he is decoration around the question. */
  decorative?: boolean;
};

const EASE_OUT = Easing.bezier(0.25, 1, 0.5, 1);
const EASE_IN_OUT = Easing.inOut(Easing.sin);

/**
 * Ayyur, alive: he blinks on a loose rhythm, hovers, tilts his head, glances, and changes expression
 * with a short crossfade and a small lift. With reduced motion he holds still and only his face changes.
 */
export function LiveAyyur({ expression, size, look = 0, float = true, onPress, accessibilityLabel, decorative = false }: LiveAyyurProps) {
  const reduceMotion = useReducedMotion();

  // The outgoing face fades under the incoming one.
  // Tracked during render (React's pattern for state derived from a changing prop).
  const [faces, setFaces] = useState({ current: expression, previous: expression });
  if (expression !== faces.current) setFaces({ current: expression, previous: faces.current });
  const shown = faces.current;
  const swap = useSharedValue(1);
  useEffect(() => {
    swap.value = 0;
    swap.value = withTiming(1, { duration: reduceMotion ? 0 : 180, easing: EASE_OUT });
  }, [shown, reduceMotion, swap]);

  const tilt = useSharedValue(TILTS[expression]);
  const lift = useSharedValue(0);
  useEffect(() => {
    tilt.value = withTiming(TILTS[expression], { duration: reduceMotion ? 0 : 320, easing: EASE_OUT });
    if (!reduceMotion) lift.value = withSequence(withTiming(1, { duration: 110 }), withTiming(0, { duration: 240, easing: EASE_OUT }));
  }, [expression, lift, reduceMotion, tilt]);

  const hover = useSharedValue(0);
  useEffect(() => {
    if (reduceMotion || !float) {
      hover.value = withTiming(0, { duration: 200 });
      return;
    }
    hover.value = withRepeat(
      withSequence(withTiming(1, { duration: 1700, easing: EASE_IN_OUT }), withTiming(-1, { duration: 1700, easing: EASE_IN_OUT })),
      -1,
    );
  }, [float, hover, reduceMotion]);

  // Blinks come at uneven intervals, now and then twice in a row, so they never feel mechanical.
  const lid = useSharedValue(1);
  const canBlink = BLINKS.has(faces.current) && !reduceMotion;
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => {
    if (!canBlink) return;
    const schedule = () => {
      timer.current = setTimeout(
        () => {
          const close = withSequence(withTiming(0.08, { duration: 70 }), withTiming(1, { duration: 120 }));
          lid.value = Math.random() < 0.2 ? withSequence(close, withTiming(1, { duration: 90 }), close) : close;
          schedule();
        },
        2400 + Math.random() * 3200,
      );
    };
    schedule();
    return () => clearTimeout(timer.current);
  }, [canBlink, lid]);

  const gaze = useSharedValue(look);
  useEffect(() => {
    gaze.value = withTiming(look, { duration: reduceMotion ? 0 : 260, easing: EASE_OUT });
  }, [gaze, look, reduceMotion]);

  const whole = useAnimatedStyle(() => ({
    transform: [
      { translateY: hover.value * size * 0.025 - lift.value * size * 0.05 },
      { rotate: `${tilt.value}deg` },
      { scale: 1 + lift.value * 0.04 },
    ],
  }));
  const currentFace = useAnimatedStyle(() => ({ opacity: swap.value }));
  const previousFace = useAnimatedStyle(() => ({ opacity: 1 - swap.value }));
  const eyes = useAnimatedStyle(() => ({
    transform: [{ translateX: gaze.value * size * 0.035 }, { scaleY: lid.value }],
  }));

  const frame = { width: size, height: size };
  const face = (name: Expression, style: typeof currentFace) => (
    <Animated.View style={[StyleSheet.absoluteFill, style]}>
      <Image source={layers[name].mouth} style={frame} accessible={false} />
      <Animated.View style={[StyleSheet.absoluteFill, styles.eyeOrigin, eyes]}>
        <Image source={layers[name].eyes} style={frame} accessible={false} />
      </Animated.View>
    </Animated.View>
  );

  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      accessible={!decorative}
      accessibilityElementsHidden={decorative}
      importantForAccessibility={decorative ? 'no-hide-descendants' : 'auto'}
      accessibilityRole={onPress ? 'button' : 'image'}
      accessibilityLabel={accessibilityLabel ?? 'Ayyur, a smiling moon'}
      style={frame}>
      <Animated.View style={[frame, whole]}>
        <Image source={body} style={frame} accessible={false} />
        {faces.previous !== faces.current ? face(faces.previous, previousFace) : null}
        {face(faces.current, currentFace)}
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  // Blinks squash the eyes towards their own centre line, not the middle of the canvas.
  eyeOrigin: { transformOrigin: '50% 52%' },
});
