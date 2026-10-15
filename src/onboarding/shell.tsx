import { CaretLeftIcon } from 'phosphor-react-native/src/icons/CaretLeft';
import { createContext, type ReactNode, useContext, useEffect, useLayoutEffect, useRef, useState } from 'react';
import {
  BackHandler,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { Expression } from '@/components/ayyur/layers';
import { LiveAyyur } from '@/components/ayyur/live-ayyur';
import { tapHaptic } from '@/lib/haptics';
import { useThemeColors } from '@/theme/colors';

import { type AyyurCue, PART_NAMES, useFlow } from './flow';
import { ProgressMoon } from './ui/progress-moon';
import { Sky } from './ui/sky';

const EASE_OUT = Easing.bezier(0.25, 1, 0.5, 1);
const AYYUR_BASE = 176;
const DROP = 30;
// On question steps Ayyur takes whatever room the answers leave, between these sizes.
const HOST_MIN = 88;
const HOST_MAX = 150;
const STAGE_HEIGHT = AYYUR_BASE + 48;

/** How much room the current step leaves for Ayyur, reported by StepLayout. */
const Room = createContext<{ stageHeight: number; setRoom: (px: number) => void }>({ stageHeight: 0, setRoom: () => {} });

// What he does when tapped, in turn. Many taps in a row tire him out, in a friendly way.
const TAP_REACTIONS: { expression: Expression; say: string }[] = [
  { expression: 'wink', say: 'Hehe. Hello to you too.' },
  { expression: 'delighted', say: 'That tickles!' },
  { expression: 'surprised', say: 'Oh! You found my button.' },
];
const TIRED = { expression: 'sleepy' as Expression, say: 'Phew. You’ll tire me out before Fajr.' };

function Header() {
  const theme = useThemeColors();
  const { step, index, total, canGoBack, back, skip, editing } = useFlow();
  const fraction = total > 1 ? index / (total - 1) : 0;
  const showSkip = step.optional && !editing;

  return (
    <View className="h-14 flex-row items-center justify-between px-3">
      <View className="w-24 items-start">
        {canGoBack && step.id !== 'complete' ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={editing ? 'Back to your plan' : 'Back'}
            onPress={() => {
              tapHaptic();
              back();
            }}
            className="h-12 min-w-[48px] flex-row items-center justify-center gap-1 rounded-full px-2 active:opacity-70">
            <CaretLeftIcon size={24} weight="bold" color={theme.ink} />
            {editing ? <Text className="font-medium text-label text-ink">Plan</Text> : null}
          </Pressable>
        ) : null}
      </View>

      <View
        accessible
        accessibilityRole="progressbar"
        accessibilityLabel={`${PART_NAMES[step.part]}, ${Math.round(fraction * 100)} percent of the way`}
        className="flex-row items-center gap-2">
        <ProgressMoon fraction={fraction} />
        <Text className="font-medium text-label text-ink-muted">{PART_NAMES[step.part]}</Text>
      </View>

      <View className="w-24 items-end">
        {showSkip ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Skip this question"
            onPress={() => {
              tapHaptic();
              skip();
            }}
            className="h-12 justify-center rounded-full px-3 active:opacity-70">
            <Text className="font-medium text-label text-ink-muted">Skip</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

function SpeechLine({ text, large }: { text: string; large: boolean }) {
  const reduceMotion = useReducedMotion();
  const shown = useSharedValue(1);
  const first = useRef(true);

  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    shown.value = 0;
    shown.value = withTiming(1, { duration: reduceMotion ? 0 : 260, easing: EASE_OUT });
  }, [reduceMotion, shown, text]);

  const style = useAnimatedStyle(() => ({
    opacity: shown.value,
    transform: [{ translateY: (1 - shown.value) * 8 }],
  }));

  return (
    <Animated.View style={style} className="w-full max-w-[560px] px-6">
      <Text
        accessibilityRole="header"
        accessibilityLiveRegion="polite"
        className={`text-center text-ink ${large ? 'font-display text-display' : 'font-heading text-headline'}`}>
        {text}
      </Text>
    </Animated.View>
  );
}

const khatam = require('../../assets/brand/motifs/khatam-star.png');
const sparkle = require('../../assets/brand/motifs/sparkle.png');

// Where the celebration stars settle, as angle (degrees) and distance from Ayyur's centre.
const BURST = [
  { angle: -166, distance: 132, size: 22, gold: true },
  { angle: -134, distance: 104, size: 14, gold: false },
  { angle: -100, distance: 98, size: 16, gold: false },
  { angle: -52, distance: 104, size: 24, gold: true },
  { angle: -16, distance: 140, size: 14, gold: false },
  { angle: 18, distance: 124, size: 20, gold: true },
  { angle: 160, distance: 122, size: 16, gold: false },
  { angle: 194, distance: 108, size: 12, gold: true },
];

function BurstStar({ star, index }: { star: (typeof BURST)[number]; index: number }) {
  const reduceMotion = useReducedMotion();
  const out = useSharedValue(reduceMotion ? 1 : 0);
  useEffect(() => {
    if (reduceMotion) return;
    out.value = withDelay(120 + index * 45, withTiming(1, { duration: 700, easing: Easing.bezier(0.16, 1, 0.3, 1) }));
  }, [index, out, reduceMotion]);

  const rad = (star.angle * Math.PI) / 180;
  const style = useAnimatedStyle(() => ({
    opacity: out.value,
    transform: [
      { translateX: Math.cos(rad) * star.distance * out.value },
      { translateY: Math.sin(rad) * star.distance * out.value },
      { scale: 0.3 + out.value * 0.7 },
      { rotate: `${out.value * 45}deg` },
    ],
  }));

  return (
    <Animated.View style={[styles.burst, { marginLeft: -star.size / 2, marginTop: -star.size / 2 }, style]}>
      <Image source={star.gold ? khatam : sparkle} style={{ width: star.size, height: star.size }} accessible={false} />
    </Animated.View>
  );
}

function AyyurStage({ room }: { room: number }) {
  const reduceMotion = useReducedMotion();
  const { height: screen } = useWindowDimensions();
  const { cue } = useFlow();
  const staged = cue.pose === 'stage';
  const hostSize = Math.round(Math.min(HOST_MAX, Math.max(HOST_MIN, room - 8)));
  const pose = staged ? { scale: 1, height: STAGE_HEIGHT } : { scale: hostSize / AYYUR_BASE, height: hostSize + 8 };
  // A reaction belongs to the line it interrupted, so moving on to a new line ends it.
  const [tapped, setReaction] = useState<{ expression: Expression; say: string; over: string } | null>(null);
  const reaction = tapped && tapped.over === cue.say ? tapped : null;
  const taps = useRef<number[]>([]);
  const clear = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(clear.current), []);

  const onTap = () => {
    if (cue.exit) return;
    tapHaptic();
    const now = Date.now();
    taps.current = [...taps.current.filter((t) => now - t < 4000), now];
    const next = taps.current.length >= 6 ? TIRED : TAP_REACTIONS[(taps.current.length - 1) % TAP_REACTIONS.length];
    setReaction({ ...next, over: cue.say });
    clearTimeout(clear.current);
    clear.current = setTimeout(() => setReaction(null), 1800);
  };

  const size = useSharedValue(pose.scale);
  const height = useSharedValue(pose.height);
  const onStage = useSharedValue(staged ? 1 : 0);
  useEffect(() => {
    const timing = { duration: reduceMotion ? 0 : 340, easing: EASE_OUT };
    size.value = withTiming(pose.scale, timing);
    height.value = withTiming(pose.height, timing);
    onStage.value = withTiming(staged ? 1 : 0, timing);
  }, [height, onStage, pose.height, pose.scale, reduceMotion, size, staged]);

  // He rises over the horizon the first time he appears.
  const rise = useSharedValue(reduceMotion ? 1 : 0);
  useEffect(() => {
    if (!reduceMotion) rise.value = withTiming(1, { duration: 1100, easing: Easing.bezier(0.16, 1, 0.3, 1) });
  }, [reduceMotion, rise]);

  // At the very end he drops down to where the moon sits in the tab bar.
  const dive = useSharedValue(0);
  useEffect(() => {
    if (cue.exit) dive.value = withTiming(1, { duration: reduceMotion ? 0 : 560, easing: Easing.bezier(0.5, 0, 0.75, 0) });
  }, [cue.exit, dive, reduceMotion]);

  const box = useAnimatedStyle(() => ({ height: height.value }));
  const moon = useAnimatedStyle(() => ({
    opacity: rise.value,
    transform: [
      // In the large pose he sits a little lower, so his halo clears the header.
      { translateY: -(1 - size.value) * AYYUR_BASE * 0.5 + onStage.value * DROP + (1 - rise.value) * 140 + dive.value * screen * 0.62 },
      { scale: size.value * (1 - dive.value * 0.66) },
    ],
  }));
  const speech = useAnimatedStyle(() => ({ opacity: 1 - dive.value }));
  // The halo only belongs to the large pose, and fades as he shrinks or leaves.
  const halo = useAnimatedStyle(() => ({
    opacity: onStage.value * rise.value * (1 - dive.value),
    transform: [{ translateY: onStage.value * DROP }, { scale: size.value }],
  }));

  return (
    <View className="items-center gap-3">
      <Animated.View style={[styles.stage, box]}>
        {cue.celebrate ? (
          <View style={styles.burstOrigin}>
            {BURST.map((star, i) => (
              <BurstStar key={i} star={star} index={i} />
            ))}
          </View>
        ) : null}
        <Animated.View style={[styles.halo, halo]}>
          <View className="h-[232px] w-[232px] items-center justify-center rounded-full bg-surface">
            <View className="h-[204px] w-[204px] rounded-full bg-raised/60" />
          </View>
        </Animated.View>
        <Animated.View style={moon}>
          <LiveAyyur
            size={AYYUR_BASE}
            expression={reaction?.expression ?? cue.expression}
            look={cue.look}
            float={!cue.exit}
            onPress={onTap}
            accessibilityLabel="Ayyur. Tap to say hello"
          />
        </Animated.View>
      </Animated.View>
      <Animated.View style={speech} className="w-full items-center gap-2">
        <SpeechLine text={reaction?.say ?? cue.say} large={staged} />
        {cue.hint ? (
          <View className="w-full max-w-[520px] px-8">
            <Text className="text-center font-body text-body text-ink-muted">{cue.hint}</Text>
          </View>
        ) : null}
      </Animated.View>
    </View>
  );
}

