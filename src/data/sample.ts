// Sample data for building screens before storage exists. Nothing here is saved or calculated:
// prayer times are fixed values, not worked out for a place or a date. The shapes are a starting
// point for the UI only, and the real ones belong to the data layer.

export type PrayerId = 'fajr' | 'dhuhr' | 'asr' | 'maghrib' | 'isha';

export type Prayer = {
  id: PrayerId;
  name: string;
  /** Minutes after midnight when the prayer's time begins. */
  start: number;
  /** Minutes after midnight when its time ends. */
  end: number;
};

const at = (hours: number, minutes: number) => hours * 60 + minutes;

export const samplePrayers: Prayer[] = [
  { id: 'fajr', name: 'Fajr', start: at(5, 42), end: at(6, 58) },
  { id: 'dhuhr', name: 'Dhuhr', start: at(13, 8), end: at(16, 21) },
  { id: 'asr', name: 'Asr', start: at(16, 21), end: at(18, 54) },
  { id: 'maghrib', name: 'Maghrib', start: at(18, 54), end: at(20, 15) },
  { id: 'isha', name: 'Isha', start: at(20, 15), end: at(24, 0) },
];

/** A new install has logged nothing: the app never implies worship happened. */
export const sampleLoggedPrayers: PrayerId[] = [];

export type TodayItem = {
  id: string;
  kind: 'habit' | 'task';
  title: string;
};

export const sampleDoneItems: string[] = [];

/** `phase` is 0 (new) to 4 (full). How a streak maps to a phase is not decided yet. */
export const sampleStreak: { days: number; phase: 0 | 1 | 2 | 3 | 4 } = { days: 0, phase: 0 };
