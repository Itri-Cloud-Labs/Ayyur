import type { Icon } from 'phosphor-react-native';
import { MoonIcon } from 'phosphor-react-native/src/icons/Moon';
import { SunIcon } from 'phosphor-react-native/src/icons/Sun';
import { SunDimIcon } from 'phosphor-react-native/src/icons/SunDim';
import { SunHorizonIcon } from 'phosphor-react-native/src/icons/SunHorizon';
import { memo } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import type { PrayerId } from '@/data/sample';
import { tapHaptic } from '@/lib/haptics';
import { fixed, night } from '@/theme/palette';
import { text } from '@/theme/styles';

const W = 320;
const H = 200;
const HORIZON = 128;
const DISC = 56;

const face = require('../../../assets/brand/tab/ayyur-tab-face.png');

// Evenly spaced across the day, each at the sun's rough height: Fajr before sunrise and Isha after dark
// sit under the horizon, Dhuhr at the top, Maghrib on the horizon itself.
const PRAYERS: {
  id: PrayerId;
  name: string;
  x: number;
  y: number;
  icon: Icon;
}[] = [
  { id: 'fajr', name: 'Fajr', x: 32, y: HORIZON + 22, icon: SunHorizonIcon },
  { id: 'dhuhr', name: 'Dhuhr', x: 96, y: 34, icon: SunIcon },
  { id: 'asr', name: 'Asr', x: 160, y: 70, icon: SunDimIcon },
  { id: 'maghrib', name: 'Maghrib', x: 224, y: HORIZON, icon: SunHorizonIcon },
  { id: 'isha', name: 'Isha', x: 288, y: HORIZON + 26, icon: MoonIcon },
];

// A smooth curve through the five points (Catmull-Rom as cubic Béziers).
function curve(points: { x: number; y: number }[]) {
  let d = `M${points[0].x} ${points[0].y}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i - 1] ?? points[i];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i + 2] ?? p2;
    d += `C${p1.x + (p2.x - p0.x) / 6} ${p1.y + (p2.y - p0.y) / 6} ${p2.x - (p3.x - p1.x) / 6} ${p2.y - (p3.y - p1.y) / 6} ${p2.x} ${p2.y}`;
  }
  return d;
}

/**
 * The five prayers along the day. Ayyur sits on the one you'd like the most help with, so choosing
 * moves him along his own sky.
 */
export const DayArc = memo(function DayArc({ value, onChange }: { value: PrayerId | 'all' | null; onChange: (id: PrayerId) => void }) {
  return (
    <View accessibilityRole="radiogroup" accessibilityLabel="Prayers through the day" style={{ width: '100%', aspectRatio: W / H }}>
      <Svg width="100%" height="100%" viewBox={`0 0 ${W} ${H}`} style={{ position: 'absolute' }} accessible={false}>
        <Path d={curve(PRAYERS)} stroke={night.line} strokeWidth={2} strokeDasharray="3 7" strokeLinecap="round" fill="none" />
        <Path d={`M4 ${HORIZON}H${W - 4}`} stroke={night.line} strokeWidth={2} strokeLinecap="round" />
      </Svg>
      {PRAYERS.map(({ id, name, x, y, icon: PrayerIcon }) => {
        const chosen = value === id;
        const all = value === 'all';
        return (
          <Pressable
            key={id}
            accessibilityRole="radio"
            accessibilityLabel={name}
            accessibilityState={{ selected: chosen }}
            onPress={() => {
              tapHaptic();
              onChange(id);
            }}
            hitSlop={6}
            style={({ pressed }) => [styles.stop, { left: `${(x / W) * 100}%`, top: `${(y / H) * 100}%` }, pressed && styles.pressed]}>
            <View style={[styles.disc, chosen ? styles.discChosen : all ? styles.discAll : null]}>
              {chosen ? (
                <Image source={face} style={{ width: DISC - 8, height: DISC - 8 }} accessible={false} />
              ) : (
                <PrayerIcon size={24} weight="fill" color={all ? night.prayerText : night.inkSubtle} />
              )}
            </View>
            <Text style={chosen ? styles.nameChosen : styles.name}>{name}</Text>
          </Pressable>
        );
      })}
    </View>
  );
});

const styles = StyleSheet.create({
  stop: { position: 'absolute', width: 76, marginLeft: -38, marginTop: -DISC / 2, alignItems: 'center' },
  pressed: { opacity: 0.8 },
  disc: {
    width: DISC,
    height: DISC,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: DISC / 2,
    borderWidth: 2,
    borderColor: night.line,
    backgroundColor: night.surface,
  },
  discChosen: { borderColor: fixed.prayer, backgroundColor: night.prayerSoft },
  discAll: { borderColor: fixed.prayer },
  name: { ...text('medium', 'label', night.inkMuted), marginTop: 4 },
  nameChosen: { ...text('heading', 'label', night.prayerText), marginTop: 4 },
});
