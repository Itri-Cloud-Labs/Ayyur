import { BrainIcon } from 'phosphor-react-native/src/icons/Brain';
import { ChatTeardropTextIcon } from 'phosphor-react-native/src/icons/ChatTeardropText';
import { CloudArrowUpIcon } from 'phosphor-react-native/src/icons/CloudArrowUp';
import { LockIcon } from 'phosphor-react-native/src/icons/Lock';
import type { Icon } from 'phosphor-react-native';
import { useEffect, useRef, useState } from 'react';
import { Image, Pressable, Text, View } from 'react-native';

import type { Expression } from '@/components/ayyur/layers';
import { Button } from '@/components/button';
import { tapHaptic } from '@/lib/haptics';
import { formatClock } from '@/lib/time';
import { useThemeColors } from '@/theme/colors';

import { previewTimes, voices } from '../data';
import { useFlow } from '../flow';
import { StepLayout } from '../shell';
import type { Nudges, Voice } from '../types';
import { Field, Stepper, SwitchRow } from '../ui/controls';
import { OptionList } from '../ui/options';
import { SimulatedPrompt } from '../ui/sheets';

const appMark = require('../../../assets/brand/tab/ayyur-tab-face.png');

const DAY = 24 * 60;
const wrap = (m: number) => ((m % DAY) + DAY) % DAY;

export function Rhythm() {
  const { answers, set, next } = useFlow();
  const fajr = previewTimes(answers).find((t) => t.id === 'fajr')!;
  return (
    <StepLayout
      cue={{ expression: 'sleepy', say: 'When do you usually sleep and wake up?', hint: 'I’ll keep quiet in between.' }}
      footer={<Button label="Continue" onPress={next} />}>
      <View className="gap-2">
        {(
          [
            ['I usually sleep at', 'sleepAt'],
            ['and wake up at', 'wakeAt'],
          ] as const
        ).map(([label, key]) => (
          <View key={key} className="min-h-[72px] flex-row items-center justify-between gap-3 rounded-card bg-surface px-4 py-3">
            <Text className="flex-1 font-medium text-body text-ink-muted">{label}</Text>
            <Stepper
              compact
              label={label === 'and wake up at' ? 'Wake up time' : 'Sleep time'}
              display={formatClock(answers[key])}
              onStep={(d) => set({ [key]: wrap(answers[key] + d * 15) })}
            />
          </View>
        ))}
      </View>
      <View className="mt-3">
        <SwitchRow
          title="Let the Fajr reminder through"
          detail={`Fajr is at ${formatClock(fajr.minutes)} today. Everything else stays quiet while you sleep.`}
          value={answers.fajrThroughQuiet}
          onChange={(fajrThroughQuiet) => set({ fajrThroughQuiet })}
        />
      </View>
    </StepLayout>
  );
}

const NUDGE_FACE: Record<Nudges, Expression> = { prayers: 'gentle', little: 'happy', 'on-track': 'delighted' };

export function NudgesStep() {
  const { answers, set, next } = useFlow();
  return (
    <StepLayout
      cue={{
        expression: answers.nudges ? NUDGE_FACE[answers.nudges] : 'listening',
        say: 'How often would you like to hear from me?',
        hint: 'I’ll never message you to make you feel bad.',
      }}
      footer={<Button label="Continue" onPress={next} disabled={!answers.nudges} />}>
      <OptionList<Nudges>
        value={answers.nudges}
        onChange={(nudges) => set({ nudges })}
        options={[
          { id: 'prayers', label: 'Only at prayer times', detail: 'Just the reminders you set' },
          { id: 'little', label: 'A little', detail: 'Prayers, plus one check-in a day' },
          { id: 'on-track', label: 'Keep me on track', detail: 'Prayers, a reminder for each goal, and encouragement for your streak' },
        ]}
      />
    </StepLayout>
  );
}

export function Notifications() {
  const { answers, set, next } = useFlow();
  const colors = useThemeColors();
  const [asking, setAsking] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);
  const state = answers.notificationPermission;
  const asr = previewTimes(answers).find((t) => t.id === 'asr')!;

  const finish = (permission: 'granted' | 'denied') => {
    setAsking(false);
    set({ notificationPermission: permission });
    timer.current = setTimeout(next, 1200);
  };

  return (
    <StepLayout
      cue={{
        expression: state === 'granted' ? 'delighted' : state === 'denied' ? 'gentle' : 'happy',
        say:
          state === 'granted'
            ? 'Thank you! I’ll be gentle with them.'
            : state === 'denied'
              ? 'That’s okay. Everything is still in the app.'
              : 'Can I send you notifications?',
      }}
      footer={
        state === 'unasked' ? (
          <>
            <Button label="Allow notifications" onPress={() => setAsking(true)} />
            <Button variant="secondary" label="Not now" onPress={next} />
          </>
        ) : (
          <Button label="Continue" onPress={next} />
        )
      }>
      <View className="gap-2">
        {[
          { title: 'Asr in 10 minutes', body: `${formatClock(asr.minutes)} today` },
          { title: 'Ayyur', body: 'You read two pages yesterday. Ready for today’s?' },
        ].map((n) => (
          <View key={n.title} accessible className="flex-row items-center gap-3 rounded-card bg-surface p-3">
            <View className="h-9 w-9 items-center justify-center rounded-lg bg-night">
              <Image source={appMark} style={{ width: 26, height: 26 }} accessible={false} />
            </View>
            <View className="flex-1">
              <Text className="font-heading text-label text-ink">{n.title}</Text>
              <Text className="font-body text-label text-ink-muted">{n.body}</Text>
            </View>
          </View>
        ))}
      </View>
      <View className="mt-4 flex-row items-start gap-2">
        <View className="pt-0.5">
          <LockIcon size={16} weight="fill" color={colors.inkSubtle} />
        </View>
        <Text className="flex-1 font-body text-label text-ink-muted">
          Your phone will ask next. Lock-screen notifications never show your name, and you can turn them off in Settings at any time.
        </Text>
      </View>
      <SimulatedPrompt
        visible={asking}
        title="“Ayyur” would like to send you notifications"
        body="These may include alerts, sounds and badges."
        actions={[
          { label: 'Don’t allow', onPress: () => finish('denied') },
          { label: 'Allow', strong: true, onPress: () => finish('granted') },
        ]}
      />
    </StepLayout>
  );
}

