import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useEffectiveStockConstraints } from './useEffectiveStockConstraints';
import { useProjectStore } from '../store/projectStore';

describe('useEffectiveStockConstraints', () => {
  beforeEach(() => {
    // Reset store to defaults
    useProjectStore.getState().newProject();
  });

  it('returns stock constraints from the store', () => {
    const { result } = renderHook(() => useEffectiveStockConstraints());

    expect(result.current).toBeDefined();
    expect(typeof result.current.constrainDimensions).toBe('boolean');
    expect(typeof result.current.constrainGrain).toBe('boolean');
    expect(typeof result.current.constrainColor).toBe('boolean');
    expect(typeof result.current.preventOverlap).toBe('boolean');
  });

  it('returns default constraint values', () => {
    const { result } = renderHook(() => useEffectiveStockConstraints());

    // Default values when creating a new project
    expect(result.current.constrainDimensions).toBe(true);
    expect(result.current.constrainGrain).toBe(true);
    expect(result.current.constrainColor).toBe(true);
    expect(result.current.preventOverlap).toBe(true);
  });

  it('updates when store constraints change', () => {
    const { result, rerender } = renderHook(() => useEffectiveStockConstraints());

    expect(result.current.constrainDimensions).toBe(true);

    // Update constraints in store
    useProjectStore.getState().setStockConstraints({
      constrainDimensions: false,
      constrainGrain: true,
      constrainColor: false,
      preventOverlap: true
    });

    rerender();

    expect(result.current.constrainDimensions).toBe(false);
    expect(result.current.constrainGrain).toBe(true);
    expect(result.current.constrainColor).toBe(false);
    expect(result.current.preventOverlap).toBe(true);
  });

  it('reflects project-specific settings after loading a project', () => {
    const { result, rerender } = renderHook(() => useEffectiveStockConstraints());

    // Load a project with custom constraints
    useProjectStore.getState().loadProject({
      version: '1.0',
      name: 'Test Project',
      stocks: [],
      parts: [],
      groups: [],
      groupMembers: [],
      assemblies: [],
      units: 'imperial',
      gridSize: 0.0625,
      kerfWidth: 0.125,
      overageFactor: 0.1,
      projectNotes: '',
      stockConstraints: {
        constrainDimensions: false,
        constrainGrain: false,
        constrainColor: true,
        preventOverlap: false
      },
      snapGuides: [],
      customShoppingItems: [],
      createdAt: new Date().toISOString(),
      modifiedAt: new Date().toISOString()
    });

    rerender();

    expect(result.current.constrainDimensions).toBe(false);
    expect(result.current.constrainGrain).toBe(false);
    expect(result.current.constrainColor).toBe(true);
    expect(result.current.preventOverlap).toBe(false);
  });

  it('resets to defaults on new project', () => {
    const { result, rerender } = renderHook(() => useEffectiveStockConstraints());

    // Modify constraints
    useProjectStore.getState().setStockConstraints({
      constrainDimensions: false,
      constrainGrain: false,
      constrainColor: false,
      preventOverlap: false
    });

    rerender();
    expect(result.current.constrainDimensions).toBe(false);

    // Create new project
    useProjectStore.getState().newProject();

    rerender();

    // Should be back to defaults
    expect(result.current.constrainDimensions).toBe(true);
    expect(result.current.constrainGrain).toBe(true);
    expect(result.current.constrainColor).toBe(true);
    expect(result.current.preventOverlap).toBe(true);
  });
});
