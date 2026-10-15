import { Image, Pressable, Text, View } from 'react-native';

import { text, themedStyles } from '@/theme/styles';

const useStyles = themedStyles((c) => ({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  face: { width: 44, height: 44 },
  fill: { flex: 1 },
  hello: text('medium', 'label', c.inkMuted),
  name: text('heading', 'title', c.ink),
  streak: { minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: 6 },
  pressed: { opacity: 0.7 },
  phase: { width: 30, height: 30 },
  days: text('display', 'title', c.moonText),
}));

const face = require('../../../assets/brand/tab/ayyur-tab-face.png');

const phases = [
  require('../../../assets/brand/phases/phase-0-new.png'),
  require('../../../assets/brand/phases/phase-1-crescent.png'),
  require('../../../assets/brand/phases/phase-2-half.png'),
  require('../../../assets/brand/phases/phase-3-gibbous.png'),
  require('../../../assets/brand/phases/phase-4-full.png'),
];

type HomeHeaderProps = {
  /** Null when the user chose not to give a name: the greeting then stands alone. */
  name: string | null;
  streak: { days: number; phase: 0 | 1 | 2 | 3 | 4 };
  onStreakPress: () => void;
};

export function HomeHeader({ name, streak, onStreakPress }: HomeHeaderProps) {
  const s = useStyles();
  return (
    <View style={s.row}>
      <Image source={face} accessible={false} accessibilityIgnoresInvertColors style={s.face} />
      <View
        accessible
        accessibilityRole="header"
        accessibilityLabel={name ? `Assalamu alaykum, ${name}` : 'Assalamu alaykum'}
        style={s.fill}>
        {name ? (
          <>
            <Text style={s.hello}>Assalamu alaykum,</Text>
            <Text numberOfLines={1} style={s.name}>
              {name}
            </Text>
          </>
        ) : (
          <Text style={s.name}>Assalamu alaykum</Text>
        )}
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${streak.days} day streak`}
        accessibilityHint="Opens your streaks"
        onPress={onStreakPress}
        hitSlop={8}
        style={({ pressed }) => [s.streak, pressed && s.pressed]}>
        <Image source={phases[streak.phase]} accessible={false} accessibilityIgnoresInvertColors style={s.phase} />
        <Text style={s.days}>{streak.days}</Text>
      </Pressable>
    </View>
  );
}
