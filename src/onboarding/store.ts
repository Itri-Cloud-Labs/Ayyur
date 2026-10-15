import { useSyncExternalStore } from 'react';

import { type Answers, initialAnswers } from './types';

// Onboarding state for this app session. Kept outside React so it survives leaving the onboarding
// route (the summary and the You tab read it). Nothing is saved: closing the app forgets it.
// When storage exists, this module is the one place to swap for the profile record.

type State = {
  answers: Answers;
  completed: boolean;
};

let state: State = { answers: initialAnswers, completed: false };
const listeners = new Set<() => void>();

function emit(next: State) {
  state = next;
  listeners.forEach((listener) => listener());
}

export const onboardingStore = {
  get: () => state,
  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
  setAnswers(patch: Partial<Answers>) {
    emit({ ...state, answers: { ...state.answers, ...patch } });
  },
  complete() {
    emit({ ...state, completed: true });
  },
  /** Starts again from the first screen with nothing answered. */
  reset() {
    emit({ answers: initialAnswers, completed: false });
  },
};

export function useOnboardingState() {
  return useSyncExternalStore(onboardingStore.subscribe, onboardingStore.get, onboardingStore.get);
}
