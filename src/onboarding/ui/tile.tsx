import type { Icon } from 'phosphor-react-native';
import { Text, View } from 'react-native';

import { useThemeColors } from '@/theme/colors';
import { TONES, type Tone } from '@/theme/tones';

import { Lipped } from './press';

/**
 * A large raised choice, for the few moments where two paths carry equal weight. Sized by its content
 * (never stretched to fill), so text can't be clipped and the step scrolls if it must.
 */
export function Tile({
  icon: TileIcon,
  title,
  detail,
  onPress,
  selected = false,
  tone = 'neutral',
  role = 'button',
  centred = false,
}: {
  icon?: Icon;
  title: string;
  detail?: string;
  onPress: () => void;
  selected?: boolean;
  tone?: Tone;
  role?: 'button' | 'radio';
  /** Centred content, for short single-word choices side by side. */
  centred?: boolean;
}) {
  const colors = useThemeColors();
  const disc = tone === 'neutral' ? 'bg-surface' : TONES[tone].soft;
  const iconColour = tone === 'neutral' ? colors.ink : colors[TONES[tone].color];
  return (
    <Lipped
      shape="card"
      selected={selected}
      tone={tone}
      outer="flex-1"
      face={`min-h-[132px] gap-3 p-5 ${centred ? 'items-center justify-center' : 'justify-center'}`}
      accessibilityRole={role}
      accessibilityState={role === 'radio' ? { selected } : undefined}
      accessibilityLabel={detail ? `${title}. ${detail}` : title}
      onPress={onPress}>
      {TileIcon ? (
        <View className={`h-12 w-12 items-center justify-center rounded-full ${disc}`}>
          <TileIcon size={26} weight="fill" color={iconColour} />
        </View>
      ) : null}
      <View className={`gap-1 ${centred ? 'items-center' : ''}`}>
        <Text className={`font-display text-ink ${centred ? 'text-headline' : 'text-title'}`}>{title}</Text>
        {detail ? <Text className={`font-body text-label text-ink-muted ${centred ? 'text-center' : ''}`}>{detail}</Text> : null}
      </View>
    </Lipped>
  );
}
