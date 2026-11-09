export type CheckStatus = 'pass' | 'fail' | 'info';

export type CheckResult = {
  id: string;
  title: string;
  status: CheckStatus;
  /** One finding per line, in plain words with the measured numbers. */
  lines: string[];
};