export function Feel() {
  const { answers, set, next } = useFlow();
  const on = [answers.sounds, answers.haptics, answers.celebrations].filter(Boolean).length;
  return (
    <StepLayout
      cue={{
        expression: on === 3 ? 'delighted' : on === 0 ? 'gentle' : 'happy',
        say: on === 0 ? 'Nice and quiet, then.' : 'How lively should I be?',
        hint: 'Animation follows your phone’s reduce-motion setting.',
      }}
      footer={<Button label="Continue" onPress={next} />}>
      <SwitchRow title="Sounds" detail="Little chimes when you log something" value={answers.sounds} onChange={(sounds) => set({ sounds })} />
      <SwitchRow title="Haptics" detail="A light tap you can feel" value={answers.haptics} onChange={(haptics) => set({ haptics })} />
      <SwitchRow
        title="Celebrations"
        detail="When you reach a milestone. Never during prayer or Quran."
        value={answers.celebrations}
        onChange={(celebrations) => set({ celebrations })}
      />
    </StepLayout>
  );
}

const VOICE_FACE: Record<Voice, Expression> = { gentle: 'gentle', direct: 'wink', teacher: 'thinking' };

export function VoiceStep() {
  const { answers, set, next } = useFlow();
  const chosen = voices.find((v) => v.id === answers.voice);
  return (
    <StepLayout
      cue={{
        expression: answers.voice ? VOICE_FACE[answers.voice] : 'curious',
        say: chosen ? chosen.line : 'How should I talk to you?',
        hint: chosen ? 'That’s how I’d say it. Try the others too.' : 'Tap one to hear how I’d say the same thing.',
      }}
      footer={<Button label="Continue" onPress={next} disabled={!answers.voice} />}>
      <OptionList<Voice> value={answers.voice} onChange={(voice) => set({ voice })} options={voices.map((v) => ({ id: v.id, label: v.name, detail: v.about }))} />
      <Text className="mt-4 text-center font-body text-label text-ink-muted">Only my style changes. I’ll always be kind, honest and on your side.</Text>
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
    <View className="border-b border-line pb-2">
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
      {note ? <Text className="mb-2 font-medium text-label text-moon-text">{note}</Text> : null}
    </View>
  );
}

export function Privacy() {
  const { answers, set, next } = useFlow();
  const local = answers.account?.kind !== 'account';
  return (
    <StepLayout
      cue={{ expression: 'gentle', say: 'Some things only happen if you say so.', hint: 'Three separate choices, all off until you turn them on.' }}
      footer={<Button label="Continue" onPress={next} />}>
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
        title="Let my AI use what you’ve shared"
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
      <Text className="mt-4 font-body text-label text-ink-muted">I’ll ask again before anything is sent to an AI for the first time. You can change all three in You.</Text>
    </StepLayout>
  );
}

export function Note() {
  const { answers, set, next } = useFlow();
  const colors = useThemeColors();
  const has = answers.note.trim().length > 0;
  return (
    <StepLayout
      cue={{ expression: has ? 'gentle' : 'listening', say: 'Is there anything else you’d like me to know?', look: has ? 0 : -1 }}
      footer={<Button label={has ? 'Continue' : 'Nothing else for now'} onPress={next} />}>
      <Field
        tall
        multiline
        value={answers.note}
        onChangeText={(note) => set({ note })}
        maxLength={500}
        accessibilityLabel="Anything else you’d like Ayyur to know"
        placeholder="A routine, a goal, something you’re going through. Only what you’re comfortable sharing."
      />
      <View className="mt-3 flex-row items-start gap-2">
        <View className="pt-0.5">
          <LockIcon size={16} weight="fill" color={colors.inkSubtle} />
        </View>
        <Text className="flex-1 font-body text-label text-ink-muted">
          {answers.aiContext
            ? 'This stays on this phone. Because you let my AI use what you’ve shared, relevant parts may be sent with your questions.'
            : 'This stays on this phone, and it won’t reach the AI unless you turn that on.'}
        </Text>
        <Text className="font-medium text-caption text-ink-subtle">{`${answers.note.length}/500`}</Text>
      </View>
      <Pressable accessibilityRole="button" onPress={() => { tapHaptic(); set({ note: '' }); }} className={`mt-1 min-h-[44px] justify-center self-start ${has ? '' : 'hidden'}`}>
        <Text className="font-medium text-label text-ink-muted">Clear</Text>
      </Pressable>
    </StepLayout>
  );
}
