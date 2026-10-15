import { CheckIcon } from 'phosphor-react-native/src/icons/Check';
import { Pressable, Text, View } from 'react-native';

import { tapHaptic } from '@/lib/haptics';
import { ON_COLOR } from '@/theme/colors';
import { TONES, type Tone } from '@/theme/tones';

export type Option<T extends string> = { id: T; label: string; detail?: string };

type Selection<T extends string> =
  | { multiple?: false; value: T | null; onChange: (value: T) => void }
  | { multiple: true; value: T[]; onChange: (value: T[]) => void };

type ListProps<T extends string> = Selection<T> & {
  options: Option<T>[];
  tone?: Tone;
  /** Shown on one option as a quiet "Suggested" tag. */
  suggested?: T;
};

function Mark({ selected, multiple, tone }: { selected: boolean; multiple: boolean; tone: Tone }) {
  const shape = multiple ? 'rounded-lg' : 'rounded-full';
  if (!selected) return <View className={`h-8 w-8 border-2 border-line ${shape}`} />;
  return (
    <View className={`h-8 w-8 items-center justify-center ${shape} ${TONES[tone].fill}`}>
      <CheckIcon size={18} weight="bold" color={ON_COLOR} />
    </View>
  );
}

/** Rows to choose from: radio rows for one answer, checkbox rows for several. */
export function OptionList<T extends string>(props: ListProps<T>) {
  const { options, tone = 'moon', suggested } = props;
  const multiple = props.multiple === true;
  const isSelected = (id: T) => (props.multiple ? props.value.includes(id) : props.value === id);

  const toggle = (id: T) => {
    tapHaptic();
    if (props.multiple) {
      props.onChange(props.value.includes(id) ? props.value.filter((v) => v !== id) : [...props.value, id]);
    } else {
      props.onChange(id);
    }
  };

  return (
    <View accessibilityRole={multiple ? undefined : 'radiogroup'} className="gap-3">
      {options.map((option) => {
        const selected = isSelected(option.id);
        return (
          <Pressable
            key={option.id}
            accessibilityRole={multiple ? 'checkbox' : 'radio'}
            accessibilityState={multiple ? { checked: selected } : { selected }}
            accessibilityLabel={[option.label, option.detail, option.id === suggested ? 'suggested' : null]
              .filter(Boolean)
              .join(', ')}
            onPress={() => toggle(option.id)}
            className={`min-h-[72px] flex-row items-center gap-4 rounded-control border-2 px-5 py-4 active:opacity-80 ${
              selected ? `${TONES[tone].border} ${TONES[tone].soft}` : 'border-transparent bg-surface'
            }`}>
            <View className="flex-1">
              <View className="flex-row flex-wrap items-center gap-x-2">
                <Text className="font-heading text-title text-ink">{option.label}</Text>
                {option.id === suggested ? (
                  <Text className={`font-heading text-caption ${TONES[tone].text}`}>Suggested</Text>
                ) : null}
              </View>
              {option.detail ? (
                <Text className={`mt-1 font-body text-label ${selected ? 'text-ink' : 'text-ink-muted'}`}>
                  {option.detail}
                </Text>
              ) : null}
            </View>
            <Mark selected={selected} multiple={multiple} tone={tone} />
          </Pressable>
        );
      })}
    </View>
  );
}

/** Pills that wrap, for picking several short things at once. */
export function Chips<T extends string>({
  options,
  value,
  onChange,
  tone = 'moon',
}: {
  options: Option<T>[];
  value: T[];
  onChange: (value: T[]) => void;
  tone?: Tone;
}) {
  return (
    <View className="flex-row flex-wrap gap-3">
      {options.map((option) => {
        const selected = value.includes(option.id);
        return (
          <Pressable
            key={option.id}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: selected }}
            accessibilityLabel={option.detail ? `${option.label}, ${option.detail}` : option.label}
            onPress={() => {
              tapHaptic();
              onChange(selected ? value.filter((v) => v !== option.id) : [...value, option.id]);
            }}
            className={`min-h-[56px] flex-row items-center gap-2 rounded-full border-2 px-5 py-3 active:opacity-80 ${
              selected ? `${TONES[tone].border} ${TONES[tone].soft}` : 'border-transparent bg-raised'
            }`}>
            {selected ? (
              <View className={`h-6 w-6 items-center justify-center rounded-full ${TONES[tone].fill}`}>
                <CheckIcon size={14} weight="bold" color={ON_COLOR} />
              </View>
            ) : null}
            <Text className={`font-medium text-body ${selected ? 'text-ink' : 'text-ink-muted'}`}>
              {option.label}
              {option.detail ? <Text className="text-ink-subtle">{`  ${option.detail}`}</Text> : null}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/** A row of equal choices for a small, ordered set, such as when or how loud. */
export function Segmented<T extends string>({
  label,
  options,
  value,
  onChange,
  tone = 'moon',
}: {
  label: string;
  options: Option<T>[];
  value: T;
  onChange: (value: T) => void;
  tone?: Tone;
}) {
  return (
    <View className="gap-2">
      <Text className="font-heading text-body text-ink-muted">{label}</Text>
      <View accessibilityRole="radiogroup" accessibilityLabel={label} className="flex-row flex-wrap gap-1.5 rounded-control bg-surface p-1.5">
        {options.map((option) => {
          const selected = option.id === value;
          return (
            <Pressable
              key={option.id}
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              accessibilityLabel={option.label}
              onPress={() => {
                tapHaptic();
                onChange(option.id);
              }}
              className={`min-h-[60px] flex-1 basis-[22%] items-center justify-center rounded-xl px-1 py-2 active:opacity-80 ${
                selected ? TONES[tone].fill : ''
              }`}>
              <Text
                className={`text-center text-body ${selected ? 'font-heading text-on-color' : 'font-medium text-ink-muted'}`}>
                {option.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
