import { Rubik_400Regular, Rubik_500Medium, Rubik_700Bold, Rubik_800ExtraBold, useFonts } from '@expo-google-fonts/rubik';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { useColorScheme } from 'react-native';

import { onboardingStore, useOnboarding } from '@/onboarding/store';

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

  // Any onboarding draft from an earlier session loads before the first screen decides where to go.
  const hydrated = useOnboarding((s) => s.hydrated);
  useEffect(() => {
    onboardingStore.hydrate();
  }, []);

  useEffect(() => {
    if ((loaded || error) && hydrated) {
      SplashScreen.hideAsync();
    }
  }, [loaded, error, hydrated]);

  if ((!loaded && !error) || !hydrated) {
    return null;
  }

  return (
    <ThemeProvider value={scheme === 'dark' ? night : day}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" options={{ animation: 'fade' }} />
        <Stack.Screen name="onboarding" options={{ animation: 'fade', gestureEnabled: false }} />
      </Stack>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}
