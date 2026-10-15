import { CaretRightIcon } from 'phosphor-react-native/src/icons/CaretRight';
import { PlusIcon } from 'phosphor-react-native/src/icons/Plus';
import { useEffect, useRef, useState } from 'react';
import { PixelRatio, Pressable, StyleSheet, Text, View } from 'react-native';

import { formatClock, formatCountdown, minutesOfDay } from '@/lib/time';
import { fixed, night } from '@/theme/palette';
import { radius, text } from '@/theme/styles';
import { TONES, type Tone } from '@/theme/tones';

import {
  countryAsr,
  extraPrayers,
  fasts,
  hijriConventions,
  intentions,
  madhhabs,
  methods,
  practiceOptions,
  quranAmounts,
  quranReadingOptions,
  suggestedMethod,
  todayPrayers,
  translations,
  voices,
  wants,
} from '../data';
import { useFlow } from '../flow';
import { StepFooter, StepLayout } from '../shell';
import type { Answers } from '../types';
import { Constellation } from '../ui/constellation';

type Line = { label: string; value: string; step: string };
type Section = {
  title: string;
  tone: Tone;
  lines: Line[];
  add?: { label: string; section: 'quran' | 'fasting' | 'habits' };
};

const TIME_LABEL = {
  'after-fajr': 'after Fajr',
  day: 'during the day',
  'after-maghrib': 'after Maghrib',
  'before-sleep': 'before sleep',
  any: 'at no fixed time',
};
const WHEN_LABEL = {
  at: 'At the time',
  before: '10 minutes before',
  both: 'At the time and 10 minutes before',
  none: 'Off',
};
const SOUND_LABEL = { adhan: 'adhan', chime: 'soft chime', silent: 'silent' };
const NUDGE_LABEL = {
  prayers: 'Only at prayer times',
  little: 'A little',
  'on-track': 'Keep me on track',
};
const BACKGROUND_LABEL = {
  born: 'Born Muslim',
  embraced: 'Embraced Islam later',
  private: 'Rather not say',
};
const KNOWN_LABEL = {
  nothing: 'Nothing yet',
  'short-surahs': 'A few short surahs',
  'juz-amma': 'Most of Juz Amma',
  'several-juz': 'Several juz',
  whole: 'The whole Quran',
};

const or = (value: string | null | undefined, fallback = 'Not set') => value || fallback;
const list = (items: (string | undefined)[], none = 'None for now') =>
  items.filter(Boolean).length ? items.filter(Boolean).join(', ') : none;

