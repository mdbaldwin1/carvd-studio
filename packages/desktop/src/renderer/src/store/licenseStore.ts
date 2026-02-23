import { create } from 'zustand';
import type { LicenseMode } from '../utils/featureLimits';

interface LicenseStoreState {
  // State
  licenseMode: LicenseMode;

  // Actions
  setLicenseMode: (mode: LicenseMode) => void;
}

export const useLicenseStore = create<LicenseStoreState>()((set) => ({
  // State
  licenseMode: 'trial' as LicenseMode,

  // Actions
  setLicenseMode: (mode) => {
    set({ licenseMode: mode });
  }
}));
