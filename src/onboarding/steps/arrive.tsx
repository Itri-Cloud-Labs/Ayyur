import { AppleLogoIcon } from 'phosphor-react-native/src/icons/AppleLogo';
import { EnvelopeIcon } from 'phosphor-react-native/src/icons/Envelope';
import { GoogleLogoIcon } from 'phosphor-react-native/src/icons/GoogleLogo';
import type { Icon } from 'phosphor-react-native';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';

import { Button } from '@/components/button';
import { tapHaptic } from '@/lib/haptics';
import { useThemeColors } from '@/theme/colors';

import { useFlow } from '../flow';
import { StepLayout } from '../shell';
import { Sheet } from '../ui/sheets';

const PROVIDERS: { id: string; label: string; icon: Icon }[] = [
  { id: 'Apple', label: 'Continue with Apple', icon: AppleLogoIcon },
  { id: 'Google', label: 'Continue with Google', icon: GoogleLogoIcon },
  { id: 'Email', label: 'Continue with email', icon: EnvelopeIcon },
];

function SignInSheet({ visible, onClose, onSignedIn }: { visible: boolean; onClose: () => void; onSignedIn: (provider: string) => void }) {
  const colors = useThemeColors();
  const [busy, setBusy] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);

  const start = (provider: string) => {
    tapHaptic();
    setBusy(provider);
    // Simulated: stands in for the real sign-in until accounts exist.
    timer.current = setTimeout(() => {
      setBusy(null);
      onSignedIn(provider);
    }, 1100);
  };

  return (
    <Sheet visible={visible} onClose={busy ? () => {} : onClose} label="Sign in">
      <Text className="font-heading text-headline text-ink">Sign in to Ayyur</Text>
      <Text className="mt-1 font-body text-body text-ink-muted">
        New here? This creates your account too. Backup and sync stay off until you turn them on.
      </Text>
      <View className="mt-5 gap-2">
        {PROVIDERS.map(({ id, label, icon: ProviderIcon }) => (
          <Pressable
            key={id}
            accessibilityRole="button"
            accessibilityLabel={label}
            accessibilityState={{ busy: busy === id, disabled: busy !== null }}
            disabled={busy !== null}
            onPress={() => start(id)}
            className={`min-h-[56px] flex-row items-center gap-3 rounded-control bg-raised px-4 active:opacity-80 ${busy && busy !== id ? 'opacity-50' : ''}`}>
            <ProviderIcon size={22} weight="fill" color={colors.ink} />
            <Text className="flex-1 font-heading text-body text-ink">{busy === id ? 'Signing you in' : label}</Text>
            {busy === id ? <ActivityIndicator color={colors.ink} /> : null}
          </Pressable>
        ))}
      </View>
      <Text className="mt-4 text-center font-medium text-label text-ink-muted">Preview: sign-in isn’t connected yet.</Text>
    </Sheet>
  );
}

/** The first encounter, with the account choice as two equal paths under it. */
export function Welcome() {
  const { answers, set, next } = useFlow();
  const [signingIn, setSigningIn] = useState(false);
  const signedIn = answers.account?.kind === 'account';
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);

  return (
    <StepLayout
      cue={{
        expression: signedIn ? 'delighted' : 'happy',
        say: signedIn ? 'You’re signed in. Welcome!' : 'Assalamu alaykum!\nI’m Ayyur.',
        hint: signedIn
          ? undefined
          : 'I’ll keep you company with your prayers, Quran, fasting and good habits. First, let’s get to know each other.',
      }}
      footer={
        <>
          <Button
            variant="secondary"
            label="Keep it on this phone"
            onPress={() => {
              set({ account: { kind: 'local' }, cloudSync: false });
              next();
            }}
          />
          <Button variant="secondary" label="Sign in or create an account" onPress={() => setSigningIn(true)} />
          <Text className="text-center font-medium text-label text-ink-muted">
            An account lets you back up and sync. Everything works without one.
          </Text>
        </>
      }>
      <SignInSheet
        visible={signingIn}
        onClose={() => setSigningIn(false)}
        onSignedIn={(provider) => {
          setSigningIn(false);
          set({ account: { kind: 'account', provider } });
          timer.current = setTimeout(next, 1100);
        }}
      />
    </StepLayout>
  );
}
