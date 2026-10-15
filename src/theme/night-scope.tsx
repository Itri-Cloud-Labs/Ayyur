import type { ReactNode } from 'react';

import { SchemeOverride } from './colors';

/** Renders its children in the night theme. Onboarding uses it: the whole flow is one night sky. */
export function NightScope({ children }: { children: ReactNode }) {
  return <SchemeOverride.Provider value="dark">{children}</SchemeOverride.Provider>;
}
