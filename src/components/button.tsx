import { ActivityIndicator, Pressable, Text, View } from 'react-native';

import { tapHaptic } from '@/lib/haptics';
import { ON_COLOR, useThemeColors } from '@/theme/colors';
import { TONES, type Tone } from '@/theme/tones';

type ButtonProps = {
  label: string;
  onPress: () => void;
  /** Moonlight Gold outside a module; inside one, that module's colour. */
  tone?: Tone;
  /** `secondary` is the raised neutral button, for a second action of equal standing. */
  variant?: 'primary' | 'secondary';
  disabled?: boolean;
  loading?: boolean;
  accessibilityHint?: string;
};

/** A filled button on a lip that it sinks onto while held. One primary per screen. */
export function Button({
  label,
  onPress,
  tone = 'moon',
  variant = 'primary',
  disabled = false,
  loading = false,
  accessibilityHint,
}: ButtonProps) {
  const colors = useThemeColors();
  const { fill, lip } = TONES[tone];
  const primary = variant === 'primary';
  const face = disabled ? 'bg-raised' : primary ? fill : 'bg-raised';
  const edge = primary ? lip : 'border-line';
  const labelColour = disabled ? 'text-ink-subtle' : primary ? 'text-on-color' : 'text-ink';

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled, busy: loading }}
      disabled={disabled || loading}
      onPress={() => {
        tapHaptic();
        onPress();
      }}>
      {({ pressed }) => (
        // The face keeps its height and the lip trades places with a top margin, so nothing below moves.
        // Disabled buttons have no lip: only pressable things get one.
        <View
          className={`items-center justify-center rounded-control px-6 py-3 ${face} ${
            pressed || disabled ? 'mt-1 min-h-[56px]' : `min-h-[60px] border-b-lip ${edge}`
          }`}>
          {loading ? (
            <ActivityIndicator color={primary ? ON_COLOR : colors.ink} />
          ) : (
            <Text className={`text-center font-heading text-title ${labelColour}`}>{label}</Text>
          )}
        </View>
      )}
    </Pressable>
  );
}
