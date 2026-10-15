import { BellIcon } from 'phosphor-react-native/src/icons/Bell';
import { BellSlashIcon } from 'phosphor-react-native/src/icons/BellSlash';
import { LockIcon } from 'phosphor-react-native/src/icons/Lock';
import { MagnifyingGlassIcon } from 'phosphor-react-native/src/icons/MagnifyingGlass';
import { MapPinIcon } from 'phosphor-react-native/src/icons/MapPin';
import { NavigationArrowIcon } from 'phosphor-react-native/src/icons/NavigationArrow';
import { useMemo, useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { Button } from '@/components/button';
import type { PrayerId } from '@/data/sample';
import { tapHaptic } from '@/lib/haptics';
import { formatClock } from '@/lib/time';
import { useThemeColors } from '@/theme/colors';

import { cities, countryAsr, deviceCity, extraPrayers, madhhabs, methods, previewTimes, suggestedMethod } from '../data';
import { useFlow } from '../flow';
import { StepLayout } from '../shell';
import type { Asr, City, Madhhab, ReminderSound, ReminderWhen } from '../types';
import { Field, Stepper, SwitchRow } from '../ui/controls';
import { DayArc } from '../ui/day-arc';
import { Chips, OptionList, Segmented } from '../ui/options';
import { ShadowDiagram } from '../ui/shadow-diagram';
import { SimulatedPrompt } from '../ui/sheets';
import { Tile } from '../ui/tile';
import { useAutoAdvance } from './shared';

function PrivacyNote({ children }: { children: string }) {
  const colors = useThemeColors();
  return (
    <View className="flex-row items-start gap-2">
      <View className="pt-0.5">
        <LockIcon size={16} weight="fill" color={colors.inkSubtle} />
      </View>
      <Text className="flex-1 font-body text-label text-ink-muted">{children}</Text>
    </View>
  );
}

export function Location() {
  const { answers, set, next } = useFlow();
  const colors = useThemeColors();
  const [mode, setMode] = useState<'choose' | 'search'>(answers.cityFrom === 'search' ? 'search' : 'choose');
  const [asking, setAsking] = useState(false);
  const [query, setQuery] = useState('');

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = q ? cities.filter((c) => `${c.name} ${c.country}`.toLowerCase().includes(q)) : cities;
    return list.slice(0, 7);
  }, [query]);

  const choose = (city: City) => {
    tapHaptic();
    set({ city, cityFrom: 'search', method: null });
  };

  const found = answers.city && answers.cityFrom === 'device';
  const declined = answers.locationPermission === 'denied';

  return (
    <StepLayout
      fill={mode === 'choose' && !found ? 340 : undefined}
      cue={{
        expression: answers.city ? 'delighted' : mode === 'search' ? 'listening' : 'curious',
        say: answers.city ? `${answers.city.name}, got it.` : 'Where are you, so I can get your prayer times right?',
      }}
      footer={answers.city ? <Button label="Continue" onPress={next} /> : undefined}>
      {mode === 'choose' && !found ? (
        <View className="flex-1 gap-3">
          <Tile icon={NavigationArrowIcon} tone="prayer" title="Use my location" detail="One tap. I’ll ask your phone first." onPress={() => setAsking(true)} />
          <Tile icon={MagnifyingGlassIcon} tone="prayer" title="Choose a city" detail="Search by name. Nothing is shared." onPress={() => setMode('search')} />
          <PrivacyNote>Either way, your location stays on this phone. I only use it to work out prayer times and the qibla.</PrivacyNote>
        </View>
      ) : null}

      {found ? (
        <View className="gap-4">
          <View className="flex-row items-center gap-3 rounded-card bg-prayer-soft p-4">
            <MapPinIcon size={24} weight="fill" color={colors.prayerText} />
            <View className="flex-1">
              <Text className="font-heading text-title text-ink">{answers.city!.name}</Text>
              <Text className="font-body text-label text-ink-muted">{answers.city!.country}, from your phone’s location</Text>
            </View>
          </View>
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              set({ city: null, cityFrom: null });
              setMode('search');
            }}
            className="min-h-[48px] justify-center self-start active:opacity-70">
            <Text className="font-medium text-label text-prayer-text">Not right? Choose a city</Text>
          </Pressable>
        </View>
      ) : null}

      {mode === 'search' ? (
        <View className="gap-3">
          {declined ? <Text className="font-body text-label text-ink-muted">No problem. Let’s find your city instead.</Text> : null}
          <Field
            autoFocus
            tone="prayer"
            value={query}
            onChangeText={setQuery}
            placeholder="Search for your city"
            accessibilityLabel="Search for your city"
            autoCorrect={false}
            returnKeyType="search"
          />
          <View accessibilityRole="radiogroup" className="gap-1">
            {results.map((city) => {
              const selected = answers.city?.id === city.id;
              return (
                <Pressable
                  key={city.id}
                  accessibilityRole="radio"
                  accessibilityState={{ selected }}
                  accessibilityLabel={`${city.name}, ${city.country}`}
                  onPress={() => choose(city)}
                  className={`min-h-[52px] flex-row items-center gap-3 rounded-control px-3 py-2 active:opacity-80 ${
                    selected ? 'bg-prayer-soft' : ''
                  }`}>
                  <MapPinIcon size={20} weight={selected ? 'fill' : 'regular'} color={selected ? colors.prayerText : colors.inkSubtle} />
                  <Text className="flex-1 font-medium text-body text-ink">
                    {city.name}
                    <Text className="font-body text-ink-muted">{`, ${city.country}`}</Text>
                  </Text>
                </Pressable>
              );
            })}
            {results.length === 0 ? (
              <Text className="px-3 py-4 font-body text-label text-ink-muted">
                I don’t know that one yet. Try the nearest big city; you can fine-tune times next.
              </Text>
            ) : null}
          </View>
          <PrivacyNote>Searching happens on this phone. Nothing about where you are is sent anywhere.</PrivacyNote>
        </View>
      ) : null}

      <SimulatedPrompt
        visible={asking}
        title="Allow “Ayyur” to use your location?"
        body="Used to work out your prayer times and the qibla direction."
        actions={[
          {
            label: 'Allow while using the app',
            strong: true,
            onPress: () => {
              setAsking(false);
              set({ locationPermission: 'granted', city: deviceCity, cityFrom: 'device', method: null });
            },
          },
          {
            label: 'Don’t allow',
            onPress: () => {
              setAsking(false);
              set({ locationPermission: 'denied' });
              setMode('search');
            },
          },
        ]}
      />
    </StepLayout>
  );
}

