import { describe, expect, it } from 'vitest';
import type { HitTarget } from './hitTest';
import {
  createSessionController,
  EMPTY_MODIFIERS,
  type SessionAction,
  type SessionEvent,
  type SessionModifiers
} from './sessionController';

const NO_HIT: HitTarget | null = null;
const PART_HIT: HitTarget = {
  kind: 'part-body',
  nodeId: 'p1',
  partId: 'p1',
  worldPoint: { x: 0, y: 0, z: 0 }
};
const GROUND_HIT: HitTarget = { kind: 'ground', worldPoint: { x: 0, y: 0, z: 0 } };

const POINTER = 1;
let clock = 0;
function t(advanceMs: number = 0): number {
  clock += advanceMs;
  return clock;
}

function resetClock() {
  clock = 0;
}

function pointerdown(overrides: Partial<Extract<SessionEvent, { kind: 'pointerdown' }>> = {}): SessionEvent {
  return {
    kind: 'pointerdown',
    pointerId: POINTER,
    button: 0,
    clientX: 100,
    clientY: 100,
    modifiers: EMPTY_MODIFIERS,
    timestamp: t(),
    hit: NO_HIT,
    ...overrides
  };
}

function pointermove(overrides: Partial<Extract<SessionEvent, { kind: 'pointermove' }>> = {}): SessionEvent {
  return {
    kind: 'pointermove',
    pointerId: POINTER,
    clientX: 100,
    clientY: 100,
    modifiers: EMPTY_MODIFIERS,
    timestamp: t(),
    ...overrides
  };
}

function pointerup(overrides: Partial<Extract<SessionEvent, { kind: 'pointerup' }>> = {}): SessionEvent {
  return {
    kind: 'pointerup',
    pointerId: POINTER,
    button: 0,
    clientX: 100,
    clientY: 100,
    modifiers: EMPTY_MODIFIERS,
    timestamp: t(),
    hit: NO_HIT,
    ...overrides
  };
}

function actionKinds(actions: SessionAction[]): string[] {
  return actions.map((a) => a.kind);
}

describe('sessionController — basic transitions', () => {
  it('idle → armed → committing → idle (left click)', () => {
    resetClock();
    const ctrl = createSessionController();
    expect(ctrl.state().phase).toBe('idle');

    ctrl.feed(pointerdown({ button: 0, hit: PART_HIT }));
    expect(ctrl.state().phase).toBe('armed');

    const actions = ctrl.feed(pointerup({ button: 0, hit: PART_HIT, timestamp: t(10) }));
    expect(actionKinds(actions)).toEqual(['click']);
    expect(actions[0]).toMatchObject({ kind: 'click', button: 0, hit: PART_HIT });
    expect(ctrl.state().phase).toBe('idle');
  });

  it('right-click emits contextmenu, not click', () => {
    resetClock();
    const ctrl = createSessionController();
    ctrl.feed(pointerdown({ button: 2, hit: PART_HIT }));
    const actions = ctrl.feed(pointerup({ button: 2, hit: PART_HIT, timestamp: t(20) }));
    expect(actionKinds(actions)).toEqual(['contextmenu']);
    expect(actions[0]).toMatchObject({ kind: 'contextmenu', hit: PART_HIT });
  });

  it('click on empty space carries null hit', () => {
    resetClock();
    const ctrl = createSessionController();
    ctrl.feed(pointerdown({ hit: NO_HIT }));
    const actions = ctrl.feed(pointerup({ hit: NO_HIT, timestamp: t(20) }));
    expect(actions[0]).toMatchObject({ kind: 'click', hit: null });
  });
});

