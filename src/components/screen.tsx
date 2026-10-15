import type { ReactNode } from 'react';
import { Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { text, themedStyles } from '@/theme/styles';

const useStyles = themedStyles((c) => ({
  screen: { flex: 1, backgroundColor: c.canvas, paddingHorizontal: 24 },
  title: text('display', 'display', c.ink),
}));

/** A screen on the canvas with its title in the header position: left-aligned, no bar behind it. */
export function Screen({ title, children }: { title: string; children?: ReactNode }) {
  const s = useStyles();
  const { top } = useSafeAreaInsets();

  return (
    <View style={[s.screen, { paddingTop: top + 16 }]}>
      <Text accessibilityRole="header" style={s.title}>
        {title}
      </Text>
      {children}
    </View>
  );
}
