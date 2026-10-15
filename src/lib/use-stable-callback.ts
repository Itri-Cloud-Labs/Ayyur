import { useCallback, useLayoutEffect, useRef } from 'react';

/**
 * A function that keeps one identity for the component's life but always calls the latest `fn`. Lets
 * memoized children take a callback without re-rendering each time the parent does.
 */
export function useStableCallback<A extends unknown[], R>(fn: (...args: A) => R) {
  const latest = useRef(fn);
  useLayoutEffect(() => {
    latest.current = fn;
  });
  return useCallback((...args: A) => latest.current(...args), []);
}
