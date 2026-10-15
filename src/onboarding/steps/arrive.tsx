import { AppleLogoIcon } from 'phosphor-react-native/src/icons/AppleLogo';
import { EnvelopeIcon } from 'phosphor-react-native/src/icons/Envelope';
import { GoogleLogoIcon } from 'phosphor-react-native/src/icons/GoogleLogo';
import type { Icon } from 'phosphor-react-native';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/button';
import { tapHaptic } from '@/lib/haptics';
import { night } from '@/theme/palette';
import { radius, text } from '@/theme/styles';

import { useFlow } from '../flow';
import { StepLayout } from '../shell';
import { Sheet } from '../ui/sheets';
import { ss } from './styles';

const PROVIDERS: { id: string; label: string; icon: Icon }[] = [
  { id: 'Apple', label: 'Continue with Apple', icon: AppleLogoIcon },
  { id: 'Google', label: 'Continue with Google', icon: GoogleLogoIcon },
  { id: 'Email', label: 'Continue with email', icon: EnvelopeIcon },
];

function SignInSheet({ visible, onClose, onSignedIn }: { visible: boolean; onClose: () => void; onSignedIn: (provider: string) => void }) {
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
      <Text style={styles.title}>Sign in to Ayyur</Text>
      <Text style={[ss.body, styles.mt1]}>New here? This creates your account too. Backup and sync stay off until you turn them on.</Text>
      <View style={styles.providers}>
        {PROVIDERS.map(({ id, label, icon: ProviderIcon }) => (
          <Pressable
            key={id}
            accessibilityRole="button"
            accessibilityLabel={label}
            accessibilityState={{ busy: busy === id, disabled: busy !== null }}
            disabled={busy !== null}
            onPress={() => start(id)}
            style={({ pressed }) => [styles.provider, busy && busy !== id && styles.waiting, pressed && styles.pressed]}>
            <ProviderIcon size={22} weight="fill" color={night.ink} />
            <Text style={[ss.strong, ss.fill]}>{busy === id ? 'Signing you in' : label}</Text>
            {busy === id ? <ActivityIndicator color={night.ink} /> : null}
          </Pressable>
        ))}
      </View>
      <Text style={[ss.footnote, styles.mt4]}>Preview: sign-in isn’t connected yet.</Text>
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
          <Text style={ss.footnote}>An account lets you back up and sync. Everything works without one.</Text>
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

const styles = StyleSheet.create({
  title: text('heading', 'headline', night.ink),
  mt1: { marginTop: 4 },
  mt4: { marginTop: 16 },
  providers: { marginTop: 20, gap: 8 },
  provider: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: radius.control,
    backgroundColor: night.raised,
    paddingHorizontal: 16,
  },
  waiting: { opacity: 0.5 },
  pressed: { opacity: 0.8 },
});
