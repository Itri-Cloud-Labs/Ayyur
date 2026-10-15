import { useRouter } from 'expo-router';
import { ArrowCounterClockwiseIcon } from 'phosphor-react-native/src/icons/ArrowCounterClockwise';
import { Pressable, Text, View } from 'react-native';

import { Screen } from '@/components/screen';
import { onboardingStore } from '@/onboarding/store';
import { useThemeColors } from '@/theme/colors';

export default function YouScreen() {
  const router = useRouter();
  const colors = useThemeColors();
  return (
    <Screen title="You">
      <View className="mt-6">
        <Pressable
          accessibilityRole="button"
          accessibilityHint="Goes through setup again from the start"
          onPress={() => {
            onboardingStore.reset();
            router.replace('/onboarding');
          }}
          className="min-h-[60px] flex-row items-center gap-3 border-b border-line py-3 active:opacity-70">
          <ArrowCounterClockwiseIcon size={22} weight="bold" color={colors.inkSubtle} />
          <View className="flex-1">
            <Text className="font-medium text-body text-ink">Replay onboarding</Text>
            <Text className="font-body text-caption text-ink-subtle">Starts setup again with nothing filled in</Text>
          </View>
        </Pressable>
      </View>
    </Screen>
  );
}
