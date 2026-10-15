import { MoonIcon } from 'phosphor-react-native/src/icons/Moon';
import { Text, View } from 'react-native';

import { Button } from '@/components/button';
import { useThemeColors } from '@/theme/colors';

import { fasts, habitOptions, hijriConventions, hijriPreview } from '../data';
import { useFlow } from '../flow';
import { StepLayout } from '../shell';
import type { HijriConvention } from '../types';
import { Field, SwitchRow } from '../ui/controls';
import { Chips, OptionList, Segmented } from '../ui/options';

export function Hijri() {
  const { answers, set, next } = useFlow();
  const colors = useThemeColors();
  return (
    <StepLayout
      cue={{
        expression: answers.hijriConvention ? 'happy' : 'thinking',
        say: 'How should I count the Islamic months?',
        hint: 'Months start with the new moon, so places can be a day apart. Pick what your community follows.',
      }}
      footer={<Button label="Continue" onPress={next} />}>
      <View
        accessible
        accessibilityLabel={`Today would be ${hijriPreview(answers.hijriOffset)}. Sample date.`}
        className="mb-4 flex-row items-center gap-3 rounded-card bg-surface p-4">
        <MoonIcon size={26} weight="fill" color={colors.moonText} />
        <View className="flex-1">
          <Text className="font-heading text-title text-ink">{hijriPreview(answers.hijriOffset)}</Text>
          <Text className="font-body text-caption text-ink-subtle">Today, as a sample date</Text>
        </View>
      </View>
      <OptionList<HijriConvention>
        value={answers.hijriConvention}
        onChange={(hijriConvention) => set({ hijriConvention })}
        options={hijriConventions.map((c) => ({ id: c.id, label: c.name, detail: c.about }))}
      />
      <View className="mt-5">
        <Segmented
          label="Adjust by a day"
          value={String(answers.hijriOffset) as '-1' | '0' | '1'}
          onChange={(v) => set({ hijriOffset: Number(v) as -1 | 0 | 1 })}
          options={[
            { id: '-1', label: 'A day earlier' },
            { id: '0', label: 'No change' },
            { id: '1', label: 'A day later' },
          ]}
        />
      </View>
    </StepLayout>
  );
}

export function Fasting() {
  const { answers, set, next } = useFlow();
  const any = answers.fasts.length > 0;
  return (
    <StepLayout
      cue={{
        expression: any ? 'delighted' : 'curious',
        say: 'Would you like to work towards any voluntary fasts?',
        hint: 'I’ll show them on Home on their days. Ramadan gets its own setup when it’s near.',
      }}
      footer={<Button label={any ? 'Continue' : 'None for now'} onPress={next} />}>
      <Chips tone="fasting" value={answers.fasts} onChange={(f) => set({ fasts: f })} options={fasts} />
      {any ? (
        <View className="mt-4">
          <SwitchRow
            tone="fasting"
            title="Remind me the evening before"
            detail="So there’s time to plan suhoor"
            value={answers.fastReminder}
            onChange={(fastReminder) => set({ fastReminder })}
          />
        </View>
      ) : null}
    </StepLayout>
  );
}

export function Habits() {
  const { answers, set, next } = useFlow();
  const count = answers.habits.length + (answers.ownHabit.trim() ? 1 : 0);
  const many = count > 3;
  return (
    <StepLayout
      cue={{
        expression: many ? 'gentle' : count ? 'happy' : 'curious',
        say: many ? 'Three is a good start. You can add more any time.' : 'Pick a few good habits to start with.',
      }}
      footer={<Button label={count ? 'Continue' : 'Not right now'} onPress={next} />}>
      <Chips
        tone="habits"
        value={answers.habits}
        onChange={(habits) => set({ habits })}
        options={habitOptions.map((h) => ({ id: h, label: h }))}
      />
      <View className="mt-5">
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
