import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSyncExternalStore } from 'react';

import { type Answers, initialAnswers } from './types';

// Onboarding state, kept outside React so it survives leaving the onboarding route (the summary, Home
// and the You tab read it). While the interview is in progress it is also written to the device as a
// draft, so closing the app resumes on the same screen. It is not the profile record: when storage
// exists, this module is the one place to swap for it.

type State = {
  answers: Answers;
  completed: boolean;
  /** The step to reopen on, for resuming. */
  stepId: string | null;
  /** Furthest progress reached, 0 to 1. Progress never moves backwards. */
  progress: number;
  hydrated: boolean;
};

const DRAFT_KEY = 'ayyur.onboarding.draft.v1';

let state: State = { answers: initialAnswers, completed: false, stepId: null, progress: 0, hydrated: false };
const listeners = new Set<() => void>();
let saveTimer: ReturnType<typeof setTimeout> | undefined;

function emit(next: State) {
  state = next;
  listeners.forEach((listener) => listener());
  if (!state.hydrated) return;
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    // A finished interview doesn't resume: the next launch starts fresh until there is a real profile.
    const write = state.completed
      ? AsyncStorage.removeItem(DRAFT_KEY)
      : AsyncStorage.setItem(DRAFT_KEY, JSON.stringify({ answers: state.answers, stepId: state.stepId, progress: state.progress }));
    write.catch(() => {});
  }, 250);
}

export const onboardingStore = {
  get: () => state,
  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
  /** Loads a draft left by an earlier session, if any. Safe to call more than once. */
  async hydrate() {
    if (state.hydrated) return;
    try {
      const raw = await AsyncStorage.getItem(DRAFT_KEY);
      const draft = raw ? (JSON.parse(raw) as Partial<State>) : null;
      emit({
        ...state,
        hydrated: true,
        answers: draft?.answers ? { ...initialAnswers, ...draft.answers } : state.answers,
        stepId: draft?.stepId ?? null,
        progress: draft?.progress ?? 0,
      });
    } catch {
      emit({ ...state, hydrated: true });
    }
  },
  setAnswers(patch: Partial<Answers>) {
    emit({ ...state, answers: { ...state.answers, ...patch } });
  },
  setStep(stepId: string, progress: number) {
    emit({ ...state, stepId, progress: Math.max(state.progress, progress) });
  },
  complete() {
    emit({ ...state, completed: true, stepId: null });
  },
  /** Starts again from the first screen with nothing answered. */
  reset() {
    emit({ ...state, answers: initialAnswers, completed: false, stepId: null, progress: 0 });
  },
};

export function useOnboardingState() {
  return useSyncExternalStore(onboardingStore.subscribe, onboardingStore.get, onboardingStore.get);
}

/**
 * One slice of the state. The component re-renders only when that slice changes, not on every
 * keystroke in onboarding. Selectors must return a primitive or a reference kept in the state.
 */
export function useOnboarding<T>(select: (state: State) => T) {
  const get = () => select(state);
  return useSyncExternalStore(onboardingStore.subscribe, get, get);
}