function sections(a: Answers): Section[] {
  const method = methods.find((m) => m.id === a.method) ?? suggestedMethod(a.city);
  const asr = a.asr ?? countryAsr(a.city);
  const offsets = Object.values(a.offsets).filter((v) => v !== 0).length;
  const amount = quranAmounts.find((q) => q.id === a.quranAmount)?.label;
  const goals = a.quranGoals.map(
    (g) =>
      ({
        read: 'read regularly',
        memorise: 'memorise',
        revise: 'revise',
        understand: 'understand the meaning',
      })[g],
  );

  const quranLines: Line[] = [
    {
      label: 'Reading Arabic',
      value: or(quranReadingOptions.find((q) => q.id === a.quranReading)?.label),
      step: 'quran-reading',
    },
    {
      label: 'Translation',
      value: translations.find((t) => t.id === a.translation)!.name,
      step: 'quran-reading',
    },
  ];
  if (wants(a, 'quran')) {
    quranLines.push({
      label: 'Goals',
      value: goals.length ? goals.join(', ') : 'Decide later',
      step: 'quran-plan',
    });
    if (amount)
      quranLines.push({
        label: 'Each day',
        value: `${amount}${a.quranTime ? `, ${TIME_LABEL[a.quranTime]}` : ''}`,
        step: 'quran-plan',
      });
    if (a.quranKnown)
      quranLines.push({
        label: 'Known by heart',
        value: KNOWN_LABEL[a.quranKnown],
        step: 'quran-plan',
      });
  }

  return [
    {
      title: 'You',
      tone: 'moon',
      lines: [
        { label: 'Name', value: or(a.name.trim(), 'No name'), step: 'name' },
        {
          label: 'Born',
          value: or(a.birthYear ? String(a.birthYear) : null),
          step: 'birth-year',
        },
        {
          label: 'Brother or sister',
          value: a.gender === 'male' ? 'Brother' : a.gender === 'female' ? 'Sister' : 'Not set',
          step: 'gender',
        },
        {
          label: 'Practice',
          value: or(practiceOptions.find((p) => p.id === a.practice)?.label),
          step: 'practice',
        },
        {
          label: 'Background',
          value: a.background ? BACKGROUND_LABEL[a.background] : 'Not set',
          step: 'practice',
        },
        {
          label: 'Goals',
          value: a.exploring
            ? 'Just exploring'
            : list(
                a.intentions.map((id) => intentions.find((g) => g.id === id)?.label),
                'None yet',
              ),
          step: 'goals',
        },
      ],
    },
    {
      title: 'Prayer',
      tone: 'prayer',
      lines: [
        {
          label: 'Location',
          value: or(a.city ? `${a.city.name}, ${a.city.country}` : null),
          step: 'location',
        },
        {
          label: 'Madhhab and Asr',
          value: `${or(madhhabs.find((m) => m.id === a.madhhab)?.name, 'No preference')}, ${asr === 'hanafi' ? 'later' : 'earlier'} Asr`,
          step: 'madhhab',
        },
        {
          label: 'Times',
          value: `${method.name}${offsets ? `, ${offsets} adjusted` : ''}`,
          step: 'method',
        },
        {
          label: 'Most help with',
          value: a.prayerFocus === 'all' || !a.prayerFocus ? 'All five equally' : a.prayerFocus[0].toUpperCase() + a.prayerFocus.slice(1),
          step: 'prayer-focus',
        },
        ...(a.practice !== 'new' && a.practice !== 'starting'
          ? [
              {
                label: 'Extra prayers',
                value: list(a.extraPrayers.map((id) => extraPrayers.find((e) => e.id === id)?.label)),
                step: 'prayer-extras',
              },
            ]
          : []),
        ...(a.gender === 'male'
          ? [
              {
                label: 'Congregation',
                value: a.congregation ? 'Tracked' : 'Not tracked',
                step: 'prayer-extras',
              },
            ]
          : []),
        {
          label: 'Reminders',
          value: `${a.reminderWhen === 'none' ? 'Off' : `${WHEN_LABEL[a.reminderWhen]}, ${SOUND_LABEL[a.reminderSound]}`}; Jumu’ah ${(a.jumuah ?? a.gender === 'male') ? 'on' : 'off'}`,
          step: 'reminders',
        },
      ],
    },
    {
      title: 'Quran',
      tone: 'quran',
      lines: quranLines,
      add: wants(a, 'quran') ? undefined : { label: 'Set up a Quran goal too', section: 'quran' },
    },
    {
      title: 'Fasting',
      tone: 'fasting',
      lines: wants(a, 'fasting')
        ? [
            {
              label: 'Fasts',
              value: list(a.fasts.map((id) => fasts.find((f) => f.id === id)?.label)),
              step: 'fasting',
            },
            ...(a.hijriConvention
              ? [
                  {
                    label: 'Islamic calendar',
                    value: hijriConventions.find((h) => h.id === a.hijriConvention)!.name,
                    step: 'fasting',
                  },
                ]
              : []),
          ]
        : [],
      add: wants(a, 'fasting') ? undefined : { label: 'Set up voluntary fasts too', section: 'fasting' },
    },
    {
      title: 'Habits',
      tone: 'habits',
      lines: wants(a, 'habits')
        ? [
            {
              label: 'Starting with',
              value: list([...a.habits, a.ownHabit.trim()]),
              step: 'habits',
            },
          ]
        : [],
      add: wants(a, 'habits') ? undefined : { label: 'Pick some habits too', section: 'habits' },
    },
    {
      title: 'Your day and Ayyur',
      tone: 'moon',
      lines: [
        {
          label: 'Quiet hours',
          value: `${formatClock(a.sleepAt)} to ${formatClock(a.wakeAt)}${a.fajrThroughQuiet ? ', Fajr allowed' : ''}`,
          step: 'day',
        },
        {
          label: 'Messages from me',
          value: a.nudges ? NUDGE_LABEL[a.nudges] : 'A little',
          step: 'day',
        },
        {
          label: 'My voice',
          value: or(voices.find((v) => v.id === a.voice)?.name, 'Gentle and encouraging'),
          step: 'be',
        },
        {
          label: 'Sounds, haptics, celebrations',
          value:
            [a.sounds ? 'sounds' : null, a.haptics ? 'haptics' : null, a.celebrations ? 'celebrations' : null].filter(Boolean).join(', ') ||
            'All off',
          step: 'be',
        },
        {
          label: 'Privacy',
          value: [
            a.cloudSync ? 'Sync on' : 'Sync off',
            a.aiContext ? 'AI may use your profile' : 'AI doesn’t use your profile',
            a.checkIns ? 'check-ins on' : 'no check-ins',
          ].join(', '),
          step: 'privacy',
        },
        {
          label: 'Your note',
          value: a.note.trim() ? `“${a.note.trim().slice(0, 60)}${a.note.trim().length > 60 ? '…' : ''}”` : 'Nothing added',
          step: 'note',
        },
      ],
    },
  ];
}

