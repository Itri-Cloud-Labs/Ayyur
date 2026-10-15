import { AppleLogoIcon } from 'phosphor-react-native/src/icons/AppleLogo';
import { CloudArrowUpIcon } from 'phosphor-react-native/src/icons/CloudArrowUp';
import { DeviceMobileIcon } from 'phosphor-react-native/src/icons/DeviceMobile';
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
import { Tile } from '../ui/tile';

export function Welcome() {
  const { next } = useFlow();
  return (
    <StepLayout
      cue={{ expression: 'happy', say: 'Assalamu alaykum!\nI’m Ayyur.', pose: 'stage' }}
      footer={<Button label="Let’s begin" onPress={next} />}>
      <Text className="text-center font-body text-body text-ink-muted">
        I’ll keep you company with your prayers, Quran, fasting and good habits. First, let’s get to know each other.
      </Text>
      <Text className="mt-4 text-center font-medium text-caption text-ink-subtle">My name means “moon” in Tamazight.</Text>
    </StepLayout>
  );
}

const PROVIDERS: { id: string; label: string; icon: Icon }[] = [
  { id: 'apple', label: 'Continue with Apple', icon: AppleLogoIcon },
  { id: 'google', label: 'Continue with Google', icon: GoogleLogoIcon },
  { id: 'email', label: 'Continue with email', icon: EnvelopeIcon },
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
      <Text className="mt-1 font-body text-label text-ink-muted">
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
            className={`min-h-[56px] flex-row items-center gap-3 rounded-control bg-raised px-4 active:opacity-80 ${
              busy && busy !== id ? 'opacity-50' : ''
            }`}>
            <ProviderIcon size={22} weight="fill" color={colors.ink} />
            <Text className="flex-1 font-heading text-body text-ink">{busy === id ? 'Signing you in' : label}</Text>
            {busy === id ? <ActivityIndicator color={colors.ink} /> : null}
          </Pressable>
        ))}
      </View>
      <Text className="mt-4 text-center font-medium text-caption text-ink-subtle">Preview: sign-in isn’t connected yet.</Text>
    </Sheet>
  );
}

export function Account() {
  const { answers, set, next } = useFlow();
  const [signingIn, setSigningIn] = useState(false);
  const signedIn = answers.account?.kind === 'account';

  return (
    <StepLayout
      fill={340}
      cue={{
        expression: signedIn ? 'delighted' : 'curious',
        say: signedIn ? 'You’re signed in. Welcome!' : 'Would you like an account?',
        hint: 'It’s optional. You can sign in any time from You.',
      }}
      footer={signedIn ? <Button label="Continue" onPress={next} /> : undefined}>
      <View className="flex-1 gap-3">
        <Tile
          icon={DeviceMobileIcon}
          title="Keep it on this phone"
          detail="Everything works offline, with no account. Nothing leaves your phone unless you choose to later."
          selected={answers.account?.kind === 'local'}
          onPress={() => {
            set({ account: { kind: 'local' }, cloudSync: false });
            next();
          }}
        />
        <Tile
          icon={CloudArrowUpIcon}
          title={signedIn ? 'Signed in' : 'Sign in or create an account'}
          detail={signedIn ? `With ${answers.account?.kind === 'account' ? answers.account.provider : ''}. Sync can be turned on later.` : 'Lets you back up and sync between phones. You can do this later too.'}
          selected={signedIn}
          onPress={() => setSigningIn(true)}
        />
      </View>
      <SignInSheet
        visible={signingIn}
        onClose={() => setSigningIn(false)}
        onSignedIn={(provider) => {
          setSigningIn(false);
          set({ account: { kind: 'account', provider: provider[0].toUpperCase() + provider.slice(1) } });
        }}
      />
    </StepLayout>
  );
}
