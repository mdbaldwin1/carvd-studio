/**
 * Hook to manage license and trial status
 *
 * Provides unified access to license state, trial state, and feature limits.
 * Use this hook in components that need to check if features are available
 * or display trial/license status.
 */

import { useState, useEffect, useCallback } from 'react';
import { LicenseMode, FeatureLimits, getFeatureLimits } from '../utils/featureLimits';

export interface TrialStatus {
  isTrialActive: boolean;
  isTrialExpired: boolean;
  daysRemaining: number;
  shouldShowBanner: boolean;
  trialStartDate: number | null;
  trialEndDate: number | null;
}

export interface LicenseData {
  licenseKey: string | null;
  licenseEmail: string | null;
  licenseOrderId: string | null;
  licenseActivatedAt: string | null;
}

export interface LicenseState {
  /** Current mode: trial, licensed, or free */
  mode: LicenseMode;
  /** Whether user can use the app with full features */
  hasFullAccess: boolean;
  /** Trial status details */
  trial: TrialStatus | null;
  /** License data if activated */
  license: LicenseData | null;
  /** Current feature limits */
  limits: FeatureLimits;
  /** Whether the trial expired modal should show */
  shouldShowExpiredModal: boolean;
  /** Whether the trial banner should show */
  shouldShowBanner: boolean;
  /** Loading state */
  isLoading: boolean;
}

const defaultTrialStatus: TrialStatus = {
  isTrialActive: true,
  isTrialExpired: false,
  daysRemaining: 14,
  shouldShowBanner: false,
  trialStartDate: null,
  trialEndDate: null
};

export function useLicenseStatus() {
  const [state, setState] = useState<LicenseState>({
    mode: 'trial',
    hasFullAccess: true,
    trial: defaultTrialStatus,
    license: null,
    limits: getFeatureLimits('trial'),
    shouldShowExpiredModal: false,
    shouldShowBanner: false,
    isLoading: true
  });

  const checkStatus = useCallback(async () => {
    try {
      const [licenseKey, licenseData, trialStatus] = await Promise.all([
        window.electronAPI.getLicenseKey(),
        window.electronAPI.getLicenseData(),
        window.electronAPI.getTrialStatus()
      ]);

      // Check if user has a valid license key stored
      const isLicensed = !!licenseKey;
      const isTrialActive = trialStatus.isTrialActive;

      let mode: LicenseMode;
      if (isLicensed) {
        mode = 'licensed';
      } else if (isTrialActive) {
        mode = 'trial';
      } else {
        mode = 'free';
      }

      const hasFullAccess = mode !== 'free';
      const shouldShowExpiredModal = trialStatus.isTrialExpired && !isLicensed;
      const shouldShowBanner = trialStatus.shouldShowBanner && !isLicensed;

      // Convert license data to expected format
      const license: LicenseData | null = licenseKey
        ? {
            licenseKey,
            licenseEmail: licenseData?.email || null,
            licenseOrderId: licenseData?.orderId?.toString() || null,
            licenseActivatedAt: licenseData?.validatedAt ? new Date(licenseData.validatedAt).toISOString() : null
          }
        : null;

      setState({
        mode,
        hasFullAccess,
        trial: trialStatus,
        license,
        limits: getFeatureLimits(mode),
        shouldShowExpiredModal,
        shouldShowBanner,
        isLoading: false
      });
    } catch (error) {
      console.error('Failed to check license status:', error);
      // Default to trial mode on error (be generous)
      setState((prev) => ({ ...prev, isLoading: false }));
    }
  }, []);

  // Check status on mount
  useEffect(() => {
    checkStatus();
  }, [checkStatus]);

  // Acknowledge trial expired (dismiss modal for this session)
  const acknowledgeExpired = useCallback(async () => {
    await window.electronAPI.acknowledgeTrialExpired();
    setState((prev) => ({ ...prev, shouldShowExpiredModal: false }));
  }, []);

  // Refresh status (call after license activation)
  const refresh = useCallback(() => {
    checkStatus();
  }, [checkStatus]);

  return {
    ...state,
    acknowledgeExpired,
    refresh
  };
}
