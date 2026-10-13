import { CheckIcon } from 'phosphor-react-native/src/icons/Check';
import { Text, View } from 'react-native';

import { Button } from '@/components/button';
import type { Prayer } from '@/data/sample';
import { formatClock, formatCountdown } from '@/lib/time';
import { useThemeColors } from '@/theme/colors';

type NextPrayerProps = {
  next: Prayer;
  minutesUntil: number;
  tomorrow: boolean;
  /** The prayer whose time it is now, if any. */
  current?: Prayer;
  currentLogged: boolean;
  onLogCurrent: () => void;
};

export function NextPrayer({ next, minutesUntil, tomorrow, current, currentLogged, onLogCurrent }: NextPrayerProps) {
  const colors = useThemeColors();
  const countdown = formatCountdown(minutesUntil);
  const time = `${formatClock(next.start)}${tomorrow ? ' tomorrow' : ''}`;

  return (
    <View className="gap-5 rounded-card bg-prayer-soft p-5">
      <View accessible accessibilityLabel={`Next prayer, ${next.name}, ${countdown}, at ${time}`}>
        <Text className="font-medium text-label text-prayer-text">Next prayer</Text>
        <Text className="mt-1 font-heading text-headline text-ink">{next.name}</Text>
        <Text numberOfLines={1} adjustsFontSizeToFit className="font-display text-hero text-ink" style={{ letterSpacing: -0.88 }}>
          {countdown}
        </Text>
        <Text className="mt-1 font-body text-body text-ink-muted">{time}</Text>
      </View>

      {current && !currentLogged ? (
        <Button tone="prayer" label={`Log ${current.name}`} onPress={onLogCurrent} />
      ) : current ? (
        <View className="flex-row items-center gap-2">
          <CheckIcon size={20} weight="bold" color={colors.prayerText} />
          <Text className="font-medium text-label text-prayer-text">{current.name} logged</Text>
        </View>
      ) : null}
    </View>
  );
}
