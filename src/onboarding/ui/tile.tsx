import type { Icon } from 'phosphor-react-native';
import type { ReactNode } from 'react';
import { Pressable, Text, View } from 'react-native';

import { tapHaptic } from '@/lib/haptics';
import { useThemeColors } from '@/theme/colors';
import { TONES, type Tone } from '@/theme/tones';

/**
 * A large choice: for the few moments where two or three paths carry equal weight. Tiles grow to
 * share the height they're given, so a short step's answers fill the screen instead of floating.
 */
export function Tile({
  icon: TileIcon,
  art,
  title,
  detail,
  onPress,
  selected = false,
  tone = 'moon',
  role = 'button',
}: {
  icon?: Icon;
  /** Something drawn above the title instead of an icon. */
  art?: ReactNode;
  title: string;
  detail?: string;
  onPress: () => void;
  selected?: boolean;
  tone?: Tone;
  role?: 'button' | 'radio';
}) {
  const colors = useThemeColors();
  return (
    <Pressable
      accessibilityRole={role}
      accessibilityState={role === 'radio' ? { selected } : undefined}
      accessibilityLabel={detail ? `${title}. ${detail}` : title}
      onPress={() => {
        tapHaptic();
        onPress();
      }}
      className={`flex-1 justify-center gap-4 rounded-card border-2 p-5 active:opacity-80 ${
        selected ? `${TONES[tone].border} ${TONES[tone].soft}` : 'border-line bg-surface'
      }`}>
      {art}
      {TileIcon ? (
        <View className={`h-14 w-14 items-center justify-center rounded-full ${TONES[tone].soft}`}>
          <TileIcon size={28} weight="fill" color={colors[TONES[tone].color]} />
        </View>
      ) : null}
      <View className="gap-1.5">
        <Text className="font-display text-headline text-ink">{title}</Text>
        {detail ? <Text className="font-body text-body text-ink-muted">{detail}</Text> : null}
      </View>
    </Pressable>
  );
}
