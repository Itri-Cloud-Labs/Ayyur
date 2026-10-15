import { CaretRightIcon } from 'phosphor-react-native/src/icons/CaretRight';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { tapHaptic } from '@/lib/haptics';
import { useThemeColors } from '@/theme/colors';

import { quranAmounts, quranReadingOptions, suggestedAmount, translations } from '../data';
import { useFlow } from '../flow';
import { StepLayout } from '../shell';
import type { QuranGoal, QuranKnown, QuranReading, QuranTime } from '../types';
import { Chips, OptionList } from '../ui/options';
import { Sheet } from '../ui/sheets';

/** Reading comfort, with the translation as a follow-up line once answered. */
export function QuranReadingStep() {
  const { answers, set } = useFlow();
  const colors = useThemeColors();
  const [picking, setPicking] = useState(false);
  const translation = translations.find((t) => t.id === answers.translation)!;
  return (
    <StepLayout
      cue={{
        expression: answers.quranReading ? 'gentle' : 'listening',
        say: 'How comfortable are you reading the Quran in Arabic?',
      }}>
      <OptionList<QuranReading>
        tone="quran"
        value={answers.quranReading}
        onChange={(quranReading) => set({ quranReading })}
        options={quranReadingOptions.map((o) => ({
          id: o.id,
          label: o.label,
          detail: o.detail,
        }))}
      />
      {answers.quranReading ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`English translation: ${translation.name}. Change`}
          onPress={() => {
            tapHaptic();
            setPicking(true);
          }}
          className="mt-5 min-h-[64px] flex-row items-center gap-3 rounded-control border-2 border-line px-4 py-3 active:opacity-80">
          <View className="flex-1">
            <Text className="font-medium text-label text-ink-muted">English translation, shown with the Arabic</Text>
            <Text className="font-heading text-body text-ink">{translation.name}</Text>
          </View>
          <Text className="font-heading text-label text-quran-text">Change</Text>
          <CaretRightIcon size={18} weight="bold" color={colors.quranText} />
        </Pressable>
      ) : null}
      <Sheet visible={picking} onClose={() => setPicking(false)} label="Choose a translation">
        <Text className="mb-4 font-heading text-headline text-ink">Choose a translation</Text>
        <OptionList
          tone="quran"
          suggested="saheeh"
          value={answers.translation}
          onChange={(id) => {
            set({ translation: id });
            setPicking(false);
          }}
          options={translations.map((t) => ({
            id: t.id,
            label: t.name,
            detail: 'by' in t ? `${t.by}. ${t.style}` : t.style,
          }))}
        />
      </Sheet>
    </StepLayout>
  );
}

const TIMES: { id: QuranTime; label: string }[] = [
  { id: 'after-fajr', label: 'After Fajr' },
  { id: 'day', label: 'During the day' },
  { id: 'after-maghrib', label: 'After Maghrib' },
  { id: 'before-sleep', label: 'Before sleep' },
  { id: 'any', label: 'No fixed time' },
];

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

/** What to do with the Quran, and the follow-ups that apply: how much, what's known, and when. */
export function QuranPlan() {
  const { answers, set } = useFlow();
  const reading = answers.quranGoals.includes('read');
  const memorising = answers.quranGoals.includes('memorise') || answers.quranGoals.includes('revise');
  return (
    <StepLayout
      cue={{
        expression: answers.quranGoals.length ? 'delighted' : 'curious',
        say: 'What would you like to do with the Quran?',
        hint: 'Pick any. I’ll ask a little more about the ones you choose.',
      }}>
      <Chips<QuranGoal>
        tone="quran"
        value={answers.quranGoals}
        onChange={(quranGoals) =>
          // The suggested daily amount is chosen for you the moment reading is picked.
          set({
            quranGoals,
            quranAmount: quranGoals.includes('read') ? (answers.quranAmount ?? suggestedAmount(answers.practice)) : null,
          })
        }
        options={[
          { id: 'read', label: 'Read regularly' },
          { id: 'memorise', label: 'Memorise' },
          { id: 'revise', label: 'Revise what I know' },
          { id: 'understand', label: 'Understand the meaning' },
        ]}
      />
      {reading ? (
        <Section title="How much each day?">
          <Chips
            single
            tone="quran"
            label="Daily amount"
            value={answers.quranAmount ? [answers.quranAmount] : []}
            onChange={([quranAmount]) => set({ quranAmount })}
            options={quranAmounts.map((q) => ({
              id: q.id,
              label: q.label,
              detail: q.id === suggestedAmount(answers.practice) ? 'suggested' : undefined,
            }))}
          />
        </Section>
      ) : null}
      {memorising ? (
        <Section title="What do you know by heart?">
          <Chips<QuranKnown>
            single
            tone="quran"
            label="Known by heart"
            value={answers.quranKnown ? [answers.quranKnown] : []}
            onChange={([quranKnown]) => set({ quranKnown })}
            options={[
              { id: 'nothing', label: 'Nothing yet' },
              { id: 'short-surahs', label: 'A few short surahs' },
              { id: 'juz-amma', label: 'Most of Juz Amma' },
              { id: 'several-juz', label: 'Several juz' },
              { id: 'whole', label: 'The whole Quran' },
            ]}
          />
        </Section>
      ) : null}
      {answers.quranGoals.length ? (
        <Section title="When suits you best?">
          <Chips<QuranTime>
            single
            tone="quran"
            label="Quran time"
            value={answers.quranTime ? [answers.quranTime] : []}
            onChange={([quranTime]) => set({ quranTime })}
            options={TIMES}
          />
        </Section>
      ) : null}
    </StepLayout>
  );
}
