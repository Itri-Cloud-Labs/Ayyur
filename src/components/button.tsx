import { Pressable, Text, View } from 'react-native';

import { tapHaptic } from '@/lib/haptics';
import { TONES, type Tone } from '@/theme/tones';

type ButtonProps = {
  label: string;
  onPress: () => void;
  /** Moonlight Gold outside a module; inside one, that module's colour. */
  tone?: Tone;
  accessibilityHint?: string;
};

/** The primary button: a bright fill on a lip that it sinks onto while held. One per screen. */
export function Button({ label, onPress, tone = 'moon', accessibilityHint }: ButtonProps) {
  const { fill, lip } = TONES[tone];

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityHint={accessibilityHint}
      onPress={() => {
        tapHaptic();
        onPress();
      }}>
      {({ pressed }) => (
        // The face keeps its height and the lip trades places with a top margin, so nothing below moves.
        <View
          className={`items-center justify-center rounded-control px-6 py-3 ${fill} ${
            pressed ? 'mt-1 min-h-[56px]' : `min-h-[60px] border-b-lip ${lip}`
          }`}>
          <Text className="text-center font-heading text-title text-on-color">{label}</Text>
        </View>
      )}
    </Pressable>
  );
}
