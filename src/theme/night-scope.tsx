import { vars } from 'nativewind';
import type { ReactNode } from 'react';
import { View } from 'react-native';

import { SchemeOverride } from './colors';

// The night values from global.css, applied to a subtree whatever the system theme is.
const NIGHT = vars({
  '--color-canvas': '9 14 31',
  '--color-surface': '20 27 46',
  '--color-raised': '32 41 65',
  '--color-line': '51 60 85',
  '--color-ink': '240 243 252',
  '--color-ink-muted': '181 190 210',
  '--color-ink-subtle': '143 152 175',
  '--color-moon-soft': '58 44 0',
  '--color-moon-text': '253 206 62',
  '--color-prayer-soft': '26 46 75',
  '--color-prayer-text': '149 192 255',
  '--color-quran-soft': '3 56 25',
  '--color-quran-text': '94 227 139',
  '--color-fasting-soft': '71 35 6',
  '--color-fasting-text': '255 165 102',
  '--color-habits-soft': '53 37 71',
  '--color-habits-text': '209 168 255',
  '--color-tasks-soft': '0 53 56',
  '--color-tasks-text': '80 223 230',
  '--color-frozen-soft': '34 48 54',
  '--color-frozen-text': '191 233 251',
  '--color-danger-soft': '81 24 23',
  '--color-danger-text': '255 160 152',
});

/** Renders its children in the night theme. Onboarding uses it: the whole flow is one night sky. */
export function NightScope({ children }: { children: ReactNode }) {
  return (
    <SchemeOverride.Provider value="dark">
      <View style={[{ flex: 1 }, NIGHT]}>{children}</View>
    </SchemeOverride.Provider>
  );
}
