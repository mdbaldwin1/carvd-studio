/**
 * Utilities for detecting and importing project items to the app library
 */

import { Stock, Assembly } from '../types';

export interface MissingLibraryItem {
  type: 'stock' | 'assembly';
  item: Stock | Assembly;
  // Whether it's an exact match by ID (same item from library) or a new item
  isExactMatch: boolean;
}

export interface LibraryImportCheck {
  missingStocks: Stock[];
  missingAssemblies: Assembly[];
  hasItems: boolean;
}

/**
 * Compares a stock against library stocks to determine if it's already in the library.
 * Uses a combination of ID match and property similarity.
 */
function isStockInLibrary(stock: Stock, libraryStocks: Stock[]): boolean {
  // First check exact ID match
  if (libraryStocks.some((ls) => ls.id === stock.id)) {
    return true;
  }

  // Check for a stock with identical properties (name + dimensions + grain)
  // This catches stocks that were copied to a project but have different IDs
  return libraryStocks.some(
    (ls) =>
      ls.name === stock.name &&
      ls.length === stock.length &&
      ls.width === stock.width &&
      ls.thickness === stock.thickness &&
      ls.grainDirection === stock.grainDirection
  );
}

/**
 * Compares an assembly against library assemblies to determine if it's already in the library.
 * Uses a combination of ID match and name + part count similarity.
 */
function isAssemblyInLibrary(assembly: Assembly, libraryAssemblies: Assembly[]): boolean {
  // First check exact ID match
  if (libraryAssemblies.some((la) => la.id === assembly.id)) {
    return true;
  }

  // Check for an assembly with same name and same number of parts
  // This is a reasonable heuristic for "same assembly"
  return libraryAssemblies.some((la) => la.name === assembly.name && la.parts.length === assembly.parts.length);
}

/**
 * Detects stocks and assemblies in a project that are not in the app library.
 *
 * @param projectStocks - Stocks from the loaded project
 * @param projectAssemblies - Assemblies from the loaded project
 * @param libraryStocks - Stocks from the app library
 * @param libraryAssemblies - Assemblies from the app library
 * @returns Object containing arrays of missing stocks and assemblies
 */
export function detectMissingLibraryItems(
  projectStocks: Stock[],
  projectAssemblies: Assembly[],
  libraryStocks: Stock[],
  libraryAssemblies: Assembly[]
): LibraryImportCheck {
  const missingStocks = projectStocks.filter((stock) => !isStockInLibrary(stock, libraryStocks));

  const missingAssemblies = projectAssemblies.filter((assembly) => !isAssemblyInLibrary(assembly, libraryAssemblies));

  return {
    missingStocks,
    missingAssemblies,
    hasItems: missingStocks.length > 0 || missingAssemblies.length > 0
  };
}

/**
 * Creates a new stock for the library from a project stock.
 * Generates a new ID to avoid conflicts.
 */
export function createLibraryStockFromProject(stock: Stock): Stock {
  return {
    ...stock,
    id: `lib_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`
  };
}

/**
 * Creates a new assembly for the library from a project assembly.
 * Generates a new ID to avoid conflicts and updates timestamps.
 */
export function createLibraryAssemblyFromProject(assembly: Assembly): Assembly {
  const now = new Date().toISOString();
  return {
    ...assembly,
    id: `lib_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
    createdAt: now,
    modifiedAt: now
  };
}
