import { useEffect, useRef, useState } from 'react';
import { type TextInput, View } from 'react-native';

import { Button } from '@/components/button';

import { intentions, practiceOptions } from '../data';
import { useFlow } from '../flow';
import { StepLayout } from '../shell';
import type { Background, Gender, Practice } from '../types';
import { Constellation } from '../ui/constellation';
import { Field } from '../ui/controls';
import { OptionList } from '../ui/options';
import { Tile } from '../ui/tile';
import { YearDial } from '../ui/year-dial';
import { useAutoAdvance } from './shared';

export function Name() {
  const { answers, set, next } = useFlow();
  const input = useRef<TextInput>(null);
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
        hint: 'Just what you’d like me to call you. It stays on this phone.',
      }}
      footer={<Button label="Continue" onPress={next} disabled={!trimmed} />}>
      <Field
        ref={input}
        autoFocus
        value={answers.name}
        onChangeText={(name) => set({ name })}
        placeholder="First name or nickname"
        accessibilityLabel="Your name"
        autoCapitalize="words"
        autoComplete="given-name"
        returnKeyType="next"
        maxLength={40}
        onSubmitEditing={() => trimmed && next()}
      />
    </StepLayout>
  );
}

export function BirthYear() {
  const { answers, set, next } = useFlow();
  const age = answers.birthYear ? new Date().getFullYear() - answers.birthYear : null;
  return (
    <StepLayout
      fill={300}
      cue={{
        expression: answers.birthYear ? 'happy' : 'curious',
        say: age !== null ? `So you’re about ${age}.` : 'What year were you born?',
        hint: 'I use it to speak to you in the right way. I never show it to anyone.',
      }}
      footer={<Button label="Continue" onPress={next} disabled={!answers.birthYear} />}>
      <YearDial value={answers.birthYear} onChange={(birthYear) => set({ birthYear })} />
    </StepLayout>
  );
}

export function GenderStep() {
  const { answers, set } = useFlow();
  const advance = useAutoAdvance();
  const choose = (gender: Gender) => {
    set({ gender, jumuah: null });
    advance();
  };
  return (
    <StepLayout
      fill={280}
      cue={{
        expression: answers.gender ? 'happy' : 'curious',
        say: 'Are you a brother or a sister?',
        hint: 'It changes a few things in how I set up your prayers.',
      }}>
      <View accessibilityRole="radiogroup" className="flex-1 gap-3">
        <Tile
          role="radio"
          title="Brother"
          detail="Jumu’ah reminders on, and the option to track praying in congregation."
          selected={answers.gender === 'male'}
          onPress={() => choose('male')}
        />
        <Tile
          role="radio"
          title="Sister"
          detail="Jumu’ah reminders are up to you, and you can mark days when prayer isn’t due."
          selected={answers.gender === 'female'}
          onPress={() => choose('female')}
        />
      </View>
    </StepLayout>
  );
}

export function BackgroundStep() {
  const { answers, set } = useFlow();
  const advance = useAutoAdvance(1300);
  return (
    <StepLayout
      cue={{
        expression: answers.background ? 'gentle' : 'listening',
        say: answers.background ? 'Thank you for telling me.' : 'Were you born Muslim, or did you embrace Islam later?',
        hint: 'Either way, it doesn’t tell me what you know. It only helps me choose my words.',
      }}>
      <OptionList<Background>
        value={answers.background}
        onChange={(background) => {
          set({ background });
          advance();
        }}
        options={[
          { id: 'born', label: 'Born Muslim' },
          { id: 'embraced', label: 'I embraced Islam later' },
          { id: 'private', label: 'I’d rather not say' },
        ]}
      />
    </StepLayout>
  );
}

export function PracticeStep() {
  const { answers, set } = useFlow();
  const advance = useAutoAdvance(1800);
  const chosen = practiceOptions.find((o) => o.id === answers.practice);
  return (
    <StepLayout
      cue={{
        expression: chosen ? 'happy' : 'listening',
        say: chosen ? chosen.reply : 'How do daily prayers and practices feel right now?',
        hint: 'There’s no wrong answer, and it isn’t a test. It helps me pick a starting point.',
      }}>
      <OptionList<Practice>
        value={answers.practice}
        onChange={(practice) => {
          set({ practice });
          advance();
        }}
        options={practiceOptions.map(({ id, label }) => ({ id, label }))}
      />
    </StepLayout>
  );
}

export function Goals() {
  const { answers, set, next } = useFlow();
  const top = intentions.find((g) => g.id === answers.topIntention);
  const any = answers.intentions.length > 0;
  return (
    <StepLayout
      fill={480}
      cue={{
        expression: top ? 'delighted' : any ? 'happy' : 'curious',
        say: 'What would you like my help with?',
        hint: top
          ? `Your brightest star: ${top.label.toLowerCase()}.`
          : any
            ? 'Tap a lit star again to make it your brightest.'
            : 'Tap the stars that matter to you. Pick as many as you like.',
      }}
      footer={<Button label="Continue" onPress={next} />}>
      <Constellation
        goals={intentions}
        lit={answers.intentions}
        brightest={answers.topIntention}
        onChange={(lit, brightest) => set({ intentions: lit, topIntention: brightest })}
      />
    </StepLayout>
  );
}
