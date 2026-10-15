import { type ReactNode } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { fixed, night } from '@/theme/palette';
import { NightScope } from '@/theme/night-scope';
import { radius, text } from '@/theme/styles';

// Sheets and prompts are always in the night theme, so their styles are fixed.
const styles = StyleSheet.create({
  bottom: { flex: 1, justifyContent: 'flex-end' },
  scrim: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, backgroundColor: fixed.scrim },
  sheet: {
    alignItems: 'center',
    borderTopLeftRadius: radius.sheet,
    borderTopRightRadius: radius.sheet,
    backgroundColor: night.surface,
    paddingHorizontal: 24,
    paddingTop: 12,
  },
  grabber: { marginBottom: 20, height: 6, width: 40, borderRadius: radius.full, backgroundColor: night.line },
  content: { width: '100%', maxWidth: 560 },
  centre: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: fixed.scrim, paddingHorizontal: 40 },
  preview: { ...text('medium', 'caption', night.inkMuted), marginBottom: 12 },
  dialog: { width: '100%', maxWidth: 320, overflow: 'hidden', borderRadius: radius.card, backgroundColor: night.raised },
  dialogText: { gap: 6, paddingHorizontal: 20, paddingBottom: 16, paddingTop: 20 },
  title: { ...text('heading', 'body', night.ink), textAlign: 'center' },
  body: { ...text('body', 'label', night.inkMuted), textAlign: 'center' },
  action: {
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderTopWidth: 1,
    borderTopColor: night.line,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  actionPressed: { backgroundColor: night.line },
  actionLabel: { ...text('medium', 'body', night.ink), textAlign: 'center' },
  actionStrong: { ...text('heading', 'body', night.ink), textAlign: 'center' },
});

/** A sheet from the bottom edge. Tapping outside closes it. */
export function Sheet({
  visible,
  onClose,
  children,
  label,
}: {
  visible: boolean;
  onClose: () => void;
  children: ReactNode;
  label: string;
}) {
  const { bottom } = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <NightScope>
        <View style={styles.bottom}>
          <Pressable accessibilityLabel="Close" onPress={onClose} style={styles.scrim} />
          <View accessibilityViewIsModal accessibilityLabel={label} style={[styles.sheet, { paddingBottom: Math.max(bottom, 16) + 8 }]}>
            <View style={styles.grabber} />
            <View style={styles.content}>{children}</View>
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
  onDismiss,
}: {
  visible: boolean;
  title: string;
  body: string;
  actions: { label: string; onPress: () => void; strong?: boolean }[];
  /** Android back, treated like declining. */
  onDismiss: () => void;
}) {
  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent onRequestClose={onDismiss}>
      <NightScope>
        <View style={styles.centre}>
          <Text style={styles.preview}>Preview of your phone’s prompt</Text>
          <View accessibilityViewIsModal style={styles.dialog}>
            <View style={styles.dialogText}>
              <Text style={styles.title}>{title}</Text>
              <Text style={styles.body}>{body}</Text>
            </View>
            {actions.map((action) => (
              <Pressable
                key={action.label}
                accessibilityRole="button"
                onPress={action.onPress}
                style={({ pressed }) => [styles.action, pressed && styles.actionPressed]}>
                <Text style={action.strong ? styles.actionStrong : styles.actionLabel}>{action.label}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      </NightScope>
    </Modal>
  );
}
