import { useColorScheme } from 'react-native';

// For props that need a colour value rather than a class, such as an icon's `color`.
// These mirror the themed variables in global.css; add a token here only when a prop needs it.
const night = {
  inkSubtle: '#8f98af',
  moonText: '#fdce3e',
  prayerText: '#95c0ff',
  quranText: '#5ee38b',
  habitsText: '#d1a8ff',
  tasksText: '#50dfe6',
};
const day: typeof night = {
  inkSubtle: '#5b6378',
  moonText: '#6c5500',
  prayerText: '#24569f',
  quranText: '#006a34',
  habitsText: '#694191',
  tasksText: '#006569',
};

/** Text placed on any bright fill. The same in both themes. */
export const ON_COLOR = '#090e1f';

export function useThemeColors() {
  return useColorScheme() === 'dark' ? night : day;
}