describe('sessionController — drag transitions', () => {
  it('armed → dragging when movement exceeds threshold', () => {
    resetClock();
    const ctrl = createSessionController({ dragThresholdPx: 5 });
    ctrl.feed(pointerdown({ hit: PART_HIT }));

    // Move within threshold — still armed, no actions.
    const noDragActions = ctrl.feed(pointermove({ clientX: 102, clientY: 100 }));
    expect(noDragActions).toEqual([]);
    expect(ctrl.state().phase).toBe('armed');

    // Move beyond threshold — emits dragstart + dragmove.
    const dragActions = ctrl.feed(pointermove({ clientX: 110, clientY: 100 }));
    expect(actionKinds(dragActions)).toEqual(['dragstart', 'dragmove']);
    expect(dragActions[0]).toMatchObject({ kind: 'dragstart', hit: PART_HIT, button: 0 });
    expect(dragActions[1]).toMatchObject({ kind: 'dragmove', deltaX: 10, deltaY: 0 });
    expect(ctrl.state().phase).toBe('dragging');
  });

  it('subsequent moves emit dragmove only, no second dragstart', () => {
    resetClock();
    const ctrl = createSessionController({ dragThresholdPx: 5 });
    ctrl.feed(pointerdown({ hit: PART_HIT }));
    ctrl.feed(pointermove({ clientX: 110, clientY: 100 }));
    const more = ctrl.feed(pointermove({ clientX: 120, clientY: 100 }));
    expect(actionKinds(more)).toEqual(['dragmove']);
    expect(more[0]).toMatchObject({ deltaX: 20, deltaY: 0 });
  });

  it('dragging → committing → idle on pointerup, emits dragcommit', () => {
    resetClock();
    const ctrl = createSessionController({ dragThresholdPx: 5 });
    ctrl.feed(pointerdown({ hit: PART_HIT }));
    ctrl.feed(pointermove({ clientX: 110, clientY: 100 }));
    const release = ctrl.feed(pointerup({ clientX: 115, clientY: 100, hit: GROUND_HIT, timestamp: t(50) }));
    expect(actionKinds(release)).toEqual(['dragcommit']);
    expect(release[0]).toMatchObject({
      kind: 'dragcommit',
      hit: GROUND_HIT,
      deltaX: 15,
      deltaY: 0
    });
    expect(ctrl.state().phase).toBe('idle');
  });

  it('drag release is NOT counted as a click for double-click purposes', () => {
    resetClock();
    const ctrl = createSessionController({ dragThresholdPx: 5 });
    ctrl.feed(pointerdown({ hit: PART_HIT }));
    ctrl.feed(pointermove({ clientX: 200, clientY: 200 }));
    ctrl.feed(pointerup({ clientX: 200, clientY: 200, hit: GROUND_HIT, timestamp: t(50) }));

    // Immediately click — should be a single click, not doubleclick.
    ctrl.feed(pointerdown({ hit: PART_HIT, timestamp: t(50) }));
    const actions = ctrl.feed(pointerup({ hit: PART_HIT, timestamp: t(10) }));
    expect(actionKinds(actions)).toEqual(['click']);
  });
});

describe('sessionController — double-click', () => {
  it('two quick clicks at the same position emit click then doubleclick', () => {
    resetClock();
    const ctrl = createSessionController();
    ctrl.feed(pointerdown({ hit: PART_HIT }));
    const first = ctrl.feed(pointerup({ hit: PART_HIT, timestamp: t(20) }));
    expect(actionKinds(first)).toEqual(['click']);

    ctrl.feed(pointerdown({ hit: PART_HIT, timestamp: t(80) }));
    const second = ctrl.feed(pointerup({ hit: PART_HIT, timestamp: t(20) }));
    expect(actionKinds(second)).toEqual(['doubleclick']);
  });

  it('three clicks emit click, doubleclick, click (not three doubleclicks)', () => {
    resetClock();
    const ctrl = createSessionController();
    ctrl.feed(pointerdown({ hit: PART_HIT }));
    const a = ctrl.feed(pointerup({ hit: PART_HIT, timestamp: t(20) }));

    ctrl.feed(pointerdown({ hit: PART_HIT, timestamp: t(80) }));
    const b = ctrl.feed(pointerup({ hit: PART_HIT, timestamp: t(20) }));

    ctrl.feed(pointerdown({ hit: PART_HIT, timestamp: t(80) }));
    const c = ctrl.feed(pointerup({ hit: PART_HIT, timestamp: t(20) }));

    expect(actionKinds(a)).toEqual(['click']);
    expect(actionKinds(b)).toEqual(['doubleclick']);
    expect(actionKinds(c)).toEqual(['click']);
  });

  it('two clicks far apart in time are two single clicks', () => {
    resetClock();
    const ctrl = createSessionController({ doubleClickIntervalMs: 100 });
    ctrl.feed(pointerdown({ hit: PART_HIT }));
    ctrl.feed(pointerup({ hit: PART_HIT, timestamp: t(20) }));

    ctrl.feed(pointerdown({ hit: PART_HIT, timestamp: t(500) }));
    const actions = ctrl.feed(pointerup({ hit: PART_HIT, timestamp: t(20) }));
    expect(actionKinds(actions)).toEqual(['click']);
  });

  it('two clicks far apart in space are two single clicks', () => {
    resetClock();
    const ctrl = createSessionController({ doubleClickDistancePx: 5 });
    ctrl.feed(pointerdown({ hit: PART_HIT, clientX: 100, clientY: 100 }));
    ctrl.feed(pointerup({ hit: PART_HIT, clientX: 100, clientY: 100, timestamp: t(20) }));

    ctrl.feed(pointerdown({ hit: PART_HIT, clientX: 200, clientY: 200, timestamp: t(50) }));
    const actions = ctrl.feed(pointerup({ hit: PART_HIT, clientX: 200, clientY: 200, timestamp: t(20) }));
    expect(actionKinds(actions)).toEqual(['click']);
  });

  it('left-click then right-click does not double-click', () => {
    resetClock();
    const ctrl = createSessionController();
    ctrl.feed(pointerdown({ button: 0, hit: PART_HIT }));
    ctrl.feed(pointerup({ button: 0, hit: PART_HIT, timestamp: t(20) }));

    ctrl.feed(pointerdown({ button: 2, hit: PART_HIT, timestamp: t(50) }));
    const actions = ctrl.feed(pointerup({ button: 2, hit: PART_HIT, timestamp: t(20) }));
    expect(actionKinds(actions)).toEqual(['contextmenu']);
  });
});

