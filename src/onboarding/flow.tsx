import { createContext, type ReactNode, useCallback, useContext, useMemo, useState } from 'react';

import type { Expression } from '@/components/ayyur/layers';

import { onboardingStore, useOnboardingState } from './store';
import { type Answers, initialAnswers } from './types';

export type Part = 'arrive' | 'you' | 'prayer' | 'quran' | 'days' | 'yourday' | 'plan';

export const PART_NAMES: Record<Part, string> = {
  arrive: 'Hello',
  you: 'You',
  prayer: 'Prayer',
  quran: 'Quran',
  days: 'Fasting and habits',
  yourday: 'Your day',
  plan: 'Your plan',
};

export type StepDef = {
  id: string;
  part: Part;
  /** Optional steps show Skip, which clears `keys` back to their starting values. */
  optional?: boolean;
  keys?: (keyof Answers)[];
  /** Leave out when it returns false, for follow-ups that only apply to some answers. */
  when?: (answers: Answers) => boolean;
  Component: () => ReactNode;
};

/** What Ayyur does on the current step. The shell renders him; steps only describe him. */
export type AyyurCue = {
  expression: Expression;
  /** His line: the question, in his voice. */
  say: string;
  /** A short explanation under the question, in the same centred block. */
  hint?: string;
  /** `stage` makes him large and central; `host` keeps him small above the question. */
  pose?: 'stage' | 'host';
  look?: -1 | 0 | 1;
  /** Bursts of stars around him, for the one celebration at the end. */
  celebrate?: boolean;
  /** He flies down into the tab bar, as onboarding hands over to the app. */
  exit?: boolean;
};

type Flow = {
  answers: Answers;
  set: (patch: Partial<Answers>) => void;
  step: StepDef;
  index: number;
  total: number;
  direction: 1 | -1;
  next: () => void;
  back: () => void;
  skip: () => void;
  goTo: (id: string, fromSummary?: boolean) => void;
  canGoBack: boolean;
  /** True while a step was opened from the summary to change it. */
  editing: boolean;
  cue: AyyurCue;
  setCue: (cue: AyyurCue) => void;
};

const FlowContext = createContext<Flow | null>(null);

export function useFlow() {
  const flow = useContext(FlowContext);
  if (!flow) throw new Error('useFlow must be used inside FlowProvider');
  return flow;
}

export function FlowProvider({
  steps,
  onComplete,
  children,
}: {
  steps: StepDef[];
  onComplete: () => void;
  children: ReactNode;
}) {
  const { answers } = useOnboardingState();
  const [currentId, setCurrentId] = useState(steps[0].id);
  const [direction, setDirection] = useState<1 | -1>(1);
  const [editing, setEditing] = useState(false);
  const [cue, setCue] = useState<AyyurCue>({ expression: 'happy', say: '', pose: 'stage' });

  const visible = useMemo(() => steps.filter((s) => !s.when || s.when(answers)), [answers, steps]);
  const found = visible.findIndex((s) => s.id === currentId);
  // If an answer hid the current step, stay at the position it held.
  const index = found >= 0 ? found : Math.min(visible.length - 1, steps.findIndex((s) => s.id === currentId));
  const step = visible[index];

  const set = useCallback((patch: Partial<Answers>) => onboardingStore.setAnswers(patch), []);

  const move = useCallback(
    (to: number, dir: 1 | -1) => {
      // Visibility can change as answers change, so read the latest answers here.
      const latest = steps.filter((s) => !s.when || s.when(onboardingStore.get().answers));
      if (to >= latest.length) return onComplete();
      const target = latest[Math.max(0, to)];
      setDirection(dir);
      setCurrentId(target.id);
    },
    [onComplete, steps],
  );

  const toSummary = useCallback(() => {
    setEditing(false);
    setDirection(1);
    setCurrentId('summary');
  }, []);

  const next = useCallback(() => {
    if (editing) return toSummary();
    const latest = steps.filter((s) => !s.when || s.when(onboardingStore.get().answers));
    move(latest.findIndex((s) => s.id === step.id) + 1, 1);
  }, [editing, move, step.id, steps, toSummary]);

  const back = useCallback(() => {
    if (editing) return toSummary();
    move(index - 1, -1);
  }, [editing, index, move, toSummary]);

  const skip = useCallback(() => {
    if (step.keys) {
      const cleared: Partial<Answers> = {};
      for (const key of step.keys) (cleared as Record<string, unknown>)[key] = initialAnswers[key];
      onboardingStore.setAnswers(cleared);
    }
    next();
  }, [next, step.keys]);

  const goTo = useCallback((id: string, fromSummary = false) => {
    setEditing(fromSummary);
    setDirection(1);
    setCurrentId(id);
  }, []);

  const value: Flow = {
    answers,
    set,
    step,
    index,
    total: visible.length,
    direction,
    next,
    back,
    skip,
    goTo,
    canGoBack: editing || index > 0,
    editing,
    cue,
    setCue,
  };

  return <FlowContext.Provider value={value}>{children}</FlowContext.Provider>;
}