function StepBody() {
  const reduceMotion = useReducedMotion();
  const { step, direction } = useFlow();
  const enter = useSharedValue(1);

  useLayoutEffect(() => {
    enter.value = 0;
    enter.value = withTiming(1, { duration: reduceMotion ? 0 : 280, easing: EASE_OUT });
  }, [enter, reduceMotion, step.id]);

  const style = useAnimatedStyle(() => ({
    opacity: 0.2 + enter.value * 0.8,
    transform: [{ translateX: (1 - enter.value) * 28 * direction }],
  }));

  const Current = step.Component;
  return (
    <Animated.View key={step.id} style={[styles.body, style]}>
      <Current />
    </Animated.View>
  );
}

/** The night, the header, Ayyur and the current step. Ayyur stays mounted across steps. */
export function OnboardingShell() {
  const { top } = useSafeAreaInsets();
  const { index, total, canGoBack, back, step, cue } = useFlow();
  const [room, setRoom] = useState(HOST_MIN + 8);
  const stageHeight = cue.pose === 'stage' ? STAGE_HEIGHT : Math.min(HOST_MAX, Math.max(HOST_MIN, room - 8)) + 8;

  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (!canGoBack || step.id === 'complete') return false;
      back();
      return true;
    });
    return () => sub.remove();
  }, [back, canGoBack, step.id]);

  return (
    <View className="flex-1">
      <Sky progress={total > 1 ? index / (total - 1) : 0} />
      <View style={{ paddingTop: top, flex: 1 }}>
        <Header />
        <Room.Provider value={{ stageHeight, setRoom }}>
          <AyyurStage room={room} />
          <StepBody />
        </Room.Provider>
      </View>
    </View>
  );
}