describe('sessionController — cancellation', () => {
  it('pointercancel during armed → no action emitted, returns to idle', () => {
    resetClock();
    const ctrl = createSessionController();
    ctrl.feed(pointerdown({ hit: PART_HIT }));
    const actions = ctrl.feed({ kind: 'pointercancel', pointerId: POINTER, timestamp: t() });
    expect(actions).toEqual([]);
    expect(ctrl.state().phase).toBe('idle');
  });

  it('pointercancel during dragging emits dragcancel', () => {
    resetClock();
    const ctrl = createSessionController({ dragThresholdPx: 5 });
    ctrl.feed(pointerdown({ hit: PART_HIT }));
    ctrl.feed(pointermove({ clientX: 110, clientY: 100 }));
    const actions = ctrl.feed({ kind: 'pointercancel', pointerId: POINTER, timestamp: t() });
    expect(actionKinds(actions)).toEqual(['dragcancel']);
    expect(ctrl.state().phase).toBe('idle');
  });

  it('blur during dragging emits dragcancel', () => {
    resetClock();
    const ctrl = createSessionController({ dragThresholdPx: 5 });
    ctrl.feed(pointerdown({ hit: PART_HIT }));
    ctrl.feed(pointermove({ clientX: 110, clientY: 100 }));
    const actions = ctrl.feed({ kind: 'blur', timestamp: t() });
    expect(actionKinds(actions)).toEqual(['dragcancel']);
    expect(ctrl.state().phase).toBe('idle');
  });

  it('escape during dragging emits dragcancel', () => {
    resetClock();
    const ctrl = createSessionController({ dragThresholdPx: 5 });
    ctrl.feed(pointerdown({ hit: PART_HIT }));
    ctrl.feed(pointermove({ clientX: 110, clientY: 100 }));
    const actions = ctrl.feed({ kind: 'escape', timestamp: t() });
    expect(actionKinds(actions)).toEqual(['dragcancel']);
    expect(ctrl.state().phase).toBe('idle');
  });

  it('blur during idle does nothing', () => {
    resetClock();
    const ctrl = createSessionController();
    const actions = ctrl.feed({ kind: 'blur', timestamp: t() });
    expect(actions).toEqual([]);
    expect(ctrl.state().phase).toBe('idle');
  });

  it('two consecutive pointerdowns cancel the prior gesture', () => {
    resetClock();
    const ctrl = createSessionController({ dragThresholdPx: 5 });
    ctrl.feed(pointerdown({ hit: PART_HIT }));
    ctrl.feed(pointermove({ clientX: 110, clientY: 100 }));
    expect(ctrl.state().phase).toBe('dragging');

    // Stray second pointerdown — should cancel the active drag and re-arm.
    const actions = ctrl.feed(pointerdown({ pointerId: 99, hit: NO_HIT, timestamp: t() }));
    expect(actionKinds(actions)).toEqual(['dragcancel']);
    expect(ctrl.state().phase).toBe('armed');
  });
});

