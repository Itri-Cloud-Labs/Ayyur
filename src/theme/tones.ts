// Class names for each colour that can own a control, written out in full so Tailwind finds them.
// `color` is the matching key in useThemeColors(), for icons.
export const TONES = {
  moon: {
    fill: 'bg-moon',
    lip: 'border-moon-deep',
    border: 'border-moon',
    soft: 'bg-moon-soft',
    text: 'text-moon-text',
    color: 'moonText',
  },
  prayer: {
    fill: 'bg-prayer',
    lip: 'border-prayer-deep',
    border: 'border-prayer',
    soft: 'bg-prayer-soft',
    text: 'text-prayer-text',
    color: 'prayerText',
  },
  quran: {
    fill: 'bg-quran',
    lip: 'border-quran-deep',
    border: 'border-quran',
    soft: 'bg-quran-soft',
    text: 'text-quran-text',
    color: 'quranText',
  },
  fasting: {
    fill: 'bg-fasting',
    lip: 'border-fasting-deep',
    border: 'border-fasting',
    soft: 'bg-fasting-soft',
    text: 'text-fasting-text',
    color: 'fastingText',
  },
  habits: {
    fill: 'bg-habits',
    lip: 'border-habits-deep',
    border: 'border-habits',
    soft: 'bg-habits-soft',
    text: 'text-habits-text',
    color: 'habitsText',
  },
  tasks: {
    fill: 'bg-tasks',
    lip: 'border-tasks-deep',
    border: 'border-tasks',
    soft: 'bg-tasks-soft',
    text: 'text-tasks-text',
    color: 'tasksText',
  },
} as const;

export type Tone = keyof typeof TONES;
