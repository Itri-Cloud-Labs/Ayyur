import { Pressable, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import type { PrayerId } from '@/data/sample';
import { tapHaptic } from '@/lib/haptics';
import { ON_COLOR } from '@/theme/colors';

const W = 320;
const H = 170;
const HORIZON = 112;

// Evenly spaced across the day, each at the sun's rough height: Fajr before sunrise and Isha after
// dark sit under the horizon, Dhuhr at the top, Maghrib on the horizon itself.
const PRAYERS: { id: PrayerId; name: string; x: number; y: number }[] = [
  { id: 'fajr', name: 'Fajr', x: 32, y: HORIZON + 18 },
  { id: 'dhuhr', name: 'Dhuhr', x: 96, y: 26 },
  { id: 'asr', name: 'Asr', x: 160, y: 58 },
  { id: 'maghrib', name: 'Maghrib', x: 224, y: HORIZON },
  { id: 'isha', name: 'Isha', x: 288, y: HORIZON + 22 },
];

// A smooth curve through the five points (Catmull-Rom as cubic Béziers).
function curve(points: { x: number; y: number }[]) {
  let d = `M${points[0].x} ${points[0].y}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i - 1] ?? points[i];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i + 2] ?? p2;
    const c1 = { x: p1.x + (p2.x - p0.x) / 6, y: p1.y + (p2.y - p0.y) / 6 };
    const c2 = { x: p2.x - (p3.x - p1.x) / 6, y: p2.y - (p3.y - p1.y) / 6 };
    d += `C${c1.x} ${c1.y} ${c2.x} ${c2.y} ${p2.x} ${p2.y}`;
  }
  return d;
}

/** The five prayers placed along the day. Pick the one you'd like the most help with. */
export function DayArc({ value, onChange }: { value: PrayerId | 'all' | null; onChange: (id: PrayerId) => void }) {
  return (
    <View accessibilityRole="radiogroup" accessibilityLabel="Prayers through the day" style={{ width: '100%', aspectRatio: W / H }}>
      <Svg width="100%" height="100%" viewBox={`0 0 ${W} ${H}`} style={{ position: 'absolute' }} accessible={false}>
        <Path d={curve(PRAYERS)} stroke="#333c55" strokeWidth={2} strokeDasharray="3 7" strokeLinecap="round" fill="none" />
        <Path d={`M4 ${HORIZON}H${W - 4}`} stroke="#333c55" strokeWidth={2} strokeLinecap="round" />
      </Svg>
      {PRAYERS.map((prayer) => {
        const selected = value === prayer.id || value === 'all';
        return (
          <Pressable
            key={prayer.id}
            accessibilityRole="radio"
            accessibilityLabel={prayer.name}
            accessibilityState={{ selected: value === prayer.id }}
            onPress={() => {
              tapHaptic();
              onChange(prayer.id);
            }}
            style={{ position: 'absolute', left: `${(prayer.x / W) * 100}%`, top: `${(prayer.y / H) * 100}%`, width: 64, marginLeft: -32, marginTop: -22 }}
            className="items-center active:opacity-80">
            <View
              className={`h-11 w-11 items-center justify-center rounded-full border-2 ${selected ? 'border-prayer bg-prayer' : 'border-line bg-surface'}`}>
              <Text style={selected ? { color: ON_COLOR } : undefined} className={`font-heading text-caption ${selected ? '' : 'text-ink-muted'}`}>
                {prayer.name.slice(0, 1)}
              </Text>
            </View>
            <Text className={`mt-1 text-caption ${value === prayer.id ? 'font-heading text-prayer-text' : 'font-medium text-ink-muted'}`}>{prayer.name}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}
