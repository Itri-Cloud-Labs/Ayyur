import type { StepDef } from '../flow';
import { Account, Welcome } from './arrive';
import { Fasting, Habits, Hijri } from './days';
import { AsrStep, Congregation, ExtraPrayers, FineTune, Location, MadhhabStep, Method, PrayerFocus, Reminders } from './prayer';
import { Complete, Summary } from './plan';
import { QuranAmount, QuranGoals, QuranKnownStep, QuranReadingStep, QuranTimeStep, Translation } from './quran';
import { BackgroundStep, BirthYear, GenderStep, Goals, Name, PracticeStep } from './you';
import { Feel, Note, Notifications, NudgesStep, Privacy, Rhythm, VoiceStep } from './yourday';

// The whole interview, in order. Ids match docs/onboarding.md where the step exists there.
export const STEPS: StepDef[] = [
  { id: 'welcome', part: 'arrive', Component: Welcome },
  { id: 'account', part: 'arrive', Component: Account },

  { id: 'name', part: 'you', optional: true, keys: ['name'], Component: Name },
  { id: 'birth-year', part: 'you', Component: BirthYear },
  { id: 'gender', part: 'you', optional: true, keys: ['gender', 'jumuah'], Component: GenderStep },
  { id: 'background', part: 'you', optional: true, keys: ['background'], Component: BackgroundStep },
  { id: 'practice', part: 'you', optional: true, keys: ['practice'], Component: PracticeStep },
  { id: 'goals', part: 'you', optional: true, keys: ['intentions', 'topIntention'], Component: Goals },

  { id: 'location', part: 'prayer', Component: Location },
  { id: 'madhhab', part: 'prayer', optional: true, keys: ['madhhab'], Component: MadhhabStep },
  { id: 'asr', part: 'prayer', optional: true, keys: ['asr'], Component: AsrStep },
  { id: 'method', part: 'prayer', optional: true, keys: ['method'], Component: Method },
  { id: 'fine-tune', part: 'prayer', optional: true, keys: ['offsets'], Component: FineTune },
  { id: 'prayer-focus', part: 'prayer', optional: true, keys: ['prayerFocus'], Component: PrayerFocus },
  { id: 'congregation', part: 'prayer', optional: true, keys: ['congregation'], when: (a) => a.gender === 'male', Component: Congregation },
  {
    id: 'extra-prayers',
    part: 'prayer',
    optional: true,
    keys: ['extraPrayers'],
    when: (a) => a.practice !== 'new' && a.practice !== 'starting',
    Component: ExtraPrayers,
  },
  { id: 'reminders', part: 'prayer', optional: true, Component: Reminders },

  { id: 'quran-reading', part: 'quran', optional: true, keys: ['quranReading'], Component: QuranReadingStep },
  { id: 'translation', part: 'quran', optional: true, Component: Translation },
  { id: 'quran-goals', part: 'quran', optional: true, keys: ['quranGoals'], Component: QuranGoals },
  { id: 'quran-amount', part: 'quran', optional: true, keys: ['quranAmount'], when: (a) => a.quranGoals.includes('read'), Component: QuranAmount },
  {
    id: 'quran-known',
    part: 'quran',
    optional: true,
    keys: ['quranKnown'],
    when: (a) => a.quranGoals.includes('memorise') || a.quranGoals.includes('revise'),
    Component: QuranKnownStep,
  },
  { id: 'quran-time', part: 'quran', optional: true, keys: ['quranTime'], Component: QuranTimeStep },

  { id: 'hijri', part: 'days', optional: true, keys: ['hijriConvention', 'hijriOffset'], Component: Hijri },
  { id: 'fasting', part: 'days', optional: true, keys: ['fasts'], Component: Fasting },
  { id: 'habits', part: 'days', optional: true, keys: ['habits', 'ownHabit'], Component: Habits },

  { id: 'rhythm', part: 'yourday', optional: true, Component: Rhythm },
  { id: 'nudges', part: 'yourday', optional: true, keys: ['nudges'], Component: NudgesStep },
  {
    id: 'notifications',
    part: 'yourday',
    optional: true,
    when: (a) => !(a.reminderWhen === 'none' && a.nudges === 'prayers'),
    Component: Notifications,
  },
  { id: 'feel', part: 'yourday', optional: true, Component: Feel },
  { id: 'voice', part: 'yourday', optional: true, keys: ['voice'], Component: VoiceStep },
  { id: 'privacy', part: 'yourday', optional: true, keys: ['cloudSync', 'aiContext', 'checkIns'], Component: Privacy },
  { id: 'note', part: 'yourday', optional: true, keys: ['note'], Component: Note },

  { id: 'summary', part: 'plan', Component: Summary },
  { id: 'complete', part: 'plan', Component: Complete },
];
