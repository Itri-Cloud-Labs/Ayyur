import type { PrayerId } from '@/data/sample';

// Every answer onboarding collects. `null` means not answered (skipped or not reached); the defaults
// for unanswered questions are applied by whoever reads the profile, per docs/onboarding.md section 5.

export type Gender = 'male' | 'female';
export type Background = 'born' | 'embraced' | 'private';
export type Practice = 'new' | 'starting' | 'returning' | 'unsteady' | 'steady';
export type Madhhab = 'hanafi' | 'maliki' | 'shafii' | 'hanbali' | 'none';
export type Asr = 'standard' | 'hanafi';
export type Permission = 'unasked' | 'granted' | 'denied';
export type ReminderWhen = 'at' | 'before' | 'both' | 'none';
export type ReminderSound = 'adhan' | 'chime' | 'silent';
export type QuranReading = 'letters' | 'slowly' | 'comfortable' | 'translation';
export type QuranGoal = 'read' | 'memorise' | 'revise' | 'understand';
export type QuranKnown = 'nothing' | 'short-surahs' | 'juz-amma' | 'several-juz' | 'whole';
export type QuranTime = 'after-fajr' | 'day' | 'after-maghrib' | 'before-sleep' | 'any';
export type Nudges = 'prayers' | 'little' | 'on-track';
export type Voice = 'gentle' | 'direct' | 'teacher';
export type HijriConvention = 'umm-al-qura' | 'sighting' | 'calculated';

export type City = { id: string; name: string; country: string; countryCode: string };

export type Answers = {
  account: { kind: 'account'; provider: string } | { kind: 'local' } | null;
  name: string;
  birthYear: number | null;
  gender: Gender | null;
  background: Background | null;
  practice: Practice | null;
  intentions: string[];
  topIntention: string | null;

  locationPermission: Permission;
  city: City | null;
  /** How the city was found. */
  cityFrom: 'device' | 'search' | null;
  madhhab: Madhhab | null;
  asr: Asr | null;
  method: string | null;
  /** Minutes added to each prayer time, to match a local mosque. */
  offsets: Record<PrayerId, number>;
  prayerFocus: PrayerId | 'all' | null;
  congregation: boolean | null;
  extraPrayers: string[];
  reminderWhen: ReminderWhen;
  reminderSound: ReminderSound;
  jumuah: boolean | null;

  quranReading: QuranReading | null;
  translation: string;
  quranGoals: QuranGoal[];
  quranAmount: string | null;
  quranKnown: QuranKnown | null;
  quranTime: QuranTime | null;

  hijriConvention: HijriConvention | null;
  hijriOffset: -1 | 0 | 1;
  fasts: string[];
  fastReminder: boolean;
  habits: string[];
  ownHabit: string;

  /** Minutes after midnight. */
  sleepAt: number;
  wakeAt: number;
  fajrThroughQuiet: boolean;
  nudges: Nudges | null;
  notificationPermission: Permission;
  sounds: boolean;
  haptics: boolean;
  celebrations: boolean;
  voice: Voice | null;

  cloudSync: boolean;
  aiContext: boolean;
  checkIns: boolean;
  note: string;
};

export const initialAnswers: Answers = {
  account: null,
  name: '',
  birthYear: null,
  gender: null,
  background: null,
  practice: null,
  intentions: [],
  topIntention: null,
  locationPermission: 'unasked',
  city: null,
  cityFrom: null,
  madhhab: null,
  asr: null,
  method: null,
  offsets: { fajr: 0, dhuhr: 0, asr: 0, maghrib: 0, isha: 0 },
  prayerFocus: null,
  congregation: null,
  extraPrayers: [],
  reminderWhen: 'at',
  reminderSound: 'chime',
  jumuah: null,
  quranReading: null,
  translation: 'saheeh',
  quranGoals: [],
  quranAmount: null,
  quranKnown: null,
  quranTime: null,
  hijriConvention: null,
  hijriOffset: 0,
  fasts: [],
  fastReminder: true,
  habits: [],
  ownHabit: '',
  sleepAt: 22 * 60 + 30,
  wakeAt: 6 * 60 + 30,
  fajrThroughQuiet: true,
  nudges: null,
  notificationPermission: 'unasked',
  sounds: true,
  haptics: true,
  celebrations: true,
  voice: null,
  cloudSync: false,
  aiContext: false,
  checkIns: false,
  note: '',
};
