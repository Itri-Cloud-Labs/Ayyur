import * as Haptics from 'expo-haptics';

import { onboardingStore } from '@/onboarding/store';

// Every haptic goes through here, so the user's haptics switch gates them all in one place.
export function tapHaptic() {
  if (process.env.EXPO_OS === 'web') return;
  if (!onboardingStore.get().answers.haptics) return;
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
}
