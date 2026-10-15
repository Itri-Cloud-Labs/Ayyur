// Sample reference data for onboarding. None of it is verified: the calculation methods, the country
// suggestions, the Asr defaults and the Hijri conventions all belong to the data layer and must be checked
// against their issuing authorities before shipping (docs/onboarding.md section 7).
import { type PrayerId, samplePrayers } from '@/data/sample';

import type { Answers, City, HijriConvention, Madhhab, Practice, QuranReading, Voice } from './types';

export const cities: City[] = [
  { id: 'london', name: 'London', country: 'United Kingdom', countryCode: 'GB' },
  { id: 'birmingham', name: 'Birmingham', country: 'United Kingdom', countryCode: 'GB' },
  { id: 'manchester', name: 'Manchester', country: 'United Kingdom', countryCode: 'GB' },
  { id: 'casablanca', name: 'Casablanca', country: 'Morocco', countryCode: 'MA' },
  { id: 'rabat', name: 'Rabat', country: 'Morocco', countryCode: 'MA' },
  { id: 'agadir', name: 'Agadir', country: 'Morocco', countryCode: 'MA' },
  { id: 'algiers', name: 'Algiers', country: 'Algeria', countryCode: 'DZ' },
  { id: 'tunis', name: 'Tunis', country: 'Tunisia', countryCode: 'TN' },
  { id: 'cairo', name: 'Cairo', country: 'Egypt', countryCode: 'EG' },
  { id: 'makkah', name: 'Makkah', country: 'Saudi Arabia', countryCode: 'SA' },
  { id: 'madinah', name: 'Madinah', country: 'Saudi Arabia', countryCode: 'SA' },
  { id: 'dubai', name: 'Dubai', country: 'United Arab Emirates', countryCode: 'AE' },
  { id: 'istanbul', name: 'Istanbul', country: 'Türkiye', countryCode: 'TR' },
  { id: 'karachi', name: 'Karachi', country: 'Pakistan', countryCode: 'PK' },
  { id: 'lahore', name: 'Lahore', country: 'Pakistan', countryCode: 'PK' },
  { id: 'dhaka', name: 'Dhaka', country: 'Bangladesh', countryCode: 'BD' },
  { id: 'jakarta', name: 'Jakarta', country: 'Indonesia', countryCode: 'ID' },
  { id: 'kuala-lumpur', name: 'Kuala Lumpur', country: 'Malaysia', countryCode: 'MY' },
  { id: 'paris', name: 'Paris', country: 'France', countryCode: 'FR' },
  { id: 'brussels', name: 'Brussels', country: 'Belgium', countryCode: 'BE' },
  { id: 'amsterdam', name: 'Amsterdam', country: 'Netherlands', countryCode: 'NL' },
  { id: 'berlin', name: 'Berlin', country: 'Germany', countryCode: 'DE' },
  { id: 'new-york', name: 'New York', country: 'United States', countryCode: 'US' },
  { id: 'chicago', name: 'Chicago', country: 'United States', countryCode: 'US' },
  { id: 'toronto', name: 'Toronto', country: 'Canada', countryCode: 'CA' },
  { id: 'lagos', name: 'Lagos', country: 'Nigeria', countryCode: 'NG' },
  { id: 'nairobi', name: 'Nairobi', country: 'Kenya', countryCode: 'KE' },
  { id: 'sydney', name: 'Sydney', country: 'Australia', countryCode: 'AU' },
];

/** Where the simulated "use my location" lands. */
export const deviceCity = cities[0];

export type Method = {
  id: string;
  name: string;
  /** Who uses it, in plain words. */
  where: string;
  /** Sample minute shifts for Fajr and Isha, only so the preview visibly changes. Not real angles. */
  fajrShift: number;
  ishaShift: number;
};

export const methods: Method[] = [
  { id: 'mwl', name: 'Muslim World League', where: 'Widely used in Europe and parts of Asia', fajrShift: 0, ishaShift: 0 },
  { id: 'isna', name: 'Islamic Society of North America', where: 'Common in the US and Canada', fajrShift: 14, ishaShift: -9 },
  { id: 'egypt', name: 'Egyptian General Authority', where: 'Egypt, and much of Africa and the Levant', fajrShift: -6, ishaShift: 2 },
  { id: 'umm-al-qura', name: 'Umm al-Qura', where: 'Saudi Arabia', fajrShift: -4, ishaShift: 11 },
  { id: 'karachi', name: 'University of Islamic Sciences, Karachi', where: 'Pakistan, Bangladesh and India', fajrShift: -10, ishaShift: 6 },
  { id: 'morocco', name: 'Ministry of Habous, Morocco', where: 'Morocco', fajrShift: -12, ishaShift: 3 },
  { id: 'diyanet', name: 'Diyanet', where: 'Türkiye', fajrShift: -2, ishaShift: -3 },
  { id: 'jakim', name: 'JAKIM', where: 'Malaysia', fajrShift: -14, ishaShift: 1 },
  { id: 'uoif', name: 'UOIF', where: 'Some mosques in France', fajrShift: 22, ishaShift: -14 },
];

