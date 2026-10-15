import type { BottomTabBarProps } from 'expo-router/js-tabs';
import type { Icon } from 'phosphor-react-native';
import { BookOpenIcon } from 'phosphor-react-native/src/icons/BookOpen';
import { CheckCircleIcon } from 'phosphor-react-native/src/icons/CheckCircle';
import { HouseIcon } from 'phosphor-react-native/src/icons/House';
import { UserIcon } from 'phosphor-react-native/src/icons/User';
import { useEffect, useState } from 'react';
import { Image, Keyboard, type LayoutChangeEvent, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';

import { tapHaptic } from '@/lib/haptics';
import { useThemeColors } from '@/theme/colors';
import { radius, text, themedStyles } from '@/theme/styles';

import { BAR_INSET, BAR_MIN_HEIGHT, MOON_RAISE, useTabBarHidden, useTabBarOffset } from './visibility';

const TABS: Record<string, { label: string; hint: string; icon?: Icon }> = {
  index: { label: 'Home', hint: 'Next prayer and today', icon: HouseIcon },
  quran: { label: 'Quran', hint: 'Read, memorise and revise', icon: BookOpenIcon },
  ayyur: { label: 'Ayyur', hint: 'Talk to your companion' },
  habits: { label: 'Habits', hint: 'Habits and tasks', icon: CheckCircleIcon },
  you: { label: 'You', hint: 'Streaks, badges and settings', icon: UserIcon },
};

const EASE_OUT_QUART = Easing.bezier(0.25, 1, 0.5, 1);
const MOON_SIZE = 60;
const LIP = 4;

const moonPlain = require('../../../assets/brand/tab/ayyur-tab-plain.png');
const moonFace = require('../../../assets/brand/tab/ayyur-tab-face.png');

/** 1 while focused, 0 otherwise, eased unless the system asks for reduced motion. */
function useFocusProgress(focused: boolean) {
  const reduceMotion = useReducedMotion();
  const progress = useSharedValue(focused ? 1 : 0);

  useEffect(() => {
    progress.value = withTiming(focused ? 1 : 0, {
      duration: reduceMotion ? 0 : focused ? 200 : 150,
      easing: EASE_OUT_QUART,
    });
  }, [focused, progress, reduceMotion]);

  return progress;
}

function useKeyboardOpen() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    // iOS announces the keyboard before it moves, so the bar can leave in step with it.
    const ios = Platform.OS === 'ios';
    const show = Keyboard.addListener(ios ? 'keyboardWillShow' : 'keyboardDidShow', () => setOpen(true));
    const hide = Keyboard.addListener(ios ? 'keyboardWillHide' : 'keyboardDidHide', () => setOpen(false));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  return open;
}

type TabProps = {
  label: string;
  hint: string;
  focused: boolean;
  onPress: () => void;
  onLongPress: () => void;
};

const useStyles = themedStyles((c) => ({
  tab: { flex: 1, alignItems: 'center', paddingBottom: 8, paddingTop: 10, minHeight: BAR_MIN_HEIGHT },
  moonTab: { flex: 1, alignItems: 'center', paddingBottom: 8 },
  pressed: { opacity: 0.7 },
  iconWell: { height: 32, width: 56, alignItems: 'center', justifyContent: 'center' },
  pill: { flex: 1, borderRadius: radius.full, backgroundColor: c.moonSoft },
  label: { ...text('medium', 'caption', c.inkSubtle), marginTop: 2 },
  labelOn: { ...text('heading', 'caption', c.moonText), marginTop: 2 },
  lip: {
    position: 'absolute',
    left: 0,
    top: LIP,
    width: MOON_SIZE,
    height: MOON_SIZE,
    borderRadius: radius.full,
    backgroundColor: c.moonDeep,
  },
  list: { pointerEvents: 'box-none', width: '100%', maxWidth: 480, flexDirection: 'row', alignItems: 'flex-end' },
  plate: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    top: MOON_RAISE,
    borderRadius: radius.sheet,
    borderWidth: 1,
    borderColor: c.line,
    backgroundColor: c.surface,
  },
}));

