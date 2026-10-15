import { StyleSheet } from 'react-native';

import { night } from '@/theme/palette';
import { radius, text } from '@/theme/styles';

/** Styles the steps share. Onboarding is always in the night theme, so they are fixed. */
export const ss = StyleSheet.create({
  fill: { flex: 1 },
  centred: { textAlign: 'center' },
  pressed: { opacity: 0.7 },
  mb4: { marginBottom: 16 },
  gap2: { gap: 8 },
  gap3: { gap: 12 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  pair: { flexDirection: 'row', gap: 12 },
  title: text('heading', 'title', night.ink),
  strong: text('heading', 'body', night.ink),
  body: text('body', 'body', night.inkMuted),
  small: text('body', 'label', night.inkMuted),
  smallCentred: { ...text('body', 'label', night.inkMuted), textAlign: 'center' },
  label: text('medium', 'label', night.inkMuted),
  footnote: { ...text('medium', 'label', night.inkMuted), textAlign: 'center' },
  /** A section inside a step, under a centred heading. */
  section: { marginTop: 28 },
  sectionTitle: { ...text('heading', 'title', night.ink), textAlign: 'center', marginBottom: 12 },
  /** A quiet framed panel. */
  card: { borderRadius: radius.card, borderWidth: 2, borderColor: night.line, backgroundColor: night.surface, padding: 16 },
  /** An icon beside a small line of text, aligned to its first line. */
  aside: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  asideIcon: { paddingTop: 2 },
  /** A text button aligned to the start. */
  link: { minHeight: 48, justifyContent: 'center', alignSelf: 'flex-start' },
  linkLabel: text('heading', 'body', night.inkMuted),
  /** A small centred text button, under a primary one. */
  quiet: { minHeight: 44, alignItems: 'center', justifyContent: 'center' },
});
