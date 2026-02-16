/**
 * Development tools hook - exposes seed data and performance profiling
 * functions on window for testing. Only active in development mode.
 */

import { useEffect } from 'react';
import { useProjectStore } from '../store/projectStore';
import { generateSeedProject, generateStockLibraryItems } from '../utils/seedData';

// Colors for randomized test parts
const TEST_PART_COLORS = ['#c4a574', '#f5deb3', '#8B4513', '#DEB887', '#D2691E', '#CD853F'];

// Extend window interface for dev tools
declare global {
  interface Window {
    carvdDev?: {
      loadSeedProject: () => void;
      seedStockLibrary: () => void;
      clearProject: () => void;
      getProjectState: () => unknown;
      createParts: (count: number) => void;
      measureUndoSnapshot: () => void;
      perfBaseline: () => void;
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
         * Load the seed project (Simple Writing Desk)
         * Call from console: carvdDev.loadSeedProject()
         */
        loadSeedProject: () => {
          const project = generateSeedProject();
          loadProject(project);
          console.log('Loaded seed project: "Simple Writing Desk"');
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
              console.log(`Added ${newStocks.length} new stocks to library`);
              newStocks.forEach((s) => console.log(`   - ${s.name}`));
              console.log('   Refresh the app or open Stock Library modal to see changes');
            } else {
              console.log('All seed stocks already exist in library');
            }
          } catch (error) {
            console.error('Failed to seed stock library:', error);
          }
        },

        /**
         * Clear the current project (start fresh)
         * Call from console: carvdDev.clearProject()
         */
        clearProject: () => {
          newProject();
          console.log('Cleared project - starting fresh');
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
        },

        /**
         * Create N test parts with randomized positions for load testing.
         * Call from console: carvdDev.createParts(100)
         */
        createParts: (count: number) => {
          const { addPart } = useProjectStore.getState();
          const gridSpacing = 8; // inches between part centers
          const cols = Math.ceil(Math.sqrt(count));
          let created = 0;

          for (let i = 0; i < count; i++) {
            const col = i % cols;
            const row = Math.floor(i / cols);
            const result = addPart({
              name: `Test Part ${i + 1}`,
              length: 4 + Math.random() * 20, // 4-24 inches
              width: 2 + Math.random() * 10, // 2-12 inches
              thickness: 0.5 + Math.random() * 1, // 0.5-1.5 inches
              position: {
                x: col * gridSpacing,
                y: 0,
                z: row * gridSpacing
              },
              color: TEST_PART_COLORS[i % TEST_PART_COLORS.length]
            });
            if (result) created++;
          }
          // Clear selection so all parts are visible without highlight
          useProjectStore.getState().clearSelection();
          console.log(`Created ${created} test parts (${cols}x${Math.ceil(count / cols)} grid)`);
        },

        /**
         * Measure undo/redo snapshot sizes and history depth.
         * Call from console: carvdDev.measureUndoSnapshot()
         */
        measureUndoSnapshot: () => {
          const temporal = useProjectStore.temporal.getState();
          const pastStates = temporal.pastStates;
          const futureStates = temporal.futureStates;

          if (pastStates.length === 0) {
            console.log('[Perf] No undo history yet. Make some changes first.');
            return;
          }

          // Measure most recent snapshot
          const latestSnapshot = JSON.stringify(pastStates[pastStates.length - 1]);
          const snapshotBytes = new Blob([latestSnapshot]).size;

          // Estimate total history memory
          const totalBytes = pastStates.reduce((sum, s) => {
            return sum + new Blob([JSON.stringify(s)]).size;
          }, 0);

          console.log('[Perf] Undo/Redo Snapshot Analysis:');
          console.log(`   History depth: ${pastStates.length} past, ${futureStates.length} future`);
          console.log(`   Latest snapshot: ${(snapshotBytes / 1024).toFixed(1)} KB`);
          console.log(
            `   Total history: ${(totalBytes / 1024).toFixed(1)} KB (${(totalBytes / 1024 / 1024).toFixed(2)} MB)`
          );
          console.log(`   Avg per snapshot: ${(totalBytes / pastStates.length / 1024).toFixed(1)} KB`);
        },

        /**
         * Print a performance baseline summary to the console.
         * Call from console: carvdDev.perfBaseline()
         */
        perfBaseline: () => {
          const state = useProjectStore.getState();
          const temporal = useProjectStore.temporal.getState();

          console.log('=== Performance Baseline ===');

          // Project size
          console.log('\n[Scene]');
          console.log(`   Parts: ${state.parts.length}`);
          console.log(`   Stocks: ${state.stocks.length}`);
          console.log(`   Groups: ${state.groups.length}`);

          // Memory (Chrome-only)
          const mem = (
            performance as unknown as {
              memory?: { usedJSHeapSize: number; totalJSHeapSize: number; jsHeapSizeLimit: number };
            }
          ).memory;
          if (mem) {
            console.log('\n[Memory]');
            console.log(`   Used JS heap: ${(mem.usedJSHeapSize / 1024 / 1024).toFixed(1)} MB`);
            console.log(`   Total JS heap: ${(mem.totalJSHeapSize / 1024 / 1024).toFixed(1)} MB`);
            console.log(`   Heap limit: ${(mem.jsHeapSizeLimit / 1024 / 1024).toFixed(0)} MB`);
          } else {
            console.log('\n[Memory] performance.memory not available (Chrome/Electron only)');
          }

          // Undo history
          const pastStates = temporal.pastStates;
          if (pastStates.length > 0) {
            const latestBytes = new Blob([JSON.stringify(pastStates[pastStates.length - 1])]).size;
            const totalBytes = pastStates.reduce((sum, s) => sum + new Blob([JSON.stringify(s)]).size, 0);
            console.log('\n[Undo History]');
            console.log(`   Depth: ${pastStates.length} snapshots`);
            console.log(`   Latest snapshot: ${(latestBytes / 1024).toFixed(1)} KB`);
            console.log(`   Total memory: ${(totalBytes / 1024).toFixed(1)} KB`);
          } else {
            console.log('\n[Undo History] Empty (no changes yet)');
          }

          console.log('\n[Renderer Info]');
          console.log('   Check [Perf] console logs for draw calls, triangles, geometries');
          console.log('   (logged every 5s by PerfMonitor)');

          console.log('\n=============================');
        }
      };

      console.log('Dev Tools loaded. Available commands:');
      console.log('   carvdDev.loadSeedProject()      - Load test desk project');
      console.log('   carvdDev.seedStockLibrary()      - Add common stocks to library');
      console.log('   carvdDev.clearProject()          - Start fresh');
      console.log('   carvdDev.getProjectState()       - Inspect current state');
      console.log('   carvdDev.createParts(100)        - Create N test parts');
      console.log('   carvdDev.measureUndoSnapshot()   - Measure undo snapshot sizes');
      console.log('   carvdDev.perfBaseline()          - Print performance baseline');
    }

    return () => {
      if (import.meta.env.DEV) {
        delete window.carvdDev;
      }
    };
  }, [loadProject, newProject]);
}
