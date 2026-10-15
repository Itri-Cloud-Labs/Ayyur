import { useRouter } from 'expo-router';
import { BookOpenIcon } from 'phosphor-react-native/src/icons/BookOpen';
import { CaretRightIcon } from 'phosphor-react-native/src/icons/CaretRight';
import { ListChecksIcon } from 'phosphor-react-native/src/icons/ListChecks';
import { RepeatIcon } from 'phosphor-react-native/src/icons/Repeat';
import { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { HomeHeader } from '@/components/home/home-header';
import { NextPrayer } from '@/components/home/next-prayer';
import { PrayerRow, type PrayerStatus } from '@/components/home/prayer-row';
import { TodayRow } from '@/components/home/today-row';
import { useTabBarSpace } from '@/components/tab-bar/visibility';
import { useOnboarding } from '@/onboarding/store';
import { type Prayer, type PrayerId, sampleDoneItems, sampleLoggedPrayers, sampleStreak, type TodayItem } from '@/data/sample';
import { todayPrayers, wants } from '@/onboarding/data';
import { tapHaptic } from '@/lib/haptics';
import { formatDate, minutesOfDay } from '@/lib/time';
import { useNow } from '@/lib/use-now';
import { useThemeColors } from '@/theme/colors';
import { text, themedStyles } from '@/theme/styles';

const DAY = 24 * 60;

const useStyles = themedStyles((c) => ({
  screen: { flex: 1, backgroundColor: c.canvas },
  page: { width: '100%', maxWidth: 560, paddingHorizontal: 24 },
  next: { marginTop: 24 },
  heading: { ...text('heading', 'headline', c.ink), marginTop: 32 },
  date: text('medium', 'label', c.inkMuted),
  // Rows carry their own side padding for the highlight, so they sit 12px outside the margin.
  prayers: { marginHorizontal: -12, marginTop: 8 },
  alsoHead: { marginTop: 32, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  alsoTitle: { ...text('heading', 'headline', c.ink), flex: 1 },
  seeAll: { minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: 4 },
  pressed: { opacity: 0.7 },
}));

/** Adds to a set if absent, removes if present. */
function toggled<T>(set: Set<T>, value: T) {
  const next = new Set(set);
  if (!next.delete(value)) next.add(value);
  return next;
}

function statusOf(prayer: Prayer, minutes: number, logged: boolean): PrayerStatus {
  if (logged) return 'done';
  if (minutes < prayer.start) return 'upcoming';
  return minutes < prayer.end ? 'current' : 'unrecorded';
}

export default function HomeScreen() {
  const s = useStyles();
  const router = useRouter();
  const colors = useThemeColors();
  const { top } = useSafeAreaInsets();
  const tabBarSpace = useTabBarSpace();
  const now = useNow();
  const answers = useOnboarding((s) => s.answers);

  // Held for the session only, until there is storage to write to.
  const [logged, setLogged] = useState(() => new Set<PrayerId>(sampleLoggedPrayers));
  const [doneItems, setDoneItems] = useState(() => new Set(sampleDoneItems));

  // The times and habits the user set up in onboarding, not sample ones.
  const samplePrayers = todayPrayers(answers);
  const habits: TodayItem[] = [...answers.habits, answers.ownHabit.trim()]
    .filter(Boolean)
    .slice(0, 4)
    .map((title) => ({ id: `habit-${title}`, kind: 'habit', title }));
  const minutes = minutesOfDay(now);
  const current = samplePrayers.find((prayer) => minutes >= prayer.start && minutes < prayer.end);
  const laterToday = samplePrayers.find((prayer) => prayer.start > minutes);
  const next = laterToday ?? samplePrayers[0];
  const minutesUntil = laterToday ? next.start - minutes : next.start + DAY - minutes;

  const togglePrayer = (id: PrayerId) => {
    tapHaptic();
    setLogged((set) => toggled(set, id));
  };
  const toggleItem = (id: string) => {
    tapHaptic();
    setDoneItems((set) => toggled(set, id));
  };

  return (
    <ScrollView style={s.screen} contentContainerStyle={{ paddingTop: top + 12, paddingBottom: tabBarSpace, alignItems: 'center' }}>
      <View style={s.page}>
        <HomeHeader name={answers.name.trim() || null} streak={sampleStreak} onStreakPress={() => router.navigate('/you')} />

        <View style={s.next}>
          <NextPrayer
            next={next}
            minutesUntil={minutesUntil}
            tomorrow={!laterToday}
            current={current}
            currentLogged={current ? logged.has(current.id) : false}
            onLogCurrent={() => current && setLogged((set) => new Set(set).add(current.id))}
          />
        </View>

        <Text accessibilityRole="header" style={s.heading}>
          {"Today's prayers"}
        </Text>
        <Text style={s.date}>{formatDate(now)}</Text>
        <View style={s.prayers}>
          {samplePrayers.map((prayer) => (
            <PrayerRow
              key={prayer.id}
              prayer={prayer}
              status={statusOf(prayer, minutes, logged.has(prayer.id))}
              onToggle={() => togglePrayer(prayer.id)}
            />
          ))}
        </View>

        <View style={s.alsoHead}>
          <Text accessibilityRole="header" style={s.alsoTitle}>
            Also today
          </Text>
          <Pressable
            accessibilityRole="link"
            accessibilityLabel="See all habits and tasks"
            onPress={() => router.navigate('/habits')}
            hitSlop={8}
            style={({ pressed }) => [s.seeAll, pressed && s.pressed]}>
            <Text style={s.date}>See all</Text>
            <CaretRightIcon size={16} weight="bold" color={colors.inkSubtle} />
          </Pressable>
        </View>
        <View>
          {wants(answers, 'quran') ? (
            <TodayRow
              tone="quran"
              icon={BookOpenIcon}
              title="Start reading"
              detail="Al-Fatihah, from the beginning"
              onPress={() => router.navigate('/quran')}
            />
          ) : null}
          {habits.map((item) => (
            <TodayRow
              key={item.id}
              tone="habits"
              icon={RepeatIcon}
              title={item.title}
              detail="Habit"
              done={doneItems.has(item.id)}
              onPress={() => toggleItem(item.id)}
            />
          ))}
          {habits.length === 0 ? (
            <TodayRow
              tone="habits"
              icon={ListChecksIcon}
              title="Pick a habit to start"
              detail="Small and daily works best"
              onPress={() => router.navigate('/habits')}
            />
          ) : null}
        </View>
      </View>
    </ScrollView>
  );
}