export function Summary() {
  const { answers, set, goTo } = useFlow();
  const name = answers.name.trim();
  const lit = intentions.filter((g) => answers.intentions.includes(g.id));
  return (
    <StepLayout
      cue={{
        expression: 'happy',
        say: name ? `Here’s your plan, ${name}.` : 'Here’s your plan.',
        hint: 'Tap anything to change it. You can also change it all later in You.',
      }}
      footer={<StepFooter label="Looks good" />}>
      {/* Labels are placed freely, so at large text sizes the goals are only listed below. */}
      {lit.length && PixelRatio.getFontScale() <= 1.3 ? <Constellation goals={lit} brightest={answers.topIntention} /> : null}
      {sections(answers).map((section) => (
        <View key={section.title} style={styles.section}>
          <View style={styles.sectionHead}>
            <View style={[styles.dot, { backgroundColor: COLOURS[TONES[section.tone].fill] }]} />
            <Text accessibilityRole="header" style={styles.title}>
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
              style={({ pressed }) => [styles.line, pressed && styles.pressed]}>
              <View style={styles.fill}>
                <Text style={styles.lineLabel}>{line.label}</Text>
                <Text style={styles.lineValue}>{line.value}</Text>
              </View>
              <CaretRightIcon size={18} weight="bold" color={night.inkSubtle} />
            </Pressable>
          ))}
          {section.add ? (
            <Pressable
              accessibilityRole="button"
              onPress={() => {
                const add = section.add!;
                set({ optIn: [...answers.optIn, add.section] });
                goTo({ quran: 'quran-plan', fasting: 'fasting', habits: 'habits' }[add.section], true);
              }}
              style={({ pressed }) => [styles.line, pressed && styles.pressed]}>
              <PlusIcon size={18} weight="bold" color={night.ink} />
              <Text style={[styles.add, styles.fill]}>{section.add.label}</Text>
            </Pressable>
          ) : null}
        </View>
      ))}
    </StepLayout>
  );
}

/** The closing line, from the times the user just set up: the prayer on now, or the next one. */
function firstTogether(answers: Answers) {
  const now = minutesOfDay(new Date());
  const prayers = todayPrayers(answers);
  const current = prayers.find((p) => now >= p.start && now < p.end);
  if (current) return `It’s ${current.name} time now. Shall we start there?`;
  const next = prayers.find((p) => p.start > now);
  if (next) return `Our first prayer together is ${next.name}, ${formatCountdown(next.start - now)}.`;
  return `Our first prayer together is Fajr, at ${formatClock(prayers[0].start)} tomorrow.`;
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
        say: name ? `Welcome, ${name}.\nI’m glad you’re here.` : 'Welcome.\nI’m glad you’re here.',
        hint: firstTogether(answers),
        celebrate: true,
        exit: leaving,
      }}
      footer={
        <StepFooter
          label="Start with Ayyur"
          onPress={() => {
            if (leaving) return;
            setLeaving(true);
            timer.current = setTimeout(next, 640);
          }}
        />
      }
    />
  );
}

// The summary is always in the night theme.
const COLOURS = { ...night, ...fixed };

const styles = StyleSheet.create({
  fill: { flex: 1 },
  pressed: { opacity: 0.7 },
  section: { marginTop: 24 },
  sectionHead: { marginBottom: 4, flexDirection: 'row', alignItems: 'center', gap: 8 },
  dot: { height: 10, width: 10, borderRadius: radius.full },
  title: text('heading', 'title', night.ink),
  line: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: night.line,
    paddingVertical: 8,
  },
  lineLabel: text('medium', 'label', night.inkMuted),
  lineValue: text('medium', 'body', night.ink),
  add: text('heading', 'body', night.ink),
});
