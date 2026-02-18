import { describe, it, expect, beforeEach } from 'vitest';
import { store } from './store';
import {
  getTrialStatus,
  hasAcknowledgedTrialExpired,
  acknowledgeTrialExpired,
  resetTrialAcknowledgement,
  resetTrial,
  simulateTrialDaysRemaining,
  simulateTrialExpired,
  TRIAL_DAYS,
  BANNER_START_DAY
} from './trial';

const MS_PER_DAY = 1000 * 60 * 60 * 24;

describe('trial', () => {
  beforeEach(() => {
    // Reset store state for each test
    store.set('trialFirstLaunchDate', null);
    store.set('trialAcknowledgedExpired', false);
  });

  describe('constants', () => {
    it('TRIAL_DAYS is 14', () => {
      expect(TRIAL_DAYS).toBe(14);
    });

    it('BANNER_START_DAY is 7', () => {
      expect(BANNER_START_DAY).toBe(7);
    });
  });

  describe('getTrialStatus', () => {
    it('starts a new trial on first launch', () => {
      const status = getTrialStatus();

      expect(status.isTrialActive).toBe(true);
      expect(status.isTrialExpired).toBe(false);
      expect(status.daysRemaining).toBe(TRIAL_DAYS);
      expect(status.shouldShowBanner).toBe(false);
      expect(status.trialStartDate).toBeTypeOf('number');
      expect(status.trialEndDate).toBeTypeOf('number');
    });

    it('stores the first launch date on first call', () => {
      getTrialStatus();
      const stored = store.get('trialFirstLaunchDate') as number;
      expect(stored).toBeTypeOf('number');
      expect(stored).toBeGreaterThan(0);
    });

    it('returns correct days remaining mid-trial (day 5)', () => {
      const fiveDaysAgo = Date.now() - 5 * MS_PER_DAY;
      store.set('trialFirstLaunchDate', fiveDaysAgo);

      const status = getTrialStatus();

      expect(status.isTrialActive).toBe(true);
      expect(status.isTrialExpired).toBe(false);
      expect(status.daysRemaining).toBe(9);
      expect(status.shouldShowBanner).toBe(false);
    });

    it('shows banner after BANNER_START_DAY days', () => {
      const eightDaysAgo = Date.now() - 8 * MS_PER_DAY;
      store.set('trialFirstLaunchDate', eightDaysAgo);

      const status = getTrialStatus();

      expect(status.isTrialActive).toBe(true);
      expect(status.shouldShowBanner).toBe(true);
      expect(status.daysRemaining).toBe(6);
    });

    it('does not show banner before BANNER_START_DAY', () => {
      const sixDaysAgo = Date.now() - 6 * MS_PER_DAY;
      store.set('trialFirstLaunchDate', sixDaysAgo);

      const status = getTrialStatus();

      expect(status.shouldShowBanner).toBe(false);
    });

    it('returns expired status after 14 days', () => {
      const fifteenDaysAgo = Date.now() - 15 * MS_PER_DAY;
      store.set('trialFirstLaunchDate', fifteenDaysAgo);

      const status = getTrialStatus();

      expect(status.isTrialActive).toBe(false);
      expect(status.isTrialExpired).toBe(true);
      expect(status.daysRemaining).toBe(0);
      expect(status.shouldShowBanner).toBe(false);
    });

    it('returns expired on exactly day 14', () => {
      const fourteenDaysAgo = Date.now() - 14 * MS_PER_DAY;
      store.set('trialFirstLaunchDate', fourteenDaysAgo);

      const status = getTrialStatus();

      expect(status.isTrialActive).toBe(false);
      expect(status.isTrialExpired).toBe(true);
      expect(status.daysRemaining).toBe(0);
    });

    it('returns active on day 13 (1 day remaining)', () => {
      const thirteenDaysAgo = Date.now() - 13 * MS_PER_DAY;
      store.set('trialFirstLaunchDate', thirteenDaysAgo);

      const status = getTrialStatus();

      expect(status.isTrialActive).toBe(true);
      expect(status.daysRemaining).toBe(1);
    });

    it('includes correct start and end dates', () => {
      const startDate = Date.now() - 3 * MS_PER_DAY;
      store.set('trialFirstLaunchDate', startDate);

      const status = getTrialStatus();

      expect(status.trialStartDate).toBe(startDate);
      expect(status.trialEndDate).toBe(startDate + TRIAL_DAYS * MS_PER_DAY);
    });
  });

  describe('acknowledgeTrialExpired', () => {
    it('defaults to false', () => {
      expect(hasAcknowledgedTrialExpired()).toBe(false);
    });

    it('sets acknowledged to true', () => {
      acknowledgeTrialExpired();
      expect(hasAcknowledgedTrialExpired()).toBe(true);
    });
  });

  describe('resetTrialAcknowledgement', () => {
    it('resets acknowledged back to false', () => {
      acknowledgeTrialExpired();
      expect(hasAcknowledgedTrialExpired()).toBe(true);

      resetTrialAcknowledgement();
      expect(hasAcknowledgedTrialExpired()).toBe(false);
    });
  });

  describe('resetTrial', () => {
    it('resets trial in development mode', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      // Set some trial state
      store.set('trialFirstLaunchDate', Date.now() - 10 * MS_PER_DAY);
      acknowledgeTrialExpired();

      resetTrial();

      expect(store.get('trialFirstLaunchDate')).toBeNull();
      expect(hasAcknowledgedTrialExpired()).toBe(false);

      process.env.NODE_ENV = originalEnv;
    });

    it('does nothing in production mode', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      const startDate = Date.now() - 10 * MS_PER_DAY;
      store.set('trialFirstLaunchDate', startDate);

      resetTrial();

      expect(store.get('trialFirstLaunchDate')).toBe(startDate);

      process.env.NODE_ENV = originalEnv;
    });
  });

  describe('simulateTrialDaysRemaining', () => {
    it('simulates specific days remaining in dev mode', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      const status = simulateTrialDaysRemaining(3);

      expect(status.isTrialActive).toBe(true);
      expect(status.daysRemaining).toBe(3);
      expect(status.shouldShowBanner).toBe(true); // day 11, past banner start

      process.env.NODE_ENV = originalEnv;
    });

    it('returns current status in production mode', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      // Set up a known state first
      store.set('trialFirstLaunchDate', Date.now() - 5 * MS_PER_DAY);

      const status = simulateTrialDaysRemaining(3);

      // Should return actual status, not simulated
      expect(status.daysRemaining).toBe(9);

      process.env.NODE_ENV = originalEnv;
    });
  });

  describe('simulateTrialExpired', () => {
    it('simulates expired trial in dev mode', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      const status = simulateTrialExpired();

      expect(status.isTrialActive).toBe(false);
      expect(status.isTrialExpired).toBe(true);
      expect(status.daysRemaining).toBe(0);

      process.env.NODE_ENV = originalEnv;
    });

    it('returns current status in production mode', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      store.set('trialFirstLaunchDate', Date.now() - 5 * MS_PER_DAY);

      const status = simulateTrialExpired();

      expect(status.isTrialActive).toBe(true);
      expect(status.daysRemaining).toBe(9);

      process.env.NODE_ENV = originalEnv;
    });
  });
});
