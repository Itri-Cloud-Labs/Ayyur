import { CheckIcon } from 'phosphor-react-native/src/icons/Check';
import { Pressable, Text, View } from 'react-native';

import { tapHaptic } from '@/lib/haptics';
import { ON_COLOR } from '@/theme/colors';
import { TONES, type Tone } from '@/theme/tones';

import { Lipped } from './press';

export type Option<T extends string> = {
  id: T;
  label: string;
  detail?: string;
};

type Selection<T extends string> =
  { multiple?: false; value: T | null; onChange: (value: T) => void } | { multiple: true; value: T[]; onChange: (value: T[]) => void };

type ListProps<T extends string> = Selection<T> & {
  options: Option<T>[];
  /** Inside a module, its colour; elsewhere neutral, because gold belongs to Ayyur. */
  tone?: Tone;
  /** Shown on one option as a quiet "Suggested" tag. */
  suggested?: T;
  /** Two options per row, for short labels. */
  columns?: 1 | 2;
};

/** A round mark for one answer, a rounded square for several. Filled with a Night check when chosen. */
export function Mark({ selected, multiple, tone }: { selected: boolean; multiple: boolean; tone: Tone }) {
  const shape = multiple ? 'rounded-lg' : 'rounded-full';
  if (!selected) return <View className={`h-8 w-8 border-2 border-ink-subtle ${shape}`} />;
  return (
    <View className={`h-8 w-8 items-center justify-center ${shape} ${TONES[tone].fill}`}>
      <CheckIcon size={18} weight="bold" color={ON_COLOR} />
    </View>
  );
}

/** Raised rows to choose from: radio rows for one answer, checkbox rows for several. */
export function OptionList<T extends string>(props: ListProps<T>) {
  const { options, tone = 'neutral', suggested, columns = 1 } = props;
  const multiple = props.multiple === true;
  const isSelected = (id: T) => (props.multiple ? props.value.includes(id) : props.value === id);

  const toggle = (id: T) => {
    if (props.multiple) {
      props.onChange(props.value.includes(id) ? props.value.filter((v) => v !== id) : [...props.value, id]);
    } else {
      props.onChange(id);
    }
  };

  return (
    <View accessibilityRole={multiple ? undefined : 'radiogroup'} className={columns === 2 ? 'flex-row flex-wrap gap-3' : 'gap-3'}>
      {options.map((option) => {
        const selected = isSelected(option.id);
        return (
          <Lipped
            key={option.id}
            selected={selected}
            tone={tone}
            outer={columns === 2 ? 'basis-[47%] flex-1' : ''}
            face="min-h-[68px] flex-row items-center gap-4 px-5 py-3"
            accessibilityRole={multiple ? 'checkbox' : 'radio'}
            accessibilityState={multiple ? { checked: selected } : { selected }}
            accessibilityLabel={[option.label, option.detail, option.id === suggested ? 'suggested' : null].filter(Boolean).join(', ')}
            onPress={() => toggle(option.id)}>
            <View className="flex-1">
              <View className="flex-row flex-wrap items-center gap-x-2">
                <Text className="font-heading text-title text-ink">{option.label}</Text>
                {option.id === suggested ? <Text className="font-heading text-caption text-ink-muted">Suggested</Text> : null}
              </View>
              {option.detail ? <Text className="mt-1 font-body text-label text-ink-muted">{option.detail}</Text> : null}
            </View>
            <Mark selected={selected} multiple={multiple} tone={tone} />
          </Lipped>
        );
      })}
    </View>
  );
}

/** Raised pills that wrap, for picking several short things, or one with `single`. */
export function Chips<T extends string>({
  options,
  value,
  onChange,
  tone = 'neutral',
  single = false,
  label,
}: {
  options: Option<T>[];
  value: T[];
  onChange: (value: T[]) => void;
  tone?: Tone;
  single?: boolean;
  label?: string;
}) {
  return (
    <View accessibilityRole={single ? 'radiogroup' : undefined} accessibilityLabel={label} className="flex-row flex-wrap gap-2.5">
      {options.map((option) => {
        const selected = value.includes(option.id);
        return (
          <Lipped
            key={option.id}
            shape="pill"
            selected={selected}
            tone={tone}
            face="min-h-[52px] flex-row items-center gap-2 px-5 py-2.5"
            accessibilityRole={single ? 'radio' : 'checkbox'}
            accessibilityState={single ? { selected } : { checked: selected }}
            accessibilityLabel={option.detail ? `${option.label}, ${option.detail}` : option.label}
            onPress={() => onChange(single ? [option.id] : selected ? value.filter((v) => v !== option.id) : [...value, option.id])}>
            {selected ? (
              <View className={`h-6 w-6 items-center justify-center rounded-full ${TONES[tone].fill}`}>
                <CheckIcon size={14} weight="bold" color={ON_COLOR} />
              </View>
            ) : null}
            <Text className={`text-body ${selected ? 'font-heading text-ink' : 'font-medium text-ink-muted'}`}>
              {option.label}
              {option.detail ? <Text className="font-body text-ink-subtle">{`  ${option.detail}`}</Text> : null}
            </Text>
          </Lipped>
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
  tone = 'neutral',
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
      <View
        accessibilityRole="radiogroup"
        accessibilityLabel={label}
        className="flex-row gap-1.5 rounded-control border-2 border-line bg-surface p-1.5">
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
              className={`min-h-[56px] flex-1 items-center justify-center rounded-xl px-1 py-2 active:opacity-80 ${selected ? TONES[tone].fill : ''}`}>
              <Text className={`text-center text-body ${selected ? 'font-heading text-on-color' : 'font-medium text-ink-muted'}`}>
                {option.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
