import { useState, useEffect, useCallback, useSyncExternalStore } from 'react';
import { Stock } from '../types';

// Singleton state for stock library (shared across all hook instances)
let stockLibraryState: Stock[] = [];
let stockLibraryLoading = true;
let stockLibraryInitialized = false;
const stockLibrarySubscribers = new Set<() => void>();

function notifyStockSubscribers() {
  stockLibrarySubscribers.forEach((callback) => callback());
}

function subscribeToStockLibrary(callback: () => void) {
  stockLibrarySubscribers.add(callback);
  return () => stockLibrarySubscribers.delete(callback);
}

function getStockLibrarySnapshot() {
  return stockLibraryState;
}

function getStockLibraryLoadingSnapshot() {
  return stockLibraryLoading;
}

// Initialize the singleton listener (called once)
function initStockLibrarySingleton() {
  if (stockLibraryInitialized) return;
  stockLibraryInitialized = true;

  // Load initial data
  window.electronAPI.getPreference('stockLibrary').then((library) => {
    stockLibraryState = (library as Stock[]) || [];
    stockLibraryLoading = false;
    notifyStockSubscribers();
  }).catch((error) => {
    console.error('Failed to load stock library:', error);
    stockLibraryState = [];
    stockLibraryLoading = false;
    notifyStockSubscribers();
  });

  // Set up singleton listener for cross-instance changes
  window.electronAPI.onSettingsChanged((changes) => {
    if ('stockLibrary' in changes) {
      stockLibraryState = (changes.stockLibrary as Stock[]) || [];
      notifyStockSubscribers();
    }
  });
}

/**
 * Hook for managing the app-level stock library persisted via electron-store.
 * This is separate from the project-level stocks in the Zustand store.
 * Supports cross-instance sync via electron-store's file watching.
 * Uses a singleton pattern to avoid multiple listeners.
 */
export function useStockLibrary() {
  // Initialize singleton on first use
  useEffect(() => {
    initStockLibrarySingleton();
  }, []);

  // Subscribe to the singleton state
  const stocks = useSyncExternalStore(subscribeToStockLibrary, getStockLibrarySnapshot);
  const [isLoading, setIsLoading] = useState(stockLibraryLoading);

  // Update loading state when singleton changes
  useEffect(() => {
    const unsubscribe = subscribeToStockLibrary(() => {
      setIsLoading(getStockLibraryLoadingSnapshot());
    });
    return unsubscribe;
  }, []);

  // Save stock library whenever it changes
  const saveLibrary = useCallback(async (newStocks: Stock[]) => {
    try {
      await window.electronAPI.setPreference('stockLibrary', newStocks);
      // Update singleton state immediately for responsive UI
      stockLibraryState = newStocks;
      notifyStockSubscribers();
    } catch (error) {
      console.error('Failed to save stock library:', error);
    }
  }, []);

  const addStock = useCallback(
    async (stock: Stock) => {
      // Read current stocks directly from storage to avoid stale closure issues
      const currentStocks = (await window.electronAPI.getPreference('stockLibrary') as Stock[]) || [];
      const newStocks = [...currentStocks, stock];
      await saveLibrary(newStocks);
    },
    [saveLibrary]
  );

  const updateStock = useCallback(
    async (id: string, updates: Partial<Stock>) => {
      // Read current stocks directly from storage to avoid stale closure issues
      const currentStocks = (await window.electronAPI.getPreference('stockLibrary') as Stock[]) || [];
      const newStocks = currentStocks.map((s) => (s.id === id ? { ...s, ...updates } : s));
      await saveLibrary(newStocks);
    },
    [saveLibrary]
  );

  const deleteStock = useCallback(
    async (id: string) => {
      // Read current stocks directly from storage to avoid stale closure issues
      const currentStocks = (await window.electronAPI.getPreference('stockLibrary') as Stock[]) || [];
      const newStocks = currentStocks.filter((s) => s.id !== id);
      await saveLibrary(newStocks);
    },
    [saveLibrary]
  );

  const findStock = useCallback(
    (id: string) => {
      return stocks.find((s) => s.id === id);
    },
    [stocks]
  );

  return {
    stocks,
    isLoading,
    addStock,
    updateStock,
    deleteStock,
    findStock
  };
}
