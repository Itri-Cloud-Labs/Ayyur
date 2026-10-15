import { MinusIcon } from 'phosphor-react-native/src/icons/Minus';
import { PlusIcon } from 'phosphor-react-native/src/icons/Plus';
import { forwardRef, useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, type TextInputProps, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withTiming } from 'react-native-reanimated';

import { tapHaptic } from '@/lib/haptics';
import { useThemeColors } from '@/theme/colors';
import { TONES, type Tone } from '@/theme/tones';

/** An on/off row. The whole row is the switch, so the target is large. */
export function SwitchRow({
  title,
  detail,
  value,
  onChange,
  disabled = false,
  tone = 'neutral',
  icon,
  stacked = false,
}: {
  title: string;
  detail?: string;
  value: boolean;
  onChange: (value: boolean) => void;
  disabled?: boolean;
  tone?: Tone;
  icon?: React.ReactNode;
  /** Title and switch on one line, the explanation below at full width. For long explanations. */
  stacked?: boolean;
}) {
  const reduceMotion = useReducedMotion();
  const on = useSharedValue(value ? 1 : 0);
  useEffect(() => {
    on.value = withTiming(value ? 1 : 0, {
      duration: reduceMotion ? 0 : 180,
      easing: Easing.bezier(0.25, 1, 0.5, 1),
    });
  }, [on, reduceMotion, value]);
  const thumb = useAnimatedStyle(() => ({
    transform: [{ translateX: on.value * 20 }],
  }));
  const track = (
    <View
      className={`h-8 w-[52px] justify-center rounded-full border-2 px-0.5 ${value ? `${TONES[tone].fill} border-transparent` : 'border-ink-subtle bg-surface'}`}>
      <Animated.View style={thumb}>
        <View className={`h-6 w-6 rounded-full ${value ? 'bg-on-color' : 'bg-ink-subtle'}`} />
      </Animated.View>
    </View>
  );

  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityLabel={title}
      accessibilityHint={detail}
      accessibilityState={{ checked: value, disabled }}
      disabled={disabled}
      onPress={() => {
        tapHaptic();
        onChange(!value);
      }}
      className={`min-h-[76px] py-3 active:opacity-80 ${stacked ? 'gap-2' : 'flex-row items-center gap-4'} ${disabled ? 'opacity-60' : ''}`}>
      {stacked ? (
        <>
          <View className="flex-row items-center gap-3">
            {icon}
            <Text className="flex-1 font-heading text-title text-ink">{title}</Text>
            {track}
          </View>
          {detail ? <Text className="font-body text-body text-ink-muted">{detail}</Text> : null}
        </>
      ) : (
        <>
          {icon}
          <View className="flex-1">
            <Text className="font-heading text-title text-ink">{title}</Text>
            {detail ? <Text className="mt-1 font-body text-body text-ink-muted">{detail}</Text> : null}
          </View>
          {track}
        </>
      )}
    </Pressable>
  );
}

/** Minus, value, plus. Screen readers get it as one adjustable control. */
export function Stepper({
  label,
  display,
  onStep,
  spokenValue,
  compact = false,
}: {
  label: string;
  display: string;
  onStep: (direction: 1 | -1) => void;
  spokenValue?: string;
  compact?: boolean;
}) {
  const colors = useThemeColors();
  const step = (direction: 1 | -1) => {
    tapHaptic();
    onStep(direction);
  };
  // Holding a button keeps stepping, so long distances don't take a dozen taps.
  const repeat = useRef<ReturnType<typeof setInterval>>(undefined);
  useEffect(() => () => clearInterval(repeat.current), []);
  const button = (direction: 1 | -1) => (
    <Pressable
      accessible={false}
      importantForAccessibility="no"
      onPress={() => step(direction)}
      onLongPress={() => {
        clearInterval(repeat.current);
        repeat.current = setInterval(() => onStep(direction), 110);
      }}
      onPressOut={() => clearInterval(repeat.current)}
      hitSlop={4}
      className="h-12 w-12 items-center justify-center rounded-full bg-raised active:opacity-70">
      {direction === 1 ? <PlusIcon size={20} weight="bold" color={colors.ink} /> : <MinusIcon size={20} weight="bold" color={colors.ink} />}
    </Pressable>
  );

  return (
    <View
      accessible
      accessibilityRole="adjustable"
      accessibilityLabel={label}
      accessibilityValue={{ text: spokenValue ?? display }}
      accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
      onAccessibilityAction={(event) => step(event.nativeEvent.actionName === 'increment' ? 1 : -1)}
      className="flex-row items-center gap-3">
      {button(-1)}
      <Text className={`text-center font-display text-ink ${compact ? 'min-w-[72px] text-title' : 'min-w-[112px] text-headline'}`}>
        {display}
      </Text>
      {button(1)}
    </View>
  );
}

/** The text field from DESIGN.md: Night Surface, 2px outline that takes the accent colour on focus. */
export const Field = forwardRef<
  TextInput,
  TextInputProps & {
    label?: string;
    tone?: Tone;
    tall?: boolean;
    large?: boolean;
  }
>(function Field({ label, tone = 'neutral', tall = false, large = false, style, onFocus, onBlur, ...props }, ref) {
  const colors = useThemeColors();
  const [focused, setFocused] = useState(false);

  return (
    <View className="gap-2">
      {label ? <Text className="font-heading text-body text-ink-muted">{label}</Text> : null}
      <TextInput
        ref={ref}
        placeholderTextColor={colors.inkSubtle}
        selectionColor={colors.moonText}
        onFocus={(e) => {
          setFocused(true);
          onFocus?.(e);
        }}
        onBlur={(e) => {
          setFocused(false);
          onBlur?.(e);
        }}
        className={`rounded-control border-2 bg-surface px-5 text-ink ${large ? 'font-display text-display' : 'font-body text-body'} ${
          focused ? TONES[tone].border : 'border-line'
        } ${tall ? 'min-h-[180px] py-4' : 'min-h-[64px] py-3'}`}
        style={[tall ? styles.tall : null, style]}
        {...props}
      />
    </View>
  );
});

const styles = StyleSheet.create({
  tall: { textAlignVertical: 'top' },
});
