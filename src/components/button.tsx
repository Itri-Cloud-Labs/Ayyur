import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { useSink } from '@/components/sink';

import { tapHaptic } from '@/lib/haptics';
import { ON_COLOR, useThemeColors } from '@/theme/colors';
import { TONES, type Tone } from '@/theme/tones';

// The lip's height, matching the `lip` spacing token.
const LIP = 4;

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
  const { fill, lipFill } = TONES[tone];
  const primary = variant === 'primary';
  const face = disabled ? 'bg-raised' : primary ? fill : 'bg-raised';
  const edge = primary ? lipFill : 'bg-line';
  const sink = useSink(LIP);
  const labelColour = disabled ? 'text-ink-subtle' : primary ? 'text-on-color' : 'text-ink';

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled, busy: loading }}
      disabled={disabled || loading}
      {...sink.handlers}
      onPress={() => {
        tapHaptic();
        onPress();
      }}>
      {/* The lip is its own layer and the face sinks onto it on the UI thread, so a press shows at once.
          Disabled buttons have no lip and sit where a pressed one would: only pressable things get one. */}
      <View>
        {disabled ? null : <View style={styles.lip} className={`rounded-control ${edge}`} />}
        <Animated.View style={disabled ? styles.flat : [styles.face, sink.style]}>
          <View className={`min-h-[56px] items-center justify-center rounded-control px-6 py-3 ${face}`}>
            {loading ? (
              <ActivityIndicator color={primary ? ON_COLOR : colors.ink} />
            ) : (
              <Text className={`text-center font-heading text-title ${labelColour}`}>{label}</Text>
            )}
          </View>
        </Animated.View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  lip: { position: 'absolute', left: 0, right: 0, top: LIP, bottom: 0 },
  face: { marginBottom: LIP },
  flat: { marginTop: LIP },
});