describe('sessionController — modifiers', () => {
  it('modifier state at pointerup is the modifier state delivered on click', () => {
    resetClock();
    const ctrl = createSessionController();
    const shiftMods: SessionModifiers = { shift: true, ctrl: false, meta: false, alt: false };
    ctrl.feed(pointerdown({ hit: PART_HIT, modifiers: shiftMods }));
    const actions = ctrl.feed(
      pointerup({
        hit: PART_HIT,
        modifiers: shiftMods,
        timestamp: t(20)
      })
    );
    expect(actions[0]).toMatchObject({ kind: 'click', modifiers: shiftMods });
  });

  it('modifier state can change mid-drag (e.g. user presses shift after drag start)', () => {
    resetClock();
    const ctrl = createSessionController({ dragThresholdPx: 5 });
    ctrl.feed(pointerdown({ hit: PART_HIT, modifiers: EMPTY_MODIFIERS }));
    const shiftMods: SessionModifiers = { shift: true, ctrl: false, meta: false, alt: false };
    const actions = ctrl.feed(pointermove({ clientX: 110, clientY: 100, modifiers: shiftMods }));
    expect(actions[1]).toMatchObject({ kind: 'dragmove', modifiers: shiftMods });
  });
});

describe('sessionController — bug-class regression', () => {
  it('additive-selection click is a single click event, not two', () => {
    // Recreates the bug where the R3F per-mesh handler toggled selection,
    // then a native fallback toggled it again — net zero. With the
    // session controller as the only authority, an additive click emits
    // exactly one `click` action with the shift modifier intact.
    resetClock();
    const ctrl = createSessionController();
    const shiftMods: SessionModifiers = { shift: true, ctrl: false, meta: false, alt: false };
    ctrl.feed(pointerdown({ hit: PART_HIT, modifiers: shiftMods }));
    const actions = ctrl.feed(pointerup({ hit: PART_HIT, modifiers: shiftMods, timestamp: t(20) }));
    expect(actionKinds(actions)).toEqual(['click']);
    expect(actions[0]).toMatchObject({ modifiers: { shift: true } });
  });

  it('a contextmenu fires for right-click on a part regardless of overlay portals', () => {
    // The hit-target is supplied by the host (which calls resolveHitTarget,
    // ADR-002). The controller doesn't care whether the actual DOM event came
    // from the canvas or a drei <Html> portal — it just sees a pointerup
    // with button=2 and emits contextmenu. This locks in the architectural
    // fix for the "right-click on overlay was invisible" bug class.
    resetClock();
    const ctrl = createSessionController();
    ctrl.feed(pointerdown({ button: 2, hit: PART_HIT }));
    const actions = ctrl.feed(pointerup({ button: 2, hit: PART_HIT, timestamp: t(20) }));
    expect(actionKinds(actions)).toEqual(['contextmenu']);
  });

  it('drag → release → quick click does not produce a phantom doubleclick', () => {
    // Closes the "drag commit lingers in lastUp" failure mode.
    resetClock();
    const ctrl = createSessionController({ dragThresholdPx: 5 });
    ctrl.feed(pointerdown({ hit: PART_HIT }));
    ctrl.feed(pointermove({ clientX: 110, clientY: 100 }));
    ctrl.feed(pointerup({ clientX: 110, clientY: 100, hit: PART_HIT, timestamp: t(50) }));

    ctrl.feed(pointerdown({ hit: PART_HIT, timestamp: t(50) }));
    const actions = ctrl.feed(pointerup({ hit: PART_HIT, timestamp: t(20) }));
    expect(actionKinds(actions)).toEqual(['click']);
  });
});

describe('sessionController — reset', () => {
  it('reset returns the controller to idle from any phase', () => {
    resetClock();
    const ctrl = createSessionController({ dragThresholdPx: 5 });
    ctrl.feed(pointerdown({ hit: PART_HIT }));
    ctrl.feed(pointermove({ clientX: 110, clientY: 100 }));
    expect(ctrl.state().phase).toBe('dragging');
    ctrl.reset();
    expect(ctrl.state().phase).toBe('idle');
  });
});
