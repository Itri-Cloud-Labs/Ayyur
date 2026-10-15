import { BrainIcon } from 'phosphor-react-native/src/icons/Brain';
import { ChatTeardropTextIcon } from 'phosphor-react-native/src/icons/ChatTeardropText';
import { CloudArrowUpIcon } from 'phosphor-react-native/src/icons/CloudArrowUp';
import { InfoIcon } from 'phosphor-react-native/src/icons/Info';
import { LockIcon } from 'phosphor-react-native/src/icons/Lock';
import type { Icon } from 'phosphor-react-native';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import type { Expression } from '@/components/ayyur/layers';
import { tapHaptic } from '@/lib/haptics';
import { formatClock } from '@/lib/time';
import { useThemeColors } from '@/theme/colors';

import { previewTimes, voices } from '../data';
import { useFlow } from '../flow';
import { StepFooter, StepLayout } from '../shell';
import type { Nudges, Voice } from '../types';
import { Field, Stepper, SwitchRow } from '../ui/controls';
import { OptionList } from '../ui/options';
import { SimulatedPrompt } from '../ui/sheets';

const DAY = 24 * 60;
const wrap = (m: number) => ((m % DAY) + DAY) % DAY;

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View className="mt-7">
      <Text accessibilityRole="header" className="mb-3 text-center font-heading text-title text-ink">
        {title}
      </Text>
      {children}
    </View>
  );
}

const NUDGE_FACE: Record<Nudges, Expression> = {
  prayers: 'gentle',
  little: 'happy',
  'on-track': 'delighted',
};

/** Quiet hours and how often Ayyur speaks up: both about when he may reach you. */
export function Day() {
  const { answers, set, next } = useFlow();
  const [asking, setAsking] = useState(false);
  const fajr = previewTimes(answers)[0];
  // If reminders were turned off earlier, this is the first time notifications are needed.
  const needsPermission = answers.notificationPermission === 'unasked' && answers.nudges !== null && answers.nudges !== 'prayers';
  const finish = (permission: 'granted' | 'denied') => {
    setAsking(false);
    set({ notificationPermission: permission });
    next();
  };

  return (
    <StepLayout
      cue={{
        expression: answers.nudges ? NUDGE_FACE[answers.nudges] : 'sleepy',
        say: 'When do you usually sleep and wake up?',
        hint: 'I’ll keep quiet in between.',
      }}
      footer={needsPermission ? <StepFooter label="Continue and allow notifications" onPress={() => setAsking(true)} /> : undefined}>
      <View className="gap-2">
        {(
          [
            ['Bedtime', 'sleepAt'],
            ['Wake up', 'wakeAt'],
          ] as const
        ).map(([label, key]) => (
          <View
            key={key}
            className="min-h-[72px] flex-row items-center justify-between gap-3 rounded-card border-2 border-line bg-surface px-4 py-3">
            <Text className="font-heading text-title text-ink">{label}</Text>
            <Stepper
              compact
              label={label}
              display={formatClock(answers[key])}
              onStep={(d) => set({ [key]: wrap(answers[key] + d * 15) })}
            />
          </View>
        ))}
      </View>
      <View className="mt-2">
        <SwitchRow
          tone="prayer"
          title="Let the Fajr reminder through"
          detail={`Fajr is at ${formatClock(fajr.minutes)} today.`}
          value={answers.fajrThroughQuiet}
          onChange={(fajrThroughQuiet) => set({ fajrThroughQuiet })}
        />
      </View>
      <Section title="How often should I speak up?">
        <OptionList<Nudges>
          value={answers.nudges}
          onChange={(nudges) => set({ nudges })}
          options={[
            {
              id: 'prayers',
              label: 'Only at prayer times',
              detail: 'Just the reminders you set',
            },
            {
              id: 'little',
              label: 'A little',
              detail: 'Prayers, plus one check-in a day',
            },
            {
              id: 'on-track',
              label: 'Keep me on track',
              detail: 'Prayers, a reminder for each goal, and streak encouragement',
            },
          ]}
        />
        <Text className="mt-3 text-center font-body text-label text-ink-muted">I never message you to make you feel bad.</Text>
      </Section>
      <SimulatedPrompt
        visible={asking}
        title="“Ayyur” would like to send you notifications"
        body="These may include alerts, sounds and badges."
        onDismiss={() => finish('denied')}
        actions={[
          { label: 'Don’t allow', onPress: () => finish('denied') },
          { label: 'Allow', strong: true, onPress: () => finish('granted') },
        ]}
      />
    </StepLayout>
  );
}

const VOICE_FACE: Record<Voice, Expression> = {
  gentle: 'gentle',
  direct: 'wink',
  teacher: 'thinking',
};

