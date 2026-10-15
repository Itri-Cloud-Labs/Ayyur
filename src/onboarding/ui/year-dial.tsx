import { useEffect, useMemo, useRef, useState } from 'react';
import { type NativeScrollEvent, type NativeSyntheticEvent, Pressable, ScrollView, Text, View } from 'react-native';

import { tapHaptic } from '@/lib/haptics';

const ITEM = 76;
const FIRST = 1930;

/**
 * A tall wheel of years that fills the space it's given, with the chosen year in a window across the
 * middle. Nothing is chosen until the user scrolls it or taps a year, so no birth year is ever assumed.
 * Screen readers get one adjustable control.
 */
export function YearDial({ value, onChange }: { value: number | null; onChange: (year: number) => void }) {
  const last = new Date().getFullYear();
  const years = useMemo(() => Array.from({ length: last - FIRST + 1 }, (_, i) => FIRST + i), [last]);
  const resting = value ?? 2000;
  const scroller = useRef<ScrollView>(null);
  const [height, setHeight] = useState(0);
  const [centre, setCentre] = useState(resting);
  const touched = useRef(value !== null);
  const ready = useRef(false);
  const settle = useRef<ReturnType<typeof setTimeout>>(undefined);

  const offsetFor = (year: number) => (year - FIRST) * ITEM;

  useEffect(() => {
    if (!height) return;
    scroller.current?.scrollTo({ y: offsetFor(resting), animated: false });
    const t = setTimeout(() => (ready.current = true), 400);
    return () => clearTimeout(t);
    // Only when the wheel is first measured.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [height]);
  useEffect(() => () => clearTimeout(settle.current), []);

  const commit = (year: number) => {
    if (!touched.current || year === value) return;
    tapHaptic();
    onChange(year);
  };

  const onScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    // Scrolling after the wheel has settled into place is the user's own; before that it is ours.
    if (ready.current) touched.current = true;
    const year = Math.min(last, Math.max(FIRST, Math.round(event.nativeEvent.contentOffset.y / ITEM) + FIRST));
    setCentre(year);
    clearTimeout(settle.current);
    settle.current = setTimeout(() => commit(year), 140);
  };

  const pick = (year: number) => {
    touched.current = true;
    scroller.current?.scrollTo({ y: offsetFor(year), animated: true });
    setCentre(year);
    commit(year);
  };

  const pad = Math.max(0, (height - ITEM) / 2);
  const chosen = value !== null;

  return (
    <View
      accessible
      accessibilityRole="adjustable"
      accessibilityLabel="Birth year"
      accessibilityValue={{ text: chosen ? String(value) : 'Not chosen' }}
      accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
      onAccessibilityAction={(event) =>
        pick(Math.min(last, Math.max(FIRST, (value ?? resting) + (event.nativeEvent.actionName === 'increment' ? 1 : -1))))
      }
      onLayout={(e) => setHeight(e.nativeEvent.layout.height)}
      className="flex-1">
      {/* The window the chosen year sits in. Dashed until something is chosen. */}
      <View
        className={`absolute inset-x-0 rounded-card border-2 ${chosen ? 'border-moon bg-moon-soft' : 'border-dashed border-line'}`}
        style={{ top: pad - 4, height: ITEM + 8 }}
      />
      <ScrollView
        ref={scroller}
        showsVerticalScrollIndicator={false}
        snapToInterval={ITEM}
        decelerationRate="fast"
        scrollEventThrottle={32}
        nestedScrollEnabled
        onScrollBeginDrag={() => (touched.current = true)}
        onScroll={onScroll}
        contentContainerStyle={{ paddingVertical: pad }}>
        {years.map((year) => {
          const distance = Math.abs(year - centre);
          return (
            <Pressable
              key={year}
              accessible={false}
              onPress={() => pick(year)}
              style={{ height: ITEM, opacity: distance > 3 ? 0.18 : 1 - distance * 0.24 }}
              className="items-center justify-center">
              <Text
                className={
                  distance === 0
                    ? `font-display text-hero ${chosen ? 'text-moon-text' : 'text-ink-muted'}`
                    : distance === 1
                      ? 'font-heading text-headline text-ink-muted'
                      : 'font-medium text-title text-ink-subtle'
                }>
                {year}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}
