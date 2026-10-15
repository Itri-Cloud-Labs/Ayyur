import { useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withTiming } from 'react-native-reanimated';
import Svg, { Circle, Line, Polygon } from 'react-native-svg';

import { tapHaptic } from '@/lib/haptics';

type Goal = { id: string; label: string };

// Where each star sits, as fractions of the sky's width and height. Hand-placed so labels never collide.
const PLACES = [
  { x: 0.2, y: 0.05 },
  { x: 0.66, y: 0.02 },
  { x: 0.44, y: 0.22 },
  { x: 0.82, y: 0.27 },
  { x: 0.16, y: 0.39 },
  { x: 0.6, y: 0.47 },
  { x: 0.28, y: 0.66 },
  { x: 0.8, y: 0.7 },
  { x: 0.5, y: 0.86 },
];
const LABEL = 128;
const STAR = 52;

// An eight-point star (khatam), the brand's own.
function starPoints(cx: number, cy: number, r: number) {
  const inner = (r * Math.cos(Math.PI / 4)) / Math.cos(Math.PI / 8);
  return Array.from({ length: 16 }, (_, i) => {
    const a = (Math.PI / 8) * i - Math.PI / 2;
    const rad = i % 2 === 0 ? r : inner;
    return `${(cx + rad * Math.cos(a)).toFixed(1)},${(cy + rad * Math.sin(a)).toFixed(1)}`;
  }).join(' ');
}

function Star({
  goal,
  lit,
  brightest,
  left,
  top,
  onPress,
}: {
  goal: Goal;
  lit: boolean;
  brightest: boolean;
  left: number;
  top: number;
  onPress: () => void;
}) {
  const reduceMotion = useReducedMotion();
  const glow = useSharedValue(lit ? 1 : 0);
  useEffect(() => {
    glow.value = withTiming(brightest ? 1.35 : lit ? 1 : 0, { duration: reduceMotion ? 0 : 260, easing: Easing.bezier(0.25, 1, 0.5, 1) });
  }, [brightest, glow, lit, reduceMotion]);
  const star = useAnimatedStyle(() => ({ transform: [{ scale: 0.75 + glow.value * 0.25 }] }));

  const state = brightest ? 'lit, your brightest' : lit ? 'lit' : 'not lit';
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityLabel={goal.label}
      accessibilityState={{ checked: lit }}
      accessibilityValue={{ text: state }}
      accessibilityHint={lit && !brightest ? 'Tap again to make it your brightest' : brightest ? 'Tap to turn it off' : undefined}
      onPress={() => {
        tapHaptic();
        onPress();
      }}
      style={{ position: 'absolute', left: left - LABEL / 2, top: top - STAR / 2, width: LABEL }}
      className="items-center active:opacity-80">
      <Animated.View style={star}>
        <Svg width={STAR} height={STAR} viewBox="0 0 44 44">
          {brightest ? <Circle cx={22} cy={22} r={21} fill="#3a2c00" /> : null}
          <Polygon points={starPoints(22, 22, lit ? 15 : 11)} fill={lit ? '#fdce3e' : '#4c5670'} />
        </Svg>
      </Animated.View>
      <Text
        numberOfLines={3}
        className={`mt-1 text-center text-body ${brightest ? 'font-heading text-moon-text' : lit ? 'font-medium text-ink' : 'font-medium text-ink-muted'}`}>
        {goal.label}
      </Text>
    </Pressable>
  );
}

/**
 * Goals as stars. Tapping one lights it and joins it to the others into a constellation; tapping a lit
 * star again makes it the brightest (the one that matters most); tapping the brightest turns it off.
 */
export function Constellation({
  goals,
  lit,
  brightest,
  onChange,
}: {
  goals: Goal[];
  lit: string[];
  brightest: string | null;
  onChange: (lit: string[], brightest: string | null) => void;
}) {
  const [size, setSize] = useState({ width: 0, height: 0 });
  const { width, height } = size;
  // Stars spread over the whole space they're given; the bottom margin leaves room for the last label.
  const point = (i: number) => ({
    x: Math.min(width - LABEL / 2, Math.max(LABEL / 2, PLACES[i].x * width)),
    y: PLACES[i].y * (height - STAR - 56) + STAR / 2,
  });

  const press = (id: string) => {
    if (!lit.includes(id)) return onChange([...lit, id], brightest);
    if (brightest !== id) return onChange(lit, id);
    onChange(
      lit.filter((g) => g !== id),
      null,
    );
  };

  const order = lit.map((id) => goals.findIndex((g) => g.id === id)).filter((i) => i >= 0);

  return (
    <View onLayout={(e) => setSize({ width: e.nativeEvent.layout.width, height: e.nativeEvent.layout.height })} className="flex-1">
      {width ? (
        <>
          <Svg width={width} height={height} style={{ position: 'absolute' }} accessible={false}>
            {order.slice(1).map((goalIndex, i) => {
              const a = point(order[i]);
              const b = point(goalIndex);
              return <Line key={`${order[i]}-${goalIndex}`} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="#fdce3e" strokeOpacity={0.45} strokeWidth={2} strokeDasharray="2 6" strokeLinecap="round" />;
            })}
          </Svg>
          {goals.map((goal, i) => {
            const p = point(i);
            return (
              <Star
                key={goal.id}
                goal={goal}
                lit={lit.includes(goal.id)}
                brightest={brightest === goal.id}
                left={p.x}
                top={p.y}
                onPress={() => press(goal.id)}
              />
            );
          })}
        </>
      ) : null}
    </View>
  );
}