export function MadhhabStep() {
  const { answers, set, next } = useFlow();
  return (
    <StepLayout
      cue={{
        expression: answers.madhhab ? 'happy' : 'thinking',
        say: 'Do you follow a madhhab?',
        hint: 'A school of Islamic law, often the one your family or community follows. It shapes details like when Asr begins.',
      }}
      footer={<Button label="Continue" onPress={next} disabled={!answers.madhhab} />}>
      <OptionList<Madhhab>
        tone="prayer"
        value={answers.madhhab}
        onChange={(madhhab) => {
          // The Asr question that follows starts from the madhhab, but stays its own choice.
          const asr: Asr | null = madhhab === 'hanafi' ? 'hanafi' : madhhab === 'none' ? null : 'standard';
          set({ madhhab, asr });
        }}
        options={madhhabs.map((m) => ({ id: m.id, label: m.name, detail: m.about }))}
      />
    </StepLayout>
  );
}

export function AsrStep() {
  const { answers, set, next } = useFlow();
  const times = previewTimes({ ...answers, asr: 'standard' });
  const later = previewTimes({ ...answers, asr: 'hanafi' });
  const asrAt = (list: typeof times) => formatClock(list.find((t) => t.id === 'asr')!.minutes);
  const fromMadhhab =
    answers.madhhab && answers.madhhab !== 'none' && answers.asr === (answers.madhhab === 'hanafi' ? 'hanafi' : 'standard');
  const country = answers.city?.country;
  const fallback = countryAsr(answers.city);

  const option = (id: Asr, label: string, schools: string, time: string) => {
    const selected = answers.asr === id;
    return (
      <Pressable
        accessibilityRole="radio"
        accessibilityState={{ selected }}
        accessibilityLabel={`${label}, ${schools}, about ${time} today`}
        onPress={() => {
          tapHaptic();
          set({ asr: id });
        }}
        className={`flex-1 justify-between rounded-card border-2 p-4 active:opacity-80 ${selected ? 'border-prayer bg-prayer-soft' : 'border-line bg-surface'}`}>
        <View className="min-h-[72px] flex-1 justify-center">
          <ShadowDiagram times={id === 'standard' ? 1 : 2} lit={selected} />
        </View>
        <View>
          <Text className="mt-2 font-display text-headline text-ink">{label}</Text>
          <Text className="font-body text-label text-ink-muted">{schools}</Text>
          {/* The hour large and am/pm small, so the time fits a narrow card on one line. */}
          <Text numberOfLines={1} className={`mt-3 font-display text-headline ${selected ? 'text-prayer-text' : 'text-ink-muted'}`}>
            {time.split(' ')[0]}
            <Text className="font-heading text-label">{` ${time.split(' ')[1]}`}</Text>
          </Text>
        </View>
      </Pressable>
    );
  };

  return (
    <StepLayout
      fill={330}
      cue={{
        expression: answers.asr ? 'happy' : 'thinking',
        say: 'Which Asr time do you follow?',
        hint: 'Asr begins when a shadow is as long as what casts it, or twice as long in the Hanafi school.',
      }}
      footer={<Button label="Continue" onPress={next} disabled={!answers.asr} />}>
      <View accessibilityRole="radiogroup" className="flex-1 flex-row gap-3">
        {option('standard', 'Earlier', "Shafi'i, Maliki, Hanbali", asrAt(times))}
        {option('hanafi', 'Later', 'Hanafi', asrAt(later))}
      </View>
      <Text className="mt-3 font-body text-label text-ink-muted">
        {fromMadhhab ? 'Set from your madhhab. You can still pick the other.' : 'Times shown are for today.'}
      </Text>
      <Pressable
        accessibilityRole="button"
        onPress={() => {
          tapHaptic();
          set({ asr: fallback });
        }}
        className="mt-2 min-h-[48px] justify-center self-start active:opacity-70">
        <Text className="font-heading text-body text-prayer-text">
          {`I’m not sure: use what’s usual${country ? ` in ${country}` : ''}`}
        </Text>
      </Pressable>
    </StepLayout>
  );
}

