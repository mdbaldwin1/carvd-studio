/**
 * Development tools hook - exposes seed data functions on window for testing
 * Only active in development mode
 */

import { useEffect } from 'react';
import { useProjectStore } from '../store/projectStore';
import { generateSeedProject, generateStockLibraryItems } from '../utils/seedData';

// Extend window interface for dev tools
declare global {
  interface Window {
    carvdDev?: {
      loadSeedProject: () => void;
      seedStockLibrary: () => void;
      clearProject: () => void;
      getProjectState: () => unknown;
    };
  }
}

export function useDevTools() {
  const loadProject = useProjectStore((s) => s.loadProject);
  const newProject = useProjectStore((s) => s.newProject);

  useEffect(() => {
    // Only expose in development
    if (import.meta.env.DEV) {
      window.carvdDev = {
        /**
         * Load the seed project (Computer Desk with Drawers)
         * Call from console: carvdDev.loadSeedProject()
         */
        loadSeedProject: () => {
          const project = generateSeedProject();
          loadProject(project);
          console.log('✅ Loaded seed project: "Computer Desk with Drawers"');
          console.log(`   - ${project.parts.length} parts`);
          console.log(`   - ${project.stocks.length} stock materials`);
          console.log(`   - ${project.groups.length} groups`);
        },

        /**
         * Add common stock materials to the app-level library
         * Call from console: carvdDev.seedStockLibrary()
         */
        seedStockLibrary: async () => {
          const stocks = generateStockLibraryItems();

          try {
            // Get current library via IPC and merge
            const currentLibrary =
              ((await window.electronAPI.getPreference('stockLibrary')) as Array<{ name: string }>) || [];
            const existingNames = new Set(currentLibrary.map((s) => s.name));
            const newStocks = stocks.filter((s) => !existingNames.has(s.name));

            if (newStocks.length > 0) {
              const merged = [...currentLibrary, ...newStocks];
              await window.electronAPI.setPreference('stockLibrary', merged);
              console.log(`✅ Added ${newStocks.length} new stocks to library`);
              newStocks.forEach((s) => console.log(`   - ${s.name}`));
              console.log('   Refresh the app or open Stock Library modal to see changes');
            } else {
              console.log('ℹ️ All seed stocks already exist in library');
            }
          } catch (error) {
            console.error('❌ Failed to seed stock library:', error);
          }
        },

        /**
         * Clear the current project (start fresh)
         * Call from console: carvdDev.clearProject()
         */
        clearProject: () => {
          newProject();
          console.log('✅ Cleared project - starting fresh');
        },

        /**
         * Get current project state for debugging
         * Call from console: carvdDev.getProjectState()
         */
        getProjectState: () => {
          const state = useProjectStore.getState();
          return {
            projectName: state.projectName,
            partsCount: state.parts.length,
            stocksCount: state.stocks.length,
            groupsCount: state.groups.length,
            parts: state.parts,
            stocks: state.stocks,
            groups: state.groups,
            groupMembers: state.groupMembers
          };
        }
      };

      console.log('🛠️ Carvd Dev Tools loaded. Available commands:');
      console.log('   carvdDev.loadSeedProject() - Load test desk project');
      console.log('   carvdDev.seedStockLibrary() - Add common stocks to library');
      console.log('   carvdDev.clearProject() - Start fresh');
      console.log('   carvdDev.getProjectState() - Inspect current state');
    }

    return () => {
      if (import.meta.env.DEV) {
        delete window.carvdDev;
      }
    };
  }, [loadProject, newProject]);
}
