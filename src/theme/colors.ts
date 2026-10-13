import { useColorScheme } from 'react-native';

// For props that need a colour value rather than a class, such as an icon's `color`.
// These mirror the themed variables in global.css; add a token here only when a prop needs it.
const night = { inkSubtle: '#8f98af', moonText: '#fdce3e' };
const day: typeof night = { inkSubtle: '#5b6378', moonText: '#6c5500' };

export function useThemeColors() {
  return useColorScheme() === 'dark' ? night : day;
}
