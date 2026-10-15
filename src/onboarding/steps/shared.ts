import { useEffect, useRef } from 'react';

import { useFlow } from '../flow';

/** Moves on a moment after a single choice, so Ayyur's reaction is seen first. */
export function useAutoAdvance(delay = 800) {
  const { next } = useFlow();
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);
  return () => {
    clearTimeout(timer.current);
    timer.current = setTimeout(next, delay);
  };
}