const methodByCountry: Record<string, string> = {
  US: 'isna',
  CA: 'isna',
  EG: 'egypt',
  SA: 'umm-al-qura',
  AE: 'umm-al-qura',
  PK: 'karachi',
  BD: 'karachi',
  MA: 'morocco',
  TR: 'diyanet',
  MY: 'jakim',
  ID: 'jakim',
};

export const suggestedMethod = (city: City | null) =>
  methods.find((m) => m.id === (city ? methodByCountry[city.countryCode] : undefined)) ?? methods[0];

const hanafiCountries = new Set(['PK', 'BD', 'TR']);
export const countryAsr = (city: City | null) => (city && hanafiCountries.has(city.countryCode) ? 'hanafi' : 'standard');

export const madhhabs: { id: Madhhab; name: string; about: string }[] = [
  { id: 'hanafi', name: 'Hanafi', about: 'Most followed in Türkiye, South Asia and Central Asia' },
  { id: 'maliki', name: 'Maliki', about: 'Most followed in North and West Africa' },
  { id: 'shafii', name: "Shafi'i", about: 'Most followed in East Africa, Yemen and Southeast Asia' },
  { id: 'hanbali', name: 'Hanbali', about: 'Most followed in the Arabian Peninsula' },
  { id: 'none', name: 'No preference', about: "Or I'm not sure. That's completely fine." },
];

export const practiceOptions: { id: Practice; label: string; reply: string }[] = [
  { id: 'new', label: "I'm new to Islam", reply: "Then we'll take it one step at a time, together." },
  { id: 'starting', label: 'Just starting to practise', reply: "Lovely. We'll start small and build from there." },
  { id: 'returning', label: 'Coming back after a break', reply: "Welcome back. We'll pick up wherever suits you." },
  { id: 'unsteady', label: 'Practising, but not steady', reply: "That's most of us. I'll help with the steady part." },
  { id: 'steady', label: 'Steady, and I want more', reply: "Then let's find what's next for you." },
];

export const intentions: { id: string; label: string }[] = [
  { id: 'salah', label: 'Pray all five, on time' },
  { id: 'quran-daily', label: 'Read Quran every day' },
  { id: 'memorise', label: 'Memorise Quran' },
  { id: 'fasting', label: 'Fast more often' },
  { id: 'habits', label: 'Build good daily habits' },
  { id: 'learn', label: 'Learn more about my deen' },
  { id: 'organise', label: 'Organise my day around ibadah' },
  { id: 'ramadan', label: 'Get ready for Ramadan' },
];

/** Whether a section applies: picked in goals, asked for from the summary, or goals skipped altogether. */
export function wants(answers: Pick<Answers, 'intentions' | 'optIn' | 'exploring'>, section: 'quran' | 'fasting' | 'habits') {
  if (answers.optIn.includes(section)) return true;
  // Just exploring: keep the interview short; the summary offers each section.
  if (answers.exploring) return false;
  if (answers.intentions.length === 0) return true;
  const ids = { quran: ['quran-daily', 'memorise', 'learn'], fasting: ['fasting', 'ramadan'], habits: ['habits', 'organise', 'learn'] }[
    section
  ];
  return answers.intentions.some((id) => ids.includes(id));
}

export const extraPrayers = [
  { id: 'sunnah', label: 'Sunnah before and after the five' },
  { id: 'witr', label: 'Witr' },
  { id: 'duha', label: 'Duha' },
  { id: 'tahajjud', label: 'Tahajjud' },
];

export const quranReadingOptions: { id: QuranReading; label: string; detail: string }[] = [
  { id: 'letters', label: "I'm learning the letters", detail: 'Alif, ba, ta, and on from there' },
  { id: 'slowly', label: 'I read slowly', detail: 'Word by word, and that counts' },
  { id: 'comfortable', label: 'I read comfortably', detail: 'Pages at a time' },
  { id: 'translation', label: 'I mostly read a translation', detail: 'In English, for the meaning' },
];

// Which English translations ship depends on licensing, which is not settled.
export const translations = [
  { id: 'saheeh', name: 'Saheeh International', style: 'Close to the Arabic, plain modern English' },
  { id: 'clear-quran', name: 'The Clear Quran', by: 'Mustafa Khattab', style: 'Easy flowing English, made for reading aloud' },
  { id: 'abdel-haleem', name: 'The Qur’an: A New Translation', by: 'M.A.S. Abdel Haleem', style: 'Natural, literary English' },
  { id: 'yusuf-ali', name: 'The Holy Qur’an', by: 'Abdullah Yusuf Ali', style: 'Classic and poetic, older English' },
];

