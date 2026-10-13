// Class names for each colour that can own a control, written out in full so Tailwind finds them.
// `color` is the matching key in useThemeColors(), for icons.
export const TONES = {
  moon: { fill: 'bg-moon', lip: 'border-moon-deep', soft: 'bg-moon-soft', text: 'text-moon-text', color: 'moonText' },
  prayer: { fill: 'bg-prayer', lip: 'border-prayer-deep', soft: 'bg-prayer-soft', text: 'text-prayer-text', color: 'prayerText' },
  quran: { fill: 'bg-quran', lip: 'border-quran-deep', soft: 'bg-quran-soft', text: 'text-quran-text', color: 'quranText' },
  habits: { fill: 'bg-habits', lip: 'border-habits-deep', soft: 'bg-habits-soft', text: 'text-habits-text', color: 'habitsText' },
  tasks: { fill: 'bg-tasks', lip: 'border-tasks-deep', soft: 'bg-tasks-soft', text: 'text-tasks-text', color: 'tasksText' },
} as const;

export type Tone = keyof typeof TONES;
