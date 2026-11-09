import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ScrollView, Share, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { CHECK_TITLES, type CheckResult, type CheckStatus, formatReport, runDeviceCheck } from '@/db/m0';
import { text, themedStyles } from '@/theme/styles';

// The M0 device check from docs/ayyurdb.md section 15. Temporary: it goes when the results are in the spec.

const useStyles = themedStyles((c) => ({
  screen: { flex: 1, backgroundColor: c.canvas },
  page: { paddingHorizontal: 24, gap: 24 },
  title: text('display', 'display', c.ink),
  intro: text('body', 'body', c.inkMuted),
  check: { gap: 4 },
  head: { flexDirection: 'row', alignItems: 'baseline', gap: 12 },
  name: { ...text('heading', 'title', c.ink), flex: 1 },
  status: text('heading', 'label', c.inkSubtle),
  pass: { color: c.quranText },
  fail: { color: c.dangerText },
  line: text('body', 'label', c.inkMuted),
  actions: { gap: 12 },
}));

const LABEL: Record<CheckStatus, string> = { pass: 'Passed', fail: 'Failed', info: 'Measured' };

export default function DeviceCheckScreen() {
  const s = useStyles();
  const router = useRouter();
  const { top, bottom } = useSafeAreaInsets();
  const [results, setResults] = useState<CheckResult[]>([]);
  const [running, setRunning] = useState(false);
  const finished = !running && results.length === CHECK_TITLES.length;

  const run = async () => {
    setResults([]);
    setRunning(true);
    try {
      await runDeviceCheck((result) => setResults((previous) => [...previous, result]));
    } finally {
      setRunning(false);
    }
  };

  return (
    <ScrollView style={s.screen} contentContainerStyle={[s.page, { paddingTop: top + 16, paddingBottom: bottom + 24 }]}>
      <Text accessibilityRole="header" style={s.title}>
        Device check
      </Text>
      <Text style={s.intro}>
        Checks that this phone can run the encrypted database and its keys, and times the slow parts. It takes about half a
        minute and the screen freezes for a second or two at a time. Nothing in the app is changed.
      </Text>

      {CHECK_TITLES.map(({ id, title }) => {
        const result = results.find((candidate) => candidate.id === id);
        return (
          <View key={id} style={s.check}>
            <View style={s.head}>
              <Text accessibilityRole="header" style={s.name}>
                {title}
              </Text>
              <Text style={[s.status, result?.status === 'pass' && s.pass, result?.status === 'fail' && s.fail]}>
                {result ? LABEL[result.status] : running && results.length === CHECK_TITLES.findIndex((c) => c.id === id) ? 'Running' : 'Not run'}
              </Text>
            </View>
            {result?.lines.map((line, index) => (
              <Text key={index} selectable style={s.line}>
                {line}
              </Text>
            ))}
          </View>
        );
      })}

      <View style={s.actions}>
        {finished ? <Button label="Share results" onPress={() => Share.share({ message: formatReport(results) })} /> : null}
        <Button label={finished ? 'Run checks again' : 'Run checks'} variant={finished ? 'secondary' : 'primary'} loading={running} onPress={run} />
        <Button label="Go back" variant="secondary" disabled={running} onPress={() => router.back()} />
      </View>
    </ScrollView>
  );
}
