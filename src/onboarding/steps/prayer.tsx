import { BellIcon } from 'phosphor-react-native/src/icons/Bell';
import { BellSlashIcon } from 'phosphor-react-native/src/icons/BellSlash';
import { LockIcon } from 'phosphor-react-native/src/icons/Lock';
import { MagnifyingGlassIcon } from 'phosphor-react-native/src/icons/MagnifyingGlass';
import { MapPinIcon } from 'phosphor-react-native/src/icons/MapPin';
import { NavigationArrowIcon } from 'phosphor-react-native/src/icons/NavigationArrow';
import { useMemo, useState } from 'react';
import { PixelRatio, Pressable, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/button';
import type { PrayerId } from '@/data/sample';
import { tapHaptic } from '@/lib/haptics';
import { formatClock } from '@/lib/time';
import { fixed, night } from '@/theme/palette';
import { font, radius, text } from '@/theme/styles';

import { cities, countryAsr, deviceCity, extraPrayers, madhhabs, methods, previewTimes, suggestedMethod } from '../data';
import { useFlow } from '../flow';
import { StepFooter, StepLayout } from '../shell';
import type { Asr, Madhhab, ReminderSound, ReminderWhen } from '../types';
import { Field, Stepper, SwitchRow } from '../ui/controls';
import { DayArc } from '../ui/day-arc';
import { Chips, OptionList, Segmented } from '../ui/options';
import { Lipped } from '../ui/press';
import { ShadowDiagram } from '../ui/shadow-diagram';
import { SimulatedPrompt } from '../ui/sheets';
import { Tile } from '../ui/tile';

function Note({ children }: { children: string }) {
  return (
    <View style={styles.note}>
      <View style={styles.noteIcon}>
        <LockIcon size={16} weight="fill" color={night.inkSubtle} />
      </View>
      <Text style={[styles.small, styles.fill]}>{children}</Text>
    </View>
  );
}

function TextLink({ label, onPress, tone = 'prayer' }: { label: string; onPress: () => void; tone?: 'prayer' | 'neutral' }) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => {
        tapHaptic();
        onPress();
      }}
      style={({ pressed }) => [styles.link, pressed && styles.pressed]}>
      <Text style={tone === 'prayer' ? styles.linkPrayer : styles.linkMuted}>{label}</Text>
    </Pressable>
  );
}

