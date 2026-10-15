import { CheckIcon } from 'phosphor-react-native/src/icons/Check';
import { memo } from 'react';
import { Pressable, Text, View } from 'react-native';

import { tapHaptic } from '@/lib/haptics';
import { useStableCallback } from '@/lib/use-stable-callback';
import { ON_COLOR, useThemeColors } from '@/theme/colors';
import { font, radius, text, themedStyles } from '@/theme/styles';
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

const useStyles = themedStyles((c) => ({
  mark: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  markEmpty: { borderWidth: 2, borderColor: c.inkSubtle },
  list: { gap: 12 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  cell: { flexBasis: '47%', flexGrow: 1 },
  row: { minHeight: 68, flexDirection: 'row', alignItems: 'center', gap: 16, paddingHorizontal: 20, paddingVertical: 12 },
  rowText: { flex: 1 },
  rowTitle: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', columnGap: 8 },
  label: text('heading', 'title', c.ink),
  suggested: text('heading', 'caption', c.inkMuted),
  detail: { ...text('body', 'label', c.inkMuted), marginTop: 4 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  chip: { minHeight: 52, flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 20, paddingVertical: 10 },
  chipCheck: { width: 24, height: 24, alignItems: 'center', justifyContent: 'center', borderRadius: radius.full },
  chipOn: text('heading', 'body', c.ink),
  chipOff: text('medium', 'body', c.inkMuted),
  chipDetail: { fontFamily: font.body, color: c.inkSubtle },
  segmented: { gap: 8 },
  segmentedLabel: text('heading', 'body', c.inkMuted),
  track: {
    flexDirection: 'row',
    gap: 6,
    borderRadius: radius.control,
    borderWidth: 2,
    borderColor: c.line,
    backgroundColor: c.surface,
    padding: 6,
  },
  segment: {
    minHeight: 56,
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    paddingHorizontal: 4,
    paddingVertical: 8,
  },
  segmentOn: { ...text('heading', 'body', ON_COLOR), textAlign: 'center' },
  segmentOff: { ...text('medium', 'body', c.inkMuted), textAlign: 'center' },
  pressed: { opacity: 0.8 },
}));

/** A round mark for one answer, a rounded square for several. Filled with a Night check when chosen. */
export function Mark({ selected, multiple, tone }: { selected: boolean; multiple: boolean; tone: Tone }) {
  const s = useStyles();
  const c = useThemeColors();
  const shape = { borderRadius: multiple ? 8 : radius.full };
  if (!selected) return <View style={[s.mark, s.markEmpty, shape]} />;
  return (
    <View style={[s.mark, shape, { backgroundColor: c[TONES[tone].fill] }]}>
      <CheckIcon size={18} weight="bold" color={ON_COLOR} />
    </View>
  );
}

// Rows take plain values, not the option object: steps often build their options inline, and a new
// object each render would defeat the memo.
type RowProps = {
  id: string;
  label: string;
  detail?: string;
  selected: boolean;
  multiple: boolean;
  tone: Tone;
  suggested: boolean;
  wide: boolean;
  onToggle: (id: string) => void;
};

// Memoized with a stable `onToggle`, so choosing one row re-renders that row (and the one it replaces).
const OptionRow = memo(function OptionRow({ id, label, detail, selected, multiple, tone, suggested, wide, onToggle }: RowProps) {
  const s = useStyles();
  return (
    <Lipped
      selected={selected}
      tone={tone}
      style={wide ? s.cell : undefined}
      faceStyle={s.row}
      accessibilityRole={multiple ? 'checkbox' : 'radio'}
      accessibilityState={multiple ? { checked: selected } : { selected }}
      accessibilityLabel={[label, detail, suggested ? 'suggested' : null].filter(Boolean).join(', ')}
      onPress={() => onToggle(id)}>
      <View style={s.rowText}>
        <View style={s.rowTitle}>
          <Text style={s.label}>{label}</Text>
          {suggested ? <Text style={s.suggested}>Suggested</Text> : null}
        </View>
        {detail ? <Text style={s.detail}>{detail}</Text> : null}
      </View>
      <Mark selected={selected} multiple={multiple} tone={tone} />
    </Lipped>
  );
});

/** Raised rows to choose from: radio rows for one answer, checkbox rows for several. */
export function OptionList<T extends string>(props: ListProps<T>) {
  const s = useStyles();
  const { options, tone = 'neutral', suggested, columns = 1 } = props;
  const multiple = props.multiple === true;
  const isSelected = (id: T) => (props.multiple ? props.value.includes(id) : props.value === id);

  const toggle = useStableCallback((id: string) => {
    const option = id as T;
    if (props.multiple) {
      props.onChange(props.value.includes(option) ? props.value.filter((v) => v !== option) : [...props.value, option]);
    } else {
      props.onChange(option);
    }
  });

  return (
    <View accessibilityRole={multiple ? undefined : 'radiogroup'} style={columns === 2 ? s.grid : s.list}>
      {options.map((option) => (
        <OptionRow
          key={option.id}
          id={option.id}
          label={option.label}
          detail={option.detail}
          selected={isSelected(option.id)}
          multiple={multiple}
          tone={tone}
          suggested={option.id === suggested}
          wide={columns === 2}
          onToggle={toggle}
        />
      ))}
    </View>
  );
}

type ChipProps = {
  id: string;
  label: string;
  detail?: string;
  selected: boolean;
  single: boolean;
  tone: Tone;
  onToggle: (id: string) => void;
};

const Chip = memo(function Chip({ id, label, detail, selected, single, tone, onToggle }: ChipProps) {
  const s = useStyles();
  const c = useThemeColors();
  return (
    <Lipped
      shape="pill"
      selected={selected}
      tone={tone}
      faceStyle={s.chip}
      accessibilityRole={single ? 'radio' : 'checkbox'}
      accessibilityState={single ? { selected } : { checked: selected }}
      accessibilityLabel={detail ? `${label}, ${detail}` : label}
      onPress={() => onToggle(id)}>
      {selected ? (
        <View style={[s.chipCheck, { backgroundColor: c[TONES[tone].fill] }]}>
          <CheckIcon size={14} weight="bold" color={ON_COLOR} />
        </View>
      ) : null}
      <Text style={selected ? s.chipOn : s.chipOff}>
        {label}
        {detail ? <Text style={s.chipDetail}>{`  ${detail}`}</Text> : null}
      </Text>
    </Lipped>
  );
});

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
  const s = useStyles();
  const toggle = useStableCallback((id: string) => {
    const option = id as T;
    onChange(single ? [option] : value.includes(option) ? value.filter((v) => v !== option) : [...value, option]);
  });
  return (
    <View accessibilityRole={single ? 'radiogroup' : undefined} accessibilityLabel={label} style={s.chips}>
      {options.map((option) => (
        <Chip
          key={option.id}
          id={option.id}
          label={option.label}
          detail={option.detail}
          selected={value.includes(option.id)}
          single={single}
          tone={tone}
          onToggle={toggle}
        />
      ))}
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
  const s = useStyles();
  const c = useThemeColors();
  return (
    <View style={s.segmented}>
      <Text style={s.segmentedLabel}>{label}</Text>
      <View accessibilityRole="radiogroup" accessibilityLabel={label} style={s.track}>
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
              style={({ pressed }) => [s.segment, selected && { backgroundColor: c[TONES[tone].fill] }, pressed && s.pressed]}>
              <Text style={selected ? s.segmentOn : s.segmentOff}>{option.label}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
