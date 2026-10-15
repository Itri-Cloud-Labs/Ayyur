import { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Platform } from 'react-native';

import { useFlowNav } from '../flow';

/** Whether VoiceOver or TalkBack is running, kept up to date. */
export function useScreenReader() {
  const [on, setOn] = useState(false);
  useEffect(() => {
    // react-native-web always answers true, which would switch auto-advance off in the browser build.
    if (Platform.OS === 'web') return;
    AccessibilityInfo.isScreenReaderEnabled()
      .then(setOn)
      .catch(() => {});
    const sub = AccessibilityInfo.addEventListener('screenReaderChanged', setOn);
    return () => sub.remove();
  }, []);
  return on;
}

/**
 * Moves on a moment after a binary choice, once Ayyur's reaction has shown. Only for two-way tiles,
 * and never while a screen reader is running, so nobody is moved on mid-announcement.
 */
export function useAutoAdvance() {
  const { next, editing } = useFlowNav();
  const screenReader = useScreenReader();
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);
  return () => {
    if (screenReader) return;
    clearTimeout(timer.current);
    timer.current = setTimeout(next, editing ? 400 : 600);
  };
}
