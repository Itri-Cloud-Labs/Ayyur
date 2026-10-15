import type { Icon } from 'phosphor-react-native';
import { Text, View } from 'react-native';

import { useThemeColors } from '@/theme/colors';
import { radius, text, themedStyles } from '@/theme/styles';
import { TONES, type Tone } from '@/theme/tones';

import { Lipped } from './press';

const useStyles = themedStyles((c) => ({
  outer: { flex: 1 },
  face: { minHeight: 132, gap: 12, padding: 20, justifyContent: 'center' },
  centred: { alignItems: 'center' },
  disc: { height: 48, width: 48, alignItems: 'center', justifyContent: 'center', borderRadius: radius.full },
  words: { gap: 4 },
  title: text('display', 'title', c.ink),
  titleCentred: text('display', 'headline', c.ink),
  detail: text('body', 'label', c.inkMuted),
  detailCentred: { ...text('body', 'label', c.inkMuted), textAlign: 'center' },
}));

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
  const s = useStyles();
  const colors = useThemeColors();
  const disc = tone === 'neutral' ? colors.surface : colors[TONES[tone].soft];
  const iconColour = tone === 'neutral' ? colors.ink : colors[TONES[tone].text];
  return (
    <Lipped
      shape="card"
      selected={selected}
      tone={tone}
      style={s.outer}
      faceStyle={[s.face, centred && s.centred]}
      accessibilityRole={role}
      accessibilityState={role === 'radio' ? { selected } : undefined}
      accessibilityLabel={detail ? `${title}. ${detail}` : title}
      onPress={onPress}>
      {TileIcon ? (
        <View style={[s.disc, { backgroundColor: disc }]}>
          <TileIcon size={26} weight="fill" color={iconColour} />
        </View>
      ) : null}
      <View style={[s.words, centred && s.centred]}>
        <Text style={centred ? s.titleCentred : s.title}>{title}</Text>
        {detail ? <Text style={centred ? s.detailCentred : s.detail}>{detail}</Text> : null}
      </View>
    </Lipped>
  );
}
