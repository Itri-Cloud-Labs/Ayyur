import { Redirect } from 'expo-router';
import { Tabs } from 'expo-router/js-tabs';

import { TabBar } from '@/components/tab-bar/TabBar';
import { TabBarVisibilityProvider } from '@/components/tab-bar/visibility';
import { useOnboarding } from '@/onboarding/store';

export default function TabsLayout() {
  // Until a profile exists, onboarding runs on each launch (resuming a draft if one was left).
  // The root layout has already loaded any draft before this renders.
  const completed = useOnboarding((s) => s.completed);
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
