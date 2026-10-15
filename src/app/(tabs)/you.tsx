import { useRouter } from 'expo-router';
import { ArrowCounterClockwiseIcon } from 'phosphor-react-native/src/icons/ArrowCounterClockwise';
import { Pressable, Text, View } from 'react-native';

import { Screen } from '@/components/screen';
import { onboardingStore } from '@/onboarding/store';
import { useThemeColors } from '@/theme/colors';
import { text, themedStyles } from '@/theme/styles';

const useStyles = themedStyles((c) => ({
  list: { marginTop: 24 },
  row: {
    minHeight: 60,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: c.line,
    paddingVertical: 12,
  },
  pressed: { opacity: 0.7 },
  fill: { flex: 1 },
  title: text('medium', 'body', c.ink),
  detail: text('body', 'caption', c.inkSubtle),
}));

export default function YouScreen() {
  const router = useRouter();
  const s = useStyles();
  const colors = useThemeColors();
  return (
    <Screen title="You">
      <View style={s.list}>
        <Pressable
          accessibilityRole="button"
          accessibilityHint="Goes through setup again from the start"
          onPress={() => {
            onboardingStore.reset();
            router.replace('/onboarding');
          }}
          style={({ pressed }) => [s.row, pressed && s.pressed]}>
          <ArrowCounterClockwiseIcon size={22} weight="bold" color={colors.inkSubtle} />
          <View style={s.fill}>
            <Text style={s.title}>Replay onboarding</Text>
            <Text style={s.detail}>Starts setup again with nothing filled in</Text>
          </View>
        </Pressable>
      </View>
    </Screen>
  );
}
