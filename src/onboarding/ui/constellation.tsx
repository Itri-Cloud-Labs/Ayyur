import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, G, Line, Polygon } from 'react-native-svg';

import { fixed, night } from '@/theme/palette';
import { text } from '@/theme/styles';

// Where stars sit, as fractions of the width and height, in drawing order. Hand-placed to stay apart.
const PLACES = [
  { x: 0.5, y: 0.16 },
  { x: 0.2, y: 0.42 },
  { x: 0.8, y: 0.38 },
  { x: 0.36, y: 0.8 },
  { x: 0.68, y: 0.78 },
  { x: 0.12, y: 0.82 },
  { x: 0.9, y: 0.82 },
  { x: 0.5, y: 0.52 },
];

// An eight-point star (khatam), the brand's own.
function starPoints(cx: number, cy: number, r: number) {
  const inner = (r * Math.cos(Math.PI / 4)) / Math.cos(Math.PI / 8);
  return Array.from({ length: 16 }, (_, i) => {
    const a = (Math.PI / 8) * i - Math.PI / 2;
    const rad = i % 2 === 0 ? r : inner;
    return `${(cx + rad * Math.cos(a)).toFixed(1)},${(cy + rad * Math.sin(a)).toFixed(1)}`;
  }).join(' ');
}

/**
 * The user's goals drawn as a constellation: a picture of what they chose, not a control. The brightest
 * goal sits at the top, ringed; lines join the rest to it. Shown on the summary as the plan's centrepiece.
 */
export function Constellation({ goals, brightest }: { goals: { id: string; label: string }[]; brightest: string | null }) {
  const [width, setWidth] = useState(0);
  // A few goals make a small constellation; more need more sky.
  const height = goals.length <= 2 ? 130 : goals.length <= 4 ? 180 : 220;
  const ordered = [...goals].sort((a, b) => (a.id === brightest ? -1 : b.id === brightest ? 1 : 0)).slice(0, PLACES.length);
  const at = (i: number) => ({
    x: PLACES[i].x * width,
    y: 18 + PLACES[i].y * (height - 60),
  });

  return (
    <View
      accessible
      accessibilityLabel={`Your goals: ${ordered.map((g) => g.label).join(', ')}`}
      onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
      style={{ height }}>
      {width ? (
        <>
          <Svg width={width} height={height} style={{ position: 'absolute' }}>
            {ordered.slice(1).map((g, i) => {
              const a = at(0);
              const b = at(i + 1);
              return (
                <Line
                  key={g.id}
                  x1={a.x}
                  y1={a.y}
                  x2={b.x}
                  y2={b.y}
                  stroke={fixed.moon}
                  strokeOpacity={0.4}
                  strokeWidth={1.5}
                  strokeDasharray="2 6"
                  strokeLinecap="round"
                />
              );
            })}
            {ordered.map((g, i) => {
              const p = at(i);
              return (
                <G key={g.id}>
                  {i === 0 && brightest ? <Circle cx={p.x} cy={p.y} r={20} fill={night.moonSoft} /> : null}
                  <Polygon points={starPoints(p.x, p.y, i === 0 && brightest ? 14 : 10)} fill={fixed.moon} />
                </G>
              );
            })}
          </Svg>
          {ordered.map((g, i) => {
            const p = at(i);
            return (
              <Text
                key={g.id}
                numberOfLines={2}
                style={[
                  i === 0 && brightest ? styles.brightest : styles.label,
                  { left: Math.min(width - 120, Math.max(0, p.x - 60)), top: p.y + 18 },
                ]}>
                {g.label}
              </Text>
            );
          })}
        </>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  label: { ...text('medium', 'caption', night.inkMuted), position: 'absolute', width: 120, textAlign: 'center' },
  brightest: { ...text('heading', 'caption', night.ink), position: 'absolute', width: 120, textAlign: 'center' },
});
