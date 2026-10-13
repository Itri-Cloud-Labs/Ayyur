import * as Haptics from 'expo-haptics';

// Every haptic goes through here so the user's haptics switch can gate them in one place.
export function tapHaptic() {
  if (process.env.EXPO_OS === 'web') return;
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
}
