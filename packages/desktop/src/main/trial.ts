/**
 * Trial system for Carvd Studio
 *
 * Manages 14-day trial period with feature-limited fallback.
 * Trial data is stored in the main preferences store.
 */

import { store } from './store';
import log from 'electron-log';

// Configuration
export const TRIAL_DAYS = 14;
export const BANNER_START_DAY = 7; // Show banner after this many days

export interface TrialStatus {
  /** Whether the trial period is still active */
  isTrialActive: boolean;
  /** Whether the trial has expired */
  isTrialExpired: boolean;
  /** Days remaining in trial (0 if expired) */
  daysRemaining: number;
  /** Whether to show the trial banner */
  shouldShowBanner: boolean;
  /** Timestamp of first launch */
  trialStartDate: number | null;
  /** Timestamp when trial expires */
  trialEndDate: number | null;
}

/**
 * Get the current trial status
 */
export function getTrialStatus(): TrialStatus {
  const firstLaunchDate = store.get('trialFirstLaunchDate') as number | undefined;
  const now = Date.now();

  // First time launching - start trial
  if (!firstLaunchDate) {
    log.info('[Trial] First launch detected, starting 14-day trial');
    store.set('trialFirstLaunchDate', now);

    return {
      isTrialActive: true,
      isTrialExpired: false,
      daysRemaining: TRIAL_DAYS,
      shouldShowBanner: false,
      trialStartDate: now,
      trialEndDate: now + TRIAL_DAYS * 24 * 60 * 60 * 1000
    };
  }

  const msPerDay = 1000 * 60 * 60 * 24;
  const daysSinceFirstLaunch = Math.floor((now - firstLaunchDate) / msPerDay);
  const daysRemaining = Math.max(0, TRIAL_DAYS - daysSinceFirstLaunch);
  const isTrialActive = daysRemaining > 0;
  const shouldShowBanner = isTrialActive && daysSinceFirstLaunch >= BANNER_START_DAY;

  log.info(`[Trial] Status: ${daysRemaining} days remaining, banner: ${shouldShowBanner}`);

  return {
    isTrialActive,
    isTrialExpired: !isTrialActive,
    daysRemaining,
    shouldShowBanner,
    trialStartDate: firstLaunchDate,
    trialEndDate: firstLaunchDate + TRIAL_DAYS * msPerDay
  };
}

/**
 * Check if user has dismissed the trial expired modal this session
 */
export function hasAcknowledgedTrialExpired(): boolean {
  return (store.get('trialAcknowledgedExpired') as boolean) ?? false;
}

/**
 * Mark that user has acknowledged the trial expired modal
 */
export function acknowledgeTrialExpired(): void {
  store.set('trialAcknowledgedExpired', true);
}

/**
 * Reset acknowledgement (called on app start so modal shows each launch)
 */
export function resetTrialAcknowledgement(): void {
  store.set('trialAcknowledgedExpired', false);
}

/**
 * Reset trial for development/testing only
 */
export function resetTrial(): void {
  if (process.env.NODE_ENV !== 'development') {
    log.warn('[Trial] Attempted to reset trial in production - ignored');
    return;
  }
  log.info('[Trial] Resetting trial (dev mode)');
  store.set('trialFirstLaunchDate', null);
  store.set('trialAcknowledgedExpired', false);
}

/**
 * Simulate trial with specific days remaining (dev only)
 * @param daysRemaining Days to simulate (e.g., 3 for "3 days left")
 */
export function simulateTrialDaysRemaining(daysRemaining: number): TrialStatus {
  if (process.env.NODE_ENV !== 'development') {
    log.warn('[Trial] Attempted to simulate trial in production - ignored');
    return getTrialStatus();
  }

  const msPerDay = 1000 * 60 * 60 * 24;
  const daysElapsed = TRIAL_DAYS - daysRemaining;
  const simulatedStartDate = Date.now() - daysElapsed * msPerDay;

  log.info(`[Trial] Simulating ${daysRemaining} days remaining (dev mode)`);
  store.set('trialFirstLaunchDate', simulatedStartDate);
  store.set('trialAcknowledgedExpired', false);

  return getTrialStatus();
}

/**
 * Simulate expired trial (dev only)
 */
export function simulateTrialExpired(): TrialStatus {
  if (process.env.NODE_ENV !== 'development') {
    log.warn('[Trial] Attempted to simulate expired trial in production - ignored');
    return getTrialStatus();
  }

  const msPerDay = 1000 * 60 * 60 * 24;
  // Set start date to 15 days ago (trial is 14 days, so it's expired)
  const simulatedStartDate = Date.now() - 15 * msPerDay;

  log.info('[Trial] Simulating expired trial (dev mode)');
  store.set('trialFirstLaunchDate', simulatedStartDate);
  store.set('trialAcknowledgedExpired', false);

  return getTrialStatus();
}
