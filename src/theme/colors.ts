import { createContext, useContext } from 'react';
import { useColorScheme } from 'react-native';

// For props that need a colour value rather than a class, such as an icon's `color`.
// These mirror the themed variables in global.css; add a token here only when a prop needs it.
const night = {
  ink: '#f0f3fc',
  inkMuted: '#b5bed2',
  inkSubtle: '#8f98af',
  line: '#333c55',
  raised: '#202941',
  moonText: '#fdce3e',
  prayerText: '#95c0ff',
  quranText: '#5ee38b',
  fastingText: '#ffa566',
  habitsText: '#d1a8ff',
  tasksText: '#50dfe6',
  frozenText: '#bfe9fb',
};
const day: typeof night = {
  ink: '#131a2d',
  inkMuted: '#444d63',
  inkSubtle: '#5b6378',
  line: '#ccd1dd',
  raised: '#e4e8f0',
  moonText: '#6c5500',
  prayerText: '#24569f',
  quranText: '#006a34',
  fastingText: '#874300',
  habitsText: '#694191',
  tasksText: '#006569',
  frozenText: '#385e6d',
};

/** Text placed on any bright fill. The same in both themes. */
export const ON_COLOR = '#090e1f';

/** Set by NightScope so colour props match the forced theme rather than the system one. */
export const SchemeOverride = createContext<'dark' | 'light' | null>(null);

export function useThemeColors() {
  const system = useColorScheme();
  const forced = useContext(SchemeOverride);
  return (forced ?? system) === 'dark' ? night : day;
}
