import { useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { tapHaptic } from '@/lib/haptics';

import { intentions, practiceOptions } from '../data';
import { useFlow } from '../flow';
import { StepFooter, StepLayout } from '../shell';
import type { Background, Gender, Practice } from '../types';
import { Field } from '../ui/controls';
import { Chips, OptionList } from '../ui/options';
import { Tile } from '../ui/tile';
import { validYear, YearEntry } from '../ui/year-entry';
import { useAutoAdvance } from './shared';

export function Name() {
  const { answers, set, next } = useFlow();
  const trimmed = answers.name.trim();
  // His reply waits for a pause in typing, so the line doesn't flicker with every letter.
  const [heard, setHeard] = useState(trimmed);
  useEffect(() => {
    const t = setTimeout(() => setHeard(trimmed), 550);
    return () => clearTimeout(t);
  }, [trimmed]);

  return (
    <StepLayout
      cue={{
        expression: heard ? 'delighted' : 'listening',
        say: heard ? `Nice to meet you, ${heard}!` : 'What should I call you?',
        hint: 'A first name or a nickname.',
      }}>
      <Field
        autoFocus
        value={answers.name}
        onChangeText={(name) => set({ name })}
        placeholder="Your name"
        accessibilityLabel="Your name"
        autoCapitalize="words"
        autoComplete="given-name"
        returnKeyType="next"
        maxLength={40}
        onSubmitEditing={next}
      />
    </StepLayout>
  );
}

export function BirthYear() {
  const { answers, set, next } = useFlow();
  const [text, setText] = useState(answers.birthYear ? String(answers.birthYear) : '');
  const age = answers.birthYear ? new Date().getFullYear() - answers.birthYear : null;
  return (
    <StepLayout
      cue={{
        expression: age !== null ? 'happy' : 'curious',
        say: age !== null ? `So you’re about ${age}.` : 'What year were you born?',
        hint: 'It helps me speak to you in the right way.',
      }}>
      <YearEntry
        text={text}
        onChangeText={(t) => {
          setText(t);
          set({ birthYear: validYear(t) ? Number(t) : null });
        }}
        onSubmit={() => validYear(text) && next()}
      />
    </StepLayout>
  );
}

const CONSEQUENCE: Record<Gender, string> = {
  male: 'Jumu’ah reminders on, and you can track praying in congregation.',
  female: 'Jumu’ah reminders are up to you, and you can mark days when prayer isn’t due.',
};

export function GenderStep() {
  const { answers, set } = useFlow();
  const advance = useAutoAdvance();
  const choose = (gender: Gender) => {
    set({
      gender,
      jumuah: null,
      congregation: gender === 'male' ? answers.congregation : null,
    });
    advance();
  };
  return (
    <StepLayout
      cue={{
        expression: answers.gender ? 'happy' : 'curious',
        say: 'Are you a brother or a sister?',
        hint: answers.gender ? CONSEQUENCE[answers.gender] : 'It changes a few things in how I set up prayer.',
      }}>
      <View accessibilityRole="radiogroup" className="flex-row gap-3">
        <Tile centred role="radio" title="Brother" selected={answers.gender === 'male'} onPress={() => choose('male')} />
        <Tile centred role="radio" title="Sister" selected={answers.gender === 'female'} onPress={() => choose('female')} />
      </View>
    </StepLayout>
  );
}

export function PracticeStep() {
  const { answers, set } = useFlow();
  const chosen = practiceOptions.find((o) => o.id === answers.practice);
  return (
    <StepLayout
      cue={{
        expression: chosen ? 'happy' : 'listening',
        say: chosen ? chosen.reply : 'Where are you with your practice right now?',
        hint: chosen ? undefined : 'It helps me suggest a starting point. There’s no wrong answer.',
      }}>
      <OptionList<Practice>
        value={answers.practice}
        onChange={(practice) => set({ practice })}
        options={practiceOptions.map(({ id, label }) => ({ id, label }))}
      />
      <Text className="mb-3 mt-7 text-center font-heading text-title text-ink">Were you born Muslim, or did you embrace Islam later?</Text>
      <Text className="mb-4 text-center font-body text-label text-ink-muted">
        Optional. It doesn’t tell me what you know; it only helps me choose my words.
      </Text>
      <Chips<Background>
        single
        label="Background"
        value={answers.background ? [answers.background] : []}
        onChange={([background]) => set({ background })}
        options={[
          { id: 'born', label: 'Born Muslim' },
          { id: 'embraced', label: 'Embraced Islam later' },
          { id: 'private', label: 'Rather not say' },
        ]}
      />
    </StepLayout>
  );
}

export function Goals() {
  const { answers, set, next } = useFlow();
  const lit = intentions.filter((g) => answers.intentions.includes(g.id));
  const top = lit.find((g) => g.id === answers.topIntention);

  const change = (ids: string[]) => {
    // One goal is its own brightest; a removed goal can't stay the brightest.
    const keep = answers.topIntention && ids.includes(answers.topIntention) ? answers.topIntention : null;
    set({
      intentions: ids,
      topIntention: ids.length === 1 ? ids[0] : keep,
      exploring: false,
    });
  };

  return (
    <StepLayout
      cue={{
        expression: top ? 'delighted' : lit.length ? 'happy' : 'curious',
        say: 'What would you like my help with?',
        hint: 'Pick as many as you like.',
      }}
      footer={
        <StepFooter
          extra={
            <Pressable
              accessibilityRole="button"
              onPress={() => {
                tapHaptic();
                set({ intentions: [], topIntention: null, exploring: true });
                next();
              }}
              className="min-h-[44px] items-center justify-center active:opacity-70">
              <Text className="font-medium text-label text-ink-muted">I’m just exploring for now</Text>
            </Pressable>
          }
        />
      }>
      <Chips value={answers.intentions} onChange={change} options={intentions} />
      {lit.length > 1 ? (
        <View className="mt-7">
          <Text className="mb-3 text-center font-heading text-title text-ink">Which one matters most?</Text>
          <Chips
            single
            label="Most important goal"
            value={answers.topIntention ? [answers.topIntention] : []}
            onChange={([topIntention]) => set({ topIntention })}
            options={lit}
          />
        </View>
      ) : null}
    </StepLayout>
  );
}
