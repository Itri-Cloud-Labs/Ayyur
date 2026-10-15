import { createContext, useContext } from 'react';
import { useColorScheme } from 'react-native';

import { day, fixed, night, type Palette } from './palette';

/** Text placed on any bright fill. The same in both themes. */
export const ON_COLOR = fixed.onColor;

/** Every colour for one theme: its own shades plus the fills shared by both. */
export type Colors = Palette & typeof fixed;
export type ColorName = keyof Colors;

// Two fixed objects, so a theme's colours keep one identity and styles built from them can be cached.
const NIGHT: Colors = { ...night, ...fixed };
const DAY: Colors = { ...day, ...fixed };

/** Set by NightScope so the subtree uses the night theme whatever the system is set to. */
export const SchemeOverride = createContext<'dark' | 'light' | null>(null);

/** The current theme's colours. */
export function useThemeColors(): Colors {
  const system = useColorScheme();
  const forced = useContext(SchemeOverride);
  return (forced ?? system) === 'dark' ? NIGHT : DAY;
}

/** A hex colour at an opacity, for the few translucent fills. */
export function withAlpha(hex: string, alpha: number) {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
