import { type ReactNode } from 'react';
import { Modal, Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { NightScope } from '@/theme/night-scope';

/** A sheet from the bottom edge. Tapping outside closes it. */
export function Sheet({ visible, onClose, children, label }: { visible: boolean; onClose: () => void; children: ReactNode; label: string }) {
  const { bottom } = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <NightScope>
        <View className="flex-1 justify-end">
          <Pressable accessibilityLabel="Close" onPress={onClose} className="absolute inset-0 bg-night/70" />
          <View
            accessibilityViewIsModal
            accessibilityLabel={label}
            className="items-center rounded-t-sheet bg-surface px-6 pt-3"
            style={{ paddingBottom: Math.max(bottom, 16) + 8 }}>
            <View className="mb-5 h-1.5 w-10 rounded-full bg-line" />
            <View className="w-full max-w-[560px]">{children}</View>
          </View>
        </View>
      </NightScope>
    </Modal>
  );
}

/**
 * Stands in for the phone's own permission dialog until real permissions are wired up. It is labelled
 * as a preview so nobody mistakes it for the system prompt.
 */
export function SimulatedPrompt({
  visible,
  title,
  body,
  actions,
}: {
  visible: boolean;
  title: string;
  body: string;
  actions: { label: string; onPress: () => void; strong?: boolean }[];
}) {
  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent>
      <NightScope>
        <View className="flex-1 items-center justify-center bg-night/70 px-10">
          <Text className="mb-3 font-medium text-caption text-ink-muted">Preview of your phone’s prompt</Text>
          <View accessibilityViewIsModal className="w-full max-w-[320px] overflow-hidden rounded-card bg-raised">
            <View className="gap-1.5 px-5 pb-4 pt-5">
              <Text className="text-center font-heading text-body text-ink">{title}</Text>
              <Text className="text-center font-body text-label text-ink-muted">{body}</Text>
            </View>
            {actions.map((action) => (
              <Pressable
                key={action.label}
                accessibilityRole="button"
                onPress={action.onPress}
                className="min-h-[48px] items-center justify-center border-t border-line px-4 py-3 active:bg-line">
                <Text className={`text-center text-body text-prayer-text ${action.strong ? 'font-heading' : 'font-medium'}`}>
                  {action.label}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
      </NightScope>
    </Modal>
  );
}
