import { Pressable, Text, View } from 'react-native';

import { StatusMark } from '@/components/status-mark';
import type { Prayer } from '@/data/sample';
import { formatClock } from '@/lib/time';
import { radius, text, themedStyles } from '@/theme/styles';

const useStyles = themedStyles((c) => ({
  row: {
    minHeight: 60,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: radius.control,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  current: { backgroundColor: c.surface },
  pressed: { opacity: 0.7 },
  fill: { flex: 1 },
  name: text('heading', 'title', c.ink),
  nameLater: text('heading', 'title', c.inkMuted),
  meta: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', columnGap: 8 },
  time: text('medium', 'label', c.inkMuted),
  now: text('heading', 'label', c.prayerText),
  unlogged: text('medium', 'caption', c.inkSubtle),
}));

/** `upcoming` cannot be logged yet. `unrecorded` is past with nothing logged: never called missed. */
export type PrayerStatus = 'done' | 'current' | 'upcoming' | 'unrecorded';

const SPOKEN: Record<PrayerStatus, string> = {
  done: 'logged',
  current: 'now, not logged yet',
  upcoming: 'not yet time',
  unrecorded: 'not logged',
};

export function PrayerRow({ prayer, status, onToggle }: { prayer: Prayer; status: PrayerStatus; onToggle: () => void }) {
  const s = useStyles();
  const upcoming = status === 'upcoming';
  const time = formatClock(prayer.start);

  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityLabel={`${prayer.name}, ${time}, ${SPOKEN[status]}`}
      accessibilityState={{ checked: status === 'done', disabled: upcoming }}
      disabled={upcoming}
      onPress={onToggle}
      style={({ pressed }) => [s.row, status === 'current' && s.current, pressed && s.pressed]}>
      <View style={s.fill}>
        <Text style={upcoming ? s.nameLater : s.name}>{prayer.name}</Text>
        <View style={s.meta}>
          <Text style={s.time}>{time}</Text>
          {status === 'current' ? <Text style={s.now}>Now</Text> : null}
        </View>
      </View>
      {status === 'unrecorded' ? <Text style={s.unlogged}>Not logged</Text> : null}
      <StatusMark tone="prayer" state={status === 'done' ? 'done' : status === 'unrecorded' ? 'unrecorded' : 'pending'} />
    </Pressable>
  );
}
