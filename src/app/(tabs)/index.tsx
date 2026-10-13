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
import {
  type Prayer,
  type PrayerId,
  sampleDoneItems,
  sampleLoggedPrayers,
  samplePrayers,
  sampleReading,
  sampleStreak,
  sampleTodayItems,
  sampleUser,
} from '@/data/sample';
import { tapHaptic } from '@/lib/haptics';
import { formatDate, minutesOfDay } from '@/lib/time';
import { useNow } from '@/lib/use-now';
import { useThemeColors } from '@/theme/colors';

const DAY = 24 * 60;

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
  const router = useRouter();
  const colors = useThemeColors();
  const { top } = useSafeAreaInsets();
  const tabBarSpace = useTabBarSpace();
  const now = useNow();

  // Held for the session only, until there is storage to write to.
  const [logged, setLogged] = useState(() => new Set<PrayerId>(sampleLoggedPrayers));
  const [doneItems, setDoneItems] = useState(() => new Set(sampleDoneItems));

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
    <ScrollView
      className="flex-1 bg-canvas"
      contentContainerStyle={{ paddingTop: top + 12, paddingBottom: tabBarSpace, alignItems: 'center' }}>
      <View className="w-full max-w-[560px] px-6">
        <HomeHeader
          name={sampleUser.name}
          streak={sampleStreak}
          onStreakPress={() => router.navigate('/you')}
        />

        <View className="mt-6">
          <NextPrayer
            next={next}
            minutesUntil={minutesUntil}
            tomorrow={!laterToday}
            current={current}
            currentLogged={current ? logged.has(current.id) : false}
            onLogCurrent={() => current && setLogged((set) => new Set(set).add(current.id))}
          />
        </View>

        <Text accessibilityRole="header" className="mt-8 font-heading text-headline text-ink">
          {"Today's prayers"}
        </Text>
        <Text className="font-medium text-label text-ink-muted">{formatDate(now)}</Text>
        {/* Rows carry their own side padding for the highlight, so they sit 12px outside the margin. */}
        <View className="-mx-3 mt-2">
          {samplePrayers.map((prayer) => (
            <PrayerRow
              key={prayer.id}
              prayer={prayer}
              status={statusOf(prayer, minutes, logged.has(prayer.id))}
              onToggle={() => togglePrayer(prayer.id)}
            />
          ))}
        </View>

        <View className="mt-8 flex-row items-center justify-between gap-3">
          <Text accessibilityRole="header" className="flex-1 font-heading text-headline text-ink">
            Also today
          </Text>
          <Pressable
            accessibilityRole="link"
            accessibilityLabel="See all habits and tasks"
            onPress={() => router.navigate('/habits')}
            hitSlop={8}
            className="min-h-[48px] flex-row items-center gap-1 active:opacity-70">
            <Text className="font-medium text-label text-ink-muted">See all</Text>
            <CaretRightIcon size={16} weight="bold" color={colors.inkSubtle} />
          </Pressable>
        </View>
        <View>
          <TodayRow
            tone="quran"
            icon={BookOpenIcon}
            title="Continue reading"
            detail={`${sampleReading.surah}, ayah ${sampleReading.ayah}`}
            onPress={() => router.navigate('/quran')}
          />
          {sampleTodayItems.map((item) => (
            <TodayRow
              key={item.id}
              tone={item.kind === 'habit' ? 'habits' : 'tasks'}
              icon={item.kind === 'habit' ? RepeatIcon : ListChecksIcon}
              title={item.title}
              detail={item.kind === 'habit' ? 'Habit' : 'Task'}
              done={doneItems.has(item.id)}
              onPress={() => toggleItem(item.id)}
            />
          ))}
        </View>
      </View>
    </ScrollView>
  );
}
