import '../../global.css';

import {
  Rubik_400Regular,
  Rubik_500Medium,
  Rubik_700Bold,
  Rubik_800ExtraBold,
  useFonts,
} from '@expo-google-fonts/rubik';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { useColorScheme } from 'react-native';

SplashScreen.preventAutoHideAsync();

// The navigator paints these behind screens during transitions, so they match the canvas token.
const night = { ...DarkTheme, colors: { ...DarkTheme.colors, background: '#090e1f', card: '#090e1f' } };
const day = { ...DefaultTheme, colors: { ...DefaultTheme.colors, background: '#ffffff', card: '#ffffff' } };

export default function RootLayout() {
  const scheme = useColorScheme();
  const [loaded, error] = useFonts({
    Rubik_400Regular,
    Rubik_500Medium,
    Rubik_700Bold,
    Rubik_800ExtraBold,
  });

  useEffect(() => {
    if (loaded || error) {
      SplashScreen.hideAsync();
    }
  }, [loaded, error]);

  if (!loaded && !error) {
    return null;
  }

  return (
    <ThemeProvider value={scheme === 'dark' ? night : day}>
      <Stack screenOptions={{ headerShown: false }} />
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}
