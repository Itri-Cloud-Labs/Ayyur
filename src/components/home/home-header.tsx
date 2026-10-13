import { Image, Pressable, Text, View } from 'react-native';

const face = require('../../../assets/brand/tab/ayyur-tab-face.png');

const phases = [
  require('../../../assets/brand/phases/phase-0-new.png'),
  require('../../../assets/brand/phases/phase-1-crescent.png'),
  require('../../../assets/brand/phases/phase-2-half.png'),
  require('../../../assets/brand/phases/phase-3-gibbous.png'),
  require('../../../assets/brand/phases/phase-4-full.png'),
];

type HomeHeaderProps = {
  name: string;
  streak: { days: number; phase: 0 | 1 | 2 | 3 | 4 };
  onStreakPress: () => void;
};

export function HomeHeader({ name, streak, onStreakPress }: HomeHeaderProps) {
  return (
    <View className="flex-row items-center gap-3">
      <Image source={face} accessible={false} accessibilityIgnoresInvertColors style={{ width: 44, height: 44 }} />
      <View accessible accessibilityRole="header" accessibilityLabel={`Assalamu alaykum, ${name}`} className="flex-1">
        <Text className="font-medium text-label text-ink-muted">Assalamu alaykum,</Text>
        <Text numberOfLines={1} className="font-heading text-title text-ink">
          {name}
        </Text>
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${streak.days} day streak`}
        accessibilityHint="Opens your streaks"
        onPress={onStreakPress}
        hitSlop={8}
        className="min-h-[48px] flex-row items-center gap-1.5 active:opacity-70">
        <Image source={phases[streak.phase]} accessible={false} accessibilityIgnoresInvertColors style={{ width: 30, height: 30 }} />
        <Text className="font-display text-title text-moon-text">{streak.days}</Text>
      </Pressable>
    </View>
  );
}
