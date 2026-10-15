import { CheckIcon } from 'phosphor-react-native/src/icons/Check';
import { Text, View } from 'react-native';

import { Button } from '@/components/button';
import type { Prayer } from '@/data/sample';
import { formatClock, formatCountdown } from '@/lib/time';
import { useThemeColors } from '@/theme/colors';
import { radius, text, themedStyles } from '@/theme/styles';

const useStyles = themedStyles((c) => ({
  card: { gap: 20, borderRadius: radius.card, backgroundColor: c.prayerSoft, padding: 20 },
  kicker: text('medium', 'label', c.prayerText),
  name: { ...text('heading', 'headline', c.ink), marginTop: 4 },
  countdown: { ...text('display', 'hero', c.ink), letterSpacing: -0.88 },
  time: { ...text('body', 'body', c.inkMuted), marginTop: 4 },
  logged: { flexDirection: 'row', alignItems: 'center', gap: 8 },
}));

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
  const s = useStyles();
  const colors = useThemeColors();
  const countdown = formatCountdown(minutesUntil);
  const time = `${formatClock(next.start)}${tomorrow ? ' tomorrow' : ''}`;

  return (
    <View style={s.card}>
      <View accessible accessibilityLabel={`Next prayer, ${next.name}, ${countdown}, at ${time}`}>
        <Text style={s.kicker}>Next prayer</Text>
        <Text style={s.name}>{next.name}</Text>
        <Text numberOfLines={1} adjustsFontSizeToFit style={s.countdown}>
          {countdown}
        </Text>
        <Text style={s.time}>{time}</Text>
      </View>

      {current && !currentLogged ? (
        <Button tone="prayer" label={`Log ${current.name}`} onPress={onLogCurrent} />
      ) : current ? (
        <View style={s.logged}>
          <CheckIcon size={20} weight="bold" color={colors.prayerText} />
          <Text style={s.kicker}>{current.name} logged</Text>
        </View>
      ) : null}
    </View>
  );
}
