import { wants } from '../data';
import type { StepDef } from '../flow';
import { Welcome } from './arrive';
import { Fasting, Habits } from './days';
import { Complete, Summary } from './plan';
import { Location, MadhhabStep, Method, PrayerExtras, PrayerFocus, Reminders } from './prayer';
import { QuranPlan, QuranReadingStep } from './quran';
import { BirthYear, GenderStep, Goals, Name, PracticeStep } from './you';
import { Be, Day, Note, Privacy } from './yourday';

// The interview, in order. Each screen asks one thing and keeps its follow-ups on the same screen;
// whole sections are left out when the user's goals don't touch them (the summary offers them back).
export const STEPS: StepDef[] = [
  { id: 'welcome', part: 'arrive', beat: 'stage', Component: Welcome },

  { id: 'name', part: 'you', beat: 'talk', answered: (a) => a.name.trim().length > 0, Component: Name },
  {
    id: 'birth-year',
    part: 'you',
    beat: 'talk',
    required: { ready: (a) => a.birthYear !== null, reason: 'Enter the four digits of your birth year.' },
    Component: BirthYear,
  },
  { id: 'gender', part: 'you', beat: 'talk', answered: (a) => a.gender !== null, Component: GenderStep },
  { id: 'practice', part: 'you', beat: 'pick', answered: (a) => a.practice !== null || a.background !== null, Component: PracticeStep },
  { id: 'goals', part: 'you', beat: 'pick', answered: (a) => a.intentions.length > 0, Component: Goals },

  {
    id: 'location',
    part: 'prayer',
    beat: 'talk',
    tone: 'prayer',
    required: { ready: (a) => a.city !== null, reason: 'Use your location or choose a city to continue.' },
    Component: Location,
  },
  { id: 'madhhab', part: 'prayer', beat: 'pick', tone: 'prayer', answered: (a) => a.madhhab !== null, Component: MadhhabStep },
  { id: 'method', part: 'prayer', beat: 'pick', tone: 'prayer', Component: Method },
  { id: 'prayer-focus', part: 'prayer', beat: 'tool', tone: 'prayer', answered: (a) => a.prayerFocus !== null, Component: PrayerFocus },
  {
    id: 'prayer-extras',
    part: 'prayer',
    beat: 'pick',
    tone: 'prayer',
    answered: (a) => a.extraPrayers.length > 0 || a.congregation === true,
    when: (a) => a.gender === 'male' || (a.practice !== 'new' && a.practice !== 'starting'),
    Component: PrayerExtras,
  },
  { id: 'reminders', part: 'prayer', beat: 'pick', tone: 'prayer', Component: Reminders },

  {
    id: 'quran-reading',
    part: 'quran',
    beat: 'pick',
    tone: 'quran',
    answered: (a) => a.quranReading !== null,
    Component: QuranReadingStep,
  },
  {
    id: 'quran-plan',
    part: 'quran',
    beat: 'pick',
    tone: 'quran',
    answered: (a) => a.quranGoals.length > 0,
    when: (a) => wants(a, 'quran'),
    Component: QuranPlan,
  },

  {
    id: 'fasting',
    part: 'days',
    beat: 'pick',
    tone: 'fasting',
    answered: (a) => a.fasts.length > 0,
    when: (a) => wants(a, 'fasting'),
    Component: Fasting,
  },
  {
    id: 'habits',
    part: 'days',
    beat: 'pick',
    tone: 'habits',
    answered: (a) => a.habits.length > 0 || a.ownHabit.trim().length > 0,
    when: (a) => wants(a, 'habits'),
    Component: Habits,
  },

  { id: 'day', part: 'yourday', beat: 'pick', answered: (a) => a.nudges !== null, Component: Day },
  { id: 'be', part: 'yourday', beat: 'pick', answered: (a) => a.voice !== null, Component: Be },
  { id: 'privacy', part: 'yourday', beat: 'calm', Component: Privacy },
  { id: 'note', part: 'yourday', beat: 'talk', answered: (a) => a.note.trim().length > 0, Component: Note },

  { id: 'summary', part: 'plan', beat: 'pick', Component: Summary },
  { id: 'complete', part: 'plan', beat: 'stage', Component: Complete },
];
