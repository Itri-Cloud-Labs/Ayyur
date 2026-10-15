import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useCallback } from 'react';

import { FlowProvider } from '@/onboarding/flow';
import { OnboardingShell } from '@/onboarding/shell';
import { STEPS } from '@/onboarding/steps';
import { onboardingStore } from '@/onboarding/store';
import { NightScope } from '@/theme/night-scope';

export default function OnboardingScreen() {
  const router = useRouter();
  const finish = useCallback(() => {
    onboardingStore.complete();
    router.replace('/');
  }, [router]);

  return (
    <NightScope>
      <StatusBar style="light" />
      <FlowProvider steps={STEPS} onComplete={finish}>
        <OnboardingShell />
      </FlowProvider>
    </NightScope>
  );
}