export const quranAmounts = [
  { id: 'ayat', label: 'A few ayat' },
  { id: 'page', label: 'One page' },
  { id: 'two-pages', label: 'Two pages' },
  { id: 'quarter-juz', label: 'Four pages', detail: 'a quarter juz' },
  { id: 'juz', label: 'One juz' },
  { id: 'minutes-10', label: '10 minutes' },
  { id: 'minutes-20', label: '20 minutes' },
];

/** The suggested daily amount for a practice stage (docs/onboarding.md section 4). */
export const suggestedAmount = (practice: Practice | null) =>
  practice === 'new' || practice === 'starting' ? 'ayat' : practice === 'steady' ? 'two-pages' : 'page';

export const hijriConventions: { id: HijriConvention; name: string; about: string }[] = [
  { id: 'umm-al-qura', name: 'Umm al-Qura', about: "Saudi Arabia's calendar, fixed in advance" },
  { id: 'sighting', name: 'Local moon sighting', about: 'Months begin when the new moon is seen where you are' },
  { id: 'calculated', name: 'Astronomical calculation', about: 'Worked out from the moon’s position, known ahead' },
];

export const fasts = [
  { id: 'mon-thu', label: 'Mondays and Thursdays' },
  { id: 'white-days', label: 'The white days', detail: '13th, 14th and 15th' },
  { id: 'arafah-ashura', label: 'Arafah and Ashura' },
  { id: 'shawwal', label: 'Six days of Shawwal' },
];

export const habitOptions = [
  'Morning adhkar',
  'Evening adhkar',
  'Adhkar after prayer',
  'Istighfar',
  'Salawat on the Prophet',
  'Daily dua',
  'Surah al-Kahf on Fridays',
  'Give sadaqa',
  'Call or visit family',
  'Learn something about my deen',
  'Sleep early',
];

/** One situation, said three ways, so the user hears each voice before choosing. */
export const voices: { id: Voice; name: string; about: string; line: string }[] = [
  {
    id: 'gentle',
    name: 'Gentle and encouraging',
    about: 'Warm, patient, a little cheerful',
    line: "Asr is in 20 minutes. Take your time getting ready, I'm right here.",
  },
  { id: 'direct', name: 'Straight to the point', about: 'Short and clear, no fuss', line: 'Asr in 20 minutes.' },
  {
    id: 'teacher',
    name: 'Explains as we go',
    about: 'Adds the why behind things',
    line: 'Asr is in 20 minutes. It’s the afternoon prayer, and its time runs until sunset.',
  },
];

export const sampleHijri = { day: 1, month: 'Jumada al-Ula', year: 1448 };
const hijriMonths = ['Rabi al-Akhir', 'Jumada al-Ula', 'Jumada al-Akhirah'];
/** Today's sample Hijri date after a day adjustment. Sample only: not calculated. */
export function hijriPreview(offset: -1 | 0 | 1) {
  if (offset === -1) return `30 ${hijriMonths[0]} ${sampleHijri.year}`;
  return `${sampleHijri.day + offset} ${sampleHijri.month} ${sampleHijri.year}`;
}

/**
 * Today's five times as onboarding previews them: the sample times shifted by the chosen method,
 * Asr school and the user's own minute adjustments. Illustrative only, not a calculation.
 */
export function previewTimes(answers: Pick<Answers, 'method' | 'asr' | 'offsets' | 'city'>) {
  const method = methods.find((m) => m.id === answers.method) ?? suggestedMethod(answers.city);
  const asr = answers.asr ?? countryAsr(answers.city);
  const shift: Record<PrayerId, number> = {
    fajr: method.fajrShift,
    dhuhr: 0,
    asr: asr === 'hanafi' ? 47 : 0,
    maghrib: 0,
    isha: method.ishaShift,
  };
  return samplePrayers.map((p) => ({ id: p.id, name: p.name, minutes: p.start + shift[p.id] + answers.offsets[p.id] }));
}

/**
 * Today's prayers with the user's own method, Asr and adjustments, each running until the next begins
 * (Fajr until sunrise, Isha until midnight in this sample). Used by the ending line and by Home, so
 * both agree with what the user just chose.
 */
export function todayPrayers(answers: Pick<Answers, 'method' | 'asr' | 'offsets' | 'city'>) {
  const times = previewTimes(answers);
  const sunrise = samplePrayers[0].end + (times[0].minutes - samplePrayers[0].start);
  return times.map((t, i) => ({
    id: t.id,
    name: t.name,
    start: t.minutes,
    end: i === 0 ? sunrise : i === times.length - 1 ? 24 * 60 : times[i + 1].minutes,
  }));
}