/** How Ayyur talks, and how lively he is. */
export function Be() {
  const { answers, set } = useFlow();
  const chosen = voices.find((v) => v.id === answers.voice);
  const on = [answers.sounds, answers.haptics, answers.celebrations].filter(Boolean).length;
  return (
    <StepLayout
      cue={{
        expression: answers.voice ? VOICE_FACE[answers.voice] : on === 0 ? 'gentle' : 'curious',
        say: 'How should I talk to you?',
        hint: 'Tap one to hear how I’d say the same thing.',
      }}>
      <OptionList<Voice>
        value={answers.voice}
        onChange={(voice) => set({ voice })}
        options={voices.map((v) => ({
          id: v.id,
          label: v.name,
          detail: v.about,
        }))}
      />
      {chosen ? (
        <View accessibilityLiveRegion="polite" className="mt-4 rounded-card border-2 border-line bg-surface px-4 py-3">
          <Text className="font-medium text-label text-ink-muted">I’d say</Text>
          <Text className="mt-1 font-medium text-body text-ink">{`“${chosen.line}”`}</Text>
        </View>
      ) : null}
      <Section title="How lively should I be?">
        <SwitchRow
          title="Sounds"
          detail="Little chimes when you log something"
          value={answers.sounds}
          onChange={(sounds) => set({ sounds })}
        />
        <SwitchRow title="Haptics" detail="A light tap you can feel" value={answers.haptics} onChange={(haptics) => set({ haptics })} />
        <SwitchRow
          title="Celebrations"
          detail="At milestones. Never during prayer or Quran."
          value={answers.celebrations}
          onChange={(celebrations) => set({ celebrations })}
        />
        <Text className="mt-2 text-center font-body text-label text-ink-muted">Animation follows your phone’s reduce-motion setting.</Text>
      </Section>
    </StepLayout>
  );
}

function PrivacyChoice({
  icon: ChoiceIcon,
  title,
  body,
  value,
  onChange,
  disabled,
  note,
}: {
  icon: Icon;
  title: string;
  body: string;
  value: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
  note?: string;
}) {
  const colors = useThemeColors();
  return (
    <View className="rounded-card border-2 border-line bg-surface px-4 pb-2">
      <SwitchRow
        stacked
        title={title}
        detail={body}
        value={value}
        onChange={onChange}
        disabled={disabled}
        icon={
          <View className="h-10 w-10 items-center justify-center rounded-full bg-raised">
            <ChoiceIcon size={20} weight="fill" color={colors.ink} />
          </View>
        }
      />
      {note ? (
        <View className="mb-2 flex-row items-start gap-2">
          <View className="pt-0.5">
            <InfoIcon size={16} weight="fill" color={colors.inkMuted} />
          </View>
          <Text className="flex-1 font-medium text-label text-ink-muted">{note}</Text>
        </View>
      ) : null}
    </View>
  );
}

/** Three separate choices, each explained where it's made. Calm: Ayyur holds still here. */
export function Privacy() {
  const { answers, set } = useFlow();
  const local = answers.account?.kind !== 'account';
  return (
    <StepLayout
      cue={{
        expression: 'gentle',
        say: 'Some things only happen if you say so.',
        hint: 'Three separate choices, all off until you turn them on.',
        badge: 'lock',
      }}>
      <View className="gap-3">
        <PrivacyChoice
          icon={CloudArrowUpIcon}
          title="Encrypted backup and sync"
          body="Your data is encrypted on this phone before it’s uploaded, so it can be restored on another phone."
          value={answers.cloudSync && !local}
          disabled={local}
          note={local ? 'Needs an account. You can sign in later from You.' : undefined}
          onChange={(cloudSync) => set({ cloudSync })}
        />
        <PrivacyChoice
          icon={BrainIcon}
          title="Use what you’ve told me when I answer"
          body="When you ask me something, the parts of your profile that help answer it are sent to an outside AI provider to write my reply. Sync encryption doesn’t cover this."
          value={answers.aiContext}
          onChange={(aiContext) => set({ aiContext })}
        />
        <PrivacyChoice
          icon={ChatTeardropTextIcon}
          title="Check-ins from me"
          body="Now and then I may write to you first, with a reminder or a word of encouragement. Writing these uses the same AI provider."
          value={answers.checkIns}
          onChange={(checkIns) => set({ checkIns })}
        />
      </View>
      <Text className="mt-4 text-center font-body text-label text-ink-muted">
        I’ll ask again before anything goes to an AI for the first time. You can change all three in You.
      </Text>
    </StepLayout>
  );
}

export function Note() {
  const { answers, set } = useFlow();
  const colors = useThemeColors();
  const has = answers.note.trim().length > 0;
  return (
    <StepLayout
      cue={{
        expression: has ? 'gentle' : 'listening',
        say: 'Is there anything else you’d like me to know?',
        hint: 'Only what you’re comfortable sharing.',
        look: has ? 0 : -1,
      }}>
      <Field
        tall
        multiline
        value={answers.note}
        onChangeText={(note) => set({ note })}
        maxLength={500}
        accessibilityLabel="Anything else you’d like Ayyur to know"
        placeholder="A routine, a goal, something you’re going through."
      />
      <View className="mt-3 flex-row items-start gap-2">
        <View className="pt-0.5">
          <LockIcon size={16} weight="fill" color={colors.inkSubtle} />
        </View>
        <Text className="flex-1 font-body text-label text-ink-muted">
          {answers.aiContext
            ? 'Kept on this phone. Because you turned on “Use what you’ve told me”, relevant parts may be sent with your questions.'
            : 'Kept on this phone. It only goes to the AI if you turn on “Use what you’ve told me”.'}
        </Text>
        {has ? <Text className="font-medium text-label text-ink-subtle">{`${answers.note.length}/500`}</Text> : null}
      </View>
      {has ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Clear the note"
          onPress={() => {
            tapHaptic();
            set({ note: '' });
          }}
          className="mt-1 min-h-[48px] justify-center self-start active:opacity-70">
          <Text className="font-heading text-body text-ink-muted">Clear</Text>
        </Pressable>
      ) : null}
    </StepLayout>
  );
}
