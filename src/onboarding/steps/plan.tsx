import { CaretRightIcon } from 'phosphor-react-native/src/icons/CaretRight';
import { useEffect, useRef, useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { Button } from '@/components/button';
import { samplePrayers } from '@/data/sample';
import { formatClock, formatCountdown, minutesOfDay } from '@/lib/time';
import { useThemeColors } from '@/theme/colors';
import { TONES, type Tone } from '@/theme/tones';

import {
  countryAsr,
  fasts,
  hijriConventions,
  intentions,
  madhhabs,
  methods,
  practiceOptions,
  quranAmounts,
  quranReadingOptions,
  suggestedMethod,
  translations,
  voices,
} from '../data';
import { useFlow } from '../flow';
import { StepLayout } from '../shell';
import type { Answers } from '../types';

type Line = { label: string; value: string; step: string };

const TIME_LABEL = { 'after-fajr': 'after Fajr', day: 'during the day', 'after-maghrib': 'after Maghrib', 'before-sleep': 'before sleep', any: 'at no fixed time' };
const WHEN_LABEL = { at: 'At the time', before: '10 minutes before', both: 'At the time and 10 minutes before', none: 'Off' };
const SOUND_LABEL = { adhan: 'adhan', chime: 'soft chime', silent: 'silent' };
const NUDGE_LABEL = { prayers: 'only at prayer times', little: 'a little', 'on-track': 'keeping you on track' };

const or = (value: string | null | undefined, fallback = 'Not set') => value || fallback;

function sections(a: Answers): { title: string; tone: Tone; lines: Line[] }[] {
  const method = methods.find((m) => m.id === a.method) ?? suggestedMethod(a.city);
  const asr = a.asr ?? countryAsr(a.city);
  const top = intentions.find((g) => g.id === a.topIntention);
  const fastList = a.fasts.map((id) => fasts.find((f) => f.id === id)?.label).filter(Boolean);
  const habitList = [...a.habits, a.ownHabit.trim()].filter(Boolean);
  const amount = quranAmounts.find((q) => q.id === a.quranAmount)?.label;
  const offsets = Object.values(a.offsets).filter((v) => v !== 0).length;

  return [
    {
      title: 'You',
      tone: 'moon',
      lines: [
        { label: 'Name', value: or(a.name.trim(), 'No name'), step: 'name' },
        { label: 'Born', value: or(a.birthYear ? String(a.birthYear) : null), step: 'birth-year' },
        { label: 'Practice', value: or(practiceOptions.find((p) => p.id === a.practice)?.label), step: 'practice' },
        {
          label: 'Goals',
          value: a.intentions.length ? `${a.intentions.length} chosen${top ? `, brightest: ${top.label.toLowerCase()}` : ''}` : 'None yet',
          step: 'goals',
        },
      ],
    },
    {
      title: 'Prayer',
      tone: 'prayer',
      lines: [
        { label: 'Location', value: or(a.city ? `${a.city.name}, ${a.city.country}` : null), step: 'location' },
        { label: 'Times', value: `${method.name}, ${asr === 'hanafi' ? 'later' : 'earlier'} Asr${offsets ? `, ${offsets} adjusted` : ''}`, step: 'method' },
        { label: 'Madhhab', value: or(madhhabs.find((m) => m.id === a.madhhab)?.name, 'No preference'), step: 'madhhab' },
        {
          label: 'Reminders',
          value: a.reminderWhen === 'none' ? 'Off' : `${WHEN_LABEL[a.reminderWhen]}, ${SOUND_LABEL[a.reminderSound]}`,
          step: 'reminders',
        },
      ],
    },
    {
      title: 'Quran',
      tone: 'quran',
      lines: [
        { label: 'Reading', value: or(quranReadingOptions.find((q) => q.id === a.quranReading)?.label), step: 'quran-reading' },
        { label: 'Translation', value: translations.find((t) => t.id === a.translation)!.name, step: 'translation' },
        {
          label: 'Daily goal',
          value: amount ? `${amount}${a.quranTime ? `, ${TIME_LABEL[a.quranTime]}` : ''}` : a.quranGoals.length ? 'Set in the Quran tab' : 'Not set',
          step: 'quran-goals',
        },
      ],
    },
    {
      title: 'Fasting and habits',
      tone: 'habits',
      lines: [
        { label: 'Fasts', value: fastList.length ? fastList.join(', ') : 'None for now', step: 'fasting' },
        { label: 'Habits', value: habitList.length ? habitList.join(', ') : 'None for now', step: 'habits' },
        { label: 'Hijri calendar', value: or(hijriConventions.find((h) => h.id === a.hijriConvention)?.name, 'Usual for your country'), step: 'hijri' },
      ],
    },
    {
      title: 'Ayyur',
      tone: 'moon',
      lines: [
        { label: 'Voice', value: or(voices.find((v) => v.id === a.voice)?.name), step: 'voice' },
        { label: 'Messages', value: a.nudges ? `I’ll be ${NUDGE_LABEL[a.nudges]}` : 'A little', step: 'nudges' },
        {
          label: 'Privacy',
          value: [a.cloudSync ? 'Sync on' : 'Sync off', a.aiContext ? 'AI may use your profile' : 'AI doesn’t see your profile', a.checkIns ? 'check-ins on' : 'no check-ins'].join(', '),
          step: 'privacy',
        },
      ],
    },
  ];
}

export function Summary() {
  const { answers, goTo, next } = useFlow();
  const colors = useThemeColors();
  const name = answers.name.trim();
  return (
    <StepLayout
      cue={{ expression: 'happy', say: name ? `Here’s your plan, ${name}.` : 'Here’s your plan.' }}
      footer={<Button label="Start with Ayyur" onPress={next} />}>
      <Text className="mb-2 text-center font-body text-label text-ink-muted">Tap anything to change it. You can also change it all later in You.</Text>
      {sections(answers).map((section) => (
        <View key={section.title} className="mt-5">
          <View className="mb-1 flex-row items-center gap-2">
            <View className={`h-2.5 w-2.5 rounded-full ${TONES[section.tone].fill}`} />
            <Text accessibilityRole="header" className="font-heading text-title text-ink">
              {section.title}
            </Text>
          </View>
          {section.lines.map((line) => (
            <Pressable
              key={line.label}
              accessibilityRole="button"
              accessibilityLabel={`${line.label}: ${line.value}`}
              accessibilityHint="Opens this question to change it"
              onPress={() => goTo(line.step, true)}
              className="min-h-[56px] flex-row items-center gap-3 border-b border-line py-2 active:opacity-70">
              <View className="flex-1">
                <Text className="font-medium text-caption text-ink-subtle">{line.label}</Text>
                <Text className="font-medium text-body text-ink">{line.value}</Text>
              </View>
              <CaretRightIcon size={18} weight="bold" color={colors.inkSubtle} />
            </Pressable>
          ))}
        </View>
      ))}
    </StepLayout>
  );
}

/** The first prayer still to come today, or tomorrow's Fajr, for the closing line. */
function firstTogether() {
  const now = minutesOfDay(new Date());
  const next = samplePrayers.find((p) => p.start > now);
  if (next) return `Our first prayer together is ${next.name}, ${formatCountdown(next.start - now)}.`;
  return `Our first prayer together is Fajr, at ${formatClock(samplePrayers[0].start)} tomorrow.`;
}

export function Complete() {
  const { answers, next } = useFlow();
  const [leaving, setLeaving] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);
  const name = answers.name.trim();

  return (
    <StepLayout
      cue={{
        expression: leaving ? 'delighted' : 'joyful',
        say: name ? `Welcome, ${name}. I’m so glad you’re here.` : 'Welcome. I’m so glad you’re here.',
        pose: 'stage',
        celebrate: true,
        exit: leaving,
      }}
      footer={
        <Button
          label="Start with Ayyur"
          disabled={leaving}
          onPress={() => {
            setLeaving(true);
            timer.current = setTimeout(next, 620);
          }}
        />
      }>
      <View style={{ opacity: leaving ? 0 : 1 }}>
        <Text className="text-center font-body text-body text-ink-muted">
          Every day is a fresh start, and I’ll be here for each one. {firstTogether()}
        </Text>
      </View>
    </StepLayout>
  );
}
