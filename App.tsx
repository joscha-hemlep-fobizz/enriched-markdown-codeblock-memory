import { useEffect, useState } from 'react';
import { Linking, SafeAreaView, ScrollView, StyleSheet, Text } from 'react-native';
import { EnrichedMarkdownText } from 'react-native-enriched-markdown';

// Pick a scenario by opening a URL, so it can be measured without touching the UI:
//   xcrun simctl openurl booted repro://none
//   xcrun simctl openurl booted repro://lines/800    (lines of ~42 characters)
//   xcrun simctl openurl booted repro://wide/400     (lines of ~166 characters)
//   xcrun simctl openurl booted repro://stream/800   (grows 4 lines every 50 ms)

const narrowLine = (i: number) => `const line${i} = "${'x'.repeat(26)}";`;
const wideLine = (i: number) => `const line${i} = "${'x'.repeat(150)}";`;

function codeBlock(lines: number, line: (i: number) => string) {
  return '```js\n' + Array.from({ length: lines }, (_, i) => line(i)).join('\n') + '\n```';
}

type Scenario = { kind: 'none' | 'lines' | 'wide' | 'stream'; lines: number };

function parse(url: string | null): Scenario {
  const match = url?.match(/^repro:\/\/(none|lines|wide|stream)(?:\/(\d+))?/);
  if (!match) return { kind: 'none', lines: 0 };
  return { kind: match[1] as Scenario['kind'], lines: Number(match[2] ?? 0) };
}

export default function App() {
  const [scenario, setScenario] = useState<Scenario>({ kind: 'none', lines: 0 });
  const [streamed, setStreamed] = useState(0);

  useEffect(() => {
    Linking.getInitialURL().then(url => setScenario(parse(url)));
    const sub = Linking.addEventListener('url', ({ url }) => setScenario(parse(url)));
    return () => sub.remove();
  }, []);

  useEffect(() => {
    setStreamed(0);
    if (scenario.kind !== 'stream') return;
    const timer = setInterval(() => {
      setStreamed(n => {
        if (n >= scenario.lines) clearInterval(timer);
        return Math.min(n + 4, scenario.lines);
      });
    }, 50);
    return () => clearInterval(timer);
  }, [scenario]);

  let markdown = 'No code block.';
  if (scenario.kind === 'lines') markdown = codeBlock(scenario.lines, narrowLine);
  if (scenario.kind === 'wide') markdown = codeBlock(scenario.lines, wideLine);
  if (scenario.kind === 'stream') markdown = codeBlock(streamed, narrowLine);

  const label =
    scenario.kind === 'stream' ? `stream ${streamed}/${scenario.lines}` : `${scenario.kind} ${scenario.lines}`;

  return (
    <SafeAreaView style={styles.root}>
      <Text testID="scenario" style={styles.label}>
        {label}
      </Text>
      <ScrollView contentContainerStyle={styles.content}>
        <EnrichedMarkdownText flavor="github" markdown={markdown} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#fff' },
  label: { padding: 12, fontWeight: '600' },
  content: { padding: 12 },
});
