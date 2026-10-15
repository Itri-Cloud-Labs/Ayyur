import { MoonIcon } from 'phosphor-react-native/src/icons/Moon';
import { Text, View } from 'react-native';

import { useThemeColors } from '@/theme/colors';

import { fasts, habitOptions, hijriConventions, hijriPreview } from '../data';
import { useFlow } from '../flow';
import { StepLayout } from '../shell';
import type { HijriConvention } from '../types';
import { Field, SwitchRow } from '../ui/controls';
import { Chips, OptionList, Segmented } from '../ui/options';

/** Fasts, with the Hijri convention as a follow-up when a fast depends on the Islamic date. */
export function Fasting() {
  const { answers, set } = useFlow();
  const colors = useThemeColors();
  const any = answers.fasts.length > 0;
  const datesMatter = answers.fasts.some((f) => f === 'white-days' || f === 'arafah-ashura' || f === 'shawwal');
  return (
    <StepLayout
      cue={{
        expression: any ? 'delighted' : 'curious',
        say: 'Any voluntary fasts you’d like to work towards?',
        hint: 'I’ll show them on Home on their days.',
      }}>
      <Chips tone="fasting" value={answers.fasts} onChange={(f) => set({ fasts: f })} options={fasts} />
      {any ? (
        <View className="mt-5">
          <SwitchRow
            tone="fasting"
            title="Remind me the evening before"
            detail="So there’s time to plan suhoor"
            value={answers.fastReminder}
            onChange={(fastReminder) => set({ fastReminder })}
          />
        </View>
      ) : null}
      {datesMatter ? (
        <View className="mt-6 gap-3">
          <Text accessibilityRole="header" className="text-center font-heading text-title text-ink">
            How should I count the Islamic months?
          </Text>
          <Text className="text-center font-body text-label text-ink-muted">
            Months start with the new moon, so places can be a day apart. Pick what your community follows.
          </Text>
          <View
            accessible
            accessibilityLabel={`Today would be ${hijriPreview(answers.hijriOffset)}, a sample date`}
            className="flex-row items-center gap-3 rounded-card border-2 border-line bg-surface p-4">
            <MoonIcon size={24} weight="fill" color={colors.inkMuted} />
            <View className="flex-1">
              <Text className="font-heading text-title text-ink">{hijriPreview(answers.hijriOffset)}</Text>
              <Text className="font-body text-label text-ink-muted">Today, as a sample date</Text>
            </View>
          </View>
          <OptionList<HijriConvention>
            tone="fasting"
            value={answers.hijriConvention}
            onChange={(hijriConvention) => set({ hijriConvention })}
            options={hijriConventions.map((c) => ({
              id: c.id,
              label: c.name,
              detail: c.about,
            }))}
          />
          <Segmented
            label="Adjust by a day"
            tone="fasting"
            value={String(answers.hijriOffset) as '-1' | '0' | '1'}
            onChange={(v) => set({ hijriOffset: Number(v) as -1 | 0 | 1 })}
            options={[
              { id: '-1', label: 'Earlier' },
              { id: '0', label: 'No change' },
              { id: '1', label: 'Later' },
            ]}
          />
        </View>
      ) : null}
    </StepLayout>
  );
}

export function Habits() {
  const { answers, set } = useFlow();
  const count = answers.habits.length + (answers.ownHabit.trim() ? 1 : 0);
  const many = count > 3;
  return (
    <StepLayout
      cue={{
        expression: many ? 'gentle' : count ? 'happy' : 'curious',
        say: 'Pick a few good habits to start with.',
        hint: many ? 'Three is a good start. You can add more any time.' : 'Start small. You can change them in the Habits tab.',
      }}>
      <Chips
        tone="habits"
        value={answers.habits}
        onChange={(habits) => set({ habits })}
        options={habitOptions.map((h) => ({ id: h, label: h }))}
      />
      <View className="mt-6">
        <Field
          tone="habits"
          label="Something of your own"
          value={answers.ownHabit}
          onChangeText={(ownHabit) => set({ ownHabit })}
          placeholder="For example, read before bed"
          maxLength={60}
          returnKeyType="done"
        />
      </View>
    </StepLayout>
  );
}
