import { useCallback, useEffect, useRef, useState } from 'react';
import { Image, Pressable, StyleSheet } from 'react-native';
import Animated, {
  Easing,
  type SharedValue,
  useAnimatedStyle,
  useFrameCallback,
  useReducedMotion,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

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
const FADE = 260;
// One full float, down and back up, in milliseconds.
const FLOAT_PERIOD = 3400;
// The most one frame may advance the float: about two frames' worth at 60 Hz.
const MAX_STEP = 34;

type Layer = { name: Expression; fadeIn: boolean };

/**
 * One expression's eyes and mouth. Each face has its own opacity and eases towards shown or hidden from
 * wherever it is, so a change that lands mid-crossfade never makes a face jump. Once faded out, it
 * tells the parent to unmount it.
 */
function Face({
  name,
  current,
  fadeIn,
  size,
  gaze,
  lid,
  onGone,
}: {
  name: Expression;
  current: boolean;
  fadeIn: boolean;
  size: number;
  /** Shared by every face, so a glance or a blink carries across a change of expression. */
  gaze: SharedValue<number>;
  lid: SharedValue<number>;
  onGone: (name: Expression) => void;
}) {
  const reduceMotion = useReducedMotion();
  const opacity = useSharedValue(fadeIn && !reduceMotion ? 0 : 1);
  useEffect(() => {
    opacity.value = withTiming(current ? 1 : 0, { duration: reduceMotion ? 0 : FADE, easing: EASE_IN_OUT }, (finished) => {
      if (finished && !current) scheduleOnRN(onGone, name);
    });
  }, [current, name, onGone, opacity, reduceMotion]);
  const style = useAnimatedStyle(() => ({ opacity: opacity.value }));
  const eyes = useAnimatedStyle(() => ({
    transform: [{ translateX: gaze.value * size * 0.035 }, { scaleY: lid.value }],
  }));
  const frame = { width: size, height: size };
  return (
    <Animated.View style={[StyleSheet.absoluteFill, style]}>
      <Image source={layers[name].mouth} style={frame} accessible={false} />
      <Animated.View style={[StyleSheet.absoluteFill, styles.eyeOrigin, eyes]}>
        <Image source={layers[name].eyes} style={frame} accessible={false} />
      </Animated.View>
    </Animated.View>
  );
}

/**
 * Ayyur, alive: he blinks on a loose rhythm, hovers, tilts his head, glances, and changes expression
 * with a short crossfade and a small lift. With reduced motion he holds still and only his face changes.
 */
export function LiveAyyur({ expression, size, look = 0, float = true, onPress, accessibilityLabel, decorative = false }: LiveAyyurProps) {
  const reduceMotion = useReducedMotion();

  // Every face still on screen, the current one last. A new expression fades in over the others, which
  // fade out and are dropped once they're gone. Tracked during render (React's pattern for state derived
  // from a changing prop).
  const [faces, setFaces] = useState<Layer[]>([{ name: expression, fadeIn: false }]);
  const shown = faces[faces.length - 1].name;
  if (expression !== shown) setFaces([...faces.filter((f) => f.name !== expression), { name: expression, fadeIn: true }]);
  const onGone = useCallback(
    (name: Expression) => setFaces((list) => (list[list.length - 1].name === name ? list : list.filter((f) => f.name !== name))),
    [],
  );

  const tilt = useSharedValue(TILTS[expression]);
  const lift = useSharedValue(0);
  useEffect(() => {
    tilt.value = withTiming(TILTS[expression], { duration: reduceMotion ? 0 : 320, easing: EASE_OUT });
    // A small hop: eased at both ends, so it neither jolts on the way up nor stops dead on landing.
    if (!reduceMotion)
      lift.value = withSequence(
        withTiming(1, { duration: 140, easing: Easing.out(Easing.quad) }),
        withTiming(0, { duration: 320, easing: EASE_OUT }),
      );
  }, [expression, lift, reduceMotion, tilt]);

  // The float runs on his own clock rather than a repeating animation: a phase that advances each
  // frame, with his height a sine of it, so there is no loop to finish and restart. Each step is
  // capped, so when a slow phone drops frames he pauses for a moment instead of skipping ahead.
  // `drift` eases the float in and out, so it never starts or stops mid-air.
  const phase = useSharedValue(0);
  const drift = useSharedValue(0);
  const clock = useFrameCallback((frame) => {
    phase.value = (phase.value + Math.min(frame.timeSincePreviousFrame ?? 0, MAX_STEP) / FLOAT_PERIOD) % 1;
  }, false);
  const setClock = clock.setActive;
  useEffect(() => {
    const on = float && !reduceMotion;
    if (on) setClock(true);
    drift.value = withTiming(on ? 1 : 0, { duration: reduceMotion ? 0 : 700, easing: EASE_IN_OUT }, (finished) => {
      // Once he has come to rest, stop the clock so nothing updates while he's still.
      if (finished && !on) scheduleOnRN(setClock, false);
    });
  }, [drift, float, reduceMotion, setClock]);

  // Blinks come at uneven intervals, now and then twice in a row, so they never feel mechanical.
  const lid = useSharedValue(1);
  const canBlink = BLINKS.has(shown) && !reduceMotion;
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

  const gaze = useSharedValue<number>(look);
  useEffect(() => {
    gaze.value = withTiming(look, { duration: reduceMotion ? 0 : 260, easing: EASE_OUT });
  }, [gaze, look, reduceMotion]);

  const whole = useAnimatedStyle(() => ({
    transform: [
      { translateY: Math.sin(phase.value * 2 * Math.PI) * drift.value * size * 0.025 - lift.value * size * 0.05 },
      { rotate: `${tilt.value}deg` },
      { scale: 1 + lift.value * 0.04 },
    ],
  }));

  const frame = { width: size, height: size };

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
        {faces.map((f) => (
          <Face key={f.name} name={f.name} current={f.name === shown} fadeIn={f.fadeIn} size={size} gaze={gaze} lid={lid} onGone={onGone} />
        ))}
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  // Blinks squash the eyes towards their own centre line, not the middle of the canvas.
  eyeOrigin: { transformOrigin: '50% 52%' },
});
