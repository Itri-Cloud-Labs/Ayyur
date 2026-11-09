// The web build of the M0 device check. AyyurDB is for phones only (spec decision 15), and
// expo-sqlite doesn't bundle for the web without extra setup, so the checks live in
// `index.native.ts` and this file keeps the web bundle building.

import type { CheckResult, CheckStatus } from './types';

export type { CheckResult, CheckStatus };

export const CHECK_TITLES: { id: string; title: string }[] = [{ id: 'device', title: 'Device' }];

export async function runDeviceCheck(onResult: (result: CheckResult) => void): Promise<CheckResult[]> {
  const result: CheckResult = { id: 'device', title: 'Device', status: 'fail', lines: ['The device check runs on a phone, in a development build.'] };
  onResult(result);
  return [result];
}

export function formatReport(results: readonly CheckResult[]): string {
  return results.map((result) => `${result.title}\n${result.lines.join('\n')}`).join('\n\n');
}
