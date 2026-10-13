import { createContext, type ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// The bar floats over the screen, so these are shared by the bar and by screens that pad for it.
export const BAR_INSET = 16;
export const BAR_MIN_HEIGHT = 70;
export const MOON_RAISE = 22;

type Visibility = {
  hidden: boolean;
  hold: () => () => void;
};

const TabBarVisibility = createContext<Visibility | null>(null);

export function TabBarVisibilityProvider({ children }: { children: ReactNode }) {
  const [holds, setHolds] = useState(0);

  // `hold` keeps one identity so a screen's effect does not re-run when the count changes.
  const hold = useCallback(() => {
    setHolds((n) => n + 1);
    return () => setHolds((n) => n - 1);
  }, []);

  const value = useMemo<Visibility>(() => ({ hidden: holds > 0, hold }), [holds, hold]);

  return <TabBarVisibility.Provider value={value}>{children}</TabBarVisibility.Provider>;
}

export function useTabBarHidden() {
  return useContext(TabBarVisibility)?.hidden ?? false;
}

/**
 * Hides the tab bar while the calling screen is mounted. Worship screens (the Quran reader,
 * adhkar, a prayer in progress) call this so the moon is not on screen during the act.
 */
export function useHideTabBar(active = true) {
  const hold = useContext(TabBarVisibility)?.hold;

  useEffect(() => {
    if (!active || !hold) return;
    return hold();
  }, [active, hold]);
}

/** Distance from the bottom edge of the screen to the bottom of the bar. */
export function useTabBarOffset() {
  const { bottom } = useSafeAreaInsets();
  return Math.max(bottom, BAR_INSET);
}

/** Bottom padding a scrolling screen needs so its last row clears the bar and the raised moon. */
export function useTabBarSpace() {
  return useTabBarOffset() + BAR_MIN_HEIGHT + MOON_RAISE + BAR_INSET;
}
