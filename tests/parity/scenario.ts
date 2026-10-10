import type { Locator, Page } from '@playwright/test';

export type ParityViewport = 'mobile' | 'desktop';
export type ParityRole = 'guest' | 'customer' | 'admin';

export const VIEWPORT_SIZES: Record<ParityViewport, { width: number; height: number }> = {
  mobile: { width: 390, height: 844 },
  desktop: { width: 1440, height: 900 },
};

export type ParityStep = {
  /** Short, stable description; also names the post-step snapshot file. */
  name: string;
  act: (page: Page, region: Locator) => Promise<void>;
  /** Asserts the observable outcome of `act` (state change, request, navigation). */
  verify: (page: Page, region: Locator) => Promise<void>;
  /** Region to snapshot after the step, for example a dialog the step opened. */
  snapshot?: (page: Page) => Locator;
};

export type ParityScenario = {
  /** Unique, kebab-case; used in snapshot file names. */
  id: string;
  /** Migration slice from docs/plans/2026-10-09-shadcn-native-element-migration-plan.md, e.g. `M4`. */
  slice: string;
  route: string;
  viewports: ParityViewport[];
  role?: ParityRole;
  /** Runs after navigation and before the region is captured (open a sheet, reset the cart). */
  setup?: (page: Page) => Promise<void>;
  /** The UI region under migration; keep it tight around the controls that change. */
  region: (page: Page) => Locator;
  /** Upper bound for the tab-order walk through the region. */
  maxTabStops?: number;
  steps?: ParityStep[];
};

export const slug = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
