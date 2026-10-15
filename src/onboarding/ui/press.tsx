import type { ReactNode } from 'react';
import { Pressable, type PressableProps, type StyleProp, StyleSheet, View, type ViewStyle } from 'react-native';
import Animated from 'react-native-reanimated';

import { useSink } from '@/components/sink';
import { tapHaptic } from '@/lib/haptics';
import { useThemeColors } from '@/theme/colors';
import { LIP, radius } from '@/theme/styles';
import { TONES, type Tone } from '@/theme/tones';

type LippedProps = Omit<PressableProps, 'children' | 'style'> & {
  selected?: boolean;
  tone?: Tone;
  /** Corner style: a card, a control row, or a pill. */
  shape?: 'card' | 'control' | 'pill';
  /** The face's padding and layout. */
  faceStyle?: StyleProp<ViewStyle>;
  /** The outer press target's flex and width. */
  style?: StyleProp<ViewStyle>;
  children: ReactNode;
};

const SHAPES = { card: radius.card, control: radius.control, pill: radius.full };

/**
 * A raised choice: Night Raised on a solid lip that it sinks onto while held, like the buttons. Every
 * pressable choice in onboarding uses it, so anything with a lip can be tapped and nothing else has one.
 * The press runs on the UI thread (see `useSink`), so it shows at once even while JavaScript is busy.
 * Selected, its outline and lip take the tone's colour.
 */
export function Lipped({
  selected = false,
  tone = 'neutral',
  shape = 'control',
  faceStyle,
  style,
  children,
  onPress,
  ...props
}: LippedProps) {
  const c = useThemeColors();
  const t = TONES[tone];
  const sink = useSink(LIP);
  const borderRadius = SHAPES[shape];
  return (
    <Pressable
      {...props}
      onPressIn={(e) => {
        sink.handlers.onPressIn();
        props.onPressIn?.(e);
      }}
      onPressOut={(e) => {
        sink.handlers.onPressOut();
        props.onPressOut?.(e);
      }}
      onPress={(e) => {
        tapHaptic();
        onPress?.(e);
      }}
      style={style}>
      {/* The lip is a layer under the face, and the face moves down onto it while held. Its own 2px
          border plus the lip make the 6px edge. */}
      <View>
        <View style={[styles.lip, { borderRadius, backgroundColor: selected ? c[t.lipSelected] : c.line }]} />
        <Animated.View style={[styles.face, sink.style]}>
          <View
            style={[
              styles.raised,
              { borderRadius, backgroundColor: c.raised },
              selected ? { borderColor: c[t.border], borderBottomColor: c[t.lipSelected] } : { borderColor: c.line },
              faceStyle,
            ]}>
            {children}
          </View>
        </Animated.View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  lip: { position: 'absolute', left: 0, right: 0, top: LIP, bottom: 0 },
  face: { marginBottom: LIP },
  raised: { borderWidth: 2 },
});