function TimesPreview({ city }: { city: City | null }) {
  const { answers } = useFlow();
  const times = previewTimes(answers);
  return (
    <View accessible accessibilityLabel={`Today${city ? ` in ${city.name}` : ''}: ${times.map((t) => `${t.name} ${formatClock(t.minutes)}`).join(', ')}`} className="rounded-card bg-prayer-soft p-4">
      <Text className="mb-2 font-medium text-label text-prayer-text">{`Today${city ? ` in ${city.name}` : ''}`}</Text>
      <View className="flex-row justify-between">
        {times.map((t) => (
          <View key={t.id} className="items-center">
            <Text className="font-medium text-caption text-ink-muted">{t.name}</Text>
            <Text className="font-heading text-label text-ink">{formatClock(t.minutes).replace(' am', '').replace(' pm', '')}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

export function Method() {
  const { answers, set, next } = useFlow();
  const suggested = suggestedMethod(answers.city);
  const current = methods.find((m) => m.id === answers.method) ?? suggested;
  const [listing, setListing] = useState(answers.method !== null && answers.method !== suggested.id);

  return (
    <StepLayout
      cue={{
        expression: listing ? 'thinking' : 'happy',
        say: listing ? 'Which method does your mosque use?' : `I’d use ${current.name}. Sound right?`,
      }}
      footer={
        listing ? (
          <Button label="Continue" onPress={next} />
        ) : (
          <>
            <Button
              label="Yes, that’s right"
              tone="prayer"
              onPress={() => {
                set({ method: current.id });
                next();
              }}
            />
            <Button variant="secondary" label="Choose another method" onPress={() => setListing(true)} />
          </>
        )
      }>
      <TimesPreview city={answers.city} />
      <Text className="mt-4 font-body text-label text-ink-muted">
        {listing
          ? 'Methods differ mostly in how early Fajr and how late Isha fall. Watch the times above change.'
          : `${current.where}. If your mosque’s times are a few minutes different, you can fine-tune them next.`}
      </Text>
      {listing ? (
        <View className="mt-4">
          <OptionList
            tone="prayer"
            suggested={suggested.id}
            value={current.id}
            onChange={(method) => set({ method })}
            options={methods.map((m) => ({ id: m.id, label: m.name, detail: m.where }))}
          />
        </View>
      ) : null}
    </StepLayout>
  );
}

export function FineTune() {
  const { answers, set, next } = useFlow();
  const base = previewTimes({ ...answers, offsets: { fajr: 0, dhuhr: 0, asr: 0, maghrib: 0, isha: 0 } });
  const changed = Object.values(answers.offsets).some((v) => v !== 0);
  const step = (id: PrayerId, direction: 1 | -1) =>
    set({ offsets: { ...answers.offsets, [id]: Math.max(-30, Math.min(30, answers.offsets[id] + direction)) } });

  return (
    <StepLayout
      cue={{
        expression: changed ? 'happy' : 'listening',
        say: 'Want to match your mosque’s timetable?',
        hint: 'Nudge any prayer a few minutes. Most people can leave this as it is.',
      }}
      footer={<Button label={changed ? 'Save these times' : 'Looks right to me'} onPress={next} />}>
      {base.map((t) => {
        const offset = answers.offsets[t.id];
        return (
          <View key={t.id} className="min-h-[76px] flex-row items-center gap-3 border-b border-line py-2">
            <View className="flex-1">
              <Text className="font-heading text-title text-ink">{t.name}</Text>
              <Text className={`font-medium text-body ${offset ? 'text-prayer-text' : 'text-ink-muted'}`}>
                {formatClock(t.minutes + offset)}
              </Text>
            </View>
            <Stepper
              compact
              label={`${t.name} adjustment`}
              display={offset === 0 ? '0' : `${offset > 0 ? '+' : '−'}${Math.abs(offset)}`}
              spokenValue={offset === 0 ? 'no change' : `${Math.abs(offset)} minutes ${offset > 0 ? 'later' : 'earlier'}`}
              onStep={(d) => step(t.id, d)}
            />
          </View>
        );
      })}
      {changed ? (
        <Pressable
          accessibilityRole="button"
          onPress={() => set({ offsets: { fajr: 0, dhuhr: 0, asr: 0, maghrib: 0, isha: 0 } })}
          className="mt-2 min-h-[48px] justify-center self-start active:opacity-70">
          <Text className="font-medium text-label text-prayer-text">Reset all to calculated times</Text>
        </Pressable>
      ) : null}
    </StepLayout>
  );
}

export function PrayerFocus() {
  const { answers, set, next } = useFlow();
  const focus = answers.prayerFocus;
  const name = focus && focus !== 'all' ? focus[0].toUpperCase() + focus.slice(1) : null;
  return (
    <StepLayout
      cue={{
        expression: focus ? 'happy' : 'curious',
        say: name ? `${name} it is. I’ll give it a little extra care.` : focus === 'all' ? 'All five, equally. Lovely.' : 'Which prayer would you like the most help with?',
      }}
      footer={<Button label="Continue" onPress={next} disabled={!focus} />}>
      <DayArc value={focus} onChange={(prayerFocus) => set({ prayerFocus })} />
      <Pressable
        accessibilityRole="radio"
        accessibilityState={{ selected: focus === 'all' }}
        onPress={() => {
          tapHaptic();
          set({ prayerFocus: 'all' });
        }}
        className={`mt-4 min-h-[48px] items-center justify-center self-center rounded-full border-2 px-5 active:opacity-80 ${
          focus === 'all' ? 'border-prayer bg-prayer-soft' : 'border-line'
        }`}>
        <Text className="font-medium text-label text-ink">All of them equally</Text>
      </Pressable>
    </StepLayout>
  );
}

export function Congregation() {
  const { answers, set } = useFlow();
  const advance = useAutoAdvance();
  return (
    <StepLayout
      fill={280}
      cue={{ expression: answers.congregation === null ? 'curious' : 'happy', say: 'Would you like to keep track of praying in congregation?' }}>
      <View accessibilityRole="radiogroup" className="flex-1 gap-3">
        <Tile role="radio" tone="prayer" title="Yes" detail="I’ll ask “at the mosque?” when you log" selected={answers.congregation === true} onPress={() => { set({ congregation: true }); advance(); }} />
        <Tile role="radio" tone="prayer" title="Not now" detail="You can turn it on later" selected={answers.congregation === false} onPress={() => { set({ congregation: false }); advance(); }} />
      </View>
    </StepLayout>
  );
}

export function ExtraPrayers() {
  const { answers, set, next } = useFlow();
  return (
    <StepLayout
      cue={{
        expression: answers.extraPrayers.length ? 'delighted' : 'curious',
        say: 'Any extra prayers you’d like to work on?',
        hint: 'They’re optional rows in your log, and never count against a streak.',
      }}
      footer={<Button label={answers.extraPrayers.length ? 'Continue' : 'None for now'} onPress={next} />}>
      <Chips tone="prayer" value={answers.extraPrayers} onChange={(extraPrayers) => set({ extraPrayers })} options={extraPrayers} />
    </StepLayout>
  );
}

export function Reminders() {
  const { answers, set, next } = useFlow();
  const colors = useThemeColors();
  const off = answers.reminderWhen === 'none';
  const jumuah = answers.jumuah ?? answers.gender === 'male';
  const asr = previewTimes(answers).find((t) => t.id === 'asr')!;
  const lead = answers.reminderWhen === 'at' ? 'Asr is now' : 'Asr in 10 minutes';

  return (
    <StepLayout
      cue={{ expression: off ? 'gentle' : 'listening', say: off ? 'No reminders. You can always ask me later.' : 'How should I remind you to pray?' }}
      footer={<Button label="Continue" onPress={next} />}>
      <View className="gap-5">
        {/* A sample of what the reminder will look like. */}
        <View
          accessible
          accessibilityLabel={off ? 'No prayer reminders' : `Sample reminder: ${lead}, ${formatClock(asr.minutes)}`}
          className={`flex-row items-center gap-3 rounded-card p-4 ${off ? 'bg-surface' : 'bg-prayer-soft'}`}>
          {off || answers.reminderSound === 'silent' ? (
            <BellSlashIcon size={22} weight="fill" color={colors.inkSubtle} />
          ) : (
            <BellIcon size={22} weight="fill" color={colors.prayerText} />
          )}
          <View className="flex-1">
            <Text className="font-heading text-body text-ink">{off ? 'No prayer reminders' : lead}</Text>
            <Text className="font-body text-label text-ink-muted">
              {off ? 'Times stay on Home' : `${formatClock(asr.minutes)} · ${answers.reminderSound === 'adhan' ? 'with the adhan' : answers.reminderSound === 'chime' ? 'soft chime' : 'silent'}`}
            </Text>
          </View>
        </View>

        <Segmented<ReminderWhen>
          label="When"
          tone="prayer"
          value={answers.reminderWhen}
          onChange={(reminderWhen) => set({ reminderWhen })}
          options={[
            { id: 'at', label: 'On time' },
            { id: 'before', label: '10 min early' },
            { id: 'both', label: 'Both' },
            { id: 'none', label: 'Off' },
          ]}
        />
        {!off ? (
          <Segmented<ReminderSound>
            label="Sound"
            tone="prayer"
            value={answers.reminderSound}
            onChange={(reminderSound) => set({ reminderSound })}
            options={[
              { id: 'adhan', label: 'Adhan' },
              { id: 'chime', label: 'Soft chime' },
              { id: 'silent', label: 'Silent' },
            ]}
          />
        ) : null}
        <SwitchRow tone="prayer" title="Remind me for Jumu’ah" detail="On Fridays, before the khutbah" value={jumuah} onChange={(v) => set({ jumuah: v })} />
        <Text className="font-body text-label text-ink-muted">You can set each prayer separately later, or turn reminders off.</Text>
      </View>
    </StepLayout>
  );
}
