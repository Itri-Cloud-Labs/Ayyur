import type { Icon } from 'phosphor-react-native';
import { CaretRightIcon } from 'phosphor-react-native/src/icons/CaretRight';
import { Pressable, Text, View } from 'react-native';

import { StatusMark } from '@/components/status-mark';
import { useThemeColors } from '@/theme/colors';
import { radius, text, themedStyles } from '@/theme/styles';
import { TONES, type Tone } from '@/theme/tones';

const useStyles = themedStyles((c) => ({
  row: { minHeight: 60, flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8 },
  pressed: { opacity: 0.7 },
  disc: { height: 40, width: 40, alignItems: 'center', justifyContent: 'center', borderRadius: radius.full },
  fill: { flex: 1 },
  title: text('medium', 'body', c.ink),
  titleDone: text('medium', 'body', c.inkMuted),
  detail: text('medium', 'caption', c.inkSubtle),
}));

type TodayRowProps = {
  tone: Tone;
  icon: Icon;
  title: string;
  detail: string;
  onPress: () => void;
  /** Leave undefined for a row that opens something; set it for one that can be ticked off. */
  done?: boolean;
};

export function TodayRow({ tone, icon: ModuleIcon, title, detail, onPress, done }: TodayRowProps) {
  const s = useStyles();
  const colors = useThemeColors();
  const checkable = done !== undefined;

  return (
    <Pressable
      accessibilityRole={checkable ? 'checkbox' : 'button'}
      accessibilityLabel={`${title}, ${detail}`}
      accessibilityState={checkable ? { checked: done } : undefined}
      onPress={onPress}
      style={({ pressed }) => [s.row, pressed && s.pressed]}>
      <View style={[s.disc, { backgroundColor: colors[TONES[tone].soft] }]}>
        <ModuleIcon size={20} weight="fill" color={colors[TONES[tone].text]} />
      </View>
      <View style={s.fill}>
        <Text style={done ? s.titleDone : s.title}>{title}</Text>
        <Text style={s.detail}>{detail}</Text>
      </View>
      {checkable ? (
        <StatusMark tone={tone} state={done ? 'done' : 'pending'} />
      ) : (
        <CaretRightIcon size={20} weight="bold" color={colors.inkSubtle} />
      )}
    </Pressable>
  );
}