/**
 * The frame every step uses: tells the shell what Ayyur is doing, lays out the step's content with its
 * actions pinned at the bottom, and works out how much room is left for Ayyur. With `fill`, the content
 * stretches to the space that remains (never below `fill` pixels; below that it scrolls).
 */
export function StepLayout({
  cue,
  children,
  footer,
  fill,
}: {
  cue: AyyurCue;
  children?: ReactNode;
  footer?: ReactNode;
  fill?: number;
}) {
  const { setCue } = useFlow();
  const { stageHeight, setRoom } = useContext(Room);
  const { bottom } = useSafeAreaInsets();
  const key = `${cue.expression}|${cue.say}|${cue.hint}|${cue.pose}|${cue.look}|${cue.celebrate}|${cue.exit}`;
  const [viewport, setViewport] = useState(0);
  const [content, setContent] = useState(0);

  useLayoutEffect(() => {
    setCue(cue);
    // The key captures every field of the cue.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, setCue]);

  // Room for Ayyur is the viewport plus his current stage, minus what the answers need. Content height
  // doesn't depend on his size, so this settles in one pass; small changes are ignored to avoid jitter.
  const need = (fill ?? content) + PAD_TOP + PAD_BOTTOM;
  const room = viewport ? viewport + stageHeight - need : 0;
  const last = useRef(0);
  useEffect(() => {
    if (!viewport || (fill === undefined && !content)) return;
    if (Math.abs(room - last.current) < 6) return;
    last.current = room;
    setRoom(room);
  }, [content, fill, room, setRoom, viewport]);

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.body}>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        onLayout={(e) => setViewport(e.nativeEvent.layout.height)}
        contentContainerStyle={styles.scroll}>
        <View
          onLayout={(e) => fill === undefined && setContent(e.nativeEvent.layout.height)}
          // A fixed height rather than flex, so content that scrolls itself (the year wheel) stays bounded.
          style={fill !== undefined ? { height: Math.max(fill, viewport - PAD_TOP - PAD_BOTTOM) } : null}
          className="w-full max-w-[560px] px-6">
          {children}
        </View>
      </ScrollView>
      {footer ? (
        <View className="items-center px-6 pt-3" style={{ paddingBottom: Math.max(bottom, 16) }}>
          <View className="w-full max-w-[560px] gap-3">{footer}</View>
        </View>
      ) : null}
    </KeyboardAvoidingView>
  );
}

const PAD_TOP = 24;
const PAD_BOTTOM = 16;

const styles = StyleSheet.create({
  body: { flex: 1 },
  stage: { width: AYYUR_BASE, alignItems: 'center', overflow: 'visible' },
  // Short content sits in the middle of the space Ayyur leaves, not stuck under him.
  scroll: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', paddingTop: PAD_TOP, paddingBottom: PAD_BOTTOM },
  burstOrigin: { position: 'absolute', left: '50%', top: AYYUR_BASE / 2 + DROP, width: 0, height: 0 },
  burst: { position: 'absolute' },
  halo: { position: 'absolute', top: (AYYUR_BASE - 232) / 2, left: (AYYUR_BASE - 232) / 2 },
});