export function Location() {
  const { answers, set } = useFlow();
  const [mode, setMode] = useState<'choose' | 'search'>(answers.cityFrom === 'search' ? 'search' : 'choose');
  const [asking, setAsking] = useState(false);
  const [query, setQuery] = useState('');

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (q ? cities.filter((c) => `${c.name} ${c.country}`.toLowerCase().includes(q)) : cities).slice(0, 6);
  }, [query]);

  const found = answers.city && answers.cityFrom === 'device';
  const declined = answers.locationPermission === 'denied';
  const decline = () => {
    setAsking(false);
    set({ locationPermission: 'denied' });
    setMode('search');
  };

  return (
    <StepLayout
      cue={{
        expression: answers.city ? 'delighted' : mode === 'search' ? 'listening' : 'curious',
        say: answers.city ? `${answers.city.name}, got it.` : 'Where are you?',
        hint: answers.city ? undefined : 'So I can work out your prayer times and the qibla.',
        badge: answers.city ? 'pin' : undefined,
      }}>
      {mode === 'choose' && !found ? (
        <View style={styles.gap4}>
          <View style={styles.pair}>
            <Tile
              icon={NavigationArrowIcon}
              tone="prayer"
              title="Use my location"
              detail="I’ll ask your phone first."
              onPress={() => setAsking(true)}
            />
            <Tile
              icon={MagnifyingGlassIcon}
              tone="prayer"
              title="Choose a city"
              detail="Search by name."
              onPress={() => setMode('search')}
            />
          </View>
          <Note>Your location is kept on this phone and used for prayer times and the qibla.</Note>
        </View>
      ) : null}

      {found ? (
        <View style={styles.gap2}>
          <View style={styles.found}>
            <MapPinIcon size={26} weight="fill" color={night.prayerText} />
            <View style={styles.fill}>
              <Text style={styles.title}>{answers.city!.name}</Text>
              <Text style={styles.small}>{answers.city!.country}, from your phone’s location</Text>
            </View>
          </View>
          <TextLink
            label="Not right? Choose a city"
            onPress={() => {
              set({ city: null, cityFrom: null });
              setMode('search');
            }}
          />
        </View>
      ) : null}

      {mode === 'search' ? (
        <View style={styles.gap3}>
          {declined ? <Text style={styles.body}>No problem. Let’s find your city instead.</Text> : null}
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
          <View accessibilityRole="radiogroup" style={styles.gap2}>
            {results.map((city) => (
              <Lipped
                key={city.id}
                tone="prayer"
                selected={answers.city?.id === city.id}
                faceStyle={styles.cityRow}
                accessibilityRole="radio"
                accessibilityState={{ selected: answers.city?.id === city.id }}
                accessibilityLabel={`${city.name}, ${city.country}`}
                onPress={() => set({ city, cityFrom: 'search', method: null })}>
                <MapPinIcon size={20} weight="fill" color={answers.city?.id === city.id ? night.prayerText : night.inkSubtle} />
                <Text style={[styles.strong, styles.fill]}>
                  {city.name}
                  <Text style={styles.country}>{`, ${city.country}`}</Text>
                </Text>
              </Lipped>
            ))}
            {results.length === 0 ? (
              <Text style={[styles.body, styles.empty]}>
                I don’t know that one yet. Try the nearest big city; you can adjust times later.
              </Text>
            ) : null}
          </View>
          {!declined ? <TextLink label="Use my location instead" onPress={() => setAsking(true)} /> : null}
        </View>
      ) : null}

      <SimulatedPrompt
        visible={asking}
        title="Allow “Ayyur” to use your location?"
        body="Used to work out your prayer times and the qibla direction."
        onDismiss={decline}
        actions={[
          {
            label: 'Allow while using the app',
            strong: true,
            onPress: () => {
              setAsking(false);
              set({
                locationPermission: 'granted',
                city: deviceCity,
                cityFrom: 'device',
                method: null,
              });
              setMode('choose');
            },
          },
          { label: 'Don’t allow', onPress: decline },
        ]}
      />
    </StepLayout>
  );
}

const asrFor = (madhhab: Madhhab): Asr | null => (madhhab === 'hanafi' ? 'hanafi' : madhhab === 'none' ? null : 'standard');

/** Madhhab, with the Asr time each one gives today. Asr is only asked on its own when no madhhab is chosen. */
export function MadhhabStep() {
  const { answers, set } = useFlow();
  const [changingAsr, setChangingAsr] = useState(false);
  const earlier = formatClock(previewTimes({ ...answers, asr: 'standard' })[2].minutes);
  const later = formatClock(previewTimes({ ...answers, asr: 'hanafi' })[2].minutes);
  const chosen = answers.madhhab;
  const askAsr = chosen === 'none' || changingAsr;
  const order: Madhhab[] = ['none', 'hanafi', 'maliki', 'shafii', 'hanbali'];

  const card = (id: Asr, label: string, schools: string, time: string) => {
    const selected = answers.asr === id;
    const [clock, meridiem] = time.split(' ');
    return (
      <Lipped
        key={id}
        shape="card"
        tone="prayer"
        selected={selected}
        style={styles.fill}
        faceStyle={styles.asrCard}
        accessibilityRole="radio"
        accessibilityState={{ selected }}
        accessibilityLabel={`${label}, ${schools}, from ${time} today`}
        onPress={() => set({ asr: id })}>
        {/* At large text sizes the card keeps its words and drops the picture. */}
        {PixelRatio.getFontScale() > 1.3 ? null : <ShadowDiagram times={id === 'standard' ? 1 : 2} lit={selected} />}
        <Text style={styles.asrLabel}>{label}</Text>
        <Text style={styles.small}>{schools}</Text>
        <Text numberOfLines={1} style={[styles.asrTime, selected && styles.prayerText]}>
          {clock}
          <Text style={styles.meridiem}>{` ${meridiem}`}</Text>
        </Text>
      </Lipped>
    );
  };

  return (
    <StepLayout
      cue={{
        expression: chosen ? 'happy' : 'thinking',
        say: 'Do you follow a madhhab?',
        hint: 'A school of Islamic law. Among other things, it decides when Asr begins.',
      }}>
      <OptionList<Madhhab>
        tone="prayer"
        value={chosen}
        onChange={(madhhab) => {
          setChangingAsr(false);
          set({ madhhab, asr: asrFor(madhhab) ?? answers.asr });
        }}
        options={order.map((id) => {
          const m = madhhabs.find((x) => x.id === id)!;
          const asr = id === 'hanafi' ? `Asr from ${later}` : id === 'none' ? 'Or not sure. That’s fine.' : `Asr from ${earlier}`;
          return {
            id,
            label: m.name,
            detail: id === 'none' ? asr : `${asr}. ${m.about}`,
          };
        })}
      />
      {chosen && chosen !== 'none' && !changingAsr ? (
        <TextLink label="My Asr is different from my madhhab’s" onPress={() => setChangingAsr(true)} />
      ) : null}
      {askAsr ? (
        <View style={styles.asrAsk}>
          <Text style={[styles.title, styles.centred]}>Which Asr time do you follow?</Text>
          <Text style={[styles.small, styles.centred]}>
            Asr begins when a shadow is as long as what casts it (plus its noon shadow), or twice as long in the Hanafi school.
          </Text>
          <View accessibilityRole="radiogroup" style={styles.pair}>
            {card('standard', 'Earlier', "Shafi'i, Maliki, Hanbali", earlier)}
            {card('hanafi', 'Later', 'Hanafi', later)}
          </View>
          <TextLink
            label={`I’m not sure: use what’s usual${answers.city ? ` in ${answers.city.country}` : ''}`}
            onPress={() => set({ asr: countryAsr(answers.city) })}
          />
        </View>
      ) : null}
    </StepLayout>
  );
}

