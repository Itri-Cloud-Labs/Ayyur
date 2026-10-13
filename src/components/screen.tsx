import type { ReactNode } from 'react';
import { Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

/** A screen on the canvas with its title in the header position: left-aligned, no bar behind it. */
export function Screen({ title, children }: { title: string; children?: ReactNode }) {
  const { top } = useSafeAreaInsets();

  return (
    <View className="flex-1 bg-canvas px-6" style={{ paddingTop: top + 16 }}>
      <Text accessibilityRole="header" className="font-display text-display text-ink">
        {title}
      </Text>
      {children}
    </View>
  );
}
