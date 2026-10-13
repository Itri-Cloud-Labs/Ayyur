import { Pressable, Text, View } from 'react-native';

import { StatusMark } from '@/components/status-mark';
import type { Prayer } from '@/data/sample';
import { formatClock } from '@/lib/time';

/** `upcoming` cannot be logged yet. `unrecorded` is past with nothing logged: never called missed. */
export type PrayerStatus = 'done' | 'current' | 'upcoming' | 'unrecorded';

const SPOKEN: Record<PrayerStatus, string> = {
  done: 'logged',
  current: 'now, not logged yet',
  upcoming: 'not yet time',
  unrecorded: 'not logged',
};

export function PrayerRow({ prayer, status, onToggle }: { prayer: Prayer; status: PrayerStatus; onToggle: () => void }) {
  const upcoming = status === 'upcoming';
  const time = formatClock(prayer.start);

  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityLabel={`${prayer.name}, ${time}, ${SPOKEN[status]}`}
      accessibilityState={{ checked: status === 'done', disabled: upcoming }}
      disabled={upcoming}
      onPress={onToggle}
      className={`min-h-[60px] flex-row items-center gap-3 rounded-control px-3 py-2 active:opacity-70 ${
        status === 'current' ? 'bg-surface' : ''
      }`}>
      <View className="flex-1">
        <Text className={`font-heading text-title ${upcoming ? 'text-ink-muted' : 'text-ink'}`}>{prayer.name}</Text>
        <View className="flex-row flex-wrap items-center gap-x-2">
          <Text className="font-medium text-label text-ink-muted">{time}</Text>
          {status === 'current' ? <Text className="font-heading text-label text-prayer-text">Now</Text> : null}
        </View>
      </View>
      {status === 'unrecorded' ? <Text className="font-medium text-caption text-ink-subtle">Not logged</Text> : null}
      <StatusMark tone="prayer" state={status === 'done' ? 'done' : status === 'unrecorded' ? 'unrecorded' : 'pending'} />
    </Pressable>
  );
}