function TimesPreview() {
  const { answers } = useFlow();
  const times = previewTimes(answers);
  const label = `Today${answers.city ? ` in ${answers.city.name}` : ''}`;
  return (
    <View
      accessible
      accessibilityLabel={`${label}: ${times.map((t) => `${t.name} ${formatClock(t.minutes)}`).join(', ')}`}
      style={styles.preview}>
      <Text style={styles.previewLabel}>{label}</Text>
      <View style={styles.previewRow}>
        {times.map((t) => (
          <View key={t.id} style={styles.previewTime}>
            <Text style={styles.caption}>{t.name}</Text>
            <Text style={styles.strong}>{formatClock(t.minutes).split(' ')[0]}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

/** The calculation method, with the mosque fine-tuning folded in as a disclosure. */
export function Method() {
  const { answers, set, next } = useFlow();
  const suggested = suggestedMethod(answers.city);
  const current = methods.find((m) => m.id === answers.method) ?? suggested;
  const [listing, setListing] = useState(answers.method !== null && answers.method !== suggested.id);
  const changed = Object.values(answers.offsets).some((v) => v !== 0);
  const [tuning, setTuning] = useState(changed);
  const base = previewTimes({
    ...answers,
    offsets: { fajr: 0, dhuhr: 0, asr: 0, maghrib: 0, isha: 0 },
  });
  const step = (id: PrayerId, d: 1 | -1) =>
    set({
      offsets: {
        ...answers.offsets,
        [id]: Math.max(-30, Math.min(30, answers.offsets[id] + d)),
      },
    });

  return (
    <StepLayout
      cue={{
        expression: listing ? 'thinking' : 'happy',
        say: listing ? 'Which method does your mosque use?' : `I’d use ${current.name}. Sound right?`,
        hint: listing ? 'They differ mostly in how early Fajr and how late Isha fall.' : `${current.where}.`,
      }}
      footer={
        listing || tuning ? (
          <StepFooter
            onPress={() => {
              set({ method: current.id });
              next();
            }}
          />
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
      <TimesPreview />
      {listing ? (
        <View style={styles.mt5}>
          <OptionList
            tone="prayer"
            suggested={suggested.id}
            value={current.id}
            onChange={(method) => set({ method })}
            options={methods.map((m) => ({
              id: m.id,
              label: m.name,
              detail: m.where,
            }))}
          />
        </View>
      ) : null}
      <View style={styles.mt3}>
        <TextLink label={tuning ? 'Done adjusting minutes' : 'Adjust minutes to match my mosque'} onPress={() => setTuning(!tuning)} />
      </View>
      {tuning ? (
        <View>
          {base.map((t) => {
            const offset = answers.offsets[t.id];
            return (
              <View key={t.id} style={styles.tuneRow}>
                <View style={styles.fill}>
                  <Text style={styles.title}>{t.name}</Text>
                  <Text style={[styles.tuneTime, offset ? styles.prayerText : null]}>{formatClock(t.minutes + offset)}</Text>
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
            <TextLink
              label="Reset to calculated times"
              onPress={() =>
                set({
                  offsets: { fajr: 0, dhuhr: 0, asr: 0, maghrib: 0, isha: 0 },
                })
              }
            />
          ) : null}
        </View>
      ) : null}
    </StepLayout>
  );
}

export function PrayerFocus() {
  const { answers, set } = useFlow();
  const focus = answers.prayerFocus;
  const name = focus && focus !== 'all' ? focus[0].toUpperCase() + focus.slice(1) : null;
  return (
    <StepLayout
      cue={{
        expression: 'happy',
        say: name
          ? `${name} it is. I’ll give it a little extra care.`
          : focus === 'all'
            ? 'All five, equally.'
            : 'Which prayer would you like the most help with?',
        hint: name || focus === 'all' ? undefined : 'I’ll sit wherever you need me most.',
      }}>
      <DayArc value={focus} onChange={(prayerFocus) => set({ prayerFocus })} />
      <View style={styles.mt4}>
        <Lipped
          shape="control"
          tone="prayer"
          selected={focus === 'all'}
          faceStyle={styles.allFive}
          accessibilityRole="radio"
          accessibilityState={{ selected: focus === 'all' }}
          onPress={() => set({ prayerFocus: 'all' })}>
          <Text style={styles.strong}>All five equally</Text>
        </Lipped>
      </View>
    </StepLayout>
  );
}

/** Extra prayers, and congregation for brothers, on one screen. */
export function PrayerExtras() {
  const { answers, set } = useFlow();
  const showExtras = answers.practice !== 'new' && answers.practice !== 'starting';
  return (
    <StepLayout
      cue={{
        expression: answers.extraPrayers.length || answers.congregation ? 'delighted' : 'curious',
        say: 'Anything extra for your prayers?',
        hint: showExtras ? 'Optional rows in your prayer log. They never count against a streak.' : undefined,
      }}>
      {showExtras ? (
        <Chips tone="prayer" value={answers.extraPrayers} onChange={(extra) => set({ extraPrayers: extra })} options={extraPrayers} />
      ) : null}
      {answers.gender === 'male' ? (
        <View style={showExtras ? styles.mt5 : null}>
          <SwitchRow
            stacked
            tone="prayer"
            title="Track praying in congregation"
            detail="When you log a prayer, I’ll ask whether it was at the mosque."
            value={answers.congregation === true}
            onChange={(congregation) => set({ congregation })}
          />
        </View>
      ) : null}
    </StepLayout>
  );
}

/** Reminder style, and the notification permission asked right here, where it's explained. */
export function Reminders() {
  const { answers, set, next } = useFlow();
  const [asking, setAsking] = useState(false);
  const off = answers.reminderWhen === 'none';
  const jumuah = answers.jumuah ?? answers.gender === 'male';
  const asr = previewTimes(answers)[2];
  const lead = answers.reminderWhen === 'at' ? 'Asr is now' : 'Asr in 10 minutes';
  const needsPermission = !off && answers.notificationPermission === 'unasked';
  const finish = (permission: 'granted' | 'denied') => {
    setAsking(false);
    set({ notificationPermission: permission });
    next();
  };

  return (
    <StepLayout
      cue={{
        expression: off ? 'gentle' : 'listening',
        say: off ? 'No reminders. You can ask for them later.' : 'How should I remind you to pray?',
        badge: off ? undefined : 'bell',
      }}
      footer={
        needsPermission ? (
          <>
            <Button label="Turn on reminders" tone="prayer" onPress={() => setAsking(true)} />
            <Text style={styles.footnote}>Your phone will ask for permission next.</Text>
            <Pressable
              accessibilityRole="button"
              onPress={() => {
                set({ notificationPermission: 'later' });
                next();
              }}
              style={({ pressed }) => [styles.quiet, pressed && styles.pressed]}>
              <Text style={styles.footnote}>Not now</Text>
            </Pressable>
          </>
        ) : undefined
      }>
      <View style={styles.gap5}>
        <View
          accessible
          accessibilityLabel={off ? 'No prayer reminders' : `Sample reminder: ${lead}, ${formatClock(asr.minutes)}`}
          style={[styles.sample, off && styles.sampleOff]}>
          {off || answers.reminderSound === 'silent' ? (
            <BellSlashIcon size={22} weight="fill" color={night.inkSubtle} />
          ) : (
            <BellIcon size={22} weight="fill" color={night.prayerText} />
          )}
          <View style={styles.fill}>
            <Text style={styles.strong}>{off ? 'No prayer reminders' : lead}</Text>
            <Text style={styles.small}>
              {off
                ? 'Times stay on Home'
                : `${formatClock(asr.minutes)} · ${answers.reminderSound === 'adhan' ? 'with the adhan' : answers.reminderSound === 'chime' ? 'soft chime' : 'silent'}`}
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
            { id: 'before', label: 'Before' },
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
              { id: 'chime', label: 'Chime' },
              { id: 'silent', label: 'Silent' },
            ]}
          />
        ) : null}
        <SwitchRow
          tone="prayer"
          title="Remind me for Jumu’ah"
          detail="On Fridays, before the khutbah"
          value={jumuah}
          onChange={(v) => set({ jumuah: v })}
        />
        {answers.reminderWhen === 'before' || answers.reminderWhen === 'both' ? (
          <Text style={styles.small}>“Before” means 10 minutes ahead. You can set each prayer separately later.</Text>
        ) : null}
      </View>
      <SimulatedPrompt
        visible={asking}
        title="“Ayyur” would like to send you notifications"
        body="These may include alerts, sounds and badges."
        onDismiss={() => finish('denied')}
        actions={[
          { label: 'Don’t allow', onPress: () => finish('denied') },
          { label: 'Allow', strong: true, onPress: () => finish('granted') },
        ]}
      />
    </StepLayout>
  );
}

const card = { borderRadius: radius.card, borderWidth: 2, padding: 16 } as const;

const styles = StyleSheet.create({
  fill: { flex: 1 },
  centred: { textAlign: 'center' },
  pressed: { opacity: 0.7 },
  gap2: { gap: 8 },
  gap3: { gap: 12 },
  gap4: { gap: 16 },
  gap5: { gap: 20 },
  mt3: { marginTop: 12 },
  mt4: { marginTop: 16 },
  mt5: { marginTop: 20 },
  pair: { flexDirection: 'row', gap: 12 },
  title: text('heading', 'title', night.ink),
  strong: text('heading', 'body', night.ink),
  body: text('body', 'body', night.inkMuted),
  small: text('body', 'label', night.inkMuted),
  caption: text('medium', 'caption', night.inkMuted),
  footnote: { ...text('medium', 'label', night.inkMuted), textAlign: 'center' },
  prayerText: { color: night.prayerText },
  note: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  noteIcon: { paddingTop: 2 },
  link: { minHeight: 48, justifyContent: 'center', alignSelf: 'flex-start' },
  linkPrayer: text('heading', 'body', night.prayerText),
  linkMuted: text('heading', 'body', night.inkMuted),
  quiet: { minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  found: { ...card, flexDirection: 'row', alignItems: 'center', gap: 12, borderColor: fixed.prayer, backgroundColor: night.prayerSoft },
  cityRow: { minHeight: 56, flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 8 },
  country: { fontFamily: font.body, color: night.inkMuted },
  empty: { paddingHorizontal: 4, paddingVertical: 12 },
  asrCard: { padding: 16 },
  asrLabel: { ...text('display', 'title', night.ink), marginTop: 8 },
  asrTime: { ...text('display', 'headline', night.inkMuted), marginTop: 8 },
  meridiem: text('heading', 'label', night.inkMuted),
  asrAsk: { marginTop: 24, gap: 12 },
  preview: { ...card, borderColor: night.line, backgroundColor: night.prayerSoft },
  previewLabel: { ...text('heading', 'label', night.prayerText), marginBottom: 8 },
  previewRow: { flexDirection: 'row', justifyContent: 'space-between' },
  previewTime: { alignItems: 'center' },
  tuneRow: {
    minHeight: 72,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: night.line,
    paddingVertical: 8,
  },
  tuneTime: text('medium', 'body', night.inkMuted),
  allFive: { minHeight: 56, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 20 },
  sample: { ...card, flexDirection: 'row', alignItems: 'center', gap: 12, borderColor: night.line, backgroundColor: night.prayerSoft },
  sampleOff: { backgroundColor: night.surface },
});
