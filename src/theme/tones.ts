import type { ColorName } from './colors';

// The colours each tone gives a control, as names in useThemeColors(). Gold belongs to Ayyur and the
// primary action, so selection outside a module is neutral (ink).
const hue = <H extends 'moon' | 'prayer' | 'quran' | 'fasting' | 'habits' | 'tasks'>(h: H) =>
  ({
    fill: h,
    lip: `${h}Deep`,
    border: h,
    soft: `${h}Soft`,
    text: `${h}Text`,
    lipSelected: `${h}Deep`,
  }) as const satisfies Record<string, ColorName>;

export const TONES = {
  neutral: { fill: 'ink', lip: 'line', border: 'ink', soft: 'raised', text: 'ink', lipSelected: 'inkSubtle' },
  moon: hue('moon'),
  prayer: hue('prayer'),
  quran: hue('quran'),
  fasting: hue('fasting'),
  habits: hue('habits'),
  tasks: hue('tasks'),
} as const satisfies Record<string, Record<'fill' | 'lip' | 'border' | 'soft' | 'text' | 'lipSelected', ColorName>>;

export type Tone = keyof typeof TONES;
