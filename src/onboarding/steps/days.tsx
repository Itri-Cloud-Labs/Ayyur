import { MoonIcon } from 'phosphor-react-native/src/icons/Moon';
import { StyleSheet, Text, View } from 'react-native';

import { night } from '@/theme/palette';

import { fasts, habitOptions, hijriConventions, hijriPreview } from '../data';
import { useFlow } from '../flow';
import { StepLayout } from '../shell';
import type { HijriConvention } from '../types';
import { Field, SwitchRow } from '../ui/controls';
import { Chips, OptionList, Segmented } from '../ui/options';
import { ss } from './styles';

/** Fasts, with the Hijri convention as a follow-up when a fast depends on the Islamic date. */
export function Fasting() {
  const { answers, set } = useFlow();
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
        <View style={styles.mt5}>
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
        <View style={styles.dates}>
          <Text accessibilityRole="header" style={[ss.title, ss.centred]}>
            How should I count the Islamic months?
          </Text>
          <Text style={ss.smallCentred}>
            Months start with the new moon, so places can be a day apart. Pick what your community follows.
          </Text>
          <View
            accessible
            accessibilityLabel={`Today would be ${hijriPreview(answers.hijriOffset)}, a sample date`}
            style={[ss.card, ss.row]}>
            <MoonIcon size={24} weight="fill" color={night.inkMuted} />
            <View style={ss.fill}>
              <Text style={ss.title}>{hijriPreview(answers.hijriOffset)}</Text>
              <Text style={ss.small}>Today, as a sample date</Text>
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
      <View style={styles.mt6}>
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

const styles = StyleSheet.create({
  mt5: { marginTop: 20 },
  mt6: { marginTop: 24 },
  dates: { marginTop: 24, gap: 12 },
});
