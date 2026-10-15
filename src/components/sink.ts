import { useAnimatedStyle, useSharedValue } from 'react-native-reanimated';

/**
 * The press of a raised control: its face drops onto the lip while held. Driven by a shared value on
 * the UI thread, so the press shows at once and nothing re-renders or re-lays out while a finger is down.
 */
export function useSink(depth: number) {
  const down = useSharedValue(0);
  const style = useAnimatedStyle(() => ({ transform: [{ translateY: down.value * depth }] }));
  const handlers = {
    onPressIn: () => {
      down.value = 1;
    },
    onPressOut: () => {
      down.value = 0;
    },
  };
  return { style, handlers };
}
