import { MinusIcon } from 'phosphor-react-native/src/icons/Minus';
import { PlusIcon } from 'phosphor-react-native/src/icons/Plus';
import { forwardRef, useEffect, useRef, useState } from 'react';
import { Pressable, Text, TextInput, type TextInputProps, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withTiming } from 'react-native-reanimated';

import { tapHaptic } from '@/lib/haptics';
import { ON_COLOR, useThemeColors } from '@/theme/colors';
import { radius, text, themedStyles } from '@/theme/styles';
import { TONES, type Tone } from '@/theme/tones';

const useStyles = themedStyles((c) => ({
  track: { height: 32, width: 52, justifyContent: 'center', borderRadius: radius.full, borderWidth: 2, paddingHorizontal: 2 },
  trackOff: { borderColor: c.inkSubtle, backgroundColor: c.surface },
  thumb: { height: 24, width: 24, borderRadius: radius.full },
  row: { minHeight: 76, paddingVertical: 12 },
  rowInline: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  rowStacked: { gap: 8 },
  rowHead: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  disabled: { opacity: 0.6 },
  pressed: { opacity: 0.8 },
  fill: { flex: 1 },
  title: text('heading', 'title', c.ink),
  detail: text('body', 'body', c.inkMuted),
  detailBelow: { ...text('body', 'body', c.inkMuted), marginTop: 4 },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  stepButton: {
    height: 48,
    width: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.full,
    backgroundColor: c.raised,
  },
  stepPressed: { opacity: 0.7 },
  value: { ...text('display', 'headline', c.ink), minWidth: 112, textAlign: 'center' },
  valueCompact: { ...text('display', 'title', c.ink), minWidth: 72, textAlign: 'center' },
  field: { gap: 8 },
  fieldLabel: text('heading', 'body', c.inkMuted),
  input: {
    borderRadius: radius.control,
    borderWidth: 2,
    backgroundColor: c.surface,
    paddingHorizontal: 20,
    color: c.ink,
    minHeight: 64,
    paddingVertical: 12,
  },
  inputBody: text('body', 'body', c.ink),
  inputLarge: text('display', 'display', c.ink),
  inputTall: { minHeight: 180, paddingVertical: 16, textAlignVertical: 'top' },
}));

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
  const s = useStyles();
  const c = useThemeColors();
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
    <View style={[s.track, value ? { backgroundColor: c[TONES[tone].fill], borderColor: c.transparent } : s.trackOff]}>
      <Animated.View style={thumb}>
        <View style={[s.thumb, { backgroundColor: value ? ON_COLOR : c.inkSubtle }]} />
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
      style={({ pressed }) => [s.row, stacked ? s.rowStacked : s.rowInline, disabled && s.disabled, pressed && s.pressed]}>
      {stacked ? (
        <>
          <View style={s.rowHead}>
            {icon}
            <Text style={[s.title, s.fill]}>{title}</Text>
            {track}
          </View>
          {detail ? <Text style={s.detail}>{detail}</Text> : null}
        </>
      ) : (
        <>
          {icon}
          <View style={s.fill}>
            <Text style={s.title}>{title}</Text>
            {detail ? <Text style={s.detailBelow}>{detail}</Text> : null}
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
  const s = useStyles();
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
      style={({ pressed }) => [s.stepButton, pressed && s.stepPressed]}>
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
      style={s.stepper}>
      {button(-1)}
      <Text style={compact ? s.valueCompact : s.value}>{display}</Text>
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
  const s = useStyles();
  const colors = useThemeColors();
  const [focused, setFocused] = useState(false);

  return (
    <View style={s.field}>
      {label ? <Text style={s.fieldLabel}>{label}</Text> : null}
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
        style={[
          s.input,
          large ? s.inputLarge : s.inputBody,
          { borderColor: focused ? colors[TONES[tone].border] : colors.line },
          tall ? s.inputTall : null,
          style,
        ]}
        {...props}
      />
    </View>
  );
});
