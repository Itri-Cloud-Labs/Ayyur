import type { Icon } from 'phosphor-react-native';
import { CaretRightIcon } from 'phosphor-react-native/src/icons/CaretRight';
import { Pressable, Text, View } from 'react-native';

import { StatusMark } from '@/components/status-mark';
import { useThemeColors } from '@/theme/colors';
import { TONES, type Tone } from '@/theme/tones';

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
  const colors = useThemeColors();
  const checkable = done !== undefined;

  return (
    <Pressable
      accessibilityRole={checkable ? 'checkbox' : 'button'}
      accessibilityLabel={`${title}, ${detail}`}
      accessibilityState={checkable ? { checked: done } : undefined}
      onPress={onPress}
      className="min-h-[60px] flex-row items-center gap-3 py-2 active:opacity-70">
      <View className={`h-10 w-10 items-center justify-center rounded-full ${TONES[tone].soft}`}>
        <ModuleIcon size={20} weight="fill" color={colors[TONES[tone].color]} />
      </View>
      <View className="flex-1">
        <Text className={`font-medium text-body ${done ? 'text-ink-muted' : 'text-ink'}`}>{title}</Text>
        <Text className="font-medium text-caption text-ink-subtle">{detail}</Text>
      </View>
      {checkable ? (
        <StatusMark tone={tone} state={done ? 'done' : 'pending'} />
      ) : (
        <CaretRightIcon size={20} weight="bold" color={colors.inkSubtle} />
      )}
    </Pressable>
  );
}
