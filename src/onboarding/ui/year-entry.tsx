import { Text, View } from 'react-native';

import { Field } from './controls';

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
    <View className="items-center gap-3">
      <View className="w-full max-w-[240px]">
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
          style={{ textAlign: 'center', letterSpacing: 4 }}
        />
      </View>
      <Text
        accessibilityLiveRegion="polite"
        className={`text-center font-medium text-label ${invalid ? 'text-danger-text' : 'text-ink-muted'}`}>
        {invalid ? `Enter a year between ${EARLIEST} and ${new Date().getFullYear()}.` : 'Just the year, not the date.'}
      </Text>
    </View>
  );
}