function Tab({ label, hint, focused, onPress, onLongPress, icon: Icon }: TabProps & { icon: Icon }) {
  const s = useStyles();
  const colors = useThemeColors();
  const progress = useFocusProgress(focused);

  const pill = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [{ scaleX: 0.6 + 0.4 * progress.value }],
  }));

  return (
    <Pressable
      accessibilityRole="tab"
      accessibilityLabel={label}
      accessibilityHint={hint}
      accessibilityState={{ selected: focused }}
      onPress={onPress}
      onLongPress={onLongPress}
      style={({ pressed }) => [s.tab, pressed && s.pressed]}>
      <View style={s.iconWell}>
        <Animated.View style={[StyleSheet.absoluteFill, pill]}>
          <View style={s.pill} />
        </Animated.View>
        <View>
          <Icon size={24} weight="fill" color={focused ? colors.moonText : colors.inkSubtle} />
        </View>
      </View>
      <Text numberOfLines={1} maxFontSizeMultiplier={1.5} style={focused ? s.labelOn : s.label}>
        {label}
      </Text>
    </Pressable>
  );
}

function MoonTab({ label, hint, focused, onPress, onLongPress }: TabProps) {
  const s = useStyles();
  const reduceMotion = useReducedMotion();
  const progress = useFocusProgress(focused);
  const pressed = useSharedValue(0);

  const press = (to: number) => {
    pressed.value = reduceMotion ? to : withSpring(to, { stiffness: 600, damping: 40, mass: 0.6, overshootClamping: true });
  };

  // The moon sinks onto its lip while held, like every other raised control.
  const disc = useAnimatedStyle(() => ({ transform: [{ translateY: LIP * pressed.value }] }));
  const face = useAnimatedStyle(() => ({ opacity: progress.value }));

  return (
    <Pressable
      accessibilityRole="tab"
      accessibilityLabel={label}
      accessibilityHint={hint}
      accessibilityState={{ selected: focused }}
      onPress={onPress}
      onLongPress={onLongPress}
      onPressIn={() => press(1)}
      onPressOut={() => press(0)}
      style={s.moonTab}>
      <View style={{ width: MOON_SIZE, height: MOON_SIZE + LIP }}>
        <View style={s.lip} />
        <Animated.View style={[{ width: MOON_SIZE, height: MOON_SIZE }, disc]}>
          <Image source={moonPlain} accessible={false} accessibilityIgnoresInvertColors style={styles.moon} />
          <Animated.View style={[StyleSheet.absoluteFill, face]}>
            <Image source={moonFace} accessible={false} accessibilityIgnoresInvertColors style={styles.moon} />
          </Animated.View>
        </Animated.View>
      </View>
      <Text numberOfLines={1} maxFontSizeMultiplier={1.5} style={focused ? s.labelOn : s.label}>
        {label}
      </Text>
    </Pressable>
  );
}

export function TabBar({ state, navigation }: BottomTabBarProps) {
  const s = useStyles();
  const reduceMotion = useReducedMotion();
  const offset = useTabBarOffset();
  const keyboardOpen = useKeyboardOpen();
  const hidden = useTabBarHidden() || keyboardOpen;
  const [height, setHeight] = useState(BAR_MIN_HEIGHT + MOON_RAISE);

  const away = useSharedValue(hidden ? 1 : 0);
  useEffect(() => {
    away.value = withTiming(hidden ? 1 : 0, {
      duration: reduceMotion ? 0 : hidden ? 200 : 250,
      easing: EASE_OUT_QUART,
    });
  }, [away, hidden, reduceMotion]);

  // Slides the bar past the bottom edge. With reduced motion it fades instead.
  const travel = height + offset;
  const slide = useAnimatedStyle(() => (reduceMotion ? { opacity: 1 - away.value } : { transform: [{ translateY: travel * away.value }] }));

  const onLayout = (event: LayoutChangeEvent) => setHeight(event.nativeEvent.layout.height);

  return (
    <Animated.View
      onLayout={onLayout}
      accessibilityElementsHidden={hidden}
      importantForAccessibility={hidden ? 'no-hide-descendants' : 'auto'}
      style={[styles.dock, { bottom: offset, pointerEvents: hidden ? 'none' : 'box-none' }, slide]}>
      <View accessibilityRole="tablist" style={s.list}>
        <View style={s.plate} />
        {state.routes.map((route, index) => {
          const tab = TABS[route.name];
          if (!tab) return null;

          const focused = state.index === index;

          const onPress = () => {
            const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
            if (focused || event.defaultPrevented) return;
            tapHaptic();
            navigation.navigate(route.name, route.params);
          };
          const onLongPress = () => navigation.emit({ type: 'tabLongPress', target: route.key });

          const shared = { label: tab.label, hint: tab.hint, focused, onPress, onLongPress };
          return tab.icon ? <Tab key={route.key} {...shared} icon={tab.icon} /> : <MoonTab key={route.key} {...shared} />;
        })}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  dock: { position: 'absolute', left: 0, right: 0, alignItems: 'center', paddingHorizontal: BAR_INSET },
  moon: { width: MOON_SIZE, height: MOON_SIZE },
});
