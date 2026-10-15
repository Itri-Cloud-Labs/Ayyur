import { StyleSheet, Text, View } from 'react-native';

import { night } from '@/theme/palette';
import { text } from '@/theme/styles';

import { Field } from './controls';

// Onboarding only, so always night.
const styles = StyleSheet.create({
  wrap: { alignItems: 'center', gap: 12 },
  field: { width: '100%', maxWidth: 240 },
  input: { textAlign: 'center', letterSpacing: 4 },
  note: { ...text('medium', 'label', night.inkMuted), textAlign: 'center' },
  wrong: { color: night.dangerText },
});

const EARLIEST = 1920;

/** Whether a typed year is one we accept: four digits, not in the future, not implausibly early. */
export function validYear(text: string) {
  const year = Number(text);
  return /^\d{4}$/.test(text) && year >= EARLIEST && year <= new Date().getFullYear();
}

/**
 * Four digits typed on the number pad, shown large. Faster than any wheel and fully accessible.
 * Says what's wrong only once four digits are in.
 */
export function YearEntry({ text, onChangeText, onSubmit }: { text: string; onChangeText: (text: string) => void; onSubmit: () => void }) {
  const complete = text.length === 4;
  const invalid = complete && !validYear(text);
  return (
    <View style={styles.wrap}>
      <View style={styles.field}>
        <Field
          large
          autoFocus
          value={text}
          onChangeText={(t) => onChangeText(t.replace(/\D/g, '').slice(0, 4))}
          keyboardType="number-pad"
          inputMode="numeric"
          maxLength={4}
          placeholder="YYYY"
          accessibilityLabel="Year you were born"
          accessibilityHint="Four digits"
          returnKeyType="done"
          onSubmitEditing={onSubmit}
          style={styles.input}
        />
      </View>
      <Text accessibilityLiveRegion="polite" style={[styles.note, invalid && styles.wrong]}>
        {invalid ? `Enter a year between ${EARLIEST} and ${new Date().getFullYear()}.` : 'Just the year, not the date.'}
      </Text>
    </View>
  );
}
