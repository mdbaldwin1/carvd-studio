import { describe, it, expect, beforeEach } from 'vitest';
import { useLicenseStore } from './licenseStore';

describe('licenseStore', () => {
  beforeEach(() => {
    useLicenseStore.setState({ licenseMode: 'trial' });
  });

  describe('default state', () => {
    it('defaults to trial mode', () => {
      expect(useLicenseStore.getState().licenseMode).toBe('trial');
    });
  });

  describe('setLicenseMode', () => {
    it('sets license mode to licensed', () => {
      useLicenseStore.getState().setLicenseMode('licensed');

      expect(useLicenseStore.getState().licenseMode).toBe('licensed');
    });

    it('sets license mode to free', () => {
      useLicenseStore.getState().setLicenseMode('free');

      expect(useLicenseStore.getState().licenseMode).toBe('free');
    });

    it('sets license mode back to trial', () => {
      useLicenseStore.getState().setLicenseMode('free');
      useLicenseStore.getState().setLicenseMode('trial');

      expect(useLicenseStore.getState().licenseMode).toBe('trial');
    });
  });
});
