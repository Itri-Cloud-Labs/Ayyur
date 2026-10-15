import { BellIcon } from 'phosphor-react-native/src/icons/Bell';
import { CaretLeftIcon } from 'phosphor-react-native/src/icons/CaretLeft';
import { LockIcon } from 'phosphor-react-native/src/icons/Lock';
import { MapPinIcon } from 'phosphor-react-native/src/icons/MapPin';
import { type ReactNode, useEffect, useLayoutEffect, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  BackHandler,
  findNodeHandle,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import Animated, { Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { Expression } from '@/components/ayyur/layers';
import { LiveAyyur } from '@/components/ayyur/live-ayyur';
import { Button } from '@/components/button';
import { useTabBarOffset } from '@/components/tab-bar/visibility';
import { tapHaptic } from '@/lib/haptics';
import { useKeyboard } from '@/lib/use-keyboard';
import { useThemeColors, withAlpha } from '@/theme/colors';
import { night } from '@/theme/palette';
import { radius, text } from '@/theme/styles';

import { type AyyurCue, type Beat, PART_NAMES, useFlow, useFlowNav } from './flow';
import { ProgressMoon } from './ui/progress-moon';
import { Sky } from './ui/sky';

const EASE_OUT = Easing.bezier(0.25, 1, 0.5, 1);
const BASE = 176;
const HEADER = 56;

/** Ayyur's size for each beat, fixed per screen height. Never derived from the content. */
function ayyurSize(beat: Beat, height: number) {
  const short = height < 720;
  switch (beat) {
    case 'stage':
      return height < 660 ? 104 : short ? 132 : BASE;
    case 'talk':
      return short ? 108 : 140;
    case 'pick':
      return short ? 64 : 84;
    case 'calm':
      return short ? 64 : 80;
    case 'tool':
      return 0;
  }
}

// What he does when tapped, in turn. Many taps in a row tire him out, in a friendly way.
const TAP_REACTIONS: { expression: Expression; say: string }[] = [
  { expression: 'wink', say: 'Hehe. Hello to you too.' },
  { expression: 'delighted', say: 'That tickles!' },
  { expression: 'surprised', say: 'Oh! Hello again.' },
];
const TIRED = {
  expression: 'sleepy' as Expression,
  say: 'Phew. You’ll tire me out before Fajr.',
};

const BADGES = { pin: MapPinIcon, bell: BellIcon, lock: LockIcon };

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

function BurstStar({ star, index, reach }: { star: (typeof BURST)[number]; index: number; reach: number }) {
  const reduceMotion = useReducedMotion();
  const out = useSharedValue(reduceMotion ? 1 : 0);
  useEffect(() => {
    if (!reduceMotion)
      out.value = withDelay(
        120 + index * 45,
        withTiming(1, {
          duration: 700,
          easing: Easing.bezier(0.16, 1, 0.3, 1),
        }),
      );
  }, [index, out, reduceMotion]);
  const rad = (star.angle * Math.PI) / 180;
  const style = useAnimatedStyle(() => ({
    opacity: out.value,
    transform: [
      { translateX: Math.cos(rad) * star.distance * reach * out.value },
      { translateY: Math.sin(rad) * star.distance * reach * out.value },
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

function Header() {
  const theme = useThemeColors();
  const { step, progress, canGoBack, back, editing } = useFlowNav();
  return (
    <View style={styles.header}>
      <View style={styles.headerSide}>
        {canGoBack && step.id !== 'complete' ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={editing ? 'Back to your plan' : 'Back'}
            onPress={() => {
              tapHaptic();
              back();
            }}
            style={({ pressed }) => [styles.back, pressed && styles.pressed]}>
            <CaretLeftIcon size={24} weight="bold" color={theme.ink} />
            {editing ? <Text style={styles.backLabel}>Plan</Text> : null}
          </Pressable>
        ) : null}
      </View>
      <View
        accessible
        accessibilityRole="progressbar"
        accessibilityLabel={`${PART_NAMES[step.part]}, ${Math.round(progress * 100)} percent of the way`}
        style={styles.part}>
        <ProgressMoon fraction={progress} />
        <Text style={styles.partLabel}>{PART_NAMES[step.part]}</Text>
      </View>
      <View style={styles.headerSide} />
    </View>
  );
}

/**
 * The question block: Ayyur's question, its reason, and any reaction of his as a small line under it.
 * After each step change the question takes screen-reader focus, so the new screen is announced.
 */
function Question({ cue, reaction, large, compact }: { cue: AyyurCue; reaction: string | null; large: boolean; compact: boolean }) {
  const reduceMotion = useReducedMotion();
  const heading = useRef<Text>(null);
  const shown = useSharedValue(1);
  const { step } = useFlowNav();

  useEffect(() => {
    shown.value = 0;
    shown.value = withTiming(1, {
      duration: reduceMotion ? 0 : 200,
      easing: EASE_OUT,
    });
  }, [cue.say, reduceMotion, shown]);

  useEffect(() => {
    if (Platform.OS === 'web') return;
    const t = setTimeout(() => {
      const node = heading.current && findNodeHandle(heading.current);
      if (node) AccessibilityInfo.setAccessibilityFocus(node);
    }, 250);
    return () => clearTimeout(t);
  }, [step.id]);

  const style = useAnimatedStyle(() => ({
    opacity: shown.value,
    transform: [{ translateY: (1 - shown.value) * 6 }],
  }));

  return (
    <Animated.View style={[styles.full, style]}>
      <View style={styles.question}>
        <View style={styles.questionText}>
          <Text ref={heading} accessibilityRole="header" style={large ? styles.sayLarge : compact ? styles.sayCompact : styles.say}>
            {cue.say}
          </Text>
          {/* While typing, the question stays and its explanation steps aside to make room. */}
          {cue.hint && !compact ? <Text style={styles.hint}>{cue.hint}</Text> : null}
        </View>
        {reaction && !compact ? (
          <View accessibilityLiveRegion="polite" style={styles.reaction}>
            <Text style={styles.partLabel}>{reaction}</Text>
          </View>
        ) : null}
      </View>
    </Animated.View>
  );
}

function AyyurStage({
  size,
  onTap,
  reaction,
  exitTarget,
}: {
  size: number;
  onTap: () => void;
  reaction: Expression | null;
  exitTarget: { dx: number; dy: number; scale: number } | null;
}) {
  const reduceMotion = useReducedMotion();
  const { cue, step } = useFlowNav();
  const staged = step.beat === 'stage';
  const BadgeIcon = cue.badge ? BADGES[cue.badge] : null;

  // His size eases between beats with a transform; the band he sits in never animates its height.
  const scale = useSharedValue(size / BASE);
  useEffect(() => {
    scale.value = withTiming(size / BASE, {
      duration: reduceMotion ? 0 : 320,
      easing: EASE_OUT,
    });
  }, [reduceMotion, scale, size]);

  // He rises over the horizon the first time he appears.
  const rise = useSharedValue(reduceMotion ? 1 : 0);
  useEffect(() => {
    if (!reduceMotion)
      rise.value = withTiming(1, {
        duration: 1100,
        easing: Easing.bezier(0.16, 1, 0.3, 1),
      });
  }, [reduceMotion, rise]);

  // At the very end he drops into the moon in the tab bar, to the exact spot it occupies.
  const dive = useSharedValue(0);
  useEffect(() => {
    if (exitTarget)
      dive.value = withTiming(1, {
        duration: reduceMotion ? 0 : 560,
        easing: Easing.bezier(0.5, 0, 0.75, 0),
      });
  }, [dive, exitTarget, reduceMotion]);

  const moon = useAnimatedStyle(() => {
    const s = scale.value;
    const target = exitTarget ?? { dx: 0, dy: 0, scale: 1 };
    return {
      opacity: rise.value,
      transform: [
        { translateX: dive.value * target.dx },
        { translateY: (1 - rise.value) * 140 + dive.value * target.dy },
        { scale: s * (1 + dive.value * (target.scale - 1)) },
      ],
    };
  });
  const halo = useAnimatedStyle(() => ({
    opacity: rise.value * (1 - dive.value),
    transform: [{ scale: scale.value }],
  }));

  return (
    // The large pose gets extra room so his halo clears the header and the question.
    <View style={[styles.centre, { height: size ? size + (staged ? Math.round(size * 0.36) : 12) : 0 }]}>
      {staged ? (
        <Animated.View style={[styles.halo, halo]}>
          <View style={styles.haloOuter}>
            <View style={styles.haloInner} />
          </View>
        </Animated.View>
      ) : null}
      {cue.celebrate ? (
        <View style={styles.burstOrigin}>
          {BURST.map((star, i) => (
            <BurstStar key={i} star={star} index={i} reach={size / BASE} />
          ))}
        </View>
      ) : null}
      <Animated.View style={[styles.moon, moon]}>
        <LiveAyyur
          size={BASE}
          expression={reaction ?? cue.expression}
          look={cue.look}
          float={!exitTarget && step.beat !== 'calm'}
          onPress={onTap}
          decorative={step.id !== 'welcome'}
          accessibilityLabel="Ayyur, a smiling moon. Tap him to say hello."
        />
        {BadgeIcon ? (
          <View style={styles.badge}>
            <BadgeIcon size={30} weight="fill" color={night.canvas} />
          </View>
        ) : null}
      </Animated.View>
    </View>
  );
}

function StepBody() {
  const reduceMotion = useReducedMotion();
  const { step } = useFlowNav();
  const enter = useSharedValue(1);
  useLayoutEffect(() => {
    enter.value = 0;
    enter.value = withTiming(1, {
      duration: reduceMotion ? 0 : 200,
      easing: EASE_OUT,
    });
  }, [enter, reduceMotion, step.id]);
  const style = useAnimatedStyle(() => ({
    opacity: enter.value,
    transform: [{ translateY: (1 - enter.value) * 8 }],
  }));
  const Current = step.Component;
  return (
    <Animated.View key={step.id} style={[styles.body, style]}>
      <Current />
    </Animated.View>
  );
}

/** The night, the header, Ayyur, the question and the current step. Ayyur stays mounted across steps. */
export function OnboardingShell() {
  const { top, bottom } = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const tabOffset = useTabBarOffset();
  const { progress, canGoBack, back, step, cue } = useFlowNav();
  const keyboard = useKeyboard();
  // With the keyboard up he shrinks to a small companion above the question, so the field and its
  // button stay in view.
  const size = keyboard.open ? Math.min(ayyurSize(step.beat, height - top - bottom), 52) : ayyurSize(step.beat, height - top - bottom);

  const [tapped, setTapped] = useState<{
    expression: Expression;
    say: string;
    on: string;
  } | null>(null);
  const reaction = tapped && tapped.on === step.id ? tapped : null;
  const taps = useRef<number[]>([]);
  const clear = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(clear.current), []);
  const onTap = () => {
    if (cue.exit) return;
    tapHaptic();
    const now = Date.now();
    taps.current = [...taps.current.filter((t) => now - t < 4000), now];
    const next = taps.current.length >= 6 ? TIRED : TAP_REACTIONS[(taps.current.length - 1) % TAP_REACTIONS.length];
    setTapped({ ...next, on: step.id });
    clearTimeout(clear.current);
    clear.current = setTimeout(() => setTapped(null), 2200);
  };

  // Where the tab bar's moon will be, worked out from the same constants the tab bar uses.
  const band = useRef<View>(null);
  const [exitTarget, setExitTarget] = useState<{
    dx: number;
    dy: number;
    scale: number;
  } | null>(null);
  useEffect(() => {
    if (!cue.exit) return;
    band.current?.measureInWindow((x, y, w, h) => {
      const from = { x: x + w / 2, y: y + h / 2 };
      const to = { x: width / 2, y: height - (tabOffset + 62) };
      setExitTarget({ dx: to.x - from.x, dy: to.y - from.y, scale: 60 / size });
    });
  }, [cue.exit, height, size, tabOffset, width]);

  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (!canGoBack || step.id === 'complete') return false;
      back();
      return true;
    });
    return () => sub.remove();
  }, [back, canGoBack, step.id]);

  return (
    <View style={styles.body}>
      <Sky progress={progress} />
      <View style={{ paddingTop: top, flex: 1 }}>
        <Header />
        <View ref={band} collapsable={false}>
          <AyyurStage size={size} onTap={onTap} reaction={reaction?.expression ?? null} exitTarget={exitTarget} />
        </View>
        <View style={exitTarget ? { opacity: 0 } : undefined}>
          <Question cue={cue} reaction={reaction?.say ?? null} large={step.beat === 'stage'} compact={keyboard.open} />
        </View>
        <StepBody />
      </View>
    </View>
  );
}

/** The standard footer: one primary that never blocks optional steps, and says why a required one waits. */
export function StepFooter({ label, onPress, extra }: { label?: string; onPress?: () => void; extra?: ReactNode }) {
  const { step, answers, next, editing, finishWithSuggestions } = useFlow();
  const ready = step.required ? step.required.ready(answers) : true;
  const answered = step.answered ? step.answered(answers) : true;
  const text = label ?? (step.required || answered ? 'Continue' : 'Skip for now');
  const { open: typing } = useKeyboard();
  // While typing, only the button stays: everything else would push the field under the keyboard.
  const offerShortcut = !typing && !editing && (step.part === 'quran' || step.part === 'days' || step.part === 'yourday');
  return (
    <>
      {typing ? null : extra}
      <Button label={text} tone={step.tone} disabled={!ready} onPress={onPress ?? next} />
      {!ready && step.required && !typing ? <Text style={styles.reason}>{step.required.reason}</Text> : null}
      {offerShortcut ? (
        <Pressable
          accessibilityRole="button"
          onPress={finishWithSuggestions}
          style={({ pressed }) => [styles.shortcut, pressed && styles.pressed]}>
          <Text style={styles.partLabel}>Use suggestions for the rest</Text>
        </Pressable>
      ) : null}
    </>
  );
}

/**
 * The frame every step uses. Tells the shell what Ayyur is doing, then lays out the step's content by
 * its beat: docked by the thumb for a conversation, from the top for a list. Its actions sit at the
 * bottom; a line above them appears when the content scrolls underneath.
 */
export function StepLayout({ cue, children, footer }: { cue: AyyurCue; children?: ReactNode; footer?: ReactNode }) {
  const { setCue, step } = useFlowNav();
  const { bottom } = useSafeAreaInsets();
  const key = `${cue.expression}|${cue.say}|${cue.hint}|${cue.look}|${cue.badge}|${cue.celebrate}|${cue.exit}`;
  const [viewport, setViewport] = useState(0);
  const [content, setContent] = useState(0);
  const [scrolled, setScrolled] = useState(false);
  const overflows = content > viewport + 1;
  const keyboard = useKeyboard();
  const scroller = useRef<ScrollView>(null);
  const offset = useRef(0);
  const footerTop = useRef<View>(null);
  const frame = useRef<View>(null);

  // Android usually resizes the window for the keyboard, but with edge-to-edge it may not. Rather than
  // guess, measure: if the step still reaches under the keyboard's top edge, pad by exactly that much.
  const [overlap, setOverlap] = useState(0);
  useEffect(() => {
    if (Platform.OS !== 'android' || !keyboard.open) return;
    const t = setTimeout(() => {
      frame.current?.measureInWindow((_, y, __, h) => setOverlap(Math.max(0, Math.round(y + h - keyboard.top))));
    }, 60);
    return () => clearTimeout(t);
  }, [keyboard.open, keyboard.top]);
  const lift = keyboard.open ? overlap : 0;

  // When the keyboard opens, make sure the focused field sits above the footer, scrolling if needed.
  useEffect(() => {
    if (!keyboard.open) return;
    const t = setTimeout(
      () => {
        const field = TextInput.State.currentlyFocusedInput?.();
        if (!field || !footerTop.current) return;
        footerTop.current.measureInWindow((_, footerY) => {
          field.measureInWindow((__, y, ___, h) => {
            const overlap = y + h + 12 - footerY;
            if (overlap > 0) scroller.current?.scrollTo({ y: offset.current + overlap, animated: true });
          });
        });
      },
      Platform.OS === 'ios' ? 280 : 120,
    );
    return () => clearTimeout(t);
  }, [keyboard.open, keyboard.height]);

  useLayoutEffect(() => {
    setCue(cue);
    // The key captures every field of the cue.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, setCue]);

  const docked = step.beat === 'talk';
  return (
    // iOS needs padding. Android resizes the window for the keyboard itself (Expo's guidance is to add
    // no behaviour there); adding one as well shrank the step twice and hid the field.
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={[styles.body, { paddingBottom: lift }]}>
      <View ref={frame} collapsable={false} style={[StyleSheet.absoluteFill, { pointerEvents: 'none' }]} />
      <View style={[styles.rule, scrolled && styles.ruleShown]} />
      <ScrollView
        ref={scroller}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
        scrollEventThrottle={64}
        onScroll={(e) => {
          offset.current = e.nativeEvent.contentOffset.y;
          setScrolled(e.nativeEvent.contentOffset.y > 2);
        }}
        onLayout={(e) => setViewport(e.nativeEvent.layout.height)}
        onContentSizeChange={(_, h) => setContent(h)}
        contentContainerStyle={[styles.scroll, docked ? styles.docked : null]}>
        <View style={styles.content}>{children}</View>
      </ScrollView>
      <View
        ref={footerTop}
        collapsable={false}
        // The keyboard covers the home indicator, so the safe-area gap isn't needed while it's up.
        style={[styles.footer, overflows && styles.ruleShown, { paddingBottom: keyboard.open ? 12 : Math.max(bottom, 16) }]}>
        <View style={styles.footerContent}>{footer ?? <StepFooter />}</View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  body: { flex: 1 },
  pressed: { opacity: 0.7 },
  header: { height: HEADER, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12 },
  headerSide: { width: 96, alignItems: 'flex-start' },
  back: {
    height: 48,
    minWidth: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    borderRadius: radius.full,
    paddingHorizontal: 8,
  },
  backLabel: text('medium', 'label', night.ink),
  part: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  partLabel: text('medium', 'label', night.inkMuted),
  question: { width: '100%', alignItems: 'center', gap: 8, paddingHorizontal: 24 },
  questionText: { width: '100%', maxWidth: 360, gap: 8 },
  say: { ...text('heading', 'headline', night.ink), textAlign: 'center' },
  sayLarge: { ...text('display', 'display', night.ink), textAlign: 'center' },
  sayCompact: { ...text('heading', 'title', night.ink), textAlign: 'center' },
  hint: { ...text('body', 'body', night.inkMuted), textAlign: 'center' },
  reaction: { borderRadius: radius.full, backgroundColor: night.surface, paddingHorizontal: 12, paddingVertical: 4 },
  centre: { alignItems: 'center', justifyContent: 'center' },
  haloOuter: { height: 232, width: 232, alignItems: 'center', justifyContent: 'center', borderRadius: 116, backgroundColor: night.surface },
  haloInner: { height: 204, width: 204, borderRadius: 102, backgroundColor: withAlpha(night.raised, 0.6) },
  reason: { ...text('medium', 'label', night.inkMuted), textAlign: 'center' },
  shortcut: { minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  rule: { borderTopWidth: 1, borderTopColor: 'transparent' },
  ruleShown: { borderTopColor: night.line },
  content: { width: '100%', maxWidth: 560, paddingHorizontal: 24 },
  footer: { alignItems: 'center', borderTopWidth: 1, borderTopColor: 'transparent', paddingHorizontal: 24, paddingTop: 12 },
  footerContent: { width: '100%', maxWidth: 560, gap: 8 },
  scroll: {
    flexGrow: 1,
    alignItems: 'center',
    paddingTop: 20,
    paddingBottom: 12,
  },
  docked: { justifyContent: 'flex-end' },
  full: { width: '100%' },
  moon: { width: BASE, height: BASE },
  badge: {
    position: 'absolute',
    right: -6,
    bottom: 4,
    height: 64,
    width: 64,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 32,
    borderWidth: 4,
    borderColor: night.canvas,
    backgroundColor: night.ink,
  },
  burstOrigin: {
    position: 'absolute',
    left: '50%',
    top: '50%',
    width: 0,
    height: 0,
  },
  burst: { position: 'absolute' },
  halo: { position: 'absolute' },
});
