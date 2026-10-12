import './global.css';

import {
  Rubik_400Regular,
  Rubik_500Medium,
  Rubik_700Bold,
  Rubik_800ExtraBold,
  useFonts,
} from '@expo-google-fonts/rubik';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { Image, Text, View } from 'react-native';

SplashScreen.preventAutoHideAsync();

export default function App() {
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
    <View className="flex-1 items-center justify-center gap-4 bg-canvas px-6">
      <Image
        source={require('./assets/brand/mascot/ayyur-happy.png')}
        className="h-40 w-40"
        accessibilityIgnoresInvertColors
        accessible={false}
      />
      <Text className="font-display text-display text-ink">Ayyur</Text>
      <Text className="text-center font-body text-body text-ink-muted">
        Open up App.tsx to start working on your app!
      </Text>
      <StatusBar style="auto" />
    </View>
  );
}
