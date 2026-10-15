import { StyleSheet, type TextStyle } from 'react-native';

import { type Colors, useThemeColors } from './colors';

// Ayyur's type, shape and spacing tokens. DESIGN.md documents what each one is for.

/** Weight is chosen by family: static font files ignore fontWeight on Android. */
export const font = {
  body: 'Rubik_400Regular',
  medium: 'Rubik_500Medium',
  heading: 'Rubik_700Bold',
  display: 'Rubik_800ExtraBold',
} as const;

export const size = {
  caption: { fontSize: 13, lineHeight: 18 },
  label: { fontSize: 15, lineHeight: 20 },
  body: { fontSize: 17, lineHeight: 24 },
  title: { fontSize: 20, lineHeight: 26 },
  headline: { fontSize: 24, lineHeight: 30 },
  display: { fontSize: 32, lineHeight: 38 },
  hero: { fontSize: 44, lineHeight: 48 },
} as const;

export const radius = { control: 16, card: 16, sheet: 20, full: 9999 } as const;

/** The height of the edge a raised control sinks onto. */
export const LIP = 4;

/** A text style from a family, a size and a colour. */
export const text = (family: keyof typeof font, scale: keyof typeof size, color: string): TextStyle => ({
  fontFamily: font[family],
  ...size[scale],
  color,
});

/**
 * Styles that depend on the theme. The sheet is built once per theme and cached, so rendering never
 * builds styles; components call the returned hook.
 */
export function themedStyles<T extends StyleSheet.NamedStyles<T>>(build: (c: Colors) => T) {
  const cache = new Map<Colors, T>();
  return function useStyles(): T {
    const c = useThemeColors();
    let sheet = cache.get(c);
    if (!sheet) {
      sheet = StyleSheet.create(build(c));
      cache.set(c, sheet);
    }
    return sheet;
  };
}
