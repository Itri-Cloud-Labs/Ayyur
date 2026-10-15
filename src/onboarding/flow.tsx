import { createContext, type ReactNode, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';

import type { Expression } from '@/components/ayyur/layers';
import type { Tone } from '@/theme/tones';

import { onboardingStore, useOnboarding } from './store';
import type { Answers } from './types';

export type Part = 'arrive' | 'you' | 'prayer' | 'quran' | 'days' | 'yourday' | 'plan';
const PARTS: Part[] = ['arrive', 'you', 'prayer', 'quran', 'days', 'yourday', 'plan'];

export const PART_NAMES: Record<Part, string> = {
  arrive: 'Hello',
  you: 'You',
  prayer: 'Prayer',
  quran: 'Quran',
  days: 'Fasting and habits',
  yourday: 'Your day',
  plan: 'Your plan',
};

/**
 * The kinds of moment in onboarding. Each has its own fixed layout, so screens differ in shape and
 * nothing is sized by measuring the content (which used to make Ayyur pulse).
 * - `stage`: Ayyur large and central, a few words under him (welcome, the ending).
 * - `talk`: a conversation. Ayyur big, the question under him, the answer docked by the thumb.
 * - `pick`: choosing from a list. Ayyur small, the list starts right under the question.
 * - `tool`: an interactive picture Ayyur steps into, so he leaves the top of the screen.
 * - `calm`: privacy. Ayyur small and still.
 */
export type Beat = 'stage' | 'talk' | 'pick' | 'tool' | 'calm';

export type StepDef = {
  id: string;
  part: Part;
  beat: Beat;
  /** Required steps keep Continue disabled until `ready`, and say why. Optional steps never block. */
  required?: { ready: (a: Answers) => boolean; reason: string };
  /** For optional steps: whether anything has been chosen yet ("Continue" rather than "Skip for now"). */
  answered?: (a: Answers) => boolean;
  /** Leave out when it returns false, for steps that only apply to some answers. */
  when?: (a: Answers) => boolean;
  /** The module colour for this step's primary action. Gold (Ayyur's) when absent. */
  tone?: Tone;
  Component: () => ReactNode;
};

/** What Ayyur does on the current step. The shell renders him; steps only describe him. */
export type AyyurCue = {
  expression: Expression;
  /** The question, in his voice. */
  say: string;
  /** A short reason under the question, in the same centred block. */
  hint?: string;
  look?: -1 | 0 | 1;
  /** A small icon he holds up beside him, for what the step is about. */
  badge?: 'pin' | 'bell' | 'lock';
  /** Bursts of stars around him, for the one celebration at the end. */
  celebrate?: boolean;
  /** He flies down into the tab bar, as onboarding hands over to the app. */
  exit?: boolean;
};

type Nav = {
  step: StepDef;
  progress: number;
  next: () => void;
  back: () => void;
  goTo: (id: string, fromSummary?: boolean) => void;
  /** Jumps to the summary, keeping suggestions for everything not yet answered. */
  finishWithSuggestions: () => void;
  canGoBack: boolean;
  /** True while a step was opened from the summary to change it. */
  editing: boolean;
  cue: AyyurCue;
  setCue: (cue: AyyurCue) => void;
};

type Flow = Nav & {
  answers: Answers;
  set: (patch: Partial<Answers>) => void;
};

const NavContext = createContext<Nav | null>(null);

const set = (patch: Partial<Answers>) => onboardingStore.setAnswers(patch);

/**
 * Where the user is in the flow, without the answers. The shell (the sky, the header, Ayyur) uses this,
 * so typing a name or ticking a box doesn't re-render it.
 */
export function useFlowNav() {
  const nav = useContext(NavContext);
  if (!nav) throw new Error('useFlowNav must be used inside FlowProvider');
  return nav;
}

/** The flow and the answers, for steps. Re-renders on every answer change. */
export function useFlow(): Flow {
  const nav = useFlowNav();
  const answers = useOnboarding((s) => s.answers);
  return { ...nav, answers, set };
}

const visibleSteps = (steps: StepDef[], answers: Answers) => steps.filter((s) => !s.when || s.when(answers));

export function FlowProvider({ steps, onComplete, children }: { steps: StepDef[]; onComplete: () => void; children: ReactNode }) {
  const answers = useOnboarding((s) => s.answers);
  const progress = useOnboarding((s) => s.progress);
  // Resume where a previous session stopped, if that step still exists.
  const [currentId, setCurrentId] = useState(() => {
    const { stepId } = onboardingStore.get();
    return stepId && steps.some((s) => s.id === stepId) ? stepId : steps[0].id;
  });
  const [editing, setEditing] = useState(false);
  const shownBeforeEdit = useRef<Set<string>>(new Set());
  const [cue, setCue] = useState<AyyurCue>({ expression: 'happy', say: '' });

  // Kept as the same array while the visible steps stay the same, so most answers don't touch the shell.
  const shownIds = visibleSteps(steps, answers)
    .map((s) => s.id)
    .join(',');
  const visible = useMemo(() => {
    const ids = shownIds.split(',');
    return steps.filter((s) => ids.includes(s.id));
  }, [shownIds, steps]);
  const step = visible.find((s) => s.id === currentId) ?? visible[0];

  // Progress is by part, and only ever moves forward: answers that add steps never make it shrink,
  // and changing something from the summary doesn't send it back.
  const partIndex = PARTS.indexOf(step.part);
  const inPart = visible.filter((s) => s.part === step.part);
  const within = inPart.length > 1 ? inPart.indexOf(step) / inPart.length : 0;
  const here = Math.min(1, (partIndex + within) / (PARTS.length - 1));
  useEffect(() => {
    if (!editing) onboardingStore.setStep(step.id, here);
  }, [editing, here, step.id]);

  const toSummary = useCallback(() => {
    setEditing(false);
    setCurrentId('summary');
  }, []);

  const next = useCallback(() => {
    const latest = visibleSteps(steps, onboardingStore.get().answers);
    const following = latest[latest.findIndex((s) => s.id === step.id) + 1];
    if (editing) {
      // A change can open a follow-up question (choosing "Read regularly" asks how much). Walk through
      // anything newly opened, then go back to the plan.
      if (following && !shownBeforeEdit.current.has(following.id) && following.id !== 'summary') {
        setCurrentId(following.id);
        return;
      }
      return toSummary();
    }
    if (!following) return onComplete();
    setCurrentId(following.id);
  }, [editing, onComplete, step.id, steps, toSummary]);

  const back = useCallback(() => {
    if (editing) return toSummary();
    const index = visible.findIndex((s) => s.id === step.id);
    if (index > 0) setCurrentId(visible[index - 1].id);
  }, [editing, step.id, toSummary, visible]);

  const goTo = useCallback(
    (id: string, fromSummary = false) => {
      if (fromSummary) shownBeforeEdit.current = new Set(visible.map((s) => s.id));
      setEditing(fromSummary);
      setCurrentId(id);
    },
    [visible],
  );

  const shown = Math.max(progress, editing ? 0 : here);
  const canGoBack = editing || visible.indexOf(step) > 0;
  const value = useMemo<Nav>(
    () => ({ step, progress: shown, next, back, goTo, finishWithSuggestions: toSummary, canGoBack, editing, cue, setCue }),
    [step, shown, next, back, goTo, toSummary, canGoBack, editing, cue],
  );

  return <NavContext.Provider value={value}>{children}</NavContext.Provider>;
}
