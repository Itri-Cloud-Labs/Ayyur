import { Redirect } from 'expo-router';
import { Tabs } from 'expo-router/js-tabs';

import { TabBar } from '@/components/tab-bar/TabBar';
import { TabBarVisibilityProvider } from '@/components/tab-bar/visibility';
import { useOnboardingState } from '@/onboarding/store';

export default function TabsLayout() {
  // Until storage exists, onboarding runs on every launch of the app.
  const { completed } = useOnboardingState();
  if (!completed) return <Redirect href="/onboarding" />;

  return (
    <TabBarVisibilityProvider>
      <Tabs tabBar={(props) => <TabBar {...props} />} screenOptions={{ headerShown: false }}>
        <Tabs.Screen name="index" options={{ title: 'Home' }} />
        <Tabs.Screen name="quran" options={{ title: 'Quran' }} />
        <Tabs.Screen name="ayyur" options={{ title: 'Ayyur' }} />
        <Tabs.Screen name="habits" options={{ title: 'Habits' }} />
        <Tabs.Screen name="you" options={{ title: 'You' }} />
      </Tabs>
    </TabBarVisibilityProvider>
  );
}
